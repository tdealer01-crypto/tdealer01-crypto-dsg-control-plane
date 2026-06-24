'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const PRIORITY_LEVELS = ['low', 'normal', 'high', 'urgent'];

interface TicketFormData {
  title: string;
  description: string;
  priority: string;
}

interface TicketFormErrors {
  title?: string;
  description?: string;
  priority?: string;
  form?: string;
}

interface CreateTicketFormProps {
  onSuccess?: (ticketId: string) => void;
}

export function CreateTicketForm({ onSuccess }: CreateTicketFormProps) {
  const [formData, setFormData] = useState<TicketFormData>({
    title: '',
    description: '',
    priority: 'normal',
  });

  const [errors, setErrors] = useState<TicketFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: TicketFormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Issue title is required';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (formData.title.trim().length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.trim().length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }

    if (!PRIORITY_LEVELS.includes(formData.priority)) {
      newErrors.priority = 'Please select a valid priority level';
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
    if (errors[name as keyof TicketFormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
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
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          priority: formData.priority,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create ticket');
      }

      const data = await response.json();
      setSuccessMessage('Support ticket created successfully! We will respond shortly.');

      setFormData({ title: '', description: '', priority: 'normal' });
      setErrors({});

      if (onSuccess) {
        onSuccess(data.ticket.id);
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
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      {successMessage && (
        <div className="mb-6 p-4 rounded-lg bg-[rgba(51,209,122,0.15)] border border-[rgba(51,209,122,0.35)] text-emerald-200">
          {successMessage}
        </div>
      )}

      {errors.form && (
        <div className="mb-6 p-4 rounded-lg bg-[rgba(225,6,0,0.15)] border border-[rgba(225,6,0,0.35)] text-red-200">
          {errors.form}
        </div>
      )}

      {/* Title */}
      <div className="mb-6">
        <Input
          label="Issue Title"
          name="title"
          type="text"
          placeholder="Brief description of the issue"
          value={formData.title}
          onChange={handleInputChange}
          error={errors.title}
          disabled={isLoading}
          maxLength={200}
        />
      </div>

      {/* Priority */}
      <div className="mb-6">
        <label htmlFor="priority" className="text-xs font-semibold uppercase tracking-widest text-[#AAB3C5]">
          Priority Level
        </label>
        <select
          id="priority"
          name="priority"
          value={formData.priority}
          onChange={handleInputChange}
          disabled={isLoading}
          className={`w-full mt-1.5 rounded-lg border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F8FAFC] outline-none transition-all ${
            errors.priority
              ? 'border-[rgba(225,6,0,0.5)] focus:border-[#E10600] focus:ring-1 focus:ring-[rgba(225,6,0,0.3)]'
              : 'border-[rgba(247,220,120,0.16)] focus:border-[rgba(212,175,55,0.5)] focus:ring-1 focus:ring-[rgba(212,175,55,0.15)]'
          }`}
        >
          {PRIORITY_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </option>
          ))}
        </select>
        {errors.priority && <p className="mt-1 text-xs text-red-400">{errors.priority}</p>}
      </div>

      {/* Description */}
      <div className="mb-6">
        <label htmlFor="description" className="text-xs font-semibold uppercase tracking-widest text-[#AAB3C5]">
          Detailed Description
        </label>
        <textarea
          id="description"
          name="description"
          placeholder="Describe your issue in detail, including steps to reproduce"
          value={formData.description}
          onChange={handleInputChange}
          disabled={isLoading}
          maxLength={2000}
          rows={6}
          className={`w-full mt-1.5 rounded-lg border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F8FAFC] placeholder-[#AAB3C5] outline-none transition-all ${
            errors.description
              ? 'border-[rgba(225,6,0,0.5)] focus:border-[#E10600] focus:ring-1 focus:ring-[rgba(225,6,0,0.3)]'
              : 'border-[rgba(247,220,120,0.16)] focus:border-[rgba(212,175,55,0.5)] focus:ring-1 focus:ring-[rgba(212,175,55,0.15)]'
          }`}
        />
        {errors.description && <p className="mt-1 text-xs text-red-400">{errors.description}</p>}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#050507]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating Ticket...
          </>
        ) : (
          'Create Support Ticket'
        )}
      </Button>
    </form>
  );
}
