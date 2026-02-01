export interface ShuffleProof {
    seed: string;
    seedHash: string;
    algorithm: string;
    timestamp: number;
}
export declare class Shuffler {
    private static readonly ALGORITHM;
    /**
     * Deterministic Fisher-Yates shuffle using seeded PRNG
     * Same seed always produces same shuffle order (provably fair)
     */
    static deterministicShuffle<T>(array: T[], seed: string): T[];
    /**
     * Create a seeded PRNG using HMAC-SHA256
     * Cryptographically secure and deterministic
     */
    private static createSeededPRNG;
    /**
     * Generate a cryptographically secure random seed
     */
    static generateSeed(): string;
    /**
     * Generate hash of seed for public verification
     */
    static hashSeed(seed: string): string;
    /**
     * Create a complete shuffle proof for audit/verification
     */
    static createProof(seed: string): ShuffleProof;
    /**
     * Verify that a shuffle matches the claimed seed
     */
    static verifyShuffle<T>(originalOrder: T[], shuffledOrder: T[], seed: string, getKey: (item: T) => string): boolean;
    /**
     * Generate verifiable proof for shuffle
     * Returns hashes that can be verified independently
     * STRICTLY DETERMINISTIC: NO Date.now() inside the hash
     */
    static generateProof(seed: string, shuffleOrder: string[], roundId: string): {
        seedHash: string;
        shuffleHash: string;
        proofHash: string;
    };
    static generateProofHash(seed: string, shuffleOrder: string[], roundId: string): string;
}
