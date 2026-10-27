-- Keep listing status under the moderation workflow. New owner listings use
-- the database default ('draft'); owners cannot directly publish/alter status.
REVOKE INSERT, UPDATE ON TABLE public.abn_listings FROM authenticated;
GRANT INSERT (
  business_id,
  created_by,
  listing_type,
  title,
  description,
  category,
  price,
  currency,
  unit,
  stock_quantity,
  image_paths,
  city,
  state,
  updated_at
) ON TABLE public.abn_listings TO authenticated;
GRANT UPDATE (
  listing_type,
  title,
  description,
  category,
  price,
  currency,
  unit,
  stock_quantity,
  image_paths,
  city,
  state,
  updated_at
) ON TABLE public.abn_listings TO authenticated;
