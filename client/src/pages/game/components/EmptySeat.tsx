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

  const isClickable = !!onSit;

  return (
    <div className="text-center">
      <div
        className={`bg-black/40 rounded-md p-3 text-gray-400 text-sm transition-colors ${
          isClickable ? "cursor-pointer hover:bg-black/60" : "cursor-default opacity-70"
        }`}
        onClick={isClickable ? handleClick : undefined}
      >
        <div className="mb-1">Empty Seat {seatNumber}</div>
        <div
          className={`w-[120px] h-[50px] flex justify-center items-center border rounded ${
            isClickable ? "border-gray-600 hover:border-white" : "border-gray-700"
          }`}
        >
          {isClickable ? (
            <span className="text-xs">Click to sit</span>
          ) : (
            <span className="text-xs text-gray-500">Waiting for players</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmptySeat; 