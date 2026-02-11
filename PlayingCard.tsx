import { motion } from 'framer-motion';
import { Card, getSuitSymbol, isRedSuit } from '@/lib/gameLogic';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface PlayingCardProps {
  card?: Card;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  delay?: number;
  highlighted?: boolean;
}

export function PlayingCard({ 
  card, 
  faceDown = false, 
  size = 'md',
  onClick,
  className,
  delay = 0,
  highlighted = false
}: PlayingCardProps) {
  const isMobile = useIsMobile();
  
  const sizeClasses = {
    sm: 'w-12 h-16 text-xs',
    md: 'w-16 h-22 text-sm',
    lg: 'w-24 h-32 text-lg'
  };

  const isRed = card ? isRedSuit(card.suit) : false;

  if (faceDown || !card) {
    return (
      <motion.div
        initial={{ scale: 0, rotateY: 180 }}
        animate={{ scale: 1, rotateY: 0 }}
        transition={{ delay, duration: 0.4, type: 'spring', stiffness: isMobile ? 80 : 100 }}
        className={cn(
          sizeClasses[size],
          'rounded-lg shadow-card cursor-pointer select-none',
          'bg-gradient-to-br from-secondary via-secondary/80 to-secondary/60',
          'border-2 border-gold/30',
          'flex items-center justify-center',
          'relative overflow-hidden',
          className
        )}
        onClick={onClick}
      >
        <div className="absolute inset-2 rounded border border-gold/20">
          <div className="absolute inset-0 opacity-20">
            <div className="grid grid-cols-3 gap-px h-full">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-gold/30 rounded-sm" />
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-gold/40 text-lg">♠</span>
          </div>
        </div>
      </motion.div>
    );
  }

  const suitSymbol = getSuitSymbol(card.suit);
  const isNineOfHearts = card.rank === '9' && card.suit === 'hearts';

  return (
    <motion.div
      initial={{ scale: 0, rotateY: -180, ...(isMobile ? {} : { x: -100 }) }}
      animate={{ scale: 1, rotateY: 0, x: 0 }}
      transition={{ delay, duration: 0.5, type: 'spring', stiffness: isMobile ? 80 : 100 }}
      {...(isMobile ? {} : { whileHover: { scale: 1.05, y: -8 } })}
      className={cn(
        sizeClasses[size],
        'rounded-lg shadow-card cursor-pointer select-none',
        'bg-gradient-to-br from-chip-white via-chip-white/95 to-chip-white/90',
        'border-2',
        highlighted ? 'border-gold ring-2 ring-gold/50' : 'border-border/30',
        isNineOfHearts && 'ring-2 ring-gold shadow-gold',
        'flex flex-col justify-between p-1.5',
        'relative overflow-hidden',
        className
      )}
      onClick={onClick}
    >
      <div className={cn(
        'flex flex-col items-center leading-none',
        isRed ? 'text-destructive' : 'text-primary-foreground'
      )}>
        <span className="font-bold">{card.rank}</span>
        <span>{suitSymbol}</span>
      </div>

      <div className={cn(
        'absolute inset-0 flex items-center justify-center',
        isRed ? 'text-destructive' : 'text-primary-foreground'
      )}>
        <span className={cn(
          size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-2xl' : 'text-xl',
          isNineOfHearts && 'gold-shimmer bg-clip-text text-transparent'
        )}>
          {suitSymbol}
        </span>
      </div>

      <div className={cn(
        'flex flex-col items-center leading-none self-end rotate-180',
        isRed ? 'text-destructive' : 'text-primary-foreground'
      )}>
        <span className="font-bold">{card.rank}</span>
        <span>{suitSymbol}</span>
      </div>

      {isNineOfHearts && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-gold rounded-full flex items-center justify-center">
          <span className="text-[8px] font-bold text-primary-foreground">★</span>
        </div>
      )}
    </motion.div>
  );
}
