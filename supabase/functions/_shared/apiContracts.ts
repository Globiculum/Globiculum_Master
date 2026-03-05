// Strict API Contracts for Edge Functions
// Provides versioned APIs, JSON schema validation, and hard rejection of invalid payloads

// =============================================================================
// API VERSION MANAGEMENT
// =============================================================================

export const API_VERSION = 'v1';
export const SUPPORTED_VERSIONS = ['v1'];
export const MIN_SUPPORTED_VERSION = 'v1';

export interface ApiVersionInfo {
  version: string;
  deprecated: boolean;
  sunsetDate?: string;
}

/**
 * Validate API version from request headers
 * Supports: X-API-Version header or Accept-Version header
 */
export function validateApiVersion(req: Request): { valid: boolean; version: string; error?: string } {
  const requestedVersion = 
    req.headers.get('X-API-Version') || 
    req.headers.get('Accept-Version') || 
    API_VERSION;
  
  if (!SUPPORTED_VERSIONS.includes(requestedVersion)) {
    return {
      valid: false,
      version: requestedVersion,
      error: `Unsupported API version: ${requestedVersion}. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`
    };
  }
  
  return { valid: true, version: requestedVersion };
}

/**
 * Get API version headers to include in responses
 */
export function getApiVersionHeaders(version: string): Record<string, string> {
  return {
    'X-API-Version': version,
    'X-API-Min-Version': MIN_SUPPORTED_VERSION,
  };
}

// =============================================================================
// SCHEMA VALIDATION TYPES
// =============================================================================

export type SchemaType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'array' 
  | 'object' 
  | 'null'
  | 'email'
  | 'uuid'
  | 'date'
  | 'enum';

export interface SchemaField {
  type: SchemaType | SchemaType[];
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: readonly string[];
  items?: SchemaField;
  properties?: Record<string, SchemaField>;
  sanitize?: boolean;
  default?: unknown;
}

export interface Schema {
  type: 'object';
  properties: Record<string, SchemaField>;
  additionalProperties?: boolean;
  strict?: boolean; // If true, reject unknown properties
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  received?: unknown;
  expected?: string;
}

export interface ValidationResult<T> {
  valid: boolean;
  data: T | null;
  errors: ValidationError[];
}

// =============================================================================
// SANITIZATION UTILITIES
// =============================================================================

const MAX_DEFAULT_STRING_LENGTH = 1000;
const MAX_DEFAULT_ARRAY_LENGTH = 100;

/**
 * Remove control characters and normalize whitespace
 */
export function sanitizeString(input: unknown, maxLength: number = MAX_DEFAULT_STRING_LENGTH): string {
  if (typeof input !== 'string') return '';
  // Remove control characters, trim, limit length
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars except tab, LF, CR
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize array of strings
 */
export function sanitizeArray(
  input: unknown, 
  maxItems: number = MAX_DEFAULT_ARRAY_LENGTH,
  maxItemLength: number = MAX_DEFAULT_STRING_LENGTH
): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, maxItems)
    .filter((item): item is string => typeof item === 'string')
    .map(item => sanitizeString(item, maxItemLength));
}

// =============================================================================
// SCHEMA VALIDATORS
// =============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;

