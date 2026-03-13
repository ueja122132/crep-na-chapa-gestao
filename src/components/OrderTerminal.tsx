import { useState, useEffect } from 'react';
import { Plus, Minus, ShoppingCart, User, CheckCircle2, X, CreditCard, Banknote, QrCode, Clock } from 'lucide-react';
import { Product, OrderItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function OrderTerminal() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('paid');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'dinheiro' | 'cartao'>('pix');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [isOrdering, setIsOrdering] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customizations, setCustomizations] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data);
  };

  const openCustomizer = (product: Product) => {
    setSelectedProduct(product);
    setCustomizations(product.ingredients);
    setIsOrdering(true);
  };

  const toggleCustomization = (ingredient: string) => {
    if (customizations.includes(ingredient)) {
      setCustomizations(customizations.filter(i => i !== ingredient));
    } else {
      setCustomizations([...customizations, ingredient]);
    }
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    
    const finalCustomizations = selectedProduct.ingredients.map(ing => {
      return customizations.includes(ing) ? ing : `Sem ${ing}`;
    });

    const newItem: OrderItem = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      product_type: selectedProduct.type,
      price: selectedProduct.price,
      customizations: finalCustomizations
    };

    setCart([...cart, newItem]);
    setIsOrdering(false);
    setSelectedProduct(null);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const total = cart.reduce((acc, item) => acc + item.price, 0);

  const finalizeOrder = async () => {
    if (cart.length === 0) return;

    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: customerName || 'Cliente Balcão',
        total_price: total,
        items: cart,
        payment_status: paymentStatus,
        payment_method: paymentStatus === 'paid' ? paymentMethod : null,
        amount_received: paymentStatus === 'paid' && paymentMethod === 'dinheiro' && amountReceived ? parseFloat(amountReceived) : null
      })
    });

    setCart([]);
    setCustomerName('');
    setPaymentStatus('paid');
    setPaymentMethod('pix');
    setAmountReceived('');
    alert('Pedido enviado para a cozinha!');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Products Grid */}
      <div className="lg:col-span-2">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-stone-800 mb-2">Novo Pedido</h2>
          <p className="text-stone-500">Selecione os itens para montar o pedido</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => openCustomizer(product)}
              className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm hover:border-orange-500 hover:shadow-md transition-all text-left group"
            >
              <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${
                product.type === 'crepe' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
              }`}>
                <span className="font-bold text-lg">{product.name[0]}</span>
              </div>
              <h3 className="font-bold text-stone-800 group-hover:text-orange-600 transition-colors">{product.name}</h3>
              <p className="text-xs text-stone-400 mb-2 uppercase tracking-wider">{product.type}</p>
              <p className="text-orange-600 font-bold">R$ {product.price.toFixed(2)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Cart / Checkout */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl shadow-lg border border-stone-200 flex flex-col h-[calc(100vh-12rem)] sticky top-24">
          <div className="p-6 border-b border-stone-100">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-bold">Resumo do Pedido</h2>
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nome do Cliente"
                className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.map((item, index) => (
              <div key={index} className="group relative flex flex-col gap-2 p-4 bg-stone-50 rounded-2xl border border-stone-200 hover:border-orange-300 hover:bg-white transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-extrabold text-stone-900 text-base leading-tight">{item.product_name}</h4>
                    <p className="text-[10px] text-stone-400 uppercase tracking-tighter mt-0.5">{item.product_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-orange-600">R$ {item.price.toFixed(2)}</p>
                  </div>
                  <button 
                    onClick={() => removeFromCart(index)}
                    className="ml-2 p-1 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Remover item"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {item.customizations && item.customizations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.customizations.map((cust, cIdx) => (
                      <span 
                        key={cIdx} 
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          cust.startsWith('Sem') 
                            ? 'bg-red-50 text-red-600 border border-red-100' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}
                      >
                        {cust}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center py-12 text-stone-400 opacity-50">
                <ShoppingCart className="w-16 h-16 mb-4 stroke-[1.5]" />
                <p className="font-bold">Seu carrinho está vazio</p>
                <p className="text-xs">Adicione itens do cardápio</p>
              </div>
            )}
          </div>

          <div className="p-6 bg-stone-50 border-t border-stone-200 rounded-b-2xl">
            <div className="mb-4">
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Momento do Pagamento</label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setPaymentStatus('paid')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-bold transition-all ${
                    paymentStatus === 'paid' 
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                      : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Pago Agora
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('pending')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-bold transition-all ${
                    paymentStatus === 'pending' 
                      ? 'bg-orange-50 border-orange-500 text-orange-700' 
                      : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Na Entrega
                </button>
              </div>

              {paymentStatus === 'paid' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Forma de Pagamento</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('pix')}
                        className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg border text-xs font-bold transition-all ${
                          paymentMethod === 'pix' 
                            ? 'bg-stone-800 border-stone-800 text-white' 
                            : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                        }`}
                      >
                        <QrCode className="w-4 h-4" />
                        PIX
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('dinheiro')}
                        className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg border text-xs font-bold transition-all ${
                          paymentMethod === 'dinheiro' 
                            ? 'bg-stone-800 border-stone-800 text-white' 
                            : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                        }`}
                      >
                        <Banknote className="w-4 h-4" />
                        Dinheiro
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cartao')}
                        className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg border text-xs font-bold transition-all ${
                          paymentMethod === 'cartao' 
                            ? 'bg-stone-800 border-stone-800 text-white' 
                            : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        Cartão
                      </button>
                    </div>
                  </div>

                  {paymentMethod === 'dinheiro' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-3 rounded-xl border border-stone-200 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Valor Recebido (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min={total}
                          value={amountReceived}
                          onChange={(e) => setAmountReceived(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold text-stone-800"
                          placeholder="0.00"
                        />
                      </div>
                      
                      {parseFloat(amountReceived) >= total && (
                        <div className="flex justify-between items-center pt-2 border-t border-stone-100">
                          <span className="text-sm font-bold text-stone-500">Troco:</span>
                          <span className="text-lg font-black text-emerald-600">
                            R$ {(parseFloat(amountReceived) - total).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>

            <div className="flex justify-between items-center mb-4 pt-4 border-t border-stone-200">
              <span className="text-stone-500 font-medium">Total</span>
              <span className="text-2xl font-black text-stone-800">R$ {total.toFixed(2)}</span>
            </div>
            <button
              disabled={cart.length === 0}
              onClick={finalizeOrder}
              className="w-full py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Finalizar Pedido
            </button>
          </div>
        </div>
      </div>

      {/* Customizer Modal */}
      <AnimatePresence>
        {isOrdering && selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOrdering(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-stone-800">{selectedProduct.name}</h3>
                  <p className="text-sm text-stone-500">Personalize os ingredientes</p>
                </div>
                <button onClick={() => setIsOrdering(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-stone-400" />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                  {selectedProduct.ingredients.map((ing) => (
                    <button
                      key={ing}
                      onClick={() => toggleCustomization(ing)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        customizations.includes(ing)
                          ? 'bg-orange-50 border-orange-500 text-orange-700'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <span className="font-medium">{ing}</span>
                      {customizations.includes(ing) ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-stone-300" />
                      )}
                    </button>
                  ))}
                  {selectedProduct.ingredients.length === 0 && (
                    <p className="text-center text-stone-400 py-4 italic">Nenhum ingrediente base listado.</p>
                  )}
                </div>

                <div className="mt-8 flex gap-4">
                  <button
                    onClick={() => setIsOrdering(false)}
                    className="flex-1 py-3 font-bold text-stone-500 hover:bg-stone-50 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={addToCart}
                    className="flex-[2] py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
                  >
                    Adicionar R$ {selectedProduct.price.toFixed(2)}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
