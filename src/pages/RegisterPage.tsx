import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Store, ArrowRight, Loader2, AlertCircle, CheckCircle2, CreditCard, Zap, Rocket, Shield } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  const planPrice = searchParams.get('price') || '50';
  const isUpgrade = searchParams.get('upgrade') === 'true';
  const urlStoreName = searchParams.get('storeName');
  const urlOrgId = searchParams.get('orgId');
  const planData = PLAN_INFO[planId] || PLAN_INFO.essencial;

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    storeName: urlStoreName || '',
    // Simulação de pagamento
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCvv: '',
  });

  const hasOrganization = !!(profile?.organization_id || profile?.organizations?.name || profile?.organization_name);

  useEffect(() => {
    async function loadOrgName() {
      // Se já veio da URL e não é o nome genérico "Loja", não precisamos buscar
      if (urlStoreName && urlStoreName !== 'Loja') {
        setFormData(prev => ({ ...prev, storeName: urlStoreName }));
        return;
      }

      if (isUpgrade && session?.user?.email) {
        // 1. Tenta pegar do perfil
        const profileName = profile?.organization_name || (profile?.organizations as any)?.name;
        if (profileName && profileName !== 'Autenticada') {
          setFormData(prev => ({ ...prev, storeName: profileName }));
          return;
        }

        // 2. Se não estiver no perfil, busca no banco pelo email do dono
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('owner_email', session.user.email)
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

    try {
      if (isUpgrade) {
         if (!session) {
           throw new Error('Sessão expirada. Por favor, faça login novamente.');
         }

         // Prioridade: ID vindo da URL (mais rápido) > ID do Perfil > Busca por Email
         let orgId = urlOrgId || profile?.organization_id;

         console.log('Iniciando upgrade para organização:', orgId, { urlOrgId, profileOrgId: profile?.organization_id });

         // Se ainda não houver ID, tenta buscar por owner_email
         if (!orgId && session.user.email) {
           const { data: ownedOrg } = await supabase
             .from('organizations')
             .select('id')
             .eq('owner_email', session.user.email)
             .limit(1)
             .maybeSingle();
           
           if (ownedOrg) orgId = ownedOrg.id;
         }

         if (orgId) {
             console.log('Finalizando upgrade da loja:', orgId, 'para:', planId);
             
             // Timeout de segurança para não travar o spinner se o Supabase demorar
             const updatePromise = supabase
               .from('organizations')
               .update({ 
                  plan: planId, 
                  payment_status: 'pending',
                  subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
               })
               .eq('id', orgId);

             const timeoutPromise = new Promise((_, reject) => 
               setTimeout(() => reject(new Error('A operação demorou muito. Verifique sua conexão ou tente novamente.')), 10000)
             );

             const { error: upgradeError } = await Promise.race([updatePromise, timeoutPromise]) as any;
               
             if (upgradeError) {
               console.error('Erro fatal no update da organização:', upgradeError);
               throw new Error('Não foi possível atualizar o plano: ' + (upgradeError.message || 'Erro de conexão/permissão'));
             }
             
             setSuccess(true);
             setTimeout(() => navigate('/vendas'), 2500);
             return;
          } else {
            console.log('Nenhuma organização encontrada. Criando nova loja para o usuário logado.');
            // Fluxo híbrido: Usuário logado mas sem loja (Primeira Ativação)
           // Se o usuário não tem nome da loja no formData, pede pra preencher
           if (!formData.storeName) {
             throw new Error('Por favor, informe o nome da sua loja para ativar o plano.');
           }

           const slug = formData.storeName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
           const expiresAt = new Date();
           expiresAt.setDate(expiresAt.getDate() + 30);

           const { data: orgData, error: orgError } = await supabase
             .from('organizations')
             .insert([{
               name: formData.storeName,
               slug,
               plan: planId,
               status: 'active',
               payment_status: 'pending',
               subscription_expires_at: expiresAt.toISOString(),
               owner_email: session.user.email,
               owner_name: profile?.full_name || session.user.email,
             }])
             .select()
             .single();

           if (orgError) throw orgError;

           // Linka o perfil atual à nova organização
           await supabase
             .from('user_profiles')
             .update({ organization_id: orgData.id })
             .eq('id', session.user.id);

           setSuccess(true);
           setTimeout(() => navigate('/vendas'), 2500);
           return;
         }
      }

      // Lógica de Registro Normal (Somente se NÃO for upgrade)
      // 1. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Não foi possível criar o usuário.');

      // 2. Create Organization with subscription data (30 days trial)
      const slug = formData.storeName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([{
          name: formData.storeName,
          slug,
          plan: planId,
          status: 'active',
          payment_status: 'pending',
          subscription_expires_at: expiresAt.toISOString(),
          owner_email: formData.email,
          owner_name: formData.fullName,
        }])
        .select()
        .single();

      if (orgError) throw orgError;

      // 3. Create User Profile linked to Organization
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([{
          id: authData.user.id,
          organization_id: orgData.id,
          full_name: formData.fullName,
          role: 'admin'
        }]);

      if (profileError) throw profileError;

      setSuccess(true);
      setTimeout(() => navigate('/vendas'), 2500);
    } catch (err: any) {
      console.error('Erro no cadastro:', err);
      setError(err.message || 'Ocorreu um erro ao realizar o cadastro.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#1c1917] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-stone-900 rounded-3xl p-8 border border-green-500/30 text-center"
        >
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{isUpgrade ? 'Plano Alterado!' : 'Loja criada com sucesso!'}</h2>
          <p className="text-stone-400 mb-2">Plano <span className="font-bold text-white">{planName}</span> {isUpgrade ? 'solicitado.' : 'ativado.'}</p>
          <p className="text-stone-500 text-sm">Redirecionando para o painel...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1c1917] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-500/10 blur-[100px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[100px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-500/20"
          >
            <Store className="w-8 h-8 text-stone-900" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{isUpgrade ? 'Mudar Plano' : 'Crie sua loja'}</h1>
          <p className="text-stone-400">{isUpgrade ? 'Confirme as condições para iniciar seu upgrade.' : 'Comece a gerenciar seu negócio hoje.'}</p>
        </div>

        {/* Plano selecionado */}
        <div className={`border rounded-2xl p-4 flex items-center gap-3 mb-6 ${planData.color}`}>
          {planData.icon}
          <div className="flex-1">
            <p className="font-black text-sm uppercase tracking-widest">Plano {planData.label} selecionado</p>
            <p className="text-xs opacity-70">R$ {planPrice}/mês · {isUpgrade ? 'Pagamento pendente no PIX' : '30 dias de teste grátis'}</p>
          </div>
          <Link to={isUpgrade ? "/pricing?upgrade=true" : "/pricing"} className="text-xs underline opacity-60 hover:opacity-100">Trocar</Link>
        </div>

        <div className="bg-stone-900/50 backdrop-blur-xl rounded-3xl p-8 border border-stone-800 shadow-2xl">
          <form className="space-y-5" onSubmit={handleRegister}>
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {(!hasOrganization || !isUpgrade) && (
              <div className={!isUpgrade ? "grid grid-cols-2 gap-4" : ""}>
                {!isUpgrade && (
                  <div>
                    <label className="block text-xs font-bold text-stone-400 mb-1.5 ml-1">Nome Completo</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                      <input type="text" required placeholder="Seu nome"
                        className="w-full bg-stone-800/50 border border-stone-700/50 rounded-xl py-3 pl-10 pr-3 text-white text-sm placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-stone-400 mb-1.5 ml-1">Nome da Loja</label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                    <input type="text" required placeholder="Creperia Gourmet"
                      className="w-full bg-stone-800/50 border border-stone-700/50 rounded-xl py-3 pl-10 pr-3 text-white text-sm placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      value={formData.storeName} onChange={e => setFormData({ ...formData, storeName: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {!isUpgrade && (
              <>
                <div>
                  <label className="block text-xs font-bold text-stone-400 mb-1.5 ml-1">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                    <input type="email" required placeholder="seu@email.com"
                      className="w-full bg-stone-800/50 border border-stone-700/50 rounded-xl py-3 pl-10 pr-3 text-white text-sm placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-400 mb-1.5 ml-1">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                    <input type="password" required placeholder="••••••••" minLength={6}
                      className="w-full bg-stone-800/50 border border-stone-700/50 rounded-xl py-3 pl-10 pr-3 text-white text-sm placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                  </div>
                </div>
              </>
            )}

            {isUpgrade && hasOrganization && (
              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-center gap-3 text-orange-400 text-sm">
                <Store className="w-5 h-5 flex-shrink-0" />
                <span>O plano atual da loja <strong>{profile?.organizations?.name || profile?.organization_name || 'Principal'}</strong> será substituído e um novo pagamento será necessário.</span>
              </div>
            )}

            {!isUpgrade && (
              <>
                {/* Seção de pagamento */}
                <p className="text-xs font-black text-stone-500 uppercase tracking-widest border-b border-stone-800 pb-3 pt-2">
                  <CreditCard className="w-3.5 h-3.5 inline mr-1.5" />
                  Dados de Pagamento
                </p>
                <div className="p-4 bg-stone-800/30 border border-stone-700/30 rounded-2xl">
                  <p className="text-xs text-stone-400 mb-3">🔒 Ambiente seguro · Os primeiros 30 dias são grátis</p>
                  <div className="space-y-3">
                    <div>
                      <input type="text" placeholder="Número do Cartão (ex: 4242 4242 4242 4242)"
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl py-2.5 px-3 text-white text-sm placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        value={formData.cardNumber}
                        onChange={e => setFormData({ ...formData, cardNumber: e.target.value })}
                        maxLength={19} />
                    </div>
                    <div>
                      <input type="text" placeholder="Nome no Cartão"
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl py-2.5 px-3 text-white text-sm placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        value={formData.cardName}
                        onChange={e => setFormData({ ...formData, cardName: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="Validade (MM/AA)"
                        className="bg-stone-800 border border-stone-700 rounded-xl py-2.5 px-3 text-white text-sm placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        value={formData.cardExpiry}
                        onChange={e => setFormData({ ...formData, cardExpiry: e.target.value })}
                        maxLength={5} />
                      <input type="text" placeholder="CVV"
                        className="bg-stone-800 border border-stone-700 rounded-xl py-2.5 px-3 text-white text-sm placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        value={formData.cardCvv}
                        onChange={e => setFormData({ ...formData, cardCvv: e.target.value })}
                        maxLength={4} />
                    </div>
                  </div>
                </div>
              </>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-stone-900 font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ArrowRight className="w-5 h-5" />{isUpgrade ? 'Confirmar Novo Plano e Pagar' : 'Criar minha loja agora'}</>}
            </button>
          </form>

          {!isUpgrade && (
            <div className="mt-6 pt-6 border-t border-stone-800 text-center">
              <p className="text-stone-500 text-sm">
                Já possui uma loja? <Link to="/login" className="text-orange-500 font-bold hover:underline">Fazer Login</Link>
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/pricing" className="text-stone-600 text-sm hover:text-stone-400 transition-colors">← Voltar para os planos</Link>
        </div>
      </motion.div>
    </div>
  );
}
