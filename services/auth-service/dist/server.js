"use strict";
// services/auth-service/src/server.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const zod_1 = require("zod");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
});
app.use(limiter);
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 login/register requests per hour
    message: 'Too many auth requests from this IP, please try again after an hour',
});
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
// Zod Schemas
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().min(10).optional(),
    password: zod_1.z.string().min(6),
    panelId: zod_1.z.string().uuid().optional(),
    brokerId: zod_1.z.string().uuid().optional(),
}).refine(data => data.email || data.phone, {
    message: "Either email or phone must be provided",
    path: ["email", "phone"],
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().min(10).optional(),
    password: zod_1.z.string().min(1),
}).refine(data => data.email || data.phone, {
    message: "Either email or phone must be provided",
    path: ["email", "phone"],
});
// ==================== HELPERS ====================
function generateTokens(payload) {
    const accessToken = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = jsonwebtoken_1.default.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
    return { accessToken, refreshToken };
}
// ==================== ROUTES ====================
// Register
app.post('/api/v1/auth/register', authLimiter, async (req, res) => {
    try {
        const validation = registerSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error });
        }
        const { email, phone, password, panelId, brokerId } = validation.data;
        // Check existing user
        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    email ? { email } : {},
                    phone ? { phone } : {},
                ].filter(o => Object.keys(o).length > 0),
            },
        });
        if (existing) {
            return res.status(409).json({ error: 'User already exists' });
        }
        // Hash password
        const passwordHash = await bcrypt_1.default.hash(password, 12);
        // Create user (Always PLAYER)
        const user = await prisma.user.create({
            data: {
                id: (0, uuid_1.v4)(),
                email,
                phone,
                passwordHash,
                role: 'PLAYER',
                panelId,
                brokerId,
            },
        });
        // Create wallet for player
        await prisma.wallet.create({
            data: {
                id: (0, uuid_1.v4)(),
                userId: user.id,
            },
        });
        // Generate tokens
        const tokens = generateTokens({
            userId: user.id,
            role: user.role,
            panelId: user.panelId,
        });
        // Store session
        await prisma.session.create({
            data: {
                id: (0, uuid_1.v4)(),
                userId: user.id,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        return res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                role: user.role,
            },
            ...tokens,
        });
    }
    catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({ error: 'Registration failed' });
    }
});
// Login
app.post('/api/v1/auth/login', authLimiter, async (req, res) => {
    try {
        const validation = loginSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error });
        }
        const { email, phone, password } = validation.data;
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    email ? { email } : {},
                    phone ? { phone } : {},
                ].filter(o => Object.keys(o).length > 0),
            },
        });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const validPassword = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (user.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Account suspended' });
        }
        const tokens = generateTokens({
            userId: user.id,
            role: user.role,
            panelId: user.panelId,
        });
        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: {
                lastLoginAt: new Date(),
                lastLoginIp: req.ip,
            },
        });
        return res.json({
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
            ...tokens,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Login failed' });
    }
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
});
