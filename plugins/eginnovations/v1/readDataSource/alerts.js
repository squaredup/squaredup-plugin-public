// import _ from 'lodash';
import fetch from 'node-fetch';
import https from 'https';

export async function getAlerts(context) {
    const serverUrl = context.pluginConfig.serverUrl;
    const url = `${serverUrl}/api/eg/analytics/getAlerts`;
    context.log.info(url);

    const agent = new https.Agent({
        rejectUnauthorized: false
    });

    // Define the body of the request
    const body = {

        'filterBy': 'ComponentType',
        'filterValues': 'Microsoft SQL,Microsoft Windows,Mobile RUM,eG Manager'

    };

    const headers = {

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


        let data = await response.json();
        let alertsData = [];
        // context.log.info(JSON.stringify(targetNode));
        alertsData = Array.isArray(data) ? data : Object.values(data);
        context.log.info(Array.isArray(alertsData));
        
        return alertsData;




    } catch (error) {
        // Catch and log any errors
        throw new Error('HTTP error! status:' + error);

    }

}
