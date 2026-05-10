/**
 * Formats a phone number string into a more readable Italian format.
 * Example: +393331234567 -> +39 333 123 4567
 * Example: 3331234567 -> 333 123 4567
 */
export function formatPhoneNumber(phone: string | null): string {
  if (!phone) return 'N/A';
  
  // Remove any non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it starts with +39 and has 12 or 13 characters
  if (cleaned.startsWith('+39') && cleaned.length >= 12) {
    const prefix = cleaned.slice(0, 3);
    const mobilePrefix = cleaned.slice(3, 6);
    const firstPart = cleaned.slice(6, 9);
    const secondPart = cleaned.slice(9);
    return `${prefix} ${mobilePrefix} ${firstPart} ${secondPart}`;
  }
  
  // Standard 10 digit Italian mobile
  if (cleaned.length === 10 && !cleaned.startsWith('+')) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  
  // Fallback for other lengths
  return phone;
}

/**
 * Returns the initials of a name.
 * Example: "Mario Rossi" -> "MR"
 */
export function getInitials(name: string): string {
  if (!name) return '';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}
