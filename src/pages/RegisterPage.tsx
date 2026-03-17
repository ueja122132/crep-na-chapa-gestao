import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Store, Loader2, AlertCircle, CheckCircle2, Zap, Rocket } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const PLAN_INFO: Record<string, { label: string; color: string; icon: React.ReactNode; price: string }> = {
  essencial: { label: 'Essencial', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10', icon: <Zap className="w-4 h-4" />, price: '50,00' },
  profissional: { label: 'Profissional', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10', icon: <Rocket className="w-4 h-4" />, price: '100,00' }
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const planId = searchParams.get('plan') || 'essencial';
  const planName = searchParams.get('name') || 'Essencial';
  const isUpgrade = searchParams.get('upgrade') === 'true';
  const urlStoreName = searchParams.get('storeName');
  const urlOrgId = searchParams.get('orgId');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    storeName: urlStoreName || '',
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCvv: '',
  });

  useEffect(() => {
    async function loadOrgName() {
      if (urlStoreName && urlStoreName !== 'Loja') {
        setFormData(prev => ({ ...prev, storeName: urlStoreName }));
        return;
      }
      if (isUpgrade && session?.user?.email) {
        const profileName = profile?.organization_name || (profile?.organizations as any)?.name;
        if (profileName && profileName !== 'Autenticada') {
          setFormData(prev => ({ ...prev, storeName: profileName }));
          return;
        }
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('owner_id', session.user.id)
          .limit(1)
          .single();
        if (org?.name) {
          const finalName = (org.name === 'Loja' || org.name === 'Crep na Chapa') ? 'tem de tudo' : org.name;
          setFormData(prev => ({ ...prev, storeName: finalName }));
        }
      }
    }
    loadOrgName();
  }, [isUpgrade, profile, session, urlStoreName]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    console.log('[REGISTRO] Iniciando...');

    const watchdog = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          setError('O servidor demorou muito a responder. Verifique sua conexão e tente novamente.');
          return false;
        }
        return prev;
      });
    }, 20000);

    try {
      if (isUpgrade) {
        // --- UPGRADE DIRETO NO SUPABASE (sem servidor) ---
        let orgIdToUpdate: string | null = urlOrgId || profile?.organization_id || null;

        // Buscar organização pelo email do usuário logado (campo real: owner_email)
        if (!orgIdToUpdate && session?.user?.email) {
          console.log('[UPGRADE] Buscando org via owner_email:', session.user.email);
          const { data: ownedOrg } = await supabase
            .from('organizations')
            .select('id')
            .eq('owner_email', session.user.email)
            .limit(1)
            .maybeSingle();
          if (ownedOrg?.id) orgIdToUpdate = ownedOrg.id;
        }

        // Fallback: buscar via user_profiles.organization_id
        if (!orgIdToUpdate && session?.user?.id) {
          console.log('[UPGRADE] Fallback: buscando org via user_profiles...');
          const { data: up } = await supabase
            .from('user_profiles')
            .select('organization_id')
            .eq('id', session.user.id)
            .maybeSingle();
          if (up?.organization_id) orgIdToUpdate = up.organization_id;
        }

        if (!orgIdToUpdate) {
          throw new Error('Não foi possível identificar sua loja. Entre em contato com o suporte.');
        }

        console.log('[UPGRADE] Atualizando para plano:', planId, '| Org:', orgIdToUpdate);
        const { error: upgradeError } = await supabase
          .from('organizations')
          .update({
            plan: planId,
            payment_status: 'pending',
            subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active'
          })
          .eq('id', orgIdToUpdate);

        if (upgradeError) throw new Error(upgradeError.message);

        console.log('[UPGRADE] Sucesso!');
        clearTimeout(watchdog);
        setSuccess(true);
        setTimeout(() => navigate('/vendas'), 2500);
        return;
      }

      // Registro Normal (novo usuário)
      const { data: authData, error: authErr } = await supabase.auth.signUp({ email: formData.email, password: formData.password });
      if (authErr) throw authErr;
      if (!authData.user) throw new Error('Não foi possível criar o usuário.');

      const slug = formData.storeName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      const { data: orgData, error: orgErr } = await supabase.from('organizations').insert([{
        name: formData.storeName, 
        slug, 
        plan: planId, 
        status: 'active', 
        payment_status: 'pending',
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        owner_id: authData.user.id
      }]).select().single();
      if (orgErr) throw orgErr;

      const { error: profErr } = await supabase.from('user_profiles').insert([{
        id: authData.user.id, organization_id: orgData.id, name: formData.fullName, role: 'admin'
      }]);
      if (profErr) console.warn('Erro ao criar perfil (não crítico):', profErr.message);

      clearTimeout(watchdog);
      setSuccess(true);
      setTimeout(() => navigate('/vendas'), 2500);
    } catch (err: any) {
      clearTimeout(watchdog);
      console.error('[REGISTRO] Erro:', err);
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#1c1917] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full bg-stone-900 rounded-3xl p-8 border border-green-500/30 text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{isUpgrade ? 'Plano Alterado!' : 'Loja criada com sucesso!'}</h2>
          <p className="text-stone-400 mb-2">Plano <span className="font-bold text-white">{planName}</span> finalizado.</p>
          <p className="text-stone-500 text-sm">Redirecionando...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1c1917] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-500/10 blur-[100px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[100px] rounded-full" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full bg-stone-900/50 backdrop-blur-xl rounded-3xl p-8 border border-white/10 relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{isUpgrade ? 'Mudar Plano' : 'Começar agora!'}</h1>
          <p className="text-stone-400">{isUpgrade ? 'Confirme as condições para iniciar seu upgrade.' : 'Crie sua conta em poucos segundos.'}</p>
        </div>

        <div className={`p-4 rounded-2xl border mb-6 ${PLAN_INFO[planId]?.color || PLAN_INFO.essencial.color}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(PLAN_INFO[planId] || PLAN_INFO.essencial).icon}
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold opacity-70">Plano Selecionado</p>
                <p className="font-bold text-sm">PLANO {planName.toUpperCase()} SELECIONADO</p>
                <p className="text-xs opacity-80">R$ {searchParams.get('price') || '50,00'}/mês · Pagamento pendente no PIX</p>
              </div>
            </div>
            { !isUpgrade && <button onClick={() => navigate('/planos')} className="text-xs underline opacity-50 hover:opacity-100">Trocar</button>}
            { isUpgrade && <button onClick={() => navigate(-1)} className="text-xs underline opacity-50 hover:opacity-100">Trocar</button>}
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {isUpgrade ? (
            <div className="space-y-4">
              <div className="relative group">
                <label className="text-xs font-medium text-stone-500 ml-1 mb-1 block">Nome da Loja</label>
                <div className="absolute inset-y-[34px] left-4 flex items-center pointer-events-none group-focus-within:text-orange-500 transition-colors">
                  <Store className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  className="w-full bg-stone-900 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-stone-600 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
                  placeholder="Nome da sua loja"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none group-focus-within:text-orange-500 transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <input type="text" required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full bg-stone-900 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-stone-600 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none" placeholder="Nome Completo" />
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none group-focus-within:text-orange-500 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-stone-900 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-stone-600 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none" placeholder="E-mail" />
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none group-focus-within:text-orange-500 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full bg-stone-900 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-stone-600 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none" placeholder="Senha" />
              </div>
            </>
          )}

          {error && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 text-red-500 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isUpgrade ? 'Confirmar Upgrade' : 'Criar Minha Loja')}
          </button>
        </form>

        <p className="text-center mt-6 text-stone-500 text-sm">
          {isUpgrade ? (
            <Link to="/vendas" className="hover:text-stone-400">← Voltar para o painel</Link>
          ) : (
            <>Já tem uma conta? <Link to="/login" className="text-orange-500 hover:text-orange-400 font-medium">Entrar agora</Link></>
          )}
        </p>
      </motion.div>
    </div>
  );
}
