// components/AlbumsTable.tsx
import { prisma } from "@/lib/prisma";

type AlbumsTableProps = {
  limit?: number; // optional: max number of albums to show
  showHeader?: boolean; // optional: hide the title row if embedding
};

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

export default async function AlbumsTable({
  limit,
  showHeader = true,
}: AlbumsTableProps) {
  const albums = await prisma.album.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { songs: true } } },
    ...(limit ? { take: limit } : {}),
  });

  return (
    <section className="w-full">
      {showHeader && (
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-xl font-semibold">Albums</h2>
          <p className="text-xs text-gray-500">{albums.length} total</p>
        </div>
      )}

      {albums.length === 0 ? (
        <p className="text-sm text-gray-600">No albums yet.</p>
      ) : (
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 w-16">Cover</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Artist</th>
                <th className="px-4 py-3">Songs</th>
                <th className="px-4 py-3">Link</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {albums.map((a) => (
                <tr key={a.id} className="align-middle">
                  <td className="px-4 py-3">
                    {a.imageUrl ? (
                      <img
                        src={a.imageUrl}
                        alt={`${a.title} cover`}
                        className="h-12 w-12 object-cover rounded"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-gray-200" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{a.title}</td>
                  <td className="px-4 py-3">{a.artist}</td>
                  <td className="px-4 py-3">{a._count.songs}</td>
                  <td className="px-4 py-3">
                    <a
                      href={a.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline break-all"
                    >
                      Open
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {fmtDate(a.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
