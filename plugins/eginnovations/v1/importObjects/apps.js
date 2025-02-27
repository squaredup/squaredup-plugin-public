import fetch from 'node-fetch';
import https from 'https';

export let totalNApps = 10;
export async function stageApps(context) {
    let finished = false;
    let apiLimit = context.apiLimits.apps;

    try {
        let appIndex = context.pageAPI.get('appIndex');
        context.log.debug(`Getting page of ${apiLimit} apps from ${appIndex}`);

        const response = await GetAppObjectsFromExternalApi(context, appIndex, apiLimit);

        for (const app of response.data.apps) {
            addVertexForApp(context, app);
        }
        appIndex += apiLimit;
        // console.log(context.vertices);
        if (appIndex < response.paging.totalLength) {
            context.pageAPI.set('appIndex', appIndex);
        } else {
            finished = true;
        }
    } catch (err) {
        context.reportImportProblem(err, 'Apps');
        finished = true;
    }
    return finished;
    
}

async function addVertexForApp(context, appObject) {

    const vertex = {
        sourceName: "eG Enterprise", // a readable identifier of the plug-in that imported the vertex
        name: appObject.appName, //the name of the vertex to be displayed in the UI.//componentName
        type: 'app', // a lowercase string identifying the overarching type of the vertex (this will determine the grouping and icon used when the vertex is viewed in the UI). See the list in custom_types.json. For example: “host”
        sourceType: 'mySortOfApp', // a more specific type, name of relevance to the plug-in (e.g. for scoping purposes). For example: “myservicehost“.
        sourceId: appObject.appNum, //a unique id of this vertex within this instance of the plug-in.//componentID
        appType: appObject.appType//componentType
    };
    context.vertices.push(vertex);


    return vertex;
}

async function GetAppObjectsFromExternalApi(context, appIndex, apiLimit) {
    // This example code makes no use of the plugin configuration in the context object
    // A real plugin would be making HTTP requests authenticated with information in
    // the plugin configuration using fetch and creating vertices and edges using the
    // information thus obtained.
    const url = "https://172.16.8.229:7077/api/eg/analytics/getComponentsDetails";

    const agent = new https.Agent({
        rejectUnauthorized: false
    });

    // Define the body of the request
    const body = {
        from: "squaredup"
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

        const apps = [];
        const data = await response.json();

        let appNum = appIndex;

        totalNApps = data.total;
        while (appNum < totalNApps && apps.length < apiLimit) {
            data.details.forEach(detail => {

                Object.keys(detail).forEach(category => {

                    detail[category].forEach(component => {

                        apps.push({
                            appType: category,
                            appNum: component.componentID,
                            appName: component.componentName
                        });
                    });
                });
            });
            appNum++;
        }

        return {
            paging: {
                totalLength: totalNApps
            },
            data: {
                apps
            }
        }


    } catch (error) {
        // Catch and log any errors
        console.error('fetch error:', error);

    }


}
