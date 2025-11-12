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

export async function testConfig(context) {
    const { pluginConfig, log } = context;
    const messages = [];

    const result = {
        link: 'https://www.eginnovations.com/documentation/eG-Enterprise-User-Guides.htm',
        messages
    };

    const newMessage = (message, status = 'error') => messages.push({ message, status });

    // =============================================================
    // Step 1: Validate required configuration values
    // =============================================================
    log.debug('Starting eG Innovations testConfig validation');

    if (!pluginConfig.serverUrl) {
        newMessage('Server URL is required.');
        return result;
    }

    if (!pluginConfig.user || !pluginConfig.pwd || !pluginConfig.accessID) {
        newMessage('Missing required configuration: user, pwd, or accessID');
        return result;
    }


    // =============================================================
    //  Test authentication using eG Innovations Login API
    // =============================================================
    const agent = new https.Agent({ rejectUnauthorized: false });

    const uname = pluginConfig.user;
    const upass = Buffer.from(pluginConfig.pwd).toString('base64');
    const accessID = pluginConfig.accessID;
    const serverUrl = pluginConfig.serverUrl;

    const loginUrl = `${serverUrl}/final/eGMobileService/getLoginSquaredup?uname=${encodeURIComponent(uname)}&user_from=squaredup&upass=${encodeURIComponent(upass)}&accessID=${encodeURIComponent(accessID)}`;

    log.debug('Constructed login URL', { loginUrl });

    try {
        const response = await fetch(loginUrl, { agent, method: 'GET' });
        const status = response.status;
        const contentType = response.headers.get('content-type') || '';

        log.debug('Login API response status', { status });

        if (!contentType.includes('application/json')) {
            newMessage('Unexpected response format: server did not return JSON.');
            return result;
        }

        const data = await response.json();
        log.debug('Parsed login API response', { data });

        // =============================================================
        // Handle known response codes and messages
        // =============================================================
        switch (status) {
            case 200:
                if (data.output?.toLowerCase() === 'success' || data.code === 200) {
                    newMessage('Authentication successful. Connection to eG Innovations verified.', 'success');
                } else {
                    newMessage(`Unexpected success response: ${data.output || 'No output message.'}`, 'warning');
                }
                break;

            case 400:
                if (data.output?.includes('Invalid AccessID')) {
                    newMessage('Authentication failed: Invalid AccessID. Please provide a valid AccessID.');
                } else {
                    newMessage('Authentication failed: Bad Request (400). Please check your input values.');
                }
                break;

            case 401:
                if (data.output?.includes('Invalid username or password')) {
                    newMessage('Authentication failed: Invalid username or password. Please check your credentials.');
                } else {
                    newMessage('Authentication failed: Unauthorized (401). Please check credentials.');
                }
                break;

            case 404:
                newMessage('Authentication failed: Endpoint not found (404). Please verify the server URL and API path.');
                break;

            case 405:
                newMessage('Authentication failed: Method not allowed (405). Please contact your system administrator.');
                break;

            default:
                newMessage(`Authentication failed: ${status} ${response.statusText}. Please check credentials or server availability.`);
                break;
        }

    } catch (error) {
        log.error('Error during authentication', { message: error.message, stack: error.stack });
        if (error.code === 'ENOTFOUND') {
            newMessage(`Domain not found for ${serverUrl}. Please verify the server URL.`);
        } else if (error.code === 'ECONNREFUSED') {
            newMessage(`Connection refused by ${serverUrl}. The server may be down or blocking requests.`);
        } else if (error.message.includes('self signed certificate')) {
            newMessage('SSL error: The server uses a self-signed certificate. Please ensure it’s trusted or contact your admin.');
        } else {
            newMessage(`Authentication failed: ${error.message}. Please check your credentials or network connection.`);
        }
    }

    // =============================================================
    //  Return final structured result
    // =============================================================
    pluginConfig.testResult = result;
    return result;
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
