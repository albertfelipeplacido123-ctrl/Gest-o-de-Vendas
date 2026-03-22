import { useState } from 'react';
import { useStore } from '../store/useStore';
import { calculateRecipeCost, formatCurrency } from '../utils/calculations';
import { Edit2, X, Check, Trash2 } from 'lucide-react';

export default function ProductsScreen() {
  const { products, recipes, ingredients, updateProduct, registerLoss } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customPrice, setCustomPrice] = useState('');
  const [search, setSearch] = useState('');
  
  const [lossModal, setLossModal] = useState<{ productId: string, batchId: string, maxQuantity: number, unitCost: number } | null>(null);
  const [lossQuantity, setLossQuantity] = useState('');

  const handleEdit = (product: any, currentPrice: number) => {
    setCustomPrice(product.customPrice ? product.customPrice.toString() : currentPrice.toString());
    setEditingId(product.id);
  };

  const handleSave = (id: string) => {
    updateProduct(id, { customPrice: parseFloat(customPrice) });
    setEditingId(null);
  };

  const handleRegisterLoss = () => {
    if (!lossModal || !lossQuantity) return;
    const qty = parseFloat(lossQuantity);
    if (qty <= 0 || qty > lossModal.maxQuantity) return;

    registerLoss({
      productId: lossModal.productId,
      batchId: lossModal.batchId,
      quantity: qty,
      date: new Date().toISOString(),
      costLoss: qty * lossModal.unitCost
    });

    setLossModal(null);
    setLossQuantity('');
  };

  const productsWithDetails = products.map(p => {
    const recipe = recipes.find(r => r.id === p.recipeId);
    if (!recipe) return null;
    
    const costs = calculateRecipeCost(recipe, ingredients);
    const finalPrice = p.customPrice || costs.suggestedUnitPrice;
    const customMarkup = costs.unitCost > 0 ? ((finalPrice - costs.unitCost) / costs.unitCost) * 100 : 0;
    const customNetMargin = finalPrice > 0 ? ((finalPrice - costs.unitCost) / finalPrice) * 100 : 0;
    
    return {
      ...p,
      name: recipe.name,
      category: recipe.category,
      unitCost: costs.unitCost,
      suggestedPrice: costs.suggestedUnitPrice,
      finalPrice,
      profit: finalPrice - costs.unitCost,
      markup: customMarkup,
      netMargin: customNetMargin
    };
  }).filter(Boolean) as any[];

  const filteredProducts = productsWithDetails.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Produtos para Venda</h2>
      
      <input 
        type="text" 
        placeholder="Buscar produto..." 
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none"
      />
      
      <div className="space-y-3">
        {filteredProducts.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nenhum produto disponível. Cadastre receitas primeiro.</p>
        ) : (
          filteredProducts.map(product => (
            <div key={product.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-gray-900">{product.name}</h4>
                  <p className="text-xs text-gray-500">{product.category}</p>
                </div>
                <div className="bg-orange-50 text-orange-600 px-2 py-1 rounded-lg text-sm font-bold">
                  Estoque: {product.stock} un
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                <div>
                  <span className="text-gray-500 block text-xs">Custo un.</span>
                  <span className="font-medium">{formatCurrency(product.unitCost)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Lucro un.</span>
                  <span className="font-medium text-green-600">{formatCurrency(product.profit)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Margem / Markup</span>
                  <span className="font-medium text-blue-600">{product.netMargin.toFixed(1)}% / {product.markup.toFixed(1)}%</span>
                </div>
              </div>
              
              {product.batches && product.batches.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <span className="text-xs font-bold text-gray-700 mb-2 block">Lotes em Estoque:</span>
                  <div className="space-y-1">
                    {product.batches.map((b: any) => {
                      const isExpiringSoon = new Date(b.expirationDate).getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000;
                      return (
                        <div key={b.id} className="flex justify-between items-center text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                          <div>
                            <span className="font-medium">Qtd: {b.quantity}</span>
                            <span className={`ml-2 ${isExpiringSoon ? 'text-red-500 font-bold' : ''}`}>
                              Val: {new Date(b.expirationDate).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <button 
                            onClick={() => setLossModal({ productId: product.id, batchId: b.id, maxQuantity: b.quantity, unitCost: product.unitCost })}
                            className="p-1.5 text-red-500 hover:bg-red-100 rounded-md transition-colors"
                            title="Descartar (Perda)"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center">
                {editingId === product.id ? (
                  <div className="flex items-center space-x-2 w-full">
                    <span className="text-sm font-medium">R$</span>
                    <input 
                      type="number" 
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm"
                    />
                    <button onClick={() => handleSave(product.id)} className="p-2 bg-black text-white rounded-lg">
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-2 bg-gray-100 text-gray-600 rounded-lg">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-gray-500 block text-xs">Preço de Venda</span>
                      <span className="font-bold text-lg text-gray-900">{formatCurrency(product.finalPrice)}</span>
                      {product.customPrice && <span className="text-[10px] text-orange-500 ml-2">(Personalizado)</span>}
                    </div>
                    <button 
                      onClick={() => handleEdit(product, product.suggestedPrice)}
                      className="p-2 text-gray-400 hover:text-black bg-gray-50 rounded-lg"
                    >
                      <Edit2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {lossModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Registrar Perda</h3>
            <p className="text-sm text-gray-600">
              Descartar produto por vencimento ou avaria. O custo será contabilizado como perda.
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade a descartar (Máx: {lossModal.maxQuantity})</label>
              <input 
                type="number" 
                min="0.1"
                max={lossModal.maxQuantity}
                step="0.1"
                value={lossQuantity} 
                onChange={(e) => setLossQuantity(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            
            {lossQuantity && parseFloat(lossQuantity) > 0 && parseFloat(lossQuantity) <= lossModal.maxQuantity && (
              <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex justify-between items-center">
                <span className="text-sm font-medium text-red-800">Custo da Perda:</span>
                <span className="text-lg font-bold text-red-600">
                  {formatCurrency(parseFloat(lossQuantity) * lossModal.unitCost)}
                </span>
              </div>
            )}

            <div className="flex space-x-3 pt-2">
              <button 
                onClick={() => { setLossModal(null); setLossQuantity(''); }}
                className="flex-1 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button 
                onClick={handleRegisterLoss}
                disabled={!lossQuantity || parseFloat(lossQuantity) <= 0 || parseFloat(lossQuantity) > lossModal.maxQuantity}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
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
