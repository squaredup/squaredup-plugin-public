import _ from 'lodash';
import fetch from 'node-fetch';
import https from 'https';
import { getScalar } from '../util.js';

export async function getAlerts(context) {
    const url = "https://172.16.8.229:7077/api/eg/analytics/getAlerts";
    
        const agent = new https.Agent({
            rejectUnauthorized: false
        });
    
        // Define the body of the request
        const body = {
            
                "filterBy": "ComponentType",
                "filterValues": "Microsoft SQL,Microsoft Windows,Mobile RUM,eG Manager"
            
        };
    
        const headers = {
    
            user: context.pluginConfig.user,
            pwd: Buffer.from(context.pluginConfig.pwd).toString('base64'),
            managerurl: "https://172.16.8.229:7077",
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
    
            
            const data = await response.json();
            const results = [];
           console.log(data);
           for (const targetNode of context.targetNodes) {
            const r = _.random(100);
            const row = {
                componentType:getScalar(targetNode, 'componentType'),
                measure:getScalar(targetNode, 'measure'),
                test:getScalar(targetNode, 'test'),
                service:getScalar(targetNode, 'service'),
                alarmID:getScalar(targetNode, 'alarmID'),
                description:getScalar(targetNode, 'description'),
                startTime:getScalar(targetNode, 'startTime'),
                componentName:getScalar(targetNode, 'componentName'),
                priority:getScalar(targetNode, 'priority'),
                layer:getScalar(targetNode, 'layer')
               
            };
            if (Array.isArray(context.dataSourceConfig.properties)) {
                for (const property of context.dataSourceConfig.properties) {
                    if (property === 'appStatus') {
                        row[property] = r < 5 ? 'Broken' : r < 20 ? 'Degraded' : r < 30 ? 'Installing' : 'OK';
                    }else if(property === 'measure'){
                        row[property] = getScalar(targetNode, property);

                    } else {
                        row[property] = getScalar(targetNode, property);
                    }
                }
            }
            results.push(row);
        }
        return results;
    
            
    
    
        } catch (error) {
            // Catch and log any errors
            console.error('fetch error:', error);
    
        }
    
}
