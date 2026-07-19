// Security utilities for Edge Functions
// Provides rate limiting, input sanitization, and access control

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// =============================================================================
// RATE LIMITING
// =============================================================================

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyPrefix: string;     // Prefix for rate limit keys
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

// Default rate limit configurations per endpoint type
export const RateLimitConfigs = {
  // AI endpoints - more restrictive due to cost
  ai: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 10,          // 10 requests per minute
    keyPrefix: 'rl:ai'
  },
  // Standard API endpoints
  standard: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 60,          // 60 requests per minute
    keyPrefix: 'rl:std'
  },
  // Auth endpoints - very restrictive to prevent brute force
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,           // 5 attempts per 15 min
    keyPrefix: 'rl:auth'
  },
  // Read-only endpoints - more permissive
  readonly: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 100,         // 100 requests per minute
    keyPrefix: 'rl:read'
  }
} as const;

// In-memory rate limit store (per function instance)
// Note: This resets when the function cold starts, so it's a soft limit
// For production, consider using Redis or a database table
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit for a given key
 * Uses in-memory store with sliding window
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RateLimitConfigs.standard
): RateLimitResult {
  const key = `${config.keyPrefix}:${identifier}`;
  const now = Date.now();
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  
  // Reset if window has passed
  if (!entry || now >= entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs
    };
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);
  
  // Check if over limit
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const allowed = entry.count <= config.maxRequests;
  
  const result: RateLimitResult = {
    allowed,
    remaining,
    resetAt: entry.resetAt
  };
  
  if (!allowed) {
    result.retryAfter = Math.ceil((entry.resetAt - now) / 1000);
  }
  
  return result;
}

/**
 * Get rate limit identifier from request
 * Uses user ID if authenticated, otherwise IP address
 */
export function getRateLimitIdentifier(req: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  
  // Try to get client IP from various headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0]?.trim() || 'unknown';
  return `ip:${ip}`;
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// =============================================================================
// INPUT SANITIZATION
// =============================================================================

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export function sanitizeString(input: unknown, maxLength = 1000): string {
  if (typeof input !== 'string') return '';
  
  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters (except newlines and tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Escape HTML entities
    .replace(/[<>&"']/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return entities[char] || char;
    })
    // Trim whitespace
    .trim()
    // Limit length
    .slice(0, maxLength);
}

/**
 * Sanitize string for SQL (prevent injection)
 * Note: Always use parameterized queries, this is a defense-in-depth measure
 */
export function sanitizeForSQL(input: unknown): string {
  if (typeof input !== 'string') return '';
  
  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Escape single quotes (double them)
    .replace(/'/g, "''")
    // Remove SQL comment sequences
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    // Remove semicolons that could terminate statements
    .replace(/;/g, '')
    .trim();
}

/**
 * Sanitize string for use in AI prompts (prevent prompt injection)
 */
export function sanitizeForPrompt(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return '';
  
  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    // Remove potential prompt injection patterns
    .replace(/ignore\s+(all\s+)?previous/gi, '')
    .replace(/disregard\s+(all\s+)?instructions/gi, '')
    .replace(/forget\s+(everything|all)/gi, '')
    .replace(/you\s+are\s+now/gi, '')
    .replace(/new\s+instructions?:/gi, '')
    .replace(/system\s*:/gi, '')
    .replace(/assistant\s*:/gi, '')
    .replace(/user\s*:/gi, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize array of strings
 */
export function sanitizeArray(
  input: unknown,
  maxItems = 50,
  maxItemLength = 100
): string[] {
  if (!Array.isArray(input)) return [];
  
  return input
    .slice(0, maxItems)
    .filter((item): item is string => typeof item === 'string')
    .map(item => sanitizeString(item, maxItemLength));
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(
  input: unknown,
  min?: number,
  max?: number,
  defaultValue = 0
): number {
  const num = typeof input === 'number' ? input : parseFloat(String(input));
  
  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }
  
  let result = num;
  if (min !== undefined) result = Math.max(min, result);
  if (max !== undefined) result = Math.min(max, result);
  
  return result;
}

/**
 * Validate and sanitize UUID
 */
export function sanitizeUUID(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const trimmed = input.trim().toLowerCase();
  
  return uuidRegex.test(trimmed) ? trimmed : null;
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = input.trim().toLowerCase().slice(0, 255);
  
  return emailRegex.test(trimmed) ? trimmed : null;
}

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

/**
 * Validate request headers for security
 */
export function validateSecurityHeaders(req: Request): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for content-type on POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      issues.push('Missing or invalid Content-Type header');
    }
  }
  
  // Warn about missing security headers (informational)
  // These would be set by the client, not required but good practice
  
  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Extract and validate bearer token from request
 */
export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.slice(7).trim();
  
  // Basic JWT format validation (three base64 parts separated by dots)
  const jwtRegex = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  
  if (!jwtRegex.test(token)) {
    return null;
  }
  
  return token;
}

// =============================================================================
// ACCESS CONTROL HELPERS
// =============================================================================

/**
 * Check if user has required role
 */
export async function checkUserRole(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  requiredRole: 'admin' | 'moderator' | 'student' | 'parent'
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('has_role', { _user_id: userId, _role: requiredRole });
  
  if (error) {
    console.error('Error checking user role:', error);
    return false;
  }
  
  return data === true;
}

/**
 * Verify user owns or has access to a resource
 */
export async function verifyResourceAccess(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tableName: string,
  resourceId: string,
  ownerColumn = 'user_id'
): Promise<boolean> {
  const { data, error } = await supabase
    .from(tableName)
    .select(ownerColumn)
    .eq('id', resourceId)
    .single();
  
  if (error || !data) {
    return false;
  }
  
  const record = data as unknown as Record<string, unknown>;
  return record[ownerColumn] === userId;
}
