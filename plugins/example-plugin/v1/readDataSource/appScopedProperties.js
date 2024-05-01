import _ from 'lodash';
import { getScalar } from '../util.js';
export async function appScopedProperties(context) {
    const results = [];
    for (const targetNode of context.targetNodes) {
        const r = _.random(100);
        const row = {
            id: getScalar(targetNode, 'id'),
            name: getScalar(targetNode, 'name'),
            sourceId: getScalar(targetNode, 'sourceId')
        };
        if (Array.isArray(context.dataSourceConfig.properties)) {
            for (const property of context.dataSourceConfig.properties) {
                if (property === 'appStatus') {
                    row[property] = r < 5 ? 'Broken' : r < 20 ? 'Degraded' : r < 30 ? 'Installing' : 'OK';
                } else {
                    row[property] = getScalar(targetNode, property);
                }
            }
        }
        results.push(row);
    }
    return results;
}