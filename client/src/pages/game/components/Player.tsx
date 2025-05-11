import React from "react";
import Card from "./Card";
import { PlayerState } from "../const";
import { formatChips } from "@/utils/chip";

interface PlayerProps {
  player: PlayerState;
  isCurrentPlayer: boolean;
}

const Player: React.FC<PlayerProps> = ({
  player,
  isCurrentPlayer,
}) => {
  const {
    name,
    cards,
    isFolded,
  } = player;

  const showChips = player.chips - player.currentGameBet;

  return (
    <div className="relative">
      {(isFolded) && (
        <div className={`absolute -top-5 left-1/2 transform -translate-x-1/2 text-white py-0.5 px-1.5 rounded text-xs whitespace-nowrap ${
          isFolded ? "bg-red-600/70" : "bg-green-800/70"
        }`}>
          {isFolded ? "FOLDED" : ""}
        </div>
      )}

      <div className="text-center text-white mb-1">
        <div className={`text-base ${isCurrentPlayer ? "font-bold" : "font-normal"}`}>
          {name}
        </div>
        <div className="text-sm">${formatChips(showChips).short}</div>
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
      
    </div>
  );
};

Player.displayName = "Player";

export default Player;
