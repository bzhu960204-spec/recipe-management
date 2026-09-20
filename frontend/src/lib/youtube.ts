/** Extracts the 11-character video id from the common YouTube URL shapes, or null when not YouTube. */
export function youTubeVideoId(url?: string | null): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  let host = parsed.hostname.toLowerCase();
  if (host.startsWith('www.')) host = host.slice(4);
  const path = parsed.pathname;

  let candidate: string | null = null;
  if (host === 'youtu.be') {
    candidate = path.replace(/^\//, '');
  } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (path === '/watch') candidate = parsed.searchParams.get('v');
    else if (path.startsWith('/shorts/')) candidate = path.slice('/shorts/'.length);
    else if (path.startsWith('/embed/')) candidate = path.slice('/embed/'.length);
    else if (path.startsWith('/live/')) candidate = path.slice('/live/'.length);
  }
  if (!candidate) return null;
  const slash = candidate.indexOf('/');
  if (slash >= 0) candidate = candidate.slice(0, slash);
  return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
}

export function isYouTubeUrl(url?: string | null): boolean {
  return youTubeVideoId(url) !== null;
}
