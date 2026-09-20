export type ParsedVideo =
  | { kind: "youtube" | "drive"; embedUrl: string }
  | { kind: "file"; embedUrl: string };

const YT_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"];
const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const DRIVE_ID = /^[A-Za-z0-9_-]{10,}$/;

// Tautan video yang boleh dipasang admin: YouTube (watch, youtu.be, shorts, embed, live),
// Google Drive (tautan berbagi file), atau file video langsung (.mp4/.webm/.ogg/.mov/.m4v).
// Hasilnya alamat aman untuk <iframe>/<video>; tautan lain ditolak (null).
export function parseVideoUrl(raw: string | null | undefined): ParsedVideo | null {
  const text = raw?.trim();
  if (!text) return null;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();

  // YouTube
  if (host === "youtu.be" || YT_HOSTS.includes(host)) {
    let id: string | null = null;
    if (host === "youtu.be") {
      id = url.pathname.split("/")[1] ?? null;
    } else if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else {
      const m = /^\/(?:shorts|embed|live|v)\/([^/?]+)/.exec(url.pathname);
      id = m?.[1] ?? null;
    }
    return id && YT_ID.test(id)
      ? { kind: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0` }
      : null;
  }

  // Google Drive
  if (host === "drive.google.com") {
    const m = /^\/file\/d\/([^/]+)/.exec(url.pathname);
    const id = m?.[1] ?? (url.pathname === "/open" ? url.searchParams.get("id") : null);
    return id && DRIVE_ID.test(id) ? { kind: "drive", embedUrl: `https://drive.google.com/file/d/${id}/preview` } : null;
  }

  // File video langsung
  if (/\.(mp4|webm|ogg|mov|m4v)$/i.test(url.pathname)) return { kind: "file", embedUrl: url.toString() };

  return null;
}
