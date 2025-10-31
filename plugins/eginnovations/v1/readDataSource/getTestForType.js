// import _ from 'lodash';
import https from 'https';
import fetch from 'node-fetch';

export async function getTestForType(context) {
    const serverUrl = context.pluginConfig.serverUrl;
    const url = `${serverUrl}/api/eg/analytics/getTestForType`;

    const agent = new https.Agent({
        rejectUnauthorized: false
    });

    const body = {
        componentType: JSON.stringify(context.dataSourceConfig.componentType),
        from: 'squaredup'
    };

    const headers = {
        'Content-Type': 'application/json',
        user: context.pluginConfig.user,
        pwd: Buffer.from(context.pluginConfig.pwd).toString('base64'),
        managerurl: serverUrl,
        accessID: context.pluginConfig.accessID
    };

    try {
        // Await the fetch request
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: headers,
            agent: agent
        });

        // Check if the response is OK
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Response is not JSON');
        }

        let data = await response.json();

        return data;
    } catch (error) {
        // Catch and log any errors
        context.log.error(`Error in getTestForType: ${error.message}`);
        throw new Error(`HTTP error! status: ${error.message}`);
    }
}
