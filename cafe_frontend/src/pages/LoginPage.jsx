import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  loginApi,
  sendOtpApi,
  registerAdminApi,
  resetPasswordApi,
  googleAuthApi,
} from "../services/adminApi";
import {
  User,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Sparkles,
  UserPlus,
  LogIn,
} from "lucide-react";
import ArtisanLogo from "../components/ArtisanLogo";
import "./LoginPage.css";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Primary Mode: "signin" | "register" | "forgot_password"
  const [authMode, setAuthMode] = useState("signin");

  // General Form States
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    newPassword: "",
    otp: "",
  });

  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Timer countdown for resending OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle Google OAuth initialization ONLY if a valid real Client ID is provided
  useEffect(() => {
    /* global google */
    const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
    const isRealGoogleId = Boolean(
      googleClientId &&
      !googleClientId.includes("your-client-id") &&
      googleClientId.includes(".apps.googleusercontent.com")
    );

    if (typeof window !== "undefined" && isRealGoogleId && window.google) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCallback,
        });

        const signinBtn = document.getElementById("google-signin-btn");
        if (signinBtn) {
          window.google.accounts.id.renderButton(signinBtn, {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "continue_with",
          });
        }

        const signupBtn = document.getElementById("google-signup-btn");
        if (signupBtn) {
          window.google.accounts.id.renderButton(signupBtn, {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "signup_with",
          });
        }
      } catch (err) {
        console.warn("Google Sign-In/Sign-Up init error:", err);
      }
    }
  }, [authMode]);

  async function handleGoogleCallback(response) {
    if (!response.credential) return;
    setLoading(true);
    setError("");
    try {
      const data = await googleAuthApi(response.credential);
      completeLogin(data.access_token);
    } catch (err) {
      setError(err.response?.data?.detail || "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  function completeLogin(accessToken) {
    try {
      const payload = JSON.parse(atob(accessToken.split(".")[1]));
      if (payload.role !== "ADMIN" && payload.role !== "admin") {
        setError("Access restricted. Admin privileges required.");
        return;
      }

      login(accessToken, {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
      });

      navigate("/admin/dashboard");
    } catch {
      setError("Failed to decode session credentials. Please log in again.");
    }
  }

  // 1. Password Login
  async function handlePasswordLogin(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const data = await loginApi(form.username, form.password);
      completeLogin(data.access_token);
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid username/email or password.");
    } finally {
      setLoading(false);
    }
  }

  // 2. Request OTP (for register or forgot-password)
  async function handleSendOtp(purpose) {
    if (!form.email || !form.email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await sendOtpApi(form.email, purpose);
      setOtpSent(true);
      setCountdown(60);
      setSuccessMsg(res.message || `Verification code sent to ${form.email}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to dispatch verification code.");
    } finally {
      setLoading(false);
    }
  }

  // 3. Register New Admin
  async function handleRegisterAdmin(e) {
    e.preventDefault();
    if (!form.otp || form.otp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const data = await registerAdminApi({
        email: form.email,
        username: form.username,
        password: form.password,
        otp: form.otp,
      });
      setSuccessMsg("Admin account registered and verified successfully!");
      completeLogin(data.access_token);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  // 4. Reset Password
  async function handleResetPassword(e) {
    e.preventDefault();
    if (!form.otp || form.otp.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    if (form.newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await resetPasswordApi({
        email: form.email,
        otp: form.otp,
        new_password: form.newPassword,
      });
      setSuccessMsg("Password reset successfully! Please sign in with your new password.");
      setAuthMode("signin");
      setOtpSent(false);
      setForm((f) => ({ ...f, password: f.newPassword, otp: "" }));
    } catch (err) {
      setError(err.response?.data?.detail || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  }

  function resetViews(mode) {
    setAuthMode(mode);
    setError("");
    setSuccessMsg("");
    setOtpSent(false);
    setCountdown(0);
  }

  return (
    <div className="lp-root">
      <div className="lp-container">
        {/* Brand crest */}
        <div className="lp-crest">
          <div className="lp-crest-icon">
            <ArtisanLogo size={28} color="#FFFFFF" />
          </div>
          <h1 className="lp-brand-name">The Artisan Café</h1>
          <span className="lp-brand-tag">MANAGEMENT &amp; ADMIN PORTAL</span>
        </div>

        {/* Card */}
        <div className="lp-card">
          {/* Top Auth Mode Tabs */}
          <div className="lp-mode-tabs">
            <button
              type="button"
              className={`lp-mode-tab ${authMode === "signin" ? "active" : ""}`}
              onClick={() => resetViews("signin")}
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              className={`lp-mode-tab ${authMode === "register" ? "active" : ""}`}
              onClick={() => resetViews("register")}
            >
              <UserPlus size={14} />
              <span>Register Admin</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* 1. SIGN IN MODE (Direct Password Login + Forgot Link)     */}
          {/* ========================================================= */}
          {authMode === "signin" && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h2 className="lp-title">Welcome Back</h2>
                <p className="lp-sub">Sign in with your administrator credentials</p>
              </div>

              {/* Password Login Form */}
              <form onSubmit={handlePasswordLogin} className="lp-form">
                <div className="lp-group">
                  <label htmlFor="username">Username or Email</label>
                  <div className="lp-input-wrapper">
                    <User size={16} className="lp-input-icon" />
                    <input
                      id="username"
                      type="text"
                      autoComplete="username"
                      value={form.username}
                      onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                      placeholder="e.g. admin or owner@artisancafe.com"
                      required
                    />
                  </div>
                </div>

                <div className="lp-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label htmlFor="password">Password</label>
                    <button
                      type="button"
                      className="lp-link-btn"
                      onClick={() => resetViews("forgot_password")}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="lp-input-wrapper">
                    <Lock size={16} className="lp-input-icon" />
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
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
                  <span>{loading ? "Authenticating…" : "Enter Admin Portal"}</span>
                  <ArrowRight size={16} />
                </button>
              </form>

              {/* ── Google OAuth Divider & Button ── */}
              <div className="lp-divider">
                <span>OR FAST 1-CLICK AUTH</span>
              </div>

              <div id="google-signin-btn" style={{ minHeight: 40, width: "100%", display: "flex", justifyContent: "center" }}>
                <button
                  type="button"
                  className="lp-google-fallback-btn"
                  onClick={() => handleGoogleCallback({ credential: "demo_google_token" })}
                  title="Instant Google 1-Click Sign In"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. REGISTER NEW ADMIN MODE                                */}
          {/* ========================================================= */}
          {authMode === "register" && (
            <div>
              <h2 className="lp-title">Register New Admin</h2>
              <p className="lp-sub">Create an administrator account with email verification</p>

              <form onSubmit={handleRegisterAdmin} className="lp-form">
                <div className="lp-group">
                  <label htmlFor="reg-email">Email Address</label>
                  <div className="lp-input-wrapper">
                    <Mail size={16} className="lp-input-icon" />
                    <input
                      id="reg-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="e.g. manager@artisancafe.com"
                      required
                    />
                  </div>
                </div>

                <div className="lp-group">
                  <label htmlFor="reg-username">Username</label>
                  <div className="lp-input-wrapper">
                    <User size={16} className="lp-input-icon" />
                    <input
                      id="reg-username"
                      type="text"
                      value={form.username}
                      onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                      placeholder="e.g. alex_manager"
                      required
                    />
                  </div>
                </div>

                <div className="lp-group">
                  <label htmlFor="reg-password">Password</label>
                  <div className="lp-input-wrapper">
                    <Lock size={16} className="lp-input-icon" />
                    <input
                      id="reg-password"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="At least 6 characters"
                      required
                    />
                  </div>
                </div>

                {/* OTP Step */}
                {!otpSent ? (
                  <button
                    type="button"
                    className="lp-submit-btn"
                    onClick={() => handleSendOtp("register")}
                    disabled={loading || !form.email || !form.username || !form.password}
                  >
                    <Mail size={15} />
                    <span>{loading ? "Sending Code…" : "Send Email Verification Code"}</span>
                  </button>
                ) : (
                  <>
                    <div className="lp-group">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label htmlFor="reg-otp">6-Digit Verification Code</label>
                        <button
                          type="button"
                          className="lp-link-btn"
                          disabled={countdown > 0 || loading}
                          onClick={() => handleSendOtp("register")}
                        >
                          {countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
                        </button>
                      </div>
                      <div className="lp-input-wrapper">
                        <KeyRound size={16} className="lp-input-icon" />
                        <input
                          id="reg-otp"
                          type="text"
                          maxLength={6}
                          value={form.otp}
                          onChange={(e) => setForm((f) => ({ ...f, otp: e.target.value.replace(/\D/g, "") }))}
                          placeholder="Enter 6-digit code"
                          style={{ letterSpacing: "4px", fontSize: "16px", fontWeight: 700 }}
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" className="lp-submit-btn" disabled={loading || form.otp.length !== 6}>
                      <UserPlus size={16} />
                      <span>{loading ? "Registering…" : "Verify Code & Complete Registration"}</span>
                    </button>
                  </>
                )}

                {error && (
                  <div className="lp-error">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="lp-success">
                    <CheckCircle2 size={15} />
                    <span>{successMsg}</span>
                  </div>
                )}
              </form>

              {/* ── Google OAuth Fast Register Divider & Button ── */}
              <div className="lp-divider">
                <span>OR 1-CLICK ADMIN REGISTRATION</span>
              </div>

              <div id="google-signup-btn" style={{ minHeight: 40, width: "100%", display: "flex", justifyContent: "center" }}>
                <button
                  type="button"
                  className="lp-google-fallback-btn"
                  onClick={() => handleGoogleCallback({ credential: "demo_google_token" })}
                  title="Instant Google 1-Click Registration"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign up with Google</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. FORGOT & RESET PASSWORD MODE                           */}
          {/* ========================================================= */}
          {authMode === "forgot_password" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 className="lp-title">Reset Password</h2>
                <button
                  type="button"
                  className="lp-link-btn"
                  onClick={() => resetViews("signin")}
                >
                  Back to Sign In
                </button>
              </div>
              <p className="lp-sub">Enter your email to receive a verification reset code</p>

              <form onSubmit={handleResetPassword} className="lp-form">
                <div className="lp-group">
                  <label htmlFor="forgot-email">Registered Email</label>
                  <div className="lp-input-wrapper">
                    <Mail size={16} className="lp-input-icon" />
                    <input
                      id="forgot-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="e.g. admin@artisancafe.com"
                      required
                    />
                  </div>
                </div>

                {!otpSent ? (
                  <button
                    type="button"
                    className="lp-submit-btn"
                    onClick={() => handleSendOtp("reset_password")}
                    disabled={loading || !form.email}
                  >
                    <KeyRound size={15} />
                    <span>{loading ? "Sending Code…" : "Send Reset Verification Code"}</span>
                  </button>
                ) : (
                  <>
                    <div className="lp-group">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label htmlFor="reset-otp">6-Digit Verification Code</label>
                        <button
                          type="button"
                          className="lp-link-btn"
                          disabled={countdown > 0 || loading}
                          onClick={() => handleSendOtp("reset_password")}
                        >
                          {countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
                        </button>
                      </div>
                      <div className="lp-input-wrapper">
                        <KeyRound size={16} className="lp-input-icon" />
                        <input
                          id="reset-otp"
                          type="text"
                          maxLength={6}
                          value={form.otp}
                          onChange={(e) => setForm((f) => ({ ...f, otp: e.target.value.replace(/\D/g, "") }))}
                          placeholder="Enter 6-digit code"
                          style={{ letterSpacing: "4px", fontSize: "16px", fontWeight: 700 }}
                          required
                        />
                      </div>
                    </div>

                    <div className="lp-group">
                      <label htmlFor="new-password">New Password</label>
                      <div className="lp-input-wrapper">
                        <Lock size={16} className="lp-input-icon" />
                        <input
                          id="new-password"
                          type="password"
                          value={form.newPassword}
                          onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                          placeholder="Enter your new password"
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" className="lp-submit-btn" disabled={loading || form.otp.length !== 6}>
                      <ShieldCheck size={16} />
                      <span>{loading ? "Updating…" : "Set New Password & Return to Sign In"}</span>
                    </button>
                  </>
                )}

                {error && (
                  <div className="lp-error">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="lp-success">
                    <CheckCircle2 size={15} />
                    <span>{successMsg}</span>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>

        {/* Footer quote */}
        <div className="lp-footer">
          <p>EST. 2024 &bull; ARTISAN ROASTERS &bull; 18 PARK STREET, KOLKATA</p>
        </div>
      </div>
    </div>
  );
}
