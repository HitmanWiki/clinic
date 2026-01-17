// Security utilities for the clinic portal

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (!input) return ''
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>?/gm, '')
  
  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>'"]/g, '')
  
  // Trim and return
  return sanitized.trim()
}

/**
 * Validate phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || phone.length !== 10) return false
  if (!/^\d+$/.test(phone)) return false
  if (!/^[6789]/.test(phone)) return false
  return true
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Generate CSP header
 */
export function generateCSP(): string {
  const isDev = process.env.NODE_ENV === 'development'
  
  const directives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Needed for Next.js
      "'unsafe-eval'", // Needed for development
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Needed for Tailwind/Next.js
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
    ],
    'font-src': ["'self'", 'https:'],
    'connect-src': [
      "'self'",
      ...(isDev ? ['ws:', 'http://localhost:*'] : []),
    ],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
  }
  
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ')
}

/**
 * Log security event
 */
export function logSecurityEvent(event: string, details?: any) {
  console.log(`🔒 SECURITY: ${event}`, details ? JSON.stringify(details) : '')
}

/**
 * Check if request is suspicious
 */
export function isSuspiciousRequest(request: Request): boolean {
  const url = request.url.toLowerCase()
  const userAgent = request.headers.get('user-agent') || ''
  
  // Suspicious patterns
  const patterns = [
    // Common attack paths
    /(\/\.env|\/config|\/backup|\/dump|\/sql)/i,
    // Common CMS/admin paths
    /(\/wp-admin|\/phpmyadmin|\/adminer|\/administrator)/i,
    // Script extensions
    /\.(php|asp|aspx|jsp|cfm|pl|py|cgi|sh)/i,
    // Suspicious parameters
    /(\?|&)(cmd|exec|system|passthru|shell)/i,
  ]
  
  return patterns.some(pattern => 
    pattern.test(url) || pattern.test(userAgent)
  )
}