import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import ItemCard from "../components/ItemCard";
import AddItemModal from "../components/AddItemModal";
import { RoomsApi, ItemsApi } from "../api/rooms";
import { apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function RoomDetail() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [room, setRoom] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [sort, setSort] = useState("recent");
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [roomData, itemsData] = await Promise.all([
        RoomsApi.detail(roomId),
        ItemsApi.list(roomId),
      ]);
      setRoom(roomData);
      setItems(itemsData);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't load this room."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handleBuy = async (itemId) => {
    const updated = await ItemsApi.markBought(roomId, itemId);
    setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
  };

  const handleUnbuy = async (itemId) => {
    const updated = await ItemsApi.markWishlisted(roomId, itemId);
    setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
  };

  const handleDelete = async (itemId) => {
    await ItemsApi.remove(roomId, itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleUpdate = (updated) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  const handleReserve = async (itemId) => {
    const updated = await ItemsApi.reserve(roomId, itemId);
    setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
  };

  const handleRelease = async (itemId) => {
    const updated = await ItemsApi.release(roomId, itemId);
    setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
  };

  const handleLeave = async () => {
    if (!window.confirm("Leave this room?")) return;
    await RoomsApi.leave(roomId);
    navigate("/rooms");
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(room.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const filteredItems = items.filter((i) => filter === "ALL" || i.status === filter);
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sort === "price-asc") return (a.price ?? Infinity) - (b.price ?? Infinity);
    if (sort === "price-desc") return (b.price ?? -Infinity) - (a.price ?? -Infinity);
    if (sort === "priority")
      return (a.priority === "MUST_HAVE" ? 0 : 1) - (b.priority === "MUST_HAVE" ? 0 : 1);
    return 0; // "recent" — backend already returns newest first
  });
  const isOwner = room && user && room.ownerId === user.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-grain">
        <Navbar />
        <main className="max-w-5xl mx-auto px-5 py-10 animate-fade">
          <div className="skeleton h-4 w-24 mb-8" />
          <div className="skeleton h-9 w-64 mb-3" />
          <div className="skeleton h-4 w-40 mb-10" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-[var(--color-border)]">
                <div className="skeleton aspect-[4/3] rounded-none" />
                <div className="p-4 space-y-3">
                  <div className="skeleton h-4 w-4/5" />
                  <div className="skeleton h-3 w-2/5" />
                  <div className="skeleton h-9 w-full mt-2" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-grain">
        <Navbar />
        <div className="max-w-md mx-auto mt-16 text-center">
          <p className="text-[var(--color-rose)]">{error || "Room not found."}</p>
          <button onClick={() => navigate("/rooms")} className="mt-4 text-[var(--color-lantern)] hover:underline cursor-pointer">
            ← Back to rooms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grain">
      <Navbar />
      <main className="max-w-5xl mx-auto px-5 py-10">
        <button
          onClick={() => navigate("/rooms")}
          className="text-sm text-[var(--color-mist)] hover:text-[var(--color-cream)] mb-6 cursor-pointer"
        >
          ← All rooms
        </button>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div>
            <h1 className="font-[var(--font-display)] text-3xl text-[var(--color-cream)]">{room.name}</h1>
            {room.description && <p className="text-[var(--color-mist)] text-sm mt-1">{room.description}</p>}

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {room.members.map((m) => (
                <span
                  key={m.userId}
                  className="text-xs bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-full px-3 py-1 text-[var(--color-mist)]"
                >
                  {m.name}
                  {m.role === "OWNER" && <span className="text-[var(--color-lantern)]"> · owner</span>}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            <div className="ticket-stub px-4 py-2.5 flex items-center gap-3">
              <div>
                <p className="text-[10px] text-[var(--color-mist)] uppercase tracking-wide">Invite code</p>
                <p className="font-[var(--font-mono)] text-[var(--color-lantern)] tracking-widest text-lg">
                  {room.inviteCode}
                </p>
              </div>
              <button
                onClick={copyInvite}
                className="text-xs px-2.5 py-1 rounded-md border border-[var(--color-border)] text-[var(--color-cream)] hover:border-[var(--color-lantern)] cursor-pointer"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {!isOwner && (
              <button onClick={handleLeave} className="text-xs text-[var(--color-mist)] hover:text-[var(--color-rose)] cursor-pointer">
                Leave room
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {[
              ["ALL", "All"],
              ["WISHLISTED", "Wishlisted"],
              ["RESERVED", "Reserved"],
              ["BOUGHT", "Bought"],
            ].map(([f, label]) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                  filter === f
                    ? "bg-[var(--color-lantern)] text-[var(--color-on-accent)] border-[var(--color-lantern)] font-semibold"
                    : "border-[var(--color-border)] text-[var(--color-mist)] hover:text-[var(--color-cream)]"
                }`}
              >
                {label}
              </button>
            ))}

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-mist)] cursor-pointer hover:text-[var(--color-cream)]"
            >
              <option value="recent">Recently added</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="priority">Priority</option>
            </select>
          </div>

          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-lg bg-[var(--color-marigold)] text-[var(--color-ink)] font-semibold hover:brightness-110 transition cursor-pointer text-sm"
          >
            + Add product
          </button>
        </div>

        {sortedItems.length === 0 ? (
          <div className="animate-rise text-center py-20 px-6 border border-dashed border-[var(--color-border)] rounded-2xl">
            <span className="text-5xl inline-block animate-pop" aria-hidden>🎁</span>
            <p className="text-[var(--color-cream)] font-[var(--font-display)] text-xl mt-4">
              {items.length === 0 ? "Nothing here yet" : "Nothing matches this filter"}
            </p>
            <p className="text-[var(--color-mist)] text-sm mt-2">
              {items.length === 0
                ? "Paste a product link to add the first item."
                : "Try a different filter or sort."}
            </p>
            {items.length === 0 && (
              <button
                onClick={() => setShowAdd(true)}
                className="btn-premium mt-6 px-5 py-2.5 rounded-lg text-sm cursor-pointer"
              >
                + Add the first product
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedItems.map((item, idx) => (
              <ItemCard
                key={item.id}
                index={idx}
                item={item}
                roomId={roomId}
                currentUserId={user?.id}
                onBuy={handleBuy}
                onUnbuy={handleUnbuy}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                onReserve={handleReserve}
                onRelease={handleRelease}
              />
            ))}
          </div>
        )}
      </main>

      {showAdd && (
        <AddItemModal
          roomId={roomId}
          onClose={() => setShowAdd(false)}
          onAdded={(item) => {
            setItems((prev) => [item, ...prev]);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}
