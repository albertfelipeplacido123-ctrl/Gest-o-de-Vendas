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
    
    return data.map((i: any) => ({
      id: i.id,
      name: i.name,
      unit: i.unit,
      costPerUnit: i.cost_per_unit,
      stockQuantity: i.stock_quantity,
      entryDate: i.entry_date,
      costHistory: i.cost_history
    })) as Ingredient[];
  },

  async addIngredient(ingredient: Omit<Ingredient, 'id'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('ingredients')
      .insert([{ 
        name: ingredient.name,
        unit: ingredient.unit,
        cost_per_unit: ingredient.costPerUnit,
        stock_quantity: ingredient.stockQuantity,
        entry_date: ingredient.entryDate,
        cost_history: ingredient.costHistory,
        user_id: user.id 
      }])
      .select()
      .single();
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      unit: data.unit,
      costPerUnit: data.cost_per_unit,
      stockQuantity: data.stock_quantity,
      entryDate: data.entry_date,
      costHistory: data.cost_history
    } as Ingredient;
  },

  async updateIngredient(id: string, ingredient: Partial<Ingredient>) {
    const updateData: any = {};
    if (ingredient.name !== undefined) updateData.name = ingredient.name;
    if (ingredient.unit !== undefined) updateData.unit = ingredient.unit;
    if (ingredient.costPerUnit !== undefined) updateData.cost_per_unit = ingredient.costPerUnit;
    if (ingredient.stockQuantity !== undefined) updateData.stock_quantity = ingredient.stockQuantity;
    if (ingredient.entryDate !== undefined) updateData.entry_date = ingredient.entryDate;
    if (ingredient.costHistory !== undefined) updateData.cost_history = ingredient.costHistory;

    const { data, error } = await supabase
      .from('ingredients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      unit: data.unit,
      costPerUnit: data.cost_per_unit,
      stockQuantity: data.stock_quantity,
      entryDate: data.entry_date,
      costHistory: data.cost_history
    } as Ingredient;
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
    
    return data.map((r: any) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      yield: r.yield,
      productionTime: r.production_time,
      additionalCostPercentage: r.additional_cost_percentage,
      profitMargin: r.profit_margin,
      ingredients: r.recipe_ingredients.map((ri: any) => ({
        ingredientId: ri.ingredient_id,
        quantity: ri.quantity
      }))
    })) as Recipe[];
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
      }])
      .select()
      .single();
    if (error) throw error;
    
    return {
      id: data.id,
      recipeId: data.recipe_id,
      batches: data.batches,
      expirationDate: data.expiration_date
    };
  },

  // Products
  async getProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_batches(*)');
    if (error) throw error;
    
    return data.map((p: any) => ({
      id: p.id,
      recipeId: p.recipe_id,
      stock: p.stock,
      customPrice: p.custom_price,
      batches: p.product_batches.map((b: any) => ({
        id: b.id,
        quantity: b.quantity,
        productionDate: b.production_date,
        expirationDate: b.expiration_date
      }))
    })) as Product[];
  },

  // Sales
  async getSales() {
    const { data, error } = await supabase
      .from('sales')
      .select('*');
    if (error) throw error;
    
    return data.map((s: any) => ({
      id: s.id,
      productId: s.product_id,
      quantity: s.quantity,
      date: s.date,
      totalPrice: s.total_price,
      profit: s.profit,
      deductedBatches: s.deducted_batches // This is a JSONB field, so it should be fine if saved as camelCase
    })) as Sale[];
  },

  async addSale(sale: Omit<Sale, 'id'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('sales')
      .insert([{ 
        product_id: sale.productId,
        quantity: sale.quantity,
        date: sale.date,
        total_price: sale.totalPrice,
        profit: sale.profit,
        deducted_batches: sale.deductedBatches,
        user_id: user.id 
      }])
      .select()
      .single();
    if (error) throw error;
    
    return {
      id: data.id,
      productId: data.product_id,
      quantity: data.quantity,
      date: data.date,
      totalPrice: data.total_price,
      profit: data.profit,
      deductedBatches: data.deducted_batches
    } as Sale;
  },

  // Losses
  async getLosses() {
    const { data, error } = await supabase
      .from('losses')
      .select('*');
    if (error) throw error;
    
    return data.map((l: any) => ({
      id: l.id,
      productId: l.product_id,
      batchId: l.batch_id,
      quantity: l.quantity,
      date: l.date,
      costLoss: l.cost_loss
    })) as Loss[];
  },

  async addLoss(loss: Omit<Loss, 'id'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('losses')
      .insert([{ 
        product_id: loss.productId,
        batch_id: loss.batchId,
        quantity: loss.quantity,
        date: loss.date,
        cost_loss: loss.costLoss,
        user_id: user.id 
      }])
      .select()
      .single();
    if (error) throw error;
    
    return {
      id: data.id,
      productId: data.product_id,
      batchId: data.batch_id,
      quantity: data.quantity,
      date: data.date,
      costLoss: data.cost_loss
    } as Loss;
  },

  // Production Logs
  async getProductionLogs() {
    const { data, error } = await supabase
      .from('production_logs')
      .select('*');
    if (error) throw error;
    
    return data.map((pl: any) => ({
      id: pl.id,
      recipeId: pl.recipe_id,
      recipeName: pl.recipe_name,
      batches: pl.batches,
      totalQuantity: pl.total_quantity,
      date: pl.date,
      expirationDate: pl.expiration_date
    })) as ProductionLog[];
  },

  // Ingredient Entries
  async getIngredientEntries() {
    const { data, error } = await supabase
      .from('ingredient_entries')
      .select('*');
    if (error) throw error;
    
    return data.map((ie: any) => ({
      id: ie.id,
      ingredientId: ie.ingredient_id,
      ingredientName: ie.ingredient_name,
      quantity: ie.quantity,
      unit: ie.unit,
      costPerUnit: ie.cost_per_unit,
      totalCost: ie.total_cost,
      date: ie.date
    })) as IngredientEntry[];
  }
};
