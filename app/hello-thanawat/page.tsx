'use client';

import { useEffect, useState } from 'react';

export default function HelloThanawat() {
  const [visitors, setVisitors] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch visitor count
    fetch('/api/visitor-counter')
      .then(res => res.json())
      .then(data => {
        setVisitors(data.count);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch visitor count:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl w-full text-center">
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-6">
          Hello Thanawat Suparongsuwan 👋
        </h1>

        <p className="text-xl text-gray-700 mb-8">
          Welcome to the global platform
        </p>

        <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl p-8 mb-8">
          <p className="text-gray-600 text-sm mb-2">Global Visitors</p>
          <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            {loading ? '...' : visitors.toLocaleString()}
          </div>
          <p className="text-gray-500 text-sm mt-2">visitors from around the world</p>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600">
            You are visitor #{loading ? '?' : visitors}
          </p>
          <p className="text-sm text-gray-500">
            This counter updates in real-time across all visitors globally
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            Powered by AppDeploy • Real-time Global Visitor Counter
          </p>
        </div>
      </div>
    </div>
  );
}
