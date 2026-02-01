import express, { Request, Response } from 'express';
import cors from 'cors';
import { SettlementService } from './services/SettlementService';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

const settlementService = new SettlementService();

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'wallet-service' });
});

// Settle Round Endpoint
app.post('/settle', async (req: Request, res: Response) => {
  try {
    const { roundId, winnerId, playerIds, panelId, nullPercent, brokerCommissionRate } = req.body;
    
    const result = await settlementService.settleRound(
      roundId,
      winnerId,
      playerIds,
      panelId,
      nullPercent,
      brokerCommissionRate
    );

    res.json(result);
  } catch (error: any) {
    console.error('Settlement failed:', error);
    res.status(500).json({ error: 'Settlement failed', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Wallet Service running on port ${PORT}`);
});
