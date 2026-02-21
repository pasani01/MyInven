import { useState, useEffect, useCallback } from "react";

/* ═══════════════════ BASE URL ═══════════════════ */
const BASE = "http://127.0.0.1:8000";

/* ═══════════════════ AUTH TOKEN ═══════════════════ */
function setToken(token) {
  if (token) {
    localStorage.setItem("token", token); // ✅ DÜZELTİLDİ: 't' → 'token'
  } else {
    localStorage.removeItem("token");
  }
}

function getToken() {
  return localStorage.getItem("token");
}
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name + "=")) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

async function api(path, method = "GET", body = null) {
  // 1. Header'ları hazırla
  const headers = { 
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
  
  // 2. Token'ı ekle (LocalStorage'dan taze oku)
  const token = getToken();
  if (token) {
    // Django Rest Framework varsayılan olarak "Token <anahtar>" bekler
    headers["Authorization"] = `Token ${token}`;
  }

  // 3. CSRF Token'ı ekle (Cookie'den oku)
  const csrfToken = getCookie("csrftoken");
  if (csrfToken) {
    headers["X-CSRFToken"] = csrfToken;
  }

  const opts = {
    method,
    headers,
    // ÖNEMLİ: Cookie'lerin (csrftoken) backend'e ulaşması için "include" şarttır
    credentials: "include", 
  };

  // 4. Body varsa ekle
  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    opts.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${BASE}${path}`, opts);

    // 401 Unauthorized hatası gelirse token'ı temizle
    if (res.status === 401) {
      console.warn("Oturum geçersiz, token temizlendi.");
      setToken(null); // ✅ DÜZELTİLDİ: Token temizleme aktif edildi
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.detail || data?.non_field_errors?.[0] 
        || Object.values(data).flat().join(", ") || `Hata: ${res.status}`;
      throw Object.assign(new Error(msg), { data, status: res.status });
    }

    return data;
  } catch (err) {
    console.error("API Hatası:", err);
    throw err;
  }
}
// AuthPage içindeki handleLogin kullanılıyor (aşağıda)

const authAPI = {
  login: (username, password) => api("/user_app/login/", "POST", { username, password }),
  logout: () => api("/user_app/logout/", "POST"),
  users: () => api("/user_app/users/"),
  getUser: (id) => api(`/user_app/users/${id}/`),
  updateUser: (id, data) => api(`/user_app/users/${id}/`, "PUT", data),
  createUser: (data) => api("/user_app/users/", "POST", data),
  deleteUser: (id) => api(`/user_app/users/${id}/`, "DELETE"),
  companies: () => api("/user_app/companies/"),
  createCompany: (data) => api("/user_app/companies/", "POST", data),
  updateCompany: (id, data) => api(`/user_app/companies/${id}/`, "PUT", data),
  deleteCompany: (id) => api(`/user_app/companies/${id}/`, "DELETE"),
};

const depolarAPI = {
  list: () => api("/depolar/"),
  create: (data) => api("/depolar/", "POST", data),
  update: (id, data) => api(`/depolar/${id}/`, "PUT", data),
  patch: (id, data) => api(`/depolar/${id}/`, "PATCH", data),
  delete: (id) => api(`/depolar/${id}/`, "DELETE"),
};

const buylistAPI = {
  list: () => api("/buylist/"),
  create: (data) => api("/buylist/", "POST", data),
  update: (id, data) => api(`/buylist/${id}/`, "PUT", data),
  patch: (id, data) => api(`/buylist/${id}/`, "PATCH", data),
  delete: (id) => api(`/buylist/${id}/`, "DELETE"),
  totalPrice: () => api("/buylist/total_price/"),
};

const itemlerAPI = {
  list: () => api("/itemler/"),
  create: (data) => api("/itemler/", "POST", data),
  update: (id, data) => api(`/itemler/${id}/`, "PUT", data),
  delete: (id) => api(`/itemler/${id}/`, "DELETE"),
};

const moneytypesAPI = {
  list: () => api("/moneytypes/"),
  create: (data) => api("/moneytypes/", "POST", data),
  delete: (id) => api(`/moneytypes/${id}/`, "DELETE"),
};

const unitlerAPI = {
  list: () => api("/unitler/"),
  create: (data) => api("/unitler/", "POST", data),
  delete: (id) => api(`/unitler/${id}/`, "DELETE"),
};

/* ═══════════════════ NORMALIZERS ═══════════════════ */
function normalizeDepolar(d, idx = 0) {
  const WC = ["bl", "or", "pu"];
  const IC = ["wh", "bx", "tr"];
  return {
    id: d.id,
    name: d.name ?? d.nomi ?? "Warehouse",
    addr: d.address ?? d.manzil ?? d.addr ?? "—",
    manager: d.manager ?? d.menejer ?? "—",
    phone: d.phone ?? d.telefon ?? "—",
    capacity: d.capacity ?? "—",
    type: d.type ?? d.turi ?? "General",
    since: d.since ?? d.created_at?.slice(0, 10) ?? "—",
    items: d.items_count ?? d.items ?? 0,
    usd: d.usd_value ? `$${d.usd_value}` : (d.usd ?? "$0"),
    som: d.som_value ?? d.som ?? "0",
    used: d.used_percent ?? d.used ?? 0,
    wc: WC[idx % 3], ic: IC[idx % 3], _raw: d,
  };
}

function normalizeItem(item) {
  return {
    id: item.id,
    name: item.name ?? item.nomi ?? item.mahsulot ?? `Item #${item.id}`,
    _raw: item,
  };
}

function normalizeMoneytype(m) {
  // Backend serializer'da source='type' → 'name' olarak geliyor
  const name = m.name ?? m.type ?? m.nomi ?? m.valyuta ?? `MT #${m.id}`;
  return {
    id: m.id,
    name,
    code: m.code ?? m.kod ?? name ?? "USD",
    _raw: m,
  };
}

function normalizeUnit(u) {
  // Backend serializer'da source='unit' → 'name' olarak geliyor
  return {
    id: u.id,
    name: u.name ?? u.unit ?? u.nomi ?? u.birlik ?? `Unit #${u.id}`,
    _raw: u,
  };
}

function normalizeBuylist(b, itemler = [], moneytypes = [], unitler = []) {
  // Backend serializer artık frontend ile aynı alan adlarını döndürüyor:
  // qty, narx, unit, moneytype, depolar
  const itemId = typeof b.item === "object" ? b.item?.id : (b.item ?? null);
  const itemName = typeof b.item === "object"
    ? (b.item?.name ?? b.item?.nomi)
    : (itemler.find(i => i.id === itemId)?.name ?? `Item #${itemId}`);

  const moneytypeId = typeof b.moneytype === "object" ? b.moneytype?.id : (b.moneytype ?? null);
  const moneytypeName = typeof b.moneytype === "object"
    ? (b.moneytype?.name ?? b.moneytype?.type)
    : (moneytypes.find(m => m.id === moneytypeId)?.name ?? "USD");

  const unitId = typeof b.unit === "object" ? b.unit?.id : (b.unit ?? null);
  const unitName = typeof b.unit === "object"
    ? (b.unit?.name ?? b.unit?.unit)
    : (unitler.find(u => u.id === unitId)?.name ?? "pcs");

  const depolarId = typeof b.depolar === "object" ? b.depolar?.id : (b.depolar ?? null);

  const qty = Number(b.qty ?? b.item_count ?? 0);
  const price = String(b.narx ?? b.item_price ?? "0");
  const total = String((qty * parseFloat(price.replace(/,/g, "") || "0")).toFixed(2));

  return {
    id: b.id,
    name: itemName,
    itemId,
    moneytypeId,
    moneytypeName,
    unitId,
    unitName,
    depolarId,
    qty,
    price,
    total,
    date: b.date ?? b.created_at?.slice(0, 10) ?? new Date().toLocaleDateString(),
    low: b.low_stock ?? b.low ?? qty < 20,
    _raw: b,
  };
}

