const typescriptPreset = require('ts-jest/jest-preset');
const puppeteerPreset = require('jest-puppeteer/jest-preset');

module.exports = {
  ...typescriptPreset,
  ...puppeteerPreset,
  testRegex: '__integrations__.*integration.test.*',
  testPathIgnorePatterns: ['dist', '/node_modules'],
  setupFiles: ['dotenv/config'],
};
