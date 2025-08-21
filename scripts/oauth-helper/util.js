import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

let oAuthFields;
let pluginConfig;

const patches = new Map();

const hr = '***************************************************************************';
const timestampString = new Date().toISOString().replace(/:/gu, '-');

// Reads OAuth fields out of a plugins ui.json so we can shoehorn them in later
const loadOauthFields = (pluginDirectory) => {
    if (Array.isArray(oAuthFields)) {
        return;
    }

    const uiPath = path.join(pluginDirectory, 'ui.json');

    const uiConf = loadJsonFromFile(uiPath);

    oAuthFields = uiConf.map(reduceFields).flat(Infinity).filter(Boolean);
};

const reduceFields = (field) => {
    const { type, fields } = field;

    if (type === 'oAuth2') {
        return field;
    }

    if (type === 'fieldGroup') {
        return fields.map(reduceFields);
    }
};

const raiseError = (message) => {
    console.error(message);
    throw new Error(message);
};

const loadTestConfig = (pluginDirectory) => {
    const configPath = path.join(pluginDirectory, 'testconfig.json');

    const config = loadJsonFromFile(configPath);

    if (Array.isArray(config)) {
        raiseError('testconfig Array not yet supported');
    }

    return config;
};

const saveTestConfig = (pluginDirectory, pluginConfig) => {
    const configPath = path.join(pluginDirectory, 'testconfig.json');

    if (typeof pluginConfig !== 'object') {
        raiseError('Required to provide pluginConfig');
    }

    const newConfig = JSON.stringify(pluginConfig, null, '\t');

    fs.writeFileSync(configPath, newConfig);
};

// Used to write out log/report messages from the plugin (and anything else we may want to shoehorn in)
const getLogger = (pluginDirectory, options = { timestamp: true }) => {
    const { timestamp } = options;

    const logPath = path.join(pluginDirectory, 'oauth_test_results');

    if (!fs.existsSync(logPath)) {
        fs.mkdirSync(logPath);
    }

    const logName = timestamp ?
        `oauth-test_${timestampString}.log` :
        'oauth-test.log';

    const logFile = path.join(logPath, logName);

    const logMessage = (message) => {
        fs.appendFileSync(logFile, message + '\n');
    };

    return logMessage;
};

const getApiObject = (pluginDirectory) => {

    const logMessage = getLogger(pluginDirectory);

    const startTime = new Date();
    const startMs = performance.now();

    logMessage(hr);
    logMessage(`Starting test at ${startTime.toISOString()}`);
    logMessage(hr);

    const logger = (prefix, text, object) => {
        if (object) {
            text += ` ${JSON.stringify(object)}`;
        }

        const message = ` ${new Date().toISOString()} (${performance.now() - startMs}) - ${text}`;

        logMessage(prefix + message);
    };

    const log = {
        debug: (message, object) => logger('DEBUG:', message, object),
        info: (message, object) => logger('INFO:', message, object),
        warn: (message, object) => logger('WARN:', message, object),
        error: (message, object) => {
            console.error(message);
            console.dir(object);
            logger('ERROR:', message, object);
        }
    };

    const report = {
        warning: (message, object) => {
            const prefix = 'REPORTS Warning: ';
            console.log(prefix + message);
            console.dir(object);
            logger(prefix, message, object);
        },
        error: (message, object) => {
            const prefix = 'REPORTS Error: ';
            console.error(prefix + message);
            console.dir(object);
            logger(prefix, message, object);
        }
    };

    const api = {
        log,
        patchConfig: (name, value, encryption) => {
            logger('Patching:', ` ${name}${encryption ? ' with encryption': '' }`);
            patches.set(name, value);
        },
        report,
        runtimeContext: {} // no undefined type error, but also not fleshing this out as I don't think we need it
    };

    return api;
};

// loading into a local variable to allow for re-use
export const loadPluginConfig = (pluginDirectory) => {
    pluginConfig = loadTestConfig(pluginDirectory);
    return pluginConfig;
};

export const loadJsonFromFile = (filePath) => {
    const rawData = fs.readFileSync(filePath);
    return JSON.parse(rawData);
};

export const savePatches = (pluginDirectory) => {

    for (const [key, value] of patches) {
        pluginConfig[key] = value;
    }

    saveTestConfig(pluginDirectory, pluginConfig);
};

export const loadOAuthHandler = async (pluginDirectory) => {

    loadPluginConfig(pluginDirectory);
    loadOauthFields(pluginDirectory);

    const api = getApiObject(pluginDirectory);

    const handlerPath = path.join(pluginDirectory, 'handler.js');

    const handler = await import(pathToFileURL(handlerPath));

    if (!handler) {
        throw new Error('Handler not found');
    }

    if (typeof handler.oAuth2 !== 'function') {
        throw new Error('Plugin does not support oAuth');
    }

    const { oAuth2 } = handler;

    // I'm not going to entertain the idea of more than one button for the moment
    const oAuth2Name = oAuthFields[0].name;

    const oAuth2Begin = async (redirectUri) => {
    
        const stateObject = { 
            comment: 'Dave doesn\'t think that we really need this if we\'re not interacting with the product, but he\'s also not confident enough to not make it JSON',
            timestamp: new Date() // generate something that changes the state somewhat
        };
        const stateJson = JSON.stringify(stateObject);
        const state = Buffer.from(stateJson).toString('base64');
    
        const event = {
            pluginConfig,
            
            oAuth2Config: { oAuth2Name },
            dataSourceConfig: { oAuth2Stage: 'oAuth2Begin' } 
        };
    
        for (const field of oAuthFields) {
            const { name } = field;
    
            if (!event.pluginConfig.name) {
                event.pluginConfig[name] = {
                    redirectUri,
                    state
                };
            }
        }
    
        return oAuth2(event, api);
    };

    const oAuth2CodeResponse = async (query) => {
        const patch = patches.get(oAuth2Name);
        patch.queryArgs = query;

        const event = {
            pluginConfig: {
                ...pluginConfig,
                ...patch
            },
    
            oAuth2Config: { oAuth2Name },
            dataSourceConfig: { 
                oAuth2Stage: 'oAuth2CodeResponse'
            } 
        };

        const response = await oAuth2(event, api);

        return { response, lastPatch: patches.get(oAuth2Name) };
    };

    return {
        oAuth2Begin,
        oAuth2CodeResponse
    };
};