function validateField(
  value: unknown, 
  field: SchemaField, 
  fieldPath: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Handle null/undefined
  if (value === null || value === undefined) {
    if (field.required) {
      errors.push({
        field: fieldPath,
        code: 'REQUIRED_FIELD',
        message: `Field '${fieldPath}' is required`,
        received: value,
        expected: String(field.type)
      });
    }
    return errors;
  }
  
  // Type validation
  const types = Array.isArray(field.type) ? field.type : [field.type];
  let typeValid = false;
  
  for (const type of types) {
    switch (type) {
      case 'string':
        typeValid = typeof value === 'string';
        break;
      case 'number':
        typeValid = typeof value === 'number' && !isNaN(value);
        break;
      case 'boolean':
        typeValid = typeof value === 'boolean';
        break;
      case 'array':
        typeValid = Array.isArray(value);
        break;
      case 'object':
        typeValid = typeof value === 'object' && value !== null && !Array.isArray(value);
        break;
      case 'null':
        typeValid = value === null;
        break;
      case 'email':
        typeValid = typeof value === 'string' && EMAIL_REGEX.test(value);
        break;
      case 'uuid':
        typeValid = typeof value === 'string' && UUID_REGEX.test(value);
        break;
      case 'date':
        typeValid = typeof value === 'string' && ISO_DATE_REGEX.test(value);
        break;
      case 'enum':
        typeValid = field.enum?.includes(value as string) ?? false;
        break;
    }
    if (typeValid) break;
  }
  
  if (!typeValid) {
    errors.push({
      field: fieldPath,
      code: 'INVALID_TYPE',
      message: `Field '${fieldPath}' must be of type ${types.join(' | ')}`,
      received: typeof value,
      expected: types.join(' | ')
    });
    return errors; // Stop further validation for this field
  }
  
  // String-specific validations
  if (typeof value === 'string') {
    if (field.minLength !== undefined && value.length < field.minLength) {
      errors.push({
        field: fieldPath,
        code: 'MIN_LENGTH',
        message: `Field '${fieldPath}' must be at least ${field.minLength} characters`,
        received: value.length,
        expected: `>= ${field.minLength}`
      });
    }
    if (field.maxLength !== undefined && value.length > field.maxLength) {
      errors.push({
        field: fieldPath,
        code: 'MAX_LENGTH',
        message: `Field '${fieldPath}' must be at most ${field.maxLength} characters`,
        received: value.length,
        expected: `<= ${field.maxLength}`
      });
    }
    if (field.pattern && !field.pattern.test(value)) {
      errors.push({
        field: fieldPath,
        code: 'PATTERN_MISMATCH',
        message: `Field '${fieldPath}' does not match required pattern`,
        received: value,
        expected: field.pattern.toString()
      });
    }
  }
  
  // Number-specific validations
  if (typeof value === 'number') {
    if (field.min !== undefined && value < field.min) {
      errors.push({
        field: fieldPath,
        code: 'MIN_VALUE',
        message: `Field '${fieldPath}' must be at least ${field.min}`,
        received: value,
        expected: `>= ${field.min}`
      });
    }
    if (field.max !== undefined && value > field.max) {
      errors.push({
        field: fieldPath,
        code: 'MAX_VALUE',
        message: `Field '${fieldPath}' must be at most ${field.max}`,
        received: value,
        expected: `<= ${field.max}`
      });
    }
  }
  
  // Array-specific validations
  if (Array.isArray(value) && field.items) {
    value.forEach((item, index) => {
      errors.push(...validateField(item, field.items!, `${fieldPath}[${index}]`));
    });
  }
  
  // Object-specific validations
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && field.properties) {
    const objValue = value as Record<string, unknown>;
    for (const [key, propSchema] of Object.entries(field.properties)) {
      errors.push(...validateField(objValue[key], propSchema, `${fieldPath}.${key}`));
    }
  }
  
  return errors;
}

/**
 * Validate data against a schema
 * Returns sanitized data if validation passes
 */
