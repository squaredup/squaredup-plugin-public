/* eslint-disable no-shadow */
/* eslint-disable brace-style */
import { getApi } from './logReport.js';

const timeInSeconds = 24 * 60 * 60 * 30; //1 months time
const setRemainingTime = (time) => ({
    getRemainingTimeMs: () => time
});

export const testDataStreams = async ({
    readDataSource,
    dataStreamsJson,
    definitionName,
    pluginConfig,
    dataSourceConfig,
    nodes,
    timeFrameInSeconds = timeInSeconds,
    runtimeContext = 280000
}) => {
    const dataStream = dataStreamsJson.dataStreams.find((x) => x.definition.name === definitionName);
    const dataSource = dataStreamsJson.dataSources.find((x) => x.name === dataStream.dataSourceName);

    const unixEnd = Math.round(new Date().getTime() / 1000);
    const unixStart = unixEnd - timeFrameInSeconds;
    
    const remainingMs = setRemainingTime(runtimeContext);

    const transformTargetNodes = (trgObjs) =>
        trgObjs.map((trgObj) => {
            const result = {};
            for (const [key, value] of Object.entries(trgObj)) {
                if (key === 'links') {
                    result[key] = [JSON.stringify(value)];
                } else {
                    result[key] = Array.isArray(value) ? value : [value];
                }
            }
            return result;
        });

    let matchingNodes = nodes;

    //filtering matching nodes with matches all
    if (dataStream.definition.matches === 'all') {
        matchingNodes = nodes;
    }
    // filtering matching nodes with matches none
    else if (dataStream.definition.matches === 'none') {
        matchingNodes = [];
    }

    //filtering matching nodes with matches object
    else if (
        typeof dataStream.definition.matches === 'object' &&
        Array.isArray(dataStream.definition.matches) === false
    ) {
        const matchKeys = Object.keys(dataStream.definition.matches);
        let oneOfTargetNodes = [];
        for (const matchKey of matchKeys) {
            if (dataStream.definition.matches[matchKey].type === 'equals') {
                matchingNodes = matchingNodes.filter(
                    (v) => v[matchKey.split('.')[0]] === dataStream.definition.matches[matchKey].value
                );
            }
        }
        const oneOfKeys = matchKeys.filter((matchKey) => dataStream.definition.matches[matchKey].type === 'oneOf');
        if (oneOfKeys.length > 0) {
            for (const value of dataStream.definition.matches[oneOfKeys[0]].values) {
                const filteredMatch = matchingNodes.filter((v) => v[oneOfKeys[0].split('.')[0]] === value);
                if (filteredMatch.length > 0) {
                    oneOfTargetNodes.push(...filteredMatch);
                }
            }
            matchingNodes = oneOfTargetNodes;
        }
    }

    //filtering matching nodes with matches Array object
    else if (Array.isArray(dataStream.definition.matches)) {
        let arrayTargetNodes = [];
        for (const match of dataStream.definition.matches) {
            let arrayMatchingNodes = matchingNodes;
            const matchKeys = Object.keys(match);
            let oneOfTargetNodes = [];
            for (const matchKey of matchKeys) {
                if (match[matchKey].type === 'equals') {
                    arrayMatchingNodes = arrayMatchingNodes.filter(
                        (v) => v[matchKey.split('.')[0]] === match[matchKey].value
                    );
                }
            }
            const oneOfKeys = matchKeys.filter((matchKey) => match[matchKey].type === 'oneOf');
            if (oneOfKeys.length > 0) {
                for (const value of match[oneOfKeys[0]].values) {
                    const filteredMatch = arrayMatchingNodes.filter((v) => v[oneOfKeys[0].split('.')[0]] === value);
                    if (filteredMatch.length > 0) {
                        oneOfTargetNodes.push(...filteredMatch);
                    }
                }
                arrayMatchingNodes = oneOfTargetNodes;
            }
            arrayTargetNodes.push(...arrayMatchingNodes);
        }

        if (arrayTargetNodes.length === 0) {
            console.error('No nodes matched stream');
        }

        matchingNodes = arrayTargetNodes;
    }

    const targetNodes = transformTargetNodes(matchingNodes);
    const allData = [];

    //invoking readDataSource
    const readDataStreams = async (targetNodes) => {
        const data = await readDataSource(
            {
                pluginConfig: pluginConfig,
                dataSource: dataSource,
                dataSourceConfig:
                    dataSourceConfig === undefined
                        ? dataStream.definition.dataSourceConfig
                        : { ...dataStream.definition.dataSourceConfig, ...dataSourceConfig },
                targetNodes: targetNodes,
                timeframe: {
                    unixStart,
                    start: new Date(unixStart * 1000).toISOString(), //needs to be in ISO format for M365 reports
                    unixEnd,
                    end: new Date(unixEnd * 1000).toISOString() //needs to be in ISO format for M365 reports
                }
            },
            getApi(pluginConfig, remainingMs)
        );
        return data;
    };

    // based on DataSource Scope Support, the targetNodes will be supplied to ReadDataSource function
     if (dataSource.supportedScope === 'list' || dataSource.supportedScope === 'none') {
        const data = await readDataStreams(targetNodes);
        if (data.result === 'rawData') {
            allData.push(...data.data);
        } else {
            if (Array.isArray(data)) {
                allData.push(...data);
            } else {
                allData.push(data);
            }
        }
    } else {
        for (const targetNode of targetNodes) {
            const data = await readDataStreams([targetNode]);
            allData.push(...data);
        }
    }

    return allData;
};
