// import _ from 'lodash';
import fetch from 'node-fetch';
import https from 'https';

export async function getAlarmCount(context) {
    const url = 'https://172.16.8.229:7077/api/eg/analytics/getAlarmCount';

    const agent = new https.Agent({
        rejectUnauthorized: false
    });

    const headers = {

        user: context.pluginConfig.user,
        pwd: Buffer.from(context.pluginConfig.pwd).toString('base64'),
        managerurl: 'https://172.16.8.229:7077',
        accessID: context.pluginConfig.accessID
    };
    try {
        // Await the fetch request
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            agent: agent
        });

        // Check if the response is OK
        if (!response.ok) {
            // throw new Error(`HTTP error! status: ${response.status}`);
        }


            let data = await response.json();

        context.log.info(JSON.stringify(data));
        
    }
    catch (error) {
        // Catch and log any errors
        throw new Error('HTTP error! status:' + error);
    }

}
