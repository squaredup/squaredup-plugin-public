import { z } from "zod";
/**
 * Configuration for the block
 */
export type DataStreamBlocksConfig = {
    columns?: number;
    blockHeight?: number;
    limitHeight?: boolean;
    sublabel?: string;
    orderBy?: string;
    valueMap?: Record<string, number | string | boolean>;
    groupBy?: string;
    stateColumn?: string;
    labelColumn?: string;
    linkColumn?: string;
    wrapLabels?: boolean;
};

export const DataStreamBlocksConfigSchema = z.object({
    columns: z.number(),
    blockHeight: z.number().or(z.string()),
    limitHeight: z.number(),
    sublabel: z.string(),
    orderBy: z.string(),
    valueMap: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    groupBy: z.string(),
    stateColumn: z.string(),
    linkColumn: z.string(),
    wrapLabels: z.boolean(),
    labelColumn: z.string().optional()
}).partial();
