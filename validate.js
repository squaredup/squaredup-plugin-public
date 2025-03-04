import Ajv from 'ajv';
import chalk from 'chalk';
import cp from 'child_process';
import {
    combineTextAndLanguageSettings,
    finalizeSettings,
    getDefaultSettings,
    mergeSettings,
    readSettings,
    validateText
} from 'cspell-lib';
import {
    differenceInHours,
    endOfMonth,
    endOfQuarter,
    endOfYear,
    fromUnixTime,
    getUnixTime,
    startOfMonth,
    startOfQuarter,
    startOfYear,
    subDays,
    subHours,
    subMonths,
    subQuarters,
    subYears
} from 'date-fns';
import fs from 'fs';
import inquirer from 'inquirer';
import os from 'os';
import path, { dirname } from 'path';
import { exit } from 'process';
import requestPromise from 'request-promise';
import slugify from 'slugify';
import { titleCase } from 'title-case';
import { fileURLToPath, pathToFileURL } from 'url';
import util from 'util';
import {
    codsSchema,
    customTypesSchema,
    dashboardsSchema,
    dataStreamsSchema,
    metadataSchema,
    payloadSchema,
    scopesSchema,
    uiSchema
} from './schema.js';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ajv = new Ajv({ allowUnionTypes: true, strict: false });

const exec = util.promisify(cp.exec);
const readDir = util.promisify(fs.readdir);

const directoryPath = path.join(__dirname, 'plugins');

const maxImportPayloadSize = 2 * 1024 * 1024;
const prodEnvPluginsRefUrl = 'https://squaredup.com/cloud/pluginexport';
// build up an array of any errors as the integration tests run
export const automationErrors = [];

let pluginPath;
let warningCount = 0;
let errorCount = 0;

let handler;
let metadata;
let pluginConfig;
let globalNodeId = 0;
let pluginName;
let intTestRun = false;
export let testResult;
const importedGraph = {
    vertices: [],
    edges: []
};

const handlerFileName = 'handler.js';
const packageFileName = 'package.json';
// Files required for plugin to work
const requiredFiles = ['metadata.json', 'ui.json', 'data_streams.json'];

// Optional configuration files
const optionalFiles = [handlerFileName, 'custom_types.json', 'default_content.json'];

const jsonSchemas = {
    'metadata.json': metadataSchema,
    'custom_types.json': customTypesSchema,
    'ui.json': uiSchema,
    'data_streams.json': dataStreamsSchema
};

// Return path for file
const getPluginFilePath = (file) => path.join(pluginPath, file);

// Return JSON from loaded file
export const loadJsonFromFile = (filePath) => {
    const rawdata = fs.readFileSync(filePath);
    return JSON.parse(rawdata);
};

// Log any warnings passed
const logWarnings = (warnings) => {
    if (!intTestRun) {
        warnings.forEach((warning) => console.warn(warning));
    }
    warningCount += warnings.length;
};

// Log any errors passed
const logErrors = (errors) => {
    let errorsArr = [];
    errorCount += errors.length;
    // if integration test run, push errors to automationErrors array
    if (intTestRun) {
        errors.forEach((error) => errorsArr.push(error));
        const foundIndex = automationErrors.findIndex((entry) => entry.pluginName === pluginName);
        if (foundIndex !== -1) {
            automationErrors[foundIndex].errors = automationErrors[foundIndex].errors.concat(errorsArr);
        } else {
            automationErrors.push({
                pluginName: pluginName,
                errors: errorsArr
            });
        }
    } else {
        errors.forEach((error) => console.log(error));
    }
};

// Log any errors passed and exit validation process
const logErrorsAndExit = (errors) => {
    logErrors(errors);
    exit();
};

const spellCheckerFactory = async () => {
    let settings = {
        ...getDefaultSettings(),
        enabledLanguageIds: []
    };

    // Get global allowed words
    const cspellConfigFileName = 'cspell.json';
    const globalCspellConfigPath = path.join(__dirname, cspellConfigFileName);
    settings = mergeSettings(settings, readSettings(globalCspellConfigPath));

    // Get plugin-specific allowed words (if any)
    const cspellConfigPath = getPluginFilePath(cspellConfigFileName);
    if (fs.existsSync(cspellConfigPath)) {
        settings = mergeSettings(settings, readSettings(cspellConfigPath));
    }

    const fileSettings = combineTextAndLanguageSettings(settings, '', ['plaintext']);
    const finalSettings = finalizeSettings(fileSettings);

    return async (phrase) => {
        return await validateText(phrase, finalSettings, { generateSuggestions: true });
    };
};

async function spellCheck(pluginName, textName, text, file = 'metadata.json') {
    if (text) {
        const spellChecker = await spellCheckerFactory();
        const typos = await spellChecker(text);
        for (const typo of typos) {
            logErrors([
                chalk.bgRed(`The ${file} file for plugin name "${pluginName}" has typo in ${textName}: "${typo.text}"`)
            ]);
        }
    } else {
        logErrors([chalk.bgRed(`The ${file} file for plugin name "${pluginName}" has missing ${textName}`)]);
    }
}

// Produce Mermaid source for import JSON
const mermaidForImportObjects = (importJson) => {
    const lines = ['graph LR'];

    const nodeIdsBySourceId = new Map();

    for (const vertex of importJson.vertices) {
        if (nodeIdsBySourceId.has(vertex.sourceId)) {
            console.warn(chalk.yellow(`duplicate sourceId "${vertex.sourceId}"`));
        } else {
            const nodeId = `node_${nodeIdsBySourceId.size + 1}`;
            nodeIdsBySourceId.set(vertex.sourceId, nodeId);
            let type = '';
            if (vertex.type) {
                if (typeof vertex.type === 'string') {
                    type = vertex.type.replace('"', '#quot;');
                }
                if (Array.isArray(vertex.type)) {
                    type = vertex.type.reduce((prev, current) => {
                        return `${prev.replace('"', '#quot;')}, ${current.replace('"', '#quot;')}`;
                    });
                }
            }
            lines.push(
                `    ${nodeId}["${type} (${vertex.sourceType.replace('"', '#quot;')})<br>${vertex.name.replace(
                    '"',
                    '#quot;'
                )}"]`
            );
        }
    }
    for (const edge of importJson.edges) {
        const inNodeId = nodeIdsBySourceId.get(edge.inV);
        if (!inNodeId) {
            console.warn(chalk.yellow(`Edge '${JSON.stringify(edge)}' - inV not found`));
        }
        const outNodeId = nodeIdsBySourceId.get(edge.outV);
        if (!outNodeId) {
            console.warn(chalk.yellow(`Edge '${JSON.stringify(edge)}' - outV not found`));
        }
        if (inNodeId && outNodeId) {
            lines.push(`    ${outNodeId} --"${edge.label.replace('"', '#quot;')}"--> ${inNodeId}`);
        }
    }
    return lines;
};

// Validate JSON for a specific file
const validateJson = (file, jsonSchema = null) => {
    let filePath, json;
    if (!jsonSchema) {
        jsonSchema = jsonSchemas[file];
    }

    if (!path.isAbsolute(file)) {
        filePath = getPluginFilePath(file);
        json = loadJsonFromFile(filePath);
    } else {
        json = loadJsonFromFile(file);
    }

    const validate = ajv.compile(jsonSchema);

    switch (intTestRun) {
        case intTestRun === true:
            !validate(json)
                ? logErrors([
                    chalk.bgRed(`${file} is invalid`),
                    ...validate.errors.map((error) => chalk.red(`path ${error.instancePath}: ${error.message}`))
                ])
                : console.log(chalk.green(`${file} matches schema`));
            break;
        case intTestRun === false:
            !validate(json)
                ? logErrorsAndExit([
                    chalk.bgRed(`${file} is invalid`),
                    ...validate.errors.map((error) => chalk.red(`path ${error.instancePath}: ${error.message}`))
                ])
                : console.log(chalk.green(`${file} matches schema`));
            break;
        default:
            break;
    }
};

