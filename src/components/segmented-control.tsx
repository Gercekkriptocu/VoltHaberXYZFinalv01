'use client';

import type React from 'react';

interface SegmentedControlProps {
  options: string[];
  selected: string;
  onChange: (value: string) => void;
}

export function SegmentedControl({ options, selected, onChange }: SegmentedControlProps): React.JSX.Element {
  return (
    <div
      className="inline-flex rounded-xl p-1"
      style={{
        backdropFilter: 'blur(20px)',
        background: 'rgba(0, 0, 0, 0.05)',
      }}
    >
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`
            px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
            ${
              selected === option
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }
          `}
          style={{
            fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif',
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
