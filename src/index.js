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
 * Does not mutate the log segment.
 *
 * @param {Segment} log
 * @param {Segment} grace
 * @returns {Segment}
 */
export function snapLogToStart(log, grace) {
    const logStart = log[0];
    let adjusted = log[0];

    if (logStart >= grace[0] && logStart <= grace[1]) {
        adjusted = grace[0];
    }

    return [adjusted, log[1]];
}

/**
 * Snaps a log's end time to the grace end
 * if the log end falls within the grace window.
 *
 * Does not mutate the log segment.
 *
 * @param {Segment} log
 * @param {Segment} grace
 * @returns {Segment}
 */
export function snapLogToEnd(log, grace) {
    const logSnapPoint = log[1];
    let adjusted = log[1];

    if (logSnapPoint >= grace[0] && logSnapPoint <= grace[1]) {
        adjusted = grace[1];
    }

    return [log[0], adjusted];
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
 * Does not mutate the logs array.
 *
 * @param {Segment[]} logs
 * @param {Segment[]} graces
 * @returns {Segment[]}
 */
export function applyGraces(logs, graces) {
    return logs.map(log => {
        for (let g = 0; g < graces.length; g++) {
            const grace = graces[g];
            log = snapLogToStart(log, grace);
        }
        return log
    })
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

/**
 * Subtracts a single segment from another segment using
 * half-open interval semantics [start, end).
 *
 * This is an internal helper and does not attempt to merge
 * or normalize results.
 *
 * Behavior:
 * - If there is no overlap, returns an empty array
 * - If partially overlapped, returns 1 or 2 remainder segments
 * - If fully covered, returns an empty array
 *
 * Examples:
 * _subtractSegment([480, 720], [540, 555])
 * → [[480, 540], [555, 720]]
 *
 * _subtractSegment([480, 720], [300, 480])
 * → []
 *
 * @param {[number, number]} source - Original segment [start, end)
 * @param {[number, number]} remove - Segment to subtract [start, end)
 * @returns {Array<[number, number]>} Remaining segment(s) after subtraction
 */
function _subtractSegment(source, remove) {
    const [sStart, sEnd] = source;
    const [rStart, rEnd] = remove;

    // No overlap → return original segment
    if (rEnd <= sStart || rStart >= sEnd) {
        return [];
    }

    const result = [];

    // Left remainder
    if (rStart > sStart) {
        result.push([sStart, Math.min(rStart, sEnd)]);
    }

    // Right remainder
    if (rEnd < sEnd) {
        result.push([Math.max(rEnd, sStart), sEnd]);
    }

    return result;
}

/**
 * Subtracts multiple break segments from multiple log segments.
 *
 * Each log is processed independently against each break.
 * The function:
 * - Does NOT merge or normalize output segments
 * - Does NOT mutate input arrays
 * - Returns raw remainder segments
 *
 * Typical usage is to follow this with a merge/normalize step.
 *
 * Example:
 * subtractSegments(
 *   [[480, 720]],
 *   [[540, 555]]
 * )
 * → [[480, 540], [555, 720]]
 *
 * @param {Array<[number, number]>} logs - Source segments to subtract from
 * @param {Array<[number, number]>} breaks - Segments to subtract
 * @returns {Array<[number, number]>} Resulting unmerged segments
 */
export function subtractSegments(logs, breaks) {
    const result = [];
    logs.forEach(log => {
        breaks.forEach(br => {
            result.push(..._subtractSegment(log, br));
        });
    });
    return result;
}

/**
 * Merges overlapping or adjacent segments using half-open interval semantics.
 *
 * Example:
 * mergeSegments([[480, 540], [540, 600], [610, 720]])
 * -> [[480, 600], [610, 720]]
 *
 * @param {Segment[]} segments
 * @returns {Segment[]} Merged segments
 */
export function mergeSegments(segments) {
    if (!Array.isArray(segments) || segments.length === 0) {
        return [];
    }

    // Defensive copy + sort by start time
    const sorted = segments
        .map(seg => [seg[0], seg[1]])
        .sort((a, b) => a[0] - b[0]);

    const merged = [];
    let [currStart, currEnd] = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
        const [nextStart, nextEnd] = sorted[i];

        // Overlapping or adjacent
        if (nextStart <= currEnd) {
            currEnd = Math.max(currEnd, nextEnd);
        } else {
            merged.push([currStart, currEnd]);
            currStart = nextStart;
            currEnd = nextEnd;
        }
    }

    merged.push([currStart, currEnd]);
    return merged;
}

export default {
    applyGraces,
    computeGraceMinutes,
    formatMinits,
    getOverlap,
    getOverlaps,
    getSegmentLength,
    mergeSegments,
    minitsToHoursMins,
    segmentsToMinits,
    snapLogToEnd,
    snapLogToStart,
    subtractSegments,
};