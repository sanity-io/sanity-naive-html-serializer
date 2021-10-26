/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  verbose: false,
  silent: false,
  moduleNameMapper: {
    '^part:@sanity/base/schema$': '<rootDir>/test/__mocks__/schema.ts'
  }
};
