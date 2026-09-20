/** Parse YouTube watch / youtu.be / embed / shorts URLs. */
export function parseYouTubeUrl(
  raw: string
): { id: string; startSec: number } | null {
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.replace(/^www\./, "");
    let id = "";

    if (host === "youtu.be") {
      id = u.pathname.split("/").filter(Boolean)[0] ?? "";
    } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      id = u.searchParams.get("v") ?? "";
      if (!id) {
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
          id = parts[1] ?? "";
        }
      }
    }

    if (!id || !/^[a-zA-Z0-9_-]{6,}$/.test(id)) return null;

    const t = u.searchParams.get("t") ?? u.searchParams.get("start") ?? "";
    return { id, startSec: parseYouTubeTime(t) };
  } catch {
    return null;
  }
}

/** Accepts "85", "85s", "1m25s", "1h2m3s". */
function parseYouTubeTime(t: string): number {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!m) return 0;
  return (
    (Number(m[1] ?? 0) * 3600) +
    (Number(m[2] ?? 0) * 60) +
    Number(m[3] ?? 0)
  );
}

export function youtubeEmbedSrc(
  raw: string,
  opts?: { autoplay?: boolean }
): string | null {
  const parsed = parseYouTubeUrl(raw);
  if (!parsed) return null;
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
  });
  if (parsed.startSec > 0) params.set("start", String(parsed.startSec));
  if (opts?.autoplay) {
    params.set("autoplay", "1");
  }
  return `https://www.youtube.com/embed/${parsed.id}?${params.toString()}`;
}
