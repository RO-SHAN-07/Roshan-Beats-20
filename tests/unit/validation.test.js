/**
 * Unit tests for input validation and sanitization utilities
 */

import {
  sanitizeHtml,
  validateEmail,
  validateUsername,
  validatePassword,
  validateText,
  validateFile,
  validateNumber,
  validateDate,
  validateForm,
  escapeHtml,
  validateUrl
} from '../../js/modules/validation.js';

describe('Input Validation Module', () => {
  describe('sanitizeHtml', () => {
    test('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeHtml(input);
      expect(result).toBe('Hello');
    });

    test('should handle non-string input', () => {
      expect(sanitizeHtml(null)).toBe('');
      expect(sanitizeHtml(undefined)).toBe('');
      expect(sanitizeHtml(123)).toBe('');
    });

    test('should preserve text content', () => {
      const input = 'Hello <b>world</b>';
      const result = sanitizeHtml(input);
      expect(result).toBe('Hello world');
    });
  });

  describe('validateEmail', () => {
    test('should validate correct email addresses', () => {
      const result = validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('test@example.com');
      expect(result.error).toBeNull();
    });

    test('should reject invalid email addresses', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    test('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(255) + '@example.com';
      const result = validateEmail(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email too long');
    });

    test('should handle non-string input', () => {
      const result = validateEmail(123);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email must be a string');
    });
  });

  describe('validateUsername', () => {
    test('should validate correct usernames', () => {
      const result = validateUsername('testuser123');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('testuser123');
    });

    test('should reject usernames that are too short', () => {
      const result = validateUsername('ab');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username must be at least 3 characters');
    });

    test('should reject usernames with invalid characters', () => {
      const result = validateUsername('test@user');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username can only contain letters, numbers, underscores, and hyphens');
    });
  });

  describe('validatePassword', () => {
    test('should validate strong passwords', () => {
      const result = validatePassword('StrongPass123!');
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('strong');
    });

    test('should reject passwords that are too short', () => {
      const result = validatePassword('short');
      expect(result.isValid).toBe(false);
      expect(result.strength).toBe('weak');
    });

    test('should validate password strength', () => {
      expect(validatePassword('weak').strength).toBe('weak');
      expect(validatePassword('Medium123').strength).toBe('medium');
      expect(validatePassword('StrongPass123!').strength).toBe('strong');
    });

    test('should enforce custom requirements', () => {
      const result = validatePassword('password', { requireNumbers: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('number');
    });
  });

  describe('validateText', () => {
    test('should validate text within limits', () => {
      const result = validateText('Valid text');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Valid text');
    });

    test('should reject text that is too long', () => {
      const longText = 'a'.repeat(1001);
      const result = validateText(longText);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('less than');
    });

    test('should sanitize HTML when not allowed', () => {
      const result = validateText('<script>alert("xss")</script>Hello', { allowHtml: false });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('HTML tags are not allowed');
    });
  });

  describe('validateFile', () => {
    test('should validate correct file types', () => {
      const file = new File(['content'], 'test.mp3', { type: 'audio/mpeg' });
      const result = validateFile(file, { allowedTypes: ['audio/*'] });
      expect(result.isValid).toBe(true);
    });

    test('should reject files that are too large', () => {
      const largeFile = new File(['x'.repeat(101 * 1024 * 1024)], 'large.mp3', { type: 'audio/mpeg' });
      const result = validateFile(largeFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File size must be less than');
    });

    test('should reject invalid file types', () => {
      const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      const result = validateFile(file, { allowedTypes: ['audio/*'] });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File type not allowed');
    });

    test('should handle non-File input', () => {
      const result = validateFile('not a file');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid file');
    });
  });

  describe('validateNumber', () => {
    test('should validate numbers within range', () => {
      const result = validateNumber(42, { min: 0, max: 100 });
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(42);
    });

    test('should reject numbers outside range', () => {
      const result = validateNumber(150, { min: 0, max: 100 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be at most');
    });

    test('should handle string input', () => {
      const result = validateNumber('42');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(42);
    });

    test('should reject non-numeric strings', () => {
      const result = validateNumber('not a number');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid number format');
    });
  });

  describe('validateDate', () => {
    test('should validate valid dates', () => {
      const date = new Date('2023-01-01');
      const result = validateDate(date);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(date);
    });

    test('should reject dates outside range', () => {
      const pastDate = new Date('1800-01-01');
      const result = validateDate(pastDate, { minDate: '1900-01-01' });
      expect(result.isValid).toBe(false);
    });

    test('should handle string input', () => {
      const result = validateDate('2023-01-01');
      expect(result.isValid).toBe(true);
    });

    test('should reject invalid date strings', () => {
      const result = validateDate('invalid date');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid date');
    });
  });

  describe('validateForm', () => {
    test('should validate complete valid forms', () => {
      const formData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'StrongPass123!'
      };

      const rules = {
        email: { type: 'email' },
        username: { type: 'username' },
        password: { type: 'password' }
      };

      const result = validateForm(formData, rules);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('should collect validation errors', () => {
      const formData = {
        email: 'invalid-email',
        username: 'ab',
        password: 'weak'
      };

      const rules = {
        email: { type: 'email' },
        username: { type: 'username' },
        password: { type: 'password' }
      };

      const result = validateForm(formData, rules);
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors)).toHaveLength(3);
    });
  });

  describe('escapeHtml', () => {
    test('should escape HTML entities', () => {
      const result = escapeHtml('<script>&"\'</script>');
      expect(result).toBe('<script>&"&#x27;</script>');
    });

    test('should handle non-string input', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(123)).toBe('');
    });
  });

  describe('validateUrl', () => {
    test('should validate HTTP URLs', () => {
      const result = validateUrl('https://example.com');
      expect(result.isValid).toBe(true);
    });

    test('should reject non-HTTP URLs', () => {
      const result = validateUrl('ftp://example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Only HTTP and HTTPS URLs are allowed');
    });

    test('should reject malformed URLs', () => {
      const result = validateUrl('not a url');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid URL format');
    });
  });
});