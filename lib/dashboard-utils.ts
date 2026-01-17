/**
 * Format large numbers with Indian numbering system
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0';
  
  // For large numbers, use Indian locale formatting
  if (Math.abs(num) >= 100000) {
    return new Intl.NumberFormat('en-IN', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1
    }).format(num);
  }
  
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Safe initials generation that handles special characters
 */
const getSafeInitials = (name: string | null | undefined): string => {
  if (!name || typeof name !== 'string') return '??';
  
  try {
    // Split by space and filter out empty parts
    const parts = name.split(' ').filter(part => part.trim().length > 0);
    
    if (parts.length === 0) return '??';
    
    // Take first character of first two words
    const initials = parts.slice(0, 2)
      .map(part => {
        // Get first character that is a letter
        const firstChar = part.charAt(0);
        // Check if it's a letter (basic check)
        return /[A-Za-z]/.test(firstChar) ? firstChar.toUpperCase() : '';
      })
      .filter(char => char !== '')
      .join('');
      
    return initials || '??';
  } catch (error) {
    console.error('Error getting initials:', error);
    return '??';
  }
};

/**
 * Consistent date formatting across timezones
 */
export function formatDateForDashboard(dateString: string | null | undefined): string {
  if (!dateString) return "Invalid date";
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    
    // Convert to IST for consistent display
    return date.toLocaleDateString("en-IN", {
      timeZone: 'Asia/Kolkata',
      day: "numeric",
      month: "short",
    });
  } catch (error) {
    return "Invalid date";
  }
}

/**
 * Safe number conversion with fallback
 */
export function safeNumber(value: any, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

/**
 * XSS-safe text rendering
 */
export function sanitizeText(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}