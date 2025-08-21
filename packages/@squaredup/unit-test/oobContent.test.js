import { describe, expect, test } from '@jest/globals';
import Ajv from 'ajv';
import fs from 'fs';
import { toIncludeSameMembers } from 'jest-extended';
import path from 'path';
import { codsSchema, dashboardsSchema, scopesSchema } from '../schema/schema.js';
import { DashboardFileSchema } from '../types/dashboardFileSchema.js';
import { loadJsonFromFile, testablePluginFolder } from './util.js';

expect.extend({ toIncludeSameMembers });

export const testIf = (condition, ...args) => (condition && test(...args));
export const describeIf = (condition, ...args) => (condition ? describe(...args) : describe.skip(...args));

const ajv = new Ajv({ allowUnionTypes: true, strict: false });

const validTypes = new Set([
    'app',
    'api',
    'apidomain',
    'apigateway',
    'dnszone',
    'dnsrecord',
    'db',
    'host',
    'monitor',
    'kpi',
    'function',
    'table',
    'storage',
    'cdn',
    'directory',
    'relay',
    'tag',
    'space',
    'scope',
    'dash',
    'cluster',
    'service',
    'loadbalancer',
    'container',
    'workflow',
    'pipeline',
    'organization',
    'unknown'
]);

const checkForHardCodedIds = (filePath) => {
    test('Check for hard coded IDs', () => {
        const rawdata = fs.readFileSync(filePath, 'utf8');
        const rawIds = rawdata.match(/\b(?<RAW>(\w+-[0-9a-f]{20}|node-[0-9a-zA-Z]+-[0-9a-zA-Z]+))\b/giu);
        let problemIds = [];
        if (Array.isArray(rawIds)) {
            const safeIds = ['config-00000000000000000000'];
            problemIds = rawIds.filter((id) => !safeIds.includes(id));
        }
        expect(problemIds).toEqual([]);
    });
};

const checkForUnwantedLimits = (scopesFileContent) => {
    const isScopesArray = Array.isArray(scopesFileContent);
    test('Check if scopes.json is an array', () => {
        expect(isScopesArray).toBe(true);
    });
    test('Check for unwanted limits', () => {
        if (isScopesArray) {
            for (const scope of scopesFileContent) {
                if (Object.hasOwnProperty.call(scope, 'limit') && Object.hasOwnProperty.call(scope, 'variable')) {
                    expect(scope.limit).toBeUndefined();
                }
            }
        }
    });
};

const checkTileValue = (pluginName, dashboardName, tileName, value, allScopes, allDataStreams, allVariables) => {
    if (value == null) {
        return; // null or undefined values don't require further checking
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
        for (const key of Object.keys(value)) {
            checkTileValue(pluginName, dashboardName, tileName, value[key], allScopes, allDataStreams, allVariables);
        }
    } else if (Array.isArray(value)) {
        for (const item of value) {
            checkTileValue(pluginName, dashboardName, tileName, item, allScopes, allDataStreams, allVariables);
        }
    } else if (typeof value === 'string') {
        testIf(
            value.startsWith('config-'),
            `${pluginName} - ${dashboardName} - ${tileName} - ${value} is not a raw config ID`,
            () => {
                expect(value).toBe('config-00000000000000000000');
            }
        );

        test(`${pluginName} - ${dashboardName} - ${tileName} - ${value} is not a hard coded ID`, () => {
            expect(value.startsWith('space-')).toBe(false);
            expect(value.startsWith('scope-')).toBe(false);
        });

        testIf(
            value.startsWith('datastream-'),
            `${pluginName} - ${dashboardName} - ${tileName} - ${value} is a valid datastream ID`,
            () => {
                const allowedIds = ['datastream-health', 'datastream-properties', 'datastream-sql', 'datastream-configurableGremlin'];
                expect(allowedIds).toContain(value);
            }
        );

        testIf(
            value.startsWith('{{{{raw}}}}'),
            `${pluginName} - ${dashboardName} - ${tileName} - ${value} is a valid raw handlebar value`,
            () => {
                expect(value.endsWith('{{{{/raw}}}}')).toBe(true);
            }
        );

        const isMustache = value.startsWith('{{') && value.endsWith('}}');
        let innerValue = isMustache ? value.slice(2, -2) : value;
        testIf(
            isMustache && innerValue.startsWith('scopes.'),
            `${pluginName} - ${dashboardName} - ${tileName} - ${value} is a valid scope reference`,
            () => {
                innerValue = innerValue.replace('scopes.', '');
                if (innerValue.startsWith('[') && innerValue.endsWith(']')) {
                    innerValue = innerValue.substring(1, innerValue.length - 1);
                }

                expect(allScopes).toContain(innerValue);
            }
        );

        testIf(
            isMustache && innerValue.startsWith('dataStreams.'),
            `${pluginName} - ${dashboardName} - ${tileName} - ${value} is a valid datastream reference`,
            () => {
                innerValue = innerValue.replace('dataStreams.', '');
                if (innerValue.startsWith('[') && innerValue.endsWith(']')) {
                    innerValue = innerValue.substring(1, innerValue.length - 1);
                }

                expect(allDataStreams).toContain(innerValue);
            }
        );

        testIf(
            isMustache && innerValue.startsWith('variables.'),
            `${pluginName} - ${dashboardName} - ${tileName} - ${value} is a valid variable reference`,
            () => {
                innerValue = innerValue.replace('variables.', '');
                if (innerValue.startsWith('[') && innerValue.endsWith(']')) {
                    innerValue = innerValue.substring(1, innerValue.length - 1);
                }

                expect(allVariables).toContain(innerValue);
            }
        );
    }
};

