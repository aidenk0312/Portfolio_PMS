/** @type {import('jest').Config} */
module.exports = {
    rootDir: '.',
    testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            { tsconfig: '<rootDir>/tsconfig.jest.json', diagnostics: { warnOnly: false } }
        ]
    },
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
    verbose: true,
    collectCoverage: false
};