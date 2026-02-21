import { useState, useEffect, useCallback } from "react";

/* ═══════════════════ BASE URL ═══════════════════ */
const BASE = "http://127.0.0.1:8000";

/* ═══════════════════ AUTH TOKEN ═══════════════════ */
let _token = "";
function setToken(t) { _token = t; }
function getToken() { return _token; }

async function api(path, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json" };
  if (getToken()) headers["Authorization"] = `Token ${getToken()}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data?.detail || data?.non_field_errors?.[0] || `HTTP ${res.status}`), { data });
  return data;
}

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
  delete: (id) => api(`/depolar/${id}/`, "DELETE"),
};

const buylistAPI = {
  list: () => api("/buylist/"),
  create: (data) => api("/buylist/", "POST", data),
  update: (id, data) => api(`/buylist/${id}/`, "PUT", data),
  delete: (id) => api(`/buylist/${id}/`, "DELETE"),
};

function normalizeDepolar(d, idx = 0) {
  const WC = ["bl", "or", "pu"];
  const IC = ["wh", "bx", "tr"];
  return {
    id: d.id,
    name: d.name ?? d.nomi ?? "Ombor",
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

function normalizeBuylist(b) {
  const qty = Number(b.qty ?? b.miqdor ?? b.quantity ?? 0);
  const price = String(b.price ?? b.narx ?? "0");
  return {
    id: b.id, name: b.name ?? b.nomi ?? b.mahsulot ?? "Mahsulot",
    sku: b.sku ?? b.kod ?? `SKU-${b.id}`, qty,
    unit: b.unit ?? b.birlik ?? "pcs", price,
    cur: b.currency ?? b.valyuta ?? b.cur ?? "USD",
    total: b.total ? String(b.total) : String(qty * parseFloat(price.replace(/,/g, "") || 0)),
    date: b.date ?? b.created_at?.slice(0, 10) ?? new Date().toLocaleDateString(),
    low: b.low_stock ?? b.low ?? qty < 20,
    wh: b.depolar ?? b.warehouse ?? b.wh ?? null, _raw: b,
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

/* AUTH */
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

/* APP */
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

/* BUTTONS */
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

/* NAVIGATION */
.back-link{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--text3);cursor:pointer;padding:6px 0;margin-bottom:18px;transition:color .12s;border:none;background:none;font-family:inherit}
.back-link:hover{color:var(--blue)}
.breadcrumb{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text4);flex-wrap:wrap}
.breadcrumb-sep{color:var(--border2)}
.breadcrumb-active{color:var(--text2);font-weight:600}
.breadcrumb-link{color:var(--blue);cursor:pointer;font-weight:500}
.breadcrumb-link:hover{text-decoration:underline}

/* TOGGLE */
.toggle{position:relative;width:42px;height:23px;flex-shrink:0;cursor:pointer;display:block}
.toggle input{opacity:0;width:0;height:0;position:absolute}
.toggle-slider{position:absolute;inset:0;background:var(--tog-off);border-radius:23px;transition:.25s;pointer-events:none}
.toggle-slider::before{content:'';position:absolute;width:17px;height:17px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.25s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.toggle input:checked+.toggle-slider{background:var(--blue)}
.toggle input:checked+.toggle-slider::before{transform:translateX(19px)}

/* STATS */
.sg{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}
.sg3{grid-template-columns:repeat(3,1fr)}.sg2{grid-template-columns:repeat(2,1fr)}
.sc{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:16px 18px;box-shadow:var(--sh);transition:background .25s,border-color .25s}
.slb{font-size:12px;color:var(--text3);font-weight:600;margin-bottom:4px}
.sv{font-size:24px;font-weight:800;color:var(--text);letter-spacing:-.03em;line-height:1}
.sv.bl{color:var(--blue)}.sv.gr{color:var(--green)}.sv.rd{color:var(--red)}
.sss{font-size:12px;color:var(--text4);margin-top:4px}
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;font-size:12px;font-weight:600}
.bdg{background:var(--green-bg);color:var(--green-t)}.bdb{background:var(--blue-l);color:var(--blue)}

/* SEARCH */
.sw-wrap{position:relative}
.sw-wrap input{width:100%;padding:8px 12px 8px 34px;border:1px solid var(--border2);border-radius:var(--rs);font-family:inherit;font-size:14px;color:var(--text);background:var(--surface);outline:none;transition:border-color .12s}
.sw-wrap input:focus{border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-l)}
.sw-wrap input::placeholder{color:var(--text4)}
.si-ico{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text4);pointer-events:none}

/* TABLE */
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

/* WAREHOUSE CARDS */
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

/* DETAIL HERO */
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

/* DETAIL INFO CARDS */
.detail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:22px}
.info-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--sh);overflow:hidden}
.info-card-header{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;background:var(--surface2)}
.info-card-title{font-size:13px;font-weight:700;color:var(--text)}
.info-card-body{padding:16px 18px}
.info-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)}
.info-row:last-child{border-bottom:none}
.info-row-l{font-size:13px;color:var(--text3);font-weight:500}
.info-row-v{font-size:13px;font-weight:700;color:var(--text);text-align:right}

/* SHIPMENTS */
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

/* MODAL */
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(5px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .18s ease}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.modal{background:var(--surface);border-radius:14px;width:100%;max-width:500px;box-shadow:var(--sh3);animation:slideUp .22s ease;max-height:90vh;overflow-y:auto;border:1px solid var(--border)}
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

/* TOAST */
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

/* REPORTS */
.rep-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:22px}
.rep-chart{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:18px;box-shadow:var(--sh)}
.rep-chart-title{font-size:14px;font-weight:700;color:var(--text);margin-bottom:14px}
.bar-row{display:flex;align-items:center;gap:9px;margin-bottom:9px}
.bar-label{font-size:12px;color:var(--text3);width:110px;flex-shrink:0;font-weight:500}
.bar-track{flex:1;height:9px;background:var(--bg);border-radius:5px;overflow:hidden}
.bar-fill{height:100%;border-radius:5px;transition:width .8s ease}
.bar-val{font-size:12px;font-weight:700;color:var(--text);width:50px;text-align:right}

/* EMPTY */
.empty-state{text-align:center;padding:50px 20px;color:var(--text4)}
.empty-state h3{font-size:15px;font-weight:700;color:var(--text3);margin-bottom:5px}
.empty-state p{font-size:13px}

/* SETTINGS */
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
.profile-avatar-btn{font-size:12px;color:var(--blue);background:var(--blue-l);border:1px solid var(--blue-m);padding:5px 12px;border-radius:var(--rs);cursor:pointer;font-family:inherit;font-weight:600;margin-top:7px;transition:all .12s}
.sys-chips{display:flex;flex-wrap:wrap;gap:8px}
.sys-chip{background:var(--bg);border:1px solid var(--border);border-radius:20px;padding:5px 11px;font-size:12px;color:var(--text3);font-weight:500;display:flex;align-items:center;gap:6px}
.sys-chip strong{color:var(--text)}

/* INTAKE (SMART SCAN) */
.ig{display:grid;grid-template-columns:1fr 1.45fr;gap:22px;align-items:start}
.ipc{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--sh);overflow:hidden}
.ipb{background:var(--surface2);border-bottom:1px solid var(--border);padding:10px 14px;display:flex;align-items:center;justify-content:space-between}
.ipf{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--text2)}
.ibdy{padding:22px;display:flex;flex-direction:column;gap:9px}
.il{height:10px;background:var(--border);border-radius:3px}
.il-hl{height:13px;background:var(--blue-m);border:1px solid var(--blue);border-radius:3px;opacity:.6}
.il-sp{height:13px}
.ilg{display:flex;gap:8px}
.ils{height:10px;background:var(--border);border-radius:3px;flex:1}
.ilse{height:10px;background:var(--border);border-radius:3px;width:65px}
.arc{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--sh);overflow:hidden}
.arh{padding:16px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.arhl{display:flex;align-items:flex-start;gap:11px}
.ari{width:36px;height:36px;background:var(--blue);border-radius:var(--rs);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.art{font-size:16px;font-weight:700;color:var(--text)}
.ars{font-size:13px;color:var(--text3);margin-top:2px}
.rb{background:var(--green-bg);border:1px solid var(--green-t);color:var(--green-t);padding:5px 11px;border-radius:20px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:5px}
.mr2{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;padding:18px 22px;border-bottom:1px solid var(--border)}
.mll{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text4);margin-bottom:5px}
.mv2{font-size:14px;font-weight:600;color:var(--text)}
.mv2.big{font-size:20px;font-weight:800;color:var(--blue);letter-spacing:-.02em}
.lis{padding:14px 22px}
.lish{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.list{font-size:14px;font-weight:700;color:var(--text)}
.lth{display:grid;grid-template-columns:1fr 56px 96px 90px 32px;gap:8px;padding:0 0 7px;border-bottom:1px solid var(--border)}
.lch{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text4)}
.lr{display:grid;grid-template-columns:1fr 56px 96px 90px 32px;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)}
.lr:last-child{border-bottom:none}
.ld{font-size:14px;color:var(--text2);display:flex;align-items:center;gap:6px}
.lq{font-size:14px;font-weight:600;color:var(--text3)}
.lp{font-size:14px;color:var(--text2)}
.lw{width:8px;height:8px;border-radius:50%;background:#f59e0b;flex-shrink:0}
.li2{width:100%;background:var(--surface);border:1px solid var(--blue);border-radius:var(--rx);padding:5px 8px;font-family:inherit;font-size:14px;color:var(--text);outline:none}
.lcs{width:100%;padding:5px 8px;font-size:13px;border-radius:var(--rx);background:var(--surface);color:var(--text);border:1px solid var(--border2)}
.ldl{background:none;border:none;cursor:pointer;color:var(--text4);display:flex;align-items:center;justify-content:center;border-radius:4px;padding:4px}
.ldl:hover{background:var(--red-bg);color:var(--red)}
.sbar{display:grid;grid-template-columns:repeat(3,1fr) 1.3fr;gap:14px;margin-top:22px}
.sbc{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px;display:flex;align-items:center;gap:12px;box-shadow:var(--sh)}
.sbic{width:38px;height:38px;border-radius:var(--rs);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sbic-b{background:var(--blue-l)}.sbic-g{background:var(--green-bg)}.sbic-p{background:var(--purple-bg)}
.sbv{font-size:19px;font-weight:800;color:var(--text);letter-spacing:-.02em}
.sbl{font-size:12px;color:var(--text3);margin-top:1px}
.ptc{background:var(--blue);border-radius:var(--r);padding:14px 16px;display:flex;align-items:center;gap:11px}
.ptic{width:34px;height:34px;background:rgba(255,255,255,.2);border-radius:var(--rs);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ptl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.7);margin-bottom:2px}
.ptt{font-size:13px;color:#fff;line-height:1.4}

/* USERS / COMPANIES TABLE */
.role-pill{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700}
.role-admin{background:#fef3c7;color:#92400e}
.role-manager{background:var(--blue-l);color:var(--blue)}
.role-staff{background:var(--green-bg);color:var(--green-t)}

/* LOADING */
.loading-overlay{display:flex;align-items:center;justify-content:center;padding:60px;flex-direction:column;gap:12px;color:var(--text3)}
.spinner{width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.api-err{background:var(--red-bg);border:1px solid var(--red);border-radius:var(--r);padding:14px 18px;margin-bottom:16px;color:var(--red);font-size:14px;font-weight:600;display:flex;align-items:center;gap:9px}

@keyframes fu{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
.fu{animation:fu .25s ease}
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
  fl: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  sc: "M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2",
  mg: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  cl: "M15 18l-6-6 6-6", cr: "M9 18l6-6-6-6",
  arr: "M19 12H5 M12 19l-7-7 7-7",
  usr: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  lock: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
  x: "M18 6L6 18 M6 6l12 12",
  warn: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  ship: "M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3 M9 17h10l4-4v-1h-13v5 M9 17a2 2 0 0 1-2 2 2 2 0 0 1-2-2 M19 19a2 2 0 0 1-2 2 2 2 0 0 1-2-2",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  moon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  sun: "M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42 M12 5a7 7 0 1 0 0 14A7 7 0 0 0 12 5z",
  palette: "M12 22C6.49 22 2 17.51 2 12S6.49 2 12 2c5.51 0 10 4.04 10 9 0 1.38-1.12 2.5-2.5 2.5-.61 0-1.17-.23-1.58-.64-.08-.1-.13-.21-.13-.34 0-.28.22-.5.5-.5H20c1.66 0 3-1.34 3-3 M6.5 11C5.67 11 5 10.33 5 9.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11z M9.5 7C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4 11 4.67 11 5.5 10.33 7 9.5 7z M14.5 7C13.67 7 13 6.33 13 5.5S13.67 4 14.5 4 16 4.67 16 5.5 15.33 7 14.5 7z M17.5 11C16.67 11 16 10.33 16 9.5S16.67 8 17.5 8 19 8.67 19 9.5 18.33 11 17.5 11z",
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
  bld: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  usrs: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  co: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
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
  return <div className="loading-overlay"><div className="spinner" /><span>Yuklanmoqda...</span></div>;
}

function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
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
      footer={<><button className="btn bo" onClick={onClose}>Bekor</button><button className="btn bd" onClick={() => { onConfirm(); onClose(); }}>O'chirish</button></>}>
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
  { code: "de", flag: "🇩🇪", name: "German", local: "Deutsch" },
];

const STRINGS = {
  en: { warehouses: "Warehouses", shipments: "Shipments", reports: "Reports", intake: "Smart Scan", settings: "Settings", users: "Users", companies: "Companies", darkMode: "Dark Mode", lightMode: "Light Mode", logout: "Logout", createWh: "Create Warehouse", save: "Save", cancel: "Cancel", search: "Search..." },
  uz: { warehouses: "Omborlar", shipments: "Yuborishlar", reports: "Hisobotlar", intake: "Aqlli Skanerlash", settings: "Sozlamalar", users: "Foydalanuvchilar", companies: "Kompaniyalar", darkMode: "Tungi Rejim", lightMode: "Kunduzgi Rejim", logout: "Chiqish", createWh: "Ombor Yaratish", save: "Saqlash", cancel: "Bekor", search: "Qidirish..." },
  ru: { warehouses: "Склады", shipments: "Отправки", reports: "Отчёты", intake: "Сканирование", settings: "Настройки", users: "Пользователи", companies: "Компании", darkMode: "Тёмный", lightMode: "Светлый", logout: "Выйти", createWh: "Создать Склад", save: "Сохранить", cancel: "Отмена", search: "Поиск..." },
  de: { warehouses: "Lagerhäuser", shipments: "Sendungen", reports: "Berichte", intake: "Scannen", settings: "Einstellungen", users: "Benutzer", companies: "Unternehmen", darkMode: "Dunkelmodus", lightMode: "Hellmodus", logout: "Abmelden", createWh: "Lager Erstellen", save: "Speichern", cancel: "Abbrechen", search: "Suchen..." },
};

let LI_ID = 50;
const LI_DEF = [
  { id: 1, desc: "Oak Hardwood Planks (Grade A)", qty: 120, price: "28.50", cur: "USD", warn: false },
  { id: 2, desc: "High-Performance Wood Glue 5L", qty: 10, price: "45.00", cur: "USD", warn: false },
  { id: 3, desc: "Finishing Wax (Satin Clear)", qty: 15, price: "18.99", cur: "USD", warn: false },
  { id: 4, desc: "Premium Sandpaper Grit 220", qty: 50, price: "2.15", cur: "USD", warn: true },
];

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
    if (!username.trim()) { setErr("Username kiriting"); return; }
    setLoading(true); setErr("");
    try {
      const data = await authAPI.login(username, pass);
      // Django token auth returns { token: "..." }
      if (data.token) setToken(data.token);
      // Get user info
      const userData = data.user || { username, role: data.role ?? "staff", email: data.email ?? "", company: data.company ?? null, id: data.id ?? null };
      onLogin(userData);
    } catch (e) {
      setErr(e.message || "Login xatosi. Username va parolni tekshiring.");
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
          <h2>Xush kelibsiz</h2>
          <p className="auth-sub">Ombor boshqaruv tizimiga kirish</p>
          {err && <div className="auth-err">⚠ {err}</div>}
          <div className="fld">
            <label className="fld-label">Username</label>
            <div className="fld-wrap">
              <input type="text" placeholder="username" value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
              <span className="fic"><I n="usr" s={15} /></span>
            </div>
          </div>
          <div className="fld">
            <label className="fld-label">Parol</label>
            <div className="fld-wrap">
              <input type={showPw ? "text" : "password"} placeholder="••••••••"
                value={pass} onChange={e => setPass(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
              <span className="fic" style={{ pointerEvents: "auto", cursor: "pointer" }}
                onClick={() => setShowPw(v => !v)}>
                <I n={showPw ? "eyeoff" : "eye2"} s={15} />
              </span>
            </div>
          </div>
          <button className="sub-btn" onClick={handleLogin} disabled={loading}>
            {loading ? "Tekshirilmoqda..." : "Kirish →"}
          </button>
          <div style={{ marginTop: 14, fontSize: 12, color: "var(--text4)", textAlign: "center" }}>
            API: <code style={{ color: "var(--blue)" }}>{BASE}/user_app/login/</code>
          </div>
        </div>
        <div className="auth-hero">
          <div className="auth-hero-glow" style={{ width: 300, height: 300, top: -80, right: -80 }} />
          <div className="auth-hero-glow" style={{ width: 200, height: 200, bottom: -60, left: -60 }} />
          <div className="auth-hero-icon"><I n="wh" s={32} c="#fff" /></div>
          <h2>RenoFlow Warehouse MGT</h2>
          <p>Omborlar, buylist va foydalanuvchilarni real API orqali boshqaring.</p>
          <div style={{ marginTop: 32, display: "flex", gap: 10, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
            {["Omborlar /depolar/", "Buylist /buylist/", "Users /user_app/users/", "Companies"].map(f => (
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
  const [darkMode, setDarkMode] = useState(false);
  const [accent, setAccent] = useState("#2563eb");
  const [lang, setLang] = useState("uz");
  const [warehouses, setWarehouses] = useState([]);
  const [buylist, setBuylist] = useState([]);
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
  // Local shipments (no API endpoint shown)
  const [shipments, setShipments] = useState([
    { id: 20, item: "Premium Wall Latex Paint", batch: "#902-X", from: "Ombor 1", to: "Qurilish", date: "2024-10-24", status: "Delivered", val: "+$1,200", pos: true },
    { id: 21, item: "Oak Flooring Planks", batch: "#122-O", from: "Ombor 2", to: "Baza", date: "2024-10-23", status: "In Transit", val: "-$4,500", pos: false },
  ]);

  const T = STRINGS[lang] || STRINGS.uz;

  useEffect(() => { document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light"); }, [darkMode]);

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
    } catch (e) { setApiError(`Omborlar yuklanmadi: ${e.message}`); }
    finally { setLoadingWh(false); }
  }, []);

  const fetchBuylist = useCallback(async () => {
    try {
      const data = await buylistAPI.list();
      const arr = Array.isArray(data) ? data : (data?.results ?? []);
      setBuylist(arr.map(normalizeBuylist));
    } catch { /* optional */ }
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
    fetchWarehouses();
    fetchBuylist();
    fetchUsers();
    fetchCompanies();
  }, []);

  async function handleLogout() {
    try { await authAPI.logout(); } catch { /* ignore */ }
    setToken("");
    onLogout();
  }

  function goToWh(wh) { setSelectedWh(wh); setPage("whdetail"); }
  function backToWarehouses() { setSelectedWh(null); setPage("warehouses"); fetchWarehouses(); }

  const whActive = page === "warehouses" || page === "whdetail";
  const lowItems = buylist.filter(i => i.low).length;

  return (
    <div className="app">
      <style>{makeCSS(accent)}</style>
      <ToastList toasts={toasts} />

      <aside className="sidebar">
        <div className="s-logo">
          <div className="s-mark"><I n="wh" s={18} c="#fff" /></div>
          <div><div className="s-name">Reno<span>Flow</span></div><div className="s-sub">Ombor MGT · API v2</div></div>
        </div>
        <nav className="s-nav">
          <div className="n-sec">Asosiy</div>
          <div className={`n-item${whActive ? " active" : ""}`} onClick={() => { setPage("warehouses"); setSelectedWh(null); }}>
            <I n="wh" s={15} />{T.warehouses}
          </div>
          <div className={`n-item${page === "shipments" ? " active" : ""}`} onClick={() => { setPage("shipments"); setSelectedWh(null); }}>
            <I n="ship" s={15} />{T.shipments}
          </div>
          <div className="n-div" />
          <div className="n-sec">Analitika</div>
          <div className={`n-item${page === "reports" ? " active" : ""}`} onClick={() => { setPage("reports"); setSelectedWh(null); }}>
            <I n="ch" s={15} />{T.reports}
          </div>
          <div className={`n-item${page === "intake" ? " active" : ""}`} onClick={() => { setPage("intake"); setSelectedWh(null); }}>
            <I n="sc" s={15} />{T.intake}
          </div>
          <div className="n-div" />
          <div className="n-sec">Boshqaruv</div>
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
            <button className="ib" title="Yangilash" onClick={() => { fetchWarehouses(); fetchBuylist(); }}>
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
                <I n="refresh" s={13} />Qayta urinish
              </button>
            </div>
          )}
          {page === "warehouses" && <WarehousePage warehouses={warehouses} setWarehouses={setWarehouses} buylist={buylist} loading={loadingWh} onRefresh={fetchWarehouses} addToast={addToast} T={T} onOpenWh={goToWh} />}
          {page === "whdetail" && selectedWh && <WarehouseDetail wh={selectedWh} setWh={setSelectedWh} warehouses={warehouses} setWarehouses={setWarehouses} buylist={buylist} setBuylist={setBuylist} addToast={addToast} T={T} onBack={backToWarehouses} />}
          {page === "shipments" && <ShipmentsPage shipments={shipments} setShipments={setShipments} addToast={addToast} T={T} />}
          {page === "reports" && <ReportsPage warehouses={warehouses} buylist={buylist} shipments={shipments} addToast={addToast} T={T} />}
          {page === "intake" && <IntakePage buylist={buylist} setBuylist={setBuylist} warehouses={warehouses} addToast={addToast} T={T} />}
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
            <div className="ht">RENOFLOW API</div>
            <div className="hs"><span className="od" />&nbsp;{BASE}&nbsp;·&nbsp;<span style={{ color: "var(--green)", fontWeight: 700 }}>{warehouses.length} ombor</span></div>
          </div>
          <div className="fc">© 2024 RenoFlow Systems · 2.0.0-api-full</div>
          <div className="fl">
            <span className="fli" onClick={() => addToast("API Docs", "info")}>API Docs</span>
            <span className="fli" onClick={() => addToast("Swagger: /swagger/", "info")}>Swagger</span>
          </div>
        </footer>
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

  useEffect(() => { const h = () => setOpenMenu(null); window.addEventListener("click", h); return () => window.removeEventListener("click", h); }, []);

  const filtered = warehouses.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.addr.toLowerCase().includes(search.toLowerCase())
  );

  function buildPayload(f) {
    return { name: f.name, address: f.addr, manager: f.manager, phone: f.phone, type: f.type, usd_value: f.usd || "0", som_value: f.som || "0" };
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
      addToast(`"${wh.name}" o'chirildi`, "error"); onRefresh();
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
        <div className="form-group"><label className="form-label">USD</label><input className="form-input" value={form.usd} onChange={sf("usd")} /></div>
        <div className="form-group"><label className="form-label">SOM</label><input className="form-input" value={form.som} onChange={sf("som")} /></div>
      </div>
    </>
  );

  return (
    <div className="fu">
      {showAdd && <Modal title={T.createWh} onClose={() => setShowAdd(false)} footer={<><button className="btn bo" onClick={() => setShowAdd(false)}>{T.cancel}</button><button className="btn bp" onClick={addWH} disabled={saving}>{saving ? "..." : T.save}</button></>}>{formBody}</Modal>}
      {showEdit && <Modal title="Omborni Tahrirlash" onClose={() => setShowEdit(null)} footer={<><button className="btn bo" onClick={() => setShowEdit(null)}>{T.cancel}</button><button className="btn bp" onClick={editWH} disabled={saving}>{saving ? "..." : T.save}</button></>}>{formBody}</Modal>}
      {showDel && <ConfirmModal title="Omborni o'chirish" desc={<>«<strong>{showDel.name}</strong>»ni o'chirmoqchimisiz?</>} onConfirm={() => delWH(showDel)} onClose={() => setShowDel(null)} />}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>{T.warehouses}</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>{warehouses.length} ta ombor · /depolar/ API</p>
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
        <div className="sc"><div className="slb">Jami Omborlar</div><div className="sv">{warehouses.length}</div><div style={{ marginTop: 7 }}><span className="badge bdg">Hammasi Faol</span></div></div>
        <div className="sc"><div className="slb">Jami Buylist</div><div className="sv bl">{buylist.length}</div><div className="sss">Barcha omborlarda</div></div>
        <div className="sc"><div className="slb">Kam Zaxira</div><div className="sv rd">{buylist.filter(i => i.low).length}</div><div className="sss">Diqqat talab</div></div>
      </div>

      {loading ? <Spinner /> : (
        <div className="wg">
          {filtered.map((w, idx) => {
            const icColor = WC_ICON_COLOR[w.wc];
            const whBl = buylist.filter(b => String(b.wh) === String(w.id));
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
                          <div className="wh-dd-item" onClick={() => openEdit(w)}><I n="ed" s={13} />Tahrirlash</div>
                          <div className="wh-dd-sep" />
                          <div className="wh-dd-item del" onClick={() => { setShowDel(w); setOpenMenu(null); }}><I n="td" s={13} />O'chirish</div>
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
            <div style={{ gridColumn: "span 3" }}><div className="empty-state"><h3>Natija topilmadi</h3><p>"{search}" bo'yicha ombor yo'q</p></div></div>
          )}
          <div className="aw" onClick={() => { setForm(EMPTY); setShowAdd(true); }}>
            <div className="awc"><I n="pl" s={20} /></div>
            <div className="awt">Ombor qo'shish</div>
            <div className="aws">Yangi ombor yarating.</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ WAREHOUSE DETAIL ═══════════════════ */
function WarehouseDetail({ wh, setWh, warehouses, setWarehouses, buylist, setBuylist, addToast, T, onBack }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [delItem, setDelItem] = useState(null);
  const [showEditWh, setShowEditWh] = useState(false);
  const EMPTY_ITEM = { name: "", sku: "", qty: "", unit: "pcs", price: "", cur: "USD" };
  const [form, setForm] = useState(EMPTY_ITEM);
  const [whForm, setWhForm] = useState({ name: wh.name, addr: wh.addr, usd: wh.usd.replace("$", ""), som: String(wh.som), manager: wh.manager, phone: wh.phone, type: wh.type });
  const [search, setSearch] = useState(""); const [pg, setPg] = useState(1); const PER = 7;
  const [saving, setSaving] = useState(false);

  const whBl = buylist.filter(b => String(b.wh) === String(wh.id));
  const filtered = whBl.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()));
  const totalPgs = Math.max(1, Math.ceil(filtered.length / PER));
  const shown = filtered.slice((pg - 1) * PER, pg * PER);
  const lowCount = whBl.filter(i => i.low).length;
  const grad = WC_GRADIENT[wh.wc] || WC_GRADIENT.bl;

  async function addItem() {
    if (!form.name || !form.qty) return;
    setSaving(true);
    try {
      const created = await buylistAPI.create({
        name: form.name, sku: form.sku || `SKU-${Date.now()}`,
        qty: Number(form.qty), unit: form.unit, price: form.price,
        currency: form.cur, depolar: wh.id, low_stock: Number(form.qty) < 20,
      });
      setBuylist(prev => [...prev, normalizeBuylist(created)]);
      addToast(`"${form.name}" qo'shildi!`); setShowAdd(false); setForm(EMPTY_ITEM);
    } catch (e) { addToast(`Xato: ${e.message}`, "error"); }
    finally { setSaving(false); }
  }

  async function saveEdit() {
    if (!editItem) return;
    setSaving(true);
    try {
      const updated = await buylistAPI.update(editItem.id, {
        name: form.name, sku: form.sku, qty: Number(form.qty),
        unit: form.unit, price: form.price, currency: form.cur,
        depolar: wh.id, low_stock: Number(form.qty) < 20,
      });
      setBuylist(prev => prev.map(i => i.id === editItem.id ? normalizeBuylist(updated) : i));
      addToast("Mahsulot yangilandi!"); setEditItem(null);
    } catch (e) { addToast(`Xato: ${e.message}`, "error"); }
    finally { setSaving(false); }
  }

  async function delBl(item) {
    try {
      await buylistAPI.delete(item.id);
      setBuylist(prev => prev.filter(i => i.id !== item.id));
      addToast(`"${item.name}" o'chirildi`, "error");
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
    setForm({ name: item.name, sku: item.sku, qty: String(item.qty), unit: item.unit, price: item.price, cur: item.cur });
    setEditItem(item);
  }

  const sf = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const inp = (extra) => ({ width: "100%", padding: "8px 12px", border: "1.5px solid var(--border2)", borderRadius: "var(--rs)", fontFamily: "inherit", fontSize: 14, color: "var(--text)", background: "var(--surface)", outline: "none", ...extra });
  const sel = { padding: "8px 10px", border: "1px solid var(--border2)", borderRadius: "var(--rs)", fontFamily: "inherit", fontSize: 13, color: "var(--text)", background: "var(--surface)" };

  return (
    <div className="fu">
      {editItem && (
        <Modal title="Mahsulotni Tahrirlash" onClose={() => setEditItem(null)}
          footer={<><button className="btn bo" onClick={() => setEditItem(null)}>{T.cancel}</button><button className="btn bp" onClick={saveEdit} disabled={saving}>{saving ? "..." : T.save}</button></>}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Nomi</label><input className="form-input" value={form.name} onChange={sf("name")} /></div>
            <div className="form-group"><label className="form-label">SKU</label><input className="form-input" value={form.sku} onChange={sf("sku")} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Miqdor</label><input className="form-input" type="number" value={form.qty} onChange={sf("qty")} /></div>
            <div className="form-group"><label className="form-label">Narx</label><input className="form-input" value={form.price} onChange={sf("price")} /></div>
          </div>
          <div className="form-group"><label className="form-label">Valyuta</label><select className="form-select" value={form.cur} onChange={sf("cur")}><option>USD</option><option>SOM</option></select></div>
        </Modal>
      )}
      {delItem && <ConfirmModal title="Mahsulotni o'chirish" desc={<>«<strong>{delItem.name}</strong>»ni o'chirmoqchimisiz?</>} onConfirm={() => delBl(delItem)} onClose={() => setDelItem(null)} />}
      {showEditWh && (
        <Modal title="Omborni Tahrirlash" onClose={() => setShowEditWh(false)}
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
                <I n="ed" s={14} c="#fff" />Tahrirlash
              </button>
              <button className="btn" style={{ background: "rgba(255,255,255,.2)", color: "#fff", border: "1px solid rgba(255,255,255,.35)", backdropFilter: "blur(8px)" }} onClick={onBack}>
                <I n="arr" s={14} c="#fff" />Orqaga
              </button>
            </div>
          </div>
        </div>
        <div className="wdh-body">
          {[
            { l: "Buylist", v: String(whBl.length), c: "var(--blue)", s: "ta mahsulot" },
            { l: "Kam Zaxira", v: String(lowCount), c: lowCount > 0 ? "var(--red)" : "var(--green)", s: lowCount > 0 ? "diqqat" : "Yaxshi ✓" },
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

      {/* Table */}
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
            <button className="btn bp bs" onClick={() => { setShowAdd(v => !v); setForm(EMPTY_ITEM); }}>
              <I n={showAdd ? "x" : "pl"} s={13} c="#fff" />{showAdd ? "Bekor" : "+ Qo'shish"}
            </button>
          </div>
        </div>

        {showAdd && (
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", background: "var(--blue-l)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 120px 80px 40px", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <input style={inp({ border: "1.5px solid var(--blue)" })} placeholder="Mahsulot nomi" value={form.name} onChange={sf("name")} onKeyDown={e => e.key === "Enter" && addItem()} />
              <input style={inp()} placeholder="Miqdor" type="number" value={form.qty} onChange={sf("qty")} />
              <input style={inp()} placeholder="Narx" value={form.price} onChange={sf("price")} />
              <select style={sel} value={form.cur} onChange={sf("cur")}><option>USD</option><option>SOM</option></select>
              <button className="btn bp" style={{ padding: "7px 8px", justifyContent: "center" }} onClick={addItem} disabled={saving}>
                <I n="ck" s={14} c="#fff" />
              </button>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600 }}>SKU:</span>
              <input style={{ ...inp(), width: 140 }} placeholder="ixtiyoriy" value={form.sku} onChange={sf("sku")} />
              <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, marginLeft: 6 }}>Birlik:</span>
              <select style={sel} value={form.unit} onChange={sf("unit")}>
                <option>pcs</option><option>m²</option><option>boxes</option><option>cans</option><option>kg</option>
              </select>
            </div>
          </div>
        )}

        {shown.length === 0 ? (
          <div className="empty-state"><I n="bx" s={38} c="var(--border2)" /><h3>Buylist bo'sh</h3><p>Birinchi mahsulotni qo'shing.</p></div>
        ) : (
          <table>
            <thead><tr><th>Mahsulot</th><th>Miqdor</th><th>Narx</th><th>Valyuta</th><th>Jami</th><th>Sana</th><th></th></tr></thead>
            <tbody>
              {shown.map(item => (
                <tr key={item.id}>
                  <td><div className="ir">
                    <div className="ith"><I n="bx" s={17} c="var(--blue)" /></div>
                    <div>
                      <div className="itn">{item.name}</div>
                      <div className="iti">{item.sku}{item.low && <span style={{ color: "var(--red)", fontWeight: 700 }}> · KAM</span>}</div>
                    </div>
                  </div></td>
                  <td><span className={`qv${item.low ? " ql" : ""}`}>{item.qty}</span> <span style={{ fontSize: 12, color: "var(--text4)" }}>{item.unit}</span></td>
                  <td style={{ fontWeight: 500 }}>{item.price}</td>
                  <td><span className={`cpill cp-${item.cur === "USD" ? "u" : "s"}`}>{item.cur}</span></td>
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
        <button className="btn bo" onClick={() => setShowEditWh(true)}><I n="ed" s={14} />Omborni Tahrirlash</button>
      </div>
    </div>
  );
}

/* ═══════════════════ SHIPMENTS ═══════════════════ */
function ShipmentsPage({ shipments, setShipments, addToast, T }) {
  const [showAdd, setShowAdd] = useState(false);
  const [delShip, setDelShip] = useState(null);
  const [form, setForm] = useState({ item: "", from: "", to: "", val: "", status: "Pending" });

  function addShip() {
    if (!form.item) return;
    const id = ++LI_ID;
    setShipments(s => [...s, {
      id, item: form.item, batch: `#${id}`, from: form.from, to: form.to,
      date: new Date().toLocaleDateString(), status: form.status,
      val: form.val || "+$0", pos: form.status !== "In Transit",
    }]);
    addToast("Yuborish yaratildi!"); setShowAdd(false);
    setForm({ item: "", from: "", to: "", val: "", status: "Pending" });
  }

  return (
    <div className="fu">
      {showAdd && (
        <Modal title="Yangi Yuborish" onClose={() => setShowAdd(false)}
          footer={<><button className="btn bo" onClick={() => setShowAdd(false)}>{T.cancel}</button><button className="btn bp" onClick={addShip}><I n="pl" s={14} c="#fff" />Yaratish</button></>}>
          <div className="form-group"><label className="form-label">Mahsulot Nomi *</label><input className="form-input" value={form.item} onChange={e => setForm(f => ({ ...f, item: e.target.value }))} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Qayerdan</label><input className="form-input" value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Qayerga</label><input className="form-input" value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Qiymat</label><input className="form-input" value={form.val} onChange={e => setForm(f => ({ ...f, val: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Holat</label>
              <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option>Pending</option><option>In Transit</option><option>Delivered</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
      {delShip && <ConfirmModal title="Yuborishni o'chirish" desc={<>«<strong>{delShip.item}</strong>»ni o'chirmoqchimisiz?</>} onConfirm={() => { setShipments(s => s.filter(x => x.id !== delShip.id)); addToast("O'chirildi", "error"); }} onClose={() => setDelShip(null)} />}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>{T.shipments}</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>{shipments.length} ta yuborish</p>
        </div>
        <button className="btn bp" onClick={() => setShowAdd(true)}><I n="pl" s={14} c="#fff" />Yangi Yuborish</button>
      </div>

      <div className="sg sg3">
        {[{ l: "Yetkazildi", cl: "gr", f: "Delivered" }, { l: "Yo'lda", cl: "bl", f: "In Transit" }, { l: "Kutilmoqda", cl: "rd", f: "Pending" }].map(s => (
          <div key={s.l} className="sc"><div className="slb">{s.l}</div><div className={`sv ${s.cl}`}>{shipments.filter(x => x.status === s.f).length}</div></div>
        ))}
      </div>

      <div className="tc">
        <div className="sh2"><div className="st2">Barcha Yuborishlar</div></div>
        {shipments.length === 0
          ? <div className="empty-state"><I n="ship" s={38} c="var(--border2)" /><h3>Yuborish yo'q</h3></div>
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
  const byWH = warehouses.map(w => ({ name: w.name.split(" ").slice(0, 2).join(" "), count: buylist.filter(b => String(b.wh) === String(w.id)).length }));
  const maxWH = Math.max(...byWH.map(w => w.count), 1);
  const colors = ["var(--blue)", "var(--orange)", "var(--purple)", "var(--green)"];

  return (
    <div className="fu">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>{T.reports}</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>Barcha omborlar bo'yicha analitika</p>
        </div>
        <button className="btn bp" onClick={() => addToast("PDF eksport!", "info")}><I n="dl" s={14} c="#fff" />PDF Eksport</button>
      </div>
      <div className="sg">
        <div className="sc"><div className="slb">Jami Buylist</div><div className="sv">{buylist.length}</div><div style={{ marginTop: 6 }}><span className="badge bdg">↑ +4.2%</span></div></div>
        <div className="sc"><div className="slb">Omborlar</div><div className="sv bl">{warehouses.length}</div></div>
        <div className="sc"><div className="slb">Yuborishlar</div><div className="sv" style={{ color: "var(--purple)" }}>{shipments.length}</div></div>
        <div className="sc"><div className="slb">Kam Zaxira</div><div className="sv rd">{buylist.filter(i => i.low).length}</div></div>
      </div>
      <div className="rep-grid">
        <div className="rep-chart">
          <div className="rep-chart-title">Ombor bo'yicha mahsulotlar</div>
          {byWH.map((w, i) => (
            <div key={i} className="bar-row">
              <div className="bar-label">{w.name}</div>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(w.count / maxWH) * 100}%`, background: colors[i % colors.length] }} /></div>
              <div className="bar-val">{w.count}</div>
            </div>
          ))}
        </div>
        <div className="rep-chart">
          <div className="rep-chart-title">Buylist tahlili</div>
          {[
            { label: "USD Mahsulotlar", count: buylist.filter(i => i.cur === "USD").length, color: "var(--green)" },
            { label: "SOM Mahsulotlar", count: buylist.filter(i => i.cur === "SOM").length, color: "var(--orange)" },
            { label: "Kam Zaxira", count: buylist.filter(i => i.low).length, color: "var(--red)" },
            { label: "Yetkazildi", count: shipments.filter(s => s.status === "Delivered").length, color: "var(--blue)" },
          ].map((r, i) => (
            <div key={i} className="bar-row">
              <div className="bar-label">{r.label}</div>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(5, (r.count / Math.max(buylist.length, 1)) * 100)}%`, background: r.color }} /></div>
              <div className="bar-val">{r.count}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="tc">
        <div className="sh2"><div className="st2">Yuborishlar Jurnali</div></div>
        <table><thead><tr><th>Mahsulot</th><th>Marshrut</th><th>Sana</th><th>Holat</th><th>Qiymat</th></tr></thead>
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

/* ═══════════════════ SMART INTAKE / SCAN ═══════════════════ */
function IntakePage({ buylist, setBuylist, warehouses, addToast, T }) {
  const [items, setItems] = useState(LI_DEF);
  const [approved, setApproved] = useState(false);
  const [nl, setNl] = useState({ desc: "", qty: "", price: "", cur: "USD" });
  const [showNl, setShowNl] = useState(false);
  const [wh, setWh] = useState(warehouses[0]?.id || "");
  const [saving, setSaving] = useState(false);

  function addLine() {
    if (!nl.desc) return;
    setItems(i => [...i, { id: ++LI_ID, desc: nl.desc, qty: Number(nl.qty) || 1, price: nl.price || "0", cur: nl.cur, warn: false }]);
    setNl({ desc: "", qty: "", price: "", cur: "USD" }); setShowNl(false);
  }

  async function approve() {
    setSaving(true);
    let success = 0;
    for (const item of items) {
      try {
        const created = await buylistAPI.create({
          name: item.desc, sku: `INV-${++LI_ID}`,
          qty: item.qty, unit: "pcs", price: item.price,
          currency: item.cur, depolar: wh || null, low_stock: item.qty < 20,
        });
        setBuylist(prev => [...prev, normalizeBuylist(created)]);
        success++;
      } catch { /* skip failed */ }
    }
    setSaving(false);
    addToast(`${success}/${items.length} mahsulot qo'shildi!`);
    setApproved(true);
  }

  if (approved) return (
    <div className="fu" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 380 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 60, height: 60, background: "var(--green-bg)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><I n="ck" s={26} c="var(--green)" /></div>
        <h2 style={{ fontSize: 21, fontWeight: 800, color: "var(--text)", marginBottom: 7 }}>Tasdiqlandi!</h2>
        <p style={{ color: "var(--text3)", marginBottom: 22 }}>{items.length} ta mahsulot inventarga qo'shildi.</p>
        <button className="btn bp" onClick={() => { setApproved(false); setItems(LI_DEF); }}>Yana skanerlash</button>
      </div>
    </div>
  );

  return (
    <div className="fu">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>{T.intake}</h1>
        <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>Invoice skanerlash va mahsulotlarni /buylist/ API ga qo'shish</p>
      </div>
      <div className="ig" style={{ marginBottom: 22 }}>
        <div className="ipc">
          <div className="ipb"><div className="ipf"><I n="fi" s={14} c="var(--blue)" />INVOICE_8821.PDF</div></div>
          <div className="ibdy">
            <div className="il" style={{ width: "55%" }} /><div className="il" style={{ width: "80%" }} /><div className="il-sp" />
            <div className="ilg"><div className="ils" style={{ maxWidth: 150 }} /><div style={{ flex: 1 }} /><div className="ilse" /></div>
            <div className="il" style={{ width: "70%" }} /><div className="il-hl" style={{ width: "60%" }} /><div className="il-sp" />
            <div className="il" style={{ width: "50%" }} /><div className="il" style={{ width: "60%" }} /><div className="il" style={{ width: "42%" }} /><div className="il-sp" />
            <div className="il" style={{ width: "75%" }} /><div className="il" style={{ width: "55%" }} />
          </div>
        </div>
        <div className="arc">
          <div className="arh">
            <div className="arhl"><div className="ari"><I n="mg" s={17} c="#fff" /></div><div><div className="art">AI Extraction Results</div><div className="ars">Extracted {items.length} line items · 98% confidence</div></div></div>
            <div className="rb"><I n="ck" s={12} c="var(--green-t)" />Ko'rib chiqishga tayyor</div>
          </div>
          <div className="mr2">
            <div><div className="mll">Yetkazuvchi</div><div className="mv2">Lumber & Supply Co.</div></div>
            <div><div className="mll">Invoice Sana</div><div className="mv2">2024-10-24</div></div>
            <div><div className="mll">Jami</div><div className="mv2 big">${items.reduce((a, i) => a + (i.qty * parseFloat(i.price || 0)), 0).toFixed(2)}</div></div>
          </div>
          <div className="lis">
            <div className="lish"><div className="list">Mahsulotlar ({items.length})</div><button className="btn bg2 bs" style={{ color: "var(--blue)" }} onClick={() => setShowNl(true)}><I n="pl" s={12} c="var(--blue)" />+ Qo'shish</button></div>
            {showNl && (
              <div style={{ background: "var(--blue-l)", border: "1px solid var(--blue-m)", borderRadius: 8, padding: 11, marginBottom: 11 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 90px 80px 34px", gap: 7, alignItems: "center" }}>
                  <input className="li2" placeholder="Mahsulot" value={nl.desc} onChange={e => setNl(f => ({ ...f, desc: e.target.value }))} />
                  <input className="li2" placeholder="Qty" type="number" value={nl.qty} onChange={e => setNl(f => ({ ...f, qty: e.target.value }))} />
                  <input className="li2" placeholder="Narx" value={nl.price} onChange={e => setNl(f => ({ ...f, price: e.target.value }))} />
                  <select className="lcs" value={nl.cur} onChange={e => setNl(f => ({ ...f, cur: e.target.value }))}><option>USD</option><option>SOM</option></select>
                  <button className="btn bp bs" style={{ padding: "5px 7px" }} onClick={addLine}><I n="ck" s={12} c="#fff" /></button>
                </div>
              </div>
            )}
            <div className="lth"><div className="lch">Mahsulot</div><div className="lch">QTY</div><div className="lch">Narx</div><div className="lch">Valyuta</div><div /></div>
            {items.map(item => (
              <div className="lr" key={item.id}>
                <div className="ld">{item.desc}{item.warn && <div className="lw" />}</div>
                <div className="lq">{item.qty}</div>
                <div className="lp">$ {item.price}</div>
                <div><select className="lcs" value={item.cur} onChange={e => setItems(it => it.map(x => x.id === item.id ? { ...x, cur: e.target.value } : x))}><option>USD</option><option>SOM</option></select></div>
                <button className="ldl" onClick={() => setItems(it => it.filter(x => x.id !== item.id))}><I n="td" s={13} /></button>
              </div>
            ))}
          </div>
          <div style={{ padding: "16px 22px", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text3)", marginBottom: 6 }}>Omborga biriktirish</div>
              <select style={{ width: "100%", padding: "10px 36px 10px 14px", border: "1.5px solid var(--border2)", borderRadius: "var(--rs)", fontFamily: "inherit", fontSize: 14, color: "var(--text)", background: "var(--surface)", appearance: "none", outline: "none" }}
                value={wh} onChange={e => setWh(Number(e.target.value))}>
                <option value="">— Ombor tanlang —</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text3)", marginBottom: 6 }}>Reference ID</div>
              <input style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border2)", borderRadius: "var(--rs)", fontFamily: "inherit", fontSize: 14, color: "var(--text)", background: "var(--surface)", outline: "none" }} defaultValue="INV-2024-8821" />
            </div>
          </div>
          <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", background: "var(--surface2)", borderRadius: "0 0 var(--r) var(--r)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button style={{ background: "none", border: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "var(--text3)", cursor: "pointer" }} onClick={() => { setItems(LI_DEF); setShowNl(false); }}>Tiklash</button>
            <button className="btn bp" style={{ padding: "10px 22px", fontSize: 14, fontWeight: 700 }} onClick={approve} disabled={saving}>
              <I n="ck" s={15} c="#fff" />{saving ? "Qo'shilmoqda..." : "Tasdiqlash → /buylist/ API"}
            </button>
          </div>
        </div>
      </div>
      <div className="sbar">
        <div className="sbc"><div className="sbic sbic-b"><I n="sc" s={17} c="var(--blue)" /></div><div><div className="sbv">124</div><div className="sbl">Haftalik skanlar</div></div></div>
        <div className="sbc"><div className="sbic sbic-g"><I n="zp" s={17} c="var(--green)" /></div><div><div className="sbv">~42h</div><div className="sbl">Tejagan vaqt</div></div></div>
        <div className="sbc"><div className="sbic sbic-p"><I n="dr" s={17} c="var(--purple)" /></div><div><div className="sbv">$18.4k</div><div className="sbl">Qo'shilgan qiymat</div></div></div>
        <div className="ptc"><div className="ptic"><I n="mg" s={17} c="#fff" /></div><div><div className="ptl">Pro Maslahat</div><div className="ptt">Bir nechta invoiceni birdan skanerlang.</div></div></div>
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
      await authAPI.createUser({
        username: form.username, email: form.email, password: form.password,
        role: form.role, company: form.company ? Number(form.company) : null,
      });
      addToast(`"${form.username}" yaratildi!`); setShowAdd(false); setForm(EMPTY); onRefresh();
    } catch (e) { addToast(`Xato: ${e.message}`, "error"); }
    finally { setSaving(false); }
  }

  async function delU(user) {
    try {
      await authAPI.deleteUser(user.id);
      addToast(`"${user.username}" o'chirildi`, "error"); onRefresh();
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
        <Modal title="Yangi Foydalanuvchi" onClose={() => setShowAdd(false)}
          footer={<><button className="btn bo" onClick={() => setShowAdd(false)}>{T.cancel}</button><button className="btn bp" onClick={addUser} disabled={saving}>{saving ? "..." : T.save}</button></>}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Username *</label><input className="form-input" value={form.username} onChange={sf("username")} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={sf("email")} /></div>
          </div>
          <div className="form-group"><label className="form-label">Parol</label><input className="form-input" type="password" value={form.password} onChange={sf("password")} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={sf("role")}>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Kompaniya</label>
              <select className="form-select" value={form.company} onChange={sf("company")}>
                <option value="">— Tanlang —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}
      {delUser && <ConfirmModal title="Foydalanuvchini o'chirish" desc={<>«<strong>{delUser.username}</strong>»ni o'chirmoqchimisiz?</>} onConfirm={() => delU(delUser)} onClose={() => setDelUser(null)} />}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>{T.users}</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>{users.length} ta foydalanuvchi · /user_app/users/</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn bo" onClick={onRefresh}><I n="refresh" s={14} />Yangilash</button>
          <button className="btn bp" onClick={() => setShowAdd(true)}><I n="pl" s={14} c="#fff" />Foydalanuvchi qo'shish</button>
        </div>
      </div>

      <div className="sg sg3" style={{ marginBottom: 16 }}>
        <div className="sc"><div className="slb">Jami</div><div className="sv">{users.length}</div></div>
        <div className="sc"><div className="slb">Admin</div><div className="sv rd">{users.filter(u => u.role === "admin").length}</div></div>
        <div className="sc"><div className="slb">Manager</div><div className="sv bl">{users.filter(u => u.role === "manager").length}</div></div>
      </div>

      <div className="tc">
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
          <div className="sw-wrap" style={{ maxWidth: 300 }}>
            <span className="si-ico"><I n="sr" s={14} /></span>
            <input placeholder="Username yoki email qidirish..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state"><I n="usrs" s={38} c="var(--border2)" /><h3>Foydalanuvchi yo'q</h3><p>Birinchi foydalanuvchi qo'shing yoki API CORS tekshiring.</p></div>
        ) : (
          <table>
            <thead><tr><th>Foydalanuvchi</th><th>Email</th><th>Role</th><th>Kompaniya</th><th>ID</th><th></th></tr></thead>
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
      addToast(`"${co.name}" o'chirildi`, "error"); onRefresh();
    } catch (e) { addToast(`Xato: ${e.message}`, "error"); }
  }

  return (
    <div className="fu">
      {showAdd && (
        <Modal title="Yangi Kompaniya" onClose={() => setShowAdd(false)}
          footer={<><button className="btn bo" onClick={() => setShowAdd(false)}>{T.cancel}</button><button className="btn bp" onClick={addCo} disabled={saving}>{saving ? "..." : T.save}</button></>}>
          <div className="form-group"><label className="form-label">Nomi *</label><input className="form-input" value={form.name} onChange={sf("name")} /></div>
          <div className="form-group"><label className="form-label">Manzil</label><input className="form-input" value={form.address} onChange={sf("address")} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Telefon</label><input className="form-input" value={form.phone} onChange={sf("phone")} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={sf("email")} /></div>
          </div>
        </Modal>
      )}
      {delCo && <ConfirmModal title="Kompaniyani o'chirish" desc={<>«<strong>{delCo.name}</strong>»ni o'chirmoqchimisiz?</>} onConfirm={() => delC(delCo)} onClose={() => setDelCo(null)} />}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>{T.companies}</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>{companies.length} ta kompaniya · /user_app/companies/</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn bo" onClick={onRefresh}><I n="refresh" s={14} />Yangilash</button>
          <button className="btn bp" onClick={() => setShowAdd(true)}><I n="pl" s={14} c="#fff" />Kompaniya qo'shish</button>
        </div>
      </div>

      <div className="sg sg2" style={{ marginBottom: 16 }}>
        <div className="sc"><div className="slb">Jami Kompaniyalar</div><div className="sv bl">{companies.length}</div></div>
        <div className="sc"><div className="slb">API Endpoint</div><div style={{ fontSize: 12, color: "var(--blue)", fontWeight: 600, marginTop: 4 }}>/user_app/companies/</div></div>
      </div>

      <div className="tc">
        {companies.length === 0 ? (
          <div className="empty-state"><I n="co" s={38} c="var(--border2)" /><h3>Kompaniya yo'q</h3><p>Yangi kompaniya yarating yoki API CORS tekshiring.</p></div>
        ) : (
          <table>
            <thead><tr><th>Kompaniya</th><th>Manzil</th><th>Telefon</th><th>Email</th><th>ID</th><th></th></tr></thead>
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
  { k: "profile", l: "Profil", i: "usr" },
  { k: "appearance", l: "Ko'rinish", i: "palette" },
  { k: "notifications", l: "Bildirishnomalar", i: "bell2" },
  { k: "privacy", l: "Maxfiylik va Xavfsizlik", i: "shield" },
  { k: "regional", l: "Regional", i: "globe" },
  { k: "data", l: "Ma'lumot va Saqlash", i: "database" },
  { k: "api", l: "API Ma'lumotlari", i: "key" },
  { k: "system", l: "Tizim Ma'lumotlari", i: "info" },
  { k: "danger", l: "Xavfli Zona", i: "warn" },
];

function SettingsPage({ settings, setSettings, darkMode, onDarkMode, accent, onAccent, lang, onLang, currentUser, addToast, onLogout, T }) {
  const [active, setActive] = useState("profile");
  const [pf, setPf] = useState({
    name: currentUser.username, email: currentUser.email || "",
    phone: "", role: currentUser.role || "staff", company: currentUser.company || "",
  });
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
        {card(<I n="usr" s={17} c="var(--blue)" />, "var(--blue-l)", "Profil va Hisob", "Shaxsiy ma'lumotlarni boshqarish",
          <>
            <div className="profile-avatar-area">
              <div className="profile-avatar-big">{pf.name?.slice(0, 2).toUpperCase()}</div>
              <div>
                <div className="profile-avatar-name">{pf.name}</div>
                <div className="profile-avatar-role">{pf.role} · {currentUser.email || "email yo'q"}</div>
                <div style={{ fontSize: 12, color: "var(--text4)", marginTop: 3 }}>ID: #{currentUser.id ?? "—"} · Kompaniya: #{currentUser.company ?? "yo'q"}</div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Username</label><input className="form-input" value={pf.name} onChange={e => setPf(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Role</label><input className="form-input" value={pf.role} readOnly style={{ background: "var(--bg)", color: "var(--text3)" }} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={pf.email} onChange={e => setPf(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Telefon</label><input className="form-input" value={pf.phone} onChange={e => setPf(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="btn bp" onClick={() => addToast("Profil saqlandi! (local)")}><I n="ck" s={14} c="#fff" />{T.save}</button></div>
          </>
        )}
      </div>
    ),
    appearance: (
      <div className="settings-section">
        {card(<I n={darkMode ? "moon" : "sun"} s={17} c="var(--purple)" />, "var(--purple-bg)", "Ko'rinish", "Dizayn va rang sozlamalari",
          <>
            {srow("Tungi Rejim", "Qorong'u interfeys", <Toggle checked={darkMode} onChange={onDarkMode} />)}
            {srow("Ixcham Ko'rinish", "Kam joy egallash", <Toggle checked={settings.compactView} onChange={v => upd("compactView", v)} />)}
            {srow("Animatsiyalar", "Silliq o'tishlar", <Toggle checked={settings.animationsEnabled} onChange={v => upd("animationsEnabled", v)} />)}
            <div className="settings-row">
              <div className="settings-row-info"><div className="settings-row-label">Asosiy Rang</div><div className="settings-row-desc">Interfeysdagi asosiy rang</div></div>
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
        {card(<I n="bell2" s={17} c="var(--orange)" />, "var(--orange-bg)", "Bildirishnomalar", "Qaysi ogohlantirishlarni qabul qilish",
          <>
            {srow("Kam Zaxira Ogohlantirishlari", "Miqdor pastga tushganda", <Toggle checked={settings.notifLowStock} onChange={v => upd("notifLowStock", v)} />)}
            {srow("Yuborish Yangilanishlari", "Yuborish holati o'zgarganda", <Toggle checked={settings.notifShipments} onChange={v => upd("notifShipments", v)} />)}
            {srow("Haftalik Hisobotlar", "Avtomatik haftanlik xulosa", <Toggle checked={settings.notifReports} onChange={v => upd("notifReports", v)} />)}
            {srow("Email Bildirishnomalari", "Emailga nusxa yuborish", <Toggle checked={settings.notifEmail} onChange={v => upd("notifEmail", v)} />)}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn bp" onClick={() => addToast("Bildirishnoma sozlamalari saqlandi!")}><I n="ck" s={14} c="#fff" />{T.save}</button>
            </div>
          </>
        )}
      </div>
    ),
    privacy: (
      <div className="settings-section">
        {card(<I n="key" s={17} c="var(--green)" />, "var(--green-bg)", "Parolni O'zgartirish", "",
          <>
            <div className="form-group">
              <label className="form-label">Joriy Parol</label>
              <div style={{ position: "relative" }}>
                <input className="form-input" type={showPw ? "text" : "password"} placeholder="••••••••"
                  value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} style={{ paddingRight: 38 }} />
                <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text4)" }}>
                  <I n={showPw ? "eyeoff" : "eye2"} s={14} />
                </button>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Yangi Parol</label><input className="form-input" type="password" placeholder="Min 8 ta belgi" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Tasdiqlash</label><input className="form-input" type="password" placeholder="Qaytaring" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} /></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn bp" onClick={() => {
                if (!pw.current) { addToast("Joriy parolni kiriting", "error"); return; }
                if (pw.next !== pw.confirm) { addToast("Parollar mos kelmaydi", "error"); return; }
                addToast("Parol o'zgartirildi!"); setPw({ current: "", next: "", confirm: "" });
              }}><I n="lock" s={14} c="#fff" />Parolni O'zgartirish</button>
            </div>
          </>
        )}
        {card(<I n="shield" s={17} c="var(--blue)" />, "var(--blue-l)", "Xavfsizlik Sozlamalari", "",
          <>
            {srow("Ikki bosqichli Autentifikatsiya", "Qo'shimcha xavfsizlik qatlami", <Toggle checked={settings.twoFactor} onChange={v => { upd("twoFactor", v); addToast(v ? "2FA yoqildi!" : "2FA o'chirildi", "info"); }} />)}
            {srow("Sessiya Tugash Muddati", "Faolsizlikdan keyin avtomatik chiqish", (
              <select value={settings.sessionTimeout} onChange={e => { upd("sessionTimeout", e.target.value); addToast("Sessiya vaqti yangilandi", "info"); }}>
                <option value="15min">15 daqiqa</option>
                <option value="30min">30 daqiqa</option>
                <option value="1hr">1 soat</option>
                <option value="never">Hech qachon</option>
              </select>
            ))}
          </>
        )}
      </div>
    ),
    regional: (
      <div className="settings-section">
        {card(<I n="globe" s={17} c="#0d9488" />, "#ccfbf1", "Til", "Interfeys tilini tanlang",
          <div className="lang-grid" style={{ marginTop: 4 }}>
            {LANGUAGES.map(l => (
              <div key={l.code} className={`lang-option${lang === l.code ? " active" : ""}`} onClick={() => { onLang(l.code); addToast(`Til: ${l.name}`, "info"); }}>
                <span className="lang-flag">{l.flag}</span>
                <div><div className="lang-name">{l.name}</div><div className="lang-local">{l.local}</div></div>
              </div>
            ))}
          </div>
        )}
        {card(<I n="globe" s={17} c="var(--purple)" />, "var(--purple-bg)", "Regional Sozlamalar", "",
          <>
            {srow("Asosiy Valyuta", "Butun ilovada ko'rsatiladigan valyuta", (
              <select value={settings.currency} onChange={e => { upd("currency", e.target.value); addToast("Valyuta yangilandi", "info"); }}>
                <option value="USD">USD — AQSH dollari</option>
                <option value="UZS">UZS — O'zbek so'mi</option>
                <option value="EUR">EUR — Yevropa evro</option>
              </select>
            ))}
            {srow("Vaqt Mintaqasi", "Mahalliy vaqt mintaqasi", (
              <select value={settings.timezone} onChange={e => { upd("timezone", e.target.value); addToast("Vaqt mintaqasi yangilandi", "info"); }}>
                <option value="UTC+5">UTC+5 — Toshkent</option>
                <option value="UTC+0">UTC+0 — London</option>
                <option value="UTC-5">UTC-5 — Nyu-York</option>
                <option value="UTC+3">UTC+3 — Moskva</option>
              </select>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn bp" onClick={() => addToast("Regional sozlamalar saqlandi!")}><I n="ck" s={14} c="#fff" />{T.save}</button>
            </div>
          </>
        )}
      </div>
    ),
    data: (
      <div className="settings-section">
        {card(<I n="database" s={17} c="var(--blue)" />, "var(--blue-l)", "Ma'lumot Boshqaruvi", "",
          <>
            {srow("Avtomatik Saqlash", "O'zgarishlarni avtomatik saqlash", <Toggle checked={settings.autoSave} onChange={v => upd("autoSave", v)} />)}
            {srow("Barcha Ma'lumotlarni Eksport", "To'liq nusxa yuklab olish", <button className="btn bo bs" onClick={() => addToast("Eksport qilinmoqda...", "info")}><I n="dl" s={14} />Eksport</button>)}
            {srow("Ma'lumotlarni Import", "Zaxira faylni yuklash", <button className="btn bo bs" onClick={() => addToast("Import — tez kunda", "info")}><I n="refresh" s={14} />Import</button>)}
            {srow("Keshni Tozalash", "Vaqtinchalik fayllarni o'chirish", <button className="btn bo bs" onClick={() => addToast("Kesh tozalandi!")}><I n="refresh" s={14} />Tozalash</button>)}
          </>
        )}
      </div>
    ),
    api: (
      <div className="settings-section">
        {card(<I n="key" s={17} c="var(--orange)" />, "var(--orange-bg)", "API Ulanish Ma'lumotlari", "Backend Django REST API",
          <>
            <div className="sys-chips" style={{ marginBottom: 16 }}>
              {[
                { l: "Base URL", v: BASE },
                { l: "Login", v: "/user_app/login/" },
                { l: "Logout", v: "/user_app/logout/" },
                { l: "Users", v: "/user_app/users/" },
                { l: "Companies", v: "/user_app/companies/" },
                { l: "Depolar", v: "/depolar/" },
                { l: "Buylist", v: "/buylist/" },
                { l: "Auth", v: "Token Authentication" },
                { l: "Swagger", v: "/swagger/" },
              ].map(c => (<div key={c.l} className="sys-chip"><strong>{c.l}:</strong>{c.v}</div>))}
            </div>
            {srow("Token holati", "Joriy sessiya", <span className="badge bdg">{getToken() ? "Faol ✓" : "Yo'q"}</span>)}
            <div style={{ marginTop: 12, padding: "12px 16px", background: "var(--bg)", borderRadius: "var(--rs)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", marginBottom: 6, textTransform: "uppercase" }}>CORS Sozlamasi (Django)</div>
              <pre style={{ fontSize: 12, color: "var(--text2)", overflow: "auto" }}>{`# settings.py
INSTALLED_APPS += ['corsheaders']
MIDDLEWARE.insert(0, 'corsheaders.middleware.CorsMiddleware')
CORS_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]`}</pre>
            </div>
          </>
        )}
      </div>
    ),
    system: (
      <div className="settings-section">
        {card(<I n="info" s={17} c="var(--text3)" />, "var(--bg2)", "Tizim Ma'lumotlari", "",
          <>
            <div className="sys-chips" style={{ marginBottom: 16 }}>
              {[
                { l: "Versiya", v: "2.0.0-api-full" },
                { l: "Muhit", v: "Production" },
                { l: "Backend", v: "Django REST" },
                { l: "API", v: BASE },
                { l: "Foydalanuvchi", v: currentUser.username },
                { l: "Role", v: currentUser.role || "staff" },
                { l: "Build", v: "2024-10-24" },
                { l: "Node", v: "Browser React" },
              ].map(c => (<div key={c.l} className="sys-chip"><strong>{c.l}:</strong>{c.v}</div>))}
            </div>
            {srow("Yangilanishni Tekshirish", "Joriy versiya yangi", <button className="btn bp bs" onClick={() => addToast("Yangi versiya yo'q ✓")}><I n="refresh" s={14} c="#fff" />Tekshirish</button>)}
          </>
        )}
      </div>
    ),
    danger: (
      <div className="settings-section">
        {confirmReset && <ConfirmModal title="Sozlamalarni tiklash" desc={<>Barcha sozlamalarni <strong>standartga</strong> qaytarasizmi?</>} onConfirm={() => addToast("Sozlamalar tiklandi", "info")} onClose={() => setConfirmReset(false)} />}
        {confirmDel && <ConfirmModal title="Hisobni o'chirish" desc={<>Hisobingiz va barcha <strong>ma'lumotlarni</strong> butunlay o'chirasizmi?</>} onConfirm={() => { addToast("Hisob o'chirildi", "error"); setTimeout(onLogout, 1500); }} onClose={() => setConfirmDel(false)} />}
        <div className="settings-card danger-zone">
          <div className="settings-card-header">
            <div className="settings-card-icon" style={{ background: "var(--red-bg)" }}><I n="warn" s={17} c="var(--red)" /></div>
            <div><div className="settings-card-title">Xavfli Zona</div><div className="settings-card-subtitle">Bu amalar qaytarib bo'lmaydi.</div></div>
          </div>
          <div className="settings-card-body">
            <button className="danger-zone-btn" onClick={onLogout}><I n="logout" s={15} />Chiqish</button>
            <button className="danger-zone-btn" onClick={() => setConfirmReset(true)}><I n="refresh" s={15} />Barcha Sozlamalarni Tiklash</button>
            <button className="danger-zone-btn" style={{ fontWeight: 700 }} onClick={() => setConfirmDel(true)}><I n="warn" s={15} />Hisobni Butunlay O'chirish</button>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="fu">
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>{T.settings}</h1>
        <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>Hisob, ko'rinish va tizim sozlamalari</p>
      </div>
      <div className="settings-layout">
        <div className="settings-nav">
          <div className="settings-nav-header">Konfiguratsiya</div>
          {SETTINGS_NAV.map((item, idx) => (
            <div key={item.k}>
              {idx === 7 && <div className="settings-nav-divider" />}
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