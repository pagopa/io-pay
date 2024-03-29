const typescriptPreset = require('ts-jest/jest-preset');
const puppeteerPreset = require('jest-puppeteer/jest-preset');

module.exports = {
  ...typescriptPreset,
  ...puppeteerPreset,
  testEnvironment: 'jsdom',
  testRegex: '__integrations__.*integration.test.*',
  testPathIgnorePatterns: ['dist', '/node_modules'],
  setupFiles: ['dotenv/config'],
  reporters: [
    'default',
    [ 'jest-junit', {
      outputDirectory: './test_reports',
      outputName: 'io-pay-ui-TEST.xml',
    } ]
  ],
};
