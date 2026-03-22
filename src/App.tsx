import { useState, ReactNode, useEffect } from 'react';
import { LayoutDashboard, ChefHat, Boxes, Package, ShoppingCart, LogOut, User as UserIcon } from 'lucide-react';
import DashboardScreen from './screens/DashboardScreen';
import RecipesScreen from './screens/RecipesScreen';
import InventoryScreen from './screens/InventoryScreen';
import ProductsScreen from './screens/ProductsScreen';
import SalesScreen from './screens/SalesScreen';
import AuthLayout from './components/Auth/AuthLayout';
import LoginForm from './components/Auth/LoginForm';
import RegisterForm from './components/Auth/RegisterForm';
import { getSession, logoutUser } from './services/authService';
import { AuthSession } from './types';
import { useStore } from './store/useStore';

type Tab = 'dashboard' | 'recipes' | 'inventory' | 'products' | 'sales';
type AuthView = 'login' | 'register';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [isInitializing, setIsInitializing] = useState(true);
  const fetchData = useStore(state => state.fetchData);
  const isLoading = useStore(state => state.isLoading);

  useEffect(() => {
    const initSession = async () => {
      const activeSession = await getSession();
      if (activeSession) {
        setSession(activeSession);
        fetchData();
      }
      setIsInitializing(false);
    };
    initSession();
  }, [fetchData]);

  const handleLogout = () => {
    logoutUser();
    setSession(null);
    setAuthView('login');
  };

  if (isInitializing || (session && isLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          <p className="text-gray-600 font-medium">Sincronizando seus dados...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <AuthLayout 
        title={authView === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
        subtitle={authView === 'login' ? 'Entre para gerenciar seu negócio' : 'Comece a organizar sua produção hoje'}
      >
        {authView === 'login' ? (
          <LoginForm 
            onSuccess={(newSession) => setSession(newSession)} 
            onToggleRegister={() => setAuthView('register')} 
          />
        ) : (
          <RegisterForm 
            onSuccess={() => setAuthView('login')} 
            onToggleLogin={() => setAuthView('login')} 
          />
        )}
      </AuthLayout>
    );
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardScreen />;
      case 'recipes': return <RecipesScreen />;
      case 'inventory': return <InventoryScreen />;
      case 'products': return <ProductsScreen />;
      case 'sales': return <SalesScreen />;
      default: return <DashboardScreen />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-black text-white p-4 shadow-md z-10 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <ChefHat className="text-orange-500" size={24} />
          <h1 className="text-xl font-bold text-orange-500">DoceGestão</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-300">
            <UserIcon size={16} />
            <span>{session.user.name}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-300 hover:text-white"
            title="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto pb-20">
        {renderScreen()}
      </main>
      
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-16 px-2 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <NavItem 
          icon={<LayoutDashboard size={24} />} 
          label="Início" 
          isActive={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')} 
        />
        <NavItem 
          icon={<ChefHat size={24} />} 
          label="Receitas" 
          isActive={activeTab === 'recipes'} 
          onClick={() => setActiveTab('recipes')} 
        />
        <NavItem 
          icon={<Boxes size={24} />} 
          label="Estoque" 
          isActive={activeTab === 'inventory'} 
          onClick={() => setActiveTab('inventory')} 
        />
        <NavItem 
          icon={<Package size={24} />} 
          label="Produtos" 
          isActive={activeTab === 'products'} 
          onClick={() => setActiveTab('products')} 
        />
        <NavItem 
          icon={<ShoppingCart size={24} />} 
          label="Vendas" 
          isActive={activeTab === 'sales'} 
          onClick={() => setActiveTab('sales')} 
        />
      </nav>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
        isActive ? 'text-orange-500' : 'text-gray-500 hover:text-gray-900'
      }`}
    >
      <div className={`${isActive ? 'scale-110' : 'scale-100'} transition-transform duration-200`}>
        {icon}
      </div>
      <span className="text-[10px] mt-1 font-medium">{label}</span>
    </button>
  );
}