const checkTileVizConfig = (pluginName, dashboard, tileName, config) => {
    test(`${pluginName} - ${dashboard.filePath} - checks for redundant visualization configuration in "${tileName}"`, () => {
        const hasRedundantConfig = Boolean(
            config?.visualisation?.config &&
                config?._type === 'tile/data-stream' &&
                Object.keys(config.visualisation?.config).filter((k) => k !== config?.visualisation.type).length > 0
        );

        // TEMPORARY: Branch name check to allow redundant config in main branch
        // Remove this check once all plugins are updated
        if (hasRedundantConfig && process.env.PLUGINSBRANCHNAME === 'main') {
            console.warn(
                `Redundant visualization configuration found in "${tileName}" in ${dashboard.filePath} for plugin ${pluginName}`
            );
        } else if (hasRedundantConfig) {
            const type = [config?.visualisation.type];
            const values = Object.keys(config.visualisation?.config);

            expect(values).toIncludeSameMembers(type);
            console.warn(`Expected: ${type} but found: ${values}`);
        }
    });
};

// const checkTileTitleCase = (pluginName, dashboard, tileName) => {
//     test(`${pluginName} - ${dashboard.filePath} - checks for title case in "${tileName}"`, () => {
//         expect(tileName).toEqual(toTitleCase(tileName));
//     });
// };

const checkTileTimeframes = (pluginName, dashboard) => {
    const tiles = dashboard.dashboard.contents;
    const allTimeframesConsistent = tiles.every(
        (t) =>
            Boolean(t.config.timeframe) &&
            t.config.timeframe === tiles[0].config.timeframe &&
            tiles[0].config.timeframe !== 'none'
    );
    test(`${pluginName} - ${dashboard.filePath} - uses the same timeframe for all tiles`, () => {
        expect(allTimeframesConsistent).toBe(false);
    });
    test(`${pluginName} - ${dashboard.filePath} - uses the same timeframe for all tiles`, () => {
        expect(allTimeframesConsistent).toBe(false);
    });
};

const validateJsonSchema = (filePath, schema) => {
    test(`${filePath} is a valid JSON`, () => {
        const json = loadJsonFromFile(filePath);
        const valid = ajv.validate(schema, json);
        if (!valid) {
            console.error(ajv.errors);
        }
        expect(valid).toBe(true);
    });
};

