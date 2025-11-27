import https from 'https';
import fetch from 'node-fetch';
import { stageComponents } from './importObjects/components.js';
import { getAlarmCount } from './readDataSource/alarmCount.js';
import { getAlerts } from './readDataSource/alerts.js';
import { getComponentsByState } from './readDataSource/componentsByState.js';
import { getComponentsByType } from './readDataSource/getComponentsByType.js';
import { getHistoricalData } from './readDataSource/getHistoricalData.js';
import { getLiveMeasure } from './readDataSource/getLiveMeasure.js';
import { getMeasureForTest } from './readDataSource/getMeasureForTest.js';
import { getTestForType } from './readDataSource/getTestForType.js';
import { getUserComponentsForType } from './readDataSource/getUserComponentsForType.js';

// ============================================================================

/**
 * Test configuration for eG Innovations integration.
 * Authenticates the provided credentials and prevents continuation on failure.
 */

export async function testConfig(context) {
    const { pluginConfig, log } = context;
    const messages = [];

    const result = {
        link: 'https://www.eginnovations.com/documentation/eG-Enterprise-User-Guides.htm',
        messages
    };

    const newMessage = (message, status = 'error') => {
        messages.push({ message, status });
        log.info(`[testConfig] ${status.toUpperCase()}: ${message}`);
    };

    try {
        //Step 1: Validate configuration values
        if (!pluginConfig.serverUrl) {
            newMessage('Server URL is required.');
            log.info(JSON.stringify(result));
            return result;
        }
        if (!pluginConfig.user || !pluginConfig.pwd || !pluginConfig.accessID) {
            newMessage('Missing required configuration: user, pwd, or accessID.');
            log.info(JSON.stringify(result));
            return result;
        }

       // Validate URL format
        let url;
        try {
            url = new URL(pluginConfig.serverUrl);
        } catch {
            newMessage(`Invalid server URL: ${pluginConfig.serverUrl}`);
            log.info(JSON.stringify(result));
            return result;
        }

        if (url.protocol !== 'https:') {
            newMessage('Server URL must start with https:// for secure communication.');
            log.info(JSON.stringify(result));
            return result;
        }

        // Step 2: Test Login API directly
        const agent = new https.Agent({ rejectUnauthorized: false });
        const uname = pluginConfig.user;
        const upass = Buffer.from(pluginConfig.pwd).toString('base64');
        const accessID = pluginConfig.accessID;
        const serverUrl = pluginConfig.serverUrl;

        const loginUrl = `${serverUrl}/final/eGMobileService/getLoginSquaredup?uname=${encodeURIComponent(uname)}&user_from=squaredup&upass=${encodeURIComponent(upass)}&accessID=${encodeURIComponent(accessID)}`;

        log.info('Testing login API', { loginUrl });

        let response;
        try {
            response = await fetch(loginUrl, { agent, method: 'GET' });
        } catch (error) {
            newMessage(`Network error contacting login API: ${error.message}`);
            log.info(JSON.stringify(result));
            return result;
        }

        const status = response.status;
        const contentType = response.headers.get('content-type') || '';
        let data = {};

        if (contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch {
                newMessage('Failed to parse JSON response from eG Innovations server.');
                log.info(JSON.stringify(result));
                return result;
            }
        } else {
            newMessage('Server did not return valid JSON.');
            log.info(JSON.stringify(result));
            return result;
        }

        log.info('Login API response', { status, data });

        // Step 3: Handle authentication results
        if (status === 200 && data.output?.toLowerCase() === 'success') {
            newMessage('Authentication successful. Connection to eG Innovations verified.', 'success');
        } else if (status === 400 || data.output?.includes('Invalid AccessID')) {
            newMessage('Authentication failed: Invalid AccessID. Please provide a valid AccessID.');
        } else if (status === 401 || data.output?.includes('Invalid username or password')) {
            newMessage('Authentication failed: Invalid username or password. Please check your credentials.');
        } else if (status === 404) {
            newMessage('Authentication failed: Endpoint not found (404). Please verify the server URL and API path.');
        } else if (status === 405) {
            newMessage('Authentication failed: Method not allowed (405). Please contact your administrator.');
        } else {
            newMessage(`Authentication failed: ${status} ${response.statusText}.`);
        }
    } catch (error) {
        log.error('TestConfig error', { message: error.message, stack: error.stack });
        newMessage(error.message, 'error');
    }

    pluginConfig.testResult = result;
    
    log.info(JSON.stringify(result));
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
