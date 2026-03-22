import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Ingredient, Recipe, Product, Sale, Loss, DeductedBatch, ProductionLog, IngredientEntry } from '../types';

interface AppState {
  ingredients: Ingredient[];
  recipes: Recipe[];
  products: Product[];
  sales: Sale[];
  losses: Loss[];
  productionLogs: ProductionLog[];
  ingredientEntries: IngredientEntry[];
  
  addIngredient: (ingredient: Omit<Ingredient, 'id'>) => void;
  updateIngredient: (id: string, ingredient: Partial<Ingredient>, isQuickAdjust?: boolean, adjustAmount?: number) => void;
  deleteIngredient: (id: string) => void;
  
  addRecipe: (recipe: Omit<Recipe, 'id'>) => void;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  duplicateRecipe: (id: string) => void;
  
  updateProduct: (id: string, product: Partial<Product>) => void;
  produceRecipe: (recipeId: string, batches: number, expirationDate: string) => void;
  
  addSale: (sale: Omit<Sale, 'id'>) => void;
  deleteSale: (id: string) => void;
  registerLoss: (loss: Omit<Loss, 'id'>) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      ingredients: [],
      recipes: [],
      products: [],
      sales: [],
      losses: [],
      productionLogs: [],
      ingredientEntries: [],
      
      addIngredient: (ingredient) => set((state) => {
        const id = uuidv4();
        const newEntry: IngredientEntry = {
          id: uuidv4(),
          ingredientId: id,
          ingredientName: ingredient.name,
          quantity: ingredient.stockQuantity,
          unit: ingredient.unit,
          costPerUnit: ingredient.costPerUnit,
          totalCost: ingredient.stockQuantity * ingredient.costPerUnit,
          date: new Date().toISOString()
        };
        
        return {
          ingredients: [...state.ingredients, { 
            ...ingredient, 
            id,
            costHistory: [{
              date: new Date().toISOString(),
              costPerUnit: ingredient.costPerUnit
            }]
          }],
          ingredientEntries: [...(state.ingredientEntries || []), newEntry]
        };
      }),
      
      updateIngredient: (id, ingredient, isQuickAdjust, adjustAmount) => set((state) => {
        const updatedIngredients = state.ingredients.map(i => {
          if (i.id === id) {
            const newCost = ingredient.costPerUnit;
            const updatedHistory = [...(i.costHistory || [])];
            
            // If cost is changing, add to history
            if (newCost !== undefined && newCost !== i.costPerUnit) {
              updatedHistory.push({
                date: ingredient.entryDate ? new Date(ingredient.entryDate + 'T12:00:00').toISOString() : new Date().toISOString(),
                costPerUnit: newCost
              });
            }
            
            return { ...i, ...ingredient, costHistory: updatedHistory };
          }
          return i;
        });

        // Add entry if it's a quick adjust 'in'
        let newEntries = state.ingredientEntries || [];
        if (isQuickAdjust && adjustAmount && adjustAmount > 0) {
          const ing = state.ingredients.find(i => i.id === id);
          if (ing) {
            const newEntry: IngredientEntry = {
              id: uuidv4(),
              ingredientId: id,
              ingredientName: ing.name,
              quantity: adjustAmount,
              unit: ing.unit,
              costPerUnit: ingredient.costPerUnit || ing.costPerUnit,
              totalCost: adjustAmount * (ingredient.costPerUnit || ing.costPerUnit),
              date: ingredient.entryDate ? new Date(ingredient.entryDate + 'T12:00:00').toISOString() : new Date().toISOString()
            };
            newEntries = [...newEntries, newEntry];
          }
        }

        return {
          ingredients: updatedIngredients,
          ingredientEntries: newEntries
        };
      }),
      
      deleteIngredient: (id) => set((state) => ({
        ingredients: state.ingredients.filter(i => i.id !== id)
      })),
      
      addRecipe: (recipe) => set((state) => {
        const newRecipe = { ...recipe, id: uuidv4() };
        const newProduct: Product = {
          id: uuidv4(),
          recipeId: newRecipe.id,
          stock: 0,
          batches: [],
        };
        return {
          recipes: [...state.recipes, newRecipe],
          products: [...state.products, newProduct]
        };
      }),
      
      updateRecipe: (id, recipe) => set((state) => ({
        recipes: state.recipes.map(r => r.id === id ? { ...r, ...recipe } : r)
      })),
      
      deleteRecipe: (id) => set((state) => ({
        recipes: state.recipes.filter(r => r.id !== id),
        products: state.products.filter(p => p.recipeId !== id)
      })),
      
      duplicateRecipe: (id) => set((state) => {
        const recipeToDuplicate = state.recipes.find(r => r.id === id);
        if (!recipeToDuplicate) return state;
        
        const newRecipe = { 
          ...recipeToDuplicate, 
          id: uuidv4(), 
          name: `${recipeToDuplicate.name} (Cópia)` 
        };
        
        const newProduct: Product = {
          id: uuidv4(),
          recipeId: newRecipe.id,
          stock: 0,
          batches: [],
        };
        
        return {
          recipes: [...state.recipes, newRecipe],
          products: [...state.products, newProduct]
        };
      }),
      
