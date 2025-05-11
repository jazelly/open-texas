import React from 'react';
import { formatChips } from '@/utils/chip';
import { GamePhase, WAITING_PHASE } from '../const';

interface GameBannerProps {
  userName: string | undefined;
  userChips: number;
  gamePhase: GamePhase;
  onExitGame: () => void;
}

const GameBanner: React.FC<GameBannerProps> = ({ 
  userName, 
  userChips, 
  gamePhase, 
  onExitGame 
}) => {
  return (
    <div className="fixed top-0 left-0 right-0 bg-gray-900/90 text-white py-3 px-6 flex justify-between items-center z-30 shadow-lg">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="font-bold text-lg">{userName || 'Player'}</span>
          <span className="text-sm text-gray-300">{`Chips: $${formatChips(userChips).short}`}</span>
        </div>
      </div>
      <div className="text-center font-semibold">
        {gamePhase !== WAITING_PHASE
          ? `Game Phase: ${gamePhase}`
          : 'Waiting for players'}
      </div>
      <button
        onClick={onExitGame}
        className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors"
      >
        Exit Game
      </button>
    </div>
  );
};

export default GameBanner; 