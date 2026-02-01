"use strict";
// packages/game-engine/src/core/Shuffler.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Shuffler = void 0;
const crypto_1 = __importDefault(require("crypto"));
class Shuffler {
    /**
     * Deterministic Fisher-Yates shuffle using seeded PRNG
     * Same seed always produces same shuffle order (provably fair)
     */
    static deterministicShuffle(array, seed) {
        const result = [...array];
        const prng = this.createSeededPRNG(seed);
        // Fisher-Yates shuffle
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(prng() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }
    /**
     * Create a seeded PRNG using HMAC-SHA256
     * Cryptographically secure and deterministic
     */
    static createSeededPRNG(seed) {
        let state = seed;
        let counter = 0;
        return () => {
            // Generate next state using HMAC
            state = crypto_1.default
                .createHmac('sha256', state)
                .update(`${counter++}`)
                .digest('hex');
            // Convert first 8 hex chars to float [0, 1)
            const value = parseInt(state.slice(0, 8), 16);
            return value / 0xffffffff;
        };
    }
    /**
     * Generate a cryptographically secure random seed
     */
    static generateSeed() {
        const timestamp = Date.now().toString();
        const random = crypto_1.default.randomBytes(32).toString('hex');
        const combined = `${timestamp}:${random}:${process.hrtime.bigint()}`;
        return crypto_1.default
            .createHash('sha256')
            .update(combined)
            .digest('hex');
    }
    /**
     * Generate hash of seed for public verification
     */
    static hashSeed(seed) {
        return crypto_1.default.createHash('sha256').update(seed).digest('hex');
    }
    /**
     * Create a complete shuffle proof for audit/verification
     */
    static createProof(seed) {
        return {
            seed,
            seedHash: this.hashSeed(seed),
            algorithm: this.ALGORITHM,
            timestamp: Date.now(),
        };
    }
    /**
     * Verify that a shuffle matches the claimed seed
     */
    static verifyShuffle(originalOrder, shuffledOrder, seed, getKey) {
        const expectedShuffle = this.deterministicShuffle(originalOrder, seed);
        if (expectedShuffle.length !== shuffledOrder.length)
            return false;
        for (let i = 0; i < expectedShuffle.length; i++) {
            if (getKey(expectedShuffle[i]) !== getKey(shuffledOrder[i])) {
                return false;
            }
        }
        return true;
    }
    /**
     * Generate verifiable proof for shuffle
     * Returns hashes that can be verified independently
     * STRICTLY DETERMINISTIC: NO Date.now() inside the hash
     */
    static generateProof(seed, shuffleOrder, roundId) {
        const seedHash = crypto_1.default.createHash('sha256').update(seed).digest('hex');
        const shuffleHash = crypto_1.default.createHash('sha256').update(shuffleOrder.join(',')).digest('hex');
        const proofHash = crypto_1.default.createHash('sha256').update(`${seedHash}:${shuffleHash}:${roundId}`).digest('hex');
        return { seedHash, shuffleHash, proofHash };
    }
    // Deprecated: Kept for compatibility if needed, but redirects to new logic
    static generateProofHash(seed, shuffleOrder, roundId) {
        return this.generateProof(seed, shuffleOrder, roundId).proofHash;
    }
}
exports.Shuffler = Shuffler;
Shuffler.ALGORITHM = 'HMAC-SHA256-DRBG';
