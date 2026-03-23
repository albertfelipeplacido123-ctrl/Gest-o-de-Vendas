import { supabase } from '../lib/supabase';
import { Ingredient, Recipe, Product, Sale, Loss, ProductionLog, IngredientEntry } from '../types';

/**
 * Fetches all data for the current user from Supabase.
 */
export async function fetchAllData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const results = await Promise.all([
    supabase.from('ingredients').select('*'),
    supabase.from('recipes').select('*'),
    supabase.from('recipe_ingredients').select('*'),
    supabase.from('products').select('*'),
    supabase.from('product_batches').select('*'),
    supabase.from('sales').select('*'),
    supabase.from('losses').select('*'),
    supabase.from('production_logs').select('*'),
    supabase.from('ingredient_entries').select('*')
  ]);

  // Log any errors but try to proceed with what we have
  results.forEach((res, index) => {
    if (res.error) {
      console.error(`Erro ao buscar tabela ${index}:`, res.error);
    }
  });

  const [
    { data: ingredients },
    { data: recipes },
    { data: recipeIngredients },
    { data: products },
    { data: productBatches },
    { data: sales },
    { data: losses },
    { data: productionLogs },
    { data: ingredientEntries }
  ] = results;

  // Map data to our local types
  const mappedRecipes: Recipe[] = (recipes || []).map(r => ({
    id: r.id,
    name: r.name,
    category: r.category,
    yield: Number(r.yield),
    productionTime: Number(r.production_time),
    additionalCostPercentage: Number(r.additional_cost_percentage),
    profitMargin: Number(r.profit_margin),
    ingredients: (recipeIngredients || [])
      .filter(ri => ri.recipe_id === r.id)
      .map(ri => ({
        ingredientId: ri.ingredient_id,
        quantity: Number(ri.quantity)
      }))
  }));

  const mappedProducts: Product[] = (products || []).map(p => ({
    id: p.id,
    recipeId: p.recipe_id,
    stock: Number(p.stock),
    customPrice: p.custom_price ? Number(p.custom_price) : undefined,
    batches: (productBatches || [])
      .filter(pb => pb.product_id === p.id)
      .map(pb => ({
        id: pb.id,
        quantity: Number(pb.quantity),
        productionDate: pb.production_date,
        expirationDate: pb.expiration_date
      }))
  }));

  return {
    ingredients: (ingredients || []).map(i => ({
      id: i.id,
      name: i.name,
      unit: i.unit,
      costPerUnit: Number(i.cost_per_unit),
      stockQuantity: Number(i.stock_quantity),
      entryDate: i.entry_date
    })),
    recipes: mappedRecipes,
    products: mappedProducts,
    sales: (sales || []).map(s => ({
      id: s.id,
      productId: s.product_id,
      quantity: Number(s.quantity),
      date: s.date,
      totalPrice: Number(s.total_price),
      profit: Number(s.profit)
    })),
    losses: (losses || []).map(l => ({
      id: l.id,
      productId: l.product_id,
      batchId: l.batch_id,
      quantity: Number(l.quantity),
      date: l.date,
      costLoss: Number(l.cost_loss)
    })),
    productionLogs: (productionLogs || []).map(pl => ({
      id: pl.id,
      recipeId: pl.recipe_id,
      recipeName: pl.recipe_name,
      batches: Number(pl.batches),
      totalQuantity: Number(pl.total_quantity),
      date: pl.date,
      expirationDate: pl.expiration_date
    })),
    ingredientEntries: (ingredientEntries || []).map(ie => ({
      id: ie.id,
      ingredientId: ie.ingredient_id,
      ingredientName: ie.ingredient_name,
      quantity: Number(ie.quantity),
      unit: ie.unit,
      costPerUnit: Number(ie.cost_per_unit),
      totalCost: Number(ie.total_cost),
      date: ie.date
    }))
  };
}

// Ingredients
export async function saveIngredient(ingredient: Omit<Ingredient, 'id'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from('ingredients').insert({
    user_id: user.id,
    name: ingredient.name,
    unit: ingredient.unit,
    cost_per_unit: ingredient.costPerUnit,
    stock_quantity: ingredient.stockQuantity,
    entry_date: ingredient.entryDate || new Date().toISOString()
  }).select().single();

  if (error) throw error;
  return data;
}