// Returns loaded import handler
const loadHandler = async () => {
    const packagePath = getPluginFilePath(packageFileName);

    if (fs.existsSync(packagePath)) {
        // Ensure npm packages are installed and return importer
        console.log('Installing node packages...');
        const prevWd = process.cwd();
        process.chdir(pluginPath);
        await exec('npm i');
        process.chdir(prevWd);
        const { testConfig, importObjects, readDataSource } = await import(
            pathToFileURL(getPluginFilePath(handlerFileName))
        );
        return { testConfig, importObjects, readDataSource };
    } else {
        return false;
    }
};

// Returns correct inquirer question type based on field type
const getInquirerQuestion = (field) => {
    let questionType;

    switch (field.type) {
        case 'checkbox':
            questionType = 'confirm';
            break;
        case 'checkboxes':
            questionType = 'checkbox';
            break;
        case 'radio':
            questionType = 'list';
            break;
        case 'autocomplete':
            questionType = 'input';
            break;
        default:
            questionType = 'input';
    }

    return {
        type: questionType,
        name: field.name,
        message: `${field.title} ${field.help ? `- ${field.help}` : ''}`,
        ...(field.options && { choices: field.options }),
        ...(field.validation && {
            validate: (answer) => {
                if (field.validation?.required && !answer) {
                    return `${field.label} is required`;
                }
                return true;
            }
        }),
        filter: (val) => {
            // Hack for allowing arrays to be generated by ending answer with a ','
            if (val.endsWith(',')) {
                return val
                    .split(',')
                    .filter((item) => item)
                    .map((val) => ({ value: val })); // (Mimics autocomplete UI component output)
            }
            return val;
        }
    };
};

// Returns array of config fields for user input
const buildHandlerQuestions = async () => {
    const uiPath = getPluginFilePath('ui.json');
    const handlerFields = loadJsonFromFile(uiPath);

    return [
        ...handlerFields.map((field) => getInquirerQuestion(field)),
        {
            type: 'confirm',
            name: 'logHandlerOutput',
            message: 'Do you want to log the handler output?'
        }
    ];
};

async function validateMetadata() {
    const helpLink = 'Help adding this plugin';
    metadata = loadJsonFromFile(getPluginFilePath('metadata.json'));

    if (!Array.isArray(metadata.links) || !metadata.links.some((l) => l.label === helpLink)) {
        if (metadata.author === 'SquaredUp') {
            logErrors([
                chalk.bgRed(
                    `The metadata.json file for plugin name "${metadata.name}" is missing the required "${helpLink}" link.`
                )
            ]);
        }
    } else {
        if (metadata.author === 'SquaredUp') {
            const link = metadata.links.find((l) => l.label === helpLink);
            const name = metadata.name.toLowerCase().replace(/ /g, '');
            const baseName = name.replace(/onpremise$/, '');

            const expectUrl1 = `https://squaredup.com/cloud/pluginsetup-${name}`;
            const expectUrl2 = `https://squaredup.com/cloud/pluginsetup-${baseName}`;
            if (link.url !== expectUrl1 && link.url !== expectUrl2) {
                const expectUrl = expectUrl1 === expectUrl2 ? expectUrl1 : `${expectUrl1} or ${expectUrl2}`;
                logErrors([
                    chalk.bgRed(
                        `The metadata.json file for plugin name "${metadata.name}" has the wrong URL for "${helpLink}" link - "${link.url}" should be "${expectUrl}"`
                    )
                ]);
            }
        }
        for (const link of metadata.links) {
            await spellCheck(metadata.name, `link label for "${link.url}"`, link.label);
        }
    }

    await spellCheck(metadata.name, 'description', metadata.description);

    // Additional checks for on-prem
    if (['onprem', 'hybrid', 'declarative'].includes(metadata.type)) {
        if (typeof metadata.actions !== 'object' || metadata.actions === null) {
            logErrors([
                chalk.bgRed(
                    `The metadata.json file for plugin name "${metadata.name}" is missing the required "actions" object.`
                )
            ]);
        } else {
            const actionNames = new Set(Object.keys(metadata.actions));
            const dataStreams = loadJsonFromFile(getPluginFilePath('data_streams.json'));
            for (const dataSource of dataStreams.dataSources) {
                if (!actionNames.has(dataSource.name)) {
                    logErrors([
                        chalk.bgRed(
                            `The metadata.json file for plugin name "${metadata.name}" is missing the required action "${dataSource.name}"`
                        )
                    ]);
                }
            }
        }
    }

    return metadata;
}

async function validateUi(pluginName) {
    const ui = loadJsonFromFile(getPluginFilePath('ui.json'));

    async function spellCheckItem(pluginName, item) {
        if (item.type === 'fieldGroup') {
            for (const subItem of item.fields) {
                await spellCheckItem(pluginName, subItem);
            }
        } else {
            await spellCheck(pluginName, `label for UI item "${item.name}"`, item.label, 'ui.json');
            if (item.title) {
                await spellCheck(pluginName, `title for UI item "${item.name}"`, item.title, 'ui.json');
            }
            if (item.help) {
                await spellCheck(pluginName, `help for UI item "${item.name}"`, item.help, 'ui.json');
            }
        }
    }

    for (const item of ui) {
        await spellCheckItem(pluginName, item);
    }

    return ui;
}

//TODO: see if latest set of valid shapes can be provided by the SAAS build rather than hard-coding here
const validShapes = new Set([
    'boolean',
    'date',
    'number',
    'string',
    'currency',
    'eur',
    'gbp',
    'usd',
    'bytes',
    'kilobytes',
    'megabytes',
    'gigabytes',
    'terabytes',
    'petabytes',
    'exabytes',
    'zettabytes',
    'yottabytes',
    'awsJsonLogEvent',
    'azureVmId',
    'state',
    'milliseconds',
    'seconds',
    'minutes',
    'timespan',
    'customUnit',
    'guid',
    'json',
    'percent',
    'url'
]);

const validRoles = new Set(['id', 'label', 'link', 'timestamp', 'unitLabel', 'value']);

