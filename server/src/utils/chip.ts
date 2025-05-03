/**
 * Represents a formatted chip value
 */
export interface FormattedChips {
  short: string;  // Shortened representation (e.g., "3M")
  full: string;   // Full string representation (e.g., "3,000,000")
  raw: string;    // Raw value as string without formatting (e.g., "3000000")
}

/**
 * Converts a number chip value to a human-readable format
 * @param chips - The chip amount as number or string
 * @returns Formatted chip representation
 */
export function formatChips(chips: number | string): FormattedChips {
  // Convert to string to handle different input types
  const chipsStr = chips.toString();
  
  // Convert to number for calculations
  const chipsNum = Number(chipsStr);
  
  // Format with thousands separators
  const fullFormat = new Intl.NumberFormat('en-US').format(chipsNum);
  
  // Create shortened version
  let shortFormat: string;
  
  if (chipsNum >= 1000000000) {
    // Billions
    shortFormat = `${(chipsNum / 1000000000).toFixed(1)}B`;
  } else if (chipsNum >= 1000000) {
    // Millions
    shortFormat = `${(chipsNum / 1000000).toFixed(1)}M`;
  } else if (chipsNum >= 1000) {
    // Thousands
    shortFormat = `${(chipsNum / 1000).toFixed(1)}K`;
  } else {
    // Less than 1000
    shortFormat = chipsNum.toString();
  }
  
  // Remove trailing .0 if present
  shortFormat = shortFormat.replace('.0', '');
  
  return {
    short: shortFormat,
    full: fullFormat,
    raw: chipsStr
  };
}

/**
 * Parses a chip string (like "5M", "2.5K") into a number value
 * @param chipString - The string representation of chips (e.g., "5M", "2.5K")
 * @returns number value of the chips
 */
export function parseChips(chipString: string): number {
  // Check if it's a simple number
  if (/^\d+$/.test(chipString)) {
    return Number(chipString);
  }
  
  // Clean and prepare the string
  const clean = chipString.trim().toUpperCase();
  
  // Extract the numeric part and the multiplier
  const match = clean.match(/^([\d.]+)([KMB])?$/);
  if (!match) {
    throw new Error(`Invalid chip format: ${chipString}`);
  }
  
  const [, numStr, unit] = match;
  let value = parseFloat(numStr);
  
  // Apply the multiplier
  switch (unit) {
    case 'K':
      value *= 1000;
      break;
    case 'M':
      value *= 1000000;
      break;
    case 'B':
      value *= 1000000000;
      break;
  }
  
  // Round to the nearest whole number
  return Math.round(value);
}

/**
 * Utility for serializing chip values in JSON.stringify
 * @param chips - Chip amount as number
 * @returns Object with short and full representations for JSON serialization
 */
export function serializeChipsForJson(chips: number | string): {
  short: string;
  full: string;
} {
  const formatted = formatChips(chips);
  return {
    short: formatted.short,
    full: formatted.full,
  };
}
