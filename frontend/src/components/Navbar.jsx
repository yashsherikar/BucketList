import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-ink)]/95 backdrop-blur sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
        <Link to="/rooms" className="flex items-center gap-2 group">
          <span className="text-2xl" aria-hidden>🏮</span>
          <span
            className="font-[var(--font-display)] text-xl tracking-tight text-[var(--color-cream)] group-hover:text-[var(--color-lantern)] transition-colors"
          >
            WishRoom
          </span>
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-[var(--color-mist)]">
              {user.name}
            </span>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="text-sm px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-mist)] hover:text-[var(--color-cream)] hover:border-[var(--color-lantern)] transition-colors cursor-pointer"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
