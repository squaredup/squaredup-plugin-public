import { z } from 'zod';

export const LegacyDataStreamBarChartConfigSchema = z.object({
    "palette": z.union([z.array(z.string()), z.record(z.string())]).optional(),
    "xAxisLabel": z.string().describe("String to use as an X-axis label").optional(),
    "yAxisLabel": z.string().describe("String to use as an Y-axis label").optional(),
    "yAxisData": z.string().optional(),
    "xAxisData": z.string().optional(),
    "xAxisGroup": z.string().optional(),
    "horizontalLayout": z.enum(["vertical", "horizontal"]).optional(),
    "grouping": z.boolean().optional(),
    "showValue": z.boolean().optional(),
    "showTotals": z.boolean().optional(),
    "displayMode": z.enum(["actual", "percentage", "cumulative"]).optional(),
    "range": z.object({
        "type": z.enum(["auto", "custom"]),
        "minimum": z.number().optional(),
        "maximum": z.number().optional()
    }).strict().optional(),
    "showGrid": z.boolean().optional(),
    "showLegend": z.boolean().optional(),
    "legendPosition": z.any().optional(),
    "xAxisColumn": z.string().optional(),
    "yAxisColumn": z.string().optional(),
    "requiresLegacyColumnMigration": z.boolean().optional()
}).strict();

const LegacyBarChartConfigSchema = z.object({
    requiresLegacyColumnMigration: z.boolean().optional(),
    yAxisColumn: z.string().optional(),
    yAxisRangeMode: z.string().optional(),
    yAxisRangeTo: z.number().optional(),
    xAxisColumn: z.string().optional(),
    unitLabelColumn: z.string().optional()
});

export const DataStreamBarChartConfigSchema = z.object({
    "palette": z.union([z.array(z.string()), z.record(z.string())]).optional(),
    "xAxisLabel": z.string().describe("String to use as an X-axis label").optional(),
    "yAxisLabel": z.string().describe("String to use as an Y-axis label").optional(),
    "yAxisData": z.string().optional(),
    "xAxisData": z.string().optional(),
    "xAxisGroup": z.string().optional(),
    "horizontalLayout": z.enum(["vertical", "horizontal"]).optional(),
    "grouping": z.boolean().optional(),
    "showValue": z.boolean().optional(),
    "showTotals": z.boolean().optional(),
    "displayMode": z.enum(["actual", "percentage", "cumulative"]).optional(),
    "range": z.object({
        "type": z.enum(["auto", "custom"]),
        "minimum": z.number().optional(),
        "maximum": z.number().optional()
    }).strict().optional(),
    "showGrid": z.boolean().optional(),
    "showLegend": z.boolean().optional(),
    "legendPosition": z.any().optional(),
    "showXAxisLabel": z.boolean().optional(),
    "showYAxisLabel": z.boolean().optional()
}).extend(LegacyBarChartConfigSchema.shape).strict();

export const CustomPaletteSchema = z.object({
    "palette": z.union([z.array(z.string()), z.record(z.string())]).optional()
}).strict();

export const BarChartBarsSchema = z.object({
    "color": z.string(),
    "data": z.any(),
    "height": z.number(),
    "key": z.string(),
    "width": z.number(),
    "x": z.number(),
    "y": z.number().optional()
}).strict();

export const BarExtendedDatumSchema = z.object({
    "id": z.any(),
    "value": z.number(),
    "index": z.number(),
    "indexValue": z.any(),
    "data": z.any()
}).strict();

export const ValueSchema = z.union([z.string(), z.number()]);

export const BarDatumSchema = z.record(z.any());

export const GraphTickPropsSchema = z.object({
    "text": z.union([z.string(), z.number(), z.null()]),
    "xPosition": z.number()
}).strict();

export const BarChartCategoriesSchema = z.array(z.union([z.string(), z.null()])).describe("An array of categories that are to be converted into a D3 scaled date-tick format");

