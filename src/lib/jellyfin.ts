export interface JellyfinMovie {
  id: string;
  title: string;
  year?: number;
  artUrl: string;
  playUrl: string;
}

interface JellyfinItem {
  Id: string;
  Name: string;
  ProductionYear?: number;
  BackdropImageTags?: string[];
}

async function jellyfinFetch<T>(
  jellyfinUrl: string,
  path: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(
    `${jellyfinUrl}${path}${sep}api_key=${encodeURIComponent(apiKey)}`,
    { headers: { Accept: "application/json" }, signal },
  );
  if (!res.ok) throw new Error(`Jellyfin request failed: ${res.status}`);
  return res.json();
}

// Deep link into Jellyfin Web's item details page.
// Jellyfin 10.10+ (React/MUI client) uses #/details?id= — the older
// #/video?id= route does not exist in this client version.
function buildJellyfinPlayUrl(jellyfinUrl: string, itemId: string): string {
  return `${jellyfinUrl}/web/index.html#/details?id=${encodeURIComponent(itemId)}`;
}

export function playInJellyfin(itemId: string, jellyfinUrl: string): void {
  window.location.href = buildJellyfinPlayUrl(jellyfinUrl, itemId);
}

export interface JellyfinSearchResult {
  id: string;
  name: string;
  type: string; // "Movie" | "Series" (what we ask for)
  year?: number;
  imageUrl?: string;
}

// Live library search across movies and shows. Returns [] for a blank
// query rather than hitting the server.
export async function searchJellyfin(
  jellyfinUrl: string,
  apiKey: string,
  userId: string,
  query: string,
  signal: AbortSignal,
): Promise<JellyfinSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const data = await jellyfinFetch<{
    Items: Array<{
      Id: string;
      Name: string;
      Type: string;
      ProductionYear?: number;
      ImageTags?: { Primary?: string };
    }>;
  }>(
    jellyfinUrl,
    `/Users/${encodeURIComponent(userId)}/Items?searchTerm=${encodeURIComponent(q)}` +
      `&IncludeItemTypes=Movie,Series&Recursive=true&Limit=24` +
      `&Fields=ProductionYear&ImageTypeLimit=1&EnableImageTypes=Primary`,
    apiKey,
    signal,
  );
  return (data.Items ?? []).map((it) => ({
    id: it.Id,
    name: it.Name,
    type: it.Type,
    year: it.ProductionYear,
    imageUrl: it.ImageTags?.Primary
      ? `${jellyfinUrl}/Items/${it.Id}/Images/Primary?api_key=${encodeURIComponent(apiKey)}&fillHeight=330&quality=90`
      : undefined,
  }));
}

// A movie is playable directly. A series isn't, so resolve the "next up"
// episode (falling back to the very first episode) — that way one click
// from a search result starts watching the right thing.
export async function resolvePlayableId(
  jellyfinUrl: string,
  apiKey: string,
  userId: string,
  result: JellyfinSearchResult,
  signal: AbortSignal,
): Promise<string | null> {
  if (result.type !== "Series") return result.id;
  try {
    const nextUp = await jellyfinFetch<{ Items: Array<{ Id: string }> }>(
      jellyfinUrl,
      `/Shows/NextUp?userId=${encodeURIComponent(userId)}&seriesId=${encodeURIComponent(result.id)}&Limit=1`,
      apiKey,
      signal,
    );
    if (nextUp.Items?.[0]) return nextUp.Items[0].Id;
    const eps = await jellyfinFetch<{ Items: Array<{ Id: string }> }>(
      jellyfinUrl,
      `/Shows/${encodeURIComponent(result.id)}/Episodes?userId=${encodeURIComponent(userId)}` +
        `&Limit=1&sortBy=ParentIndexNumber,IndexNumber`,
      apiKey,
      signal,
    );
    return eps.Items?.[0]?.Id ?? null;
  } catch {
    return null;
  }
}

export async function fetchMostRecentMovie(
  jellyfinUrl: string,
  apiKey: string,
  userId: string,
  signal: AbortSignal,
): Promise<JellyfinMovie | null> {
  const items = await jellyfinFetch<JellyfinItem[]>(
    jellyfinUrl,
    `/Users/${encodeURIComponent(userId)}/Items/Latest?IncludeItemTypes=Movie&Limit=1`,
    apiKey,
    signal,
  );

  const movie = items[0];
  if (!movie) return null;

  const hasBackdrop = (movie.BackdropImageTags?.length ?? 0) > 0;
  const imagePath = hasBackdrop
    ? `/Items/${movie.Id}/Images/Backdrop`
    : `/Items/${movie.Id}/Images/Primary`;

  return {
    id: movie.Id,
    title: movie.Name,
    year: movie.ProductionYear,
    artUrl: `${jellyfinUrl}${imagePath}?api_key=${encodeURIComponent(apiKey)}`,
    playUrl: buildJellyfinPlayUrl(jellyfinUrl, movie.Id),
  };
}
