import { stageApps } from './importObjects/apps.js';
import { stageBuildings } from './importObjects/building.js';
import { appScopedProperties } from './readDataSource/appScopedProperties.js';
import { dataSourceUnscoped } from './readDataSource/dataSourceUnscoped.js';
import { getAlerts } from './readDataSource/getAlerts.js';

import fetch from 'node-fetch';
import https from 'https';
import { getComponentsByState } from './readDataSource/getComponentsByState.js';
import { getAlarmCount } from './readDataSource/getAlarmCount.js';

// ============================================================================
//
// testConfig
//

export async function testConfig(context) {
    const messages = [];

    // =========================Write the HTTP Login API to authenticate the username and password===================================================
    if (typeof context.pluginConfig.user === 'string' && typeof context.pluginConfig.pwd === 'string' && typeof context.pluginConfig.accessID === 'string') {

        const agent = new https.Agent({
            rejectUnauthorized: false
        });
        const uname = context.pluginConfig.user;
        const upass = Buffer.from(context.pluginConfig.pwd).toString('base64');
        const accessID = context.pluginConfig.accessID;


        const url = `https://172.16.8.229:7077/final/eGMobileService/getLoginSquaredup?uname=${uname}&user_from=squaredup&upass=${upass}&accessID=${accessID}`;

        try {
            // Await the fetch request
            const response = await fetch(url, { agent });

            // Check if the response is OK
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Parse the JSON response
            const data = await response.json();

            if (data.output === 'success') {
                messages.push({
                    status: 'success',
                    message: 'Testing passed'
                });

            } else {
                messages.push({
                    status: 'error',
                    message: 'nothing works!'
                });
            }
            const result = {
                link: 'https://www.eginnovations.com/documentation/eG-Enterprise-User-Guides.htm',
                messages: messages
            };
            return result;
        } catch (error) {
            // Catch and log any errors
            throw new Error('HTTP error! status:'+error);

        }
    }


}

// ============================================================================
//
// importObjects
//
export const importStages = [stageApps, stageBuildings];

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
    dataSourceUnscoped,
    getAlerts,
    getComponentsByState,
    getAlarmCount
};
