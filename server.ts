import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Client Initialization
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Utility to resolve organization from Auth Header
async function getOrganizationFromAuth(authHeader: string | undefined) {
  console.log('[AUTH] Analisando header de autorização...');
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[AUTH] Header ausente ou inválido');
      throw new Error('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    console.log('[AUTH] Token extraído. Verificando usuário no Supabase...');
    
    // 1. Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('[AUTH] Erro ao validar token:', authError);
      throw new Error('Unauthorized');
    }

    console.log(`[AUTH] Usuário validado: ${user.email} (${user.id}). Buscando perfil...`);

    // 2. Get organization_id from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.warn(`[AUTH] Perfil não encontrado para ${user.email}. Tentando fallbacks...`);
      
      const adminEmails = ['superadmin@gmail.com'];
      const isAdmin = adminEmails.includes(user.email || '');

      if (isAdmin) {
         console.log(`[AUTH] Admin bypass para ${user.email}. Buscando org principal...`);
         const { data: mainOrg } = await supabase.from('organizations').select('id').eq('slug', 'tem-de-tudo').single();
         if (mainOrg) {
           console.log(`[AUTH] Fallback bem-sucedido: Org ${mainOrg.id}`);
           return mainOrg.id;
         }
      }

      console.log('[AUTH] Tentando fallback de organização única...');
      const { data: orgs } = await supabase.from('organizations').select('id');
      if (orgs && orgs.length === 1) {
        console.log('[AUTH] Organização única detectada.');
        return orgs[0].id;
      }
      
      throw new Error('Organization context not found.');
    }

    console.log(`[AUTH] Organização identificada: ${profile.organization_id}`);
    return profile.organization_id;
  } catch (err: any) {
    console.error('[AUTH] ERRO FATAL:', err.message);
    throw err;
  }
}

// Middleware to require Super Admin role
async function requireSuperAdmin(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('requireSuperAdmin: Auth error resolving user:', authError);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Email direct fallback (Highest priority/reliability)
    const rootEmails = ['superadmin@gmail.com'];
    if (user.email && rootEmails.includes(user.email.toLowerCase())) {
      console.log(`requireSuperAdmin: GRANTED root access to ${user.email}`);
      return next();
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'super_admin') {
      console.log(`requireSuperAdmin: GRANTED access to ${user.email} (Role: super_admin)`);
      next();
    } else {
      console.warn(`requireSuperAdmin: DENIED access for ${user.email} (Role: ${profile?.role})`);
      res.status(403).json({ error: 'Forbidden: Super Admin access required' });
    }
  } catch (error: any) {
    console.error('requireSuperAdmin: Internal Exception:', error.message);
    res.status(500).json({ error: 'Internal server error validating role' });
  }
}