export async function updateIngredientDb(id: string, ingredient: Partial<Ingredient>) {
  const { error } = await supabase.from('ingredients').update({
    name: ingredient.name,
    unit: ingredient.unit,
    cost_per_unit: ingredient.costPerUnit,
    stock_quantity: ingredient.stockQuantity,
    entry_date: ingredient.entryDate
  }).eq('id', id);

  if (error) throw error;
}

export async function deleteIngredientDb(id: string) {
  const { error } = await supabase.from('ingredients').delete().eq('id', id);
  if (error) throw error;
}

// Recipes
export async function saveRecipe(recipe: Omit<Recipe, 'id'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: recipeData, error: recipeError } = await supabase.from('recipes').insert({
    user_id: user.id,
    name: recipe.name,
    category: recipe.category,
    yield: recipe.yield,
    production_time: recipe.productionTime,
    additional_cost_percentage: recipe.additionalCostPercentage,
    profit_margin: recipe.profitMargin
  }).select().single();

  if (recipeError) throw recipeError;

  // Save recipe ingredients
  const recipeIngredients = recipe.ingredients.map(ri => ({
    recipe_id: recipeData.id,
    ingredient_id: ri.ingredientId,
    quantity: ri.quantity
  }));

  const { error: riError } = await supabase.from('recipe_ingredients').insert(recipeIngredients);
  if (riError) throw riError;

  // Create associated product
  const { data: productData, error: pError } = await supabase.from('products').insert({
    user_id: user.id,
    recipe_id: recipeData.id,
    stock: 0
  }).select().single();

  if (pError) throw pError;

  return { recipe: recipeData, product: productData };
}

export async function updateRecipeDb(id: string, recipe: Partial<Recipe>) {
  const { error: recipeError } = await supabase.from('recipes').update({
    name: recipe.name,
    category: recipe.category,
    yield: recipe.yield,
    production_time: recipe.productionTime,
    additional_cost_percentage: recipe.additionalCostPercentage,
    profit_margin: recipe.profitMargin
  }).eq('id', id);

  if (recipeError) throw recipeError;

  if (recipe.ingredients) {
    // Delete old ingredients and insert new ones
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
    
    const recipeIngredients = recipe.ingredients.map(ri => ({
      recipe_id: id,
      ingredient_id: ri.ingredientId,
      quantity: ri.quantity
    }));

    const { error: riError } = await supabase.from('recipe_ingredients').insert(recipeIngredients);
    if (riError) throw riError;
  }
}

export async function deleteRecipeDb(id: string) {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throw error;
}

export async function updateProductDb(id: string, product: Partial<Product>) {
  const { error } = await supabase.from('products').update({
    custom_price: product.customPrice
  }).eq('id', id);

  if (error) throw error;
}

export async function createProductForRecipe(recipeId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Check if product already exists to avoid duplicates
  const { data: existing } = await supabase.from('products').select('id').eq('recipe_id', recipeId).maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase.from('products').insert({
    user_id: user.id,
    recipe_id: recipeId,
    stock: 0
  }).select().single();

  if (error) throw error;
  return data;
}

