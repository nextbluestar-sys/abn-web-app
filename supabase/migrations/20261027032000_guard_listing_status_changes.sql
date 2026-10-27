CREATE OR REPLACE FUNCTION public.abn_guard_listing_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.abn_can_review_businesses() THEN
    RAISE EXCEPTION 'Only an authorized ABN reviewer may change listing status.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.abn_guard_listing_status() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS abn_guard_listing_status_trigger ON public.abn_listings;
CREATE TRIGGER abn_guard_listing_status_trigger
BEFORE UPDATE OF status ON public.abn_listings
FOR EACH ROW EXECUTE FUNCTION public.abn_guard_listing_status();
GRANT UPDATE (status) ON TABLE public.abn_listings TO authenticated;
