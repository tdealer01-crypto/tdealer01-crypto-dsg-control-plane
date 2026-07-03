'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const CATEGORIES = ['Commerce', 'SaaS', 'Internal Tools', 'Business', 'Finance', 'Productivity'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];

interface FormData {
  name: string;
  price: string;
  description: string;
  category: string;
}

interface FormErrors {
  name?: string;
  price?: string;
  description?: string;
  category?: string;
  image?: string;
  form?: string;
}

interface SubmitFormProps {
  onSuccess?: () => void;
}

export function SubmitForm({ onSuccess }: SubmitFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    price: '',
    description: '',
    category: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation functions
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Product name must be at least 3 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Product name must be less than 100 characters';
    }

    // Price validation
    if (!formData.price.trim()) {
      newErrors.price = 'Price is required';
    } else {
      const priceNum = parseFloat(formData.price);
      if (isNaN(priceNum)) {
        newErrors.price = 'Price must be a valid number';
      } else if (priceNum <= 0) {
        newErrors.price = 'Price must be greater than 0';
      } else if (priceNum > 999999.99) {
        newErrors.price = 'Price cannot exceed $999,999.99';
      }
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.trim().length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    // Category validation
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    // Image validation
    if (!selectedFile) {
      newErrors.image = 'Product image is required';
    } else {
      if (!ALLOWED_IMAGE_TYPES.includes(selectedFile.type)) {
        newErrors.image = 'Image must be JPEG or PNG format';
      }
      if (selectedFile.size > MAX_IMAGE_SIZE) {
        newErrors.image = `Image size must be less than ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Clear error
      if (errors.image) {
        setErrors((prev) => ({
          ...prev,
          image: undefined,
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setSuccessMessage('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('price', formData.price.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('category', formData.category);
      if (selectedFile) {
        formDataToSend.append('image', selectedFile);
      }

      const response = await fetch('/api/marketplace/products', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit product');
      }

      const data = await response.json();
      setSuccessMessage('Product submitted successfully! It will be reviewed shortly.');
      
      // Reset form
      setFormData({ name: '', price: '', description: '', category: '' });
      setSelectedFile(null);
      setPreviewUrl('');
      setErrors({});
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setErrors((prev) => ({
        ...prev,
        form: errorMessage,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-lg bg-[rgba(51,209,122,0.15)] border border-[rgba(51,209,122,0.35)] text-emerald-200">
          {successMessage}
        </div>
      )}

      {/* General Error */}
      {errors.form && (
        <div className="mb-6 p-4 rounded-lg bg-[rgba(225,6,0,0.15)] border border-[rgba(225,6,0,0.35)] text-red-200">
          {errors.form}
        </div>
      )}

      {/* Product Name */}
      <div className="mb-6">
        <Input
          label="Product Name"
          name="name"
          type="text"
          placeholder="Enter product name"
          value={formData.name}
          onChange={handleInputChange}
          error={errors.name}
          disabled={isLoading}
          maxLength={100}
        />
      </div>

      {/* Price */}
      <div className="mb-6">
        <Input
          label="Price (USD)"
          name="price"
          type="number"
          placeholder="0.00"
          value={formData.price}
          onChange={handleInputChange}
          error={errors.price}
          disabled={isLoading}
          step="0.01"
          min="0"
        />
      </div>

      {/* Category */}
      <div className="mb-6">
        <label htmlFor="category" className="text-xs font-semibold uppercase tracking-widest text-[#AAB3C5]">
          Category
        </label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleInputChange}
          disabled={isLoading}
          className={`w-full mt-1.5 rounded-lg border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F8FAFC] outline-none transition-all ${
            errors.category
              ? 'border-[rgba(225,6,0,0.5)] focus:border-[#E10600] focus:ring-1 focus:ring-[rgba(225,6,0,0.3)]'
              : 'border-[rgba(247,220,120,0.16)] focus:border-[rgba(212,175,55,0.5)] focus:ring-1 focus:ring-[rgba(212,175,55,0.15)]'
          }`}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {errors.category && <p className="mt-1 text-xs text-red-400">{errors.category}</p>}
      </div>

      {/* Description */}
      <div className="mb-6">
        <label htmlFor="description" className="text-xs font-semibold uppercase tracking-widest text-[#AAB3C5]">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          placeholder="Describe your product"
          value={formData.description}
          onChange={handleInputChange}
          disabled={isLoading}
          maxLength={1000}
          rows={4}
          className={`w-full mt-1.5 rounded-lg border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F8FAFC] placeholder-[#AAB3C5] outline-none transition-all ${
            errors.description
              ? 'border-[rgba(225,6,0,0.5)] focus:border-[#E10600] focus:ring-1 focus:ring-[rgba(225,6,0,0.3)]'
              : 'border-[rgba(247,220,120,0.16)] focus:border-[rgba(212,175,55,0.5)] focus:ring-1 focus:ring-[rgba(212,175,55,0.15)]'
          }`}
        />
        {errors.description && <p className="mt-1 text-xs text-red-400">{errors.description}</p>}
      </div>

      {/* Image Upload */}
      <div className="mb-6">
        <label htmlFor="image" className="text-xs font-semibold uppercase tracking-widest text-[#AAB3C5]">
          Product Image
        </label>
        <div className="mt-1.5">
          <input
            ref={fileInputRef}
            id="image"
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileChange}
            disabled={isLoading}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className={`w-full rounded-lg border-2 border-dashed border-[rgba(247,220,120,0.16)] px-4 py-6 text-center transition-all ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-[rgba(247,220,120,0.35)] cursor-pointer'
            }`}
          >
            <p className="text-sm text-[#AAB3C5]">Click to upload or drag and drop</p>
            <p className="text-xs text-[#AAB3C5] mt-1">JPEG or PNG up to 5MB</p>
          </button>

          {/* Image Preview */}
          {previewUrl && (
            <div className="mt-3 relative">
              <img src={previewUrl} alt="Preview" loading="lazy" className="max-w-xs max-h-48 rounded-lg border border-[rgba(247,220,120,0.16)]" />
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                disabled={isLoading}
                className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
              >
                Remove image
              </button>
            </div>
          )}

          {errors.image && <p className="mt-2 text-xs text-red-400">{errors.image}</p>}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-3">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#050507]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            </>
          ) : (
            'Submit Product'
          )}
        </Button>
      </div>
    </form>
  );
}
