// import _ from 'lodash';
import https from 'https';
import fetch from 'node-fetch';

export async function getHistoricalData(context) {
    const serverUrl = context.pluginConfig.serverUrl;
    const url = `${serverUrl}/api/eg/analytics/getHistoricalData`;
    context.log.info(url);
    context.log.info(JSON.stringify(context.dataSourceConfig));
    const agent = new https.Agent({
        rejectUnauthorized: false
    });



    // Define the body of the request
    const body = {
        timeline: context.dataSourceConfig.timeline,//'1 hour',
        componentName:context.dataSourceConfig.componentName, //'172.16.8.112:7077',
        componentType: context.dataSourceConfig.componentType, //'eG Manager',
        test: context.dataSourceConfig.test, //'Network',
        measure: context.dataSourceConfig.measure,//'Packet Loss',
        from: 'squaredup'
    };

    const headers = {
        'Content-Type': 'application/json',
        user: context.pluginConfig.user,
        pwd: Buffer.from(context.pluginConfig.pwd).toString('base64'),
        managerurl: `${serverUrl}`,
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
        const dynamicKey = Object.keys(data)[0];
        context.log.info(dynamicKey);
        return data[dynamicKey];
    } catch (error) {
        // Catch and log any errors
        context.log.error(`Error in getHistoricalData: ${error.message}`);
        throw new Error(`HTTP error! status: ${error.message}`);
    }
}
