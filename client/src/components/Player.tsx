import React from "react";
import Card from "./Card";


interface PlayerCardProps {
  suit: string;
  value: string;
}

interface PlayerProps {
  player: {
    id: string;
    name: string;
    chips: number;
    cards: PlayerCardProps[];
    isActive: boolean;
    isTurn: boolean;
    isDealer: boolean;
    isFolded: boolean;
    isAllIn: boolean;
    currentBet: number;
  };
  isCurrentPlayer: boolean;
}

const Player: React.FC<PlayerProps> = ({
  player,
  isCurrentPlayer,
}) => {
  const {
    name,
    chips,
    cards,
    isDealer,
    isFolded,
    isAllIn,
    currentBet
  } = player;

  return (
    <div className="relative">
      {isDealer && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-white text-black rounded-full flex items-center justify-center text-xs font-bold">
          D
        </div>
      )}
      
      {(isFolded || isAllIn) && (
        <div className={`absolute -top-5 left-1/2 transform -translate-x-1/2 text-white py-0.5 px-1.5 rounded text-xs whitespace-nowrap ${
          isFolded ? "bg-red-600/70" : "bg-green-800/70"
        }`}>
          {isFolded ? "FOLDED" : isAllIn ? "ALL IN" : ""}
        </div>
      )}

      <div className="text-center text-white mb-1">
        <div className={`text-base ${isCurrentPlayer ? "font-bold" : "font-normal"}`}>
          {name}
        </div>
        <div className="text-sm">${chips}</div>
      </div>

      <div className="flex gap-1 mt-1">
        {cards.map((card, index) => (
          <Card
            key={index}
            suit={card.suit}
            value={card.value}
            hidden={!isCurrentPlayer && !isFolded} // Only show cards if it's the current player or folded
          />
        ))}
      </div>
      
      {currentBet > 0 && (
        <div className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 bg-black/70 text-white py-0.5 px-1.5 rounded text-xs">
          Bet: ${currentBet}
        </div>
      )}
    </div>
  );
};

Player.displayName = "Player";

export default Player;
