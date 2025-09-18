// lib/getTop3Ids.client.ts (client-safe util)
export async function getTop3IdsClient(): Promise<number[]> {
  try {
    const res = await fetch("/api/top3", { credentials: "include", cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    return Array.isArray(json.ids) ? json.ids : [];
  } catch (e) {
    console.warn("top3 api failed:", e);
    return []; // render gracefully with an empty list
  }
}
