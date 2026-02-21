import { useState, useEffect, useCallback } from "react";

// ═══════════════════ TYPES ═══════════════════
interface DepolarRaw {
  id: number;
  name?: string;
  nomi?: string;
  address?: string;
  manzil?: string;
  addr?: string;
  manager?: string;
  menejer?: string;
  phone?: string;
  telefon?: string;
  capacity?: string;
  type?: string;
  turi?: string;
  since?: string;
  created_at?: string;
  items_count?: number;
  items?: number;
  usd_value?: string;
  usd?: string;
  som_value?: string;
  som?: string;
  used_percent?: number;
  used?: number;
}

interface BuylistRaw {
  id: number;
  name?: string;
  nomi?: string;
  mahsulot?: string;
  sku?: string;
  kod?: string;
  qty?: number;
  miqdor?: number;
  quantity?: number;
  unit?: string;
  birlik?: string;
  price?: string | number;
  narx?: string | number;
  currency?: string;
  cur?: string;
  valyuta?: string;
  total?: string | number;
  date?: string;
  created_at?: string;
  low_stock?: boolean;
  low?: boolean;
  depolar?: number | null;
  warehouse?: number | null;
  wh?: number | null;
}

interface Warehouse {
  id: number;
  name: string;
  addr: string;
  manager: string;
  phone: string;
  capacity: string;
  type: string;
  since: string;
  items: number;
  usd: string;
  som: string;
  used: number;
  wc: "bl" | "or" | "pu";
  ic: "wh" | "bx" | "tr";
  _raw: DepolarRaw;
}

interface BuylistItem {
  id: number;
  name: string;
  sku: string;
  qty: number;
  unit: string;
  price: string;
  cur: string;
  total: string;
  date: string;
  low: boolean;
  wh: number | null;
  _raw: BuylistRaw;
}

interface Toast {
  id: number;
  msg: string;
  type?: "success" | "error" | "info";
}

// ═══════════════════ API CONFIG ═══════════════════
const BASE = "http://127.0.0.1:8000";

async function api<T = unknown>(path: string, method = "GET", body: unknown = null): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

const depolarAPI = {
  list: () => api<DepolarRaw[] | { results: DepolarRaw[] }>("/depolar/"),
  create: (data: object) => api<DepolarRaw>("/depolar/", "POST", data),
  read: (id: number) => api<DepolarRaw>(`/depolar/${id}/`),
  update: (id: number, data: object) => api<DepolarRaw>(`/depolar/${id}/`, "PUT", data),
  patch: (id: number, data: object) => api<DepolarRaw>(`/depolar/${id}/`, "PATCH", data),
  delete: (id: number) => api<null>(`/depolar/${id}/`, "DELETE"),
};

const buylistAPI = {
  list: () => api<BuylistRaw[] | { results: BuylistRaw[] }>("/buylist/"),
  create: (data: object) => api<BuylistRaw>("/buylist/", "POST", data),
  read: (id: number) => api<BuylistRaw>(`/buylist/${id}/`),
  update: (id: number, data: object) => api<BuylistRaw>(`/buylist/${id}/`, "PUT", data),
  patch: (id: number, data: object) => api<BuylistRaw>(`/buylist/${id}/`, "PATCH", data),
  delete: (id: number) => api<null>(`/buylist/${id}/`, "DELETE"),
};

// ═══════════════════ CSS ═══════════════════
const makeCSS = (accent = "#2563eb"): string => `
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
  --sw:228px;--r:10px;--rs:7px;--rx:5px;
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
.bs{padding:6px 12px;font-size:13px}
.bd{background:var(--red-bg);color:var(--red);border-color:var(--red-bg)}.bd:hover{border-color:var(--red)}
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
.wh-dropdown{position:absolute;top:100%;right:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--sh2);z-index:20;min-width:150px;overflow:hidden}
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
.loading-overlay{display:flex;align-items:center;justify-content:center;padding:60px;flex-direction:column;gap:12px;color:var(--text3)}
.spinner{width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.api-err{background:var(--red-bg);border:1px solid var(--red);border-radius:var(--r);padding:14px 18px;margin-bottom:16px;color:var(--red);font-size:14px;font-weight:600;display:flex;align-items:center;gap:9px}
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
.sh2{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border)}
.st2{font-size:15px;font-weight:700;color:var(--text)}
@keyframes fu{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
.fu{animation:fu .25s ease}
`;

// ═══════════════════ ICONS ═══════════════════
const P: Record<string, string> = {
  wh: "M2 20h20 M4 20V10l8-6 8 6v10 M10 20v-6h4v6",
  bx: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96 12 12.01l8.73-5.05 M12 22.08V12",
  tr: "M1 3h15v13H1z M16 8h4l3 3v5h-7V8z M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  ch: "M18 20V10 M12 20V4 M6 20v-6",
  cg: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  bl: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  sr: "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  pl: "M12 5v14 M5 12h14",
  td: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
  ed: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  ck: "M20 6L9 17l-5-5",
  lc: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  cl: "M15 18l-6-6 6-6", cr: "M9 18l6-6-6-6",
  arr: "M19 12H5 M12 19l-7-7 7-7",
  usr: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  x: "M18 6L6 18 M6 6l12 12",
  warn: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  moon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  sun: "M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42 M12 5a7 7 0 1 0 0 14A7 7 0 0 0 12 5z",
  refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  eye2: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  eyeoff: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94 M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19 M1 1l22 22",
  info: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 16v-4 M12 8h.01",
  dl: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
};

