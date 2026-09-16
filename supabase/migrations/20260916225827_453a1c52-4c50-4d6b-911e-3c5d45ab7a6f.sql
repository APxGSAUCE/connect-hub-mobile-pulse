REVOKE EXECUTE ON FUNCTION public.request_access_approval(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.review_access_request(uuid, boolean, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.request_access_approval(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_access_request(uuid, boolean, text) TO authenticated;