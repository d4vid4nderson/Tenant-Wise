'use client';

import { useState, useRef, useCallback } from 'react';
import { FiX, FiCheck, FiTarget } from 'react-icons/fi';

interface FocalPointSelectorProps {
  imageUrl: string;
  initialX?: number;
  initialY?: number;
  onSave: (x: number, y: number) => void;
  onCancel: () => void;
  saving?: boolean;
}

export default function FocalPointSelector({
  imageUrl,
  initialX = 50,
  initialY = 50,
  onSave,
  onCancel,
  saving = false,
}: FocalPointSelectorProps) {
  const [focalX, setFocalX] = useState(initialX);
  const [focalY, setFocalY] = useState(initialY);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setFocalX(Math.round(Math.max(0, Math.min(100, x))));
    setFocalY(Math.round(Math.max(0, Math.min(100, y))));
  }, []);

  const handleSave = () => {
    onSave(focalX, focalY);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FiTarget className="w-5 h-5" />
            Set Focal Point
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          <p className="text-sm text-gray-600 mb-3">
            Click on the image to set the focal point for cropping.
          </p>

          {/* Image with focal point selector */}
          <div
            ref={imageRef}
            className="relative cursor-crosshair rounded-lg overflow-hidden border-2 border-gray-200"
            onClick={handleClick}
          >
            <img
              src={imageUrl}
              alt="Select focal point"
              className="w-full max-h-[280px] object-contain"
              draggable={false}
            />

            {/* Focal point marker */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${focalX}%`,
                top: `${focalY}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Crosshair */}
              <div className="relative">
                <div className="absolute w-8 h-0.5 bg-white shadow-md -left-4 top-1/2 -translate-y-1/2" />
                <div className="absolute w-0.5 h-8 bg-white shadow-md left-1/2 -translate-x-1/2 -top-4" />
                <div className="w-4 h-4 rounded-full border-2 border-white bg-blue-500/50 shadow-lg" />
              </div>
            </div>

            {/* Grid overlay on hover */}
            <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
              <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border border-white/20" />
                ))}
              </div>
            </div>
          </div>

          {/* Coordinates display */}
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            <span className="px-3 py-1 bg-gray-100 rounded-lg font-mono">
              X: {focalX}%
            </span>
            <span className="px-3 py-1 bg-gray-100 rounded-lg font-mono">
              Y: {focalY}%
            </span>
          </div>

          {/* Quick position buttons */}
          <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-500 mr-1">Quick:</span>
            <button
              onClick={() => { setFocalX(0); setFocalY(0); }}
              className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Top-Left
            </button>
            <button
              onClick={() => { setFocalX(50); setFocalY(0); }}
              className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Top
            </button>
            <button
              onClick={() => { setFocalX(100); setFocalY(0); }}
              className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Top-Right
            </button>
            <button
              onClick={() => { setFocalX(50); setFocalY(50); }}
              className="px-2 py-0.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
            >
              Center
            </button>
            <button
              onClick={() => { setFocalX(50); setFocalY(100); }}
              className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Bottom
            </button>
          </div>

          {/* Preview */}
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2 text-center">Preview</p>
            <div className="flex justify-center gap-3">
              <div className="text-center">
                <div className="w-24 h-16 rounded overflow-hidden border border-gray-200 mx-auto">
                  <img
                    src={imageUrl}
                    alt="Preview wide"
                    className="w-full h-full object-cover"
                    style={{ objectPosition: `${focalX}% ${focalY}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 block">Wide</span>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded overflow-hidden border border-gray-200 mx-auto">
                  <img
                    src={imageUrl}
                    alt="Preview square"
                    className="w-full h-full object-cover"
                    style={{ objectPosition: `${focalX}% ${focalY}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 block">Square</span>
              </div>
              <div className="text-center">
                <div className="w-16 h-24 rounded overflow-hidden border border-gray-200 mx-auto">
                  <img
                    src={imageUrl}
                    alt="Preview tall"
                    className="w-full h-full object-cover"
                    style={{ objectPosition: `${focalX}% ${focalY}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 block">Tall</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 flex-shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <FiCheck className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Focal Point'}
          </button>
        </div>
      </div>
    </div>
  );
}
