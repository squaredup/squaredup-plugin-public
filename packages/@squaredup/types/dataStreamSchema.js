import { z } from 'zod';
import { RowSchema } from './shapeSchema';
import { TemplateSchema } from './templateSchema';
import { MatchSpecSchema, supportedTimeframes } from './matchSpecSchema';

export const DataStreamDefinitionBaseSchema = z.object({
    name: z.string(),
    dataSourceConfig: z.unknown(),
    featured: z.boolean().default(false).optional(),
    tags: z.array(z.string()).default([]).optional(),
    /**
     * The name of the configurable data stream definition
     * that this definition is a preset of
     */
    presetOf: z.string().optional(),

    /**
     * An array containing items that form the basis of the table
     * (a row will exist in the table for each item in this array)
     *
     * Each item in the array is a property name on the path to the
     * property containing the values to generate rows from. If an
     * item is itself an array, each property is used to generate rows.
     *
     * @example
     * // flattens { data: { values: [1, 2, 3] } } to three rows with one column (values)
     * ['data', 'values']
     *
     * // flattens { data: { values: [1, 2, 3], timestamps: [4, 5, 6] } }
     * // to three rows with two columns (values and timestamps)
     * ['data', ['values', 'timestamps']]
     */
    rowPath: z.array(z.union([z.string(), z.array(z.string())])),
    matches: MatchSpecSchema,

    /**
     * Metadata for known columns
     */
    // metadata: z.array(RowSchema).optional(),

    /**
     * Whether the data stream can be sorted.
     * For instance a paginated stream usually won't be sortable
     */
    sortable: z.boolean().optional(),

    provides: z.enum(['health', 'templateData']).optional(),

    options: z
        .object({
            /**
             * If true, the data stream will be excluded from matching, and will not appear in the UI.
             * This is useful for streams which are only internally to a plugin, e.g. for loading
             * options for autocompletes for configurable data streams, where the options aren't
             * useful to the user on their own.
             */
            noMatch: z.boolean().optional(),

            /**
             * Specifies the maximum frequency the platform is allowed to request the data stream.
             * Particularly useful for expensive data streams where the source data is not updated
             * frequently.
             *
             * Ignored if noCache is true (because caching is used to enforce the minimum
             * request interval).
             */
            minimumRequestIntervalSeconds: z.number().int().positive().optional(),

            /**
             * If true, data stream responses should not be cached in the platform.
             * May have a big negative effect on performance - do not use unless necessary.
             */
            noCache: z.boolean().optional(),

            /**
             * If true, the data stream will not be included in GraphNodeDrilldown.
             */
            excludeFromDrilldown: z.boolean().optional(),

            /**
             * If true, dataSourceConfig properties with mustache expressions will not be resolved
             * before being passed to the plugin
             */
            bypassDataSourceConfigExpressionResolution: z.boolean().optional()
        })
        .optional(),

    timeframes: z.union([z.boolean(), z.array(z.enum(supportedTimeframes))]).optional(),

    supportsNoneTimeframe: z.boolean().optional(),
    defaultTimeframe: z.enum(['none', 'dashboard']).optional(),
    requiresParameterTimeframe: z.boolean().optional(),

    manualConfigApply: z.boolean().default(false).optional(),

    objectLimit: z.number().int().positive().optional(),
    params: z.unknown().optional()
}).strict();

export const DataSourceSchema = z.object({
    name: z.string(),
    displayName: z.string(),
    supportedScope: z.enum(['none', 'list', 'single']),
    description: z.string().optional(),
    targetNodesProperties: z.array(z.string()).optional(),
    timeframes: z.union([z.boolean(), z.array(z.enum(supportedTimeframes))]).optional(),
    objectLimit: z.number().optional()
}).strict(); 

const DataStreamCommonSchema = z.object({
    displayName: z.string(),
    description: z.string().optional(),
    dataSourceName: z.string(), // Replace with the list of known data sources?
    definition: DataStreamDefinitionBaseSchema.optional(),
    template: TemplateSchema.optional(),
    provides: z.literal('health').describe('Deprecated - Use inner provides instead').optional()
}).strict();

/**
 * I suspect the three methods below are more correct, but we do have some data streams that don't have either.
 * For now I'm keeping everything that is currently in the plugins repo as 'correct'
 */
// const DataStreamUsingRowType = DataStreamCommonSchema.extend({
//     definition: DataStreamDefinitionBaseSchema.extend({
//         rowType: z.object({
//             name: z.string()
//         })
//     })
// });

// const DataStreamsUsingMetadata = DataStreamCommonSchema.extend({
//     definition: DataStreamDefinitionBaseSchema.extend({
//         metadata: z.array(RowSchema)
//     })
// });

// export const DataStreamSchema = z.union([
//     DataStreamUsingRowType,
//     DataStreamsUsingMetadata
// ]);

const ColumnPatchSchema = z.object({
    name: z.string(),
    names: z.array(z.string()),
    override: z.unknown(),
    remove: z.boolean()
}).partial();

export const DataStreamSchema = DataStreamCommonSchema.extend({
    definition: DataStreamDefinitionBaseSchema.extend({
        rowType: z.object({
            name: z.string(),
            column: z.array(ColumnPatchSchema).optional()
        }).optional(),
        metadata: z.array(RowSchema).optional()
    })
}).strict();
