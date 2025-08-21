import { z } from 'zod'

export const ResizedColumnsSchema = z.object({
    "columnWidths": z.record(z.number())
}).strict();

export const DataStreamTableConfigSchema = z.object({
    "hideSearch": z.boolean().optional(),
    "columnOrder": z.array(z.string()).optional(),
    "hiddenColumns": z.array(z.string()).optional(),
    "columnDisplayNames": z.record(z.string()).optional(),
    "columns": z.array(z.string()).optional(),
    "useAccessorHeaderLabels": z.boolean().optional(),
    "showShapeInTooltip": z.boolean().optional(),
    "resizedColumns": z.any().optional(),
    "rowLinkColumnName": z.any().optional(),
    "pageSize": z.number().optional(),
    "transpose": z.boolean().optional(),
    "hideCount": z.boolean().optional()
}).strict();

