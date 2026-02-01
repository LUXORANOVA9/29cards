// packages/game-engine/src/tests/FestivalLogic.test.ts

import { CardUtils } from '../core/Card';
import { Phase3Logic } from '../festival/Phase3_Lowest';
import { Phase4Logic } from '../festival/Phase4_Joker';

describe('Festival Mode Logic', () => {

    describe('Phase 3: Lowest Wins', () => {
        it('should correctly evaluate value as 1000 - sum', () => {
            // 2+2+2 = 6. Value = 994
            const cards = [
                CardUtils.create(2, '♠'),
                CardUtils.create(2, '♥'),
                CardUtils.create(2, '♣'),
            ];
            const result = Phase3Logic.evaluate(cards);
            expect(result.sum).toBe(6);
            expect(result.evaluation.value).toBe(994);
        });

        it('should rate lower sum higher than high sum', () => {
            // Hand A: 2,2,2 (Sum 6) -> Value 994
            const handA = [
                CardUtils.create(2, '♠'),
                CardUtils.create(2, '♥'),
                CardUtils.create(2, '♣'),
            ];
            // Hand B: 8,8,8 (Sum 24) -> Value 976
            const handB = [
                CardUtils.create(8, '♠'),
                CardUtils.create(8, '♥'),
                CardUtils.create(8, '♣'),
            ];

            const resA = Phase3Logic.evaluate(handA);
            const resB = Phase3Logic.evaluate(handB);

            expect(resA.evaluation.value).toBeGreaterThan(resB.evaluation.value);
        });
    });

    describe('Phase 4: Joker Variation', () => {
        it('should treat Joker rank as 0 value', () => {
            const jokerRank = 8;
            // Hand: 8, 2, 3. Sum = 0 + 2 + 3 = 5.
            const cards = [
                CardUtils.create(8, '♠'),
                CardUtils.create(2, '♥'),
                CardUtils.create(3, '♣'),
            ];

            const result = Phase4Logic.evaluate(cards, jokerRank);
            expect(result.hasJoker).toBe(true);
            expect(result.sum).toBe(5);
            expect(result.evaluation.value).toBe(995); // 1000 - 5
        });

        it('should calculate correctly without jokers', () => {
            const jokerRank = 8;
            // Hand: 2, 2, 2. Sum = 6.
            const cards = [
                CardUtils.create(2, '♠'),
                CardUtils.create(2, '♥'),
                CardUtils.create(2, '♣'),
            ];

            const result = Phase4Logic.evaluate(cards, jokerRank);
            expect(result.hasJoker).toBe(false);
            expect(result.sum).toBe(6);
            expect(result.evaluation.value).toBe(994); // 1000 - 6
        });

        it('should handle multiple jokers', () => {
            const jokerRank = 5;
            // Hand: 5, 5, 5. Sum = 0. Best hand.
            const cards = [
                CardUtils.create(5, '♠'),
                CardUtils.create(5, '♥'),
                CardUtils.create(5, '♣'),
            ];

            const result = Phase4Logic.evaluate(cards, jokerRank);
            expect(result.sum).toBe(0);
            expect(result.evaluation.value).toBe(1000);
        });
    });
});
