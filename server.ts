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

// SQLite initialization removed for Supabase migration

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  
  // Products (Menu)
  app.get("/api/products", async (req, res) => {
    try {
      const { data, error } = await supabase.from("products").select("*");
      if (error) throw error;
      res.json(data.map(p => ({ 
        ...p, 
        ingredients: typeof p.ingredients === 'string' ? JSON.parse(p.ingredients) : (p.ingredients || [])
      })));
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Internal server error fetching products" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const { name, type, price, ingredients } = req.body;
      
      if (!name || !type || price === undefined) {
        return res.status(400).json({ error: "Missing required fields: name, type, price" });
      }

      const { data, error } = await supabase.from("products").insert({
        name,
        type,
        price,
        ingredients: ingredients || []
      }).select().single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Internal server error creating product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Internal server error deleting product" });
    }
  });

  // Orders
  app.get("/api/orders", async (req, res) => {
    try {
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: true });
      
      if (ordersError) throw ordersError;
      
      res.json(orders.map(order => ({
        ...order,
        items: (order.order_items || []).map((item: any) => ({
          ...item,
          customizations: typeof item.customizations === 'string' ? JSON.parse(item.customizations) : (item.customizations || [])
        }))
      })));
    } catch (error) {
      console.error("Error fetching orders:", error);
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
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_name: customer_name || 'Cliente Balcão',
          total_price,
          payment_status: payment_status || 'pending',
          payment_method: payment_method || null,
          amount_received: amount_received || null
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
        customizations: item.customizations || []
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
      // Postgres equivalent for daily stats
      const { data, error } = await supabase.rpc('get_finance_stats');
      
      if (error) {
        // Fallback if RPC not defined
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("orders")
          .select("total_price, created_at")
          .eq("payment_status", "paid");
        
        if (fallbackError) throw fallbackError;
        
        // Manual grouping
        const statsMap = new Map();
        fallbackData.forEach((order: any) => {
          const date = new Date(order.created_at).toISOString().split('T')[0];
          const current = statsMap.get(date) || { total_revenue: 0, total_orders: 0, date };
          current.total_revenue += order.total_revenue || order.total_price;
          current.total_orders += 1;
          statsMap.set(date, current);
        });
        
        return res.json(Array.from(statsMap.values()).sort((a,b) => b.date.localeCompare(a.date)));
      }
      
      res.json(data);
    } catch (error) {
      console.error("Error fetching finance stats:", error);
      res.status(500).json({ error: "Internal server error fetching finance stats" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
