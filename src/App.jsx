import { db, auth } from "./firebase";
import { useState, useEffect, useCallback } from "react";

// ─── Firebase SDK (loaded via CDN in index.html) ───────────────────────────
// We'll use a mock/localStorage implementation since we can't load Firebase here.
// The code structure is identical to real Firebase; swap initializeApp + getFirestore
// for real credentials to go live.



// ══════════════════════════════════════════════════════════════
//  DESIGN TOKENS
// ══════════════════════════════════════════════════════════════
const STATUS_META = {
  PENDING: { label: "Pending", color: "#F59E0B", bg: "#FEF3C7", icon: "⏳" },
  ACCEPTED: { label: "Accepted", color: "#3B82F6", bg: "#DBEAFE", icon: "✅" },
  PICKED_UP: { label: "Picked Up", color: "#8B5CF6", bg: "#EDE9FE", icon: "📦" },
  DELIVERED: { label: "Delivered", color: "#10B981", bg: "#D1FAE5", icon: "🎉" },
};

const STATUS_FLOW = ["PENDING", "ACCEPTED", "PICKED_UP", "DELIVERED"];

// ══════════════════════════════════════════════════════════════
//  STYLES (injected once)
// ══════════════════════════════════════════════════════════════
const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', system-ui, sans-serif; background: #F1F5F9; color: #1E293B; }

  .app-shell { min-height: 100vh; display: flex; flex-direction: column; }

  /* NAV */
  .nav { background: #0F172A; color: #F8FAFC; padding: 0 24px; height: 60px;
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 12px rgba(0,0,0,.3); }
  .nav-brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.1rem; }
  .nav-brand-icon { font-size: 1.4rem; }
  .nav-right { display: flex; align-items: center; gap: 12px; }
  .nav-user { font-size: .85rem; color: #94A3B8; }
  .nav-badge { background: #3B82F6; color: #fff; font-size: .72rem; font-weight: 600;
    padding: 2px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: .04em; }
  .nav-badge.delivery { background: #8B5CF6; }
  .btn-ghost { background: transparent; border: 1px solid #334155; color: #CBD5E1;
    padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: .85rem;
    transition: all .15s; }
  .btn-ghost:hover { background: #1E293B; color: #F8FAFC; }

  /* LAYOUT */
  .main { flex: 1; padding: 28px 20px; max-width: 960px; margin: 0 auto; width: 100%; }

  /* AUTH PAGE */
  .auth-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%); padding: 20px; }
  .auth-card { background: #fff; border-radius: 16px; padding: 40px 36px; width: 100%;
    max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,.25); }
  .auth-logo { text-align: center; margin-bottom: 28px; }
  .auth-logo-icon { font-size: 2.8rem; }
  .auth-logo h1 { font-size: 1.4rem; font-weight: 800; color: #0F172A; margin-top: 8px; }
  .auth-logo p { font-size: .85rem; color: #64748B; margin-top: 4px; }
  .auth-tabs { display: flex; gap: 0; background: #F1F5F9; border-radius: 8px;
    padding: 4px; margin-bottom: 24px; }
  .auth-tab { flex: 1; padding: 8px; text-align: center; cursor: pointer; border-radius: 6px;
    font-size: .87rem; font-weight: 500; color: #64748B; transition: all .15s; border: none; background: transparent; }
  .auth-tab.active { background: #fff; color: #0F172A; box-shadow: 0 1px 4px rgba(0,0,0,.1); }

  /* FORMS */
  .field { margin-bottom: 16px; }
  .field label { display: block; font-size: .82rem; font-weight: 600; color: #374151;
    margin-bottom: 5px; text-transform: uppercase; letter-spacing: .05em; }
  .field input, .field select, .field textarea {
    width: 100%; padding: 10px 13px; border: 1.5px solid #E2E8F0; border-radius: 8px;
    font-size: .93rem; color: #1E293B; background: #F8FAFC; transition: border .15s;
    font-family: inherit; outline: none; }
  .field input:focus, .field select:focus, .field textarea:focus { border-color: #3B82F6; background: #fff; }
  .field textarea { resize: vertical; min-height: 72px; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  /* BUTTONS */
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    padding: 10px 20px; border-radius: 8px; font-size: .9rem; font-weight: 600;
    cursor: pointer; border: none; transition: all .15s; white-space: nowrap; }
  .btn:disabled { opacity: .5; cursor: not-allowed; }
  .btn-primary { background: #2563EB; color: #fff; }
  .btn-primary:hover:not(:disabled) { background: #1D4ED8; }
  .btn-full { width: 100%; }
  .btn-sm { padding: 6px 14px; font-size: .82rem; border-radius: 6px; }
  .btn-success { background: #059669; color: #fff; }
  .btn-success:hover:not(:disabled) { background: #047857; }
  .btn-purple { background: #7C3AED; color: #fff; }
  .btn-purple:hover:not(:disabled) { background: #6D28D9; }
  .btn-green2 { background: #10B981; color: #fff; }
  .btn-green2:hover:not(:disabled) { background: #059669; }
  .btn-outline { background: transparent; border: 1.5px solid #CBD5E1; color: #475569; }
  .btn-outline:hover:not(:disabled) { background: #F1F5F9; }

  /* ROLE SELECT */
  .role-select { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
  .role-option { border: 2px solid #E2E8F0; border-radius: 10px; padding: 14px; cursor: pointer;
    text-align: center; transition: all .15s; }
  .role-option:hover { border-color: #93C5FD; background: #EFF6FF; }
  .role-option.selected { border-color: #3B82F6; background: #EFF6FF; }
  .role-option .role-icon { font-size: 1.6rem; display: block; margin-bottom: 4px; }
  .role-option .role-label { font-size: .82rem; font-weight: 600; color: #334155; }

  /* SECTION HEADER */
  .section-header { display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 20px; }
  .section-title { font-size: 1.1rem; font-weight: 700; color: #0F172A; }
  .section-subtitle { font-size: .82rem; color: #64748B; margin-top: 2px; }
  .count-badge { background: #E2E8F0; color: #475569; font-size: .78rem; font-weight: 700;
    padding: 3px 9px; border-radius: 20px; }

  /* TABS */
  .tab-bar { display: flex; gap: 4px; background: #E2E8F0; border-radius: 10px;
    padding: 4px; margin-bottom: 24px; }
  .tab-btn { flex: 1; padding: 9px 12px; border-radius: 7px; font-size: .87rem;
    font-weight: 500; cursor: pointer; border: none; background: transparent;
    color: #64748B; transition: all .15s; }
  .tab-btn.active { background: #fff; color: #0F172A; box-shadow: 0 1px 4px rgba(0,0,0,.12);
    font-weight: 700; }

  /* CARDS */
  .card { background: #fff; border-radius: 12px; padding: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,.07), 0 4px 12px rgba(0,0,0,.04);
    border: 1px solid #F1F5F9; transition: box-shadow .15s; }
  .card:hover { box-shadow: 0 2px 8px rgba(0,0,0,.1), 0 6px 20px rgba(0,0,0,.06); }
  .card-grid { display: grid; gap: 14px; }
  .card-header { display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 14px; }
  .card-id { font-size: .75rem; font-weight: 700; color: #94A3B8; letter-spacing: .08em;
    font-family: monospace; }
  .card-time { font-size: .75rem; color: #94A3B8; }
  .card-route { display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
    background: #F8FAFC; border-radius: 8px; padding: 10px 12px; }
  .route-icon { font-size: 1rem; flex-shrink: 0; }
  .route-text { font-size: .87rem; color: #334155; font-weight: 500; }
  .route-arrow { color: #CBD5E1; font-size: .8rem; flex-shrink: 0; }
  .card-detail { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
  .detail-chip { background: #F1F5F9; border-radius: 6px; padding: 4px 9px;
    font-size: .78rem; color: #475569; display: flex; align-items: center; gap: 4px; }
  .detail-chip strong { color: #1E293B; }
  .card-item { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 7px;
    padding: 8px 11px; font-size: .85rem; color: #92400E; margin-bottom: 12px; }
  .card-footer { display: flex; align-items: center; justify-content: space-between; }
  .card-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  /* STATUS BADGE */
  .status-badge { display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 10px; border-radius: 20px; font-size: .77rem; font-weight: 700;
    letter-spacing: .04em; }

  /* STATUS STEPPER */
  .stepper { display: flex; align-items: center; gap: 6px; margin-top: 10px; }
  .step { display: flex; align-items: center; gap: 4px; }
  .step-dot { width: 10px; height: 10px; border-radius: 50%; background: #E2E8F0; }
  .step-dot.done { background: #10B981; }
  .step-dot.current { background: #3B82F6; box-shadow: 0 0 0 3px #DBEAFE; }
  .step-line { width: 20px; height: 2px; background: #E2E8F0; }
  .step-line.done { background: #10B981; }

  /* EMPTY STATE */
  .empty { text-align: center; padding: 48px 20px; }
  .empty-icon { font-size: 3rem; margin-bottom: 12px; }
  .empty h3 { font-size: 1rem; font-weight: 600; color: #374151; margin-bottom: 6px; }
  .empty p { font-size: .87rem; color: #9CA3AF; }

  /* MODAL / OVERLAY */
  .overlay { position: fixed; inset: 0; background: rgba(15,23,42,.55);
    display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px; }
  .modal { background: #fff; border-radius: 16px; padding: 28px; width: 100%;
    max-width: 480px; max-height: 90vh; overflow-y: auto; }
  .modal-header { display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 20px; }
  .modal-title { font-size: 1.1rem; font-weight: 700; color: #0F172A; }
  .modal-close { width: 32px; height: 32px; border-radius: 50%; background: #F1F5F9;
    border: none; cursor: pointer; font-size: 1rem; display: flex; align-items: center;
    justify-content: center; color: #64748B; }
  .modal-close:hover { background: #E2E8F0; }

  /* ALERT */
  .alert { padding: 12px 14px; border-radius: 8px; font-size: .87rem; margin-bottom: 16px;
    display: flex; gap: 8px; align-items: flex-start; }
  .alert-error { background: #FEF2F2; border: 1px solid #FECACA; color: #B91C1C; }
  .alert-success { background: #F0FDF4; border: 1px solid #BBF7D0; color: #15803D; }

  /* STATS ROW */
  .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .stat-card { background: #fff; border-radius: 10px; padding: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,.06); border: 1px solid #F1F5F9; }
  .stat-num { font-size: 1.6rem; font-weight: 800; color: #0F172A; }
  .stat-label { font-size: .75rem; color: #94A3B8; font-weight: 600; text-transform: uppercase;
    letter-spacing: .06em; margin-top: 2px; }

  /* REFRESH */
  .refresh-row { display: flex; align-items: center; justify-content: flex-end;
    gap: 10px; margin-bottom: 14px; }
  .refresh-hint { font-size: .78rem; color: #94A3B8; }

  @media (max-width: 600px) {
    .stats-row { grid-template-columns: repeat(2, 1fr); }
    .field-row { grid-template-columns: 1fr; }
    .main { padding: 16px 12px; }
    .auth-card { padding: 28px 20px; }
  }
`;

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusBadge({ status }) {
  const m = STATUS_META[status];
  return (
    <span className="status-badge" style={{ color: m.color, background: m.bg }}>
      {m.icon} {m.label}
    </span>
  );
}

function Stepper({ status }) {
  const idx = STATUS_FLOW.indexOf(status);
  return (
    <div className="stepper">
      {STATUS_FLOW.map((s, i) => (
        <div key={s} className="step">
          <div
            className={`step-dot ${i < idx ? "done" : ""} ${i === idx ? "current" : ""}`}
            title={STATUS_META[s].label}
          />
          {i < STATUS_FLOW.length - 1 && (
            <div className={`step-line ${i < idx ? "done" : ""}`} />
          )}
        </div>
      ))}
      <span style={{ fontSize: ".72rem", color: "#94A3B8", marginLeft: "6px" }}>
        {STATUS_META[status].label}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  AUTH PAGE
// ══════════════════════════════════════════════════════════════
function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("user");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    if (!email || !password) return setError("Email and password are required.");
    if (mode === "register" && !name) return setError("Name is required.");
    setLoading(true);
    try {
      let user;
      if (mode === "register") {
        user = await auth.register(name, email, password, role);
      } else {
        user = await auth.login(email, password);
      }
      onLogin(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🏫</div>
          <h1>Campus Pickup</h1>
          <p>Delivery marketplace for your campus</p>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>Sign In</button>
          <button className={`auth-tab ${mode === "register" ? "active" : ""}`} onClick={() => setMode("register")}>Register</button>
        </div>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {mode === "register" && (
          <>
            <div className="field">
              <label>Full Name</label>
              <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: ".82rem", fontWeight: 600, color: "#374151", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".05em" }}>I am a</label>
              <div className="role-select">
                <div className={`role-option ${role === "user" ? "selected" : ""}`} onClick={() => setRole("user")}>
                  <span className="role-icon">🎒</span>
                  <span className="role-label">Student</span>
                </div>
                <div className={`role-option ${role === "delivery" ? "selected" : ""}`} onClick={() => setRole("delivery")}>
                  <span className="role-icon">🛵</span>
                  <span className="role-label">Delivery Person</span>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="field">
          <label>Email</label>
          <input type="email" placeholder="you@campus.edu" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={loading}>
          {loading ? "⏳ Please wait…" : mode === "login" ? "Sign In →" : "Create Account →"}
        </button>

        {mode === "login" && (
          <p style={{ textAlign: "center", marginTop: "16px", fontSize: ".82rem", color: "#64748B" }}>
            Demo: register first, then sign in with those credentials.
          </p>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  NEW ORDER MODAL
// ══════════════════════════════════════════════════════════════
function NewOrderModal({ user, onClose, onCreated }) {
  const [form, setForm] = useState({
    pickupLocation: "", dropLocation: "", itemDetails: "",
    phoneNumber: "", price: "", optionalTip: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  async function handleSubmit() {
    console.log("price value:", form.price, parseFloat(form.price));
    setError("");
    const { pickupLocation, dropLocation, itemDetails, phoneNumber, price } = form;
    if (!pickupLocation || !dropLocation || !itemDetails || !phoneNumber || !price)
      return setError("Please fill in all required fields.");
    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0)
      return setError("Price must be a positive number.");
    setLoading(true);
    try {
      const order = {
        orderId: "ORD-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
        userId: user.uid,
        userName: user.name,
        pickupLocation: form.pickupLocation.trim(),
        dropLocation: form.dropLocation.trim(),
        itemDetails: form.itemDetails.trim(),
        phoneNumber: form.phoneNumber.trim(),
        price: parseFloat(form.price) || 0,
        optionalTip: parseFloat(form.optionalTip) || 0,
        status: "PENDING",
        acceptedBy: null,
        acceptedByName: null,
        createdAt: Date.now(),
      };
      await db.addOrder(order);
      onCreated(order);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">📦 New Pickup Request</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <div className="field">
          <label>📍 Pickup Location <span style={{ color: "#EF4444" }}>*</span></label>
          <input placeholder="e.g. Library Block A, Room 204" value={form.pickupLocation} onChange={e => set("pickupLocation", e.target.value)} />
        </div>
        <div className="field">
          <label>🏁 Drop Location <span style={{ color: "#EF4444" }}>*</span></label>
          <input placeholder="e.g. Boys Hostel Gate 3" value={form.dropLocation} onChange={e => set("dropLocation", e.target.value)} />
        </div>
        <div className="field">
          <label>📝 Item Details <span style={{ color: "#EF4444" }}>*</span></label>
          <textarea placeholder="What needs to be picked up? Size, weight, any instructions…"
            value={form.itemDetails} onChange={e => set("itemDetails", e.target.value)} />
        </div>
        <div className="field">
          <label>📞 Phone Number <span style={{ color: "#EF4444" }}>*</span></label>
          <input placeholder="Your contact number" value={form.phoneNumber} onChange={e => set("phoneNumber", e.target.value)} />
        </div>
        <div className="field-row">
          <div className="field">
            <label>💰 Delivery Price (₹) <span style={{ color: "#EF4444" }}>*</span></label>
            <input type="number" min="0" placeholder="20" value={form.price} onChange={e => set("price", e.target.value)} />
          </div>
          <div className="field">
            <label>🎁 Tip (₹) optional</label>
            <input type="number" min="0" placeholder="0" value={form.optionalTip} onChange={e => set("optionalTip", e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={loading}>
            {loading ? "⏳ Posting…" : "Post Request →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ORDER CARD (shared)
// ══════════════════════════════════════════════════════════════
function OrderCard({ order, currentUser, onAccept, onUpdateStatus, showAccept }) {
  const isAssigned = order.acceptedBy === currentUser?.uid;
  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];

  const statusBtnLabel = {
    ACCEPTED: "Mark Picked Up 📦",
    PICKED_UP: "Mark Delivered ✅",
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-id">#{order.orderId}</div>
          <div className="card-time">{timeAgo(order.createdAt)}</div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="card-route">
        <span className="route-icon">📍</span>
        <span className="route-text">{order.pickupLocation}</span>
        <span className="route-arrow">→</span>
        <span className="route-icon">🏁</span>
        <span className="route-text">{order.dropLocation}</span>
      </div>

      <div className="card-item">📝 {order.itemDetails}</div>

      <div className="card-detail">
        <span className="detail-chip">📞 <strong>{order.phoneNumber}</strong></span>
        <span className="detail-chip">💰 ₹<strong>{Number(order.price).toFixed(0)}</strong></span>
        {order.optionalTip > 0 && (
          <span className="detail-chip">🎁 Tip ₹<strong>{order.optionalTip}</strong></span>
        )}
        {order.acceptedByName && (
          <span className="detail-chip">🛵 <strong>{order.acceptedByName}</strong></span>
        )}
        {order.userName && currentUser?.role === "delivery" && (
          <span className="detail-chip">🎒 <strong>{order.userName}</strong></span>
        )}
      </div>

      <div className="card-footer">
        <Stepper status={order.status} />
        <div className="card-actions">
          {showAccept && order.status === "PENDING" && (
            <button className="btn btn-success btn-sm" onClick={() => onAccept(order)}>
              Accept Order ✅
            </button>
          )}
          {isAssigned && order.status === "ACCEPTED" && (
            <button className="btn btn-purple btn-sm" onClick={() => onUpdateStatus(order, "PICKED_UP")}>
              {statusBtnLabel.ACCEPTED}
            </button>
          )}
          {isAssigned && order.status === "PICKED_UP" && (
            <button className="btn btn-green2 btn-sm" onClick={() => onUpdateStatus(order, "DELIVERED")}>
              {statusBtnLabel.PICKED_UP}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  USER DASHBOARD
// ══════════════════════════════════════════════════════════════
function UserDashboard({ user }) {
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("orders");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const all = await db.getOrdersByUser(user.uid);
    setOrders(all.sort((a, b) => b.createdAt - a.createdAt));
    setLoading(false);
  }, [user.uid]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(""), 3000); return () => clearTimeout(t); }
  }, [toast]);

  function handleCreated(order) {
    setOrders(prev => [order, ...prev]);
    setShowModal(false);
    setToast("Order posted! Waiting for a delivery person.");
  }

  const byStatus = s => orders.filter(o => o.status === s);
  const active = orders.filter(o => o.status !== "DELIVERED");
  const done = orders.filter(o => o.status === "DELIVERED");

  const stats = {
    total: orders.length,
    pending: byStatus("PENDING").length,
    active: byStatus("ACCEPTED").length + byStatus("PICKED_UP").length,
    delivered: done.length,
  };

  return (
    <>
      {showModal && <NewOrderModal user={user} onClose={() => setShowModal(false)} onCreated={handleCreated} />}
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "#065F46",
          color: "#fff", padding: "12px 18px", borderRadius: "10px", zIndex: 300,
          fontSize: ".87rem", fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,.2)" }}>
          ✅ {toast}
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-num">{stats.total}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "#F59E0B" }}>{stats.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "#3B82F6" }}>{stats.active}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "#10B981" }}>{stats.delivered}</div>
          <div className="stat-label">Delivered</div>
        </div>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === "orders" ? "active" : ""}`} onClick={() => setTab("orders")}>
          🔄 Active ({active.length})
        </button>
        <button className={`tab-btn ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
          ✅ Delivered ({done.length})
        </button>
      </div>

      <div className="section-header">
        <div>
          <div className="section-title">{tab === "orders" ? "My Active Orders" : "Delivery History"}</div>
          <div className="section-subtitle">
            {tab === "orders" ? "Track your pending and in-progress orders" : "Completed deliveries"}
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="btn btn-outline btn-sm" onClick={load}>↻ Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ New Order</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#94A3B8" }}>Loading…</div>
      ) : (
        <div className="card-grid">
          {(tab === "orders" ? active : done).length === 0 ? (
            <div className="empty">
              <div className="empty-icon">{tab === "orders" ? "📭" : "📜"}</div>
              <h3>{tab === "orders" ? "No active orders" : "No deliveries yet"}</h3>
              <p>
                {tab === "orders"
                  ? "Click '+ New Order' to request a pickup."
                  : "Your completed orders will appear here."}
              </p>
            </div>
          ) : (
            (tab === "orders" ? active : done).map(order => (
              <OrderCard key={order.orderId} order={order} currentUser={user}
                showAccept={false} />
            ))
          )}
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
//  DELIVERY DASHBOARD
// ══════════════════════════════════════════════════════════════
function DeliveryDashboard({ user }) {
  const [allOrders, setAllOrders] = useState([]);
  const [tab, setTab] = useState("available");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const orders = await db.getOrders();
    setAllOrders(orders.sort((a, b) => b.createdAt - a.createdAt));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(""), 3500); return () => clearTimeout(t); }
  }, [toast]);

  async function handleAccept(order) {
    const fresh = await db.getOrders();
    const o = fresh.find(x => x.orderId === order.orderId);
    if (!o || o.status !== "PENDING") {
      setToast("⚠️ Order already taken!");
      await load();
      return;
    }
    await db.updateOrder(order.orderId, {
      status: "ACCEPTED",
      acceptedBy: user.uid,
      acceptedByName: user.name,
    });
    setToast("Order accepted! Head to the pickup location.");
    await load();
  }

  async function handleUpdateStatus(order, newStatus) {
    await db.updateOrder(order.orderId, { status: newStatus });
    const msgs = { PICKED_UP: "Marked as picked up!", DELIVERED: "Order delivered! 🎉" };
    setToast(msgs[newStatus] || "Status updated.");
    await load();
  }

  const available = allOrders.filter(o => o.status === "PENDING");
  const mine = allOrders.filter(o => o.acceptedBy === user.uid);
  const myActive = mine.filter(o => o.status !== "DELIVERED");
  const myDone = mine.filter(o => o.status === "DELIVERED");

  const earning = mine.reduce((s, o) => s + (parseFloat(o.price) || 0) + (parseFloat(o.optionalTip) || 0), 0);

  return (
    <>
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "#1E3A5F",
          color: "#fff", padding: "12px 18px", borderRadius: "10px", zIndex: 300,
          fontSize: ".87rem", fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,.25)" }}>
          {toast}
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-num" style={{ color: "#F59E0B" }}>{available.length}</div>
          <div className="stat-label">Available</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "#3B82F6" }}>{myActive.length}</div>
          <div className="stat-label">My Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "#10B981" }}>{myDone.length}</div>
          <div className="stat-label">Delivered</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "#7C3AED" }}>₹{earning}</div>
          <div className="stat-label">Earnings</div>
        </div>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === "available" ? "active" : ""}`} onClick={() => setTab("available")}>
          📋 Available ({available.length})
        </button>
        <button className={`tab-btn ${tab === "active" ? "active" : ""}`} onClick={() => setTab("active")}>
          🚴 My Active ({myActive.length})
        </button>
        <button className={`tab-btn ${tab === "done" ? "active" : ""}`} onClick={() => setTab("done")}>
          ✅ Done ({myDone.length})
        </button>
      </div>

      <div className="section-header">
        <div>
          <div className="section-title">
            {tab === "available" && "Available Pickup Requests"}
            {tab === "active" && "My Active Deliveries"}
            {tab === "done" && "Completed Deliveries"}
          </div>
          <div className="section-subtitle">
            {tab === "available" && "Accept any order to start delivery"}
            {tab === "active" && "Orders you're currently handling"}
            {tab === "done" && "Your successfully completed orders"}
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load}>↻ Refresh</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#94A3B8" }}>Loading…</div>
      ) : (
        <div className="card-grid">
          {tab === "available" && (
            available.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🎯</div>
                <h3>No orders right now</h3>
                <p>Refresh to check for new pickup requests from students.</p>
              </div>
            ) : available.map(order => (
              <OrderCard key={order.orderId} order={order} currentUser={user}
                showAccept={true} onAccept={handleAccept} onUpdateStatus={handleUpdateStatus} />
            ))
          )}
          {tab === "active" && (
            myActive.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🛵</div>
                <h3>Nothing in progress</h3>
                <p>Accept an order from the Available tab to get started.</p>
              </div>
            ) : myActive.map(order => (
              <OrderCard key={order.orderId} order={order} currentUser={user}
                showAccept={false} onUpdateStatus={handleUpdateStatus} />
            ))
          )}
          {tab === "done" && (
            myDone.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🏆</div>
                <h3>No completed deliveries yet</h3>
                <p>Complete your first order to see it here.</p>
              </div>
            ) : myDone.map(order => (
              <OrderCard key={order.orderId} order={order} currentUser={user}
                showAccept={false} onUpdateStatus={handleUpdateStatus} />
            ))
          )}
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROOT APP
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("campus_user")); } catch { return null; }
  });

  function handleLogin(u) {
    sessionStorage.setItem("campus_user", JSON.stringify(u));
    setUser(u);
  }

  function handleLogout() {
    sessionStorage.removeItem("campus_user");
    setUser(null);
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {!user ? (
        <AuthPage onLogin={handleLogin} />
      ) : (
        <div className="app-shell">
          <nav className="nav">
            <div className="nav-brand">
              <span className="nav-brand-icon">🏫</span>
              Campus Pickup
            </div>
            <div className="nav-right">
              <span className="nav-user">👤 {user.name}</span>
              <span className={`nav-badge ${user.role}`}>
                {user.role === "user" ? "Student" : "Delivery"}
              </span>
              <button className="btn-ghost" onClick={handleLogout}>Sign Out</button>
            </div>
          </nav>

          <main className="main">
            {user.role === "user" ? (
              <UserDashboard user={user} />
            ) : (
              <DeliveryDashboard user={user} />
            )}
          </main>
        </div>
      )}
    </>
  );
}
