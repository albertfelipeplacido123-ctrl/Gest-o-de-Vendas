-- Initial Schema for DoceGestão

-- 1. Profiles (Extends Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Ingredients
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('kg', 'l', 'un')),
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  stock_quantity NUMERIC NOT NULL DEFAULT 0,
  entry_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  cost_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Recipes
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  yield NUMERIC NOT NULL,
  production_time INTEGER NOT NULL, -- in minutes
  additional_cost_percentage NUMERIC DEFAULT 0,
  profit_margin NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Recipe Ingredients (Many-to-Many)
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  UNIQUE(recipe_id, ingredient_id)
);

-- 5. Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  stock NUMERIC NOT NULL DEFAULT 0,
  custom_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Product Batches
CREATE TABLE IF NOT EXISTS product_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  production_date TIMESTAMP WITH TIME ZONE NOT NULL,
  expiration_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Sales
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  total_price NUMERIC NOT NULL,
  profit NUMERIC NOT NULL,
  deducted_batches JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Losses
CREATE TABLE IF NOT EXISTS losses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  cost_loss NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Production Logs
CREATE TABLE IF NOT EXISTS production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  recipe_name TEXT NOT NULL,
  batches INTEGER NOT NULL,
  total_quantity NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expiration_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Ingredient Entries
CREATE TABLE IF NOT EXISTS ingredient_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  cost_per_unit NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ROW LEVEL SECURITY (RLS)

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE losses ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for Profiles
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for Ingredients
CREATE POLICY "Users can view their own ingredients" ON ingredients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ingredients" ON ingredients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ingredients" ON ingredients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ingredients" ON ingredients FOR DELETE USING (auth.uid() = user_id);

-- Create policies for Recipes
CREATE POLICY "Users can view their own recipes" ON recipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recipes" ON recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recipes" ON recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recipes" ON recipes FOR DELETE USING (auth.uid() = user_id);

-- Create policies for Recipe Ingredients (via recipe ownership)
CREATE POLICY "Users can view ingredients of their recipes" ON recipe_ingredients FOR SELECT USING (
  EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_id AND recipes.user_id = auth.uid())
);
CREATE POLICY "Users can insert ingredients for their recipes" ON recipe_ingredients FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_id AND recipes.user_id = auth.uid())
);
CREATE POLICY "Users can update ingredients for their recipes" ON recipe_ingredients FOR UPDATE USING (
  EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_id AND recipes.user_id = auth.uid())
);
CREATE POLICY "Users can delete ingredients for their recipes" ON recipe_ingredients FOR DELETE USING (
  EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_id AND recipes.user_id = auth.uid())
);

-- Create policies for Products
CREATE POLICY "Users can view their own products" ON products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own products" ON products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own products" ON products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own products" ON products FOR DELETE USING (auth.uid() = user_id);

-- Create policies for Product Batches (via product ownership)
CREATE POLICY "Users can view batches of their products" ON product_batches FOR SELECT USING (
  EXISTS (SELECT 1 FROM products WHERE products.id = product_id AND products.user_id = auth.uid())
);
CREATE POLICY "Users can insert batches for their products" ON product_batches FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM products WHERE products.id = product_id AND products.user_id = auth.uid())
);
CREATE POLICY "Users can update batches for their products" ON product_batches FOR UPDATE USING (
  EXISTS (SELECT 1 FROM products WHERE products.id = product_id AND products.user_id = auth.uid())
);
CREATE POLICY "Users can delete batches for their products" ON product_batches FOR DELETE USING (
  EXISTS (SELECT 1 FROM products WHERE products.id = product_id AND products.user_id = auth.uid())
);

-- Create policies for Sales
CREATE POLICY "Users can view their own sales" ON sales FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sales" ON sales FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sales" ON sales FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sales" ON sales FOR DELETE USING (auth.uid() = user_id);

-- Create policies for Losses
CREATE POLICY "Users can view their own losses" ON losses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own losses" ON losses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own losses" ON losses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own losses" ON losses FOR DELETE USING (auth.uid() = user_id);

-- Create policies for Production Logs
CREATE POLICY "Users can view their own production logs" ON production_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own production logs" ON production_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for Ingredient Entries
CREATE POLICY "Users can view their own ingredient entries" ON ingredient_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ingredient entries" ON ingredient_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', 'Usuário'), new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
