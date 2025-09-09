import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { getPluginFolders } from './packages/@squaredup/unit-test/util.js';

const pathArg = process.argv.filter((x) => x.startsWith('--path='))[0];
const pluginPath = pathArg ? pathArg.split('=')[1].replace(/\/$/u, '') : null;

const pluginName = pluginPath ? pluginPath.split('/').slice(-2).join('-') : null;
const testFileName = pluginName ? pluginName : 'all-plugins-test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const directoryPath = path.join(__dirname, './plugins');

const getPlugins = async (pluginPath) => {
    if (pluginPath !== undefined && pluginPath !== null) {
        return [
            {
                name: pluginName,
                pluginPath: pluginPath
            }
        ];
    } else {
        const pluginFolders = await getPluginFolders(directoryPath);
        return pluginFolders;
    }
};

const pluginSpecificTestsPath = pluginPath
    ? `<rootDir>/**/${pluginPath}/**/*.test.{js,jsx,ts,tsx}`
    : '<rootDir>/**/**/**/*.test.{js,jsx,ts,tsx}';

export default async () => {
    return {
        collectCoverageFrom: ['./plugins/**/*.{js,jsx,ts,tsx}'],
        coveragePathIgnorePatterns: ['node_modules', '.mock.ts', 'Mocks.ts'],

        testMatch: [
            '<rootDir>/**/packages/@squaredup/unit-test/**/*.test.{js,jsx,ts,tsx}',
            pluginSpecificTestsPath
        ],

        globals: {
            pluginsToTest: await getPlugins(pluginPath),
            pluginDirectoryPath: directoryPath,
            baseDirectory: __dirname
        },

        testPathIgnorePatterns: [],

        transform: {
            '^.+\\.(t|j)sx?$': [
                '@swc-node/jest',
                {
                    jsx: true,
                    experimentalDecorators: true,
                    emitDecoratorMetadata: true,
                    esModuleInterop: true
                }
            ]
        },
        transformIgnorePatterns: ['/node_modules/(?!serialize-error|@squaredup/plugin-common)'],
        testEnvironment: 'node',

        reporters: [
            'default',
            [
                'jest-html-reporters',
                {
                    publicPath: '<rootDir>/packages/@squaredup/unit-test/test_output/html',
                    filename: testFileName + '.html',
                    expand: true,
                    pageTitle: pluginName ? pluginName : 'All Plugins',
                    inlineSource: true
                }
            ],
            [
                'jest-junit',
                {
                    outputDirectory: '<rootDir>/packages/@squaredup/unit-test/test_output',
                    outputName: testFileName + '.xml',
                    suiteName: 'Plugin Unit Test',
                    noStackTrace: true,
                    ancestorSeparator: ' › ',
                    titleTemplate: '{classname} : {title}',
                    classNameTemplate: '{classname} : {title}'
                }
            ]
        ],

        setupFiles: []
    };
};
