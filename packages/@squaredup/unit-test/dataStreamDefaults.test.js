import { describe, expect, test } from '@jest/globals';
import stringify from 'fast-json-stable-stringify';
import { toBeEmpty } from 'jest-extended';
import get from 'lodash.get';
import path from 'path';
import { DataStreamFileSchema } from '../types/dataStreamFileSchema';
import { safeLoadJsonFromFile, testablePluginFolder } from './util';

expect.extend({ toBeEmpty });

export const testIf = (condition, ...args) => condition ? test(...args) : test.skip(...args);
export const describeIf = (condition, ...args) => condition ? describe(...args) : describe.skip(...args);

describe('Data Stream dataSourceConfig defaults', () => {
    let testCount = 0;
    for ( let index = 0; index < global.pluginsToTest.length; index++) {
        const pluginToTest = global.pluginsToTest[index];
        const validFolder = testablePluginFolder(pluginToTest.pluginPath);

        if (validFolder) {
            const dataStreamsConfig = safeLoadJsonFromFile(path.join(pluginToTest.pluginPath, 'data_streams.json'));
            const result = DataStreamFileSchema.safeParse(dataStreamsConfig.fileContent);
            const cods = result.success
                ? result.data.dataStreams.filter((ds) => !ds.definition.options?.noMatch && Array.isArray(ds.template))
                : [];

            for (const cod of cods) {
                testCount++;
                test(`${pluginToTest.name} configurable data stream "${cod.displayName}" dataSourceConfig default values correct`, () => {
                    const checkFields = (fields, issues) => {
                        for (const field of fields) {
                            if (field.type !== 'fieldGroup') {
                                if (Object.prototype.hasOwnProperty.call(field, 'defaultValue') &&
                                    stringify(get(cod.definition.dataSourceConfig, field.name)) !== stringify(field.defaultValue)) {
                                    issues.push(`Field ${field.name} has default value '${JSON.stringify(field.defaultValue)}' but dataSourceConfig has '${JSON.stringify(get(cod.definition.dataSourceConfig, field.name))}'`);
                                }
                            } else {
                                let visible;
                                if (field.visible === true || field.visible === 'true' || field.visible === 'all') {
                                    visible = true;
                                } else if (typeof field.visible === 'object') {
                                    const isMatch = (spec) => {
                                        if (!spec) {
                                            throw new Error('bad value for fieldGroup.visible');
                                        }
                                        if (Array.isArray(spec)) {
                                            return spec.some((s) => isMatch(s));
                                        }
                                        let thisMatch = true;
                                        for (const [key, value] of Object.entries(spec)) {
                                            if (typeof value === 'string') {
                                                if (cod.definition.dataSourceConfig[key] !== value) {
                                                    thisMatch = false;
                                                    break;
                                                }
                                            } else if (typeof value === 'object' && value !== null) {
                                                if (value.type === 'equals') {
                                                    if (cod.definition.dataSourceConfig[key] !== value.value) {
                                                        thisMatch = false;
                                                        break;
                                                    }
                                                } else if (value.type === 'regex') {
                                                    if (typeof cod.definition.dataSourceConfig[key] !== 'string') {
                                                        thisMatch = false;
                                                        break;
                                                    }
                                                    if (!cod.definition.dataSourceConfig[key].match(value.pattern)) {
                                                        thisMatch = false;
                                                        break;
                                                    }
                                                } else if (value.type === 'oneOf') {
                                                    if (typeof cod.definition.dataSourceConfig[key] !== 'string') {
                                                        thisMatch = false;
                                                        break;
                                                    }
                                                    if (!value.values.some((v) => v === cod.definition.dataSourceConfig[key])) {
                                                        thisMatch = false;
                                                        break;
                                                    }
                                                } else {
                                                    throw new Error('bad value for fieldGroup.visible');
                                                }
                                            } else {
                                                throw new Error('bad value for fieldGroup.visible');
                                            }
                                        }
                                        return thisMatch;
                                    };
                                    visible = isMatch(field.visible);
                                }
                                if (visible) {
                                    checkFields(field.fields, issues);
                                }
                            }
                        }
                    };
                    expect(typeof cod.definition.dataSourceConfig).toBe('object');
                    expect(cod.definition.dataSourceConfig).not.toBeNull();

                    const issues = [];
                    checkFields(cod.template, issues);
                    expect(issues).toBeEmpty();
                });
            }
        }
        // If there are no configurable datastreams (case for some plugins) the test fails
        // So we'll skip them. 
        if (testCount === 0) {
            test('No configurable data streams found, skipping real tests', () => {
                expect(true).toBe(true);
            });
        }
    }
});