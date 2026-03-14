import { useState, useEffect, ReactNode } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart as PieChartIcon,
  Filter,
  CreditCard,
  Wallet,
  Smartphone
} from 'lucide-react';
import { FinanceStat } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

export default function FinancialDashboard() {
  const [stats, setStats] = useState<FinanceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | '7d' | '30d'>('all');

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

  const filteredStats = stats.filter(s => {
    if (filter === 'all') return true;
    const date = new Date(s.date);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);
    if (filter === '7d') return diff <= 7;
    if (filter === '30d') return diff <= 30;
    return true;
  }).reverse(); // Sort for charts (oldest to newest)

  const displayStats = [...filteredStats].reverse(); // Sort for table (newest to oldest)

  const totalRevenue = filteredStats.reduce((acc, s) => acc + s.total_revenue, 0);
  const totalOrders = filteredStats.reduce((acc, s) => acc + s.total_orders, 0);
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Pie chart data for payment methods
  const methodsData = [
    { name: 'PIX', value: filteredStats.reduce((acc, s) => acc + (s.by_method?.pix || 0), 0), color: '#10b981', icon: <Smartphone className="w-4 h-4" /> },
    { name: 'Dinheiro', value: filteredStats.reduce((acc, s) => acc + (s.by_method?.dinheiro || 0), 0), color: '#f59e0b', icon: <Wallet className="w-4 h-4" /> },
    { name: 'Cartão', value: filteredStats.reduce((acc, s) => acc + (s.by_method?.cartao || 0), 0), color: '#6366f1', icon: <CreditCard className="w-4 h-4" /> },
  ].filter(d => d.value > 0);

  // Stats by product type
  const totalCrepes = filteredStats.reduce((acc, s) => acc + (s.by_type?.crepe || 0), 0);
  const totalChurrasco = filteredStats.reduce((acc, s) => acc + (s.by_type?.churrasco || 0), 0);

  const COLORS = ['#F97316', '#FB923C', '#FDBA74', '#FED7AA'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-stone-800 tracking-tight">Financeiro</h2>
          <p className="text-stone-500 font-medium">Análise de desempenho e faturamento</p>
        </div>
        
        <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200 shadow-sm">
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>Tudo</FilterButton>
          <FilterButton active={filter === '7d'} onClick={() => setFilter('7d')}>7 dias</FilterButton>
          <FilterButton active={filter === '30d'} onClick={() => setFilter('30d')}>30 dias</FilterButton>
        </div>
      </div>

      {/* Main Metrics Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Faturamento" 
          value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={<DollarSign className="w-6 h-6" />}
          color="bg-emerald-500"
          trend="Total no período"
          positive={true}
        />
        <StatCard 
          title="Pedidos" 
          value={totalOrders.toString()} 
          icon={<ShoppingBag className="w-6 h-6" />}
          color="bg-orange-500"
          trend="Concluídos"
          positive={true}
        />
        <StatCard 
          title="Ticket Médio" 
          value={`R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={<TrendingUp className="w-6 h-6" />}
          color="bg-indigo-500"
          trend="Por venda"
          positive={true}
        />
        <StatCard 
          title={`${totalCrepes > totalChurrasco ? 'Crepe' : 'Churrasco'} em Alta`} 
          value={Math.max(totalCrepes, totalChurrasco).toString()} 
          icon={<BarChart3 className="w-6 h-6" />}
          color="bg-amber-500"
          trend="Mais vendido"
          positive={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-stone-200">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-bold text-stone-800">Evolução de Vendas</h3>
              <p className="text-sm text-stone-400">Faturamento diário em R$</p>
            </div>
            <div className="p-2 bg-stone-50 rounded-xl">
              <TrendingUp className="w-5 h-5 text-stone-300" />
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredStats}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#a8a29e', fontSize: 12}}
                  tickFormatter={(str) => {
                    const d = new Date(str);
                    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                  }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Faturamento']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                />
                <Area type="monotone" dataKey="total_revenue" stroke="#F97316" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Chart */}
        <div className="bg-stone-900 p-8 rounded-[2rem] shadow-xl text-white">
          <div className="mb-8">
            <h3 className="text-xl font-bold">Métodos de Pagamento</h3>
            <p className="text-stone-400 text-sm">Distribuição de receita</p>
          </div>

          <div className="h-[200px] w-full relative mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={methodsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {methodsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', background: '#292524', color: '#fff' }}
                   itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
              <p className="text-[10px] text-stone-500 uppercase font-black tracking-widest">Total</p>
              <p className="text-lg font-black">R$ {totalRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>

          <div className="space-y-4">
            {methodsData.map((item, i) => (
              <div key={i} className="flex justify-between items-center group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl" style={{ backgroundColor: `${item.color}20`, color: item.color }}>
                    {item.icon}
                  </div>
                  <span className="text-sm font-bold text-stone-300 group-hover:text-white transition-colors">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black">R$ {item.value.toFixed(2)}</p>
                  <p className="text-[10px] text-stone-500 font-bold">{((item.value / totalRevenue) * 100).toFixed(0)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category breakdown */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-200">
          <h3 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
             <BarChart3 className="w-5 h-5 text-orange-500" />
             Vendas por Categoria
          </h3>
          <div className="space-y-6">
             <CategoryRow 
                label="Crepes" 
                value={totalCrepes} 
                percentage={(totalCrepes / (totalCrepes + totalChurrasco || 1)) * 100} 
                color="bg-orange-500"
             />
             <CategoryRow 
                label="Churrasco" 
                value={totalChurrasco} 
                percentage={(totalChurrasco / (totalCrepes + totalChurrasco || 1)) * 100} 
                color="bg-stone-800"
             />
          </div>
        </div>

        {/* History Summary */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-200">
          <h3 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
             <Calendar className="w-5 h-5 text-indigo-500" />
             Últimos Dias
          </h3>
          <div className="space-y-4">
            {displayStats.slice(0, 5).map((stat, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-center w-12 h-12 flex flex-col justify-center bg-white rounded-xl border border-stone-100 shadow-sm">
                    <span className="text-[10px] font-black text-stone-400 uppercase leading-none">DIA</span>
                    <span className="text-lg font-black text-stone-800 leading-none">{new Date(stat.date).getDate()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-800">
                      {new Date(stat.date).toLocaleDateString('pt-BR', { weekday: 'long' })}
                    </p>
                    <p className="text-xs text-stone-400 font-medium">{stat.total_orders} pedidos realizados</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-md font-black text-emerald-600">R$ {stat.total_revenue.toFixed(2)}</p>
                  <div className="flex items-center gap-1 justify-end text-[10px] font-black text-stone-400 uppercase tracking-tighter">
                    <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                     FECHADO
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, trend, positive }: { title: string, value: string, icon: ReactNode, color: string, trend: string, positive: boolean }) {
  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-200 flex flex-col gap-4 relative overflow-hidden group"
    >
      <div className={`absolute -right-4 -top-4 w-24 h-24 ${color} opacity-[0.03] rounded-full group-hover:scale-150 transition-transform duration-500`}></div>
      <div className="flex justify-between items-start">
        <div className={`p-4 rounded-2xl text-white ${color} shadow-lg shadow-${color.split('-')[1]}-100`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${positive ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-1">{title}</p>
        <h3 className="text-2xl font-black text-stone-800 tracking-tight">{value}</h3>
      </div>
    </motion.div>
  );
}

function FilterButton({ children, active, onClick }: { children: ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
        active 
          ? 'bg-white text-stone-800 shadow-sm' 
          : 'text-stone-400 hover:text-stone-600'
      }`}
    >
      {children}
    </button>
  );
}

function CategoryRow({ label, value, percentage, color }: { label: string, value: number, percentage: number, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-sm font-black text-stone-800 uppercase tracking-widest">{label}</span>
        <span className="text-sm font-black text-stone-500">{value} unidades ({percentage.toFixed(0)}%)</span>
      </div>
      <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${color} rounded-full`}
        ></motion.div>
      </div>
    </div>
  );
}