interface IconProps { n: string; s?: number; c?: string; }
function I({ n, s = 16, c = "currentColor" }: IconProps) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}>
      {P[n]?.split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
    </svg>
  );
}

interface ToggleProps { checked: boolean; onChange: (v: boolean) => void; }
function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <label className="toggle" onClick={e => e.stopPropagation()}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  );
}

function ToastList({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type ?? ""}`}>
          {t.type === "success" && <I n="ck" s={15} c="#4ade80" />}
          {t.type === "error" && <I n="x" s={15} c="#f87171" />}
          {t.type === "info" && <I n="info" s={15} c="#60a5fa" />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}
function Modal({ title, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
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

interface ConfirmModalProps {
  title: string;
  desc: React.ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}
function ConfirmModal({ title, desc, onConfirm, onClose }: ConfirmModalProps) {
  return (
    <Modal title={title} onClose={onClose}
      footer={
        <>
          <button className="btn bo" onClick={onClose}>Bekor</button>
          <button className="btn bd" onClick={() => { onConfirm(); onClose(); }}>O'chirish</button>
        </>
      }>
      <div className="confirm-icon"><I n="warn" s={24} c="var(--red)" /></div>
      <div className="confirm-text">{desc}</div>
    </Modal>
  );
}

function Spinner() {
  return (
    <div className="loading-overlay">
      <div className="spinner" />
      <span>Yuklanmoqda...</span>
    </div>
  );
}

// ═══════════════════ CONSTANTS ═══════════════════
const WC_COLORS = ["bl", "or", "pu"] as const;
const WC_ICONS = ["wh", "bx", "tr"] as const;
type WcColor = typeof WC_COLORS[number];
type WcIcon = typeof WC_ICONS[number];

const WC_ICON_COLOR: Record<WcColor, string> = {
  bl: "var(--blue)", or: "var(--orange)", pu: "var(--purple)",
};
const WC_GRADIENT: Record<WcColor, string> = {
  bl: "linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)",
  or: "linear-gradient(135deg,#d97706 0%,#dc2626 100%)",
  pu: "linear-gradient(135deg,#7c3aed 0%,#0d9488 100%)",
};

// ═══════════════════ NORMALIZE ═══════════════════
function normalizeDepolar(d: DepolarRaw, idx = 0): Warehouse {
  const wc = WC_COLORS[idx % 3];
  const ic = WC_ICONS[idx % 3];
  return {
    id: d.id,
    name: d.name ?? d.nomi ?? "Ombor",
    addr: d.address ?? d.manzil ?? d.addr ?? "—",
    manager: d.manager ?? d.menejer ?? "—",
    phone: d.phone ?? d.telefon ?? "—",
    capacity: d.capacity ?? "—",
    type: d.type ?? d.turi ?? "General",
    since: d.since ?? d.created_at ?? "—",
    items: d.items_count ?? d.items ?? 0,
    usd: d.usd_value ? `$${d.usd_value}` : (d.usd ?? "$0"),
    som: d.som_value ?? d.som ?? "0",
    used: d.used_percent ?? d.used ?? 0,
    wc, ic,
    _raw: d,
  };
}

function normalizeBuylist(b: BuylistRaw): BuylistItem {
  const qty = Number(b.qty ?? b.miqdor ?? b.quantity ?? 0);
  const price = String(b.price ?? b.narx ?? "0");
  return {
    id: b.id,
    name: b.name ?? b.nomi ?? b.mahsulot ?? "Mahsulot",
    sku: b.sku ?? b.kod ?? `SKU-${b.id}`,
    qty,
    unit: b.unit ?? b.birlik ?? "pcs",
    price,
    cur: b.currency ?? b.cur ?? b.valyuta ?? "USD",
    total: b.total ? String(b.total) : String(qty * parseFloat(price.replace(/,/g, "") || "0")),
    date: b.date ?? b.created_at ?? new Date().toLocaleDateString(),
    low: b.low_stock ?? b.low ?? qty < 20,
    wh: b.depolar ?? b.warehouse ?? b.wh ?? null,
    _raw: b,
  };
}

// ═══════════════════ AUTH ═══════════════════
interface AuthPageProps { onLogin: (name: string) => void; }
function AuthPage({ onLogin }: AuthPageProps) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try { await api("/depolar/"); } catch { /* ignore */ }
    setLoading(false);
    onLogin(user || "Admin");
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
          <div className="fld">
            <label className="fld-label">Foydalanuvchi</label>
            <div className="fld-wrap">
              <input type="text" placeholder="admin" value={user}
                onChange={e => setUser(e.target.value)}
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
            Backend: <code style={{ color: "var(--blue)" }}>{BASE}</code>
          </div>
        </div>
        <div className="auth-hero">
          <div className="auth-hero-glow" style={{ width: 300, height: 300, top: -80, right: -80 }} />
          <div className="auth-hero-glow" style={{ width: 200, height: 200, bottom: -60, left: -60 }} />
          <div className="auth-hero-icon"><I n="wh" s={32} c="#fff" /></div>
          <h2>RenoFlow Ombor</h2>
          <p>Omborlar va buylistlarni real API orqali boshqaring.</p>
          <div style={{ marginTop: 32, display: "flex", gap: 10, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
            {["Omborlar /depolar/", "Buylist /buylist/", "Hisobotlar"].map(f => (
              <span key={f} style={{ background: "rgba(255,255,255,.18)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 20, backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,.25)" }}>{f}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════ DASHBOARD ═══════════════════
type PageType = "warehouses" | "whdetail" | "buylist" | "reports";

interface DashboardProps { userName: string; onLogout: () => void; }
function Dashboard({ userName, onLogout }: DashboardProps) {
  const [page, setPage] = useState<PageType>("warehouses");
  const [selectedWh, setSelectedWh] = useState<Warehouse | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [buylist, setBuylist] = useState<BuylistItem[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loadingWh, setLoadingWh] = useState(false);
  const [loadingBl, setLoadingBl] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const fetchWarehouses = useCallback(async () => {
    setLoadingWh(true);
    setApiError(null);
    try {
      const data = await depolarAPI.list();
      const arr: DepolarRaw[] = Array.isArray(data) ? data : ((data as { results: DepolarRaw[] }).results ?? []);
      setWarehouses(arr.map((d, i) => normalizeDepolar(d, i)));
    } catch (e) {
      setApiError(`Depolar yuklanmadi: ${(e as Error).message}`);
    } finally {
      setLoadingWh(false);
    }
  }, []);

  const fetchBuylist = useCallback(async () => {
    setLoadingBl(true);
    try {
      const data = await buylistAPI.list();
      const arr: BuylistRaw[] = Array.isArray(data) ? data : ((data as { results: BuylistRaw[] }).results ?? []);
      setBuylist(arr.map(normalizeBuylist));
    } catch (e) {
      addToast(`Buylist yuklanmadi: ${(e as Error).message}`, "error");
    } finally {
      setLoadingBl(false);
    }
  }, []);

  useEffect(() => { fetchWarehouses(); fetchBuylist(); }, []);

  function addToast(msg: string, type: Toast["type"] = "success") {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }

  function goToWh(wh: Warehouse) { setSelectedWh(wh); setPage("whdetail"); }
  function backToWarehouses() { setSelectedWh(null); setPage("warehouses"); fetchWarehouses(); }

  const lowItems = buylist.filter(i => i.low).length;

  return (
    <div className="app">
      <style>{makeCSS()}</style>
      <ToastList toasts={toasts} />

      <aside className="sidebar">
        <div className="s-logo">
          <div className="s-mark"><I n="wh" s={18} c="#fff" /></div>
          <div>
            <div className="s-name">Reno<span>Flow</span></div>
            <div className="s-sub">Ombor MGT · API</div>
          </div>
        </div>
        <nav className="s-nav">
          <div className="n-sec">Asosiy</div>
          <div className={`n-item${page === "warehouses" || page === "whdetail" ? " active" : ""}`}
            onClick={() => { setPage("warehouses"); setSelectedWh(null); }}>
            <I n="wh" s={15} />Omborlar (Depolar)
          </div>
          <div className={`n-item${page === "buylist" ? " active" : ""}`}
            onClick={() => { setPage("buylist"); setSelectedWh(null); }}>
            <I n="bx" s={15} />Xarid ro'yxati (Buylist)
          </div>
          <div className="n-div" />
          <div className={`n-item${page === "reports" ? " active" : ""}`}
            onClick={() => { setPage("reports"); setSelectedWh(null); }}>
            <I n="ch" s={15} />Hisobotlar
          </div>
          <div className="n-div" />
          <div className="dm-row" onClick={() => setDarkMode(v => !v)}>
            <I n={darkMode ? "sun" : "moon"} s={15} />
            <span className="dm-label">{darkMode ? "Yorug' rejim" : "Tungi rejim"}</span>
            <Toggle checked={darkMode} onChange={setDarkMode} />
          </div>
          <div style={{ flex: 1 }} />
        </nav>
        <div className="s-foot">
          <div style={{ padding: "6px 10px", fontSize: 11, color: "var(--text4)", marginBottom: 4 }}>
            🟢 {BASE}
          </div>
          <div className="n-item danger" onClick={onLogout}>
            <I n="logout" s={15} />Chiqish
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
                  <span className="breadcrumb-link" onClick={backToWarehouses}>Omborlar</span>
                  <span className="breadcrumb-sep">›</span>
                  <span className="breadcrumb-active">{selectedWh?.name}</span>
                </div>
              ) : (
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {page === "warehouses" ? "Omborlar" : page === "buylist" ? "Xarid ro'yxati" : "Hisobotlar"}
                </div>
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
            <div className="av" style={{ width: 34, height: 34, fontSize: 12, cursor: "pointer" }}>
              {userName.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="content">
          {apiError && (
            <div className="api-err">
              <I n="warn" s={16} c="var(--red)" />
              {apiError}
              <button className="btn bo bs" style={{ marginLeft: "auto" }} onClick={fetchWarehouses}>
                <I n="refresh" s={13} />Qayta urinish
              </button>
            </div>
          )}

          {page === "warehouses" && (
            <WarehousePage
              warehouses={warehouses}
              buylist={buylist}
              loading={loadingWh}
              onRefresh={fetchWarehouses}
              addToast={addToast}
              onOpenWh={goToWh}
            />
          )}
          {page === "whdetail" && selectedWh && (
            <WarehouseDetail
              wh={selectedWh}
              setWh={setSelectedWh}
              warehouses={warehouses}
              buylist={buylist}
              setBuylist={setBuylist}
              addToast={addToast}
              onBack={backToWarehouses}
            />
          )}
          {page === "buylist" && (
            <BuylistPage
              buylist={buylist}
              setBuylist={setBuylist}
              warehouses={warehouses}
              loading={loadingBl}
              onRefresh={fetchBuylist}
              addToast={addToast}
            />
          )}
          {page === "reports" && (
            <ReportsPage warehouses={warehouses} buylist={buylist} addToast={addToast} />
          )}
        </main>

        <footer className="footer">
          <div className="fh">
            <div className="ht">RENOFLOW API</div>
            <div className="hs">
              <span className="od" />&nbsp;{BASE}&nbsp;·&nbsp;
              <span style={{ color: "var(--green)", fontWeight: 700 }}>{warehouses.length} ombor</span>
            </div>
          </div>
          <div className="fc">© 2024 RenoFlow Systems · 2.0.0-api-tsx</div>
        </footer>
      </div>
    </div>
  );
}

// ═══════════════════ WAREHOUSE PAGE ═══════════════════
interface WarehousePageProps {
  warehouses: Warehouse[];
  buylist: BuylistItem[];
  loading: boolean;
  onRefresh: () => void;
  addToast: (msg: string, type?: Toast["type"]) => void;
  onOpenWh: (wh: Warehouse) => void;
}

interface WhForm {
  name: string; addr: string; manager: string;
  phone: string; type: string; capacity: string;
  usd: string; som: string;
}

function WarehousePage({ warehouses, buylist, loading, onRefresh, addToast, onOpenWh }: WarehousePageProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<Warehouse | null>(null);
  const [showDel, setShowDel] = useState<Warehouse | null>(null);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const EMPTY_FORM: WhForm = { name: "", addr: "", manager: "", phone: "", type: "General", capacity: "", usd: "", som: "" };
  const [form, setForm] = useState<WhForm>(EMPTY_FORM);

  useEffect(() => {
    const h = () => setOpenMenu(null);
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, []);

  const filtered = warehouses.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.addr.toLowerCase().includes(search.toLowerCase())
  );

  function buildPayload(f: WhForm) {
    return { name: f.name, address: f.addr, manager: f.manager, phone: f.phone, type: f.type, capacity: f.capacity, usd_value: f.usd || "0", som_value: f.som || "0" };
  }

  async function addWH() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await depolarAPI.create(buildPayload(form));
      addToast(`"${form.name}" yaratildi!`);
      setShowAdd(false);
      setForm(EMPTY_FORM);
      onRefresh();
    } catch (e) { addToast(`Xato: ${(e as Error).message}`, "error"); }
    finally { setSaving(false); }
  }

  async function editWH() {
    if (!showEdit) return;
    setSaving(true);
    try {
      await depolarAPI.update(showEdit.id, buildPayload(form));
      addToast("Ombor yangilandi!");
      setShowEdit(null);
      onRefresh();
    } catch (e) { addToast(`Xato: ${(e as Error).message}`, "error"); }
    finally { setSaving(false); }
  }

  async function delWH(wh: Warehouse) {
    try {
      await depolarAPI.delete(wh.id);
      addToast(`"${wh.name}" o'chirildi`, "error");
      onRefresh();
    } catch (e) { addToast(`Xato: ${(e as Error).message}`, "error"); }
  }

  function openEdit(wh: Warehouse) {
    setForm({ name: wh.name, addr: wh.addr, manager: wh.manager, phone: wh.phone, type: wh.type, capacity: wh.capacity, usd: wh.usd.replace("$", ""), som: String(wh.som) });
    setShowEdit(wh);
    setOpenMenu(null);
  }

  const setF = (key: keyof WhForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const formFields = (
    <>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Nomi *</label><input className="form-input" value={form.name} onChange={setF("name")} /></div>
        <div className="form-group"><label className="form-label">Turi</label><input className="form-input" value={form.type} onChange={setF("type")} /></div>
      </div>
      <div className="form-group"><label className="form-label">Manzil</label><input className="form-input" value={form.addr} onChange={setF("addr")} /></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Menejer</label><input className="form-input" value={form.manager} onChange={setF("manager")} /></div>
        <div className="form-group"><label className="form-label">Telefon</label><input className="form-input" value={form.phone} onChange={setF("phone")} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">USD</label><input className="form-input" value={form.usd} onChange={setF("usd")} /></div>
        <div className="form-group"><label className="form-label">SOM</label><input className="form-input" value={form.som} onChange={setF("som")} /></div>
      </div>
    </>
  );

  return (
    <div className="fu">
      {showAdd && (
        <Modal title="Yangi Ombor" onClose={() => setShowAdd(false)}
          footer={<><button className="btn bo" onClick={() => setShowAdd(false)}>Bekor</button><button className="btn bp" onClick={addWH} disabled={saving}>{saving ? "..." : "Saqlash"}</button></>}>
          {formFields}
        </Modal>
      )}
      {showEdit && (
        <Modal title="Omborni Tahrirlash" onClose={() => setShowEdit(null)}
          footer={<><button className="btn bo" onClick={() => setShowEdit(null)}>Bekor</button><button className="btn bp" onClick={editWH} disabled={saving}>{saving ? "..." : "Saqlash"}</button></>}>
          {formFields}
        </Modal>
      )}
      {showDel && (
        <ConfirmModal title="Omborni o'chirish"
          desc={<>«<strong>{showDel.name}</strong>»ni o'chirmoqchimisiz?</>}
          onConfirm={() => delWH(showDel)} onClose={() => setShowDel(null)} />
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>Omborlar</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>{warehouses.length} ta ombor · /depolar/ API</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div className="sw-wrap" style={{ width: 200 }}>
            <span className="si-ico"><I n="sr" s={14} /></span>
            <input placeholder="Qidirish..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn bp" onClick={() => { setForm(EMPTY_FORM); setShowAdd(true); }}>
            <I n="pl" s={14} c="#fff" />Yangi Ombor
          </button>
        </div>
      </div>

      <div className="sg sg3">
        <div className="sc"><div className="slb">Jami Omborlar</div><div className="sv">{warehouses.length}</div><div style={{ marginTop: 7 }}><span className="badge bdg">Hammasi Faol</span></div></div>
        <div className="sc"><div className="slb">Jami Buylist</div><div className="sv bl">{buylist.length}</div><div className="sss">Barcha omborlarda</div></div>
        <div className="sc"><div className="slb">Kam Zaxira</div><div className="sv rd">{buylist.filter(i => i.low).length}</div><div className="sss">Diqqat talab</div></div>
      </div>

      {loading ? <Spinner /> : (
        <div className="wg">
          {filtered.map((w) => {
            const icColor = WC_ICON_COLOR[w.wc];
            const whBuylist = buylist.filter(b => String(b.wh) === String(w.id));
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
                  <div className="wss">
                    Buylist: <strong>{whBuylist.length} ta</strong>
                    {whBuylist.filter(b => b.low).length > 0 && (
                      <span style={{ color: "var(--red)", fontWeight: 700, fontSize: 11, marginLeft: 7 }}>
                        ⚠ {whBuylist.filter(b => b.low).length} kam
                      </span>
                    )}
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
          {!loading && filtered.length === 0 && warehouses.length > 0 && (
            <div style={{ gridColumn: "span 3" }}>
              <div className="empty-state"><h3>Natija topilmadi</h3><p>"{search}" bo'yicha ombor yo'q</p></div>
            </div>
          )}
          <div className="aw" onClick={() => { setForm(EMPTY_FORM); setShowAdd(true); }}>
            <div className="awc"><I n="pl" s={20} /></div>
            <div className="awt">Ombor qo'shish</div>
            <div className="aws">Yangi ombor yarating.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════ WAREHOUSE DETAIL ═══════════════════
interface WarehouseDetailProps {
  wh: Warehouse;
  setWh: React.Dispatch<React.SetStateAction<Warehouse | null>>;
  warehouses: Warehouse[];
  buylist: BuylistItem[];
  setBuylist: React.Dispatch<React.SetStateAction<BuylistItem[]>>;
  addToast: (msg: string, type?: Toast["type"]) => void;
  onBack: () => void;
}

interface ItemForm { name: string; sku: string; qty: string; unit: string; price: string; cur: string; }
interface WhEditForm { name: string; addr: string; manager: string; phone: string; type: string; usd: string; som: string; }

function WarehouseDetail({ wh, setWh, buylist, setBuylist, addToast, onBack }: WarehouseDetailProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<BuylistItem | null>(null);
  const [delItem, setDelItem] = useState<BuylistItem | null>(null);
  const [showEditWh, setShowEditWh] = useState(false);
  const EMPTY_ITEM: ItemForm = { name: "", sku: "", qty: "", unit: "pcs", price: "", cur: "USD" };
  const [form, setForm] = useState<ItemForm>(EMPTY_ITEM);
  const [whForm, setWhForm] = useState<WhEditForm>({
    name: wh.name, addr: wh.addr, manager: wh.manager,
    phone: wh.phone, type: wh.type, usd: wh.usd.replace("$", ""), som: String(wh.som),
  });
  const [search, setSearch] = useState("");
  const [pg, setPg] = useState(1);
  const [saving, setSaving] = useState(false);
  const PER = 7;

  const whBuylist = buylist.filter(b => String(b.wh) === String(wh.id));
  const filtered = whBuylist.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.sku.toLowerCase().includes(search.toLowerCase())
  );
  const totalPgs = Math.max(1, Math.ceil(filtered.length / PER));
  const shown = filtered.slice((pg - 1) * PER, pg * PER);
  const lowCount = whBuylist.filter(i => i.low).length;
  const grad = WC_GRADIENT[wh.wc];

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
      addToast(`"${form.name}" qo'shildi!`);
      setShowAdd(false);
      setForm(EMPTY_ITEM);
    } catch (e) { addToast(`Xato: ${(e as Error).message}`, "error"); }
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
      addToast("Mahsulot yangilandi!");
      setEditItem(null);
    } catch (e) { addToast(`Xato: ${(e as Error).message}`, "error"); }
    finally { setSaving(false); }
  }

  async function delBuylist(item: BuylistItem) {
    try {
      await buylistAPI.delete(item.id);
      setBuylist(prev => prev.filter(i => i.id !== item.id));
      addToast(`"${item.name}" o'chirildi`, "error");
    } catch (e) { addToast(`Xato: ${(e as Error).message}`, "error"); }
  }

  async function saveWh() {
    setSaving(true);
    try {
      const updated = await depolarAPI.update(wh.id, {
        name: whForm.name, address: whForm.addr, manager: whForm.manager,
        phone: whForm.phone, type: whForm.type,
        usd_value: whForm.usd, som_value: whForm.som,
      });
      setWh(prev => prev ? { ...prev, ...normalizeDepolar(updated, 0) } : null);
      addToast("Ombor yangilandi!");
      setShowEditWh(false);
    } catch (e) { addToast(`Xato: ${(e as Error).message}`, "error"); }
    finally { setSaving(false); }
  }

  function openEdit(item: BuylistItem) {
    setForm({ name: item.name, sku: item.sku, qty: String(item.qty), unit: item.unit, price: item.price, cur: item.cur });
    setEditItem(item);
  }

  const setF = (key: keyof ItemForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const inlineInput = (style?: React.CSSProperties): React.CSSProperties => ({
    width: "100%", padding: "8px 12px", border: "1.5px solid var(--border2)",
    borderRadius: "var(--rs)", fontFamily: "inherit", fontSize: 14,
    color: "var(--text)", background: "var(--surface)", outline: "none", ...style,
  });

  const inlineSelect: React.CSSProperties = {
    padding: "8px 10px", border: "1px solid var(--border2)", borderRadius: "var(--rs)",
    fontFamily: "inherit", fontSize: 13, color: "var(--text)", background: "var(--surface)",
  };

  const itemFormBody = (
    <>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Nomi *</label><input className="form-input" value={form.name} onChange={setF("name")} /></div>
        <div className="form-group"><label className="form-label">SKU</label><input className="form-input" value={form.sku} onChange={setF("sku")} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Miqdor</label><input className="form-input" type="number" value={form.qty} onChange={setF("qty")} /></div>
        <div className="form-group"><label className="form-label">Birlik</label>
          <select className="form-select" value={form.unit} onChange={setF("unit")}>
            <option>pcs</option><option>m²</option><option>boxes</option><option>cans</option><option>kg</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Narx</label><input className="form-input" value={form.price} onChange={setF("price")} /></div>
        <div className="form-group"><label className="form-label">Valyuta</label>
          <select className="form-select" value={form.cur} onChange={setF("cur")}>
            <option>USD</option><option>SOM</option>
          </select>
        </div>
      </div>
    </>
  );

  return (
    <div className="fu">
      {editItem && (
        <Modal title="Mahsulotni Tahrirlash" onClose={() => setEditItem(null)}
          footer={<><button className="btn bo" onClick={() => setEditItem(null)}>Bekor</button><button className="btn bp" onClick={saveEdit} disabled={saving}>{saving ? "..." : "Saqlash"}</button></>}>
          {itemFormBody}
        </Modal>
      )}
      {delItem && (
        <ConfirmModal title="Mahsulotni o'chirish"
          desc={<>«<strong>{delItem.name}</strong>»ni o'chirmoqchimisiz?</>}
          onConfirm={() => delBuylist(delItem)} onClose={() => setDelItem(null)} />
      )}
      {showEditWh && (
        <Modal title="Omborni Tahrirlash" onClose={() => setShowEditWh(false)}
          footer={<><button className="btn bo" onClick={() => setShowEditWh(false)}>Bekor</button><button className="btn bp" onClick={saveWh} disabled={saving}>{saving ? "..." : "Saqlash"}</button></>}>
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
          {([
            { l: "Buylist", v: String(whBuylist.length), c: "var(--blue)", s: "ta mahsulot" },
            { l: "Kam Zaxira", v: String(lowCount), c: lowCount > 0 ? "var(--red)" : "var(--green)", s: lowCount > 0 ? "diqqat talab" : "Hammasi yaxshi ✓" },
            { l: "USD Qiymat", v: wh.usd, c: "var(--green)", s: "" },
            { l: "SOM Qiymat", v: Number(String(wh.som).replace(/,/g, "")).toLocaleString(), c: "var(--orange)", s: "so'm" },
          ] as { l: string; v: string; c: string; s: string }[]).map((stat, i) => (
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
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><I n="bx" s={13} />Buylist ({whBuylist.length})</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "0 14px" }}>
            <div className="sw-wrap" style={{ width: 200 }}>
              <span className="si-ico"><I n="sr" s={14} /></span>
              <input placeholder="Qidirish..." value={search} onChange={e => { setSearch(e.target.value); setPg(1); }} />
            </div>
            <button className="btn bp bs" onClick={() => { setShowAdd(v => !v); setForm(EMPTY_ITEM); }}>
              <I n={showAdd ? "x" : "pl"} s={13} c="#fff" />{showAdd ? "Bekor" : "+ Qo'shish"}
            </button>
          </div>
        </div>

        {showAdd && (
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", background: "var(--blue-l)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 120px 80px 40px", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <input style={inlineInput({ border: "1.5px solid var(--blue)" })} placeholder="Mahsulot nomi" value={form.name} onChange={setF("name")} onKeyDown={e => e.key === "Enter" && addItem()} />
              <input style={inlineInput()} placeholder="Miqdor" type="number" value={form.qty} onChange={setF("qty")} />
              <input style={inlineInput()} placeholder="Narx" value={form.price} onChange={setF("price")} />
              <select style={inlineSelect} value={form.cur} onChange={setF("cur")}><option>USD</option><option>SOM</option></select>
              <button className="btn bp" style={{ padding: "7px 8px", justifyContent: "center" }} onClick={addItem} disabled={saving}>
                <I n="ck" s={14} c="#fff" />
              </button>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600 }}>SKU:</span>
              <input style={{ ...inlineInput(), width: 140 }} placeholder="ixtiyoriy" value={form.sku} onChange={setF("sku")} />
              <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, marginLeft: 6 }}>Birlik:</span>
              <select style={inlineSelect} value={form.unit} onChange={setF("unit")}>
                <option>pcs</option><option>m²</option><option>boxes</option><option>cans</option><option>kg</option>
              </select>
            </div>
          </div>
        )}

        {shown.length === 0 ? (
          <div className="empty-state"><I n="bx" s={38} c="var(--border2)" /><h3>Buylist bo'sh</h3><p>Bu ombor uchun mahsulot qo'shing.</p></div>
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
        <button className="back-link" onClick={onBack}><I n="arr" s={14} />← Omborlarga qaytish</button>
        <button className="btn bo" onClick={() => setShowEditWh(true)}><I n="ed" s={14} />Omborni Tahrirlash</button>
      </div>
    </div>
  );
}

// ═══════════════════ BUYLIST PAGE ═══════════════════
interface BuylistPageProps {
  buylist: BuylistItem[];
  setBuylist: React.Dispatch<React.SetStateAction<BuylistItem[]>>;
  warehouses: Warehouse[];
  loading: boolean;
  onRefresh: () => void;
  addToast: (msg: string, type?: Toast["type"]) => void;
}

interface BuylistForm { name: string; sku: string; qty: string; unit: string; price: string; cur: string; wh: string; }

function BuylistPage({ buylist, setBuylist, warehouses, loading, onRefresh, addToast }: BuylistPageProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [delItem, setDelItem] = useState<BuylistItem | null>(null);
  const [search, setSearch] = useState("");
  const [filterWh, setFilterWh] = useState("all");
  const [pg, setPg] = useState(1);
  const [saving, setSaving] = useState(false);
  const EMPTY: BuylistForm = { name: "", sku: "", qty: "", unit: "pcs", price: "", cur: "USD", wh: "" };
  const [form, setForm] = useState<BuylistForm>(EMPTY);
  const PER = 10;

  let filtered = buylist.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.sku.toLowerCase().includes(search.toLowerCase())
  );
  if (filterWh !== "all") filtered = filtered.filter(i => String(i.wh) === filterWh);
  const totalPgs = Math.max(1, Math.ceil(filtered.length / PER));
  const shown = filtered.slice((pg - 1) * PER, pg * PER);

  const setF = (key: keyof BuylistForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  async function addItem() {
    if (!form.name || !form.qty) return;
    setSaving(true);
    try {
      const created = await buylistAPI.create({
        name: form.name, sku: form.sku || `SKU-${Date.now()}`,
        qty: Number(form.qty), unit: form.unit, price: form.price,
        currency: form.cur, depolar: form.wh ? Number(form.wh) : null,
        low_stock: Number(form.qty) < 20,
      });
      setBuylist(prev => [...prev, normalizeBuylist(created)]);
      addToast(`"${form.name}" qo'shildi!`);
      setShowAdd(false);
      setForm(EMPTY);
    } catch (e) { addToast(`Xato: ${(e as Error).message}`, "error"); }
    finally { setSaving(false); }
  }

  async function delBl(item: BuylistItem) {
    try {
      await buylistAPI.delete(item.id);
      setBuylist(prev => prev.filter(i => i.id !== item.id));
      addToast(`"${item.name}" o'chirildi`, "error");
    } catch (e) { addToast(`Xato: ${(e as Error).message}`, "error"); }
  }

  const whName = (id: number | null) =>
    id ? (warehouses.find(w => String(w.id) === String(id))?.name ?? "—") : "—";

  return (
    <div className="fu">
      {showAdd && (
        <Modal title="Yangi Mahsulot Qo'shish" onClose={() => setShowAdd(false)}
          footer={<><button className="btn bo" onClick={() => setShowAdd(false)}>Bekor</button><button className="btn bp" onClick={addItem} disabled={saving}>{saving ? "..." : "Saqlash"}</button></>}>
          <div className="form-group"><label className="form-label">Nomi *</label><input className="form-input" value={form.name} onChange={setF("name")} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">SKU</label><input className="form-input" value={form.sku} onChange={setF("sku")} /></div>
            <div className="form-group"><label className="form-label">Ombor</label>
              <select className="form-select" value={form.wh} onChange={setF("wh")}>
                <option value="">— Tanlang —</option>
                {warehouses.map(w => <option key={w.id} value={String(w.id)}>{w.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Miqdor</label><input className="form-input" type="number" value={form.qty} onChange={setF("qty")} /></div>
            <div className="form-group"><label className="form-label">Birlik</label><select className="form-select" value={form.unit} onChange={setF("unit")}><option>pcs</option><option>m²</option><option>boxes</option><option>cans</option><option>kg</option></select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Narx</label><input className="form-input" value={form.price} onChange={setF("price")} /></div>
            <div className="form-group"><label className="form-label">Valyuta</label><select className="form-select" value={form.cur} onChange={setF("cur")}><option>USD</option><option>SOM</option></select></div>
          </div>
        </Modal>
      )}
      {delItem && (
        <ConfirmModal title="Mahsulotni o'chirish"
          desc={<>«<strong>{delItem.name}</strong>»ni o'chirmoqchimisiz?</>}
          onConfirm={() => delBl(delItem)} onClose={() => setDelItem(null)} />
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>Xarid Ro'yxati</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>{buylist.length} ta mahsulot · /buylist/ API</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn bo" onClick={onRefresh}><I n="refresh" s={14} />Yangilash</button>
          <button className="btn bp" onClick={() => setShowAdd(true)}><I n="pl" s={14} c="#fff" />Qo'shish</button>
        </div>
      </div>

      <div className="sg sg3" style={{ marginBottom: 16 }}>
        <div className="sc"><div className="slb">Jami Mahsulotlar</div><div className="sv">{buylist.length}</div></div>
        <div className="sc"><div className="slb">Kam Zaxira</div><div className="sv rd">{buylist.filter(i => i.low).length}</div><div className="sss">Diqqat talab</div></div>
        <div className="sc"><div className="slb">USD Mahsulotlar</div><div className="sv bl">{buylist.filter(i => i.cur === "USD").length}</div></div>
      </div>

      <div className="tc">
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", display: "flex", gap: 10 }}>
          <div className="sw-wrap" style={{ flex: 1 }}>
            <span className="si-ico"><I n="sr" s={14} /></span>
            <input placeholder="Qidirish..." value={search} onChange={e => { setSearch(e.target.value); setPg(1); }} />
          </div>
          <select value={filterWh} onChange={e => { setFilterWh(e.target.value); setPg(1); }}>
            <option value="all">Barcha omborlar</option>
            {warehouses.map(w => <option key={w.id} value={String(w.id)}>{w.name}</option>)}
          </select>
        </div>

        {loading ? <Spinner /> : shown.length === 0 ? (
          <div className="empty-state"><I n="bx" s={38} c="var(--border2)" /><h3>Mahsulot yo'q</h3><p>Birinchi mahsulotni qo'shing.</p></div>
        ) : (
          <table>
            <thead><tr><th>Mahsulot</th><th>Ombor</th><th>Miqdor</th><th>Narx</th><th>Valyuta</th><th>Jami</th><th>Sana</th><th></th></tr></thead>
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
                  <td className="dv">{whName(item.wh)}</td>
                  <td><span className={`qv${item.low ? " ql" : ""}`}>{item.qty}</span> <span style={{ fontSize: 12, color: "var(--text4)" }}>{item.unit}</span></td>
                  <td style={{ fontWeight: 500 }}>{item.price}</td>
                  <td><span className={`cpill cp-${item.cur === "USD" ? "u" : "s"}`}>{item.cur}</span></td>
                  <td className="tvv">{item.total}</td>
                  <td className="dv">{item.date}</td>
                  <td><div className="arr">
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
    </div>
  );
}

// ═══════════════════ REPORTS ═══════════════════
interface ReportsPageProps {
  warehouses: Warehouse[];
  buylist: BuylistItem[];
  addToast: (msg: string, type?: Toast["type"]) => void;
}

function ReportsPage({ warehouses, buylist, addToast }: ReportsPageProps) {
  const byWH = warehouses.map(w => ({
    name: w.name.split(" ").slice(0, 2).join(" "),
    count: buylist.filter(b => String(b.wh) === String(w.id)).length,
  }));
  const maxWH = Math.max(...byWH.map(w => w.count), 1);
  const colors = ["var(--blue)", "var(--orange)", "var(--purple)", "var(--green)"];

  return (
    <div className="fu">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.025em" }}>Hisobotlar</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>Barcha omborlar bo'yicha analitika</p>
        </div>
        <button className="btn bp" onClick={() => addToast("PDF eksport tez kunda!", "info")}>
          <I n="dl" s={14} c="#fff" />PDF Eksport
        </button>
      </div>

      <div className="sg">
        <div className="sc"><div className="slb">Jami Buylist</div><div className="sv">{buylist.length}</div></div>
        <div className="sc"><div className="slb">Omborlar</div><div className="sv bl">{warehouses.length}</div></div>
        <div className="sc"><div className="slb">Kam Zaxira</div><div className="sv rd">{buylist.filter(i => i.low).length}</div></div>
        <div className="sc"><div className="slb">USD Mahsulot</div><div className="sv" style={{ color: "var(--green)" }}>{buylist.filter(i => i.cur === "USD").length}</div></div>
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
          <div className="rep-chart-title">Mahsulotlar tahlili</div>
          {[
            { label: "USD Mahsulotlar", count: buylist.filter(i => i.cur === "USD").length, color: "var(--green)" },
            { label: "SOM Mahsulotlar", count: buylist.filter(i => i.cur === "SOM").length, color: "var(--orange)" },
            { label: "Kam Zaxira", count: buylist.filter(i => i.low).length, color: "var(--red)" },
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
        <div className="sh2"><div className="st2">Barcha Buylist Mahsulotlari</div></div>
        {buylist.length === 0 ? (
          <div className="empty-state"><h3>Ma'lumot yo'q</h3><p>Hali buylist mahsulotlari yo'q.</p></div>
        ) : (
          <table>
            <thead><tr><th>Mahsulot</th><th>SKU</th><th>Miqdor</th><th>Narx</th><th>Valyuta</th><th>Holat</th></tr></thead>
            <tbody>
              {buylist.slice(0, 20).map((b, i) => (
                <tr key={i}>
                  <td><div className="itn">{b.name}</div></td>
                  <td className="dv">{b.sku}</td>
                  <td><span className={`qv${b.low ? " ql" : ""}`}>{b.qty}</span> <span style={{ fontSize: 12, color: "var(--text4)" }}>{b.unit}</span></td>
                  <td style={{ fontWeight: 500 }}>{b.price}</td>
                  <td><span className={`cpill cp-${b.cur === "USD" ? "u" : "s"}`}>{b.cur}</span></td>
                  <td>
                    {b.low
                      ? <span style={{ color: "var(--red)", fontWeight: 700, fontSize: 12 }}>⚠ Kam zaxira</span>
                      : <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 12 }}>✓ Yetarli</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ═══════════════════ ROOT ═══════════════════
export default function App() {
  const [user, setUser] = useState<string | null>(null);
  return user === null
    ? <><style>{makeCSS()}</style><AuthPage onLogin={name => setUser(name)} /></>
    : <Dashboard userName={user} onLogout={() => setUser(null)} />;
}