/* ═══════════════════ CSS ═══════════════════ */
const makeCSS = (accent = "#2563eb") => `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f0f2f5;--bg2:#e8eaed;--surface:#fff;--surface2:#f8fafc;
  --border:#e4e7ec;--border2:#c9d0db;
  --blue:${accent};--blue-l:${accent}18;--blue-m:${accent}44;--blue-t:${accent}cc;
  --green:#16a34a;--green-bg:#dcfce7;--green-t:#15803d;
  --orange:#d97706;--orange-bg:#fff7ed;
  --red:#dc2626;--red-bg:#fee2e2;
  --purple:#7c3aed;--purple-bg:#f5f3ff;
  --text:#0f172a;--text2:#334155;--text3:#64748b;--text4:#94a3b8;
  --sw:232px;--r:10px;--rs:7px;--rx:5px;
  --sh:0 1px 3px rgba(0,0,0,.07),0 1px 2px rgba(0,0,0,.04);
  --sh2:0 8px 24px rgba(0,0,0,.10),0 2px 8px rgba(0,0,0,.05);
  --sh3:0 20px 60px rgba(0,0,0,.15);
  --tog-off:#cbd5e1;
}
[data-theme="dark"]{
  --bg:#0d1117;--bg2:#161b22;--surface:#1c2230;--surface2:#161b22;
  --border:#2d3748;--border2:#3d4f6a;
  --green:#22c55e;--green-bg:#14532d;--green-t:#4ade80;
  --orange:#f59e0b;--orange-bg:#451a03;
  --red:#f87171;--red-bg:#450a0a;
  --purple:#a78bfa;--purple-bg:#2e1065;
  --text:#f1f5f9;--text2:#cbd5e1;--text3:#94a3b8;--text4:#64748b;
  --sh:0 1px 3px rgba(0,0,0,.3);--sh2:0 8px 24px rgba(0,0,0,.4);--sh3:0 20px 60px rgba(0,0,0,.6);
  --tog-off:#374151;
}
html,body{font-family:'DM Sans',-apple-system,sans-serif;background:var(--bg);color:var(--text);font-size:14px;line-height:1.5;transition:background .25s,color .25s}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}
.auth-page{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);padding:20px;position:relative;overflow:hidden}
.auth-bg-blob{position:fixed;border-radius:50%;filter:blur(80px);opacity:.35;pointer-events:none;z-index:0}
.auth-card{position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;width:100%;max-width:900px;min-height:560px;background:var(--surface);border:1px solid var(--border);border-radius:22px;box-shadow:0 32px 100px rgba(37,99,235,.13),0 4px 24px rgba(0,0,0,.07);overflow:hidden}
.auth-panel{padding:44px 48px;display:flex;flex-direction:column;justify-content:center}
.auth-hero{position:relative;background:linear-gradient(135deg,${accent} 0%,#7c3aed 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:44px;overflow:hidden}
.auth-hero-glow{position:absolute;border-radius:50%;background:rgba(255,255,255,.12);pointer-events:none}
.auth-hero h2{font-size:34px;font-weight:900;color:#fff;letter-spacing:-.04em;text-align:center;position:relative;z-index:1;line-height:1.15}
.auth-hero p{font-size:14px;color:rgba(255,255,255,.8);margin-top:12px;text-align:center;line-height:1.6;position:relative;z-index:1}
.auth-hero-icon{width:72px;height:72px;background:rgba(255,255,255,.18);border-radius:18px;display:flex;align-items:center;justify-content:center;margin-bottom:24px;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.25);position:relative;z-index:1}
.auth-logo-row{display:flex;align-items:center;gap:9px;margin-bottom:28px}
.auth-logo-mark{width:32px;height:32px;background:var(--blue);border-radius:8px;display:flex;align-items:center;justify-content:center}
.auth-logo-name{font-size:17px;font-weight:800;color:var(--text);letter-spacing:-.03em}
.auth-logo-name span{color:var(--blue)}
.auth-panel h2{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-.03em;margin-bottom:4px}
.auth-sub{font-size:13px;color:var(--text3);margin-bottom:24px}
.fld{position:relative;margin-bottom:16px}
.fld-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:6px;display:block}
.fld-wrap{position:relative}
.fld-wrap input{width:100%;padding:10px 38px 10px 12px;border:1.5px solid var(--border2);border-radius:var(--rs);font-family:inherit;font-size:14px;color:var(--text);background:var(--surface);outline:none;transition:border-color .15s,box-shadow .15s}
.fld-wrap input:focus{border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-l)}
.fld-wrap input::placeholder{color:var(--text4)}
.fld-wrap .fic{position:absolute;right:11px;top:50%;transform:translateY(-50%);color:var(--text4);pointer-events:none}
.sub-btn{width:100%;height:44px;background:var(--blue);border:none;border-radius:var(--rs);font-family:inherit;font-size:14px;font-weight:700;color:#fff;cursor:pointer;transition:opacity .15s,transform .15s,box-shadow .15s;margin-top:8px}
.sub-btn:hover{opacity:.92;box-shadow:0 6px 20px var(--blue-m);transform:translateY(-1px)}
.sub-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
.auth-err{background:var(--red-bg);border:1px solid var(--red);border-radius:var(--rs);padding:10px 14px;margin-bottom:14px;color:var(--red);font-size:13px;font-weight:600}
.app{display:flex;min-height:100vh;background:var(--bg)}
.sidebar{width:var(--sw);background:var(--surface);border-right:1px solid var(--border);position:fixed;height:100vh;display:flex;flex-direction:column;z-index:100;transition:background .25s,border-color .25s}
.s-logo{padding:16px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}
.s-mark{width:34px;height:34px;background:var(--blue);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.s-name{font-size:15px;font-weight:800;color:var(--text);letter-spacing:-.02em}
.s-name span{color:var(--blue)}
.s-sub{font-size:11px;color:var(--text4);margin-top:1px}
.s-nav{padding:10px 8px;flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:2px}
.n-sec{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text4);padding:8px 10px 4px}
.n-div{height:1px;background:var(--border);margin:5px 8px}
.n-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:var(--rs);cursor:pointer;color:var(--text3);font-size:13.5px;font-weight:500;transition:all .12s;user-select:none}
.n-item:hover{background:var(--bg);color:var(--text2)}
.n-item.active{background:var(--blue-l);color:var(--blue);font-weight:700}
.n-item.danger{color:var(--red)}.n-item.danger:hover{background:var(--red-bg)}
.dm-row{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:var(--rs);cursor:pointer;color:var(--text3);font-size:13.5px;font-weight:500;transition:all .12s;user-select:none}
.dm-row:hover{background:var(--bg);color:var(--text2)}
.dm-label{flex:1}
.s-foot{border-top:1px solid var(--border);padding:10px 8px}
.main{margin-left:var(--sw);flex:1;display:flex;flex-direction:column;min-height:100vh}
.topbar{background:var(--surface);border-bottom:1px solid var(--border);height:56px;padding:0 26px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50;transition:background .25s,border-color .25s}
.tb-r{display:flex;align-items:center;gap:10px}
.content{padding:26px;flex:1}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:var(--rs);font-size:13.5px;font-weight:600;cursor:pointer;border:1px solid transparent;transition:all .12s;font-family:inherit;line-height:1}
.bp{background:var(--blue);color:#fff;border-color:var(--blue)}.bp:hover{opacity:.9;box-shadow:0 4px 12px var(--blue-m)}
.bo{background:var(--surface);color:var(--text2);border-color:var(--border2)}.bo:hover{border-color:var(--text4);background:var(--bg)}
.bg2{background:transparent;border-color:transparent;color:var(--text3);padding:6px 10px}.bg2:hover{background:var(--bg);color:var(--text2)}
.bs{padding:6px 12px;font-size:13px}
.bd{background:var(--red-bg);color:var(--red);border-color:var(--red-bg)}.bd:hover{border-color:var(--red)}
.btn:disabled{opacity:.55;cursor:not-allowed}
.ib{width:32px;height:32px;border-radius:var(--rs);border:1px solid var(--border);background:var(--surface);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text3);transition:all .12s}
.ib:hover{border-color:var(--border2);color:var(--text2);background:var(--bg)}
.ib.red:hover{background:var(--red-bg);color:var(--red);border-color:var(--red-bg)}
.av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;background:linear-gradient(135deg,var(--blue),#7c3aed);color:#fff}
.back-link{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--text3);cursor:pointer;padding:6px 0;margin-bottom:18px;transition:color .12s;border:none;background:none;font-family:inherit}
.back-link:hover{color:var(--blue)}
.breadcrumb{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text4);flex-wrap:wrap}
.breadcrumb-sep{color:var(--border2)}
.breadcrumb-active{color:var(--text2);font-weight:600}
.breadcrumb-link{color:var(--blue);cursor:pointer;font-weight:500}
.breadcrumb-link:hover{text-decoration:underline}
.toggle{position:relative;width:42px;height:23px;flex-shrink:0;cursor:pointer;display:block}
.toggle input{opacity:0;width:0;height:0;position:absolute}
.toggle-slider{position:absolute;inset:0;background:var(--tog-off);border-radius:23px;transition:.25s;pointer-events:none}
.toggle-slider::before{content:'';position:absolute;width:17px;height:17px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.25s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.toggle input:checked+.toggle-slider{background:var(--blue)}
.toggle input:checked+.toggle-slider::before{transform:translateX(19px)}
.sg{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}
.sg3{grid-template-columns:repeat(3,1fr)}.sg2{grid-template-columns:repeat(2,1fr)}
.sc{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:16px 18px;box-shadow:var(--sh);transition:background .25s,border-color .25s}
.slb{font-size:12px;color:var(--text3);font-weight:600;margin-bottom:4px}
.sv{font-size:24px;font-weight:800;color:var(--text);letter-spacing:-.03em;line-height:1}
.sv.bl{color:var(--blue)}.sv.gr{color:var(--green)}.sv.rd{color:var(--red)}
.sss{font-size:12px;color:var(--text4);margin-top:4px}
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;font-size:12px;font-weight:600}
.bdg{background:var(--green-bg);color:var(--green-t)}.bdb{background:var(--blue-l);color:var(--blue)}
.sw-wrap{position:relative}
.sw-wrap input{width:100%;padding:8px 12px 8px 34px;border:1px solid var(--border2);border-radius:var(--rs);font-family:inherit;font-size:14px;color:var(--text);background:var(--surface);outline:none;transition:border-color .12s}
.sw-wrap input:focus{border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-l)}
.sw-wrap input::placeholder{color:var(--text4)}
.si-ico{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text4);pointer-events:none}
.tc{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--sh);overflow:hidden;transition:background .25s}
table{width:100%;border-collapse:collapse}
thead{background:var(--surface2)}
th{padding:9px 18px;text-align:left;font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--border);white-space:nowrap}
td{padding:11px 18px;font-size:14px;border-bottom:1px solid var(--border);vertical-align:middle;color:var(--text2)}
tr:last-child td{border-bottom:none}
tbody tr:hover{background:var(--bg)}
.ir{display:flex;align-items:center;gap:11px}
.ith{width:34px;height:34px;background:var(--blue-l);border:1px solid var(--blue-m);border-radius:var(--rs);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.itn{font-weight:600;color:var(--text);font-size:14px}
.iti{font-size:12px;color:var(--text4);margin-top:1px}
.qv{font-weight:700;color:var(--text)}.ql{color:var(--red)!important}
.cpill{display:inline-block;padding:2px 8px;border-radius:var(--rx);font-size:12px;font-weight:700}
.cp-u{background:var(--blue-l);color:var(--blue);border:1px solid var(--blue-m)}
.cp-s{background:var(--orange-bg);color:var(--orange);border:1px solid #fed7aa}
.tvv{font-weight:700;color:var(--text)}
.dv{color:var(--text3);font-size:13px}
.arr{display:flex;align-items:center;gap:4px}
.tf{padding:11px 18px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.ti{font-size:13px;color:var(--text3)}
.pg{display:flex;align-items:center;gap:4px}
.pb{min-width:30px;height:30px;padding:0 6px;border:1px solid var(--border);border-radius:var(--rx);background:var(--surface);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;font-weight:600;color:var(--text3);transition:all .1s}
.pb.act{background:var(--blue);border-color:var(--blue);color:#fff}
.pb:hover:not(.act){background:var(--bg);color:var(--text)}
select{appearance:none;background:var(--surface);border:1px solid var(--border2);border-radius:var(--rs);padding:7px 28px 7px 10px;font-family:inherit;font-size:13px;color:var(--text);cursor:pointer;outline:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2394a3b8'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}
select:focus{border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-l)}
.wg{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:22px}
.wc{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--sh);overflow:hidden;transition:box-shadow .15s,transform .15s,background .25s;cursor:pointer}
.wc:hover{box-shadow:var(--sh2);transform:translateY(-3px)}
.wc:hover .wn{color:var(--blue)}
.wb{padding:16px 16px 12px}
.whh{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px}
.wi{width:38px;height:38px;border-radius:var(--r);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.wi-bl{background:var(--blue-l)}.wi-or{background:var(--orange-bg)}.wi-pu{background:var(--purple-bg)}
.wn{font-size:14px;font-weight:700;color:var(--text);margin-bottom:3px;transition:color .12s}
.wa{font-size:12px;color:var(--text3);display:flex;align-items:center;gap:4px}
.wdd{height:1px;background:var(--border);margin:10px 0}
.wss{font-size:13px;color:var(--text3);margin-bottom:8px}
.wss strong{color:var(--text);font-weight:700}
.vsl{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text4);font-weight:700;margin-bottom:5px}
.vgg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.vl{font-size:11px;color:var(--text4);font-weight:600;margin-bottom:2px}
.vv{font-size:14px;font-weight:700;letter-spacing:-.01em}
.vv-g{color:var(--green)}.vv-b{color:var(--blue)}
.wf{padding:10px 16px;border-top:1px solid var(--border);background:var(--surface2);display:flex;gap:7px}
.aw{border:2px dashed var(--border2);border-radius:var(--r);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;cursor:pointer;transition:all .15s;color:var(--text4);text-align:center;background:var(--surface);min-height:220px}
.aw:hover{border-color:var(--blue);color:var(--blue);background:var(--blue-l)}
.awc{width:44px;height:44px;border:2px dashed currentColor;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px}
.awt{font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px}
.aws{font-size:13px;line-height:1.5}
.wh-menu{position:relative}
.wh-menu-btn{background:none;border:none;cursor:pointer;color:var(--text4);font-size:18px;line-height:1;padding:2px 7px;border-radius:4px}
.wh-menu-btn:hover{background:var(--bg);color:var(--text3)}
.wh-dropdown{position:absolute;top:100%;right:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--sh2);z-index:20;min-width:150px;overflow:hidden;animation:slideUp .15s ease}
.wh-dd-item{display:flex;align-items:center;gap:8px;padding:9px 14px;font-size:13.5px;cursor:pointer;color:var(--text2);font-weight:500;transition:background .1s}
.wh-dd-item:hover{background:var(--bg)}
.wh-dd-item.del{color:var(--red)}.wh-dd-item.del:hover{background:var(--red-bg)}
.wh-dd-sep{height:1px;background:var(--border);margin:3px 0}
.wdh{border-radius:var(--r);overflow:hidden;margin-bottom:22px;position:relative}
.wdh-banner{height:130px;display:flex;align-items:flex-end;padding:22px 26px 18px;position:relative}
.wdh-glow{position:absolute;border-radius:50%;background:rgba(255,255,255,.1);pointer-events:none}
.wdh-icon{width:56px;height:56px;background:rgba(255,255,255,.2);border-radius:14px;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.3);flex-shrink:0;position:relative;z-index:1}
.wdh-title{font-size:22px;font-weight:800;color:#fff;letter-spacing:-.03em;position:relative;z-index:1}
.wdh-addr{font-size:13px;color:rgba(255,255,255,.8);margin-top:3px;display:flex;align-items:center;gap:5px;position:relative;z-index:1}
.wdh-body{background:var(--surface);border:1px solid var(--border);border-top:none;border-radius:0 0 var(--r) var(--r);padding:18px 26px;display:grid;grid-template-columns:repeat(4,1fr);gap:0}
.wdh-stat{padding:0 20px;border-right:1px solid var(--border)}
.wdh-stat:first-child{padding-left:0}
.wdh-stat:last-child{border-right:none}
.wdh-stat-l{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text4);margin-bottom:5px}
.wdh-stat-v{font-size:22px;font-weight:800;letter-spacing:-.03em}
.wdh-stat-s{font-size:12px;color:var(--text4);margin-top:3px}
.detail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:22px}
.info-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--sh);overflow:hidden}
.info-card-header{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;background:var(--surface2)}
.info-card-title{font-size:13px;font-weight:700;color:var(--text)}
.info-card-body{padding:16px 18px}
.info-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)}
.info-row:last-child{border-bottom:none}
.info-row-l{font-size:13px;color:var(--text3);font-weight:500}
.info-row-v{font-size:13px;font-weight:700;color:var(--text);text-align:right}
.sh2{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border)}
.st2{font-size:15px;font-weight:700;color:var(--text)}
.txs{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700}
.txr{background:var(--green-bg);color:var(--green-t)}.txw{background:var(--orange-bg);color:var(--orange)}
.txi{font-weight:700;font-size:14px}
.txi-p{color:var(--green)}.txi-n{color:var(--red)}
.ship-card{display:flex;align-items:center;gap:14px;padding:13px 18px;border-bottom:1px solid var(--border);transition:background .1s}
.ship-card:last-child{border-bottom:none}
.ship-card:hover{background:var(--bg)}
.ship-icon{width:40px;height:40px;border-radius:8px;background:var(--blue-l);border:1px solid var(--blue-m);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ship-info{flex:1}
.ship-name{font-weight:700;color:var(--text);font-size:14px}
.ship-meta{font-size:12px;color:var(--text3);margin-top:2px}
.ship-status{display:flex;flex-direction:column;align-items:flex-end;gap:5px}
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(5px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .18s ease}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.modal{background:var(--surface);border-radius:14px;width:100%;max-width:520px;box-shadow:var(--sh3);animation:slideUp .22s ease;max-height:90vh;overflow-y:auto;border:1px solid var(--border)}
@keyframes slideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
.modal-header{padding:18px 22px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.modal-title{font-size:16px;font-weight:800;color:var(--text)}
.modal-close{width:28px;height:28px;border:none;background:var(--bg);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text3);font-size:17px;transition:all .12s}
.modal-close:hover{background:var(--border);color:var(--text)}
.modal-body{padding:20px 22px}
.modal-footer{padding:14px 22px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:9px;background:var(--surface2);border-radius:0 0 14px 14px}
.form-group{margin-bottom:16px}
.form-label{font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;display:block}
.form-input{width:100%;padding:9px 12px;border:1.5px solid var(--border2);border-radius:var(--rs);font-family:inherit;font-size:14px;color:var(--text);outline:none;transition:border-color .12s;background:var(--surface)}
.form-input:focus{border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-l)}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.form-select{width:100%;padding:9px 32px 9px 12px;border:1.5px solid var(--border2);border-radius:var(--rs);font-family:inherit;font-size:14px;color:var(--text);outline:none;background:var(--surface);cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2394a3b8'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}
.form-select:focus{border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-l)}
.confirm-icon{width:50px;height:50px;border-radius:50%;background:var(--red-bg);display:flex;align-items:center;justify-content:center;margin:0 auto 14px}
.confirm-text{text-align:center;color:var(--text3);font-size:14px;line-height:1.6}
.confirm-text strong{color:var(--text);font-weight:700}
.toast-stack{position:fixed;bottom:22px;right:22px;z-index:3000;display:flex;flex-direction:column;gap:7px}
.toast{background:#1e293b;color:#f1f5f9;padding:11px 16px;border-radius:9px;font-size:14px;font-weight:500;box-shadow:var(--sh3);display:flex;align-items:center;gap:9px;animation:toastIn .25s ease;min-width:240px;border:1px solid rgba(255,255,255,.08)}
.toast.success{background:#14532d;border-color:#166534}
.toast.error{background:#450a0a;border-color:#991b1b}
.toast.info{background:#1e3a5f;border-color:#1d4ed8}
@keyframes toastIn{from{opacity:0;transform:translateX(28px)}to{opacity:1;transform:translateX(0)}}
.notif{position:relative}
.notif-dot{position:absolute;top:6px;right:6px;width:7px;height:7px;background:var(--red);border-radius:50%;border:2px solid var(--surface)}
.footer{border-top:1px solid var(--border);background:var(--surface);padding:12px 26px;display:flex;align-items:center;justify-content:space-between;transition:background .25s}
.fh{display:flex;align-items:center;gap:10px}
.ht{background:#1f2937;color:#f3f4f6;font-size:11px;font-weight:700;padding:4px 9px;border-radius:var(--rx);letter-spacing:.05em}
.hs{font-size:12px;color:var(--text3);display:flex;align-items:center;gap:5px}
.od{width:7px;height:7px;border-radius:50%;background:var(--green);display:inline-block}
.fc{font-size:12px;color:var(--text4)}
.fl{display:flex;gap:16px}
.fli{font-size:12px;color:var(--text3);cursor:pointer}.fli:hover{color:var(--blue)}
.rep-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:22px}
.rep-chart{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:18px;box-shadow:var(--sh)}
.rep-chart-title{font-size:14px;font-weight:700;color:var(--text);margin-bottom:14px}
.bar-row{display:flex;align-items:center;gap:9px;margin-bottom:9px}
.bar-label{font-size:12px;color:var(--text3);width:110px;flex-shrink:0;font-weight:500}
.bar-track{flex:1;height:9px;background:var(--bg);border-radius:5px;overflow:hidden}
.bar-fill{height:100%;border-radius:5px;transition:width .8s ease}
.bar-val{font-size:12px;font-weight:700;color:var(--text);width:50px;text-align:right}
.empty-state{text-align:center;padding:50px 20px;color:var(--text4)}
.empty-state h3{font-size:15px;font-weight:700;color:var(--text3);margin-bottom:5px}
.empty-state p{font-size:13px}
.settings-layout{display:grid;grid-template-columns:210px 1fr;gap:22px;align-items:start}
.settings-nav{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--sh);overflow:hidden;position:sticky;top:80px}
.settings-nav-header{padding:12px 16px;border-bottom:1px solid var(--border);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text4)}
.settings-nav-item{display:flex;align-items:center;gap:9px;padding:10px 16px;font-size:13.5px;font-weight:500;color:var(--text3);cursor:pointer;transition:all .1s;border-left:3px solid transparent}
.settings-nav-item:hover{background:var(--bg);color:var(--text2)}
.settings-nav-item.active{background:var(--blue-l);color:var(--blue);font-weight:700;border-left-color:var(--blue)}
.settings-nav-divider{height:1px;background:var(--border);margin:3px 0}
.settings-section{display:flex;flex-direction:column;gap:18px}
.settings-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--sh);overflow:hidden}
.settings-card-header{padding:16px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:11px}
.settings-card-icon{width:34px;height:34px;border-radius:var(--rs);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.settings-card-title{font-size:14px;font-weight:700;color:var(--text)}
.settings-card-subtitle{font-size:12px;color:var(--text3);margin-top:2px}
.settings-card-body{padding:18px 22px}
.settings-row{display:flex;align-items:center;justify-content:space-between;padding:13px 0;border-bottom:1px solid var(--border)}
.settings-row:last-child{border-bottom:none}
.settings-row-info{flex:1}
.settings-row-label{font-size:14px;font-weight:600;color:var(--text)}
.settings-row-desc{font-size:12px;color:var(--text3);margin-top:3px;line-height:1.4}
.color-swatches{display:flex;gap:9px;flex-wrap:wrap;margin-top:4px}
.color-swatch{width:28px;height:28px;border-radius:50%;cursor:pointer;border:3px solid transparent;transition:all .15s;position:relative}
.color-swatch.active{border-color:var(--text);transform:scale(1.12)}
.color-swatch.active::after{content:'✓';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;font-weight:700}
.lang-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.lang-option{border:1.5px solid var(--border);border-radius:var(--rs);padding:9px 12px;cursor:pointer;transition:all .12s;display:flex;align-items:center;gap:9px}
.lang-option:hover,.lang-option.active{border-color:var(--blue);background:var(--blue-l)}
.lang-flag{font-size:20px}
.lang-name{font-size:13px;font-weight:600;color:var(--text)}
.lang-local{font-size:11px;color:var(--text3)}
.danger-zone{border-color:var(--red)!important}
.danger-zone .settings-card-header{background:var(--red-bg);border-bottom-color:var(--red)}
.danger-zone .settings-card-title{color:var(--red)}
.danger-zone-btn{width:100%;padding:10px;border:1.5px solid var(--red);background:transparent;color:var(--red);border-radius:var(--rs);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;text-align:left;display:flex;align-items:center;gap:8px;transition:all .15s;margin-bottom:9px}
.danger-zone-btn:last-child{margin-bottom:0}
.danger-zone-btn:hover{background:var(--red-bg)}
.profile-avatar-area{display:flex;align-items:center;gap:18px;padding:0 0 18px;border-bottom:1px solid var(--border);margin-bottom:18px}
.profile-avatar-big{width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,var(--blue),#7c3aed);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;flex-shrink:0}
.profile-avatar-name{font-size:17px;font-weight:800;color:var(--text)}
.profile-avatar-role{font-size:12px;color:var(--text3);margin-top:2px}
.sys-chips{display:flex;flex-wrap:wrap;gap:8px}
.sys-chip{background:var(--bg);border:1px solid var(--border);border-radius:20px;padding:5px 11px;font-size:12px;color:var(--text3);font-weight:500;display:flex;align-items:center;gap:6px}
.sys-chip strong{color:var(--text)}
.role-pill{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700}
.role-admin{background:#fef3c7;color:#92400e}
.role-manager{background:var(--blue-l);color:var(--blue)}
.role-staff{background:var(--green-bg);color:var(--green-t)}
.loading-overlay{display:flex;align-items:center;justify-content:center;padding:60px;flex-direction:column;gap:12px;color:var(--text3)}
.spinner{width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.api-err{background:var(--red-bg);border:1px solid var(--red);border-radius:var(--r);padding:14px 18px;margin-bottom:16px;color:var(--red);font-size:14px;font-weight:600;display:flex;align-items:center;gap:9px}
@keyframes fu{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
.fu{animation:fu .25s ease}
.ref-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--sh);overflow:hidden;margin-bottom:22px}
.ref-header{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--surface2)}
.ref-title{font-size:13px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px}
.ref-body{padding:14px 18px;display:flex;flex-wrap:wrap;gap:8px}
.ref-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;background:var(--bg);border:1px solid var(--border);border-radius:20px;font-size:12px;color:var(--text2);font-weight:500}
.ref-chip button{background:none;border:none;cursor:pointer;color:var(--text4);display:flex;align-items:center;font-size:14px;line-height:1;padding:0;margin-left:2px}
.ref-chip button:hover{color:var(--red)}
`;

