'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';

interface MasonryGridProps {
  children: React.ReactNode[];
  columns?: number;
  gap?: number;
}

export function MasonryGrid({ children, columns = 3, gap = 24 }: MasonryGridProps): React.JSX.Element {
  const [columnHeights, setColumnHeights] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize column heights
    setColumnHeights(new Array(columns).fill(0));
  }, [columns]);

  const getColumnIndex = (): number => {
    if (columnHeights.length === 0) return 0;
    // Find column with minimum height
    return columnHeights.indexOf(Math.min(...columnHeights));
  };

  return (
    <div
      ref={containerRef}
      className="masonry-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
        alignItems: 'start',
      }}
    >
      {children.map((child, index) => (
        <div
          key={index}
          className="masonry-item"
          style={{
            gridColumn: 'span 1',
            breakInside: 'avoid',
          }}
        >
          {child}
        </div>
      ))}

      <style jsx>{`
        @media (max-width: 768px) {
          .masonry-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .masonry-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
