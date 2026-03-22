export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
  };
  token: string; // A simple random string for session identification
  expiresAt: string;
}

export type Unit = 'kg' | 'l' | 'un';

export interface CostHistoryEntry {
  date: string;
  costPerUnit: number;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: Unit;
  costPerUnit: number;
  stockQuantity: number;
  entryDate?: string;
  costHistory?: CostHistoryEntry[];
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  yield: number;
  productionTime: number;
  ingredients: RecipeIngredient[];
  additionalCostPercentage?: number;
  profitMargin: number;
}

export interface ProductBatch {
  id: string;
  quantity: number;
  productionDate: string;
  expirationDate: string;
}

export interface Product {
  id: string;
  recipeId: string;
  stock: number;
  batches?: ProductBatch[];
  customPrice?: number;
}

export interface DeductedBatch {
  batchId: string;
  quantity: number;
  productionDate: string;
  expirationDate: string;
}

export interface Sale {
  id: string;
  productId: string;
  quantity: number;
  date: string;
  totalPrice: number;
  profit: number;
  deductedBatches?: DeductedBatch[];
}

export interface Loss {
  id: string;
  productId: string;
  batchId: string;
  quantity: number;
  date: string;
  costLoss: number;
}

export interface ProductionLog {
  id: string;
  recipeId: string;
  recipeName: string;
  batches: number;
  totalQuantity: number;
  date: string;
  expirationDate: string;
}

export interface IngredientEntry {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: Unit;
  costPerUnit: number;
  totalCost: number;
  date: string;
}
