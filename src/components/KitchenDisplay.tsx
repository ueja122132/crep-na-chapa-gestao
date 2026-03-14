import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, ChefHat, User, ClipboardList, Timer, DollarSign, Edit2, Plus, Trash2, Banknote, CreditCard, QrCode, X } from 'lucide-react';
import { Order, Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [payingOrder, setPayingOrder] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'dinheiro' | 'cartao'>('pix');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [editingItem, setEditingItem] = useState<{orderId: number, itemId: number, currentCustoms: string[], productId: number} | null>(null);
  const [extraIngredients, setExtraIngredients] = useState<string[]>([]);

  useEffect(() => {
    fetchOrders();
    fetchProducts();

    // Subscribe to changes in the 'orders' table
    const ordersChannel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    // Also subscribe to order_items for real-time item updates
    const itemsChannel = supabase
      .channel('kitchen-items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, []);

  const allIngredients = Array.from(new Set(products.flatMap(p => p.ingredients))).sort();

  const fetchOrders = async () => {
    const res = await fetch('/api/orders');
    const data = await res.json();
    setOrders(data);
  };

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data);
  };

  const completeOrder = async (id: number) => {
    await fetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ready' })
    });
    fetchOrders();
  };

  const markAsPaid = async (order: Order) => {
    await fetch(`/api/orders/${order.id}/payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        payment_status: 'paid',
        payment_method: paymentMethod,
        amount_received: paymentMethod === 'dinheiro' && amountReceived ? parseFloat(amountReceived) : null
      })
    });
    setPayingOrder(null);
    setAmountReceived('');
    fetchOrders();
  };

  const updateItemCustomizations = async () => {
    if (!editingItem) return;
    
    // Merge actual customizations with new extras
    const baseCustoms = editingItem.currentCustoms.filter(c => !c.startsWith('+ '));
    const extras = extraIngredients.map(ing => `+ ${ing}`);
    const finalCustoms = [...baseCustoms, ...extras];

    await fetch(`/api/order-items/${editingItem.itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customizations: finalCustoms })
    });
    
    setEditingItem(null);
    setExtraIngredients([]);
    fetchOrders();
  };

  const toggleIngredient = (ingredient: string) => {
    if (!editingItem) return;
    
    const newCustoms = editingItem.currentCustoms.includes(ingredient)
      ? editingItem.currentCustoms.filter(c => c !== ingredient)
      : [...editingItem.currentCustoms, ingredient];
      
    setEditingItem({ ...editingItem, currentCustoms: newCustoms });
  };

  const toggleExtra = (ingredient: string) => {
    if (extraIngredients.includes(ingredient)) {
      setExtraIngredients(extraIngredients.filter(i => i !== ingredient));
    } else {
      setExtraIngredients([...extraIngredients, ingredient]);
    }
  };

  const openEditor = (orderId: number, item: any) => {
    const itemExtras = item.customizations
      .filter((c: string) => c.startsWith('+ '))
      .map((c: string) => c.replace('+ ', ''));
      
    setEditingItem({
      orderId,
      itemId: item.id!,
      currentCustoms: item.customizations,
      productId: item.product_id
    });
    setExtraIngredients(itemExtras);
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
              className={`bg-white rounded-3xl shadow-sm border overflow-hidden flex flex-col h-full ${
                order.status === 'ready' ? 'border-emerald-200' : 'border-stone-200'
              }`}
            >
              {/* Card Header */}
              <div className={`p-5 border-b border-stone-100 flex justify-between items-start ${
                order.status === 'ready' ? 'bg-emerald-50' : 'bg-stone-50'
              }`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black text-stone-400 uppercase tracking-widest">#{order.id}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${order.status === 'ready' ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`} />
                  </div>
                  <h3 className="font-bold text-stone-800 flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-stone-400" />
                    {order.customer_name}
                  </h3>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-stone-400 text-xs font-medium">
                    <Clock className="w-3 h-3" />
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {order.payment_status === 'paid' ? (
                    <span className="text-[10px] font-black uppercase tracking-tighter text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">Pago</span>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-tighter text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">Pendente</span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="flex-1 p-5 space-y-4">
                {order.items.map((item, i) => (
                  <div key={i} className="group pb-3 last:pb-0 border-b last:border-0 border-stone-100">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-stone-100 flex items-center justify-center text-[10px] font-bold text-stone-500 shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-stone-800 leading-tight text-sm">{item.product_name}</h4>
                            <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${
                              item.product_type === 'crepe' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {item.product_type}
                            </span>
                          </div>
                          <button
                            onClick={() => setEditingItem({
                              orderId: order.id,
                              itemId: item.id!,
                              currentCustoms: item.customizations,
                              productId: item.product_id
                            })}
                            className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-600 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.customizations.map((cust, j) => {
                            const isRemoval = cust.toLowerCase().startsWith('sem ');
                            return (
                              <span key={j} className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                isRemoval ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              }`}>
                                {cust}
                              </span>
                            );
                          })}
                          {item.customizations.length === 0 && (
                            <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-100">Completo</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Card Footer */}
              <div className="p-4 bg-stone-50 border-t border-stone-100 mt-auto space-y-2">
                {order.payment_status === 'pending' && payingOrder !== order.id && (
                  <button
                    onClick={() => setPayingOrder(order.id)}
                    className="w-full py-2 bg-stone-800 text-white text-xs font-bold rounded-xl hover:bg-stone-900 transition-all flex items-center justify-center gap-2"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Receber Pagamento
                  </button>
                )}

                {payingOrder === order.id && (
                  <div className="space-y-2 bg-white p-2 rounded-xl border border-stone-200">
                    <div className="grid grid-cols-3 gap-1">
                      {['pix', 'dinheiro', 'cartao'].map((method) => (
                        <button
                          key={method}
                          onClick={() => setPaymentMethod(method as any)}
                          className={`flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-lg border text-[10px] font-bold transition-all ${
                            paymentMethod === method ? 'bg-stone-800 border-stone-800 text-white' : 'bg-white border-stone-200 text-stone-500'
                          }`}
                        >
                          {method === 'pix' ? <QrCode className="w-3 h-3" /> : method === 'dinheiro' ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                          {method.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    {paymentMethod === 'dinheiro' && (
                      <input
                        type="number"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        className="w-full px-2 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold"
                        placeholder="Valor R$"
                      />
                    )}
                    <div className="flex gap-1 pt-1">
                      <button onClick={() => setPayingOrder(null)} className="flex-1 py-1.5 bg-stone-100 text-stone-500 font-bold rounded-lg text-[10px]">X</button>
                      <button onClick={() => markAsPaid(order)} className="flex-2 py-1.5 bg-emerald-500 text-white font-bold rounded-lg text-[10px]">Confirmar</button>
                    </div>
                  </div>
                )}

                {order.status === 'pending' ? (
                  <button
                    onClick={() => completeOrder(order.id)}
                    className="w-full py-3 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Pronto para Entrega
                  </button>
                ) : (
                  <div className="w-full py-3 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-xl flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Aguardando Retirada
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Edit Overlay */}
        <AnimatePresence>
          {editingItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditingItem(null)}
                className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
              >
                <div className="p-6 bg-stone-50 border-b border-stone-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-stone-800">Editar Ingredientes</h3>
                    <p className="text-sm text-stone-500">Adicione ou remova ingredientes do item</p>
                  </div>
                  <button onClick={() => setEditingItem(null)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                    <X className="w-5 h-5 text-stone-400" />
                  </button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest">Opções da Base</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {products.find(p => p.id === editingItem.productId)?.ingredients.map((ing) => (
                        <button
                          key={ing}
                          onClick={() => toggleIngredient(ing)}
                          className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all font-bold text-sm ${
                            editingItem.currentCustoms.includes(ing)
                              ? 'bg-orange-50 border-orange-200 text-orange-700'
                              : 'bg-white border-stone-100 text-stone-600 hover:border-stone-200'
                          }`}
                        >
                          {ing}
                          {editingItem.currentCustoms.includes(ing) ? <Trash2 className="w-4 h-4 opacity-50" /> : <Plus className="w-4 h-4 opacity-30" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Extras section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest">Adicionar Extras</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {allIngredients.filter(ing => !products.find(p => p.id === editingItem.productId)?.ingredients.includes(ing)).map((ing) => (
                        <button
                          key={ing}
                          onClick={() => toggleExtra(ing)}
                          className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all font-bold text-sm ${
                            extraIngredients.includes(ing)
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                              : 'bg-white border-stone-100 text-stone-600 hover:border-stone-200'
                          }`}
                        >
                          {ing}
                          {extraIngredients.includes(ing) ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4 opacity-30" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Add removals */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest">Remover (Sem...)</h4>
                    <div className="flex flex-wrap gap-2">
                       {products.find(p => p.id === editingItem.productId)?.ingredients.map((ing) => {
                         const removalText = `Sem ${ing}`;
                         return (
                          <button
                            key={removalText}
                            onClick={() => toggleIngredient(removalText)}
                            className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                              editingItem.currentCustoms.includes(removalText)
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : 'bg-white border-stone-200 text-stone-500'
                            }`}
                          >
                            {removalText}
                          </button>
                         );
                       })}
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-stone-50 border-t border-stone-100">
                  <button
                    onClick={updateItemCustomizations}
                    className="w-full py-4 bg-stone-800 text-white font-bold rounded-2xl hover:bg-stone-900 transition-all flex items-center justify-center gap-2"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </motion.div>
            </div>
          )}
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
