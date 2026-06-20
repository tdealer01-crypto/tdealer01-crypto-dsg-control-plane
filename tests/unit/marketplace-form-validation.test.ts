import { describe, it, expect } from 'vitest';

/**
 * Client-side validation logic for marketplace product submission form
 * These functions are extracted from the SubmitForm component for testing
 */

interface FormData {
  name: string;
  price: string;
  description: string;
  category: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function validateProductName(name: string): string | undefined {
  if (!name.trim()) {
    return 'Product name is required';
  }
  if (name.trim().length < 3) {
    return 'Product name must be at least 3 characters';
  }
  if (name.trim().length > 100) {
    return 'Product name must be less than 100 characters';
  }
  return undefined;
}

function validatePrice(price: string): string | undefined {
  if (!price.trim()) {
    return 'Price is required';
  }
  const priceNum = parseFloat(price);
  if (isNaN(priceNum)) {
    return 'Price must be a valid number';
  }
  if (priceNum <= 0) {
    return 'Price must be greater than 0';
  }
  if (priceNum > 999999.99) {
    return 'Price cannot exceed $999,999.99';
  }
  return undefined;
}

function validateDescription(description: string): string | undefined {
  if (!description.trim()) {
    return 'Description is required';
  }
  if (description.trim().length < 10) {
    return 'Description must be at least 10 characters';
  }
  if (description.trim().length > 1000) {
    return 'Description must be less than 1000 characters';
  }
  return undefined;
}

function validateCategory(category: string): string | undefined {
  if (!category) {
    return 'Please select a category';
  }
  return undefined;
}

function validateImage(file: File | null): string | undefined {
  if (!file) {
    return 'Product image is required';
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Image must be JPEG or PNG format';
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return `Image size must be less than ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`;
  }
  return undefined;
}

function validateForm(formData: FormData, imageFile: File | null): ValidationResult {
  const errors: Record<string, string> = {};

  const nameError = validateProductName(formData.name);
  if (nameError) errors.name = nameError;

  const priceError = validatePrice(formData.price);
  if (priceError) errors.price = priceError;

  const descriptionError = validateDescription(formData.description);
  if (descriptionError) errors.description = descriptionError;

  const categoryError = validateCategory(formData.category);
  if (categoryError) errors.category = categoryError;

  const imageError = validateImage(imageFile);
  if (imageError) errors.image = imageError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

describe('Marketplace Form Validation', () => {
  describe('Product Name Validation', () => {
    it('should reject empty name', () => {
      const error = validateProductName('');
      expect(error).toBe('Product name is required');
    });

    it('should reject whitespace-only name', () => {
      const error = validateProductName('   ');
      expect(error).toBe('Product name is required');
    });

    it('should reject name with less than 3 characters', () => {
      const error = validateProductName('AB');
      expect(error).toBe('Product name must be at least 3 characters');
    });

    it('should accept name with exactly 3 characters', () => {
      const error = validateProductName('ABC');
      expect(error).toBeUndefined();
    });

    it('should reject name longer than 100 characters', () => {
      const longName = 'A'.repeat(101);
      const error = validateProductName(longName);
      expect(error).toBe('Product name must be less than 100 characters');
    });

    it('should accept valid product names', () => {
      const validNames = [
        'Pro Template',
        'Basic SaaS Starter Kit',
        'E-commerce Platform',
      ];
      validNames.forEach((name) => {
        const error = validateProductName(name);
        expect(error).toBeUndefined();
      });
    });

    it('should trim whitespace from name', () => {
      const error = validateProductName('  Valid Name  ');
      expect(error).toBeUndefined();
    });
  });

  describe('Price Validation', () => {
    it('should reject empty price', () => {
      const error = validatePrice('');
      expect(error).toBe('Price is required');
    });

    it('should reject non-numeric price', () => {
      const error = validatePrice('abc');
      expect(error).toBe('Price must be a valid number');
    });

    it('should reject zero price', () => {
      const error = validatePrice('0');
      expect(error).toBe('Price must be greater than 0');
    });

    it('should reject negative price', () => {
      const error = validatePrice('-10');
      expect(error).toBe('Price must be greater than 0');
    });

    it('should accept valid prices', () => {
      const validPrices = ['0.01', '9.99', '100', '999999.99'];
      validPrices.forEach((price) => {
        const error = validatePrice(price);
        expect(error).toBeUndefined();
      });
    });

    it('should reject price exceeding max', () => {
      const error = validatePrice('1000000');
      expect(error).toBe('Price cannot exceed $999,999.99');
    });

    it('should handle decimal prices', () => {
      const error = validatePrice('29.99');
      expect(error).toBeUndefined();
    });

    it('should handle scientific notation', () => {
      const error = validatePrice('1e5');
      expect(error).toBeUndefined();
    });
  });

  describe('Description Validation', () => {
    it('should reject empty description', () => {
      const error = validateDescription('');
      expect(error).toBe('Description is required');
    });

    it('should reject description with less than 10 characters', () => {
      const error = validateDescription('Short');
      expect(error).toBe('Description must be at least 10 characters');
    });

    it('should accept description with exactly 10 characters', () => {
      const error = validateDescription('1234567890');
      expect(error).toBeUndefined();
    });

    it('should reject description longer than 1000 characters', () => {
      const longDesc = 'A'.repeat(1001);
      const error = validateDescription(longDesc);
      expect(error).toBe('Description must be less than 1000 characters');
    });

    it('should accept valid descriptions', () => {
      const validDescs = [
        'This is a great product',
        'A comprehensive guide to building web apps',
        'High-quality template with 50+ components',
      ];
      validDescs.forEach((desc) => {
        const error = validateDescription(desc);
        expect(error).toBeUndefined();
      });
    });

    it('should trim whitespace from description', () => {
      const error = validateDescription('  Valid description here  ');
      expect(error).toBeUndefined();
    });
  });

  describe('Category Validation', () => {
    it('should reject empty category', () => {
      const error = validateCategory('');
      expect(error).toBe('Please select a category');
    });

    it('should accept valid categories', () => {
      const validCategories = ['Commerce', 'SaaS', 'Internal Tools', 'Business', 'Finance', 'Productivity'];
      validCategories.forEach((cat) => {
        const error = validateCategory(cat);
        expect(error).toBeUndefined();
      });
    });
  });

  describe('Image Validation', () => {
    it('should reject missing image', () => {
      const error = validateImage(null);
      expect(error).toBe('Product image is required');
    });

    it('should reject invalid image type', () => {
      const file = new File(['content'], 'test.webp', { type: 'image/webp' });
      const error = validateImage(file);
      expect(error).toBe('Image must be JPEG or PNG format');
    });

    it('should reject oversized image', () => {
      // Create a file that exceeds max size
      const largeBuffer = new Uint8Array(6 * 1024 * 1024); // 6 MB
      const file = new File([largeBuffer], 'large.jpg', { type: 'image/jpeg' });
      const error = validateImage(file);
      expect(error).toBe('Image size must be less than 5MB');
    });

    it('should accept JPEG images', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const error = validateImage(file);
      expect(error).toBeUndefined();
    });

    it('should accept PNG images', () => {
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const error = validateImage(file);
      expect(error).toBeUndefined();
    });

    it('should accept small images', () => {
      const buffer = new Uint8Array(1024 * 100); // 100 KB
      const file = new File([buffer], 'small.jpg', { type: 'image/jpeg' });
      const error = validateImage(file);
      expect(error).toBeUndefined();
    });

    it('should accept images at max size limit', () => {
      const buffer = new Uint8Array(5 * 1024 * 1024); // Exactly 5 MB
      const file = new File([buffer], 'maxsize.png', { type: 'image/png' });
      const error = validateImage(file);
      expect(error).toBeUndefined();
    });
  });

  describe('Full Form Validation', () => {
    const validFormData: FormData = {
      name: 'Test Product',
      price: '29.99',
      description: 'This is a valid product description',
      category: 'SaaS',
    };

    const validImage = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    it('should pass validation with all valid data', () => {
      const result = validateForm(validFormData, validImage);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should collect multiple validation errors', () => {
      const invalidForm: FormData = {
        name: '', // Invalid
        price: 'abc', // Invalid
        description: 'Short', // Invalid
        category: '', // Invalid
      };
      const result = validateForm(invalidForm, null); // Invalid image
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors)).toHaveLength(5);
      expect(result.errors.name).toBeDefined();
      expect(result.errors.price).toBeDefined();
      expect(result.errors.description).toBeDefined();
      expect(result.errors.category).toBeDefined();
      expect(result.errors.image).toBeDefined();
    });

    it('should pass with valid image of various sizes', () => {
      const imageSizes = [
        10 * 1024, // 10 KB
        100 * 1024, // 100 KB
        1024 * 1024, // 1 MB
        5 * 1024 * 1024, // 5 MB (max)
      ];

      imageSizes.forEach((size) => {
        const buffer = new Uint8Array(size);
        const image = new File([buffer], 'test.jpg', { type: 'image/jpeg' });
        const result = validateForm(validFormData, image);
        expect(result.isValid).toBe(true);
      });
    });
  });
});
