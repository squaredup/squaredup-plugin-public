import { describe, expect, test } from '@jest/globals';
import { ESLint } from 'eslint';
import fs from 'fs';
import path from 'path';
import { safeLoadJsonFromFile, testablePluginFolder } from './util.js';

export const testIf = (condition, ...args) => (condition ? test(...args) : test.skip(...args));
export const describeIf = (condition, ...args) => (condition ? describe(...args) : describe.skip(...args));

const checkFileForConsoleFunctions = async (filePattern) => {
    const eslintOptions = {
        useEslintrc: false,
        overrideConfig: {
            parser: '@babel/eslint-parser',
            parserOptions: {
                requireConfigFile: false,
                es2021: true
            },
            rules: {
                'no-console': 'error'
            }
        }
    };

    const eslint = new ESLint(eslintOptions);
    const results = await eslint.lintFiles([filePattern]);
    return results;
};

const standardLintErrors = async (filePattern) => {
    const eslint = new ESLint();
    const results = await eslint.lintFiles([filePattern]);
    return results;
};

const getAllFiles = function (dirPath, arrayOfFiles) {
    let files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + '/' + file).isDirectory()) {
            if (file !== 'node_modules') {
                arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
            }
        } else {
            arrayOfFiles.push(path.join(dirPath, '/', file));
        }
    });

    return arrayOfFiles.filter(file => file.endsWith('.js') && !file.endsWith('.spec.js'));
};

describe('Code Quality', () => {
    global.pluginsToTest.forEach((pluginToTest) => {
        const validFolder = testablePluginFolder(pluginToTest.pluginPath);
        describeIf(validFolder, `${pluginToTest.name}`, () => {
            if (validFolder) {
                const metadata = safeLoadJsonFromFile(path.join(pluginToTest.pluginPath, 'metadata.json')).fileContent;
                const onPremCapable = metadata.type === 'onprem' || metadata.type === 'hybrid';

                getAllFiles(pluginToTest.pluginPath).forEach((pluginScriptFile) => {
                    describe(`${pluginScriptFile.replace(pluginToTest.pluginPath, '')}`, () => {
                        testIf(onPremCapable, 'No Console Functions', async () => {
                            let consoleUsage = await checkFileForConsoleFunctions(pluginScriptFile);
                            consoleUsage.forEach((item) => {
                                delete item.source;
                            });

                            expect(consoleUsage).toMatchObject(
                                expect.arrayContaining([
                                    expect.objectContaining({
                                        errorCount: 0
                                    })
                                ])
                            );
                        });
                        test.skip('ESLint Errors', async () => {
                            let lintErrors = await standardLintErrors(pluginScriptFile);
                            lintErrors.forEach((item) => {
                                delete item.source;
                            });

                            expect(lintErrors).toMatchObject(
                                expect.arrayContaining([
                                    expect.objectContaining({
                                        errorCount: 0
                                    })
                                ])
                            );
                        });
                    });
                });

                test.todo('Create PowerShell Code Quality Tests');
            }
        });
    });
});
