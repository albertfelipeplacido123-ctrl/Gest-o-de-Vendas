import { Recipe, Ingredient } from '../types';

export const calculateRecipeCost = (recipe: any, ingredients: Ingredient[]) => {
  let ingredientsCost = 0;
  
  recipe.ingredients.forEach((ri: any) => {
    const ing = ingredients.find(i => i.id === ri.ingredientId);
    if (ing) {
      ingredientsCost += ing.costPerUnit * ri.quantity;
    }
  });
  
  let legacyAdditional = 0;
  if (recipe.additionalCosts && typeof recipe.additionalCosts === 'object') {
    legacyAdditional = 
      (recipe.additionalCosts.packaging || 0) + 
      (recipe.additionalCosts.energy || 0) + 
      (recipe.additionalCosts.labor || 0) + 
      (recipe.additionalCosts.other || 0);
  }
    
  const pctCost = ingredientsCost * ((recipe.additionalCostPercentage || 0) / 100);
  const additionalCost = legacyAdditional + pctCost;
    
  const totalCost = ingredientsCost + additionalCost;
  const unitCost = recipe.yield > 0 ? totalCost / recipe.yield : 0;
  const suggestedPrice = totalCost * (1 + (recipe.profitMargin || 0) / 100);
  const suggestedUnitPrice = recipe.yield > 0 ? suggestedPrice / recipe.yield : 0;
  const profitPerUnit = suggestedUnitPrice - unitCost;
  const markup = unitCost > 0 ? ((suggestedUnitPrice - unitCost) / unitCost) * 100 : 0;
  const netMargin = suggestedUnitPrice > 0 ? (profitPerUnit / suggestedUnitPrice) * 100 : 0;
  
  return {
    ingredientsCost,
    additionalCost,
    totalCost,
    unitCost,
    suggestedPrice,
    suggestedUnitPrice,
    profitPerUnit,
    markup,
    netMargin
  };
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};
