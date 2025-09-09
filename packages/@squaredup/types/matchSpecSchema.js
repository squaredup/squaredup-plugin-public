import { z } from 'zod';

export const supportedTimeframes = [
    'last1hour',
    'last12hours',
    'last24hours',
    'last7days',
    'last30days',
    'thisMonth',
    'thisQuarter',
    'thisYear',
    'lastMonth',
    'lastQuarter',
    'lastYear',
    'none'
];

export const MatchClauseSchema = z.union([
    z.string(),
    z.object({ type: z.literal('oneOf'), values: z.array(z.string()) }),
    z.object({ type: z.literal('notOneOf'), values: z.array(z.string()) }),
    z.object({ type: z.literal('contains'), value: z.string() }),
    z.object({ type: z.literal('notContains'), value: z.string() }),
    z.object({ type: z.literal('equals'), value: z.string() }),
    z.object({ type: z.literal('notEquals'), value: z.string() }),
    z.object({ type: z.literal('any') })
]);

export const MatchCriteriaSchema = z.record(MatchClauseSchema);

/**
 * A complete match specification that matches (or not) against an object
 */
export const MatchSpecSchema = z.union([
    z.literal('none'),
    z.literal('all'),
    z.literal('true'),
    MatchCriteriaSchema,
    z.array(MatchCriteriaSchema)
]);