async function validateDataStreamMetadata(pluginName, name, metadata) {
    let stateColNum;
    let expectedLabelColsStart = 0;
    const labelColNumbers = [];

    for (let colNum = 0; colNum < metadata.length; colNum++) {
        const col = metadata[colNum];
        let shapeName;
        if (Array.isArray(col.shape)) {
            if (col.shape.length != 2) {
                logErrors([
                    chalk.bgRed(
                        `The data_streams.json file for plugin name "${pluginName}" "${name}" has metadata for column "${
                            col.name
                        }" with invalid 'shape': "${col.shape.join(', ')}"`
                    )
                ]);
            } else {
                if (
                    typeof col.shape[0] !== 'string' ||
                    !validShapes.has(col.shape[0]) ||
                    typeof col.shape[1] !== 'object' ||
                    Array.isArray(col.shape[1])
                ) {
                    logErrors([
                        chalk.bgRed(
                            `The data_streams.json file for plugin name "${pluginName}" "${name}" has metadata for column "${
                                col.name
                            }" with invalid 'shape': "${col.shape.join(', ')}"`
                        )
                    ]);
                }
            }
            shapeName = col.shape[0];
        } else {
            if (typeof col.name !== 'string' || col.name.match(/^\s*$/)) {
                // The absence of 'name' is acceptable if a pattern is provided.  Pattern doesn't require displayName or shape
                if (typeof col.pattern !== 'string' || col.pattern.match(/^\s*$/)) {
                    logErrors([
                        chalk.bgRed(
                            `The data_streams.json file for plugin name "${pluginName}" "${name}" has metadata for column with no 'name' or 'pattern'`
                        )
                    ]);
                }
            } else {
                if (Object.prototype.hasOwnProperty.call(col, 'visible') && typeof col.visible !== 'boolean') {
                    logErrors([
                        chalk.bgRed(
                            `The data_streams.json file for plugin name "${pluginName}" "${name}" has metadata for column "${col.name}" with invalid 'visible' - must be boolean`
                        )
                    ]);
                }
                if (typeof col.visible !== 'boolean' || col.visible !== false) {
                    if (typeof col.displayName !== 'string' || col.displayName.match(/^\s*$/)) {
                        logErrors([
                            chalk.bgRed(
                                `The data_streams.json file for plugin name "${pluginName}" "${name}" has metadata for column "${col.name}" with missing 'displayName'`
                            )
                        ]);
                    } else {
                        const tc = titleCase(col.displayName.replace('_', ' '));
                        if (col.displayName !== tc) {
                            logErrors([
                                chalk.bgRed(
                                    `The data_streams.json file for plugin name "${pluginName}" "${name}" has metadata for column "${col.name}" with bad 'displayName' = "${col.displayName}" should be "${tc}"`
                                )
                            ]);
                        }
                        await spellCheck(pluginName, `displayName column "${col.name}" in "${name}"`, col.displayName);
                    }
                }
                if (typeof col.shape !== 'string' || col.shape.match(/^\s*$/)) {
                    logErrors([
                        chalk.bgRed(
                            `The data_streams.json file for plugin name "${pluginName}" "${name}" has metadata for column "${col.name}" with missing 'shape'`
                        )
                    ]);
                } else {
                    if (!validShapes.has(col.shape)) {
                        logErrors([
                            chalk.bgRed(
                                `The data_streams.json file for plugin name "${pluginName}" "${name}" has metadata for column "${col.name}" with invalid 'shape': "${col.shape}"`
                            )
                        ]);
                    }
                }
            }
            shapeName = col.shape;
        }
        if (shapeName === 'state') {
            if (typeof stateColNum === 'number') {
                logWarnings([
                    chalk.yellow(
                        `Warning: The data_streams.json file for plugin name "${pluginName}" "${name}" has metadata for column "${col.name}" with multiple state columns`
                    )
                ]);
            } else {
                stateColNum = colNum;
                expectedLabelColsStart = 1;
            }
        }
        if (col.role) {
            if (typeof col.role !== 'string' || !validRoles.has(col.role)) {
                logErrors([
                    chalk.bgRed(
                        `The data_streams.json file for plugin name "${pluginName}" "${name}" has metadata for column "${col.name}" with invalid 'role': "${col.role}"`
                    )
                ]);
            }
        }
        if (col.role === 'label') {
            labelColNumbers.push(colNum);
        }
    }
    if (typeof stateColNum === 'number' && stateColNum !== 0) {
        logErrors([
            chalk.bgRed(
                `The data_streams.json file for plugin name "${pluginName}" "${name}" has state column at index ${stateColNum} - should be 0`
            )
        ]);
    }
    if (labelColNumbers.length > 0) {
        if (labelColNumbers[0] !== expectedLabelColsStart) {
            logErrors([
                chalk.bgRed(
                    `The data_streams.json file for plugin name "${pluginName}" "${name}" has label column at index ${labelColNumbers[0]} - should be ${expectedLabelColsStart}`
                )
            ]);
        }
        if (labelColNumbers[labelColNumbers.length - 1] - labelColNumbers[0] !== labelColNumbers.length - 1) {
            logErrors([
                chalk.bgRed(
                    `The data_streams.json file for plugin name "${pluginName}" "${name}" has non-contiguous label columns ${labelColNumbers.join(
                        ', '
                    )}`
                )
            ]);
        }
    }
}

async function validateDataStreams(pluginName) {
    const dataStreams = loadJsonFromFile(getPluginFilePath('data_streams.json'));
    if (Array.isArray(dataStreams.rowTypes)) {
        for (const rowType of dataStreams.rowTypes) {
            await validateDataStreamMetadata(pluginName, `ROW:${rowType.name}`, rowType.metadata);
        }
    }
    for (const dataSource of dataStreams.dataSources) {
        await spellCheck(pluginName, `display name for data source "${dataSource.name}"`, dataSource.displayName);
        if (dataSource.description) {
            await spellCheck(pluginName, `description for data source "${dataSource.name}"`, dataSource.description);
        }
    }
    const dataSourceNames = dataStreams.dataSources.reduce((acc, val) => {
        if (acc.has(val.name)) {
            logErrors([
                chalk.bgRed(
                    `The data_streams.json file for plugin name "${pluginName}" has duplicate data source name: "${val.name}"`
                )
            ]);
        }
        acc.add(val.name);
        return acc;
    }, new Set());
    for (const dataStream of dataStreams.dataStreams) {
        if (!dataSourceNames.has(dataStream.dataSourceName)) {
            logErrors([
                chalk.bgRed(
                    `The data_streams.json file for plugin name "${pluginName}" has data stream "${dataStream.definition.name}" referencing non-existent data source: "${dataStream.dataSourceName}"`
                )
            ]);
        }
        if (Array.isArray(dataStream.definition.metadata)) {
            await validateDataStreamMetadata(
                pluginName,
                `STREAM:${dataStream.definition.name}`,
                dataStream.definition.metadata
            );
        } else {
            if (!dataStream.definition.rowType) {
                logErrors([
                    chalk.bgRed(
                        `The data_streams.json file for plugin name "${pluginName}" has no metadata for data stream "${dataStream.definition.name}"`
                    )
                ]);
            }
        }
        await spellCheck(
            pluginName,
            `display name for data stream "${dataStream.definition.name}"`,
            dataStream.displayName
        );
        if (dataStream.description) {
            await spellCheck(
                pluginName,
                `description for data stream "${dataStream.definition.name}"`,
                dataStream.description
            );
        }
    }
    return dataStreams;
}

async function validateCustomTypes(pluginName) {
    const customTypesPath = getPluginFilePath('custom_types.json');
    if (!fs.existsSync(customTypesPath)) {
        return null;
    }
    const customTypes = loadJsonFromFile(customTypesPath);
    for (const item of customTypes) {
        await spellCheck(pluginName, `display name for custom type "${item.type}"`, item.name);
        await spellCheck(pluginName, `singular for custom type "${item.type}"`, item.singular);
        await spellCheck(pluginName, `plural for custom type "${item.type}"`, item.plural);
    }
    return customTypes;
}

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

async function validateDefaultContent(pluginName, dataStreams, customTypes) {
    const defaultContentPath = path.join(path.resolve(__dirname, pluginPath), 'DefaultContent');

    if (!fs.existsSync(defaultContentPath)) {
        return null;
    }

    let defaultScopes = [];
    let defaultCods = [];
    let defaultDashboards = [];
    const allDefaultContentFiles = await readDir(defaultContentPath);
    allDefaultContentFiles.forEach((file) => {
        const filePath = path.join(defaultContentPath, file);
        const defaultContentFile = loadJsonFromFile(filePath);
        if (file.toLowerCase() === 'scopes.json') {
            validateJson(filePath, scopesSchema);
            defaultScopes = defaultContentFile;
        } else if (file.toLowerCase() === 'cods.json') {
            validateJson(filePath, codsSchema);
            defaultCods = defaultContentFile;
        } else if (file.toLowerCase().endsWith('.dash.json')) {
            validateJson(filePath, dashboardsSchema);
            defaultContentFile['filePath'] = file;
            defaultDashboards.push(defaultContentFile);
        }
    });

    const allScopes = defaultScopes.map((s) => s.name);
    const allDataStreams = dataStreams.dataStreams.map((ds) => ds.definition.name);
    defaultCods.forEach((cods) => {
        allDataStreams.push(`${cods.tplName}___${cods.index}`);
    });
    const allTypes = Array.from(validTypes).concat(customTypes.map((t) => t.type));

    for (const scope of defaultScopes) {
        await spellCheck(pluginName, 'Scope name in default content', scope.name, 'scopes.json');

        if (typeof scope.matches === 'object') {
            if (scope.matches.type.type === 'equals') {
                if (!allTypes.includes(scope.matches.type.value)) {
                    logErrors([
                        chalk.yellow(
                            `The default_content.json file for plugin name "${pluginName}" has scope "${scope.name}" with invalid type: "${scope.matches.type.value}"`
                        )
                    ]);
                }
            } else {
                const nonMatchingTypes = [];
                for (const value of scope.matches.type.values) {
                    if (!allTypes.includes(value)) {
                        nonMatchingTypes.push(value);
                    }
                }
                if (nonMatchingTypes.length > 0) {
                    logErrors([
                        chalk.yellow(
                            `The default_content.json file for plugin name "${pluginName}" has scope "${
                                scope.name
                            }" with invalid type${nonMatchingTypes.length == 1 ? '' : 's'}: "${nonMatchingTypes.join(
                                '", "'
                            )}"`
                        )
                    ]);
                }
            }
        }
    }

    for (const dashboard of defaultDashboards) {
        await spellCheck(pluginName, 'Dashboard name in default content', dashboard.name, dashboard.filePath);
        for (const tile of dashboard.dashboard.contents) {
            await spellCheck(pluginName, 'Tile title in default content', tile.config.title, dashboard.filePath);
            if (tile.config.description) {
                await spellCheck(
                    pluginName,
                    'Tile description in default content',
                    tile.config.description,
                    dashboard.filePath
                );
            }
            checkTileValue(pluginName, dashboard.name, tile.config.title, tile.config, allScopes, allDataStreams);
            checkTileVizConfig(pluginName, dashboard, tile.config.title, tile.config);
        }
        checkTileTimeframes(pluginName, dashboard);
    }
}

