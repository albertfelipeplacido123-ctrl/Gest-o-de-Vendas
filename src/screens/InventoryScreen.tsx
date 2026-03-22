import { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/calculations';
import { Plus, Edit2, Trash2, X, History } from 'lucide-react';
import { Unit } from '../types';

export default function InventoryScreen() {
  const { ingredients, addIngredient, updateIngredient, deleteIngredient } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<Unit>('un');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  
  // Quick Adjustment State
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustPrice, setAdjustPrice] = useState('');
  const [adjustDate, setAdjustDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setUnit('un');
    setCostPerUnit('');
    setStockQuantity('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (ing: any) => {
    setName(ing.name);
    setUnit(ing.unit);
    setCostPerUnit(ing.costPerUnit.toString());
    setStockQuantity(ing.stockQuantity.toString());
    setEntryDate(ing.entryDate || new Date().toISOString().split('T')[0]);
    setEditingId(ing.id);
    setIsAdding(true);
  };

  const handleSave = () => {
    if (!name || !costPerUnit || !stockQuantity) return;
    
    const ingData = {
      name,
      unit,
      costPerUnit: parseFloat(costPerUnit),
      stockQuantity: parseFloat(stockQuantity),
      entryDate
    };

    if (editingId) {
      updateIngredient(editingId, ingData);
    } else {
      addIngredient(ingData);
    }
    resetForm();
  };

  const handleQuickAdjust = () => {
    if (!adjustingId || !adjustAmount) return;
    
    const ing = ingredients.find(i => i.id === adjustingId);
    if (!ing) return;

    const amount = parseFloat(adjustAmount);
    const newQuantity = adjustType === 'in' 
      ? ing.stockQuantity + amount 
      : Math.max(0, ing.stockQuantity - amount);
    
    const updateData: any = { stockQuantity: newQuantity };
    
    if (adjustType === 'in' && adjustPrice) {
      updateData.costPerUnit = parseFloat(adjustPrice);
      updateData.entryDate = adjustDate;
    }

    updateIngredient(adjustingId, updateData, adjustType === 'in', amount);
    setAdjustingId(null);
    setAdjustAmount('');
    setAdjustPrice('');
  };

  const filteredIngredients = ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Estoque de Insumos</h2>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-orange-500 text-white p-2 rounded-full shadow-md hover:bg-orange-600 transition-colors"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      {isAdding ? (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold">{editingId ? 'Editar Insumo' : 'Novo Insumo'}</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              placeholder="Ex: Leite Condensado"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
              <select 
                value={unit} 
                onChange={(e) => setUnit(e.target.value as Unit)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="un">Unidades (un)</option>
                <option value="kg">Kilogramas (kg)</option>
                <option value="l">Litros (l)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custo por {unit}</label>
              <input 
                type="number" 
                step="0.001"
                value={costPerUnit} 
                onChange={(e) => setCostPerUnit(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="Ex: 0.02"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Atual ({unit})</label>
              <input 
                type="number" 
                step="0.001"
                value={stockQuantity} 
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder={unit === 'un' ? "Ex: 10" : "Ex: 2.5"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Entrada</label>
              <input 
                type="date" 
                value={entryDate} 
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>
          
          <button 
            onClick={handleSave}
            className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors mt-2"
          >
            Salvar Insumo
          </button>
        </div>
      ) : (
        <>
          <input 
            type="text" 
            placeholder="Buscar insumo..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none"
          />
          
          <div className="space-y-3">
            {filteredIngredients.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nenhum insumo encontrado.</p>
            ) : (
              filteredIngredients.map(ing => (
                <div key={ing.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-gray-900">{ing.name}</h4>
                    <p className="text-sm text-gray-500">
                      Custo: {formatCurrency(ing.costPerUnit)} / {ing.unit}
                    </p>
                    <p className="text-sm font-medium text-orange-600 mt-1">
                      Estoque: {ing.stockQuantity.toFixed(3)} {ing.unit}
                    </p>
                    <div className="flex mt-3 space-x-2">
                      <button 
                        onClick={() => {
                          setAdjustingId(ing.id);
                          setAdjustType('in');
                          setAdjustPrice(ing.costPerUnit.toString());
                          setAdjustDate(new Date().toISOString().split('T')[0]);
                        }}
                        className="flex items-center space-x-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
                      >
                        <Plus size={14} />
                        <span>Entrada</span>
                      </button>
                      <button 
                        onClick={() => {
                          setAdjustingId(ing.id);
                          setAdjustType('out');
                        }}
                        className="flex items-center space-x-1 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                      >
                        <X size={14} />
                        <span>Saída</span>
                      </button>
                      <button 
                        onClick={() => setViewingHistoryId(ing.id)}
                        className="flex items-center space-x-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                        title="Histórico de Preços"
                      >
                        <History size={14} />
                        <span>Histórico</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <button 
                      onClick={() => handleEdit(ing)}
                      className="p-2 text-gray-400 hover:text-black bg-gray-50 rounded-lg"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => deleteIngredient(ing.id)}
                      className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Quick Adjustment Modal */}
      {adjustingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">
                {adjustType === 'in' ? 'Registrar Entrada' : 'Registrar Saída'}
              </h3>
              <button onClick={() => setAdjustingId(null)} className="text-gray-400">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-gray-600">
              Insumo: <span className="font-bold text-gray-900">
                {ingredients.find(i => i.id === adjustingId)?.name}
              </span>
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade ({ingredients.find(i => i.id === adjustingId)?.unit})
              </label>
              <input 
                type="number" 
                step="0.001"
                autoFocus
                value={adjustAmount} 
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="Ex: 0.500"
              />
            </div>

            {adjustType === 'in' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Novo Custo por {ingredients.find(i => i.id === adjustingId)?.unit} (R$)
                  </label>
                  <input 
                    type="number" 
                    step="0.001"
                    value={adjustPrice} 
                    onChange={(e) => setAdjustPrice(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Ex: 15.50"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Deixe como está se o preço não mudou.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data da Entrada
                  </label>
                  <input 
                    type="date" 
                    value={adjustDate} 
                    onChange={(e) => setAdjustDate(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </>
            )}
            
            <div className="flex space-x-3 pt-2">
              <button 
                onClick={() => setAdjustingId(null)}
                className="flex-1 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button 
                onClick={handleQuickAdjust}
                className={`flex-1 py-3 rounded-xl font-bold text-white ${adjustType === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cost History Modal */}
      {viewingHistoryId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Histórico de Custos</h3>
              <button onClick={() => setViewingHistoryId(null)} className="text-gray-400">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-gray-600">
              Insumo: <span className="font-bold text-gray-900">
                {ingredients.find(i => i.id === viewingHistoryId)?.name}
              </span>
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {ingredients.find(i => i.id === viewingHistoryId)?.costHistory?.length ? (
                [...(ingredients.find(i => i.id === viewingHistoryId)?.costHistory || [])]
                  .reverse()
                  .map((entry, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="text-xs text-gray-500">
                        {new Date(entry.date).toLocaleDateString('pt-BR')} {new Date(entry.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="font-bold text-gray-900">
                        {formatCurrency(entry.costPerUnit)}
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-center text-gray-500 py-4 text-sm italic">Nenhum histórico disponível.</p>
              )}
            </div>
            
            <button 
              onClick={() => setViewingHistoryId(null)}
              className="w-full py-3 rounded-xl font-bold text-white bg-black hover:bg-gray-800"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
