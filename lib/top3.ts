// lib/top3.server.ts
import "server-only";
import { computeTop3 } from "./top3";

/** Server-only: compute top3 directly (no network, no 401s). */
export async function getTop3IdsServer(maxScan = 50): Promise<number[]> {
  try {
    return await computeTop3(maxScan);
  } catch (e) {
    console.error("getTop3IdsServer failed:", e);
    return [];
  }
}
