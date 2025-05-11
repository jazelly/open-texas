import { useState, useEffect, useRef } from 'react';

interface BetScrollerProps {
  minBet: number;
  maxBet: number;
  currentBet: number;
  onChange: (amount: number) => void;
}

const BetScroller: React.FC<BetScrollerProps> = ({ minBet, maxBet, currentBet, onChange }) => {
  const [value, setValue] = useState<number>(Math.max(minBet, currentBet));
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hoverActive, setHoverActive] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  // Update the value when props change
  useEffect(() => {
    setValue(Math.max(minBet, currentBet));
  }, [minBet, maxBet, currentBet]);

  // Calculate percentage for slider position
  const getPercentage = (current: number, min: number, max: number): number => {
    return ((current - min) / (max - min)) * 100;
  };

  // Calculate value from slider position percentage
  const getValueFromPercentage = (percentage: number, min: number, max: number): number => {
    return Math.round(((max - min) * percentage) / 100 + min);
  };

  // Handle mouse wheel scrolling for bet adjustment
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!hoverActive) return;
    e.preventDefault();
    
    const increment = calculateIncrement();
    const direction = e.deltaY < 0 ? 1 : -1;
    const newValue = Math.max(minBet, Math.min(maxBet, value + direction * increment));
    
    setValue(newValue);
    onChange(newValue);
  };

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateValueFromClientX(e.clientX);
    
    // Add DOM event listeners for mouse move and up
    const handleDOMMouseMove = (e: globalThis.MouseEvent) => {
      if (isDragging) {
        updateValueFromClientX(e.clientX);
      }
    };

    const handleDOMMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleDOMMouseMove);
      document.removeEventListener('mouseup', handleDOMMouseUp);
    };

    document.addEventListener('mousemove', handleDOMMouseMove);
    document.addEventListener('mouseup', handleDOMMouseUp);
  };

  // Update value based on mouse position
  const updateValueFromClientX = (clientX: number) => {
    if (!containerRef.current) return;
    
    const { left, width } = containerRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((clientX - left) / width) * 100));
    const newValue = getValueFromPercentage(percentage, minBet, maxBet);
    
    setValue(newValue);
    onChange(newValue);
  };

  // Calculate appropriate increment based on bet range
  const calculateIncrement = (): number => {
    const betRange = maxBet - minBet;
    
    return Math.round(betRange / 50);
  };

  // Handle increment/decrement buttons
  const handleIncrement = (multiplier: number = 1) => {
    const increment = calculateIncrement() * multiplier;
    const newValue = Math.min(maxBet, value + increment);
    setValue(newValue);
    onChange(newValue);
  };

  const handleDecrement = (multiplier: number = 1) => {
    const decrement = calculateIncrement() * multiplier;
    const newValue = Math.max(minBet, value - decrement);
    setValue(newValue);
    onChange(newValue);
  };

  // Quick bet shortcuts
  const handleQuickBet = (percentage: number) => {
    const betRange = maxBet - minBet;
    const newValue = Math.round(minBet + (betRange * percentage / 100));
    setValue(newValue);
    onChange(newValue);
  };

  // Format amounts with commas
  const formatAmount = (amount: number): string => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <div 
      className="flex flex-col w-full gap-2 p-2 bg-gray-800/80 rounded-md"
      onMouseEnter={() => setHoverActive(true)}
      onMouseLeave={() => setHoverActive(false)}
      onWheel={handleWheel}
    >
      {/* Quick bet shortcuts */}
      <div className="flex justify-between gap-1 mb-1">
        <button 
          onClick={() => handleQuickBet(25)} 
          className="bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 py-1 px-2 rounded transition-colors flex-1"
        >
          25%
        </button>
        <button 
          onClick={() => handleQuickBet(50)} 
          className="bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 py-1 px-2 rounded transition-colors flex-1"
        >
          50%
        </button>
        <button 
          onClick={() => handleQuickBet(75)} 
          className="bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 py-1 px-2 rounded transition-colors flex-1"
        >
          75%
        </button>
        <button 
          onClick={() => handleQuickBet(100)} 
          className="bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 py-1 px-2 rounded transition-colors flex-1"
        >
          All In
        </button>
      </div>
      
      {/* Slider range labels */}
      <div className="flex justify-between text-xs text-gray-400 px-1">
        <span>${formatAmount(minBet)}</span>
        <span>${formatAmount(maxBet)}</span>
      </div>
      
      {/* Slider track */}
      <div 
        ref={containerRef}
        className="h-6 bg-gray-700 rounded-full overflow-hidden relative cursor-pointer shadow-inner"
        onMouseDown={handleMouseDown}
      >
        {/* Track filled portion */}
        <div 
          className="absolute h-full bg-gradient-to-r from-blue-600 to-cyan-500"
          style={{ width: `${getPercentage(value, minBet, maxBet)}%` }}
        />
        
        {/* Tick marks for visual reference */}
        <div className="absolute inset-0 flex justify-between px-2 pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-px h-2 bg-gray-600 self-center opacity-70" />
          ))}
        </div>
        
        {/* Thumb */}
        <div 
          ref={thumbRef}
          className="absolute h-8 w-8 bg-white rounded-full -top-1 shadow-md transform -translate-x-1/2 cursor-grab flex items-center justify-center"
          style={{ left: `${getPercentage(value, minBet, maxBet)}%` }}
          onMouseDown={handleMouseDown}
        >
          <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
        </div>
      </div>
      
      {/* Value display and controls */}
      <div className="flex items-center justify-between mt-1 gap-2">
        {/* Decrement buttons */}
        <div className="flex gap-1">
          <button 
            onClick={() => handleDecrement(5)} 
            className="bg-red-700 hover:bg-red-600 text-white font-bold py-1 px-2 rounded text-xs"
            aria-label="Decrease a lot"
          >
            --
          </button>
          <button 
            onClick={() => handleDecrement()} 
            className="bg-red-700 hover:bg-red-600 text-white font-bold py-1 px-2 rounded text-xs"
            aria-label="Decrease"
          >
            -
          </button>
        </div>
        
        {/* Current value */}
        <div className="bg-black rounded-md px-3 py-1 text-sm font-bold text-white flex-grow text-center">
          ${formatAmount(value)}
        </div>
        
        {/* Increment buttons */}
        <div className="flex gap-1">
          <button 
            onClick={() => handleIncrement()} 
            className="bg-green-700 hover:bg-green-600 text-white font-bold py-1 px-2 rounded text-xs"
            aria-label="Increase"
          >
            +
          </button>
          <button 
            onClick={() => handleIncrement(5)} 
            className="bg-green-700 hover:bg-green-600 text-white font-bold py-1 px-2 rounded text-xs"
            aria-label="Increase a lot"
          >
            ++
          </button>
        </div>
      </div>
    </div>
  );
};

export default BetScroller; 