import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { RoomsApi } from "../api/rooms";
import { apiErrorMessage } from "../api/client";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await RoomsApi.list();
      setRooms(data);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't load your rooms."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-grain">
      <Navbar />
      <main className="max-w-5xl mx-auto px-5 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-[var(--font-display)] text-3xl text-[var(--color-cream)]">
              Your rooms
            </h1>
            <p className="text-[var(--color-mist)] text-sm mt-1">
              Shared wishlists with the people you buy things for.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowJoin(true)}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-cream)] hover:border-[var(--color-lantern)] transition-colors cursor-pointer text-sm font-medium"
            >
              Join a room
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-lg text-sm cursor-pointer btn-premium"
            >
              + New room
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-[var(--color-rose)] bg-[var(--color-rose)]/10 border border-[var(--color-rose)]/30 rounded-lg px-3 py-2 mb-6">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-[var(--color-mist)]">Loading…</p>
        ) : rooms.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} onJoin={() => setShowJoin(true)} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={(room) => {
            setRooms((prev) => [room, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
      {showJoin && (
        <JoinRoomModal
          onClose={() => setShowJoin(false)}
          onJoined={(room) => {
            setRooms((prev) => [room, ...prev]);
            setShowJoin(false);
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ onCreate, onJoin }) {
  return (
    <div className="text-center py-20 border border-dashed border-[var(--color-border)] rounded-2xl">
      <span className="text-4xl" aria-hidden>🏮</span>
      <p className="text-[var(--color-cream)] font-[var(--font-display)] text-xl mt-4">
        No rooms yet
      </p>
      <p className="text-[var(--color-mist)] text-sm mt-2 max-w-sm mx-auto">
        Start a room for your family or friend group, or join one with an invite code.
      </p>
      <div className="flex justify-center gap-3 mt-6">
        <button
          onClick={onJoin}
          className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-cream)] hover:border-[var(--color-lantern)] transition-colors cursor-pointer text-sm font-medium"
        >
          Join a room
        </button>
        <button
          onClick={onCreate}
          className="px-4 py-2 rounded-lg text-sm cursor-pointer btn-premium"
        >
          + New room
        </button>
      </div>
    </div>
  );
}

function RoomCard({ room }) {
  return (
    <Link
      to={`/rooms/${room.id}`}
      className="block bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-lantern)] transition-colors group card-elevated"
    >
      <h3 className="font-[var(--font-display)] text-lg text-[var(--color-cream)] group-hover:text-[var(--color-lantern)] transition-colors">
        {room.name}
      </h3>
      {room.description && (
        <p className="text-sm text-[var(--color-mist)] mt-1 line-clamp-2">{room.description}</p>
      )}
      <div className="flex items-center gap-4 mt-4 text-xs text-[var(--color-mist)] font-[var(--font-mono)]">
        <span>{room.memberCount} member{room.memberCount !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span>{room.itemCount} item{room.itemCount !== 1 ? "s" : ""}</span>
      </div>
    </Link>
  );
}

function CreateRoomModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const room = await RoomsApi.create({ name, description });
      onCreated(room);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't create the room."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="New room">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="text-sm text-[var(--color-rose)]">{error}</p>}
        <div>
          <label className="block text-xs font-medium text-[var(--color-mist)] mb-1.5">Room name</label>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sherikar Family"
            className="w-full bg-[var(--color-ink)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-cream)] focus:outline-none focus:ring-2 focus:ring-[var(--color-lantern)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-mist)] mb-1.5">Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Diwali gifting list"
            className="w-full bg-[var(--color-ink)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-cream)] focus:outline-none focus:ring-2 focus:ring-[var(--color-lantern)]"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-2.5 disabled:opacity-60 cursor-pointer btn-premium"
        >
          {loading ? "Creating…" : "Create room"}
        </button>
      </form>
    </Modal>
  );
}

function JoinRoomModal({ onClose, onJoined }) {
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const room = await RoomsApi.join(inviteCode.trim().toUpperCase());
      onJoined(room);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't join with that code."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Join a room">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="text-sm text-[var(--color-rose)]">{error}</p>}
        <div>
          <label className="block text-xs font-medium text-[var(--color-mist)] mb-1.5">Invite code</label>
          <input
            required
            autoFocus
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="ABC123X"
            className="w-full bg-[var(--color-ink)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-cream)] font-[var(--font-mono)] tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-[var(--color-lantern)]"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-2.5 disabled:opacity-60 cursor-pointer btn-premium"
        >
          {loading ? "Joining…" : "Join room"}
        </button>
      </form>
    </Modal>
  );
}

export function Modal({ onClose, title, children }) {
  return (
    <div
      className="modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-5 z-30"
      onClick={onClose}
    >
      <div
        className="modal-panel w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 card-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[var(--font-display)] text-xl text-[var(--color-cream)]">{title}</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-mist)] hover:text-[var(--color-cream)] cursor-pointer text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
