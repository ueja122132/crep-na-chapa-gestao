import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Store, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    storeName: ''
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Não foi possível criar o usuário.');

      // 2. Create Organization
      const slug = formData.storeName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([{ name: formData.storeName, slug }])
        .select()
        .single();

      if (orgError) throw orgError;

      // 3. Create User Profile linked to Organization
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([{
          id: authData.user.id,
          organization_id: orgData.id,
          full_name: formData.fullName
        }]);

      if (profileError) throw profileError;

      setSuccess(true);
      setTimeout(() => navigate('/vendas'), 2000);
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
          <h2 className="text-2xl font-bold text-white mb-2">Sucesso!</h2>
          <p className="text-stone-400">Sua loja foi criada com sucesso. Redirecionando para o painel...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1c1917] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-500/10 blur-[100px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[100px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-500/20"
          >
            <Store className="w-8 h-8 text-stone-900" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Crie sua loja</h1>
          <p className="text-stone-400">Comece a gerenciar seu negócio hoje.</p>
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

            <div>
              <label className="block text-sm font-medium text-stone-400 mb-2 ml-1">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                <input
                  type="text"
                  required
                  placeholder="Seu nome"
                  className="w-full bg-stone-800/50 border border-stone-700/50 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-400 mb-2 ml-1">Nome da Loja</label>
              <div className="relative">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Creperia Gourmet"
                  className="w-full bg-stone-800/50 border border-stone-700/50 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  value={formData.storeName}
                  onChange={e => setFormData({ ...formData, storeName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-400 mb-2 ml-1">Email Profissional</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  className="w-full bg-stone-800/50 border border-stone-700/50 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-400 mb-2 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-stone-800/50 border border-stone-700/50 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-stone-900 font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Criar minha loja agora
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-stone-800 text-center">
            <p className="text-stone-500 text-sm">
              Já possui uma loja? {' '}
              <Link to="/login" className="text-orange-500 font-bold hover:underline">Fazer Login</Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/pricing" className="text-stone-600 text-sm hover:text-stone-400 transition-colors">
            Voltar para os planos
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
