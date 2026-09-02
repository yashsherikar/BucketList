import { useState, useEffect, useRef } from "react";
import { Modal } from "../pages/Rooms";
import { ItemsApi } from "../api/rooms";
import { apiErrorMessage } from "../api/client";

const URL_RE = /(https?:\/\/[^\s"'<>]+)/i;

// Pull the first real URL out of whatever was pasted ("check this out https://… nice!")
// and drop trailing sentence punctuation.
function extractUrl(text) {
  const m = (text || "").match(URL_RE);
  return m ? m[1].replace(/[.,;:)\]}>]+$/, "") : null;
}

export default function AddItemModal({ roomId, onClose, onAdded }) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState(null);
  const [notes, setNotes] = useState("");
  const [price, setPrice] = useState("");
  const [priority, setPriority] = useState("NICE_TO_HAVE");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lastFetched = useRef("");

  const cleanUrl = extractUrl(url);

  const fetchPreview = async (target) => {
    const u = target || cleanUrl;
    if (!u) return;
    lastFetched.current = u;
    setError("");
    setFetching(true);
    setPreview(null);
    try {
      const data = await ItemsApi.preview(roomId, u);
      setPreview(data);
      if (data.detectedPrice != null) setPrice(String(data.detectedPrice)); // auto-fill price
      if (data.url) {
        lastFetched.current = data.url;
        if (data.url !== url) setUrl(data.url); // normalise the box to the clean/resolved URL
      }
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't fetch a preview for that link — you can still add it manually."));
    } finally {
      setFetching(false);
    }
  };

  // Auto-fetch shortly after a new URL lands in the box — no button press needed.
  useEffect(() => {
    if (!cleanUrl || cleanUrl === lastFetched.current) return;
    const t = setTimeout(() => fetchPreview(cleanUrl), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanUrl]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!cleanUrl) {
      setError("Paste a product link (it should start with http).");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const item = await ItemsApi.add(roomId, {
        url: cleanUrl,
        notes: notes.trim() || null,
        price: price ? Number(price) : null,
        priority,
      });
      onAdded(item);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't add this item."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Add a product">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="text-sm text-[var(--color-rose)]">{error}</p>}

        <div>
          <label className="block text-xs font-medium text-[var(--color-mist)] mb-1.5">
            Product link — paste it and the details fill in automatically
          </label>
          <div className="flex gap-2">
            <input
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.amazon.in/dp/..."
              className="flex-1 bg-[var(--color-ink)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-cream)] focus:outline-none focus:ring-2 focus:ring-[var(--color-lantern)]"
            />
            <button
              type="button"
              onClick={() => fetchPreview(cleanUrl)}
              disabled={fetching || !cleanUrl}
              className="btn-ghost h-[42px] text-sm cursor-pointer disabled:opacity-50"
              title="Fetch the preview again"
            >
              {fetching ? "…" : preview ? "Refresh" : "Fetch"}
            </button>
          </div>
        </div>

        {fetching && (
          <div className="flex gap-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-3 animate-fade">
            <div className="skeleton w-16 h-16 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="skeleton h-3 w-4/5" />
              <div className="skeleton h-3 w-2/5" />
            </div>
          </div>
        )}

        {!fetching && preview && (
          <div className="flex gap-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-3 animate-fade">
            {preview.imageUrl ? (
              <img src={preview.imageUrl} alt="" className="w-16 h-16 object-cover rounded-lg" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-[var(--color-ink)] flex items-center justify-center text-2xl">🎁</div>
            )}
            <div className="min-w-0">
              <p className="text-sm text-[var(--color-cream)] line-clamp-2">{preview.title || "No title found"}</p>
              {preview.source && <p className="text-xs text-[var(--color-mist)] mt-0.5">{preview.source}</p>}
              {preview.detectedPrice != null && (
                <p className="text-xs text-[var(--color-lantern)] mt-0.5 font-[var(--font-mono)]">
                  detected ₹{Number(preview.detectedPrice).toLocaleString("en-IN")}
                </p>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-[var(--color-mist)] mb-1.5">
            Price (₹) — auto-filled when detected, edit if it's off
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="2499"
            className="w-full bg-[var(--color-ink)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-cream)] font-[var(--font-mono)] focus:outline-none focus:ring-2 focus:ring-[var(--color-lantern)]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-mist)] mb-1.5">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full bg-[var(--color-ink)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-cream)] focus:outline-none focus:ring-2 focus:ring-[var(--color-lantern)]"
          >
            <option value="MUST_HAVE">Must have</option>
            <option value="NICE_TO_HAVE">Nice to have</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-mist)] mb-1.5">Notes (optional)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Size M, blue color"
            className="w-full bg-[var(--color-ink)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-cream)] focus:outline-none focus:ring-2 focus:ring-[var(--color-lantern)]"
          />
        </div>

        <button
          type="submit"
          disabled={saving || fetching}
          className="w-full rounded-lg py-2.5 disabled:opacity-60 cursor-pointer btn-premium"
        >
          {saving ? "Adding…" : "Add to room"}
        </button>
      </form>
    </Modal>
  );
}
