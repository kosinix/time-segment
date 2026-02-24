/**
 * Segment-based time utilities using half-open interval semantics.
 *
 * All segments are treated as [start, end):
 * - start is inclusive
 * - end is exclusive
 *
 * Time values are assumed to be "minits"
 * (minutes from midnight).
 */

/**
 * A time segment represented as [start, end) in minits.
 * @typedef {[number, number]} Segment
 */

/**
 * Computes the intersection of two 1-D segments.
 *
 * @param {Segment} a - Segment A [start, end)
 * @param {Segment} b - Segment B [start, end)
 * @returns {{
 *   hasOverlap: boolean,
 *   segment: (Segment | null)
 * }}
 */
export function getOverlap(a, b) {
    const start = Math.max(a[0], b[0]);
    const end = Math.min(a[1], b[1]);

    const hasOverlap = start < end;
    const segment = hasOverlap ? [start, end] : null;

    return { hasOverlap, segment };
}

/**
 * Returns the length of a segment in minutes.
 *
 * @param {Segment} segment
 * @returns {number}
 * @throws {Error} If the segment is invalid or reversed
 */
export function getSegmentLength(segment) {
    if (
        !Array.isArray(segment) ||
        segment.length !== 2 ||
        typeof segment[0] !== 'number' ||
        typeof segment[1] !== 'number'
    ) {
        throw new Error('Invalid segment.');
    }

    if (segment[1] < segment[0]) {
        throw new Error('Invalid segment order.');
    }

    return segment[1] - segment[0];
}

/**
 * Computes grace minutes granted for a log.
 *
 * Principle:
 * Grace is overlap between the grace segment and the
 * "missing time" caused by a late log start.
 *
 * Grace applies only if the log starts within the grace segment.
 *
 * @param {Segment} grace - Grace window [start, end)
 * @param {Segment} log - Log segment [start, end)
 * @returns {number}
 */
export function computeGraceMinutes(grace, log) {
    const logStart = log[0];

    if (logStart < grace[0] || logStart > grace[1]) {
        return 0;
    }

    return logStart - grace[0];
}

/**
 * Snaps a log's start time to the grace start
 * if the log start falls within the grace window.
 *
 * Mutates the log segment.
 *
 * @param {Segment} log
 * @param {Segment} grace
 * @returns {Segment}
 */
export function snapLogToStart(log, grace) {
    const logStart = log[0];

    if (logStart >= grace[0] && logStart <= grace[1]) {
        log[0] = grace[0];
    }

    return log;
}

/**
 * Snaps a log's end time to the grace end
 * if the log end falls within the grace window.
 *
 * Mutates the log segment.
 *
 * @param {Segment} log
 * @param {Segment} grace
 * @returns {Segment}
 */
export function snapLogToEnd(log, grace) {
    const logSnapPoint = log[1];

    if (logSnapPoint >= grace[0] && logSnapPoint <= grace[1]) {
        log[1] = grace[1];
    }

    return log;
}

/**
 * Converts minutes-from-midnight ("minits") into hours/minutes.
 *
 * @param {number} minits
 * @returns {{ hours: number, mins: number }}
 */
export function minitsToHoursMins(minits) {
    return {
        hours: Math.floor(minits / 60),
        mins: minits % 60
    };
}

/**
 * Applies grace snapping rules to a list of logs.
 *
 * Each log is checked against each grace window and
 * snapped to the grace start when applicable.
 *
 * Mutates the logs array.
 *
 * @param {Segment[]} logs
 * @param {Segment[]} graces
 * @returns {Segment[]}
 */
export function applyGraces(logs, graces) {
    for (let l = 0; l < logs.length; l++) {
        const log = logs[l];
        for (let g = 0; g < graces.length; g++) {
            const grace = graces[g];
            logs[l] = snapLogToStart(log, grace);
        }
    }
    return logs;
}

/**
 * Computes overlapping segments between schedules and logs.
 *
 * @param {Segment[]} schedules
 * @param {Segment[]} logs
 * @returns {Segment[]}
 */
export function getOverlaps(schedules, logs) {
    let overlaps = [];

    for (let s = 0; s < schedules.length; s++) {
        const schedule = schedules[s];
        for (let l = 0; l < logs.length; l++) {
            const log = logs[l];
            const overlap = getOverlap(schedule, log);
            if (overlap.hasOverlap) {
                overlaps.push(overlap.segment);
            }
        }
    }
    return overlaps;
}

/**
 * Converts segments into their respective minute lengths.
 *
 * @param {Segment[]} segments
 * @returns {number[]}
 */
export function segmentsToMinits(segments) {
    return segments.map(segment => {
        return getSegmentLength(segment);
    });
}

/**
 * Formats an array of minute values into hours/minutes objects.
 *
 * @param {number[]} minitsArray
 * @returns {{ hours: number, mins: number }[]}
 */
export function formatMinits(minitsArray) {
    return minitsArray.map(el => {
        return minitsToHoursMins(el);
    });
}

export default {
    applyGraces,
    computeGraceMinutes,
    formatMinits,
    getOverlap,
    getOverlaps,
    getSegmentLength,
    minitsToHoursMins,
    snapLogToEnd,
    snapLogToStart
};