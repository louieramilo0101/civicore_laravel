/** @type {import('@jest/types').Config} Jest environment and transform configuration. */
module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/resources/js/test/setup.js'],
    transform: {
        '^.+\\.[jt]sx?$': 'babel-jest',
    },
    moduleFileExtensions: ['js', 'jsx'],
};