const checkTileVizConfig = (pluginName, dashboard, tileName, config) => {
    if (
        config?.visualisation?.config &&
        Object.keys(config.visualisation?.config).filter((k) => k !== config?.visualisation.type).length > 0
    ) {
        logWarnings([
            chalk.yellow(
                `The tile "${tileName}" on dashboard "${dashboard.filePath}" in plugin "${pluginName}" contains redundant visualization configuration.`
            )
        ]);
    }
};

const checkTileTimeframes = (pluginName, dashboard) => {
    const tiles = dashboard.dashboard.contents;
    if (tiles.every((t) => Boolean(t.config.timeframe) && t.config.timeframe === tiles[0].config.timeframe)) {
        logErrors([
            chalk.bgRed(
                `The ${dashboard.filePath} file for plugin "${pluginName}" uses the same timeframe for all tiles, use a dashboard timeframe instead.`
            )
        ]);
    }
};

const checkTileValue = (pluginName, dashboardName, tileName, value, allScopes, allDataStreams) => {
    if (value == null) {
        return; // null or undefined values don't require further checking
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
        for (const key of Object.keys(value)) {
            checkTileValue(pluginName, dashboardName, tileName, value[key], allScopes, allDataStreams);
        }
    } else if (Array.isArray(value)) {
        for (const item of value) {
            checkTileValue(pluginName, dashboardName, tileName, item, allScopes, allDataStreams);
        }
    } else if (typeof value === 'string') {
        if (value.startsWith('config-') && value !== 'config-00000000000000000000') {
            logErrors([
                chalk.bgRed(
                    `The default_content.json file for plugin name ${pluginName} has dashboard "${dashboardName}" with tile "${tileName}" with raw config ID: ${value}`
                )
            ]);
        }
        if (value.startsWith('space-')) {
            logErrors([
                chalk.bgRed(
                    `The default_content.json file for plugin name ${pluginName} has dashboard "${dashboardName}" with tile "${tileName}" with raw workspace ID: "${value}"`
                )
            ]);
        }
        if (value.startsWith('scope-')) {
            logErrors([
                chalk.bgRed(
                    `The default_content.json file for plugin name ${pluginName} has dashboard "${dashboardName}" with tile "${tileName}" with raw scope ID: "${value}"`
                )
            ]);
        }
        if (
            value.startsWith('datastream-') &&
            value !== 'datastream-health' &&
            value !== 'datastream-properties' &&
            value !== 'datastream-sql'
        ) {
            logErrors([
                chalk.bgRed(
                    `The default_content.json file for plugin name ${pluginName} has dashboard "${dashboardName}" with tile "${tileName}" with raw data stream ID: "${value}"`
                )
            ]);
        }

        if (value.startsWith('{{{{raw}}}}') && value.endsWith('{{{{/raw}}}}')) {
            return; // handlebar raw values don't require further checking
        }

        if (value.startsWith('{{') && value.endsWith('}}')) {
            const originalValue = value;

            value = value.replace('{{', '');
            value = value.replace('}}', '');

            if (value.startsWith('scopes.')) {
                value = value.replace('scopes.', '');

                let hasSquareBrackets = value.startsWith('[') && value.endsWith(']');
                if (hasSquareBrackets) {
                    value = value.replace('[', '');
                    value = value.replace(']', '');
                }

                if (!allScopes.includes(value)) {
                    logErrors([
                        chalk.bgRed(
                            `The default_content.json file for plugin name ${pluginName} has dashboard "${dashboardName}" with tile "${tileName}" with non-existent scope name: "${value}"`
                        )
                    ]);
                }
                if (value.includes(' ') && !hasSquareBrackets) {
                    logErrors([
                        chalk.bgRed(
                            `The default_content.json file for plugin name ${pluginName} has dashboard "${dashboardName}" with tile "${tileName}" with scope name containing spaces without square brackets: "${originalValue}"`
                        )
                    ]);
                }
            } else if (value.startsWith('dataStreams.')) {
                value = value.replace('dataStreams.', '');
                if (value.startsWith('[') && value.endsWith(']')) {
                    value = value.substring(1, value.length - 1);
                }
                if (!allDataStreams.includes(value)) {
                    logErrors([
                        chalk.bgRed(
                            `The default_content.json file for plugin name ${pluginName} has dashboard "${dashboardName}" with tile "${tileName}" with non-existent data stream name: "${value}"`
                        )
                    ]);
                }
            } else {
                if (!['configId', 'workspaceId'].includes(value)) {
                    logErrors([
                        chalk.bgRed(
                            `The default_content.json file for plugin name ${pluginName} has dashboard "${dashboardName}" with tile "${tileName}" with invalid handlebar value: "${originalValue}"`
                        )
                    ]);
                }
            }
        }
    }
};

// Validate plugin configuration/JSON files
const checkPluginFiles = async () => {
    const allPluginFiles = await readDir(pluginPath);
    const missingFiles = requiredFiles.filter((file) => !allPluginFiles.includes(file));

    if (missingFiles.length) {
        // Failure here ends validation process if intTestRun is false
        intTestRun === true
            ? logErrors([
                chalk.bgRed('Your plugin is missing the following required files:'),
                chalk.red(missingFiles.join(', '))
            ])
            : logErrorsAndExit([
                chalk.bgRed('Your plugin is missing the following required files:'),
                chalk.red(missingFiles.join(', '))
            ]);
    }

    const filesToCheck = [...requiredFiles, ...optionalFiles.filter((file) => allPluginFiles.includes(file))];
    const jsonFilesToCheck = filesToCheck.filter((file) => file.endsWith('.json'));

    // Validate JSON files against respective schema
    jsonFilesToCheck.forEach((file) => validateJson(file));

    // Check the metadata file
    const metadata = await validateMetadata();
    if (['cloud', 'hybrid'].includes(metadata.type)) {
        if (!allPluginFiles.includes(handlerFileName)) {
            logErrorsAndExit([
                chalk.bgRed('Your plugin is missing the following required files:'),
                chalk.red(handlerFileName)
            ]);
        }
    }

    // Check the UI file
    await validateUi(metadata.name);

    // Check the data_streams file
    const dataStreams = await validateDataStreams(metadata.name);

    // Check the custom types
    const customTypes = await validateCustomTypes(metadata.name);

    // Check the default content
    await validateDefaultContent(metadata.name, dataStreams, customTypes);
};

// log functions (part of the api object passed to plugin entry points).
const log = {
    error: function (msg) {
        console.log(`Plugin ERROR: ${msg}`);
    },
    warn: function (msg) {
        console.log(`Plugin  WARN: ${msg}`);
    },
    info: function (msg) {
        console.log(`Plugin  INFO: ${msg}`);
    },
    debug: function (msg) {
        console.log(`Plugin DEBUG: ${msg}`);
    }
};

const report = {
    warning: function (text) {
        console.log(`plugin reports warning: ${text}`);
    },
    error: function (text) {
        console.log('plugin reports error: ' + text);
        const err = new Error(text);
        err['isPluginUiError'] = true;
        throw err;
    }
};

