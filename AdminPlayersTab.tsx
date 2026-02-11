import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatChips } from '@/lib/gameLogic';
import { MoreHorizontal } from 'lucide-react';
import type { PlayerWithWallet } from '@/hooks/useAdminData';

interface AdminPlayersTabProps {
  players: PlayerWithWallet[];
  isLoading: boolean;
}

export function AdminPlayersTab({ players, isLoading }: AdminPlayersTabProps) {
  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Recent Players</CardTitle>
          <CardDescription>Players who joined recently</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPlayerStatus = (player: PlayerWithWallet) => {
    if (!player.is_active) return 'suspended';
    const balance = player.wallet ? Number(player.wallet.available) + Number(player.wallet.bonus) : 0;
    if (balance > 100000) return 'vip';
    return 'active';
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle>Recent Players</CardTitle>
        <CardDescription>
          {players.length} players found
        </CardDescription>
      </CardHeader>
      <CardContent>
        {players.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No players found in the database.
          </div>
        ) : (
          <div className="space-y-4">
            {players.slice(0, 10).map((player, i) => {
              const status = getPlayerStatus(player);
              const balance = player.wallet 
                ? Number(player.wallet.available) + Number(player.wallet.bonus) 
                : 0;
              
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={player.avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary">
                        {(player.display_name || player.username || 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{player.display_name || player.username || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(player.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-bold text-gold">{formatChips(balance)}</p>
                      <p className="text-xs text-muted-foreground">Balance</p>
                    </div>
                    <div className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium',
                      status === 'active' && 'bg-accent/20 text-accent',
                      status === 'suspended' && 'bg-destructive/20 text-destructive',
                      status === 'vip' && 'bg-gold/20 text-gold'
                    )}>
                      {status.toUpperCase()}
                    </div>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
