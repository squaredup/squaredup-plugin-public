import { timeframes } from '@squaredup/timeframes';
import cp from 'child_process';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import util from 'util';

// get the command line arguments and look for -p or --plugin to fetch the path of the plugin we're testing
const args = process.argv;
let pluginPath = './';
let skipPackages = false;
let timestampFiles = false;
let timestampLogs = false;
let markLogs = false;
let staticMs = false;
let testNameRegex;
let pluginConfigFile;
let buildConfig;
let isCloud = true;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '-p' || args[i] === '--plugin') {
        pluginPath = path.resolve(args[i + 1]);
    }
    if (args[i] === '-s' || args[i] === '--skip-packages') {
        skipPackages = true;
    }
    if (args[i] === '-t' || args[i] === '--timestamp-files') {
        timestampFiles = true;
    }
    if (args[i] === '-tl' || args[i] === '--timestamp-logs') {
        timestampLogs = true;
    }
    if (args[i] === '-r' || args[i] === '--regex-filter') {
        const filter = args[++i];

        if (!filter) {
            throw new Error('Must provide filter when using -r');
        }

        testNameRegex = new RegExp(filter, 'i');
    }
    if (args[i] === '-c' || args[i] === '--testConfig.json') {
        const filePath = !args[i + 1] || args[i + 1].startsWith('-') ? pluginPath + 'testConfig.json' : args[i + 1];

        pluginConfigFile = path.resolve(filePath);
    }
    if (args[i] === '-m' || args[i] === '--mark-logs') {
        markLogs = true;
    }
    if (args[i] === '-srm' || args[i] === '--static-remaining-ms') {
        staticMs = Number(args[i + 1]);
    }
    if (args[i] === '-op' || args[1] === '--onPrem') {
        isCloud = false;
    }
}

const timestamp = new Date().toISOString().replace(/:/g, '-');
const handlerFileName = 'handler.js';
const packageFileName = 'package.json';
const buildConfigFileName = 'build_config.json';

const getPluginFilePath = (file) => path.join(pluginPath, file);
const exec = util.promisify(cp.exec);

// Return JSON from loaded file
const loadJsonFromFile = (filePath) => {
    const rawdata = fs.readFileSync(filePath);
    return JSON.parse(rawdata);
};

const patches = new Map();

const saveTestConfig = () => {
    for (const [key, value] of patches) {
        pluginConfig[key] = value;
    }

    const newConfig = JSON.stringify(pluginConfig, null, '\t');

    fs.writeFileSync(pluginConfigFile, newConfig);
};

