CREATE OR REPLACE FUNCTION private.abn_auto_publish_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_verified boolean := false;
  v_active boolean := false;
BEGIN
  SELECT (b.verification_status = 'verified'::public.abn_verification_status), b.is_active
    INTO v_verified, v_active
  FROM public.abn_businesses b
  WHERE b.id = NEW.business_id;

  IF coalesce(v_verified, false) AND coalesce(v_active, false) THEN
    NEW.status := 'published'::public.abn_listing_status;
  ELSE
    NEW.status := 'draft'::public.abn_listing_status;
  END IF;
  RETURN NEW;
END;
$function$;