// Production
export async function registerProduction(recipeId: string, batches: number, totalQuantity: number, expirationDate: string, ingredientAdjustments: {id: string, newStock: number}[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Update ingredients stock
  for (const adj of ingredientAdjustments) {
    await supabase.from('ingredients').update({ stock_quantity: adj.newStock }).eq('id', adj.id);
  }

  // 2. Find product for this recipe
  const { data: product } = await supabase.from('products').select('id, stock').eq('recipe_id', recipeId).single();
  if (product) {
    // 3. Update product stock
    await supabase.from('products').update({ stock: product.stock + totalQuantity }).eq('id', product.id);

    // 4. Create batch
    await supabase.from('product_batches').insert({
      product_id: product.id,
      quantity: totalQuantity,
      production_date: new Date().toISOString(),
      expiration_date: expirationDate
    });
  }

  // 5. Create production log
  const { data: recipe } = await supabase.from('recipes').select('name').eq('id', recipeId).single();
  const { data: log } = await supabase.from('production_logs').insert({
    user_id: user.id,
    recipe_id: recipeId,
    recipe_name: recipe?.name || 'Receita',
    batches: batches,
    total_quantity: totalQuantity,
    date: new Date().toISOString(),
    expiration_date: expirationDate
  }).select().single();

  return log;
}

// Sales
export async function saveSale(sale: Omit<Sale, 'id'>, productStock: number, batchesToUpdate: {id: string, quantity: number}[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Update product stock
  await supabase.from('products').update({ stock: productStock }).eq('id', sale.productId);

  // 2. Update batches
  for (const b of batchesToUpdate) {
    if (b.quantity <= 0) {
      await supabase.from('product_batches').delete().eq('id', b.id);
    } else {
      await supabase.from('product_batches').update({ quantity: b.quantity }).eq('id', b.id);
    }
  }

  // 3. Save sale
  const { data, error } = await supabase.from('sales').insert({
    user_id: user.id,
    product_id: sale.productId,
    quantity: sale.quantity,
    date: sale.date,
    total_price: sale.totalPrice,
    profit: sale.profit
  }).select().single();

  if (error) throw error;
  return data;
}

export async function deleteSaleDb(id: string, productId: string, productStock: number) {
  // Simple delete, in a real app we'd restore batches too, but for now let's keep it simple
  await supabase.from('products').update({ stock: productStock }).eq('id', productId);
  const { error } = await supabase.from('sales').delete().eq('id', id);
  if (error) throw error;
}

// Losses
export async function saveLoss(loss: Omit<Loss, 'id'>, productStock: number, batchQuantity?: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Update product stock
  await supabase.from('products').update({ stock: productStock }).eq('id', loss.productId);

  // 2. Update batch if applicable
  if (loss.batchId && batchQuantity !== undefined) {
    if (batchQuantity <= 0) {
      await supabase.from('product_batches').delete().eq('id', loss.batchId);
    } else {
      await supabase.from('product_batches').update({ quantity: batchQuantity }).eq('id', loss.batchId);
    }
  }

  // 3. Save loss
  const { data, error } = await supabase.from('losses').insert({
    user_id: user.id,
    product_id: loss.productId,
    batch_id: loss.batchId,
    quantity: loss.quantity,
    date: loss.date,
    cost_loss: loss.costLoss
  }).select().single();

  if (error) throw error;
  return data;
}

// Ingredient Entries
export async function saveIngredientEntry(entry: Omit<IngredientEntry, 'id'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from('ingredient_entries').insert({
    user_id: user.id,
    ingredient_id: entry.ingredientId,
    ingredient_name: entry.ingredientName,
    quantity: entry.quantity,
    unit: entry.unit,
    cost_per_unit: entry.costPerUnit,
    total_cost: entry.totalCost,
    date: entry.date
  }).select().single();

  if (error) throw error;
  return data;
}

/**
 * Subscribes to changes in all relevant tables.
 */
export function subscribeToAllChanges(callback: () => void) {
  console.log('📡 Iniciando conexão em tempo real para todas as tabelas...');
  
  if (!supabase || typeof supabase.channel !== 'function') {
    console.error('Supabase client não inicializado corretamente para Realtime.');
    return { unsubscribe: () => {} };
  }

  const channel = supabase
    .channel('schema-db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      (payload) => {
        // Log detalhado para sabermos exatamente o que mudou
        console.log(`🔔 Mudança detectada! Tabela: [${payload.table}] | Ação: [${payload.eventType}]`);
        callback();
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Sincronização em tempo real ATIVA!');
      }
      if (status === 'CHANNEL_ERROR') {
        console.error('❌ Erro na conexão Realtime:', err);
      }
      if (status === 'TIMED_OUT') {
        console.warn('⚠️ Conexão Realtime expirou (Timed Out).');
      }
    });
    
  return channel;
}
