import { useState, useEffect, useCallback } from "react";

/* ═══════════════════ BASE URL ═══════════════════ */
const BASE = "https://myinven-production.up.railway.app";


/* ═══════════════════ AUTH TOKEN ═══════════════════ */
function setToken(token: string | null) {
  if (token) {
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("token");
  }
}

function getToken() {
  return localStorage.getItem("token");
}
function getCookie(name: string): string | null {
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

// ✅ FIX 1: DELETE so'rovlarda Content-Type headerini yubormaslik (500 xato sababi)
async function api(path: string, method: string = "GET", body: any = null) {
  const headers: Record<string, string> = {
    "Accept": "application/json"
  };
  // GET va DELETE uchun Content-Type kerak emas — ba'zi backendlar 500 qaytaradi
  if (method !== "GET" && method !== "DELETE") {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Token ${token}`;
  }

  const csrfToken = getCookie("csrftoken");
  if (csrfToken) {
    headers["X-CSRFToken"] = csrfToken;
  }

  const opts: { method: string; headers: Record<string, string>; credentials: RequestCredentials; body?: string } = {
    method,
    headers,
    credentials: "include" as RequestCredentials,
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    opts.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${BASE}${path}`, opts);

    if (res.status === 401) {
      console.warn("Oturum geçersiz, token temizlendi.");
      setToken(null);
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

const authAPI = {
  login: (companyToken: string, username: string, password: string) => api(`/user_app/${companyToken}/login/`, "POST", { username, password }),
  logout: () => api("/user_app/logout/", "POST"),
  users: () => api("/user_app/users/"),
  getUser: (id: number | string) => api(`/user_app/users/${id}/`),
  updateUser: (id: number | string, data: any) => api(`/user_app/users/${id}/`, "PUT", data),
  createUser: (data: any) => api("/user_app/users/", "POST", data),
  deleteUser: (id: number | string) => api(`/user_app/users/${id}/`, "DELETE"),
  companies: () => api("/user_app/companies/"),
  createCompany: (data: any) => api("/user_app/companies/", "POST", data),
  updateCompany: (id: number | string, data: any) => api(`/user_app/companies/${id}/`, "PUT", data),
  deleteCompany: (id: number | string) => api(`/user_app/companies/${id}/`, "DELETE"),
  changePassword: (data: any) => api("/user_app/users/change-password/", "POST", data),
};

const depolarAPI = {
  list: () => api("/depolar/"),
  create: (data: any) => api("/depolar/", "POST", data),
  update: (id: number | string, data: any) => api(`/depolar/${id}/`, "PUT", data),
  patch: (id: number | string, data: any) => api(`/depolar/${id}/`, "PATCH", data),
  delete: (id: number | string) => api(`/depolar/${id}/`, "DELETE"),
};

const buylistAPI = {
  list: () => api("/buylist/"),
  create: (data: any) => api("/buylist/", "POST", data),
  update: (id: number | string, data: any) => api(`/buylist/${id}/`, "PUT", data),
  patch: (id: number | string, data: any) => api(`/buylist/${id}/`, "PATCH", data),
  delete: (id: number | string) => api(`/buylist/${id}/`, "DELETE"),
  totalPrice: () => api("/buylist/total_price/"),
};

const itemlerAPI = {
  list: () => api("/itemler/"),
  create: (data: any) => api("/itemler/", "POST", data),
  update: (id: number | string, data: any) => api(`/itemler/${id}/`, "PUT", data),
  delete: (id: number | string) => api(`/itemler/${id}/`, "DELETE"),
};

const moneytypesAPI = {
  list: () => api("/moneytypes/"),
  create: (data: any) => api("/moneytypes/", "POST", data),
  delete: (id: number | string) => api(`/moneytypes/${id}/`, "DELETE"),
};

const unitlerAPI = {
  list: () => api("/unitler/"),
  create: (data: any) => api("/unitler/", "POST", data),
  delete: (id: number | string) => api(`/unitler/${id}/`, "DELETE"),
};

/* ═══════════════════ NORMALIZERS ═══════════════════ */
function normalizeDepolar(d: any, idx: number = 0) {
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

function normalizeItem(item: any) {
  return {
    id: item.id,
    name: item.name ?? item.nomi ?? item.mahsulot ?? `Item #${item.id}`,
    _raw: item,
  };
}

function normalizeMoneytype(m: any) {
  const name = m.name ?? m.type ?? m.nomi ?? m.valyuta ?? `MT #${m.id}`;
  return {
    id: m.id,
    name,
    code: m.code ?? m.kod ?? name ?? "USD",
    _raw: m,
  };
}

function normalizeUnit(u: any) {
  return {
    id: u.id,
    name: u.name ?? u.unit ?? u.nomi ?? u.birlik ?? `Unit #${u.id}`,
    _raw: u,
  };
}

function normalizeBuylist(b: any, itemler: any[] = [], moneytypes: any[] = [], unitler: any[] = []) {
  const itemId = typeof b.item === "object" ? b.item?.id : (b.item ?? null);
  const itemName = typeof b.item === "object"
    ? (b.item?.name ?? b.item?.nomi)
    : (itemler.find((i: any) => i.id === itemId)?.name ?? `Item #${itemId}`);

  const moneytypeId = typeof b.moneytype === "object" ? b.moneytype?.id : (b.moneytype ?? null);
  const moneytypeName = typeof b.moneytype === "object"
    ? (b.moneytype?.name ?? b.moneytype?.type)
    : (moneytypes.find((m: any) => m.id === moneytypeId)?.name ?? "USD");

  const unitId = typeof b.unit === "object" ? b.unit?.id : (b.unit ?? null);
  const unitName = typeof b.unit === "object"
    ? (b.unit?.name ?? b.unit?.unit)
    : (unitler.find((u: any) => u.id === unitId)?.name ?? "pcs");

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
html,body{font-family:'DM Sans',-apple-system,sans-serif;background:var(--bg);color:var(--text);font-size:14px;line-height:1.5;transition:background .25s,color .25s;overflow-x:hidden!important;width:100%;height:100%;-webkit-text-size-adjust:100%}
.app,.main,.content{overflow-x:hidden!important;max-width:100%!important;width:100%}
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
.main{margin-left:var(--sw);flex:1;display:flex;flex-direction:column;min-height:100vh;max-width:100%;overflow-x:hidden;width:100%}
.topbar{background:var(--surface);border-bottom:1px solid var(--border);height:52px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50;transition:background .25s,border-color .25s}
.tb-r{display:flex;align-items:center;gap:10px}
.content{padding:20px;flex:1}
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
.tc{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--sh);overflow-x:auto;transition:background .25s;max-width:100%}
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
.wg{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-bottom:22px;align-items:stretch}
.wc{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--sh);overflow:hidden;transition:box-shadow .15s,transform .15s,background .25s;cursor:pointer;display:flex;flex-direction:column}
.wc:hover{box-shadow:var(--sh2);transform:translateY(-3px)}
.wc:hover .wn{color:var(--blue)}
.wb{padding:16px 16px 12px;flex:1}
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
.aw{border:2px dashed var(--border2);border-radius:var(--r);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;cursor:pointer;transition:all .15s;color:var(--text4);text-align:center;background:var(--surface);min-height:220px;height:100%}
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
.intake-layout{display:grid;grid-template-columns:420px 1fr;gap:20px;align-items:start}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--sh);overflow:hidden}
.card-h{background:var(--surface2);border-bottom:1px solid var(--border);padding:10px 14px;display:flex;align-items:center;justify-content:space-between}
@media (max-width:1024px){.intake-layout{grid-template-columns:1fr}}
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
.ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;gap:12px;flex-wrap:wrap;max-width:100%}
.ph-l{flex:1;min-width:180px;max-width:100%}
.ph-r{display:flex;gap:10px;align-items:center;flex-wrap:wrap;max-width:100%}
.wdh-top{display:flex;align-items:flex-end;gap:18px;width:100%;position:relative;z-index:1;flex-wrap:wrap}
@media (max-width:640px){
  .ph{flex-direction:column;align-items:stretch;gap:15px}
  .ph-r{flex-direction:column;align-items:stretch;gap:8px}
  .ph-r .sw-wrap{width:100%!important}
  .ph-r .btn{width:100%;justify-content:center}
  .wdh-top{flex-direction:column;align-items:stretch;gap:12px}
  .wdh-top .btn{width:100%;justify-content:center}
}

/* ═══════════════════ RESPONSIVE ═══════════════════ */
@media (max-width:920px){
  .settings-layout{grid-template-columns:1fr}
  .settings-nav{position:static;display:flex;overflow-x:auto;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--border)}
  .settings-nav-item{border-left:none;border-bottom:3px solid transparent;white-space:nowrap}
  .settings-nav-item.active{border-bottom-color:var(--blue)}
  .wdh-body{grid-template-columns:1fr 1fr;gap:12px}
  .wdh-stat{border:none;padding:10px}
}

@media (max-width:768px){
  :root{--sw:0px}
  .sidebar{transform:translateX(-100%);transition:transform .3s cubic-bezier(0.4, 0, 0.2, 1);width:260px;box-shadow:20px 0 50px rgba(0,0,0,.15)}
  .sidebar.open{transform:translateX(0)}
  .main{margin-left:0}
  .topbar{padding:0 12px;height:52px}
  .content{padding:14px}
  .auth-card{grid-template-columns:1fr;min-height:auto}
  .auth-hero{display:none}
  .sg{grid-template-columns:1fr 1fr;gap:10px}
  .sg3,.sg2{grid-template-columns:1fr;gap:10px}
  .detail-grid,.rep-grid{grid-template-columns:1fr;gap:12px}
  .wdh-banner{height:auto;min-height:90px;padding:12px}
  .wdh-icon{width:44px;height:44px}
  .wdh-title{font-size:18px}
  .wdh-body{grid-template-columns:1fr;padding:12px}
  .wdh-stat{padding:10px}
  .wdh-stat:not(:last-child){border-right:none;border-bottom:1px solid var(--border)}
  .form-row{grid-template-columns:1fr;gap:10px}
  .mobile-toggle{display:flex!important;width:34px;height:34px;margin-right:8px}
  .mobile-toggle svg{width:18px;height:18px}
  
  .modal{max-width:100%;margin:0;width:100%;border-radius:20px 20px 0 0;position:fixed;bottom:0}
  .modal-backdrop{align-items:flex-end;padding:0}
  .modal-header{padding:14px 18px}
  .modal-body{padding:18px}
  .modal-footer{padding:12px 18px}
  
  .footer{flex-direction:column;gap:10px;padding:12px 16px;text-align:center}
  .fh,.fl{justify-content:center}
  .ht{font-size:10px;padding:3px 6px}
}

@media (max-width:480px){
  .sg{grid-template-columns:1fr}
  .content{padding:12px}
  .tb-r .btn{padding:6px 10px;font-size:12px}
  .tb-r .btn span{display:none}
  .ph-l h1{font-size:18px!important}
  .ph-l p{font-size:11px!important}
  .sv{font-size:18px}
  .sc{padding:12px 14px}
  .ti{font-size:11px}
  .pb{width:28px;height:28px;font-size:12px}
  .wg{grid-template-columns:1fr}
}

