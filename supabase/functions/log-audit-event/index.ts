import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import {
  validateApiVersion,
  validateContentType,
  validateRequestSize,
  validateSchema,
  createErrorResponse,
  createSuccessResponse,
  ErrorCodes,
  Schemas,
  RequestLimits,
  API_VERSION,
} from "../_shared/apiContracts.ts";

interface AuditLogData {
  action: string;
  table_name: string;
  record_id?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  // ==========================================================================
  // STRICT API CONTRACT VALIDATION
  // ==========================================================================

  // 1. Validate API version
  const versionCheck = validateApiVersion(req);
  if (!versionCheck.valid) {
    return createErrorResponse(
      ErrorCodes.INVALID_API_VERSION,
      versionCheck.error!,
      400,
      corsHeaders
    );
  }
  const apiVersion = versionCheck.version;

  // 2. Validate Content-Type
  const contentTypeCheck = validateContentType(req);
  if (!contentTypeCheck.valid) {
    return createErrorResponse(
      ErrorCodes.INVALID_PAYLOAD,
      contentTypeCheck.error!,
      400,
      corsHeaders,
      apiVersion
    );
  }

  // 3. Validate request size
  const sizeCheck = await validateRequestSize(req);
  if (!sizeCheck.valid) {
    return createErrorResponse(
      ErrorCodes.INVALID_PAYLOAD,
      sizeCheck.error!,
      413,
      corsHeaders,
      apiVersion
    );
  }

  try {
    // 4. SECURITY: Verify authentication FIRST
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        'Missing or invalid authorization header',
        401,
        corsHeaders,
        apiVersion
      );
    }

    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser(token);
    if (userError) console.error('Auth getUser error:', userError);
    if (userError || !user) {
      return createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        'Invalid or expired authentication token',
        401,
        corsHeaders,
        apiVersion
      );
    }

    // 5. Parse and validate request body with strict schema
    let rawData: unknown;
    try {
      rawData = await req.json();
    } catch {
      return createErrorResponse(
        ErrorCodes.INVALID_PAYLOAD,
        'Request body must be valid JSON',
        400,
        corsHeaders,
        apiVersion
      );
    }

    // 6. HARD REJECTION: Validate against strict schema
    const validation = validateSchema<AuditLogData>(rawData, Schemas.auditLogRequest);
    
    if (!validation.valid) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_FAILED,
        'Request validation failed',
        400,
        corsHeaders,
        apiVersion,
        validation.errors
      );
    }

    const auditData = validation.data!;

    // 7. Additional JSON size validation for nested objects
    const oldDataStr = auditData.old_data ? JSON.stringify(auditData.old_data) : '';
    const newDataStr = auditData.new_data ? JSON.stringify(auditData.new_data) : '';
    
    if (oldDataStr.length > RequestLimits.MAX_STRING_LENGTH || 
        newDataStr.length > RequestLimits.MAX_STRING_LENGTH) {
      return createErrorResponse(
        ErrorCodes.INVALID_PAYLOAD,
        'Data payload exceeds maximum allowed size',
        400,
        corsHeaders,
        apiVersion
      );
    }

    // Create admin client for inserting audit logs (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract metadata
    const ipAddress = 
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      req.headers.get('cf-connecting-ip') ||
      'unknown';

    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Insert audit log
    const { error: insertError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: auditData.action,
        table_name: auditData.table_name,
        record_id: auditData.record_id || null,
        old_data: auditData.old_data || null,
        new_data: auditData.new_data || null,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (insertError) {
      console.error('Error inserting audit log:', insertError);
      return createErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Unable to process request',
        500,
        corsHeaders,
        apiVersion
      );
    }

    return createSuccessResponse(
      { message: 'Audit event logged successfully' },
      corsHeaders,
      apiVersion
    );

  } catch (error) {
    console.error('Error in log-audit-event function:', error);
    return createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Unable to process request',
      500,
      corsHeaders,
      API_VERSION
    );
  }
});
