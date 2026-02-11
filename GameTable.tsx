import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GameState, formatChips } from '@/lib/gameLogic';
import { PlayerSeat } from './PlayerSeat';
import { ChipStack } from './ChipStack';
import { PlayingCard } from './PlayingCard';
import { useIsMobile } from '@/hooks/use-mobile';

interface GameTableProps {
  gameState: GameState;
  currentUserId?: string;
  className?: string;
}

const seatPositions = [
  'bottom',
  'left',
  'top-left', 
  'top',
  'top-right',
  'right',
] as const;

export function GameTable({ gameState, currentUserId, className }: GameTableProps) {
  const isMobile = useIsMobile();
  
  const arrangedPlayers = [...gameState.players];
  const currentUserIndex = arrangedPlayers.findIndex(p => p.id === currentUserId);
  if (currentUserIndex > 0) {
    const before = arrangedPlayers.slice(0, currentUserIndex);
    const after = arrangedPlayers.slice(currentUserIndex);
    arrangedPlayers.splice(0, arrangedPlayers.length, ...after, ...before);
  }

  return (
    <div className={cn(
      'relative w-full h-full',
      isMobile ? 'min-h-[300px]' : 'min-h-[500px]',
      className
    )}>
      {/* Table background with velvet texture */}
      <motion.div 
        className={cn(
          'absolute overflow-hidden',
          'velvet-texture animate-table-glow',
          'shadow-table',
          isMobile 
            ? 'inset-1 rounded-[40px] border-4 border-secondary/80' 
            : 'inset-8 rounded-[100px] border-8 border-secondary/80'
        )}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 table-spotlight" />
        
        <div className={cn(
          'absolute border-2 border-gold/20',
          isMobile ? 'inset-2 rounded-[30px]' : 'inset-4 rounded-[80px]'
        )} />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 sm:gap-4">
          {gameState.pot > 0 && (
            <motion.div 
              className="flex flex-col items-center gap-1 sm:gap-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring' }}
            >
              <ChipStack value={gameState.pot} size={isMobile ? 'md' : 'lg'} />
              <div className={cn(
                'rounded-full bg-card/80 backdrop-blur-sm border border-gold/30',
                isMobile ? 'px-2 py-0.5' : 'px-4 py-1'
              )}>
                <span className={cn(
                  'font-bold text-gold',
                  isMobile ? 'text-xs' : 'text-sm'
                )}>
                  Pot: {formatChips(gameState.pot)}
                </span>
              </div>
            </motion.div>
          )}

          {gameState.communityCards.length > 0 && (
            <div className={cn('flex mt-2 sm:mt-4', isMobile ? 'gap-1' : 'gap-2')}>
              {gameState.communityCards.map((card, i) => (
                <PlayingCard 
                  key={card.id} 
                  card={card} 
                  size={isMobile ? 'sm' : 'md'} 
                  delay={i * 0.15}
                />
              ))}
            </div>
          )}

          <motion.div 
            className={cn(
              'absolute px-4 py-1.5 sm:px-6 sm:py-2 rounded-full',
              'bg-card/60 backdrop-blur-sm border border-border/50',
              isMobile ? 'bottom-3' : 'bottom-8'
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {gameState.phase === 'waiting' && 'Waiting for players...'}
              {gameState.phase === 'dealing' && 'Dealing cards...'}
              {gameState.phase === 'betting' && `Round ${gameState.round} • Betting`}
              {gameState.phase === 'showdown' && 'Showdown!'}
              {gameState.phase === 'festival' && '🎉 Festival Mode'}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {arrangedPlayers.map((player, index) => (
        <PlayerSeat
          key={player.id}
          player={player}
          position={seatPositions[index % seatPositions.length]}
          isCurrentUser={player.id === currentUserId}
          showCards={gameState.phase === 'showdown'}
        />
      ))}

      {Array.from({ length: 6 - arrangedPlayers.length }).map((_, i) => (
        <PlayerSeat
          key={`empty-${i}`}
          position={seatPositions[(arrangedPlayers.length + i) % seatPositions.length]}
        />
      ))}
    </div>
  );
}
