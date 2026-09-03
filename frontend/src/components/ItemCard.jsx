import { useEffect, useState } from "react";
import { Modal } from "../pages/Rooms";
import { ItemsApi } from "../api/rooms";
import { apiErrorMessage } from "../api/client";

const PRIORITY_OPTIONS = [
  { value: "MUST_HAVE", label: "Must have" },
  { value: "NICE_TO_HAVE", label: "Nice to have" },
];

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Store logo: prefer the favicon the API gave us, else derive one from the
// link's domain via Google's favicon service, else a lettered fallback tile.
function StoreIcon({ url, src, label }) {
  const [broken, setBroken] = useState(false);
  const host = hostFromUrl(url);
  const finalSrc = broken ? null : src || (host ? `https://www.google.com/s2/favicons?domain=${host}&sz=64` : null);

  if (finalSrc) {
    return (
      <img
        src={finalSrc}
        alt=""
        width={20}
        height={20}
        loading="lazy"
        onError={() => setBroken(true)}
        className="w-5 h-5 rounded-[4px] shrink-0 bg-white/90 object-contain p-[1px]"
      />
    );
  }
  return (
    <span className="w-5 h-5 rounded-[4px] shrink-0 bg-[var(--color-border)] text-[var(--color-cream)] text-[10px] font-semibold flex items-center justify-center">
      {(label || host || "?").charAt(0).toUpperCase()}
    </span>
  );
}

