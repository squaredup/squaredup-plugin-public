import { describe, expect, test } from '@jest/globals';
import {
    combineTextAndLanguageSettings,
    finalizeSettings,
    getDefaultSettings,
    mergeSettings,
    readSettings,
    validateText
} from 'cspell-lib';
import fs from 'fs';
import path from 'path';
import { safeLoadJsonFromFile, testablePluginFolder } from './util.js';

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
                checkText(pluginToTest, 'Placeholder', uiElement.placeholder);
                // If fieldGroup check all fields
                if (uiElement.type === 'fieldGroup') {
                    for (const field of uiElement.fields) {
                        const checkField = (field) => {
                            checkText(pluginToTest, 'Label', field.label);
                            checkText(pluginToTest, 'Title', field.title);
                            checkText(pluginToTest, 'Help', field.help);
                            if (field.fields) {
                                field.fields.forEach((subField) => {
                                    checkField(subField);
                                });
                            }
                        };
                        checkField(field);
                    }
                }
                // If radio check all options
                if (uiElement.type === 'radio') {
                    uiElement.options.forEach((option) => {
                        checkText(pluginToTest, 'Label', option.label);
                        checkText(pluginToTest, 'Value', option.value.toString());
                    });
                }
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

                    if (Array.isArray(dataStream.definition?.metadata)) {
                        dataStream.definition.metadata.forEach((column) => {
                            checkText(pluginToTest, `Metadata Column (${column.name})`, column.displayName);
                        });
                    }
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

    if (Array.isArray(metadataConfig?.links)) {
        metadataConfig.links.forEach((link) => {
            checkText(pluginToTest, `Link Label (${link.url})`, link.label);
        });
    }

    if (metadataConfig?.actions) {
        Object.keys(metadataConfig.actions).forEach((action) => {
            checkText(pluginToTest, `Action (${action})`, action);
        });
    }
};
const checkScopesJson = (pluginToTest, scopesConfig) => {
    checkText(pluginToTest, 'Name', scopesConfig?.name);
};

const checkDashboardsJson = (pluginToTest, dashboardsConfig) => {
    checkText(pluginToTest, 'Name', dashboardsConfig?.name);
    for (const tile of dashboardsConfig?.dashboard?.contents ?? []) {
        checkText(pluginToTest, 'Title', tile.config.title);
        if (tile.config.description) {
            checkText(pluginToTest, 'Description', tile.config.description);
        }
        if (tile.config._type === 'tile/text') {
            checkText(pluginToTest, 'Content', tile.config.visualisation.config.content);
        }
    }
};

const listDashboardsJson = (folderPath) => {
    let dashboards = [];
    const allDefaultContentFiles = fs.readdirSync(folderPath);
    for (const item of allDefaultContentFiles) {
        const itemPath = path.join(folderPath, item);
        if (fs.lstatSync(itemPath).isDirectory()) {
            dashboards = dashboards.concat(listDashboardsJson(itemPath));
        } else {
            if (item.toLowerCase().endsWith('.dash.json')) {
                dashboards.push(itemPath);
            }
        }
    }
    return dashboards;
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

        const defaultContentExists = fs.existsSync(path.join(pluginToTest.pluginPath, 'DefaultContent'));
        describeIf(validFolder && defaultContentExists, `${pluginToTest.name}`, () => {
            const scopesConfig = safeLoadJsonFromFile(
                path.join(pluginToTest.pluginPath, 'DefaultContent', 'scopes.json')
            );
            describeIf(scopesConfig.fileLoadSuccess, 'Scopes', () => {
                checkScopesJson(pluginToTest, scopesConfig.fileContent);
            });

            const dashboards = defaultContentExists
                ? listDashboardsJson(path.join(pluginToTest.pluginPath, 'DefaultContent'))
                : [];
            describeIf(dashboards.length > 0, 'Dashboards', () => {
                dashboards.forEach((dashboard) => {
                    const dashboardConfig = safeLoadJsonFromFile(dashboard);
                    describeIf(dashboardConfig.fileLoadSuccess, `${dashboardConfig.fileContent.name}`, () => {
                        checkDashboardsJson(pluginToTest, dashboardConfig.fileContent);
                    });
                });
            });
        });
    }
});
