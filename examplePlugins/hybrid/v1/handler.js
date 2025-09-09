import {
    authBegin,
    authCodeResponse,
    configureContext,
    dataSourceFns,
    defaultApiLimits,
    importStages,
    initialPagingContext, reportImportProblem,
    testConfig as testConfigImpl
} from './handlerConfig.js';

export const HandlerFunctionEnum = Object.freeze({
    testConfig: 'testConfig',
    importObjects: 'importObjects',
    readDataSource: 'readDataSource',
    oAuth2: 'oAuth2'
});

// ============================================================================
//
// testConfig
//
export async function testConfig(event, api) {
    const { pluginConfig } = event;
    const { log, report, patchConfig, runtimeContext } = api;

    const context = {
        pluginConfig,

        log, report, patchConfig, runtimeContext
    };

    await configureContext(context, HandlerFunctionEnum.testConfig);

    return testConfigImpl(context);
}

// ============================================================================
//
// importObjects
//
export async function importObjects(event, api) {
    const { pluginConfig, pagingContext } = event;
    const { log, report, patchConfig, runtimeContext } = api;

    const context = {
        vertices: [], edges: [],

        pluginConfig, pagingContext,

        log, report, patchConfig, runtimeContext,

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

    await configureContext(context, HandlerFunctionEnum.importObjects);

    if (Array.isArray(importStages) && importStages.length > 0) {

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
        let rateLimited = false;
        do {
            context.pageAPI.set('rateLimitDelay', undefined);
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
            const rateLimitDelay = context.pageAPI.get('rateLimitDelay') ?? 0;
            if (rateLimitDelay) {
                // Stage reported it was rate limited, so wait synchronously before continuing if we have time, otherwise
                // end this page of import and return the results so far.
                if (elapsed + rateLimitDelay < maxElapsedTimeMSecs && payloadSize < maxPayloadSize) {
                    context.log.debug(`importObjects rate limited: elapsed = ${elapsed}, synchronously delaying ${rateLimitDelay} msecs`);
                    await new Promise((resolve) => setTimeout(resolve, rateLimitDelay));
                    elapsed = Date.now() - start;
                } else {
                    context.log.debug(`importObjects rate limited: elapsed = ${elapsed}, ending page early`);
                    rateLimited = true;
                }
            }
            context.log.debug(`importObjects looping: elapsed = ${elapsed}, payloadSize=${payloadSize}, pagingContextSize=${pagingContextSize}`);
        } while (!rateLimited && elapsed < maxElapsedTimeMSecs && payloadSize < maxPayloadSize);
        context.log.debug('importObjects loop ends');
    }

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
    const { log, report, patchConfig, runtimeContext } = api;

    const context = {
        pluginConfig, dataSource, dataSourceConfig, targetNodes, timeframe,
        log, report, patchConfig, runtimeContext
    };

    await configureContext(context, HandlerFunctionEnum.readDataSource);

    const dataSourceFn = dataSourceFns[dataSource.name];
    if (!dataSourceFn) {
        throw new Error(`No data source function was found for data source ${dataSource.name}`);
    }

    return dataSourceFn(context);
}

// ============================================================================
//
// oAuth2
//
export async function oAuth2 ({ pluginConfig, dataSourceConfig, oAuth2Config }, { log, report, patchConfig }) {
    const context = {
        pluginConfig,
        dataSourceConfig,
        oAuth2Config,
        log,
        report,
        patchConfig
    };

    await configureContext(context, HandlerFunctionEnum.oAuth2);

    switch (dataSourceConfig.oAuth2Stage) {
        case 'oAuth2Begin':
            return authBegin(context);

        case 'oAuth2CodeResponse':
            return authCodeResponse(context);

        default:
            throw new Error(`Invalid oAuth2Stage: "${dataSourceConfig.oAuth2Stage}"`);
    }
}