const typescriptPreset = require('ts-jest/jest-preset');
const puppeteerPreset = require('jest-puppeteer/jest-preset');

module.exports = {
  ...typescriptPreset,
  ...puppeteerPreset,
  //preset: 'ts-jest',
  // testEnvironment: 'node',
  testPathIgnorePatterns: ['dist', '/node_modules'],
};
