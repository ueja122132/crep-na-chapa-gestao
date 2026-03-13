import { useState, useEffect, ReactNode } from 'react';
import { BarChart3, TrendingUp, ShoppingBag, DollarSign, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { FinanceStat } from '../types';
import { motion } from 'motion/react';

export default function FinancialDashboard() {
  const [stats, setStats] = useState<FinanceStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/finance/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = stats.reduce((acc, s) => acc + s.total_revenue, 0);
  const totalOrders = stats.reduce((acc, s) => acc + s.total_orders, 0);
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Get today's stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayStats = stats.find(s => s.date === todayStr);
  const todayRevenue = todayStats ? todayStats.total_revenue : 0;
  const todayOrders = todayStats ? todayStats.total_orders : 0;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-stone-800">Financeiro</h2>
          <p className="text-stone-500">Acompanhe o desempenho das vendas</p>
        </div>
        <button 
          onClick={fetchStats}
          className="p-2 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
        >
          <TrendingUp className="w-5 h-5 text-stone-400" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Ganho de Hoje" 
          value={`R$ ${todayRevenue.toFixed(2)}`} 
          icon={<Calendar className="w-6 h-6" />}
          color="bg-orange-600"
          trend={`${todayOrders} pedidos`}
          positive={true}
        />
        <StatCard 
          title="Receita Total" 
          value={`R$ ${totalRevenue.toFixed(2)}`} 
          icon={<DollarSign className="w-6 h-6" />}
          color="bg-emerald-500"
          trend="Acumulado"
          positive={true}
        />
        <StatCard 
          title="Total de Pedidos" 
          value={totalOrders.toString()} 
          icon={<ShoppingBag className="w-6 h-6" />}
          color="bg-orange-500"
          trend="Total"
          positive={true}
        />
        <StatCard 
          title="Ticket Médio" 
          value={`R$ ${avgTicket.toFixed(2)}`} 
          icon={<TrendingUp className="w-6 h-6" />}
          color="bg-indigo-500"
          trend="Por pedido"
          positive={true}
        />
      </div>

      {/* History Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center">
          <h3 className="font-bold text-stone-800">Histórico de Vendas por Dia</h3>
          <div className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-widest">
            <Calendar className="w-4 h-4" />
            <span>Últimos 30 dias</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50 text-stone-400 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Pedidos</th>
                <th className="px-6 py-4">Receita</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {stats.map((stat, i) => (
                <tr key={i} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-stone-800">
                    {new Date(stat.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-stone-600">
                    {stat.total_orders}
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-600">
                    R$ {stat.total_revenue.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      Concluído
                    </span>
                  </td>
                </tr>
              ))}
              {stats.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-stone-400">
                    Nenhum dado financeiro disponível ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, trend, positive }: { title: string, value: string, icon: ReactNode, color: string, trend: string, positive: boolean }) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 flex flex-col gap-4"
    >
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-2xl text-white ${color}`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${positive ? 'text-emerald-500' : 'text-red-500'}`}>
          {positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-2xl font-black text-stone-800">{value}</h3>
      </div>
    </motion.div>
  );
}
