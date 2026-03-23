import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Ingredient, Recipe, Product, Sale, Loss, DeductedBatch, ProductionLog, IngredientEntry } from '../types';
import * as dataService from '../services/dataService';

interface AppState {
  ingredients: Ingredient[];
  recipes: Recipe[];
  products: Product[];
  sales: Sale[];
  losses: Loss[];
  productionLogs: ProductionLog[];
  ingredientEntries: IngredientEntry[];
  isLoading: boolean;
  error: string | null;
  
  loadData: (silent?: boolean) => Promise<void>;
  subscribeToChanges: () => () => void;
  clearData: () => void;
  addIngredient: (ingredient: Omit<Ingredient, 'id'>) => Promise<void>;
  updateIngredient: (id: string, ingredient: Partial<Ingredient>, isQuickAdjust?: boolean, adjustAmount?: number) => Promise<void>;
  deleteIngredient: (id: string) => Promise<void>;
  
  addRecipe: (recipe: Omit<Recipe, 'id'>) => Promise<void>;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  duplicateRecipe: (id: string) => Promise<void>;
  
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  produceRecipe: (recipeId: string, batches: number, expirationDate: string) => Promise<void>;
  
  addSale: (sale: Omit<Sale, 'id'>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  registerLoss: (loss: Omit<Loss, 'id'>) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  ingredients: [],
  recipes: [],
  products: [],
  sales: [],
  losses: [],
  productionLogs: [],
  ingredientEntries: [],
  isLoading: false,
  error: null,
  
  loadData: async (silent?: boolean) => {
    if (!silent) set({ isLoading: true, error: null });
    try {
      const data = await dataService.fetchAllData();
      if (data) {
        // Defensive check: ensure all recipes have a product
        const missingProducts = data.recipes.filter(r => !data.products.some(p => p.recipeId === r.id));
        if (missingProducts.length > 0) {
          console.log(`Found ${missingProducts.length} recipes without products. Creating them...`);
          for (const recipe of missingProducts) {
            await dataService.createProductForRecipe(recipe.id);
          }
          // Reload after creating missing products
          const updatedData = await dataService.fetchAllData();
          if (updatedData) {
            set({ ...updatedData, isLoading: false });
            return;
          }
        }
        set({ ...data, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  subscribeToChanges: () => {
    const channel = dataService.subscribeToAllChanges(() => {
      get().loadData(true); // Silent update
    });
    
    return () => {
      channel.unsubscribe();
    };
  },

  clearData: () => {
    set({
      ingredients: [],
      recipes: [],
      products: [],
      sales: [],
      losses: [],
      productionLogs: [],
      ingredientEntries: [],
      error: null
    });
  },

  addIngredient: async (ingredient) => {
    try {
      const saved = await dataService.saveIngredient(ingredient);
      if (saved) {
        const newEntry: Omit<IngredientEntry, 'id'> = {
          ingredientId: saved.id,
          ingredientName: saved.name,
          quantity: saved.stock_quantity,
          unit: saved.unit,
          costPerUnit: saved.cost_per_unit,
          totalCost: saved.stock_quantity * saved.cost_per_unit,
          date: new Date().toISOString()
        };
        await dataService.saveIngredientEntry(newEntry);
        await get().loadData(true);
      }
    } catch (err: any) {
      console.error('Error adding ingredient:', err);
      set({ error: err.message });
    }
  },
  
  updateIngredient: async (id, ingredient, isQuickAdjust, adjustAmount) => {
    try {
      const current = get().ingredients.find(i => i.id === id);
      if (!current) return;

      const updatedStock = ingredient.stockQuantity !== undefined ? ingredient.stockQuantity : current.stockQuantity;
      const updatedCost = ingredient.costPerUnit !== undefined ? ingredient.costPerUnit : current.costPerUnit;

      await dataService.updateIngredientDb(id, {
        ...ingredient,
        stockQuantity: updatedStock,
        costPerUnit: updatedCost
      });

      if (isQuickAdjust && adjustAmount && adjustAmount > 0) {
        const newEntry: Omit<IngredientEntry, 'id'> = {
          ingredientId: id,
          ingredientName: current.name,
          quantity: adjustAmount,
          unit: current.unit,
          costPerUnit: updatedCost,
          totalCost: adjustAmount * updatedCost,
          date: ingredient.entryDate ? new Date(ingredient.entryDate + 'T12:00:00').toISOString() : new Date().toISOString()
        };
        await dataService.saveIngredientEntry(newEntry);
      }
      await get().loadData(true);
    } catch (err: any) {
      console.error('Error updating ingredient:', err);
      set({ error: err.message });
    }
  },
  
  deleteIngredient: async (id) => {
    try {
      await dataService.deleteIngredientDb(id);
      await get().loadData(true);
    } catch (err: any) {
      console.error('Error deleting ingredient:', err);
      set({ error: err.message });
    }
  },
  
  addRecipe: async (recipe) => {
    try {
      await dataService.saveRecipe(recipe);
      await get().loadData(true);
    } catch (err: any) {
      console.error('Error adding recipe:', err);
      set({ error: err.message });
    }
  },
  
  updateRecipe: async (id, recipe) => {
    try {
      await dataService.updateRecipeDb(id, recipe);
      await get().loadData(true);
    } catch (err: any) {
      console.error('Error updating recipe:', err);
      set({ error: err.message });
    }
  },
  
  deleteRecipe: async (id) => {
    try {
      await dataService.deleteRecipeDb(id);
      await get().loadData(true);
    } catch (err: any) {
      console.error('Error deleting recipe:', err);
      set({ error: err.message });
    }
  },
  
  duplicateRecipe: async (id) => {
    const recipeToDuplicate = get().recipes.find(r => r.id === id);
    if (!recipeToDuplicate) return;
    
    try {
      await dataService.saveRecipe({
        ...recipeToDuplicate,
        name: `${recipeToDuplicate.name} (Cópia)`
      });
      await get().loadData(true);
    } catch (err: any) {
      console.error('Error duplicating recipe:', err);
      set({ error: err.message });
    }
  },
  
  updateProduct: async (id, product) => {
    try {
      await dataService.updateProductDb(id, product);
      await get().loadData(true);
    } catch (err: any) {
      console.error('Error updating product:', err);
      set({ error: err.message });
    }
  },
  
  produceRecipe: async (recipeId, batches, expirationDate) => {
    const recipe = get().recipes.find(r => r.id === recipeId);
    if (!recipe) return;
    
    try {
      // Ensure product exists before production
      let product = get().products.find(p => p.recipeId === recipeId);
      if (!product) {
        await dataService.createProductForRecipe(recipeId);
        await get().loadData(true);
        product = get().products.find(p => p.recipeId === recipeId);
      }

      const ingredientAdjustments = recipe.ingredients.map(ri => {
        const ing = get().ingredients.find(i => i.id === ri.ingredientId);
        return {
          id: ri.ingredientId,
          newStock: (ing?.stockQuantity || 0) - (ri.quantity * batches)
        };
      });

      await dataService.registerProduction(
        recipeId, 
        batches, 
        recipe.yield * batches, 
        expirationDate, 
        ingredientAdjustments
      );
      await get().loadData(true);
    } catch (err: any) {
      console.error('Error producing recipe:', err);
      set({ error: err.message });
    }
  },
  
  addSale: async (sale) => {
    const product = get().products.find(p => p.id === sale.productId);
    if (!product) return;
    
    try {
      let remainingToDeduct = sale.quantity;
      const batchesToUpdate: {id: string, quantity: number}[] = [];
      
      const sortedBatches = [...(product.batches || [])].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
      
      for (const b of sortedBatches) {
        if (remainingToDeduct <= 0) break;
        if (b.quantity <= remainingToDeduct) {
          remainingToDeduct -= b.quantity;
          batchesToUpdate.push({ id: b.id, quantity: 0 });
        } else {
          batchesToUpdate.push({ id: b.id, quantity: b.quantity - remainingToDeduct });
          remainingToDeduct = 0;
        }
      }

      await dataService.saveSale(sale, product.stock - sale.quantity, batchesToUpdate);
      await get().loadData(true);
    } catch (err: any) {
      console.error('Error adding sale:', err);
      set({ error: err.message });
    }
  },

  deleteSale: async (id) => {
    const sale = get().sales.find(s => s.id === id);
    if (!sale) return;
    
    try {
      const product = get().products.find(p => p.id === sale.productId);
      await dataService.deleteSaleDb(id, sale.productId, (product?.stock || 0) + sale.quantity);
      await get().loadData(true);
    } catch (err: any) {
      console.error('Error deleting sale:', err);
      set({ error: err.message });
    }
  },

  registerLoss: async (loss) => {
    const product = get().products.find(p => p.id === loss.productId);
    if (!product) return;
    
    try {
      let batchQuantity: number | undefined;
      if (loss.batchId) {
        const batch = product.batches?.find(b => b.id === loss.batchId);
        if (batch) {
          batchQuantity = Math.max(0, batch.quantity - loss.quantity);
        }
      }

      await dataService.saveLoss(loss, Math.max(0, product.stock - loss.quantity), batchQuantity);
      await get().loadData(true);
    } catch (err: any) {
      console.error('Error registering loss:', err);
      set({ error: err.message });
    }
  },
}));
