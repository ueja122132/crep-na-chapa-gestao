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
  const [extraIngredients, setExtraIngredients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [extraPrice, setExtraPrice] = useState(5.0);

  useEffect(() => {
    fetchProducts();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      const priceSetting = data.find((s: any) => s.key === 'extra_ingredient_price');
      if (priceSetting) {
        setExtraPrice(parseFloat(priceSetting.value));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const allIngredients = Array.from(new Set(products.flatMap(p => p.ingredients))).sort();

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data);
  };

  const openCustomizer = (product: Product) => {
    setSelectedProduct(product);
    setCustomizations(product.ingredients);
    setExtraIngredients([]);
    setIsOrdering(true);
  };

  const toggleCustomization = (ingredient: string) => {
    if (customizations.includes(ingredient)) {
      setCustomizations(customizations.filter(i => i !== ingredient));
    } else {
      setCustomizations([...customizations, ingredient]);
    }
  };

  const toggleExtra = (ingredient: string) => {
    if (extraIngredients.includes(ingredient)) {
      setExtraIngredients(extraIngredients.filter(i => i !== ingredient));
    } else {
      setExtraIngredients([...extraIngredients, ingredient]);
    }
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    
    const removals = selectedProduct.ingredients
      .filter(ing => !customizations.includes(ing))
      .map(ing => `Sem ${ing}`);
      
    const extras = extraIngredients.map(ing => `+ ${ing}`);

    const finalCustomizations = [...removals, ...extras];
    const finalPrice = selectedProduct.price + (extraIngredients.length * extraPrice);

    const newItem: OrderItem = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      product_type: selectedProduct.type,
      price: finalPrice,
      customizations: finalCustomizations
    };

    setCart([...cart, newItem]);
    setIsOrdering(false);
    setSelectedProduct(null);
    setExtraIngredients([]);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const total = cart.reduce((acc, item) => acc + item.price, 0);

  const finalizeOrder = async () => {
    if (cart.length === 0 || isLoading) return;

    setIsLoading(true);
    try {
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
    } catch (error) {
      console.error('Erro ao finalizar pedido:', error);
      alert('Erro ao enviar o pedido. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
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
        <div className="bg-white rounded-2xl shadow-xl border border-stone-200 flex flex-col h-[calc(100vh-5.5rem)] sticky top-20">
          <div className="p-2.5 border-b border-stone-100 bg-stone-50/30 rounded-t-2xl">
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nome do Cliente"
                className="w-full pl-8 pr-3 py-1 bg-white border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 space-y-1 bg-stone-50/20">
            {cart.map((item, index) => (
              <div key={index} className="group relative flex flex-col p-2 bg-white rounded-lg border border-stone-100 hover:border-orange-200 shadow-sm transition-all">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-stone-800 text-[13px] truncate">{item.product_name}</h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-orange-600">R${item.price.toFixed(2)}</span>
                    <button 
                      onClick={() => removeFromCart(index)}
                      className="p-1 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                {item.customizations && item.customizations.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {item.customizations.map((cust, cIdx) => (
                      <span 
                        key={cIdx} 
                        className={`text-[8px] px-1 py-0 rounded focus:outline-none leading-tight font-bold ${
                          cust.startsWith('Sem') 
                            ? 'bg-red-50 text-red-400' 
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {cust.replace('Sem ', 'X ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center py-8 text-stone-300">
                <ShoppingCart className="w-8 h-8 mb-2 stroke-[1]" />
                <p className="text-[10px] font-bold uppercase">Vazio</p>
              </div>
            )}
          </div>

          <div className="p-3 bg-white border-t border-stone-100 rounded-b-2xl">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-bold text-stone-400 uppercase">Pagamento</span>
                <div className="flex gap-1">
                  <button onClick={() => setPaymentStatus('paid')} className={`px-2 py-1 rounded text-[10px] font-bold border ${paymentStatus === 'paid' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-stone-100 text-stone-400'}`}>PAGO</button>
                  <button onClick={() => setPaymentStatus('pending')} className={`px-2 py-1 rounded text-[10px] font-bold border ${paymentStatus === 'pending' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-stone-100 text-stone-400'}`}>ENTREGA</button>
                </div>
              </div>

              {paymentStatus === 'paid' && (
                <div className="grid grid-cols-3 gap-1">
                  <button onClick={() => setPaymentMethod('pix')} className={`py-1.5 rounded border text-[10px] font-bold flex flex-col items-center ${paymentMethod === 'pix' ? 'bg-stone-800 text-white' : 'bg-white text-stone-400'}`}><QrCode className="w-3 h-3 mb-0.5" /> PIX</button>
                  <button onClick={() => setPaymentMethod('dinheiro')} className={`py-1.5 rounded border text-[10px] font-bold flex flex-col items-center ${paymentMethod === 'dinheiro' ? 'bg-stone-800 text-white' : 'bg-white text-stone-400'}`}><Banknote className="w-3 h-3 mb-0.5" /> DINHEIRO</button>
                  <button onClick={() => setPaymentMethod('cartao')} className={`py-1.5 rounded border text-[10px] font-bold flex flex-col items-center ${paymentMethod === 'cartao' ? 'bg-stone-800 text-white' : 'bg-white text-stone-400'}`}><CreditCard className="w-3 h-3 mb-0.5" /> CARTÃO</button>
                </div>
              )}

              {paymentStatus === 'paid' && paymentMethod === 'dinheiro' && (
                <div className="flex items-center gap-2 bg-stone-50 p-1.5 rounded border border-stone-100">
                  <input type="number" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} className="w-full bg-white border border-stone-200 rounded px-2 py-1 text-xs font-bold" placeholder="Valor..." />
                  {parseFloat(amountReceived) > total && (
                    <div className="whitespace-nowrap text-[10px] font-bold text-emerald-600">Troco: R${(parseFloat(amountReceived) - total).toFixed(2)}</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center my-2.5">
              <span className="text-[10px] font-black text-stone-400 uppercase">Total</span>
              <span className="text-xl font-black text-orange-600">R$ {total.toFixed(2)}</span>
            </div>
            
            <button
              onClick={finalizeOrder}
              disabled={cart.length === 0 || isLoading}
              className={`w-full py-4 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-orange-200/50 ${
                cart.length === 0 || isLoading
                  ? 'bg-stone-300 cursor-not-allowed grayscale'
                  : 'bg-orange-600 hover:bg-orange-700 active:scale-[0.98]'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ENVIANDO...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  FINALIZAR PEDIDO
                </>
              )}
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
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {/* Base Ingredients */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest">Ingredientes Base</h4>
                    <div className="grid grid-cols-1 gap-2">
                    {selectedProduct.ingredients.map((ing) => (
                      <button
                        key={ing}
                        onClick={() => toggleCustomization(ing)}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          customizations.includes(ing)
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                            : 'bg-red-50 border-red-200 text-red-700 hover:border-red-300'
                        }`}
                      >
                        <span className="font-bold">{ing}</span>
                        {customizations.includes(ing) ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <span className="text-[10px] font-black uppercase">Removido</span>
                        )}
                      </button>
                    ))}
                    </div>
                  </div>

                  {/* Additional Ingredients */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest">Acrescentar Adicionais</h4>
                      <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                        + R$ {extraPrice.toFixed(2)} cada
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                    {allIngredients.filter(ing => !selectedProduct?.ingredients.includes(ing)).map((ing: string) => (
                      <button
                        key={ing}
                        onClick={() => toggleExtra(ing)}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all font-bold text-sm ${
                          extraIngredients.includes(ing)
                            ? 'bg-orange-50 border-orange-500 text-orange-700'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-300'
                        }`}
                      >
                        {ing}
                        {extraIngredients.includes(ing) ? (
                          <Plus className="w-4 h-4 text-orange-500" />
                        ) : (
                          <Plus className="w-4 h-4 opacity-20" />
                        )}
                      </button>
                    ))}
                    </div>
                  </div>
                  
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
                    Adicionar R$ {(selectedProduct.price + (extraIngredients.length * extraPrice)).toFixed(2)}
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
