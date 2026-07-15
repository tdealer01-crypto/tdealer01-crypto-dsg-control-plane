'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/revenue/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan: 'pro' }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to create checkout');
        setLoading(false);
        return;
      }

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating checkout');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">DSG Pro Plan</h1>
          <p className="text-gray-600">Unlimited access to all features</p>
        </div>

        {/* Price */}
        <div className="bg-indigo-50 rounded-lg p-4 mb-6 text-center">
          <p className="text-5xl font-bold text-indigo-600">฿10</p>
          <p className="text-gray-600 text-sm mt-2">/month</p>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8">
          {[
            'Unlimited executions',
            'Priority support',
            'Advanced analytics',
            'Custom policies',
            'API access',
          ].map((feature) => (
            <li key={feature} className="flex items-center text-gray-700">
              <span className="text-indigo-600 font-bold mr-3">✓</span>
              {feature}
            </li>
          ))}
        </ul>

        {/* Form */}
        <form onSubmit={handleCheckout} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-105 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2">⏳</span>
                Processing...
              </span>
            ) : (
              '💳 Pay Now (฿10)'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Powered by Stripe • Secure payment processing
        </p>
      </div>
    </div>
  );
}