// create an API object to simulate the cloud
const createApiObject = (testName) => {
    // start a timer to spit our when asked for a report
    const startTime = new Date();
    const startMs = performance.now();

    if (testName) {
        // write to a file in the datastream_test_results subfolder of the plugin
        logTestMessage(testName, '***************************************************************************');
        logTestMessage(testName, `Starting test: ${testName} at ${startTime.toISOString()}`);
        logTestMessage(testName, '***************************************************************************');
    }

    const warnings = [];
    let warningCount = 0;
    let warnCount = 0;
    let debugCount = 0;
    let infoCount = 0;
    let errorCount = 0;

    const logger = (prefix, text, object) => {
        if (object) {
            text += ` ${JSON.stringify(object)}`;
        }

        let message = '';
        if (timestampLogs) {
            message += new Date().toISOString();
        }

        if (markLogs) {
            const mark = performance.now() - startMs;
            message += timestampLogs ? ` (${mark}ms)` : `(${mark}ms)`;
        }

        message += timestampLogs || markLogs ? ` ${prefix} ${text}` : `${prefix} ${text}`;

        if (testName) {
            // write to a file in the datastream_test_results subfolder of the plugin
            logTestMessage(testName, message);
        } else {
            console.log(message);
        }
    };

    const debug = (text, object) => {
        logger('DEBUG:', text, object);
        debugCount++;
    };

    const info = (text, object) => {
        logger('INFO:', text, object);
        infoCount++;
    };

    const warn = (text, object) => {
        logger('WARN:', text, object);
        warnCount++;
    };

    const error = (text, object) => {
        logger('ERROR:', text, object);
        errorCount++;
    };

    const reportWarning = (text) => {
        console.log('plugin reports warning: ' + text);
        warningCount++;
        if (warnings.reduce((acc, val) => acc + val.length, 0) < 2000) {
            warnings.push(text);
        }
    };

    function reportError(text, err) {
        console.log('plugin reports fatal error: ' + text);
        console.log(err);

        const newError = new Error('Fatal error in datastream call');
        newError.isUserFacing = true;

        throw newError;
    }

    // This creates a log entry of reportable plugin alerts
    const pluginAlert = (message, type) => {
        error(
            '[PLUGIN_ALERT] ' +
                JSON.stringify({
                    message: message,
                    type: type
                })
        );
    };

    const patchConfig = (propertyName, propertyValue, encryption) => {
        patches.set(propertyName, propertyValue);

        const value = `Name: ${propertyName} Value: ${JSON.stringify(propertyValue)}`;

        const message = encryption ? `PATCH_CONFIG_ENCRYPTED: ${value}` : `PATCH_CONFIG: ${value}`;

        testName ? logTestMessage(testName, message) : console.log(message);
    };

    const getRemainingTimeMs = () => {
        if (staticMs) {
            return staticMs;
        }

        const {
            timeout: { readDataSource }
        } = buildConfig;
        const timeoutMs = readDataSource * 1000;

        return timeoutMs - (performance.now() - startMs);
    };

    const log = { debug, info, warn, error: error, lumigoAlert: pluginAlert, pluginAlert };
    const report = { error: reportError, warning: reportWarning };
    const runtimeContext = { getRemainingTimeMs, isCloud };

    function printStatus(testName) {
        console.log(`\n\nTest: ${testName}`);
        console.log(`Debug: ${debugCount}`);
        console.log(`Info: ${infoCount}`);
        console.log(`Warn: ${warnCount}`);
        console.log(`Error: ${errorCount}`);

        console.log(`Reported warnings: ${warningCount}`);
        console.log(JSON.stringify(warnings, null, 2));
    }

    function getStatusString(testName, rowCount) {
        return `\n\nRun Summary for ${testName} at ${new Date().toISOString()}
Duration: \t\t\t ${new Date() - startTime}ms
Rows returned: \t\t ${rowCount}
Debug messages: \t ${debugCount}
Info messages: \t\t ${infoCount}
Warn messages: \t\t ${warnCount}
Error messages: \t ${errorCount}
Reported warnings:\t ${warningCount}
${JSON.stringify(warnings, null, 2)}`;
    }

    if (isCloud) {
        return { log, report, runtimeContext, printStatus, getStatusString, patchConfig };
    }

    return { log, report, printStatus, getStatusString, patchConfig };
};

// Returns loaded import handler
const loadHandler = async () => {
    const packagePath = getPluginFilePath(packageFileName);
    const buildConfigPath = getPluginFilePath(buildConfigFileName);

    if (fs.existsSync(buildConfigPath)) {
        buildConfig = loadJsonFromFile(buildConfigPath);
    } else {
        buildConfig = {
            timeout: {
                readDataSource: 8
            }
        };
    }

    if (fs.existsSync(packagePath)) {
        if (!skipPackages) {
            // Ensure npm packages are installed
            console.log('Installing node packages...');
            const prevWd = process.cwd();
            process.chdir(pluginPath);
            const packageName = loadJsonFromFile(packagePath).name;
            await exec(`pnpm i --frozen-lockfile --filter ${packageName}`);
            process.chdir(prevWd);
        }
        const handler = await import(pathToFileURL(getPluginFilePath(handlerFileName)));
        return handler;
    } else {
        return false;
    }
};

function logTestMessage(testName, text) {
    const debugPath = getPluginFilePath('datastream_test_results');
    if (!fs.existsSync(debugPath)) {
        fs.mkdirSync(debugPath);
    }
    const debugFileName = `${testName}.log`;

    let debugFilePath = path.join(debugPath, debugFileName);
    if (timestampFiles) {
        debugFilePath = path.join(debugPath, `${testName}_${timestamp}.log`);
    }

    fs.appendFileSync(debugFilePath, text + '\n');
}

function recordResults(config, data, api) {
    const resultsPath = getPluginFilePath('datastream_test_results');
    if (!fs.existsSync(resultsPath)) {
        fs.mkdirSync(resultsPath);
    }

    let resultsFileName = `${config.datastream_test_name}.json`;
    if (timestampFiles) {
        resultsFileName = `${config.datastream_test_name}_${timestamp}.json`;
    }

    const resultsFilePath = path.join(resultsPath, resultsFileName);
    fs.writeFileSync(resultsFilePath, JSON.stringify(data, null, 2));

    // append api.getStatusString to runSummary.txt or create it if it doesn't exist
    const runSummaryPath = path.join(resultsPath, 'runSummary.log');
    const runSummary = api.getStatusString(config.datastream_test_name, data.length);
    if (fs.existsSync(runSummaryPath)) {
        fs.appendFileSync(runSummaryPath, runSummary);
    } else {
        fs.writeFileSync(runSummaryPath, runSummary);
    }
}

