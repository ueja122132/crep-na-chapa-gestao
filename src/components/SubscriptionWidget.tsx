import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, AlertTriangle, CheckCircle2, Clock, Zap, Rocket, Shield } from 'lucide-react';
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

const PLAN_DISPLAY: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  essencial: { label: 'Essencial', icon: <Zap className="w-4 h-4" />, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  profissional: { label: 'Profissional', icon: <Rocket className="w-4 h-4" />, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  pro: { label: 'Pro', icon: <Rocket className="w-4 h-4" />, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  enterprise: { label: 'Enterprise', icon: <Shield className="w-4 h-4" />, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
};

export default function SubscriptionWidget() {
  const { session } = useAuth();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return null;
  if (!data) return null;

  const plan = PLAN_DISPLAY[data.plan] || { label: data.plan || 'Básico', icon: <Zap className="w-4 h-4" />, color: 'text-stone-400 bg-stone-500/10 border-stone-500/20' };

  const expiresAt = data.subscription_expires_at ? new Date(data.subscription_expires_at) : null;
  const now = new Date();
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 5;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  const paymentStatusDisplay: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    paid: { label: 'Pago', color: 'text-green-400', icon: <CheckCircle2 className="w-4 h-4" /> },
    pending: { label: 'Pendente', color: 'text-yellow-400', icon: <Clock className="w-4 h-4" /> },
    overdue: { label: 'Em Atraso', color: 'text-red-400', icon: <AlertTriangle className="w-4 h-4" /> },
  };
  const paymentInfo = paymentStatusDisplay[data.payment_status] || paymentStatusDisplay.pending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 ${
        isExpired ? 'bg-red-500/10 border-red-500/30' :
        isExpiringSoon ? 'bg-yellow-500/10 border-yellow-500/30' :
        'bg-stone-900/50 border-stone-800'
      }`}
    >
      <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">Minha Assinatura</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Plano */}
        <div className="space-y-1">
          <p className="text-[10px] text-stone-500 font-bold uppercase">Plano Atual</p>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-black ${plan.color}`}>
            {plan.icon}
            {plan.label}
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
                <span className="text-[10px] text-stone-500 font-normal">({daysLeft}d restantes)</span>
              )}
              {isExpired && <span className="text-xs font-black text-red-400">EXPIRADO</span>}
            </div>
          ) : (
            <span className="text-stone-500 text-sm">—</span>
          )}
        </div>
      </div>

      {/* Alertas */}
      {isExpired && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs font-bold">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Sua assinatura expirou. Entre em contato com o suporte para renovar.
        </div>
      )}
      {isExpiringSoon && !isExpired && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-2 text-yellow-400 text-xs font-bold">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Seu plano vence em {daysLeft} dia(s). Renove para não perder o acesso.
        </div>
      )}
    </motion.div>
  );
}