// Validate JSON data returned from the invoked handler
const validateHandlerData = async (handler, payload) => {
    try {
        const handlerEvent = { body: payload, pluginConfig: payload };
        const validate = ajv.compile(payloadSchema);

        let pagingContext = {};

        // eslint-disable-next-line no-unused-vars
        const patchConfig = (propertyName, value, encryption) => {
            handlerEvent.pluginConfig[propertyName] = value;
        };

        const startMs = performance.now();
        const timeoutMs = 12 * 60 * 1000;
        const runtimeContext = {
            getRemainingTimeMs: () => {
                return timeoutMs - (performance.now() - startMs);
            }
        };

        const api = { log, report, patchConfig };

        if (metadata.type === 'cloud') {
            api.runtimeContext = runtimeContext;
        }

        do {
            handlerEvent.body.pagingContext = handlerEvent.pagingContext = pagingContext;
            const handlerResponse = await handler(handlerEvent, api);

            const handlerResponseJson = JSON.stringify(handlerResponse);
            if (handlerResponseJson.length > maxImportPayloadSize) {
                logErrorsAndExit([
                    chalk.bgRed(`handler returned payload ${handlerResponseJson.length} characters long`)
                ]);
            }

            pagingContext = handlerResponse.pagingContext;
            if (pagingContext) {
                // if set validate we can stringify and re-parse
                const pagingContextJson = JSON.stringify(pagingContext);
                pagingContext = JSON.parse(pagingContextJson);
            }

            if (payload?.logHandlerOutput) {
                console.log(JSON.stringify(handlerResponse, null, 2));
            }

            if (!validate(handlerResponse)) {
                logErrorsAndExit([
                    chalk.bgRed('payload data is invalid'),
                    ...validate.errors.map((error) => chalk.red(error.message))
                ]);
            }

            if (handlerResponse.vertices) {
                for (const node of handlerResponse.vertices) {
                    importedGraph.vertices.push({ ...node, id: `node-${globalNodeId}` });
                    globalNodeId++;
                }
            }
            if (handlerResponse.edges) {
                importedGraph.edges = importedGraph.edges.concat(handlerResponse.edges);
            }
        } while (pagingContext && Object.keys(pagingContext).length > 0);

        // Construct the mermaid version of the diagram now (it performs extra validity checking)
        const mermaid = mermaidForImportObjects(importedGraph);

        // If we made it through the handler calls then we know the response(s) is valid
        let extraString;
        if (importedGraph.vertices.length === 0 && importedGraph.edges.length === 0) {
            extraString = '(vertices and edges are empty)';
        } else if (importedGraph.vertices.length === 0) {
            extraString = '(vertices are empty)';
        } else if (importedGraph.edges.length === 0) {
            extraString = '(edges are empty)';
        }
        console.log(`${chalk.green('The plugin data is valid')}${extraString ? ` ${chalk.yellow(extraString)}` : ''}`);

        if (payload?.logHandlerOutput) {
            console.log('================ MERMAID =======================');
            console.log(mermaid.join('\n'));
            console.log('================================================');
        }
    } catch (err) {
        console.log(chalk.red(err));
    }
};

/**
 * TODO: Import shared copy of this function when SAAS repo exports it as an npm package
 *
 * Patches the supplied metadata as directed by the patch object.
 *
 * @param {*} metadata - the metadata to patch (an array of column definitions)
 * @param {*} colPatch - the patch to apply
 *
 * @returns a new metadata array with the patch applied
 */
const applyColumnPatch = (metadata, colPatch) => {
    const colNames = new Set(colPatch.names || [colPatch.name]);

    if (colPatch.remove) {
        const filtered = metadata.filter((col) => !colNames.has(col.name));
        return filtered;
    }
    if (typeof colPatch.override === 'object') {
        const patched = metadata.reduce(
            (acc, col) => (acc.push(colNames.has(col.name) ? Object.assign({}, col, colPatch.override) : col), acc),
            []
        );
        return patched;
    }
    return metadata;
};

/**
 * TODO: Import shared copy of this function when SAAS repo exports it as an npm package
 *
 * This routine takes the POJO created from the contents of the data_streams.json files which
 * contains syntactic sugar to make it easier to write and maintain and expands it out into the
 * form expected by the routines above for insertion into DynamoDB.
 *
 * Notably metadata from rowTypes is copied into the data streams that reference them
 *
 * @param {any} dataStreamsFile
 */
const preProcessDataStreams = (dataStreamsFile) => {
    if (!Array.isArray(dataStreamsFile.content.rowTypes)) {
        // Data streams are fine as they are.
        return dataStreamsFile;
    }

    // Clone the file contents and extract the rowTypes into a Map
    const newDataStreamsFile = JSON.parse(JSON.stringify(dataStreamsFile));
    const rowTypesByName = newDataStreamsFile.content.rowTypes.reduce(
        (acc, val) => (acc.set(val.name, val), acc),
        new Map()
    );
    delete newDataStreamsFile.content.rowTypes;

    // Iterate through the data streams, replacing any rowType references with the row's metadata
    for (const dataStream of newDataStreamsFile.content.dataStreams) {
        if (dataStream.definition?.rowType) {
            if (rowTypesByName.has(dataStream.definition.rowType.name)) {
                let metadata = JSON.parse(
                    JSON.stringify(rowTypesByName.get(dataStream.definition.rowType.name).metadata)
                );
                if (Array.isArray(dataStream.definition.rowType.column)) {
                    for (const colPatch of dataStream.definition.rowType.column) {
                        metadata = applyColumnPatch(metadata, colPatch);
                    }
                }
                dataStream.definition.metadata = metadata;
                delete dataStream.definition.rowType;
            } else {
                throw new Error(
                    `Datastream "${dataStream.definition.name}" references non-existent rowType "${dataStream.definition.rowType.name}"`
                );
            }
        }
    }
    return newDataStreamsFile;
};

/**
 * TODO: Import shared copy of this function when SAAS repo exports it as an npm package
 */
function parseVersionString(versionString) {
    const arr = versionString.split('.');
    return {
        major: parseInt(arr[0]) || 0,
        minor: parseInt(arr[1]) || 0,
        patch: parseInt(arr[2]) || 0
    };
}

const getProdEnvPluginsRef = async () => {
    let result;
    try {
        const json = await requestPromise(prodEnvPluginsRefUrl);
        result = JSON.parse(json);
    } catch (e) {
        console.log(chalk.red.bold(e.message));
    }
    return result;
};

const checkPluginSourceCode = async () => {
    const ext = os.type() === 'Windows_NT' ? '.cmd' : '';
    const eslintPath = path.resolve(__dirname, `node_modules/.bin/eslint${ext}`);
    const pre = os.type() === 'Windows_NT' ? 'cmd /c ' : '';
    try {
        await exec(`${pre}${eslintPath} "${pluginPath}" --quiet --rule "no-console:error"`);
    } catch (err) {
        if (err.stderr && !err.stderr.match(/No files matching the pattern/)) {
            console.log(chalk.red.bold(err.stderr));
            if (intTestRun === true) {
                automationErrors.push({ eslintError: err.stderr });
            }
        }
        const lineNumbersByPath = new Map();
        let path, matches;
        for (const line of err.stdout.split('\n')) {
            if (line.startsWith(pluginPath)) {
                path = line.substring(pluginPath.length + 1);
            } else if ((matches = line.match(/^\s*(\d+):\d+\s+.*no-console\s*$/u)) && path !== 'wrappedHandler.js') {
                let lineNumbers = lineNumbersByPath.get(path);
                if (!lineNumbers) {
                    lineNumbers = new Set();
                    lineNumbersByPath.set(path, lineNumbers);
                }
                lineNumbers.add(matches[1]);
            }
        }
        if (lineNumbersByPath.size > 0) {
            logWarnings([chalk.yellow('Warning: plugin uses console functions:')]);
            for (const path of Array.from(lineNumbersByPath.keys()).sort()) {
                const lineNumbers = lineNumbersByPath.get(path);
                console.warn(
                    chalk.yellow(
                        `    ${path} - line${lineNumbers.size === 1 ? '' : 's'} ${Array.from(lineNumbers)
                            .sort((a, b) => a - b)
                            .join(', ')}`
                    )
                );
            }
        }
    }
};

const byName = (a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0);
const byStreamName = (a, b) =>
    a.definition.name > b.definition.name ? 1 : b.definition.name > a.definition.name ? -1 : 0;