const readDefaultContent = (folderPath, defaultDashboards = [], defaultCods = [], defaultScopes = []) => {
    const allDefaultContentFiles = fs.readdirSync(folderPath);

    for (const item of allDefaultContentFiles) {
        const itemPath = path.join(folderPath, item);
        if (fs.lstatSync(itemPath).isDirectory()) {
            readDefaultContent(itemPath, defaultDashboards, defaultCods, defaultScopes);
        } else {
            const defaultContentFile = loadJsonFromFile(itemPath);
            if (item.toLowerCase() === 'scopes.json') {
                validateJsonSchema(itemPath, scopesSchema);
                checkForHardCodedIds(itemPath);
                checkForUnwantedLimits(defaultContentFile);
                defaultScopes.push(...defaultContentFile);
            } else if (item.toLowerCase() === 'cods.json') {
                validateJsonSchema(itemPath, codsSchema);
                defaultCods.push(...defaultContentFile);
            } else if (item.toLowerCase().endsWith('.dash.json')) {
                validateJsonSchema(itemPath, dashboardsSchema);
                checkForHardCodedIds(itemPath);
                const dashboard = { ...defaultContentFile, filePath: item };
                defaultDashboards.push(dashboard);
            }
        }
    }

    return { defaultScopes, defaultCods, defaultDashboards };
};

const validateDefaultContent = (pluginToTest) => {
    const defaultContentPath = path.join(pluginToTest.pluginPath, 'DefaultContent');
    const { defaultScopes, defaultCods, defaultDashboards } = readDefaultContent(defaultContentPath);
    const dataStreams = loadJsonFromFile(path.join(pluginToTest.pluginPath, 'data_streams.json'));
    const customTypes = loadJsonFromFile(path.join(pluginToTest.pluginPath, 'custom_types.json'));

    const allScopes = defaultScopes.map((scope) => scope.name);
    const allDataStreams = dataStreams.dataStreams.map((dataStream) => dataStream.definition.name);
    const allVariables = defaultScopes.filter((scope) => Boolean(scope.variable)).map((scope) => scope.variable.name);
    defaultCods.forEach((cod) => {
        allDataStreams.push(`${cod.tplName}___${cod.index}`);
    });
    const allTypes = Array.from(validTypes).concat(customTypes.map((type) => type.type));

    test('Check for scope types', () => {
        for (const scope of defaultScopes) {
            if (typeof scope.matches === 'object') {

                const scopeKeys = Object.keys(scope.matches);
                for(const key of scopeKeys ){
                    if (key === 'type') {
                        if(scope.matches.type.type === 'equals') {
                            expect(allTypes).toContain(scope.matches.type.value);
                        } else {
                            for (const value of scope.matches.type.values) {
                                expect(allTypes).toContain(value);
                            }
                        }
                    } else {
                        if(scope.matches[key].type === 'equals') {
                            expect(typeof scope.matches[key].value).toBe('string');
                        } else {
                            expect(Array.isArray(scope.matches[key].values)).toEqual(true);
                        }
                    }
                }
            }
        }
    });


    defaultDashboards.forEach((dashboard) => {
        // Check dashboard file matches schema
        test.skip('Dashboard files match schema', () => {
            const result = DashboardFileSchema.safeParse(dashboard);
            if (result.error) {
                console.error(`Error in dashboard file ${dashboard.filePath}:`, result.error);
            }
            expect(result.error).toBe(undefined);
        });

        dashboard.dashboard.contents.forEach((tile) => {
            checkTileValue(
                pluginToTest.name,
                dashboard.filePath,
                tile.config.title,
                tile,
                allScopes,
                allDataStreams,
                allVariables
            );
            //checkTileTitleCase(pluginToTest.name, dashboard, tile.config.title);
            checkTileVizConfig(pluginToTest.name, dashboard, tile.config.title, tile.config);
        });
        checkTileTimeframes(pluginToTest.name, dashboard);
    });
};

describe('OOB Content', () => {
    for (let index = 0; index < global.pluginsToTest.length; index++) {
        const pluginToTest = global.pluginsToTest[index];

        const validFolder = testablePluginFolder(pluginToTest.pluginPath);
        // Check if the DefaultContent folder exists
        const defaultContentExists = fs.existsSync(path.join(pluginToTest.pluginPath, 'DefaultContent'));

        if (defaultContentExists) {
            describeIf(validFolder, `${pluginToTest.name}`, () => {
                validateDefaultContent(pluginToTest);
            });
        } else {
            test(`${pluginToTest.name} - DefaultContent folder does not exist`, () => {
                expect(defaultContentExists).toBe(false);
            });
        }
    }
});
