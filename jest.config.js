import path, { dirname } from 'path';
import { getPluginFolders } from './pluginUnitTests/util.js';
import { fileURLToPath } from 'url';

const pathArg = process.argv.filter((x) => x.startsWith('--path='))[0];
const pluginPath = pathArg ? pathArg.split('=')[1] : null;

const pluginNameArg = process.argv.filter((x) => x.startsWith('--pluginName='))[0];
const pluginName = pluginNameArg ? pluginNameArg.split('=')[1] : null;
const testFileName = pluginName ? pluginName + '.xml' : 'junit-test.xml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const directoryPath = path.join(__dirname, './plugins');

const getPlugins = async (pluginPath) => {
    if (pluginPath !== undefined && pluginPath !== null) {
        return [{
            name: pluginName,
            pluginPath: pluginPath
        }];
    }
    else {
        return await getPluginFolders(directoryPath);
    }
};

export default async () => {
    return {
        collectCoverageFrom: ['./plugins/**/*.{js,jsx,ts,tsx}'],
        coveragePathIgnorePatterns: ['node_modules', '.mock.ts', 'Mocks.ts'],

        testMatch: [
            '<rootDir>/**/pluginCommonUnitTests/**/*.{spec,test}.{js,jsx,ts,tsx}',
            '<rootDir>/**/pluginUnitTests/**/*.{spec,test}.{js,jsx,ts,tsx}'
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
        transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\].+\\.(js|jsx|ts|tsx)$'],
        testEnvironment: 'node',

        reporters: [
            'default',
            [
                'jest-html-reporters',
                {
                    publicPath: 'pluginUnitTests/test_output/html',
                    filename: pluginName + '.html',
                    expand: true,
                    pageTitle: pluginName,
                    inlineSource: true
                }
            ],
            [
                'jest-junit',
                {
                    outputDirectory: 'pluginUnitTests/test_output',
                    outputName: testFileName,
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
