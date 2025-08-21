import { DataSourceSchema, DataStreamSchema } from './dataStreamSchema';
import { RowSchema } from './shapeSchema';
import { z } from 'zod';

const rowTypeSchema = z.object({
    name: z.string(),
    metadata: z.array(RowSchema)
});

export const DataStreamFileSchema = z.object({
    rowTypes: z.array(rowTypeSchema).optional(),
    dataSources: z.array(DataSourceSchema),
    matches: z.unknown(), // I still have no idea what this is
    dataStreams: z.array(DataStreamSchema)
}).strict();
