import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Player, formatChips } from '@/lib/gameLogic';
import { PlayingCard } from './PlayingCard';
import { ChipStack } from './ChipStack';
import { User, Crown, EyeOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';

interface PlayerSeatProps {
  player?: Player;
  position: 'top' | 'top-left' | 'top-right' | 'bottom' | 'left' | 'right';
  isCurrentUser?: boolean;
  showCards?: boolean;
  className?: string;
}

const desktopPositions = {
  'top': 'top-4 left-1/2 -translate-x-1/2',
  'top-left': 'top-8 left-[15%]',
  'top-right': 'top-8 right-[15%]',
  'bottom': 'bottom-4 left-1/2 -translate-x-1/2',
  'left': 'left-4 top-1/2 -translate-y-1/2',
  'right': 'right-4 top-1/2 -translate-y-1/2',
};

const mobilePositions = {
  'top': 'top-1 left-1/2 -translate-x-1/2',
  'top-left': 'top-3 left-[8%]',
  'top-right': 'top-3 right-[8%]',
  'bottom': 'bottom-1 left-1/2 -translate-x-1/2',
  'left': 'left-0 top-1/2 -translate-y-1/2',
  'right': 'right-0 top-1/2 -translate-y-1/2',
};

export function PlayerSeat({ 
  player, 
  position, 
  isCurrentUser = false,
  showCards = false,
  className 
}: PlayerSeatProps) {
  const isMobile = useIsMobile();
  const positionClasses = isMobile ? mobilePositions : desktopPositions;
  const cardPosition = ['top', 'top-left', 'top-right'].includes(position) ? 'below' : 'above';

  if (!player) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'absolute',
          positionClasses[position],
          isMobile ? 'w-14 h-18' : 'w-24 h-32',
          className
        )}
      >
        <div className={cn(
          'w-full h-full rounded-xl border-2 border-dashed border-gold/20',
          'flex flex-col items-center justify-center gap-1',
          'bg-card/30 backdrop-blur-sm',
          'hover:border-gold/40 hover:bg-card/50 cursor-pointer transition-all'
        )}>
          <User className={cn(isMobile ? 'w-4 h-4' : 'w-6 h-6', 'text-muted-foreground/50')} />
          <span className={cn(isMobile ? 'text-[8px]' : 'text-xs', 'text-muted-foreground/50')}>Join</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'absolute',
        positionClasses[position],
        className
      )}
    >
      <div className={cn(
        'flex flex-col items-center',
        isMobile ? 'gap-1' : 'gap-2',
        cardPosition === 'above' && 'flex-col-reverse'
      )}>
        {/* Player cards */}
        <div className={cn('flex', isMobile ? 'gap-0.5' : 'gap-1')}>
          {player.hand.map((card, i) => (
            <PlayingCard
              key={card.id}
              card={showCards || isCurrentUser ? card : undefined}
              faceDown={!showCards && !isCurrentUser}
              size="sm"
              delay={i * 0.1}
            />
          ))}
          {player.hand.length === 0 && !player.hasFolded && (
            <>
              <PlayingCard faceDown size="sm" delay={0} />
              <PlayingCard faceDown size="sm" delay={0.1} />
              <PlayingCard faceDown size="sm" delay={0.2} />
            </>
          )}
        </div>

        {/* Player info */}
        <motion.div 
          className={cn(
            'flex flex-col items-center rounded-xl',
            'bg-card/80 backdrop-blur-sm border',
            isMobile ? 'gap-0.5 p-1.5' : 'gap-1 p-2',
            player.isCurrent ? 'border-gold ring-2 ring-gold/30' : 'border-border/50',
            player.hasFolded && 'opacity-50',
            isCurrentUser && 'ring-2 ring-accent/50'
          )}
          animate={player.isCurrent ? { scale: [1, 1.02, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="relative">
            <Avatar className={cn(
              'border-2 border-gold/30',
              isMobile ? 'w-7 h-7' : 'w-10 h-10'
            )}>
              <AvatarImage src={player.avatar} />
              <AvatarFallback className="bg-secondary text-secondary-foreground font-bold text-[10px] sm:text-sm">
                {player.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {player.isDealer && (
              <div className={cn(
                'absolute -top-1 -right-1 bg-gold rounded-full flex items-center justify-center',
                isMobile ? 'w-3.5 h-3.5' : 'w-5 h-5'
              )}>
                <Crown className={cn(isMobile ? 'w-2 h-2' : 'w-3 h-3', 'text-primary-foreground')} />
              </div>
            )}
            {player.hasFolded && (
              <div className="absolute inset-0 bg-background/60 rounded-full flex items-center justify-center">
                <EyeOff className={cn(isMobile ? 'w-3 h-3' : 'w-4 h-4', 'text-muted-foreground')} />
              </div>
            )}
          </div>
          
          <div className="text-center">
            <p className={cn(
              'font-semibold text-foreground truncate',
              isMobile ? 'text-[9px] max-w-12' : 'text-xs max-w-20'
            )}>
              {player.name}
            </p>
            <p className={cn(
              'text-gold font-bold',
              isMobile ? 'text-[8px]' : 'text-[10px]'
            )}>
              {formatChips(player.chips)}
            </p>
          </div>

          {player.bet > 0 && (
            <div className="flex items-center gap-1">
              <ChipStack value={player.bet} size="sm" animate={false} />
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