export function validateSchema<T>(data: unknown, schema: Schema): ValidationResult<T> {
  const errors: ValidationError[] = [];
  
  // Must be an object
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      data: null,
      errors: [{
        field: 'root',
        code: 'INVALID_PAYLOAD',
        message: 'Request body must be a JSON object',
        received: typeof data,
        expected: 'object'
      }]
    };
  }
  
  const rawData = data as Record<string, unknown>;
  const sanitizedData: Record<string, unknown> = {};
  
  // Check for unknown properties in strict mode
  if (schema.strict) {
    const knownKeys = new Set(Object.keys(schema.properties));
    for (const key of Object.keys(rawData)) {
      if (!knownKeys.has(key)) {
        errors.push({
          field: key,
          code: 'UNKNOWN_FIELD',
          message: `Unknown field '${key}' not allowed`,
          received: key,
          expected: `One of: ${[...knownKeys].join(', ')}`
        });
      }
    }
  }
  
  // Validate each property
  for (const [key, fieldSchema] of Object.entries(schema.properties)) {
    const value = rawData[key];
    const fieldErrors = validateField(value, fieldSchema, key);
    errors.push(...fieldErrors);
    
    // Sanitize and include in output if valid
    if (fieldErrors.length === 0) {
      if (value !== undefined && value !== null) {
        if (fieldSchema.sanitize && typeof value === 'string') {
          sanitizedData[key] = sanitizeString(value, fieldSchema.maxLength);
        } else if (fieldSchema.sanitize && Array.isArray(value)) {
          sanitizedData[key] = sanitizeArray(value);
        } else {
          sanitizedData[key] = value;
        }
      } else if (fieldSchema.default !== undefined) {
        sanitizedData[key] = fieldSchema.default;
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? (sanitizedData as T) : null,
    errors
  };
}

// =============================================================================
// STANDARDIZED ERROR RESPONSES WITH UX SUPPORT
// =============================================================================

/**
 * UX-friendly error response structure
 * Designed to help frontends display helpful messages and handle retries
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    user_message: string;  // Human-readable message for display to users
    details?: ValidationError[];
    requestId?: string;
  };
  meta: {
    apiVersion: string;
    timestamp: string;
  };
  // Retry guidance for transient errors
  retry?: {
    retryable: boolean;
    retry_after?: number;  // Seconds to wait before retry
    max_retries?: number;  // Suggested max retry attempts
  };
  // Suggested actions for frontend
  actions?: {
    type: 'retry' | 'refresh_auth' | 'contact_support' | 'upgrade_plan' | 'check_input';
    label: string;
    url?: string;
  }[];
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta: {
    apiVersion: string;
    timestamp: string;
  };
}

/**
 * UX-friendly error messages for each error code
 */
export const ErrorMessages: Record<string, { message: string; userMessage: string; retryable: boolean; retryAfter?: number; action?: string }> = {
  // AI/Processing errors
  AI_TIMEOUT: {
    message: 'AI analysis took longer than expected',
    userMessage: 'The analysis is taking longer than usual. Please try again in a moment.',
    retryable: true,
    retryAfter: 30,
    action: 'retry'
  },
  AI_OVERLOADED: {
    message: 'AI service is experiencing high demand',
    userMessage: 'Our analysis service is busy right now. Please wait a moment and try again.',
    retryable: true,
    retryAfter: 60,
    action: 'retry'
  },
  AI_RESPONSE_INVALID: {
    message: 'AI response could not be processed',
    userMessage: 'Something went wrong with the analysis. Please try again.',
    retryable: true,
    retryAfter: 5,
    action: 'retry'
  },
  
  // Authentication errors
  UNAUTHORIZED: {
    message: 'Authentication required',
    userMessage: 'Please sign in to continue.',
    retryable: false,
    action: 'refresh_auth'
  },
  INVALID_TOKEN: {
    message: 'Invalid authentication token',
    userMessage: 'Your session has expired. Please sign in again.',
    retryable: false,
    action: 'refresh_auth'
  },
  TOKEN_EXPIRED: {
    message: 'Authentication token has expired',
    userMessage: 'Your session has expired. Please sign in again.',
    retryable: false,
    action: 'refresh_auth'
  },
  
  // Validation errors
  INVALID_PAYLOAD: {
    message: 'Invalid request data',
    userMessage: 'Some of the information provided is invalid. Please check and try again.',
    retryable: false,
    action: 'check_input'
  },
  VALIDATION_FAILED: {
    message: 'Request validation failed',
    userMessage: 'Please check the form for errors and try again.',
    retryable: false,
    action: 'check_input'
  },
  INVALID_API_VERSION: {
    message: 'Unsupported API version',
    userMessage: 'Please refresh the page to get the latest version.',
    retryable: false,
    action: 'retry'
  },
  MISSING_REQUIRED_FIELD: {
    message: 'Required field is missing',
    userMessage: 'Please fill in all required fields.',
    retryable: false,
    action: 'check_input'
  },
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: {
    message: 'Too many requests',
    userMessage: 'You\'ve made too many requests. Please wait a moment before trying again.',
    retryable: true,
    retryAfter: 60,
    action: 'retry'
  },
  
  // Payment/Credits
  CREDITS_DEPLETED: {
    message: 'AI credits depleted',
    userMessage: 'Your analysis credits have been used. Please upgrade your plan to continue.',
    retryable: false,
    action: 'upgrade_plan'
  },
  
  // Database errors
  DATABASE_ERROR: {
    message: 'Database operation failed',
    userMessage: 'We\'re having trouble saving your data. Please try again.',
    retryable: true,
    retryAfter: 5,
    action: 'retry'
  },
  DATABASE_TIMEOUT: {
    message: 'Database operation timed out',
    userMessage: 'The request took too long. Please try again.',
    retryable: true,
    retryAfter: 10,
    action: 'retry'
  },
  NOT_FOUND: {
    message: 'Resource not found',
    userMessage: 'The requested item could not be found.',
    retryable: false
  },
  
  // Server errors
  INTERNAL_ERROR: {
    message: 'Internal server error',
    userMessage: 'Something went wrong on our end. Please try again later.',
    retryable: true,
    retryAfter: 30,
    action: 'retry'
  },
  SERVICE_UNAVAILABLE: {
    message: 'Service temporarily unavailable',
    userMessage: 'Our service is temporarily unavailable. Please try again in a few minutes.',
    retryable: true,
    retryAfter: 60,
    action: 'retry'
  },
  CONFIGURATION_ERROR: {
    message: 'Service configuration error',
    userMessage: 'There\'s a configuration issue. Please contact support if this persists.',
    retryable: false,
    action: 'contact_support'
  },
  
  // Network errors
  NETWORK_ERROR: {
    message: 'Network communication failed',
    userMessage: 'Please check your internet connection and try again.',
    retryable: true,
    retryAfter: 5,
    action: 'retry'
  },
  UPSTREAM_ERROR: {
    message: 'Upstream service error',
    userMessage: 'An external service is having issues. Please try again later.',
    retryable: true,
    retryAfter: 30,
    action: 'retry'
  }
};

/**
 * Get suggested actions based on error code
 */
function getErrorActions(code: string): ApiErrorResponse['actions'] {
  const errorInfo = ErrorMessages[code];
  if (!errorInfo?.action) return undefined;
  
  const actions: ApiErrorResponse['actions'] = [];
  
  switch (errorInfo.action) {
    case 'retry':
      actions.push({ type: 'retry', label: 'Try Again' });
      break;
    case 'refresh_auth':
      actions.push({ type: 'refresh_auth', label: 'Sign In Again' });
      break;
    case 'contact_support':
      actions.push({ type: 'contact_support', label: 'Contact Support', url: '/support' });
      break;
    case 'upgrade_plan':
      actions.push({ type: 'upgrade_plan', label: 'Upgrade Plan', url: '/pricing' });
      break;
    case 'check_input':
      actions.push({ type: 'check_input', label: 'Check Form' });
      break;
  }
  
  return actions.length > 0 ? actions : undefined;
}

/**
 * Create standardized error response with UX support
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
  apiVersion: string = API_VERSION,
  details?: ValidationError[],
  requestId?: string
): Response {
  const errorInfo = ErrorMessages[code] || {
    message: message,
    userMessage: message,
    retryable: false
  };
  
  const body: ApiErrorResponse = {
    error: {
      code,
      message: errorInfo.message,
      user_message: errorInfo.userMessage,
      ...(details && details.length > 0 ? { details } : {}),
      ...(requestId ? { requestId } : {})
    },
    meta: {
      apiVersion,
      timestamp: new Date().toISOString()
    }
  };
  
  // Add retry information for retryable errors
  if (errorInfo.retryable) {
    body.retry = {
      retryable: true,
      retry_after: errorInfo.retryAfter || 30,
      max_retries: 3
    };
  }
  
  // Add suggested actions
  const actions = getErrorActions(code);
  if (actions) {
    body.actions = actions;
  }
  
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...getApiVersionHeaders(apiVersion),
      'Content-Type': 'application/json',
      // Add Retry-After header for rate limiting
      ...(errorInfo.retryable && errorInfo.retryAfter ? { 'Retry-After': String(errorInfo.retryAfter) } : {})
    }
  });
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  corsHeaders: Record<string, string>,
  apiVersion: string = API_VERSION,
  status: number = 200
): Response {
  const body: ApiSuccessResponse<T> = {
    data,
    meta: {
      apiVersion,
      timestamp: new Date().toISOString()
    }
  };
  
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...getApiVersionHeaders(apiVersion),
      'Content-Type': 'application/json'
    }
  });
}

// =============================================================================
// COMMON ERROR CODES
// =============================================================================

export const ErrorCodes = {
  // AI/Processing errors
  AI_TIMEOUT: 'AI_TIMEOUT',
  AI_OVERLOADED: 'AI_OVERLOADED',
  AI_RESPONSE_INVALID: 'AI_RESPONSE_INVALID',
  
  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation errors (400)
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_API_VERSION: 'INVALID_API_VERSION',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Payment required (402)
  CREDITS_DEPLETED: 'CREDITS_DEPLETED',
  
  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATABASE_TIMEOUT: 'DATABASE_TIMEOUT',
  NOT_FOUND: 'NOT_FOUND',
  
  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR'
} as const;

// =============================================================================
// REQUEST SIZE LIMITS
// =============================================================================

export const RequestLimits = {
  MAX_BODY_SIZE: 100 * 1024, // 100KB
  MAX_STRING_LENGTH: 10000,
  MAX_ARRAY_LENGTH: 100,
  MAX_JSON_DEPTH: 10
} as const;

/**
 * Validate request body size
 */
export async function validateRequestSize(req: Request): Promise<{ valid: boolean; error?: string }> {
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > RequestLimits.MAX_BODY_SIZE) {
    return { valid: false, error: 'Request body too large' };
  }
  return { valid: true };
}

