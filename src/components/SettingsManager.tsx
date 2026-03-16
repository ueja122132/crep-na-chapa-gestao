import React, { useState, useEffect } from 'react';
import { Settings, DollarSign, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import SubscriptionWidget from './SubscriptionWidget';

export default function SettingsManager() {
  const { session } = useAuth();
  const [extraPrice, setExtraPrice] = useState<string>('5.00');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (session) {
      fetchSettings();
    }
  }, [session]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await res.json();
      const priceSetting = data.find((s: any) => s.key === 'extra_ingredient_price');
      if (priceSetting) {
        setExtraPrice(priceSetting.value);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/config', { // Reuse system_config endpoint or specialized settings
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          key: 'extra_ingredient_price',
          value: parseFloat(extraPrice).toFixed(2)
        })
      });

      if (!res.ok) throw new Error('Falha ao salvar configurações');
      
      setMessage({ text: 'Configurações salvas com sucesso!', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-stone-800">Ajustes da Unidade</h2>
        <p className="text-stone-500">Configure os parâmetros operacionais da sua loja</p>
      </div>

      {/* Widget de Assinatura */}
      <SubscriptionWidget />

      <div className="bg-white rounded-[2rem] shadow-sm border border-stone-200 overflow-hidden">
        <div className="p-8 border-b border-stone-100 flex items-center gap-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-stone-800">Parâmetros de Venda</h3>
            <p className="text-xs text-stone-400 font-medium uppercase tracking-wider">Ajustes de Preço e Regras</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <DollarSign className="w-3 h-3" />
                Preço do Ingrediente Extra (R$)
              </label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">R$</span>
                <input
                  type="number"
                  step="0.10"
                  value={extraPrice}
                  onChange={(e) => setExtraPrice(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all group-hover:border-stone-300"
                  placeholder="5,00"
                />
              </div>
              <p className="text-[10px] text-stone-400 font-medium ml-1">
                Este valor será aplicado a cada ingrediente adicional adicionado a um crepe no terminal de vendas.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-50 flex items-center justify-between">
            <div>
              {message && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center gap-2 text-sm font-bold ${
                    message.type === 'success' ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {message.text}
                </motion.div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`flex items-center gap-2 px-8 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-black transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-stone-200`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>

      <div className="bg-amber-50 rounded-[2rem] border border-amber-200/50 p-8 flex items-start gap-4">
        <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-amber-900">Importante</h4>
          <p className="text-sm text-amber-700 font-medium leading-relaxed max-w-2xl">
            Alterações de preço têm efeito imediato no Terminal de Pedidos. Certifique-se de avisar sua equipe antes de realizar mudanças drásticas nos valores operacionais.
          </p>
        </div>
      </div>
    </div>
  );
}
