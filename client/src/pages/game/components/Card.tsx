import React from 'react';

interface CardProps {
  suit: string;
  value: string;
  hidden?: boolean;
}

const Card: React.FC<CardProps> = ({ suit, value, hidden = false }) => {
  const getSuitSymbol = (suit: string) => {
    switch (suit.toLowerCase()) {
      case 'hearts':
        return '♥';
      case 'diamonds':
        return '♦';
      case 'clubs':
        return '♣';
      case 'spades':
        return '♠';
      default:
        return '';
    }
  };

  const getColor = (suit: string) => {
    switch (suit.toLowerCase()) {
      case 'hearts':
      case 'diamonds':
        return 'text-red-600';
      case 'clubs':
      case 'spades':
        return 'text-black';
      default:
        return 'text-black';
    }
  };

  const suitSymbol = getSuitSymbol(suit);
  const colorClass = getColor(suit);
  const bgColorClass = hidden ? 'bg-gray-800' : 'bg-white';
  const textColorClass = hidden ? 'text-white' : colorClass;

  return (
    <div 
      className={`w-16 h-24 rounded-md ${bgColorClass} flex flex-col items-center justify-center p-1 shadow-md relative ${textColorClass}`}
    >
      {hidden ? (
        <div className="text-xl text-white">♣♦♥♠</div>
      ) : (
        <>
          <div className="text-lg font-bold absolute top-1 left-1.5">{value}</div>
          <div className="text-2xl absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">{suitSymbol}</div>
          <div className="text-lg font-bold absolute bottom-1 right-1.5 transform rotate-180">{value}</div>
        </>
      )}
    </div>
  );
};

export default Card; 