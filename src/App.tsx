import { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UtensilsCrossed, 
  ChefHat, 
  ClipboardList, 
  BarChart3, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock,
  XCircle,
  ShoppingBag,
  Package
} from 'lucide-react';
import { Product, Order, FinanceStat } from './types';

// Components
import OrderTerminal from './components/OrderTerminal';
import KitchenDisplay from './components/KitchenDisplay';
import MenuManager from './components/MenuManager';
import FinancialDashboard from './components/FinancialDashboard';
import DeliveryScreen from './components/DeliveryScreen';
import { LoginPage } from './pages/LoginPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LogOut } from 'lucide-react';

type Tab = 'vendas' | 'cozinha' | 'entrega' | 'cardapio' | 'financeiro';

const AppContent = () => {
  const { session, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('vendas');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1c1917] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-orange-500 p-2 rounded-lg">
                <UtensilsCrossed className="text-white w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-stone-800">
                Crep na Chapa
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <nav className="hidden md:flex space-x-1">
                <TabButton 
                  active={activeTab === 'vendas'} 
                  onClick={() => setActiveTab('vendas')}
                  icon={<ShoppingBag className="w-4 h-4" />}
                  label="Vendas"
                />
                <TabButton 
                  active={activeTab === 'cozinha'} 
                  onClick={() => setActiveTab('cozinha')}
                  icon={<ChefHat className="w-4 h-4" />}
                  label="Cozinha"
                />
                <TabButton 
                  active={activeTab === 'entrega'} 
                  onClick={() => setActiveTab('entrega')}
                  icon={<Package className="w-4 h-4" />}
                  label="Entrega"
                />
                <TabButton 
                  active={activeTab === 'cardapio'} 
                  onClick={() => setActiveTab('cardapio')}
                  icon={<ClipboardList className="w-4 h-4" />}
                  label="Cardápio"
                />
                <TabButton 
                  active={activeTab === 'financeiro'} 
                  onClick={() => setActiveTab('financeiro')}
                  icon={<BarChart3 className="w-4 h-4" />}
                  label="Financeiro"
                />
              </nav>

              <button 
                onClick={signOut}
                className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="Sair do Sistema"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'vendas' && <OrderTerminal />}
            {activeTab === 'cozinha' && <KitchenDisplay />}
            {activeTab === 'entrega' && <DeliveryScreen />}
            {activeTab === 'cardapio' && <MenuManager />}
            {activeTab === 'financeiro' && <FinancialDashboard />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex justify-around py-3 px-2 z-50">
        <MobileTabButton 
          active={activeTab === 'vendas'} 
          onClick={() => setActiveTab('vendas')}
          icon={<ShoppingBag className="w-6 h-6" />}
          label="Vendas"
        />
        <MobileTabButton 
          active={activeTab === 'cozinha'} 
          onClick={() => setActiveTab('cozinha')}
          icon={<ChefHat className="w-6 h-6" />}
          label="Cozinha"
        />
        <MobileTabButton 
          active={activeTab === 'entrega'} 
          onClick={() => setActiveTab('entrega')}
          icon={<Package className="w-6 h-6" />}
          label="Entrega"
        />
        <MobileTabButton 
          active={activeTab === 'cardapio'} 
          onClick={() => setActiveTab('cardapio')}
          icon={<ClipboardList className="w-6 h-6" />}
          label="Cardápio"
        />
        <MobileTabButton 
          active={activeTab === 'financeiro'} 
          onClick={() => setActiveTab('financeiro')}
          icon={<BarChart3 className="w-6 h-6" />}
          label="Financeiro"
        />
      </nav>
      <div className="h-20 md:hidden"></div> {/* Spacer for mobile nav */}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        active 
          ? 'bg-orange-50 text-orange-600' 
          : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MobileTabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors ${
        active ? 'text-orange-600' : 'text-stone-400'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </button>
  );
}
