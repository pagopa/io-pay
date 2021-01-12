
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: "__test__.*test.*",
  testPathIgnorePatterns: ['dist', '/node_modules'],
};
