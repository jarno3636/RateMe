// /lib/getTop3Ids.ts (client-safe)
export async function getTop3Ids(): Promise<number[]> {
  try {
    const res = await fetch("/api/top3", { cache: "no-store" })
    if (!res.ok) {
      // 401/403/500 – degrade gracefully
      return []
    }
    const json = await res.json()
    return (json?.ids ?? []).map((x: any) => Number(x)).filter(Number.isFinite)
  } catch {
    return []
  }
}