      updateProduct: (id, product) => set((state) => ({
        products: state.products.map(p => p.id === id ? { ...p, ...product } : p)
      })),
      
      produceRecipe: (recipeId, batches, expirationDate) => set((state) => {
        const recipe = state.recipes.find(r => r.id === recipeId);
        if (!recipe) return state;
        
        const updatedIngredients = state.ingredients.map(ing => {
          const recipeIng = recipe.ingredients.find(ri => ri.ingredientId === ing.id);
          if (recipeIng) {
            return { ...ing, stockQuantity: ing.stockQuantity - (recipeIng.quantity * batches) };
          }
          return ing;
        });
        
        const updatedProducts = state.products.map(p => {
          if (p.recipeId === recipeId) {
            const newBatch = {
              id: uuidv4(),
              quantity: recipe.yield * batches,
              productionDate: new Date().toISOString(),
              expirationDate: expirationDate
            };
            return { 
              ...p, 
              stock: p.stock + newBatch.quantity,
              batches: [...(p.batches || []), newBatch]
            };
          }
          return p;
        });

        const newLog: ProductionLog = {
          id: uuidv4(),
          recipeId: recipeId,
          recipeName: recipe.name,
          batches: batches,
          totalQuantity: recipe.yield * batches,
          date: new Date().toISOString(),
          expirationDate: expirationDate
        };
        
        return {
          ingredients: updatedIngredients,
          products: updatedProducts,
          productionLogs: [...(state.productionLogs || []), newLog]
        };
      }),
      
      addSale: (sale) => set((state) => {
        const product = state.products.find(p => p.id === sale.productId);
        if (!product) return state;
        
        const deductedBatches: DeductedBatch[] = [];
        let remainingToDeduct = sale.quantity;
        
        const updatedProducts = state.products.map(p => {
          if (p.id === sale.productId) {
            const sortedBatches = [...(p.batches || [])].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
            
            const newBatches = sortedBatches.map(b => {
              if (remainingToDeduct <= 0) return b;
              if (b.quantity <= remainingToDeduct) {
                deductedBatches.push({ batchId: b.id, quantity: b.quantity, productionDate: b.productionDate, expirationDate: b.expirationDate });
                remainingToDeduct -= b.quantity;
                return { ...b, quantity: 0 };
              } else {
                deductedBatches.push({ batchId: b.id, quantity: remainingToDeduct, productionDate: b.productionDate, expirationDate: b.expirationDate });
                const updatedBatch = { ...b, quantity: b.quantity - remainingToDeduct };
                remainingToDeduct = 0;
                return updatedBatch;
              }
            }).filter(b => b.quantity > 0);

            return { ...p, stock: p.stock - sale.quantity, batches: newBatches };
          }
          return p;
        });
        
        return {
          sales: [...state.sales, { ...sale, id: uuidv4(), deductedBatches }],
          products: updatedProducts
        };
      }),

      deleteSale: (id) => set((state) => {
        const sale = state.sales.find(s => s.id === id);
        if (!sale) return state;
        
        const updatedProducts = state.products.map(p => {
          if (p.id === sale.productId) {
            let newBatches = [...(p.batches || [])];
            
            if (sale.deductedBatches && sale.deductedBatches.length > 0) {
              sale.deductedBatches.forEach(db => {
                const existingBatch = newBatches.find(b => b.id === db.batchId);
                if (existingBatch) {
                  existingBatch.quantity += db.quantity;
                } else {
                  newBatches.push({
                    id: db.batchId,
                    quantity: db.quantity,
                    productionDate: db.productionDate,
                    expirationDate: db.expirationDate
                  });
                }
              });
            } else {
              newBatches.push({
                id: uuidv4(),
                quantity: sale.quantity,
                productionDate: new Date().toISOString(),
                expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              });
            }
            
            newBatches.sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
            
            return { ...p, stock: p.stock + sale.quantity, batches: newBatches };
          }
          return p;
        });
        
        return {
          sales: state.sales.filter(s => s.id !== id),
          products: updatedProducts
        };
      }),

      registerLoss: (loss) => set((state) => {
        const updatedProducts = state.products.map(p => {
          if (p.id === loss.productId) {
            const newBatches = (p.batches || []).map(b => {
              if (b.id === loss.batchId) {
                return { ...b, quantity: Math.max(0, b.quantity - loss.quantity) };
              }
              return b;
            }).filter(b => b.quantity > 0);
            
            return { ...p, stock: Math.max(0, p.stock - loss.quantity), batches: newBatches };
          }
          return p;
        });
        
        return {
          losses: [...(state.losses || []), { ...loss, id: uuidv4() }],
          products: updatedProducts
        };
      }),
    }),
    {
      name: 'confeitaria-storage',
    }
  )
);