const checkProdEnvConsistency = async () => {
    const prodEnvPluginsRef = await getProdEnvPluginsRef();
    if (!prodEnvPluginsRef) {
        console.warn(chalk.yellow('Unable to load PROD environment plugin reference data'));
        return;
    }

    const metadata = await validateMetadata();

    const safeName = slugify(metadata.name).toLowerCase();
    const versionInfo = parseVersionString(metadata.version);

    const lambdaRE = new RegExp(`^plugin-${safeName}-${versionInfo.major}-prod$`);
    const prodRef = prodEnvPluginsRef.find((pr) => lambdaRE.test(pr.name || pr.lambdaName)); // lambdaName is stored as "name" when redacted

    if (!prodRef) {
        console.log(
            chalk.yellow(`Plugin "${metadata.name}" v${versionInfo.major} is not installed on the PROD environment`)
        );
        return;
    }

    const dataStreamsRaw = loadJsonFromFile(getPluginFilePath('data_streams.json'));
    const dataStreams = preProcessDataStreams({ content: dataStreamsRaw }).content;
    const streamsByName = dataStreams.dataStreams.reduce(
        (acc, val) => (acc.set(val.definition.name, val), acc),
        new Map()
    );

    for (const dataStreamRef of prodRef.dataStreams.sort(byStreamName)) {
        const dataStream = streamsByName.get(dataStreamRef.definition.name);
        if (dataStream) {
            const matchesRefJson = JSON.stringify(dataStreamRef.definition.matches).replace(/"(\w+)\.0"/gu, '"$1"');
            const matchesJson = JSON.stringify(dataStream.definition.matches).replace(/"(\w+)\.0"/gu, '"$1"');
            if (matchesJson !== matchesRefJson) {
                logWarnings([
                    chalk.yellow(
                        `Data stream "${dataStreamRef.definition.name}" is present in the PROD cloud environment with matches: "${matchesRefJson}", but matches is now "${matchesJson}".`
                    )
                ]);
            }
            const colsByName = Array.isArray(dataStream.definition.metadata)
                ? dataStream.definition.metadata.reduce((acc, val) => (acc.set(val.name, val), acc), new Map())
                : new Map();
            for (const colRef of (dataStreamRef.definition.metadata ?? []).sort(byName)) {
                const col = colsByName.get(colRef.name);
                if (!col) {
                    logWarnings([
                        chalk.yellow(
                            `Data stream "${dataStreamRef.definition.name}" is present in the PROD cloud environment with column called: "${colRef.name}", but the column is no longer in this version of the plugin.`
                        )
                    ]);
                }
            }
        } else {
            logWarnings([
                chalk.yellow(
                    `Data stream "${dataStreamRef.definition.name}" is present in the PROD cloud environment, but is no longer in this version of the plugin.`
                )
            ]);
        }
    }
};

export const getConfig = async () => {
    const testConfigPath = getPluginFilePath('testConfig.json');

    // If a testConfig file exists, invoke handler importObjects using its config
    if (fs.existsSync(testConfigPath)) {
        const testConfig = loadJsonFromFile(testConfigPath);
        if (Array.isArray(testConfig)) {
            await inquirer
                .prompt([
                    {
                        type: 'list',
                        name: 'config',
                        message: 'Choose a config:',
                        choices: testConfig.map((c, i) => ({ name: c.name, value: i }))
                    }
                ])
                .then(async (answers) => {
                    pluginConfig = testConfig[answers.config].config;
                });
        } else {
            pluginConfig = testConfig;
        }
    }

    // If no testConfig file exists, prompt for configuration values
    else {
        const config = await inquirer.prompt(await buildHandlerQuestions());
        pluginConfig = Object.entries(config).reduce((processedConfig, [prop, value]) => {
            if (value) {
                processedConfig[prop] = value;
            }
            return processedConfig;
        }, {});
    }
};

// Gather user configuration and invoke the handler
const checkHandler = async (handlerAlreadyLoaded) => {
    if (!handlerAlreadyLoaded) {
        handler = await loadHandler();
    }

    if (typeof handler.importObjects === 'function') {
        await getConfig();
        await validateHandlerData(handler.importObjects, pluginConfig);
    } else {
        throw new Error('handler importObjects is not a function');
    }
};

const validatePlugin = async () => {
    if (!pluginPath) {
        inquirer
            .prompt([
                {
                    type: 'list',
                    name: 'plugin',
                    message: 'What plugin do you want to validate?',
                    choices: () => getPluginFolders()
                }
            ])
            .then(async ({ plugin }) => {
                pluginPath = path.join(directoryPath, plugin);
                await checkPluginFiles();
                await checkPluginSourceCode();
                await checkProdEnvConsistency();
                await checkHandler();
            });
    } else {
        await checkPluginFiles();
        await checkPluginSourceCode();
        await checkProdEnvConsistency();
        await checkHandler();
    }
};

const getPluginFolders = async () => {
    const mainFolders = (await readDir(directoryPath)).filter(
        (item) => !['.gitignore', '.DS_Store', 'package.json', 'package-lock.json'].includes(item)
    );

    const allFolders = [];
    await Promise.all(
        mainFolders.map(async (folder) => {
            const subFolders = await readDir(path.join(directoryPath, folder));

            subFolders.map((subFolder) => {
                if (/^v\d+$/gm.test(subFolder)) {
                    allFolders.push(path.join(folder, subFolder));
                }
            });
        })
    );

    return allFolders.map((path) => {
        const pathParts = path.split('\\');
        return {
            name: `${pathParts[0]} ${pathParts[1]}`,
            value: path
        };
    });
};

export const staticAnalyseAll = async () => {
    const plugins = await getPluginFolders();
    for (const plugin of plugins) {
        pluginPath = path.join(directoryPath, plugin.value);
        if (!fs.existsSync(path.join(pluginPath, 'metadata.json'))) {
            console.log('');
            console.log(chalk.yellow(`Skipping ${pluginPath} which has no metadata.json file`));
            continue;
        }
        console.log('');
        console.log(chalk.green(`Analysing ${plugin.name}`));
        console.log(chalk.green('==========================================================='));
        await checkPluginFiles();
        await checkPluginSourceCode();
        await checkProdEnvConsistency();
    }
    console.log();
    if (warningCount > 0) {
        console.log(chalk.yellow(`${warningCount} warning${warningCount === 1 ? '' : 's'}`));
    }
    if (errorCount > 0) {
        console.log(chalk.red(`${errorCount} error${errorCount === 1 ? '' : 's'}`));
    }
    process.exit(1);
};

export const staticAnalyseIntegrationTest = async (plugin) => {
    let testConfigResults;
    let needsPrepAndClean = false;
    intTestRun = true; // switch flag to disable excess logging - rename

    pluginName = plugin.Name;
    pluginPath = path.join(directoryPath, plugin.Name);
    if (!fs.existsSync(path.join(pluginPath, 'metadata.json'))) {
        console.log(chalk.yellow(`Skipping ${pluginPath} which has no metadata.json file`));
    }

    //run testPrep script if needed
    const pluginFilePath = path.join(pluginPath, 'testPrep.js');
    if (fs.existsSync(pluginFilePath)) {
        needsPrepAndClean = true;
        exec(`node ${pluginFilePath} -p`);
    }

    await checkPluginFiles();
    await checkPluginSourceCode();
    handler = await loadHandler();
    pluginConfig = plugin.Credentials;
    testConfigResults = await testConfig();
    let successMsgCount = 0,
        warningMsgCount = 0,
        errorMsgCount = 0;
    if (Array.isArray(testConfigResults?.messages)) {
        testConfigResults.messages.forEach((val) => {
            switch (val.status) {
                case 'error':
                    errorMsgCount++;
                    break;
                case 'warning':
                    warningMsgCount++;
                    break;
                case 'success':
                    successMsgCount++;
                    break;
                default:
                    logErrors([`Unknown message status: ${val.status}`]);
            }
        });
    } else {
        logErrors(['No messages returned from testConfig.']);
    }

    if (successMsgCount <= 0) {
        logWarnings(['Received no success message']); //this should be a warning, but logWarning would not currently show up in the test results
    }
    if (warningMsgCount > 0) {
        console.log(chalk.yellow(`${warningCount} warning${warningCount === 1 ? '' : 's'}`));
    }
    if (errorMsgCount > 0) {
        console.log(chalk.red(`${errorCount} error${errorCount === 1 ? '' : 's'}`));
    }
    //run cleanup script
    if (needsPrepAndClean) {
        exec(`node ${pluginPath}/testPrep.js -c`);
    }

    return testConfigResults;
};

