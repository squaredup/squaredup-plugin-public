import { z } from "zod";

export const DataStreamScalarValueConfigSchema = z.union([
    z.object({ type: z.literal('count') }),
    z.object({ type: z.literal('distinctcount'), columns: z.array(z.string()) }),
    z.object({ type: z.literal('sum'), top: z.optional(z.number()), columns: z.array(z.string()) }),
    z.object({ type: z.literal('min'), top: z.optional(z.number()), columns: z.array(z.string()) }),
    z.object({ type: z.literal('max'), top: z.optional(z.number()), columns: z.array(z.string()) }),
    z.object({ type: z.literal('mean'), top: z.optional(z.number()), columns: z.array(z.string()) }),
    z.object({ type: z.literal('median'), top: z.optional(z.number()), columns: z.array(z.string()) }),
    z.object({ type: z.literal('mode'), top: z.optional(z.number()), columns: z.array(z.string()) }),
    z.object({ type: z.literal('latest'), columns: z.array(z.string()) }),
    z.object({ type: z.literal('arr'), columns: z.array(z.string()) }),
    z.string()
]);

export const DataStreamScalarConfigSchema = z.object({
    value: z.optional(DataStreamScalarValueConfigSchema),
    label: z.optional(z.string()),
    labelPosition: z.optional(z.enum(['top', 'left', 'right', 'bottom'])),
    comparisonColumn: z.optional(z.string()),
    formatted: z.optional(z.boolean()),
    manualSize: z.optional(z.string())
});
