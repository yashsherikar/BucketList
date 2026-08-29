import { useState } from "react";
import { Modal } from "../pages/Rooms";
import { ItemsApi } from "../api/rooms";
import { apiErrorMessage } from "../api/client";

export default function AddItemModal({ roomId, onClose, onAdded }) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState(null);
  const [notes, setNotes] = useState("");
  const [price, setPrice] = useState("");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchPreview = async () => {
    if (!url.trim()) return;
    setError("");
    setFetching(true);
    setPreview(null);
    try {
      const data = await ItemsApi.preview(roomId, url.trim());
      setPreview(data);
      if (data.detectedPrice != null) setPrice(String(data.detectedPrice));
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't fetch a preview for that link — you can still add it manually."));
    } finally {
      setFetching(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const item = await ItemsApi.add(roomId, {
        url: url.trim(),
        notes: notes.trim() || null,
        price: price ? Number(price) : null,
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
          <label className="block text-xs font-medium text-[var(--color-mist)] mb-1.5">Product link</label>
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
              onClick={fetchPreview}
              disabled={fetching || !url.trim()}
              className="px-3 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-cream)] hover:border-[var(--color-lantern)] disabled:opacity-50 cursor-pointer"
            >
              {fetching ? "…" : "Fetch"}
            </button>
          </div>
        </div>

        {preview && (
          <div className="flex gap-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-3">
            {preview.imageUrl ? (
              <img src={preview.imageUrl} alt="" className="w-16 h-16 object-cover rounded-lg" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-[var(--color-ink)] flex items-center justify-center text-2xl">🎁</div>
            )}
            <div className="min-w-0">
              <p className="text-sm text-[var(--color-cream)] line-clamp-2">{preview.title || "No title found"}</p>
              {preview.source && <p className="text-xs text-[var(--color-mist)] mt-0.5">{preview.source}</p>}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-[var(--color-mist)] mb-1.5">
            Price (₹) — confirm or enter manually
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
          disabled={saving}
          className="w-full bg-[var(--color-lantern)] text-[var(--color-ink)] font-semibold rounded-lg py-2.5 hover:brightness-110 transition disabled:opacity-60 cursor-pointer"
        >
          {saving ? "Adding…" : "Add to room"}
        </button>
      </form>
    </Modal>
  );
}
