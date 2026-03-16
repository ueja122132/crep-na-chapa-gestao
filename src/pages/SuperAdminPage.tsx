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

interface RankingItem {
  name: string;
  total_sales: number;
  total_orders: number;
}

interface GlobalStats extends GlobalStatsBase {
  average_ticket: number;
}

interface GlobalStatsBase {
  total_revenue: number;
  total_orders: number;
  active_stores: number;
  total_stores: number;
}

export default function SuperAdminPage() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stores' | 'config'>('dashboard');
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [stores, setStores] = useState<StoreMetric[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [config, setConfig] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { 'Authorization': `Bearer ${session?.access_token}` };
      
      const statsRes = await fetch('/api/admin/stats', { headers });
      const statsData = await statsRes.json();
      setStats(statsData);

      if (activeTab === 'dashboard') {
        const metricsRes = await fetch('/api/admin/metrics', { headers });
        const metricsData = await metricsRes.json();
        setRanking(metricsData.ranking || []);
      }

      if (activeTab === 'stores') {
        const storesRes = await fetch('/api/admin/organizations', { headers });
        const storesData = await storesRes.json();
        setStores(storesData);
      }

      if (activeTab === 'config') {
        const configRes = await fetch('/api/admin/config', { headers });
        const configData = await configRes.json();
        setConfig(configData);
      }
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
      
      if (!res.ok) {
        let errorMsg = `Erro ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorData.message || JSON.stringify(errorData);
        } catch (e) {
          const text = await res.text().catch(() => '');
          if (text) errorMsg += `: ${text.slice(0, 100)}`;
        }
        throw new Error(errorMsg);
      }
      
      setStores(stores.map(s => s.id === id ? { ...s, ...updates } : s));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const updateConfig = async (key: string, value: string) => {
    try {
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ key, value })
      });
      fetchData();
    } catch (err) {
      alert('Erro ao atualizar configuração');
    }
  };

  const filteredStores = stores.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         store.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = selectedPlan === 'all' || store.plan === selectedPlan;
    return matchesSearch && matchesPlan;
  });

  if (loading && !stats) {
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

      {/* Navegação por Abas */}
      <div className="flex items-center gap-2 p-1.5 bg-stone-900/50 border border-stone-800 rounded-3xl w-fit">
        {[
          { id: 'dashboard', label: 'Estatísticas', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'stores', label: 'Loja & Unidades', icon: <Building2 className="w-4 h-4" /> },
          { id: 'config', label: 'Sistema & Root', icon: <Shield className="w-4 h-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id 
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
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

      {activeTab === 'dashboard' && (
        <div className="space-y-8">
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
              title="Ticket Médio" 
              value={`R$ ${(stats?.average_ticket || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              subtitle="Valor por transação"
              icon={<TrendingUp className="w-6 h-6" />}
              color="purple"
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="bg-stone-900/50 p-8 rounded-[2.5rem] border border-stone-800 shadow-2xl">
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Ranking de Lojas (Faturamento)</h3>
                <div className="space-y-4">
                  {ranking.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-stone-950/50 rounded-2xl border border-stone-900 group">
                      <div className="flex items-center gap-4">
                        <span className="text-stone-700 font-black italic text-xl w-6">#{idx + 1}</span>
                        <div>
                          <p className="font-bold text-stone-200 group-hover:text-orange-500 transition-colors uppercase text-sm tracking-tight">{item.name}</p>
                          <p className="text-[10px] text-stone-500 font-bold uppercase">{item.total_orders} pedidos realizados</p>
                        </div>
                      </div>
                      <p className="font-black text-white">R$ {item.total_sales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  ))}
                  {ranking.length === 0 && <p className="text-stone-600 text-center py-10 font-bold uppercase text-xs">Nenhum dado de ranking disponível</p>}
                </div>
             </div>

             {/* Performance detalhada por unidade */}
             <div className="space-y-4">
               <h3 className="text-sm font-black text-white uppercase tracking-widest">Performance por Unidade</h3>
               {ranking.length === 0 && (
                 <div className="bg-stone-900/50 p-8 rounded-[2.5rem] border border-stone-800 flex items-center justify-center">
                   <p className="text-stone-600 font-bold uppercase text-xs">Sem dados de unidades</p>
                 </div>
               )}
               {ranking.map((item, idx) => {
                 const totalRevenue = ranking.reduce((acc, r) => acc + r.total_sales, 0);
                 const sharePercent = totalRevenue > 0 ? Math.round((item.total_sales / totalRevenue) * 100) : 0;
                 const gradients = ['from-orange-600/20 border-orange-500/20', 'from-blue-600/20 border-blue-500/20', 'from-purple-600/20 border-purple-500/20', 'from-green-600/20 border-green-500/20'];
                 const barColors = ['bg-orange-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500'];
                 const gradient = gradients[idx % gradients.length];
                 const barColor = barColors[idx % barColors.length];
                 const ticketMedio = item.total_orders > 0 ? item.total_sales / item.total_orders : 0;
                 return (
                   <div key={idx} className={`bg-gradient-to-br ${gradient} to-stone-950 p-6 rounded-3xl border shadow-xl`}>
                     <div className="flex items-center justify-between mb-3">
                       <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-2xl ${barColor} flex items-center justify-center font-black text-white text-sm shadow-lg`}>
                           {item.name.charAt(0)}
                         </div>
                         <div>
                           <p className="font-black text-white uppercase text-sm tracking-tight">{item.name}</p>
                           <p className="text-[10px] text-stone-400 font-bold">{sharePercent}% do faturamento total</p>
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="font-black text-white text-lg">R$ {item.total_sales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                         <p className="text-[10px] text-stone-400 font-bold">{item.total_orders} pedidos · ticket R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                       </div>
                     </div>
                     <div className="w-full bg-stone-800/60 rounded-full h-1.5 mt-4">
                       <div className={`${barColor} h-1.5 rounded-full transition-all duration-1000`} style={{ width: `${sharePercent}%` }} />
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'stores' && (
        <div className="bg-stone-900/50 backdrop-blur-sm rounded-[2.5rem] border border-stone-800 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-stone-800 flex flex-col md:flex-row gap-4 justify-between items-center bg-stone-900/30">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
              <input 
                type="text" 
                placeholder="Buscar unidade por nome ou ID..." 
                className="w-full pl-11 pr-4 py-4 bg-stone-950 border border-stone-800 rounded-2xl text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all font-medium placeholder:text-stone-600 shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="bg-stone-950 p-2 rounded-2xl border border-stone-800 flex items-center gap-1 shadow-inner">
                <Filter className="w-4 h-4 text-stone-500 ml-2" />
                <select 
                  className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest py-1.5 px-4 focus:ring-0 text-stone-300 cursor-pointer"
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                >
                  <option value="all">Filtro: Todos os Planos</option>
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
                  <th className="px-8 py-6">Identidade Visual / Loja</th>
                  <th className="px-8 py-6">Assinatura / Status</th>
                  <th className="px-8 py-6 text-center">Volume</th>
                  <th className="px-8 py-6 text-right">Performace (R$)</th>
                  <th className="px-8 py-6 text-right">Ações de Root</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/50">
                {filteredStores.map((store) => (
                  <tr key={store.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${
                          store.status === 'active' ? 'bg-orange-500 text-white' : 'bg-stone-800 text-stone-500'
                        }`}>
                          {store.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-stone-100 group-hover:text-orange-400 transition-colors uppercase tracking-tight">{store.name}</p>
                          <p className="text-[10px] text-stone-500 font-mono tracking-tighter">ID: {store.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1.5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          store.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${store.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                          {store.status === 'active' ? 'Operante' : 'Suspenso'}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-black text-stone-500 uppercase tracking-widest pl-1">
                          <Shield className="w-3 h-3 text-orange-500/60" />
                          <span>{store.plan}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 inline-block shadow-inner min-w-[50px]">
                        <span className="font-mono font-black text-stone-200 text-sm">{store.total_orders}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className="font-black text-white text-xl tracking-tighter">
                        R$ {store.total_sales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                        <select 
                          className="text-[10px] font-black bg-stone-950 border border-stone-800 text-stone-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none uppercase tracking-widest"
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
                          className={`p-3 rounded-xl transition-all border ${
                            store.status === 'active' 
                              ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white' 
                              : 'bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500 hover:text-white'
                          }`}
                          title={store.status === 'active' ? 'Congelar Unidade' : 'Ativar Unidade'}
                        >
                          {store.status === 'active' ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredStores.length === 0 && (
              <div className="py-32 text-center bg-stone-900/10">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Building2 className="w-20 h-20 text-stone-800 mx-auto mb-6 border border-stone-800 p-5 rounded-3xl" />
                  <p className="text-stone-600 font-bold uppercase tracking-[0.3em] text-[10px]">Nenhuma unidade detectada na rede</p>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-stone-900/50 p-8 rounded-[2.5rem] border border-stone-800 shadow-2xl">
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 border-b border-stone-800 pb-4">Configurações Globais</h3>
              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Banner Global do Sistema</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="text" 
                      placeholder="Ex: Manutenção agendada para 02:00" 
                      className="flex-1 bg-stone-950 border border-stone-800 p-4 rounded-2xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                      value={config.find(c => c.key === 'global_banner')?.value || ''}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        updateConfig('global_banner', newVal);
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-stone-600 font-bold uppercase ml-1">Este aviso aparecerá no topo de todas as lojas logadas.</p>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Modo de Manutenção (Plataforma)</label>
                  <div className="flex items-center gap-4 p-5 bg-stone-950 rounded-2xl border border-stone-900">
                    <div className="flex-1">
                      <p className="font-bold text-stone-200">Travar Pedidos</p>
                      <p className="text-[10px] text-stone-500 font-bold uppercase">Impedido novos pedidos em toda rede</p>
                    </div>
                    <button 
                      onClick={() => {
                        const current = config.find(c => c.key === 'maintenance_mode')?.value === 'true';
                        updateConfig('maintenance_mode', (!current).toString());
                      }}
                      className={`w-14 h-8 rounded-full relative transition-all ${
                        config.find(c => c.key === 'maintenance_mode')?.value === 'true' ? 'bg-orange-500' : 'bg-stone-800'
                      }`}
                    >
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-lg ${
                        config.find(c => c.key === 'maintenance_mode')?.value === 'true' ? 'left-7' : 'left-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
           </div>

           <div className="bg-stone-900/50 p-8 rounded-[2.5rem] border border-stone-800 shadow-2xl flex flex-col justify-center items-center text-center">
              <div className="w-20 h-20 bg-stone-950 rounded-3xl flex items-center justify-center border border-stone-900 mb-6 group hover:border-orange-500 transition-colors">
                 <Shield className="w-10 h-10 text-stone-700 group-hover:text-orange-500 transition-colors" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Segurança Root</h3>
              <p className="text-stone-400 font-medium max-w-sm">Estas configurações alteram o comportamento básico da infraestrutura. Use com cautela cautela total.</p>
           </div>
        </div>
      )}
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
    purple: 'from-fuchsia-600/20 to-fuchsia-600/5 text-fuchsia-400 border-fuchsia-500/20'
  };

  const iconColors = {
    blue: 'bg-blue-500 shadow-blue-500/40',
    orange: 'bg-orange-500 shadow-orange-500/40',
    green: 'bg-green-500 shadow-green-500/40',
    purple: 'bg-fuchsia-500 shadow-fuchsia-500/40'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${colors[color]} p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden group`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -translate-y-16 translate-x-16 group-hover:bg-white/10 transition-all duration-700" />
      
      <div className="flex justify-between items-start mb-8">
        <div className={`p-4 rounded-3xl text-white shadow-2xl ${iconColors[color]} transform group-hover:rotate-6 transition-transform duration-500`}>
          {icon}
        </div>
        <div className="bg-stone-900/40 border border-white/5 rounded-full p-2">
          <TrendingUp className="w-3 h-3 text-white/50" />
        </div>
      </div>
      
      <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] mb-3">{title}</h3>
      <p className="text-3xl font-black text-white mb-2 tracking-tighter">{value}</p>
      <p className="text-[10px] text-stone-500 font-bold uppercase tracking-tight">{subtitle}</p>
    </motion.div>
  );
}
