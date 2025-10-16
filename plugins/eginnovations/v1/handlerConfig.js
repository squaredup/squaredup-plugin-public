import { stageComponents } from './importObjects/components.js';
import { getAlerts } from './readDataSource/alerts.js';
import { getComponentsByState } from './readDataSource/componentsByState.js';
import { getAlarmCount } from './readDataSource/alarmCount.js';
import fetch from 'node-fetch';
import https from 'https';
import { getLiveMeasure } from './readDataSource/getLiveMeasure.js';
import { getHistoricalData } from './readDataSource/getHistoricalData.js';
import { getComponentsByType } from './readDataSource/getComponentsByType.js';
import { getUserComponentsForType } from './readDataSource/getUserComponentsForType.js';
import { getTestForType } from './readDataSource/getTestForType.js';
import { getMeasureForTest } from './readDataSource/getMeasureForTest.js';

    
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
        const serverUrl = context.pluginConfig.serverUrl;
        const uname = context.pluginConfig.user;
        const upass = Buffer.from(context.pluginConfig.pwd).toString('base64');
        const accessID = context.pluginConfig.accessID;

        const url = `${serverUrl}/final/eGMobileService/getLoginSquaredup?uname=${uname}&user_from=squaredup&upass=${upass}&accessID=${accessID}`;
       
        try {
            // Await the fetch request
            const response = await fetch(url, { agent });

            // Check if the response is OK
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Response is not JSON');
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
                    message: 'Authentication failed - please check your credentials'
                });
            }
            
            const result = {
                link: 'https://www.eginnovations.com/documentation/eG-Enterprise-User-Guides.htm',
                messages: messages
            };
            return result;
            
        } catch (error) {
            // Catch and log any errors
            context.log.error(`Error in testConfig: ${error.message}`);
            messages.push({
                status: 'error',
                message: `Authentication failed - please check your credentials: ${error.message}`
            });
            
            const result = {
                link: 'https://www.eginnovations.com/documentation/eG-Enterprise-User-Guides.htm',
                messages: messages
            };
            return result;
        }
    } else {
        messages.push({
            status: 'error',
            message: 'Missing required configuration: user, pwd, or accessID'
        });
        
        const result = {
            link: 'https://www.eginnovations.com/documentation/eG-Enterprise-User-Guides.htm',
            messages: messages
        };
        return result;
    }
}

// ============================================================================
//
// importObjects
//
export const importStages = [stageComponents];

export const defaultApiLimits = {
    apps: 50
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
    getAlerts,
    getComponentsByState,
    getAlarmCount,
    getLiveMeasure,
    getHistoricalData,
    getComponentsByType,
    getUserComponentsForType,
    getTestForType,
    getMeasureForTest

};