.mobile-toggle{display:none;width:40px;height:40px;align-items:center;justify-content:center;color:var(--text);cursor:pointer;background:var(--surface);border:1.5px solid var(--border);border-radius:12px;margin-right:8px;transition:all .2s cubic-bezier(0.4, 0, 0.2, 1);box-shadow:var(--sh);position:relative;z-index:20}
.mobile-toggle:hover{border-color:var(--blue);color:var(--blue);transform:scale(1.05);background:var(--blue-l)}
.mobile-toggle:active{transform:scale(0.95)}

.sidebar-backdrop{position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(8px);z-index:90;animation:fadeIn .3s ease;display:block}

/* Fix for horizontal scroll on some devices */
.app{overflow-x:hidden;width:100%}
img,svg{max-width:100%}
table{min-width:600px}
@media (max-width:600px){
  table{min-width:100%}
  th,td{padding:8px 12px;font-size:13px}
  .itn{font-size:13px}
  .sv{font-size:18px}
}
@media (min-width:1200px){
  .sg{grid-template-columns:repeat(4,1fr)}
}
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
  menu: "M3 12h18 M3 6h18 M3 18h18",
};

function I({ n, s = 16, c = "currentColor" }: any) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}>
      {P[n]?.split(" M").map((d: any, i: any) => <path key={i} d={i === 0 ? d : "M" + d} />)}
    </svg>
  );
}

function Toggle({ checked, onChange }: any) {
  return (
    <label className="toggle" onClick={e => e.stopPropagation()}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  );
}

