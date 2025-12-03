import fetch from 'node-fetch';
import https from 'https';

export let totalNApps = 50;
export async function stageComponents(context) {
    let finished = false;
    let apiLimit = context.apiLimits.apps;

    try {
        let appIndex = context.pageAPI.get('appIndex');
        context.log.debug(`Getting page of ${apiLimit} apps from index ${appIndex}`);

        const response = await GetAppObjectsFromExternalApi(context, appIndex, apiLimit);

        if (!response || !response.data || !response.data.apps) {
            context.log.info('No valid response data received from API - may indicate no components available');
            finished = true;
            return finished;
        }

        context.log.debug(`Received ${response.data.apps.length} apps from API`);

        // Add vertices for each app
        for (const app of response.data.apps) {
            addVertexForApp(context, app);
        }

        context.log.debug(`Added ${response.data.apps.length} vertices. Total vertices: ${context.vertices.length}`);

        // Update paging context
        const totalLength = response.paging.totalLength || 0;
        appIndex += response.data.apps.length; // Use actual returned count instead of apiLimit

        context.log.debug(`Paging: processed ${appIndex} of ${totalLength} total components`);

        if (appIndex < totalLength && response.data.apps.length > 0) {
            // More data available and we got results
            context.pageAPI.set('appIndex', appIndex);
            context.log.debug(`Setting next appIndex to ${appIndex}`);
        } else {
            // Either reached the end or got no results
            finished = true;
            context.log.debug('Import stage completed');
        }
    } catch (err) {
        context.log.error(`Error in stageComponents: ${err.message}`);
        context.reportImportProblem(err, 'Apps');
        finished = true;
    }
    return finished;
}

async function addVertexForApp(context, appObject) {

    const vertex = {
        sourceName: 'eG Enterprise', // a readable identifier of the plug-in that imported the vertex
        name: appObject.appName, //the name of the vertex to be displayed in the UI.//componentName
        type: 'app', // a lowercase string identifying the overarching type of the vertex (this will determine the grouping and icon used when the vertex is viewed in the UI). See the list in custom_types.json. For example: “host”
        sourceType: 'eGComponents', // a more specific type, name of relevance to the plug-in (e.g. for scoping purposes). For example: “myservicehost“.
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
    const apps = [];
    const url = `${context.pluginConfig.serverUrl}/api/eg/analytics/getComponentsDetails`;

    const agent = new https.Agent({
        rejectUnauthorized: false
    });

    // Define the body of the request
    const body = {
        from: 'squaredup'
    };

    const headers = {

        user: context.pluginConfig.user,
        pwd: Buffer.from(context.pluginConfig.pwd).toString('base64'),
        managerurl: context.pluginConfig.serverUrl,
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

        // Log response details for debugging
        const contentType = response.headers.get('content-type');
        context.log.debug(`API response status: ${response.status}, content-type: ${contentType}`);

        let data;
        try {
            data = await response.json();
            context.log.debug('Successfully parsed JSON response');
        } catch (jsonError) {
            context.log.error(`Failed to parse API response as JSON: ${jsonError.message}`);
            throw new Error(`Invalid JSON response: ${jsonError.message}`);
        }

        // Log the response structure (but not the full data to avoid huge logs)
        context.log.debug(`Response structure: ${JSON.stringify({
            hasDetails: Boolean(data.details),
            detailsType: Array.isArray(data.details) ? 'array' : typeof data.details,
            detailsLength: Array.isArray(data.details) ? data.details.length : 'N/A',
            total: data.total,
            otherKeys: Object.keys(data).filter(key => key !== 'details')
        })}`);

        // Keep the existing full response logging for now (can be removed later)
        context.log.info(JSON.stringify(data));

        // Validate the response structure
        if (!data || !data.details) {
            context.log.info('API response missing data.details - may indicate no components available');
            return {
                paging: { totalLength: 0 },
                data: { apps: [] }
            };
        }

        if (!Array.isArray(data.details)) {
            context.log.info('API response data.details is not an array - may indicate different response format');
            return {
                paging: { totalLength: 0 },
                data: { apps: [] }
            };
        }

        totalNApps = data.total || 0;
        context.log.debug(`Total components available: ${totalNApps}, processing from index: ${appIndex}, limit: ${apiLimit}`);

        // Process the details from the API response
        let processedCount = 0;
        for (const detail of data.details) {
            if (processedCount >= apiLimit) {
                break; // Don't exceed the API limit
            }

            if (typeof detail !== 'object' || detail === null) {
                context.log.warn('Skipping invalid detail object:', detail);
                continue;
            }

            for (const category of Object.keys(detail)) {
                if (!Array.isArray(detail[category])) {
                    context.log.warn(`Skipping category '${category}' - not an array:`, detail[category]);
                    continue;
                }

                for (const component of detail[category]) {
                    if (processedCount >= apiLimit) {
                        break; // Don't exceed the API limit
                    }

                    if (!component || !component.componentID || !component.componentName) {
                        context.log.warn('Skipping invalid component:', component);
                        continue;
                    }

                    apps.push({
                        appType: category,
                        appNum: component.componentID,
                        appName: component.componentName
                    });
                    processedCount++;
                }

                if (processedCount >= apiLimit) {
                    break; // Don't exceed the API limit
                }
            }
        }

        context.log.debug(`Processed ${apps.length} components from API response`);

        return {
            paging: {
                totalLength: totalNApps
            },
            data: {
                apps
            }
        };
    } catch (error) {
        // Catch and log any errors with more detail
        context.log.error(`Error in GetAppObjectsFromExternalApi: ${error.message}`);
        throw new Error('HTTP error! status: ' + error.message);
    }


}
