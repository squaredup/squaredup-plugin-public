// log functions (part of the api object passed to plugin entry points).
const log = {
    error: async function (msg) {
        console.log(`ERROR: ${msg}`);
    },
    warn: async function (msg) {
        console.log(`WARN: ${msg}`);
    },
    info: async function (msg) {
        console.log(`INFO: ${msg}`);
    },
    debug: async function (msg) {
        console.log(`DEBUG: ${msg}`);
    },
    lumigoAlert: async function (msg) {
        console.log(`LumigoAlert: ${msg}`);
    }
};

const report = {
    warning: async function (text) {
        console.log(`plugin reports warning: ${text}`);
    },
    error: function (text) {
        console.log('plugin reports error: ' + text);
        throw new Error(text);
    }
};

export function getApi(pluginConfig, runtimeContext) {
    const patchConfig = (propertyName, value, encryption) => {
        pluginConfig[propertyName] = value;
        log.debug(`patchConfig: ${propertyName} = ${encryption ? 'encrypted' : value}`);
    };

    return {
        log,
        report,
        patchConfig,
        runtimeContext
    };
}
