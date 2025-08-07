-- Fix the policy conflict and continue with security improvements
DROP POLICY IF EXISTS "Service role can manage audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;

-- Recreate policies with proper names
CREATE POLICY "audit_logs_service_role_access" ON public.security_audit_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "rate_limits_service_role_access" ON public.rate_limits
  FOR ALL USING (auth.role() = 'service_role');