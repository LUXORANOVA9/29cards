import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatChips } from '@/lib/gameLogic';
import { BarChart3, Activity } from 'lucide-react';
import type { GameTable, GameSession } from '@/hooks/useAdminData';

interface AdminOverviewTabProps {
  gameTables: GameTable[];
  gameSessions: GameSession[];
  isLoading: boolean;
}

export function AdminOverviewTab({ gameTables, gameSessions, isLoading }: AdminOverviewTabProps) {
  if (isLoading) {
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get active sessions with their table info
  const activeSessionsWithTables = gameSessions
    .filter(s => s.status === 'playing' || s.status === 'waiting')
    .slice(0, 5)
    .map(session => {
      const table = gameTables.find(t => t.id === session.game_table_id);
      return {
        ...session,
        tableName: table?.name || 'Unknown Table',
      };
    });

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Revenue chart placeholder - would need wallet_transactions data for real chart */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gold" />
            Revenue Overview
          </CardTitle>
          <CardDescription>Daily revenue for the past week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2">
            {[65, 40, 80, 55, 90, 75, 85].map((height, i) => (
              <motion.div
                key={i}
                className="flex-1 bg-gold/20 rounded-t-lg relative group"
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <div className="absolute inset-x-0 bottom-0 bg-gold rounded-t-lg" 
                     style={{ height: `${height * 0.6}%` }} 
                />
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs text-muted-foreground">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </CardContent>
      </Card>

      {/* Active tables */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            Live Tables
          </CardTitle>
          <CardDescription>
            {gameTables.filter(t => t.is_active).length} active tables, {activeSessionsWithTables.length} live sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeSessionsWithTables.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active game sessions.
            </div>
          ) : (
            activeSessionsWithTables.map((session, i) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${session.status === 'playing' ? 'bg-accent animate-pulse' : 'bg-gold'}`} />
                  <div>
                    <p className="font-medium">{session.tableName}</p>
                    <p className="text-xs text-muted-foreground">
                      Round {session.round} • {session.status}
                    </p>
                  </div>
                </div>
                <p className="font-bold text-gold">{formatChips(Number(session.pot))}</p>
              </motion.div>
            ))
          )}
          
          {/* Show some active tables without sessions */}
          {activeSessionsWithTables.length < 3 && (
            gameTables
              .filter(t => t.is_active && !gameSessions.some(s => s.game_table_id === t.id))
              .slice(0, 3 - activeSessionsWithTables.length)
              .map((table, i) => (
                <motion.div
                  key={table.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (activeSessionsWithTables.length + i) * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                    <div>
                      <p className="font-medium">{table.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {table.small_blind}/{table.big_blind} blinds • {table.max_players} seats
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Waiting</p>
                </motion.div>
              ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
