/**
 * Observability & Logging Module for Edge Functions
 * Provides structured logging with request tracking, latency measurement, and error flagging
 * 
 * Features:
 * - Unique request IDs for tracing
 * - Structured JSON logging
 * - Latency metrics (retrieval, LLM, validation)
 * - AI response logging (without PII)
 * - Failure reason tracking
 * - Hallucination detection
 */

export interface RequestContext {
  requestId: string;
  functionName: string;
  userId?: string;
  startTime: number;
}

export interface LogEntry {
  requestId: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  function: string;
  message: string;
  userId?: string;
  latency?: number;
  metadata?: Record<string, unknown>;
}

export interface LatencyMetrics {
  total: number;
  retrieval: number[];
  llm: number[];
  validation: number[];
}

export interface AIResponseMetrics {
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  success: boolean;
  errorType?: string;
}

export interface FailureRecord {
  timestamp: string;
  category: FailureCategory;
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export type FailureCategory = 
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'rate_limit'
  | 'ai_service'
  | 'database'
  | 'network'
  | 'internal';

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create a new request context for tracking
 */
export function createRequestContext(functionName: string, userId?: string): RequestContext {
  return {
    requestId: generateRequestId(),
    functionName,
    userId,
    startTime: performance.now(),
  };
}

/**
 * Scrub PII from objects before logging
 */
function scrubPII(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(scrubPII);
  
  const piiFields = [
    'email', 'phone', 'address', 'ssn', 'password', 'token',
    'name', 'full_name', 'firstName', 'lastName', 'student_name',
    'ip_address', 'user_agent', 'creditCard', 'dob', 'dateOfBirth'
  ];
  
  const scrubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (piiFields.some(pii => lowerKey.includes(pii.toLowerCase()))) {
      scrubbed[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      scrubbed[key] = scrubPII(value);
    } else {
      scrubbed[key] = value;
    }
  }
  return scrubbed;
}

/**
 * Logger class for structured logging with latency tracking
 */
export class ObservabilityLogger {
  private context: RequestContext;
  private latencyMetrics: LatencyMetrics;
  private validationFailures: Array<{ field: string; error: string; timestamp: string }>;
  private hallucinationFlags: Array<{ type: string; details: string; timestamp: string }>;
  private failures: FailureRecord[];
  private aiMetrics: AIResponseMetrics[];

  constructor(context: RequestContext) {
    this.context = context;
    this.latencyMetrics = {
      total: 0,
      retrieval: [],
      llm: [],
      validation: [],
    };
    this.validationFailures = [];
    this.hallucinationFlags = [];
    this.failures = [];
    this.aiMetrics = [];
  }

  private formatLog(level: LogEntry['level'], message: string, metadata?: Record<string, unknown>): LogEntry {
    return {
      requestId: this.context.requestId,
      timestamp: new Date().toISOString(),
      level,
      function: this.context.functionName,
      message,
      userId: this.context.userId,
      latency: performance.now() - this.context.startTime,
      metadata,
    };
  }

  private output(entry: LogEntry): void {
    const prefix = `[${entry.level.toUpperCase()}] [${entry.requestId}] [${entry.function}]`;
    const latencyStr = entry.latency !== undefined ? ` (${entry.latency.toFixed(2)}ms)` : '';
    const metadataStr = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';
    
    switch (entry.level) {
      case 'error':
        console.error(`${prefix}${latencyStr} ${entry.message}${metadataStr}`);
        break;
      case 'warn':
        console.warn(`${prefix}${latencyStr} ${entry.message}${metadataStr}`);
        break;
      case 'debug':
        console.debug(`${prefix}${latencyStr} ${entry.message}${metadataStr}`);
        break;
      default:
        console.log(`${prefix}${latencyStr} ${entry.message}${metadataStr}`);
    }
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.output(this.formatLog('debug', message, metadata));
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.output(this.formatLog('info', message, metadata));
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.output(this.formatLog('warn', message, metadata));
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.output(this.formatLog('error', message, metadata));
  }

