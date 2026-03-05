/**
 * Background Jobs & Async Processing Module
 * Provides task queue patterns, timeouts, retries, and dead-letter queue for edge functions
 * 
 * Features:
 * - Promise-based task execution with timeouts
 * - Automatic retries with exponential backoff
 * - Dead-letter queue (DLQ) for failed jobs logging
 * - Job status tracking
 * - Non-blocking async processing using EdgeRuntime.waitUntil
 */

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface JobConfig {
  timeout: number;         // Max execution time in milliseconds
  maxRetries: number;      // Maximum retry attempts
  retryDelayMs: number;    // Initial delay between retries
  backoffMultiplier: number; // Exponential backoff multiplier
  jobType: string;         // Job type identifier
}

export interface JobResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
  totalDuration: number;
  jobId: string;
}

export interface DeadLetterEntry {
  jobId: string;
  jobType: string;
  timestamp: string;
  attempts: number;
  lastError: string;
  payload?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface JobStatus {
  jobId: string;
  jobType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'dlq';
  startTime: string;
  endTime?: string;
  attempts: number;
  lastError?: string;
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

export const JobConfigs = {
  aiAnalysis: {
    timeout: 120000,       // 2 minutes for AI calls
    maxRetries: 2,
    retryDelayMs: 2000,
    backoffMultiplier: 2,
    jobType: 'ai_analysis'
  } as JobConfig,
  
  databaseWrite: {
    timeout: 30000,        // 30 seconds for DB writes
    maxRetries: 3,
    retryDelayMs: 1000,
    backoffMultiplier: 1.5,
    jobType: 'database_write'
  } as JobConfig,
  
  externalApi: {
    timeout: 60000,        // 1 minute for external APIs
    maxRetries: 2,
    retryDelayMs: 3000,
    backoffMultiplier: 2,
    jobType: 'external_api'
  } as JobConfig,
  
  backgroundTask: {
    timeout: 300000,       // 5 minutes for background tasks
    maxRetries: 1,
    retryDelayMs: 5000,
    backoffMultiplier: 1,
    jobType: 'background_task'
  } as JobConfig,
  
  quickValidation: {
    timeout: 5000,         // 5 seconds for validations
    maxRetries: 0,
    retryDelayMs: 0,
    backoffMultiplier: 1,
    jobType: 'validation'
  } as JobConfig
};

// =============================================================================
// JOB ID GENERATION
// =============================================================================

export function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// =============================================================================
// TIMEOUT WRAPPER
// =============================================================================

/**
 * Execute a promise with a timeout
 * Throws TimeoutError if the operation exceeds the specified time
 */
export class TimeoutError extends Error {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string = 'Operation'
): Promise<T> {
  let timeoutId: number;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(`${operationName} timed out after ${timeoutMs}ms`, timeoutMs));
    }, timeoutMs);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

// =============================================================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// =============================================================================

export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  backoffMultiplier: number;
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
  shouldRetry?: (error: Error) => boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
};

/**
 * Execute a function with automatic retries and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<{ result: T; attempts: number }> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error = new Error('Unknown error');
  let currentDelay = opts.initialDelayMs;
  
  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      const result = await fn();
      return { result, attempts: attempt };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry this specific error
      if (opts.shouldRetry && !opts.shouldRetry(lastError)) {
        throw lastError;
      }
      
      // Don't retry if this was the last attempt
      if (attempt > opts.maxRetries) {
        break;
      }
      
      // Call onRetry callback if provided
      if (opts.onRetry) {
        opts.onRetry(attempt, lastError, currentDelay);
      }
      
      // Wait before retrying
      await sleep(currentDelay);
      currentDelay = Math.floor(currentDelay * opts.backoffMultiplier);
    }
  }
  
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// DEAD-LETTER QUEUE (DLQ)
// =============================================================================

// In-memory DLQ for edge functions (persists for function lifetime)
// In production, this should be persisted to database
const deadLetterQueue: DeadLetterEntry[] = [];
const MAX_DLQ_SIZE = 100; // Keep last 100 failed jobs in memory

/**
 * Add a failed job to the dead-letter queue
 */
export function addToDeadLetterQueue(entry: DeadLetterEntry): void {
  // Add to queue
  deadLetterQueue.push(entry);
  
  // Trim if exceeds max size
  if (deadLetterQueue.length > MAX_DLQ_SIZE) {
    deadLetterQueue.shift();
  }
  
  // Log the DLQ entry for persistence via logging infrastructure
  console.error(`[DLQ] Job failed permanently`, JSON.stringify({
    type: 'dead_letter',
    ...entry
  }));
}

/**
 * Get dead-letter queue entries (for debugging)
 */
export function getDeadLetterQueue(): DeadLetterEntry[] {
  return [...deadLetterQueue];
}

/**
 * Clear dead-letter queue (for testing)
 */
export function clearDeadLetterQueue(): void {
  deadLetterQueue.length = 0;
}

// =============================================================================
// JOB EXECUTOR
// =============================================================================

/**
 * Execute a job with timeout, retries, and DLQ handling
 */
