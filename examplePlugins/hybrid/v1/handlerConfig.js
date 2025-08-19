import { HandlerFunctionEnum } from './handler.js';
import { stageApps } from './importObjects/apps.js';
import { stageBuildings } from './importObjects/building.js';
import { appScopedProperties } from './readDataSource/appScopedProperties.js';
import { dataSourceUnscoped } from './readDataSource/dataSourceUnscoped.js';

// ============================================================================
//
// testConfig
//
export async function testConfig(context) {
    const messages = [];

    if (typeof context.pluginConfig.serverUrl === 'string' && context.pluginConfig.serverUrl.startsWith('https:')) {
        messages.push({
            'status': 'success',
            'message': 'Testing passed'
        });
    } else {
        messages.push({
            'status': 'warning',
            'message': 'serverUrl is invalid'
        });
        messages.push({
            'status': 'error',
            'message': 'nothing works!'
        });
    }

    const result =  {
        link: 'https://yourCompany.com/docs/plugin/pluginsetup-examplehybrid',
        messages: messages
    };
    return result;

}

// ============================================================================
//
// importObjects
//
export const importStages = [
    stageApps,
    stageBuildings
];

export const defaultApiLimits = {
    apps: 10,
    buildings: 3
};

export const initialPagingContext = {
    appIndex: 0,
    buildingIndex: 0,
    nextToken: undefined
};

export function reportImportProblem(context) {
    return (err, stage) => {
        if (['UnrecognizedClientException', 'InvalidSignatureException'].includes(err.name)) {
            context.report.error('The configured access key details are invalid');
        } else if (['AccessDeniedException', 'AccessDenied', 'UnauthorizedOperation'].includes(err.name)) {
            context.log.warn(`The configured access key has no permission to import ${stage} objects`);
        } else {
            context.log.warn(`${stage} objects failed to import: ${err.message}`);
        }
    };
}

// ============================================================================
//
// readDataSource
//
export const dataSourceFns = {
    appScopedProperties,
    dataSourceUnscoped
};

// ============================================================================
//
// oAuth
//
export async function authBegin(context) {
    // Only needed if the plugin requires OAuth - consult documentation for more information
    throw new Error('Not implemented');
}

export async function authCodeResponse(context) {
    // Only needed if the plugin requires OAuth - consult documentation for more information
    throw new Error('Not implemented');
}


// ============================================================================
//
// Generic
//
export async function configureContext(context, functionName) {
    // Used to apply universal configuration to your context object
    // For instance, a client from a library or a frequently used value
    context.retryCount = 0;

    // You can use the function name to take different actions depending on the function being called
    if ([HandlerFunctionEnum.oAuth2, HandlerFunctionEnum.testConfig].includes(functionName)) {
        // For example, when dealing with OAuth or configuration tests, you might prefer handling certain tasks manually
        return;
    }

    // Track what warnings have been sent to the user so we don't bombard them with the same message
    context.warnings = new Set();
}