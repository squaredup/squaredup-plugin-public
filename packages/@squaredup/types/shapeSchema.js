import { z } from 'zod';

const RoleSchema = z.enum([
    'value',
    'label',
    'link',
    'id',
    'timestamp',
    'unitLabel',
    'description'
]);

const SingleShapeSchema = z.enum([
    'string',
    'date',
    'seconds',
    'boolean',
    'number',
    'bytes',
    'percent',
    'state',
    'kilobytes',
    'milliseconds',
    'minutes',
    'currency',
    'megabytes',
    'guid',
    'url',
    'terabytes',
    'usd',
    'json'
]);

const OptionedShapeSchema = z.union([
    z.tuple([z.literal('url'), z.object({label: z.string()})]),
    z.tuple([z.literal('number'), z.object({decimalPlaces: z.number()})]),
    z.tuple([z.literal('state'), z.object({map: z.object({
        success: z.array(z.string()).optional(),
        warning: z.array(z.string()).optional(),
        error: z.array(z.string()).optional(),
        unknown: z.array(z.string()).optional(),
    })})]),
    z.tuple([z.literal('currency'), z.object({code: z.string()})]),
    z.tuple([z.literal('milliseconds'), z.object({decimalPlaces: z.number()})]),
    z.tuple([z.literal('seconds'), z.object({decimalPlaces: z.number(), formatDuration: z.boolean()})]),
    z.tuple([z.literal('date'), z.object({
        format: z.string().optional(),
        inputPattern: z.string().optional()
    })]),
    z.tuple([z.literal('percent'), z.object({decimalPlaces: z.number()})]),
    z.tuple([z.literal('customUnit'), z.object({ 
        suffix: z.string()
    })])
]);

const ShapeSchema = SingleShapeSchema.or(OptionedShapeSchema);

export const RowSchema = z.object({
    name: z.string(),
    displayName: z.string(),
    shape: ShapeSchema,
    role: RoleSchema,
    pattern: z.string(),
    sourceId: z.string(),
    visible: z.boolean()
}).partial();
