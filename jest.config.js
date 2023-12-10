module.exports = {
    collectCoverage: true,
    moduleNameMapper: {
      'lodash-es': 'lodash',
      objectmodel: 'objectmodel/dist/object-model.cjs',
    },
    preset: 'ts-jest',
    // testTimeout: 90000,
    testEnvironment: 'node',
    testMatch: ['<rootDir>/src/**/*.test.ts'],
};