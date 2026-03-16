import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  ShoppingBag, 
  TrendingUp, 
  Search, 
  AlertCircle, 
  Shield,
  CreditCard,
  Lock,
  Unlock,
  Loader2,
  Filter,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings,
  Globe,
  Zap,
  BarChart3,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown
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

interface GlobalStats {
  total_revenue: number;
  total_orders: number;
  active_stores: number;
  total_stores: number;
  average_ticket: number;
}

const PLAN_LABELS: Record<string, string> = { basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise' };
const PLAN_COLORS: Record<string, string> = {
  basic: 'bg-stone-700 text-stone-300',
  pro: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  enterprise: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
};

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
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, [activeTab]);

  const headers = { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const statsRes = await fetch('/api/admin/stats', { headers });
      const statsData = await statsRes.json();
      if (!statsRes.ok) throw new Error(statsData.error || 'Erro ao carregar stats');
      setStats(statsData);

      if (activeTab === 'dashboard') {
        const metricsRes = await fetch('/api/admin/metrics', { headers });
        const metricsData = await metricsRes.json();
        setRanking(metricsData.ranking || []);
      }

      if (activeTab === 'stores') {
        const storesRes = await fetch('/api/admin/organizations', { headers });
        const storesData = await storesRes.json();
        if (!storesRes.ok) throw new Error(storesData.error || 'Erro ao carregar lojas');
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

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleUpdateStore = async (id: string, updates: Partial<StoreMetric>) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/organizations/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${res.status}`);
      }
      setStores(stores.map(s => s.id === id ? { ...s, ...updates } : s));
      const action = updates.status === 'active' ? 'ativada' : updates.status === 'inactive' ? 'suspensa' : 'atualizada';
      showSuccess(`Loja ${action} com sucesso!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const updateConfig = async (key: string, value: string) => {
    try {
      await fetch('/api/admin/config', { method: 'POST', headers, body: JSON.stringify({ key, value }) });
      fetchData();
      showSuccess('Configuração salva!');
    } catch {
      setError('Erro ao atualizar configuração');
    }
  };

  const filteredStores = stores.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) || store.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = selectedPlan === 'all' || store.plan === selectedPlan;
    return matchesSearch && matchesPlan;
  });

  const activeCount = stores.filter(s => s.status === 'active').length;
  const inactiveCount = stores.filter(s => s.status !== 'active').length;

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-stone-400 font-medium animate-pulse">Carregando dados globais...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">

      {/* Notificações */}
      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 shadow-xl font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)}><XCircle className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">SaaS Command Center</h1>
          <p className="text-stone-500 text-sm font-medium">Controle total da infraestrutura e faturamento</p>
        </div>
        <button onClick={fetchData}
          className="flex items-center gap-2 bg-stone-800 border border-stone-700 text-stone-300 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-stone-700 transition-all active:scale-95">
          <RefreshCw className="w-4 h-4" /> Sincronizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-stone-900/60 border border-stone-800 rounded-2xl w-fit">
        {[
          { id: 'dashboard', label: 'Visão Geral', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'stores', label: 'Lojas', icon: <Building2 className="w-4 h-4" /> },
          { id: 'config', label: 'Sistema', icon: <Settings className="w-4 h-4" /> }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-stone-500 hover:text-stone-300'
            }`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ===== DASHBOARD TAB ===== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Receita Bruta" value={`R$ ${(stats?.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} sub="Volume processado" icon={<CreditCard className="w-5 h-5" />} color="blue" />
            <KpiCard title="Ticket Médio" value={`R$ ${(stats?.average_ticket || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} sub="Por transação" icon={<TrendingUp className="w-5 h-5" />} color="purple" />
            <KpiCard title="Pedidos Totais" value={(stats?.total_orders || 0).toString()} sub="Em toda a rede" icon={<ShoppingBag className="w-5 h-5" />} color="orange" />
            <KpiCard title="Lojas Ativas" value={`${stats?.active_stores || 0} / ${stats?.total_stores || 0}`} sub={`${stats?.total_stores ? Math.round((stats.active_stores / stats.total_stores) * 100) : 0}% engajamento`} icon={<Building2 className="w-5 h-5" />} color="green" />
          </div>

          {/* Saúde da Rede */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-white" /></div>
              <div><p className="text-xs text-stone-400 font-bold uppercase">Lojas Operantes</p><p className="text-2xl font-black text-white">{activeCount}</p></div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center"><Lock className="w-5 h-5 text-white" /></div>
              <div><p className="text-xs text-stone-400 font-bold uppercase">Lojas Suspensas</p><p className="text-2xl font-black text-white">{inactiveCount}</p></div>
            </div>
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center"><Globe className="w-5 h-5 text-white" /></div>
              <div><p className="text-xs text-stone-400 font-bold uppercase">Total na Rede</p><p className="text-2xl font-black text-white">{stats?.total_stores || 0}</p></div>
            </div>
          </div>

          {/* Ranking + Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-stone-900/50 p-6 rounded-3xl border border-stone-800">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-5 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-400" /> Ranking de Faturamento</h3>
              <div className="space-y-3">
                {ranking.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-stone-950/60 rounded-2xl border border-stone-900 hover:border-stone-700 transition-all group">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${idx === 0 ? 'bg-yellow-500 text-white' : idx === 1 ? 'bg-stone-400 text-stone-900' : 'bg-stone-700 text-stone-400'}`}>#{idx + 1}</span>
                      <div>
                        <p className="font-bold text-stone-200 group-hover:text-indigo-400 transition-colors text-sm">{item.name}</p>
                        <p className="text-[10px] text-stone-500 font-bold">{item.total_orders} pedidos</p>
                      </div>
                    </div>
                    <p className="font-black text-white">R$ {item.total_sales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                ))}
                {ranking.length === 0 && <p className="text-stone-600 text-center py-10 font-bold uppercase text-xs">Sem dados de ranking</p>}
              </div>
            </div>

            <div className="bg-stone-900/50 p-6 rounded-3xl border border-stone-800">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-5 flex items-center gap-2"><Zap className="w-4 h-4 text-orange-400" /> Performance por Unidade</h3>
              <div className="space-y-3">
                {ranking.map((item, idx) => {
                  const totalRevenue = ranking.reduce((acc, r) => acc + r.total_sales, 0);
                  const sharePercent = totalRevenue > 0 ? Math.round((item.total_sales / totalRevenue) * 100) : 0;
                  const barColors = ['bg-orange-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500'];
                  const barColor = barColors[idx % barColors.length];
                  const ticketMedio = item.total_orders > 0 ? item.total_sales / item.total_orders : 0;
                  return (
                    <div key={idx} className="p-4 bg-stone-950/60 rounded-2xl border border-stone-900">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 ${barColor} rounded-lg flex items-center justify-center text-white font-black text-xs`}>{item.name.charAt(0)}</div>
                          <div>
                            <p className="font-bold text-white text-sm">{item.name}</p>
                            <p className="text-[10px] text-stone-500">{item.total_orders} pedidos · ticket R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-white">R$ {item.total_sales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[10px] text-stone-500 font-bold">{sharePercent}% do total</p>
                        </div>
                      </div>
                      <div className="w-full bg-stone-800 rounded-full h-1">
                        <div className={`${barColor} h-1 rounded-full`} style={{ width: `${sharePercent}%` }} />
                      </div>
                    </div>
                  );
                })}
                {ranking.length === 0 && <p className="text-stone-600 text-center py-10 font-bold uppercase text-xs">Sem dados de performance</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== STORES TAB ===== */}
      {activeTab === 'stores' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
              <input type="text" placeholder="Buscar loja por nome ou ID..."
                className="w-full pl-11 pr-4 py-3 bg-stone-900 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-stone-600"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-stone-500" />
              <select className="bg-stone-900 border border-stone-800 text-stone-300 text-xs font-black uppercase tracking-widest py-3 px-4 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}>
                <option value="all">Todos os Planos</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          {/* Contadores rápidos */}
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="text-stone-400">{filteredStores.length} loja(s) encontrada(s)</span>
            <span className="w-1 h-1 bg-stone-700 rounded-full" />
            <span className="text-green-400">{activeCount} ativas</span>
            <span className="w-1 h-1 bg-stone-700 rounded-full" />
            <span className="text-red-400">{inactiveCount} suspensas</span>
          </div>

          {/* Cards de lojas */}
          <div className="space-y-3">
            {filteredStores.map((store) => (
              <motion.div key={store.id} layout
                className={`bg-stone-900/50 border rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 transition-all ${
                  store.status === 'active' ? 'border-stone-800' : 'border-red-500/20 bg-red-500/5'
                }`}>
                
                {/* Avatar + Info */}
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-inner flex-shrink-0 ${
                    store.status === 'active' ? 'bg-indigo-600 text-white' : 'bg-stone-800 text-stone-500'
                  }`}>
                    {store.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-black text-white uppercase tracking-tight text-sm">{store.name}</p>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${PLAN_COLORS[store.plan] || PLAN_COLORS.basic}`}>
                        {PLAN_LABELS[store.plan] || store.plan}
                      </span>
                      <span className={`flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        store.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${store.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        {store.status === 'active' ? 'Operante' : 'Suspensa'}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500 font-mono">ID: {store.slug}</p>
                  </div>
                </div>

                {/* Métricas */}
                <div className="flex items-center gap-6 text-center">
                  <div>
                    <p className="text-xs text-stone-500 font-bold uppercase mb-1">Pedidos</p>
                    <p className="font-black text-white">{store.total_orders}</p>
                  </div>
                  <div className="w-px h-8 bg-stone-800" />
                  <div>
                    <p className="text-xs text-stone-500 font-bold uppercase mb-1">Faturamento</p>
                    <p className="font-black text-white">R$ {(store.total_sales || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Mudar plano */}
                  <div className="relative">
                    <select
                      className="appearance-none bg-stone-800 border border-stone-700 text-stone-300 text-[10px] font-black uppercase tracking-widest py-2.5 pl-3 pr-8 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                      value={store.plan}
                      onChange={(e) => handleUpdateStore(store.id, { plan: e.target.value as any })}
                      disabled={updatingId === store.id}>
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-stone-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Ativar / Suspender */}
                  <button
                    onClick={() => handleUpdateStore(store.id, { status: store.status === 'active' ? 'inactive' : 'active' })}
                    disabled={updatingId === store.id}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 ${
                      store.status === 'active'
                        ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white'
                        : 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500 hover:text-white'
                    }`}
                    title={store.status === 'active' ? 'Suspender loja' : 'Ativar loja'}>
                    {updatingId === store.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : store.status === 'active'
                        ? <><Lock className="w-3.5 h-3.5" /> Suspender</>
                        : <><Unlock className="w-3.5 h-3.5" /> Ativar</>
                    }
                  </button>
                </div>
              </motion.div>
            ))}

            {filteredStores.length === 0 && (
              <div className="py-20 text-center">
                <Building2 className="w-16 h-16 text-stone-800 mx-auto mb-4 border border-stone-800 p-4 rounded-2xl" />
                <p className="text-stone-600 font-bold uppercase tracking-widest text-xs">Nenhuma loja encontrada</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== CONFIG TAB ===== */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-stone-900/50 p-6 rounded-3xl border border-stone-800 space-y-6">
            <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-stone-800 pb-4">Configurações Globais</h3>

            {/* Banner global */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Banner Global do Sistema</label>
              <input type="text" placeholder="Ex: Manutenção agendada para 02:00"
                className="w-full bg-stone-950 border border-stone-800 p-3.5 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                defaultValue={config.find(c => c.key === 'global_banner')?.value || ''}
                onBlur={(e) => updateConfig('global_banner', e.target.value)} />
              <p className="text-[10px] text-stone-600 font-bold">Aparecerá no topo de todas as lojas logadas.</p>
            </div>

            {/* Modo manutenção */}
            <div className="flex items-center justify-between p-4 bg-stone-950 rounded-xl border border-stone-900">
              <div>
                <p className="font-bold text-stone-200 text-sm">Modo de Manutenção</p>
                <p className="text-[10px] text-stone-500 font-bold uppercase">Bloqueia novos pedidos em toda a rede</p>
              </div>
              <button
                onClick={() => {
                  const current = config.find(c => c.key === 'maintenance_mode')?.value === 'true';
                  updateConfig('maintenance_mode', (!current).toString());
                }}
                className={`w-12 h-6 rounded-full relative transition-all ${config.find(c => c.key === 'maintenance_mode')?.value === 'true' ? 'bg-orange-500' : 'bg-stone-700'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-lg ${config.find(c => c.key === 'maintenance_mode')?.value === 'true' ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Info de segurança */}
          <div className="bg-gradient-to-br from-indigo-600/10 to-stone-950 p-6 rounded-3xl border border-indigo-500/20 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-black text-white uppercase mb-2">Acesso Root</h3>
              <p className="text-stone-400 text-sm leading-relaxed">Estas configurações afetam toda a infraestrutura da plataforma. Altere com cautela.</p>
            </div>
            <div className="mt-6 space-y-2 text-xs font-bold text-stone-500">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Autenticação JWT ativa</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Supabase RLS habilitado</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Multi-tenant isolado</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente KPI Card
function KpiCard({ title, value, sub, icon, color }: { title: string; value: string; sub: string; icon: React.ReactNode; color: 'blue' | 'orange' | 'green' | 'purple' }) {
  const styles = {
    blue: { card: 'from-blue-600/15 border-blue-500/20', icon: 'bg-blue-500 shadow-blue-500/30' },
    orange: { card: 'from-orange-600/15 border-orange-500/20', icon: 'bg-orange-500 shadow-orange-500/30' },
    green: { card: 'from-green-600/15 border-green-500/20', icon: 'bg-green-500 shadow-green-500/30' },
    purple: { card: 'from-purple-600/15 border-purple-500/20', icon: 'bg-purple-500 shadow-purple-500/30' },
  };
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${styles[color].card} to-stone-950 p-5 rounded-2xl border shadow-xl`}>
      <div className={`w-9 h-9 ${styles[color].icon} rounded-xl flex items-center justify-center text-white shadow-lg mb-4`}>{icon}</div>
      <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-2xl font-black text-white tracking-tighter">{value}</p>
      <p className="text-[10px] text-stone-500 font-bold mt-1">{sub}</p>
    </motion.div>
  );
}
