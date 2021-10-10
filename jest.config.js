/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^part:@sanity/base/schema$': '<rootDir>/test/mocks/schema.js',
  }
};