const processTargetNodes = (trgObjs) =>
    trgObjs.map((trgObj) => {
        const result = {};
        for (const [key, value] of Object.entries(trgObj)) {
            if (key === 'links') {
                result[key] = [JSON.stringify(value)];
            } else {
                result[key] = Array.isArray(value) ? value : [value];
            }
        }
        return result;
    });

const testSingleCriterion = (fieldName, criterion, tn) => {
    if (typeof criterion === 'string') {
        return tn[fieldName] === criterion;
    }
    if (typeof criterion !== 'object' || !Object.hasOwn(criterion, 'type')) {
        throw new Error(`Invalid match criterion: ${JSON.stringify(criterion)}`);
    }
    switch (criterion.type) {
        case 'oneOf': {
            if (
                Object.keys(criterion).length !== 2 ||
                !Object.hasOwn(criterion, 'values' || !Array.isArray(criterion.values))
            ) {
                throw new Error(`Invalid match criterion: ${JSON.stringify(criterion)}`);
            }
            return criterion.values.includes(tn[fieldName]);
        }
        case 'contains': {
            if (Object.keys(criterion).length !== 2 || !Object.hasOwn(criterion, 'value')) {
                throw new Error(`Invalid match criterion: ${JSON.stringify(criterion)}`);
            }
            return typeof tn[fieldName] === 'string' && tn[fieldName].includes(criterion.value);
        }
        case 'equals': {
            if (Object.keys(criterion).length !== 2 || !Object.hasOwn(criterion, 'value')) {
                throw new Error(`Invalid match criterion: ${JSON.stringify(criterion)}`);
            }
            return tn[fieldName] == criterion.value;
        }
        case 'regex': {
            if (Object.keys(criterion).length !== 2 || !Object.hasOwn(criterion, 'pattern')) {
                throw new Error(`Invalid match criterion: ${JSON.stringify(criterion)}`);
            }
            return new RegExp(criterion.pattern).test(tn[fieldName]);
        }
        case 'any': {
            if (Object.keys(criterion).length !== 1) {
                throw new Error(`Invalid match criterion: ${JSON.stringify(criterion)}`);
            }
            return Object.hasOwn(tn, fieldName);
        }
        default: {
            throw new Error(`Invalid match criterion: ${JSON.stringify(criterion)}`);
        }
    }
};

const testSingleMatch = (singleMatch, tn) => {
    if (typeof singleMatch !== 'object') {
        throw new Error(`Invalid match criteria: ${JSON.stringify(singleMatch)}`);
    }
    for (const fieldName in singleMatch) {
        const criterion = singleMatch[fieldName];
        if (!testSingleCriterion(fieldName, criterion, tn)) {
            return false;
        }
    }
    return true;
};

const testMatch = (matches, tn) => {
    if (matches === 'all') {
        return true;
    }
    if (matches === 'none') {
        return false;
    }
    if (Array.isArray(matches)) {
        for (const singleMatch of matches) {
            if (testSingleMatch(singleMatch, tn)) {
                return true;
            }
            return false;
        }
    }
    return testSingleMatch(matches, tn);
};

const getMatchesFilter = (matches) => {
    return (tn) => testMatch(matches, tn);
};

const resolveTimeframeInterval = (timeframe) => {
    // Remove one hour as it will round seconds to the whole hour
    const timeDifference =
        Math.abs(differenceInHours(fromUnixTime(timeframe.unixEnd), fromUnixTime(timeframe.unixStart))) - 1;
    let interval = timeframe.interval;

    if (!interval) {
        switch (true) {
            case timeDifference <= 1:
                interval = 'PT1M';
                break;
            case timeDifference <= 12:
                interval = 'PT5M';
                break;
            case timeDifference <= 24: // 1 day
                interval = 'PT15M';
                break;
            case timeDifference <= 168: // 7 days
                interval = 'PT6H';
                break;
            case timeDifference <= 744: // 31 days (approx 1 month)
                interval = 'PT12H';
                break;
            case timeDifference <= 4320: // 6 months
                interval = 'P1D';
                break;
            default:
                interval = 'P1W';
        }
    }

    return interval;
};

const timeframeBuilder = (getStart, enumValue, getEnd) => () => {
    const now = new Date();
    const end = getEnd ? getEnd(now) : now;
    const start = getStart(end);

    const withoutInterval = {
        start: start.toISOString(),
        unixStart: getUnixTime(start),
        end: end.toISOString(),
        unixEnd: getUnixTime(end),
        enum: enumValue
    };

    return { ...withoutInterval, interval: resolveTimeframeInterval(withoutInterval) };
};

const timeframes = {
    last1hour: timeframeBuilder((endDate) => subHours(endDate, 1), 'last1hour'),
    last12hours: timeframeBuilder((endDate) => subHours(endDate, 12), 'last12hours'),
    last24hours: timeframeBuilder((endDate) => subHours(endDate, 24), 'last24hours'),
    last7days: timeframeBuilder((endDate) => subDays(endDate, 7), 'last7days'),
    last30days: timeframeBuilder((endDate) => subDays(endDate, 30), 'last30days'),
    thisMonth: timeframeBuilder(
        (endDate) => startOfMonth(endDate),
        'thisMonth',
        (now) => endOfMonth(now)
    ),
    thisQuarter: timeframeBuilder(
        (endDate) => startOfQuarter(endDate),
        'thisQuarter',
        (now) => endOfQuarter(now)
    ),
    thisYear: timeframeBuilder(
        (endDate) => startOfYear(endDate),
        'thisYear',
        (now) => endOfYear(now)
    ),
    lastMonth: timeframeBuilder(
        (endDate) => startOfMonth(endDate),
        'lastMonth',
        (now) => endOfMonth(subMonths(now, 1))
    ),
    lastQuarter: timeframeBuilder(
        (endDate) => startOfQuarter(endDate),
        'lastQuarter',
        (now) => endOfQuarter(subQuarters(now, 1))
    ),
    lastYear: timeframeBuilder(
        (endDate) => startOfYear(endDate),
        'lastYear',
        (now) => endOfYear(subYears(now, 1))
    )
};

const getTimeframe = async (supportedTimeframes = undefined) => {
    const answer = await inquirer.prompt([
        {
            type: 'list',
            name: 'timeframe',
            message: 'What timeframe do you want to test with?',
            choices: () =>
                [
                    { name: 'last1hour', value: timeframes.last1hour },
                    { name: 'last12hours', value: timeframes.last12hours },
                    { name: 'last24hours', value: timeframes.last24hours },
                    { name: 'last7days', value: timeframes.last7days },
                    { name: 'last30days', value: timeframes.last30days },
                    { name: 'thisMonth', value: timeframes.thisMonth },
                    { name: 'thisQuarter', value: timeframes.thisQuarter },
                    { name: 'thisYear', value: timeframes.thisYear },
                    { name: 'lastMonth', value: timeframes.lastMonth },
                    { name: 'lastQuarter', value: timeframes.lastQuarter },
                    { name: 'lastYear', value: timeframes.lastYear }
                ].filter((tf) => supportedTimeframes === undefined || supportedTimeframes.includes(tf.name))
        }
    ]);

    return answer.timeframe();
};

