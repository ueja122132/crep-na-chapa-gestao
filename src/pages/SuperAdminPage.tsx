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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Painel Super Admin</h1>
          <p className="text-stone-500">Gestão global da plataforma SaaS</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 bg-white border border-stone-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors"
        >
          Atualizar Dados
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Faturamento Global" 
          value={`R$ ${stats?.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Total processado"
          icon={<CreditCard className="w-6 h-6 text-blue-500" />}
          color="blue"
        />
        <StatsCard 
          title="Total de Pedidos" 
          value={stats?.total_orders.toLocaleString() || '0'}
          subtitle="Em todas as lojas"
          icon={<ShoppingBag className="w-6 h-6 text-orange-500" />}
          color="orange"
        />
        <StatsCard 
          title="Lojas Ativas" 
          value={`${stats?.active_stores} / ${stats?.total_stores}`}
          subtitle="Engajamento total"
          icon={<Building2 className="w-6 h-6 text-green-500" />}
          color="green"
        />
        <StatsCard 
          title="Segurança" 
          value="Super Admin"
          subtitle="Acesso Nível Global"
          icon={<Shield className="w-6 h-6 text-purple-500" />}
          color="purple"
        />
      </div>

      {/* Stores Management */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-stone-100 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou slug..." 
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-stone-400" />
            <select 
              className="bg-stone-50 border border-stone-200 rounded-xl text-sm py-2 px-3 focus:outline-none font-medium text-stone-600"
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
            >
              <option value="all">Todos os Planos</option>
              <option value="basic">Plano Básico</option>
              <option value="pro">Plano Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50/50 text-stone-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Loja / Empresa</th>
                <th className="px-6 py-4">Status / Plano</th>
                <th className="px-6 py-4 text-center">Pedidos</th>
                <th className="px-6 py-4 text-right">Vendas Totais</th>
                <th className="px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredStores.map((store) => (
                <tr key={store.id} className="hover:bg-stone-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${
                        store.status === 'active' ? 'bg-orange-500' : 'bg-stone-400'
                      }`}>
                        {store.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-stone-800">{store.name}</p>
                        <p className="text-xs text-stone-400 font-medium">/{store.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        store.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        <div className={`w-1 h-1 rounded-full ${store.status === 'active' ? 'bg-green-600' : 'bg-red-600'}`} />
                        {store.status === 'active' ? 'Ativo' : 'Bloqueado'}
                      </span>
                      <p className="text-xs font-medium text-stone-500 capitalize">{store.plan}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-mono font-bold text-stone-700">{store.total_orders}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-bold text-stone-900">
                      R$ {store.total_sales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleUpdateStore(store.id, { 
                          status: store.status === 'active' ? 'inactive' : 'active' 
                        })}
                        className={`p-2 rounded-lg transition-colors ${
                          store.status === 'active' ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-500'
                        }`}
                        title={store.status === 'active' ? 'Bloquear Loja' : 'Ativar Loja'}
                      >
                        {store.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                      
                      <select 
                        className="text-[10px] font-bold bg-white border border-stone-200 rounded px-1 py-0.5"
                        value={store.plan}
                        onChange={(e) => handleUpdateStore(store.id, { plan: e.target.value as any })}
                      >
                        <option value="basic">Basic</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Ent.</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredStores.length === 0 && (
            <div className="py-20 text-center">
              <Building2 className="w-12 h-12 text-stone-200 mx-auto mb-4" />
              <p className="text-stone-500 font-medium">Nenhuma loja encontrada.</p>
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
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colors[color]}`}>
          {icon}
        </div>
        <TrendingUp className="w-4 h-4 text-stone-300" />
      </div>
      <h3 className="text-sm font-medium text-stone-500 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-stone-900 mb-1">{value}</p>
      <p className="text-xs text-stone-400 font-medium">{subtitle}</p>
    </motion.div>
  );
}
