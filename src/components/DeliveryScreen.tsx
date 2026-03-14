import { useState, useEffect } from 'react';
import { Package, CheckCircle2, DollarSign, User, Clock, Banknote, CreditCard, QrCode, Edit2, Plus, Trash2, X } from 'lucide-react';
import { Order, Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

export default function DeliveryScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'ready' | 'delivered'>('ready');
  const [payingOrder, setPayingOrder] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'dinheiro' | 'cartao'>('pix');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [editingItem, setEditingItem] = useState<{orderId: number, itemId: number, currentCustoms: string[], productId: number} | null>(null);
  const [extraIngredients, setExtraIngredients] = useState<string[]>([]);

  useEffect(() => {
    fetchOrders();
    fetchProducts();

    const ordersChannel = supabase
      .channel('delivery-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    const itemsChannel = supabase
      .channel('delivery-items')
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

  const markAsDelivered = async (id: number) => {
    await fetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'delivered' })
    });
    fetchOrders();
  };

  const filteredOrders = orders.filter(o => o.status === activeTab);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-stone-800">Entrega & Pagamento</h2>
          <p className="text-stone-500">Gerencie pedidos prontos e pagamentos pendentes</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('ready')}
          className={`pb-4 px-2 font-bold transition-colors relative ${
            activeTab === 'ready' ? 'text-orange-600' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          A Entregar
          {activeTab === 'ready' && (
            <motion.div layoutId="delivery-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('delivered')}
          className={`pb-4 px-2 font-bold transition-colors relative ${
            activeTab === 'delivered' ? 'text-orange-600' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          Entregues
          {activeTab === 'delivered' && (
            <motion.div layoutId="delivery-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-full"
            >
              <div className="p-5 bg-stone-50 border-b border-stone-100 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black text-stone-400 uppercase tracking-widest">#{order.id}</span>
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

              <div className="flex-1 p-5 space-y-4">
                <div className="flex justify-between items-center bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <span className="text-sm font-bold text-stone-500">Total:</span>
                  <span className="text-lg font-black text-stone-800">R$ {order.total_price.toFixed(2)}</span>
                </div>

                <div className="space-y-3 py-2">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Itens do Pedido</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 p-2 rounded-xl bg-stone-50 border border-stone-100 group">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-stone-800 truncate">{item.product_name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.customizations.map((cust, j) => (
                              <span key={j} className="text-[8px] font-bold text-stone-500 bg-white px-1 py-0.5 rounded border border-stone-100">{cust}</span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => setEditingItem({
                            orderId: order.id,
                            itemId: item.id!,
                            currentCustoms: item.customizations,
                            productId: item.product_id
                          })}
                          className="p-1 px-2 bg-white border border-stone-200 rounded-lg text-stone-400 hover:text-stone-600 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Status do Pagamento</p>
                  {order.payment_status === 'paid' ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-bold text-sm">Pago</span>
                        {order.payment_method && (
                          <span className="text-xs uppercase bg-emerald-100 px-2 py-0.5 rounded-md ml-auto">
                            {order.payment_method}
                          </span>
                        )}
                      </div>
                      {order.payment_method === 'dinheiro' && order.amount_received && (
                        <div className="text-xs text-stone-500 flex justify-between px-2">
                          <span>Recebido: R$ {order.amount_received.toFixed(2)}</span>
                          <span className="font-bold text-emerald-600">Troco: R$ {(order.amount_received - order.total_price).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-2 rounded-lg border border-orange-100">
                      <Banknote className="w-4 h-4" />
                      <span className="font-bold text-sm">Aguardando Pagamento</span>
                    </div>
                  )}
                </div>
              </div>

              {activeTab === 'ready' && (
                <div className="p-5 bg-stone-50 border-t border-stone-100 mt-auto space-y-3">
                  {order.payment_status === 'pending' && payingOrder !== order.id && (
                    <button
                      onClick={() => setPayingOrder(order.id)}
                      className="w-full py-3 bg-stone-800 text-white font-bold rounded-xl hover:bg-stone-900 transition-all flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      Receber Pagamento
                    </button>
                  )}

                  {payingOrder === order.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 bg-white p-3 rounded-xl border border-stone-200">
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => setPaymentMethod('pix')}
                          className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg border text-xs font-bold transition-all ${
                            paymentMethod === 'pix' ? 'bg-stone-800 border-stone-800 text-white' : 'bg-white border-stone-200 text-stone-500'
                          }`}
                        >
                          <QrCode className="w-4 h-4" />
                          PIX
                        </button>
                        <button
                          onClick={() => setPaymentMethod('dinheiro')}
                          className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg border text-xs font-bold transition-all ${
                            paymentMethod === 'dinheiro' ? 'bg-stone-800 border-stone-800 text-white' : 'bg-white border-stone-200 text-stone-500'
                          }`}
                        >
                          <Banknote className="w-4 h-4" />
                          Dinheiro
                        </button>
                        <button
                          onClick={() => setPaymentMethod('cartao')}
                          className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg border text-xs font-bold transition-all ${
                            paymentMethod === 'cartao' ? 'bg-stone-800 border-stone-800 text-white' : 'bg-white border-stone-200 text-stone-500'
                          }`}
                        >
                          <CreditCard className="w-4 h-4" />
                          Cartão
                        </button>
                      </div>

                      {paymentMethod === 'dinheiro' && (
                        <div className="space-y-2">
                          <input
                            type="number"
                            step="0.01"
                            value={amountReceived}
                            onChange={(e) => setAmountReceived(e.target.value)}
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold text-stone-800 text-sm"
                            placeholder="Valor recebido (R$)"
                          />
                          {parseFloat(amountReceived) >= order.total_price && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="font-bold text-stone-500">Troco:</span>
                              <span className="font-black text-emerald-600">
                                R$ {(parseFloat(amountReceived) - order.total_price).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => setPayingOrder(null)}
                          className="flex-1 py-2 bg-stone-100 text-stone-600 font-bold rounded-lg hover:bg-stone-200 text-sm"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => markAsPaid(order)}
                          className="flex-1 py-2 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 text-sm"
                        >
                          Confirmar
                        </button>
                      </div>
                    </motion.div>
                  )}
                  
                  <button
                    disabled={order.payment_status !== 'paid'}
                    onClick={() => markAsDelivered(order.id)}
                    className={`w-full py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                      order.payment_status === 'paid'
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-100'
                        : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    <Package className="w-5 h-5" />
                    Marcar como Entregue
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredOrders.length === 0 && (
          <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-stone-400">
            <Package className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">
              {activeTab === 'ready' ? 'Nenhum pedido pronto para entrega' : 'Nenhum pedido entregue ainda'}
            </p>
          </div>
        )}
      </div>

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
                    {products.find(p => p.id === editingItem.productId)?.ingredients.map((ing: string) => (
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
                    {allIngredients.filter(ing => !products.find(p => p.id === editingItem.productId)?.ingredients.includes(ing)).map((ing: string) => (
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

                <div className="space-y-3">
                  <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest">Remover (Sem...)</h4>
                  <div className="flex flex-wrap gap-2">
                     {products.find(p => p.id === editingItem.productId)?.ingredients.map((ing: string) => {
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
    </div>
  );
}
