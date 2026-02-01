'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useGameSocket } from '@/hooks/useGameSocket';
import GameTable from '@/components/game/GameTable';

export default function TablePage() {
  const params = useParams();
  const tableId = params.id as string;

  // Initialize Socket Connection
  useGameSocket(tableId);

  return (
    <main className="min-h-screen bg-gray-950">
      <GameTable />
    </main>
  );
}
