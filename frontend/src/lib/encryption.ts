/**
 * Client-side encryption utilities for sensitive data
 */

/**
 * Hash sensitive data using SHA-256
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Mask email for display
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal = local.length > 2 
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : local[0] + '*';
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone for display
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return '*'.repeat(digits.length - 4) + digits.slice(-4);
}

/**
 * Sanitize PII from data object
 */
export function sanitizePII<T extends Record<string, unknown>>(
  data: T,
  fieldsToMask: string[] = [],
  fieldsToRemove: string[] = []
): Partial<T> {
  const sanitized = { ...data };
  
  fieldsToRemove.forEach((field) => {
    delete sanitized[field as keyof T];
  });
  
  fieldsToMask.forEach((field) => {
    if (field in sanitized && typeof sanitized[field as keyof T] === 'string') {
      const value = sanitized[field as keyof T] as string;
      if (field.toLowerCase().includes('email')) {
        (sanitized as Record<string, unknown>)[field] = maskEmail(value);
      } else if (field.toLowerCase().includes('phone')) {
        (sanitized as Record<string, unknown>)[field] = maskPhone(value);
      } else {
        (sanitized as Record<string, unknown>)[field] = 
          value.length > 4 
            ? value.slice(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2)
            : '*'.repeat(value.length);
      }
    }
  });
  
  return sanitized;
}

/**
 * Check if data contains potential PII
 */
export function containsPII(data: string): boolean {
  const piiPatterns = [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  ];
  return piiPatterns.some((pattern) => pattern.test(data));
}

/**
 * Secure comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
