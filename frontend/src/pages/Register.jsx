import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/client";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/rooms");
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't create your account."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-grain">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl" aria-hidden>🏮</span>
          <h1 className="font-[var(--font-display)] text-3xl mt-3 text-[var(--color-cream)]">
            Create your account
          </h1>
          <p className="text-[var(--color-mist)] text-sm mt-1">
            Start a shared wishlist room in a minute
          </p>
        </div>

        <form onSubmit={onSubmit} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
          {error && (
            <p className="text-sm text-[var(--color-rose)] bg-[var(--color-rose)]/10 border border-[var(--color-rose)]/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--color-mist)] mb-1.5">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--color-ink)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-cream)] focus:outline-none focus:ring-2 focus:ring-[var(--color-lantern)] transition-shadow"
              placeholder="Yash Sherikar"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-mist)] mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--color-ink)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-cream)] focus:outline-none focus:ring-2 focus:ring-[var(--color-lantern)] transition-shadow"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-mist)] mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--color-ink)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-cream)] focus:outline-none focus:ring-2 focus:ring-[var(--color-lantern)] transition-shadow"
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-lantern)] text-[var(--color-on-accent)] font-semibold rounded-lg py-2.5 hover:brightness-110 transition disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--color-mist)] mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-[var(--color-lantern)] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
