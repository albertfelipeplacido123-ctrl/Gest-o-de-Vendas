import { supabase } from '../lib/supabase';
import { Ingredient, Recipe, Product, Sale, Loss, ProductionLog, IngredientEntry } from '../types';

/**
 * Service to handle all data operations with Supabase.
 */
export const dataService = {
  // Ingredients
  async getIngredients() {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*');
    if (error) throw error;
    return data as Ingredient[];
  },

  async addIngredient(ingredient: Omit<Ingredient, 'id'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('ingredients')
      .insert([{ ...ingredient, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data as Ingredient;
  },

  async updateIngredient(id: string, ingredient: Partial<Ingredient>) {
    const { data, error } = await supabase
      .from('ingredients')
      .update(ingredient)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Ingredient;
  },

  async deleteIngredient(id: string) {
    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Recipes
  async getRecipes() {
    const { data, error } = await supabase
      .from('recipes')
      .select('*, recipe_ingredients(*)');
    if (error) throw error;
    return data;
  },

  async addRecipe(recipe: Omit<Recipe, 'id'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // 1. Insert recipe
    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .insert([{
        user_id: user.id,
        name: recipe.name,
        category: recipe.category,
        yield: recipe.yield,
        production_time: recipe.productionTime,
        additional_cost_percentage: recipe.additionalCostPercentage,
        profit_margin: recipe.profitMargin
      }])
      .select()
      .single();

    if (recipeError) throw recipeError;

    // 2. Insert recipe ingredients
    if (recipe.ingredients.length > 0) {
      const recipeIngredients = recipe.ingredients.map(ri => ({
        recipe_id: recipeData.id,
        ingredient_id: ri.ingredientId,
        quantity: ri.quantity
      }));

      const { error: riError } = await supabase
        .from('recipe_ingredients')
        .insert(recipeIngredients);

      if (riError) throw riError;
    }

    return recipeData;
  },

  async deleteRecipe(id: string) {
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async updateRecipe(id: string, recipe: Partial<Recipe>) {
    const { error } = await supabase
      .from('recipes')
      .update({
        name: recipe.name,
        category: recipe.category,
        yield: recipe.yield,
        production_time: recipe.productionTime,
        additional_cost_percentage: recipe.additionalCostPercentage,
        profit_margin: recipe.profitMargin
      })
      .eq('id', id);
    if (error) throw error;
  },

  async produceRecipe(recipeId: string, batches: number, expirationDate: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('production_logs')
      .insert([{
        user_id: user.id,
        recipe_id: recipeId,
        batches: batches,
        expiration_date: expirationDate
      }]);
    if (error) throw error;
    return data;
  },

  // Products
  async getProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_batches(*)');
    if (error) throw error;
    return data;
  },

  // Sales
  async getSales() {
    const { data, error } = await supabase
      .from('sales')
      .select('*');
    if (error) throw error;
    return data as Sale[];
  },

  async addSale(sale: Omit<Sale, 'id'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('sales')
      .insert([{ ...sale, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data as Sale;
  },

  // Losses
  async getLosses() {
    const { data, error } = await supabase
      .from('losses')
      .select('*');
    if (error) throw error;
    return data as Loss[];
  },

  async addLoss(loss: Omit<Loss, 'id'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('losses')
      .insert([{ ...loss, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data as Loss;
  },

  // Production Logs
  async getProductionLogs() {
    const { data, error } = await supabase
      .from('production_logs')
      .select('*');
    if (error) throw error;
    return data as ProductionLog[];
  },

  // Ingredient Entries
  async getIngredientEntries() {
    const { data, error } = await supabase
      .from('ingredient_entries')
      .select('*');
    if (error) throw error;
    return data as IngredientEntry[];
  }
};
