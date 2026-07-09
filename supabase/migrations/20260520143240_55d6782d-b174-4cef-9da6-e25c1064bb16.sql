CREATE OR REPLACE FUNCTION public.increment_batch_duplicate(batch_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN UPDATE public.upload_batches SET duplicate_count = duplicate_count + 1 WHERE id = batch_uuid; END
$function$;