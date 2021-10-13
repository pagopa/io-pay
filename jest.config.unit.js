module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '__test__.*test.*',
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
