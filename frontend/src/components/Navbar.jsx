import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-ink)]/95 backdrop-blur sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
        <Link to="/rooms" className="flex items-center gap-2 group">
          <img
            src="/logo.png"
            alt="WishRoom"
            width={32}
            height={32}
            className="w-8 h-8 rounded-lg shrink-0"
          />
          <span
            className="font-[var(--font-display)] gradient-text text-xl tracking-tight transition-colors"
          >
            WishRoom
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-mist)] hover:text-[var(--color-cream)] hover:border-[var(--color-lantern)] transition-colors cursor-pointer text-base"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

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
      </div>
    </header>
  );
}
