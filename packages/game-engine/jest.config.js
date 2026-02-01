/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    // Match test files in src/tests
    testMatch: ['**/src/tests/**/*.test.ts'],
};
