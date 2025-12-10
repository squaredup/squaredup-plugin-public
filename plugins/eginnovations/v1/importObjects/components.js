import fetch from 'node-fetch';
import https from 'https';

export let totalNApps = 2;

/**
 * stageComponents
 * Executes repeatedly by SquaredUp until `finished = true`.
 * Pagination is handled here using context.pageAPI.
 */
export async function stageComponents(context) {
    let finished = false;

    const pageSize = context.apiLimits.apps;    // e.g. 50
    let appIndex = context.pageAPI.get('appIndex') || 0;

    context.log.debug(`Fetching page: offset=${appIndex}, limit=${pageSize}`);

    try {
        // Load ALL objects from API (single call)
        const response = await GetAppObjectsFromExternalApi(context);

        if (!response || !response.data || !response.data.apps) {
            context.log.info('No valid data returned from API.');
            return true;
        }

        const allApps = response.data.apps;
        const totalLength = response.paging.totalLength;

        context.log.debug(`Total Apps from API: ${totalLength}`);

        // -----------------------------
        // Apply pagination (no duplicates!)
        // -----------------------------
        const page = allApps.slice(appIndex, appIndex + pageSize);

        context.log.debug(`Returning ${page.length} paged apps`);

        // Add only this page's objects
        for (const app of page) {
            addVertexForApp(context, app);
        }

        // Move the index forward
        appIndex += page.length;

        if (appIndex < totalLength && page.length > 0) {
            // Continue to next page
            context.pageAPI.set('appIndex', appIndex);
            context.log.debug(`Next page will start at appIndex=${appIndex}`);
            finished = false;
        } else {
            // Finished all pages
            context.log.debug('All pages imported. Import complete.');
            finished = true;

            // Reset for next full import cycle
            context.pageAPI.set('appIndex', 0);
        }
    } catch (err) {
        context.log.error(`Error in stageComponents: ${err.message}`);
        context.reportImportProblem(err, 'Apps');
        finished = true;
    }

    return finished;
}

/**
 * Creates a vertex for SquaredUp graph.
 */
async function addVertexForApp(context, appObject) {
    const vertex = {
        sourceName: 'eG Enterprise',
        name: appObject.appName,
        type: 'app',
        sourceType: 'eGComponents',
        sourceId: appObject.appNum,
        appType: appObject.appType
    };

    context.vertices.push(vertex);
    return vertex;
}

/**
 * Calls API ONCE and flattens ALL objects.
 * Pagination is *not* done here anymore.
 */
async function GetAppObjectsFromExternalApi(context) {
    const url = `${context.pluginConfig.serverUrl}/api/eg/analytics/getComponentsDetails`;

    const agent = new https.Agent({ rejectUnauthorized: false });

    const body = { from: 'squaredup' };

    const headers = {
        user: context.pluginConfig.user,
        pwd: Buffer.from(context.pluginConfig.pwd).toString('base64'),
        managerurl: context.pluginConfig.serverUrl,
        accessID: context.pluginConfig.accessID
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers,
            agent
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status ${response.status}`);
        }

        const data = await response.json();

        if (!data || !Array.isArray(data.details)) {
            context.log.warn("API returned no components.");
            return {
                paging: { totalLength: 0 },
                data: { apps: [] }
            };
        }

        const apps = [];
        let total = 0;

        // Flatten full response (we paginate later)
        for (const detail of data.details) {
            for (const category of Object.keys(detail)) {
                const arr = detail[category];
                if (!Array.isArray(arr)) continue;

                for (const comp of arr) {
                    if (!comp.componentID || !comp.componentName) continue;

                    apps.push({
                        appType: category,
                        appNum: comp.componentID,
                        appName: comp.componentName
                    });

                    total++;
                }
            }
        }

        totalNApps = total;

        return {
            paging: { totalLength: totalNApps },
            data: { apps }
        };

    } catch (err) {
        context.log.error("GetAppObjectsFromExternalApi error: " + err.message);
        throw err;
    }
}
