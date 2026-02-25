import {
  applyGraces,
  getOverlap,
  getOverlaps,
  mergeSegments,
  segmentsToMinits,
  snapLogToStart,
  subtractSegments,
} from "../src/index.js";

describe("attendance logs", () => {
  test("returns overlap between log and schedule", () => {
    /**
     * 480 8
     * 720 12
     * 780 13
     * 1020 17
     */
    const schedule = [480, 720];
    const log = [495, 720];

    const overlap = getOverlap(schedule, log)
    expect(overlap.hasOverlap).toBe(true)
    expect(overlap.segment).toEqual([495, 720])

  });
});

describe("grace period adjustment", () => {
  test("does not mutate original log when snapping to grace start", () => {
    /**
     * 480 8
     * 720 12
     * 780 13
     * 1020 17
     */
    const log = [495, 720];
    const grace = [480, 495];

    const adjusted = snapLogToStart(log, grace)

    expect(log).toEqual([495, 720])
    expect(adjusted).toEqual([480, 720])

  });
});

describe("attendance time computation", () => {
  test("total worked minutes after applying grace periods", () => {
    /**
    * 480 8
    * 720 12
    * 780 13
    * 1020 17
    */
    const schedules = [[480, 720], [780, 1020]];
    const logs = [[481, 720], [780, 1020]];
    const graces = [[480, 495]];

    const adjustedLogs = applyGraces(logs, graces)
    const segmentsArray = getOverlaps(schedules, adjustedLogs)
    const minitsArray = segmentsToMinits(segmentsArray)
    const totalMinits = minitsArray.reduce((prev, curr) => {
      return prev + curr
    }, 0)
    // console.log(logs)
    // console.log(adjustedLogs)
    // console.log(segmentsArray)
    // console.log(minitsArray)
    // console.log(totalMinits)
    expect(adjustedLogs).toEqual([[480, 720], [780, 1020]]);
    expect(minitsArray).toEqual([240, 240]);
    expect(totalMinits).toBe(480);
  });
});

describe("applying breaks", () => {
  test("merge overlapping breaks before subtracting from logs", () => {
    /**
     * 480 8
     * 720 12
     * 780 13
     * 1020 17
     */
    const logs = [[480, 720], [780, 1020]];
    const breaks = mergeSegments([[495, 555], [555, 560]]);

    const result = subtractSegments(logs, breaks)
    // console.log(result)
    expect(result).toEqual([[480, 495], [560, 720]])
  });
});