// =============================================================================
// CONTENT-TYPE VALIDATION
// =============================================================================

/**
 * Validate that request has correct content type
 */
export function validateContentType(req: Request): { valid: boolean; error?: string } {
  if (req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'DELETE') {
    return { valid: true };
  }
  
  const contentType = req.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return { 
      valid: false, 
      error: 'Content-Type must be application/json' 
    };
  }
  
  return { valid: true };
}

// =============================================================================
// PREDEFINED SCHEMAS
// =============================================================================

export const Schemas = {
  // Audit log request schema
  auditLogRequest: {
    type: 'object' as const,
    strict: true,
    properties: {
      action: { 
        type: 'string' as const, 
        required: true, 
        minLength: 1, 
        maxLength: 100, 
        sanitize: true 
      },
      table_name: { 
        type: 'string' as const, 
        required: true, 
        minLength: 1, 
        maxLength: 100, 
        sanitize: true 
      },
      record_id: { 
        type: 'string' as const, 
        maxLength: 100, 
        sanitize: true 
      },
      old_data: { 
        type: 'object' as const 
      },
      new_data: { 
        type: 'object' as const 
      }
    }
  },

  // Student data validation request schema
  studentDataRequest: {
    type: 'object' as const,
    strict: false,
    properties: {
      schoolStage: {
        type: 'enum' as const,
        required: true,
        enum: ['elementary', 'middle', 'high'] as const
      },
      snapshotGrade: {
        type: 'number' as const,
        required: true,
        min: 1,
        max: 12
      },
      snapshotAge: {
        type: 'number' as const,
        min: 4,
        max: 25
      },
      currentCurriculum: {
        type: 'string' as const,
        required: true,
        minLength: 1,
        maxLength: 100,
        sanitize: true
      },
      timeline: {
        type: 'string' as const,
        maxLength: 50,
        sanitize: true
      },
      snapshotLocation: {
        type: 'string' as const,
        maxLength: 100,
        sanitize: true
      },
      usState: {
        type: 'string' as const,
        maxLength: 50,
        sanitize: true
      }
    }
  },

  // Curriculum analysis request schema
  curriculumAnalysisRequest: {
    type: 'object' as const,
    strict: false,
    properties: {
      formData: {
        type: 'object' as const,
        required: true,
        properties: {
          schoolStage: {
            type: 'string' as const,
            maxLength: 50,
            sanitize: true
          },
          snapshotGrade: {
            type: 'number' as const,
            min: 1,
            max: 12
          },
          snapshotLocation: {
            type: 'string' as const,
            maxLength: 100,
            sanitize: true
          },
          usState: {
            type: 'string' as const,
            maxLength: 50,
            sanitize: true
          },
          previousCountry: {
            type: 'string' as const,
            maxLength: 100,
            sanitize: true
          },
          currentCurriculum: {
            type: 'string' as const,
            maxLength: 100,
            sanitize: true
          },
          targetGoal: {
            type: 'string' as const,
            maxLength: 200,
            sanitize: true
          },
          academicPath: {
            type: 'array' as const,
            items: { type: 'string' as const, maxLength: 50 }
          },
          strongestSubjects: {
            type: 'array' as const,
            items: { type: 'string' as const, maxLength: 50 }
          },
          challengingAreas: {
            type: 'array' as const,
            items: { type: 'string' as const, maxLength: 50 }
          },
          languagesSpoken: {
            type: 'array' as const,
            items: { type: 'string' as const, maxLength: 50 }
          },
          transitionTimeline: {
            type: 'string' as const,
            maxLength: 50,
            sanitize: true
          }
        }
      }
    }
  }
};
