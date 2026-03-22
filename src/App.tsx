import { useState, ReactNode } from 'react';
import { LayoutDashboard, ChefHat, Boxes, Package, ShoppingCart, BarChart2 } from 'lucide-react';
import DashboardScreen from './screens/DashboardScreen';
import RecipesScreen from './screens/RecipesScreen';
import InventoryScreen from './screens/InventoryScreen';
import ProductsScreen from './screens/ProductsScreen';
import SalesScreen from './screens/SalesScreen';

type Tab = 'dashboard' | 'recipes' | 'inventory' | 'products' | 'sales';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

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
        <h1 className="text-xl font-bold text-orange-500">DoceGestão</h1>
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
