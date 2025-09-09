import { z } from "zod";

export const DonutConfigSchema = z.object({
    valueColumn: z.string(),
    labelColumn: z.string(),
    legendMode: z.enum(['table', 'inline']),
    legendPosition: z.enum(['top', 'left', 'right', 'bottom', 'auto']),
    showValuesAsPercentage: z.boolean(),
    palette: z.union([z.array(z.string()), z.record(z.string(), z.string())])
}).partial()
