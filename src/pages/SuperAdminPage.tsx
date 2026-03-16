import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  MoreVertical,
  Shield,
  CreditCard,
  Lock,
  Unlock,
  ChevronRight,
  Loader2,
  Filter
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface StoreMetric {
  id: string;
  name: string;
  slug: string;
  plan: 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'inactive';
  total_orders: number;
  total_sales: number;
  created_at: string;
}

interface GlobalStats {
  total_revenue: number;
  total_orders: number;
  active_stores: number;
  total_stores: number;
}

export default function SuperAdminPage() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [stores, setStores] = useState<StoreMetric[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, storesRes] = await Promise.all([
        fetch('/api/admin/stats', {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        }),
        fetch('/api/admin/organizations', {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        })
      ]);

      if (!statsRes.ok || !storesRes.ok) {
        throw new Error('Falha ao carregar dados administrativos. Verifique suas permissões.');
      }

      const statsData = await statsRes.json();
      const storesData = await storesRes.json();

      setStats(statsData);
      setStores(storesData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStore = async (id: string, updates: Partial<StoreMetric>) => {
    try {
      const res = await fetch(`/api/admin/organizations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(updates)
      });

      if (!res.ok) throw new Error('Erro ao atualizar loja');
      
      // Update local state
      setStores(stores.map(s => s.id === id ? { ...s, ...updates } : s));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredStores = stores.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         store.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = selectedPlan === 'all' || store.plan === selectedPlan;
    return matchesSearch && matchesPlan;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-stone-400 font-medium animate-pulse">Carregando inteligência global...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header Administrativo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">SaaS Command Center</h1>
          <p className="text-stone-400 font-medium">Controle total da infraestrutura e faturamento</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 bg-stone-900 border border-stone-800 text-stone-300 px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-stone-800 hover:text-white transition-all active:scale-95 shadow-lg"
          >
            Sincronizar Dados
          </button>
        </div>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium text-sm">{error}</p>
        </motion.div>
      )}

      {/* Global Stats - Premium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Receita bruta" 
          value={`R$ ${(stats?.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Volume total processado"
          icon={<CreditCard className="w-6 h-6" />}
          color="blue"
        />
        <StatsCard 
          title="Pedidos Totais" 
          value={(stats?.total_orders || 0).toLocaleString() || '0'}
          subtitle="Transações em toda rede"
          icon={<ShoppingBag className="w-6 h-6" />}
          color="orange"
        />
        <StatsCard 
          title="Lojas Ativas" 
          value={`${stats?.active_stores || 0} / ${stats?.total_stores || 0}`}
          subtitle={`${stats?.total_stores ? Math.round((stats.active_stores / stats.total_stores) * 100) : 0}% de engajamento`}
          icon={<Building2 className="w-6 h-6" />}
          color="green"
        />
        <StatsCard 
          title="Eco-sistema" 
          value="Super Admin"
          subtitle="Privilégios de root ativados"
          icon={<Shield className="w-6 h-6" />}
          color="purple"
        />
      </div>

      {/* Stores Management Section */}
      <div className="bg-stone-900/50 backdrop-blur-sm rounded-3xl border border-stone-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-stone-800 flex flex-col md:flex-row gap-4 justify-between items-center bg-stone-900/30">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input 
              type="text" 
              placeholder="Buscar unidade por nome ou ID..." 
              className="w-full pl-11 pr-4 py-3 bg-stone-950 border border-stone-800 rounded-2xl text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all font-medium placeholder:text-stone-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="bg-stone-950 p-1.5 rounded-2xl border border-stone-800 flex items-center gap-1">
              <Filter className="w-4 h-4 text-stone-500 ml-2" />
              <select 
                className="bg-transparent border-none text-xs font-bold py-1.5 px-3 focus:ring-0 text-stone-300 cursor-pointer"
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
              >
                <option value="all">Filtro: Todos</option>
                <option value="basic">Plano Basic</option>
                <option value="pro">Plano Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-900/40 text-stone-500 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-5">Identidade Visual / Loja</th>
                <th className="px-8 py-5">Assinatura / Status</th>
                <th className="px-8 py-5 text-center">Volume</th>
                <th className="px-8 py-5 text-right">Performace (R$)</th>
                <th className="px-8 py-5 text-right">Ações de Root</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/50">
              {filteredStores.map((store) => (
                <tr key={store.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner ${
                        store.status === 'active' ? 'bg-orange-500 text-white' : 'bg-stone-800 text-stone-500'
                      }`}>
                        {store.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-stone-100 group-hover:text-orange-400 transition-colors">{store.name}</p>
                        <p className="text-xs text-stone-500 font-mono tracking-tighter">ID: {store.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="space-y-1.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        store.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${store.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        {store.status === 'active' ? 'Operante' : 'Suspenso'}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-stone-400">
                        <Shield className="w-3 h-3 text-orange-500/60" />
                        <span className="capitalize">{store.plan}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="bg-stone-800/40 border border-stone-800 rounded-xl py-1 px-2 inline-block">
                      <span className="font-mono font-black text-stone-200 text-sm">{store.total_orders}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <p className="font-black text-white text-lg tracking-tight">
                      R$ {store.total_sales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                      <select 
                        className="text-[10px] font-black bg-stone-950 border border-stone-800 text-stone-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        value={store.plan}
                        onChange={(e) => handleUpdateStore(store.id, { plan: e.target.value as any })}
                      >
                        <option value="basic">BASIC</option>
                        <option value="pro">PRO</option>
                        <option value="enterprise">ENTERPRISE</option>
                      </select>

                      <button 
                        onClick={() => handleUpdateStore(store.id, { 
                          status: store.status === 'active' ? 'inactive' : 'active' 
                        })}
                        className={`p-2.5 rounded-xl transition-all border ${
                          store.status === 'active' 
                            ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white' 
                            : 'bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500 hover:text-white'
                        }`}
                        title={store.status === 'active' ? 'Congelar Unidade' : 'Ativar Unidade'}
                      >
                        {store.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredStores.length === 0 && (
            <div className="py-24 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Building2 className="w-16 h-16 text-stone-800 mx-auto mb-4 border border-stone-800 p-4 rounded-3xl" />
                <p className="text-stone-600 font-bold uppercase tracking-[0.2em] text-xs">Vácuo detectado: Nenhuma unidade encontrada</p>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, subtitle, icon, color }: { 
  title: string; 
  value: string; 
  subtitle: string; 
  icon: React.ReactNode;
  color: 'blue' | 'orange' | 'green' | 'purple';
}) {
  const colors = {
    blue: 'from-blue-600/20 to-blue-600/5 text-blue-400 border-blue-500/20',
    orange: 'from-orange-600/20 to-orange-600/5 text-orange-400 border-orange-500/20',
    green: 'from-green-600/20 to-green-600/5 text-green-400 border-green-500/20',
    purple: 'from-purple-600/20 to-purple-600/5 text-purple-400 border-purple-500/20'
  };

  const iconColors = {
    blue: 'bg-blue-500 shadow-blue-500/40',
    orange: 'bg-orange-500 shadow-orange-500/40',
    green: 'bg-green-500 shadow-green-500/40',
    purple: 'bg-purple-500 shadow-purple-500/40'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${colors[color]} p-6 rounded-[2.5rem] border shadow-2xl relative overflow-hidden group`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -translate-y-16 translate-x-16 group-hover:bg-white/10 transition-all duration-700" />
      
      <div className="flex justify-between items-start mb-6">
        <div className={`p-4 rounded-3xl text-white shadow-2xl ${iconColors[color]} transform group-hover:rotate-6 transition-transform duration-500`}>
          {icon}
        </div>
        <div className="bg-stone-900/40 border border-white/5 rounded-full p-2">
          <TrendingUp className="w-3 h-3 text-white/50" />
        </div>
      </div>
      
      <h3 className="text-xs font-black text-stone-500 uppercase tracking-widest mb-2">{title}</h3>
      <p className="text-2xl font-black text-white mb-1 tracking-tight">{value}</p>
      <p className="text-[10px] text-stone-500 font-bold uppercase tracking-tight">{subtitle}</p>
    </motion.div>
  );
}
