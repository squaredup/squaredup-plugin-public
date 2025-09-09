import {
    differenceInHours,
    endOfMonth,
    endOfQuarter,
    endOfYear,
    fromUnixTime,
    getUnixTime,
    startOfMonth,
    startOfQuarter,
    startOfYear,
    subDays,
    subHours,
    subMonths,
    subQuarters,
    subYears
} from 'date-fns';

// Timeframe generation lifted almost verbatim from saas repo
const resolveTimeframeInterval = (timeframe) => {
    // Remove one hour as it will round seconds to the whole hour
    const timeDifference =
        Math.abs(differenceInHours(fromUnixTime(timeframe.unixEnd), fromUnixTime(timeframe.unixStart))) - 1;
    let interval = timeframe.interval;

    if (!interval) {
        switch (true) {
            case timeDifference <= 1:
                interval = 'PT1M';
                break;
            case timeDifference <= 12:
                interval = 'PT5M';
                break;
            case timeDifference <= 24: // 1 day
                interval = 'PT15M';
                break;
            case timeDifference <= 168: // 7 days
                interval = 'PT6H';
                break;
            case timeDifference <= 744: // 31 days (approx 1 month)
                interval = 'PT12H';
                break;
            case timeDifference <= 4320: // 6 months
                interval = 'P1D';
                break;
            default:
                interval = 'P1W';
        }
    }

    return interval;
};

const timeframeBuilder = (getStart, enumValue, getEnd) => () => {
    const now = new Date();
    const end = getEnd ? getEnd(now) : now;
    const start = getStart(end);

    const withoutInterval = {
        start: start.toISOString(),
        unixStart: getUnixTime(start),
        end: end.toISOString(),
        unixEnd: getUnixTime(end),
        enum: enumValue
    };

    return { ...withoutInterval, interval: resolveTimeframeInterval(withoutInterval) };
};

export const timeframes = {
    last1hour: timeframeBuilder((endDate) => subHours(endDate, 1), 'last1hour'),
    last12hours: timeframeBuilder((endDate) => subHours(endDate, 12), 'last12hours'),
    last24hours: timeframeBuilder((endDate) => subHours(endDate, 24), 'last24hours'),
    last7days: timeframeBuilder((endDate) => subDays(endDate, 7), 'last7days'),
    last30days: timeframeBuilder((endDate) => subDays(endDate, 30), 'last30days'),
    thisMonth: timeframeBuilder(
        (endDate) => startOfMonth(endDate),
        'thisMonth',
        (now) => endOfMonth(now)
    ),
    thisQuarter: timeframeBuilder(
        (endDate) => startOfQuarter(endDate),
        'thisQuarter',
        (now) => endOfQuarter(now)
    ),
    thisYear: timeframeBuilder(
        (endDate) => startOfYear(endDate),
        'thisYear',
        (now) => endOfYear(now)
    ),
    lastMonth: timeframeBuilder(
        (endDate) => startOfMonth(endDate),
        'lastMonth',
        (now) => endOfMonth(subMonths(now, 1))
    ),
    lastQuarter: timeframeBuilder(
        (endDate) => startOfQuarter(endDate),
        'lastQuarter',
        (now) => endOfQuarter(subQuarters(now, 1))
    ),
    lastYear: timeframeBuilder(
        (endDate) => startOfYear(endDate),
        'lastYear',
        (now) => endOfYear(subYears(now, 1))
    ),
    none: timeframeBuilder(
        (endDate) => subHours(endDate, 24), // for caching purposes apparently
        'none'
    )
};
