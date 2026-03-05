// Shared CORS utilities for Edge Functions
// Provides origin validation to restrict requests to known domains

// Allowed origins - add production domains here
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://www.lovable.dev',
];

// Development origins (automatically allowed in non-production)
const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

/**
 * Get CORS headers with origin validation
 * Returns headers that allow the request origin if it's in the allowed list
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
  
  // Build list of allowed origins based on environment
  const allowedOrigins = isProduction 
    ? ALLOWED_ORIGINS 
    : [...ALLOWED_ORIGINS, ...DEV_ORIGINS];
  
  // Also allow Lovable preview URLs (*.lovableproject.com)
  const isLovablePreview = origin.endsWith('.lovableproject.com') || 
                           origin.endsWith('.lovable.app');
  
  // Determine if origin should be allowed
  const isAllowed = allowedOrigins.includes(origin) || isLovablePreview;
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    // Include any custom headers used by our strict API contract layer
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-version',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflightRequest(req: Request): Response {
  return new Response(null, { 
    status: 204,
    headers: getCorsHeaders(req) 
  });
}
