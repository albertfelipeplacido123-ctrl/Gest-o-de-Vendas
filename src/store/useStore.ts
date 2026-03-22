import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
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
    const toastId = toast.loading('Salvando ingrediente...');
    try {
      const newIngredient = await dataService.addIngredient(ingredient);
      set((state) => ({
        ingredients: [...state.ingredients, newIngredient]
      }));
      toast.success('Ingrediente salvo com sucesso!', { id: toastId });
    } catch (error: any) {
      console.error('Error adding ingredient:', error);
      toast.error(`Erro ao salvar: ${error.message || 'Verifique sua conexão'}`, { id: toastId });
    }
  },
  
  updateIngredient: async (id, ingredient, isQuickAdjust, adjustAmount) => {
    const toastId = toast.loading('Atualizando...');
    try {
      const updatedIngredient = await dataService.updateIngredient(id, ingredient);
      set((state) => ({
        ingredients: state.ingredients.map(i => i.id === id ? updatedIngredient : i)
      }));
      toast.success('Atualizado com sucesso!', { id: toastId });
    } catch (error: any) {
      console.error('Error updating ingredient:', error);
      toast.error(`Erro ao atualizar: ${error.message || 'Verifique sua conexão'}`, { id: toastId });
    }
  },
  
  deleteIngredient: async (id) => {
    const toastId = toast.loading('Excluindo...');
    try {
      await dataService.deleteIngredient(id);
      set((state) => ({
        ingredients: state.ingredients.filter(i => i.id !== id)
      }));
      toast.success('Excluído com sucesso!', { id: toastId });
    } catch (error: any) {
      console.error('Error deleting ingredient:', error);
      toast.error(`Erro ao excluir: ${error.message || 'Verifique sua conexão'}`, { id: toastId });
    }
  },
  
  addRecipe: async (recipe) => {
    const toastId = toast.loading('Criando receita...');
    try {
      const newRecipe = await dataService.addRecipe(recipe);
      const [recipes, products] = await Promise.all([
        dataService.getRecipes(),
        dataService.getProducts()
      ]);
      set({ recipes, products });
      toast.success('Receita criada com sucesso!', { id: toastId });
    } catch (error: any) {
      console.error('Error adding recipe:', error);
      toast.error(`Erro ao criar receita: ${error.message || 'Verifique sua conexão'}`, { id: toastId });
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
    const toastId = toast.loading('Registrando venda...');
    try {
      const newSale = await dataService.addSale(sale);
      set((state) => ({
        sales: [...state.sales, newSale]
      }));
      const products = await dataService.getProducts();
      set({ products });
      toast.success('Venda registrada!', { id: toastId });
    } catch (error: any) {
      console.error('Error adding sale:', error);
      toast.error(`Erro ao vender: ${error.message || 'Verifique sua conexão'}`, { id: toastId });
    }
  },

  deleteSale: async (id) => {
    // Implementation for deleteSale in Supabase
    set((state) => ({
      sales: state.sales.filter(s => s.id !== id)
    }));
  },

  registerLoss: async (loss) => {
    const toastId = toast.loading('Registrando perda...');
    try {
      const newLoss = await dataService.addLoss(loss);
      set((state) => ({
        losses: [...state.losses, newLoss]
      }));
      const products = await dataService.getProducts();
      set({ products });
      toast.success('Perda registrada!', { id: toastId });
    } catch (error: any) {
      console.error('Error registering loss:', error);
      toast.error(`Erro ao registrar perda: ${error.message || 'Verifique sua conexão'}`, { id: toastId });
    }
  },
}));
