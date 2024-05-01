import _ from 'lodash';
export async function dataSourceUnscoped(context) {
    const results = [];
    // Simply echo the values of timeframe and the configurable "top" entry in dataSourceConfig
    results.push({
        ...context.timeframe,
        top: context.dataSourceConfig.top
    });
    return results;
}