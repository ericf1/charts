import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

type Parsed =
  | { provider: "ITUNES"; albumId: string }
  | { provider: "DEEZER"; albumId: string };

function parseAlbumUrl(url: string): Parsed {
  const u = url.trim();

  // Apple Music / iTunes
  // examples:
  // https://music.apple.com/us/album/folklore/1524809890
  // https://itunes.apple.com/lookup?id=1524809890&entity=song
  const apple =
    u.match(/(?:music|itunes)\.apple\.com\/[^/]+\/album\/[^/]+\/(\d+)/i) ??
    u.match(/[?&]id=(\d+)/);
  if (apple) return { provider: "ITUNES", albumId: apple[1] };

  // Deezer
  // https://www.deezer.com/en/album/302127
  const deezer = u.match(/deezer\.com\/(?:[a-z]{2}\/)?album\/(\d+)/i);
  if (deezer) return { provider: "DEEZER", albumId: deezer[1] };

  throw new Error(
    "Unsupported URL. Provide an Apple Music or Deezer album URL."
  );
}

async function fetchFromItunes(albumId: string) {
  const res = await fetch(
    `https://itunes.apple.com/lookup?id=${albumId}&entity=song`,
    {
      // don’t cache during dev
      next: { revalidate: 0 },
    }
  );
  if (!res.ok) throw new Error(`iTunes lookup failed: ${res.status}`);
  const json = await res.json();

  const results: any[] = json.results ?? [];
  const album = results.find((r) => r.wrapperType === "collection");
  if (!album) throw new Error("Album not found in iTunes response.");

  const tracks = results.filter((r) => r.wrapperType === "track");

  return {
    title: album.collectionName as string,
    artist: album.artistName as string,
    imageUrl: (album.artworkUrl100 as string | undefined)?.replace(
      "100x100bb.jpg",
      "1000x1000bb.jpg"
    ),
    songs: tracks.map((t) => ({
      title: t.trackName as string,
      link:
        (t.trackViewUrl as string | undefined) ??
        (t.previewUrl as string | undefined) ??
        null,
    })),
  };
}

async function fetchFromDeezer(albumId: string) {
  const res = await fetch(`https://api.deezer.com/album/${albumId}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Deezer album fetch failed: ${res.status}`);
  const a = await res.json();

  const tracks: any[] = a?.tracks?.data ?? [];

  return {
    title: a.title as string,
    artist: a?.artist?.name as string,
    imageUrl: (a.cover_xl || a.cover_big || a.cover_medium || a.cover) as
      | string
      | undefined,
    songs: tracks.map((t) => ({
      title: t.title as string,
      link:
        (t.link as string | undefined) ??
        (t.preview as string | undefined) ??
        null,
    })),
  };
}

export async function POST(req: Request) {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url) {
      return NextResponse.json(
        { error: "Provide { url: string }" },
        { status: 400 }
      );
    }

    const parsed = parseAlbumUrl(url);
    const data =
      parsed.provider === "ITUNES"
        ? await fetchFromItunes(parsed.albumId)
        : await fetchFromDeezer(parsed.albumId);

    // 1) Upsert Album using unique link if present,
    //    otherwise fall back to unique (title, artist).
    // We’ll store the *pasted* URL in Album.link for de-duping next time.
    let album = await prisma.album.findUnique({ where: { link: url } });

    if (!album) {
      album = await prisma.album
        .upsert({
          where: {
            // upsert must use a unique selector; your compound unique creates a `title_artist` where input
            title_artist: { title: data.title, artist: data.artist },
          },
          update: {
            imageUrl: data.imageUrl ?? undefined,
            link: url,
          },
          create: {
            id: randomUUID(),
            title: data.title,
            artist: data.artist,
            imageUrl: data.imageUrl ?? undefined,
            link: url,
          },
        })
        .catch(async (e) => {
          // In case (title, artist) exists without link, try updating by link again
          // (race-safe-ish fallback)
          const existing = await prisma.album.findUnique({
            where: {
              title_artist: { title: data.title, artist: data.artist } as any,
            },
          });
          if (existing) {
            return prisma.album.update({
              where: { id: existing.id },
              data: { imageUrl: data.imageUrl ?? undefined, link: url },
            });
          }
          throw e;
        });
    } else {
      // Optionally refresh metadata
      album = await prisma.album.update({
        where: { id: album.id },
        data: {
          imageUrl: data.imageUrl ?? undefined,
          title: data.title,
          artist: data.artist,
        },
      });
    }

    // 2) Upsert Songs by unique (title, albumId)
    //    We’ll generate String IDs for new songs.
    if (Array.isArray(data.songs)) {
      await prisma.$transaction(
        data.songs.map((s, idx) =>
          prisma.song.upsert({
            where: {
              title_albumId: { title: s.title, albumId: album!.id },
            },
            update: {
              link: s.link ?? undefined,
            },
            create: {
              id: randomUUID(),
              title: s.title,
              link: s.link ?? undefined,
              albumId: album!.id,
            },
          })
        )
      );
    }

    const full = await prisma.album.findUnique({
      where: { id: album.id },
      include: {
        songs: {
          orderBy: { title: "asc" }, // no track numbers in your schema
        },
      },
    });

    return NextResponse.json({ album: full }, { status: 200 });
  } catch (err: any) {
    console.error("Album import failed:", err);
    return NextResponse.json(
      { error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
