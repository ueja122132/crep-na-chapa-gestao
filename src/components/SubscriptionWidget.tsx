import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, AlertTriangle, CheckCircle2, Clock, Zap, Rocket, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

interface SubscriptionData {
  name: string;
  plan: string;
  status: string;
  payment_status: string;
  subscription_expires_at: string | null;
  created_at: string;
}

const PLAN_DISPLAY: Record<string, { label: string; icon: React.ReactNode; color: string; price: number }> = {
  essencial: { label: 'Essencial', icon: <Zap className="w-4 h-4" />, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', price: 50 },
  profissional: { label: 'Profissional', icon: <Rocket className="w-4 h-4" />, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', price: 100 },
  pro: { label: 'Pro', icon: <Rocket className="w-4 h-4" />, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', price: 100 },
  enterprise: { label: 'Enterprise', icon: <Shield className="w-4 h-4" />, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', price: 450 },
};

export default function SubscriptionWidget() {
  const { session } = useAuth();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPixPay, setShowPixPay] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchSub = async () => {
      try {
        const res = await fetch('/api/subscription', {
          headers: { Authorization: `Bearer ${session?.access_token}` }
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    if (session) fetchSub();
  }, [session]);

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    try {
      // Simula tempo de processamento do banco
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const nextExpiry = new Date();
      nextExpiry.setDate(nextExpiry.getDate() + 30);
      
      // Chamada pra confirmar o pagamento do lado do cliente (simulando webhook/admin)
      // Em produção, a RLS do Supabase deve ser verificada para essa chamada.
      const res = await fetch(`/api/admin/config`, { // Using dummy endpoint temporarily or we could just update local state
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key: 'last_payment_' + data?.name, value: new Date().toISOString() })
      });
      
      // Atualizar o frontend imediatamente para experiência fluida
      setData(prev => ({ 
        ...(prev || { plan: 'essencial', name: 'Loja', created_at: new Date().toISOString() }), 
        payment_status: 'paid', 
        subscription_expires_at: nextExpiry.toISOString(), 
        status: 'active' 
      }));
      setShowPixPay(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return null;
  // REMOVIDO: if (!data) return null;
  // Se não houver dados (erro na api ou usuario sem organizacao), assumimos um valor padrão para não esconder o painel construído
  const safeData = data || {
    plan: 'essencial',
    payment_status: 'pending',
    subscription_expires_at: null,
    status: 'inactive',
    name: 'Loja Não Vinculada'
  };

  const plan = PLAN_DISPLAY[safeData.plan] || { label: safeData.plan || 'Básico', icon: <Zap className="w-4 h-4" />, color: 'text-stone-400 bg-stone-500/10 border-stone-500/20', price: 0 };

  const expiresAt = safeData.subscription_expires_at ? new Date(safeData.subscription_expires_at) : null;
  const now = new Date();
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 5;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  const paymentStatusDisplay: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    paid: { label: 'Pago', color: 'text-green-400', icon: <CheckCircle2 className="w-4 h-4" /> },
    pending: { label: 'Pendente', color: 'text-yellow-400', icon: <Clock className="w-4 h-4" /> },
    overdue: { label: 'Em Atraso', color: 'text-red-400', icon: <AlertTriangle className="w-4 h-4" /> },
  };
  const paymentInfo = paymentStatusDisplay[safeData.payment_status] || paymentStatusDisplay.pending;

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border p-5 ${
          !data ? 'bg-stone-900/50 border-stone-800 opacity-60' :
          isExpired ? 'bg-red-500/10 border-red-500/30' :
          isExpiringSoon ? 'bg-yellow-500/10 border-yellow-500/30' :
          'bg-stone-900/50 border-stone-800'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest">Minha Assinatura</h3>
            {safeData.payment_status === 'paid' && data && (
              <Link 
                to={`/pricing?upgrade=true&storeName=${encodeURIComponent(safeData.name)}`}
                className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1"
                title="Mudar de Plano (Upgrade/Downgrade)"
              >
                Mudar Plano
              </Link>
            )}
          </div>
          {(!data || safeData.payment_status !== 'paid') && (
             <button 
                onClick={() => setShowPixPay(!showPixPay)}
                className="bg-orange-500 text-stone-900 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-orange-400 transition-colors shadow-lg shadow-orange-500/20 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Realizar Pagamento
             </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Plano */}
          <div className="space-y-1">
            <p className="text-[10px] text-stone-500 font-bold uppercase">Plano Atual</p>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-black ${plan.color}`}>
              {plan.icon}
              {plan.label}
            </div>
          </div>
          
          {/* Valor */}
          <div className="space-y-1">
            <p className="text-[10px] text-stone-500 font-bold uppercase">Mensalidade</p>
            <div className="text-stone-200 font-black text-lg">
              R$ {plan.price.toFixed(2).replace('.', ',')}
            </div>
          </div>

          {/* Pagamento */}
          <div className="space-y-1">
            <p className="text-[10px] text-stone-500 font-bold uppercase">Status do Pagamento</p>
            <div className={`flex items-center gap-1.5 font-bold text-sm ${paymentInfo.color}`}>
              {paymentInfo.icon}
              {paymentInfo.label}
            </div>
          </div>

          {/* Vencimento */}
          <div className="space-y-1">
            <p className="text-[10px] text-stone-500 font-bold uppercase">Vencimento</p>
            {expiresAt ? (
              <div className={`flex items-center gap-1.5 font-bold text-sm ${isExpired ? 'text-red-400' : isExpiringSoon ? 'text-yellow-400' : 'text-stone-200'}`}>
                <Calendar className="w-4 h-4" />
                {expiresAt.toLocaleDateString('pt-BR')}
                {daysLeft !== null && daysLeft > 0 && (
                  <span className="text-[10px] text-stone-500 font-normal">({daysLeft}d)</span>
                )}
                {isExpired && <span className="text-xs font-black text-red-400">EXPIRADO</span>}
              </div>
            ) : (
              <span className="text-stone-500 text-sm">—</span>
            )}
          </div>
        </div>

        {/* Alertas */}
        {isExpired && !showPixPay && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Sua assinatura expirou. Realize o pagamento para renovar seu acesso.
          </div>
        )}
      </motion.div>

      {/* PIX Payment Area */}
      {showPixPay && safeData.payment_status !== 'paid' && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-stone-900 border border-stone-800 rounded-3xl p-6 overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-purple-500" />
          
          <div className="flex flex-col md:flex-row items-center gap-8 justify-between">
            <div className="flex-1 space-y-4">
              <div>
                <h4 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-orange-400" />
                  Pagamento via PIX
                </h4>
                <p className="text-stone-400 text-sm">Escaneie o QR Code ao lado ou copie a chave PIX abaixo para pagar a fatura de <strong className="text-white">R$ {plan.price.toFixed(2).replace('.', ',')}</strong>.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Código Copia e Cola (Simulação)</label>
                <div className="flex gap-2">
                  <input type="text" readOnly value="00020126580014BR.GOV.BCB.PIX0136simulacao-crep-na-chapa" className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-300 font-mono outline-none" />
                  <button onClick={() => alert('Código PIX Copiado!')} className="bg-stone-800 text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-stone-700 transition">Copiar</button>
                </div>
              </div>
              
              <p className="text-xs text-stone-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />O pagamento será reconhecido automaticamente em até 5 minutos.</p>
            </div>

            <div className="flex flex-col items-center p-6 bg-white rounded-2xl w-full md:w-auto">
               <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=00020126580014BR.GOV.BCB.PIX`} alt="PIX QR Code" className="w-32 h-32 mb-4" />
               <p className="text-[10px] font-black uppercase text-stone-400 text-center tracking-widest">PIX <span className="text-stone-900">Crep na Chapa</span></p>
            </div>
          </div>
          
          {/* Botão de simulação para o DEV ver a alteração acontecendo */}
          <div className="mt-8 border-t border-stone-800 pt-6 text-center">
            <button 
              onClick={handleSimulatePayment}
              disabled={isProcessing}
              className="px-6 py-2 border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-black uppercase tracking-widest rounded-full hover:bg-green-500 hover:text-white transition-colors disabled:opacity-50">
              {isProcessing ? 'Aprovando...' : 'Dev: Simular Pagamento Aprovado'}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
