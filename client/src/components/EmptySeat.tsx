import React from 'react';

interface EmptySeatProps {
  seatNumber: number;
  onSit?: (position: number) => void;
}

const EmptySeat: React.FC<EmptySeatProps> = ({ seatNumber, onSit }) => {
  const handleClick = () => {
    if (onSit) {
      onSit(seatNumber - 1); // Convert to 0-indexed position
    }
  };

  return (
    <div className="text-center">
      <div 
        className="bg-black/40 rounded-md p-3 text-gray-400 text-sm cursor-pointer hover:bg-black/60 transition-colors"
        onClick={handleClick}
      >
        <div className="mb-1">Empty Seat {seatNumber}</div>
        <div className="w-[120px] h-[50px] flex justify-center items-center border border-gray-600 rounded hover:border-white">
          <span className="text-xs">Click to sit</span>
        </div>
      </div>
    </div>
  );
};

export default EmptySeat; 