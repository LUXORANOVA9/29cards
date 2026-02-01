"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const SettlementService_1 = require("./services/SettlementService");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3003;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const settlementService = new SettlementService_1.SettlementService();
// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'wallet-service' });
});
// Settle Round Endpoint
app.post('/settle', async (req, res) => {
    try {
        const { roundId, winnerId, playerIds, panelId, nullPercent, brokerCommissionRate } = req.body;
        const result = await settlementService.settleRound(roundId, winnerId, playerIds, panelId, nullPercent, brokerCommissionRate);
        res.json(result);
    }
    catch (error) {
        console.error('Settlement failed:', error);
        res.status(500).json({ error: 'Settlement failed', details: error.message });
    }
});
app.listen(PORT, () => {
    console.log(`Wallet Service running on port ${PORT}`);
});