/* ═══════════════════ ICONS ═══════════════════ */
const P = {
  wh: "M2 20h20 M4 20V10l8-6 8 6v10 M10 20v-6h4v6",
  bx: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96 12 12.01l8.73-5.05 M12 22.08V12",
  tr: "M1 3h15v13H1z M16 8h4l3 3v5h-7V8z M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  ch: "M18 20V10 M12 20V4 M6 20v-6",
  cg: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  bl: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  sr: "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  pl: "M12 5v14 M5 12h14",
  dl: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  td: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
  ed: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  ck: "M20 6L9 17l-5-5",
  lc: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  sc: "M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2",
  mg: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  cl: "M15 18l-6-6 6-6", cr: "M9 18l6-6-6-6",
  arr: "M19 12H5 M12 19l-7-7 7-7",
  usr: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  lock: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4",
  x: "M18 6L6 18 M6 6l12 12",
  warn: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  ship: "M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3 M9 17h10l4-4v-1h-13v5 M9 17a2 2 0 0 1-2 2 2 2 0 0 1-2-2 M19 19a2 2 0 0 1-2 2 2 2 0 0 1-2-2",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  moon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  sun: "M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42 M12 5a7 7 0 1 0 0 14A7 7 0 0 0 12 5z",
  palette: "M12 22C6.49 22 2 17.51 2 12S6.49 2 12 2c5.51 0 10 4.04 10 9 0 1.38-1.12 2.5-2.5 2.5H20c1.66 0 3-1.34 3-3",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  globe: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  bell2: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  info: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 16v-4 M12 8h.01",
  key: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  database: "M12 2a9 3 0 1 0 0 6A9 3 0 0 0 12 2z M21 5v6c0 1.657-4.03 3-9 3S3 12.657 3 11V5 M21 11v6c0 1.657-4.03 3-9 3s-9-1.343-9-3v-6",
  refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  eye2: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  eyeoff: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94 M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19 M1 1l22 22",
  fi: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  zp: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  dr: "M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  usrs: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  co: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  tag: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01",
  pkg: "M16.5 9.4l-9-5.19 M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96 12 12.01l8.73-5.05 M12 22.08V12",
};

function I({ n, s = 16, c = "currentColor" }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}>
      {P[n]?.split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
    </svg>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle" onClick={e => e.stopPropagation()}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  );
}

