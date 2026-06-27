'use client';

import { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';

interface BetaSignupFormProps {
  productInterest?: 'agent_governance' | 'compliance_proof' | 'policy_gates' | 'all';
  source?: string;
  onSuccess?: (promoCode?: string) => void;
}

export default function BetaSignupForm({
  productInterest = 'all',
  source = 'landing_page',
  onSuccess,
}: BetaSignupFormProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [promoCode, setPromoCode] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/beta-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          companyName,
          productInterest,
          source,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setPromoCode(data.promoCode);
        if (onSuccess) {
          onSuccess(data.promoCode);
        }
        // Reset form
        setEmail('');
        setFirstName('');
        setCompanyName('');
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-green-900 mb-2">You&apos;re in!</h3>
        <p className="text-green-700 mb-4">
          Check your email for next steps. We&apos;ll be in touch within 24 hours.
        </p>
        {promoCode && (
          <div className="bg-white border-2 border-green-600 rounded p-4 inline-block">
            <p className="text-sm text-gray-600 mb-1">Limited Offer (3 slots only)</p>
            <p className="text-lg font-bold text-green-600">Code: {promoCode}</p>
            <p className="text-sm text-gray-600 mt-1">Pro pricing: $49/mo for life</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 max-w-md w-full">
      <h3 className="text-xl font-bold mb-4">Join the Beta (Free)</h3>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded p-3 mb-4 flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Email *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none"
          />
        </div>

        {/* First Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            First Name (optional)
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Alice"
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none"
          />
        </div>

        {/* Company */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Company (optional)
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Inc"
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !email}
          className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
        >
          <Mail className="w-5 h-5" />
          {loading ? 'Signing up...' : 'Join Beta (Free)'}
        </button>
      </div>

      <p className="text-xs text-gray-600 mt-4 text-center">
        No spam, no credit card. We&apos;ll email you when it&apos;s your turn.
      </p>
    </form>
  );
}
