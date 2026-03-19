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
import { getDescriptorForComponentTestLive } from './readDataSource/getDescriptorForComponentTestLive.js';
import { getDescriptorForComponentTestHistorical } from './readDataSource/getDescriptorForComponentTestHistorical.js';

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
        // Step 1: Validate configuration
        if (!pluginConfig.serverUrl) {
            newMessage('Server URL is required.');
            return result;
        }
        if (!pluginConfig.user || !pluginConfig.pwd || !pluginConfig.accessID) {
            newMessage('Missing required configuration fields.');
            return result;
        }

        // Validate URL
        let url;
        try {
            url = new URL(pluginConfig.serverUrl);
        } catch {
            newMessage('Invalid server URL format.');
            return result;
        }

        if (url.protocol !== 'https:') {
            newMessage('Server URL must begin with https://');
            return result;
        }

        // Step 2: Test Login API
        const agent = new https.Agent({ rejectUnauthorized: false });
        const uname = pluginConfig.user;
        const upass = Buffer.from(pluginConfig.pwd).toString('base64');
        const accessID = pluginConfig.accessID;
        const serverUrl = pluginConfig.serverUrl;

        const loginUrl = `${serverUrl}/final/eGMobileService/getLoginSquaredup?uname=${encodeURIComponent(uname)}&user_from=squaredup&upass=${encodeURIComponent(upass)}&accessID=${encodeURIComponent(accessID)}`;

        // DO NOT log full URL containing credentials
        log.info('Testing login API (URL hidden for security)');

        let response;
        try {
            response = await fetch(loginUrl, { agent, method: 'GET' });
        } catch (error) {
            newMessage('Network error contacting login API. Please check connectivity.');
            log.error(`Network error (details hidden): ${error.message}`);
            return result;
        }

        const status = response.status;
        const contentType = response.headers.get('content-type') || '';
        let data = {};

        if (contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch {
                newMessage('Invalid JSON response from eG Enterprise server.');
                return result;
            }
        } else {
            newMessage('Server did not return JSON.');
            return result;
        }

        // Log without exposing credentials
        log.info('Login API response received (content hidden)');

        // Step 3: Authentication results
        if (status === 200 && data.output?.toLowerCase() === 'success') {
            newMessage('Authentication successful.', 'success');
        } else if (status === 400 || data.output?.includes('Invalid AccessID')) {
            newMessage('Authentication failed: Invalid AccessID.');
        } else if (status === 401 || data.output?.includes('Invalid username or password')) {
            newMessage('Authentication failed: Invalid username or password.');
        } else if (status === 404) {
            newMessage('Authentication failed: API endpoint not found (404).');
        } else if (status === 405) {
            newMessage('Authentication failed: Method not allowed (405).');
        } else {
            newMessage(`Authentication failed with status ${status}.`);
        }

    } catch (error) {
        log.error(`TestConfig error (hidden details): ${error.message}`);
        newMessage('Unexpected internal error occurred.', 'error');
    }

    // DO NOT log raw result (it may contain sensitive info)
    log.info('TestConfig completed, result sanitized.');

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
    getMeasureForTest,
    getDescriptorForComponentTestLive,
    getDescriptorForComponentTestHistorical
};
