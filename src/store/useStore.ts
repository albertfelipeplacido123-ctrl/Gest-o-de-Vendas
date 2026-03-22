import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Ingredient, Recipe, Product, Sale, Loss, DeductedBatch, ProductionLog, IngredientEntry } from '../types';
import { dataService } from '../services/dataService';

interface AppState {
  ingredients: Ingredient[];
  recipes: Recipe[];
  products: Product[];
  sales: Sale[];
  losses: Loss[];
  productionLogs: ProductionLog[];
  ingredientEntries: IngredientEntry[];
  isLoading: boolean;
  
  fetchData: () => Promise<void>;
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
  
  fetchData: async () => {
    set({ isLoading: true });
    try {
      const [ingredients, recipes, products, sales, losses, productionLogs, ingredientEntries] = await Promise.all([
        dataService.getIngredients(),
        dataService.getRecipes(),
        dataService.getProducts(),
        dataService.getSales(),
        dataService.getLosses(),
        dataService.getProductionLogs(),
        dataService.getIngredientEntries()
      ]);
      
      set({ 
        ingredients, 
        recipes, 
        products, 
        sales, 
        losses, 
        productionLogs, 
        ingredientEntries,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      set({ isLoading: false });
    }
  },

  addIngredient: async (ingredient) => {
    try {
      const newIngredient = await dataService.addIngredient(ingredient);
      set((state) => ({
        ingredients: [...state.ingredients, newIngredient]
      }));
    } catch (error) {
      console.error('Error adding ingredient:', error);
    }
  },
  
  updateIngredient: async (id, ingredient, isQuickAdjust, adjustAmount) => {
    try {
      const updatedIngredient = await dataService.updateIngredient(id, ingredient);
      set((state) => ({
        ingredients: state.ingredients.map(i => i.id === id ? updatedIngredient : i)
      }));
    } catch (error) {
      console.error('Error updating ingredient:', error);
    }
  },
  
  deleteIngredient: async (id) => {
    try {
      await dataService.deleteIngredient(id);
      set((state) => ({
        ingredients: state.ingredients.filter(i => i.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting ingredient:', error);
    }
  },
  
  addRecipe: async (recipe) => {
    try {
      const newRecipe = await dataService.addRecipe(recipe);
      // After adding recipe, we should probably re-fetch to get the full object with relations
      // or manually update the state if we have all info.
      // For simplicity, let's re-fetch recipes and products
      const [recipes, products] = await Promise.all([
        dataService.getRecipes(),
        dataService.getProducts()
      ]);
      set({ recipes, products });
    } catch (error) {
      console.error('Error adding recipe:', error);
    }
  },
  
  updateRecipe: async (id, recipe) => {
    // Implementation for updateRecipe in Supabase would be similar to addRecipe
    // For now, let's just update local state and assume we'll implement the service later
    set((state) => ({
      recipes: state.recipes.map(r => r.id === id ? { ...r, ...recipe } : r)
    }));
  },
  
  deleteRecipe: async (id) => {
    // Implementation for deleteRecipe in Supabase
    set((state) => ({
      recipes: state.recipes.filter(r => r.id !== id),
      products: state.products.filter(p => p.recipeId !== id)
    }));
  },
  
  duplicateRecipe: async (id) => {
    const recipeToDuplicate = get().recipes.find(r => r.id === id);
    if (!recipeToDuplicate) return;
    
    const { id: _, ...recipeData } = recipeToDuplicate;
    await get().addRecipe({
      ...recipeData,
      name: `${recipeData.name} (Cópia)`
    });
  },
  
  updateProduct: async (id, product) => {
    set((state) => ({
      products: state.products.map(p => p.id === id ? { ...p, ...product } : p)
    }));
  },
  
  produceRecipe: async (recipeId, batches, expirationDate) => {
    // This involves multiple updates: ingredients stock, product stock, new batch, production log
    // Ideally this should be a transaction in Supabase or a RPC call.
    // For now, let's just update local state and assume we'll implement the service later
    set((state) => {
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
    });
  },
  
  addSale: async (sale) => {
    try {
      const newSale = await dataService.addSale(sale);
      set((state) => ({
        sales: [...state.sales, newSale]
      }));
      // We also need to update product stock
      const products = await dataService.getProducts();
      set({ products });
    } catch (error) {
      console.error('Error adding sale:', error);
    }
  },

  deleteSale: async (id) => {
    // Implementation for deleteSale in Supabase
    set((state) => ({
      sales: state.sales.filter(s => s.id !== id)
    }));
  },

  registerLoss: async (loss) => {
    try {
      const newLoss = await dataService.addLoss(loss);
      set((state) => ({
        losses: [...state.losses, newLoss]
      }));
      // We also need to update product stock
      const products = await dataService.getProducts();
      set({ products });
    } catch (error) {
      console.error('Error registering loss:', error);
    }
  },
}));
