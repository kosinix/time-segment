# time-segment

Segment-based time utilities using **half-open interval semantics**  
Designed for attendance systems, DTR computation, scheduling, and time math.

All time values are expressed as **minutes from midnight** (“minits”).

---

## Features

- Half-open interval logic: **[start, end)**
- Robust overlap computation
- Grace period handling
- Schedule vs log intersection
- Utilities for formatting and aggregation
- Lightweight, dependency-free, ESM-first

---

## Installation

Install directly from GitHub:

```bash
npm install github:kosinix/time-segment