function ToastList({ toasts }: any) {
  return (
    <div className="toast-stack">
      {toasts.map((t: any) => (
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

function Modal({ title, onClose, children, footer, wide }: any) {
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

function ConfirmModal({ title, desc, onConfirm, onClose }: any) {
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
  en: {
    warehouses: "Warehouses", analytics: "Analytics", intake: "Smart Intake", settings: "Settings", users: "Users",
    darkMode: "Dark Mode", lightMode: "Light Mode", logout: "Logout", createWh: "Create Warehouse", save: "Save",
    cancel: "Cancel", search: "Search...", items: "Items", moneytypes: "Currencies", units: "Units",
    deleteUser: "Delete User", deleteConfirmText: (name: string) => `Are you sure you want to delete "${name}"?`,
    deleteConfirmLabel: "Type the username to confirm:", deleteBtn: "Delete", addUser: "Add New User",
    loginTitle: "Welcome back", loginSub: "Sign in to RenoFlow", username: "Nickname", password: "Password",
    enterUsername: "Enter nickname", signIn: "Sign In →", signingIn: "Signing in...",
    totalWhs: "Total Warehouses", inventoryVal: "Inventory Value", lowStock: "Low Stock Items",
    recentShipments: "Recent Shipments", viewAll: "View All", whStats: "Warehouse Statistics",
    addBtn: "Add", editBtn: "Edit", filter: "Filter", all: "All",
    scanning: "Scanning...", detected: "Detected Products", confirmAdd: "Confirm & Add",
    profile: "Profile", appearance: "Appearance", security: "Security", general: "General",
    language: "Language", accentColor: "Accent Color", compactMode: "Compact Mode",
    changePass: "Change Password", currentPass: "Current Password", newPass: "New Password",
    statusActive: "Active", totalItems: "Total Items", acrossAll: "Across all warehouses",
    view: "View", details: "Details", value: "Value", itemsInStock: "Items in stock", low: "low",
    addWhDesc: "Create a new warehouse.",
    mainSec: "Main", refSec: "References", analytSec: "Analytics", mgmtSec: "Management",
    profileAcc: "Profile & Account", designColor: "Design and color settings",
    notifSettings: "Notifications", secPrivacy: "Security & Privacy",
    regionalSett: "Regional Settings", dangerZone: "Danger Zone",
    config: "Configuration",
    qty: "Qty", price: "Price", currency: "Currency", unit: "Unit",
    total: "Total", date: "Date", product: "Product", backBtn: "Back",
    you: "You", noResults: "No results found", addUserPrompt: "Add a new user to begin.",
  },
  uz: {
    warehouses: "Omborlar", analytics: "Tahlil", intake: "Aqlli Skan", settings: "Sozlamalar", users: "Foydalanuvchilar",
    darkMode: "Tungi rejim", lightMode: "Kunduzgi", logout: "Chiqish", createWh: "Ombor yaratish", save: "Saqlash",
    cancel: "Bekor qilish", search: "Qidirish...", items: "Mahsulotlar", moneytypes: "Valyutalar", units: "Birliklar",
    deleteUser: "O'chirish", deleteConfirmText: (name: string) => `"${name}" ni o'chirmoqchimisiz?`,
    deleteConfirmLabel: "Tasdiqlash uchun foydalanuvchi nomini yozing:", deleteBtn: "O'chirish", addUser: "Yangi foydalanuvchi",
    loginTitle: "Xush kelibsiz", loginSub: "RenoFlow tizimiga kiring", username: "Nickname", password: "Parol",
    enterUsername: "Nickname kiriting", signIn: "Kirish →", signingIn: "Kirilmoqda...",
    totalWhs: "Jami omborlar", inventoryVal: "Invertar qiymati", lowStock: "Kam qolganlar",
    recentShipments: "So'nggi harakatlar", viewAll: "Hammasi", whStats: "Ombor statistikasi",
    addBtn: "Qo'shish", editBtn: "Tahrirlash", filter: "Saralash", all: "Hammasi",
    scanning: "Skanerlanmoqda...", detected: "Topilgan mahsulotlar", confirmAdd: "Tasdiqlash va qo'shish",
    profile: "Profil", appearance: "Ko'rinish", security: "Xavfsizlik", general: "Umumiy",
    language: "Til", accentColor: "Asosiy rang", compactMode: "Ixcham ko'rinish",
    changePass: "Parolni o'zgartirish", currentPass: "Eski parol", newPass: "Yangi parol",
    statusActive: "Faol", totalItems: "Jami Mahsulotlar", acrossAll: "Barcha omborlarda",
    view: "Ko'rish", details: "Tafsilotlar", value: "Qiymat", itemsInStock: "Zaxirada", low: "kam",
    addWhDesc: "Yangi ombor yarating.",
    mainSec: "Asosiy", refSec: "Ma'lumotnomalar", analytSec: "Tahlillar", mgmtSec: "Boshqaruv",
    profileAcc: "Profil va Hisob", designColor: "Dizayn va rang sozlamalari",
    notifSettings: "Bildirishnomalar", secPrivacy: "Xavfsizlik va Maxfiylik",
    regionalSett: "Mintaqaviy sozlamalar", dangerZone: "Xavfli hudud",
    config: "Konfiguratsiya",
    qty: "Miqdor", price: "Narx", currency: "Valyuta", unit: "Birlik",
    total: "Jami", date: "Sana", product: "Mahsulot", backBtn: "Orqaga",
    you: "Siz", noResults: "Foydalanuvchilar topilmadi", addUserPrompt: "Boshlash uchun yangi foydalanuvchi qo'shing.",
  },
  ru: {
    warehouses: "Склады", analytics: "Аналитика", intake: "Скан-приход", settings: "Настройки", users: "Пользователи",
    darkMode: "Темная тема", lightMode: "Светлая", logout: "Выйти", createWh: "Создать склад", save: "Сохранить",
    cancel: "Отмена", search: "Поиск...", items: "Товары", moneytypes: "Валюты", units: "Единицы",
    deleteUser: "Удалить", deleteConfirmText: (name: string) => `Удалить "${name}"?`,
    deleteConfirmLabel: "Введите имя для подтверждения:", deleteBtn: "Удалить", addUser: "Новый пользователь",
    loginTitle: "С возвращением", loginSub: "Войти в RenoFlow", username: "Никнейм", password: "Пароль",
    enterUsername: "Введите никнейм", signIn: "Войти →", signingIn: "Вход...",
    totalWhs: "Всего складов", inventoryVal: "Стоимость запасов", lowStock: "Мало товара",
    recentShipments: "Последние поставки", viewAll: "Все", whStats: "Статистика склада",
    addBtn: "Добавить", editBtn: "Изм.", filter: "Фильтр", all: "Все",
    scanning: "Сканирование...", detected: "Найдено товаров", confirmAdd: "Подтвердить",
    profile: "Профиль", appearance: "Оформление", security: "Безопасность", general: "Общие",
    language: "Язык", accentColor: "Основной цвет", compactMode: "Компактный вид",
    changePass: "Сменить пароль", currentPass: "Старый пароль", newPass: "Новый пароль",
    statusActive: "Активно", totalItems: "Всего товаров", acrossAll: "По всем складам",
    view: "Смотреть", details: "Детали", value: "Цена", itemsInStock: "В наличии", low: "мало",
    addWhDesc: "Создать новый склад.",
    mainSec: "Главное", refSec: "Справочники", analytSec: "Аналитика", mgmtSec: "Управление",
    profileAcc: "Профиль и Аккаунт", designColor: "Настройки дизайна",
    notifSettings: "Уведомления", secPrivacy: "Безопасность",
    regionalSett: "Региональные настройки", dangerZone: "Опасная зона",
    config: "Конфигурация",
    qty: "Кол-во", price: "Цена", currency: "Валюта", unit: "Ед.",
    total: "Итого", date: "Дата", product: "Товар", backBtn: "Назад",
  },
  tr: {
    warehouses: "Depolar", analytics: "Analiz", intake: "Akıllı Giriş", settings: "Ayarlar", users: "Kullanıcılar",
    darkMode: "Karanlık Mod", lightMode: "Aydınlık", logout: "Çıkış", createWh: "Depo Oluştur", save: "Kaydet",
    cancel: "İptal", search: "Ara...", items: "Ürünler", moneytypes: "Para Birimleri", units: "Birimler",
    deleteUser: "Kullanıcıyı sil", deleteConfirmText: (name: string) => `"${name}" silinsin mi?`,
    deleteConfirmLabel: "Onay için kullanıcı adını girin:", deleteBtn: "Sil", addUser: "Yeni Kullanıcı",
    loginTitle: "Tekrar hoşgeldiniz", loginSub: "RenoFlow'a giriş yapın", username: "Kullanıcı Adı", password: "Şifre",
    enterUsername: "Kullanıcı adı girin", signIn: "Giriş Yap →", signingIn: "Giriş yapılıyor...",
    totalWhs: "Toplam Depo", inventoryVal: "Envanter Değeri", lowStock: "Kritik Stok",
    recentShipments: "Son Hareketler", viewAll: "Tümü", whStats: "Depo İstatistikleri",
    addBtn: "Ekle", editBtn: "Düzenle", filter: "Filtrele", all: "Tümü",
    scanning: "Taranıyor...", detected: "Tespit Edilenler", confirmAdd: "Onayla ve Ekle",
    profile: "Profil", appearance: "Görünüm", security: "Güvenlik", general: "Genel",
    language: "Dil", accentColor: "Vurgu Rengi", compactMode: "Sıkışık Görünüm",
    changePass: "Şifre Değiştir", currentPass: "Mevcut Şifre", newPass: "Yeni Şifre",
    statusActive: "Aktif", totalItems: "Toplam Ürün", acrossAll: "Tüm depolarda",
    view: "Görüntüle", details: "Detaylar", value: "Değer", itemsInStock: "Stokta", low: "az",
    addWhDesc: "Yeni depo oluşturun.",
    mainSec: "Ana Menü", refSec: "Referanslar", analytSec: "Analizler", mgmtSec: "Yönetim",
    profileAcc: "Profil ve Hesap", designColor: "Tasarım ayarları",
    notifSettings: "Bildirimler", secPrivacy: "Güvenlik ve Gizlilik",
    regionalSett: "Bölgesel Ayarlar", dangerZone: "Tehlikeli Bölge",
    config: "Konfigürasyon",
    qty: "Miktar", price: "Fiyat", currency: "Para Birimi", unit: "Birim",
    total: "Toplam", date: "Tarih", product: "Ürün", backBtn: "Geri",
  },
};

const SHIP_ST = {
  Delivered: { cls: "txr", ic: "ck", c: "var(--green)" },
  "In Transit": { cls: "txw", ic: "tr", c: "var(--orange)" },
  Pending: { cls: "bdb", ic: "bl", c: "var(--blue)" },
};

/* ═══════════════════ AUTH PAGE ═══════════════════ */
function AuthPage({ onLogin, lang, onLang, accent }: any) {
  const [username, setUsername] = useState("");
  const [companyToken] = useState(() => {
    return window.location.pathname.replace(/\//g, "").trim();
  });
  const [pass, setPass] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const T = STRINGS[lang] || STRINGS.en;

  async function handleLogin() {
    if (!companyToken) { setErr(T.noCompany || "Invalid company link."); return; }
    if (!username.trim()) { setErr(T.enterUsername); return; }
    setLoading(true); setErr("");
    try {
      const data = await authAPI.login(companyToken, username, pass);
      if (data.token) setToken(data.token);
      else if (data.key) setToken(data.key);
      const userData = data.user ?? { username, role: data.role ?? "staff", email: data.email ?? "", company: data.company ?? null, id: data.id ?? null };
      onLogin(userData);
    } catch (e: any) {
      setErr((e as Error).message || T.loginErr);
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <div style={{ position: "absolute", top: 20, right: 20, zIndex: 10, display: "flex", gap: 8 }}>
        {LANGUAGES.map(l => (
          <button key={l.code} onClick={() => onLang(l.code)}
            style={{
              background: lang === l.code ? "var(--surface)" : "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8, padding: "6px 10px", cursor: "pointer",
              fontSize: 14, display: "flex", alignItems: "center", gap: 6,
              boxShadow: lang === l.code ? "var(--sh)" : "none",
              color: "var(--text)"
            }}>
            <span>{l.flag}</span>
            <span style={{ fontWeight: 600 }}>{l.code.toUpperCase()}</span>
          </button>
        ))}
      </div>

      <div className="auth-bg-blob" style={{ width: 500, height: 500, background: accent, top: -150, right: -100 }} />
      <div className="auth-bg-blob" style={{ width: 400, height: 400, background: "#7c3aed", bottom: -100, left: -80 }} />
      <div className="auth-card">
        <div className="auth-panel">
          <div className="auth-logo-row">
            <div className="auth-logo-mark"><I n="wh" s={16} c="#fff" /></div>
            <div className="auth-logo-name">Reno<span>Flow</span></div>
          </div>
          <h2>{T.loginTitle}</h2>
          <p className="auth-sub">{T.loginSub}</p>
          {err && <div className="auth-err">⚠ {err}</div>}
          <div className="fld">
            <label className="fld-label">{T.username}</label>
            <div className="fld-wrap">
              <input type="text" placeholder={T.enterUsername} value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
              <span className="fic"><I n="usr" s={15} /></span>
            </div>
          </div>
          <div className="fld">
            <label className="fld-label">{T.password}</label>
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
            {loading ? T.signingIn : T.signIn}
          </button>
        </div>
        <div className="auth-hero">
          <div className="auth-hero-glow" style={{ width: 300, height: 300, top: -80, right: -80 }} />
          <div className="auth-hero-glow" style={{ width: 200, height: 200, bottom: -60, left: -60 }} />
          <div className="auth-hero-icon"><I n="wh" s={32} c="#fff" /></div>
          <h2>RenoFlow Warehouse MGT</h2>
          <p>{T.heroSubtitle || "Manage warehouses, inventory and users with ease."}</p>
          <div style={{ marginTop: 32, display: "flex", gap: 10, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
            {[T.warehouses, T.items, "Shipments", "Reports", T.users].map((f: any) => (
              <span key={f} style={{ background: "rgba(255,255,255,.18)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 20, backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,.25)" }}>{f}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ DASHBOARD ═══════════════════ */
function Dashboard({ currentUser, onUserUpdate, onLogout, lang, onLang, accent, onAccent }: any) {
  const [page, setPage] = useState("warehouses");
  const [selectedWh, setSelectedWh] = useState<any>(null);
  const [sbOpen, setSbOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem(`rf_dark_${currentUser.username}`) === "true"; } catch { return false; }
  });

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [buylist, setBuylist] = useState<any[]>([]);
  const [itemler, setItemler] = useState<any[]>([]);
  const [moneytypes, setMoneytypes] = useState<any[]>([]);
  const [unitler, setUnitler] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  const [toasts, setToasts] = useState<any[]>([]);
  const [loadingWh, setLoadingWh] = useState(false);
  const [apiError, setApiError] = useState<any>(null);
  const [settings, setSettings] = useState({
    notifLowStock: true, notifShipments: true, notifReports: false, notifEmail: true,
    compactView: false, animationsEnabled: true, autoSave: true,
    twoFactor: false, sessionTimeout: "30min", currency: "USD", timezone: "UTC+5",
  });

  const goto = (p: string, cb?: any) => {
    setPage(p);
    setSelectedWh(null);
    setSbOpen(false);
    if (cb) cb();
  };
  const [shipments, setShipments] = useState([
    { id: 20, item: "Premium Wall Latex Paint", batch: "#902-X", from: "Warehouse 1", to: "Construction", date: "2024-10-24", status: "Delivered", val: "+$1,200", pos: true },
    { id: 21, item: "Oak Flooring Planks", batch: "#122-O", from: "Warehouse 2", to: "Base", date: "2024-10-23", status: "In Transit", val: "-$4,500", pos: false },
  ]);

  const T = STRINGS[lang] || STRINGS.en;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    try { localStorage.setItem(`rf_dark_${currentUser.username}`, String(darkMode)); } catch { }
  }, [darkMode]);

  const addToast = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts((t: any[]) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t: any[]) => t.filter((x: any) => x.id !== id)), 3500);
  }, []);

  const fetchWarehouses = useCallback(async () => {
    setLoadingWh(true); setApiError(null);
    try {
      const data = await depolarAPI.list();
      const arr = Array.isArray(data) ? data : (data?.results ?? []);
      setWarehouses(arr.map((d: any, i: any) => normalizeDepolar(d, i)));
    } catch (e: any) { setApiError(`Failed to load warehouses: ${(e as Error).message}`); }
    finally { setLoadingWh(false); }
  }, []);

  const fetchItemler = useCallback(async () => {
    try {
      const data = await itemlerAPI.list();
      const arr = Array.isArray(data) ? data : (data?.results ?? []);
      setItemler(arr.map(normalizeItem));
    } catch { }
  }, []);

  const fetchMoneytypes = useCallback(async () => {
    try {
      const data = await moneytypesAPI.list();
      const arr = Array.isArray(data) ? data : (data?.results ?? []);
      setMoneytypes(arr.map(normalizeMoneytype));
    } catch { }
  }, []);

  const fetchUnitler = useCallback(async () => {
    try {
      const data = await unitlerAPI.list();
      const arr = Array.isArray(data) ? data : (data?.results ?? []);
      setUnitler(arr.map(normalizeUnit));
    } catch { }
  }, []);

  const fetchBuylist = useCallback(async (im = itemler, mm = moneytypes, um = unitler) => {
    try {
      const data = await buylistAPI.list();
      const arr = Array.isArray(data) ? data : (data?.results ?? []);
      setBuylist(arr.map((b: any) => normalizeBuylist(b, im, mm, um)));
    } catch { }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await authAPI.users();
      const arr = Array.isArray(data) ? data : (data?.results ?? []);
      setUsers(arr);
    } catch { }
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      const data = await authAPI.companies();
      const arr = Array.isArray(data) ? data : (data?.results ?? []);
      setCompanies(arr);
    } catch { }
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
        setWarehouses(wArr.map((d: any, i: any) => normalizeDepolar(d, i)));
        setItemler(iArr);
        setMoneytypes(mArr);
        setUnitler(uArr);

        const blData = await buylistAPI.list().catch(() => []);
        const blArr = Array.isArray(blData) ? blData : (blData?.results ?? []);
        setBuylist(blArr.map((b: any) => normalizeBuylist(b, iArr, mArr, uArr)));
      } catch (e: any) { setApiError(`Failed to load data: ${(e as Error).message}`); }
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
      setBuylist(arr.map((b: any) => normalizeBuylist(b, itemler, moneytypes, unitler)));
    } catch { }
  }

  async function handleLogout() {
    try { await authAPI.logout(); } catch { }
    setToken(""); onLogout();
  }

  function goToWh(wh) { setSelectedWh(wh); setPage("whdetail"); }
  function backToWarehouses() { setSelectedWh(null); setPage("warehouses"); fetchWarehouses(); refreshBuylist(); }

  const whActive = page === "warehouses" || page === "whdetail";
  const lowItems = buylist.filter((i: any) => i.low).length;

  return (
    <div className="app">
      <style>{makeCSS(accent)}</style>
      <ToastList toasts={toasts} />

      {sbOpen && <div className="sidebar-backdrop" onClick={() => setSbOpen(false)} />}
      <aside className={`sidebar ${sbOpen ? "open" : ""}`}>
        <div className="s-logo">
          <div className="s-mark"><I n="wh" s={18} c="#fff" /></div>
          <div><div className="s-name">Reno<span>Flow</span></div><div className="s-sub">Warehouse Management</div></div>
        </div>
        <nav className="s-nav">
          <div className="n-sec">{T.mainSec}</div>
          <div className={`n-item${whActive ? " active" : ""}`} onClick={() => goto("warehouses")}>
            <I n="wh" s={15} />{T.warehouses}
          </div>
          <div className={`n-item${page === "intake" ? " active" : ""}`} onClick={() => goto("intake")}>
            <I n="sc" s={15} />{T.intake}
          </div>
          <div className="n-div" />
          <div className="n-sec">{T.refSec}</div>
          <div className={`n-item${page === "itemler" ? " active" : ""}`} onClick={() => goto("itemler", fetchItemler)}>
            <I n="pkg" s={15} />{T.items}
          </div>
          <div className={`n-item${page === "moneytypes" ? " active" : ""}`} onClick={() => goto("moneytypes", fetchMoneytypes)}>
            <I n="dr" s={15} />{T.moneytypes}
          </div>
          <div className={`n-item${page === "unitler" ? " active" : ""}`} onClick={() => goto("unitler", fetchUnitler)}>
            <I n="tag" s={15} />{T.units}
          </div>
          <div className="n-div" />
          <div className="n-sec">{T.analytSec}</div>
          <div className={`n-item${page === "reports" ? " active" : ""}`} onClick={() => goto("reports")}>
            <I n="ch" s={15} />{T.analytics}
          </div>
          <div className="n-div" />
          <div className="n-sec">{T.mgmtSec}</div>
          <div className={`n-item${page === "users" ? " active" : ""}`} onClick={() => goto("users", fetchUsers)}>
            <I n="usrs" s={15} />{T.users}
          </div>
          <div className="n-div" />
          <div className="dm-row" onClick={() => setDarkMode(v => !v)}>
            <I n={darkMode ? "sun" : "moon"} s={15} />
            <span className="dm-label">{darkMode ? T.lightMode : T.darkMode}</span>
            <Toggle checked={darkMode} onChange={setDarkMode} />
          </div>
          <div className={`n-item${page === "settings" ? " active" : ""}`} onClick={() => goto("settings")}>
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
            <div className="mobile-toggle" onClick={() => setSbOpen(true)}>
              <I n="menu" s={22} />
            </div>
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
          {page === "reports" && <ReportsPage warehouses={warehouses} buylist={buylist} addToast={addToast} T={T} />}
          {page === "itemler" && <RefPage title={T.items} icon="pkg" data={itemler} setData={setItemler} api={itemlerAPI} normalize={normalizeItem} fields={[{ k: "name", l: "Name *", required: true }]} addToast={addToast} T={T} />}
          {page === "moneytypes" && <RefPage title={T.moneytypes} icon="dr" data={moneytypes} setData={setMoneytypes} api={moneytypesAPI} normalize={normalizeMoneytype} fields={[{ k: "name", l: "Name * (USD, UZS, EUR)", required: true }]} addToast={addToast} T={T} />}
          {page === "unitler" && <RefPage title={T.units} icon="tag" data={unitler} setData={setUnitler} api={unitlerAPI} normalize={normalizeUnit} fields={[{ k: "name", l: "Name *", required: true }]} addToast={addToast} T={T} />}
          {page === "users" && <UsersPage users={users} companies={companies} onRefresh={fetchUsers} addToast={addToast} T={T} currentUser={currentUser} />}
          {page === "settings" && (
            <SettingsPage settings={settings} setSettings={setSettings}
              darkMode={darkMode} onDarkMode={setDarkMode}
              accent={accent} onAccent={onAccent}
              lang={lang} onLang={onLang}
              currentUser={currentUser} onUserUpdate={onUserUpdate} addToast={addToast} onLogout={handleLogout} T={T} />
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

/* ═══════════════════ REFERENCE PAGE ═══════════════════ */
function RefPage({ title, icon, data, setData, api, normalize, fields, addToast, T }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [delItem, setDelItem] = useState<any>(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  async function addItem() {
    const firstReq = fields.find((f: any) => f.required);
    if (firstReq && !form[firstReq.k]?.trim()) return;
    setSaving(true);
    try {
      const created = await api.create(form);
      setData(prev => [...prev, normalize(created)]);
      addToast(`"${form[fields[0].k]}" added!`);
      setShowAdd(false); setForm({});
    } catch (e: any) { addToast(`Xato: ${(e as Error).message}`, "error"); }
    finally { setSaving(false); }
  }

  async function delIt(item) {
    try {
      await api.delete(item.id);
      setData(prev => prev.filter((x: any) => x.id !== item.id));
      addToast(`"${item.name}" deleted`, "error");
    } catch (e: any) { addToast(`Xato: ${(e as Error).message}`, "error"); }
  }

  return (
    <div className="fu">
      {showAdd && (
        <Modal title={`Add ${title}`} onClose={() => setShowAdd(false)}
          footer={<><button className="btn bo" onClick={() => setShowAdd(false)}>{T.cancel}</button><button className="btn bp" onClick={addItem} disabled={saving}>{saving ? "..." : T.save}</button></>}>
          {fields.map((f: any) => (
            <div className="form-group" key={f.k}>
              <label className="form-label">{f.l}</label>
              <input className="form-input" value={form[f.k] || ""} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} />
            </div>
          ))}
        </Modal>
      )}
      {delItem && <ConfirmModal title={`Delete ${title}`} desc={<>«<strong>{delItem.name}</strong>»?</>} onConfirm={() => delIt(delItem)} onClose={() => setDelItem(null)} />}

      <div className="ph">
        <div className="ph-l">
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>{title}</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>{data.length} ta yozuv</p>
        </div>
        <div className="ph-r">
          <button className="btn bp" onClick={() => { setForm({}); setShowAdd(true); }}><I n="pl" s={14} c="#fff" />Add {title}</button>
        </div>
      </div>

      <div className="tc">
        {data.length === 0 ? (
          <div className="empty-state"><I n={icon} s={38} c="var(--border2)" /><h3>{title} is empty</h3><p>Add your first record.</p></div>
        ) : (
          <table>
            <thead><tr><th>ID</th>{fields.map((f: any) => <th key={f.k}>{f.l.replace(" *", "")}</th>)}<th></th></tr></thead>
            <tbody>
              {data.map(item => (
                <tr key={item.id}>
                  <td className="dv">#{item.id}</td>
                  {fields.map((f: any) => <td key={f.k} className="itn">{item[f.k] ?? item.name ?? "—"}</td>)}
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
function WarehousePage({ warehouses, setWarehouses, buylist, loading, onRefresh, addToast, T, onOpenWh }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<any>(null);
  const [showDel, setShowDel] = useState<any>(null);
  const [openMenu, setOpenMenu] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const EMPTY = { name: "" };
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    const h = () => setOpenMenu(null);
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, []);

  const filtered = warehouses.filter((w: any) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.addr.toLowerCase().includes(search.toLowerCase())
  );

  function buildPayload(f) {
    return {
      name: f.name,
      address: "", manager: "", phone: "", type: "General",
      usd_value: "0", som_value: "0",
    };
  }

  async function addWH() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await depolarAPI.create(buildPayload(form));
      addToast(`"${form.name}" yaratildi!`);
      setShowAdd(false); setForm(EMPTY); onRefresh();
    } catch (e: any) { addToast(`Xato: ${(e as Error).message}`, "error"); }
    finally { setSaving(false); }
  }

  async function editWH() {
    if (!showEdit) return;
    setSaving(true);
    try {
      await depolarAPI.update(showEdit.id, buildPayload(form));
      addToast("Ombor yangilandi!"); setShowEdit(null); onRefresh();
    } catch (e: any) { addToast(`Xato: ${(e as Error).message}`, "error"); }
    finally { setSaving(false); }
  }

  async function delWH(wh) {
    try {
      await depolarAPI.delete(wh.id);
      addToast(`"${wh.name}" deleted`, "error"); onRefresh();
    } catch (e: any) { addToast(`Xato: ${(e as Error).message}`, "error"); }
  }

  function openEdit(wh) {
    setForm({ name: wh.name });
    setShowEdit(wh); setOpenMenu(null);
  }

  const sf = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const formBody = (
    <div className="form-group"><label className="form-label">Nomi *</label><input className="form-input" value={form.name} onChange={sf("name")} /></div>
  );

  return (
    <div className="fu">
      {showAdd && <Modal title={T.createWh} onClose={() => setShowAdd(false)} footer={<><button className="btn bo" onClick={() => setShowAdd(false)}>{T.cancel}</button><button className="btn bp" onClick={addWH} disabled={saving}>{saving ? "..." : T.save}</button></>}>{formBody}</Modal>}
      {showEdit && <Modal title="Edit Warehouse" onClose={() => setShowEdit(null)} footer={<><button className="btn bo" onClick={() => setShowEdit(null)}>{T.cancel}</button><button className="btn bp" onClick={editWH} disabled={saving}>{saving ? "..." : T.save}</button></>}>{formBody}</Modal>}
      {showDel && <ConfirmModal title="Delete Warehouse" desc={<>«<strong>{showDel.name}</strong>»?</>} onConfirm={() => delWH(showDel)} onClose={() => setShowDel(null)} />}

      <div className="ph">
        <div className="ph-l">
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>{T.warehouses}</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>{warehouses.length} {T.warehouses.toLowerCase()} {T.all.toLowerCase()}</p>
        </div>
        <div className="ph-r">
          <div className="sw-wrap" style={{ width: 200 }}>
            <span className="si-ico"><I n="sr" s={14} /></span>
            <input placeholder={T.search} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn bp" onClick={() => { setForm(EMPTY); setShowAdd(true); }}><I n="pl" s={14} c="#fff" />{T.createWh}</button>
        </div>
      </div>

      {/* ✅ FIX 2: Stat cards — always 4 fixed columns, no dynamic overflow */}
      {(() => {
        const currMap: Record<string, number> = {};
        buylist.forEach((b: any) => {
          const cur = b.moneytypeName || "?";
          const val = (Number(b.qty) || 0) * (parseFloat(String(b._raw?.narx ?? b.price ?? "0").replace(/,/g, "")) || 0);
          currMap[cur] = (currMap[cur] || 0) + val;
        });
        const currEntries = Object.entries(currMap).filter(([, v]) => v > 0);
        // Always 4 columns: Total WH | Total Items | Currency1 | Currency2 (or Low Stock)
        return (
          <div className="sg" style={{ marginBottom: 22 }}>
            <div className="sc">
              <div className="slb">{T.totalWhs}</div>
              <div className="sv">{warehouses.length}</div>
              <div style={{ marginTop: 7 }}><span className="badge bdg">{T.statusActive}</span></div>
            </div>
            <div className="sc">
              <div className="slb">{T.totalItems}</div>
              <div className="sv bl">{buylist.length}</div>
              <div className="sss">{T.acrossAll}</div>
            </div>
            {currEntries.length > 0 ? (
              // Show first 2 currencies in the last 2 columns
              [0, 1].map(i => {
                if (currEntries[i]) {
                  const [cur, total] = currEntries[i];
                  return (
                    <div key={cur} className="sc">
                      <div className="slb">{T.all} · {cur}</div>
                      <div className="sv" style={{ color: "var(--green)", fontSize: 18 }}>
                        {(total as number).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="sss">{cur}</div>
                    </div>
                  );
                }
                // If only 1 currency, fill 4th with low stock
                return (
                  <div key={`low-${i}`} className="sc">
                    <div className="slb">{T.lowStock}</div>
                    <div className="sv rd">{buylist.filter((i: any) => i.low).length}</div>
                    <div className="sss">{T.viewAll}</div>
                  </div>
                );
              })
            ) : (
              <>
                <div className="sc">
                  <div className="slb">{T.lowStock}</div>
                  <div className="sv rd">{buylist.filter((i: any) => i.low).length}</div>
                  <div className="sss">{T.viewAll}</div>
                </div>
                <div className="sc">
                  <div className="slb">{T.inventoryVal}</div>
                  <div className="sv" style={{ fontSize: 18 }}>—</div>
                  <div className="sss">No data yet</div>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* ✅ FIX 3: Warehouse cards use auto-fill responsive grid (defined in CSS .wg) */}
      {loading ? <Spinner /> : (
        <div className="wg">
          {filtered.map((w) => {
            const icColor = WC_ICON_COLOR[w.wc];
            const whBl = buylist.filter((b: any) => String(b.depolarId) === String(w.id));
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
                          <div className="wh-dd-item" onClick={() => { onOpenWh(w); setOpenMenu(null); }}><I n="eye2" s={13} />{T.view}</div>
                          <div className="wh-dd-item" onClick={() => openEdit(w)}><I n="ed" s={13} />{T.editBtn}</div>
                          <div className="wh-dd-sep" />
                          <div className="wh-dd-item del" onClick={() => { setShowDel(w); setOpenMenu(null); }}><I n="td" s={13} />{T.deleteBtn}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="wn">{w.name}</div>
                  <div style={{ height: 12 }}></div>
                </div>
                <div className="wf" onClick={e => e.stopPropagation()}>
                  <button className="btn bo" style={{ flex: 1, justifyContent: "center" }} onClick={() => onOpenWh(w)}>{T.details} →</button>
                  <button className="btn bo bs" onClick={() => openEdit(w)}><I n="ed" s={13} /></button>
                  <button className="btn bd bs" onClick={() => setShowDel(w)}><I n="td" s={13} /></button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && warehouses.length > 0 && (
            <div style={{ gridColumn: "span 3" }}><div className="empty-state"><h3>{T.noResults || "No results found"}</h3><p>"{search}" — {T.noResults || "no warehouses found"}</p></div></div>
          )}
          <div className="aw" onClick={() => { setForm(EMPTY); setShowAdd(true); }}>
            <div className="awc"><I n="pl" s={20} /></div>
            <div className="awt">{T.createWh}</div>
            <div className="aws">{T.addWhDesc}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ WAREHOUSE DETAIL ═══════════════════ */
function WarehouseDetail({ wh, setWh, warehouses, setWarehouses, buylist, setBuylist, itemler, moneytypes, unitler, addToast, T, onBack }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [delItem, setDelItem] = useState<any>(null);
  const [showEditWh, setShowEditWh] = useState(false);

  const EMPTY_BL = { item: "", _itemName: "", moneytype: "", unit: "", qty: "", narx: "" };
  const [form, setForm] = useState(EMPTY_BL);
  const [whForm, setWhForm] = useState({ name: wh.name });
  const [search, setSearch] = useState(""); const [pg, setPg] = useState(1); const PER = 7;
  const [saving, setSaving] = useState(false);

  const whBl = buylist.filter((b: any) => String(b.depolarId) === String(wh.id));
  const filtered = whBl.filter((i: any) => i.name.toLowerCase().includes(search.toLowerCase()));
  const totalPgs = Math.max(1, Math.ceil(filtered.length / PER));
  const shown = filtered.slice((pg - 1) * PER, pg * PER);
  const lowCount = whBl.filter((i: any) => i.low).length;
  const grad = WC_GRADIENT[wh.wc] || WC_GRADIENT.bl;

  const currencyTotals = moneytypes.map((m: any) => {
    const total = whBl
      .filter((b: any) => String(b.moneytypeId) === String(m.id))
      .reduce((acc: number, b: any) => {
        const qty = Number(b.qty) || 0;
        const price = parseFloat(String(b._raw?.narx ?? b.price ?? "0").replace(/,/g, "")) || 0;
        return acc + qty * price;
      }, 0);
    return { id: m.id, name: m.name, total };
  }).filter((c: any) => c.total > 0);

  function buildBlPayload(f) {
    return {
      item: Number(f.item) || undefined,
      moneytype: Number(f.moneytype) || undefined,
      unit: Number(f.unit) || undefined,
      depolar: wh.id,
      qty: Number(f.qty) || 0,
      narx: f.narx || "0",
    };
  }

  async function addBl() {
    const itemName = form._itemName?.trim() || itemler.find((i: any) => String(i.id) === String(form.item))?.name;
    if (!itemName || !form.qty) { addToast("Mahsulot va miqdorni kiriting", "error"); return; }
    setSaving(true);
    try {
      let itemId = form.item ? Number(form.item) : null;
      if (!itemId && itemName) {
        const newItem = await itemlerAPI.create({ name: itemName });
        itemId = newItem.id;
      }
      const payload = { ...buildBlPayload({ ...form, item: itemId }), item: itemId };
      const created = await buylistAPI.create(payload);
      setBuylist(prev => [...prev, normalizeBuylist(created, itemler, moneytypes, unitler)]);
      addToast("Item added to inventory!"); setShowAdd(false); setForm(EMPTY_BL);
    } catch (e: any) { addToast(`Xato: ${(e as Error).message}`, "error"); }
    finally { setSaving(false); }
  }

  async function saveEdit() {
    if (!editItem) return;
    setSaving(true);
    try {
      const updated = await buylistAPI.update(editItem.id, buildBlPayload(form));
      setBuylist(prev => prev.map((i: any) => i.id === editItem.id ? normalizeBuylist(updated, itemler, moneytypes, unitler) : i));
      addToast("Yangilandi!"); setEditItem(null);
    } catch (e: any) { addToast(`Xato: ${(e as Error).message}`, "error"); }
    finally { setSaving(false); }
  }

  async function delBl(item) {
    try {
      await buylistAPI.delete(item.id);
      setBuylist(prev => prev.filter((i: any) => i.id !== item.id));
      addToast(`"${item.name}" deleted`, "error");
    } catch (e: any) { addToast(`Xato: ${(e as Error).message}`, "error"); }
  }

  async function saveWh() {
    setSaving(true);
    try {
      const updated = await depolarAPI.update(wh.id, {
        name: whForm.name,
        address: "", manager: "", phone: "", type: "General",
        usd_value: "0", som_value: "0",
      });
      const norm = normalizeDepolar(updated, 0);
      setWh(prev => ({ ...prev, ...norm }));
      setWarehouses(ws => ws.map(w2 => w2.id === wh.id ? { ...w2, ...norm } : w2));
      addToast("Ombor yangilandi!"); setShowEditWh(false);
    } catch (e: any) { addToast(`Xato: ${(e as Error).message}`, "error"); }
    finally { setSaving(false); }
  }

  function openEdit(item) {
    setForm({
      item: item.itemId || "",
      _itemName: item.name || "",
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
          {itemler.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
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
            {moneytypes.map((m: any) => <option key={m.id} value={m.id}>{m.name} {m.code !== m.name ? `(${m.code})` : ""}</option>)}
          </select>
          {moneytypes.length === 0 && <div style={{ fontSize: 12, color: "var(--orange)", marginTop: 4 }}>⚠ First add currencies in the Currencies section</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Birlik (Unit)</label>
          <select className="form-select" value={form.unit} onChange={sf("unit")}>
            <option value="">— Birlik —</option>
            {unitler.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
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
      {delItem && <ConfirmModal title="Delete Item" desc={<>«<strong>{delItem.name}</strong>»?</>} onConfirm={() => delBl(delItem)} onClose={() => setDelItem(null)} />}
      {showEditWh && (
        <Modal title="Edit Warehouse" onClose={() => setShowEditWh(false)}
          footer={<><button className="btn bo" onClick={() => setShowEditWh(false)}>{T.cancel}</button><button className="btn bp" onClick={saveWh} disabled={saving}>{saving ? "..." : T.save}</button></>}>
          <div className="form-group"><label className="form-label">Nomi</label><input className="form-input" value={whForm.name} onChange={e => setWhForm(f => ({ ...f, name: e.target.value }))} /></div>
        </Modal>
      )}

      <div className="wdh">
        <div className="wdh-banner" style={{ background: grad, height: "auto", minHeight: 130 }}>
          <div className="wdh-glow" style={{ width: 280, height: 280, top: -100, right: -60 }} />
          <div className="wdh-top">
            <div className="wdh-icon"><I n={wh.ic} s={26} c="#fff" /></div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "rgba(255,255,255,.65)", marginBottom: 4 }}>{wh.type}</div>
              <div className="wdh-title">{wh.name}</div>
              <div className="wdh-addr"><I n="lc" s={12} c="rgba(255,255,255,.7)" />{wh.addr}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn" style={{ background: "rgba(255,255,255,.2)", color: "#fff", border: "1px solid rgba(255,255,255,.35)", backdropFilter: "blur(8px)" }} onClick={() => setShowEditWh(true)}>
                <I n="ed" s={14} c="#fff" />{T.editBtn || "Edit"}
              </button>
              <button className="btn" style={{ background: "rgba(34,197,94,.25)", color: "#fff", border: "1px solid rgba(255,255,255,.35)", backdropFilter: "blur(8px)" }}
                onClick={async () => {
                  const token = getToken();
                  const url = `${BASE}/export-buylist-as-excel/${wh.id}/`;
                  try {
                    const r = await fetch(url, { headers: { Authorization: `Token ${token}` }, credentials: "include" as RequestCredentials });
                    if (!r.ok) { addToast(`Excel xatosi: ${r.status}`, "error"); return; }
                    const blob = await r.blob();
                    const u = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = u; a.download = `${wh.name}_buylist.xlsx`;
                    document.body.appendChild(a); a.click();
                    document.body.removeChild(a); URL.revokeObjectURL(u);
                    addToast("Excel yuklab olindi!", "success");
                  } catch (err: any) { addToast(`Excel xatosi: ${err.message}`, "error"); }
                }}>
                <I n="dl" s={14} c="#fff" />Excel
              </button>
              <button className="btn" style={{ background: "rgba(255,255,255,.2)", color: "#fff", border: "1px solid rgba(255,255,255,.35)", backdropFilter: "blur(8px)" }} onClick={onBack}>
                <I n="arr" s={14} c="#fff" />{T.back || "Back"}
              </button>
            </div>
          </div>
        </div>
        <div className="wdh-body">
          {[
            { l: "Buylist", v: String(whBl.length), c: "var(--blue)", s: "items" },
            { l: "Low Stock", v: String(lowCount), c: lowCount > 0 ? "var(--red)" : "var(--green)", s: lowCount > 0 ? "warning" : "OK ✓" },
            ...currencyTotals.map((ct: any) => ({
              l: ct.name, v: ct.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), c: "var(--green)", s: ct.name
            })),
            ...(currencyTotals.length === 0 ? [{ l: "Jami", v: "0", c: "var(--text3)", s: "—" }] : []),
          ].map((stat, i) => (
            <div key={i} className="wdh-stat">
              <div className="wdh-stat-l">{stat.l}</div>
              <div className="wdh-stat-v" style={{ color: stat.c }}>{stat.v}</div>
              <div className="wdh-stat-s">{stat.s}</div>
            </div>
          ))}
        </div>
      </div>

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

      <div className="tc">
        <div className="ph" style={{ borderBottom: "1px solid var(--border)", padding: "8px 14px", marginBottom: 0 }}>
          <div className="ph-l" style={{ minWidth: "auto" }}>
            <div style={{ padding: "4px 0", fontWeight: 700, fontSize: 13, color: "var(--blue)", display: "flex", alignItems: "center", gap: 6 }}>
              <I n="bx" s={13} />Buylist ({whBl.length})
            </div>
          </div>
          <div className="ph-r">
            <div className="sw-wrap" style={{ width: 160 }}>
              <span className="si-ico"><I n="sr" s={14} /></span>
              <input placeholder={T.search} value={search} onChange={e => { setSearch(e.target.value); setPg(1); }} />
            </div>
            <button className="btn bp bs" onClick={() => { setForm(EMPTY_BL); setShowAdd(v => !v); }}>
              <I n={showAdd ? "x" : "pl"} s={13} c="#fff" />{showAdd ? (T.cancel || "Cancel") : (T.addBtn || "+ Add")}
            </button>
          </div>
        </div>

        {showAdd && (
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", background: "var(--blue-l)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 90px 100px 90px 120px auto", gap: 10, alignItems: "flex-end" }}>
              <div>
                <label className="form-label">Mahsulot *</label>
                <input
                  className="form-input"
                  list="item-datalist"
                  placeholder="Tanlang yoki yangi kiriting"
                  value={
                    form._itemName !== undefined
                      ? form._itemName
                      : (itemler.find((i: any) => String(i.id) === String(form.item))?.name || "")
                  }
                  onChange={e => {
                    const val = e.target.value;
                    const found = itemler.find((i: any) => i.name === val);
                    setForm(f => ({ ...f, item: found ? String(found.id) : "", _itemName: val }));
                  }}
                />
                <datalist id="item-datalist">
                  {itemler.map((i: any) => <option key={i.id} value={i.name} />)}
                </datalist>
              </div>
              <div>
                <label className="form-label">{T.qty} *</label>
                <input className="form-input" type="number" min="0" value={form.qty} onChange={sf("qty")} onKeyDown={e => e.key === "Enter" && addBl()} />
              </div>
              <div>
                <label className="form-label">{T.unit}</label>
                <select className="form-select" style={{ width: "100%" }} value={form.unit} onChange={sf("unit")}>
                  <option value="">— {T.unit} —</option>
                  {unitler.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">{T.price}</label>
                <input className="form-input" type="number" min="0" step="0.01" value={form.narx} onChange={sf("narx")} onKeyDown={e => e.key === "Enter" && addBl()} />
              </div>
              <div>
                <label className="form-label">{T.currency}</label>
                <select className="form-select" style={{ width: "100%" }} value={form.moneytype} onChange={sf("moneytype")}>
                  <option value="">— {T.currency} —</option>
                  {moneytypes.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <button className="btn bp" style={{ padding: "9px 14px", alignSelf: "flex-end" }} onClick={addBl} disabled={saving}>
                <I n="ck" s={14} c="#fff" />
              </button>
            </div>
          </div>
        )}

        {shown.length === 0 ? (
          <div className="empty-state"><I n="bx" s={38} c="var(--border2)" /><h3>{T.noResults || "Inventory is empty"}</h3><p>{T.addFirstItem || "Add your first item."}</p></div>
        ) : (
          <table>
            <thead><tr><th>{T.product}</th><th>{T.qty}</th><th>{T.price}</th><th>{T.currency}</th><th>{T.unit}</th><th>{T.total}</th><th>{T.date}</th><th></th></tr></thead>
            <tbody>
              {shown.map(item => (
                <tr key={item.id}>
                  <td><div className="ir">
                    <div className="ith"><I n="bx" s={17} c="var(--blue)" /></div>
                    <div>
                      <div className="itn">{item.name}</div>
                      <div className="iti">ID: {item.itemId}{item.low && <span style={{ color: "var(--red)", fontWeight: 700 }}> · {T.lowStock?.toUpperCase()}</span>}</div>
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
            {Array.from({ length: totalPgs }, (_, i) => i + 1).map((n: any) => (
              <div key={n} className={`pb${pg === n ? " act" : ""}`} onClick={() => setPg(n)}>{n}</div>
            ))}
            <div className="pb" onClick={() => setPg(p => Math.min(totalPgs, p + 1))}><I n="cr" s={12} /></div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 22, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button className="back-link" onClick={onBack}><I n="arr" s={14} />← {T.backBtn} ({T.warehouses})</button>
        <button className="btn bo" onClick={() => setShowEditWh(true)}><I n="ed" s={14} />{T.editBtn}</button>
      </div>
    </div>
  );
}

/* ═══════════════════ SHIPMENTS ═══════════════════ */
let SHIP_ID = 50;
function ShipmentsPage({ shipments, setShipments, addToast, T }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [delShip, setDelShip] = useState<any>(null);
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
      {delShip && <ConfirmModal title="Delete Shipment" desc={<>«<strong>{delShip.item}</strong>»?</>} onConfirm={() => { setShipments(s => s.filter((x: any) => x.id !== delShip.id)); addToast("Deleted", "error"); }} onClose={() => setDelShip(null)} />}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>{T.shipments}</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>{shipments.length} ta yuborish</p>
        </div>
        <button className="btn bp" onClick={() => setShowAdd(true)}><I n="pl" s={14} c="#fff" />New Shipment</button>
      </div>

      <div className="sg sg3">
        {[{ l: "Delivered", cl: "gr", f: "Delivered" }, { l: "In Transit", cl: "bl", f: "In Transit" }, { l: "Pending", cl: "rd", f: "Pending" }].map((s: any) => (
          <div key={s.l} className="sc"><div className="slb">{s.l}</div><div className={`sv ${s.cl}`}>{shipments.filter((x: any) => x.status === s.f).length}</div></div>
        ))}
      </div>

      <div className="tc">
        <div className="sh2"><div className="st2">All Shipments</div></div>
        {shipments.length === 0
          ? <div className="empty-state"><I n="ship" s={38} c="var(--border2)" /><h3>No shipments</h3></div>
          : shipments.map((s: any) => {
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

/* ═══════════════════ ANALYTICS ═══════════════════ */
function ReportsPage({ warehouses, buylist, addToast, T }: any) {
  const byWH = warehouses.map((w: any) => ({
    name: w.name,
    id: w.id,
    count: buylist.filter((b: any) => String(b.depolarId) === String(w.id)).length,
    totalVal: buylist
      .filter((b: any) => String(b.depolarId) === String(w.id))
      .reduce((acc: number, b: any) => acc + (Number(b.qty) || 0) * (parseFloat(String(b._raw?.narx ?? b.price ?? "0").replace(/,/g, "")) || 0), 0),
  }));
  const maxWH = Math.max(...byWH.map((w: any) => w.count), 1);
  const colors = ["var(--blue)", "var(--orange)", "var(--purple)", "var(--green)", "var(--red)"];

  const currMap: Record<string, number> = {};
  buylist.forEach((b: any) => {
    const cur = b.moneytypeName || "?";
    const val = (Number(b.qty) || 0) * (parseFloat(String(b._raw?.narx ?? b.price ?? "0").replace(/,/g, "")) || 0);
    currMap[cur] = (currMap[cur] || 0) + val;
  });
  const currEntries = Object.entries(currMap);
  const maxCurr = Math.max(...currEntries.map(([, v]) => v), 1);

  const topItems = [...buylist]
    .sort((a: any, b: any) => Number(b.total) - Number(a.total))
    .slice(0, 8);

  const lowItems = buylist.filter((i: any) => i.low);

  return (
    <div className="fu">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>{T.analytics || "Analytics"}</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>Barcha omborlar bo'yicha batafsil tahlil</p>
        </div>
      </div>

      <div className="sg" style={{ gridTemplateColumns: `repeat(${Math.max(3, currEntries.length + 2)}, 1fr)`, marginBottom: 20 }}>
        <div className="sc"><div className="slb">Jami Mahsulotlar</div><div className="sv">{buylist.length}</div><div style={{ marginTop: 6 }}><span className="badge bdg">Barcha omborlar</span></div></div>
        <div className="sc"><div className="slb">Omborlar</div><div className="sv bl">{warehouses.length}</div></div>
        <div className="sc"><div className="slb">Kam Zaxira</div><div className="sv rd">{lowItems.length}</div></div>
        {currEntries.map(([cur, total]) => (
          <div key={cur} className="sc">
            <div className="slb">Jami · {cur}</div>
            <div className="sv" style={{ color: "var(--green)", fontSize: 17 }}>{(total as number).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="sss">{cur}</div>
          </div>
        ))}
      </div>

      <div className="rep-grid">
        <div className="rep-chart">
          <div className="rep-chart-title">Omborlar bo'yicha mahsulotlar soni</div>
          {byWH.length === 0 ? <div style={{ color: "var(--text4)", fontSize: 13 }}>Ma'lumot yo'q</div> :
            byWH.map((w: any, i: any) => (
              <div key={i} className="bar-row">
                <div className="bar-label" style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={w.name}>{w.name}</div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(w.count / maxWH) * 100}%`, background: colors[i % colors.length] }} /></div>
                <div className="bar-val">{w.count}</div>
              </div>
            ))}
        </div>

        <div className="rep-chart">
          <div className="rep-chart-title">Valyuta bo'yicha jami qiymat</div>
          {currEntries.length === 0
            ? <div style={{ color: "var(--text4)", fontSize: 13 }}>Ma'lumot yo'q</div>
            : currEntries.map(([cur, total], i) => (
              <div key={cur} className="bar-row">
                <div className="bar-label">{cur}</div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(4, ((total as number) / maxCurr) * 100)}%`, background: colors[i % colors.length] }} /></div>
                <div className="bar-val">{(total as number).toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
              </div>
            ))}
        </div>
      </div>

      <div className="tc" style={{ marginTop: 20 }}>
        <div className="sh2"><div className="st2">Eng qimmat mahsulotlar (Top 8)</div></div>
        {topItems.length === 0
          ? <div className="empty-state"><I n="bx" s={38} c="var(--border2)" /><h3>Ma'lumot yo'q</h3></div>
          : <table>
            <thead><tr><th>Mahsulot</th><th>Ombor</th><th>Miqdor</th><th>Narx</th><th>Valyuta</th><th>Jami</th></tr></thead>
            <tbody>{topItems.map((b: any, i) => {
              const wh = warehouses.find((w: any) => String(w.id) === String(b.depolarId));
              return (
                <tr key={b.id || i}>
                  <td><div className="itn">{b.name}</div></td>
                  <td className="dv">{wh?.name || "—"}</td>
                  <td><span className={`qv${b.low ? " ql" : ""}`}>{b.qty}</span></td>
                  <td style={{ fontWeight: 500 }}>{b.price}</td>
                  <td><span className="cpill cp-u">{b.moneytypeName}</span></td>
                  <td className="tvv">{Number(b.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                </tr>
              );
            })}</tbody>
          </table>
        }
      </div>

      {lowItems.length > 0 && (
        <div className="tc" style={{ marginTop: 20 }}>
          <div className="sh2"><div className="st2" style={{ color: "var(--red)" }}>⚠ Kam Zaxira Mahsulotlar ({lowItems.length})</div></div>
          <table>
            <thead><tr><th>Mahsulot</th><th>Ombor</th><th>Miqdor</th><th>Valyuta</th></tr></thead>
            <tbody>{lowItems.map((b: any, i) => {
              const wh = warehouses.find((w: any) => String(w.id) === String(b.depolarId));
              return (
                <tr key={b.id || i}>
                  <td><div className="itn" style={{ color: "var(--red)" }}>{b.name}</div></td>
                  <td className="dv">{wh?.name || "—"}</td>
                  <td><span className="qv ql">{b.qty}</span></td>
                  <td><span className="cpill cp-u">{b.moneytypeName}</span></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ SMART INVOICE INTAKE ═══════════════════ */
let INTAKE_ID = 100;

function IntakePage({ buylist, setBuylist, warehouses, itemler, moneytypes, unitler, addToast, T }: any) {
  const [lines, setLines] = useState<any[]>([]);
  const [approved, setApproved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selWh, setSelWh] = useState(warehouses[0]?.id || "");
  const [refId, setRefId] = useState("");
  const [editingCell, setEditingCell] = useState<any>(null);
  const [showAddLine, setShowAddLine] = useState(false);
  const [newLine, setNewLine] = useState({ desc: "", qty: "", price: "", cur: moneytypes[0]?.name || "UZS" });

  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (warehouses.length && !selWh) setSelWh(warehouses[0].id);
  }, [warehouses]);

  const total = lines.reduce((acc, l) => acc + (Number(l.qty) * parseFloat(l.price || 0)), 0);

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
        credentials: "include" as RequestCredentials,
        body: formData,
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
    } catch (e: any) {
      addToast(`Tarama hatası: ${(e as Error).message}`, "error");
    } finally {
      setScanning(false);
    }
  }

  function updateLine(id, field, value) {
    setLines(prev => prev.map((l: any) => l.id === id ? { ...l, [field]: value } : l));
  }

  function deleteLine(id) {
    setLines(prev => prev.filter((l: any) => l.id !== id));
  }

  function addLine() {
    if (!newLine.desc.trim()) return;
    setLines(prev => [...prev, { id: ++INTAKE_ID, desc: newLine.desc, qty: Number(newLine.qty) || 1, price: newLine.price || "0", cur: newLine.cur, warn: false }]);
    setNewLine({ desc: "", qty: "", price: "", cur: moneytypes[0]?.name || "UZS" });
    setShowAddLine(false);
  }

  async function approve() {
    if (lines.length === 0) { addToast("No items to approve", "error"); return; }
    if (!selWh) { addToast("Ombor tanlang", "error"); return; }
    setSaving(true);
    let success = 0;
    const errors: string[] = [];

    const localMoneytypes = [...moneytypes];
    const localUnitler = [...unitler];
    const localItemler = [...itemler];

    for (const line of lines) {
      try {
        let itemId: number | null = null;
        if (line.desc) {
          const found = localItemler.find((i: any) =>
            i.name.toLowerCase().trim() === line.desc.toLowerCase().trim()
          );
          if (found) {
            itemId = found.id;
          } else {
            const newItem = await itemlerAPI.create({ name: line.desc });
            itemId = newItem.id;
            localItemler.push({ id: itemId, name: line.desc });
          }
        }
        if (!itemId) { errors.push(`${line.desc}: item yaratilmadi`); continue; }

        const curName = line.cur?.trim() || "UZS";
        let mtFound = localMoneytypes.find((m: any) =>
          m.code?.toLowerCase() === curName.toLowerCase() ||
          m.name?.toLowerCase() === curName.toLowerCase()
        );
        if (!mtFound) {
          const newMt = await moneytypesAPI.create({ name: curName });
          mtFound = { id: newMt.id, name: curName, code: curName, _raw: newMt };
          localMoneytypes.push(mtFound);
        }
        const mtId = mtFound.id;

        const unitName = line.birlik?.trim() || "dona";
        let unitFound = localUnitler.find((u: any) =>
          u.name?.toLowerCase() === unitName.toLowerCase()
        );
        if (!unitFound) {
          const newUnit = await unitlerAPI.create({ name: unitName });
          unitFound = { id: newUnit.id, name: unitName, _raw: newUnit };
          localUnitler.push(unitFound);
        }
        const unitId = unitFound.id;

        const created = await buylistAPI.create({
          item: itemId,
          moneytype: mtId,
          unit: unitId,
          depolar: Number(selWh),
          qty: Number(line.qty) || 0,
          narx: String(line.price || "0"),
        });
        setBuylist(prev => [...prev, normalizeBuylist(created, localItemler, localMoneytypes, localUnitler)]);
        success++;
      } catch (e: any) {
        errors.push(`${line.desc}: ${e.message}`);
      }
    }
    setSaving(false);
    if (errors.length > 0) console.error("Approve errors:", errors);
    addToast(`${success}/${lines.length} items added to inventory!`, success > 0 ? "success" : "error");
    if (success > 0) setApproved(true);
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
      <div className="ph" style={{ marginBottom: 16 }}>
        <div className="ph-l">
          <h1 style={{ fontWeight: 800, letterSpacing: "-.025em" }}>{T.intake || "Smart Invoice Intake"}</h1>
          <p style={{ color: "var(--text3)", marginTop: 2 }}>Fatura rasmini yuklang va AI bilan skanlang</p>
        </div>
      </div>
      <div className="intake-layout">
        <div className="card">
          <div className="card-h">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, background: "var(--blue-l)", border: "1px solid var(--blue-m)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <I n="fi" s={14} c="var(--blue)" />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", letterSpacing: ".03em" }}>
                {uploadedFile ? uploadedFile.name.toUpperCase() : "FATURA YUKLASH"}
              </span>
            </div>
            {uploadedFile && (
              <button className="ib" onClick={() => { setUploadedFile(null); setPreviewUrl(null); setLines([]); }} title="Tozalash">
                <I n="x" s={13} />
              </button>
            )}
          </div>

          <div style={{ padding: 16, background: "#f5f6f8", minHeight: 460 }}>
            {!previewUrl ? (
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
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Fatura rasmini yuklang</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 18, lineHeight: 1.6 }}>
                  Sudrab tashlang yoki bosing<br />JPG, PNG, WEBP · Max 10MB
                </div>
                <button className="btn bp" style={{ pointerEvents: "none" }}>
                  <I n="fi" s={14} c="#fff" />Fayl tanlash
                </button>
                <input id="invoice-file-input" type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={e => handleFileSelect(e.target.files!![0])} />
              </div>
            ) : (
              <div style={{ borderRadius: "var(--rs)", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,.12)", background: "#fff" }}>
                <img src={previewUrl} alt="Fatura" style={{ width: "100%", display: "block", maxHeight: 420, objectFit: "contain" }} />
              </div>
            )}
          </div>

          <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>
            <button className="btn bp" style={{ flex: 1, justifyContent: "center", fontSize: 14, padding: "10px" }} onClick={handleScan} disabled={!uploadedFile || scanning}>
              {scanning
                ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Skanlanmoqda...</>
                : <><I n="mg" s={15} c="#fff" />AI bilan Skan Qilish</>
              }
            </button>
            <button className="btn bo" onClick={() => document.getElementById("invoice-file-input").click()} title="Boshqa rasm tanlash">
              <I n="refresh" s={14} />
              <input id="invoice-file-input" type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={e => handleFileSelect(e.target.files!![0])} />
            </button>
          </div>
        </div>
        <div className="card">
          <div style={{ padding: "18px 22px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 38, height: 38, background: "var(--blue)", borderRadius: "var(--rs)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <I n="mg" s={18} c="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>AI Extraction Results</div>
                <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>
                  {scanning ? "Fatura skanlanmoqda..." : lines.length > 0 ? `${lines.length} ta mahsulot topildi.` : "Fatura yuklang va AI bilan skanlang."}
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

          {scanning && (
            <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--text3)" }}>
              <div className="spinner" style={{ margin: "0 auto 16px" }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text2)", marginBottom: 6 }}>OCR va AI ishlayapti...</div>
              <div style={{ fontSize: 12 }}>Fatura matni o'qilmoqda va tahlil qilinmoqda</div>
            </div>
          )}

          {!scanning && lines.length === 0 && (
            <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--text4)" }}>
              <I n="sc" s={42} c="var(--border2)" />
              <div style={{ marginTop: 14, fontSize: 14, fontWeight: 600, color: "var(--text3)" }}>Hali skan qilinmagan</div>
              <div style={{ fontSize: 12, marginTop: 5 }}>Chap tomonga fatura rasmini yuklang va "AI bilan Skan" tugmasini bosing</div>
            </div>
          )}

          {!scanning && lines.length > 0 && (
            <>
              <div className="sg sg3" style={{ borderBottom: "1px solid var(--border)", margin: 0 }}>
                <div style={{ padding: "14px 18px", borderRight: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text4)", marginBottom: 6 }}>{T.items || "Mahsulotlar"}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{lines.length} ta</div>
                </div>
                <div style={{ padding: "14px 18px", borderRight: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text4)", marginBottom: 6 }}>Ref ID</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", fontStyle: "italic" }}>{refId || "—"}</div>
                </div>
                <div style={{ padding: "14px 18px", background: "var(--blue-l)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--blue)", marginBottom: 6 }}>{T.totalSum || "Jami Summa"}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", letterSpacing: "-.02em" }}>{total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                </div>
              </div>

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
                      {moneytypes.length > 0
                        ? moneytypes.map((m: any) => <option key={m.id} value={m.name}>{m.name}</option>)
                        : <><option>UZS</option><option>USD</option><option>EUR</option></>
                      }
                    </select>
                    <button className="btn bp" style={{ padding: "6px 8px", justifyContent: "center" }} onClick={addLine}><I n="ck" s={13} c="#fff" /></button>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 110px 80px 36px", gap: 8, padding: "8px 18px", borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}>
                  {["MAHSULOT", "SONI", "NARX", "BIRLIK", ""].map((h, i) => (
                    <div key={i} style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text4)" }}>{h}</div>
                  ))}
                </div>

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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "16px 18px", borderTop: "1px solid var(--border)", background: "var(--surface2)" }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text4)", marginBottom: 7 }}>Omborga joylash</div>
                  <select className="form-select" style={{ width: "100%", padding: "10px 32px 10px 12px" }} value={selWh} onChange={e => setSelWh(e.target.value)}>
                    <option value="">— Ombor tanlang —</option>
                    {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text4)", marginBottom: 7 }}>Ref ID</div>
                  <input className="form-input" value={refId} onChange={e => setRefId(e.target.value)} placeholder="INV-000001" />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderTop: "1px solid var(--border)" }}>
                <button className="btn bo" style={{ color: "var(--text3)" }} onClick={() => { setLines([]); }}>Bekor qilish</button>
                <button className="btn bp" style={{ padding: "9px 20px", fontWeight: 700, fontSize: 14 }} onClick={approve} disabled={saving}>
                  {saving ? "Qo'shilmoqda..." : <><I n="ck" s={15} c="#fff" />Tasdiqlash va Inventarga Qo'shish →</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ USERS PAGE ═══════════════════ */
function UsersPage({ users, companies, onRefresh, addToast, T, currentUser }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [delUser, setDelUser] = useState<any>(null);
  const [delConfirmName, setDelConfirmName] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const EMPTY = { username: "", password: "", password2: "", role: "user" };
  const [form, setForm] = useState(EMPTY);

  const isAdmin = currentUser.role === "admin" || currentUser.role === "superadmin";

  const filtered = users.filter((u: any) => {
    const isSuper = u.role === "superadmin" || u.role === "super_admin" || u.username === "superadmin";
    if (isSuper) return false;
    return (
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    );
  });

  async function addUser() {
    if (!form.username.trim()) { addToast("Username kiriting", "error"); return; }
    if (!form.password) { addToast("Parol kiriting", "error"); return; }
    if (form.password !== form.password2) { addToast("Parollar mos kelmadi!", "error"); return; }
    if (form.password.length < 6) { addToast("Parol kamida 6 ta belgi bo'lishi kerak", "error"); return; }
    setSaving(true);
    try {
      await authAPI.createUser({
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        company: currentUser.company ? Number(currentUser.company) : null
      });
      addToast(`"${form.username}" yaratildi!`); setShowAdd(false); setForm(EMPTY); onRefresh();
    } catch (e: any) { addToast(`Xato: ${(e as Error).message}`, "error"); }
    finally { setSaving(false); }
  }

  // ✅ FIX 1 ta'siri: DELETE Content-Type yo'q → 500 yo'q
  async function delU(user: any) {
    if (!user.id) { addToast("Foydalanuvchi ID topilmadi", "error"); return; }
    setDeleting(true);
    try {
      await authAPI.deleteUser(user.id);
      addToast(`"${user.username}" muvaffaqiyatli o'chirildi`);
      onRefresh();
    } catch (e: any) {
      const msg = (e as Error).message || "";
      // Backend DB migration xatosi — usersettings jadvali yo'q
      if (msg.includes("usersettings") || msg.includes("does not exist") || msg.includes("500")) {
        addToast(`Server xatosi: Admin backendda "python manage.py migrate" buyrug'ini ishga tushirsin`, "error");
      } else {
        addToast(`Xato: ${msg}`, "error");
      }
    } finally {
      setDelUser(null);
      setDelConfirmName("");
      setDeleting(false);
    }
  }

  const rolePill = (role: any) => {
    if (role === "admin") return <span className="role-pill role-admin">Admin</span>;
    if (role === "superadmin") return <span className="role-pill role-admin">Superadmin</span>;
    return <span className="role-pill role-staff">User</span>;
  };
  const sf = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fu">
      {showAdd && (
        <Modal title={T.addUser || "Add New User"} onClose={() => { setShowAdd(false); setForm(EMPTY); }}
          footer={<><button className="btn bo" onClick={() => { setShowAdd(false); setForm(EMPTY); }}>{T.cancel}</button><button className="btn bp" onClick={addUser} disabled={saving}>{saving ? "..." : T.save}</button></>}>
          <div className="form-group">
            <label className="form-label">Username *</label>
            <input className="form-input" value={form.username} onChange={sf("username")} placeholder="username" autoFocus />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Parol *</label>
              <input className="form-input" type="password" value={form.password} onChange={sf("password")} placeholder="••••••" />
            </div>
            <div className="form-group">
              <label className="form-label">Parolni tasdiqlang *</label>
              <input className="form-input" type="password" value={form.password2} onChange={sf("password2")} placeholder="••••••"
                style={{ borderColor: form.password2 && form.password !== form.password2 ? "var(--red)" : "" }} />
              {form.password2 && form.password !== form.password2 && (
                <div style={{ fontSize: 11, color: "var(--red)", marginTop: 4 }}>Parollar mos kelmadi</div>
              )}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={form.role} onChange={sf("role")}>
              <option value="admin">Admin</option><option value="user">User</option>
            </select>
          </div>
        </Modal>
      )}
      {delUser && (
        <Modal title={T.deleteUser || "Delete User"} onClose={() => { setDelUser(null); setDelConfirmName(""); }}
          footer={<>
            <button className="btn bo" onClick={() => { setDelUser(null); setDelConfirmName(""); }}>{T.cancel}</button>
            <button className="btn bd" onClick={() => delU(delUser)}
              disabled={delConfirmName.trim() !== delUser.username || deleting}>
              {deleting ? "..." : T.deleteBtn || "Delete"}
            </button>
          </>}>
          <div className="confirm-icon"><I n="warn" s={24} c="var(--red)" /></div>
          <div style={{ textAlign: "center", marginBottom: 4 }}>
            <strong>{delUser.username}</strong> ({delUser.email || "—"}) · <span style={{ color: "var(--text3)" }}>{delUser.role}</span>
          </div>
          <div style={{ textAlign: "center", marginBottom: 16, color: "var(--text3)", fontSize: 13 }}>
            O'chirishni tasdiqlash uchun foydalanuvchi nomini yozing:
          </div>
          <div style={{ background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: "var(--rs)", padding: "8px 14px", textAlign: "center", fontWeight: 800, fontSize: 20, letterSpacing: "0.04em", color: "var(--text)", marginBottom: 14, fontFamily: "monospace" }}>
            {delUser.username}
          </div>
          <div className="form-group">
            <label className="form-label">Foydalanuvchi nomini kiriting:</label>
            <input className="form-input" value={delConfirmName}
              onChange={e => setDelConfirmName(e.target.value)}
              placeholder={delUser.username} autoFocus />
          </div>
        </Modal>
      )}

      <div className="ph">
        <div className="ph-l">
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>{T.users || "Users"}</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>{users.length} foydalanuvchi jami</p>
        </div>
        <div className="ph-r">
          <div className="sw-wrap" style={{ width: 180 }}>
            <span className="si-ico"><I n="sr" s={14} /></span>
            <input placeholder={T.search} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {isAdmin && (
            <button className="btn bp" onClick={() => setShowAdd(true)}><I n="pl" s={14} c="#fff" />{T.addUser || "Add User"}</button>
          )}
        </div>
      </div>

      <div className="sg sg2" style={{ marginBottom: 16 }}>
        <div className="sc"><div className="slb">{T.total || "Total"}</div><div className="sv">{filtered.length}</div></div>
        <div className="sc"><div className="slb">Admin</div><div className="sv rd">{filtered.filter((u: any) => u.role === "admin").length}</div></div>
      </div>

      <div className="tc">
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
          <div className="sw-wrap" style={{ maxWidth: 300 }}>
            <span className="si-ico"><I n="sr" s={14} /></span>
            <input placeholder={T.search} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state"><I n="usrs" s={38} c="var(--border2)" /><h3>{T.noResults || "No users found"}</h3><p>{T.addUserPrompt || "Add a new user to begin."}</p></div>
        ) : (
          <table>
            <thead><tr><th>{T.username}</th><th>Email</th><th>Role</th>{isAdmin && <th></th>}</tr></thead>
            <tbody>
              {filtered.map((user: any) => {
                const isSelf = user.username === currentUser.username || user.id === currentUser.id;
                return (
                  <tr key={user.id} style={isSelf ? { background: "var(--blue-l)" } : {}}>
                    <td><div className="ir">
                      <div className="av" style={{ width: 32, height: 32, fontSize: 11, flexShrink: 0, background: isSelf ? "var(--blue)" : undefined }}>
                        {user.username?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="itn">{user.username}{isSelf && <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 700, color: "var(--blue)", background: "var(--blue-l)", border: "1px solid var(--blue-m)", borderRadius: 10, padding: "1px 7px" }}>{T.you || "Sen"}</span>}</div>
                      </div>
                    </div></td>
                    <td className="dv">{user.email || "—"}</td>
                    <td>{rolePill(user.role)}</td>
                    {isAdmin && (
                      <td>
                        {!isSelf && (
                          <button className="ib red" onClick={() => { setDelUser(user); setDelConfirmName(""); }}>
                            <I n="td" s={13} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
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

function SettingsPage({ settings, setSettings, darkMode, onDarkMode, accent, onAccent, lang, onLang, currentUser, onUserUpdate, addToast, onLogout, T }: any) {
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
        {card(<I n="usr" s={17} c="var(--blue)" />, "var(--blue-l)", T.profileAcc, T.profileSub || "Manage your personal information",
          <>
            <div className="profile-avatar-area">
              <div className="profile-avatar-big">{pf.name?.slice(0, 2).toUpperCase()}</div>
              <div>
                <div className="profile-avatar-name">{pf.name}</div>
                <div className="profile-avatar-role">{pf.role} · {currentUser.email || "—"}</div>
                <div style={{ fontSize: 12, color: "var(--text4)", marginTop: 3 }}>ID: #{currentUser.id ?? "—"}</div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{T.username}</label><input className="form-input" value={pf.name} onChange={e => setPf(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={pf.email} onChange={e => setPf(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="btn bp" onClick={async () => {
              try {
                const updated = await authAPI.updateUser(currentUser.id, { username: pf.name, email: pf.email });
                onUserUpdate(updated);
                addToast(T.saveSuccess || "Muvaffaqiyatli saqlandi!");
              } catch (e: any) {
                addToast(`Xato: ${e.message}`, "error");
              }
            }}><I n="ck" s={14} c="#fff" />{T.save}</button></div>
          </>
        )}
      </div>
    ),
    appearance: (
      <div className="settings-section">
        {card(<I n={darkMode ? "moon" : "sun"} s={17} c="var(--purple)" />, "var(--purple-bg)", T.appearance, T.designColor,
          <>
            {srow(T.darkMode, "Dark interface", <Toggle checked={darkMode} onChange={onDarkMode} />)}
            {srow(T.compactMode, "Use less space", <Toggle checked={settings.compactView} onChange={v => upd("compactView", v)} />)}
            <div className="settings-row">
              <div className="settings-row-info"><div className="settings-row-label">{T.accentColor}</div></div>
              <div style={{ marginLeft: 14 }}>
                <div className="color-swatches">{ACCENT_COLORS.map(ac => (
                  <div key={ac.val} className={`color-swatch${accent === ac.val ? " active" : ""}`}
                    style={{ background: ac.val }} title={ac.name} onClick={() => { onAccent(ac.val); addToast(`${ac.name}`, "info"); }} />
                ))}</div>
              </div>
            </div>
          </>
        )}
      </div>
    ),
    notifications: (
      <div className="settings-section">
        {card(<I n="bell2" s={17} c="var(--orange)" />, "var(--orange-bg)", T.notifSettings, "",
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
        {card(<I n="key" s={17} c="var(--green)" />, "var(--green-bg)", T.changePass, "Update your password",
          <>
            <div className="form-group">
              <label className="form-label">{T.currentPass}</label>
              <div style={{ position: "relative" }}>
                <input className="form-input" type="password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} style={{ paddingRight: 38 }} />
                <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text4)" }}>
                  <I n={showPw ? "eyeoff" : "eye2"} s={14} />
                </button>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{T.newPass}</label><input className="form-input" type="password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Tasdiqlash</label><input className="form-input" type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} /></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn bp" onClick={async () => {
                if (!pw.current) { addToast("Please enter your current password", "error"); return; }
                if (pw.next !== pw.confirm) { addToast("Passwords do not match", "error"); return; }
                try {
                  await authAPI.changePassword({ current_password: pw.current, new_password: pw.next });
                  addToast(T.passSuccess || "Parol yangilandi!");
                  setPw({ current: "", next: "", confirm: "" });
                } catch (e: any) {
                  addToast(`Xato: ${e.message}`, "error");
                }
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
            {LANGUAGES.map((l: any) => (
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
          <div className="settings-nav-header">{T.config}</div>
          {SETTINGS_NAV.map((item, idx) => (
            <div key={item.k}>
              {idx === 5 && <div className="settings-nav-divider" />}
              <div className={`settings-nav-item${active === item.k ? " active" : ""}`} onClick={() => setActive(item.k)}>
                <I n={item.i} s={14} />{T[item.k] || item.l}
              </div>
            </div>
          ))}
        </div>
        <div className="fu">{(sections as any)[active] || null}</div>
      </div>
    </div>
  );
}

/* ═══════════════════ ROOT ═══════════════════ */
export default function App() {
  const [user, setUser] = useState<any>(null);
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("rf_lang_global") || "en"; } catch { return "en"; }
  });
  const [accent, setAccent] = useState(() => {
    try { return localStorage.getItem("rf_accent_global") || "#2563eb"; } catch { return "#2563eb"; }
  });

  useEffect(() => {
    try { localStorage.setItem("rf_lang_global", lang); } catch { }
  }, [lang]);

  useEffect(() => {
    try { localStorage.setItem("rf_accent_global", accent); } catch { }
  }, [accent]);

  if (!user) {
    return (
      <>
        <style>{makeCSS(accent)}</style>
        <AuthPage
          onLogin={userData => setUser(userData)}
          lang={lang}
          onLang={setLang}
          accent={accent}
        />
      </>
    );
  }

  return (
    <Dashboard
      currentUser={user}
      lang={lang}
      onLang={setLang}
      accent={accent}
      onAccent={setAccent}
      onUserUpdate={u => setUser(prev => ({ ...prev, ...u }))}
      onLogout={() => { setToken(""); setUser(null); }}
    />
  );
}