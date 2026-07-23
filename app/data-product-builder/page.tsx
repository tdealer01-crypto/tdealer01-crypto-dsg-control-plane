'use client';

import { useState, useRef } from 'react';

interface DataSource {
  id: string;
  label: string;
  meta: string;
}

interface ProductItem {
  id: string;
  name: string;
}

const DATA_SOURCES: DataSource[] = [
  { id: '1', label: 'Global E-Commerce Logs', meta: '847M records · hourly updates' },
  { id: '2', label: 'Supply Chain Optimization', meta: '423M records · daily updates' },
  { id: '3', label: 'Market Sentiment Analytics', meta: '1.2B records · real-time' },
  { id: '4', label: 'IoT Sensor Networks', meta: '340M records · 15 min frequency' },
  { id: '5', label: 'Financial Transaction Flows', meta: '2.1B records · real-time' },
  { id: '6', label: 'AI Training Datasets', meta: '156M records · weekly updates' },
];

export default function DataProductBuilder() {
  const [productItems, setProductItems] = useState<ProductItem[]>([]);
  const [productName, setProductName] = useState('');
  const [basePrice, setBasePrice] = useState(2400);
  const [monetizationModel, setMonetizationModel] = useState('subscription');
  const [isDragOver, setIsDragOver] = useState(false);

  const calculateRevenue = () => {
    const sourceCount = productItems.length;
    let monthlyPerSub = basePrice;
    let estimatedSubs = 12;

    if (sourceCount > 1) estimatedSubs = Math.min(20, 10 + sourceCount * 2);
    if (monetizationModel === 'usage') monthlyPerSub = Math.floor(basePrice * 0.8);
    if (monetizationModel === 'hybrid') estimatedSubs = Math.min(24, estimatedSubs + 4);

    const monthlyRevenue = monthlyPerSub * estimatedSubs;
    const annualRevenue = monthlyRevenue * 12;
    const costRatio = (annualRevenue / (sourceCount * 12000)).toFixed(1);

    return {
      monthlyPerSub,
      estimatedSubs,
      monthlyRevenue,
      annualRevenue,
      costRatio,
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const sourceLabel = e.dataTransfer.getData('text/plain');
    if (sourceLabel && !productItems.some(item => item.name === sourceLabel)) {
      setProductItems([
        ...productItems,
        { id: Date.now().toString(), name: sourceLabel },
      ]);
    }
  };

  const handleDragStart = (e: React.DragEvent, label: string) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', label);
  };

  const removeItem = (id: string) => {
    setProductItems(productItems.filter(item => item.id !== id));
  };

  const revenue = calculateRevenue();
  const isReady = productItems.length > 0 && productName.trim().length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-4xl font-light tracking-tight mb-2">Data Product Builder</h1>
          <p className="text-slate-600 dark:text-slate-400">Create data products and generate revenue instantly</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Data Sources */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xs uppercase tracking-widest font-semibold text-slate-600 dark:text-slate-400 mb-4">
              Data Sources
            </h2>

            <div className="space-y-2 mb-6">
              <input
                type="text"
                placeholder="Search datasets..."
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 rounded"
              />
            </div>

            <div className="space-y-2">
              {DATA_SOURCES.map(source => (
                <div
                  key={source.id}
                  draggable
                  onDragStart={e => handleDragStart(e, source.label)}
                  className="p-3 bg-slate-50 dark:bg-slate-700 border-l-3 border-amber-600 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-move transition-all"
                >
                  <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{source.label}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{source.meta}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Center Panel: Product Builder */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
              <h2 className="text-xs uppercase tracking-widest font-semibold text-slate-600 dark:text-slate-400 mb-4">
                Product Builder
              </h2>

              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed p-8 text-center mb-4 transition-all ${
                  isDragOver
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                    : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
                }`}
              >
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Drag data sources here
                </div>
              </div>

              {/* Product Items */}
              {productItems.length > 0 && (
                <div className="space-y-2 mb-6">
                  {productItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-900/20 border-l-3 border-amber-600">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.name}</span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Configuration */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs uppercase tracking-widest font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    placeholder="e.g., Premium Analytics Bundle"
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 rounded"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    Monetization Model
                  </label>
                  <div className="space-y-2">
                    {['subscription', 'usage', 'hybrid'].map(model => (
                      <label key={model} className="flex items-center p-2 bg-slate-50 dark:bg-slate-700 rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600">
                        <input
                          type="radio"
                          name="model"
                          value={model}
                          checked={monetizationModel === model}
                          onChange={e => setMonetizationModel(e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize flex-1">{model}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {model === 'subscription' && 'monthly'}
                          {model === 'usage' && 'per query'}
                          {model === 'hybrid' && 'base + usage'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    Base Price
                  </label>
                  <input
                    type="number"
                    value={basePrice}
                    onChange={e => setBasePrice(Number(e.target.value))}
                    min={0}
                    step={100}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 rounded"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Revenue Preview */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm flex flex-col">
            <h2 className="text-xs uppercase tracking-widest font-semibold text-slate-600 dark:text-slate-400 mb-4">
              Revenue Forecast
            </h2>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 rounded border-l-4 border-amber-600">
                <div className="text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Base Monthly
                </div>
                <div className="text-3xl font-light text-amber-900 dark:text-amber-200 font-variant-numeric">
                  ${revenue.monthlyPerSub.toLocaleString()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Est. Subscribers</div>
                  <div className="text-2xl font-light text-slate-900 dark:text-slate-100">
                    {revenue.estimatedSubs}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Efficiency</div>
                  <div className="text-2xl font-light text-amber-600">{revenue.costRatio}x</div>
                </div>
              </div>

              <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded">
                <div className="text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Monthly Revenue
                </div>
                <div className="text-2xl font-light text-slate-900 dark:text-slate-100 font-variant-numeric">
                  ${revenue.monthlyRevenue.toLocaleString()}
                </div>
              </div>

              <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded">
                <div className="text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Annual Projection
                </div>
                <div className="text-2xl font-light text-slate-900 dark:text-slate-100 font-variant-numeric">
                  ${revenue.annualRevenue.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 mb-6">
              <div className="text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400 font-semibold mb-3">
                Status
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Data sources:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{productItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Configuration:</span>
                  <span className={`font-semibold ${isReady ? 'text-green-600' : 'text-slate-600 dark:text-slate-400'}`}>
                    {isReady ? 'complete' : 'incomplete'}
                  </span>
                </div>
              </div>
            </div>

            <button
              disabled={!isReady}
              className={`w-full py-3 rounded font-semibold text-sm uppercase tracking-widest transition-all ${
                isReady
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
              }`}
            >
              Publish Product
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
