import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, Loader2, Utensils } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1c1917] flex items-center justify-center p-4">
      {/* Abstract Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <div className="bg-stone-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-stone-800 shadow-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-500 rounded-3xl mb-6 shadow-lg shadow-amber-500/20 rotate-3 group overflow-hidden relative">
               <Utensils className="w-10 h-10 text-stone-900 relative z-10" />
               <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Crep na Chapa</h1>
            <p className="text-stone-400 font-bold uppercase text-[10px] tracking-[0.2em]">Gestão Inteligente de Pedidos</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-stone-500 tracking-widest pl-1">Email</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-amber-500 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none font-bold placeholder:text-stone-700"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-stone-500 tracking-widest pl-1">Senha</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-amber-500 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none font-bold placeholder:text-stone-700"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-stone-900 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-amber-500 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Entrar no Sistema
                  <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-10 border-t border-stone-800 text-center">
            <p className="text-stone-500 text-[10px] font-bold uppercase tracking-widest">
              SaaS v2.0 • Desenvolvido com Antigravity
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
