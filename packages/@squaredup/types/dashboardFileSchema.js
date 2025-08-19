import { z } from 'zod';
import { supportedTimeframes } from './matchSpecSchema';
import { DataStreamBarChartConfigSchema } from './visualisationConfigs/barChartConfig';
import { DataStreamBlocksConfigSchema } from './visualisationConfigs/blocksConfig';
import { DonutConfigSchema } from './visualisationConfigs/donutConfig';
import { DataStreamGaugeConfigSchema } from './visualisationConfigs/gaugeConfig';
import { DataStreamLineGraphConfigSchema } from './visualisationConfigs/lineGraphConfig';
import { DataStreamScalarConfigSchema } from './visualisationConfigs/scalarSchema';
import { DataStreamTableConfigSchema } from './visualisationConfigs/tableConfig';

const VizConfigSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('data-stream-blocks'),
        config: z.object({
            'data-stream-blocks': DataStreamBlocksConfigSchema.optional()
        }).optional()
    }),
    z.object({
        type: z.literal('data-stream-donut-chart'),
        config: z.object({
            'data-stream-donut-chart': DonutConfigSchema.optional()
        }).optional()
    }),
    z.object({
        type: z.literal('data-stream-gauge'),
        config: z.object({
            'data-stream-gauge': DataStreamGaugeConfigSchema.optional()
        }).optional()
    }),
    z.object({
        type: z.literal('data-stream-table'),
        config: z.object({
            'data-stream-table': DataStreamTableConfigSchema.optional()
        }).optional()
    }),
    z.object({
        type: z.literal('data-stream-bar-chart'),
        config: z.object({
            'data-stream-bar-chart': DataStreamBarChartConfigSchema.optional()
        }).optional()
    }),
    z.object({
        type: z.literal('data-stream-line-graph'),
        config: z.object({
            'data-stream-line-graph': DataStreamLineGraphConfigSchema.optional()
        }).optional()
    }),
    z.object({
        type: z.literal('data-stream-scalar'),
        config: z.object({
            'data-stream-scalar': DataStreamScalarConfigSchema.optional()
        }).optional()
    })
]);

const DataSourceConfigSchema = z.unknown();

const MetadataSchema = z.unknown();

const GroupingSchema = z.unknown();

const filterSchema = z.object({
    column: z.string(),
    operation: z.enum([
        'empty', 'notempty', 
        'equals', 'notequals','greaterthan', 'lessthan',
        'contains', 'notcontains', 
        'datemorethan', 'datewithinlast', 'datewithinnext'
    ]),
    value: z.string().optional(), // Not needed if operation is empty/notempty
    reactKey: z.string().optional(),
    stateValue: z.string().optional()
});

const monitorSchema = z.unknown();

const monitorOldSchema = z.unknown();

const dataStreamDraftSchema = z.object({
    dataSourceConfig: z.object({
        sql: z.string()
    })
});

/**
 * Overlaps with some work in the `TileConfig.ts` in the saas repo
 * Although there may still be some deviations with how the data is stored
 * on the plugins side!
 * 
 * If possible, we should sync these types up when we externalise the 
 * `@squaredup` package.
 */
const dataStreamSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    dataSourceConfig: DataSourceConfigSchema,
    metadata: MetadataSchema,
    pluginConfigId: z.string().optional(),
    group: GroupingSchema.optional(),
    filter: z.object({
        filters: z.array(filterSchema),
        multiOperation: z.string()
    }).optional(),
    sort: z.object({
        by: z.array(z.tuple([z.union([z.string(), z.null()]), z.string()])).optional(),
        top: z.number().optional()
    }).optional()
});

const ConfigSchema = z.discriminatedUnion('_type', [
    z.object({
        _type: z.literal('tile/text'),
        title: z.string().optional(),
        description: z.string().optional(),
        visualisation: z.object({
            config: z.object({
                content: z.string(),
                align: z.enum(['left', 'center', 'right']).optional(),
                autoSize: z.boolean().optional(),
                fontSize: z.union([z.number(), z.string()]).optional()
            })
        })
    }),
    z.object({
        _type: z.literal('tile/image'),
        description: z.string().optional(),
        title: z.string().optional(),
        visualisation: z.object({
            config: z.object({
                src: z.string(),
                title: z.string().optional()
            })
        })
    }),
    z.object({
        _type: z.literal('tile/data-stream'),
        baseTile: z.string().optional(),
        dataStream: dataStreamSchema,
        description: z.string().optional(),
        scope: z.object({
            scope: z.string().optional(),
            name: z.string().optional(),
            workspace: z.string().optional(),
            bindings: z.record(z.array(z.string())).optional(),
            query: z.string().optional(),
            queryDetail: z.unknown()
        }).optional(),
        monitor: monitorSchema,
        title: z.string().optional(),
        variables: z.array(z.string()).optional(),
        visualisation: VizConfigSchema,
        timeframe: z.enum(supportedTimeframes).optional(),
        monitorOld: monitorOldSchema.optional(),
        dataStreamDraft: dataStreamDraftSchema.optional()
    })
]);

const ContentSchema = z.object({
    i: z.string(),
    w: z.number(),
    h: z.number(),
    x: z.number(),
    y: z.number(),
    moved: z.boolean().optional(),
    static: z.boolean().optional(),
    z: z.number().optional(),
    config: ConfigSchema
});

const DashboardSchema = z.object({
    _type: z.string(),
    columns: z.number(),
    contents: z.array(ContentSchema),
    version: z.number().optional(),
    variables: z.array(z.string()).optional()
});

export const DashboardFileSchema = z.object({
    name: z.string(),
    schemaVersion: z.string().optional(),
    variables: z.array(z.string()).optional(),
    dashboard: DashboardSchema,
    timeframe: z.enum(supportedTimeframes).optional()
});
