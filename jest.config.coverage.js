const typescriptPreset = require('ts-jest/jest-preset');
const puppeteerPreset = require('jest-puppeteer/jest-preset');

module.exports = {
  ...typescriptPreset,
  ...puppeteerPreset,
  testRegex: '__integrations__.*integration.test.*|__test__.*test.*',
  testPathIgnorePatterns: ['dist', '/node_modules'],
  setupFiles: ['dotenv/config'],
  reporters: [
    'default',
    [ 'jest-junit', {
      outputDirectory: './test_reports',
      outputName: 'io-pay-ui-TEST.xml',
    } ]
  ],
  coverageReporters: ["cobertura"],
};
