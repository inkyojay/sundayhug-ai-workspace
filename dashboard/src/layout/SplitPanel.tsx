import React, { useState } from 'react';

interface SplitPanelProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftWidth?: number; // percentage
  minLeftWidth?: number;
  maxLeftWidth?: number;
}

export default function SplitPanel({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 40,
  minLeftWidth = 30,
  maxLeftWidth = 60,
}: SplitPanelProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const container = e.currentTarget;
    const containerRect = container.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    if (newLeftWidth >= minLeftWidth && newLeftWidth <= maxLeftWidth) {
      setLeftWidth(newLeftWidth);
    }
  };

  return (
    <div
      className="flex h-full w-full"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Left Panel - Chat */}
      <div
        className="h-full overflow-hidden flex flex-col"
        style={{ width: `${leftWidth}%` }}
      >
        {leftPanel}
      </div>

      {/* Resizer */}
      <div
        className={`w-1 h-full cursor-col-resize flex-shrink-0 transition-colors ${
          isDragging ? 'bg-blue-500' : 'bg-gray-200 hover:bg-blue-400 dark:bg-gray-700'
        }`}
        onMouseDown={handleMouseDown}
      />

      {/* Right Panel - Result */}
      <div
        className="h-full overflow-hidden flex flex-col"
        style={{ width: `${100 - leftWidth}%` }}
      >
        {rightPanel}
      </div>
    </div>
  );
}
