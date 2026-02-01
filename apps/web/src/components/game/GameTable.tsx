import React, { useEffect, useState } from 'react';
import PlayerSeat from './PlayerSeat';
import BettingControls from './BettingControls';
import { useGameStore, FestivalPhase } from '@/stores/gameStore';
import { useGameSocket } from '@/hooks/useGameSocket';
import { useAuthStore } from '@/stores/authStore';
import FestivalPhase3 from './FestivalPhase3'; // Import Phase 3 component
import FestivalPhase4 from './FestivalPhase4'; // Import Phase 4 component

const GameTable: React.FC = () => {
  const { players, pot, currentBet, currentTurn, mySeat, myCards, festivalState } = useGameStore();
  const { sendAction } = useGameSocket();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAction = (action: string, amount?: number) => {
    sendAction(action, { amount });
  };

  // Helper to position players relative to "Me" at bottom
  const getRelativePosition = (seatIndex: number) => {
    if (mySeat === null) return 'bottom'; // Spectator view
    const totalSeats = 6;
    const relativeIndex = (seatIndex - mySeat + totalSeats) % totalSeats;

    // 0 = Bottom (Me), 1 = Bottom Right, 2 = Top Right, 3 = Top, 4 = Top Left, 5 = Bottom Left
    const positions = ['bottom', 'bottom-right', 'top-right', 'top', 'top-left', 'bottom-left'];
    return positions[relativeIndex] as any;
  };

  // Positioning styles map
  const positionStyles: Record<string, string> = {
    'bottom': 'bottom-10 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-20 right-10',
    'top-right': 'top-20 right-10',
    'top': 'top-10 left-1/2 -translate-x-1/2',
    'top-left': 'top-20 left-10',
    'bottom-left': 'bottom-20 left-10',
  };

  // Prevent hydration mismatch by waiting for mount
  if (!mounted) {
    return (
      <div className="relative w-full h-screen bg-gray-900 overflow-hidden flex items-center justify-center">
        <div className="animate-pulse text-indigo-400">Loading game table...</div>
      </div>
    );
  }

  const myPlayer = players.find(p => p.seatNumber === mySeat);
  const isMyTurn = currentTurn === mySeat;

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      {/* Table Felt */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[70%] bg-game-table rounded-[200px] border-[16px] border-amber-900 shadow-2xl flex items-center justify-center">
        {/* Center Pot Area */}
        <div className="flex flex-col items-center">
          <div className="text-yellow-400 font-bold text-lg mb-2">POT</div>
          <div className="bg-black/40 px-6 py-2 rounded-full border border-yellow-500/30 text-white text-2xl font-mono">
            ₹{pot.toLocaleString()}
          </div>
          <div className="mt-4 text-white/50 text-sm">
            Current Bet: ₹{currentBet}
          </div>
        </div>
      </div>

      {/* Festival Mode Indicators */}
      {festivalState?.currentPhase === FestivalPhase.PHASE_3_LOWEST && <FestivalPhase3 />}
      {festivalState?.currentPhase === FestivalPhase.PHASE_4_JOKER && <FestivalPhase4 />}

      {/* Players */}
      {players.map((player) => (
        <div
          key={player.id}
          className={`absolute ${positionStyles[getRelativePosition(player.seatNumber)]}`}
        >
          <PlayerSeat
            id={player.id}
            name={player.id === user?.id ? 'Me' : `Player ${player.seatNumber}`}
            seatNumber={player.seatNumber}
            balance={10000} // Mock balance for now
            isActive={player.isActive}
            isDealer={false} // Todo: Add dealer tracking
            isFolded={player.isFolded}
            isWinner={false}
            currentBet={player.currentBet}
            cards={player.id === user?.id ? myCards : Array(3).fill('back')} // Show backs for others
            position={getRelativePosition(player.seatNumber)}
            jokerValue={festivalState?.phasesRemaining.includes(FestivalPhase.PHASE_4_JOKER) || festivalState?.currentPhase === FestivalPhase.PHASE_4_JOKER ? festivalState?.jokerValue : null}
          />
        </div>
      ))}

      {/* Controls (Only visible if active player) */}
      {myPlayer && (
        <BettingControls
          currentBet={currentBet}
          potAmount={pot}
          onAction={handleAction}
          canChaal={myPlayer.hasSeen}
          canBlind={!myPlayer.hasSeen}
          canShow={players.filter(p => p.isActive).length === 2}
          canSideShow={players.filter(p => p.isActive).length > 2}
          isMyTurn={isMyTurn}
        />
      )}
    </div>
  );
};

export default GameTable;
