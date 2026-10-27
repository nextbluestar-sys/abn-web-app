-- Prevent authenticated users from changing business identity/ownership metadata
-- or self-approving verification by direct table update. Verification status changes
-- remain handled by the checked verification workflow.
REVOKE UPDATE ON TABLE public.abn_businesses FROM authenticated;
GRANT UPDATE (
  name,
  slug,
  category,
  description,
  business_email,
  phone,
  website,
  gstin,
  address_line,
  city,
  state,
  pincode,
  is_active,
  latitude,
  longitude,
  cover_image_url,
  updated_at
) ON TABLE public.abn_businesses TO authenticated;