function formatMoney(amount, currency) {
  if (amount == null) return null;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency || "₹"} ${Number(amount).toLocaleString("en-IN")}`;
  }
}

export default function ItemCard({
  item,
  roomId,
  currentUserId,
  onBuy,
  onUnbuy,
  onDelete,
  onUpdate,
  onReserve,
  onRelease,
  index = 0,
}) {
  const [busy, setBusy] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const isBought = item.status === "BOUGHT";
  const isReserved = item.status === "RESERVED";
  const reservedByMe = isReserved && item.reservedByUserId === currentUserId;
  const isMine = item.addedByUserId === currentUserId;
  const mustHave = item.priority === "MUST_HAVE";

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{ "--i": index }}
      className={`stagger bg-[var(--color-surface)] border rounded-2xl overflow-hidden flex flex-col transition-colors card-elevated ${
        isBought
          ? "border-[var(--color-sage)]/40"
          : isReserved
          ? "border-[var(--color-lantern)]/40"
          : "border-[var(--color-border)]"
      }`}
    >
      <div className="aspect-[4/3] bg-[var(--color-surface-2)] relative">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title || "Product"} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🎁</div>
        )}
        {isBought && (
          <span className="absolute top-2 right-2 bg-[var(--color-sage)] text-[var(--color-ink)] text-xs font-semibold px-2 py-1 rounded-full">
            Bought
          </span>
        )}
        {isReserved && (
          <span className="absolute top-2 right-2 bg-[var(--color-lantern)] text-[var(--color-on-accent)] text-xs font-semibold px-2 py-1 rounded-full">
            Reserved
          </span>
        )}
        {item.source && (
          <span className="absolute bottom-2 left-2 bg-black/60 text-[var(--color-cream)] text-[10px] px-2 py-0.5 rounded-full font-[var(--font-mono)]">
            {item.source}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="font-medium text-[var(--color-cream)] line-clamp-2 leading-snug flex-1">
            {item.title || item.url}
          </h3>
          {mustHave && (
            <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-marigold)]/15 text-[var(--color-marigold)] border border-[var(--color-marigold)]/30">
              Must have
            </span>
          )}
        </div>

        {item.notes && <p className="text-xs text-[var(--color-mist)] line-clamp-2">{item.notes}</p>}

        <div className="flex items-baseline justify-between mt-auto pt-2">
          <span className="font-[var(--font-mono)] text-[var(--color-lantern)] font-semibold">
            {formatMoney(item.price, item.currency) || "Price not set"}
          </span>
          <span className="text-[10px] text-[var(--color-mist)]">added by {item.addedByName}</span>
        </div>

        {isBought && item.boughtByName && (
          <p className="text-[10px] text-[var(--color-sage)]">Bought by {item.boughtByName}</p>
        )}
        {isReserved && (
          <p className="text-[10px] text-[var(--color-lantern)]">
            {reservedByMe ? "You reserved this" : `Reserved by ${item.reservedByName}`}
          </p>
        )}

        <div className="mt-3 flex flex-col gap-2">
          <button
            onClick={() => setShowCompare(true)}
            className="w-full text-center text-sm rounded-lg py-2.5 btn-premium cursor-pointer"
          >
            Where to buy →
          </button>

          <div className="flex items-center gap-2">
            {isBought ? (
              <button
                disabled={busy}
                onClick={() => run(() => onUnbuy(item.id))}
                className="btn-ghost flex-1 h-9 text-sm cursor-pointer disabled:opacity-50"
                title="Move back to wishlist"
              >
                ↺ Move to wishlist
              </button>
            ) : reservedByMe ? (
              <>
                <button
                  disabled={busy}
                  onClick={() => run(() => onRelease(item.id))}
                  className="btn-ghost flex-1 h-9 text-sm cursor-pointer disabled:opacity-50"
                  title="Cancel your reservation"
                >
                  Release
                </button>
                <button
                  disabled={busy}
                  onClick={() => run(() => onBuy(item.id))}
                  className="btn-icon is-success cursor-pointer"
                  title="Mark as bought"
                >
                  ✓
                </button>
              </>
            ) : isReserved ? (
              <span
                className="btn-ghost flex-1 h-9 text-sm opacity-70 cursor-default"
                title={`Reserved by ${item.reservedByName}`}
              >
                Reserved
              </span>
            ) : (
              <>
                <button
                  disabled={busy}
                  onClick={() => run(() => onReserve(item.id))}
                  className="btn-ghost flex-1 h-9 text-sm cursor-pointer disabled:opacity-50"
                  title="I'll get this — reserve it so nobody else buys it"
                >
                  Reserve
                </button>
                <button
                  disabled={busy}
                  onClick={() => run(() => onBuy(item.id))}
                  className="btn-icon is-success cursor-pointer"
                  title="Mark as bought"
                >
                  ✓
                </button>
              </>
            )}

            {isMine && (
              <button
                disabled={busy}
                onClick={() => setShowEdit(true)}
                className="btn-icon is-accent cursor-pointer"
                title="Edit item"
              >
                ✎
              </button>
            )}

            {isMine && (
              <button
                disabled={busy}
                onClick={() => run(() => onDelete(item.id))}
                className="btn-icon is-danger cursor-pointer"
                title="Remove item"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {showCompare && (
        <ComparePricesModal
          roomId={roomId}
          itemId={item.id}
          itemTitle={item.title || item.url}
          savedUrl={item.url}
          savedSource={item.source}
          savedPrice={item.price}
          savedCurrency={item.currency}
          onClose={() => setShowCompare(false)}
        />
      )}

      {showEdit && (
        <EditItemModal
          roomId={roomId}
          item={item}
          onSaved={(updated) => {
            onUpdate(updated);
            setShowEdit(false);
          }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}

function EditItemModal({ roomId, item, onSaved, onClose }) {
  const [title, setTitle] = useState(item.title || "");
  const [imageUrl, setImageUrl] = useState(item.imageUrl || "");
  const [price, setPrice] = useState(item.price != null ? String(item.price) : "");
  const [notes, setNotes] = useState(item.notes || "");
  const [priority, setPriority] = useState(item.priority || "NICE_TO_HAVE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const updated = await ItemsApi.update(roomId, item.id, {
        title: title.trim() || null,
        imageUrl: imageUrl.trim() || null,
        price: price ? Number(price) : null,
        notes: notes.trim() || null,
        priority,
      });
      onSaved(updated);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't save changes."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Edit item">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="text-sm text-[var(--color-rose)]">{error}</p>}

        <div>
          <label className="block text-xs font-medium text-[var(--color-mist)] mb-1.5">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[var(--color-ink)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-cream)] focus:outline-none focus:ring-2 focus:ring-[var(--color-lantern)]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-mist)] mb-1.5">
            Image URL — paste one if the preview image is missing or wrong
          </label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…/photo.jpg"
            className="w-full bg-[var(--color-ink)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-cream)] focus:outline-none focus:ring-2 focus:ring-[var(--color-lantern)]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-mist)] mb-1.5">Price (₹)</label>
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
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-mist)] mb-1.5">Notes</label>
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
          className="w-full rounded-lg py-2.5 disabled:opacity-60 cursor-pointer btn-premium"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </Modal>
  );
}

function ComparePricesModal({ roomId, itemId, itemTitle, savedUrl, savedSource, savedPrice, savedCurrency, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await ItemsApi.comparePrices(roomId, itemId);
        if (!cancelled) setOffers(data.offers || []);
      } catch (err) {
        if (!cancelled) setError(apiErrorMessage(err, "Couldn't fetch prices right now."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, itemId]);

  return (
    <div
      className="modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="modal-panel bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 max-w-md w-full card-elevated max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="font-[var(--font-display)] text-lg text-[var(--color-cream)] leading-snug">
            Where to buy
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--color-mist)] hover:text-[var(--color-cream)] text-sm cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-[var(--color-mist)] mb-4 line-clamp-1">{itemTitle}</p>

        {/* The link the user actually pasted — always shown first, always works */}
        <a
          href={savedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 bg-[var(--color-surface-2)] border border-[var(--color-lantern)] rounded-lg px-3 py-2.5 mb-3"
        >
          <span className="flex items-center gap-2 min-w-0">
            <StoreIcon url={savedUrl} label={savedSource} />
            <span className="text-sm text-[var(--color-cream)] truncate">
              {savedSource || "Saved link"} <span className="text-[10px] text-[var(--color-lantern)]">(your link)</span>
            </span>
          </span>
          <span className="font-[var(--font-mono)] text-[var(--color-lantern)] font-semibold text-sm shrink-0">
            {formatMoney(savedPrice, savedCurrency) || "—"}
          </span>
        </a>

        <p className="text-[10px] uppercase tracking-wide text-[var(--color-mist)] mb-2">
          Other platforms — cheapest first
        </p>

        {loading && (
          <p className="text-sm text-[var(--color-mist)]">Searching platforms…</p>
        )}

        {!loading && error && (
          <p className="text-sm text-[var(--color-rose)]">{error}</p>
        )}

        {!loading && !error && offers.length === 0 && (
          <p className="text-sm text-[var(--color-mist)]">
            No other listings found for this product — the link above is your best bet.
          </p>
        )}

        {!loading && !error && offers.length > 0 && (
          <ul className="flex flex-col gap-2">
            {offers.map((offer, i) => (
              <li key={i}>
                <a
                  href={offer.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-[var(--color-lantern)] rounded-lg px-3 py-2.5 transition-colors"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <StoreIcon url={offer.link} src={offer.thumbnail} label={offer.platform} />
                    <span className="text-sm text-[var(--color-cream)] truncate">{offer.platform}</span>
                  </span>
                  <span className="font-[var(--font-mono)] text-[var(--color-lantern)] font-semibold text-sm shrink-0">
                    {formatMoney(offer.price, offer.currency) || "—"}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
