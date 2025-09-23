"use client";

import { useState } from "react";

export default function LinkAdder() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/albums/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);

      setResult(json.album ?? json);
      setUrl("");
    } catch (err: any) {
      setError(err?.message || "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-2xl">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="Paste Apple Music or Deezer album URL…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={loading || !url}
          className="border rounded px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Importing…" : "Add"}
        </button>
      </form>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {result && (
        <div className="rounded border p-3 bg-gray-50">
          <h2 className="font-medium mb-2">
            Imported: {result.title}{" "}
            {result.artist?.name ? `— ${result.artist.name}` : ""}
          </h2>
          <pre className="text-xs overflow-auto max-h-80">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}
