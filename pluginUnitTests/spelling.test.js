import { describe, expect, test } from '@jest/globals';
import fs from 'fs';
import { safeLoadJsonFromFile, testablePluginFolder } from './util.js';
import {
    validateText,
    combineTextAndLanguageSettings,
    finalizeSettings,
    getDefaultSettings,
    readSettings,
    mergeSettings
} from 'cspell-lib';
import path from 'path';

export const testIf = (condition, ...args) => (condition ? test(...args) : test.skip(...args));
export const describeIf = (condition, ...args) => (condition ? describe(...args) : describe.skip(...args));

const spellCheckerFactory = async (pluginToTest) => {
    let settings = {
        ...getDefaultSettings(),
        enabledLanguageIds: []
    };

    // Get global allowed words
    const cspellConfigFileName = './cspell.json';
    const globalCspellConfigPath = path.join(global.baseDirectory, cspellConfigFileName);
    settings = mergeSettings(settings, readSettings(globalCspellConfigPath));

    // Get plugin-specific allowed words (if any)
    const cspellConfigPath = path.join(pluginToTest.pluginPath, cspellConfigFileName);
    if (fs.existsSync(cspellConfigPath)) {
        settings = mergeSettings(settings, readSettings(cspellConfigPath));
    }

    const fileSettings = combineTextAndLanguageSettings(settings, '', ['plaintext']);
    const finalSettings = finalizeSettings(fileSettings);

    return async (phrase) => {
        return await validateText(phrase, finalSettings, { generateSuggestions: true });
    };
};

const checkUiJson = (pluginToTest, uiConfig) => {
    if (Array.isArray(uiConfig)) {
        uiConfig.forEach((uiElement) => {
            describe(`${uiElement.name}`, () => {
                checkText(pluginToTest, 'Label', uiElement.label);
                checkText(pluginToTest, 'Title', uiElement.title);
                checkText(pluginToTest, 'Help', uiElement.help);
            });
        });
    }
};

const checkCustomTypesJson = (pluginToTest, customTypeConfig) => {
    if (Array.isArray(customTypeConfig)) {
        customTypeConfig.forEach((customType) => {
            describe(`${customType.name}`, () => {
                checkText(pluginToTest, 'Name', customType.name);
                checkText(pluginToTest, 'Singular', customType.singular);
                checkText(pluginToTest, 'Plural', customType.plural);
            });
        });
    }
};

const checkDataStreamJson = (pluginToTest, dataStreamConfig) => {
    describe('Data Sources', () => {
        if (Array.isArray(dataStreamConfig?.dataSources)) {
            dataStreamConfig.dataSources.forEach((dataSource) => {
                describe(`${dataSource.name}`, () => {
                    checkText(pluginToTest, 'Name', dataSource.name);
                    checkText(pluginToTest, 'Display Name', dataSource.displayName);
                    checkText(pluginToTest, 'Description', dataSource.description);
                });
            });
        }
    });

    describe('Data Streams', () => {
        if (Array.isArray(dataStreamConfig?.dataStreams)) {
            dataStreamConfig.dataStreams.forEach((dataStream) => {
                describe(`${dataStream.displayName}`, () => {
                    checkText(pluginToTest, 'Display Name', dataStream.displayName);
                    checkText(pluginToTest, 'Description', dataStream.description);
                });
            });
        }
    });
};

const checkMetadataJson = (pluginToTest, metadataConfig) => {
    checkText(pluginToTest, 'Name', metadataConfig?.name);
    checkText(pluginToTest, 'Display Name', metadataConfig?.displayName);
    checkText(pluginToTest, 'Description', metadataConfig?.description);
    checkText(pluginToTest, 'Category', metadataConfig?.category);
};

const checkText = (pluginToTest, textName, text) => {
    testIf(text, `${textName}`, async () => {
        const spellChecker = await spellCheckerFactory(pluginToTest);
        const typos = await spellChecker(text);
        const results = typos
            .map(function (t) {
                return t.text;
            })
            .join();
        expect(results).toBe('');
    });
};

describe('Spelling', () => {
    for (let index = 0; index < global.pluginsToTest.length; index++) {
        const pluginToTest = global.pluginsToTest[index];
        const validFolder = testablePluginFolder(pluginToTest.pluginPath);

        describeIf(validFolder, `${pluginToTest.name}`, () => {
            const uiConfig = safeLoadJsonFromFile(path.join(pluginToTest.pluginPath, 'ui.json'));
            describeIf(uiConfig.fileLoadSuccess, 'UI', () => {
                checkUiJson(pluginToTest, uiConfig.fileContent);
            });

            const metadataConfig = safeLoadJsonFromFile(path.join(pluginToTest.pluginPath, 'metadata.json'));
            describeIf(metadataConfig.fileLoadSuccess, 'Metadata', () => {
                checkMetadataJson(pluginToTest, metadataConfig.fileContent);
            });

            const dataStreamsConfig = safeLoadJsonFromFile(path.join(pluginToTest.pluginPath, 'data_streams.json'));
            describeIf(dataStreamsConfig.fileLoadSuccess, 'Data Streams', () => {
                checkDataStreamJson(pluginToTest, dataStreamsConfig.fileContent);
            });

            const customTypesConfig = safeLoadJsonFromFile(path.join(pluginToTest.pluginPath, 'custom_types.json'));
            describeIf(customTypesConfig.fileLoadSuccess, 'Custom Types', () => {
                checkCustomTypesJson(pluginToTest, customTypesConfig.fileContent);
            });
        });
    }
});
