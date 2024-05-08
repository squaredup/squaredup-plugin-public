export const totalNApps = 37;
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
        sourceName: `myPluginName:${context.pluginConfig.serverUrl}`,
        name: appObject.appName,
        type: 'app',
        sourceType: 'mySortOfApp',
        sourceId: `app_${appObject.appNum}`,
        appType: appObject.appType
    };
    context.vertices.push(vertex);

    return vertex;
}

async function GetAppObjectsFromExternalApi(context, appIndex, apiLimit) {
    // This example code makes no use of the plugin configuration in the context object
    // A real plugin would be making HTTP requests authenticated with information in
    // the plugin configuration using fetch and creating vertices and edges using the
    // information thus obtained.
    let appNum = appIndex;
    const apps = [];
    while(appNum < totalNApps && apps.length < apiLimit) {
        const appType = (appNum & 7) === 0
            ? 'Hybrid'
            : (appNum & 7) === 5
                ? 'ThinClient'
                : (appNum & 7) === 3
                    ? 'FatClient'
                    : 'Web';
        apps.push({
            appName: `Application #${appNum}`,
            appNum,
            appType
        });
        appNum++;
    }
    return ({
        paging: {
            totalLength: totalNApps
        },
        data: {
            apps
        }
    });
}