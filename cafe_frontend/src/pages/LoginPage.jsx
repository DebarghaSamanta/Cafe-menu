import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { loginApi } from "../services/adminApi";
import { Coffee, User, Lock, ArrowRight, AlertCircle } from "lucide-react";
import "./LoginPage.css";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginApi(form.username, form.password);
      const payload = JSON.parse(atob(data.access_token.split(".")[1]));
      login(data.access_token, { id: payload.sub, username: payload.username, role: payload.role });

      if (payload.role === "ADMIN") navigate("/admin/dashboard");
      else if (payload.role === "STAFF") navigate("/staff/orders");
      else setError("Unknown role. Please contact management.");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lp-root">
      <div className="lp-container">
        {/* Brand crest */}
        <div className="lp-crest">
          <div className="lp-crest-icon">
            <Coffee size={24} strokeWidth={1.8} />
          </div>
          <h1 className="lp-brand-name">The Artisan Café</h1>
          <span className="lp-brand-tag">MANAGEMENT & KITCHEN PORTAL</span>
        </div>

        {/* Card */}
        <div className="lp-card">
          <h2 className="lp-title">Sign In</h2>
          <p className="lp-sub">Enter your staff or administrator credentials</p>

          <form onSubmit={handleSubmit} className="lp-form">
            <div className="lp-group">
              <label htmlFor="username">Username</label>
              <div className="lp-input-wrapper">
                <User size={16} className="lp-input-icon" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="e.g. admin or barista"
                  required
                />
              </div>
            </div>

            <div className="lp-group">
              <label htmlFor="password">Password</label>
              <div className="lp-input-wrapper">
                <Lock size={16} className="lp-input-icon" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="lp-error">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="lp-submit-btn" disabled={loading}>
              <span>{loading ? "Authenticating…" : "Enter Portal"}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        {/* Footer quote */}
        <div className="lp-footer">
          <p>EST. 2024 &bull; ARTISAN ROASTERS &bull; ALL RIGHTS RESERVED</p>
        </div>
      </div>
    </div>
  );
}