  /**
   * Measure and log retrieval (database query) latency
   */
  async measureRetrieval<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.latencyMetrics.retrieval.push(duration);
      this.info(`Retrieval: ${operation}`, { 
        latencyMs: duration.toFixed(2),
        type: 'retrieval'
      });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.latencyMetrics.retrieval.push(duration);
      this.error(`Retrieval failed: ${operation}`, { 
        latencyMs: duration.toFixed(2),
        type: 'retrieval',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Measure and log LLM call latency with response metadata
   */
  async measureLLM<T>(
    model: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.latencyMetrics.llm.push(duration);
      
      // Record AI metrics
      this.aiMetrics.push({
        model,
        latencyMs: duration,
        success: true
      });
      
      this.info(`LLM call: ${model}`, { 
        latencyMs: duration.toFixed(2),
        type: 'llm',
        model
      });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.latencyMetrics.llm.push(duration);
      
      // Record failed AI metrics
      this.aiMetrics.push({
        model,
        latencyMs: duration,
        success: false,
        errorType: error instanceof Error ? error.name : 'Unknown'
      });
      
      this.error(`LLM call failed: ${model}`, { 
        latencyMs: duration.toFixed(2),
        type: 'llm',
        model,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Log AI response metadata without PII
   * Call this after receiving an AI response to track token usage
   */
  logAIResponse(
    model: string,
    response: { 
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      choices?: Array<{ finish_reason?: string }>;
    },
    latencyMs: number
  ): void {
    const metrics: AIResponseMetrics = {
      model,
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
      totalTokens: response.usage?.total_tokens,
      latencyMs,
      success: true
    };
    
    this.aiMetrics.push(metrics);
    
    this.info('AI response received', {
      type: 'ai_response',
      model,
      promptTokens: metrics.promptTokens,
      completionTokens: metrics.completionTokens,
      totalTokens: metrics.totalTokens,
      latencyMs: latencyMs.toFixed(2),
      finishReason: response.choices?.[0]?.finish_reason || 'unknown'
    });
  }

  /**
   * Track a failure with category and context
   */
  trackFailure(
    category: FailureCategory,
    code: string,
    message: string,
    context?: Record<string, unknown>
  ): void {
    const failure: FailureRecord = {
      timestamp: new Date().toISOString(),
      category,
      code,
      message,
      context: context ? scrubPII(context) as Record<string, unknown> : undefined
    };
    
    this.failures.push(failure);
    
    this.error(`Failure [${category}]: ${code}`, {
      type: 'failure',
      category,
      code,
      message,
      ...(failure.context || {})
    });
  }

  /**
   * Log request details (sanitized, no PII)
   */
  logRequest(method: string, path: string, bodyPreview?: Record<string, unknown>): void {
    this.info('Request received', {
      type: 'request',
      method,
      path,
      bodyKeys: bodyPreview ? Object.keys(bodyPreview) : undefined,
      // Only log structure, not values
      bodyPreview: bodyPreview ? scrubPII(bodyPreview) : undefined
    });
  }

  /**
   * Log response details (sanitized)
   */
  logResponse(statusCode: number, success: boolean, responsePreview?: Record<string, unknown>): void {
    const level = success ? 'info' : 'error';
    this[level]('Response sent', {
      type: 'response',
      statusCode,
      success,
      responseKeys: responsePreview ? Object.keys(responsePreview) : undefined
    });
  }

  /**
   * Measure and log validation latency
   */
  async measureValidation<T>(
    validationType: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.latencyMetrics.validation.push(duration);
      this.debug(`Validation: ${validationType}`, { 
        latencyMs: duration.toFixed(2),
        type: 'validation'
      });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.latencyMetrics.validation.push(duration);
      this.error(`Validation failed: ${validationType}`, { 
        latencyMs: duration.toFixed(2),
        type: 'validation',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Log a validation failure
   */
  logValidationFailure(field: string, error: string, severity: 'warn' | 'error' = 'warn'): void {
    const failure = {
      field,
      error,
      timestamp: new Date().toISOString(),
    };
    this.validationFailures.push(failure);
    
    if (severity === 'error') {
      this.error(`Validation failure: ${field}`, { field, error, type: 'validation_failure' });
    } else {
      this.warn(`Validation failure: ${field}`, { field, error, type: 'validation_failure' });
    }
  }

  /**
   * Flag potential hallucination in AI response
   */
  flagHallucination(type: string, details: string): void {
    const flag = {
      type,
      details,
      timestamp: new Date().toISOString(),
    };
    this.hallucinationFlags.push(flag);
    this.warn(`Hallucination flag: ${type}`, { 
      type: 'hallucination',
      hallucinationType: type,
      details
    });
  }

  /**
   * Check for common hallucination patterns in AI responses
   */
  checkForHallucinations(response: unknown): void {
    if (typeof response !== 'object' || response === null) {
      this.flagHallucination('invalid_response_type', 'Response is not an object');
      return;
    }

    const obj = response as Record<string, unknown>;

    // Check for impossible percentages
    const checkPercentage = (value: unknown, field: string) => {
      if (typeof value === 'number' && (value < 0 || value > 100)) {
        this.flagHallucination('impossible_percentage', `${field}: ${value}`);
      }
    };

    // Check for empty required arrays
    const checkRequiredArray = (value: unknown, field: string) => {
      if (Array.isArray(value) && value.length === 0) {
        this.flagHallucination('empty_required_array', `${field} is empty`);
      }
    };

    // Check for placeholder text patterns
    const checkPlaceholderText = (value: unknown, field: string) => {
      if (typeof value === 'string') {
        const placeholderPatterns = [
          /\[.*\]/,           // [placeholder]
          /<.*>/,             // <placeholder>
          /TODO/i,            // TODO
          /FIXME/i,           // FIXME
          /example/i,         // example text
          /lorem ipsum/i,     // lorem ipsum
        ];
        for (const pattern of placeholderPatterns) {
          if (pattern.test(value)) {
            this.flagHallucination('placeholder_text', `${field}: "${value.substring(0, 50)}..."`);
            break;
          }
        }
      }
    };

    // Recursively check object
    const checkObject = (o: Record<string, unknown>, prefix = '') => {
      for (const [key, value] of Object.entries(o)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (key.includes('percentage') || key.includes('score') || key.includes('alignment')) {
          checkPercentage(value, fullKey);
        }
        
        if (key.includes('gaps') || key.includes('recommendations') || key.includes('subjects')) {
          checkRequiredArray(value, fullKey);
        }
        
        checkPlaceholderText(value, fullKey);
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          checkObject(value as Record<string, unknown>, fullKey);
        }
      }
    };

    checkObject(obj);
  }

  /**
   * Get the request ID
   */
  getRequestId(): string {
    return this.context.requestId;
  }

  /**
   * Get summary of all metrics
   */
  getSummary(): {
    requestId: string;
    functionName: string;
    userId?: string;
    totalLatencyMs: number;
    retrievalLatencyMs: number;
    llmLatencyMs: number;
    validationLatencyMs: number;
    validationFailures: number;
    hallucinationFlags: number;
    failureCount: number;
    failureCategories: string[];
    aiCalls: number;
    aiTokensUsed: number;
  } {
    const totalLatency = performance.now() - this.context.startTime;
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    
    const failureCategories = [...new Set(this.failures.map(f => f.category))];
    const aiTokensUsed = this.aiMetrics.reduce((acc, m) => acc + (m.totalTokens || 0), 0);

    return {
      requestId: this.context.requestId,
      functionName: this.context.functionName,
      userId: this.context.userId,
      totalLatencyMs: totalLatency,
      retrievalLatencyMs: sum(this.latencyMetrics.retrieval),
      llmLatencyMs: sum(this.latencyMetrics.llm),
      validationLatencyMs: sum(this.latencyMetrics.validation),
      validationFailures: this.validationFailures.length,
      hallucinationFlags: this.hallucinationFlags.length,
      failureCount: this.failures.length,
      failureCategories,
      aiCalls: this.aiMetrics.length,
      aiTokensUsed,
    };
  }

  /**
   * Get all failures recorded during this request
   */
  getFailures(): FailureRecord[] {
    return [...this.failures];
  }

  /**
   * Get AI metrics for this request
   */
  getAIMetrics(): AIResponseMetrics[] {
    return [...this.aiMetrics];
  }

  /**
   * Log final summary when request completes
   */
  logSummary(success: boolean): void {
    const summary = this.getSummary();
    const level = success ? 'info' : 'error';
    
    // Log failures if any
    if (!success && this.failures.length > 0) {
      this.error('Request failures summary', {
        type: 'failures_summary',
        failures: this.failures.map(f => ({
          category: f.category,
          code: f.code,
          message: f.message
        }))
      });
    }
    
    this[level](`Request ${success ? 'completed' : 'failed'}`, {
      type: 'summary',
      success,
      ...summary,
    });
  }
}

/**
 * Create a logger for an edge function
 */
export function createLogger(functionName: string, userId?: string): ObservabilityLogger {
  const context = createRequestContext(functionName, userId);
  return new ObservabilityLogger(context);
}
