/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    // Match test files in the root directory
    testMatch: ['**/test-game-engine.test.ts'],
};
