import { testConfig as testConfigImpl, importStages, defaultApiLimits, initialPagingContext, reportImportProblem, dataSourceFns } from './handlerConfig.js';

// ============================================================================
//
// testConfig
//
export async function testConfig(event, api) {
    const { pluginConfig } = event;
    const { log, report, patchConfig } = api;

    const context = {
        pluginConfig,

        log, report, patchConfig
    };

    return testConfigImpl(context);
}

// ============================================================================
//
// importObjects
//
export async function importObjects(event, api) {
    const { pluginConfig, pagingContext } = event;
    const { log, report, patchConfig } = api;

    const context = {
        vertices: [], edges: [],

        pluginConfig, pagingContext,

        log, report, patchConfig,

        apiLimits: Object.assign({}, defaultApiLimits, pluginConfig.testSettings?.apiLimits ?? {})
    };
    const pageAPI = (context) => {
        return {
            get: (key) => context.pagingContext[key],
            set: (key, value) => { context.pagingContext[key] = value; },
            clear: () => { context.pagingContext = {}; }
        };
    };
    context.pageAPI = pageAPI(context);
    context.reportImportProblem = reportImportProblem(context);

    if (!context.pageAPI.get('squaredUp_isInit')) {

        // Set initial paging context values
        context.pageAPI.set('squaredUp_stage', 0);
        for (const [key, value] of Object.entries(initialPagingContext)) {
            context.pageAPI.set(key, value);
        }
        context.pageAPI.set('squaredUp_isInit', true);
    }

    // Run through the appropriate stages until we've been running for 10 minutes or we've created results larger than 2MB.
    const maxElapsedTimeMSecs = pluginConfig.testSettings?.maxElapsedTimeMSecs ?? 10 * 60 * 1000;
    const maxPayloadSize = pluginConfig.testSettings?.maxPayloadSize ?? 2 * 1024 * 1024;
    let stage = context.pageAPI.get('squaredUp_stage');
    context.log.debug('importObjects starts: ' +
        `stage=${stage}, ` +
        `apiLimits=${JSON.stringify(context.apiLimits)}, ` +
        `maxElapsedTimeMSecs=${maxElapsedTimeMSecs}, ` +
        `maxPayloadSize=${maxPayloadSize}`);
    const start = Date.now();
    let elapsed;
    let payloadSize;
    do {
        if (await importStages[stage](context)) {
            // Stage reported it has finished... step to the next one
            stage++;
            context.pageAPI.set('squaredUp_stage', stage);

            if (stage >= importStages.length) {
                // No more stages, so set pagingContext to an empty object to
                // indicate import is complete
                context.pageAPI.clear();
                break;
            }
        }
        elapsed = Date.now() - start;
        const pagingContextSize = JSON.stringify(context.pagingContext).length;
        payloadSize = JSON.stringify({ vertices: context.vertices, edges: context.edges, pagingContext: context.pagingContext }).length;
        context.log.debug(`importObjects looping: elapsed = ${elapsed}, payloadSize=${payloadSize}, pagingContextSize=${pagingContextSize}`);
    } while (elapsed < maxElapsedTimeMSecs && payloadSize < maxPayloadSize);
    context.log.debug('importObjects loop ends');

    // Return the results
    const result = {
        vertices: context.vertices,
        edges: context.edges,
        pagingContext: context.pagingContext
    };
    return result;

}

// ============================================================================
//
// readDataSource
//
export async function readDataSource(event, api) {
    const { pluginConfig, dataSource, dataSourceConfig, targetNodes, timeframe } = event;
    const { log, report, patchConfig } = api;

    const context = {
        pluginConfig, dataSource, dataSourceConfig, targetNodes, timeframe,
        log, report, patchConfig
    };

    const dataSourceFn = dataSourceFns[dataSource.name];
    if (!dataSourceFn) {
        throw new Error(`No data source function was found for data source ${dataSource.name}`);
    }

    return dataSourceFn(context);
}
