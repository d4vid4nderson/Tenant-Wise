'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiMinus, FiRefreshCw } from 'react-icons/fi';

interface RentHistoryPoint {
  id: string;
  property_id: string;
  monthly_rent: number;
  market_rent: number | null;
  recorded_at: string;
}

interface RentComparisonChartProps {
  propertyId: string;
  currentRent: number;
  currentMarketRent?: number | null;
  zipCode?: string;
  onMarketRentUpdated?: (marketRent: number) => void;
}

export default function RentComparisonChart({
  propertyId,
  currentRent,
  currentMarketRent,
  zipCode,
  onMarketRentUpdated,
}: RentComparisonChartProps) {
  const [history, setHistory] = useState<RentHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [fetchingMarketRent, setFetchingMarketRent] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [localMarketRent, setLocalMarketRent] = useState<number | null>(currentMarketRent || null);

  // Sync local state when prop changes (e.g., on page refresh or navigation)
  useEffect(() => {
    if (currentMarketRent && currentMarketRent !== localMarketRent) {
      setLocalMarketRent(currentMarketRent);
    }
  }, [currentMarketRent]);

  // Fetch market rent from HUD API
  const fetchMarketRent = async () => {
    if (!zipCode) {
      setFetchMessage({ type: 'error', text: 'ZIP code is required to fetch market rent' });
      return;
    }

    setFetchingMarketRent(true);
    setFetchMessage(null);
    try {
      const response = await fetch(`/api/market-rent?zip=${zipCode}&bedrooms=2`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch market rent');
      }

      // Save market rent to the property
      const updateResponse = await fetch(`/api/properties/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_rent: result.data.market_rent }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to save market rent');
      }

      // Update local state immediately for chart display
      setLocalMarketRent(result.data.market_rent);

      setFetchMessage({
        type: 'success',
        text: `Market rent: $${result.data.market_rent}/mo (${result.data.area_name}, FY${result.data.year})`
      });

      // Notify parent component
      if (onMarketRentUpdated) {
        onMarketRentUpdated(result.data.market_rent);
      }
    } catch (error) {
      setFetchMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to fetch market rent'
      });
    } finally {
      setFetchingMarketRent(false);
    }
  };

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch(`/api/rent-history?propertyId=${propertyId}`);
        const result = await response.json();
        if (response.ok) {
          setHistory(result.data || []);
          console.log('Rent history loaded:', result.data?.length || 0, 'records');
        } else {
          console.error('Failed to fetch rent history:', result.error);
          setHistoryError(result.error);
        }
      } catch (error) {
        console.error('Error fetching rent history:', error);
        setHistoryError('Failed to load history');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [propertyId]);

  // Use localMarketRent (updated immediately after fetch) or fall back to prop
  const effectiveMarketRent = localMarketRent ?? currentMarketRent ?? null;

  // Debug: log props
  console.log('RentComparisonChart props:', { propertyId, currentRent, currentMarketRent, localMarketRent, effectiveMarketRent, zipCode });

  // Prepare chart data - combine history with current values
  const rawChartData = [
    ...history.map((point) => ({
      date: new Date(point.recorded_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      fullDate: point.recorded_at,
      rent: point.monthly_rent,
      market: point.market_rent,
    })),
  ];

  // Add current data point if not already the latest
  const today = new Date().toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  const lastPoint = rawChartData[rawChartData.length - 1];
  if (!lastPoint || lastPoint.rent !== currentRent || lastPoint.market !== effectiveMarketRent) {
    rawChartData.push({
      date: today,
      fullDate: new Date().toISOString(),
      rent: currentRent,
      market: effectiveMarketRent,
    });
  }

  // If we have market rent but historical points don't have it, fill them in
  // This ensures the market rent shows as a horizontal reference line
  const chartData = rawChartData.map((point, index) => ({
    ...point,
    market: point.market ?? effectiveMarketRent,
  }));

  // Calculate comparison metrics
  const comparison = effectiveMarketRent ? {
    difference: currentRent - effectiveMarketRent,
    percentDiff: ((currentRent - effectiveMarketRent) / effectiveMarketRent * 100).toFixed(1),
    isAbove: currentRent > effectiveMarketRent,
    isBelow: currentRent < effectiveMarketRent,
    isAtMarket: Math.abs(currentRent - effectiveMarketRent) < effectiveMarketRent * 0.02,
  } : null;

  // Calculate rent trend
  const rentTrend = chartData.length >= 2 ? {
    change: chartData[chartData.length - 1].rent - chartData[0].rent,
    percentChange: ((chartData[chartData.length - 1].rent - chartData[0].rent) / chartData[0].rent * 100).toFixed(1),
  } : null;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {fetchMessage && (
        <div className={`mb-3 p-2 rounded-lg text-xs ${
          fetchMessage.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {fetchMessage.text}
        </div>
      )}

      {/* Header - Compact for sidebar */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <h3 className="font-semibold text-sm flex items-center gap-1.5">
          <FiDollarSign className="w-4 h-4 text-green-600" />
          Rent Analysis
        </h3>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={fetchMarketRent}
            disabled={fetchingMarketRent || !zipCode}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={zipCode ? `Fetch HUD Fair Market Rent for ${zipCode}` : 'ZIP code required'}
          >
            <FiRefreshCw className={`w-3 h-3 ${fetchingMarketRent ? 'animate-spin' : ''}`} />
            {fetchingMarketRent ? '...' : 'Update'}
          </button>
          {comparison && !comparison.isAtMarket && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              comparison.isAbove
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {comparison.isAbove ? 'Above' : 'Below'}
            </div>
          )}
        </div>
      </div>

      {/* Line Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              stroke="#9ca3af"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              stroke="#9ca3af"
              tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
              width={40}
            />
            <Tooltip
              formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
              labelStyle={{ color: '#374151' }}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Line
              type="monotone"
              dataKey="rent"
              name="Your Rent"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#3b82f6' }}
            />
            {chartData.some(d => d.market) && (
              <Line
                type="monotone"
                dataKey="market"
                name="Market Rent"
                stroke="#9ca3af"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#9ca3af', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, fill: '#9ca3af' }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Current Stats - 2x2 grid for sidebar */}
      <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Your Rent</p>
          <p className="text-base font-bold text-blue-600">${currentRent.toLocaleString()}</p>
        </div>
        {effectiveMarketRent && (
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Market</p>
            <p className="text-base font-bold text-gray-600">${effectiveMarketRent.toLocaleString()}</p>
          </div>
        )}
        {comparison && (
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Difference</p>
            <p className={`text-base font-bold ${comparison.isAbove ? 'text-green-600' : 'text-amber-600'}`}>
              {comparison.isAbove ? '+' : '-'}${Math.abs(comparison.difference).toLocaleString()}
            </p>
          </div>
        )}
        {(!effectiveMarketRent || !comparison) && (
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">History</p>
            <p className="text-base font-bold text-gray-600">{chartData.length} pts</p>
          </div>
        )}
      </div>

      {chartData.length <= 1 && (
        <p className="text-center text-sm text-gray-400 mt-4">
          Rent history will be tracked as you update your property over time.
        </p>
      )}


      {historyError && (
        <p className="text-center text-sm text-red-500 mt-4">
          Note: Could not load rent history. Make sure the rent_history table exists in your database.
        </p>
      )}
    </div>
  );
}
