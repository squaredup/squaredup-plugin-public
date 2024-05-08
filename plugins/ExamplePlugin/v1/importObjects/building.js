const totalNBuildings = 12;
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

            const createEdgeFrom = (bn, an) => context.edges.push({
                label: 'monitors', outV: `app_${an}`, inV: `building_${bn}`
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
    let buildingNum = buildingIndex;
    const buildings = [];
    while(buildingNum < totalNBuildings && buildings.length < apiLimit) {
        buildings.push({
            buildingName: `Building #${buildingNum}`,
            buildingNum
        });
        buildingNum++;
    }
    return ({
        paging: {
            totalLength: totalNBuildings
        },
        data: {
            buildings
        }
    });
}