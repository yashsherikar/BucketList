import { useState } from "react";

export default function ItemCard({ item, currentUserId, onBuy, onUnbuy, onDelete }) {
  const [busy, setBusy] = useState(false);
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
      className={`bg-[var(--color-surface)] border rounded-2xl overflow-hidden flex flex-col transition-colors ${
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
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-sm font-semibold bg-[var(--color-marigold)] text-[var(--color-ink)] rounded-lg py-2 hover:brightness-110 transition"
          >
            Buy →
          </a>

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
    </div>
  );
}
