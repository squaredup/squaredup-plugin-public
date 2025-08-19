import { z } from 'zod'

export const DataStreamLineGraphConfigSchema = z.object({
    "palette": z.union([z.array(z.string()), z.record(z.string())]).optional(),
    "decimalPlaces": z.number().describe("How many decimal places to show for the value").optional(),
    "dataPoints": z.boolean().describe("Whether or not to enable data points").optional(),
    "xAxisLabel": z.string().describe("String to use as an X-axis label").optional(),
    "yAxisLabel": z.string().describe("String to use as an Y-axis label").optional(),
    "shading": z.boolean().describe("Whether or not to enable shading").optional(),
    "yAxisRangeMode": z.string().describe("Y axis range mode").optional(),
    "yAxisRangeFrom": z.number().describe("Bottom of the Y axis").optional(),
    "yAxisRangeTo": z.number().describe("Top of the Y axis").optional(),
    "xAxisColumn": z.string().describe("Column to use for the X axis").optional(),
    "yAxisColumn": z.union([z.string(), z.array(z.string())]).describe("Column to use for the Y axis").optional(),
    "cumulative": z.boolean().describe("Should values be calculated as cumulative").optional(),
    "showGrid": z.boolean().optional(),
    "showTrendLine": z.boolean().optional(),
    "unitLabelColumn": z.string().optional(),
    "seriesColumn": z.string().optional(),
    "showLegend": z.boolean().optional(),
    "legendPosition": z.any().optional()
}).strict();

export const LegendPositionSchema = z.enum(["auto", "top", "left", "right", "bottom"]);