function ToastList({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type || ""}`}>
          {t.type === "success" && <I n="ck" s={15} c="#4ade80" />}
          {t.type === "error" && <I n="x" s={15} c="#f87171" />}
          {t.type === "info" && <I n="info" s={15} c="#60a5fa" />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function Spinner() {
  return <div className="loading-overlay"><div className="spinner" /><span>Loading...</span></div>;
}

function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={wide ? { maxWidth: 640 } : {}} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

function ConfirmModal({ title, desc, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}
      footer={<><button className="btn bo" onClick={onClose}>Cancel</button><button className="btn bd" onClick={() => { onConfirm(); onClose(); }}>Delete</button></>}>
      <div className="confirm-icon"><I n="warn" s={24} c="var(--red)" /></div>
      <div className="confirm-text">{desc}</div>
    </Modal>
  );
}

/* ═══════════════════ CONSTANTS ═══════════════════ */
const WC_ICON_COLOR = { bl: "var(--blue)", or: "var(--orange)", pu: "var(--purple)" };
const WC_GRADIENT = {
  bl: "linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)",
  or: "linear-gradient(135deg,#d97706 0%,#dc2626 100%)",
  pu: "linear-gradient(135deg,#7c3aed 0%,#0d9488 100%)",
};
const ACCENT_COLORS = [
  { name: "Blue", val: "#2563eb" }, { name: "Purple", val: "#7c3aed" },
  { name: "Green", val: "#16a34a" }, { name: "Orange", val: "#d97706" },
  { name: "Red", val: "#dc2626" }, { name: "Teal", val: "#0d9488" },
];
const LANGUAGES = [
  { code: "en", flag: "🇺🇸", name: "English", local: "English" },
  { code: "uz", flag: "🇺🇿", name: "Uzbek", local: "O'zbek" },
  { code: "ru", flag: "🇷🇺", name: "Russian", local: "Русский" },
  { code: "tr", flag: "🇹🇷", name: "Turkish", local: "Türkçe" },
];
const STRINGS = {
  en: { warehouses: "Warehouses", shipments: "Shipments", reports: "Reports", intake: "Smart Invoice Intake", settings: "Settings", users: "Users", companies: "Companies", darkMode: "Dark Mode", lightMode: "Light Mode", logout: "Logout", createWh: "Create Warehouse", save: "Save", cancel: "Cancel", search: "Search...", items: "Items", moneytypes: "Currencies", units: "Units" },
  uz: { warehouses: "Omborlar", shipments: "Shipments", reports: "Reports", intake: "Hisob-faktura", settings: "Sozlamalar", users: "Foydalanuvchilar", companies: "Kompaniyalar", darkMode: "Dark Mode", lightMode: "Kunduzgi Rejim", logout: "Chiqish", createWh: "Ombor Yaratish", save: "Saqlash", cancel: "Cancel", search: "Qidirish...", items: "Mahsulotlar", moneytypes: "Valyutalar", units: "Birliklar" },
  ru: { warehouses: "Склады", shipments: "Отправки", reports: "Отчёты", intake: "Сканирование", settings: "Настройки", users: "Пользователи", companies: "Компании", darkMode: "Тёмный", lightMode: "Светлый", logout: "Выйти", createWh: "Создать Склад", save: "Сохранить", cancel: "Отмена", search: "Поиск...", items: "Товары", moneytypes: "Валюты", units: "Единицы" },
  tr: { warehouses: "Depolar", shipments: "Sevkiyatlar", reports: "Raporlar", intake: "Fatura Tarama", settings: "Ayarlar", users: "Kullanıcılar", companies: "Şirketler", darkMode: "Karanlık Mod", lightMode: "Aydınlık Mod", logout: "Çıkış", createWh: "Depo Oluştur", save: "Kaydet", cancel: "İptal", search: "Ara...", items: "Ürünler", moneytypes: "Para Birimleri", units: "Birimler" },
};

const SHIP_ST = {
  Delivered: { cls: "txr", ic: "ck", c: "var(--green)" },
  "In Transit": { cls: "txw", ic: "tr", c: "var(--orange)" },
  Pending: { cls: "bdb", ic: "bl", c: "var(--blue)" },
};

/* ═══════════════════ AUTH PAGE ═══════════════════ */
function AuthPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleLogin() {
    if (!username.trim()) { setErr("Please enter your username"); return; }
    setLoading(true); setErr("");
    try {
      const data = await authAPI.login(username, pass);
      if (data.token) setToken(data.token);
      else if (data.key) setToken(data.key);
      const userData = data.user ?? { username, role: data.role ?? "staff", email: data.email ?? "", company: data.company ?? null, id: data.id ?? null };
      onLogin(userData);
    } catch (e) {
      setErr(e.message || "Login failed. Please check your username and password.");
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-blob" style={{ width: 500, height: 500, background: "#2563eb", top: -150, right: -100 }} />
      <div className="auth-bg-blob" style={{ width: 400, height: 400, background: "#7c3aed", bottom: -100, left: -80 }} />
      <div className="auth-card">
        <div className="auth-panel">
          <div className="auth-logo-row">
            <div className="auth-logo-mark"><I n="wh" s={16} c="#fff" /></div>
            <div className="auth-logo-name">Reno<span>Flow</span></div>
          </div>
          <h2>Welcome back</h2>
          <p className="auth-sub">Sign in to your warehouse management system</p>
          {err && <div className="auth-err">⚠ {err}</div>}
          <div className="fld">
            <label className="fld-label">Username</label>
            <div className="fld-wrap">
              <input type="text" placeholder="Enter username" value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
              <span className="fic"><I n="usr" s={15} /></span>
            </div>
          </div>
          <div className="fld">
            <label className="fld-label">Password</label>
            <div className="fld-wrap">
              <input type={showPw ? "text" : "password"} placeholder="••••••••"
                value={pass} onChange={e => setPass(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
              <span className="fic" style={{ pointerEvents: "auto", cursor: "pointer" }} onClick={() => setShowPw(v => !v)}>
                <I n={showPw ? "eyeoff" : "eye2"} s={15} />
              </span>
            </div>
          </div>
          <button className="sub-btn" onClick={handleLogin} disabled={loading}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>

        </div>
        <div className="auth-hero">
          <div className="auth-hero-glow" style={{ width: 300, height: 300, top: -80, right: -80 }} />
          <div className="auth-hero-glow" style={{ width: 200, height: 200, bottom: -60, left: -60 }} />
          <div className="auth-hero-icon"><I n="wh" s={32} c="#fff" /></div>
          <h2>RenoFlow Warehouse MGT</h2>
          <p>Manage warehouses, inventory and users with ease.</p>
          <div style={{ marginTop: 32, display: "flex", gap: 10, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
            {["Warehouses", "Inventory", "Shipments", "Reports", "Users"].map(f => (
              <span key={f} style={{ background: "rgba(255,255,255,.18)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 20, backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,.25)" }}>{f}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ DASHBOARD ═══════════════════ */
function Dashboard({ currentUser, onLogout }) {
  const [page, setPage] = useState("warehouses");
  const [selectedWh, setSelectedWh] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem(`rf_dark_${currentUser.username}`) === "true"; } catch { return false; }
  });
  const [accent, setAccent] = useState(() => {
    try { return localStorage.getItem(`rf_accent_${currentUser.username}`) || "#2563eb"; } catch { return "#2563eb"; }
  });
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem(`rf_lang_${currentUser.username}`) || "en"; } catch { return "en"; }
  });

  // API Data
  const [warehouses, setWarehouses] = useState([]);
  const [buylist, setBuylist] = useState([]);
  const [itemler, setItemler] = useState([]);
  const [moneytypes, setMoneytypes] = useState([]);
  const [unitler, setUnitler] = useState([]);
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [toasts, setToasts] = useState([]);
  const [loadingWh, setLoadingWh] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [settings, setSettings] = useState({
    notifLowStock: true, notifShipments: true, notifReports: false, notifEmail: true,
    compactView: false, animationsEnabled: true, autoSave: true,
    twoFactor: false, sessionTimeout: "30min", currency: "USD", timezone: "UTC+5",
  });
  const [shipments, setShipments] = useState([
    { id: 20, item: "Premium Wall Latex Paint", batch: "#902-X", from: "Warehouse 1", to: "Construction", date: "2024-10-24", status: "Delivered", val: "+$1,200", pos: true },
    { id: 21, item: "Oak Flooring Planks", batch: "#122-O", from: "Warehouse 2", to: "Base", date: "2024-10-23", status: "In Transit", val: "-$4,500", pos: false },
  ]);

  const T = STRINGS[lang] || STRINGS.en;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    try { localStorage.setItem(`rf_dark_${currentUser.username}`, darkMode); } catch { }
  }, [darkMode]);

  useEffect(() => {
    try { localStorage.setItem(`rf_accent_${currentUser.username}`, accent); } catch { }
  }, [accent]);

  useEffect(() => {
    try { localStorage.setItem(`rf_lang_${currentUser.username}`, lang); } catch { }
  }, [lang]);

  const addToast = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const fetchWarehouses = useCallback(async () => {
    setLoadingWh(true); setApiError(null);
    try {
      const data = await depolarAPI.list();
      const arr = Array.isArray(data) ? data : (data?.results ?? []);
      setWarehouses(arr.map((d, i) => normalizeDepolar(d, i)));
    } catch (e) { setApiError(`Failed to load warehouses: ${e.message}`); }
    finally { setLoadingWh(false); }
  }, []);

  const fetchItemler = useCallback(async () => {
    try {
      const data = await itemlerAPI.list();
      const arr = Array.isArray(data) ? data : (data?.results ?? []);
      setItemler(arr.map(normalizeItem));
    } catch { /* ignore */ }
  }, []);

  const fetchMoneytypes = useCallback(async () => {
    try {
      const data = await moneytypesAPI.list();
      const arr = Array.isArray(data) ? data : (data?.results ?? []);
      setMoneytypes(arr.map(normalizeMoneytype));
    } catch { /* ignore */ }
  }, []);

  const fetchUnitler = useCallback(async () => {
    try {
      const data = await unitlerAPI.list();
      const arr = Array.isArray(data) ? data : (data?.results ?? []);
      setUnitler(arr.map(normalizeUnit));
    } catch { /* ignore */ }
  }, []);

  const fetchBuylist = useCallback(async (im = itemler, mm = moneytypes, um = unitler) => {
    try {
      const data = await buylistAPI.list();
      const arr = Array.isArray(data) ? data : (data?.results ?? []);
      setBuylist(arr.map(b => normalizeBuylist(b, im, mm, um)));
    } catch { /* ignore */ }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await authAPI.users();
      const arr = Array.isArray(data) ? data : (data?.results ?? []);
      setUsers(arr);
    } catch { /* may need admin */ }
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      const data = await authAPI.companies();
      const arr = Array.isArray(data) ? data : (data?.results ?? []);
      setCompanies(arr);
    } catch { /* may need admin */ }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoadingWh(true); setApiError(null);
      try {
        const [wData, iData, mData, uData] = await Promise.all([
          depolarAPI.list().catch(() => []),
          itemlerAPI.list().catch(() => []),
          moneytypesAPI.list().catch(() => []),
          unitlerAPI.list().catch(() => []),
        ]);
        const wArr = Array.isArray(wData) ? wData : (wData?.results ?? []);
        const iArr = (Array.isArray(iData) ? iData : (iData?.results ?? [])).map(normalizeItem);
        const mArr = (Array.isArray(mData) ? mData : (mData?.results ?? [])).map(normalizeMoneytype);
        const uArr = (Array.isArray(uData) ? uData : (uData?.results ?? [])).map(normalizeUnit);
        setWarehouses(wArr.map((d, i) => normalizeDepolar(d, i)));
        setItemler(iArr);
        setMoneytypes(mArr);
        setUnitler(uArr);

        const blData = await buylistAPI.list().catch(() => []);
        const blArr = Array.isArray(blData) ? blData : (blData?.results ?? []);
        setBuylist(blArr.map(b => normalizeBuylist(b, iArr, mArr, uArr)));
      } catch (e) { setApiError(`Failed to load data: ${e.message}`); }
      finally { setLoadingWh(false); }
    };
    init();
    fetchUsers();
    fetchCompanies();
  }, []);

  async function refreshBuylist() {
    try {
      const data = await buylistAPI.list();
      const arr = Array.isArray(data) ? data : (data?.results ?? []);
      setBuylist(arr.map(b => normalizeBuylist(b, itemler, moneytypes, unitler)));
    } catch { /* ignore */ }
  }

  async function handleLogout() {
    try { await authAPI.logout(); } catch { /* ignore */ }
    setToken(""); onLogout();
  }

  function goToWh(wh) { setSelectedWh(wh); setPage("whdetail"); }
  function backToWarehouses() { setSelectedWh(null); setPage("warehouses"); fetchWarehouses(); refreshBuylist(); }

  const whActive = page === "warehouses" || page === "whdetail";
  const lowItems = buylist.filter(i => i.low).length;

  return (
    <div className="app">
      <style>{makeCSS(accent)}</style>
      <ToastList toasts={toasts} />

      <aside className="sidebar">
        <div className="s-logo">
          <div className="s-mark"><I n="wh" s={18} c="#fff" /></div>
          <div><div className="s-name">Reno<span>Flow</span></div><div className="s-sub">Warehouse Management</div></div>
        </div>
        <nav className="s-nav">
          <div className="n-sec">Main</div>
          <div className={`n-item${whActive ? " active" : ""}`} onClick={() => { setPage("warehouses"); setSelectedWh(null); }}>
            <I n="wh" s={15} />{T.warehouses}
          </div>
          <div className={`n-item${page === "shipments" ? " active" : ""}`} onClick={() => { setPage("shipments"); setSelectedWh(null); }}>
            <I n="ship" s={15} />{T.shipments}
          </div>
          <div className={`n-item${page === "intake" ? " active" : ""}`} onClick={() => { setPage("intake"); setSelectedWh(null); }}>
            <I n="sc" s={15} />{T.intake}
          </div>
          <div className="n-div" />
          <div className="n-sec">References</div>
          <div className={`n-item${page === "itemler" ? " active" : ""}`} onClick={() => { setPage("itemler"); setSelectedWh(null); fetchItemler(); }}>
            <I n="pkg" s={15} />{T.items}
          </div>
          <div className={`n-item${page === "moneytypes" ? " active" : ""}`} onClick={() => { setPage("moneytypes"); setSelectedWh(null); fetchMoneytypes(); }}>
            <I n="dr" s={15} />{T.moneytypes}
          </div>
          <div className={`n-item${page === "unitler" ? " active" : ""}`} onClick={() => { setPage("unitler"); setSelectedWh(null); fetchUnitler(); }}>
            <I n="tag" s={15} />{T.units}
          </div>
          <div className="n-div" />
          <div className="n-sec">Analytics</div>
          <div className={`n-item${page === "reports" ? " active" : ""}`} onClick={() => { setPage("reports"); setSelectedWh(null); }}>
            <I n="ch" s={15} />{T.reports}
          </div>
          <div className="n-div" />
          <div className="n-sec">Management</div>
          <div className={`n-item${page === "users" ? " active" : ""}`} onClick={() => { setPage("users"); setSelectedWh(null); fetchUsers(); }}>
            <I n="usrs" s={15} />{T.users}
          </div>
          <div className={`n-item${page === "companies" ? " active" : ""}`} onClick={() => { setPage("companies"); setSelectedWh(null); fetchCompanies(); }}>
            <I n="co" s={15} />{T.companies}
          </div>
          <div className="n-div" />
          <div className="dm-row" onClick={() => setDarkMode(v => !v)}>
            <I n={darkMode ? "sun" : "moon"} s={15} />
            <span className="dm-label">{darkMode ? T.lightMode : T.darkMode}</span>
            <Toggle checked={darkMode} onChange={setDarkMode} />
          </div>
          <div className={`n-item${page === "settings" ? " active" : ""}`} onClick={() => { setPage("settings"); setSelectedWh(null); }}>
            <I n="cg" s={15} />{T.settings}
          </div>
          <div style={{ flex: 1 }} />
        </nav>
        <div className="s-foot">
          <div style={{ padding: "4px 10px 6px", fontSize: 11, color: "var(--text4)" }}>
            <span style={{ color: "var(--green)" }}>●</span>&nbsp;{currentUser.username} · {currentUser.role || "staff"}
          </div>
          <div className="n-item danger" onClick={handleLogout}>
            <I n="logout" s={15} />{T.logout}
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {page === "whdetail" && (
              <button className="ib" onClick={backToWarehouses}><I n="arr" s={15} /></button>
            )}
            <div>
              {page === "whdetail" ? (
                <div className="breadcrumb">
                  <span className="breadcrumb-link" onClick={backToWarehouses}>{T.warehouses}</span>
                  <span className="breadcrumb-sep">›</span>
                  <span className="breadcrumb-active">{selectedWh?.name}</span>
                </div>
              ) : (
                <div style={{ fontWeight: 700, fontSize: 14 }}>{T[page] ?? page}</div>
              )}
            </div>
          </div>
          <div className="tb-r">
            <button className="ib" title="Refresh" onClick={() => { fetchWarehouses(); refreshBuylist(); fetchItemler(); fetchMoneytypes(); fetchUnitler(); }}>
              <I n="refresh" s={15} />
            </button>
            <div className="notif">
              <button className="ib"><I n="bl" s={16} /></button>
              {lowItems > 0 && <div className="notif-dot" />}
            </div>
            <div className="av" style={{ width: 34, height: 34, fontSize: 12, cursor: "pointer" }} onClick={() => setPage("settings")}>
              {currentUser.username?.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="content">
          {apiError && (
            <div className="api-err">
              <I n="warn" s={16} c="var(--red)" />{apiError}
              <button className="btn bo bs" style={{ marginLeft: "auto" }} onClick={fetchWarehouses}>
                <I n="refresh" s={13} />Retry
              </button>
            </div>
          )}
          {page === "warehouses" && (
            <WarehousePage warehouses={warehouses} setWarehouses={setWarehouses}
              buylist={buylist} loading={loadingWh}
              onRefresh={fetchWarehouses} addToast={addToast} T={T} onOpenWh={goToWh} />
          )}
          {page === "whdetail" && selectedWh && (
            <WarehouseDetail wh={selectedWh} setWh={setSelectedWh}
              warehouses={warehouses} setWarehouses={setWarehouses}
              buylist={buylist} setBuylist={setBuylist}
              itemler={itemler} moneytypes={moneytypes} unitler={unitler}
              addToast={addToast} T={T} onBack={backToWarehouses} />
          )}
          {page === "shipments" && <ShipmentsPage shipments={shipments} setShipments={setShipments} addToast={addToast} T={T} />}
          {page === "intake" && <IntakePage buylist={buylist} setBuylist={setBuylist} warehouses={warehouses} itemler={itemler} moneytypes={moneytypes} unitler={unitler} addToast={addToast} T={T} />}
          {page === "reports" && <ReportsPage warehouses={warehouses} buylist={buylist} shipments={shipments} addToast={addToast} T={T} />}
          {page === "itemler" && <RefPage title={T.items} icon="pkg" data={itemler} setData={setItemler} api={itemlerAPI} normalize={normalizeItem} fields={[{ k: "name", l: "Name *", required: true }]} addToast={addToast} T={T} />}
          {page === "moneytypes" && <RefPage title={T.moneytypes} icon="dr" data={moneytypes} setData={setMoneytypes} api={moneytypesAPI} normalize={normalizeMoneytype} fields={[{ k: "name", l: "Name * (USD, UZS, EUR)", required: true }]} addToast={addToast} T={T} />}
          {page === "unitler" && <RefPage title={T.units} icon="tag" data={unitler} setData={setUnitler} api={unitlerAPI} normalize={normalizeUnit} fields={[{ k: "name", l: "Name *", required: true }]} addToast={addToast} T={T} />}
          {page === "users" && <UsersPage users={users} companies={companies} onRefresh={fetchUsers} addToast={addToast} T={T} />}
          {page === "companies" && <CompaniesPage companies={companies} onRefresh={fetchCompanies} addToast={addToast} T={T} />}
          {page === "settings" && (
            <SettingsPage settings={settings} setSettings={setSettings}
              darkMode={darkMode} onDarkMode={setDarkMode}
              accent={accent} onAccent={setAccent}
              lang={lang} onLang={setLang}
              currentUser={currentUser} addToast={addToast} onLogout={handleLogout} T={T} />
          )}
        </main>

        <footer className="footer">
          <div className="fh">
            <div className="ht">RENOFLOW</div>
            <div className="hs"><span className="od" />&nbsp;<span style={{ color: "var(--green)", fontWeight: 700 }}>{warehouses.length} warehouses · {buylist.length} items</span></div>
          </div>
          <div className="fc">© 2024 RenoFlow Systems</div>
          <div className="fl">
            <span className="fli" onClick={() => addToast(`Items: ${itemler.length}, Currencies: ${moneytypes.length}, Units: ${unitler.length}`, "info")}>References</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ═══════════════════ REFERENCE PAGE (Itemler / Moneytypes / Unitler) ═══════════════════ */
function RefPage({ title, icon, data, setData, api, normalize, fields, addToast, T }) {
  const [showAdd, setShowAdd] = useState(false);
  const [delItem, setDelItem] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  async function addItem() {
    const firstReq = fields.find(f => f.required);
    if (firstReq && !form[firstReq.k]?.trim()) return;
    setSaving(true);
    try {
      const created = await api.create(form);
      setData(prev => [...prev, normalize(created)]);
      addToast(`"${form[fields[0].k]}" added!`);
      setShowAdd(false); setForm({});
    } catch (e) { addToast(`Xato: ${e.message}`, "error"); }
    finally { setSaving(false); }
  }

  async function delIt(item) {
    try {
      await api.delete(item.id);
      setData(prev => prev.filter(x => x.id !== item.id));
      addToast(`"${item.name}" deleted`, "error");
    } catch (e) { addToast(`Xato: ${e.message}`, "error"); }
  }

  return (
    <div className="fu">
      {showAdd && (
        <Modal title={`Add ${title}`} onClose={() => setShowAdd(false)}
          footer={<><button className="btn bo" onClick={() => setShowAdd(false)}>{T.cancel}</button><button className="btn bp" onClick={addItem} disabled={saving}>{saving ? "..." : T.save}</button></>}>
          {fields.map(f => (
            <div className="form-group" key={f.k}>
              <label className="form-label">{f.l}</label>
              <input className="form-input" value={form[f.k] || ""} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} />
            </div>
          ))}
        </Modal>
      )}
      {delItem && <ConfirmModal title={`Delete ${title}`} desc={<>«<strong>{delItem.name}</strong>»?
      </>} onConfirm={() => delIt(delItem)} onClose={() => setDelItem(null)} />}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>{title}</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>{data.length} ta yozuv</p>
        </div>
        <button className="btn bp" onClick={() => { setForm({}); setShowAdd(true); }}><I n="pl" s={14} c="#fff" />Add {title}</button>
      </div>

      <div className="tc">
        {data.length === 0 ? (
          <div className="empty-state"><I n={icon} s={38} c="var(--border2)" /><h3>{title} is empty</h3><p>Add your first record.</p></div>
        ) : (
          <table>
            <thead><tr><th>ID</th>{fields.map(f => <th key={f.k}>{f.l.replace(" *", "")}</th>)}<th></th></tr></thead>
            <tbody>
              {data.map(item => (
                <tr key={item.id}>
                  <td className="dv">#{item.id}</td>
                  {fields.map(f => <td key={f.k} className="itn">{item[f.k] ?? item.name ?? "—"}</td>)}
                  <td><button className="ib red" onClick={() => setDelItem(item)}><I n="td" s={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════ WAREHOUSE PAGE ═══════════════════ */
function WarehousePage({ warehouses, setWarehouses, buylist, loading, onRefresh, addToast, T, onOpenWh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showDel, setShowDel] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const EMPTY = { name: "", addr: "", usd: "", som: "", manager: "", phone: "", type: "General" };
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    const h = () => setOpenMenu(null);
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, []);

  const filtered = warehouses.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.addr.toLowerCase().includes(search.toLowerCase())
  );

  function buildPayload(f) {
    return {
      name: f.name, address: f.addr, manager: f.manager,
      phone: f.phone, type: f.type,
      usd_value: f.usd || "0", som_value: f.som || "0",
    };
  }

  async function addWH() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await depolarAPI.create(buildPayload(form));
      addToast(`"${form.name}" yaratildi!`);
      setShowAdd(false); setForm(EMPTY); onRefresh();
    } catch (e) { addToast(`Xato: ${e.message}`, "error"); }
    finally { setSaving(false); }
  }

  async function editWH() {
    if (!showEdit) return;
    setSaving(true);
    try {
      await depolarAPI.update(showEdit.id, buildPayload(form));
      addToast("Ombor yangilandi!"); setShowEdit(null); onRefresh();
    } catch (e) { addToast(`Xato: ${e.message}`, "error"); }
    finally { setSaving(false); }
  }

  async function delWH(wh) {
    try {
      await depolarAPI.delete(wh.id);
      addToast(`"${wh.name}" deleted`, "error"); onRefresh();
    } catch (e) { addToast(`Xato: ${e.message}`, "error"); }
  }

  function openEdit(wh) {
    setForm({ name: wh.name, addr: wh.addr, usd: wh.usd.replace("$", ""), som: String(wh.som), manager: wh.manager, phone: wh.phone, type: wh.type });
    setShowEdit(wh); setOpenMenu(null);
  }

  const sf = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const formBody = (
    <>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Nomi *</label><input className="form-input" value={form.name} onChange={sf("name")} /></div>
        <div className="form-group"><label className="form-label">Turi</label><input className="form-input" value={form.type} onChange={sf("type")} /></div>
      </div>
      <div className="form-group"><label className="form-label">Manzil</label><input className="form-input" value={form.addr} onChange={sf("addr")} /></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Menejer</label><input className="form-input" value={form.manager} onChange={sf("manager")} /></div>
        <div className="form-group"><label className="form-label">Telefon</label><input className="form-input" value={form.phone} onChange={sf("phone")} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">USD qiymati</label><input className="form-input" value={form.usd} onChange={sf("usd")} /></div>
        <div className="form-group"><label className="form-label">SOM qiymati</label><input className="form-input" value={form.som} onChange={sf("som")} /></div>
      </div>
    </>
  );

  return (
    <div className="fu">
      {showAdd && <Modal title={T.createWh} onClose={() => setShowAdd(false)} footer={<><button className="btn bo" onClick={() => setShowAdd(false)}>{T.cancel}</button><button className="btn bp" onClick={addWH} disabled={saving}>{saving ? "..." : T.save}</button></>}>{formBody}</Modal>}
      {showEdit && <Modal title="Edit Warehouse" onClose={() => setShowEdit(null)} footer={<><button className="btn bo" onClick={() => setShowEdit(null)}>{T.cancel}</button><button className="btn bp" onClick={editWH} disabled={saving}>{saving ? "..." : T.save}</button></>}>{formBody}</Modal>}
      {showDel && <ConfirmModal title="Delete Warehouse" desc={<>«<strong>{showDel.name}</strong>»?
      </>} onConfirm={() => delWH(showDel)} onClose={() => setShowDel(null)} />}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>{T.warehouses}</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>{warehouses.length} warehouses total</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div className="sw-wrap" style={{ width: 200 }}>
            <span className="si-ico"><I n="sr" s={14} /></span>
            <input placeholder={T.search} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn bp" onClick={() => { setForm(EMPTY); setShowAdd(true); }}><I n="pl" s={14} c="#fff" />{T.createWh}</button>
        </div>
      </div>

      <div className="sg sg3">
        <div className="sc"><div className="slb">Total Warehouses</div><div className="sv">{warehouses.length}</div><div style={{ marginTop: 7 }}><span className="badge bdg">All Active</span></div></div>
        <div className="sc"><div className="slb">Total Inventory</div><div className="sv bl">{buylist.length}</div><div className="sss">Across all locations</div></div>
        <div className="sc"><div className="slb">Low Stock</div><div className="sv rd">{buylist.filter(i => i.low).length}</div><div className="sss">Needs attention</div></div>
      </div>

      {loading ? <Spinner /> : (
        <div className="wg">
          {filtered.map((w) => {
            const icColor = WC_ICON_COLOR[w.wc];
            const whBl = buylist.filter(b => String(b.depolarId) === String(w.id));
            const isOpen = openMenu === w.id;
            return (
              <div key={w.id} className="wc" onClick={() => onOpenWh(w)}>
                <div className="wb">
                  <div className="whh">
                    <div className={`wi wi-${w.wc}`}><I n={w.ic} s={20} c={icColor} /></div>
                    <div className="wh-menu" onClick={e => e.stopPropagation()}>
                      <button className="wh-menu-btn" onClick={() => setOpenMenu(isOpen ? null : w.id)}>···</button>
                      {isOpen && (
                        <div className="wh-dropdown">
                          <div className="wh-dd-item" onClick={() => { onOpenWh(w); setOpenMenu(null); }}><I n="eye2" s={13} />Ko'rish</div>
                          <div className="wh-dd-item" onClick={() => openEdit(w)}><I n="ed" s={13} />Edit</div>
                          <div className="wh-dd-sep" />
                          <div className="wh-dd-item del" onClick={() => { setShowDel(w); setOpenMenu(null); }}><I n="td" s={13} />Delete</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="wn">{w.name}</div>
                  <div className="wa"><I n="lc" s={11} c="var(--text4)" />{w.addr}</div>
                  <div className="wdd" />
                  <div className="wss">Buylist: <strong>{whBl.length} ta</strong>
                    {whBl.filter(b => b.low).length > 0 && <span style={{ color: "var(--red)", fontWeight: 700, fontSize: 11, marginLeft: 7 }}>⚠ {whBl.filter(b => b.low).length} kam</span>}
                  </div>
                  <div className="vsl">Qiymat</div>
                  <div className="vgg">
                    <div><div className="vl">USD</div><div className="vv vv-g">{w.usd}</div></div>
                    <div><div className="vl">SOM</div><div className="vv vv-b">{Number(String(w.som).replace(/,/g, "")).toLocaleString()}</div></div>
                  </div>
                </div>
                <div className="wf" onClick={e => e.stopPropagation()}>
                  <button className="btn bo" style={{ flex: 1, justifyContent: "center" }} onClick={() => onOpenWh(w)}>Tafsilotlar →</button>
                  <button className="btn bo bs" onClick={() => openEdit(w)}><I n="ed" s={13} /></button>
                  <button className="btn bd bs" onClick={() => setShowDel(w)}><I n="td" s={13} /></button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && warehouses.length > 0 && (
            <div style={{ gridColumn: "span 3" }}><div className="empty-state"><h3>No results found</h3><p>"{search}" — no warehouses found</p></div></div>
          )}
          <div className="aw" onClick={() => { setForm(EMPTY); setShowAdd(true); }}>
            <div className="awc"><I n="pl" s={20} /></div>
            <div className="awt">Add Warehouse</div>
            <div className="aws">Yangi ombor yarating.</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ WAREHOUSE DETAIL ═══════════════════ */
function WarehouseDetail({ wh, setWh, warehouses, setWarehouses, buylist, setBuylist, itemler, moneytypes, unitler, addToast, T, onBack }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [delItem, setDelItem] = useState(null);
  const [showEditWh, setShowEditWh] = useState(false);

  // buylist form — uses FK IDs
  const EMPTY_BL = { item: itemler[0]?.id ?? "", moneytype: moneytypes[0]?.id ?? "", unit: unitler[0]?.id ?? "", qty: "", narx: "" };
  const [form, setForm] = useState(EMPTY_BL);
  const [whForm, setWhForm] = useState({ name: wh.name, addr: wh.addr, usd: wh.usd.replace("$", ""), som: String(wh.som), manager: wh.manager, phone: wh.phone, type: wh.type });
  const [search, setSearch] = useState(""); const [pg, setPg] = useState(1); const PER = 7;
  const [saving, setSaving] = useState(false);

  // Update empty form when reference data loads
  useEffect(() => {
    setForm(f => ({
      ...f,
      item: f.item || itemler[0]?.id || "",
      moneytype: f.moneytype || moneytypes[0]?.id || "",
      unit: f.unit || unitler[0]?.id || "",
    }));
  }, [itemler, moneytypes, unitler]);

  const whBl = buylist.filter(b => String(b.depolarId) === String(wh.id));
  const filtered = whBl.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const totalPgs = Math.max(1, Math.ceil(filtered.length / PER));
  const shown = filtered.slice((pg - 1) * PER, pg * PER);
  const lowCount = whBl.filter(i => i.low).length;
  const grad = WC_GRADIENT[wh.wc] || WC_GRADIENT.bl;

  // Build API payload for buylist — serializer alan adlarıyla eşleşiyor
  function buildBlPayload(f) {
    return {
      item:      Number(f.item)      || undefined,
      moneytype: Number(f.moneytype) || undefined,
      unit:      Number(f.unit)      || undefined,
      depolar:   wh.id,
      qty:       Number(f.qty)       || 0,
      narx:      f.narx              || "0",
    };
  }

  async function addBl() {
    if (!form.item || !form.qty) { addToast("Please select an item and enter quantity", "error"); return; }
    setSaving(true);
    try {
      const created = await buylistAPI.create(buildBlPayload(form));
      setBuylist(prev => [...prev, normalizeBuylist(created, itemler, moneytypes, unitler)]);
      addToast("Item added to inventory!"); setShowAdd(false); setForm(EMPTY_BL);
    } catch (e) { addToast(`Xato: ${e.message}`, "error"); }
    finally { setSaving(false); }
  }

  async function saveEdit() {
    if (!editItem) return;
    setSaving(true);
    try {
      const updated = await buylistAPI.update(editItem.id, buildBlPayload(form));
      setBuylist(prev => prev.map(i => i.id === editItem.id ? normalizeBuylist(updated, itemler, moneytypes, unitler) : i));
      addToast("Yangilandi!"); setEditItem(null);
    } catch (e) { addToast(`Xato: ${e.message}`, "error"); }
    finally { setSaving(false); }
  }

  async function delBl(item) {
    try {
      await buylistAPI.delete(item.id);
      setBuylist(prev => prev.filter(i => i.id !== item.id));
      addToast(`"${item.name}" deleted`, "error");
    } catch (e) { addToast(`Xato: ${e.message}`, "error"); }
  }

  async function saveWh() {
    setSaving(true);
    try {
      const updated = await depolarAPI.update(wh.id, {
        name: whForm.name, address: whForm.addr, manager: whForm.manager,
        phone: whForm.phone, type: whForm.type, usd_value: whForm.usd, som_value: whForm.som,
      });
      const norm = normalizeDepolar(updated, 0);
      setWh(prev => ({ ...prev, ...norm }));
      setWarehouses(ws => ws.map(w2 => w2.id === wh.id ? { ...w2, ...norm } : w2));
      addToast("Ombor yangilandi!"); setShowEditWh(false);
    } catch (e) { addToast(`Xato: ${e.message}`, "error"); }
    finally { setSaving(false); }
  }

  function openEdit(item) {
    setForm({
      item: item.itemId || "",
      moneytype: item.moneytypeId || "",
      unit: item.unitId || "",
      qty: String(item.qty),
      narx: item.price,
    });
    setEditItem(item);
  }

  const sf = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const blForm = (
    <>
      <div className="form-group">
        <label className="form-label">Mahsulot (Item) *</label>
        <select className="form-select" value={form.item} onChange={sf("item")}>
          <option value="">— Mahsulot tanlang —</option>
          {itemler.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        {itemler.length === 0 && <div style={{ fontSize: 12, color: "var(--orange)", marginTop: 4 }}>⚠ First add items in the Items section</div>}
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Miqdor (qty) *</label>
          <input className="form-input" type="number" min="0" value={form.qty} onChange={sf("qty")} />
        </div>
        <div className="form-group">
          <label className="form-label">Narx (narx)</label>
          <input className="form-input" type="number" min="0" step="0.01" value={form.narx} onChange={sf("narx")} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Valyuta (Moneytype)</label>
          <select className="form-select" value={form.moneytype} onChange={sf("moneytype")}>
            <option value="">— Valyuta —</option>
            {moneytypes.map(m => <option key={m.id} value={m.id}>{m.name} {m.code !== m.name ? `(${m.code})` : ""}</option>)}
          </select>
          {moneytypes.length === 0 && <div style={{ fontSize: 12, color: "var(--orange)", marginTop: 4 }}>⚠ First add currencies in the Currencies section</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Birlik (Unit)</label>
          <select className="form-select" value={form.unit} onChange={sf("unit")}>
            <option value="">— Birlik —</option>
            {unitler.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {unitler.length === 0 && <div style={{ fontSize: 12, color: "var(--orange)", marginTop: 4 }}>⚠ First add units in the Units section</div>}
        </div>
      </div>
    </>
  );

  return (
    <div className="fu">
      {editItem && (
        <Modal title="Edit Inventory Item" onClose={() => setEditItem(null)} wide
          footer={<><button className="btn bo" onClick={() => setEditItem(null)}>{T.cancel}</button><button className="btn bp" onClick={saveEdit} disabled={saving}>{saving ? "..." : T.save}</button></>}>
          {blForm}
        </Modal>
      )}
      {delItem && <ConfirmModal title="Delete Item" desc={<>«<strong>{delItem.name}</strong>»?
      </>} onConfirm={() => delBl(delItem)} onClose={() => setDelItem(null)} />}
      {showEditWh && (
        <Modal title="Edit Warehouse" onClose={() => setShowEditWh(false)}
          footer={<><button className="btn bo" onClick={() => setShowEditWh(false)}>{T.cancel}</button><button className="btn bp" onClick={saveWh} disabled={saving}>{saving ? "..." : T.save}</button></>}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Nomi</label><input className="form-input" value={whForm.name} onChange={e => setWhForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Turi</label><input className="form-input" value={whForm.type} onChange={e => setWhForm(f => ({ ...f, type: e.target.value }))} /></div>
          </div>
          <div className="form-group"><label className="form-label">Manzil</label><input className="form-input" value={whForm.addr} onChange={e => setWhForm(f => ({ ...f, addr: e.target.value }))} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Menejer</label><input className="form-input" value={whForm.manager} onChange={e => setWhForm(f => ({ ...f, manager: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Telefon</label><input className="form-input" value={whForm.phone} onChange={e => setWhForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">USD</label><input className="form-input" value={whForm.usd} onChange={e => setWhForm(f => ({ ...f, usd: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">SOM</label><input className="form-input" value={whForm.som} onChange={e => setWhForm(f => ({ ...f, som: e.target.value }))} /></div>
          </div>
        </Modal>
      )}

      {/* Banner */}
      <div className="wdh">
        <div className="wdh-banner" style={{ background: grad }}>
          <div className="wdh-glow" style={{ width: 280, height: 280, top: -100, right: -60 }} />
          <div style={{ display: "flex", alignItems: "flex-end", gap: 18, width: "100%", position: "relative", zIndex: 1 }}>
            <div className="wdh-icon"><I n={wh.ic} s={26} c="#fff" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "rgba(255,255,255,.65)", marginBottom: 4 }}>{wh.type}</div>
              <div className="wdh-title">{wh.name}</div>
              <div className="wdh-addr"><I n="lc" s={12} c="rgba(255,255,255,.7)" />{wh.addr}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" style={{ background: "rgba(255,255,255,.2)", color: "#fff", border: "1px solid rgba(255,255,255,.35)", backdropFilter: "blur(8px)" }} onClick={() => setShowEditWh(true)}>
                <I n="ed" s={14} c="#fff" />Edit
              </button>
              <button className="btn" style={{ background: "rgba(255,255,255,.2)", color: "#fff", border: "1px solid rgba(255,255,255,.35)", backdropFilter: "blur(8px)" }} onClick={onBack}>
                <I n="arr" s={14} c="#fff" />Orqaga
              </button>
            </div>
          </div>
        </div>
        <div className="wdh-body">
          {[
            { l: "Buylist", v: String(whBl.length), c: "var(--blue)", s: "items" },
            { l: "Low Stock", v: String(lowCount), c: lowCount > 0 ? "var(--red)" : "var(--green)", s: lowCount > 0 ? "warning" : "OK ✓" },
            { l: "USD", v: wh.usd, c: "var(--green)", s: "" },
            { l: "SOM", v: Number(String(wh.som).replace(/,/g, "")).toLocaleString(), c: "var(--orange)", s: "so'm" },
          ].map((stat, i) => (
            <div key={i} className="wdh-stat">
              <div className="wdh-stat-l">{stat.l}</div>
              <div className="wdh-stat-v" style={{ color: stat.c }}>{stat.v}</div>
              <div className="wdh-stat-s">{stat.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Reference data warning */}
      {(itemler.length === 0 || moneytypes.length === 0 || unitler.length === 0) && (
        <div className="api-err" style={{ marginBottom: 16 }}>
          <I n="warn" s={16} c="var(--orange)" />
          <span style={{ color: "var(--orange)" }}>
            To add buylist items, first create:
            {itemler.length === 0 && " ⚡ Items (left menu),"}
            {moneytypes.length === 0 && " ⚡ Currencies (left menu),"}
            {unitler.length === 0 && " ⚡ Units (left menu)"}
          </span>
        </div>
      )}

      {/* Buylist Table */}
      <div className="tc">
        <div style={{ borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", paddingLeft: 6 }}>
          <div style={{ padding: "8px 16px", fontWeight: 700, fontSize: 13, color: "var(--blue)", borderBottom: "2px solid var(--blue)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><I n="bx" s={13} />Buylist ({whBl.length})</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 8, padding: "0 14px" }}>
            <div className="sw-wrap" style={{ width: 200 }}>
              <span className="si-ico"><I n="sr" s={14} /></span>
              <input placeholder={T.search} value={search} onChange={e => { setSearch(e.target.value); setPg(1); }} />
            </div>
            <button className="btn bp bs" onClick={() => { setForm(EMPTY_BL); setShowAdd(v => !v); }}>
              <I n={showAdd ? "x" : "pl"} s={13} c="#fff" />{showAdd ? "Cancel" : "+ Add"}
            </button>
          </div>
        </div>

        {showAdd && (
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", background: "var(--blue-l)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 100px 90px auto", gap: 10, alignItems: "flex-end" }}>
              <div>
                <label className="form-label">Mahsulot *</label>
                <select className="form-select" style={{ width: "100%" }} value={form.item} onChange={sf("item")}>
                  <option value="">— Tanlang —</option>
                  {itemler.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Valyuta</label>
                <select className="form-select" style={{ width: "100%" }} value={form.moneytype} onChange={sf("moneytype")}>
                  <option value="">— Valyuta —</option>
                  {moneytypes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Miqdor *</label>
                <input className="form-input" type="number" min="0" value={form.qty} onChange={sf("qty")} onKeyDown={e => e.key === "Enter" && addBl()} />
              </div>
              <div>
                <label className="form-label">Narx</label>
                <input className="form-input" type="number" min="0" step="0.01" value={form.narx} onChange={sf("narx")} onKeyDown={e => e.key === "Enter" && addBl()} />
              </div>
              <button className="btn bp" style={{ padding: "9px 14px", alignSelf: "flex-end" }} onClick={addBl} disabled={saving}>
                <I n="ck" s={14} c="#fff" />
              </button>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
              <label className="form-label" style={{ margin: 0 }}>Birlik:</label>
              <select className="form-select" style={{ width: 140 }} value={form.unit} onChange={sf("unit")}>
                <option value="">— Birlik —</option>
                {unitler.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {shown.length === 0 ? (
          <div className="empty-state"><I n="bx" s={38} c="var(--border2)" /><h3>Inventory is empty</h3><p>Add your first item.</p></div>
        ) : (
          <table>
            <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Currency</th><th>Unit</th><th>Total</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {shown.map(item => (
                <tr key={item.id}>
                  <td><div className="ir">
                    <div className="ith"><I n="bx" s={17} c="var(--blue)" /></div>
                    <div>
                      <div className="itn">{item.name}</div>
                      <div className="iti">ID: {item.itemId}{item.low && <span style={{ color: "var(--red)", fontWeight: 700 }}> · KAM ZAXIRA</span>}</div>
                    </div>
                  </div></td>
                  <td><span className={`qv${item.low ? " ql" : ""}`}>{item.qty}</span></td>
                  <td style={{ fontWeight: 500 }}>{item.price}</td>
                  <td><span className="cpill cp-u">{item.moneytypeName}</span></td>
                  <td className="dv">{item.unitName}</td>
                  <td className="tvv">{item.total}</td>
                  <td className="dv">{item.date}</td>
                  <td><div className="arr">
                    <button className="ib" onClick={() => openEdit(item)}><I n="ed" s={13} /></button>
                    <button className="ib red" onClick={() => setDelItem(item)}><I n="td" s={13} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="tf">
          <span className="ti">{Math.min((pg - 1) * PER + 1, filtered.length)}–{Math.min(pg * PER, filtered.length)} / {filtered.length}</span>
          <div className="pg">
            <div className="pb" onClick={() => setPg(p => Math.max(1, p - 1))}><I n="cl" s={12} /></div>
            {Array.from({ length: totalPgs }, (_, i) => i + 1).map(n => (
              <div key={n} className={`pb${pg === n ? " act" : ""}`} onClick={() => setPg(n)}>{n}</div>
            ))}
            <div className="pb" onClick={() => setPg(p => Math.min(totalPgs, p + 1))}><I n="cr" s={12} /></div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 22, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button className="back-link" onClick={onBack}><I n="arr" s={14} />← {T.warehouses}ga qaytish</button>
        <button className="btn bo" onClick={() => setShowEditWh(true)}><I n="ed" s={14} />Edit Warehouse</button>
      </div>
    </div>
  );
}

/* ═══════════════════ SHIPMENTS ═══════════════════ */
let SHIP_ID = 50;
function ShipmentsPage({ shipments, setShipments, addToast, T }) {
  const [showAdd, setShowAdd] = useState(false);
  const [delShip, setDelShip] = useState(null);
  const [form, setForm] = useState({ item: "", from: "", to: "", val: "", status: "Pending" });

  function addShip() {
    if (!form.item) return;
    const id = ++SHIP_ID;
    setShipments(s => [...s, { id, item: form.item, batch: `#${id}`, from: form.from, to: form.to, date: new Date().toLocaleDateString(), status: form.status, val: form.val || "+$0", pos: form.status !== "In Transit" }]);
    addToast("Shipment created!"); setShowAdd(false);
    setForm({ item: "", from: "", to: "", val: "", status: "Pending" });
  }

  return (
    <div className="fu">
      {showAdd && (
        <Modal title="New Shipment" onClose={() => setShowAdd(false)}
          footer={<><button className="btn bo" onClick={() => setShowAdd(false)}>{T.cancel}</button><button className="btn bp" onClick={addShip}><I n="pl" s={14} c="#fff" />Create</button></>}>
          <div className="form-group"><label className="form-label">Mahsulot Nomi *</label><input className="form-input" value={form.item} onChange={e => setForm(f => ({ ...f, item: e.target.value }))} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Qayerdan</label><input className="form-input" value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Qayerga</label><input className="form-input" value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Qiymat</label><input className="form-input" value={form.val} onChange={e => setForm(f => ({ ...f, val: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option>Pending</option><option>In Transit</option><option>Delivered</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
      {delShip && <ConfirmModal title="Delete Shipment" desc={<>«<strong>{delShip.item}</strong>»?
      </>} onConfirm={() => { setShipments(s => s.filter(x => x.id !== delShip.id)); addToast("Deleted", "error"); }} onClose={() => setDelShip(null)} />}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>{T.shipments}</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>{shipments.length} ta yuborish</p>
        </div>
        <button className="btn bp" onClick={() => setShowAdd(true)}><I n="pl" s={14} c="#fff" />New Shipment</button>
      </div>

      <div className="sg sg3">
        {[{ l: "Delivered", cl: "gr", f: "Delivered" }, { l: "In Transit", cl: "bl", f: "In Transit" }, { l: "Pending", cl: "rd", f: "Pending" }].map(s => (
          <div key={s.l} className="sc"><div className="slb">{s.l}</div><div className={`sv ${s.cl}`}>{shipments.filter(x => x.status === s.f).length}</div></div>
        ))}
      </div>

      <div className="tc">
        <div className="sh2"><div className="st2">All Shipments</div></div>
        {shipments.length === 0
          ? <div className="empty-state"><I n="ship" s={38} c="var(--border2)" /><h3>No shipments</h3></div>
          : shipments.map(s => {
            const st = SHIP_ST[s.status] || SHIP_ST.Pending;
            return (
              <div className="ship-card" key={s.id}>
                <div className="ship-icon"><I n={st.ic} s={20} c={st.c} /></div>
                <div className="ship-info">
                  <div className="ship-name">{s.item}</div>
                  <div className="ship-meta">Batch {s.batch} · {s.from} → {s.to} · {s.date}</div>
                </div>
                <div className="ship-status">
                  <span className={`txs ${st.cls}`}>{s.status}</span>
                  <span className={`txi ${s.pos ? "txi-p" : "txi-n"}`}>{s.val}</span>
                </div>
                <div style={{ marginLeft: 12 }}><button className="ib red" onClick={() => setDelShip(s)}><I n="td" s={13} /></button></div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

/* ═══════════════════ REPORTS ═══════════════════ */
function ReportsPage({ warehouses, buylist, shipments, addToast, T }) {
  const byWH = warehouses.map(w => ({
    name: w.name.split(" ").slice(0, 2).join(" "),
    count: buylist.filter(b => String(b.depolarId) === String(w.id)).length,
  }));
  const maxWH = Math.max(...byWH.map(w => w.count), 1);
  const colors = ["var(--blue)", "var(--orange)", "var(--purple)", "var(--green)"];

  return (
    <div className="fu">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>{T.reports}</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>Analytics across all warehouses</p>
        </div>
        <button className="btn bp" onClick={() => addToast("PDF exported!", "info")}><I n="dl" s={14} c="#fff" />PDF Export</button>
      </div>
      <div className="sg">
        <div className="sc"><div className="slb">Total Inventory</div><div className="sv">{buylist.length}</div><div style={{ marginTop: 6 }}><span className="badge bdg">All warehouses</span></div></div>
        <div className="sc"><div className="slb">Warehouses</div><div className="sv bl">{warehouses.length}</div></div>
        <div className="sc"><div className="slb">Shipments</div><div className="sv" style={{ color: "var(--purple)" }}>{shipments.length}</div></div>
        <div className="sc"><div className="slb">Low Stock</div><div className="sv rd">{buylist.filter(i => i.low).length}</div></div>
      </div>
      <div className="rep-grid">
        <div className="rep-chart">
          <div className="rep-chart-title">Items by Warehouse</div>
          {byWH.length === 0 ? <div style={{ color: "var(--text4)", fontSize: 13 }}>No data</div> :
            byWH.map((w, i) => (
              <div key={i} className="bar-row">
                <div className="bar-label">{w.name}</div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(w.count / maxWH) * 100}%`, background: colors[i % colors.length] }} /></div>
                <div className="bar-val">{w.count}</div>
              </div>
            ))}
        </div>
        <div className="rep-chart">
          <div className="rep-chart-title">Status breakdown</div>
          {[
            { label: "Delivered", count: shipments.filter(s => s.status === "Delivered").length, color: "var(--green)" },
            { label: "In Transit", count: shipments.filter(s => s.status === "In Transit").length, color: "var(--orange)" },
            { label: "Pending", count: shipments.filter(s => s.status === "Pending").length, color: "var(--blue)" },
            { label: "Low Stock", count: buylist.filter(i => i.low).length, color: "var(--red)" },
          ].map((r, i) => (
            <div key={i} className="bar-row">
              <div className="bar-label">{r.label}</div>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(4, (r.count / Math.max(buylist.length + shipments.length, 1)) * 100)}%`, background: r.color }} /></div>
              <div className="bar-val">{r.count}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="tc">
        <div className="sh2"><div className="st2">Shipment Log</div></div>
        <table>
          <thead><tr><th>Mahsulot</th><th>Marshrut</th><th>Sana</th><th>Status</th><th>Qiymat</th></tr></thead>
          <tbody>{shipments.map((s, i) => (
            <tr key={i}>
              <td><div className="itn">{s.item}</div><div className="iti">Batch {s.batch}</div></td>
              <td className="dv">{s.from} → {s.to}</td>
              <td className="dv">{s.date}</td>
              <td><span className={`txs ${s.status === "Delivered" ? "txr" : s.status === "In Transit" ? "txw" : "bdb"}`}>{s.status}</span></td>
              <td className={`txi ${s.pos ? "txi-p" : "txi-n"}`}>{s.val}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════ SMART INVOICE INTAKE ═══════════════════ */
let INTAKE_ID = 100;
const DEFAULT_LINES = [];

function IntakePage({ buylist, setBuylist, warehouses, itemler, moneytypes, unitler, addToast, T }) {
  const [lines, setLines] = useState([]);
  const [approved, setApproved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selWh, setSelWh] = useState(warehouses[0]?.id || "");
  const [refId, setRefId] = useState("");
  const [editingCell, setEditingCell] = useState(null);
  const [showAddLine, setShowAddLine] = useState(false);
  const [newLine, setNewLine] = useState({ desc: "", qty: "", price: "", cur: "UZS" });

  // Upload state
  const [uploadedFile, setUploadedFile] = useState(null);       // File objesi
  const [previewUrl, setPreviewUrl] = useState(null);           // Önizleme URL'i
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = { current: null };

  useEffect(() => {
    if (warehouses.length && !selWh) setSelWh(warehouses[0].id);
  }, [warehouses]);

  const total = lines.reduce((acc, l) => acc + (Number(l.qty) * parseFloat(l.price || 0)), 0);

  // Dosya seçildiğinde
  function handleFileSelect(file) {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.type)) {
      addToast("Sadece JPG, PNG veya WEBP yükleyebilirsiniz", "error");
      return;
    }
    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setLines([]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }

  // OCR + AI Scan
  async function handleScan() {
    if (!uploadedFile) { addToast("Önce bir fatura resmi yükleyin", "error"); return; }
    setScanning(true);
    try {
      const formData = new FormData();
      formData.append("image", uploadedFile);

      const token = getToken();
      const res = await fetch(`${BASE}/scan/`, {
        method: "POST",
        headers: {
          ...(token ? { "Authorization": `Token ${token}` } : {}),
        },
        credentials: "include",
        body: formData,  // Content-Type otomatik multipart/form-data olur
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || `Hata: ${res.status}`);
      }

      const scannedLines = (data.lines || []).map((l, i) => ({
        ...l,
        id: ++INTAKE_ID,
        warn: false,
      }));

      if (scannedLines.length === 0) {
        addToast("Faturadan ürün çıkarılamadı. Daha net bir resim deneyin.", "error");
      } else {
        setLines(scannedLines);
        setRefId(`INV-${Date.now().toString().slice(-6)}`);
        addToast(`${scannedLines.length} ürün başarıyla tarandı!`, "success");
      }
    } catch (e) {
      addToast(`Tarama hatası: ${e.message}`, "error");
    } finally {
      setScanning(false);
    }
  }

  function updateLine(id, field, value) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  }

  function deleteLine(id) {
    setLines(prev => prev.filter(l => l.id !== id));
  }

  function addLine() {
    if (!newLine.desc.trim()) return;
    setLines(prev => [...prev, { id: ++INTAKE_ID, desc: newLine.desc, qty: Number(newLine.qty) || 1, price: newLine.price || "0", cur: newLine.cur, warn: false }]);
    setNewLine({ desc: "", qty: "", price: "", cur: "UZS" });
    setShowAddLine(false);
  }

  async function approve() {
    if (lines.length === 0) { addToast("No items to approve", "error"); return; }
    setSaving(true);
    let success = 0;
    for (const line of lines) {
      try {
        const itemId = itemler[0]?.id || null;
        const mtId = moneytypes.find(m => m.code === line.cur || m.name === line.cur)?.id || moneytypes[0]?.id || null;
        const unitId = unitler.find(u => u.name === line.birlik)?.id || unitler[0]?.id || null;
        const created = await buylistAPI.create({
          item:      itemId,
          moneytype: mtId,
          unit:      unitId,
          depolar:   selWh || null,
          qty:       Number(line.qty) || 0,
          narx:      line.price || "0",
        });
        setBuylist(prev => [...prev, normalizeBuylist(created, itemler, moneytypes, unitler)]);
        success++;
      } catch { /* skip failed */ }
    }
    setSaving(false);
    addToast(`${success}/${lines.length} items added to inventory!`);
    setApproved(true);
  }

  if (approved) return (
    <div className="fu" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 420 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 70, height: 70, background: "var(--green-bg)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", border: "2px solid var(--green)" }}>
          <I n="ck" s={30} c="var(--green)" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Muvaffaqiyatli qo'shildi!</h2>
        <p style={{ color: "var(--text3)", marginBottom: 26, fontSize: 14 }}>{lines.length} ta mahsulot inventarga qo'shildi.</p>
        <button className="btn bp" style={{ padding: "10px 28px", fontSize: 14 }} onClick={() => {
          setApproved(false); setLines([]); setUploadedFile(null); setPreviewUrl(null); setRefId("");
        }}>
          <I n="sc" s={15} c="#fff" />Yangi Fatura Skan
        </button>
      </div>
    </div>
  );

  return (
    <div className="fu">
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text3)" }}>Inventory</span>
            <span style={{ color: "var(--border2)" }}>›</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Smart Invoice Intake</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 20, alignItems: "start" }}>

        {/* ── LEFT: Upload Panel ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh)", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, background: "var(--blue-l)", border: "1px solid var(--blue-m)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <I n="fi" s={14} c="var(--blue)" />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", letterSpacing: ".03em" }}>
                {uploadedFile ? uploadedFile.name.toUpperCase() : "FATURA YUKLASH"}
              </span>
            </div>
            {uploadedFile && (
              <button className="ib" onClick={() => { setUploadedFile(null); setPreviewUrl(null); setLines([]); }}
                title="Tozalash">
                <I n="x" s={13} />
              </button>
            )}
          </div>

          {/* Upload area veya preview */}
          <div style={{ padding: 16, background: "#f5f6f8", minHeight: 460 }}>
            {!previewUrl ? (
              /* Drop zone */
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("invoice-file-input").click()}
                style={{
                  border: `2px dashed ${isDragging ? "var(--blue)" : "var(--border2)"}`,
                  borderRadius: "var(--r)",
                  background: isDragging ? "var(--blue-l)" : "var(--surface)",
                  minHeight: 420,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all .2s",
                  padding: 24,
                  textAlign: "center",
                }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--blue-l)", border: "1.5px solid var(--blue-m)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <I n="dl" s={24} c="var(--blue)" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                  Fatura rasmini yuklang
                </div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 18, lineHeight: 1.6 }}>
                  Sudrab tashlang yoki bosing<br />JPG, PNG, WEBP · Max 10MB
                </div>
                <button className="btn bp" style={{ pointerEvents: "none" }}>
                  <I n="fi" s={14} c="#fff" />Fayl tanlash
                </button>
                <input
                  id="invoice-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={e => handleFileSelect(e.target.files[0])}
                />
              </div>
            ) : (
              /* Image preview */
              <div style={{ borderRadius: "var(--rs)", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,.12)", background: "#fff" }}>
                <img
                  src={previewUrl}
                  alt="Fatura"
                  style={{ width: "100%", display: "block", maxHeight: 420, objectFit: "contain" }}
                />
              </div>
            )}
          </div>

          {/* Scan button */}
          <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>
            <button
              className="btn bp"
              style={{ flex: 1, justifyContent: "center", fontSize: 14, padding: "10px" }}
              onClick={handleScan}
              disabled={!uploadedFile || scanning}>
              {scanning
                ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Skanlanmoqda...</>
                : <><I n="mg" s={15} c="#fff" />AI bilan Skan Qilish</>
              }
            </button>
            <button
              className="btn bo"
              onClick={() => document.getElementById("invoice-file-input").click()}
              title="Boshqa rasm tanlash">
              <I n="refresh" s={14} />
              <input
                id="invoice-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={e => handleFileSelect(e.target.files[0])}
              />
            </button>
          </div>
        </div>

        {/* ── RIGHT: AI Extraction Results ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh)", overflow: "hidden" }}>
          {/* AI Header */}
          <div style={{ padding: "18px 22px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 38, height: 38, background: "var(--blue)", borderRadius: "var(--rs)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <I n="mg" s={18} c="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>AI Extraction Results</div>
                <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>
                  {scanning
                    ? "Fatura skanlanmoqda..."
                    : lines.length > 0
                      ? `${lines.length} ta mahsulot topildi.`
                      : "Fatura yuklang va AI bilan skanlang."}
                </div>
              </div>
            </div>
            {lines.length > 0 && (
              <div style={{ background: "var(--green-bg)", border: "1px solid var(--green-t)", color: "var(--green-t)", padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                <I n="ck" s={12} c="var(--green-t)" />Ko'rib chiqishga tayyor
              </div>
            )}
            {scanning && (
              <div style={{ background: "var(--blue-l)", border: "1px solid var(--blue-m)", color: "var(--blue)", padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />Skanlanmoqda...
              </div>
            )}
          </div>

          {/* Scanning overlay */}
          {scanning && (
            <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--text3)" }}>
              <div className="spinner" style={{ margin: "0 auto 16px" }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text2)", marginBottom: 6 }}>OCR va AI ishlayapti...</div>
              <div style={{ fontSize: 12 }}>Fatura matni o'qilmoqda va tahlil qilinmoqda</div>
            </div>
          )}

          {/* Empty state */}
          {!scanning && lines.length === 0 && (
            <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--text4)" }}>
              <I n="sc" s={42} c="var(--border2)" />
              <div style={{ marginTop: 14, fontSize: 14, fontWeight: 600, color: "var(--text3)" }}>Hali skan qilinmagan</div>
              <div style={{ fontSize: 12, marginTop: 5 }}>Chap tomonga fatura rasmini yuklang va "AI bilan Skan" tugmasini bosing</div>
            </div>
          )}

          {/* Results */}
          {!scanning && lines.length > 0 && (
            <>
              {/* Summary row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid var(--border)" }}>
                <div style={{ padding: "14px 18px", borderRight: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text4)", marginBottom: 6 }}>Mahsulotlar</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{lines.length} ta</div>
                </div>
                <div style={{ padding: "14px 18px", borderRight: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text4)", marginBottom: 6 }}>Ref ID</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", fontStyle: "italic" }}>{refId || "—"}</div>
                </div>
                <div style={{ padding: "14px 18px", background: "var(--blue-l)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--blue)", marginBottom: 6 }}>Jami Summa</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", letterSpacing: "-.02em" }}>
                    {total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Line items table */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Aniqlangan Mahsulotlar</div>
                  <button className="btn bg2 bs" style={{ color: "var(--blue)", fontWeight: 700 }} onClick={() => setShowAddLine(v => !v)}>
                    <I n="pl" s={13} c="var(--blue)" />+ Qo'shish
                  </button>
                </div>

                {showAddLine && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 90px 80px 36px", gap: 8, padding: "10px 18px", background: "var(--blue-l)", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
                    <input className="form-input" style={{ fontSize: 13, padding: "6px 10px" }} placeholder="Mahsulot nomi" value={newLine.desc} onChange={e => setNewLine(p => ({ ...p, desc: e.target.value }))} onKeyDown={e => e.key === "Enter" && addLine()} />
                    <input className="form-input" style={{ fontSize: 13, padding: "6px 10px" }} type="number" placeholder="Soni" value={newLine.qty} onChange={e => setNewLine(p => ({ ...p, qty: e.target.value }))} />
                    <input className="form-input" style={{ fontSize: 13, padding: "6px 10px" }} type="number" placeholder="Narx" value={newLine.price} onChange={e => setNewLine(p => ({ ...p, price: e.target.value }))} />
                    <select className="form-select" style={{ fontSize: 13, padding: "6px 8px" }} value={newLine.cur} onChange={e => setNewLine(p => ({ ...p, cur: e.target.value }))}>
                      <option>UZS</option><option>USD</option><option>EUR</option>
                    </select>
                    <button className="btn bp" style={{ padding: "6px 8px", justifyContent: "center" }} onClick={addLine}><I n="ck" s={13} c="#fff" /></button>
                  </div>
                )}

                {/* Table header */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 110px 80px 36px", gap: 8, padding: "8px 18px", borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}>
                  {["MAHSULOT", "SONI", "NARX", "BIRLIK", ""].map((h, i) => (
                    <div key={i} style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text4)" }}>{h}</div>
                  ))}
                </div>

                {/* Rows */}
                {lines.map(line => (
                  <div key={line.id} style={{ display: "grid", gridTemplateColumns: "1fr 70px 110px 80px 36px", gap: 8, padding: "10px 18px", borderBottom: "1px solid var(--border)", alignItems: "center" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <div>
                      {editingCell?.id === line.id && editingCell?.field === "desc"
                        ? <input autoFocus style={{ width: "100%", padding: "4px 8px", border: "1.5px solid var(--blue)", borderRadius: 4, fontFamily: "inherit", fontSize: 14, color: "var(--text)", background: "var(--surface)", outline: "none" }} value={line.desc} onChange={e => updateLine(line.id, "desc", e.target.value)} onBlur={() => setEditingCell(null)} onKeyDown={e => e.key === "Enter" && setEditingCell(null)} />
                        : <span style={{ fontSize: 13, color: "var(--text2)", cursor: "text" }} onClick={() => setEditingCell({ id: line.id, field: "desc" })}>{line.desc}</span>
                      }
                    </div>
                    <div>
                      {editingCell?.id === line.id && editingCell?.field === "qty"
                        ? <input autoFocus type="number" style={{ width: "100%", padding: "4px 8px", border: "1.5px solid var(--blue)", borderRadius: 4, fontFamily: "inherit", fontSize: 14, color: "var(--text)", background: "var(--surface)", outline: "none" }} value={line.qty} onChange={e => updateLine(line.id, "qty", e.target.value)} onBlur={() => setEditingCell(null)} onKeyDown={e => e.key === "Enter" && setEditingCell(null)} />
                        : <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", cursor: "text" }} onClick={() => setEditingCell({ id: line.id, field: "qty" })}>{line.qty}</span>
                      }
                    </div>
                    <div>
                      {editingCell?.id === line.id && editingCell?.field === "price"
                        ? <input autoFocus type="number" style={{ width: "100%", padding: "4px 8px", border: "1.5px solid var(--blue)", borderRadius: 4, fontFamily: "inherit", fontSize: 14, color: "var(--text)", background: "var(--surface)", outline: "none" }} value={line.price} onChange={e => updateLine(line.id, "price", e.target.value)} onBlur={() => setEditingCell(null)} onKeyDown={e => e.key === "Enter" && setEditingCell(null)} />
                        : <span style={{ fontSize: 14, color: "var(--text2)", cursor: "text" }} onClick={() => setEditingCell({ id: line.id, field: "price" })}>{line.price}</span>
                      }
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600 }}>{line.birlik || line.cur}</div>
                    <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 4, borderRadius: 4 }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--red-bg)"; e.currentTarget.style.color = "var(--red)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "var(--text4)"; }}
                      onClick={() => deleteLine(line.id)}><I n="td" s={14} /></button>
                  </div>
                ))}
              </div>

              {/* Warehouse & approve */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "16px 18px", borderTop: "1px solid var(--border)", background: "var(--surface2)" }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text4)", marginBottom: 7 }}>Omborga joylash</div>
                  <select className="form-select" style={{ width: "100%", padding: "10px 32px 10px 12px" }} value={selWh} onChange={e => setSelWh(e.target.value)}>
                    <option value="">— Ombor tanlang —</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text4)", marginBottom: 7 }}>Ref ID</div>
                  <input className="form-input" value={refId} onChange={e => setRefId(e.target.value)} placeholder="INV-000001" />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderTop: "1px solid var(--border)" }}>
                <button className="btn bo" style={{ color: "var(--text3)" }} onClick={() => { setLines([]); }}>
                  Bekor qilish
                </button>
                <button className="btn bp" style={{ padding: "9px 20px", fontWeight: 700, fontSize: 14 }} onClick={approve} disabled={saving}>
                  {saving ? "Qo'shilmoqda..." : <><I n="ck" s={15} c="#fff" />Tasdiqlash va Inventarga Qo'shish →</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.4fr", gap: 14, marginTop: 20 }}>
        {[
          { icon: "sc", bg: "var(--blue-l)", ic: "var(--blue)", label: "Haftalik Skanlar", val: "124" },
          { icon: "zp", bg: "var(--green-bg)", ic: "var(--green)", label: "Tejangan Vaqt", val: "~42h" },
          { icon: "dr", bg: "var(--purple-bg)", ic: "var(--purple)", label: "Qo'shilgan Qiymat", val: "$18.4k" },
        ].map((s, i) => (
          <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "var(--sh)" }}>
            <div style={{ width: 38, height: 38, borderRadius: "var(--rs)", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <I n={s.icon} s={17} c={s.ic} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", letterSpacing: "-.02em" }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>{s.label}</div>
            </div>
          </div>
        ))}
        <div style={{ background: "var(--blue)", borderRadius: "var(--r)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "rgba(255,255,255,.2)", borderRadius: "var(--rs)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <I n="mg" s={17} c="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "rgba(255,255,255,.7)", marginBottom: 3 }}>Pro Tip</div>
            <div style={{ fontSize: 13, color: "#fff", lineHeight: 1.4 }}>Bir nechta fakturani ketma-ket skanlash vaqtni 20% tejaydi.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ USERS PAGE ═══════════════════ */
function UsersPage({ users, companies, onRefresh, addToast, T }) {
  const [showAdd, setShowAdd] = useState(false);
  const [delUser, setDelUser] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const EMPTY = { username: "", email: "", password: "", role: "staff", company: "" };
  const [form, setForm] = useState(EMPTY);

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  async function addUser() {
    if (!form.username) return;
    setSaving(true);
    try {
      await authAPI.createUser({ username: form.username, email: form.email, password: form.password, role: form.role, company: form.company ? Number(form.company) : null });
      addToast(`"${form.username}" yaratildi!`); setShowAdd(false); setForm(EMPTY); onRefresh();
    } catch (e) { addToast(`Xato: ${e.message}`, "error"); }
    finally { setSaving(false); }
  }

  async function delU(user) {
    try {
      await authAPI.deleteUser(user.id);
      addToast(`"${user.username}" deleted`, "error"); onRefresh();
    } catch (e) { addToast(`Xato: ${e.message}`, "error"); }
  }

  const rolePill = (role) => {
    const cls = role === "admin" ? "role-admin" : role === "manager" ? "role-manager" : "role-staff";
    return <span className={`role-pill ${cls}`}>{role || "staff"}</span>;
  };
  const companyName = (id) => companies.find(c => c.id === id)?.name ?? (id ? `#${id}` : "—");
  const sf = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fu">
      {showAdd && (
        <Modal title="Add New User" onClose={() => setShowAdd(false)}
          footer={<><button className="btn bo" onClick={() => setShowAdd(false)}>{T.cancel}</button><button className="btn bp" onClick={addUser} disabled={saving}>{saving ? "..." : T.save}</button></>}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Username *</label><input className="form-input" value={form.username} onChange={sf("username")} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={sf("email")} /></div>
          </div>
          <div className="form-group"><label className="form-label">Parol</label><input className="form-input" type="password" value={form.password} onChange={sf("password")} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={sf("role")}>
                <option value="admin">Admin</option><option value="manager">Manager</option><option value="staff">Staff</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Company</label>
              <select className="form-select" value={form.company} onChange={sf("company")}>
                <option value="">— Tanlang —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}
      {delUser && <ConfirmModal title="Delete User" desc={<>«<strong>{delUser.username}</strong>»?
      </>} onConfirm={() => delU(delUser)} onClose={() => setDelUser(null)} />}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>{T.users}</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>{users.length} users total</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn bo" onClick={onRefresh}><I n="refresh" s={14} />Refresh</button>
          <button className="btn bp" onClick={() => setShowAdd(true)}><I n="pl" s={14} c="#fff" />Add User</button>
        </div>
      </div>

      <div className="sg sg3" style={{ marginBottom: 16 }}>
        <div className="sc"><div className="slb">Total</div><div className="sv">{users.length}</div></div>
        <div className="sc"><div className="slb">Admin</div><div className="sv rd">{users.filter(u => u.role === "admin").length}</div></div>
        <div className="sc"><div className="slb">Manager</div><div className="sv bl">{users.filter(u => u.role === "manager").length}</div></div>
      </div>

      <div className="tc">
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
          <div className="sw-wrap" style={{ maxWidth: 300 }}>
            <span className="si-ico"><I n="sr" s={14} /></span>
            <input placeholder="Username yoki email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state"><I n="usrs" s={38} c="var(--border2)" /><h3>No users found</h3><p>Add a new user or check CORS settings.</p></div>
        ) : (
          <table>
            <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Company</th><th>ID</th><th></th></tr></thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id}>
                  <td><div className="ir">
                    <div className="av" style={{ width: 32, height: 32, fontSize: 11, flexShrink: 0 }}>{user.username?.slice(0, 2).toUpperCase()}</div>
                    <div><div className="itn">{user.username}</div></div>
                  </div></td>
                  <td className="dv">{user.email || "—"}</td>
                  <td>{rolePill(user.role)}</td>
                  <td className="dv">{companyName(user.company)}</td>
                  <td className="dv">#{user.id}</td>
                  <td><button className="ib red" onClick={() => setDelUser(user)}><I n="td" s={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════ COMPANIES PAGE ═══════════════════ */
function CompaniesPage({ companies, onRefresh, addToast, T }) {
  const [showAdd, setShowAdd] = useState(false);
  const [delCo, setDelCo] = useState(null);
  const [saving, setSaving] = useState(false);
  const EMPTY = { name: "", address: "", phone: "", email: "" };
  const [form, setForm] = useState(EMPTY);
  const sf = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function addCo() {
    if (!form.name) return;
    setSaving(true);
    try {
      await authAPI.createCompany(form);
      addToast(`"${form.name}" yaratildi!`); setShowAdd(false); setForm(EMPTY); onRefresh();
    } catch (e) { addToast(`Xato: ${e.message}`, "error"); }
    finally { setSaving(false); }
  }

  async function delC(co) {
    try {
      await authAPI.deleteCompany(co.id);
      addToast(`"${co.name}" deleted`, "error"); onRefresh();
    } catch (e) { addToast(`Xato: ${e.message}`, "error"); }
  }

  return (
    <div className="fu">
      {showAdd && (
        <Modal title="Add New Company" onClose={() => setShowAdd(false)}
          footer={<><button className="btn bo" onClick={() => setShowAdd(false)}>{T.cancel}</button><button className="btn bp" onClick={addCo} disabled={saving}>{saving ? "..." : T.save}</button></>}>
          <div className="form-group"><label className="form-label">Nomi *</label><input className="form-input" value={form.name} onChange={sf("name")} /></div>
          <div className="form-group"><label className="form-label">Manzil</label><input className="form-input" value={form.address} onChange={sf("address")} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Telefon</label><input className="form-input" value={form.phone} onChange={sf("phone")} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={sf("email")} /></div>
          </div>
        </Modal>
      )}
      {delCo && <ConfirmModal title="Delete Company" desc={<>«<strong>{delCo.name}</strong>»?
      </>} onConfirm={() => delC(delCo)} onClose={() => setDelCo(null)} />}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>{T.companies}</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>{companies.length} ta kompaniya</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn bo" onClick={onRefresh}><I n="refresh" s={14} />Refresh</button>
          <button className="btn bp" onClick={() => setShowAdd(true)}><I n="pl" s={14} c="#fff" />Add Company</button>
        </div>
      </div>

      <div className="tc">
        {companies.length === 0 ? (
          <div className="empty-state"><I n="co" s={38} c="var(--border2)" /><h3>No companies found</h3></div>
        ) : (
          <table>
            <thead><tr><th>Company</th><th>Address</th><th>Phone</th><th>Email</th><th>ID</th><th></th></tr></thead>
            <tbody>
              {companies.map(co => (
                <tr key={co.id}>
                  <td><div className="ir">
                    <div className="ith" style={{ background: "var(--purple-bg)", border: "1px solid var(--purple)" }}><I n="co" s={16} c="var(--purple)" /></div>
                    <div className="itn">{co.name}</div>
                  </div></td>
                  <td className="dv">{co.address || "—"}</td>
                  <td className="dv">{co.phone || "—"}</td>
                  <td className="dv">{co.email || "—"}</td>
                  <td className="dv">#{co.id}</td>
                  <td><button className="ib red" onClick={() => setDelCo(co)}><I n="td" s={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════ SETTINGS ═══════════════════ */
const SETTINGS_NAV = [
  { k: "profile", l: "Profile", i: "usr" },
  { k: "appearance", l: "Appearance", i: "palette" },
  { k: "notifications", l: "Notifications", i: "bell2" },
  { k: "privacy", l: "Security", i: "shield" },
  { k: "regional", l: "Regional", i: "globe" },
  { k: "danger", l: "Danger Zone", i: "warn" },
];

function SettingsPage({ settings, setSettings, darkMode, onDarkMode, accent, onAccent, lang, onLang, currentUser, addToast, onLogout, T }) {
  const [active, setActive] = useState("profile");
  const [pf, setPf] = useState({ name: currentUser.username, email: currentUser.email || "", phone: "", role: currentUser.role || "staff" });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  function upd(k, v) { setSettings(s => ({ ...s, [k]: v })); }

  const srow = (label, desc, right) => (
    <div className="settings-row">
      <div className="settings-row-info"><div className="settings-row-label">{label}</div>{desc && <div className="settings-row-desc">{desc}</div>}</div>
      <div style={{ marginLeft: 14, flexShrink: 0 }}>{right}</div>
    </div>
  );

  const card = (iconEl, iconBg, title, subtitle, body) => (
    <div className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-icon" style={{ background: iconBg }}>{iconEl}</div>
        <div><div className="settings-card-title">{title}</div>{subtitle && <div className="settings-card-subtitle">{subtitle}</div>}</div>
      </div>
      <div className="settings-card-body">{body}</div>
    </div>
  );

  const sections = {
    profile: (
      <div className="settings-section">
        {card(<I n="usr" s={17} c="var(--blue)" />, "var(--blue-l)", "Profile & Account", "Manage your personal information",
          <>
            <div className="profile-avatar-area">
              <div className="profile-avatar-big">{pf.name?.slice(0, 2).toUpperCase()}</div>
              <div>
                <div className="profile-avatar-name">{pf.name}</div>
                <div className="profile-avatar-role">{pf.role} · {currentUser.email || "no email"}</div>
                <div style={{ fontSize: 12, color: "var(--text4)", marginTop: 3 }}>ID: #{currentUser.id ?? "—"}</div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Username</label><input className="form-input" value={pf.name} onChange={e => setPf(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={pf.email} onChange={e => setPf(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="btn bp" onClick={() => addToast("Profil saqlandi!")}><I n="ck" s={14} c="#fff" />{T.save}</button></div>
          </>
        )}
      </div>
    ),
    appearance: (
      <div className="settings-section">
        {card(<I n={darkMode ? "moon" : "sun"} s={17} c="var(--purple)" />, "var(--purple-bg)", "Appearance", "Design and color settings",
          <>
            {srow("Dark Mode", "Dark interface", <Toggle checked={darkMode} onChange={onDarkMode} />)}
            {srow("Compact View", "Use less space", <Toggle checked={settings.compactView} onChange={v => upd("compactView", v)} />)}
            <div className="settings-row">
              <div className="settings-row-info"><div className="settings-row-label">Asosiy Rang</div></div>
              <div style={{ marginLeft: 14 }}>
                <div className="color-swatches">{ACCENT_COLORS.map(ac => (
                  <div key={ac.val} className={`color-swatch${accent === ac.val ? " active" : ""}`}
                    style={{ background: ac.val }} title={ac.name} onClick={() => { onAccent(ac.val); addToast(`Rang: ${ac.name}`, "info"); }} />
                ))}</div>
              </div>
            </div>
          </>
        )}
      </div>
    ),
    notifications: (
      <div className="settings-section">
        {card(<I n="bell2" s={17} c="var(--orange)" />, "var(--orange-bg)", "Notifications", "",
          <>
            {srow("Low Stock", "When quantity drops low", <Toggle checked={settings.notifLowStock} onChange={v => upd("notifLowStock", v)} />)}
            {srow("Shipments", "When status changes", <Toggle checked={settings.notifShipments} onChange={v => upd("notifShipments", v)} />)}
            {srow("Reports", "Weekly summary", <Toggle checked={settings.notifReports} onChange={v => upd("notifReports", v)} />)}
          </>
        )}
      </div>
    ),
    privacy: (
      <div className="settings-section">
        {card(<I n="key" s={17} c="var(--green)" />, "var(--green-bg)", "Security", "",
          <>
            <div className="form-group">
              <label className="form-label">Joriy Parol</label>
              <div style={{ position: "relative" }}>
                <input className="form-input" type={showPw ? "text" : "password"} value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} style={{ paddingRight: 38 }} />
                <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text4)" }}>
                  <I n={showPw ? "eyeoff" : "eye2"} s={14} />
                </button>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Yangi Parol</label><input className="form-input" type="password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Tasdiqlash</label><input className="form-input" type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} /></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn bp" onClick={() => {
                if (!pw.current) { addToast("Please enter your current password", "error"); return; }
                if (pw.next !== pw.confirm) { addToast("Passwords do not match", "error"); return; }
                addToast("Password changed!"); setPw({ current: "", next: "", confirm: "" });
              }}><I n="lock" s={14} c="#fff" />O'zgartirish</button>
            </div>
          </>
        )}
      </div>
    ),
    regional: (
      <div className="settings-section">
        {card(<I n="globe" s={17} c="#0d9488" />, "#ccfbf1", "Language", "Choose interface language",
          <div className="lang-grid" style={{ marginTop: 4 }}>
            {LANGUAGES.map(l => (
              <div key={l.code} className={`lang-option${lang === l.code ? " active" : ""}`} onClick={() => { onLang(l.code); addToast(`Til: ${l.name}`, "info"); }}>
                <span className="lang-flag">{l.flag}</span>
                <div><div className="lang-name">{l.name}</div><div className="lang-local">{l.local}</div></div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    api: null,
    danger: (
      <div className="settings-section">
        {confirmReset && <ConfirmModal title="Reset Settings" desc={<>Reset all settings to defaults?</>} onConfirm={() => addToast("Settings reset", "info")} onClose={() => setConfirmReset(false)} />}
        {confirmDel && <ConfirmModal title="Delete Account" desc={<>Are you sure you want to permanently delete this account and all data?</>} onConfirm={() => { addToast("Account deleted", "error"); setTimeout(onLogout, 1500); }} onClose={() => setConfirmDel(false)} />}
        <div className="settings-card danger-zone">
          <div className="settings-card-header">
            <div className="settings-card-icon" style={{ background: "var(--red-bg)" }}><I n="warn" s={17} c="var(--red)" /></div>
            <div><div className="settings-card-title">Xavfli Zona</div><div className="settings-card-subtitle">These actions cannot be undone.</div></div>
          </div>
          <div className="settings-card-body">
            <button className="danger-zone-btn" onClick={onLogout}><I n="logout" s={15} />Logout</button>
            <button className="danger-zone-btn" onClick={() => setConfirmReset(true)}><I n="refresh" s={15} />Reset Settings</button>
            <button className="danger-zone-btn" style={{ fontWeight: 700 }} onClick={() => setConfirmDel(true)}><I n="warn" s={15} />Delete Account</button>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="fu">
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>{T.settings}</h1>
        <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>Account, appearance, and system settings</p>
      </div>
      <div className="settings-layout">
        <div className="settings-nav">
          <div className="settings-nav-header">Konfiguratsiya</div>
          {SETTINGS_NAV.map((item, idx) => (
            <div key={item.k}>
              {idx === 5 && <div className="settings-nav-divider" />}
              <div className={`settings-nav-item${active === item.k ? " active" : ""}`} onClick={() => setActive(item.k)}>
                <I n={item.i} s={14} />{item.l}
              </div>
            </div>
          ))}
        </div>
        <div className="fu">{sections[active] || null}</div>
      </div>
    </div>
  );
}

/* ═══════════════════ ROOT ═══════════════════ */
export default function App() {
  const [user, setUser] = useState(null);

  if (!user) {
    return (
      <>
        <style>{makeCSS()}</style>
        <AuthPage onLogin={userData => setUser(userData)} />
      </>
    );
  }

  return (
    <Dashboard
      currentUser={user}
      onLogout={() => { setToken(""); setUser(null); }}
    />
  );
}