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
