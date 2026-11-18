import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  adminGetReviews,
  adminUpdateReview,
  adminDeleteReview,
} from "../../services/adminApi";
import {
  Star,
  MessageSquare,
  CheckCircle,
  EyeOff,
  Trash2,
  Sparkles,
  RefreshCw,
  Filter,
  User,
} from "lucide-react";
import "./AdminReviewsPage.css";

export default function AdminReviewsPage() {
  const { token } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [metrics, setMetrics] = useState({ total_count: 0, approved_count: 0, average_rating: 5.0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterRating, setFilterRating] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [actionInProgress, setActionInProgress] = useState(null);

  async function fetchReviews() {
    try {
      setLoading(true);
      setError("");
      const data = await adminGetReviews(token);
      setReviews(data.reviews || []);
      setMetrics(data.metrics || { total_count: 0, approved_count: 0, average_rating: 5.0 });
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to load guest feedback.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReviews();
  }, [token]);

  async function handleToggleApprove(review) {
    try {
      setActionInProgress(review.id);
      const newStatus = !review.is_approved;
      await adminUpdateReview(token, review.id, { is_approved: newStatus });
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, is_approved: newStatus } : r))
      );
    } catch (err) {
      alert("Failed to update review status.");
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleToggleFeatured(review) {
    try {
      setActionInProgress(review.id);
      const newFeatured = !review.is_featured;
      await adminUpdateReview(token, review.id, { is_featured: newFeatured });
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, is_featured: newFeatured } : r))
      );
    } catch (err) {
      alert("Failed to update featured status.");
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleDelete(reviewId) {
    if (!window.confirm("Are you sure you want to permanently delete this customer review?")) {
      return;
    }
    try {
      setActionInProgress(reviewId);
      await adminDeleteReview(token, reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (err) {
      alert("Failed to delete review.");
    } finally {
      setActionInProgress(null);
    }
  }

  const filteredReviews = reviews.filter((r) => {
    if (filterRating !== "all" && r.rating !== Number(filterRating)) return false;
    if (filterStatus === "approved" && !r.is_approved) return false;
    if (filterStatus === "hidden" && r.is_approved) return false;
    return true;
  });

  return (
    <div className="ar-root">
      {/* ── Header ── */}
      <div className="ar-header">
        <div>
          <h1 className="ar-title">Guest Feedback &amp; Reviews</h1>
          <p className="ar-sub">
            Monitor real-time guest ratings, table comments, and curate testimonials displayed on the landing page.
          </p>
        </div>

        <button className="ar-btn-refresh" onClick={fetchReviews} disabled={loading}>
          <RefreshCw size={15} className={loading ? "ar-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Key Metrics ── */}
      <div className="ar-metrics-grid">
        <div className="ar-metric-card">
          <div className="ar-metric-icon" style={{ backgroundColor: "rgba(182, 111, 36, 0.12)", color: "#B66F24" }}>
            <Star size={20} fill="#B66F24" />
          </div>
          <div>
            <div className="ar-metric-val">{metrics.average_rating}★</div>
            <div className="ar-metric-lbl">Average Rating</div>
          </div>
        </div>

        <div className="ar-metric-card">
          <div className="ar-metric-icon" style={{ backgroundColor: "rgba(56, 45, 38, 0.1)", color: "#382D26" }}>
            <MessageSquare size={20} />
          </div>
          <div>
            <div className="ar-metric-val">{metrics.total_count}</div>
            <div className="ar-metric-lbl">Total Reviews</div>
          </div>
        </div>

        <div className="ar-metric-card">
          <div className="ar-metric-icon" style={{ backgroundColor: "rgba(61, 106, 73, 0.12)", color: "#3D6A49" }}>
            <CheckCircle size={20} />
          </div>
          <div>
            <div className="ar-metric-val">{metrics.approved_count}</div>
            <div className="ar-metric-lbl">Approved on Site</div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="ar-filters-bar">
        <div className="ar-filter-group">
          <Filter size={15} color="var(--cafe-text-muted)" />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--cafe-text-main)" }}>Filter:</span>

          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="ar-select"
          >
            <option value="all">All Star Ratings</option>
            <option value="5">5 Stars Only</option>
            <option value="4">4 Stars Only</option>
            <option value="3">3 Stars &amp; Below</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="ar-select"
          >
            <option value="all">All Visibility</option>
            <option value="approved">Approved / Visible</option>
            <option value="hidden">Hidden / Archived</option>
          </select>
        </div>

        <div style={{ fontSize: "12.5px", color: "var(--cafe-text-muted)" }}>
          Showing <strong>{filteredReviews.length}</strong> of {reviews.length} reviews
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && <div className="ar-error-banner">{error}</div>}

      {/* ── Reviews Grid / List ── */}
      {loading ? (
        <div className="ar-loading-state">
          <div className="ar-spinner" />
          <p>Loading guest reviews...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="ar-empty-state">
          <MessageSquare size={36} color="var(--cafe-text-muted)" />
          <h3>No Reviews Match Filters</h3>
          <p>Customer feedback from QR table menus will appear here in real-time.</p>
        </div>
      ) : (
        <div className="ar-reviews-grid">
          {filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className={`ar-review-card ${!rev.is_approved ? "ar-card-hidden" : ""}`}
            >
              {/* Card Top: Stars + Table Badge */}
              <div className="ar-card-header">
                <div className="ar-stars-row">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={16}
                      fill={s <= rev.rating ? "#D48B38" : "none"}
                      color={s <= rev.rating ? "#D48B38" : "#CEC4B5"}
                    />
                  ))}
                  <span className="ar-rating-num">{rev.rating}.0</span>
                </div>

                <div className="ar-badges-row">
                  {rev.table_number && (
                    <span className="ar-table-badge">Table {rev.table_number}</span>
                  )}
                  {rev.is_featured && (
                    <span className="ar-featured-badge">
                      <Sparkles size={11} />
                      Featured
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body: Comment */}
              <p className="ar-comment-text">"{rev.comment}"</p>

              {/* Card Footer: Guest Name, Date & Admin Actions */}
              <div className="ar-card-footer">
                <div className="ar-guest-info">
                  <div className="ar-guest-avatar">
                    <User size={13} />
                  </div>
                  <div>
                    <strong className="ar-guest-name">{rev.customer_name}</strong>
                    <span className="ar-review-date">
                      {rev.created_at ? new Date(rev.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Recent"}
                    </span>
                  </div>
                </div>

                <div className="ar-card-actions">
                  <button
                    type="button"
                    title={rev.is_approved ? "Hide from public view" : "Approve and show publicly"}
                    className={`ar-action-btn ${rev.is_approved ? "ar-btn-active" : ""}`}
                    onClick={() => handleToggleApprove(rev)}
                    disabled={actionInProgress === rev.id}
                  >
                    {rev.is_approved ? <CheckCircle size={15} /> : <EyeOff size={15} />}
                    <span>{rev.is_approved ? "Approved" : "Hidden"}</span>
                  </button>

                  <button
                    type="button"
                    title="Toggle featured on Landing Page"
                    className={`ar-action-btn ${rev.is_featured ? "ar-btn-featured" : ""}`}
                    onClick={() => handleToggleFeatured(rev)}
                    disabled={actionInProgress === rev.id}
                  >
                    <Sparkles size={14} />
                  </button>

                  <button
                    type="button"
                    title="Delete permanently"
                    className="ar-action-btn ar-btn-delete"
                    onClick={() => handleDelete(rev.id)}
                    disabled={actionInProgress === rev.id}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
