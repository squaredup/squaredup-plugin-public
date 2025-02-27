let totalNBuildings = 10;
import { totalNApps } from './apps.js';

export async function stageBuildings(context) {
    let finished = false;
    let apiLimit = context.apiLimits.buildings;

    try {
        let buildingIndex = context.pageAPI.get('buildingIndex');
        context.log.debug(`Getting page of ${apiLimit} buildings from ${buildingIndex}`);

        const response = await GetBuildingObjectsFromExternalApi(context, buildingIndex, apiLimit);
        for (const building of response.data.buildings) {
            addVertexForBuilding(context, building);

            const createEdgeFrom = (bn, an) =>
                context.edges.push({
                    label: 'monitors',
                    outV: `app_${an}`,
                    inV: `building_${bn}`
                });

            // Create a monitoring edge from some random(ish) app to this building
            createEdgeFrom(buildingIndex, (buildingIndex * 53) % totalNApps);
            createEdgeFrom(buildingIndex, (buildingIndex * 59 - 7) % totalNApps);
            createEdgeFrom(buildingIndex, (buildingIndex * 37 + 4) % totalNApps);

            buildingIndex++;
        }
        if (buildingIndex < response.paging.totalLength) {
            context.pageAPI.set('buildingIndex', buildingIndex);
        } else {
            finished = true;
        }
    } catch (err) {
        context.reportImportProblem(err, 'Buildings');
        finished = true;
    }
    return finished;
}

async function addVertexForBuilding(context, buildingObject) {
    const vertex = {
        sourceName: `myPluginName:${context.pluginConfig.serverUrl}`,
        name: buildingObject.buildingName,
        type: 'building',
        sourceType: 'myBuildingType',
        sourceId: `building_${buildingObject.buildingNum}`,
        buildingType: buildingObject.buildingType
    };
    context.vertices.push(vertex);
    return vertex;
}

async function GetBuildingObjectsFromExternalApi(context, buildingIndex, apiLimit) {
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

        const buildings = [];
        const data = await response.json();

        let buildingNum = buildingIndex;

        totalNBuildings = data.total;
        while (buildingNum < totalNBuildings && buildings.length < apiLimit) {
            data.details.forEach(detail => {

                Object.keys(detail).forEach(category => {

                    detail[category].forEach(component => {

                        buildings.push({
                            buildingType: category,
                            buildingNum: component.componentID,
                            buildingName: component.componentName
                        });
                    });
                });
            });
            buildingNum++;
        }

        return {
            paging: {
                totalLength: totalNBuildings
            },
            data: {
                buildings
            }
        }


    } catch (error) {
        // Catch and log any errors
        console.error('fetch error:', error);

    }

}
