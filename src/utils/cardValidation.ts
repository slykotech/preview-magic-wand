// Card validation utility functions

export interface CardValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface CardBrand {
  name: string;
  pattern: RegExp;
  cvvLength: number[];
  maxLength: number;
}

// Supported card brands
const CARD_BRANDS: CardBrand[] = [
  {
    name: 'visa',
    pattern: /^4/,
    cvvLength: [3],
    maxLength: 16
  },
  {
    name: 'mastercard',
    pattern: /^5[1-5]|^2(?:2(?:2[1-9]|[3-9])|[3-6]|7(?:[01]|20))/,
    cvvLength: [3],
    maxLength: 16
  },
  {
    name: 'amex',
    pattern: /^3[47]/,
    cvvLength: [4],
    maxLength: 15
  },
  {
    name: 'discover',
    pattern: /^6(?:011|5)/,
    cvvLength: [3],
    maxLength: 16
  },
  {
    name: 'jcb',
    pattern: /^35(?:2[89]|[3-8])/,
    cvvLength: [3],
    maxLength: 16
  },
  {
    name: 'dinersclub',
    pattern: /^3(?:0[0-5]|[68])/,
    cvvLength: [3],
    maxLength: 14
  }
];

/**
 * Detect card brand from card number
 */
export const detectCardBrand = (cardNumber: string): CardBrand | null => {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  
  for (const brand of CARD_BRANDS) {
    if (brand.pattern.test(cleanNumber)) {
      return brand;
    }
  }
  
  return null;
};

/**
 * Luhn algorithm for card number validation
 */
export const isValidCardNumber = (cardNumber: string): boolean => {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  
  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return false;
  }
  
  let sum = 0;
  let isEven = false;
  
  // Loop through digits from right to left
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i), 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

/**
 * Validate expiry date
 */
export const isValidExpiryDate = (expiryDate: string): boolean => {
  const cleanExpiry = expiryDate.replace(/\D/g, '');
  
  if (cleanExpiry.length !== 4) {
    return false;
  }
  
  const month = parseInt(cleanExpiry.substring(0, 2), 10);
  const year = parseInt(cleanExpiry.substring(2, 4), 10);
  
  // Validate month
  if (month < 1 || month > 12) {
    return false;
  }
  
  // Validate year (check if not expired)
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear() % 100; // Last two digits
  const currentMonth = currentDate.getMonth() + 1;
  
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return false;
  }
  
  // Don't allow expiry dates too far in the future (more than 20 years)
  const fullYear = year < 50 ? 2000 + year : 1900 + year;
  if (fullYear > currentDate.getFullYear() + 20) {
    return false;
  }
  
  return true;
};

/**
 * Validate CVV
 */
export const isValidCVV = (cvv: string, cardNumber: string): boolean => {
  const cleanCVV = cvv.replace(/\D/g, '');
  const cardBrand = detectCardBrand(cardNumber);
  
  if (!cardBrand) {
    // If we can't detect the brand, accept 3 or 4 digits
    return cleanCVV.length >= 3 && cleanCVV.length <= 4;
  }
  
  return cardBrand.cvvLength.includes(cleanCVV.length);
};

/**
 * Validate cardholder name
 */
export const isValidCardholderName = (name: string): boolean => {
  const trimmedName = name.trim();
  
  // Must be at least 2 characters and contain at least one letter
  if (trimmedName.length < 2) {
    return false;
  }
  
  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(trimmedName)) {
    return false;
  }
  
  // Only allow letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z\s\-']+$/.test(trimmedName)) {
    return false;
  }
  
  return true;
};

/**
 * Comprehensive card validation
 */
export const validateCard = (cardDetails: {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
}): CardValidationResult => {
  const errors: string[] = [];
  
  // Validate card number
  if (!cardDetails.cardNumber.trim()) {
    errors.push('Card number is required');
  } else if (!isValidCardNumber(cardDetails.cardNumber)) {
    errors.push('Invalid card number');
  }
  
  // Validate expiry date
  if (!cardDetails.expiryDate.trim()) {
    errors.push('Expiry date is required');
  } else if (!isValidExpiryDate(cardDetails.expiryDate)) {
    errors.push('Invalid or expired card');
  }
  
  // Validate CVV
  if (!cardDetails.cvv.trim()) {
    errors.push('CVV is required');
  } else if (!isValidCVV(cardDetails.cvv, cardDetails.cardNumber)) {
    errors.push('Invalid CVV');
  }
  
  // Validate cardholder name
  if (!cardDetails.cardholderName.trim()) {
    errors.push('Cardholder name is required');
  } else if (!isValidCardholderName(cardDetails.cardholderName)) {
    errors.push('Invalid cardholder name');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Format card number with spaces
 */
export const formatCardNumber = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '');
  const cardBrand = detectCardBrand(cleanValue);
  
  if (cardBrand?.name === 'amex') {
    // American Express: 4-6-5 format
    return cleanValue.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3').trim();
  } else {
    // Most cards: 4-4-4-4 format
    return cleanValue.replace(/(\d{4})/g, '$1 ').trim();
  }
};

/**
 * Format expiry date as MM/YY
 */
export const formatExpiryDate = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '');
  
  if (cleanValue.length >= 2) {
    return cleanValue.replace(/(\d{2})(\d{2})/, '$1/$2');
  }
  
  return cleanValue;
};

/**
 * Get card brand display name
 */
export const getCardBrandName = (cardNumber: string): string => {
  const brand = detectCardBrand(cardNumber);
  
  if (!brand) return 'Unknown';
  
  const displayNames: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    jcb: 'JCB',
    dinersclub: 'Diners Club'
  };
  
  return displayNames[brand.name] || brand.name;
};