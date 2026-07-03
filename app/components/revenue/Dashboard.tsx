'use client';
import React, { useState } from 'react';

export default function RevenueDashboard() {
  const [metrics] = useState({
    checkoutsStarted: 0,
    subscriptionsCreated: 0,
    totalRevenue: 0,
    conversionRate: 0,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">📊 DSG ONE Revenue</h1>
        <p className="text-slate-400">Real-time Stripe & PostHog integration</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          <div className="bg-slate-700 rounded-lg p-6">
            <div className="text-sm text-slate-400">Checkouts</div>
            <div className="text-3xl font-bold text-white">{metrics.checkoutsStarted}</div>
          </div>
          <div className="bg-slate-700 rounded-lg p-6">
            <div className="text-sm text-slate-400">Subscriptions</div>
            <div className="text-3xl font-bold text-green-400">{metrics.subscriptionsCreated}</div>
          </div>
          <div className="bg-slate-700 rounded-lg p-6">
            <div className="text-sm text-slate-400">Revenue</div>
            <div className="text-3xl font-bold text-blue-400">${metrics.totalRevenue}</div>
          </div>
          <div className="bg-slate-700 rounded-lg p-6">
            <div className="text-sm text-slate-400">Conversion</div>
            <div className="text-3xl font-bold text-purple-400">{metrics.conversionRate}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
