import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, ChefHat, User, ClipboardList, Timer } from 'lucide-react';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchOrders();

    // Subscribe to changes in the 'orders' table
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders(); // Re-fetch all orders to get joined items
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    const res = await fetch('/api/orders');
    const data = await res.json();
    // Only show pending orders in the kitchen
    setOrders(data.filter((o: Order) => o.status === 'pending'));
  };

  const completeOrder = async (id: number) => {
    await fetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ready' })
    });
    fetchOrders();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-stone-800">Cozinha</h2>
          <p className="text-stone-500">Pedidos aguardando preparo</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full font-bold text-sm">
          <ChefHat className="w-4 h-4" />
          <span>{orders.length} Pedidos Ativos</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-full"
            >
              {/* Card Header */}
              <div className="p-5 bg-stone-50 border-b border-stone-100 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black text-stone-400 uppercase tracking-widest">#{order.id}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  </div>
                  <h3 className="font-bold text-stone-800 flex items-center gap-2">
                    <User className="w-4 h-4 text-stone-400" />
                    {order.customer_name}
                  </h3>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 text-stone-400 text-xs font-medium">
                    <Clock className="w-3 h-3" />
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="flex-1 p-5 space-y-4">
                {order.items.map((item, i) => (
                  <div key={i} className="group">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-stone-100 flex items-center justify-center text-[10px] font-bold text-stone-500 shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-stone-800 leading-tight">{item.product_name}</h4>
                          <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${
                            item.product_type === 'crepe' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {item.product_type === 'crepe' ? 'Crepe' : 'Churrasco'}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.customizations.map((cust, j) => {
                            const isRemoval = cust.toLowerCase().startsWith('sem ');
                            return (
                              <span key={j} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                isRemoval ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {cust}
                              </span>
                            );
                          })}
                          {item.customizations.length === 0 && (
                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-50 rounded-md border border-emerald-200">Completo</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Card Footer */}
              <div className="p-5 bg-stone-50 border-t border-stone-100 mt-auto">
                <button
                  onClick={() => completeOrder(order.id)}
                  className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 group"
                >
                  <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Pronto para Entrega
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {orders.length === 0 && (
          <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-stone-400">
            <ChefHat className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhum pedido pendente</p>
            <p className="text-sm">Tudo limpo na cozinha!</p>
          </div>
        )}
      </div>
    </div>
  );
}
