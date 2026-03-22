import { useState } from 'react';
import { useStore } from '../store/useStore';
import { calculateRecipeCost, formatCurrency } from '../utils/calculations';
import { Plus, Edit2, Trash2, X, Copy, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { Recipe, RecipeIngredient } from '../types';

export default function RecipesScreen() {
  const { recipes, ingredients, addRecipe, updateRecipe, deleteRecipe, duplicateRecipe, produceRecipe } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [yieldAmount, setYieldAmount] = useState('');
  const [productionTime, setProductionTime] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [additionalCostPercentage, setAdditionalCostPercentage] = useState('');
  const [profitMargin, setProfitMargin] = useState('');
  const [search, setSearch] = useState('');
  
  const [producingRecipeId, setProducingRecipeId] = useState<string | null>(null);
  const [produceBatches, setProduceBatches] = useState('1');
  const [expirationDate, setExpirationDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  const resetForm = () => {
    setName('');
    setCategory('');
    setYieldAmount('');
    setProductionTime('');
    setRecipeIngredients([]);
    setAdditionalCostPercentage('');
    setProfitMargin('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (recipe: any) => {
    setName(recipe.name);
    setCategory(recipe.category);
    setYieldAmount(recipe.yield.toString());
    setProductionTime(recipe.productionTime.toString());
    setRecipeIngredients([...recipe.ingredients]);
    setAdditionalCostPercentage(recipe.additionalCostPercentage?.toString() || '0');
    setProfitMargin(recipe.profitMargin.toString());
    setEditingId(recipe.id);
    setIsAdding(true);
  };

  const handleSave = () => {
    if (!name || !yieldAmount || recipeIngredients.length === 0) return;
    
    const recipeData = {
      name,
      category,
      yield: parseFloat(yieldAmount),
      productionTime: parseFloat(productionTime || '0'),
      ingredients: recipeIngredients,
      additionalCostPercentage: parseFloat(additionalCostPercentage || '0'),
      profitMargin: parseFloat(profitMargin || '0')
    };

    if (editingId) {
      updateRecipe(editingId, recipeData);
    } else {
      addRecipe(recipeData);
    }
    resetForm();
  };

  const handleAddIngredient = () => {
    if (ingredients.length === 0) {
      alert("Cadastre ingredientes no estoque primeiro.");
      return;
    }
    setRecipeIngredients([...recipeIngredients, { ingredientId: ingredients[0].id, quantity: 0 }]);
  };

  const handleUpdateRecipeIngredient = (index: number, field: string, value: any) => {
    const updated = [...recipeIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setRecipeIngredients(updated);
  };

  const handleRemoveRecipeIngredient = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const handleProduce = () => {
    if (producingRecipeId && produceBatches && expirationDate) {
      produceRecipe(producingRecipeId, parseFloat(produceBatches), new Date(expirationDate).toISOString());
      setProducingRecipeId(null);
      setProduceBatches('1');
    }
  };

  const filteredRecipes = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Receitas</h2>
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
            <h3 className="text-lg font-bold">{editingId ? 'Editar Receita' : 'Nova Receita'}</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Receita *</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="Ex: Bolo de Cenoura"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <input 
                  type="text" 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Ex: Bolos"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rendimento (un) *</label>
                <input 
                  type="number" 
                  value={yieldAmount} 
                  onChange={(e) => setYieldAmount(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Ex: 10"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2 mt-4">
                <label className="block text-sm font-medium text-gray-700">Ingredientes *</label>
                <button 
                  onClick={handleAddIngredient}
                  className="text-orange-500 text-sm font-bold flex items-center"
                >
                  <Plus size={16} className="mr-1"/> Adicionar
                </button>
              </div>
              
              {recipeIngredients.length === 0 && (
                <p className="text-sm text-gray-500 italic">Nenhum ingrediente adicionado.</p>
              )}
              
              <div className="space-y-2">
                {recipeIngredients.map((ri, idx) => {
                  const ing = ingredients.find(i => i.id === ri.ingredientId);
                  return (
                    <div key={idx} className="flex space-x-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                      <select 
                        value={ri.ingredientId}
                        onChange={(e) => handleUpdateRecipeIngredient(idx, 'ingredientId', e.target.value)}
                        className="flex-1 p-2 bg-white border border-gray-200 rounded-lg outline-none text-sm"
                      >
                        {ingredients.map(i => (
                          <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                        ))}
                      </select>
                      <input 
                        type="number" 
                        step="0.001"
                        value={ri.quantity || ''}
                        onChange={(e) => handleUpdateRecipeIngredient(idx, 'quantity', parseFloat(e.target.value))}
                        className="w-20 p-2 bg-white border border-gray-200 rounded-lg outline-none text-sm"
                        placeholder="Qtd"
                      />
                      <span className="text-xs text-gray-500 w-6">{ing?.unit}</span>
                      <button onClick={() => handleRemoveRecipeIngredient(idx)} className="text-red-500 p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-1">Custos Adicionais (%)</label>
              <p className="text-xs text-gray-500 mb-2">Porcentagem cobrada sobre o custo dos ingredientes (Ex: embalagem, energia, mão de obra).</p>
              <input 
                type="number" 
                value={additionalCostPercentage} 
                onChange={(e) => setAdditionalCostPercentage(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="Ex: 15"
              />
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-1">Margem de Lucro (%)</label>
              <input 
                type="number" 
                value={profitMargin} 
                onChange={(e) => setProfitMargin(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="Ex: 50"
              />
            </div>
          </div>
          
          <button 
            onClick={handleSave}
            className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors mt-4"
          >
            Salvar Receita
          </button>
        </div>
      ) : (
        <>
          <input 
            type="text" 
            placeholder="Buscar receita..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none"
          />
          
          <div className="space-y-3">
            {filteredRecipes.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nenhuma receita encontrada.</p>
            ) : (
              filteredRecipes.map(recipe => {
                const costs = calculateRecipeCost(recipe, ingredients);
                const isExpanded = expandedId === recipe.id;
                
                return (
                  <div key={recipe.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div 
                      className="p-4 flex justify-between items-center cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
                    >
                      <div>
                        <h4 className="font-bold text-gray-900">{recipe.name}</h4>
                        <p className="text-sm text-gray-500">
                          Rende: {recipe.yield} un • Custo un: {formatCurrency(costs.unitCost)}
                        </p>
                      </div>
                      <div className="text-gray-400">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-gray-50 bg-gray-50">
                        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                          <div className="bg-white p-2 rounded-lg border border-gray-100">
                            <span className="text-gray-500 block text-xs">Custo Total</span>
                            <span className="font-bold">{formatCurrency(costs.totalCost)}</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-gray-100">
                            <span className="text-gray-500 block text-xs">Preço Sugerido</span>
                            <span className="font-bold text-green-600">{formatCurrency(costs.suggestedUnitPrice)}</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-gray-100">
                            <span className="text-gray-500 block text-xs">Lucro/un</span>
                            <span className="font-bold text-orange-500">{formatCurrency(costs.profitPerUnit)}</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-gray-100">
                            <span className="text-gray-500 block text-xs">Margem (Desejada)</span>
                            <span className="font-bold">{recipe.profitMargin}%</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-gray-100">
                            <span className="text-gray-500 block text-xs">Margem Líquida</span>
                            <span className="font-bold text-blue-600">{costs.netMargin.toFixed(1)}%</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-gray-100">
                            <span className="text-gray-500 block text-xs">Markup</span>
                            <span className="font-bold text-purple-600">{costs.markup.toFixed(1)}%</span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setProducingRecipeId(recipe.id); }}
                            className="flex-1 flex items-center justify-center bg-orange-500 text-white py-2 rounded-xl font-medium text-sm hover:bg-orange-600"
                          >
                            <Play size={16} className="mr-1" /> Produzir
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEdit(recipe); }}
                            className="p-2 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); duplicateRecipe(recipe.id); }}
                            className="p-2 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100"
                          >
                            <Copy size={16} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteRecipe(recipe.id); }}
                            className="p-2 text-red-500 bg-white border border-gray-200 rounded-xl hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Produce Modal */}
      {producingRecipeId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold">Produzir Receita</h3>
            <p className="text-sm text-gray-600">Quantas receitas (lotes) você vai produzir?</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de Lotes</label>
              <input 
                type="number" 
                min="1"
                value={produceBatches} 
                onChange={(e) => setProduceBatches(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Validade</label>
              <input 
                type="date" 
                value={expirationDate} 
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            
            <div className="flex space-x-3 pt-2">
              <button 
                onClick={() => setProducingRecipeId(null)}
                className="flex-1 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button 
                onClick={handleProduce}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-black hover:bg-gray-800"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
