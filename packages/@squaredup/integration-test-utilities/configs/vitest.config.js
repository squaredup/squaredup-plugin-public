import { defineConfig } from 'vitest/config';

export default (displayName = 'Default') =>
    defineConfig({
        test: {
            include: ['integrationTests/**/*.spec.js'],
            testTimeout: 6000000,
            hookTimeout: 6000000,
            reporters: [
                'default',
                'junit', 
                [
                    'allure-vitest/reporter',
                    {
                      resultsDir: 'allure-results'
                    }
                  ]
            ],
            outputFile: {
                junit: `<rootDir>/../../../../packages/@squaredup/integration-test-utilities/reports/junit/${displayName}-Integration-Test-report.xml`
            }
        }
    });