// SQLite initialization removed for Supabase migration

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  
  // Settings
  app.get('/api/settings', async (req, res) => {
    try {
      const orgId = await getOrganizationFromAuth(req.headers.authorization);
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('organization_id', orgId);
      
      const defaultSettings = [
        { key: 'extra_ingredient_price', value: '5.00' }
      ];

      if (error || !data || data.length === 0) {
        return res.json(defaultSettings);
      }

      res.json(data);
    } catch (error) {
      res.json([{ key: 'extra_ingredient_price', value: '5.00' }]);
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      const orgId = await getOrganizationFromAuth(req.headers.authorization);
      const { key, value } = req.body;
      
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          organization_id: orgId,
          key, 
          value,
          updated_at: new Date().toISOString()
        }, { onConflict: 'organization_id, key' });

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      res.status(500).json({ error: 'Erro ao salvar configurações.' });
    }
  });

  // Products (Menu)
  app.get("/api/products", async (req, res) => {
    try {
      const orgId = await getOrganizationFromAuth(req.headers.authorization);
      if (!orgId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      console.log('Fetching products for org:', orgId);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq('organization_id', orgId);
      
      if (error) {
        console.error('Supabase error fetching products:', error);
        throw error;
      }

      res.json(data.map((p: any) => ({ 
        ...p, 
        ingredients: typeof p.ingredients === 'string' ? JSON.parse(p.ingredients) : (p.ingredients || [])
      })));
    } catch (error: any) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: error.message || "Internal server error fetching products" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const { name, type, price, ingredients } = req.body;
      
      if (!name || !type || price === undefined) {
        return res.status(400).json({ error: "Missing required fields: name, type, price" });
      }

      const orgId = await getOrganizationFromAuth(req.headers.authorization);
      const { data, error } = await supabase.from("products").insert({
        name,
        type,
        price,
        ingredients: ingredients || [],
        organization_id: orgId
      }).select().single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Error creating product:", error);
      if (error.message === 'Unauthorized' || error.message === 'Missing or invalid Authorization header') {
        return res.status(401).json({ error: error.message });
      }
      res.status(500).json({ error: "Internal server error creating product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const orgId = await getOrganizationFromAuth(req.headers.authorization); // Ensure user is authorized
      const { error } = await supabase.from("products").delete().eq("id", req.params.id).eq('organization_id', orgId);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting product:", error);
      if (error.message === 'Unauthorized' || error.message === 'Missing or invalid Authorization header') {
        return res.status(401).json({ error: error.message });
      }
      res.status(500).json({ error: "Internal server error deleting product" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const { name, type, price, ingredients } = req.body;
      const orgId = await getOrganizationFromAuth(req.headers.authorization);
      
      const updates: any = {};
      if (name) updates.name = name;
      if (type) updates.type = type;
      if (price !== undefined) updates.price = price;
      if (ingredients) updates.ingredients = ingredients;

      const { data, error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", req.params.id)
        .eq('organization_id', orgId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Error updating product:", error);
      if (error.message === 'Unauthorized' || error.message === 'Missing or invalid Authorization header') {
        return res.status(401).json({ error: error.message });
      }
      res.status(500).json({ error: "Internal server error updating product" });
    }
  });

  // Orders
  app.get("/api/orders", async (req, res) => {
    try {
      const orgId = await getOrganizationFromAuth(req.headers.authorization);
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq('organization_id', orgId)
        .order("created_at", { ascending: true });
      
      if (ordersError) throw ordersError;
      
      res.json(orders.map(order => ({
        ...order,
        items: (order.order_items || []).map((item: any) => ({
          ...item,
          customizations: typeof item.customizations === 'string' ? JSON.parse(item.customizations) : (item.customizations || [])
        }))
      })));
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      if (error.message === 'Unauthorized' || error.message === 'Missing or invalid Authorization header') {
        return res.status(401).json({ error: error.message });
      }
      res.status(500).json({ error: "Internal server error fetching orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const { customer_name, total_price, items, payment_status, payment_method, amount_received } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0 || total_price === undefined) {
        return res.status(400).json({ error: "Invalid order data: items and total_price are required" });
      }

      // Step 1: Create Order
      const orgId = await getOrganizationFromAuth(req.headers.authorization);
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_name: customer_name || 'Cliente Balcão',
          total_price,
          payment_status: payment_status || 'pending',
          payment_method: payment_method || null,
          amount_received: amount_received || null,
          organization_id: orgId
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Step 2: Create Order Items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_type: item.product_type,
        price: item.price,
        customizations: item.customizations || [],
        organization_id: orgId
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      res.json({ id: order.id });
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Internal server error creating order" });
    }
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", req.params.id);

      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Internal server error updating order status" });
    }
  });

  app.patch("/api/order-items/:id", async (req, res) => {
    try {
      const { customizations } = req.body;
      if (!customizations || !Array.isArray(customizations)) {
        return res.status(400).json({ error: "customizations array is required" });
      }

      const { error } = await supabase
        .from("order_items")
        .update({ customizations })
        .eq("id", req.params.id);

      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating order item:", error);
      res.status(500).json({ error: "Internal server error updating order item" });
    }
  });

  app.patch("/api/orders/:id/payment", async (req, res) => {
    try {
      const { payment_status, payment_method, amount_received } = req.body;
      if (!payment_status) {
        return res.status(400).json({ error: "payment_status is required" });
      }

      const { error } = await supabase
        .from("orders")
        .update({ 
          payment_status, 
          payment_method: payment_method || null, 
          amount_received: amount_received || null 
        })
        .eq("id", req.params.id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating payment info:", error);
      res.status(500).json({ error: "Internal server error updating payment info" });
    }
  });

  // Finance
  app.get("/api/finance/stats", async (req, res) => {
    try {
      const orgId = await getOrganizationFromAuth(req.headers.authorization);
      // Fallback if RPC not defined or for more detailed data
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("orders")
        .select("total_price, created_at, payment_method, order_items(product_type, product_name)")
        .eq('organization_id', orgId)
        .eq("payment_status", "paid");
      
      if (fallbackError) throw fallbackError;
      
      // Manual grouping
      const statsMap = new Map();
      fallbackData.forEach((order: any) => {
        // Align with Brazil Time (UTC-3)
        // Shifting 3 hours back from UTC to get the correct civil day string (YYYY-MM-DD)
        const d = new Date(order.created_at);
        const brtDate = new Date(d.getTime() - (3 * 60 * 60 * 1000));
        const date = brtDate.toISOString().split('T')[0];
        
        const current = statsMap.get(date) || { 
          total_revenue: 0, 
          total_orders: 0, 
          date,
          by_method: { pix: 0, dinheiro: 0, cartao: 0 },
          by_type: { crepe: 0, churrasco: 0 },
          product_sales: {} as Record<string, number>
        };
        
        current.total_revenue += order.total_price;
        current.total_orders += 1;
        
        // Group by method
        if (order.payment_method) {
          const method = order.payment_method.toLowerCase();
          if (current.by_method[method] !== undefined) {
            current.by_method[method] += order.total_price;
          }
        }
        
        // Group by product type and count sales for ranking
        if (order.order_items) {
          order.order_items.forEach((item: any) => {
            const type = item.product_type?.toLowerCase();
            if (type === 'crepe') {
              current.by_type.crepe += 1;
              if (item.product_name) {
                current.product_sales[item.product_name] = (current.product_sales[item.product_name] || 0) + 1;
              }
            } else if (type === 'churrasco') {
              current.by_type.churrasco += 1;
            }
          });
        }
        
        statsMap.set(date, current);
      });
      
      const statsList = Array.from(statsMap.values()).map((s: any) => {
        // Convert product_sales to a sorted Top 3 array
        const top_products = Object.entries(s.product_sales)
          .map(([name, count]) => ({ name, count }))
          .sort((a: any, b: any) => b.count - a.count)
          .slice(0, 3);
          
        const { product_sales, ...rest } = s;
        return { ...rest, top_products };
      });

      console.log(`Finance stats generated for ${statsList.length} days`);
      return res.json(statsList.sort((a: any, b: any) => b.date.localeCompare(a.date)));
    } catch (error) {
      console.error("Error fetching finance stats:", error);
      res.status(500).json({ error: "Internal server error fetching finance stats" });
    }
  });

  // Super Admin Routes
  app.get("/api/admin/stats", requireSuperAdmin, async (req, res) => {
    try {
      // Fetch all organizations using select(*) to avoid errors if status column is missing
      const { data: orgs, error: orgsError } = await supabase.from('organizations').select('*');
      if (orgsError) throw orgsError;
      
      // Fetch all paid orders to calculate revenue
      const { data: orders, error: ordersError } = await supabase.from('orders').select('total_price').eq('payment_status', 'paid');
      if (ordersError) throw ordersError;
      
      const globalStats = {
        total_revenue: orders?.reduce((acc: number, curr: any) => acc + Number(curr.total_price), 0) || 0,
        total_orders: orders?.length || 0,
        active_stores: orgs?.filter((s: any) => s.status === 'active').length || 0,
        total_stores: orgs?.length || 0,
        average_ticket: orders && orders.length > 0 ? (orders.reduce((acc: number, curr: any) => acc + Number(curr.total_price), 0) / orders.length) : 0
      };

      res.json(globalStats);
    } catch (error: any) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ error: `Error fetching global stats: ${error.message}` });
    }
  });

  app.get("/api/admin/metrics", requireSuperAdmin, async (req, res) => {
    try {
      const { data: orgs } = await supabase.from('organizations').select('id, name');
      const { data: orders } = await supabase.from('orders').select('organization_id, total_price').eq('payment_status', 'paid');

      const ranking = orgs?.map(org => {
        const orgOrders = orders?.filter(o => o.organization_id === org.id) || [];
        return {
          name: org.name,
          total_sales: orgOrders.reduce((acc, curr) => acc + Number(curr.total_price), 0),
          total_orders: orgOrders.length
        };
      }).sort((a, b) => b.total_sales - a.total_sales).slice(0, 5) || [];

      res.json({ ranking });
    } catch (error) {
       res.status(500).json({ error: 'Error fetching metrics' });
    }
  });

  app.get("/api/admin/organizations", requireSuperAdmin, async (req, res) => {
    try {
      // 1. Get all organizations with owner info
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select(`
          *,
          user_profiles!inner(email, name)
        `)
        .order('created_at', { ascending: false });
      
      if (orgsError) throw orgsError;

      // 2. Get order summary for all organizations
      const { data: orderStats, error: statsError } = await supabase
        .from('orders')
        .select('organization_id, total_price')
        .eq('payment_status', 'paid');

      if (statsError) throw statsError;

      // 3. Map orders to organizations and flatten owner info
      const mappedOrgs = orgs.map((org: any) => {
        const orgOrders = orderStats.filter(o => o.organization_id === org.id);
        const ownerProfile = Array.isArray(org.user_profiles) ? org.user_profiles[0] : org.user_profiles;
        
        return {
          ...org,
          owner_email: ownerProfile?.email,
          owner_name: ownerProfile?.name,
          total_orders: orgOrders.length,
          total_sales: orgOrders.reduce((acc: number, curr: any) => acc + (curr.total_price || 0), 0)
        };
      });

      res.json(mappedOrgs);
    } catch (error) {
      console.error('Error fetching admin organizations:', error);
      res.status(500).json({ error: 'Error fetching organizations' });
    }
  });

  app.patch("/api/admin/organizations/:id", requireSuperAdmin, async (req, res) => {
    try {
      const { plan, status } = req.body;
      const updates: any = {};
      if (plan) updates.plan = plan;
      if (status) updates.status = status;

      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', req.params.id);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating organization:', error);
      res.status(500).json({ error: `Error updating organization: ${error.message}` });
    }
  });

  app.get("/api/admin/organizations/:id/orders", requireSuperAdmin, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('organization_id', req.params.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching store orders' });
    }
  });

  // Global Config
  app.get("/api/admin/config", requireSuperAdmin, async (req, res) => {
    try {
      const { data } = await supabase.from('system_config').select('*');
      res.json(data || []);
    } catch (error) {
      res.json([]);
    }
  });

  app.post("/api/admin/config", requireSuperAdmin, async (req, res) => {
    try {
      const { key, value } = req.body;
      const { error } = await supabase.from('system_config').upsert({ key, value });
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Error updating config' });
    }
  });

  // Subscription info for logged-in store
  app.get("/api/subscription", async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    try {
      const orgId = await getOrganizationFromAuth(req.headers.authorization);
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, plan, status, payment_status, subscription_expires_at, created_at')
        .eq('id', orgId)
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =============================================
  // NOVO ENDPOINT: Upgrade de Plano (Multi-Estratégia)
  // =============================================
  app.post("/api/upgrade-plan", async (req, res) => {
    console.log('[UPGRADE-PLAN] Requisição recebida');
    const timeout = setTimeout(() => {
      if (!res.headersSent) res.status(504).json({ error: 'Timeout no servidor' });
    }, 10000);

    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        clearTimeout(timeout);
        return res.status(401).json({ error: 'Token não fornecido' });
      }

      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !user?.email) {
        clearTimeout(timeout);
        return res.status(401).json({ error: 'Token inválido' });
      }

      const { planId } = req.body;
      if (!planId) {
        clearTimeout(timeout);
        return res.status(400).json({ error: 'planId é obrigatório' });
      }

      console.log(`[UPGRADE-PLAN] User: ${user.email} (${user.id}) | Plano: ${planId}`);

      let orgId: string | null = null;

      // Estratégia 1: owner_email direto na tabela organizations
      const { data: orgByEmail } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_email', user.email)
        .limit(1)
        .maybeSingle();
      if (orgByEmail?.id) {
        orgId = orgByEmail.id;
        console.log(`[UPGRADE-PLAN] Estratégia 1 (owner_email): ${orgId}`);
      }

      // Estratégia 2: user_profiles.organization_id
      if (!orgId) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.organization_id) {
          orgId = profile.organization_id;
          console.log(`[UPGRADE-PLAN] Estratégia 2 (user_profiles): ${orgId}`);
        }
      }

      // Estratégia 3: Sistema single-store — pegar a única organização disponível
      if (!orgId) {
        console.log(`[UPGRADE-PLAN] Estratégia 3: pegando org disponível no sistema...`);
        const { data: mainOrg } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();
        if (mainOrg?.id) {
          orgId = mainOrg.id;
          console.log(`[UPGRADE-PLAN] Estratégia 3 (primeira org ativa): ${orgId} (${mainOrg.name})`);
        }
      }

      if (!orgId) {
        clearTimeout(timeout);
        console.error(`[UPGRADE-PLAN] Nenhuma org encontrada para ${user.email}`);
        return res.status(404).json({ error: `Organização não encontrada. Email: ${user.email}` });
      }

      // Atualizar o plano
      const nextBilling = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: updated, error: updateErr } = await supabase
        .from('organizations')
        .update({
          plan: planId,
          payment_status: 'pending',
          subscription_expires_at: nextBilling,
          status: 'active'
        })
        .eq('id', orgId)
        .select('id, name, plan, payment_status')
        .single();

      clearTimeout(timeout);

      if (updateErr) {
        console.error('[UPGRADE-PLAN] Erro no update:', updateErr.message);
        return res.status(500).json({ error: updateErr.message });
      }

      console.log('[UPGRADE-PLAN] Sucesso!', updated);
      res.json({ success: true, organization: updated });
    } catch (err: any) {
      clearTimeout(timeout);
      console.error('[UPGRADE-PLAN] Erro inesperado:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Change plan for logged-in store
  app.post("/api/subscription/change-plan", async (req, res) => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[API][${requestId}] Request iniciada para troca de plano`);
    
    // Proteção de Timeout no Servidor
    const serverTimeout = setTimeout(() => {
      console.error(`[API][${requestId}] SERVER TIMEOUT: A operação excedeu 12 segundos.`);
      if (!res.headersSent) {
        res.status(504).json({ error: 'Servidor demorou a responder. Tente novamente.' });
      }
    }, 12000);

    try {
      const { planId } = req.body;
      if (!planId) {
        clearTimeout(serverTimeout);
        console.warn(`[API][${requestId}] planId ausente`);
        return res.status(400).json({ error: 'Missing planId' });
      }

      console.log(`[API][${requestId}] Resolvendo organização...`);
      const orgId = await getOrganizationFromAuth(req.headers.authorization);
      console.log(`[API][${requestId}] Org vinculada: ${orgId}. Iniciando Update...`);

      const { data, error } = await supabase
        .from('organizations')
        .update({ 
          plan: planId, 
          payment_status: 'pending',
          subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', orgId)
        .select()
        .single();

      clearTimeout(serverTimeout);

      if (error) {
        console.error(`[API][${requestId}] Erro Supabase:`, error.message);
        return res.status(500).json({ error: error.message });
      }
      
      console.log(`[API][${requestId}] Upgrade OK! Retornando dados.`);
      res.json(data);
    } catch (err: any) {
      clearTimeout(serverTimeout);
      console.error(`[API][${requestId}] EXCEÇÃO CRÍTICA:`, err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    }
  });

   app.patch("/api/admin/organizations/:id/payment", requireSuperAdmin, async (req, res) => {
    try {
      const { payment_status, subscription_expires_at } = req.body;
      const updates: any = {};
      
      // Mapeamento de campos (Rollback para esquema legado)
      if (payment_status) updates.payment_status = payment_status; // 'paid', 'pending', etc.
      if (subscription_expires_at) updates.subscription_expires_at = subscription_expires_at;
      
      // If confirming payment, also set status to active
      if (payment_status === 'paid') updates.status = 'active';

      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error confirming payment:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from dist
    app.use(express.static(path.join(__dirname, "dist")));
    
    // Catch-all route for SPA - MUST BE LAST
    app.get("*", (req, res, next) => {
      // If it's an API route that wasn't matched, skip to error/404
      if (req.url.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }


  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
