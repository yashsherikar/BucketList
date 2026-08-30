import { useEffect, useState } from "react";
import { ItemsApi } from "../api/rooms";
import { apiErrorMessage } from "../api/client";

export default function ItemCard({ item, roomId, currentUserId, onBuy, onUnbuy, onDelete }) {
  const [busy, setBusy] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const isBought = item.status === "BOUGHT";
  const canDelete = item.addedByUserId === currentUserId;

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
      className={`bg-[var(--color-surface)] border rounded-2xl overflow-hidden flex flex-col transition-colors card-elevated ${
        isBought ? "border-[var(--color-sage)]/40" : "border-[var(--color-border)]"
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
        {item.source && (
          <span className="absolute bottom-2 left-2 bg-black/60 text-[var(--color-cream)] text-[10px] px-2 py-0.5 rounded-full font-[var(--font-mono)]">
            {item.source}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-medium text-[var(--color-cream)] line-clamp-2 leading-snug">
          {item.title || item.url}
        </h3>

        {item.notes && <p className="text-xs text-[var(--color-mist)] line-clamp-2">{item.notes}</p>}

        <div className="flex items-baseline justify-between mt-auto pt-2">
          <span className="font-[var(--font-mono)] text-[var(--color-lantern)] font-semibold">
            {item.price != null ? `₹${Number(item.price).toLocaleString("en-IN")}` : "Price not set"}
          </span>
          <span className="text-[10px] text-[var(--color-mist)]">added by {item.addedByName}</span>
        </div>

        {isBought && item.boughtByName && (
          <p className="text-[10px] text-[var(--color-sage)]">Bought by {item.boughtByName}</p>
        )}

        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setShowCompare(true)}
            className="flex-1 text-center text-sm rounded-lg py-2 btn-premium cursor-pointer"
          >
            Buy →
          </button>

          {isBought ? (
            <button
              disabled={busy}
              onClick={() => run(() => onUnbuy(item.id))}
              className="px-3 rounded-lg border border-[var(--color-border)] text-[var(--color-mist)] hover:text-[var(--color-cream)] text-sm cursor-pointer disabled:opacity-50"
              title="Move back to wishlist"
            >
              ↺
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={() => run(() => onBuy(item.id))}
              className="px-3 rounded-lg border border-[var(--color-sage)]/50 text-[var(--color-sage)] hover:bg-[var(--color-sage)]/10 text-sm cursor-pointer disabled:opacity-50"
              title="Mark as bought"
            >
              ✓
            </button>
          )}

          {canDelete && (
            <button
              disabled={busy}
              onClick={() => run(() => onDelete(item.id))}
              className="px-3 rounded-lg border border-[var(--color-rose)]/40 text-[var(--color-rose)] hover:bg-[var(--color-rose)]/10 text-sm cursor-pointer disabled:opacity-50"
              title="Remove item"
            >
              ✕
            </button>
          )}
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
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}

function ComparePricesModal({ roomId, itemId, itemTitle, savedUrl, savedSource, savedPrice, onClose }) {
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
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 max-w-md w-full card-elevated max-h-[85vh] overflow-y-auto"
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
          <span className="text-sm text-[var(--color-cream)] truncate">
            {savedSource || "Saved link"} <span className="text-[10px] text-[var(--color-lantern)]">(your link)</span>
          </span>
          <span className="font-[var(--font-mono)] text-[var(--color-lantern)] font-semibold text-sm shrink-0">
            {savedPrice != null ? `₹${Number(savedPrice).toLocaleString("en-IN")}` : "—"}
          </span>
        </a>

        <p className="text-[10px] uppercase tracking-wide text-[var(--color-mist)] mb-2">
          Other platforms
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
                  <span className="text-sm text-[var(--color-cream)] truncate">{offer.platform}</span>
                  <span className="font-[var(--font-mono)] text-[var(--color-lantern)] font-semibold text-sm shrink-0">
                    {offer.price != null ? `₹${Number(offer.price).toLocaleString("en-IN")}` : "—"}
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