export async function executeJob<T>(
  jobFn: () => Promise<T>,
  config: JobConfig,
  payload?: Record<string, unknown>,
  context?: Record<string, unknown>
): Promise<JobResult<T>> {
  const jobId = generateJobId();
  const startTime = performance.now();
  let attempts = 0;
  
  const jobStatus: JobStatus = {
    jobId,
    jobType: config.jobType,
    status: 'pending',
    startTime: new Date().toISOString(),
    attempts: 0
  };
  
  console.log(`[JOB] Starting job ${jobId} (type: ${config.jobType})`);
  
  try {
    jobStatus.status = 'running';
    
    // Execute with retry logic
    const { result, attempts: totalAttempts } = await withRetry(
      async () => {
        attempts++;
        console.log(`[JOB] ${jobId} attempt ${attempts}/${config.maxRetries + 1}`);
        
        // Execute with timeout
        return await withTimeout(
          jobFn(),
          config.timeout,
          `Job ${jobId}`
        );
      },
      {
        maxRetries: config.maxRetries,
        initialDelayMs: config.retryDelayMs,
        backoffMultiplier: config.backoffMultiplier,
        onRetry: (attempt, error, nextDelay) => {
          console.warn(`[JOB] ${jobId} retry ${attempt} after error: ${error.message}. Next retry in ${nextDelay}ms`);
        },
        shouldRetry: (error) => {
          // Don't retry validation errors or auth errors
          if (error.message.includes('validation') || error.message.includes('unauthorized')) {
            return false;
          }
          // Retry timeouts, network errors, and transient failures
          return error instanceof TimeoutError || 
                 error.message.includes('network') ||
                 error.message.includes('timeout') ||
                 error.message.includes('ECONNRESET') ||
                 error.message.includes('503') ||
                 error.message.includes('429');
        }
      }
    );
    
    const totalDuration = performance.now() - startTime;
    jobStatus.status = 'completed';
    jobStatus.endTime = new Date().toISOString();
    jobStatus.attempts = totalAttempts;
    
    console.log(`[JOB] ${jobId} completed successfully in ${totalDuration.toFixed(2)}ms after ${totalAttempts} attempt(s)`);
    
    return {
      success: true,
      data: result,
      attempts: totalAttempts,
      totalDuration,
      jobId
    };
    
  } catch (error) {
    const totalDuration = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Determine final status
    if (error instanceof TimeoutError) {
      jobStatus.status = 'timeout';
    } else {
      jobStatus.status = 'failed';
    }
    
    jobStatus.endTime = new Date().toISOString();
    jobStatus.attempts = attempts;
    jobStatus.lastError = errorMessage;
    
    console.error(`[JOB] ${jobId} failed after ${attempts} attempt(s): ${errorMessage}`);
    
    // Add to dead-letter queue
    addToDeadLetterQueue({
      jobId,
      jobType: config.jobType,
      timestamp: new Date().toISOString(),
      attempts,
      lastError: errorMessage,
      payload: payload ? scrubSensitiveData(payload) : undefined,
      context: context ? scrubSensitiveData(context) : undefined
    });
    
    jobStatus.status = 'dlq';
    
    return {
      success: false,
      error: errorMessage,
      attempts,
      totalDuration,
      jobId
    };
  }
}

// =============================================================================
// BACKGROUND TASK HELPER (using EdgeRuntime.waitUntil)
// =============================================================================

/**
 * Schedule a background task that runs after the response is sent
 * Uses EdgeRuntime.waitUntil for Supabase Edge Functions
 */
export function scheduleBackgroundTask<T>(
  taskFn: () => Promise<T>,
  config: Partial<JobConfig> = {},
  onComplete?: (result: JobResult<T>) => void
): string {
  const fullConfig: JobConfig = {
    ...JobConfigs.backgroundTask,
    ...config
  };
  
  const jobId = generateJobId();
  
  // Use EdgeRuntime.waitUntil if available (Supabase Edge Functions)
  const waitUntilFn = (globalThis as any).EdgeRuntime?.waitUntil;
  
  const taskPromise = executeJob(taskFn, fullConfig)
    .then((result) => {
      if (onComplete) {
        onComplete(result);
      }
      return result;
    })
    .catch((error) => {
      console.error(`[BACKGROUND] Task ${jobId} failed:`, error);
    });
  
  if (waitUntilFn) {
    waitUntilFn(taskPromise);
    console.log(`[BACKGROUND] Task ${jobId} scheduled via EdgeRuntime.waitUntil`);
  } else {
    // Fallback: just run the promise without blocking
    console.log(`[BACKGROUND] Task ${jobId} scheduled (no EdgeRuntime available)`);
  }
  
  return jobId;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Scrub sensitive data before logging to DLQ
 */
function scrubSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'password', 'token', 'apiKey', 'api_key', 'secret',
    'authorization', 'auth', 'credential', 'ssn', 'credit_card'
  ];
  
  const scrubbed: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      scrubbed[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      scrubbed[key] = Array.isArray(value) 
        ? value.map(v => typeof v === 'object' ? scrubSensitiveData(v as Record<string, unknown>) : v)
        : scrubSensitiveData(value as Record<string, unknown>);
    } else {
      scrubbed[key] = value;
    }
  }
  
  return scrubbed;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const retryablePatterns = [
    'timeout', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED',
    'network', '503', '502', '504', '429', 'rate limit',
    'temporarily unavailable', 'service unavailable'
  ];
  
  const message = error.message.toLowerCase();
  return retryablePatterns.some(pattern => message.includes(pattern.toLowerCase()));
}

/**
 * Create a job executor with pre-configured settings
 */
export function createJobExecutor(defaultConfig: Partial<JobConfig>) {
  return async <T>(
    jobFn: () => Promise<T>,
    overrides?: Partial<JobConfig>,
    payload?: Record<string, unknown>
  ): Promise<JobResult<T>> => {
    const config: JobConfig = {
      ...JobConfigs.backgroundTask,
      ...defaultConfig,
      ...overrides
    };
    return executeJob(jobFn, config, payload);
  };
}
