import { useState } from 'react';
import { useStore } from '../store/useStore';
import { calculateRecipeCost, formatCurrency } from '../utils/calculations';
import { Plus, ShoppingCart, Edit2, Trash2, X } from 'lucide-react';
import { Sale } from '../types';

export default function SalesScreen() {
  const { products, recipes, ingredients, sales, addSale, deleteSale } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');

  const availableProducts = products.map(p => {
    const recipe = recipes.find(r => r.id === p.recipeId);
    if (!recipe) return null;
    
    const costs = calculateRecipeCost(recipe, ingredients);
    const finalPrice = p.customPrice || costs.suggestedUnitPrice;
    
    return {
      ...p,
      name: recipe.name,
      unitCost: costs.unitCost,
      finalPrice
    };
  }).filter(Boolean) as any[];

  const handleEdit = (sale: Sale) => {
    setSelectedProductId(sale.productId);
    setQuantity(sale.quantity.toString());
    setEditingSaleId(sale.id);
    setIsAdding(true);
  };

  const handleSave = () => {
    if (!selectedProductId || !quantity) return;
    
    const product = availableProducts.find(p => p.id === selectedProductId);
    if (!product) return;
    
    const qty = parseFloat(quantity);
    const totalPrice = product.finalPrice * qty;
    const totalCost = product.unitCost * qty;
    const profit = totalPrice - totalCost;
    
    if (editingSaleId) {
      const originalSale = sales.find(s => s.id === editingSaleId);
      deleteSale(editingSaleId);
      addSale({
        productId: selectedProductId,
        quantity: qty,
        date: originalSale ? originalSale.date : new Date().toISOString(),
        totalPrice,
        profit
      });
      setEditingSaleId(null);
    } else {
      addSale({
        productId: selectedProductId,
        quantity: qty,
        date: new Date().toISOString(),
        totalPrice,
        profit
      });
    }
    
    setIsAdding(false);
    setSelectedProductId('');
    setQuantity('1');
  };

  const cancelEdit = () => {
    setIsAdding(false);
    setEditingSaleId(null);
    setSelectedProductId('');
    setQuantity('1');
  };

  const confirmDelete = () => {
    if (saleToDelete) {
      deleteSale(saleToDelete);
      setSaleToDelete(null);
    }
  };

  const sortedSales = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Vendas</h2>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-orange-500 text-white p-2 rounded-full shadow-md hover:bg-orange-600 transition-colors"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 space-y-4 mb-6">
          <h3 className="text-lg font-bold">{editingSaleId ? 'Editar Venda' : 'Registrar Venda'}</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
            <select 
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
            >
              <option value="">Selecione um produto</option>
              {availableProducts.map(p => (
                <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                  {p.name} - {formatCurrency(p.finalPrice)} (Estoque: {p.stock})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
            <input 
              type="number" 
              min="1"
              value={quantity} 
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
          
          {selectedProductId && quantity && (
            <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex justify-between items-center">
              <span className="text-sm font-medium text-orange-800">Total da Venda:</span>
              <span className="text-lg font-bold text-orange-600">
                {formatCurrency((availableProducts.find(p => p.id === selectedProductId)?.finalPrice || 0) * parseFloat(quantity))}
              </span>
            </div>
          )}
          
          <div className="flex space-x-3 pt-2">
            <button 
              onClick={cancelEdit}
              className="flex-1 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              className="flex-1 py-3 rounded-xl font-bold text-white bg-black hover:bg-gray-800"
            >
              {editingSaleId ? 'Salvar Alterações' : 'Confirmar Venda'}
            </button>
          </div>
        </div>
      )}

      {saleToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Excluir Venda?</h3>
            <p className="text-gray-600">
              Tem certeza que deseja excluir esta venda? O estoque dos produtos será restaurado.
            </p>
            <div className="flex space-x-3 pt-2">
              <button 
                onClick={() => setSaleToDelete(null)}
                className="flex-1 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-800 mt-2">Histórico de Vendas</h3>
        
        {sortedSales.length === 0 ? (
          <div className="text-center text-gray-500 py-8 flex flex-col items-center">
            <ShoppingCart size={40} className="text-gray-300 mb-2" />
            <p>Nenhuma venda registrada ainda.</p>
          </div>
        ) : (
          sortedSales.map(sale => {
            const product = availableProducts.find(p => p.id === sale.productId) || { name: 'Produto Excluído' };
            const date = new Date(sale.date);
            
            return (
              <div key={sale.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-900">{product.name}</h4>
                    <p className="text-xs text-gray-500">
                      {date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {sale.quantity} un x {formatCurrency(sale.totalPrice / sale.quantity)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-gray-900">{formatCurrency(sale.totalPrice)}</div>
                    <div className="text-xs font-medium text-green-600">Lucro: {formatCurrency(sale.profit)}</div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-2 border-t border-gray-50">
                  <button 
                    onClick={() => handleEdit(sale)}
                    className="p-2 text-gray-400 hover:text-black bg-gray-50 rounded-lg transition-colors"
                    title="Editar Venda"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setSaleToDelete(sale.id)}
                    className="p-2 text-red-400 hover:text-red-600 bg-red-50 rounded-lg transition-colors"
                    title="Excluir Venda"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
