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
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    
    // 1. Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error resolving user:', authError);
      throw new Error('Unauthorized');
    }

    // 2. Get organization_id from user_profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.warn(`Profile not found for user ${user.id} (${user.email}). Falling back to main org if admin.`);
      
      // Fallback for main admin if profile is missing
      if (user.email === 'admin@crepnachapa.com' || user.email === 'seu-email-aqui') {
         const { data: mainOrg } = await supabase.from('organizations').select('id').eq('slug', 'crep-na-chapa').single();
         if (mainOrg) return mainOrg.id;
      }
      
      throw new Error('Organization context not found. Please complete your registration.');
    }

    return profile.organization_id;
  } catch (err: any) {
    console.error('Critical error in getOrganizationFromAuth:', err.message);
    throw err;
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
