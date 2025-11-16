import DOMPurify from 'dompurify';

/**
 * Input validation and sanitization utilities
 * Provides comprehensive validation for user inputs and data sanitization.
 */

/**
 * Sanitizes HTML input to prevent XSS attacks.
 * @param {string} input - The input string to sanitize.
 * @returns {string} - Sanitized string safe for HTML insertion.
 */
export function sanitizeHtml(input) {
  if (typeof input !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitizes input for use in URLs.
 * @param {string} input - The input string to sanitize.
 * @returns {string} - URL-safe string.
 */
export function sanitizeUrl(input) {
  if (typeof input !== 'string') {
    return '';
  }
  return encodeURIComponent(input.trim());
}

/**
 * Validates and sanitizes email addresses.
 * @param {string} email - The email to validate.
 * @returns {object} - {isValid: boolean, sanitized: string, error: string}.
 */
export function validateEmail(email) {
  if (typeof email !== 'string') {
    return { isValid: false, sanitized: '', error: 'Email must be a string' };
  }

  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(sanitized)) {
    return { isValid: false, sanitized, error: 'Invalid email format' };
  }

  if (sanitized.length > 254) {
    return { isValid: false, sanitized, error: 'Email too long' };
  }

  return { isValid: true, sanitized, error: null };
}

/**
 * Validates and sanitizes usernames.
 * @param {string} username - The username to validate.
 * @returns {object} - {isValid: boolean, sanitized: string, error: string}.
 */
export function validateUsername(username) {
  if (typeof username !== 'string') {
    return { isValid: false, sanitized: '', error: 'Username must be a string' };
  }

  const sanitized = username.trim();

  if (sanitized.length < 3) {
    return { isValid: false, sanitized, error: 'Username must be at least 3 characters' };
  }

  if (sanitized.length > 50) {
    return { isValid: false, sanitized, error: 'Username must be less than 50 characters' };
  }

  // Allow alphanumeric, underscore, and hyphen
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(sanitized)) {
    return { isValid: false, sanitized, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }

  return { isValid: true, sanitized, error: null };
}

/**
 * Validates and sanitizes passwords.
 * @param {string} password - The password to validate.
 * @param {object} options - Validation options.
 * @returns {object} - {isValid: boolean, sanitized: string, error: string, strength: string}.
 */
export function validatePassword(password, options = {}) {
  if (typeof password !== 'string') {
    return { isValid: false, sanitized: '', error: 'Password must be a string', strength: 'weak' };
  }

  const sanitized = password; // Don't trim passwords as spaces might be intentional

  const minLength = options.minLength || 8;
  const requireUppercase = options.requireUppercase !== false;
  const requireLowercase = options.requireLowercase !== false;
  const requireNumbers = options.requireNumbers !== false;
  const requireSpecial = options.requireSpecial !== false;

  if (sanitized.length < minLength) {
    return {
      isValid: false,
      sanitized,
      error: `Password must be at least ${minLength} characters`,
      strength: 'weak',
    };
  }

  if (sanitized.length > 128) {
    return {
      isValid: false,
      sanitized,
      error: 'Password must be less than 128 characters',
      strength: 'weak',
    };
  }

  const hasUppercase = /[A-Z]/.test(sanitized);
  const hasLowercase = /[a-z]/.test(sanitized);
  const hasNumbers = /\d/.test(sanitized);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(sanitized);

  const requirements = [];
  if (requireUppercase && !hasUppercase) {
    requirements.push('uppercase letter');
  }
  if (requireLowercase && !hasLowercase) {
    requirements.push('lowercase letter');
  }
  if (requireNumbers && !hasNumbers) {
    requirements.push('number');
  }
  if (requireSpecial && !hasSpecial) {
    requirements.push('special character');
  }

  if (requirements.length > 0) {
    return {
      isValid: false,
      sanitized,
      error: `Password must contain: ${requirements.join(', ')}`,
      strength: 'weak',
    };
  }

  // Calculate password strength
  let strength = 'weak';
  let score = 0;

  if (hasUppercase) {
    score++;
  }
  if (hasLowercase) {
    score++;
  }
  if (hasNumbers) {
    score++;
  }
  if (hasSpecial) {
    score++;
  }
  if (sanitized.length >= 12) {
    score++;
  }
  if (sanitized.length >= 16) {
    score++;
  }

  if (score >= 5) {
    strength = 'strong';
  } else if (score >= 3) {
    strength = 'medium';
  }

  return { isValid: true, sanitized, error: null, strength };
}

/**
 * Validates and sanitizes text input.
 * @param {string} text - The text to validate.
 * @param {object} options - Validation options.
 * @returns {object} - {isValid: boolean, sanitized: string, error: string}.
 */
export function validateText(text, options = {}) {
  if (typeof text !== 'string') {
    return { isValid: false, sanitized: '', error: 'Text must be a string' };
  }

  const sanitized = sanitizeHtml(text.trim());
  const maxLength = options.maxLength || 1000;
  const minLength = options.minLength || 0;
  const allowHtml = options.allowHtml || false;

  if (sanitized.length < minLength) {
    return { isValid: false, sanitized, error: `Text must be at least ${minLength} characters` };
  }

  if (sanitized.length > maxLength) {
    return { isValid: false, sanitized, error: `Text must be less than ${maxLength} characters` };
  }

  // If HTML is not allowed, ensure no HTML tags remain
  if (!allowHtml && sanitized !== text.trim()) {
    return { isValid: false, sanitized, error: 'HTML tags are not allowed' };
  }

  return { isValid: true, sanitized, error: null };
}

/**
 * Validates file uploads.
 * @param {File} file - The file to validate.
 * @param {object} options - Validation options.
 * @returns {object} - {isValid: boolean, error: string}.
 */
export function validateFile(file, options = {}) {
  if (!file || !(file instanceof File)) {
    return { isValid: false, error: 'Invalid file' };
  }

  const maxSize = options.maxSize || 100 * 1024 * 1024; // 100MB default
  const allowedTypes = options.allowedTypes || ['audio/*'];

  if (file.size > maxSize) {
    return { isValid: false, error: `File size must be less than ${maxSize / (1024 * 1024)}MB` };
  }

  const isAllowedType = allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.slice(0, -1));
    }
    return file.type === type;
  });

  if (!isAllowedType) {
    return { isValid: false, error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` };
  }

  // Check for malicious filenames
  const dangerousPatterns = /(\.\.|\/|\\|\0)/;
  if (dangerousPatterns.test(file.name)) {
    return { isValid: false, error: 'Invalid filename' };
  }

  return { isValid: true, error: null };
}

/**
 * Validates numeric input.
 * @param {any} value - The value to validate.
 * @param {object} options - Validation options.
 * @returns {object} - {isValid: boolean, sanitized: number, error: string}.
 */
export function validateNumber(value, options = {}) {
  const min = options.min || -Infinity;
  const max = options.max || Infinity;
  const allowFloat = options.allowFloat !== false;

  let num;
  if (typeof value === 'string') {
    num = allowFloat ? parseFloat(value) : parseInt(value, 10);
  } else if (typeof value === 'number') {
    num = value;
  } else {
    return { isValid: false, sanitized: 0, error: 'Value must be a number or numeric string' };
  }

  if (isNaN(num)) {
    return { isValid: false, sanitized: 0, error: 'Invalid number format' };
  }

  if (!allowFloat && !Number.isInteger(num)) {
    return { isValid: false, sanitized: 0, error: 'Integer values only' };
  }

  if (num < min) {
    return { isValid: false, sanitized: num, error: `Value must be at least ${min}` };
  }

  if (num > max) {
    return { isValid: false, sanitized: num, error: `Value must be at most ${max}` };
  }

  return { isValid: true, sanitized: num, error: null };
}

/**
 * Validates date input.
 * @param {string|Date} date - The date to validate.
 * @param {object} options - Validation options.
 * @returns {object} - {isValid: boolean, sanitized: Date, error: string}.
 */
export function validateDate(date, options = {}) {
  const minDate = options.minDate ? new Date(options.minDate) : null;
  const maxDate = options.maxDate ? new Date(options.maxDate) : null;

  let dateObj;
  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    return { isValid: false, sanitized: null, error: 'Invalid date format' };
  }

  if (isNaN(dateObj.getTime())) {
    return { isValid: false, sanitized: null, error: 'Invalid date' };
  }

  if (minDate && dateObj < minDate) {
    return { isValid: false, sanitized: dateObj, error: `Date must be after ${minDate.toISOString()}` };
  }

  if (maxDate && dateObj > maxDate) {
    return { isValid: false, sanitized: dateObj, error: `Date must be before ${maxDate.toISOString()}` };
  }

  return { isValid: true, sanitized: dateObj, error: null };
}

/**
 * Sanitizes SQL-like input (for IndexedDB queries).
 * @param {string} input - The input to sanitize.
 * @returns {string} - Sanitized string.
 */
export function sanitizeQuery(input) {
  if (typeof input !== 'string') {
    return '';
  }
  // Remove potentially dangerous characters for queries
  return input.replace(/[<>'"&]/g, '');
}

/**
 * Validates form data.
 * @param {object} formData - The form data to validate.
 * @param {object} rules - Validation rules for each field.
 * @returns {object} - {isValid: boolean, errors: Object, sanitized: Object}.
 */
export function validateForm(formData, rules) {
  const errors = {};
  const sanitized = {};
  let isValid = true;

  for (const [field, rule] of Object.entries(rules)) {
    const value = formData[field];
    let result;

    switch (rule.type) {
    case 'email':
      result = validateEmail(value);
      break;
    case 'username':
      result = validateUsername(value);
      break;
    case 'password':
      result = validatePassword(value, rule.options);
      break;
    case 'text':
      result = validateText(value, rule.options);
      break;
    case 'number':
      result = validateNumber(value, rule.options);
      break;
    case 'date':
      result = validateDate(value, rule.options);
      break;
    default:
      result = { isValid: true, sanitized: value, error: null };
    }

    if (!result.isValid) {
      errors[field] = result.error;
      isValid = false;
    }

    sanitized[field] = result.sanitized;
  }

  return { isValid, errors, sanitized };
}

/**
 * Escapes HTML entities for safe display.
 * @param {string} text - The text to escape.
 * @returns {string} - HTML-escaped string.
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') {
    return '';
  }
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Validates URL format.
 * @param {string} url - The URL to validate.
 * @returns {object} - {isValid: boolean, sanitized: string, error: string}.
 */
export function validateUrl(url) {
  if (typeof url !== 'string') {
    return { isValid: false, sanitized: '', error: 'URL must be a string' };
  }

  const sanitized = url.trim();

  try {
    const urlObj = new URL(sanitized);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, sanitized, error: 'Only HTTP and HTTPS URLs are allowed' };
    }
    return { isValid: true, sanitized, error: null };
  } catch {
    return { isValid: false, sanitized, error: 'Invalid URL format' };
  }
}