const testDataStream = async (dataStream, dataSource) => {
    console.log(`Testing ${dataStream.definition.name} - matches: ${JSON.stringify(dataStream.definition.matches)}`);
    const filterFn = getMatchesFilter(dataStream.definition.matches);
    let targetNodes = importedGraph.vertices.filter(filterFn);

    if (targetNodes.length > 0) {
        const tnAnswer = await inquirer.prompt([
            {
                type: 'list',
                name: 'targetNodes',
                message: `Do you want to select targetNodes individually or use all ${targetNodes.length} node${
                    targetNodes.length === 1 ? '' : 's'
                }?`,
                choices: () => [
                    'Select targetNodes individually',
                    `Use all ${targetNodes.length} node${targetNodes.length === 1 ? '' : 's'}?`
                ]
            }
        ]);
        if (tnAnswer.targetNodes === 'Select targetNodes individually') {
            let selectedNodes = [];
            const availableNodesByName = targetNodes.reduce(
                (acc, tn) => acc.set(`${tn.name} (${tn.type}|${tn.sourceType})`, tn),
                new Map()
            );
            let done = false;
            do {
                const selectAnswer = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'selection',
                        message: `Add another target node to the ${selectedNodes.length} already selected?`,
                        choices: () => [
                            { name: '(Done)', value: '(Done)' },
                            ...Array.from(availableNodesByName.entries()).map(([key, value]) => ({ name: key, value }))
                        ]
                    }
                ]);
                if (selectAnswer.selection === '(Done)') {
                    done = true;
                } else {
                    const tn = selectAnswer.selection;
                    selectedNodes.push(tn);
                    availableNodesByName.delete(`${tn.name} (${tn.type}|${tn.sourceType})`);
                }
            } while (!done && availableNodesByName.size > 0);
            targetNodes = selectedNodes;
        }
    }

    // Make the nodes look like CosmosDB nodes
    targetNodes = processTargetNodes(targetNodes);

    // Prompt for timeframe if needed
    const timeframe =
        dataStream.definition.timeframes === false
            ? undefined
            : Array.isArray(dataStream.definition.timeframes)
                ? await getTimeframe(dataStream.definition.timeframes)
                : await getTimeframe();

    // Prompt for configurable dataSourceConfig items if needed.
    const dataSourceConfig = { ...dataStream.definition.dataSourceConfig };
    if (Array.isArray(dataStream.template) && dataStream.template.length > 0) {
        console.log('Configure data stream request:');
        const codsAnswer = await inquirer.prompt(dataStream.template.map((field) => getInquirerQuestion(field)));
        Object.assign(dataSourceConfig, codsAnswer);
    }

    const handlerEvent = {
        pluginConfig,
        dataSource,
        dataSourceConfig,
        timeframe
    };

    // eslint-disable-next-line no-unused-vars
    const patchConfig = (propertyName, value, encryption) => {
        pluginConfig[propertyName] = value;
    };
    const api = { log, report, patchConfig };

    let results;
    switch (dataSource.supportedScope) {
        case 'none': {
            if (dataStream.definition.matches !== 'none') {
                throw new Error(
                    `data source ${dataSource.definition.name} has matches mismatch: supportedScope=${
                        dataSource.supportedScope
                    } but matches=${JSON.stringify(dataStream.definition.matches)}`
                );
            }
            results = await handler.readDataSource(handlerEvent, api);
            break;
        }
        case 'single': {
            if (dataStream.definition.matches === 'none') {
                throw new Error(
                    `data source ${dataSource.definition.name} has matches mismatch: supportedScope=${
                        dataSource.supportedScope
                    } but matches=${JSON.stringify(dataStream.definition.matches)}`
                );
            }
            results = [];
            for (const targetNode of targetNodes) {
                results.push(await handler.readDataSource({ ...handlerEvent, targetNodes: [targetNode] }, api));
            }
            break;
        }
        case 'list': {
            if (dataStream.definition.matches === 'none') {
                throw new Error(
                    `data source ${dataSource.definition.name} has matches mismatch: supportedScope=${
                        dataSource.supportedScope
                    } but matches=${JSON.stringify(dataStream.definition.matches)}`
                );
            }
            results = await handler.readDataSource({ ...handlerEvent, targetNodes }, api);
            break;
        }
        default: {
            throw new Error(
                `data source ${dataSource.definition.name} has invalid supportedScope: ${dataSource.supportedScope}`
            );
        }
    }
    console.log(results);
    console.log('');
};

export const testConfig = async () => {
    console.log('\nTesting testConfig()');
    const handlerEvent = { pluginConfig };

    // eslint-disable-next-line no-unused-vars
    const patchConfig = (propertyName, value, encryption) => {
        handlerEvent.pluginConfig[propertyName] = value;
    };
    const api = { log, report, patchConfig };

    testResult = await handler.testConfig(handlerEvent, api);
    console.log(testResult);
    return testResult;
};

const testPlugin = async () => {
    // Validate
    await checkPluginFiles();
    await checkPluginSourceCode();

    // Load handler
    handler = await loadHandler();

    // Test config
    await getConfig();
    if (metadata.supportsConfigValidation) {
        await testConfig();
    }

    // Import
    console.log('\nTesting importObjects()');
    await checkHandler(true);
    const verticesMessage =
        importedGraph.vertices.length === 1 ? '1 vertex' : `${importedGraph.vertices.length} vertices`;
    const edgesMessage = importedGraph.edges.length === 1 ? '1 edge' : `${importedGraph.edges.length} edges`;
    console.log(`Imported ${verticesMessage} and ${edgesMessage}:`);
    const countsPerType = importedGraph.vertices.reduce((acc, val) => {
        if (!acc.has(val.type)) {
            acc.set(val.type, 0);
        }
        acc.set(val.type, acc.get(val.type) + 1);
        return acc;
    }, new Map());
    for (const type of Array.from(countsPerType.keys()).sort()) {
        const countMessage =
            countsPerType.get(type) === 1
                ? `1 vertex of type ${type}`
                : `${countsPerType.get(type)} vertices of type ${type}`;
        console.log(`    ${countMessage}`);
    }

    // Dump mermaid
    const source = mermaidForImportObjects(importedGraph).join('\n');
    // console.log(
    //     '=========================== Mermaid Source ==================================================================='
    // );
    // console.log(source);
    // console.log(
    //     '=========================== Copy/Paste the above into https://mermaid.live/edit =============================='
    // );
    // const mmUrl = `https://mermaid.ink/img/${Buffer.from(source).toString('base64')}`;
    // console.log(`...or visit: ${mmUrl}`);

    // const mmAnswer = await inquirer.prompt([
    //     {
    //         name: 'showMmd',
    //         type: 'confirm',
    //         message: 'visit Mermaid URL now (opens in default browser)?'
    //     }
    // ]);
    // if (mmAnswer.showMmd) {
    //     open(mmUrl);
    // }

    // Test data streams
    console.log('\nTesting readDataSource()');
    const dataStreamsRaw = loadJsonFromFile(getPluginFilePath('data_streams.json'));
    const dataStreams = preProcessDataStreams({ content: dataStreamsRaw }).content;
    const streamsByName = dataStreams.dataStreams.reduce(
        (acc, val) => (acc.set(val.definition.name, val), acc),
        new Map()
    );

    do {
        const quit = '(Quit)';
        const answer = await inquirer.prompt([
            {
                type: 'list',
                name: 'dataStreamName',
                message: 'Which dataStreamName do you want to test?',
                choices: () => [quit, ...Array.from(streamsByName.keys()).sort()]
            }
        ]);

        if (answer.dataStreamName === quit) {
            break;
        }

        if (typeof handler.readDataSource !== 'function') {
            throw new Error('handler readDataSource is not a function');
        }

        const dataStream = streamsByName.get(answer.dataStreamName);
        const dataSource = dataStreams.dataSources.find((src) => src.name === dataStream.dataSourceName);
        if (!dataSource) {
            throw new Error(
                `Data stream ${answer.dataStreamName} references non-existent data source ${dataStream.dataSourceName}`
            );
        }
        await testDataStream(dataStream, dataSource);

        // eslint-disable-next-line no-constant-condition
    } while (true);
};

const args = process.argv;

(async () => {
    switch (args.length) {
        case 3: {
            switch (args[2]) {
                case '*': {
                    await staticAnalyseAll();
                    break;
                }
                default: {
                    console.log(chalk.red(`Invalid argument: ${args[2]}`));
                    break;
                }
            }
            break;
        }
        case 4: {
            switch (args[2]) {
                case '--plugin':
                case '-p': {
                    pluginPath = path.resolve(args[3]);
                    await validatePlugin();
                    break;
                }
                case '--testPlugin':
                case '-t': {
                    pluginPath = path.resolve(args[3]);
                    await testPlugin();
                    break;
                }
                default: {
                    console.log(chalk.red(`Invalid argument: ${args[2]}`));
                    break;
                }
            }
            break;
        }
        // break if arg length is 6 which is the case when automation is executed
        // revisit to find a better way to handle this
        case 6: {
            break;
        }
        default: {
            await validatePlugin();
            break;
        }
    }
})();

