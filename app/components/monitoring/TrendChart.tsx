'use client';

interface DataPoint {
  label: string;
  value: number;
}

interface TrendChartProps {
  title: string;
  data: DataPoint[];
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  showPercentChange?: boolean;
}

export function TrendChart({
  title,
  data,
  unit = '',
  trend,
  showPercentChange = true,
}: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-sm font-semibold mb-2">{title}</p>
        <p className="text-xs text-gray-500">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  const percentChange =
    data.length > 1
      ? (((data[data.length - 1].value - data[0].value) / data[0].value) * 100)
        .toFixed(1)
      : '0';

  const isNegativeChange = parseFloat(percentChange) < 0;

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold">{title}</p>
        {showPercentChange && (
          <span
            className={`text-xs font-medium px-2 py-1 rounded ${
              isNegativeChange
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {isNegativeChange ? '▼' : '▲'} {Math.abs(parseFloat(percentChange))}%
          </span>
        )}
      </div>

      <div className="space-y-2">
        {data.map((point, index) => {
          const height = ((point.value - minValue) / range) * 100 || 0;

          return (
            <div key={index} className="space-y-1">
              <div className="flex items-end justify-between">
                <span className="text-xs text-gray-600 w-16">{point.label}</span>
                <span className="text-xs font-medium">
                  {point.value.toFixed(2)} {unit}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full overflow-hidden h-6">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(height, 5)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-gray-500">Min</p>
          <p className="font-semibold">{minValue.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-500">Avg</p>
          <p className="font-semibold">
            {(data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Max</p>
          <p className="font-semibold">{maxValue.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
