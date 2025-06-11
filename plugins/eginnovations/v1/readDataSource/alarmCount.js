import fetch from 'node-fetch';
import https from 'https';

export async function getAlarmCount(context) {
    const serverUrl = context.pluginConfig.serverUrl;

    const url = `${serverUrl}/api/eg/analytics/getAlarmCount`;
    context.log.info(url);

    const agent = new https.Agent({
        rejectUnauthorized: false
    });

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
            headers: headers,
            agent: agent
        });

        // Check if the response is OK
        if (!response.ok) {
            // throw new Error(`HTTP error! status: ${response.status}`);
        }

        let data = await response.json();
         context.log.info(JSON.stringify(data));
        let alarmCount = [];
       
        alarmCount = Array.isArray(data) ? data : Object.values(data);
        // context.log.info(Array.isArray(alarmCount));
        return alarmCount;
    
    }
    catch (error) {
        // Catch and log any errors
        throw new Error('HTTP error! status:' + error);
    }

}
