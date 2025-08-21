import { z } from "zod";

const DataStreamGaugeValueConfigSchema = z.union([
    z.object({ type: z.literal('count') }),
    z.object({ type: z.literal('sum'), top: z.optional(z.number()), columns: z.array(z.string()) }),
    z.object({ type: z.literal('mean'), top: z.optional(z.number()), columns: z.array(z.string()) }),
    z.object({ type: z.literal('arr'), columns: z.array(z.string()) })
]);

export const DataStreamGaugeConfigSchema = z.object({
    value: z.union([DataStreamGaugeValueConfigSchema, z.string()]).optional(),
    label: z.optional(z.string()),
    minimum: z.optional(z.number()),
    maximum: z.optional(z.number())
});
