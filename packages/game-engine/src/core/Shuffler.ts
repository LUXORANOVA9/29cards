// packages/game-engine/src/core/Shuffler.ts

import crypto from 'crypto';

export interface ShuffleProof {
  seed: string;
  seedHash: string;
  algorithm: string;
  timestamp: number;
}

export class Shuffler {
  private static readonly ALGORITHM = 'HMAC-SHA256-DRBG';

  /**
   * Deterministic Fisher-Yates shuffle using seeded PRNG
   * Same seed always produces same shuffle order (provably fair)
   */
  static deterministicShuffle<T>(array: T[], seed: string): T[] {
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
  private static createSeededPRNG(seed: string): () => number {
    let state = seed;
    let counter = 0;

    return (): number => {
      // Generate next state using HMAC
      state = crypto
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
  static generateSeed(): string {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(32).toString('hex');
    const combined = `${timestamp}:${random}:${process.hrtime.bigint()}`;

    return crypto
      .createHash('sha256')
      .update(combined)
      .digest('hex');
  }

  /**
   * Generate hash of seed for public verification
   */
  static hashSeed(seed: string): string {
    return crypto.createHash('sha256').update(seed).digest('hex');
  }

  /**
   * Create a complete shuffle proof for audit/verification
   */
  static createProof(seed: string): ShuffleProof {
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
  static verifyShuffle<T>(
    originalOrder: T[],
    shuffledOrder: T[],
    seed: string,
    getKey: (item: T) => string
  ): boolean {
    const expectedShuffle = this.deterministicShuffle(originalOrder, seed);

    if (expectedShuffle.length !== shuffledOrder.length) return false;

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
  static generateProof(seed: string, shuffleOrder: string[], roundId: string) {
    const seedHash = crypto.createHash('sha256').update(seed).digest('hex');
    const shuffleHash = crypto.createHash('sha256').update(shuffleOrder.join(',')).digest('hex');
    const proofHash = crypto.createHash('sha256').update(`${seedHash}:${shuffleHash}:${roundId}`).digest('hex');
    
    return { seedHash, shuffleHash, proofHash };
  }

  // Deprecated: Kept for compatibility if needed, but redirects to new logic
  static generateProofHash(seed: string, shuffleOrder: string[], roundId: string): string {
    return this.generateProof(seed, shuffleOrder, roundId).proofHash;
  }
}