const configFilePath = getPluginFilePath('testDatastreamConfig.json');
// if we didn't find a plugin path, throw an error
if (!fs.existsSync(configFilePath)) {
    throw new Error('No testDatastreamConfig.json found in plugin path: ' + pluginPath);
}

const targetNodeFilePath = getPluginFilePath('testTargetNodeConfig.json');
let targetNodeConfig;
if (fs.existsSync(targetNodeFilePath)) {
    targetNodeConfig = loadJsonFromFile(targetNodeFilePath);
}

function setTargetNodes(config) {
    if (targetNodeConfig == null) {
        return;
    }

    const { targetNodes } = config;

    if (typeof targetNodes === 'string') {
        const replacement = targetNodeConfig[targetNodes];

        if (replacement == null) {
            throw new Error(`No replacement found for ${targetNodes} in ${targetNodeFilePath}`);
        }

        console.log(`Replacing ${targetNodes} with matching configuration from ${targetNodeFilePath}`);
        config.targetNodes = replacement;
    }
}

const setTimeframe = (config) => {
    const { timeframe } = config;

    if (typeof timeframe !== 'string') {
        return;
    }

    const replacement = timeframes[timeframe];

    if (replacement == null) {
        throw new Error(
            `No replacement found for ${timeframe} in valid timeframes: ${Object.keys(timeframes).join(', ')}`
        );
    }

    console.log(`Replacing ${timeframe} with matching configuration from timeframes`);
    config.timeframe = replacement();
};

const testDataSourceConfigFilePath = getPluginFilePath('testDataSourceConfig.json');
let testDataSourceConfig;
if (fs.existsSync(testDataSourceConfigFilePath)) {
    testDataSourceConfig = loadJsonFromFile(testDataSourceConfigFilePath);
}

const setDataSourceConfig = (config) => {
    if (testDataSourceConfig == null) {
        return;
    }

    const { dataSourceConfig } = config;

    if (typeof dataSourceConfig === 'string') {
        const replacement = testDataSourceConfig[dataSourceConfig];

        if (replacement == null) {
            throw new Error(`No replacement found for ${dataSourceConfig} in ${testDataSourceConfigFilePath}`);
        }

        console.log(`Replacing ${dataSourceConfig} with matching configuration from ${testDataSourceConfigFilePath}`);
        config.dataSourceConfig = replacement;
    }
};

async function performTest(testConfig, pluginConfig) {
    const datastreamHandler = await loadHandler();

    if (Array.isArray(testConfig)) {
        console.log(`Found ${testConfig.length} configurations`);

        if (testNameRegex) {
            testConfig = testConfig.filter((t) => t.datastream_test_name.match(testNameRegex));

            console.log(`Filtered to ${testConfig.length} configurations`);
        }

        for (const config of testConfig) {
            if (pluginConfig) {
                config.pluginConfig = pluginConfig;
            }

            if (config.extendPluginConfig) {
                config.pluginConfig = {
                    ...config.pluginConfig,
                    ...config.extendPluginConfig
                };
            }

            setTargetNodes(config);
            setTimeframe(config);
            setDataSourceConfig(config);

            try {
                console.log('Running test: ' + config.datastream_test_name);
                const api = createApiObject(config.datastream_test_name);

                let handler;
                switch (config.dataSource.name) {
                    case '__oAuth2':
                        handler = datastreamHandler.oAuth2;
                        break;

                    case '__testConfig':
                        handler = datastreamHandler.testConfig;
                        break;

                    case '__import':
                        handler = datastreamHandler.importObjects;
                        config.pagingContext = {};
                        break;

                    default:
                        handler = datastreamHandler.readDataSource;
                }

                const data = await handler(config, api);

                // write the results to a file in the datastream_test_results subfolder of the plugin
                recordResults(config, data, api);
            } catch (error) {
                console.log('Terminating error running test: ' + config.datastream_test_name);
                console.log(error);
            }
        }
    } else {
        if (pluginConfig) {
            testConfig.pluginConfig = pluginConfig;
        }

        setTargetNodes(testConfig);
        setTimeframe(testConfig);
        setDataSourceConfig(testConfig);

        const api = createApiObject(testConfig.datastream_test_name);
        const data = await datastreamHandler.readDataSource(testConfig, api);

        // write the results to a file in the datastream_test_results subfolder of the plugin
        recordResults(testConfig, data, api);
    }

    if (pluginConfigFile) {
        saveTestConfig();
    }
}

const testConfig = loadJsonFromFile(configFilePath);

let pluginConfig;
if (pluginConfigFile) {
    pluginConfig = loadJsonFromFile(pluginConfigFile);

    if (Array.isArray(pluginConfig)) {
        throw new Error('Multiple testConfig.json profiles not supported');
    }
}

performTest(testConfig, pluginConfig);
