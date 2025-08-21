import { describe, expect, test } from '@jest/globals';
import { toBeEmpty } from 'jest-extended';
import { safeLoadJsonFromFile, testablePluginFolder } from './util';
import path from 'path';
import { DataStreamFileSchema } from '../types/dataStreamFileSchema';

expect.extend({ toBeEmpty });

export const testIf = (condition, ...args) => condition ? test(...args) : test.skip(...args);
export const describeIf = (condition, ...args) => condition ? describe(...args) : describe.skip(...args);

describe('Data Stream Typing', () => {
    for ( let index = 0; index < global.pluginsToTest.length; index++) {
        const pluginToTest = global.pluginsToTest[index];
        const validFolder = testablePluginFolder(pluginToTest.pluginPath);
        
        
        describeIf(validFolder, `${pluginToTest.name}`, () => {
            const dataStreamsConfig = safeLoadJsonFromFile(path.join(pluginToTest.pluginPath, 'data_streams.json'));
            test('Data Streams match schema', () => {
                const result = DataStreamFileSchema.safeParse(dataStreamsConfig.fileContent);
                const issues = result.error?.issues ?? [];

                expect(issues).toBeEmpty();
            });
        });
    }
});