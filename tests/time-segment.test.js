import {
  getOverlap,
  getOverlaps,
  getSegmentLength,
  computeGraceMinutes,
  snapLogToStart,
  snapLogToEnd,
  applyGraces,
  minitsToHoursMins,
  segmentsToMinits,
  formatMinits
} from "../src/index.js";

describe("getOverlap()", () => {
  test("returns 240 even if late due to grace period", () => {
    /**
     * 480 8
     * 720 12
     * 780 13
     * 1020 17
     */
    const schedule = [480, 720];
    const logs = [495, 720];
    const grace = [480, 495];

    const adjusted = snapLogToStart(logs, grace)
    const overlap = getOverlap(schedule, adjusted);
    expect(overlap.hasOverlap).toBe(true);
    if (overlap.hasOverlap) {
      const worked = getSegmentLength(overlap.segment);
      expect(worked).toBe(240);
      expect(minitsToHoursMins(worked)).toEqual({ hours: 4, mins: 0 });
    }
  });
  test("returns overlap when segments intersect", () => {
    const result = getOverlap([480, 720], [540, 600]);

    expect(result.hasOverlap).toBe(true);
    expect(result.segment).toEqual([540, 600]);
  });

  test("returns no overlap when segments do not intersect", () => {
    const result = getOverlap([480, 540], [540, 600]);

    expect(result.hasOverlap).toBe(false);
    expect(result.segment).toBeNull();
  });
});

describe("getSegmentLength()", () => {
  test("computes correct length", () => {
    expect(getSegmentLength([480, 540])).toBe(60);
  });

  test("throws on invalid segment", () => {
    expect(() => getSegmentLength([540, 480])).toThrow();
  });
});

describe("computeGraceMinutes()", () => {
  test("grants grace when log starts within grace window", () => {
    const grace = [480, 495];
    const log = [490, 720];

    expect(computeGraceMinutes(grace, log)).toBe(10);
  });

  test("returns zero when log starts outside grace window", () => {
    const grace = [480, 495];
    const log = [500, 720];

    expect(computeGraceMinutes(grace, log)).toBe(0);
  });
});

describe("snapLogToStart()", () => {
  test("snaps log start to grace start", () => {
    const log = [490, 720];
    const grace = [480, 495];

    snapLogToStart(log, grace);

    expect(log).toEqual([480, 720]);
  });

  test("does not modify log if outside grace", () => {
    const log = [500, 720];
    const grace = [480, 495];

    snapLogToStart(log, grace);

    expect(log).toEqual([500, 720]);
  });
});

describe("snapLogToEnd()", () => {
  test("snaps log end to grace end", () => {
    const log = [720, 770];
    const grace = [760, 780];

    snapLogToEnd(log, grace);

    expect(log).toEqual([720, 780]);
  });
});

describe("applyGraces()", () => {
  test("applies grace windows to logs", () => {
    const logs = [[490, 720]];
    const graces = [[480, 495]];

    const result = applyGraces(logs, graces);

    expect(result).toEqual([[480, 720]]);
  });
});

describe("getOverlaps()", () => {
  test("returns all overlapping segments", () => {
    const schedules = [[480, 720], [780, 1020]];
    const logs = [[500, 600], [800, 900]];

    const overlaps = getOverlaps(schedules, logs);

    expect(overlaps).toEqual([[500, 600], [800, 900]]);
  });
});

describe("minits utilities", () => {
  test("converts minits to hours/mins", () => {
    expect(minitsToHoursMins(75)).toEqual({ hours: 1, mins: 15 });
  });

  test("converts segments to minits", () => {
    expect(
      segmentsToMinits([[480, 540], [600, 660]])
    ).toEqual([60, 60]);
  });

  test("formats minits array", () => {
    expect(formatMinits([75, 130])).toEqual([
      { hours: 1, mins: 15 },
      { hours: 2, mins: 10 }
    ]);
  });
});