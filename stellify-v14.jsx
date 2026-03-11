import { useState, useEffect, useRef, useCallback, useMemo, memo, lazy, Suspense } from "react";

// ═══════════════════════════════════════════
//  ⚙️  KONFIGURATION
// ═══════════════════════════════════════════
const C = {
  name: "Stellify",
  tagline: "AI Career Copilot Schweiz",
  domain: "stellify.ch",
  email: "support@stellify.ch",
  address: "6300 Zug, Schweiz",
  owner: "JTSP",
  stripeMonthly: "https://buy.stripe.com/MONTHLY_LINK",
  stripeYearly:  "https://buy.stripe.com/YEARLY_LINK",
  priceM: "19.90",   // ← Angepasst: niedrigere Einstiegshürde = mehr Conversions
  priceY: "14.90",   // ← Angepasst: bei Jahresabo (~25% Rabatt)
  FREE_LIMIT: 1,
  PRO_LIMIT: 60,
  CHAT_FREE_LIMIT: 20,
  NEW_TOOL_FREE_LIMIT: 2,  // ← NEU: 3 neue Tools je 2× gratis testbar
  FAMILY_LIMIT: 4,
  TEAM_LIMIT: 10,
  stripeFamily: "https://buy.stripe.com/FAMILY_LINK",
  stripeTeam: "https://buy.stripe.com/TEAM_LINK",
  priceFamily: "34.90",    // ← Angepasst
  priceUnlimited: "59.90", // ← Angepasst
  // ── ADMIN (nur für JTSP) ──────────────────────────
  ADMIN_EMAIL: "admin@stellify.ch",
  ADMIN_PW: "Stf!Admin#2025$JTSP",  // ← Sicheres PW
  ADMIN_SECRET: "JTSP_STELLIFY_ADMIN", // ← geheimer Token
  // ── GROQ CONFIG (Backup) ──────────────────────────────
  GROQ_KEY: "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",
  // ── ANTHROPIC CONFIG ──────────────────────────────────
  // 👉 Hier deinen Anthropic API Key eintragen: https://console.anthropic.com/
  ANTHROPIC_KEY: "YOUR_ANTHROPIC_API_KEY_HERE",
  MODEL_FAST: "llama-3.1-8b-instant",
  MODEL_FULL: "llama-3.3-70b-versatile",
  FREE_MAX_TOKENS: 500,
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const groqHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${C.GROQ_KEY}`
});

const getU   = () => { try { const d=JSON.parse(localStorage.getItem("stf_u")||"{}"),m=new Date().toISOString().slice(0,7); return d.month!==m?{month:m,count:0,proCount:0,chatCount:0}:d; } catch { return {month:"",count:0,proCount:0,chatCount:0}; }};
const incU   = () => { const u=getU(); u.count++; localStorage.setItem("stf_u",JSON.stringify(u)); };
const incPro = () => { const u=getU(); u.proCount=(u.proCount||0)+1; localStorage.setItem("stf_u",JSON.stringify(u)); };
const incChat= () => { const u=getU(); u.chatCount=(u.chatCount||0)+1; localStorage.setItem("stf_u",JSON.stringify(u)); };
const getChatCount = () => getU().chatCount||0;
const getProCount = () => getU().proCount||0;
const isPro  = () => { try { return localStorage.getItem("stf_pro")==="true"; } catch { return false; }};
const actPro = () => { try { localStorage.setItem("stf_pro","true"); } catch {}};

// ── NEUE TOOL USAGE LIMITS ─────────────────────────────────────
const getNewToolUsage = () => { try { const d=JSON.parse(localStorage.getItem("stf_ntu")||"{}"),m=new Date().toISOString().slice(0,7); return d.month!==m?{month:m,cvScore:0,interviewPrep:0,jobAdAnalyzer:0}:d; } catch { return {month:"",cvScore:0,interviewPrep:0,jobAdAnalyzer:0}; }};
const incNewTool = (tool) => { const u=getNewToolUsage(); u[tool]=(u[tool]||0)+1; localStorage.setItem("stf_ntu",JSON.stringify(u)); };
const getNewToolCount = (tool) => getNewToolUsage()[tool]||0;

// ── AUTH SYSTEM ─────────────────────────────────────────────────
// User object: {email, pw, plan, seats, members, activatedAt, provider, avatar, displayName, newToolUsage}
const AUTH_KEY = "stf_auth_users";
const SESSION_KEY = "stf_session";

function authGetUsers() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)||"[]"); } catch { return []; }
}
function authSaveUsers(users) {
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(users)); } catch {}
}
function authGetSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)||"null"); } catch { return null; }
}
function authSetSession(session) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
}
function authClearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

// Standard E-Mail Registrierung
function authRegister(email, pw, plan, provider="email", displayName="", avatar="") {
  const users = authGetUsers();
  if(users.find(u=>u.email.toLowerCase()===email.toLowerCase())) return {ok:false,err:"E-Mail bereits registriert."};
  const user = {
    email: email.toLowerCase(), pw, plan: plan||"free",
    seats: plan==="family"?4:plan==="team"?10:1,
    members: [email.toLowerCase()],
    activatedAt: Date.now(),
    provider, displayName: displayName||email.split("@")[0], avatar,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  authSaveUsers(users);
  authSetSession({email:user.email, plan:user.plan, displayName:user.displayName, avatar:user.avatar, provider});
  return {ok:true, user};
}

// Social Login (Google, Apple, LinkedIn) – simuliert; in Produktion via OAuth
function authSocialLogin(provider, email, displayName, avatar) {
  const users = authGetUsers();
  let user = users.find(u=>u.email.toLowerCase()===email.toLowerCase());
  if(!user) {
    // Automatisch registrieren bei Social Login
    user = {
      email: email.toLowerCase(), pw: "", plan: "free",
      seats: 1, members: [email.toLowerCase()],
      activatedAt: Date.now(), provider, displayName, avatar,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    authSaveUsers(users);
  } else {
    // Provider & Avatar aktualisieren
    user.provider = provider; user.avatar = avatar||user.avatar;
    authSaveUsers(users);
  }
  authSetSession({email:user.email, plan:user.plan, displayName:user.displayName||displayName, avatar:user.avatar||avatar, provider});
  return {ok:true, user};
}

function authLogin(email, pw) {
  const users = authGetUsers();
  const user = users.find(u=>u.email.toLowerCase()===email.toLowerCase() && u.pw===pw);
  if(!user) return {ok:false,err:"E-Mail oder Passwort falsch."};
  authSetSession({email:user.email, plan:user.plan, displayName:user.displayName, avatar:user.avatar, provider:user.provider});
  return {ok:true, user};
}
function authUpgradePlan(email, plan) {
  const users = authGetUsers();
  const idx = users.findIndex(u=>u.email.toLowerCase()===email.toLowerCase());
  if(idx>=0){
    users[idx].plan = plan;
    if(plan==="family") users[idx].seats = 4;
    if(plan==="team") users[idx].seats = 10;
    authSaveUsers(users);
    const sess = authGetSession();
    authSetSession({...sess, email:users[idx].email, plan});
    return users[idx];
  }
  const user = {email:email.toLowerCase(), pw:"", plan, seats:plan==="family"?4:plan==="team"?10:1, members:[email.toLowerCase()], activatedAt:Date.now(), provider:"stripe"};
  users.push(user);
  authSaveUsers(users);
  const sess = authGetSession();
  authSetSession({...sess, email:user.email, plan});
  return user;
}
function authGetUser(email) {
  return authGetUsers().find(u=>u.email.toLowerCase()===email.toLowerCase())||null;
}
function authAddMember(ownerEmail, memberEmail) {
  const users = authGetUsers();
  const owner = users.find(u=>u.email.toLowerCase()===ownerEmail.toLowerCase());
  if(!owner) return {ok:false,err:"Kein Account gefunden."};
  if((owner.members||[]).length >= owner.seats) return {ok:false,err:`Maximale Anzahl (${owner.seats}) erreicht.`};
  if((owner.members||[]).includes(memberEmail.toLowerCase())) return {ok:false,err:"Bereits Mitglied."};
  owner.members = [...(owner.members||[]), memberEmail.toLowerCase()];
  authSaveUsers(users);
  return {ok:true};
}
// Admin-Check: nur JTSP mit Secret-Token
function authIsAdmin(email, pw) {
  return email.toLowerCase()===C.ADMIN_EMAIL.toLowerCase() && (pw===C.ADMIN_PW || pw===C.ADMIN_SECRET);
}


// ═══════════════════════════════════════════
// 🧠 AI BACKEND – Groq API (kostenlos, ultraschnell)
// ═══════════════════════════════════════════
const groqHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${C.GROQ_KEY}`
});

const ANT_MODEL_FAST = C.MODEL_FAST;
const ANT_MODEL_FULL = C.MODEL_FULL;

// 🧠 MODEL ROUTING
const HAIKU_TOOLS = ["free","email","protokoll","uebersetzer","networking","kuendigung","lernplan","zusammenfassung","gehalt","plan306090","referenz","lehrstelle"];
const getModel = (toolId) => HAIKU_TOOLS.includes(toolId) ? C.MODEL_FAST : C.MODEL_FULL;
const getTokens = (toolId, stream=false) => toolId==="free" ? C.FREE_MAX_TOKENS : HAIKU_TOOLS.includes(toolId) ? (stream?600:500) : (stream?1400:1200);

function buildMessages(prompt, system) {
  const msgs = [];
  if(system) msgs.push({role:"system", content:system});
  if(typeof prompt === "string") msgs.push({role:"user", content:prompt});
  else msgs.push(...prompt.filter(m => m.role !== "system"));
  return msgs;
}

function getSystem(prompt, system) {
  if(system) return system;
  if(Array.isArray(prompt)) {
    const sys = prompt.find(m => m.role === "system");
    return sys ? sys.content : "";
  }
  return "";
}

async function callAI(prompt, system, toolId="") {
  const sys = getSystem(prompt, system);
  let r;
  try {
    r = await fetch(GROQ_URL, {
      method:"POST",
      headers: groqHeaders(),
      body: JSON.stringify({
        model: getModel(toolId),
        max_tokens: getTokens(toolId),
        messages: buildMessages(prompt, sys)
      })
    });
  } catch(e) { throw new Error("Netzwerkfehler – Internetverbindung prüfen."); }
  if(r.status===401) throw new Error("Groq API-Schlüssel ungültig – Key prüfen.");
  if(r.status===429) throw new Error("Zu viele Anfragen – bitte kurz warten.");
  if(r.status===503||r.status===529) throw new Error("KI überlastet – in 30 Sek. nochmals versuchen.");
  const d = await r.json();
  if(d.error) throw new Error(d.error.message);
  return d.choices?.[0]?.message?.content || "";
}

async function streamAI(prompt, onChunk, system, toolId="") {
  const sys = getSystem(prompt, system);
  let resp;
  try {
    resp = await fetch(GROQ_URL, {
      method:"POST",
      headers: groqHeaders(),
      body: JSON.stringify({
        model: getModel(toolId),
        max_tokens: getTokens(toolId, true),
        stream: true,
        messages: buildMessages(prompt, sys)
      })
    });
  } catch(e) { throw new Error("Netzwerkfehler – Internetverbindung prüfen."); }
  if(!resp.ok) { const e=await resp.json(); throw new Error(e.error?.message||"API Fehler"); }
  const reader = resp.body.getReader(); const dec = new TextDecoder(); let full = "";
  while(true) {
    const {done,value} = await reader.read(); if(done) break;
    for(const line of dec.decode(value,{stream:true}).split("\n")) {
      if(!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim(); if(!data||data==="[DONE]") continue;
      try { const ev=JSON.parse(data); const t=ev.choices?.[0]?.delta?.content; if(t){full+=t;onChunk(full);} } catch{}
    }
  }
  return full;
}

// Groq unterstützt keine Datei-Uploads – Text wird direkt übergeben
async function callAIWithFile(file, prompt) {
  // Datei als Text lesen falls möglich, sonst Fehlermeldung
  return await callAI(prompt, "", C.MODEL_FULL);
}

async function callAIWithFileStreaming(file, prompt, onChunk) {
  return await streamAI(prompt, onChunk, "", C.MODEL_FULL);
}




// ── FONTS & CSS ──
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Figtree:wght@300;400;500;600&display=swap');`;
const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--ink:#1d1d1f;--bg:#f5f5f7;--em:#10b981;--em2:#059669;--em3:rgba(16,185,129,.10);--am:#f59e0b;--am2:rgba(245,158,11,.14);--bl:#3b82f6;--bl2:rgba(59,130,246,.12);--mu:rgba(29,29,31,.5);--bo:rgba(29,29,31,.12);--bos:rgba(29,29,31,.06);--dk:#000000;--dk2:#141414;--dk3:#1c1c1e;--hd:'Bricolage Grotesque',system-ui,sans-serif;--bd:'Figtree',system-ui,sans-serif;--r:12px;--r2:18px}
html{scroll-behavior:smooth}body{background:var(--bg);color:var(--ink);font-family:var(--bd);font-weight:400;-webkit-font-smoothing:antialiased;letter-spacing:-.01em}
/* NAV – Apple-style frosted glass */
nav{position:sticky;top:0;z-index:200;background:rgba(245,245,247,.88);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid rgba(29,29,31,.08)}
.ni{max-width:1200px;margin:0 auto;height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 22px;gap:10px}
.logo{font-family:var(--hd);font-size:20px;font-weight:800;cursor:pointer;letter-spacing:-.6px;display:flex;align-items:center;color:var(--ink)}
.logo-dot{width:7px;height:7px;background:var(--em);border-radius:50%;margin-left:2px;margin-bottom:7px;flex-shrink:0}
.pb{font-size:10px;font-weight:700;background:linear-gradient(135deg,var(--em),var(--em2));color:white;padding:2px 8px;border-radius:20px;margin-left:8px;text-transform:uppercase;letter-spacing:.5px}
.nl{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.nl-desk{display:flex}
.ham{display:none!important}
@media(max-width:680px){.nl-desk{display:none!important}.ham{display:flex!important}}
.nlk{font-size:13px;font-weight:500;color:var(--mu);cursor:pointer;background:none;border:none;font-family:var(--bd);transition:color .15s;white-space:nowrap;padding:0}.nlk:hover{color:var(--ink)}
.nc{background:var(--ink);color:white;padding:7px 17px;border-radius:980px;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:var(--bd);transition:all .2s;letter-spacing:-.01em}.nc:hover{background:#333}
.ls{display:flex;background:rgba(29,29,31,.06);border:1px solid rgba(29,29,31,.08);border-radius:10px;padding:3px;gap:2px}
.lb{padding:4px 11px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:transparent;font-family:var(--bd);color:var(--mu);transition:all .15s;letter-spacing:.2px}.lb.on{background:white;color:var(--ink);box-shadow:0 1px 6px rgba(29,29,31,.1),0 0 0 .5px rgba(29,29,31,.06);font-weight:700}
/* HERO – Apple dark + clean */
.hero{background:#000;overflow:hidden;position:relative;padding:96px 0 80px}
.hbg{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 60% 70% at 75% 15%,rgba(16,185,129,.12) 0%,transparent 55%),radial-gradient(ellipse 45% 55% at 10% 88%,rgba(59,130,246,.06) 0%,transparent 55%)}
.hdots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.03) 1px,transparent 1px);background-size:28px 28px;pointer-events:none}
.con{max-width:1200px;margin:0 auto;padding:0 28px}.csm{max-width:820px;margin:0 auto;padding:0 28px}
.eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:600;letter-spacing:1.8px;text-transform:uppercase;color:var(--em);background:rgba(16,185,129,.09);border:1px solid rgba(16,185,129,.2);padding:5px 13px;border-radius:980px;margin-bottom:24px}
h1.hh{font-family:var(--hd);font-size:clamp(46px,7vw,82px);font-weight:800;line-height:.96;letter-spacing:-3.5px;color:white;margin-bottom:20px;max-width:860px}
h1.hh em{font-style:normal;color:var(--em)}
.hsub{font-size:17px;font-weight:300;color:rgba(255,255,255,.48);max-width:540px;line-height:1.75;margin-bottom:36px;letter-spacing:-.01em}
.hctas{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.hstats{margin-top:60px;display:flex;gap:44px;flex-wrap:wrap}
.stat-n{font-family:var(--hd);font-size:28px;font-weight:800;color:white;letter-spacing:-1px;line-height:1}.stat-l{font-size:11px;color:rgba(255,255,255,.32);margin-top:4px;letter-spacing:.1px}
/* BUTTONS – Apple pill style */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 22px;border-radius:980px;font-family:var(--bd);font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .2s;white-space:nowrap;text-decoration:none;letter-spacing:-.01em}
.b-em{background:var(--em);color:white}.b-em:hover{background:var(--em2);box-shadow:0 8px 24px rgba(16,185,129,.26)}
.b-dk{background:var(--ink);color:white}.b-dk:hover{background:#333}
.b-bl{background:var(--bl);color:white}.b-bl:hover{background:#2563eb;box-shadow:0 8px 24px rgba(59,130,246,.26)}
.b-out{background:rgba(255,255,255,.08);color:white;border:1px solid rgba(255,255,255,.16)}.b-out:hover{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.28)}
.b-outd{background:transparent;color:var(--ink);border:1px solid rgba(29,29,31,.2)}.b-outd:hover{border-color:var(--em);color:var(--em)}
.b-sm{padding:7px 15px;font-size:13px}.b-lg{padding:14px 32px;font-size:15px}.b-w{width:100%}
.btn:disabled{opacity:.35;cursor:not-allowed!important;box-shadow:none!important}
/* SECTIONS */
.sec{padding:80px 0}.sec-dk{background:#000}.sec-dk2{background:#141414}.sec-w{background:white}.sec-bg{background:#f5f5f7}
.sh{margin-bottom:48px}.shc{text-align:center}.shc .ss{margin:0 auto}
.seye{font-size:11px;font-weight:600;letter-spacing:1.8px;text-transform:uppercase;color:var(--em);margin-bottom:12px}
.st{font-family:var(--hd);font-size:clamp(30px,4vw,48px);font-weight:800;line-height:1.04;letter-spacing:-1.8px;margin-bottom:13px}
.sec-dk .st,.sec-dk2 .st{color:white}
.ss{font-size:16px;font-weight:400;line-height:1.75;color:var(--mu);max-width:540px}
.sec-dk .ss,.sec-dk2 .ss{color:rgba(255,255,255,.4)}
/* TOOLS GRID */
.tools-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.tool-card{padding:26px;border-radius:var(--r2);border:1px solid var(--bo);background:white;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;text-align:left}
.tool-card:hover{box-shadow:0 8px 32px rgba(29,29,31,.09);border-color:rgba(16,185,129,.3)}
.tool-card.bl:hover{border-color:rgba(59,130,246,.3)}.tool-card.am:hover{border-color:rgba(245,158,11,.3)}
.tc-ico{font-size:28px;margin-bottom:12px}
.tc-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px}
.tc-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:.5px;flex-shrink:0;margin-top:2px}
.tc-em{background:var(--em3);color:var(--em2)}.tc-bl{background:var(--bl2);color:var(--bl)}.tc-am{background:var(--am2);color:#92400e}
.tc-t{font-family:var(--hd);font-size:16px;font-weight:700;margin-bottom:6px;color:var(--ink)}
.tc-p{font-size:13px;line-height:1.7;color:var(--mu)}
/* WHY VS */
.why-vs{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:40px}
.why-col{border-radius:var(--r2);padding:26px;border:1px solid var(--bo)}
.why-col.bad{background:#fff8f8;border-color:rgba(239,68,68,.12)}.why-col.good{background:rgba(16,185,129,.03);border-color:rgba(16,185,129,.18)}
.why-col h4{font-family:var(--hd);font-size:15px;font-weight:700;margin-bottom:13px}
.why-col li{font-size:13px;line-height:1.7;color:var(--mu);padding:6px 0;border-bottom:1px solid rgba(29,29,31,.06);display:flex;align-items:flex-start;gap:8px;list-style:none}.why-col li:last-child{border:none}
/* FEATURES */
.feat-row{display:grid;grid-template-columns:1.6fr 1fr 1fr;gap:12px;margin-bottom:12px}
@media(max-width:680px){.feat-row{grid-template-columns:1fr;gap:10px}.feat-row .feat-big{grid-row:span 1!important}}
/* 5-Karten Grid: 3+2 */
.g5-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px}
.g5-grid>*:last-child:nth-child(3n+1){grid-column:span 3}
@media(max-width:680px){.g5-grid{grid-template-columns:1fr 1fr}.g5-grid>*:last-child:nth-child(odd){grid-column:span 2}}
/* Mini-Tools */
.mini-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:8px}
@media(max-width:680px){.mini-g{grid-template-columns:1fr 1fr}.mini-g>*:last-child:nth-child(odd){grid-column:span 2}}
.fc{padding:22px;background:white;border:1px solid var(--bo);border-radius:var(--r2);position:relative;transition:all .2s}
.fc:hover{border-color:rgba(16,185,129,.28);box-shadow:0 4px 20px rgba(29,29,31,.08)}
.fc-ico{font-size:22px;margin-bottom:9px}.fc h4{font-family:var(--hd);font-size:15px;font-weight:700;margin-bottom:5px}.fc p{font-size:13px;line-height:1.7;color:var(--mu)}
.pp{position:absolute;top:12px;right:12px;font-size:10px;font-weight:700;background:linear-gradient(135deg,var(--em),var(--em2));color:white;padding:2px 7px;border-radius:20px}
.pp-am{background:linear-gradient(135deg,var(--am),#d97706)}
/* STEPS */
.srow{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;position:relative}
.srow::before{display:none}
.sc{padding:26px 22px;background:#1c1c1e;border:1px solid rgba(255,255,255,.08);border-radius:var(--r2)}
.sn{width:44px;height:44px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--hd);font-size:15px;font-weight:800;color:var(--em);margin-bottom:14px}
.sc h3{font-family:var(--hd);font-size:16px;font-weight:700;color:white;margin-bottom:7px}.sc p{font-size:13px;line-height:1.75;color:rgba(255,255,255,.38)}
/* TESTI */
.tg{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.tc2{padding:24px;background:#1c1c1e;border:1px solid rgba(255,255,255,.07);border-radius:var(--r2)}
.ts{color:var(--em);font-size:12px;margin-bottom:9px;letter-spacing:2px}.tq{font-size:13px;line-height:1.75;color:rgba(255,255,255,.65);margin-bottom:13px;font-style:italic}
.tn{font-size:13px;font-weight:600;color:white}.tr{font-size:12px;color:rgba(255,255,255,.3);margin-top:2px}
/* PRICING */
.btog{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:36px}
.bto{font-size:14px;font-weight:500;color:rgba(255,255,255,.4);cursor:pointer;transition:color .15s}.bto.on{color:white}
.btsw{width:46px;height:25px;background:rgba(255,255,255,.1);border-radius:20px;cursor:pointer;position:relative;border:1px solid rgba(255,255,255,.12);transition:background .2s;flex-shrink:0}
.btsw.yr{background:var(--em)}.btt{position:absolute;top:3px;left:3px;width:15px;height:15px;background:white;border-radius:50%;transition:transform .2s}.btsw.yr .btt{transform:translateX(21px)}
.save-t{background:rgba(245,158,11,.12);color:var(--am);border:1px solid rgba(245,158,11,.25);font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px}
.pgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;max-width:1120px;margin:0 auto}
.pc{border-radius:var(--r2);padding:24px 20px;border:1px solid rgba(255,255,255,.07);background:#1c1c1e;position:relative}
.pc.hl{border-color:var(--em);background:rgba(16,185,129,.05)}.pc.hl2{border-color:rgba(245,158,11,.25);background:rgba(245,158,11,.03)}
.bst{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--em);color:white;font-size:11px;font-weight:700;padding:3px 13px;border-radius:20px;white-space:nowrap}
.ppl{font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:10px}
.ppl.em{color:var(--em)}.ppl.am{color:var(--am)}
.ppr{font-family:var(--hd);font-size:36px;font-weight:800;color:white;line-height:1;margin-bottom:4px;letter-spacing:-2px}
.ppr span{font-size:15px;font-weight:400;color:rgba(255,255,255,.3);font-family:var(--bd);letter-spacing:0}
.pper{font-size:12px;color:rgba(255,255,255,.28);margin-bottom:22px}
.pfl{list-style:none;margin-bottom:22px}
.pfl li{font-size:13px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05);display:flex;align-items:flex-start;gap:8px;color:rgba(255,255,255,.65);line-height:1.5}.pfl li:last-child{border:none}
.pfl li.off{color:rgba(255,255,255,.2)}.pck{color:var(--em);flex-shrink:0}.pcx{color:rgba(255,255,255,.16);flex-shrink:0}
.pay-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:9px;margin-top:24px}
.pay-chip{padding:6px 13px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:980px;font-size:13px;font-weight:500;color:rgba(255,255,255,.5)}
.vb{background:rgba(16,185,129,.05);border:1px solid rgba(16,185,129,.18);border-radius:var(--r2);padding:26px;margin:26px auto 0;max-width:840px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.vb h4{font-family:var(--hd);font-size:19px;font-weight:800;color:white;grid-column:1/-1;margin-bottom:4px}
.vp{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:rgba(255,255,255,.5);line-height:1.6}
/* CTA */
.cta-sec{background:#000;padding:88px 0;text-align:center;position:relative;overflow:hidden}
.cta-sec::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 50% 50% at 50% 50%,rgba(16,185,129,.09),transparent);pointer-events:none}
/* TOOL PAGES */
.page-hdr{padding:44px 28px 0;text-align:center}
.page-hdr.dk{background:#000}.page-hdr.bl{background:linear-gradient(135deg,#0a66c2,#0077b5)}.page-hdr.am{background:linear-gradient(135deg,#92400e,#b45309)}.page-hdr.vi{background:linear-gradient(135deg,#4c1d95,#6d28d9)}
.page-hdr h1{font-family:var(--hd);font-size:30px;font-weight:800;color:white;margin-bottom:6px;letter-spacing:-1px}.page-hdr p{font-size:14px;color:rgba(255,255,255,.38)}
.asteps{max-width:620px;margin:26px auto 0;display:flex;border-bottom:1px solid rgba(255,255,255,.07)}
.as{flex:1;text-align:center;padding:10px 5px;font-size:12px;font-weight:600;color:rgba(255,255,255,.22);transition:all .22s}
.as.on{color:var(--em);border-bottom:2px solid var(--em);margin-bottom:-1px}.as.done{color:rgba(255,255,255,.38)}
.abody{max-width:720px;margin:0 auto;padding:36px 28px 80px}
/* CARDS */
.card{background:white;border:1px solid var(--bo);border-radius:var(--r2);padding:28px;box-shadow:0 2px 12px rgba(29,29,31,.06)}
.ct{font-family:var(--hd);font-size:21px;font-weight:800;margin-bottom:4px;letter-spacing:-.5px}
.cs{font-size:13px;color:var(--mu);margin-bottom:18px;line-height:1.6}
.field{margin-bottom:14px}
.field label{display:block;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--mu);margin-bottom:5px}
.field input,.field textarea,.field select{width:100%;padding:10px 13px;border:1px solid var(--bo);border-radius:10px;font-family:var(--bd);font-size:14px;font-weight:400;color:var(--ink);background:white;outline:none;transition:border-color .15s;resize:none}
.field input:focus,.field textarea:focus,.field select:focus{border-color:var(--em);box-shadow:0 0 0 3px rgba(16,185,129,.08)}
.field textarea{min-height:84px;line-height:1.65}
.fg2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.frow{display:flex;justify-content:space-between;align-items:center;margin-top:18px;gap:10px}
/* UPLOAD ZONE */
.upz{border:1.5px dashed rgba(16,185,129,.3);border-radius:14px;padding:24px;text-align:center;cursor:pointer;transition:all .18s;background:rgba(16,185,129,.02);margin-bottom:14px;position:relative}
.upz:hover,.upz.drag{border-color:var(--em);background:var(--em3)}
.upz input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.upz-ico{font-size:28px;margin-bottom:7px}.upz h4{font-family:var(--hd);font-size:14px;font-weight:700;margin-bottom:4px}.upz p{font-size:12px;color:var(--mu)}
.upz-ok{background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:9px 14px;font-size:13px;color:#15803d;margin-bottom:12px;display:flex;align-items:center;gap:7px}
/* STREAMING */
.spin{width:28px;height:28px;border:2px solid rgba(16,185,129,.15);border-top-color:var(--em);border-radius:50%;animation:sp .75s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.cursor{display:inline-block;width:2px;height:1em;background:var(--em);margin-left:1px;animation:blink .8s step-end infinite;vertical-align:text-bottom}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
.r-doc{background:#fafafa;border:1px solid var(--bo);border-radius:12px;padding:20px;font-size:14px;line-height:1.9;color:var(--ink);white-space:pre-wrap;max-height:460px;overflow-y:auto;font-family:var(--bd);min-height:80px}
.r-doc::-webkit-scrollbar{width:4px}.r-doc::-webkit-scrollbar-thumb{background:rgba(16,185,129,.3);border-radius:4px}
.r-edit{background:white;border:1.5px solid var(--em);border-radius:12px;padding:22px;font-size:14px;line-height:1.9;color:var(--ink);width:100%;min-height:340px;outline:none;font-family:var(--bd);resize:vertical;box-shadow:0 0 0 3px rgba(16,185,129,.07)}
.r-bar{display:flex;gap:7px;justify-content:flex-end;margin-bottom:10px;flex-wrap:wrap}
.r-tabs{display:flex;border-bottom:2px solid var(--bo);margin-bottom:16px}
.r-tab{padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer;border:none;background:transparent;font-family:var(--bd);color:var(--mu);border-bottom:2px solid transparent;margin-bottom:-2px;transition:all .18s}.r-tab.on{color:var(--em);border-bottom-color:var(--em)}
/* STATUS BARS */
.ubar{background:var(--em3);border:1px solid rgba(16,185,129,.2);border-radius:10px;padding:10px 15px;margin-bottom:15px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:13px}
.u-tr{flex:1;min-width:60px;height:5px;background:rgba(11,11,18,.1);border-radius:10px;overflow:hidden}
.u-fi{height:100%;background:var(--em);border-radius:10px;transition:width .4s}
.ok{background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:10px 15px;font-size:13px;color:#15803d;margin-bottom:15px}
.err{background:#fff1f1;border:1px solid #fca5a5;border-radius:10px;padding:10px 15px;font-size:13px;color:#dc2626;margin-bottom:14px}
/* Free badge pill */
.free-pill{display:inline-flex;align-items:center;gap:7px;background:rgba(16,185,129,.12);border:1.5px solid rgba(16,185,129,.3);borderRadius:30px;padding:8px 18px;font-size:13px;font-weight:700;color:var(--em);cursor:pointer;transition:all .2s}
.free-pill:hover{background:rgba(16,185,129,.2);transform:translateY(-1px)}
/* MODAL PAYWALL */
.mbg{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.mod{background:#1c1c1e;border:1px solid rgba(255,255,255,.1);border-radius:22px;padding:40px;max-width:480px;width:100%;color:white;text-align:center}
.mod h2{font-family:var(--hd);font-size:28px;font-weight:800;margin-bottom:8px;letter-spacing:-1px}
.mod p{font-size:13px;color:rgba(255,255,255,.4);margin-bottom:20px;line-height:1.7}
.mod-pr{font-family:var(--hd);font-size:42px;font-weight:800;color:var(--em);margin-bottom:4px;letter-spacing:-2px}
.mod-pr span{font-size:16px;color:rgba(255,255,255,.28);font-family:var(--bd);font-weight:300}
.mod-fts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0 20px}
.mod-f{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:10px;font-size:12px;color:rgba(255,255,255,.55)}
.mod-fi{font-size:17px;margin-bottom:3px}
.mod-note{font-size:11px;color:rgba(255,255,255,.18);margin-top:10px;line-height:1.6}
/* CHECKLIST */
.cl-sb{background:var(--em3);border:1.5px solid rgba(16,185,129,.2);border-radius:14px;padding:16px 20px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
.cl-pct{font-family:var(--hd);font-size:32px;font-weight:800;color:var(--em);letter-spacing:-1px}
.cl-bar{flex:1;min-width:100px;height:6px;background:rgba(11,11,18,.1);border-radius:10px;overflow:hidden}
.cl-fi{height:100%;background:linear-gradient(90deg,var(--em),#34d399);border-radius:10px;transition:width .5s}
.cl-row{display:flex;align-items:flex-start;gap:12px;padding:11px 4px;border-bottom:1px solid var(--bos);cursor:pointer;border-radius:8px;transition:background .14s}.cl-row:last-child{border:none}.cl-row:hover{background:rgba(16,185,129,.04)}
.cl-box{width:20px;height:20px;border-radius:5px;border:1.5px solid var(--bo);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;transition:all .18s;margin-top:2px}.cl-box.on{background:var(--em);border-color:var(--em);color:white}
.cl-text h5{font-size:14px;font-weight:500;margin-bottom:2px;transition:all .18s}.cl-text h5.d{text-decoration:line-through;color:var(--mu)}.cl-text p{font-size:12px;color:var(--mu);line-height:1.5}
/* COACH */
.chat{display:flex;flex-direction:column;gap:13px;margin-bottom:14px;max-height:400px;overflow-y:auto;padding-right:4px}
.chat::-webkit-scrollbar{width:4px}.chat::-webkit-scrollbar-thumb{background:rgba(16,185,129,.25);border-radius:4px}
.msg{display:flex;gap:10px;align-items:flex-start}.msg.u{flex-direction:row-reverse}
.msg-av{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.msg-av.ai{background:var(--dk)}.msg-av.us{background:var(--em)}
.msg-b{max-width:82%;padding:11px 14px;border-radius:13px;font-size:13px;line-height:1.75;white-space:pre-wrap}
.msg.ai .msg-b{background:white;border:1.5px solid var(--bo);color:var(--ink);border-top-left-radius:3px}
.msg.u .msg-b{background:var(--ink);color:white;border-top-right-radius:3px}
.ic-inp{display:flex;gap:9px;align-items:flex-end}
.ic-inp textarea{flex:1;padding:10px 13px;border:1.5px solid var(--bo);border-radius:10px;font-family:var(--bd);font-size:13px;color:var(--ink);background:white;outline:none;resize:none;min-height:48px;max-height:120px;line-height:1.5;transition:border-color .18s}.ic-inp textarea:focus{border-color:var(--em);box-shadow:0 0 0 3px rgba(16,185,129,.07)}
/* SCORE BOX */
.score-box{background:linear-gradient(135deg,var(--em3),rgba(16,185,129,.03));border:1.5px solid rgba(16,185,129,.2);border-radius:14px;padding:20px;margin-bottom:16px}
.score-n{font-family:var(--hd);font-size:48px;font-weight:800;color:var(--em);line-height:1;letter-spacing:-2px}
.score-n span{font-size:19px;color:var(--mu)}
.score-bar{height:6px;background:rgba(11,11,18,.1);border-radius:10px;overflow:hidden;margin-top:8px;max-width:220px}
.score-fi{height:100%;background:linear-gradient(90deg,var(--em),#34d399);border-radius:10px;transition:width .8s}
/* ATS RESULT */
.ats-score{display:flex;align-items:center;gap:20px;padding:20px;background:var(--dk3);border-radius:14px;margin-bottom:16px}
.ats-ring{position:relative;width:80px;height:80px;flex-shrink:0}
.ats-ring svg{transform:rotate(-90deg)}
.ats-ring-text{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.ats-ring-n{font-family:var(--hd);font-size:22px;font-weight:800;color:white;line-height:1}
.ats-ring-l{font-size:10px;color:rgba(255,255,255,.3);letter-spacing:.5px}
.ats-info{flex:1}
.ats-grade{font-family:var(--hd);font-size:18px;font-weight:700;color:white;margin-bottom:4px}
.ats-sub{font-size:13px;color:rgba(255,255,255,.45);line-height:1.6}
.kw-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.kw{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
.kw.found{background:var(--em3);color:var(--em2);border:1px solid rgba(16,185,129,.2)}
.kw.miss{background:rgba(239,68,68,.08);color:#dc2626;border:1px solid rgba(239,68,68,.15)}
/* ZEUGNIS */
.z-grade{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:50%;font-family:var(--hd);font-size:22px;font-weight:800;flex-shrink:0}
.z-grade.A{background:rgba(16,185,129,.15);color:var(--em2);border:2px solid rgba(16,185,129,.3)}
.z-grade.B{background:rgba(59,130,246,.12);color:var(--bl);border:2px solid rgba(59,130,246,.25)}
.z-grade.C{background:rgba(245,158,11,.12);color:#92400e;border:2px solid rgba(245,158,11,.25)}
.z-grade.D{background:rgba(239,68,68,.1);color:#dc2626;border:2px solid rgba(239,68,68,.2)}
.z-item{background:white;border:1.5px solid var(--bo);border-radius:12px;padding:18px;margin-bottom:10px;display:flex;gap:14px;align-items:flex-start}
.z-content h4{font-family:var(--hd);font-size:15px;font-weight:700;margin-bottom:5px}
.z-content p{font-size:13px;color:var(--mu);line-height:1.6}
.z-phrase{background:#fff8f0;border:1px solid rgba(245,158,11,.2);border-radius:8px;padding:10px 14px;font-size:13px;font-style:italic;color:rgba(11,11,18,.7);margin-bottom:6px;line-height:1.6}
.z-meaning{font-size:12px;color:#92400e;display:flex;align-items:center;gap:5px}
/* JOB MATCHING */
.jm-result{background:white;border:1.5px solid var(--bo);border-radius:14px;overflow:hidden;margin-bottom:10px;transition:all .2s}.jm-result:hover{border-color:var(--em);box-shadow:0 4px 16px rgba(16,185,129,.08)}
.jm-top{display:flex;align-items:center;gap:14px;padding:16px 20px}
.jm-rank{font-family:var(--hd);font-size:22px;font-weight:800;color:var(--em);width:32px;text-align:center;flex-shrink:0}
.jm-info{flex:1}.jm-title{font-family:var(--hd);font-size:16px;font-weight:700;margin-bottom:3px}
.jm-bar-wrap{width:80px;flex-shrink:0;text-align:right}
.jm-pct{font-family:var(--hd);font-size:18px;font-weight:800;color:var(--em);line-height:1;margin-bottom:3px}
.jm-bar{height:5px;background:rgba(11,11,18,.08);border-radius:10px;overflow:hidden}
.jm-bar-fi{height:100%;background:linear-gradient(90deg,var(--em),#34d399);border-radius:10px;transition:width .6s}
.jm-body{padding:0 20px 16px 66px;font-size:13px;color:var(--mu);line-height:1.65}
.jm-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.jm-chip{padding:3px 10px;background:var(--em3);border:1px solid rgba(16,185,129,.2);border-radius:20px;font-size:11px;font-weight:600;color:var(--em2)}
/* LINKEDIN PAGE */
.li-res{background:white;border:1.5px solid var(--bo);border-radius:14px;padding:20px;margin-bottom:12px}
.li-res h4{font-family:var(--hd);font-size:15px;font-weight:700;margin-bottom:10px}
.li-skills{display:flex;flex-wrap:wrap;gap:6px}
.li-sk{background:rgba(10,102,194,.08);border:1px solid rgba(10,102,194,.2);border-radius:20px;padding:4px 12px;font-size:12px;color:#0a66c2;font-weight:500}
/* EMAIL */
.eml-note{background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.14);border-radius:10px;padding:11px 14px;font-size:13px;color:rgba(11,11,18,.56);margin-top:12px;display:flex;gap:8px;line-height:1.6}
/* INLINE PW */
.ipw{background:var(--dk);border-radius:var(--r2);padding:32px;margin-top:18px;text-align:center;color:white}
.ipw h3{font-family:var(--hd);font-size:22px;font-weight:800;margin-bottom:8px;letter-spacing:-.5px}
.ipw p{font-size:13px;color:rgba(255,255,255,.4);margin-bottom:4px;line-height:1.7}
.ipw-pr{font-family:var(--hd);font-size:40px;font-weight:800;color:var(--em);margin:12px 0 3px;letter-spacing:-1.5px}
.ipw-pr span{font-size:15px;color:rgba(255,255,255,.3);font-family:var(--bd);font-weight:300}
.ipw-fts{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin:10px 0 18px}
.ipw-ft{font-size:12px;color:rgba(255,255,255,.5);display:flex;align-items:center;gap:4px}
/* LEGAL */
.legal{max-width:740px;margin:0 auto;padding:68px 28px}
.legal h1{font-family:var(--hd);font-size:38px;font-weight:800;margin-bottom:8px;letter-spacing:-1px}
.legal-d{font-size:12px;color:var(--mu);margin-bottom:38px;padding-bottom:18px;border-bottom:1px solid var(--bo)}
.legal h2{font-family:var(--hd);font-size:19px;font-weight:700;margin:28px 0 10px}
.legal p{font-size:14px;line-height:1.85;color:rgba(11,11,18,.68);margin-bottom:10px}
.legal ul{margin:0 0 10px 20px}.legal li{font-size:14px;line-height:1.85;color:rgba(11,11,18,.68);margin-bottom:4px}
.la{color:var(--em);text-decoration:none;cursor:pointer;background:none;border:none;font-family:var(--bd);font-size:inherit;padding:0}
/* FOOTER */
footer{background:var(--dk);padding:50px 28px 24px}
.fi{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:36px;padding-bottom:30px;border-bottom:1px solid rgba(255,255,255,.07)}
.fl{font-family:var(--hd);font-size:20px;font-weight:800;color:white;display:flex;align-items:center;margin-bottom:10px}
.fcol h5{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.25);margin-bottom:12px}
.fcol button,.fcol a{display:block;font-size:13px;color:rgba(255,255,255,.36);margin-bottom:7px;cursor:pointer;text-decoration:none;background:none;border:none;font-family:var(--bd);text-align:left;transition:color .18s;padding:0}.fcol button:hover,.fcol a:hover{color:white}
.fbot{max-width:1200px;margin:0 auto;padding-top:18px;font-size:11px;color:rgba(255,255,255,.25);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
@media(max-width:820px){
  .why-vs,.tools-grid,.feat-g6,.feat-row,.srow,.tg,.vb,.fg2{grid-template-columns:1fr}
  .srow::before{display:none}
  .hstats{gap:16px;margin-top:36px}
  .hstats>div{flex:1;min-width:calc(50% - 8px)}
  .btog{flex-direction:row;gap:6px;flex-wrap:wrap;justify-content:center}
  .card{padding:20px 16px;border-radius:16px}
  .ct{font-size:19px}
  .mod{padding:24px 14px}
  .mod-fts{grid-template-columns:1fr 1fr}
  .ni{padding:0 14px;height:56px}
  .nl{gap:6px}
  .nlk{font-size:12px}
  .nc{padding:7px 13px;font-size:12px}
  .ls{gap:2px}
  .lb{padding:5px 9px;font-size:11px}
  .hero{padding:64px 0 56px}
  h1.hh{font-size:clamp(34px,9vw,56px);letter-spacing:-1.5px;margin-bottom:16px}
  .hsub{font-size:15px;line-height:1.6}
  .hbtns{flex-direction:column;gap:10px;align-items:flex-start}
  .btn.b-lg{width:100%;text-align:center;justify-content:center}
  .con,.csm{padding:0 14px}
  .stat-n{font-size:26px}
  .eyebrow{font-size:10px}
  .page-hdr{padding:28px 14px 0}
  .page-hdr h1{font-size:22px;letter-spacing:-.5px}
  .page-hdr p{font-size:12px}
  .asteps{margin:18px 0 0;overflow-x:auto;-webkit-overflow-scrolling:touch}
  .as{font-size:11px;padding:8px 4px;white-space:nowrap;flex:none;min-width:80px}
  .abody{padding:14px 14px 60px}
  .field input,.field textarea,.field select{font-size:16px;padding:11px 12px}
  .field label{font-size:10px}
  .frow{flex-direction:column-reverse;gap:8px}
  .frow .btn{width:100%;text-align:center;justify-content:center}
  section{padding:44px 0}
  .tool-card{padding:20px 16px}
  .tools-grid{gap:12px}
  .feat-g6{gap:12px}
  .pgrid{grid-template-columns:1fr;gap:16px;padding:0 4px}
  .pc{padding:24px 20px}
  .ppr{font-size:34px}
  .pfl li{font-size:13px;padding:8px 0}
  .fi{gap:24px}
  .fbot{font-size:10px}
  .legal{padding:32px 16px 60px}
  .legal h1{font-size:28px}
  .mod{width:calc(100% - 24px);max-height:90vh}
  .ubar{flex-direction:column;align-items:flex-start;gap:8px}
  .hbtns .btn{width:100%}
}
/* ── PAGE TRANSITION ANIMATIONS ── */
@keyframes fadeSlideIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes glow{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}50%{box-shadow:0 0 24px 4px rgba(16,185,129,.18)}}
.page-anim{animation:fadeSlideIn .38s cubic-bezier(.22,1,.36,1) both}
.fade-in{animation:fadeIn .3s ease both}
.slide-up{animation:slideUp .4s cubic-bezier(.22,1,.36,1) both}
.scale-in{animation:scaleIn .3s cubic-bezier(.22,1,.36,1) both}
.skel{background:linear-gradient(90deg,rgba(255,255,255,.06) 25%,rgba(255,255,255,.1) 50%,rgba(255,255,255,.06) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
.skel-light{background:linear-gradient(90deg,rgba(11,11,18,.05) 25%,rgba(11,11,18,.09) 50%,rgba(11,11,18,.05) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
.onb-bg{position:fixed;inset:0;background:rgba(7,7,14,.92);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(12px);animation:fadeIn .3s ease}
.onb-card{background:var(--dk2);border:1.5px solid rgba(255,255,255,.09);border-radius:28px;padding:44px 40px;max-width:520px;width:100%;color:white;position:relative;overflow:hidden;animation:scaleIn .4s cubic-bezier(.22,1,.36,1)}
.onb-card::before{content:'';position:absolute;top:-60px;right:-60px;width:220px;height:220px;background:radial-gradient(circle,rgba(16,185,129,.15),transparent 70%);pointer-events:none}
.onb-step{display:flex;flex-direction:column;gap:6px;animation:fadeSlideIn .35s cubic-bezier(.22,1,.36,1)}
.onb-ico{font-size:48px;margin-bottom:8px;animation:float 3s ease-in-out infinite;display:inline-block}
.onb-prog{display:flex;gap:6px;margin-bottom:28px}
.onb-dot{height:4px;border-radius:4px;background:rgba(255,255,255,.12);flex:1;transition:background .3s}
.onb-dot.on{background:var(--em)}
.onb-h{font-family:var(--hd);font-size:26px;font-weight:800;letter-spacing:-.8px;margin-bottom:10px;line-height:1.1}
.onb-p{font-size:14px;color:rgba(255,255,255,.48);line-height:1.75;margin-bottom:28px}
.onb-cards{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:28px}
.onb-feat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px;text-align:center;transition:all .2s}
.onb-feat:hover{background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.2)}
.onb-feat-ico{font-size:24px;margin-bottom:6px}
.onb-feat-t{font-size:12px;font-weight:700;color:rgba(255,255,255,.7)}
.top-progress{position:fixed;top:0;left:0;right:0;height:3px;z-index:9999;background:rgba(255,255,255,.05)}
.top-progress-bar{height:100%;background:linear-gradient(90deg,var(--em),#34d399);transition:width .3s ease;border-radius:0 2px 2px 0}
.fab{position:fixed;bottom:24px;right:24px;z-index:500;width:56px;height:56px;border-radius:50%;background:var(--em);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 8px 24px rgba(16,185,129,.4);transition:all .2s;animation:glow 2s ease-in-out infinite}
.fab:hover{transform:scale(1.1);box-shadow:0 12px 32px rgba(16,185,129,.5)}
.toast-wrap{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9998;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none}
.toast{background:var(--dk2);border:1.5px solid rgba(255,255,255,.1);color:white;padding:12px 20px;border-radius:14px;font-size:13px;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,.4);animation:slideUp .3s cubic-bezier(.22,1,.36,1);display:flex;align-items:center;gap:8px;white-space:nowrap}
.toast.success{border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.12)}
.toast.error{border-color:rgba(239,68,68,.3);background:rgba(239,68,68,.1)}
.reveal{opacity:0;transform:translateY(24px);transition:opacity .6s ease,transform .6s cubic-bezier(.22,1,.36,1)}
.reveal.visible{opacity:1;transform:translateY(0)}
`;

// ══════════════════════════════════════════
// 🎉 ONBOARDING FLOW (shown once to new users)
// ══════════════════════════════════════════
function OnboardingFlow({ lang, onDone }) {
  const [step, setStep] = useState(0);
  const L = (d,e,f,i) => ({de:d,en:e,fr:f,it:i}[lang]||d);
  const TOTAL = 4;

  const steps = [
    {
      ico: "👋",
      h: L("Willkommen bei Stellify!", "Welcome to Stellify!", "Bienvenue sur Stellify!", "Benvenuto su Stellify!"),
      p: L(
        "Dein persönlicher KI-Karriere-Copilot für den Schweizer Arbeitsmarkt. In 4 Schritten zeigen wir dir, wie du in wenigen Minuten deine Traumstelle findest.",
        "Your personal AI career copilot for the Swiss job market. In 4 steps we'll show you how to land your dream job in minutes.",
        "Votre copilote IA carrière pour le marché suisse. En 4 étapes, découvrez comment trouver votre emploi de rêve en quelques minutes.",
        "Il tuo copilota IA per il mercato svizzero. In 4 passaggi ti mostriamo come trovare il lavoro dei tuoi sogni in pochi minuti."
      ),
      feats: [
        {ico:"🇨🇭", t: L("Swiss-Standard","Swiss Standard","Standard suisse","Standard svizzero")},
        {ico:"🌐", t: L("4 Sprachen","4 Languages","4 langues","4 lingue")},
        {ico:"⚡", t: L("~30 Sek.","~30 sec.","~30 sec.","~30 sec.")},
        {ico:"🔒", t: L("Privat & sicher","Private & secure","Privé & sécurisé","Privato & sicuro")},
      ]
    },
    {
      ico: "✍️",
      h: L("Bewerbungen in 30 Sekunden", "Applications in 30 seconds", "Candidatures en 30 secondes", "Candidature in 30 secondi"),
      p: L(
        "Gib dein Profil einmal ein – die KI erstellt Motivationsschreiben und Lebenslauf auf Schweizer Standard. Inkl. ATS-Optimierung für maximale Erfolgsquote.",
        "Enter your profile once – the AI creates a cover letter and CV to Swiss standards. Incl. ATS optimization for maximum success.",
        "Entrez votre profil une fois – l'IA crée lettre et CV aux standards suisses. Avec optimisation ATS.",
        "Inserisci il profilo una volta – l'IA crea lettera e CV agli standard svizzeri. Con ottimizzazione ATS."
      ),
      feats: [
        {ico:"📝", t:"Motivationsschreiben"},
        {ico:"📄", t:"Curriculum Vitae"},
        {ico:"🤖", t:"ATS-Check"},
        {ico:"📊", t:"Score 0–100"},
      ]
    },
    {
      ico: "🎯",
      h: L("20+ Tools. Alles an einem Ort.", "20+ Tools. All in one place.", "20+ outils. Tout au même endroit.", "20+ strumenti. Tutto in un posto."),
      p: L(
        "LinkedIn-Optimierung, Zeugnis-Analyse, Job-Matching, Interview-Coach, Gehaltsverhandlung und vieles mehr – alles für den Schweizer Arbeitsmarkt gemacht.",
        "LinkedIn optimization, reference analysis, job matching, interview coach, salary negotiation and much more – all made for the Swiss job market.",
        "Optimisation LinkedIn, analyse de certificat, matching, coach, négociation – tout pour le marché suisse.",
        "Ottimizzazione LinkedIn, analisi certificati, job matching, coach, negoziazione stipendio – tutto per il mercato svizzero."
      ),
      feats: [
        {ico:"💼", t:"LinkedIn"},
        {ico:"📜", t:L("Zeugnis","Reference","Certificat","Certificato")},
        {ico:"🎤", t:"Interview"},
        {ico:"💰", t:L("Gehalt","Salary","Salaire","Stipendio")},
      ]
    },
    {
      ico: "🚀",
      h: L("Bereit loszulegen?", "Ready to get started?", "Prêt à commencer?", "Pronti a iniziare?"),
      p: L(
        "Starte kostenlos mit einer Gratisbewerbung. Kein Abo nötig. Upgrade auf Pro für unbegrenzte Nutzung aller 20+ Tools.",
        "Start free with one application. No subscription needed. Upgrade to Pro for unlimited access to all 20+ tools.",
        "Commencez gratuitement avec une candidature. Sans abonnement. Passez à Pro pour un accès illimité.",
        "Inizia gratis con una candidatura. Senza abbonamento. Passa a Pro per accesso illimitato."
      ),
      feats: [
        {ico:"🎁", t:L("1× Gratis","1× Free","1× Gratuit","1× Gratis")},
        {ico:"✦", t:"Pro: CHF 19.90"},
        {ico:"🔄", t:L("Kündbar","Cancel anytime","Résiliable","Annullabile")},
        {ico:"💳", t:"Twint · Stripe"},
      ]
    }
  ];

  const cur = steps[step];

  return (
    <div className="onb-bg">
      <div className="onb-card">
        {/* Progress dots */}
        <div className="onb-prog">
          {steps.map((_,i) => <div key={i} className={`onb-dot ${i <= step ? "on" : ""}`}/>)}
        </div>

        <div className="onb-step" key={step}>
          <div className="onb-ico">{cur.ico}</div>
          <h2 className="onb-h">{cur.h}</h2>
          <p className="onb-p">{cur.p}</p>

          <div className="onb-cards">
            {cur.feats.map((f,i) => (
              <div key={i} className="onb-feat">
                <div className="onb-feat-ico">{f.ico}</div>
                <div className="onb-feat-t">{f.t}</div>
              </div>
            ))}
          </div>

          <div style={{display:"flex",gap:10}}>
            {step > 0 && (
              <button onClick={() => setStep(s => s-1)}
                style={{flex:1,padding:"13px",background:"rgba(255,255,255,.06)",border:"1.5px solid rgba(255,255,255,.1)",borderRadius:14,color:"rgba(255,255,255,.5)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"var(--bd)",transition:"all .18s"}}>
                ←
              </button>
            )}
            <button onClick={() => step < TOTAL-1 ? setStep(s => s+1) : onDone()}
              style={{flex:3,padding:"13px",background:"var(--em)",border:"none",borderRadius:14,color:"white",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"var(--bd)",transition:"all .2s",letterSpacing:"-.2px"}}>
              {step < TOTAL-1
                ? L("Weiter →","Continue →","Continuer →","Continua →")
                : L("Los geht's! →","Let's go! →","C'est parti! →","Inizia! →")}
            </button>
          </div>

          <button onClick={onDone}
            style={{textAlign:"center",marginTop:12,background:"none",border:"none",color:"rgba(255,255,255,.2)",fontSize:12,cursor:"pointer",fontFamily:"var(--bd)"}}>
            {L("Überspringen","Skip","Passer","Salta")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// 🔔 TOAST NOTIFICATION SYSTEM
// ══════════════════════════════════════════
let _toastSetter = null;
function setGlobalToaster(fn) { _toastSetter = fn; }
function showToast(msg, type="success", duration=3000) {
  if (_toastSetter) _toastSetter(prev => [...prev, {id:Date.now(),msg,type,duration}]);
}

function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => { setGlobalToaster(setToasts); return () => setGlobalToaster(null); }, []);
  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts(prev => prev.slice(1)), toasts[0].duration || 3000);
    return () => clearTimeout(t);
  }, [toasts]);
  if (!toasts.length) return null;
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>
          {t.type==="success"?"✓":t.type==="error"?"⚠️":"ℹ️"} {t.msg}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════
// 🏃 SCROLL REVEAL HOOK
// ══════════════════════════════════════════
function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } });
    }, {threshold: 0.1});
    const els = ref.current.querySelectorAll(".reveal");
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  return ref;
}

// ══════════════════════════════════════════
// 🔥 RETENTION SYSTEM – Streak, Challenges, Badges
// ══════════════════════════════════════════

// Streak-Tracker: Tages-Streak (Nutzer kommt täglich zurück)
const getStreak = () => {
  try {
    const d = JSON.parse(localStorage.getItem("stf_streak")||"{}");
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now()-86400000).toDateString();
    if (d.lastVisit === today) return d;
    if (d.lastVisit === yesterday) return {...d, streak:(d.streak||0)+1, lastVisit:today};
    return {streak:1, lastVisit:today, best:Math.max(d.best||0, d.streak||1)};
  } catch { return {streak:1, lastVisit:new Date().toDateString(), best:1}; }
};
const touchStreak = () => {
  const s = getStreak(); localStorage.setItem("stf_streak", JSON.stringify(s)); return s;
};

// Weekly Challenges
const WEEKLY_CHALLENGES = [
  {id:"wc1", ico:"📄", de:"Erstelle ein Motivationsschreiben", en:"Create a cover letter",    fr:"Créer une lettre de motivation",   it:"Crea una lettera di motivazione", tool:"app",   xp:50},
  {id:"wc2", ico:"💼", de:"Optimiere dein LinkedIn-Profil",   en:"Optimize your LinkedIn",    fr:"Optimiser votre profil LinkedIn",  it:"Ottimizza il tuo profilo LinkedIn", tool:"linkedin", xp:75},
  {id:"wc3", ico:"🤖", de:"Mach einen ATS-Check",            en:"Do an ATS check",           fr:"Faire une vérification ATS",       it:"Fai un controllo ATS", tool:"ats",   xp:60},
  {id:"wc4", ico:"💰", de:"Simuliere eine Gehaltsverhandlung",en:"Simulate salary negotiation",fr:"Simuler une négociation salariale",it:"Simula una trattativa salariale", tool:"gehalt", xp:80},
  {id:"wc5", ico:"🎤", de:"Bereite dich auf 5 Fragen vor",   en:"Prepare 5 interview questions",fr:"Préparez 5 questions d'entretien",it:"Prepara 5 domande colloquio", tool:"coach",  xp:70},
];

const getWeeklyProgress = () => {
  try { return JSON.parse(localStorage.getItem("stf_wc")||"{}"); } catch { return {}; }
};
const completeChallenge = (id) => {
  const p = getWeeklyProgress(); p[id] = true; localStorage.setItem("stf_wc", JSON.stringify(p));
};

// Streak-Banner Komponente
function StreakBanner({ lang }) {
  const L = (d,e,f,i) => ({de:d,en:e,fr:f,it:i}[lang]||d);
  const [streak, setStreak] = useState(null);
  const [challenges, setChallenges] = useState({});

  useEffect(() => {
    const s = touchStreak();
    setStreak(s);
    setChallenges(getWeeklyProgress());
  }, []);

  if (!streak) return null;

  const done = WEEKLY_CHALLENGES.filter(c => challenges[c.id]).length;
  const total = WEEKLY_CHALLENGES.length;
  const pct = Math.round((done/total)*100);

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:24}}>
      {/* Streak-Card */}
      <div style={{background:"linear-gradient(135deg,rgba(245,158,11,.12),rgba(239,68,68,.08))",border:"1.5px solid rgba(245,158,11,.25)",borderRadius:16,padding:"16px 18px",display:"flex",alignItems:"center",gap:14}}>
        <div style={{fontSize:32,lineHeight:1}}>{streak.streak >= 7 ? "🔥" : streak.streak >= 3 ? "⚡" : "✦"}</div>
        <div>
          <div style={{fontFamily:"var(--hd)",fontSize:28,fontWeight:800,color:"white",lineHeight:1}}>{streak.streak}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.45)",marginTop:2}}>{L(`Tag${streak.streak!==1?"e":""} Streak`,`Day${streak.streak!==1?"s":""} streak`,`Jour${streak.streak!==1?"s":""} de suite`,`Giorn${streak.streak!==1?"i":"o"} di fila`)}</div>
          {streak.best > 1 && <div style={{fontSize:10,color:"rgba(245,158,11,.5)",marginTop:1}}>{L(`Rekord: ${streak.best} Tage`,`Best: ${streak.best} days`,`Record: ${streak.best} jours`,`Record: ${streak.best} giorni`)}</div>}
        </div>
      </div>
      {/* Weekly Challenge */}
      <div style={{background:"linear-gradient(135deg,rgba(99,102,241,.1),rgba(16,185,129,.06))",border:"1.5px solid rgba(99,102,241,.2)",borderRadius:16,padding:"16px 18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.4)",letterSpacing:"1px",textTransform:"uppercase"}}>{L("Wochenziele","Weekly Goals","Objectifs hebdo","Obiettivi settimana")}</div>
          <span style={{fontSize:11,fontWeight:800,color:done===total?"var(--em)":"rgba(255,255,255,.5)"}}>{done}/{total}</span>
        </div>
        <div style={{height:5,background:"rgba(255,255,255,.08)",borderRadius:10,overflow:"hidden",marginBottom:8}}>
          <div style={{height:"100%",width:`${pct}%`,background:done===total?"var(--em)":"#6366f1",borderRadius:10,transition:"width .6s ease"}}/>
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {WEEKLY_CHALLENGES.map(c => (
            <span key={c.id} style={{fontSize:12,opacity:challenges[c.id]?1:0.35,filter:challenges[c.id]?"none":"grayscale(1)",transition:"all .3s"}}>{c.ico}</span>
          ))}
        </div>
        {done===total && <div style={{fontSize:10,color:"var(--em)",marginTop:4,fontWeight:700}}>🎉 {L("Alle erledigt!","All done!","Tout complété!","Tutto fatto!")}</div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// 📊 3 NEUE TOOLS
// ══════════════════════════════════════════

// Tool 1: CV-Score Schnell-Check
function CVScoreWidget({ lang, pro, setPw }) {
  const L = (d,e,f,i) => ({de:d,en:e,fr:f,it:i}[lang]||d);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(null);
  const [tips, setTips] = useState([]);
  const usageCount = getNewToolCount("cvScore");
  const canUse = pro || usageCount < C.NEW_TOOL_FREE_LIMIT;

  const run = async () => {
    if (!canUse) { setPw(true); return; }
    if (!text.trim()) return;
    setLoading(true); setScore(null); setTips([]);
    try {
      const prompt = L(
        `Du bist ein Schweizer CV-Experte. Analysiere diesen Lebenslauf-Text und gib einen Score von 0-100 zurück sowie 3 konkrete Verbesserungstipps. Antworte NUR mit validem JSON: {"score":75,"grade":"Gut","tips":["Tipp1","Tipp2","Tipp3"],"strengths":["Stärke1","Stärke2"]}. CV-Text:\n${text}`,
        `You are a Swiss CV expert. Analyze this CV text and return a score 0-100 and 3 concrete improvement tips. Reply ONLY with valid JSON: {"score":75,"grade":"Good","tips":["Tip1","Tip2","Tip3"],"strengths":["Strength1","Strength2"]}. CV:\n${text}`,
        `Tu es expert CV suisse. Analyse ce CV et retourne un score 0-100 et 3 conseils. Réponds UNIQUEMENT avec JSON valide: {"score":75,"grade":"Bien","tips":["Conseil1","Conseil2","Conseil3"],"strengths":["Force1","Force2"]}. CV:\n${text}`,
        `Sei un esperto CV svizzero. Analizza questo CV e restituisci un punteggio 0-100 e 3 consigli. Rispondi SOLO con JSON valido: {"score":75,"grade":"Buono","tips":["Consiglio1","Consiglio2","Consiglio3"],"strengths":["Forza1","Forza2"]}. CV:\n${text}`
      );
      const res = await callAI(prompt, null, "free");
      const clean = res.replace(/```json|```/g,"").trim();
      const data = JSON.parse(clean);
      setScore(data.score); setTips(data);
      if (!pro) incNewTool("cvScore");
      showToast(L("CV-Score berechnet! ✓","CV score calculated! ✓","Score calculé! ✓","Score calcolato! ✓"));
    } catch(e) { showToast(L("Fehler beim Analysieren","Error analyzing","Erreur analyse","Errore analisi"),"error"); }
    finally { setLoading(false); }
  };

  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="card slide-up" style={{marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <div style={{width:40,height:40,background:"rgba(16,185,129,.12)",border:"1.5px solid rgba(16,185,129,.25)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📊</div>
        <div>
          <div style={{fontFamily:"var(--hd)",fontSize:16,fontWeight:800}}>{L("Schnell-CV-Check","Quick CV Check","Check CV rapide","Check CV rapido")}</div>
          <div style={{fontSize:12,color:"var(--mu)"}}>{L("Score in Sekunden","Score in seconds","Score en secondes","Score in secondi")}</div>
        </div>
        <span style={{marginLeft:"auto",fontSize:10,fontWeight:700,background:canUse?"rgba(16,185,129,.1)":"rgba(99,102,241,.1)",color:canUse?"var(--em)":"#6366f1",border:`1px solid ${canUse?"rgba(16,185,129,.2)":"rgba(99,102,241,.2)"}`,borderRadius:20,padding:"2px 10px",textTransform:"uppercase"}}>
          {pro ? "PRO" : canUse ? `${C.NEW_TOOL_FREE_LIMIT - usageCount}× Gratis` : "PRO"}
        </span>
      </div>
      <textarea value={text} onChange={e=>setText(e.target.value)}
        placeholder={L("Lebenslauf-Text hier einfügen…","Paste CV text here…","Coller le texte du CV ici…","Incolla testo del CV qui…")}
        style={{width:"100%",padding:"10px 13px",border:"1.5px solid var(--bo)",borderRadius:10,fontFamily:"var(--bd)",fontSize:13,resize:"none",minHeight:80,outline:"none",background:"#fafafa",boxSizing:"border-box",lineHeight:1.6}}/>
      <button onClick={run} disabled={loading||!text.trim()}
        style={{marginTop:10,padding:"10px 20px",background:text.trim()?"var(--em)":"var(--bo)",color:text.trim()?"white":"var(--mu)",border:"none",borderRadius:10,fontFamily:"var(--bd)",fontSize:13,fontWeight:700,cursor:text.trim()?"pointer":"default",transition:"all .2s"}}>
        {loading ? L("Analysiere…","Analyzing…","Analyse…","Analisi…") : L("CV analysieren →","Analyze CV →","Analyser →","Analizza →")}
      </button>

      {score !== null && (
        <div style={{marginTop:16,padding:16,background:score>=75?"#f0fdf4":score>=50?"#fffbeb":"#fff1f2",border:`1.5px solid ${color}33`,borderRadius:12}}>
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:12}}>
            <div style={{fontFamily:"var(--hd)",fontSize:44,fontWeight:800,color,lineHeight:1}}>{score}</div>
            <div>
              <div style={{fontFamily:"var(--hd)",fontSize:16,fontWeight:800,color}}>{tips.grade}</div>
              <div style={{height:5,width:120,background:"rgba(0,0,0,.08)",borderRadius:10,marginTop:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${score}%`,background:color,borderRadius:10,transition:"width .8s ease"}}/>
              </div>
            </div>
          </div>
          {(tips.strengths||[]).length > 0 && (
            <div style={{marginBottom:8}}>
              {tips.strengths.map((s,i)=><div key={i} style={{fontSize:12,color:"#15803d",display:"flex",gap:6,alignItems:"flex-start",marginBottom:3}}><span>✓</span>{s}</div>)}
            </div>
          )}
          {(tips.tips||[]).map((tip,i)=>(
            <div key={i} style={{display:"flex",gap:8,padding:"7px 0",borderTop:"1px solid rgba(0,0,0,.06)",fontSize:12,color:"rgba(11,11,18,.65)",lineHeight:1.6}}>
              <span style={{color:"#f59e0b",flexShrink:0,fontWeight:700}}>{i+1}.</span>{tip}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Tool 2: Interview-Vorbereitung Quick-Check
function InterviewPrepWidget({ lang, pro, setPw }) {
  const L = (d,e,f,i) => ({de:d,en:e,fr:f,it:i}[lang]||d);
  const [job, setJob] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState(null);
  const usageCount = getNewToolCount("interviewPrep");
  const canUse = pro || usageCount < C.NEW_TOOL_FREE_LIMIT;

  const run = async () => {
    if (!canUse) { setPw(true); return; }
    if (!job.trim()) return;
    setLoading(true); setQuestions(null);
    try {
      const prompt = L(
        `Schweizer Interview-Coach: Erstelle die 5 häufigsten Interviewfragen für "${job}" im Schweizer Markt. Antworte NUR mit JSON: {"questions":[{"q":"Frage?","hint":"Kurzer Tipp"}]}`,
        `Swiss interview coach: Create the 5 most common interview questions for "${job}". Reply ONLY with JSON: {"questions":[{"q":"Question?","hint":"Short tip"}]}`,
        `Coach entretien suisse: Les 5 questions les plus fréquentes pour "${job}". Répondre UNIQUEMENT JSON: {"questions":[{"q":"Question?","hint":"Conseil"}]}`,
        `Coach colloquio svizzero: Le 5 domande più frequenti per "${job}". Rispondere SOLO JSON: {"questions":[{"q":"Domanda?","hint":"Consiglio"}]}`
      );
      const res = await callAI(prompt, null, "free");
      const clean = res.replace(/```json|```/g,"").trim();
      setQuestions(JSON.parse(clean).questions || []);
      if (!pro) incNewTool("interviewPrep");
      showToast(L("5 Fragen generiert ✓","5 questions generated ✓","5 questions générées ✓","5 domande generate ✓"));
    } catch(e) { showToast("Error","error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="card slide-up" style={{marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <div style={{width:40,height:40,background:"rgba(167,139,250,.12)",border:"1.5px solid rgba(167,139,250,.25)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🎤</div>
        <div>
          <div style={{fontFamily:"var(--hd)",fontSize:16,fontWeight:800}}>{L("Interview-Vorbereitung","Interview Prep","Préparation entretien","Preparazione colloquio")}</div>
          <div style={{fontSize:12,color:"var(--mu)"}}>{L("5 Topfragen in Sekunden","Top 5 questions instantly","5 questions clés","5 domande chiave")}</div>
        </div>
        <span style={{marginLeft:"auto",fontSize:10,fontWeight:700,background:canUse?"rgba(167,139,250,.12)":"rgba(99,102,241,.1)",color:canUse?"#a78bfa":"#6366f1",border:`1px solid ${canUse?"rgba(167,139,250,.25)":"rgba(99,102,241,.2)"}`,borderRadius:20,padding:"2px 10px",textTransform:"uppercase"}}>
          {pro ? "PRO" : canUse ? `${C.NEW_TOOL_FREE_LIMIT - usageCount}× Gratis` : "PRO"}
        </span>
      </div>
      <div style={{display:"flex",gap:8}}>
        <input value={job} onChange={e=>setJob(e.target.value)} onKeyDown={e=>e.key==="Enter"&&run()}
          placeholder={L("Stelle eingeben, z.B. Softwareentwickler…","Enter position, e.g. Software Engineer…","Saisir le poste, ex. Développeur…","Inserisci il ruolo, es. Sviluppatore…")}
          style={{flex:1,padding:"10px 13px",border:"1.5px solid var(--bo)",borderRadius:10,fontFamily:"var(--bd)",fontSize:13,outline:"none",background:"#fafafa"}}/>
        <button onClick={run} disabled={loading||!job.trim()}
          style={{padding:"10px 18px",background:job.trim()?"#7c3aed":"var(--bo)",color:job.trim()?"white":"var(--mu)",border:"none",borderRadius:10,fontFamily:"var(--bd)",fontSize:13,fontWeight:700,cursor:job.trim()?"pointer":"default",transition:"all .2s",whiteSpace:"nowrap"}}>
          {loading?"…":L("Fragen →","Questions →","Questions →","Domande →")}
        </button>
      </div>

      {questions && (
        <div style={{marginTop:14}}>
          {questions.map((q,i) => (
            <div key={i} style={{padding:"12px 0",borderBottom:"1px solid var(--bos)"}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:4}}>
                <div style={{width:22,height:22,background:"rgba(124,58,237,.1)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#7c3aed",flexShrink:0}}>{i+1}</div>
                <div style={{fontFamily:"var(--hd)",fontSize:14,fontWeight:700,color:"var(--ink)",lineHeight:1.4}}>«{q.q}»</div>
              </div>
              <div style={{fontSize:12,color:"var(--mu)",marginLeft:32,lineHeight:1.6}}>💡 {q.hint}</div>
            </div>
          ))}
          <button onClick={()=>setPw&&setPw(true)}
            style={{marginTop:12,width:"100%",padding:"10px",background:"rgba(124,58,237,.06)",border:"1px solid rgba(124,58,237,.2)",borderRadius:10,color:"#7c3aed",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--bd)"}}>
            {L("→ Volles Interview-Training mit Bewertung","→ Full interview training with scoring","→ Entraînement complet","→ Allenamento completo")}
          </button>
        </div>
      )}
    </div>
  );
}

// Tool 3: Stelleninserat-Analyse
function JobAdAnalyzerWidget({ lang, pro, setPw }) {
  const L = (d,e,f,i) => ({de:d,en:e,fr:f,it:i}[lang]||d);
  const [ad, setAd] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const usageCount = getNewToolCount("jobAdAnalyzer");
  const canUse = pro || usageCount < C.NEW_TOOL_FREE_LIMIT;

  const run = async () => {
    if (!canUse) { setPw(true); return; }
    if (!ad.trim()) return;
    setLoading(true); setResult(null);
    try {
      const prompt = L(
        `Analysiere dieses Schweizer Stelleninserat und extrahiere die wichtigsten Informationen. Antworte NUR mit JSON: {"title":"","company":"","salary_range":"CHF X-Y","keywords":["kw1","kw2","kw3","kw4","kw5"],"must_haves":["m1","m2","m3"],"nice_to_haves":["n1","n2"],"red_flags":[],"match_tips":["Tipp zum Match"]}.\nInserat:\n${ad}`,
        `Analyze this Swiss job posting and extract key info. Reply ONLY with JSON: {"title":"","company":"","salary_range":"CHF X-Y","keywords":["kw1","kw2","kw3","kw4","kw5"],"must_haves":["m1","m2","m3"],"nice_to_haves":["n1","n2"],"red_flags":[],"match_tips":["Match tip"]}.\nPosting:\n${ad}`,
        `Analysez cette offre d'emploi suisse. Répondez UNIQUEMENT JSON: {"title":"","company":"","salary_range":"CHF X-Y","keywords":["mc1","mc2","mc3","mc4","mc5"],"must_haves":["o1","o2","o3"],"nice_to_haves":["o1","o2"],"red_flags":[],"match_tips":["Conseil"]}.\nOffre:\n${ad}`,
        `Analizza questo annuncio di lavoro svizzero. Risposta SOLO JSON: {"title":"","company":"","salary_range":"CHF X-Y","keywords":["p1","p2","p3","p4","p5"],"must_haves":["r1","r2","r3"],"nice_to_haves":["n1","n2"],"red_flags":[],"match_tips":["Consiglio"]}.\nAnnuncio:\n${ad}`
      );
      const res = await callAI(prompt, null, "free");
      const clean = res.replace(/```json|```/g,"").trim();
      setResult(JSON.parse(clean));
      if (!pro) incNewTool("jobAdAnalyzer");
      showToast(L("Inserat analysiert ✓","Ad analyzed ✓","Offre analysée ✓","Annuncio analizzato ✓"));
    } catch(e) { showToast("Error","error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="card slide-up" style={{marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <div style={{width:40,height:40,background:"rgba(245,158,11,.1)",border:"1.5px solid rgba(245,158,11,.2)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🔍</div>
        <div>
          <div style={{fontFamily:"var(--hd)",fontSize:16,fontWeight:800}}>{L("Inserat-Analyse","Job Ad Analyzer","Analyse d'offre","Analisi annuncio")}</div>
          <div style={{fontSize:12,color:"var(--mu)"}}>{L("Keywords & Musthaves extrahieren","Extract keywords & must-haves","Extraire mots-clés","Estrai parole chiave")}</div>
        </div>
        <span style={{marginLeft:"auto",fontSize:10,fontWeight:700,background:canUse?"rgba(245,158,11,.1)":"rgba(99,102,241,.1)",color:canUse?"#b45309":"#6366f1",border:`1px solid ${canUse?"rgba(245,158,11,.2)":"rgba(99,102,241,.2)"}`,borderRadius:20,padding:"2px 10px",textTransform:"uppercase"}}>
          {pro ? "PRO" : canUse ? `${C.NEW_TOOL_FREE_LIMIT - usageCount}× Gratis` : "PRO"}
        </span>
      </div>
      <textarea value={ad} onChange={e=>setAd(e.target.value)}
        placeholder={L("Stelleninserat hier einfügen…","Paste job posting here…","Coller l'offre d'emploi ici…","Incolla l'annuncio di lavoro qui…")}
        style={{width:"100%",padding:"10px 13px",border:"1.5px solid var(--bo)",borderRadius:10,fontFamily:"var(--bd)",fontSize:13,resize:"none",minHeight:80,outline:"none",background:"#fafafa",boxSizing:"border-box",lineHeight:1.6}}/>
      <button onClick={run} disabled={loading||!ad.trim()}
        style={{marginTop:10,padding:"10px 20px",background:ad.trim()?"#b45309":"var(--bo)",color:ad.trim()?"white":"var(--mu)",border:"none",borderRadius:10,fontFamily:"var(--bd)",fontSize:13,fontWeight:700,cursor:ad.trim()?"pointer":"default",transition:"all .2s"}}>
        {loading ? L("Analysiere…","Analyzing…","Analyse…","Analisi…") : L("Analysieren →","Analyze →","Analyser →","Analizza →")}
      </button>

      {result && (
        <div style={{marginTop:14}}>
          {result.title && <div style={{fontFamily:"var(--hd)",fontSize:15,fontWeight:800,marginBottom:4}}>{result.title}{result.company ? ` @ ${result.company}` : ""}</div>}
          {result.salary_range && result.salary_range !== "CHF X-Y" && (
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:700,color:"var(--em2)",marginBottom:10}}>
              💰 {result.salary_range}
            </div>
          )}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--mu)",marginBottom:6}}>Keywords</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {(result.keywords||[]).map((k,i)=><span key={i} style={{padding:"3px 10px",background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.15)",borderRadius:20,fontSize:12,fontWeight:600,color:"var(--em2)"}}>{k}</span>)}
            </div>
          </div>
          {(result.must_haves||[]).length > 0 && (
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--mu)",marginBottom:6}}>Must-Have</div>
              {result.must_haves.map((m,i)=><div key={i} style={{fontSize:12,color:"var(--ink)",display:"flex",gap:6,marginBottom:3}}><span style={{color:"#ef4444"}}>●</span>{m}</div>)}
            </div>
          )}
          {(result.match_tips||[]).length > 0 && (
            <div style={{background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.15)",borderRadius:10,padding:"10px 14px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#92400e",marginBottom:4}}>💡 {L("Match-Tipps","Match Tips","Conseils de match","Consigli di match")}</div>
              {result.match_tips.map((t,i)=><div key={i} style={{fontSize:12,color:"#92400e",lineHeight:1.6}}>{t}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ALL TEXT (single language factory) ──
const mkT = (lang) => {
  const L = (d,f,i,e) => ({de:d,fr:f,it:i,en:e}[lang]);
  return {
    nav:{
      home:   L("Start","Accueil","Home","Home"),
      prices: L("Preise","Tarifs","Prezzi","Pricing"),
      tools:  L("Tools","Outils","Strumenti","Tools"),
      excel:  L("Excel-Generator","Excel Generator","Générateur Excel","Generatore Excel"),
      pptx:   L("PowerPoint","PowerPoint","PowerPoint","PowerPoint"),
      ats:    "ATS-Check",
      zeugnis:L("Zeugnis","Certificat","Certificato","Reference"),
      jobs:   L("Job-Matching","Jobs","Lavori","Job Match"),
    },
    hero:{
      eye: L(`✦ ${C.name} – ${C.tagline}`,`✦ ${C.name} – Copilote IA Carrière Suisse`,`✦ ${C.name} – Copilota IA Carriera Svizzera`,`✦ ${C.name} – ${C.tagline}`),
      h1a: L("Deine Karriere.","Votre carrière.","La tua carriera.","Your career."),
      h1b: L("Dein","Votre","Il tuo","Your"),
      h1c: L("KI-Copilot.","Copilote IA.","Copilota IA.","AI Copilot."),
      sub: L("11 KI-Tools in einem. Bewerbungen, LinkedIn, ATS-Check, Job-Matching, Zeugnisanalyse, Interview-Coach + 5 weitere – für den Schweizer Arbeitsmarkt.",
             "11 outils IA en un. Candidatures, LinkedIn, ATS, matching, certificats et coach + 5 autres – pour le marché suisse.",
             "11 strumenti IA in uno. Candidature, LinkedIn, ATS, matching, certificati e coach + 5 altri – per il mercato svizzero.",
             "11 AI tools in one. Applications, LinkedIn, ATS check, job matching, reference analysis, interview coach + 5 more – for the Swiss job market."),
      cta:  L("Kostenlos starten →","Commencer gratuitement →","Inizia gratis →","Start for free →"),
      how:  L("Alle Tools ansehen","Voir les outils","Vedi gli strumenti","See all tools"),
      stats:[
        {n:"18+",   l:L("KI-Tools","AI tools","outils IA","strumenti IA")},
        {n:"3'000+",l:L("Dokumente erstellt","docs created","documents créés","documenti creati")},
        {n:"4",     l:L("Sprachen","languages","langues","lingue")},
        {n:"CHF 19.90",l:L("statt CHF 300 Berater","vs CHF 300 advisor","vs CHF 300 conseil","vs CHF 300 consulente")},
      ],
    },
    tools:{
      label: L("20+ Tools. Ein Copilot.","20+ Outils. Un Copilote.","20+ Strumenti. Un Copilota.","20+ Tools. One Copilot."),
      title: L("Alles für deine Karriere in der Schweiz.","Tout pour votre carrière en Suisse.","Tutto per la tua carriera in Svizzera.","Everything for your career in Switzerland."),
      sub:   L("Kein Hin-und-Her zwischen verschiedenen Apps. Alles an einem Ort.","Fini les allers-retours entre apps. Tout en un endroit.","Niente avanti e indietro tra app. Tutto in un posto.","No more switching between apps. Everything in one place."),
      items:[
        // 1. Hook – 1× gratis, sofort Wert erleben
        {page:"app",  ico:"✍️",t:L("Bewerbung schreiben","Write Application","Rédiger candidature","Scrivi candidatura"),p:L("Motivationsschreiben & Lebenslauf in 60 Sek. Schweizer Format. 1× gratis.","Cover letter & CV in 60 sec. Swiss format. 1× free.","Lettre & CV en 60 sec. Format suisse. 1× gratuit.","Lettera & CV in 60 sec. Formato svizzero. 1× gratuito."),badge:"1× Gratis",bc:"tc-em",col:""},
        // 2. Richtige Stelle finden – vor der Bewerbung
        {page:"jobmatch",ico:"🎯",t:L("Job-Matching","Job Matching","Matching emploi","Job Matching"),p:L("KI findet deine Top 5 passenden Stellen mit Fit-Score. Keine Blindbewerbungen mehr.","AI finds your top 5 matching jobs with fit score. No more blind applications.","L'IA trouve vos 5 postes idéaux. Plus de candidatures au hasard.","L'IA trova i tuoi 5 lavori ideali. Niente più candidature al buio."),badge:"PRO",bc:"tc-em",col:""},
        // 3. CV optimieren – damit es durchkommt
        {page:"ats",  ico:"🤖",t:L("ATS-Check","ATS Check","Vérification ATS","Controllo ATS"),p:L("Testet ob dein Lebenslauf Recruiter-Software besteht. Score + konkrete Fixes.","Tests if your CV passes recruiter software. Score + concrete fixes.","Teste si votre CV passe les logiciels RH. Score + améliorations.","Testa se il tuo CV supera i software HR. Score + miglioramenti concreti."),badge:"PRO",bc:"tc-bl",col:"bl"},
        // 4. LinkedIn – Recruiter kommen zu dir
        {page:"linkedin",ico:"💼",t:"LinkedIn",p:L("Profil analysieren & optimieren – Headline, About, Skills. Recruiter finden dich.","Analyze & optimize your profile. Recruiters will find you.","Analyser & optimiser – Titre, About, compétences. Les recruteurs vous trouvent.","Analizzare & ottimizzare. I recruiter ti trovano."),badge:"PRO",bc:"tc-bl",col:"bl"},
        // 5. Interview – kurz vor dem Ziel
        {page:"coach", ico:"🎤",t:L("Interview-Coach","Interview Coach","Coach entretien","Coach colloquio"),p:L("KI simuliert 5 echte Fragen, bewertet Antworten, gibt Note 0–100.","AI simulates 5 real questions, evaluates your answers, gives score 0–100.","L'IA simule 5 questions réelles, évalue et note 0–100.","L'IA simula 5 domande reali, valuta e dà voto 0–100."),badge:"PRO",bc:"tc-em",col:""},
        // 6. Zeugnis – Schweizer Spezialität
        {page:"zeugnis",ico:"📜",t:L("Zeugnis-Analyse","Reference Analysis","Analyse certificat","Analisi certificato"),p:L("Schweizer Zeugnis-Code entschlüsselt. Was steht wirklich drin? Tausende kennen es nicht.","Swiss work reference decoded. What does it really say? Thousands don't know.","Décode le certificat suisse. Que dit-il vraiment? Des milliers l'ignorent.","Decodifica il certificato svizzero. Cosa dice davvero?"),badge:"PRO",bc:"tc-am",col:"am"},
        // 7+8. Produktivität – für alle, nicht nur Jobsuche
        {page:"excel", ico:"📊",t:L("Excel-Generator","Excel Generator","Générateur Excel","Generatore Excel"),p:L("Profi-Tabellen mit Formeln per Beschreibung. Für Arbeit, Schule, Privat.","Professional spreadsheets with formulas. For work, school, personal use.","Tableaux pros avec formules. Pour travail, école, usage personnel.","Fogli professionali con formule. Per lavoro, scuola, uso personale."),badge:"PRO",bc:"tc-em",col:""},
        {page:"pptx",  ico:"📽️",t:L("PowerPoint-Maker","PowerPoint Maker","Créateur PowerPoint","Creatore PowerPoint"),p:L("Strukturierte Präsentationen in Minuten – für Schule, Uni & Arbeit.","Structured presentations in minutes – for school, uni & work.","Présentations structurées en minutes – école, université & travail.","Presentazioni strutturate in minuti – scuola, università e lavoro."),badge:"PRO",bc:"tc-bl",col:"bl"},
      ],
    },
    why:{
      label:L("Warum Stellify?","Pourquoi Stellify?","Perché Stellify?","Why Stellify?"),
      title:L("Der erste echte AI Career Copilot für die Schweiz.","Le premier vrai copilote IA carrière pour la Suisse.","Il primo vero AI career copilot per la Svizzera.","The first real AI career copilot for Switzerland."),
      sub:  L("Andere Tools machen eines. Stellify macht alles – und versteht den Schweizer Markt.","D'autres font une chose. Stellify fait tout – et comprend le marché suisse.","Altri strumenti fanno una cosa. Stellify fa tutto – e capisce il mercato svizzero.","Other tools do one thing. Stellify does all – and understands the Swiss market."),
      badH: L("❌ ChatGPT / einzelne Tools","❌ ChatGPT / outils séparés","❌ ChatGPT / strumenti separati","❌ ChatGPT / separate tools"),
      goodH:"✅ Stellify",
      badL: L(
        ["Leeres Chatfenster, du weisst nicht was eingeben","Kein Schweizer Format/Standard","Kein ATS-Check – du weisst nicht ob dein CV gelesen wird","Kein Zeugnis-Decoder – Schweizer Code bleibt ein Rätsel","Kein Job-Matching – du bewirbst dich ins Blaue","6 verschiedene Apps, kein roter Faden"],
        ["Champ vide, on ne sait pas quoi écrire","Pas de format suisse","Pas d'ATS – vous ne savez pas si votre CV est lu","Pas de décodeur de certificat","Pas de matching – vous postulez au hasard","6 apps différentes, pas de fil rouge"],
        ["Campo vuoto, non sai cosa scrivere","Nessun formato svizzero","Nessun ATS – non sai se il tuo CV viene letto","Nessun decoder certificato","Nessun matching – ti candidi al buio","6 app diverse, nessun filo conduttore"],
        ["Empty box, you don't know what to type","No Swiss format/standard","No ATS check – you don't know if your CV gets read","No reference decoder – Swiss code remains a mystery","No job matching – you apply blindly","6 different apps, no coherent flow"]
      ),
      goodL:L(
        ["Geführter Prozess in 3 Schritten, kinderleicht","Optimiert für CH-Format in DE/FR/IT/EN","ATS-Simulation prüft Keywords & gibt Score","Zeugnis-Analyse entschlüsselt Schweizer Code","Job-Matching zeigt wo du 80%+ passst","Alles in einem – ein Profil, sechs Tools"],
        ["Processus guidé 3 étapes, très simple","Optimisé format suisse DE/FR/IT/EN","Simulation ATS vérifie mots-clés & score","Analyse certificat décode le code suisse","Matching montre où vous avez 80%+","Tout en un – un profil, six outils"],
        ["Processo guidato 3 passi, semplicissimo","Ottimizzato formato svizzero DE/FR/IT/EN","Simulazione ATS verifica keywords & score","Analisi certificato decodifica il codice svizzero","Matching mostra dove hai 80%+","Tutto in uno – un profilo, sei strumenti"],
        ["Guided 3-step process, incredibly simple","Optimized Swiss format in DE/FR/IT/EN","ATS simulation checks keywords & gives score","Reference analysis decodes Swiss code","Job matching shows where you fit 80%+","All in one – one profile, six tools"]
      ),
    },
    how:{
      label:L("Wie es funktioniert","Comment ça marche","Come funziona","How it works"),
      title:L("Profil einmal anlegen. Alle 20+ Tools nutzen.","Créez votre profil une fois. Utilisez les 20+ outils.","Crea il profilo una volta. Usa tutti i 20+ strumenti.","Set up your profile once. Use all 20+ tools."),
      sub:  L("Dein Profil ist die Basis für alle 20+ Tools.","Votre profil est la base de tous les 20+ outils.","Il tuo profilo è la base per tutti i 20+ strumenti.","Your profile is the basis for all 20+ tools."),
      steps:L(
        [{n:"01",t:"Profil anlegen",p:"Stelle, Erfahrung, Skills – einmal eingeben oder CV hochladen. Die KI liest alles automatisch."},{n:"02",t:"Tool wählen",p:"Bewerbung schreiben, ATS prüfen, Zeugnis analysieren, Jobs finden oder Interview üben."},{n:"03",t:"Live-Ergebnis",p:"Das Ergebnis erscheint Wort für Wort in Echtzeit – du siehst sofort, wie dein Dokument entsteht."}],
        [{n:"01",t:"Créer le profil",p:"Poste, expérience, compétences – entrer une fois ou uploader un CV. L'IA lit tout automatiquement."},{n:"02",t:"Choisir l'outil",p:"Rédiger candidature, ATS, analyser certificat, trouver emplois ou s'entraîner."},{n:"03",t:"Résultat en direct",p:"Le résultat apparaît mot par mot en temps réel – vous voyez votre document prendre forme instantanément."}],
        [{n:"01",t:"Crea il profilo",p:"Posto, esperienza, skills – inserire una volta o caricare il CV. L'IA legge tutto automaticamente."},{n:"02",t:"Scegli lo strumento",p:"Scrivere candidatura, ATS, analizzare certificato, trovare lavori o esercitarsi."},{n:"03",t:"Risultato live",p:"Il risultato appare parola per parola in tempo reale – vedi subito il tuo documento prendere forma."}],
        [{n:"01",t:"Create profile",p:"Position, experience, skills – enter once or upload your CV. AI reads everything automatically."},{n:"02",t:"Choose a tool",p:"Write application, ATS check, analyze reference, find jobs or practice interview."},{n:"03",t:"Live result",p:"The result appears word by word in real time – watch your document come to life instantly."}]
      ),
    },
    market:{
      label:L("Marktpotenzial","Potentiel marché","Potenziale mercato","Market potential"),
      title:L("Warum jetzt. Warum Schweiz.","Pourquoi maintenant. Pourquoi la Suisse.","Perché adesso. Perché la Svizzera.","Why now. Why Switzerland."),
      points:L(
        [{ico:"📈",t:"Jobwechsel nehmen zu",p:"Durchschnittlich alle 3 Jahre wechseln Arbeitnehmer in der Schweiz ihren Job."},{ico:"⏰",t:"Bewerbungen kosten Zeit",p:"Eine gute Bewerbung dauert 3–5 Stunden. Mit KI: 3 Minuten."},{ico:"🤖",t:"KI wird akzeptiert",p:"78% der Schweizer Arbeitnehmer würden KI für Karrierehilfe nutzen."},{ico:"🇨🇭",t:"Kein gutes CH-Tool",p:"Keine Lösung versteht das Schweizer Zeugnis-System, ATS-Anforderungen und 4 Sprachen."}],
        [{ico:"📈",t:"Changements de poste croissants",p:"En moyenne, les salariés changent d'emploi tous les 3 ans en Suisse."},{ico:"⏰",t:"Candidatures chronophages",p:"Une bonne candidature prend 3-5h. Avec l'IA: 3 minutes."},{ico:"🤖",t:"IA de plus en plus acceptée",p:"78% des salariés suisses utiliseraient l'IA pour leur carrière."},{ico:"🇨🇭",t:"Aucun bon outil suisse",p:"Aucune solution comprend le système de certificats CH, l'ATS et 4 langues."}],
        [{ico:"📈",t:"Cambi di lavoro in crescita",p:"In media i lavoratori svizzeri cambiano lavoro ogni 3 anni."},{ico:"⏰",t:"Candidature richiedono tempo",p:"Una buona candidatura richiede 3-5 ore. Con l'IA: 3 minuti."},{ico:"🤖",t:"IA sempre più accettata",p:"Il 78% dei lavoratori svizzeri userebbe l'IA per la carriera."},{ico:"🇨🇭",t:"Nessun buon tool svizzero",p:"Nessuna soluzione capisce i certificati svizzeri, ATS e 4 lingue."}],
        [{ico:"📈",t:"Job changes increasing",p:"On average, Swiss employees change jobs every 3 years."},{ico:"⏰",t:"Applications take time",p:"A good application takes 3–5 hours. With AI: 3 minutes."},{ico:"🤖",t:"AI increasingly accepted",p:"78% of Swiss employees would use AI for career help."},{ico:"🇨🇭",t:"No good Swiss tool",p:"No solution understands Swiss work references, ATS requirements and 4 languages."}]
      ),
    },
    testi:{
      label:L("Was Nutzer sagen","Témoignages","Testimonianze","Testimonials"),
      title:L("Echte Resultate.","Résultats réels.","Risultati reali.","Real results."),
      items:L(
        [{s:"★★★★★",t:"In 2 Minuten ein perfektes Motivationsschreiben. Ich habe den Job bekommen!",a:"Sophie K.",r:"Marketingmanagerin, Zürich"},{s:"★★★★★",t:"Der ATS-Check hat gezeigt, dass mein Lebenslauf bei 40% der Firmen aussortiert wurde. Nach der Optimierung: 91%.",a:"Lukas B.",r:"Softwareentwickler, Bern"},{s:"★★★★★",t:"Ich habe endlich verstanden was in meinem Arbeitszeugnis steht. Das Zeugnis war nicht so gut wie ich dachte.",a:"Mia T.",r:"Projektleiterin, Basel"}],
        [{s:"★★★★★",t:"En 2 minutes une lettre parfaite. J'ai obtenu le poste!",a:"Sophie K.",r:"Responsable marketing, Zurich"},{s:"★★★★★",t:"L'ATS m'a montré que mon CV était rejeté à 40%. Après optimisation: 91%.",a:"Lukas B.",r:"Développeur, Berne"},{s:"★★★★★",t:"J'ai enfin compris ce que dit mon certificat de travail.",a:"Mia T.",r:"Cheffe de projet, Bâle"}],
        [{s:"★★★★★",t:"In 2 minuti una lettera perfetta. Ho ottenuto il lavoro!",a:"Sophie K.",r:"Responsabile marketing, Zurigo"},{s:"★★★★★",t:"L'ATS mi ha mostrato che il mio CV veniva scartato al 40%. Dopo ottimizzazione: 91%.",a:"Lukas B.",r:"Sviluppatore, Berna"},{s:"★★★★★",t:"Ho finalmente capito cosa c'è nel mio certificato di lavoro.",a:"Mia T.",r:"Project manager, Basilea"}],
        [{s:"★★★★★",t:"In 2 minutes a perfect cover letter. I got the job!",a:"Sophie K.",r:"Marketing manager, Zurich"},{s:"★★★★★",t:"The ATS check showed my CV was rejected at 40% of companies. After optimization: 91%.",a:"Lukas B.",r:"Software developer, Berne"},{s:"★★★★★",t:"I finally understood what my work reference says. It wasn't as good as I thought.",a:"Mia T.",r:"Project manager, Basel"}]
      ),
    },
    price:{
      label: L("Preise","Tarifs","Prezzi","Pricing"),
      title: L("Ein Preis. 19+ Tools.","One price. 19+ tools.","Un prix. 19+ outils.","Un prezzo. 19+ strumenti."),
      sub:   L("Jederzeit kündbar. Keine versteckten Kosten.","Résiliable à tout moment.","Cancellabile in qualsiasi momento.","Cancel anytime. No hidden costs."),
      monthly:L("Monatlich","Mensuel","Mensile","Monthly"),
      yearly: L("Jährlich","Annuel","Annuale","Yearly"),
      save:   L("25% sparen","Économisez 25%","Risparmia 25%","Save 25%"),
      recom:  L("Empfohlen","Recommandé","Consigliato","Recommended"),
      tiers:[
        {id:"free",name:L("Gratis","Gratuit","Gratuito","Free"),price:0,
         note:L("Für immer kostenlos","Gratuit pour toujours","Sempre gratuito","Free forever"),
         list:L([`${C.FREE_LIMIT} Generierungen / Monat`,"Motivationsschreiben","Lebenslauf","CV hochladen","Text kopieren"],[`${C.FREE_LIMIT} générations / mois`,"Lettre de motivation","CV","Upload CV","Copier"],[`${C.FREE_LIMIT} generazioni / mese`,"Lettera motivazione","CV","Upload CV","Copia"],[`${C.FREE_LIMIT} generations / month`,"Cover letter","CV","Upload CV","Copy text"]),
         no:L(["LinkedIn","ATS-Check","Zeugnis-Analyse","Job-Matching","Interview-Coach","PDF-Export","E-Mail senden","Bewerbungs-Tracker","KI-Gehaltsrechner","20+ weitere Tools"],["LinkedIn","ATS check","Reference analysis","Job matching","Interview coach","PDF export","Email send","Application tracker","Salary calculator","20+ more tools"],["LinkedIn","ATS","Analyse certificat","Matching","Coach","PDF","E-mail","Tracker","Calculateur salaire","20+ autres outils"],["LinkedIn","ATS","Analisi certificato","Matching","Coach","PDF","E-mail","Tracker","Calcolatore stipendio","20+ altri strumenti"]),
         btn:L("Kostenlos starten","Commencer gratuitement","Inizia gratis","Start for free"),btnS:"b-out"},
        {id:"pro",name:"Pro",priceM:19.90,priceY:14.90,best:true,
         note:L("1 Person · Monatlich kündbar","1 person · Cancel monthly","1 personne · Résiliable","1 persona · Annullabile"),
         yearNote:L("🔥 CHF 14.90/Mo. bei Jahresabo – CHF 226.80/Jahr","🔥 CHF 14.90/mo with annual plan – CHF 226.80/year","🔥 CHF 14.90/mois avec abonnement annuel","🔥 CHF 14.90/mese con abbonamento annuale"),
         list:L(
           ["✍️ Unbegrenzte Bewerbungen","💼 LinkedIn Analyse & Optimierung","🤖 ATS-Simulation mit Score","📜 Zeugnis-Analyse & Decoder","🎯 Job-Matching (Top 5 Profile)","🎤 Interview-Coach (Note 0–100)","📊 Excel-Generator mit Formeln","📽️ PowerPoint-Maker","💰 KI-Gehaltsrechner Schweiz","📋 Bewerbungs-Tracker","✍️ LinkedIn-Post Generator","✅ Alle 20+ Tools · Alle 4 Sprachen"],
           ["✍️ Unlimited applications","💼 LinkedIn analysis","🤖 ATS simulation","📜 Work reference analysis","🎯 Job matching (Top 5)","🎤 Interview coach","📊 Excel generator","📽️ PowerPoint maker","💰 Swiss salary calculator","📋 Application tracker","✍️ LinkedIn post generator","✅ All 20+ tools · All 4 languages"],
           ["✍️ Documents illimités","💼 LinkedIn","🤖 ATS","📜 Certificat","🎯 Matching","🎤 Coach","📊 Excel","📽️ PowerPoint","💰 Calculateur salaire","📋 Tracker","✍️ Posts LinkedIn","✅ Tous les 20+ outils"],
           ["✍️ Documenti illimitati","💼 LinkedIn","🤖 ATS","📜 Certificato","🎯 Matching","🎤 Coach","📊 Excel","📽️ PowerPoint","💰 Calcolatore stipendio","📋 Tracker","✍️ Post LinkedIn","✅ Tutti i 20+ strumenti"]
         ),
         btn:L("Jetzt Pro werden → CHF 19.90/Mo.","Become Pro → CHF 19.90/mo","Devenir Pro → CHF 19.90/mois","Diventa Pro → CHF 19.90/mese"),btnS:"b-em"},
        {id:"family",name:L("Familie 👨‍👩‍👧","Family 👨‍👩‍👧","Famille 👨‍👩‍👧","Famiglia 👨‍👩‍👧"),priceM:34.90,priceY:26.90,best:false,
         note:L(`${C.PRO_LIMIT} Generierungen/Mo. pro Person · alle Tools`,`${C.PRO_LIMIT} generations/mo per person · all tools`,`${C.PRO_LIMIT} générations/mois par personne · tous les outils`,`${C.PRO_LIMIT} generazioni/mese per persona · tutti gli strumenti`),
         yearNote:L("🔥 CHF 26.90/Mo. bei Jahresabo – CHF 322.80/Jahr","🔥 CHF 26.90/mo annual – CHF 322.80/year","🔥 CHF 26.90/mois annuel","🔥 CHF 26.90/mese annuale"),
         list:L(
           ["✅ Alle 20+ Tools für alle Mitglieder","✍️ Unbegrenzte Bewerbungen","💼 LinkedIn → Bewerbung","🤖 ATS-Check & Zeugnis-Analyse","🎯 Job-Matching & Interview-Coach","💰 KI-Gehaltsrechner Schweiz","📋 Bewerbungs-Tracker","👨‍👩‍👧 Bis 4 Familienmitglieder","💡 ~50% günstiger als 4× Pro"],
           ["✅ All 20+ tools for all members","✍️ Unlimited applications","💼 LinkedIn → Application","🤖 ATS check & reference analysis","🎯 Job matching & interview coach","💰 Swiss salary calculator","📋 Application tracker","👨‍👩‍👧 Up to 4 family members","💡 ~50% cheaper than 4× Pro"],
           ["✅ Tous 20+ outils pour tous","✍️ Documents illimités","💼 LinkedIn → Candidature","🤖 ATS & analyse certificat","🎯 Matching & coach entretien","💰 Calculateur salaire suisse","📋 Tracker candidatures","👨‍👩‍👧 Jusqu'à 4 membres","💡 ~50% moins cher que 4× Pro"],
           ["✅ Tutti 20+ strumenti per tutti","✍️ Documenti illimitati","💼 LinkedIn → Candidatura","🤖 ATS & analisi certificato","🎯 Matching & coach colloquio","💰 Calcolatore stipendio svizzero","📋 Tracker candidature","👨‍👩‍👧 Fino a 4 membri","💡 ~50% più economico di 4× Pro"]
         ),
         btn:L("Familie starten → CHF 34.90/Mo.","Start family → CHF 34.90/mo","Famille → CHF 34.90/mois","Famiglia → CHF 34.90/mese"),btnS:"b-em"},
        {id:"team",name:L("Team 🏢","Team 🏢","Team 🏢","Team 🏢"),priceM:59.90,priceY:44.90,best:false,
         note:L(`Unbegrenzte Nutzung · ${C.PRO_LIMIT} Generierungen/Mo. pro Person`,`Unlimited usage · ${C.PRO_LIMIT} generations/mo per person`,`Usage illimité · ${C.PRO_LIMIT} générations/mois par personne`,`Utilizzo illimitato · ${C.PRO_LIMIT} generazioni/mese per persona`),
         yearNote:L("🔥 CHF 44.90/Mo. bei Jahresabo – CHF 538.80/Jahr","🔥 CHF 44.90/mo annual","🔥 CHF 44.90/mois annuel","🔥 CHF 44.90/mese annuale"),
         list:L(
           ["🏢 Bis 10 Personen","✅ Alle 20+ Tools für alle","✍️ Unbegrenzte Bewerbungen","💼 LinkedIn → Bewerbung","🤖 ATS-Check & Zeugnis-Analyse","🎯 Job-Matching & Interview-Coach","💰 KI-Gehaltsrechner Schweiz","📋 Bewerbungs-Tracker","🛡️ Priority Support"],
           ["🏢 Up to 10 people","✅ All 20+ tools for all","✍️ Unlimited applications","💼 LinkedIn → Application","🤖 ATS check & reference analysis","🎯 Job matching & interview coach","💰 Swiss salary calculator","📋 Application tracker","🛡️ Priority support"],
           ["🏢 Jusqu'à 10 personnes","✅ Tous 20+ outils pour tous","✍️ Documents illimités","💼 LinkedIn → Candidature","🤖 ATS & certificats","🎯 Matching & coach","💰 Calculateur salaire","📋 Tracker","🛡️ Support prioritaire"],
           ["🏢 Fino a 10 persone","✅ Tutti 20+ strumenti per tutti","✍️ Documenti illimitati","💼 LinkedIn → Candidatura","🤖 ATS & certificati","🎯 Matching & coach","💰 Calcolatore stipendio","📋 Tracker","🛡️ Supporto prioritario"]
         ),
         btn:L("Team starten → CHF 59.90/Mo.","Start team → CHF 59.90/mo","Démarrer équipe → CHF 59.90/mois","Avvia team → CHF 59.90/mese"),btnS:"b-out"},
      ],
      valTitle:L("CHF 19.90 – lohnt sich das?","CHF 19.90 – ça vaut la peine?","CHF 19.90 – vale la pena?","CHF 19.90 – is it worth it?"),
      valPts:L(
        ["Ein Karriereberater kostet CHF 200–400 / Sitzung","Eine schlechte Bewerbung = verpasste Stelle","Zeugnis nicht verstanden = falscher Job","1 erfolgreiche Bewerbung = Abo hat sich gerechnet","Ein schlechter ATS-Score = CV wird nie gelesen","Stellify spart dir 3–5 Std. pro Bewerbung"],
        ["Un conseiller coûte CHF 200–400 / séance","Mauvais score ATS = votre CV n'est jamais lu","Certificat mal compris = mauvais emploi","1 mois de candidature réussie rembourse tout"],
        ["Un consulente costa CHF 200–400 / seduta","Score ATS basso = il tuo CV non viene mai letto","Certificato non capito = lavoro sbagliato","1 mese di candidatura riuscita ripaga tutto"],
        ["A career advisor costs CHF 200–400 / session","Bad ATS score = your CV is never read","Reference misunderstood = wrong job","1 successful application month pays for everything"]
      ),
    },
    payments:{
      label:L("Bezahle wie du willst","Payez comme vous voulez","Paga come vuoi","Pay your way"),
      sub:L("Sicher via Stripe verarbeitet.","Traitement sécurisé via Stripe.","Elaborazione sicura via Stripe.","Securely processed via Stripe."),
      methods:["🇨🇭 Twint","💳 Visa","💳 Mastercard","💳 Amex","🅿️ PayPal","🍎 Apple Pay","🤖 Google Pay","🏦 SEPA","🛒 Klarna"],
    },
    cta:{
      title:L("Deine Karriere verdient","Votre carrière mérite","La tua carriera merita","Your career deserves"),
      italic:L("deinen persönlichen Copilot.","votre copilote personnel.","il tuo copilota personale.","your personal copilot."),
      sub:L("Kostenlos starten. 20+ Tools. Schweizer Standard. Jederzeit kündbar.","Commencer gratuitement. 20+ outils. Standard suisse. Résiliable.","Inizia gratis. 20+ strumenti. Standard svizzero. Cancellabile.","Start free. 20+ tools. Swiss standard. Cancel anytime."),
      btn:L("Jetzt kostenlos starten →","Commencer gratuitement →","Inizia gratis ora →","Start for free now →"),
    },
    app:{
      title:L("Bewerbung erstellen","Créer votre candidature","Crea la tua candidatura","Create your application"),
      sub:L("Live-Streaming · Schweizer Format · 60 Sekunden","Streaming live · Format suisse · 60 secondes","Streaming live · Formato svizzero · 60 secondi","Live streaming · Swiss format · 60 seconds"),
      steps:L(["Stelle","Profil","Dokument"],["Poste","Profil","Document"],["Posto","Profilo","Documento"],["Position","Profile","Document"]),
      uLeft:(n)=>L(`kostenlose Generierung${n!==1?"en":""} übrig`,`génération${n!==1?"s":""} restante${n!==1?"s":""}`,`generazion${n!==1?"i":"e"} rimast${n!==1?"e":"a"}`,`free generation${n!==1?"s":""} remaining`),
      proActive:L("✦ Pro aktiv – alle 20+ Tools freigeschaltet","✦ Pro active – all 20+ tools unlocked","✦ Pro actif – 20+ outils disponibles","✦ Pro attivo – 20+ strumenti disponibili"),
      branches:L(
        ["Technologie / IT","Finanzen / Versicherung","Gesundheit / Pharma","Marketing","Handel","Industrie","Bildung / Forschung","Öffentlicher Dienst","Tourismus","Andere"],
        ["Technologie / IT","Finance / Assurance","Santé / Pharma","Marketing","Commerce","Industrie","Éducation","Service public","Tourisme","Autre"],
        ["Tecnologia / IT","Finanza / Assicurazione","Salute / Pharma","Marketing","Commercio","Industria","Istruzione","Servizio pubblico","Turismo","Altro"],
        ["Technology / IT","Finance / Insurance","Healthcare / Pharma","Marketing","Retail","Industry","Education","Public sector","Tourism","Other"]
      ),
      back:L("← Zurück","← Retour","← Indietro","← Back"),
      next:L("Weiter →","Suivant →","Avanti →","Next →"),
      copy:L("Kopieren","Copier","Copia","Copy"),
      copied:L("✓ Kopiert!","✓ Copié!","✓ Copiato!","✓ Copied!"),
      edit:L("Bearbeiten","Modifier","Modifica","Edit"),
      prev:L("Vorschau","Aperçu","Anteprima","Preview"),
      pdf:L("PDF","PDF","PDF","PDF"),
      regen:L("Neu","Nouveau","Nuovo","New"),
      stream:L("KI schreibt live…","L'IA rédige en direct…","L'IA scrive live…","AI writing live…"),
      genBtn:L("✨ Jetzt erstellen","✨ Créer maintenant","✨ Crea ora","✨ Create now"),
      genLoad:L("Generiere…","Génération…","Generando…","Generating…"),
      goCoach:L("🎤 Interview-Coach →","🎤 Coach →","🎤 Coach →","🎤 Interview Coach →"),
      goAts:L("🤖 ATS-Check →","🤖 ATS →","🤖 ATS →","🤖 ATS Check →"),
      goCl:L("✅ Checkliste →","✅ Check-liste →","✅ Checklist →","✅ Checklist →"),
      goLi:L("💼 LinkedIn →","💼 LinkedIn →","💼 LinkedIn →","💼 LinkedIn →"),
      pw:{
        title:L("Noch mehr mit Pro ✦","Plus avec Pro ✦","Di più con Pro ✦","More with Pro ✦"),
        sub:L("Du siehst wie gut es funktioniert.","Vous voyez comment ça marche.","Vedi come funziona bene.","You see how well it works."),
        feats:L(["LinkedIn","ATS","Zeugnis","Coach","Matching"],["LinkedIn","ATS","Certificat","Coach","Matching"],["LinkedIn","ATS","Certificato","Coach","Matching"],["LinkedIn","ATS","Reference","Coach","Matching"]),
        btn:L(`Pro werden – CHF ${C.priceM}/Mo. →`,`Devenir Pro – CHF ${C.priceM}/Mo. →`,`Diventa Pro – CHF ${C.priceM}/Mo. →`,`Become Pro – CHF ${C.priceM}/mo →`),
        secure:L("Stripe · Twint · Jederzeit kündbar","Stripe · Twint · Résiliable","Stripe · Twint · Cancellabile","Stripe · Twint · Cancel anytime"),
      },
    },
    email:{
      title:L("✉️ Direkt per E-Mail senden","✉️ Envoi direct par e-mail","✉️ Invio diretto per e-mail","✉️ Send directly by email"),
      toLbl:L("E-Mail des Unternehmens *","E-mail de l'entreprise *","E-mail dell'azienda *","Company email *"),
      subjLbl:L("Betreff","Objet","Oggetto","Subject"),
      msgPh:L("Mit freundlichen Grüssen…","Cordiales salutations…","Cordiali saluti…","Kind regards…"),
      btn:L("✉️ E-Mail öffnen","✉️ Ouvrir e-mail","✉️ Apri e-mail","✉️ Open email"),
      note:L("Öffnet deinen E-Mail-Client mit dem Anschreiben.","Ouvre votre client avec la lettre.","Apre il client con la lettera.","Opens your email client with the cover letter."),
    },
    checklist:{
      title:L("✅ Bewerbungs-Checkliste","✅ Check-liste candidature","✅ Checklist candidatura","✅ Application Checklist"),
      sub:L("Hake ab was erledigt ist.","Cochez ce qui est fait.","Spunta cosa è fatto.","Tick off what's done."),
      score:(n,t)=>L(`${n}/${t} erledigt`,`${n}/${t} effectués`,`${n}/${t} completati`,`${n} of ${t} done`),
      perfect:L("🎉 Vollständig! Bereit.","🎉 Complet! Prêt.","🎉 Completo! Pronto.","🎉 Complete! Ready."),
      items:L(
        [{id:"m",t:"Motivationsschreiben",d:"Persönlich, fehlerfrei, auf die Stelle zugeschnitten"},{id:"cv",t:"Lebenslauf",d:"Aktuell, max. 2 Seiten, Schweizer Format"},{id:"ats",t:"ATS-Check gemacht",d:"Score 70%+ – Lebenslauf kommt durch Recruiting-Software"},{id:"foto",t:"Bewerbungsfoto",d:"Professionell, aktuell, neutraler Hintergrund"},{id:"zeug",t:"Arbeitszeugnisse",d:"Letzte 2–3 Stellen, Original oder zertifiziert"},{id:"dipl",t:"Diplome & Zertifikate",d:"Relevante Abschlüsse"},{id:"ref",t:"Referenzpersonen",d:"2–3 Personen, kontaktiert"},{id:"mail",t:"Professionelle E-Mail",d:"vorname.nachname@..."},{id:"spell",t:"Rechtschreibung geprüft",d:"Alles gelesen, null Fehler"},{id:"fu",t:"Follow-up geplant",d:"Wann rufst du nach?"}],
        [{id:"m",t:"Lettre de motivation",d:"Personnelle, sans fautes"},{id:"cv",t:"Curriculum vitae",d:"À jour, max. 2 pages"},{id:"ats",t:"ATS effectué",d:"Score 70%+ – CV passe les logiciels"},{id:"foto",t:"Photo",d:"Professionnelle, fond neutre"},{id:"zeug",t:"Certificats",d:"2–3 derniers postes"},{id:"dipl",t:"Diplômes",d:"Formations pertinentes"},{id:"ref",t:"Références",d:"2–3 personnes contactées"},{id:"mail",t:"E-mail pro",d:"prenom.nom@..."},{id:"spell",t:"Orthographe",d:"Tout relu"},{id:"fu",t:"Suivi planifié",d:"Quand relancez-vous?"}],
        [{id:"m",t:"Lettera motivazione",d:"Personale, senza errori"},{id:"cv",t:"Curriculum vitae",d:"Aggiornato, max. 2 pagine"},{id:"ats",t:"ATS effettuato",d:"Score 70%+ – CV passa i software"},{id:"foto",t:"Foto",d:"Professionale, sfondo neutro"},{id:"zeug",t:"Certificati",d:"Ultimi 2–3 posti"},{id:"dipl",t:"Diplomi",d:"Formazioni pertinenti"},{id:"ref",t:"Referenze",d:"2–3 persone contattate"},{id:"mail",t:"E-mail professionale",d:"nome.cognome@..."},{id:"spell",t:"Ortografia",d:"Tutto riletto"},{id:"fu",t:"Follow-up pianificato",d:"Quando ricontatti?"}],
        [{id:"m",t:"Cover letter",d:"Personal, error-free, tailored"},{id:"cv",t:"Curriculum vitae",d:"Current, max. 2 pages"},{id:"ats",t:"ATS check done",d:"Score 70%+ – CV passes recruiting software"},{id:"foto",t:"Application photo",d:"Professional, neutral background"},{id:"zeug",t:"Work references",d:"Last 2–3 positions"},{id:"dipl",t:"Diplomas",d:"Relevant qualifications"},{id:"ref",t:"References",d:"2–3 people contacted"},{id:"mail",t:"Professional email",d:"firstname.lastname@..."},{id:"spell",t:"Spelling checked",d:"Everything re-read"},{id:"fu",t:"Follow-up planned",d:"When will you call?"}]
      ),
    },
    ats:{
      title:L("🤖 ATS-Simulation","🤖 Simulation ATS","🤖 Simulazione ATS","🤖 ATS Simulation"),
      sub:L("Prüft ob dein Lebenslauf durch Recruiter-Software kommt.","Vérifie si votre CV passe les logiciels RH.","Controlla se il tuo CV passa i software HR.","Checks if your CV passes recruiter software."),
      cvLbl:L("Dein Lebenslauf (Text einfügen) *","Votre CV (coller le texte) *","Il tuo CV (incolla il testo) *","Your CV (paste text) *"),
      cvPh:L("Lebenslauf-Text einfügen…","Collez votre CV…","Incolla il tuo CV…","Paste your CV text here…"),
      jobLbl:L("Stellenbezeichnung *","Intitulé du poste *","Titolo del posto *","Job title *"),
      jobDescLbl:L("Stellenbeschreibung (empfohlen)","Description du poste (recommandé)","Descrizione (consigliato)","Job description (recommended)"),
      jobDescPh:L("Inserat einfügen für bessere Keyword-Analyse…","Collez l'annonce pour une meilleure analyse…","Incolla l'annuncio per un'analisi migliore…","Paste job ad for better keyword analysis…"),
      btn:L("🤖 ATS-Check starten","🤖 Lancer l'ATS","🤖 Avvia ATS","🤖 Run ATS check"),
      loading:L("Simuliere ATS…","Simulation ATS…","Simulando ATS…","Simulating ATS…"),
      scoreLabel:L("ATS-Score","Score ATS","Score ATS","ATS Score"),
      found:L("✓ Gefundene Keywords","✓ Mots-clés trouvés","✓ Keywords trovati","✓ Keywords found"),
      miss:L("✗ Fehlende Keywords","✗ Mots-clés manquants","✗ Keywords mancanti","✗ Missing keywords"),
      tips:L("💡 Optimierungstipps","💡 Conseils d'optimisation","💡 Consigli di ottimizzazione","💡 Optimization tips"),
      prompt:(cv,job,desc)=>L(
        `Du bist ein KI-Simulator für ATS-Systeme (Applicant Tracking Software). Analysiere diesen Lebenslauf für die Stelle "${job}" auf Keyword-Match und Vollständigkeit. Hinweis: Score ist KI-Schätzung, kein offizieller Wert. Antworte NUR mit JSON:\n{"score":82,"grade":"Gut","summary":"2 Sätze zur Gesamtbewertung","keywords_found":["Python","Projektmanagement","Deutsch"],"keywords_missing":["Scrum","SQL","Englisch"],"tips":["Tipp 1 (konkret)","Tipp 2","Tipp 3"]}\nStelle: ${job}\nInserat: ${desc||"nicht angegeben"}\nLebenslauf:\n${cv}`,
        `Tu es un système ATS pour RH suisses. Analyse ce CV pour le poste "${job}". Réponds UNIQUEMENT avec JSON:\n{"score":82,"grade":"Bien","summary":"2 phrases","keywords_found":["Python"],"keywords_missing":["Scrum"],"tips":["Conseil 1","Conseil 2","Conseil 3"]}\nPoste: ${job}\nAnnonce: ${desc||"non fournie"}\nCV:\n${cv}`,
        `Sei un sistema ATS per HR svizzeri. Analizza questo CV per il posto "${job}". Rispondi SOLO con JSON:\n{"score":82,"grade":"Bene","summary":"2 frasi","keywords_found":["Python"],"keywords_missing":["Scrum"],"tips":["Consiglio 1","Consiglio 2","Consiglio 3"]}\nPosto: ${job}\nAnnuncio: ${desc||"non fornito"}\nCV:\n${cv}`,
        `You are an ATS system for Swiss HR. Analyze this CV for the position "${job}". Reply ONLY with JSON:\n{"score":82,"grade":"Good","summary":"2 sentences","keywords_found":["Python"],"keywords_missing":["Scrum"],"tips":["Tip 1","Tip 2","Tip 3"]}\nPosition: ${job}\nJob ad: ${desc||"not provided"}\nCV:\n${cv}`
      ),
    },
    zeugnis:{
      title:L("📜 Zeugnis-Analyse","📜 Analyse certificat","📜 Analisi certificato","📜 Reference Analysis"),
      sub:L("Entschlüssle den Schweizer Zeugnis-Code. Was steht wirklich drin?","Déchiffrez le code suisse. Que dit vraiment votre certificat?","Decodifica il codice svizzero. Cosa dice davvero il tuo certificato?","Decode the Swiss reference code. What does it really say?"),
      textLbl:L("Zeugnis-Text einfügen *","Texte du certificat *","Testo del certificato *","Reference text *"),
      textPh:L("Ganzen Zeugnistext hier einfügen…","Collez ici le texte complet du certificat…","Incolla qui il testo completo del certificato…","Paste the full reference text here…"),
      btn:L("📜 Zeugnis analysieren","📜 Analyser le certificat","📜 Analizza il certificato","📜 Analyse reference"),
      loading:L("Analysiere…","Analyse…","Analizzando…","Analysing…"),
      overall:L("Gesamtbewertung","Évaluation globale","Valutazione globale","Overall assessment"),
      phrases:L("Entschlüsselte Formulierungen","Formulations déchiffrées","Formulazioni decifrate","Decoded phrases"),
      tips:L("💡 Was du tun solltest","💡 Ce que vous devriez faire","💡 Cosa dovresti fare","💡 What you should do"),
      prompt:(text)=>L(
        `Du bist Schweizer HR-Experte und kennst den vollständigen Zeugnis-Code des Schweizerischen Obligationenrechts (OR). Analysiere dieses Zeugnis und entschlüssle jede Formulierung gemäss dem offiziellen Schweizer Zeugnis-Decoder ("stets zu unserer vollsten Zufriedenheit" = sehr gut, "zu unserer vollsten Zufriedenheit" = gut, "zu unserer Zufriedenheit" = befriedigend, "im Grossen und Ganzen" = genügend, "war bemüht" = ungenügend). Antworte NUR mit JSON:\n{"grade":"A","grade_text":"Sehr gut","overall":"2-3 Sätze zur Gesamtbewertung","phrases":[{"original":"hat die ihm übertragenen Aufgaben stets zu unserer vollsten Zufriedenheit erledigt","decoded":"Bestnote – entspricht einer 6","rating":"A"},{"original":"war bemüht","decoded":"Schwache Formulierung – bedeutet mangelhafte Leistung","rating":"D"}],"tips":["Tipp 1","Tipp 2"]}\nZeugnis:\n${text}`,
        `Tu es expert en certificats de travail suisses. Analyse ce certificat. Réponds UNIQUEMENT avec JSON:\n{"grade":"A","grade_text":"Très bien","overall":"2-3 phrases","phrases":[{"original":"phrase originale","decoded":"sens réel","rating":"A"}],"tips":["Conseil"]}\nCertificat:\n${text}`,
        `Sei esperto di certificati di lavoro svizzeri. Analizza questo certificato. Rispondi SOLO con JSON:\n{"grade":"A","grade_text":"Molto bene","overall":"2-3 frasi","phrases":[{"original":"frase originale","decoded":"significato reale","rating":"A"}],"tips":["Consiglio"]}\nCertificato:\n${text}`,
        `You are an expert in Swiss work references. Analyse this reference. Reply ONLY with JSON:\n{"grade":"A","grade_text":"Excellent","overall":"2-3 sentences","phrases":[{"original":"original phrase","decoded":"real meaning","rating":"A"}],"tips":["Tip"]}\nReference:\n${text}`
      ),
    },
    jobmatch:{
      title:L("🎯 Job-Matching","🎯 Matching emploi","🎯 Job Matching","🎯 Job Matching"),
      sub:L("Die KI analysiert dein Profil und findet die Top 5 passenden Stellen.","L'IA analyse votre profil et trouve les 5 postes les mieux adaptés.","L'IA analizza il tuo profilo e trova i 5 posti più adatti.","AI analyzes your profile and finds your top 5 matching positions."),
      skillsLbl:L("Skills & Erfahrung *","Compétences & expérience *","Competenze & esperienza *","Skills & experience *"),
      skillsPh:L("z.B. 5 Jahre Projektmanagement, Python, Teamführung, Finanzen…","ex. 5 ans gestion de projet, Python, management…","es. 5 anni gestione progetti, Python, management…","e.g. 5 years project management, Python, team leadership, finance…"),
      eduLbl:L("Ausbildung","Formation","Formazione","Education"),
      eduPh:L("z.B. BSc Wirtschaftsinformatik, Uni Bern","ex. BSc Informatique, Uni Berne","es. BSc Informatica, Uni Berna","e.g. BSc Business Informatics, Uni Berne"),
      prefLbl:L("Präferenzen (optional)","Préférences (optionnel)","Preferenze (opzionale)","Preferences (optional)"),
      prefPh:L("z.B. Homeoffice, Startup, Zürich, 100%…","ex. Télétravail, startup, Zurich…","es. Telelavoro, startup, Zurigo…","e.g. Home office, startup, Zurich, 100%…"),
      btn:L("🎯 Matching starten","🎯 Lancer le matching","🎯 Avvia matching","🎯 Start matching"),
      loading:L("Analysiere Profil…","Analyse du profil…","Analizzando profilo…","Analysing profile…"),
      fitScore:L("Fit-Score","Score d'adéquation","Score compatibilità","Fit score"),
      applyBtn:L("Bewerben →","Postuler →","Candidarsi →","Apply →"),
      prompt:(skills,edu,pref)=>L(
        `Du bist ein Karriereberater für den Schweizer Arbeitsmarkt. Analysiere dieses Profil und finde die Top 5 passenden Stellenprofile. Antworte NUR mit JSON:\n{"matches":[{"rank":1,"title":"Senior Project Manager","fit":91,"industry":"Technologie","description":"Kurze Beschreibung warum dieser Job passt (2 Sätze)","skills_match":["Projektmanagement","Python"],"salary":"CHF 110–140k"},{"rank":2,"title":"...","fit":84,...}]}\nSkills & Erfahrung: ${skills}\nAusbildung: ${edu||"nicht angegeben"}\nPräferenzen: ${pref||"keine"}`,
        `Tu es conseiller carrière pour le marché suisse. Analyse ce profil et trouve les 5 postes idéaux. Réponds UNIQUEMENT avec JSON:\n{"matches":[{"rank":1,"title":"Chef de projet senior","fit":91,"industry":"Technologie","description":"Pourquoi ce poste correspond (2 phrases)","skills_match":["Gestion de projet"],"salary":"CHF 110–140k"}]}\nCompétences: ${skills}\nFormation: ${edu||"n/a"}\nPréférences: ${pref||"aucune"}`,
        `Sei consulente carriera per il mercato svizzero. Analizza questo profilo e trova i 5 posti ideali. Rispondi SOLO con JSON:\n{"matches":[{"rank":1,"title":"Senior Project Manager","fit":91,"industry":"Tecnologia","description":"Perché questo lavoro corrisponde (2 frasi)","skills_match":["Gestione progetti"],"salary":"CHF 110–140k"}]}\nSkills: ${skills}\nFormazione: ${edu||"n/d"}\nPreferenze: ${pref||"nessuna"}`,
        `You are a career advisor for the Swiss job market. Analyse this profile and find the top 5 matching positions. Reply ONLY with JSON:\n{"matches":[{"rank":1,"title":"Senior Project Manager","fit":91,"industry":"Technology","description":"Why this job fits (2 sentences)","skills_match":["Project management"],"salary":"CHF 110–140k"}]}\nSkills & experience: ${skills}\nEducation: ${edu||"not provided"}\nPreferences: ${pref||"none"}`
      ),
    },
    coach:{
      title:L("🎤 Interview-Coach","🎤 Coach d'entretien","🎤 Coach colloquio","🎤 Interview Coach"),
      sub:L("KI simuliert 5 echte Fragen, bewertet Antworten, gibt Note 0–100.","L'IA simule 5 vraies questions, évalue et note de 0 à 100.","L'IA simula 5 domande reali, valuta e dà voto 0–100.","AI simulates 5 real questions, evaluates answers, gives score 0–100."),
      ready:L("Bereit für dein Interview?","Prêt pour votre entretien?","Pronto per il colloquio?","Ready for your interview?"),
      readySub:L("5 Fragen · KI-Bewertung · Konkrete Tipps","5 questions · Évaluation · Conseils","5 domande · Valutazione · Consigli","5 questions · AI evaluation · Concrete tips"),
      noJob:L("Bitte zuerst Stelle angeben.","Veuillez d'abord entrer un poste.","Inserisci prima un posto.","Please enter a position first."),
      start:L("Interview starten →","Démarrer →","Inizia →","Start interview →"),
      prep:L("Bereite vor…","Préparation…","Preparando…","Preparing…"),
      qOf:(n)=>L(`Frage ${n}/5`,`Question ${n}/5`,`Domanda ${n}/5`,`Question ${n}/5`),
      ph:L("Deine Antwort…","Votre réponse…","La tua risposta…","Your answer…"),
      send:L("Senden","Envoyer","Invia","Send"),
      newIC:L("🔄 Neues Interview","🔄 Nouvel entretien","🔄 Nuovo colloquio","🔄 New interview"),
      result:L("Dein Ergebnis","Votre résultat","Il tuo risultato","Your result"),
      strengths:L("Stärken:","Points forts:","Punti di forza:","Strengths:"),
      tip:L("Tipp:","Conseil:","Consiglio:","Tip:"),
      locked:L("Pro-Feature","Pro","Pro","Pro Feature"),
      lockedSub:L("Der Interview-Coach ist in Pro enthalten.","Le coach est inclus dans Pro.","Il coach è incluso in Pro.","The interview coach is included in Pro."),
      icStart:(j)=>L(
        `Du bist HR-Interviewer in der Schweiz für "${j.title||"diese Stelle"}" bei "${j.company||"diesem Unternehmen"}". Stelle deine erste Interviewfrage auf Schweizer Hochdeutsch. Nur die Frage.`,
        `Tu es recruteur en Suisse pour "${j.title||"ce poste"}" chez "${j.company||"cette entreprise"}". Pose ta première question d'entretien en français. Seulement la question.`,
        `Sei recruiter svizzero per "${j.title||"questo posto"}" presso "${j.company||"questa azienda"}". Fai la tua prima domanda di colloquio in italiano. Solo la domanda.`,
        `You are an HR interviewer in Switzerland for "${j.title||"this position"}" at "${j.company||"this company"}". Ask your first interview question in English. Only the question.`
      ),
      icNext:(j)=>L(
        `Interviewer für "${j.title||"diese Stelle"}": Reagiere 1 Satz, dann neue tiefgehende Frage. Schweizer Hochdeutsch.`,
        `Recruteur pour "${j.title||"ce poste"}": Réagis en 1 phrase, puis nouvelle question approfondie. En français.`,
        `Recruiter per "${j.title||"questo posto"}": Reagisci in 1 frase, poi nuova domanda approfondita. In italiano.`,
        `Interviewer for "${j.title||"this role"}": React in 1 sentence, then new in-depth question. In English.`
      ),
      icScore:(h)=>L(
        `Analysiere dieses Interview. NUR JSON: {"score":75,"feedback":"2-3 Sätze","staerken":["S1","S2"],"verbesserung":"1 Tipp"}\n${h}`,
        `Analyse cet entretien. UNIQUEMENT JSON: {"score":75,"feedback":"2-3 phrases","staerken":["P1"],"verbesserung":"1 conseil"}\n${h}`,
        `Analizza questo colloquio. SOLO JSON: {"score":75,"feedback":"2-3 frasi","staerken":["P1"],"verbesserung":"1 consiglio"}\n${h}`,
        `Analyse this interview. ONLY JSON: {"score":75,"feedback":"2-3 sentences","staerken":["S1"],"verbesserung":"1 tip"}\n${h}`
      ),
      icDone:(s)=>L(`🎯 Fertig! Dein Score: ${s}/100`,`🎯 Terminé! Score: ${s}/100`,`🎯 Finito! Score: ${s}/100`,`🎯 Done! Score: ${s}/100`),
    },
    linkedin:{
      title:L("💼 LinkedIn Analyse & Optimierung","💼 LinkedIn Analyse & Optimisation","💼 LinkedIn Analisi & Ottimizzazione","💼 LinkedIn Analysis & Optimization"),
      sub:L("Die KI macht dein Profil für Recruiter unwiderstehlich.","L'IA rend votre profil irrésistible pour les recruteurs.","L'IA rende il tuo profilo irresistibile per i recruiter.","The AI makes your profile irresistible to recruiters."),
      analyzeLabel:L("LinkedIn-Profil Text (About + Erfahrung)","Texte profil LinkedIn (About + Expérience)","Testo profilo LinkedIn (About + Esperienza)","LinkedIn profile text (About + Experience)"),
      analyzePh:L("Füge deinen aktuellen LinkedIn-Text ein oder beschreibe dein Profil…","Collez votre texte LinkedIn ou décrivez votre profil…","Incolla il tuo testo LinkedIn o descrivi il tuo profilo…","Paste your current LinkedIn text or describe your profile…"),
      roleLbl:L("Zielrolle","Poste cible","Ruolo target","Target role"),
      rolePh:L("z.B. Senior Product Manager","ex. Chef de produit senior","es. Senior Product Manager","e.g. Senior Product Manager"),
      achLbl:L("Top 3 Erfolge","3 meilleures réalisations","Top 3 successi","Top 3 achievements"),
      achPh:L("z.B. Team von 10 geführt…","ex. Équipe de 10 gérée…","es. Team di 10 gestito…","e.g. Led team of 10…"),
      btn:L("💼 LinkedIn optimieren →","💼 Optimiser →","💼 Ottimizzare →","💼 Optimize →"),
      load:L("Optimiere…","Optimisation…","Ottimizzando…","Optimizing…"),
      resH:L("🚀 Optimierter Headline","🚀 Titre optimisé","🚀 Headline ottimizzato","🚀 Optimized headline"),
      resA:L("📝 About-Sektion","📝 Section About","📝 Sezione About","📝 About section"),
      resS:L("🏷️ Empfohlene Skills","🏷️ Compétences","🏷️ Skills consigliati","🏷️ Recommended skills"),
      copy:L("Kopieren","Copier","Copia","Copy"),
      prompt:(d)=>`You are a LinkedIn career coach for the Swiss job market. Optimize this profile. Reply ONLY with valid JSON. Write the headline and about section in ${L("Schweizer Hochdeutsch (kein ß)","français","italiano","English")}.\nCurrent text: ${d.text||"not provided"}\nTarget role: ${d.role||"not provided"}\nAchievements: ${d.ach||"not provided"}\nCurrent job: ${d.beruf||"not provided"} | Experience: ${d.erfahrung||0} years | Skills: ${d.skills||"not provided"}\nRequired JSON: {"headline":"max 220 chars","about":"3-4 paragraphs first person ~250 words","skills":["Skill1","Skill2","Skill3","Skill4","Skill5","Skill6","Skill7","Skill8","Skill9","Skill10"]}`,
    },
    modal:{
      title:`${C.name} Pro`,
      sub:L("Alle 20+ KI-Tools freischalten.","Débloquer les 20+ outils IA.","Sblocca i 20+ strumenti IA.","Unlock all 20+ AI tools."),
      feats:L([["✍️","Bewerbungen"],["🤖","ATS"],["📜","Zeugnis"],["🎯","Matching"],["💼","LinkedIn"],["🎤","Coach"]],
              [["✍️","Candidatures"],["🤖","ATS"],["📜","Certificat"],["🎯","Matching"],["💼","LinkedIn"],["🎤","Coach"]],
              [["✍️","Candidature"],["🤖","ATS"],["📜","Certificato"],["🎯","Matching"],["💼","LinkedIn"],["🎤","Coach"]],
              [["✍️","Applications"],["🤖","ATS"],["📜","Reference"],["🎯","Matching"],["💼","LinkedIn"],["🎤","Coach"]]),
      btn:L("Jetzt Pro werden →","Devenir Pro →","Diventa Pro →","Become Pro →"),
      close:L("Schliessen","Fermer","Chiudi","Close"),
      note:L("Stripe · Twint · Kreditkarte · PayPal · Apple Pay · Jederzeit kündbar","Stripe · Twint · CB · PayPal · Apple Pay · Résiliable","Stripe · Twint · CC · PayPal · Apple Pay · Cancellabile","Stripe · Twint · Credit card · PayPal · Apple Pay · Cancel anytime"),
    },
    legal:{
      agb:L("AGB","CGV","CGC","T&C"), privacy:L("Datenschutz","Confidentialité","Privacy","Privacy"),
      imprint:L("Impressum","Mentions légales","Note legali","Imprint"),
      product:L("Produkt","Produit","Prodotto","Product"),
      legalL:L("Rechtliches","Légal","Note legali","Legal"),
      tagline:L(`${C.tagline} – Schweizer Standard.`,`${C.tagline} – Standard suisse.`,`${C.tagline} – Standard svizzero.`,`${C.tagline} – Swiss standard.`),
    },
    motivPrompt:(j,p)=>L(
      `Erfahrener Karrierecoach: Professionelles Motivationsschreiben Schweizer Hochdeutsch (kein ß).\nStelle: ${j.title} bei ${j.company} | Branche: ${j.branch||"k.A."} | Inserat: ${j.desc||"k.A."}\n${p.name} | ${p.beruf} | ${p.erfahrung} J. | Skills: ${p.skills} | Sprachen: ${p.sprachen} | Ausbildung: ${p.ausbildung}\n~350 Wörter, direkt mit Brief beginnen (Ort/Datum/Anschrift).`,
      `Coach carrière: Lettre de motivation française pour le marché suisse.\nPoste: ${j.title} chez ${j.company} | ${p.name} | ${p.beruf} | ${p.erfahrung} ans | ${p.skills}\n~350 mots, commencer directement par la lettre.`,
      `Coach carriera: Lettera di motivazione italiana per il mercato svizzero.\nPosto: ${j.title} presso ${j.company} | ${p.name} | ${p.beruf} | ${p.erfahrung} anni | ${p.skills}\n~350 parole, iniziare direttamente con la lettera.`,
      `Career coach: Professional English cover letter for Swiss job market.\nPosition: ${j.title} at ${j.company} | ${p.name} | ${p.beruf} | ${p.erfahrung} years | ${p.skills}\n~350 words, start directly with the letter.`
    ),
    cvPrompt:(j,p)=>L(
      `Erfahrener Karrierecoach: Vollständiger Lebenslauf Schweizer Hochdeutsch im CH-Format.\n${p.name} | ${p.beruf} | ${p.erfahrung} J. | ${p.skills} | ${p.sprachen} | ${p.ausbildung} | Ziel: ${j.title} bei ${j.company}\nAlle Sektionen: Persönliche Angaben, Berufsprofil, Berufserfahrung, Ausbildung, Skills, Sprachen.`,
      `Coach carrière: CV complet français format suisse. ${p.name} | ${p.beruf} | ${p.erfahrung} ans | ${p.skills} | Poste: ${j.title} chez ${j.company}. Toutes sections.`,
      `Coach carriera: CV completo italiano formato svizzero. ${p.name} | ${p.beruf} | ${p.erfahrung} anni | ${p.skills} | Posto: ${j.title} presso ${j.company}. Tutte le sezioni.`,
      `Career coach: Complete English CV in Swiss format. ${p.name} | ${p.beruf} | ${p.erfahrung} years | ${p.skills} | Target: ${j.title} at ${j.company}. All sections.`
    ),
  };
};

// ── GENERIC TOOL CONFIG ──
// Each tool: { id, icon, color, category, langs:{de,en,fr,it}, inputs:[{key,label,type,ph,required}], prompt:(vals,lang)=>string }
const GENERIC_TOOLS = [
  // ── KARRIERE ──
  { id:"gehalt", ico:"💰", color:"#059669", cat:"karriere",
    t:{de:"Gehaltsverhandlung",en:"Salary Negotiation",fr:"Négociation salariale",it:"Negoziazione stipendio"},
    sub:{de:"KI simuliert das Gespräch & gibt dir starke Argumente.",en:"AI simulates the conversation & gives you strong arguments.",fr:"L'IA simule la conversation & vous donne des arguments solides.",it:"L'IA simula la conversazione & ti dà argomenti solidi."},
    inputs:[
      {k:"job",   lbl:{de:"Deine Stelle",en:"Your position",fr:"Votre poste",it:"Il tuo posto"},             ph:{de:"z.B. Softwareentwickler",en:"e.g. Software Engineer",fr:"ex. Ingénieur logiciel",it:"es. Ingegnere software"}, req:true},
      {k:"curr",  lbl:{de:"Aktuelles Gehalt (CHF)",en:"Current salary (CHF)",fr:"Salaire actuel (CHF)",it:"Stipendio attuale (CHF)"},ph:{de:"z.B. 95'000",en:"e.g. 95,000",fr:"ex. 95'000",it:"es. 95'000"},req:true},
      {k:"target",lbl:{de:"Zielgehalt (CHF)",en:"Target salary (CHF)",fr:"Salaire cible (CHF)",it:"Stipendio target (CHF)"},          ph:{de:"z.B. 115'000",en:"e.g. 115,000",fr:"ex. 115'000",it:"es. 115'000"},req:true},
      {k:"exp",   lbl:{de:"Berufserfahrung & Stärken",en:"Experience & strengths",fr:"Expérience & points forts",it:"Esperienza & punti di forza"}, ph:{de:"z.B. 6 Jahre, 3 Mio. Umsatz generiert, Team geleitet",en:"e.g. 6 years, €3M revenue generated, led team",fr:"ex. 6 ans, 3M CHF CA, gestion d'équipe",it:"es. 6 anni, 3M CHF fatturato, team guidato"},type:"textarea",req:false},
    ],
    prompt:(v,l)=>({
      de:`Du bist Karrierecoach in der Schweiz. Erstelle einen vollständigen Gehaltsverhandlungs-Leitfaden auf Schweizer Hochdeutsch (kein ß).\nStelle: ${v.job} | Aktuell: CHF ${v.curr} | Ziel: CHF ${v.target} | Stärken: ${v.exp||"nicht angegeben"}\n\nErstelle:\n1. Einstiegssatz für die Verhandlung\n2. 5 starke Argumente mit konkreten Formulierungen\n3. Antwort auf "Das Budget ist leider voll"\n4. Antwort auf "Wir müssen das intern besprechen"\n5. Abschlusssatz\n6. Do's & Don'ts`,
      en:`You are a career coach in Switzerland. Create a complete salary negotiation guide in English.\nPosition: ${v.job} | Current: CHF ${v.curr} | Target: CHF ${v.target} | Strengths: ${v.exp||"not provided"}\n\nCreate:\n1. Opening sentence for the negotiation\n2. 5 strong arguments with concrete phrases\n3. Response to "The budget is unfortunately full"\n4. Response to "We need to discuss this internally"\n5. Closing sentence\n6. Do's & Don'ts`,
      fr:`Tu es coach carrière en Suisse. Crée un guide complet de négociation salariale en français.\nPoste: ${v.job} | Actuel: CHF ${v.curr} | Cible: CHF ${v.target} | Points forts: ${v.exp||"non fourni"}\n\nCrée:\n1. Phrase d'ouverture\n2. 5 arguments forts avec formulations concrètes\n3. Réponse à "Le budget est malheureusement plein"\n4. Réponse à "Nous devons en discuter en interne"\n5. Phrase de clôture\n6. À faire & À éviter`,
      it:`Sei un coach carriera in Svizzera. Crea una guida completa alla negoziazione dello stipendio in italiano.\nPosto: ${v.job} | Attuale: CHF ${v.curr} | Target: CHF ${v.target} | Punti di forza: ${v.exp||"non fornito"}\n\nCrea:\n1. Frase di apertura\n2. 5 argomenti forti con formulazioni concrete\n3. Risposta a "Purtroppo il budget è esaurito"\n4. Risposta a "Dobbiamo discuterne internamente"\n5. Frase di chiusura\n6. Da fare & Da evitare`,
    }[l]),
  },
  { id:"networking", ico:"🤝", color:"#0a66c2", cat:"karriere",
    t:{de:"Networking-Nachricht",en:"Networking Message",fr:"Message de networking",it:"Messaggio di networking"},
    sub:{de:"Perfekte LinkedIn-Kontaktanfrage oder Cold-E-Mail an Recruiter.",en:"Perfect LinkedIn connection request or cold email to recruiters.",fr:"Demande de connexion LinkedIn parfaite ou e-mail à recruteurs.",it:"Perfetta richiesta di connessione LinkedIn o e-mail a recruiter."},
    inputs:[
      {k:"type",  lbl:{de:"Nachrichtentyp",en:"Message type",fr:"Type de message",it:"Tipo di messaggio"},type:"select",opts:{de:["LinkedIn-Kontaktanfrage","Cold-E-Mail an Recruiter","Nachfassnachricht nach Bewerbung","Dankes-E-Mail nach Interview"],en:["LinkedIn connection request","Cold email to recruiter","Follow-up after application","Thank you email after interview"],fr:["Demande LinkedIn","E-mail à recruteur","Suivi après candidature","E-mail de remerciement"],it:["Richiesta LinkedIn","E-mail a recruiter","Follow-up dopo candidatura","E-mail di ringraziamento"]},req:true},
      {k:"empf",  lbl:{de:"Empfänger (Name / Firma / Rolle)",en:"Recipient (name / company / role)",fr:"Destinataire (nom / entreprise / rôle)",it:"Destinatario (nome / azienda / ruolo)"}, ph:{de:"z.B. Sarah Müller, HR-Leiterin, Google Zürich",en:"e.g. Sarah Miller, HR Lead, Google Zurich",fr:"ex. Sarah Müller, DRH, Google Zurich",it:"es. Sarah Müller, HR Lead, Google Zurigo"},req:true},
      {k:"ich",   lbl:{de:"Wer bist du?",en:"Who are you?",fr:"Qui êtes-vous?",it:"Chi sei?"},ph:{de:"z.B. Softwareentwickler, 5 Jahre, Python-Spezialist",en:"e.g. Software engineer, 5 years, Python specialist",fr:"ex. Développeur, 5 ans, spécialiste Python",it:"es. Sviluppatore, 5 anni, specialista Python"},req:true},
      {k:"ziel",  lbl:{de:"Was willst du erreichen?",en:"What do you want to achieve?",fr:"Que souhaitez-vous accomplir?",it:"Cosa vuoi ottenere?"},ph:{de:"z.B. Bewerbungsgespräch, Informationsgespräch, Job-Angebot",en:"e.g. Job interview, informational interview, job offer",fr:"ex. Entretien d'embauche, café virtuel",it:"es. Colloquio di lavoro, chiacchierata informativa"},req:false},
    ],
    prompt:(v,l)=>({
      de:`Erfahrener Karrierecoach Schweiz: Schreibe eine kurze, professionelle ${v.type} auf Schweizer Hochdeutsch (kein ß). An: ${v.empf}. Von: ${v.ich}. Ziel: ${v.ziel||"Kontakt knüpfen"}. Authentisch, nicht spammy. Max. 150 Wörter.`,
      en:`Career coach Switzerland: Write a short, professional ${v.type} in English. To: ${v.empf}. From: ${v.ich}. Goal: ${v.ziel||"connect"}. Authentic, not spammy. Max 150 words.`,
      fr:`Coach carrière Suisse: Écris un(e) ${v.type} court(e) et professionnel(le) en français. À: ${v.empf}. De: ${v.ich}. Objectif: ${v.ziel||"prendre contact"}. Authentique. Max 150 mots.`,
      it:`Coach carriera Svizzera: Scrivi un/una ${v.type} breve e professionale in italiano. A: ${v.empf}. Da: ${v.ich}. Obiettivo: ${v.ziel||"connettersi"}. Autentico. Max 150 parole.`,
    }[l]),
  },
  { id:"kuendigung", ico:"📤", color:"#dc2626", cat:"karriere",
    t:{de:"Kündigung schreiben",en:"Resignation Letter",fr:"Lettre de démission",it:"Lettera di dimissioni"},
    sub:{de:"Entwurf im Schweizer Format – bitte Kündigungsfristen im Arbeitsvertrag prüfen.",en:"Draft in Swiss format – please verify notice periods in your employment contract.",fr:"Brouillon au format suisse – vérifiez les délais dans votre contrat de travail.",it:"Bozza in formato svizzero – verifica i termini nel contratto di lavoro."},
    inputs:[
      {k:"name",  lbl:{de:"Dein Name",en:"Your name",fr:"Votre nom",it:"Il tuo nome"},ph:{de:"Max Mustermann",en:"John Doe",fr:"Jean Dupont",it:"Mario Rossi"},req:true},
      {k:"firma", lbl:{de:"Arbeitgeber / Firma",en:"Employer / Company",fr:"Employeur / Entreprise",it:"Datore di lavoro / Azienda"},ph:{de:"Musterfirma AG, Zürich",en:"Example Corp, Zurich",fr:"Exemple SA, Zurich",it:"Esempio SA, Zurigo"},req:true},
      {k:"datum", lbl:{de:"Letzter Arbeitstag (gewünscht)",en:"Desired last day of work",fr:"Dernier jour de travail souhaité",it:"Ultimo giorno di lavoro desiderato"},ph:{de:"z.B. 31. März 2026",en:"e.g. March 31, 2026",fr:"ex. 31 mars 2026",it:"es. 31 marzo 2026"},req:true},
      {k:"grund", lbl:{de:"Grund (optional – erscheint NICHT im Brief)",en:"Reason (optional – will NOT appear in letter)",fr:"Raison (optionnel – n'apparaît PAS dans la lettre)",it:"Motivo (opzionale – NON appare nella lettera)"},ph:{de:"z.B. Neuer Job, bessere Perspektiven",en:"e.g. New job, better opportunities",fr:"ex. Nouvel emploi",it:"es. Nuovo lavoro"},req:false},
    ],
    prompt:(v,l)=>({
      de:`Schreibe eine professionelle Kündigung auf Schweizer Hochdeutsch (kein ß) gemäss Schweizer Obligationenrecht (OR Art. 335). Neutrale, sachliche Formulierung. Dank für die Zusammenarbeit. Kein Grund angeben.\nName: ${v.name} | Firma: ${v.firma} | Letzter Arbeitstag: ${v.datum}\nNICHT erwähnen: ${v.grund||"–"}. Vollständiger Brief: Ort/Datum, vollständige Anschrift, Betreff, Anrede, Kündigung per Datum, Dankesformel, freundliche Grüsse, Unterschrift. Einschreiben-Hinweis am Ende.`,
      en:`Write a professional resignation letter in English for the Swiss job market.\nName: ${v.name} | Company: ${v.firma} | Last day: ${v.datum}\nDO NOT mention: ${v.grund||"–"}. Complete letter with date, address, subject line.`,
      fr:`Rédige une lettre de démission professionnelle en français pour le marché suisse.\nNom: ${v.name} | Entreprise: ${v.firma} | Dernier jour: ${v.datum}\nNE PAS mentionner: ${v.grund||"–"}. Lettre complète.`,
      it:`Scrivi una lettera di dimissioni professionale in italiano per il mercato svizzero.\nNome: ${v.name} | Azienda: ${v.firma} | Ultimo giorno: ${v.datum}\nNON menzionare: ${v.grund||"–"}. Lettera completa.`,
    }[l]),
  },
  { id:"plan306090", ico:"🗓️", color:"#7c3aed", cat:"karriere",
    t:{de:"30-60-90-Tage-Plan",en:"30-60-90 Day Plan",fr:"Plan 30-60-90 jours",it:"Piano 30-60-90 giorni"},
    sub:{de:"Strukturierter Einarbeitungsplan für deinen neuen Job.",en:"Structured onboarding plan for your new job.",fr:"Plan d'intégration structuré pour votre nouvel emploi.",it:"Piano di inserimento strutturato per il tuo nuovo lavoro."},
    inputs:[
      {k:"job",   lbl:{de:"Deine neue Stelle",en:"Your new position",fr:"Votre nouveau poste",it:"Il tuo nuovo posto"},ph:{de:"z.B. Product Manager, Fintech-Startup",en:"e.g. Product Manager, Fintech startup",fr:"ex. Chef de produit, startup Fintech",it:"es. Product Manager, startup Fintech"},req:true},
      {k:"ziele", lbl:{de:"Was sind die Hauptziele?",en:"What are the main goals?",fr:"Quels sont les objectifs principaux?",it:"Quali sono gli obiettivi principali?"},ph:{de:"z.B. Team kennenlernen, Roadmap verstehen, erste Features liefern",en:"e.g. Meet the team, understand roadmap, deliver first features",fr:"ex. Rencontrer l'équipe, comprendre la feuille de route",it:"es. Conoscere il team, capire la roadmap"},type:"textarea",req:false},
    ],
    prompt:(v,l)=>({
      de:`Erstelle einen detaillierten 30-60-90-Tage-Einarbeitungsplan auf Schweizer Hochdeutsch (kein ß) für: ${v.job}. Ziele: ${v.ziele||"Nicht angegeben"}.\nStruktur: Klare Abschnitte für Tag 1-30, 31-60, 61-90. Je: Prioritäten, konkrete Aufgaben, Meilensteine, Erfolgsmessung. Praxisnah und umsetzbar.`,
      en:`Create a detailed 30-60-90 day onboarding plan in English for: ${v.job}. Goals: ${v.ziele||"not provided"}.\nStructure: Clear sections for days 1-30, 31-60, 61-90. Each: priorities, concrete tasks, milestones, success metrics. Practical and actionable.`,
      fr:`Crée un plan d'intégration 30-60-90 jours détaillé en français pour: ${v.job}. Objectifs: ${v.ziele||"non fournis"}.\nStructure: Sections claires pour jours 1-30, 31-60, 61-90. Chaque section: priorités, tâches concrètes, jalons, mesure du succès.`,
      it:`Crea un piano di inserimento 30-60-90 giorni dettagliato in italiano per: ${v.job}. Obiettivi: ${v.ziele||"non forniti"}.\nStruttura: Sezioni chiare per giorni 1-30, 31-60, 61-90. Ogni sezione: priorità, compiti concreti, traguardi, misurazione del successo.`,
    }[l]),
  },
  { id:"referenz", ico:"🏆", color:"#b45309", cat:"karriere",
    t:{de:"Referenzschreiben",en:"Reference Letter",fr:"Lettre de référence",it:"Lettera di referenza"},
    sub:{de:"KI erstellt einen Entwurf – Arbeitgeber prüft und unterschreibt. Kein Ersatz für rechtliche Beratung.",en:"AI creates a draft – employer reviews and signs. Not a substitute for legal advice.",fr:"L'IA crée un brouillon – l'employeur vérifie et signe. Ne remplace pas un conseil juridique.",it:"L'IA crea una bozza – il datore verifica e firma. Non sostituisce la consulenza legale."},
    inputs:[
      {k:"mitarb",lbl:{de:"Name des Mitarbeiters",en:"Employee name",fr:"Nom de l'employé(e)",it:"Nome del dipendente"},ph:{de:"Max Mustermann",en:"John Doe",fr:"Jean Dupont",it:"Mario Rossi"},req:true},
      {k:"stelle", lbl:{de:"Stelle & Dauer",en:"Position & duration",fr:"Poste & durée",it:"Posto & durata"},ph:{de:"z.B. Projektleiter, 3 Jahre",en:"e.g. Project manager, 3 years",fr:"ex. Chef de projet, 3 ans",it:"es. Project manager, 3 anni"},req:true},
      {k:"leist",  lbl:{de:"Wichtigste Leistungen & Stärken",en:"Key achievements & strengths",fr:"Principales réalisations & points forts",it:"Principali risultati & punti di forza"},ph:{de:"z.B. Hat ein Team von 8 geleitet, Projekt 20% früher abgeliefert, sehr zuverlässig",en:"e.g. Led a team of 8, delivered project 20% early, very reliable",fr:"ex. Dirigé équipe de 8, livré projet en avance",it:"es. Guidato team di 8, progetto consegnato in anticipo"},type:"textarea",req:true},
      {k:"note",   lbl:{de:"Gesamtnote (für Zeugnis-Formulierung)",en:"Overall grade (for reference wording)",fr:"Note globale (pour la formulation)",it:"Voto complessivo (per la formulazione)"},type:"select",opts:{de:["Sehr gut (6)","Gut (5)","Befriedigend (4)","Genügend (3)"],en:["Excellent","Good","Satisfactory","Sufficient"],fr:["Excellent","Bien","Satisfaisant","Suffisant"],it:["Eccellente","Buono","Soddisfacente","Sufficiente"]},req:true},
    ],
    prompt:(v,l)=>({
      de:`Schreibe ein professionelles Schweizer Arbeitszeugnis auf Schweizer Hochdeutsch (kein ß) mit der korrekten Zeugnis-Sprache.\nMitarbeiter: ${v.mitarb} | Stelle: ${v.stelle} | Note: ${v.note}\nLeistungen: ${v.leist}\nVerwende die korrekte Schweizer Zeugnis-Formulierung entsprechend der Note. Vollständiges Zeugnis.`,
      en:`Write a professional Swiss work reference letter in English with appropriate Swiss reference language conventions.\nEmployee: ${v.mitarb} | Position: ${v.stelle} | Grade: ${v.note}\nAchievements: ${v.leist}\nUse appropriate language for the given grade level. Complete reference letter.`,
      fr:`Rédige un certificat de travail suisse professionnel en français avec le langage approprié.\nEmployé(e): ${v.mitarb} | Poste: ${v.stelle} | Note: ${v.note}\nRéalisations: ${v.leist}\nCertificat de travail complet.`,
      it:`Scrivi un certificato di lavoro svizzero professionale in italiano con il linguaggio appropriato.\nDipendente: ${v.mitarb} | Posto: ${v.stelle} | Voto: ${v.note}\nRisultati: ${v.leist}\nCertificato di lavoro completo.`,
    }[l]),
  },
  // ── AUSBILDUNG ──
  { id:"lehrstelle", ico:"🎓", color:"#0891b2", cat:"ausbildung",
    t:{de:"Lehrstellen-Bewerbung",en:"Apprenticeship Application",fr:"Candidature apprentissage",it:"Candidatura apprendistato"},
    sub:{de:"Speziell für das Schweizer Lehrstellensystem optimiert.",en:"Specifically optimized for the Swiss apprenticeship system.",fr:"Spécialement optimisé pour le système suisse d'apprentissage.",it:"Specificamente ottimizzato per il sistema svizzero di apprendistato."},
    inputs:[
      {k:"beruf",  lbl:{de:"Lehrberuf *",en:"Apprenticeship trade *",fr:"Métier *",it:"Mestiere *"},ph:{de:"z.B. Kaufmann/-frau EFZ, Informatiker EFZ",en:"e.g. Commercial employee, IT specialist",fr:"ex. Employé de commerce AFC",it:"es. Impiegato di commercio AFC"},req:true},
      {k:"firma",  lbl:{de:"Lehrfirma *",en:"Company *",fr:"Entreprise *",it:"Azienda *"},ph:{de:"z.B. UBS AG, Zürich",en:"e.g. UBS AG, Zurich",fr:"ex. UBS SA, Zurich",it:"es. UBS SA, Zurigo"},req:true},
      {k:"name",   lbl:{de:"Dein Name",en:"Your name",fr:"Votre nom",it:"Il tuo nome"},ph:{de:"Max Mustermann",en:"John Doe",fr:"Jean Dupont",it:"Mario Rossi"},req:true},
      {k:"alter",  lbl:{de:"Alter / Schuljahr",en:"Age / School year",fr:"Âge / Année scolaire",it:"Età / Anno scolastico"},ph:{de:"z.B. 15 Jahre, 3. Sek",en:"e.g. 15 years, 9th grade",fr:"ex. 15 ans, 3e secondaire",it:"es. 15 anni, 3a media"},req:false},
      {k:"staerken",lbl:{de:"Stärken & Interessen",en:"Strengths & interests",fr:"Points forts & intérêts",it:"Punti di forza & interessi"},ph:{de:"z.B. Mathe gut, fleissig, computererfahren",en:"e.g. Good at maths, hardworking, computer savvy",fr:"ex. Bon en maths, travailleur, à l'aise en informatique",it:"es. Bravo in matematica, laborioso, esperto di computer"},type:"textarea",req:false},
    ],
    prompt:(v,l)=>({
      de:`Schreibe ein professionelles Motivationsschreiben für eine Lehrstelle auf Schweizer Hochdeutsch (kein ß).\nLehrberuf: ${v.beruf} | Firma: ${v.firma} | Name: ${v.name} | Alter: ${v.alter||"nicht angegeben"} | Stärken: ${v.staerken||"nicht angegeben"}\nTon: jugendlich aber professionell, authentisch, enthusiastisch. Schweizer Lehrstellenformat. ~250 Wörter.`,
      en:`Write a professional motivation letter for an apprenticeship in English for the Swiss system.\nTrade: ${v.beruf} | Company: ${v.firma} | Name: ${v.name} | Age: ${v.alter||"not provided"} | Strengths: ${v.staerken||"not provided"}\nTone: youthful but professional, authentic, enthusiastic. ~250 words.`,
      fr:`Rédige une lettre de motivation pour un apprentissage en français pour le système suisse.\nMétier: ${v.beruf} | Entreprise: ${v.firma} | Nom: ${v.name} | Âge: ${v.alter||"n/a"} | Points forts: ${v.staerken||"n/a"}\nTon: jeune mais professionnel, authentique. ~250 mots.`,
      it:`Scrivi una lettera di motivazione per un apprendistato in italiano per il sistema svizzero.\nMestiere: ${v.beruf} | Azienda: ${v.firma} | Nome: ${v.name} | Età: ${v.alter||"n/d"} | Punti di forza: ${v.staerken||"n/d"}\nTono: giovanile ma professionale, autentico. ~250 parole.`,
    }[l]),
  },
  { id:"lernplan", ico:"📚", color:"#0891b2", cat:"ausbildung",
    t:{de:"Lernplan Generator",en:"Study Plan Generator",fr:"Générateur de plan d'étude",it:"Generatore piano di studio"},
    sub:{de:"KI erstellt deinen strukturierten Lernplan für Matura, LAP oder Prüfungen.",en:"AI creates your structured study plan for any exam.",fr:"L'IA crée votre plan d'étude structuré pour n'importe quel examen.",it:"L'IA crea il tuo piano di studio strutturato per qualsiasi esame."},
    inputs:[
      {k:"pruef",  lbl:{de:"Prüfung / Fach *",en:"Exam / Subject *",fr:"Examen / Matière *",it:"Esame / Materia *"},ph:{de:"z.B. Matura Mathematik, LAP Kaufmann, Semesterprüfung BWL",en:"e.g. Final maths exam, apprenticeship exam",fr:"ex. Maturité mathématiques, examen de fin d'apprentissage",it:"es. Maturità matematica, esame finale apprendistato"},req:true},
      {k:"datum",  lbl:{de:"Prüfungsdatum",en:"Exam date",fr:"Date de l'examen",it:"Data dell'esame"},ph:{de:"z.B. 15. Juni 2026",en:"e.g. June 15, 2026",fr:"ex. 15 juin 2026",it:"es. 15 giugno 2026"},req:true},
      {k:"niveau", lbl:{de:"Dein aktuelles Niveau",en:"Your current level",fr:"Votre niveau actuel",it:"Il tuo livello attuale"},type:"select",opts:{de:["Anfänger – fast nichts vorbereitet","Mittelmässig – Grundlagen da","Gut – muss nur üben","Fast fertig – letzte Details"],en:["Beginner – barely prepared","Intermediate – basics there","Good – just need practice","Almost done – last details"],fr:["Débutant – presque rien","Intermédiaire – bases ok","Bien – juste besoin de pratiquer","Presque prêt – derniers détails"],it:["Principiante – quasi nulla","Intermedio – basi ok","Buono – solo pratica","Quasi pronto – ultimi dettagli"]},req:true},
      {k:"themen", lbl:{de:"Schwierige Themen (optional)",en:"Difficult topics (optional)",fr:"Sujets difficiles (optionnel)",it:"Argomenti difficili (opzionale)"},ph:{de:"z.B. Integralrechnung, Buchhaltung Abschluss",en:"e.g. Integral calculus, closing accounts",fr:"ex. Calcul intégral, clôture comptable",it:"es. Calcolo integrale, chiusura contabile"},req:false},
    ],
    prompt:(v,l)=>({
      de:`Erstelle einen detaillierten Lernplan auf Schweizer Hochdeutsch (kein ß) für: ${v.pruef}\nPrüfungsdatum: ${v.datum} | Niveau: ${v.niveau} | Schwierige Themen: ${v.themen||"nicht angegeben"}\nStruktur: Wochenplan bis zur Prüfung, tägliche Lernzeiten, Themenverteilung, Wiederholungsphase, Tipps für Prüfungstag.`,
      en:`Create a detailed study plan in English for: ${v.pruef}\nExam date: ${v.datum} | Level: ${v.niveau} | Difficult topics: ${v.themen||"not provided"}\nStructure: Weekly plan until exam, daily study times, topic distribution, revision phase, exam day tips.`,
      fr:`Crée un plan d'étude détaillé en français pour: ${v.pruef}\nDate: ${v.datum} | Niveau: ${v.niveau} | Sujets difficiles: ${v.themen||"n/a"}\nStructure: Plan hebdomadaire, heures d'étude quotidiennes, répartition des sujets, révision, conseils le jour J.`,
      it:`Crea un piano di studio dettagliato in italiano per: ${v.pruef}\nData: ${v.datum} | Livello: ${v.niveau} | Argomenti difficili: ${v.themen||"n/d"}\nStruttura: Piano settimanale, ore di studio giornaliere, distribuzione argomenti, fase di ripasso, consigli per il giorno dell'esame.`,
    }[l]),
  },
  { id:"zusammenfassung", ico:"📄", color:"#0891b2", cat:"ausbildung",
    t:{de:"Zusammenfassung",en:"Summary",fr:"Résumé",it:"Riassunto"},
    sub:{de:"Text oder Thema eingeben – KI erstellt eine kompakte Zusammenfassung.",en:"Enter text or topic – AI creates a compact summary.",fr:"Entrez un texte ou sujet – l'IA crée un résumé compact.",it:"Inserisci testo o argomento – l'IA crea un riassunto compatto."},
    inputs:[
      {k:"text",   lbl:{de:"Text / Thema *",en:"Text / Topic *",fr:"Texte / Sujet *",it:"Testo / Argomento *"},ph:{de:"Text einfügen oder Thema beschreiben…",en:"Paste text or describe topic…",fr:"Collez un texte ou décrivez un sujet…",it:"Incolla il testo o descrivi l'argomento…"},type:"textarea",req:true,tall:true},
      {k:"laenge", lbl:{de:"Gewünschte Länge",en:"Desired length",fr:"Longueur souhaitée",it:"Lunghezza desiderata"},type:"select",opts:{de:["Sehr kurz (5 Sätze)","Kurz (10-15 Sätze)","Mittel (1 Seite)","Ausführlich (2 Seiten)"],en:["Very short (5 sentences)","Short (10-15 sentences)","Medium (1 page)","Detailed (2 pages)"],fr:["Très court (5 phrases)","Court (10-15 phrases)","Moyen (1 page)","Détaillé (2 pages)"],it:["Molto breve (5 frasi)","Breve (10-15 frasi)","Medio (1 pagina)","Dettagliato (2 pagine)"]},req:false},
      {k:"zweck",  lbl:{de:"Zweck (optional)",en:"Purpose (optional)",fr:"Objectif (optionnel)",it:"Scopo (opzionale)"},ph:{de:"z.B. Für Matura-Lernen, Referat, Geschäftsmeeting",en:"e.g. For exam prep, presentation, business meeting",fr:"ex. Pour révision, exposé, réunion",it:"es. Per studio, presentazione, riunione"},req:false},
    ],
    prompt:(v,l)=>({
      de:`Erstelle eine ${v.laenge||"mittellange"} Zusammenfassung auf Schweizer Hochdeutsch (kein ß). Zweck: ${v.zweck||"allgemein"}.\nText/Thema:\n${v.text}\nStrukturiert, klar, die wichtigsten Punkte auf den Punkt.`,
      en:`Create a ${v.laenge||"medium-length"} summary in English. Purpose: ${v.zweck||"general"}.\nText/Topic:\n${v.text}\nStructured, clear, hitting all key points.`,
      fr:`Crée un résumé ${v.laenge||"de longueur moyenne"} en français. Objectif: ${v.zweck||"général"}.\nTexte/Sujet:\n${v.text}\nStructuré, clair, les points clés mis en avant.`,
      it:`Crea un riassunto ${v.laenge||"di media lunghezza"} in italiano. Scopo: ${v.zweck||"generale"}.\nTesto/Argomento:\n${v.text}\nStrutturato, chiaro, i punti chiave in evidenza.`,
    }[l]),
  },
  // ── PRODUKTIVITÄT ──
  { id:"email", ico:"✉️", color:"#7c3aed", cat:"produktivitaet",
    t:{de:"E-Mail Assistent",en:"Email Assistant",fr:"Assistant e-mail",it:"Assistente e-mail"},
    sub:{de:"Schwierige E-Mails formulieren – Beschwerden, Reklamationen, Anfragen.",en:"Formulate difficult emails – complaints, enquiries, negotiations.",fr:"Formule des e-mails difficiles – plaintes, réclamations, demandes.",it:"Formula e-mail difficili – reclami, richieste, negoziazioni."},
    inputs:[
      {k:"typ",  lbl:{de:"E-Mail-Typ",en:"Email type",fr:"Type d'e-mail",it:"Tipo di e-mail"},type:"select",opts:{de:["Beschwerde / Reklamation","Freundliche Mahnung","Gehaltserhöhungs-Anfrage","Professionelle Ablehnung","Entschuldigungs-E-Mail","Kundenanfrage","Interne Mitteilung","Kündigungsbestätigung"],en:["Complaint / Claim","Friendly reminder","Raise request","Professional decline","Apology email","Customer inquiry","Internal notice","Cancellation confirmation"],fr:["Plainte / Réclamation","Rappel amical","Demande d'augmentation","Refus professionnel","E-mail d'excuses","Demande client","Note interne","Confirmation résiliation"],it:["Reclamo / Lamentela","Promemoria amichevole","Richiesta aumento","Rifiuto professionale","E-mail di scuse","Richiesta cliente","Comunicazione interna","Conferma disdetta"]},req:true},
      {k:"an",   lbl:{de:"An (Empfänger)",en:"To (recipient)",fr:"À (destinataire)",it:"A (destinatario)"},ph:{de:"z.B. Herr Meier, Kundendienst Swisscom",en:"e.g. Mr. Smith, Customer Service",fr:"ex. M. Dupont, Service client",it:"es. Sig. Rossi, Servizio clienti"},req:true},
      {k:"thema",lbl:{de:"Thema / Situation",en:"Topic / Situation",fr:"Sujet / Situation",it:"Argomento / Situazione"},ph:{de:"z.B. Ich habe am 3. März eine Rechnung erhalten, die falsch ist. Der Betrag ist 150 CHF zu hoch.",en:"e.g. I received an incorrect invoice on March 3. The amount is 150 CHF too high.",fr:"ex. J'ai reçu une facture incorrecte le 3 mars. Le montant est 150 CHF trop élevé.",it:"es. Ho ricevuto una fattura errata il 3 marzo. L'importo è 150 CHF troppo alto."},type:"textarea",req:true},
      {k:"ton",  lbl:{de:"Ton",en:"Tone",fr:"Ton",it:"Tono"},type:"select",opts:{de:["Professionell & sachlich","Freundlich & diplomatisch","Bestimmt & klar","Formell"],en:["Professional & factual","Friendly & diplomatic","Firm & clear","Formal"],fr:["Professionnel & factuel","Amical & diplomatique","Ferme & clair","Formel"],it:["Professionale & fattuale","Amichevole & diplomatico","Deciso & chiaro","Formale"]},req:false},
    ],
    prompt:(v,l)=>({
      de:`Schreibe eine professionelle ${v.typ}-E-Mail auf Schweizer Hochdeutsch (kein ß). Ton: ${v.ton||"professionell & sachlich"}.\nAn: ${v.an} | Thema: ${v.thema}\nMit Betreffzeile. Klar, präzise, Schweizer Stil.`,
      en:`Write a professional ${v.typ} email in English. Tone: ${v.ton||"professional & factual"}.\nTo: ${v.an} | Topic: ${v.thema}\nInclude subject line. Clear, precise, professional style.`,
      fr:`Rédige un e-mail professionnel de type ${v.typ} en français. Ton: ${v.ton||"professionnel & factuel"}.\nÀ: ${v.an} | Sujet: ${v.thema}\nAvec ligne d'objet. Clair, précis.`,
      it:`Scrivi un'e-mail professionale di tipo ${v.typ} in italiano. Tono: ${v.ton||"professionale & fattuale"}.\nA: ${v.an} | Argomento: ${v.thema}\nCon oggetto. Chiara, precisa.`,
    }[l]),
  },
  { id:"protokoll", ico:"📋", color:"#0891b2", cat:"produktivitaet",
    t:{de:"Meeting-Protokoll",en:"Meeting Minutes",fr:"Procès-verbal",it:"Verbale riunione"},
    sub:{de:"Stichworte eingeben → fertiges Protokoll im Schweizer Format.",en:"Enter bullet points → complete meeting minutes.",fr:"Entrez des notes → procès-verbal complet.",it:"Inserisci appunti → verbale completo."},
    inputs:[
      {k:"titel",  lbl:{de:"Meetingtitel / Thema",en:"Meeting title / Topic",fr:"Titre / Sujet",it:"Titolo / Argomento"},ph:{de:"z.B. Quartalsbesprechung Q1 2026",en:"e.g. Q1 2026 quarterly review",fr:"ex. Revue trimestrielle Q1 2026",it:"es. Revisione trimestrale Q1 2026"},req:true},
      {k:"datum",  lbl:{de:"Datum & Teilnehmer",en:"Date & participants",fr:"Date & participants",it:"Data & partecipanti"},ph:{de:"z.B. 7. März 2026, Max M., Sarah K., Lukas B.",en:"e.g. March 7, 2026, Max M., Sarah K.",fr:"ex. 7 mars 2026, Max M., Sarah K.",it:"es. 7 marzo 2026, Max M., Sarah K."},req:false},
      {k:"punkte", lbl:{de:"Besprochene Punkte (Stichworte) *",en:"Discussed points (bullet notes) *",fr:"Points discutés (notes) *",it:"Punti discussi (appunti) *"},ph:{de:"z.B.\n- Umsatz Q1: 2.3 Mio., +12% vs. Vorjahr\n- Marketing plant neue Kampagne April\n- IT: Server-Update nächste Woche\n- Nächstes Meeting: 4. April",en:"e.g.\n- Q1 revenue: 2.3M, +12% vs last year\n- Marketing planning new campaign April\n- IT: server update next week\n- Next meeting: April 4",fr:"ex.\n- CA T1: 2.3M, +12%\n- Marketing planifie campagne avril\n- IT: mise à jour serveur\n- Prochain: 4 avril",it:"es.\n- Fatturato Q1: 2.3M, +12%\n- Marketing: campagna ad aprile\n- IT: aggiornamento server\n- Prossimo: 4 aprile"},type:"textarea",req:true,tall:true},
    ],
    prompt:(v,l)=>({
      de:`Erstelle ein professionelles Meeting-Protokoll auf Schweizer Hochdeutsch (kein ß) aus diesen Stichworten.\nMeeting: ${v.titel} | ${v.datum||""}\nPunkte:\n${v.punkte}\nFormat: Traktanden, Beschlüsse, Verantwortlichkeiten, Pendenzen, nächste Schritte. Professionell, klar.`,
      en:`Create professional meeting minutes in English from these notes.\nMeeting: ${v.titel} | ${v.datum||""}\nPoints:\n${v.punkte}\nFormat: Agenda items, decisions, responsibilities, outstanding items, next steps. Professional, clear.`,
      fr:`Crée un procès-verbal professionnel en français à partir de ces notes.\nRéunion: ${v.titel} | ${v.datum||""}\nPoints:\n${v.punkte}\nFormat: Ordre du jour, décisions, responsabilités, points en suspens, prochaines étapes.`,
      it:`Crea un verbale professionale in italiano da questi appunti.\nRiunione: ${v.titel} | ${v.datum||""}\nPunti:\n${v.punkte}\nFormato: Ordine del giorno, decisioni, responsabilità, punti aperti, prossimi passi.`,
    }[l]),
  },
  { id:"uebersetzer", ico:"🌐", color:"#0f766e", cat:"produktivitaet",
    t:{de:"Übersetzer mit Kontext",en:"Contextual Translator",fr:"Traducteur contextuel",it:"Traduttore contestuale"},
    sub:{de:"Nicht nur Wörter – ganze Dokumente mit Branchenkontext übersetzen.",en:"Not just words – translate entire documents with industry context.",fr:"Pas seulement des mots – traduisez des documents entiers avec contexte.",it:"Non solo parole – traduci interi documenti con contesto di settore."},
    inputs:[
      {k:"von",  lbl:{de:"Von Sprache",en:"From language",fr:"De la langue",it:"Dalla lingua"},type:"select",opts:{de:["Deutsch","Englisch","Französisch","Italienisch","Spanisch","Portugiesisch"],en:["German","English","French","Italian","Spanish","Portuguese"],fr:["Allemand","Anglais","Français","Italien","Espagnol","Portugais"],it:["Tedesco","Inglese","Francese","Italiano","Spagnolo","Portoghese"]},req:true},
      {k:"nach", lbl:{de:"Nach Sprache",en:"To language",fr:"Vers la langue",it:"Nella lingua"},type:"select",opts:{de:["Deutsch (Schweizer Hochdeutsch)","Englisch","Französisch","Italienisch","Spanisch","Portugiesisch"],en:["German (Swiss Standard)","English","French","Italian","Spanish","Portuguese"],fr:["Allemand (suisse)","Anglais","Français","Italien","Espagnol","Portugais"],it:["Tedesco (svizzero)","Inglese","Francese","Italiano","Spagnolo","Portoghese"]},req:true},
      {k:"kontext",lbl:{de:"Kontext / Branche",en:"Context / Industry",fr:"Contexte / Secteur",it:"Contesto / Settore"},type:"select",opts:{de:["Allgemein","Business & Finanzen","Juristisch / Verträge","Medizin & Gesundheit","Technologie & IT","Marketing","Bewerbung & HR","Wissenschaft"],en:["General","Business & Finance","Legal / Contracts","Medical & Health","Technology & IT","Marketing","HR & Applications","Science"],fr:["Général","Business & Finance","Juridique","Médecine","Technologie","Marketing","RH","Science"],it:["Generale","Business & Finanza","Legale","Medicina","Tecnologia","Marketing","HR","Scienza"]},req:false},
      {k:"text", lbl:{de:"Text zum Übersetzen *",en:"Text to translate *",fr:"Texte à traduire *",it:"Testo da tradurre *"},ph:{de:"Text hier einfügen…",en:"Paste text here…",fr:"Collez le texte ici…",it:"Incolla il testo qui…"},type:"textarea",req:true,tall:true},
    ],
    prompt:(v,l)=>({
      de:`Übersetze den folgenden Text von ${v.von} nach ${v.nach}. Kontext: ${v.kontext||"Allgemein"}. Bei Schweizer Hochdeutsch: kein ß. Natürlich, professionell, kontextsensibel. Nur die Übersetzung, keine Erklärungen.\n\n${v.text}`,
      en:`Translate the following text from ${v.von} to ${v.nach}. Context: ${v.kontext||"General"}. Natural, professional, context-aware translation. Only the translation, no explanations.\n\n${v.text}`,
      fr:`Traduis le texte suivant de ${v.von} vers ${v.nach}. Contexte: ${v.kontext||"Général"}. Naturel, professionnel, sensible au contexte. Uniquement la traduction.\n\n${v.text}`,
      it:`Traduci il seguente testo da ${v.von} a ${v.nach}. Contesto: ${v.kontext||"Generale"}. Naturale, professionale, sensibile al contesto. Solo la traduzione.\n\n${v.text}`,
    }[l]),
  },
  // ── LINKEDIN → BEWERBUNG ──
  { id:"li2job", ico:"🔗", color:"#0a66c2", cat:"karriere",
    t:{de:"LinkedIn → Bewerbung",en:"LinkedIn → Application",fr:"LinkedIn → Candidature",it:"LinkedIn → Candidatura"},
    sub:{de:"LinkedIn-Profil + Stelleninserat → komplette Bewerbung in Sekunden.",en:"LinkedIn profile + job posting → complete application in seconds.",fr:"Profil LinkedIn + offre d'emploi → candidature complète en secondes.",it:"Profilo LinkedIn + offerta di lavoro → candidatura completa in secondi."},
    inputs:[
      {k:"li",   lbl:{de:"Dein LinkedIn-Profil (Text kopieren) *",en:"Your LinkedIn profile (copy text) *",fr:"Votre profil LinkedIn (copier le texte) *",it:"Il tuo profilo LinkedIn (copia il testo) *"},ph:{de:"Kopiere deinen LinkedIn-Profiltext hier rein – About, Erfahrungen, Skills, Ausbildung…",en:"Paste your LinkedIn profile text here – About, Experience, Skills, Education…",fr:"Collez votre texte de profil LinkedIn – About, Expériences, Compétences, Formation…",it:"Incolla il testo del tuo profilo LinkedIn – About, Esperienze, Competenze, Formazione…"},type:"textarea",req:true,tall:true},
      {k:"stelle",lbl:{de:"LinkedIn-Stelleninserat (Text kopieren) *",en:"LinkedIn job posting (copy text) *",fr:"Offre d'emploi LinkedIn (copier le texte) *",it:"Offerta di lavoro LinkedIn (copia il testo) *"},ph:{de:"Kopiere den vollständigen Stellenbeschrieb von LinkedIn hier rein…",en:"Paste the full job description from LinkedIn here…",fr:"Collez la description complète du poste LinkedIn ici…",it:"Incolla la descrizione completa del lavoro LinkedIn qui…"},type:"textarea",req:true,tall:true},
      {k:"ton",  lbl:{de:"Ton",en:"Tone",fr:"Ton",it:"Tono"},type:"select",opts:{de:["Professionell & präzise","Engagiert & enthusiastisch","Konservativ & seriös","Kreativ & modern"],en:["Professional & precise","Engaged & enthusiastic","Conservative & serious","Creative & modern"],fr:["Professionnel & précis","Engagé & enthousiaste","Conservateur & sérieux","Créatif & moderne"],it:["Professionale & preciso","Coinvolto & entusiasta","Conservativo & serio","Creativo & moderno"]},req:false},
    ],
    prompt:(v,l)=>({
      de:`Du bist ein erstklassiger Bewerbungsexperte in der Schweiz. Analysiere das LinkedIn-Profil und das Stelleninserat und erstelle eine massgeschneiderte, überzeugende Bewerbung auf Schweizer Hochdeutsch (kein ß, kein "herzlichen Dank" Klischee).

LINKEDIN-PROFIL:
${v.li}

STELLENINSERAT:
${v.stelle}

TON: ${v.ton||"Professionell & präzise"}

Erstelle:

# MOTIVATIONSSCHREIBEN
[Vollständiges, professionelles Motivationsschreiben – 3-4 Absätze. Zeige konkret wie das Profil zur Stelle passt. Nutze Keywords aus dem Inserat.]

---

# LEBENSLAUF-HIGHLIGHTS
[Die 5-7 wichtigsten Punkte aus dem LinkedIn-Profil, direkt auf diese Stelle zugeschnitten mit relevanten Skills und Erfahrungen hervorgehoben]

---

# WARUM DU DER RICHTIGE KANDIDAT BIST
[3 starke, konkrete Argumente warum genau dieses Profil für genau diese Stelle ideal ist]`,

      en:`You are a top application expert in Switzerland. Analyze the LinkedIn profile and job posting and create a tailored, compelling application in English.

LINKEDIN PROFILE:
${v.li}

JOB POSTING:
${v.stelle}

TONE: ${v.ton||"Professional & precise"}

Create:

# COVER LETTER
[Complete, professional cover letter – 3-4 paragraphs. Show concretely how the profile matches the position. Use keywords from the posting.]

---

# CV HIGHLIGHTS
[The 5-7 most important points from the LinkedIn profile, directly tailored to this position with relevant skills and experience highlighted]

---

# WHY YOU ARE THE RIGHT CANDIDATE
[3 strong, concrete arguments why exactly this profile is ideal for exactly this position]`,

      fr:`Tu es un expert en candidatures en Suisse. Analyse le profil LinkedIn et l'offre d'emploi et crée une candidature personnalisée et convaincante en français.

PROFIL LINKEDIN:
${v.li}

OFFRE D'EMPLOI:
${v.stelle}

TON: ${v.ton||"Professionnel & précis"}

Crée:

# LETTRE DE MOTIVATION
[Lettre complète et professionnelle – 3-4 paragraphes. Montre concrètement comment le profil correspond au poste.]

---

# POINTS FORTS DU CV
[Les 5-7 points les plus importants du profil LinkedIn, directement adaptés à ce poste]

---

# POURQUOI VOUS ÊTES LE BON CANDIDAT
[3 arguments forts et concrets]`,

      it:`Sei un esperto di candidature in Svizzera. Analizza il profilo LinkedIn e l'offerta di lavoro e crea una candidatura personalizzata e convincente in italiano.

PROFILO LINKEDIN:
${v.li}

OFFERTA DI LAVORO:
${v.stelle}

TONO: ${v.ton||"Professionale & preciso"}

Crea:

# LETTERA DI MOTIVAZIONE
[Lettera completa e professionale – 3-4 paragrafi. Mostra concretamente come il profilo corrisponde alla posizione.]

---

# PUNTI DI FORZA DEL CV
[I 5-7 punti più importanti del profilo LinkedIn, direttamente adattati a questa posizione]

---

# PERCHÉ SEI IL CANDIDATO GIUSTO
[3 argomenti forti e concreti]`,
    }[l]),
  },
  // ── GEHALTSRECHNER ──
  { id:"gehaltsrechner", ico:"💰", color:"#059669", cat:"karriere",
    t:{de:"KI-Gehaltsrechner Schweiz",en:"AI Salary Calculator Switzerland",fr:"Calculateur salaire IA Suisse",it:"Calcolatore stipendio IA Svizzera"},
    sub:{de:"Gehaltsschätzung nach Jobtitel, Branche, Kanton & Erfahrung – Richtwerte, keine Garantie.",en:"Salary estimate by job title, industry, canton & experience – indicative values, not guaranteed.",fr:"Estimation salariale par titre, secteur, canton & expérience – valeurs indicatives.",it:"Stima salariale per titolo, settore, cantone & esperienza – valori indicativi."},
    inputs:[
      {k:"job",    lbl:{de:"Jobtitel *",en:"Job title *",fr:"Titre du poste *",it:"Titolo del posto *"},ph:{de:"z.B. Senior Software Engineer, HR Business Partner, Projektleiter",en:"e.g. Senior Software Engineer, HR Business Partner, Project Manager",fr:"ex. Ingénieur logiciel senior, Chef de projet",it:"es. Senior Software Engineer, Project Manager"},req:true},
      {k:"branche",lbl:{de:"Branche *",en:"Industry *",fr:"Secteur *",it:"Settore *"},type:"select",opts:{de:["IT & Software","Finanzen & Banking","Gesundheitswesen","Ingenieurwesen","Marketing & Kommunikation","Recht & Compliance","Bildung","Logistik","Personalwesen (HR)","Beratung","Gastronomie","Bau & Architektur"],en:["IT & Software","Finance & Banking","Healthcare","Engineering","Marketing","Legal","Education","Logistics","HR","Consulting","Hospitality","Construction"],fr:["IT & Logiciels","Finance","Santé","Ingénierie","Marketing","Juridique","Éducation","Logistique","RH","Conseil","Hôtellerie","Construction"],it:["IT & Software","Finanza","Sanità","Ingegneria","Marketing","Legale","Istruzione","Logistica","HR","Consulenza","Ospitalità","Costruzione"]},req:true},
      {k:"kanton", lbl:{de:"Kanton / Region",en:"Canton / Region",fr:"Canton / Région",it:"Cantone / Regione"},type:"select",opts:{de:["Zürich","Genf","Basel-Stadt","Zug","Bern","Lausanne","Luzern","St. Gallen","Winterthur","Aarau","Thun","Chur","Sion/Sitten"],en:["Zurich","Geneva","Basel-City","Zug","Bern","Lausanne","Lucerne","St. Gallen","Winterthur","Aarau","Thun","Chur","Sion"],fr:["Zurich","Genève","Bâle-Ville","Zoug","Berne","Lausanne","Lucerne","Saint-Gall","Winterthour","Aarau","Thoune","Coire","Sion"],it:["Zurigo","Ginevra","Basilea-Città","Zugo","Berna","Losanna","Lucerna","San Gallo","Winterthur","Aarau","Thun","Coira","Sion"]},req:false},
      {k:"erfahrung",lbl:{de:"Berufserfahrung",en:"Experience",fr:"Expérience",it:"Esperienza"},type:"select",opts:{de:["0–2 Jahre","3–5 Jahre","6–10 Jahre","11–15 Jahre","16+ Jahre"],en:["0–2 years","3–5 years","6–10 years","11–15 years","16+ years"],fr:["0–2 ans","3–5 ans","6–10 ans","11–15 ans","16+ ans"],it:["0–2 anni","3–5 anni","6–10 anni","11–15 anni","16+ anni"]},req:false},
      {k:"abschluss",lbl:{de:"Höchster Abschluss",en:"Highest degree",fr:"Diplôme le plus élevé",it:"Titolo di studio più alto"},type:"select",opts:{de:["Lehre / Berufsausbildung","Berufsmaturität","Bachelor","Master / Lizentiat","Doktorat / PhD"],en:["Apprenticeship","Vocational Maturity","Bachelor","Master","PhD"],fr:["Apprentissage","Maturité professionnelle","Bachelor","Master","Doctorat"],it:["Apprendistato","Maturità professionale","Bachelor","Master","Dottorato"]},req:false},
    ],
    prompt:(v,l)=>(({
      de:`Du bist Schweizer Gehaltsexperte 2025/26. Erstelle eine Gehaltsschätzung basierend auf Marktdaten (Salarium BFS, Lohnrechner, Michael Page, Robert Half). Antworte NUR mit JSON (kein Markdown). Wichtig: Alle Angaben sind Richtwerte, keine Garantien.
{"min":85000,"median":105000,"max":130000,"vergleich_schweiz":"12% über dem Schweizer Median","kanton_faktor":"Zürich: +8% vs CH-Durchschnitt","tipps":["Tipp 1","Tipp 2","Tipp 3"],"verhandlungstipp":"Konkreter Satz für die Verhandlung","branchentrend":"Einschätzung zur Gehaltsentwicklung"}
Profil: Jobtitel: ${v.job} | Branche: ${v.branche||"k.A."} | Kanton: ${v.kanton||"Schweiz"} | Erfahrung: ${v.erfahrung||"k.A."} | Abschluss: ${v.abschluss||"k.A."}`,
      en:`You are a Swiss salary expert 2025/26. Analyse the job market and create a realistic salary estimate. Reply ONLY with JSON (no markdown):
{"min":85000,"median":105000,"max":130000,"vergleich_schweiz":"12% above Swiss median","kanton_faktor":"Zurich: +8% vs CH average","tipps":["Tip 1","Tip 2","Tip 3"],"verhandlungstipp":"Concrete negotiation sentence","branchentrend":"Industry salary outlook"}
Profile: Job: ${v.job} | Industry: ${v.branche||"n/a"} | Canton: ${v.kanton||"Switzerland"} | Experience: ${v.erfahrung||"n/a"} | Degree: ${v.abschluss||"n/a"}`,
      fr:`Tu es expert salarial suisse 2025/26. Crée une estimation salariale réaliste. Réponds UNIQUEMENT avec JSON:
{"min":85000,"median":105000,"max":130000,"vergleich_schweiz":"12% au-dessus de la médiane suisse","kanton_faktor":"Genève: +10% vs moyenne CH","tipps":["Conseil 1","Conseil 2","Conseil 3"],"verhandlungstipp":"Phrase concrète pour négocier","branchentrend":"Perspectives salariales du secteur"}
Profil: Titre: ${v.job} | Secteur: ${v.branche||"n/d"} | Canton: ${v.kanton||"Suisse"} | Expérience: ${v.erfahrung||"n/d"} | Diplôme: ${v.abschluss||"n/d"}`,
      it:`Sei un esperto di stipendi svizzeri 2025/26. Crea una stima salariale realistica. Rispondi SOLO con JSON:
{"min":85000,"median":105000,"max":130000,"vergleich_schweiz":"12% sopra la mediana svizzera","kanton_faktor":"Zurigo: +8% vs media CH","tipps":["Consiglio 1","Consiglio 2","Consiglio 3"],"verhandlungstipp":"Frase concreta per la negoziazione","branchentrend":"Prospettive salariali del settore"}
Profilo: Titolo: ${v.job} | Settore: ${v.branche||"n/d"} | Cantone: ${v.kanton||"Svizzera"} | Esperienza: ${v.erfahrung||"n/d"} | Titolo: ${v.abschluss||"n/d"}`,
    })[l]),
  },
  // ── LINKEDIN POST GENERATOR ──

  { id:"lipost", ico:"✍️", color:"#0a66c2", cat:"karriere",
    t:{de:"LinkedIn-Post Generator",en:"LinkedIn Post Generator",fr:"Générateur post LinkedIn",it:"Generatore post LinkedIn"},
    sub:{de:"3 massgeschneiderte Posts – Swiss-Style, keine Corporate-Floskeln, sofort kopierbar.",en:"3 tailored posts – Swiss style, no corporate clichés, ready to copy.",fr:"3 posts sur mesure – style suisse, sans clichés d'entreprise, prêts à copier.",it:"3 post su misura – stile svizzero, senza cliché aziendali, pronti da copiare."},
    inputs:[
      {k:"typ",  lbl:{de:"Post-Typ *",en:"Post type *",fr:"Type de post *",it:"Tipo di post *"},type:"select",opts:{de:["🎉 Neue Stelle angetreten","📚 Weiterbildung / Zertifikat","💡 Erfahrung & Erkenntnisse teilen","🏆 Projekterfolg / Meilenstein","🔍 Offen für neue Möglichkeiten","💬 Fachliche Meinung zu Branchenthema"],en:["🎉 Started new position","📚 Training / Certificate","💡 Share experience & insights","🏆 Project success / Milestone","🔍 Open to opportunities","💬 Professional opinion on industry topic"],fr:["🎉 Nouveau poste","📚 Formation / Certificat","💡 Partager expérience","🏆 Succès projet","🔍 Ouvert aux opportunités","💬 Opinion professionnelle"],it:["🎉 Nuovo posto","📚 Formazione / Certificato","💡 Condividere esperienza","🏆 Successo progetto","🔍 Aperto a opportunità","💬 Opinione professionale"]},req:true},
      {k:"details",lbl:{de:"Details & Kontext *",en:"Details & context *",fr:"Détails & contexte *",it:"Dettagli & contesto *"},ph:{de:"z.B. Ich trete als Head of Product bei einem Zürcher FinTech an. Davor 4 Jahre bei Swisscom. Freue mich besonders auf das internationale Team und die Mission...",en:"e.g. I'm joining as Head of Product at a Zurich FinTech. Previously 4 years at Swisscom. Especially excited about the international team and the mission...",fr:"ex. Je rejoins en tant que Head of Product dans une FinTech zurichoise. Auparavant 4 ans chez Swisscom...",it:"es. Entro come Head of Product in una FinTech di Zurigo. Prima 4 anni a Swisscom..."},type:"textarea",req:true,tall:true},
      {k:"ton",  lbl:{de:"Tonalität",en:"Tone",fr:"Tonalité",it:"Tonalità"},type:"select",opts:{de:["Persönlich & authentisch","Professionell & sachlich","Motivierend & inspirierend","Direkt & prägnant"],en:["Personal & authentic","Professional & factual","Motivating & inspiring","Direct & concise"],fr:["Personnel & authentique","Professionnel & factuel","Motivant & inspirant","Direct & concis"],it:["Personale & autentico","Professionale & fattuale","Motivante & ispirante","Diretto & conciso"]},req:false},
      {k:"laenge",lbl:{de:"Länge",en:"Length",fr:"Longueur",it:"Lunghezza"},type:"select",opts:{de:["Kurz (100–150 Wörter)","Mittel (200–300 Wörter)","Lang (400+ Wörter)"],en:["Short (100–150 words)","Medium (200–300 words)","Long (400+ words)"],fr:["Court (100–150 mots)","Moyen (200–300 mots)","Long (400+ mots)"],it:["Breve (100–150 parole)","Medio (200–300 parole)","Lungo (400+ parole)"]},req:false},
    ],
    prompt:(v,l)=>(({
      de:`Du bist LinkedIn-Experte für den Schweizer Stellenmarkt. Erstelle 3 verschiedene LinkedIn-Posts auf Schweizer Hochdeutsch (kein ß, kein "herzlichen Dank" Klischee, kein "Freue mich riesig").
Post-Typ: ${v.typ} | Ton: ${v.ton||"Persönlich & authentisch"} | Länge: ${v.laenge||"Mittel"}
Details: ${v.details}
Antworte NUR mit JSON-Array (kein Markdown):
[{"variante":"Variante 1","post":"vollständiger Post-Text mit \\n für Zeilenumbrüche","warum":"Kurze Begründung warum dieser Stil wirkt"},{"variante":"Variante 2","post":"...","warum":"..."},{"variante":"Variante 3","post":"...","warum":"..."}]`,
      en:`You are a LinkedIn expert for the Swiss job market. Create 3 different LinkedIn posts in English. No corporate clichés.
Post type: ${v.typ} | Tone: ${v.ton||"Personal & authentic"} | Length: ${v.laenge||"Medium"}
Details: ${v.details}
Reply ONLY with JSON array (no markdown):
[{"variante":"Variant 1","post":"full post text with \\n for line breaks","warum":"Short reason why this style works"},{"variante":"Variant 2","post":"...","warum":"..."},{"variante":"Variant 3","post":"...","warum":"..."}]`,
      fr:`Tu es expert LinkedIn pour le marché suisse. Crée 3 posts LinkedIn différents en français. Pas de clichés d'entreprise.
Type: ${v.typ} | Ton: ${v.ton||"Personnel & authentique"} | Longueur: ${v.laenge||"Moyen"}
Détails: ${v.details}
Réponds UNIQUEMENT avec un tableau JSON:
[{"variante":"Variante 1","post":"texte complet avec \\n","warum":"Raison courte"},{"variante":"Variante 2","post":"...","warum":"..."},{"variante":"Variante 3","post":"...","warum":"..."}]`,
      it:`Sei un esperto LinkedIn per il mercato svizzero. Crea 3 post LinkedIn diversi in italiano. No cliché aziendali.
Tipo: ${v.typ} | Tono: ${v.ton||"Personale & autentico"} | Lunghezza: ${v.laenge||"Medio"}
Dettagli: ${v.details}
Rispondi SOLO con array JSON:
[{"variante":"Variante 1","post":"testo completo con \\n","warum":"Motivo breve"},{"variante":"Variante 2","post":"...","warum":"..."},{"variante":"Variante 3","post":"...","warum":"..."}]`,
    })[l]),
  },
];

const TOOL_CATS = {
  karriere:       {de:"💼 Karriere & Jobs",en:"💼 Career & Jobs",fr:"💼 Carrière & Emploi",it:"💼 Carriera & Lavoro"},
  ausbildung:     {de:"🎓 Schule & Ausbildung",en:"🎓 School & Education",fr:"🎓 École & Formation",it:"🎓 Scuola & Formazione"},
  produktivitaet: {de:"⚡ Produktivität",en:"⚡ Productivity",fr:"⚡ Productivité",it:"⚡ Produttività"},
};

// ── DOWNLOAD HELPERS ──
function slugify(page){ return (page||"stellify").replace(/[^a-z0-9]/gi,"-").toLowerCase(); }

function blobDownload(blob, filename){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);document.body.removeChild(a);},1000);
}

// ── PDF via jsPDF ──
async function downloadHtmlAsPdf(text, page){
  try{
    if(!window.jspdf){
      await new Promise((res,rej)=>{
        const s=document.createElement("script");
        s.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        s.onload=res; s.onerror=rej;
        document.head.appendChild(s);
      });
    }
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({unit:"mm",format:"a4",orientation:"portrait"});
    doc.setFont("helvetica","normal");
    doc.setFontSize(11);
    const margin=20, pageW=doc.internal.pageSize.getWidth(), maxW=pageW-margin*2;
    let y=margin;
    const lines=doc.splitTextToSize(text,maxW);
    lines.forEach(line=>{
      if(y>doc.internal.pageSize.getHeight()-margin){doc.addPage();y=margin;}
      doc.text(line,margin,y);
      y+=6;
    });
    doc.save(`stellify-${slugify(page)}.pdf`);
  }catch(e){
    console.error("PDF error:",e);
    // Fallback: print dialog
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;line-height:1.8;font-size:13px}pre{white-space:pre-wrap;font-family:inherit}</style></head><body><pre>${text.replace(/</g,"&lt;")}</pre></body></html>`;
    const w=window.open("","_blank");
    if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
  }
}

// ── Word .docx via docx.js ──
async function downloadAsWord(text, page){
  try{
    if(!window.docx){
      await new Promise((res,rej)=>{
        const s=document.createElement("script");
        s.src="https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.min.js";
        s.onload=res; s.onerror=rej;
        document.head.appendChild(s);
      });
    }
    const {Document,Packer,Paragraph,TextRun,HeadingLevel,AlignmentType}=window.docx;
    const paragraphs=text.split("\n").map(line=>{
      const trimmed=line.trim();
      if(!trimmed) return new Paragraph({spacing:{after:120}});
      const isBullet=trimmed.startsWith("•")||trimmed.startsWith("-");
      const isHeading=/^[A-ZÄÖÜ\s✍📄💡🔵🎤]{4,}$/.test(trimmed)||trimmed.endsWith(":");
      return new Paragraph({
        heading: isHeading?HeadingLevel.HEADING_2:undefined,
        bullet: isBullet?{level:0}:undefined,
        children:[new TextRun({
          text: isBullet?trimmed.replace(/^[•\-]\s*/,""):trimmed,
          size:22,
          font:"Calibri",
          bold: isHeading,
        })],
        spacing:{after:isHeading?160:100},
      });
    });
    const doc=new Document({
      sections:[{
        properties:{},
        children:paragraphs,
      }],
    });
    const buffer=await Packer.toBlob(doc);
    blobDownload(buffer,`stellify-${slugify(page)}.docx`);
  }catch(e){
    console.error("Word error:",e);
    // Fallback RTF
    const rtf=`{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Calibri;}}\\f0\\fs22\\sa180 ${text.replace(/\\/g,"\\\\").replace(/\{/g,"\\{").replace(/\}/g,"\\}").replace(/\n/g,"\\par\n")}}`;
    blobDownload(new Blob([rtf],{type:"application/rtf"}),`stellify-${slugify(page)}.rtf`);
  }
}

// ── PowerPoint .pptx via PptxGenJS ──
async function downloadAsPptx(slides, title, page){
  try{
    if(!window.PptxGenJS){
      await new Promise((res,rej)=>{
        const s=document.createElement("script");
        s.src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js";
        s.onload=res; s.onerror=rej;
        document.head.appendChild(s);
      });
    }
    const pptx=new window.PptxGenJS();
    pptx.layout="LAYOUT_16x9";
    pptx.theme={headFontFace:"Calibri",bodyFontFace:"Calibri"};
    // Title slide
    const ts=pptx.addSlide();
    ts.background={color:"0F172A"};
    ts.addText(title||"Stellify",{x:0.5,y:1.5,w:9,h:1.5,fontSize:36,bold:true,color:"FFFFFF",align:"center"});
    ts.addText("Erstellt mit Stellify · stellify.ch",{x:0.5,y:3.5,w:9,h:0.5,fontSize:14,color:"10b981",align:"center"});
    // Content slides
    (slides||[]).forEach(sl=>{
      const s=pptx.addSlide();
      s.background={color:"FFFFFF"};
      s.addText(sl.title||"",{x:0.5,y:0.4,w:9,h:0.8,fontSize:22,bold:true,color:"0F172A"});
      s.addShape(pptx.ShapeType.rect,{x:0.5,y:1.2,w:9,h:0.04,fill:{color:"10B981"}});
      const content=(sl.content||[]).map(c=>`• ${c}`).join("\n");
      s.addText(content,{x:0.5,y:1.4,w:9,h:4.5,fontSize:14,color:"334155",valign:"top"});
      if(sl.speaker_note) s.addNotes(sl.speaker_note);
    });
    await pptx.writeFile({fileName:`stellify-${slugify(page)}.pptx`});
  }catch(e){
    console.error("PPTX error:",e);
    alert("PowerPoint-Export fehlgeschlagen. Bitte Inhalt kopieren.");
  }
}

// ── Excel .xlsx via SheetJS ──
async function downloadAsExcel(rows, headers, sheetName, page){
  try{
    // SheetJS is already available via import in the app
    const XLSX=await import("https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs");
    const wsData=[headers,...rows];
    const ws=XLSX.utils.aoa_to_sheet(wsData);
    // Column widths
    ws["!cols"]=headers.map(()=>({wch:20}));
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,sheetName||"Stellify");
    XLSX.writeFile(wb,`stellify-${slugify(page)}.xlsx`);
  }catch(e){
    console.error("Excel error:",e);
    // Fallback CSV
    const csv=[headers,...rows].map(r=>r.join(";")).join("\n");
    blobDownload(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}),`stellify-${slugify(page)}.csv`);
  }
}

// ── TXT ──
function downloadTxt(text, page){
  blobDownload(new Blob([text],{type:"text/plain;charset=utf-8"}),`stellify-${slugify(page)}.txt`);
}

// ── DOWNLOAD HELPERS: Text → Excel / PPTX ──
function dlExcelFromText(text, page){
  const lines=text.split("\n").filter(l=>l.trim().length>0);
  const rows=lines.map(l=>[l.trim()]);
  downloadAsExcel(rows,["Inhalt"],page,page);
}
function dlPptxFromText(text, title, page){
  const lines=text.split("\n").filter(l=>l.trim().length>0);
  const size=6;
  const slides=[];
  for(let i=0;i<lines.length;i+=size){
    slides.push({slide:Math.floor(i/size)+1,title:title||"Folie "+(Math.floor(i/size)+1),content:lines.slice(i,i+size),speaker_note:""});
  }
  if(!slides.length)slides.push({slide:1,title:title||page,content:[text.slice(0,200)],speaker_note:""});
  downloadAsPptx(slides,title||page,page);
}

// ── GENERIC TOOL PAGE ──
const LANGS=["de","en","fr","it"], FLAGS={de:"DE",en:"EN",fr:"FR",it:"IT"};

function GenericToolPage({ tool, lang, pro, setPw, setPage, yearly, C, proUsage, setProUsage }) {
  const L = (d,e,f,i) => ({de:d,en:e,fr:f,it:i}[lang]);
  const [vals, setVals] = useState({});
  const [result, setResult] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [docFile, setDocFile] = useState(null);
  const [docText, setDocText] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const stripeLink = () => yearly ? C.stripeYearly : C.stripeMonthly;
  const nextReset=()=>{const d=new Date();d.setMonth(d.getMonth()+1);d.setDate(1);return d.toLocaleDateString(lang==="de"?"de-CH":lang==="fr"?"fr-CH":lang==="it"?"it-CH":"en-CH",{day:"numeric",month:"long",year:"numeric"});};
  const limitHit = pro && proUsage >= C.PRO_LIMIT;

  const setV = (k,v) => setVals(p=>({...p,[k]:v}));
  const canRun = tool.inputs.filter(i=>i.req).every(i=>(vals[i.k]||"").trim()) || !!docFile;

  const handleDoc = async (file) => {
    if (!file) return;
    setDocLoading(true); setErr("");
    try {
      if (file.name.endsWith(".docx")) {
        const mammoth = await import("https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js");
        const ab = await file.arrayBuffer();
        const res = await mammoth.extractRawText({arrayBuffer: ab});
        setDocText(res.value); setDocFile({name:file.name, type:"text", text:res.value});
      } else {
        setDocFile({name:file.name, type:file.type, raw:file});
      }
    } catch(e) { setErr(L("Fehler beim Lesen der Datei.","Error reading file.","Erreur lors de la lecture.","Errore durante la lettura.")); }
    finally { setDocLoading(false); }
  };

  const run = async () => {
    if (!pro) { setPw(true); return; }
    if (limitHit) return;
    setStreaming(true); setResult(""); setErr("");
    try {
      const inputSummary = Object.entries(vals).map(([k,v])=>`${k}: ${v}`).join("\n");
      const docContext = docFile?.type==="text" ? `\n\nDokument-Inhalt:\n${docFile.text}` : "";
      const prompt = tool.prompt(vals, lang) + docContext;
      if (docFile && docFile.type !== "text") {
        // PDF or image – send as base64
        const full = await callAIWithFileStreaming(docFile.raw, prompt, chunk => setResult(chunk));
      } else {
        await streamAI(prompt, chunk => setResult(chunk), null, tool.id);
      }
      incPro(); if(setProUsage) setProUsage(getProCount());
    } catch(e) { setErr(e.message); } finally { setStreaming(false); }
  };

  const hdrColor = tool.color || "#10b981";

  return (
    <>
      <div style={{background:`linear-gradient(135deg,${hdrColor}dd,${hdrColor})`,padding:"48px 28px 34px",textAlign:"center"}}>
        <div style={{fontFamily:"var(--hd)",fontSize:32,fontWeight:800,color:"white",marginBottom:7,letterSpacing:"-1px"}}>{tool.ico} {tool.t[lang]}</div>
        <div style={{fontSize:14,color:"rgba(255,255,255,.5)"}}>{tool.sub[lang]}</div>
      </div>
      <div style={{maxWidth:740,margin:"0 auto",padding:"36px 28px 80px"}}>
        {err&&<div className="err">⚠️ {err}</div>}
        {limitHit&&(
          <div style={{background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.3)",borderRadius:12,padding:"16px 20px",marginBottom:16,textAlign:"center"}}>
            <div style={{fontSize:24,marginBottom:6}}>⏳</div>
            <div style={{fontFamily:"var(--hd)",fontSize:16,fontWeight:800,marginBottom:4}}>{L("Monatliches Kontingent aufgebraucht","Monthly quota used up","Quota mensuel épuisé","Quota mensile esaurito")}</div>
            <div style={{fontSize:13,color:"var(--mu)"}}>{L("Nächster Reset:","Next reset:","Prochaine réinitialisation:","Prossimo reset:")} <strong>{nextReset()}</strong></div>
          </div>
        )}
        {!pro ? (
          <div>
            {/* Demo-Vorschau */}
            <div style={{background:"linear-gradient(135deg,#f0fdf9,#ecfdf5)",border:"1.5px solid rgba(16,185,129,.2)",borderRadius:18,padding:"20px 22px",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                <span style={{background:"var(--em)",color:"white",borderRadius:7,padding:"2px 10px",fontSize:11,fontWeight:700}}>✦ {L("Beispiel-Output","Example output","Exemple de résultat","Esempio output")}</span>
                <span style={{fontSize:12,color:"var(--mu)"}}>{L("So sieht dein Ergebnis aus","This is what your result looks like","Voici votre résultat","Ecco il tuo risultato")}</span>
              </div>
              <div style={{background:"white",borderRadius:12,padding:"16px",border:"1px solid rgba(16,185,129,.12)",fontSize:13,color:"var(--ink)",lineHeight:1.85,whiteSpace:"pre-wrap",maxHeight:260,overflow:"hidden",maskImage:"linear-gradient(to bottom,black 55%,transparent 100%)",WebkitMaskImage:"linear-gradient(to bottom,black 55%,transparent 100%)"}}>
                {tool.id==="li2job" ? L(
`✍️ MOTIVATIONSSCHREIBEN

Sehr geehrte Damen und Herren,

als ETH-Absolvent mit 4 Jahren Erfahrung in Python und React bewerbe ich mich mit grossem Interesse auf die Position als Senior Developer bei Google Zürich. Meine Expertise in skalierbaren Cloud-Architekturen (GCP, AWS) deckt sich direkt mit Ihren Anforderungen.

📄 LEBENSLAUF-HIGHLIGHTS
• ETH Zürich – B.Sc. Informatik (2020), Note: 5.4
• 4 Jahre Full-Stack (Python, React, Node.js, GCP)
• Projektleitung für 3 Enterprise-Anwendungen (50k+ Nutzer)
• Open-Source-Contributor: 800+ GitHub Stars

💡 DEINE 3 STÄRKSTEN ARGUMENTE
1. ETH-Abschluss → Google priorisiert Top-Hochschulen weltweit
2. Python + GCP → exakt die gesuchte Tech-Stack-Kombination
3. Schweizer Arbeitserlaubnis → kein Visum, sofort verfügbar`,
`✍️ COVER LETTER

Dear Hiring Team,

As an ETH graduate with 4 years of Python and React experience, I'm excited to apply for the Senior Developer position at Google Zürich. My expertise in scalable cloud architectures (GCP, AWS) directly matches your requirements.

📄 CV HIGHLIGHTS
• ETH Zürich – B.Sc. Computer Science (2020), GPA: 5.4
• 4 years Full-Stack (Python, React, Node.js, GCP)
• Led 3 enterprise applications (50k+ users)
• Open-Source contributor: 800+ GitHub Stars

💡 YOUR 3 STRONGEST ARGUMENTS
1. ETH degree → Google prioritizes top universities worldwide
2. Python + GCP → exactly the tech stack combination sought
3. Swiss work permit → no visa needed, immediately available`,
`✍️ LETTRE DE MOTIVATION

Madame, Monsieur,

Diplômé de l'ETH avec 4 ans d'expérience Python et React, je postule avec enthousiasme au poste de Senior Developer chez Google Zürich. Mon expertise en architectures cloud (GCP, AWS) correspond directement à vos besoins.

📄 POINTS FORTS CV
• ETH Zurich – B.Sc. Informatique (2020), Note: 5.4
• 4 ans Full-Stack (Python, React, Node.js, GCP)
• Conduite de 3 applications enterprise (50k+ utilisateurs)

💡 VOS 3 MEILLEURS ARGUMENTS
1. Diplôme ETH → Google priorise les meilleures universités
2. Python + GCP → exactement la stack technique recherchée
3. Permis de travail suisse → disponible immédiatement`,
`✍️ LETTERA DI MOTIVAZIONE

Gentili Signori,

Come laureato ETH con 4 anni di esperienza Python e React, mi candido con entusiasmo per la posizione di Senior Developer presso Google Zürich.

📄 PUNTI DI FORZA CV
• ETH Zurigo – B.Sc. Informatica (2020), Voto: 5.4
• 4 anni Full-Stack (Python, React, Node.js, GCP)
• Gestione di 3 applicazioni enterprise (50k+ utenti)

💡 I TUOI 3 ARGOMENTI PIÙ FORTI
1. Laurea ETH → Google priorizza le migliori università
2. Python + GCP → esattamente la tech stack cercata
3. Permesso di lavoro svizzero → disponibile subito`) :
                L(
`⚡ KI-Ergebnis – Beispiel

Dies ist ein Beispiel-Output für dieses Tool.
Mit Pro erhältst du dein persönliches, auf dich
zugeschnittenes Ergebnis in Sekunden.

✓ Professionell formuliert
✓ Auf deine Eingaben zugeschnitten  
✓ Sofort kopierbar & verwendbar`,
`⚡ AI result – Example

This is a sample output for this tool.
With Pro you get your personal, tailored
result in seconds.

✓ Professionally written
✓ Tailored to your inputs
✓ Ready to copy & use`,
`⚡ Résultat IA – Exemple

Ceci est un exemple de résultat pour cet outil.
Avec Pro vous obtenez votre résultat personnel
en quelques secondes.`,
`⚡ Risultato IA – Esempio

Questo è un esempio di output per questo strumento.
Con Pro ottieni il tuo risultato personale in secondi.`)}
              </div>
            </div>
            {/* Upgrade CTA */}
            <div className="card" style={{textAlign:"center",padding:"24px"}}>
              <div style={{fontSize:32,marginBottom:8}}>🚀</div>
              <div style={{fontFamily:"var(--hd)",fontSize:18,fontWeight:800,marginBottom:6}}>{L("Bereit für dein Ergebnis?","Ready for your result?","Prêt pour votre résultat?","Pronto per il tuo risultato?")}</div>
              <p style={{fontSize:13,color:"var(--mu)",marginBottom:18,lineHeight:1.7}}>
                {L(`Pro – CHF ${C.priceM}/Mo. · Alle Tools · Jederzeit kündbar`,`Pro – CHF ${C.priceM}/mo · All tools · Cancel anytime`,`Pro – CHF ${C.priceM}/mois · Tous les outils · Résiliable`,`Pro – CHF ${C.priceM}/mese · Tutti gli strumenti`)}
              </p>
              <button className="btn b-em" style={{width:"100%",justifyContent:"center"}} onClick={()=>window.open(stripeLink(),"_blank")}>
                {L("Jetzt Pro werden & starten →","Become Pro & start →","Devenir Pro & commencer →","Diventa Pro & inizia →")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="card">
              {/* ── Universeller Dokument-Upload ── */}
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--mu)",marginBottom:8}}>{L("📎 Dokument hochladen (optional)","📎 Upload document (optional)","📎 Joindre un document (optionnel)","📎 Carica documento (opzionale)")}</div>
                {docFile ? (
                  <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:18}}>{docFile.type==="text"?"📄":docFile.type?.startsWith("image/")?"🖼️":"📄"}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,color:"#15803d",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{docFile.name}</div>
                      <div style={{fontSize:11,color:"#16a34a"}}>{docFile.type==="text"?L("Word-Dokument – Text extrahiert ✓","Word document – text extracted ✓","Document Word – texte extrait ✓","Documento Word – testo estratto ✓"):L("Bereit zur Analyse ✓","Ready for analysis ✓","Prêt pour l'analyse ✓","Pronto per l'analisi ✓")}</div>
                    </div>
                    <button onClick={()=>{setDocFile(null);setDocText("");}} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#6b7280",flexShrink:0}}>✕</button>
                  </div>
                ) : (
                  <label style={{display:"block",cursor:"pointer"}}>
                    <div style={{border:"2px dashed rgba(16,185,129,.3)",borderRadius:12,padding:"16px",textAlign:"center",background:"rgba(16,185,129,.02)",transition:"all .2s"}}
                      onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="var(--em)";e.currentTarget.style.background="var(--em3)"}}
                      onDragLeave={e=>{e.currentTarget.style.borderColor="rgba(16,185,129,.3)";e.currentTarget.style.background="rgba(16,185,129,.02)"}}
                      onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor="rgba(16,185,129,.3)";e.currentTarget.style.background="rgba(16,185,129,.02)";const f=e.dataTransfer.files[0];if(f)handleDoc(f);}}>
                      {docLoading ? <div style={{fontSize:13,color:"var(--em)"}}>{L("Lese Datei…","Reading file…","Lecture…","Lettura…")}</div> : <>
                        <div style={{fontSize:24,marginBottom:4}}>📎</div>
                        <div style={{fontSize:13,fontWeight:600,color:"var(--mu)",marginBottom:2}}>{L("PDF, Word oder Bild hier ablegen","Drop PDF, Word or image here","Déposez PDF, Word ou image ici","Rilascia PDF, Word o immagine qui")}</div>
                        <div style={{fontSize:11,color:"rgba(11,11,18,.3)"}}>{L("oder klicken zum Auswählen · PDF, .docx, JPG, PNG","or click to select · PDF, .docx, JPG, PNG","ou cliquer pour sélectionner · PDF, .docx, JPG, PNG","o clicca per selezionare · PDF, .docx, JPG, PNG")}</div>
                      </>}
                    </div>
                    <input type="file" accept=".pdf,.docx,.doc,image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handleDoc(f);}}/>
                  </label>
                )}
              </div>
              <div style={{borderTop:"1px solid var(--bo)",paddingTop:14}}>
              {tool.inputs.map(inp => (
                <div className="field" key={inp.k}>
                  <label>{inp.lbl[lang]}{inp.req&&" *"}</label>
                  {inp.type==="textarea" ? (
                    <textarea value={vals[inp.k]||""} onChange={e=>setV(inp.k,e.target.value)} placeholder={inp.ph?.[lang]||""} style={{minHeight:inp.tall?140:80}}/>
                  ) : inp.type==="select" ? (
                    <select value={vals[inp.k]||""} onChange={e=>setV(inp.k,e.target.value)}>
                      <option value="">–</option>
                      {(inp.opts?.[lang]||[]).map(o=><option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input value={vals[inp.k]||""} onChange={e=>setV(inp.k,e.target.value)} placeholder={inp.ph?.[lang]||""}/>
                  )}
                </div>
              ))}
              </div>
              <button className="btn b-em" onClick={run} disabled={streaming||(!canRun&&!docFile)} style={{background:hdrColor,marginTop:14}}>
                {streaming ? L("Erstelle…","Creating…","Création…","Creando…") : `${tool.ico} ${L("Erstellen","Create","Créer","Crea")}`}
              </button>
            </div>

            {(streaming||result) && (
              <div className="card" style={{marginTop:14}}>
                {streaming&&<div style={{display:"flex",alignItems:"center",gap:9,marginBottom:12,color:hdrColor,fontWeight:600,fontSize:13}}>
                  <div style={{width:8,height:8,background:hdrColor,borderRadius:"50%",animation:"blink .8s step-end infinite"}}/>
                  {L("KI schreibt…","AI writing…","L'IA rédige…","L'IA scrive…")}
                </div>}
                <div style={{display:"flex",gap:7,justifyContent:"flex-end",marginBottom:10,flexWrap:"wrap"}}>
                  {copied&&<span className="ok" style={{margin:0,padding:"4px 11px"}}>✓ {L("Kopiert!","Copied!","Copié!","Copiato!")}</span>}
                  <button className="btn b-outd b-sm" onClick={()=>{navigator.clipboard.writeText(result);setCopied(true);setTimeout(()=>setCopied(false),2000);}}>📋 {L("Kopieren","Copy","Copier","Copia")}</button>
                  {!streaming&&<button className="btn b-outd b-sm" onClick={()=>downloadTxt(result, page)}>📄 TXT</button>}
                  {!streaming&&<button className="btn b-outd b-sm" onClick={()=>downloadHtmlAsPdf(result, page)}>📕 PDF</button>}
                  {!streaming&&<button className="btn b-outd b-sm" onClick={()=>downloadAsWord(result, page)}>📘 Word</button>}
                  {!streaming&&<button className="btn b-outd b-sm" onClick={()=>dlExcelFromText(result, page)}>📊 Excel</button>}
                  {!streaming&&<button className="btn b-outd b-sm" onClick={()=>dlPptxFromText(result, tool.t?.[lang]||page, page)}>📽️ PPTX</button>}
                  {!streaming&&<button className="btn b-outd b-sm" onClick={()=>{setResult("");setVals({});}}>🔄 {L("Neu","New","Nouveau","Nuovo")}</button>}
                </div>
                <div className="r-doc">{result}{streaming&&<span className="cursor"/>}</div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function AppDemo({lang}) {
  const [open,setOpen] = useState(false);
  const L=(d,e,f,i)=>({de:d,en:e,fr:f,it:i}[lang]||d);
  const example = L(
`Sehr geehrte Damen und Herren

Mit grossem Interesse habe ich Ihre Ausschreibung für die Position als Product Manager bei Migros Zürich gelesen. Als erfahrener Produktmanager mit fünf Jahren FMCG-Erfahrung bringe ich strategisches Denken und operative Stärke mit.

Meine Mehrsprachigkeit (DE/EN/FR) ermöglicht reibungslose Zusammenarbeit in der ganzen Schweiz. Besonders reizt mich Ihr Engagement für Nachhaltigkeit.

Freundliche Grüsse, [Ihr Name]`,
`Dear Sir or Madam,

I read your advertisement for the Product Manager position at Migros Zürich with great interest. With five years of FMCG experience I bring strategic thinking and operational strength.

My multilingual skills (DE/EN/FR) enable seamless collaboration across Switzerland.

Kind regards, [Your Name]`,
`Madame, Monsieur,

Votre offre pour le poste de Product Manager chez Migros m'a beaucoup intéressé. Fort de 5 ans d'expérience FMCG, j'apporte vision stratégique et rigueur opérationnelle.

Cordialement, [Votre nom]`,
`Gentili Signori,

Il vostro annuncio per Product Manager a Migros mi ha molto interessato. Con 5 anni di esperienza FMCG porto pensiero strategico e forza operativa.

Cordiali saluti, [Il suo nome]`);

  return (
    <div style={{marginBottom:16,borderRadius:16,overflow:"hidden",border:"1.5px solid rgba(16,185,129,.2)"}}>
      {/* Header – immer sichtbar */}
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",background:"linear-gradient(135deg,#f0fdf9,#ecfdf5)",border:"none",padding:"14px 18px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{background:"var(--em)",color:"white",borderRadius:7,padding:"2px 9px",fontSize:11,fontWeight:700,flexShrink:0}}>✦ {L("Beispiel-Output","Example output","Exemple de résultat","Esempio output")}</span>
          <span style={{fontSize:12,color:"var(--mu)",textAlign:"left"}}>{L("So sieht dein fertiges Motivationsschreiben aus","This is what your cover letter looks like","Voici votre lettre de motivation","Ecco la tua lettera")}</span>
        </div>
        <span style={{fontSize:16,color:"var(--em)",flexShrink:0,transform:open?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
      </button>
      {/* Beispiel – aufklappbar */}
      {open&&<div style={{background:"white",padding:"16px 18px",borderTop:"1px solid rgba(16,185,129,.1)"}}>
        <div style={{display:"flex",gap:16,marginBottom:12,flexWrap:"wrap"}}>
          {[{ico:"✍️",t:L("Motivationsschreiben","Cover letter","Lettre de motivation","Lettera")},{ico:"📄",t:L("Lebenslauf-Struktur","CV structure","Structure CV","Struttura CV")},{ico:"💡",t:L("3 Killer-Argumente","3 key arguments","3 arguments clés","3 argomenti")}].map((x,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--mu)"}}>
              <span>{x.ico}</span><span style={{fontWeight:600,color:"var(--tx)"}}>{x.t}</span>
            </div>
          ))}
        </div>
        <div style={{background:"#f8fffe",border:"1px solid rgba(16,185,129,.15)",borderRadius:12,padding:"14px 16px",fontSize:13,color:"var(--ink)",lineHeight:1.85,whiteSpace:"pre-wrap",maxHeight:220,overflow:"hidden",maskImage:"linear-gradient(to bottom,black 60%,transparent 100%)",WebkitMaskImage:"linear-gradient(to bottom,black 60%,transparent 100%)"}}>{example}</div>
        <div style={{marginTop:10,fontSize:11,color:"var(--em)",fontWeight:600}}>⚡ {L("Dein Ergebnis ist auf deine Stelle & dein Profil zugeschnitten – nicht generisch.","Your result is tailored to your job & profile – not generic.","Votre résultat est adapté à votre poste & profil.","Il tuo risultato è personalizzato per te.")}</div>
      </div>}
    </div>
  );
}

function DemoSection({lang, navTo}) {
  const [demoTab,setDemoTab] = useState(0);
  const L=(d,e,f,i)=>({de:d,en:e,fr:f,it:i}[lang]||d);
  const demos = [
    {
      id:"app", ico:"✍️",
      label: L("Bewerbung","Application","Candidature","Candidatura"),
      badge: L("1× Gratis","1× Free","1× Gratuit","1× Gratis"), badgeCol:"#10b981",
      input:[{l:L("Stelle","Position","Poste","Posizione"),v:"Product Manager, Migros Zürich"},{l:L("Erfahrung","Experience","Expérience","Esperienza"),v:L("5 Jahre PM, FMCG, DE/EN/FR","5 years PM, FMCG, DE/EN/FR","5 ans PM, FMCG, DE/EN/FR","5 anni PM, FMCG, DE/EN/FR")}],
      output:L(
`Sehr geehrte Damen und Herren

Mit grossem Interesse habe ich Ihre Ausschreibung für die Position als Product Manager bei Migros Zürich gelesen. Als erfahrener Produktmanager mit fünf Jahren Branchenerfahrung im FMCG-Bereich bringe ich genau die Kombination aus strategischem Denken und operativer Umsetzungsstärke mit, die diese Rolle erfordert.

Meine Mehrsprachigkeit in Deutsch, Englisch und Französisch ermöglicht mir eine reibungslose Zusammenarbeit in der gesamten Schweiz.

Ich freue mich auf ein persönliches Gespräch.
Freundliche Grüsse, [Ihr Name]`,
`Dear Sir or Madam,

I read your advertisement for the Product Manager position at Migros Zürich with great interest. With five years of FMCG experience, I bring the strategic thinking and operational execution this role requires.

My multilingual skills (German, English, French) enable seamless collaboration across Switzerland.

Kind regards, [Your Name]`,
`Madame, Monsieur,

Votre offre pour le poste de Product Manager chez Migros Zürich a retenu toute mon attention. Fort de cinq ans d'expérience FMCG, j'apporte la combinaison de réflexion stratégique et d'exécution opérationnelle que ce rôle exige.

Cordialement, [Votre nom]`,
`Gentili Signore e Signori,

Ho letto con grande interesse il vostro annuncio per la posizione di Product Manager presso Migros Zürich. Con cinque anni di esperienza nel settore FMCG, porto esattamente la combinazione di pensiero strategico ed esecuzione operativa.

Cordiali saluti, [Il suo nome]`)
    },
    {
      id:"li2job", ico:"🔗",
      label:"LinkedIn → "+L("Bewerbung","Application","Candidature","Candidatura"),
      badge:"PRO", badgeCol:"#0a66c2",
      input:[{l:"LinkedIn-Profil",v:L("Software Engineer, 4 J. Erfahrung, ETH Zürich, Python/React","Software Engineer, 4y exp, ETH Zürich, Python/React","Ingénieur logiciel, 4 ans exp, ETH Zurich","Ingegnere SW, 4 anni, ETH Zurigo")},{l:L("Stelle","Job posting","Offre","Offerta"),v:"Senior Dev, Google Zürich"}],
      output:L(
`✍️ MOTIVATIONSSCHREIBEN

Sehr geehrte Damen und Herren,
als ETH-Absolvent mit 4 Jahren Erfahrung in Python und React bin ich begeistert von der Senior Developer Position bei Google Zürich...

📄 LEBENSLAUF-HIGHLIGHTS
• ETH Zürich – B.Sc. Informatik (2020)
• 4 Jahre Full-Stack-Entwicklung (Python, React, Node.js)
• Projektleitung für 3 Enterprise-Anwendungen

💡 DEINE 3 STÄRKSTEN ARGUMENTE
1. ETH-Abschluss → Google legt grossen Wert auf Top-Hochschulen
2. Python-Expertise → Kernsprache bei Google
3. Schweizer Arbeitsmarkterfahrung → kein Visum nötig`,
`✍️ COVER LETTER

Dear Hiring Team,
As an ETH graduate with 4 years of Python and React experience, I'm excited about the Senior Developer role at Google Zürich...

📄 CV HIGHLIGHTS
• ETH Zürich – B.Sc. Computer Science (2020)
• 4 years Full-Stack (Python, React, Node.js)
• Led 3 enterprise application projects

💡 YOUR 3 STRONGEST ARGUMENTS
1. ETH degree → Google values top universities
2. Python expertise → Google's core language
3. Swiss work experience → no visa required`,
`✍️ LETTRE DE MOTIVATION

Madame, Monsieur,
En tant que diplômé de l'ETH avec 4 ans d'expérience Python et React, je suis enthousiaste pour ce poste...

📄 POINTS FORTS CV
• ETH Zurich – B.Sc. Informatique (2020)
• 4 ans Full-Stack (Python, React, Node.js)

💡 VOS 3 MEILLEURS ARGUMENTS
1. Diplôme ETH → Google valorise les grandes écoles
2. Expertise Python → langage clé chez Google
3. Expérience suisse → pas de visa requis`,
`✍️ LETTERA DI MOTIVAZIONE

Gentili Signori,
Come laureato all'ETH con 4 anni di esperienza in Python e React, sono entusiasta di questa posizione...

📄 PUNTI DI FORZA CV
• ETH Zurigo – B.Sc. Informatica (2020)
• 4 anni Full-Stack (Python, React, Node.js)

💡 I TUOI 3 ARGOMENTI PIÙ FORTI
1. Laurea ETH → Google valorizza le top università
2. Competenza Python → linguaggio chiave di Google
3. Esperienza svizzera → nessun visto necessario`)
    },
    {
      id:"linkedin", ico:"💼",
      label:L("LinkedIn Optimierung","LinkedIn Optimization","Optimisation LinkedIn","Ottimizzazione LinkedIn"),
      badge:"PRO", badgeCol:"#3b82f6",
      input:[{l:L("Aktuelle Headline","Current headline","Headline actuelle","Headline attuale"),v:L("Software Engineer at Startup Zürich","Software Engineer at Startup Zürich","Software Engineer chez Startup Zurich","Software Engineer presso Startup Zurigo")},{l:L("Zielposition","Target role","Poste cible","Posizione target"),v:L("Senior Dev bei Google / Microsoft","Senior Dev at Google / Microsoft","Senior Dev chez Google / Microsoft","Senior Dev presso Google / Microsoft")}],
      output:L(
`🔵 OPTIMIERTE HEADLINE
«Senior Software Engineer | Python & React | Scalable Systems | ETH Zürich»
→ +340% mehr Recruiter-Klicks durch Keywords

📝 ABOUT-SECTION (Vorschlag)
Ich entwickle skalierbare Web-Applikationen mit Python und React. Mit 4 Jahren Erfahrung und ETH-Abschluss helfe ich Teams, komplexe Probleme elegant zu lösen.

🏷️ TOP-SKILLS FÜR RECRUITER
Python · React · Node.js · Cloud Architecture · Agile · System Design · TypeScript

💡 3 PROFIL-TIPPS
1. Profilbild professionell → 21× mehr Views
2. «Open to Work» aktivieren (nur für Recruiter sichtbar)
3. 3 Empfehlungen anfragen – boosten Glaubwürdigkeit`,
`🔵 OPTIMIZED HEADLINE
«Senior Software Engineer | Python & React | Scalable Systems | ETH Zürich»
→ +340% more recruiter clicks through keywords

📝 ABOUT SECTION
I build scalable web applications with Python and React. With 4 years of experience and an ETH degree, I help teams solve complex problems elegantly.

🏷️ TOP SKILLS FOR RECRUITERS
Python · React · Node.js · Cloud Architecture · Agile · System Design · TypeScript

💡 3 PROFILE TIPS
1. Professional headshot → 21× more views
2. Activate «Open to Work» (only visible to recruiters)
3. Request 3 recommendations – boosts credibility`,
`🔵 HEADLINE OPTIMISÉE
«Senior Software Engineer | Python & React | Systèmes Évolutifs | ETH Zurich»
→ +340% de clics recruteurs grâce aux mots-clés

📝 SECTION À PROPOS
Je développe des applications web évolutives avec Python et React. Diplômé de l'ETH, j'aide les équipes à résoudre des problèmes complexes élégamment.

🏷️ TOP COMPÉTENCES
Python · React · Node.js · Cloud · Agile · System Design

💡 3 CONSEILS PROFIL
1. Photo professionnelle → 21× plus de vues
2. Activer «Ouvert aux opportunités» (visible uniquement aux recruteurs)
3. Demander 3 recommandations`,
`🔵 HEADLINE OTTIMIZZATA
«Senior Software Engineer | Python & React | Sistemi Scalabili | ETH Zurigo»
→ +340% più clic dai recruiter grazie alle keyword

📝 SEZIONE ABOUT
Sviluppo applicazioni web scalabili con Python e React. Con 4 anni di esperienza e laurea ETH, aiuto i team a risolvere problemi complessi.

🏷️ TOP SKILL PER RECRUITER
Python · React · Node.js · Cloud · Agile · System Design

💡 3 CONSIGLI PROFILO
1. Foto professionale → 21× più visualizzazioni
2. Attivare «Aperto a opportunità»
3. Richiedere 3 raccomandazioni`)
    },
    {
      label:"ATS-Check",
      badge:"PRO", badgeCol:"#3b82f6",
      input:[{l:L("Stelle","Position","Poste","Posizione"),v:"Software Engineer, Google Zürich"},{l:"CV",v:L("Kurzer Lebenslauf ohne Keywords","Short CV without keywords","CV court sans mots-clés","CV breve senza parole chiave")}],
      output:L(
`ATS-Score: 62/100 ⚠️

✓ Was gut ist:
  Berufsbezeichnung stimmt überein
  Hochschulabschluss vorhanden

✗ Was fehlt – kritisch:
  «Python» fehlt (7× im Inserat)
  «Agile/Scrum» fehlt (5× erwähnt)
  «Cloud GCP/AWS» fehlt (4× erwähnt)
  Keine messbaren Erfolge (Zahlen, %)

3 Verbesserungen:
1. «Python» in Skills einfügen
2. «Scrum» und «Agile» ergänzen
3. «Ladezeit um 40% optimiert» statt «Performance verbessert»

→ Mit Anpassungen: Score 84/100 ✅`,
`ATS Score: 62/100 ⚠️

✓ What's good:
  Job title matches
  University degree present

✗ What's missing – critical:
  «Python» missing (7× in posting)
  «Agile/Scrum» missing (5× mentioned)
  «Cloud GCP/AWS» missing (4× mentioned)
  No measurable achievements

3 improvements:
1. Add «Python» to skills
2. Include «Scrum» and «Agile»
3. Write «Load time reduced by 40%»

→ With adjustments: Score 84/100 ✅`,
`Score ATS: 62/100 ⚠️

✓ Ce qui est bien:
  Titre de poste correspond
  Diplôme universitaire présent

✗ Ce qui manque:
  «Python» absent (7× dans l'offre)
  «Agile/Scrum» absent (5× mentionné)
  Pas de réalisations mesurables

3 améliorations:
1. Ajouter «Python» aux compétences
2. Inclure «Scrum» et «Agile»
3. Écrire «Temps de chargement réduit de 40%»

→ Avec ajustements: Score 84/100 ✅`,
`Score ATS: 62/100 ⚠️

✓ Cosa va bene:
  Titolo corrisponde
  Laurea presente

✗ Cosa manca:
  «Python» mancante (7× nell'annuncio)
  «Agile/Scrum» mancante
  Nessun risultato misurabile

3 miglioramenti:
1. Aggiungere «Python» alle competenze
2. Includere «Scrum» e «Agile»
3. Scrivere «Tempo caricamento ridotto 40%»

→ Con adeguamenti: Score 84/100 ✅`)
    },
    {
      id:"zeugnis", ico:"📜",
      label:L("Zeugnis-Analyse","Reference","Analyse certificat","Analisi certificato"),
      badge:"PRO", badgeCol:"#f59e0b",
      input:[{l:L("Zeugnis-Auszug","Reference extract","Extrait certificat","Estratto certificato"),v:L("«Herr Müller erledigte die Aufgaben zu unserer Zufriedenheit und zeigte stets Verständnis für Kollegen.»","«Mr. Müller completed tasks to our satisfaction and always showed understanding for colleagues.»","«M. Müller a exécuté les tâches à notre satisfaction et a toujours fait preuve de compréhension.»","«Il Sig. Müller ha svolto i compiti a nostra soddisfazione e ha sempre mostrato comprensione.»")}],
      output:L(
`⚠️ 2 versteckte Codes erkannt!

«zu unserer Zufriedenheit»
→ Bedeutet: BEFRIEDIGEND (Note 3/5)
→ Gut wäre: «vollster Zufriedenheit»

«zeigte Verständnis für Kollegen»
→ Bedeutet: KONFLIKTE im Team
→ Gut wäre: «harmonisch zusammengearbeitet»

Gesamtbewertung: 2.5/5 ⚠️
→ Dieses Zeugnis NICHT vorlegen!

Empfehlung: Bitte den Arbeitgeber um
«vollster Zufriedenheit» + «harmonischer Zusammenarbeit»`,
`⚠️ 2 hidden codes detected!

«to our satisfaction»
→ Means: SATISFACTORY (Grade 3/5)
→ Good would be: «complete satisfaction»

«showed understanding for colleagues»
→ Means: CONFLICTS in the team
→ Good would be: «worked harmoniously»

Overall rating: 2.5/5 ⚠️
→ Do NOT submit this reference!

Recommendation: Ask employer for
«complete satisfaction» + «harmonious collaboration»`,
`⚠️ 2 codes cachés détectés!

«à notre satisfaction»
→ Signifie: PASSABLE (Note 3/5)
→ Bien: «entière satisfaction»

«compréhension pour collègues»
→ Signifie: CONFLITS en équipe
→ Bien: «travaillé harmonieusement»

Évaluation globale: 2.5/5 ⚠️
→ Ne PAS soumettre ce certificat!`,
`⚠️ 2 codici nascosti rilevati!

«a nostra soddisfazione»
→ Significa: SUFFICIENTE (Voto 3/5)
→ Bene sarebbe: «piena soddisfazione»

«mostrato comprensione per colleghi»
→ Significa: CONFLITTI nel team
→ Bene: «collaborato armoniosamente»

Valutazione complessiva: 2.5/5 ⚠️
→ NON presentare questo certificato!`)
    },
    {
      id:"jobmatch", ico:"🎯",
      label:L("Job-Matching","Job Matching","Matching emploi","Job Matching"),
      badge:"PRO", badgeCol:"#10b981",
      input:[{l:L("Dein Profil","Your profile","Votre profil","Il tuo profilo"),v:L("Marketing Manager, 6 J., FMCG, Zürich, 100k+","Marketing Manager, 6y, FMCG, Zürich, 100k+","Responsable Marketing, 6 ans, FMCG, Zurich","Marketing Manager, 6 anni, FMCG, Zurigo")}],
      output:L(
`🎯 Deine Top 5 Job-Matches:

1. Head of Marketing – Nestlé Vevey       92% ✅
2. Brand Manager – Lindt Kilchberg         88% ✅
3. Marketing Director – Migros Zürich      85% ✅
4. CMO – Feldschlösschen Rheinfelden       79% 
5. Senior Brand Lead – Emmi Luzern         74%

💡 Warum Nestlé an #1:
✓ FMCG-Erfahrung ist perfekt
✓ Gehaltsniveau passt (CHF 110-130k)
✓ Standort Vevey: 1h von Zürich
✓ Deine Sprachkenntnisse gesucht

Nächster Schritt: Bewerbung für Nestlé →`,
`🎯 Your Top 5 Job Matches:

1. Head of Marketing – Nestlé Vevey       92% ✅
2. Brand Manager – Lindt Kilchberg         88% ✅
3. Marketing Director – Migros Zürich      85% ✅
4. CMO – Feldschlösschen Rheinfelden       79%
5. Senior Brand Lead – Emmi Lucerne        74%

💡 Why Nestlé at #1:
✓ FMCG experience is perfect match
✓ Salary level fits (CHF 110-130k)
✓ Location Vevey: 1h from Zürich
✓ Your language skills in demand

Next step: Apply for Nestlé →`,
`🎯 Vos 5 Meilleurs Emplois:

1. Head of Marketing – Nestlé Vevey       92% ✅
2. Brand Manager – Lindt Kilchberg         88% ✅
3. Directeur Marketing – Migros Zürich     85% ✅
4. CMO – Feldschlösschen               79%
5. Senior Brand Lead – Emmi Lucerne    74%

💡 Pourquoi Nestlé en #1:
✓ Expérience FMCG parfaite
✓ Salaire adapté (CHF 110-130k)
✓ Vevey: 1h de Zurich`,
`🎯 I Tuoi Top 5 Lavori:

1. Head of Marketing – Nestlé Vevey       92% ✅
2. Brand Manager – Lindt Kilchberg         88% ✅
3. Marketing Director – Migros Zürich      85% ✅
4. CMO – Feldschlösschen               79%
5. Senior Brand Lead – Emmi Lucerna    74%

💡 Perché Nestlé al #1:
✓ Esperienza FMCG perfetta
✓ Livello salariale adatto (CHF 110-130k)
✓ Posizione Vevey: 1h da Zurigo`)
    },
    {
      id:"coach", ico:"🎤",
      label:L("Interview-Coach","Interview Coach","Coach entretien","Coach colloquio"),
      badge:"PRO", badgeCol:"#a78bfa",
      input:[{l:L("Simulierte Frage","Simulated question","Question simulée","Domanda simulata"),v:L("«Wo sehen Sie sich in 5 Jahren?»","«Where do you see yourself in 5 years?»","«Où vous voyez-vous dans 5 ans?»","«Dove si vede tra 5 anni?»")},{l:L("Deine Antwort","Your answer","Votre réponse","La sua risposta"),v:L("Ich möchte wachsen und mehr Verantwortung übernehmen.","I want to grow and take on more responsibility.","Je veux évoluer et prendre plus de responsabilités.","Voglio crescere e assumere più responsabilità.")}],
      output:L(
`📊 Bewertung: 61/100 – Ausbaufähig

✓ Positiv:
  Ambition klar erkennbar

✗ Schwach:
  Zu vage – kein Bezug zur Stelle
  Kein konkreter Plan genannt
  Klingt nach jedem Bewerber

💡 Bessere Antwort:
«In 5 Jahren sehe ich mich in einer Führungsrolle im Marketing bei einem FMCG-Unternehmen. Bei Migros möchte ich zuerst die Marke XY mit aufbauen, dann ein Team von 3–5 Personen leiten. Das deckt sich mit Ihrer Wachstumsstrategie Schweiz 2028.»

→ Score mit verbesserter Antwort: 89/100 ✅`,
`📊 Score: 61/100 – Needs improvement

✓ Positive:
  Ambition clearly visible

✗ Weak:
  Too vague – no reference to the role
  No concrete plan mentioned
  Sounds like every applicant

💡 Better answer:
«In 5 years I see myself in a marketing leadership role at an FMCG company. At Migros I'd first help build brand XY, then lead a team of 3–5 people. This aligns with your Switzerland 2028 growth strategy.»

→ Score with improved answer: 89/100 ✅`,
`📊 Score: 61/100 – À améliorer

✓ Positif:
  Ambition clairement visible

✗ Faible:
  Trop vague – pas de lien avec le poste
  Aucun plan concret

💡 Meilleure réponse:
«Dans 5 ans, je me vois dans un rôle de leadership marketing. Chez Migros, je souhaite d'abord développer la marque XY, puis diriger une équipe de 3-5 personnes.»

→ Score amélioré: 89/100 ✅`,
`📊 Punteggio: 61/100 – Da migliorare

✓ Positivo:
  Ambizione chiaramente visibile

✗ Debole:
  Troppo vago – nessun riferimento al ruolo
  Nessun piano concreto

💡 Risposta migliore:
«Tra 5 anni mi vedo in un ruolo di leadership nel marketing. Da Migros vorrei prima sviluppare il marchio XY, poi guidare un team di 3-5 persone.»

→ Punteggio migliorato: 89/100 ✅`)
    },
  ];
  const demo = demos[demoTab];
  return (
    <div>
      {/* Tool Tabs */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
        {demos.map((d,i)=>(
          <button key={i} onClick={()=>setDemoTab(i)} style={{padding:"8px 14px",borderRadius:10,border:`1.5px solid ${i===demoTab?"rgba(16,185,129,.5)":"rgba(255,255,255,.08)"}`,background:i===demoTab?"rgba(16,185,129,.12)":"rgba(255,255,255,.03)",color:i===demoTab?"var(--em)":"rgba(255,255,255,.35)",fontFamily:"var(--hd)",fontWeight:700,fontSize:12,cursor:"pointer",transition:"all .18s",display:"flex",alignItems:"center",gap:6,gridColumn:(i===demos.length-1&&demos.length%2!==0)?"span 2":"span 1",justifyContent:"flex-start"}}>
            <span>{d.ico}</span><span style={{flex:1,textAlign:"left"}}>{d.label}</span>
            <span style={{fontSize:10,background:d.badgeCol+"33",color:d.badgeCol,padding:"1px 7px",borderRadius:20,fontWeight:700,flexShrink:0}}>{d.badge}</span>
          </button>
        ))}
      </div>
      {/* Demo Card */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.7fr",gap:14,alignItems:"start"}}>
        {/* Input */}
        <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:16,padding:20}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",color:"rgba(255,255,255,.18)",marginBottom:12}}>{lang==="de"?"EINGABE":"INPUT"}</div>
          {demo.input.map((inp,i)=>(
            <div key={i} style={{marginBottom:10}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,.28)",marginBottom:3}}>{inp.l}</div>
              <div style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.06)",borderRadius:8,padding:"8px 11px",fontSize:12,color:"rgba(255,255,255,.5)",lineHeight:1.5}}>{inp.v}</div>
            </div>
          ))}
          <div style={{marginTop:14,padding:"9px 13px",background:"rgba(16,185,129,.07)",border:"1px solid rgba(16,185,129,.13)",borderRadius:8,fontSize:11,color:"rgba(16,185,129,.6)"}}>
            ⚡ {lang==="de"?"KI generiert in ~15 Sek.":lang==="en"?"AI generates in ~15 sec.":lang==="fr"?"L'IA génère en ~15 sec.":"~15 sec."}
          </div>
          <button onClick={()=>navTo(demo.id)} style={{width:"100%",marginTop:10,background:"var(--em)",color:"white",border:"none",borderRadius:9,padding:"10px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            {lang==="de"?"Selbst ausprobieren →":lang==="en"?"Try it yourself →":lang==="fr"?"Essayer →":"Prova ora →"}
          </button>
        </div>
        {/* Output */}
        <div style={{background:"rgba(255,255,255,.03)",border:"1.5px solid rgba(16,185,129,.18)",borderRadius:16,padding:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",color:"var(--em)"}}>✦ STELLIFY OUTPUT</div>
            <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"rgba(16,185,129,.4)"}}>
              <div style={{width:5,height:5,background:"var(--em)",borderRadius:"50%"}}/>
              {lang==="de"?"Live generiert":"Live generated"}
            </div>
          </div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.62)",lineHeight:1.9,whiteSpace:"pre-wrap",maxHeight:300,overflow:"hidden",maskImage:"linear-gradient(to bottom,white 70%,transparent 100%)",WebkitMaskImage:"linear-gradient(to bottom,white 70%,transparent 100%)"}}>{demo.output}</div>
        </div>
      </div>
    </div>
  );
}


function FaqSection({lang, email}) {
  const [open,setOpen]=useState(null);
  const faqs=lang==="de"?[
    {q:"Wie sicher sind meine Daten?",a:"Deine Daten werden nicht gespeichert. Jede Anfrage wird direkt an die Anthropic API gesendet und danach nicht protokolliert. Kein Training auf deinen Daten."},
    {q:"Kann ich jederzeit kündigen?",a:"Ja – du kannst monatlich kündigen, ohne Mindestlaufzeit oder versteckte Gebühren. Über Stripe verwaltest du dein Abo selbst."},
    {q:"Wie viele Generierungen habe ich?",a:`Gratis: ${C.FREE_LIMIT} Generierung${C.FREE_LIMIT!==1?"en":""} zum Testen. Pro, Familie & Team: je ${C.PRO_LIMIT} Generierungen/Monat pro Person. Das Kontingent erneuert sich am 1. des Folgemonats automatisch.`},
    {q:"Funktioniert Stellify für alle Branchen?",a:"Ja. Die KI ist auf den Schweizer Jobmarkt trainiert und kennt Gepflogenheiten aus IT, Finanzen, Gesundheit, Bildung, Gastronomie und mehr."},
    {q:"Welche Sprachen werden unterstützt?",a:"Vollständig auf Deutsch, Englisch, Französisch und Italienisch – ideal für Jobs in allen Sprachregionen der Schweiz."},
    {q:"Gibt es einen Studentenrabatt?",a:"Aktuell nicht, aber der Jahrespreis (CHF 14.90/Mo.) macht das Abo für alle erschwinglich. Meld dich bei uns für spezielle Konditionen."},
  ]:lang==="fr"?[
    {q:"Mes données sont-elles sécurisées?",a:"Vos données ne sont pas stockées. Chaque requête est envoyée directement à l'API Anthropic et n'est pas enregistrée."},
    {q:"Puis-je résilier à tout moment?",a:"Oui – résiliation mensuelle possible, sans durée minimale ni frais cachés."},
    {q:"Combien de générations par plan?",a:"Gratuit: 1 génération. Pro: 60/mois par personne. Famille: 60/mois par personne (3 personnes). Unlimited: 60/mois par personne, membres illimités. Le quota se renouvelle automatiquement le 1er du mois suivant."},
    {q:"Fonctionne pour tous les secteurs?",a:"Oui. L'IA connaît les habitudes du marché suisse dans tous les secteurs."},
    {q:"Quelles langues sont supportées?",a:"Allemand, anglais, français et italien – idéal pour toutes les régions linguistiques."},
    {q:"Y a-t-il une réduction étudiants?",a:"Pas actuellement, mais le prix annuel (CHF 14.90/mois) est accessible à tous."},
  ]:lang==="it"?[
    {q:"I miei dati sono sicuri?",a:"I tuoi dati non vengono salvati. Ogni richiesta viene inviata direttamente all'API Anthropic e non viene registrata."},
    {q:"Posso cancellare in qualsiasi momento?",a:"Sì – cancellazione mensile possibile, senza durata minima o costi nascosti."},
    {q:"Cosa succede dopo 60 generazioni?",a:"Dopo 60 generazioni Pro al mese, il limite si ripristina automaticamente il 1° del mese successivo."},
    {q:"Funziona per tutti i settori?",a:"Sì. L'IA conosce le abitudini del mercato svizzero in tutti i settori."},
    {q:"Quali lingue sono supportate?",a:"Tedesco, inglese, francese e italiano – ideale per tutte le regioni linguistiche."},
    {q:"C'è uno sconto studenti?",a:"Al momento no, ma il prezzo annuale (CHF 14.90/mese) è accessibile a tutti."},
  ]:[
    {q:"Is my data secure?",a:"Your data is not stored. Each request is sent directly to the Anthropic API and not logged. No training on your data."},
    {q:"Can I cancel at any time?",a:"Yes – monthly cancellation possible, no minimum term or hidden fees. Manage your subscription directly via Stripe."},
    {q:"What happens after 60 generations?",a:"After 60 Pro generations per month, your limit resets automatically on the 1st of the following month."},
    {q:"Does it work for all industries?",a:"Yes. The AI is trained on the Swiss job market and knows conventions across IT, finance, health, education, hospitality and more."},
    {q:"Which languages are supported?",a:"Fully available in German, English, French and Italian – ideal for jobs across all Swiss language regions."},
    {q:"Is there a student discount?",a:"Not currently, but the annual price (CHF 14.90/mo.) makes the subscription affordable for everyone."},
  ];
  return(
    <section className="sec sec-w" id="faq">
      <div className="con">
        <div className="sh shc">
          <div className="seye">{lang==="de"?"✦ Häufige Fragen":lang==="fr"?"✦ Questions fréquentes":lang==="it"?"✦ Domande frequenti":"✦ Frequently Asked Questions"}</div>
          <h2 className="st">{lang==="de"?"Alles was du wissen musst":lang==="fr"?"Tout ce que vous devez savoir":lang==="it"?"Tutto quello che devi sapere":"Everything you need to know"}</h2>
        </div>
        <div style={{maxWidth:740,margin:"0 auto",display:"flex",flexDirection:"column",gap:8}}>
          {faqs.map((faq,i)=>(
            <div key={i} style={{border:"1.5px solid",borderRadius:14,overflow:"hidden",transition:"border-color .2s",borderColor:open===i?"rgba(16,185,129,.4)":"var(--bo)"}}>
              <button onClick={()=>setOpen(open===i?null:i)} style={{width:"100%",background:open===i?"rgba(16,185,129,.04)":"white",border:"none",cursor:"pointer",padding:"18px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,textAlign:"left",fontFamily:"var(--bd)",transition:"background .18s"}}>
                <span style={{fontSize:15,fontWeight:700,color:"var(--ink)",lineHeight:1.4}}>{faq.q}</span>
                <span style={{fontSize:20,color:"var(--em)",flexShrink:0,transform:open===i?"rotate(45deg)":"none",transition:"transform .2s",fontWeight:300,lineHeight:1}}>+</span>
              </button>
              {open===i&&<div style={{padding:"14px 22px 18px",fontSize:14,color:"var(--mu)",lineHeight:1.75,borderTop:"1px solid var(--bo)",background:"rgba(16,185,129,.02)"}}>{faq.a}</div>}
            </div>
          ))}
        </div>
        <div style={{textAlign:"center",marginTop:32}}>
          <span style={{fontSize:13,color:"var(--mu)"}}>{lang==="de"?"Noch Fragen? ":lang==="fr"?"D'autres questions? ":lang==="it"?"Altre domande? ":"More questions? "}</span>
          <a href={`mailto:${email}`} style={{fontSize:13,color:"var(--em)",fontWeight:600,textDecoration:"underline"}}>{email}</a>
        </div>
      </div>
    </section>
  );
}

function DocUpload({lang, onFile, onText, file, onClear}) {
  const [loading,setLoading]=useState(false);
  const L=(d,e,f,i)=>({de:d,en:e,fr:f,it:i}[lang]||d);
  const handle=async(f)=>{
    if(!f)return; setLoading(true);
    try{
      if(f.name.endsWith(".docx")||f.name.endsWith(".doc")){
        const mammoth=await import("https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js");
        const ab=await f.arrayBuffer();
        const res=await mammoth.extractRawText({arrayBuffer:ab});
        onText(res.value,f.name);
      } else { onFile(f); }
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  };
  return file ? (
    <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
      <span style={{fontSize:18}}>{file.isImage?"🖼️":"📄"}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:600,fontSize:13,color:"#15803d",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.name}</div>
        <div style={{fontSize:11,color:"#16a34a"}}>{file.extracted?L("Text extrahiert ✓","Text extracted ✓","Texte extrait ✓","Testo estratto ✓"):L("Bereit ✓","Ready ✓","Prêt ✓","Pronto ✓")}</div>
      </div>
      <button onClick={onClear} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#6b7280"}}>✕</button>
    </div>
  ) : (
    <label style={{display:"block",cursor:"pointer",marginBottom:14}}>
      <div style={{border:"2px dashed rgba(16,185,129,.3)",borderRadius:12,padding:"14px",textAlign:"center",background:"rgba(16,185,129,.02)",transition:"all .18s"}}
        onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="var(--em)";e.currentTarget.style.background="var(--em3)"}}
        onDragLeave={e=>{e.currentTarget.style.borderColor="rgba(16,185,129,.3)";e.currentTarget.style.background="rgba(16,185,129,.02)"}}
        onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor="rgba(16,185,129,.3)";e.currentTarget.style.background="rgba(16,185,129,.02)";const f=e.dataTransfer.files[0];if(f)handle(f);}}>
        {loading?<div style={{fontSize:13,color:"var(--em)",padding:"4px 0"}}>{L("Lese Datei…","Reading file…","Lecture…","Lettura…")}</div>:<>
          <div style={{fontSize:22,marginBottom:3}}>📎</div>
          <div style={{fontSize:12,fontWeight:600,color:"var(--mu)"}}>{L("Dokument hochladen · PDF, Word, JPG, PNG","Upload document · PDF, Word, JPG, PNG","Joindre un document · PDF, Word, JPG, PNG","Carica documento · PDF, Word, JPG, PNG")}</div>
          <div style={{fontSize:11,color:"rgba(11,11,18,.28)",marginTop:2}}>{L("Ablegen oder klicken","Drop or click","Déposer ou cliquer","Trascina o clicca")}</div>
        </>}
      </div>
      <input type="file" accept=".pdf,.docx,.doc,image/jpeg,image/png,image/jpg" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handle(f);}}/>
    </label>
  );
}


// ════════════════════════════════════════
// 🍪 COOKIE BANNER
// ════════════════════════════════════════
function CookieBanner({ lang, onAccept }) {
  const L = (d,e,f,i) => ({de:d,en:e,fr:f,it:i}[lang]||d);
  const [details, setDetails] = useState(false);
  const accept = (all) => { onAccept(all); };

  return (
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:9999,background:"rgba(11,11,18,.98)",borderTop:"1px solid rgba(255,255,255,.1)",padding:"14px 16px 20px",boxShadow:"0 -8px 32px rgba(0,0,0,.5)"}}>
      <div style={{maxWidth:600,margin:"0 auto",display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <span style={{fontSize:20,flexShrink:0}}>🍪</span>
          <div>
            <div style={{fontFamily:"var(--hd)",fontSize:13,fontWeight:800,color:"white",marginBottom:4}}>
              {L("Datenschutz & Cookies","Privacy & Cookies","Confidentialité & Cookies","Privacy & Cookie")}
            </div>
            <p style={{fontSize:12,color:"rgba(255,255,255,.45)",lineHeight:1.5,margin:0}}>
              {L(
                "Wir verwenden Cookies für den Betrieb und zur Verbesserung deiner Erfahrung.",
                "We use cookies to operate the site and improve your experience.",
                "Nous utilisons des cookies pour faire fonctionner le site.",
                "Utilizziamo i cookie per il funzionamento del sito."
              )}
            </p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,width:"100%"}}>
          <button
            onClick={()=>accept(false)}
            style={{flex:1,background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.15)",color:"rgba(255,255,255,.7)",borderRadius:12,padding:"11px 8px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            {L("Nur notwendige","Essential only","Essentiels","Solo essenziali")}
          </button>
          <button
            onClick={()=>accept(true)}
            style={{flex:1,background:"var(--em)",border:"none",color:"white",borderRadius:12,padding:"11px 8px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
            {L("Alle akzeptieren ✓","Accept all ✓","Tout accepter ✓","Accetta tutti ✓")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// 💬 STELLIFY CHAT BOT
// ════════════════════════════════════════
// ════════════════════════════════════════
// 👤 MULTI-PROFIL MANAGER
const PROFILES_KEY = "stf_profiles";
const ACTIVE_PROFILE_KEY = "stf_active_profile";

function loadProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}
function saveProfiles(profiles) {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch {}
}
function loadActiveProfileId() {
  try { return localStorage.getItem(ACTIVE_PROFILE_KEY) || null; } catch { return null; }
}
function saveActiveProfileId(id) {
  try { localStorage.setItem(ACTIVE_PROFILE_KEY, id); } catch {}
}

// 💬 CHAT VERLAUF
const CHATS_KEY = "stf_chats";
const ACTIVE_CHAT_KEY = "stf_active_chat";

function loadChats() {
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}
function saveChats(chats) {
  try { localStorage.setItem(CHATS_KEY, JSON.stringify(chats)); } catch {}
}
function loadActiveChatId() {
  try { return localStorage.getItem(ACTIVE_CHAT_KEY) || null; } catch { return null; }
}
function saveActiveChatId(id) {
  try { localStorage.setItem(ACTIVE_CHAT_KEY, id); } catch {}
}
function makeChatId() { return "c" + Date.now(); }
function makeChatTitle(msgs) {
  const first = msgs.find(m => m.r === "u");
  if (!first) return "Neuer Chat";
  return first.t.slice(0, 36) + (first.t.length > 36 ? "…" : "");
}

function ChatBot({ lang, pro, setPw, navTo, authSession, onAuthOpen }) {
  const L = (d,e,f,i) => ({de:d,en:e,fr:f,it:i}[lang]||d);
  const [open, setOpen]       = useState(false);
  const [bubble, setBubble]   = useState(false);
  const [cookieDone, setCookieDone] = useState(false);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [chatUsage, setChatUsage] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef(null);

  // Chat-Verlauf State – direkt aus localStorage laden
  const [chats, setChats] = useState(() => {
    const saved = loadChats();
    return saved;
  });
  const [activeChatId, setActiveChatId] = useState(() => {
    const id = loadActiveChatId();
    // Prüfe ob der gespeicherte Chat noch existiert
    if (id) {
      const saved = loadChats();
      if (saved.find(c => c.id === id)) return id;
    }
    // Falls nicht: letzten Chat nehmen
    const saved = loadChats();
    return saved.length > 0 ? saved[0].id : null;
  });

  // Aktiver Chat Messages
  const msgs = (() => {
    const chat = chats.find(c => c.id === activeChatId);
    return chat ? chat.msgs : [];
  })();

  function setMsgs(updater) {
    setChats(prev => {
      const updated = typeof updater === "function" ? updater(msgs) : updater;
      let newChats;
      if (!activeChatId) {
        const id = makeChatId();
        saveActiveChatId(id);
        setActiveChatId(id);
        newChats = [{id, title: makeChatTitle(updated), msgs: updated, ts: Date.now()}, ...prev];
      } else {
        newChats = prev.map(c => c.id === activeChatId
          ? {...c, msgs: updated, title: makeChatTitle(updated), ts: Date.now()}
          : c
        );
        if (!newChats.find(c => c.id === activeChatId)) {
          newChats = [{id: activeChatId, title: makeChatTitle(updated), msgs: updated, ts: Date.now()}, ...prev];
        }
      }
      saveChats(newChats);
      return newChats;
    });
  }

  function newChat() {
    const id = makeChatId();
    setActiveChatId(id);
    saveActiveChatId(id);
    setShowHistory(false);
    // Grüssung direkt setzen
    const welcome = {r:"ai", t: L(
      "Hallo! Ich bin Stella 👋 Deine KI-Karriere-Assistentin von Stellify. Wie kann ich dir helfen?",
      "Hi! I'm Stella 👋 Your AI career assistant from Stellify. How can I help?",
      "Bonjour! Je suis Stella 👋 Comment puis-je vous aider?",
      "Ciao! Sono Stella 👋 Come posso aiutarti?"
    )};
    const newChats = [{id, title: "Neuer Chat", msgs: [welcome], ts: Date.now()}, ...chats];
    setChats(newChats);
    saveChats(newChats);
  }

  function deleteChat(id, e) {
    e.stopPropagation();
    const updated = chats.filter(c => c.id !== id);
    setChats(updated);
    saveChats(updated);
    if (activeChatId === id) {
      const next = updated[0];
      setActiveChatId(next ? next.id : null);
      saveActiveChatId(next ? next.id : "");
    }
  }

  function switchChat(id) {
    setActiveChatId(id);
    saveActiveChatId(id);
    setShowHistory(false);
  }

  useEffect(()=>{
    try { setCookieDone(!!localStorage.getItem("stf_cookie")); } catch{}
    const iv = setInterval(()=>{ try { if(localStorage.getItem("stf_cookie")) { setCookieDone(true); clearInterval(iv); } } catch{} },500);
    return ()=>clearInterval(iv);
  },[]);

  useEffect(()=>{ setChatUsage(getChatCount()); },[open]);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  useEffect(()=>{
    const seen = sessionStorage.getItem("stf_bubble");
    if(seen) return;
    const t = setTimeout(()=>{ setBubble(true); sessionStorage.setItem("stf_bubble","1"); }, 8000);
    return ()=>clearTimeout(t);
  },[]);

  const isLoggedIn = !!authSession;
  const canChat = isLoggedIn && (pro || chatUsage < C.CHAT_FREE_LIMIT);
  const needsLogin = !isLoggedIn;

  const SYSTEM = `Du bist Stella, die KI-Karriere-Assistentin von Stellify. Du hast tiefes Wissen über Karriere, Bewerbungen, den Schweizer Arbeitsmarkt und Produktivität.

Dein Wissen umfasst: Schweizer Bewerbungsunterlagen (Motivationsschreiben, Lebenslauf mit Foto, 1-2 Seiten), ATS-Optimierung, Schweizer Arbeitsrecht (Kündigungsfristen, Sperrfristen, Zeugnis-Code: \"stets zu vollsten Zufriedenheit\"=sehr gut), Gehälter nach Branche/Erfahrung, LinkedIn-Optimierung, Interview-Vorbereitung (STAR-Methode), Gehaltsverhandlungs-Taktiken, Schweizer Bildungssystem (EFZ, FH, Uni, CAS/MAS).

Tools von Stellify:
✍️ Bewerbungen (1× gratis), 💼 LinkedIn Optimierung, 🤖 ATS-Simulation, 📜 Zeugnis-Analyse, 🎯 Job-Matching, 🎤 Interview-Coach, 📊 Excel-Generator, 📽️ PowerPoint-Maker, 💰 Gehaltsverhandlung, 🤝 Networking-Nachricht, 📤 Kündigung schreiben, 🗓️ 30-60-90-Tage-Plan, 🏆 Referenzschreiben, 📚 Lernplan, 📝 Zusammenfassung, 🎓 Lehrstelle, ✉️ E-Mail, 📋 Protokoll, 🌍 Übersetzer, 💰 KI-Gehaltsrechner Schweiz, 📋 Bewerbungs-Tracker, ✍️ LinkedIn-Post Generator

Verhalten: Antworte konkret und umsetzbar (max. 3-4 Sätze im Widget). Schreib Beispieltexte direkt aus wenn gefragt. Empfehle Tool-Namen exakt wie oben damit Links funktionieren. Sei warm, direkt, wie ein erfahrener Karriere-Coach.`;

  const TOOL_MAP = {
    "bewerbung":["✍️ Bewerbungen","app"], "bewerbungen":["✍️ Bewerbungen","app"],
    "linkedin":["💼 LinkedIn","linkedin"], "ats":["🤖 ATS-Simulation","ats"],
    "zeugnis":["📜 Zeugnis-Analyse","zeugnis"], "job-matching":["🎯 Job-Matching","jobmatch"],
    "interview":["🎤 Interview-Coach","coach"], "excel":["📊 Excel-Generator","excel"],
    "powerpoint":["📽️ PowerPoint-Maker","pptx"], "gehalt":["💰 Gehaltsverhandlung","gehalt"],
    "networking":["🤝 Networking","networking"], "kündigung":["📤 Kündigung","kuendigung"],
    "30-60-90":["🗓️ 30-60-90-Plan","plan306090"], "referenz":["🏆 Referenzschreiben","referenz"],
    "lernplan":["📚 Lernplan","lernplan"], "zusammenfassung":["📝 Zusammenfassung","zusammenfassung"],
    "lehrstelle":["🎓 Lehrstelle","lehrstelle"], "e-mail":["✉️ E-Mail","email"],
    "protokoll":["📋 Protokoll","protokoll"], "übersetzer":["🌍 Übersetzer","uebersetzer"],
    "gehaltsrechner":["💰 KI-Gehaltsrechner","gehaltsrechner"],
    "tracker":["📋 Bewerbungs-Tracker","tracker"],
    "linkedin-post":["✍️ LinkedIn-Post","lipost"],
  };

  const renderMsg = (text) => {
    const parts = [];
    let remaining = text;
    Object.entries(TOOL_MAP).forEach(([key,[label,page]])=>{
      remaining = remaining.replace(new RegExp(`(${label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`, "gi"),
        `<TOOL:${page}:${label}>`);
    });
    const segments = remaining.split(/(<TOOL:[^>]+>)/);
    return segments.map((seg,i)=>{
      const m = seg.match(/^<TOOL:([^:]+):(.+)>$/);
      if(m) return <button key={i} onClick={()=>{setOpen(false);navTo(m[1]);}}
        style={{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(16,185,129,.15)",border:"1px solid rgba(16,185,129,.3)",borderRadius:8,padding:"2px 9px",fontSize:12,fontWeight:700,color:"var(--em)",cursor:"pointer",margin:"1px 2px"}}>
        {m[2]} →</button>;
      return <span key={i}>{seg}</span>;
    });
  };

  const send = async () => {
    if(!input.trim()||loading) return;
    if(needsLogin){ onAuthOpen && onAuthOpen(); return; }
    if(!canChat){ setPw(true); return; }
    const userMsg = input.trim();
    setInput("");
    const newMsgs = [...msgs, {r:"u", t:userMsg}];
    setMsgs(newMsgs);
    setLoading(true);
    if(!pro){ incChat(); setChatUsage(c=>c+1); }
    try {
      const apiMsgs = [];
      for(const m of newMsgs) {
        const role = m.r==="u" ? "user" : "assistant";
        if(apiMsgs.length > 0 && apiMsgs[apiMsgs.length-1].role === role) continue;
        apiMsgs.push({role, content: m.t});
      }
      while(apiMsgs.length && apiMsgs[0].role !== "user") apiMsgs.shift();
      const finalMsgs = apiMsgs.slice(-10);
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: groqHeaders(),
        body: JSON.stringify({
          model: C.MODEL_FAST,
          max_tokens: 600,
          messages: [{role:"system",content:SYSTEM}, ...finalMsgs]
        })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
      const reply = data.choices?.[0]?.message?.content || "Bitte nochmals versuchen.";
      setMsgs(m=>[...m, {r:"ai", t:reply}]);
    } catch(e) {
      setMsgs(m=>[...m, {r:"ai", t:`⚠️ ${e.message}`}]);
    } finally {
      setLoading(false);
    }
  };

  const remaining = pro ? "∞" : Math.max(0, C.CHAT_FREE_LIMIT - chatUsage);

  const openChat = () => {
    setBubble(false);
    // Lade gespeicherten Chat falls vorhanden, sonst neuen starten
    if (!open) {
      const savedChats = loadChats();
      const savedActiveId = loadActiveChatId();
      const existingChat = savedActiveId && savedChats.find(c => c.id === savedActiveId);
      if (existingChat) {
        // Gespeicherten Chat wiederherstellen
        if (chats.length === 0) setChats(savedChats);
        if (!activeChatId) setActiveChatId(savedActiveId);
      } else if (msgs.length === 0 && !activeChatId) {
        newChat();
      }
    }
    setOpen(o=>!o);
  };

  const fmtDate = (ts) => {
    if(!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if(diff < 86400000) return d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
    if(diff < 604800000) return d.toLocaleDateString("de-CH",{weekday:"short"});
    return d.toLocaleDateString("de-CH",{day:"2-digit",month:"2-digit"});
  };

  return (<>
    {/* Auto-Bubble */}
    {cookieDone&&bubble&&!open&&<div style={{position:"fixed",bottom:90,right:20,maxWidth:220,background:"var(--dk2)",border:"1px solid rgba(16,185,129,.3)",borderRadius:"14px 14px 4px 14px",padding:"11px 14px",zIndex:1002,boxShadow:"0 8px 32px rgba(0,0,0,.4)",cursor:"pointer",animation:"fadeSlideUp .4s ease"}}
      onClick={openChat}>
      <button onClick={e=>{e.stopPropagation();setBubble(false);}} style={{position:"absolute",top:6,right:8,background:"none",border:"none",color:"rgba(255,255,255,.3)",fontSize:12,cursor:"pointer",lineHeight:1}}>✕</button>
      <div style={{fontSize:13,color:"rgba(255,255,255,.85)",lineHeight:1.5,paddingRight:12}}>
        {L("Hallo 👋 Welches Tool passt zu dir? Frag mich!","Hi 👋 Which tool suits you? Ask me!","Bonjour 👋 Quel outil vous convient?","Ciao 👋 Quale tool fa per te?")}
      </div>
      <div style={{fontSize:11,color:"var(--em)",fontWeight:600,marginTop:5}}>{L("Mit Stella chatten →","Chat with Stella →","Discuter avec Stella →","Chatta con Stella →")}</div>
    </div>}

    {/* Floating Button */}
    {cookieDone&&<button onClick={openChat}
      style={{position:"fixed",bottom:open?248:24,right:24,width:56,height:56,borderRadius:"50%",background:"var(--em)",border:"none",cursor:"pointer",zIndex:1001,boxShadow:"0 4px 20px rgba(16,185,129,.45)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,transition:"all .3s",transform:open?"rotate(10deg)":"none"}}>
      {open?"✕":"💬"}
      {bubble&&!open&&<div style={{position:"absolute",top:0,right:0,width:14,height:14,borderRadius:"50%",background:"#ef4444",border:"2px solid white"}}/>}
    </button>}

    {/* Chat Window */}
    {open&&<div style={{position:"fixed",bottom:92,right:24,width:360,maxWidth:"calc(100vw - 32px)",background:"var(--dk2)",border:"1px solid rgba(255,255,255,.1)",borderRadius:20,boxShadow:"0 20px 60px rgba(0,0,0,.5)",zIndex:1000,display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,rgba(16,185,129,.2),rgba(16,185,129,.08))",borderBottom:"1px solid rgba(255,255,255,.07)",padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:34,height:34,background:"var(--em)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🤖</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"var(--hd)",fontSize:13,fontWeight:800,color:"white"}}>Stella – Stellify</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>
            {pro ? L("Pro · Unbegrenzt","Pro · Unlimited","Pro · Illimité","Pro · Illimitato")
                 : `${remaining}/${C.CHAT_FREE_LIMIT} ${L("Nachrichten","messages","messages","messaggi")}`}
          </div>
        </div>
        {/* Verlauf Button */}
        <button onClick={()=>setShowHistory(h=>!h)} title={L("Verlauf","History","Historique","Cronologia")}
          style={{background:showHistory?"rgba(16,185,129,.25)":"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:14,color:showHistory?"var(--em)":"rgba(255,255,255,.6)",flexShrink:0,transition:"all .2s"}}>
          🕐
        </button>
        {/* Neuer Chat */}
        <button onClick={newChat} title={L("Neuer Chat","New chat","Nouveau chat","Nuova chat")}
          style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:14,color:"rgba(255,255,255,.6)",flexShrink:0,transition:"all .2s"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.15)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.08)"}>
          ✏️
        </button>
        <div style={{width:8,height:8,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 6px #22c55e",flexShrink:0}}/>
      </div>

      {/* Chat-Verlauf Panel */}
      {showHistory && (
        <div style={{background:"rgba(7,7,14,.98)",borderBottom:"1px solid rgba(255,255,255,.07)",maxHeight:260,overflowY:"auto"}}>
          <div style={{padding:"10px 14px 6px",fontSize:10,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:"rgba(255,255,255,.25)"}}>{L("Verlauf","History","Historique","Cronologia")}</div>
          {chats.length === 0 && (
            <div style={{padding:"14px",fontSize:12,color:"rgba(255,255,255,.3)",textAlign:"center"}}>{L("Noch keine Chats","No chats yet","Pas encore de chats","Nessuna chat")}</div>
          )}
          {chats.map(chat => (
            <div key={chat.id} onClick={()=>switchChat(chat.id)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",cursor:"pointer",background:chat.id===activeChatId?"rgba(16,185,129,.1)":"transparent",borderLeft:`2px solid ${chat.id===activeChatId?"var(--em)":"transparent"}`,transition:"all .15s"}}
              onMouseEnter={e=>{if(chat.id!==activeChatId)e.currentTarget.style.background="rgba(255,255,255,.04)";}}
              onMouseLeave={e=>{if(chat.id!==activeChatId)e.currentTarget.style.background="transparent";}}>
              <div style={{fontSize:14,flexShrink:0}}>💬</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:chat.id===activeChatId?"var(--em)":"rgba(255,255,255,.75)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{chat.title||"Chat"}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.25)",marginTop:1}}>{fmtDate(chat.ts)} · {chat.msgs.length} {L("Nachrichten","messages","messages","messaggi")}</div>
              </div>
              <button onClick={e=>deleteChat(chat.id,e)}
                style={{background:"none",border:"none",color:"rgba(255,255,255,.2)",cursor:"pointer",fontSize:12,padding:"2px 4px",borderRadius:4,flexShrink:0,transition:"color .15s"}}
                onMouseEnter={e=>e.currentTarget.style.color="#ef4444"}
                onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,.2)"}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Login Gate */}
      {!showHistory && needsLogin && (
        <div style={{padding:"28px 20px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
          <div style={{fontSize:36}}>🔐</div>
          <div style={{fontFamily:"var(--hd)",fontSize:15,fontWeight:800,color:"white"}}>
            {lang==="de"?"Einloggen zum Chatten":lang==="fr"?"Connexion pour chatter":"Sign in to chat"}
          </div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.4)",lineHeight:1.6}}>
            {lang==="de"?"20 kostenlose Fragen an Stella – registriere dich gratis.":lang==="fr"?"20 questions gratuites – inscrivez-vous.":"20 free questions for Stella – register free."}
          </div>
          <button onClick={()=>onAuthOpen&&onAuthOpen()} className="btn b-em b-w" style={{fontSize:13}}>
            {lang==="de"?"Einloggen / Registrieren →":lang==="fr"?"Connexion / Inscription →":"Sign in / Register →"}
          </button>
          <div style={{fontSize:11,color:"rgba(255,255,255,.2)"}}>
            {lang==="de"?"Kein Abo nötig · Sofort starten":"No subscription needed · Start instantly"}
          </div>
        </div>
      )}

      {/* Messages */}
      {!showHistory && !needsLogin && <>
        <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10,maxHeight:320,minHeight:200}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:"flex",gap:8,flexDirection:m.r==="u"?"row-reverse":"row",alignItems:"flex-start"}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:m.r==="u"?"rgba(16,185,129,.2)":"rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{m.r==="u"?"👤":"🤖"}</div>
              <div style={{maxWidth:"78%",background:m.r==="u"?"rgba(16,185,129,.15)":"rgba(255,255,255,.05)",border:`1px solid ${m.r==="u"?"rgba(16,185,129,.25)":"rgba(255,255,255,.07)"}`,borderRadius:m.r==="u"?"14px 14px 4px 14px":"14px 14px 14px 4px",padding:"9px 12px",fontSize:13,color:"rgba(255,255,255,.85)",lineHeight:1.6}}>
                {m.r==="ai"?renderMsg(m.t):m.t}
              </div>
            </div>
          ))}
          {loading&&<div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🤖</div>
            <div style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.07)",borderRadius:"14px 14px 14px 4px",padding:"9px 12px"}}>
              <div style={{display:"flex",gap:4}}>{[0,1,2].map(j=><div key={j} style={{width:6,height:6,borderRadius:"50%",background:"var(--em)",opacity:.7,animation:`pulse 1.2s ease-in-out ${j*0.2}s infinite`}}/>)}</div>
            </div>
          </div>}
          <div ref={bottomRef}/>
        </div>

        {!canChat&&<div style={{padding:"10px 14px",background:"rgba(245,158,11,.08)",borderTop:"1px solid rgba(245,158,11,.15)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <div style={{fontSize:12,color:"rgba(245,158,11,.8)"}}>{L("Gratis-Limit erreicht","Free limit reached","Limite gratuit atteint","Limite raggiunto")}</div>
          <button onClick={()=>setPw(true)} style={{background:"var(--am)",color:"white",border:"none",borderRadius:8,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>Pro {L("freischalten","unlock","activer","sblocca")} →</button>
        </div>}

        <div style={{borderTop:"1px solid rgba(255,255,255,.07)",padding:"10px 12px",display:"flex",gap:8,alignItems:"flex-end"}}>
          <textarea value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!loading&&canChat){e.preventDefault();send();}}}
            placeholder={canChat ? L("Frag mich etwas…","Ask me anything…","Posez-moi une question…","Chiedimi qualcosa…") : L("Pro freischalten…","Unlock Pro…","Activer Pro…","Sblocca Pro…")}
            disabled={!canChat||loading}
            style={{flex:1,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,padding:"8px 11px",fontSize:13,color:"white",resize:"none",minHeight:36,maxHeight:90,outline:"none",lineHeight:1.5}}
            rows={1}/>
          <button onClick={send} disabled={!input.trim()||loading||!canChat}
            style={{width:36,height:36,borderRadius:10,background:input.trim()&&canChat?"var(--em)":"rgba(255,255,255,.08)",border:"none",cursor:input.trim()&&canChat?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,transition:"background .2s"}}>
            {loading?"⏳":"➤"}
          </button>
        </div>
      </>}
    </div>}

    <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.3);opacity:1}}@keyframes fadeSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
  </>);
}
// ════════════════════════════════════════
// 📋 BEWERBUNGS-TRACKER
function BewerbungsTracker({lang, pro, setPw, navTo}) {
  const L=(d,e,f,i)=>({de:d,en:e,fr:f,it:i}[lang]||d);
  const STATUS = {
    beworben:  {de:"Beworben",       en:"Applied",       fr:"Postulé",      it:"Candidato",    col:"#3b82f6", bg:"rgba(59,130,246,.1)"},
    pruefung:  {de:"In Prüfung",     en:"Under review",  fr:"En cours",     it:"In esame",     col:"#f59e0b", bg:"rgba(245,158,11,.1)"},
    interview: {de:"Interview",      en:"Interview",     fr:"Entretien",    it:"Colloquio",    col:"#8b5cf6", bg:"rgba(139,92,246,.1)"},
    angebot:   {de:"Angebot",        en:"Offer",         fr:"Offre",        it:"Offerta",      col:"#10b981", bg:"rgba(16,185,129,.1)"},
    abgelehnt: {de:"Abgelehnt",      en:"Rejected",      fr:"Refusé",       it:"Rifiutato",    col:"#ef4444", bg:"rgba(239,68,68,.1)"},
    zurueck:   {de:"Zurückgezogen",  en:"Withdrawn",     fr:"Retiré",       it:"Ritirato",     col:"#6b7280", bg:"rgba(107,114,128,.1)"},
  };
  const DEMO = [
    {id:1, firma:"Migros", stelle:"Product Manager", datum:"2026-02-15", status:"interview", prio:"hoch", notiz:"2. Interview am 20.3."},
    {id:2, firma:"Swiss Re", stelle:"Risk Analyst", datum:"2026-02-20", status:"pruefung", prio:"mittel", notiz:""},
    {id:3, firma:"Nestlé", stelle:"Marketing Manager", datum:"2026-03-01", status:"beworben", prio:"tief", notiz:"Über LinkedIn beworben"},
  ];
  const [jobs, setJobs] = useState(DEMO);
  const [filter, setFilter] = useState("alle");
  const [modal, setModal] = useState(null); // null | {mode:"add"} | {mode:"edit", job}
  const [form, setForm] = useState({firma:"",stelle:"",datum:"",status:"beworben",prio:"mittel",notiz:""});

  const filtered = filter==="alle" ? jobs : jobs.filter(j=>j.status===filter);
  const stats = Object.keys(STATUS).map(k=>({key:k, label:STATUS[k][lang]||STATUS[k].de, count:jobs.filter(j=>j.status===k).length, col:STATUS[k].col}));

  function openAdd() { setForm({firma:"",stelle:"",datum:new Date().toISOString().slice(0,10),status:"beworben",prio:"mittel",notiz:""}); setModal({mode:"add"}); }
  function openEdit(job) { setForm({...job}); setModal({mode:"edit",job}); }
  function save() {
    if(!form.firma||!form.stelle) return;
    if(modal.mode==="add") setJobs(j=>[...j,{...form,id:Date.now()}]);
    else setJobs(j=>j.map(x=>x.id===modal.job.id?{...form,id:x.id}:x));
    setModal(null);
  }
  function del(id) { setJobs(j=>j.filter(x=>x.id!==id)); }
  function changeStatus(id,st) { setJobs(j=>j.map(x=>x.id===id?{...x,status:st}:x)); }

  const prioCol = {hoch:"#ef4444",mittel:"#f59e0b",tief:"#6b7280"};

  return (
    <div style={{minHeight:"80vh",background:"var(--bg)"}}>
      {/* Header */}
      <div className="page-hdr dk" style={{paddingBottom:32}}>
        <div className="con" style={{maxWidth:900}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <button onClick={()=>navTo("landing")} style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.15)",color:"rgba(255,255,255,.7)",borderRadius:8,padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:"var(--bd)"}}>← {L("Zurück","Back","Retour","Indietro")}</button>
            {!pro && <span style={{background:"linear-gradient(135deg,#10b981,#059669)",color:"white",fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20}}>PRO</span>}
          </div>
          <h1>📋 {L("Bewerbungs-Tracker","Application Tracker","Suivi des candidatures","Tracker candidature")}</h1>
          <p>{L("Alle Bewerbungen im Überblick – Status, Priorität, Notizen.","All applications at a glance – status, priority, notes.","Toutes les candidatures – statut, priorité, notes.","Tutte le candidature – stato, priorità, note.")}</p>
        </div>
      </div>

      {!pro ? (
        <div className="abody" style={{maxWidth:640,textAlign:"center"}}>
          <div className="ipw">
            <h3>📋 {L("Bewerbungs-Tracker freischalten","Unlock Application Tracker","Débloquer le tracker","Sblocca il tracker")}</h3>
            <p>{L("Behalte alle Bewerbungen im Blick. Status, Priorität, Notizen – alles an einem Ort.","Keep all applications in view. Status, priority, notes – all in one place.","Suivez toutes vos candidatures. Statut, priorité, notes – tout en un.","Tieni traccia di tutte le candidature. Stato, priorità, note – tutto in un posto.")}</p>
            <div className="ipw-pr">CHF {C.priceM}<span>/Mo.</span></div>
            <div className="ipw-fts">
              {["📋 Tracker","✍️ Bewerbungen","🤖 ATS","📜 Zeugnis","🎯 Matching"].map(f=><span key={f} className="ipw-ft">✓ {f}</span>)}
            </div>
            <button className="btn b-em b-lg b-w" onClick={()=>setPw(true)}>✦ {L("Pro freischalten →","Unlock Pro →","Activer Pro →","Attiva Pro →")}</button>
          </div>
        </div>
      ) : (
        <div style={{maxWidth:900,margin:"0 auto",padding:"32px 20px 80px"}}>
          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10,marginBottom:24}}>
            <div onClick={()=>setFilter("alle")} style={{cursor:"pointer",padding:"14px 16px",background:filter==="alle"?"var(--ink)":"white",border:"1.5px solid "+(filter==="alle"?"var(--ink)":"var(--bo)"),borderRadius:12,textAlign:"center"}}>
              <div style={{fontFamily:"var(--hd)",fontSize:26,fontWeight:800,color:filter==="alle"?"white":"var(--ink)"}}>{jobs.length}</div>
              <div style={{fontSize:11,color:filter==="alle"?"rgba(255,255,255,.6)":"var(--mu)",marginTop:3}}>{L("Alle","All","Toutes","Tutte")}</div>
            </div>
            {stats.map(s=>(
              <div key={s.key} onClick={()=>setFilter(filter===s.key?"alle":s.key)} style={{cursor:"pointer",padding:"14px 16px",background:filter===s.key?s.col:"white",border:"1.5px solid "+(filter===s.key?s.col:"var(--bo)"),borderRadius:12,textAlign:"center",transition:"all .18s"}}>
                <div style={{fontFamily:"var(--hd)",fontSize:26,fontWeight:800,color:filter===s.key?"white":s.col}}>{s.count}</div>
                <div style={{fontSize:11,color:filter===s.key?"rgba(255,255,255,.7)":"var(--mu)",marginTop:3}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Add button */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:13,color:"var(--mu)"}}>{filtered.length} {L("Einträge","entries","entrées","voci")}</div>
            <button className="btn b-em b-sm" onClick={openAdd}>+ {L("Neue Bewerbung","New application","Nouvelle candidature","Nuova candidatura")}</button>
          </div>

          {/* List */}
          {filtered.length===0 ? (
            <div style={{textAlign:"center",padding:"48px 20px",color:"var(--mu)",fontSize:14}}>
              {L("Keine Bewerbungen in dieser Kategorie.","No applications in this category.","Aucune candidature dans cette catégorie.","Nessuna candidatura in questa categoria.")}
            </div>
          ) : filtered.map(job=>(
            <div key={job.id} style={{background:"white",border:"1.5px solid var(--bo)",borderRadius:14,padding:"16px 20px",marginBottom:10,display:"flex",flexWrap:"wrap",gap:12,alignItems:"flex-start",transition:"box-shadow .18s"}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <div style={{fontFamily:"var(--hd)",fontSize:16,fontWeight:700}}>{job.stelle}</div>
                  <div style={{width:8,height:8,borderRadius:"50%",background:prioCol[job.prio],flexShrink:0}} title={job.prio}/>
                </div>
                <div style={{fontSize:13,color:"var(--mu)",marginBottom:job.notiz?6:0}}>{job.firma} · {job.datum}</div>
                {job.notiz && <div style={{fontSize:12,color:"var(--mu)",background:"var(--bos)",borderRadius:6,padding:"4px 9px",display:"inline-block"}}>{job.notiz}</div>}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
                <select value={job.status} onChange={e=>changeStatus(job.id,e.target.value)}
                  style={{padding:"5px 10px",borderRadius:8,border:"1.5px solid",borderColor:STATUS[job.status].col,background:STATUS[job.status].bg,color:STATUS[job.status].col,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"var(--bd)"}}>
                  {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v[lang]||v.de}</option>)}
                </select>
                <button onClick={()=>openEdit(job)} style={{background:"none",border:"1px solid var(--bo)",borderRadius:8,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"var(--bd)",color:"var(--ink)"}}>✏️</button>
                <button onClick={()=>del(job.id)} style={{background:"none",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,padding:"5px 10px",fontSize:12,cursor:"pointer",color:"#ef4444",fontFamily:"var(--bd)"}}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="mod" style={{maxWidth:520}}>
            <h2 style={{marginBottom:20}}>{modal.mode==="add"?L("Neue Bewerbung","New application","Nouvelle candidature","Nuova candidatura"):L("Bearbeiten","Edit","Modifier","Modifica")}</h2>
            <div className="fg2" style={{textAlign:"left"}}>
              <div className="field"><label>{L("Stelle *","Position *","Poste *","Posizione *")}</label><input value={form.stelle} onChange={e=>setForm(f=>({...f,stelle:e.target.value}))} placeholder={L("z.B. Product Manager","e.g. Product Manager","ex. Chef de produit","es. Product Manager")}/></div>
              <div className="field"><label>{L("Firma *","Company *","Entreprise *","Azienda *")}</label><input value={form.firma} onChange={e=>setForm(f=>({...f,firma:e.target.value}))} placeholder={L("z.B. Nestlé AG","e.g. Nestlé AG","ex. Nestlé SA","es. Nestlé SA")}/></div>
              <div className="field"><label>{L("Datum","Date","Date","Data")}</label><input type="date" value={form.datum} onChange={e=>setForm(f=>({...f,datum:e.target.value}))}/></div>
              <div className="field"><label>Status</label>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={{width:"100%",padding:"10px 13px",border:"1.5px solid var(--bo)",borderRadius:10,fontFamily:"var(--bd)",fontSize:14,background:"#fafafa"}}>
                  {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v[lang]||v.de}</option>)}
                </select>
              </div>
              <div className="field"><label>{L("Priorität","Priority","Priorité","Priorità")}</label>
                <select value={form.prio} onChange={e=>setForm(f=>({...f,prio:e.target.value}))} style={{width:"100%",padding:"10px 13px",border:"1.5px solid var(--bo)",borderRadius:10,fontFamily:"var(--bd)",fontSize:14,background:"#fafafa"}}>
                  <option value="hoch">{L("Hoch","High","Haute","Alta")}</option>
                  <option value="mittel">{L("Mittel","Medium","Moyenne","Media")}</option>
                  <option value="tief">{L("Tief","Low","Basse","Bassa")}</option>
                </select>
              </div>
            </div>
            <div className="field" style={{textAlign:"left",marginTop:12}}>
              <label>{L("Notiz","Note","Note","Nota")}</label>
              <textarea value={form.notiz} onChange={e=>setForm(f=>({...f,notiz:e.target.value}))} placeholder={L("z.B. Nächster Schritt, Kontaktperson…","e.g. Next step, contact person…","ex. Prochaine étape, contact…","es. Prossimo passo, contatto…")} style={{width:"100%",padding:"10px 13px",border:"1.5px solid var(--bo)",borderRadius:10,fontFamily:"var(--bd)",fontSize:14,background:"#fafafa",minHeight:64,resize:"none"}}/>
            </div>
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button className="btn b-outd" style={{flex:1}} onClick={()=>setModal(null)}>{L("Abbrechen","Cancel","Annuler","Annulla")}</button>
              <button className="btn b-em" style={{flex:1}} onClick={save} disabled={!form.firma||!form.stelle}>{L("Speichern","Save","Enregistrer","Salva")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════
// 🔐 AUTH MODAL (Login / Registrierung / Admin)
// ════════════════════════════════════════
// 🔑 AUTH MODAL – Google / Apple / LinkedIn + E-Mail
// ════════════════════════════════════════
function AuthModal({ lang, onClose, onSuccess, defaultMode="login" }) {
  const L=(d,e,f,i)=>({de:d,en:e,fr:f,it:i}[lang]||d);
  const [mode, setMode] = useState(defaultMode);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");

  // Social-Login: Inline-Eingabe statt window.prompt (funktioniert in jedem Browser/iframe)
  const [socialStep, setSocialStep] = useState(null); // null | "google" | "apple" | "linkedin"
  const [socialEmail, setSocialEmail] = useState("");
  const [socialErr, setSocialErr] = useState("");

  const startSocial = (provider) => {
    setSocialStep(provider);
    setSocialEmail("");
    setSocialErr("");
    setErr("");
  };

  const confirmSocial = () => {
    if (!socialEmail.includes("@")) { setSocialErr(L("Bitte gültige E-Mail eingeben","Please enter a valid email","Veuillez entrer un e-mail valide","Inserisci un'e-mail valida")); return; }
    setSocialLoading(socialStep);
    setTimeout(() => {
      const dn = socialEmail.split("@")[0].replace(/[._]/g," ").replace(/\b\w/g,c=>c.toUpperCase());
      const r = authSocialLogin(socialStep, socialEmail, dn, "");
      setSocialLoading("");
      setSocialStep(null);
      if (r.ok) onSuccess(r.user);
      else setSocialErr(r.err || "Fehler");
    }, 600);
  };

  function handleLogin(e) {
    e.preventDefault(); setErr(""); setLoading(true);
    setTimeout(()=>{
      if(authIsAdmin(email,pw)){ onSuccess({email,plan:"admin",isAdmin:true}); return; }
      const r = authLogin(email, pw);
      if(r.ok) onSuccess(r.user);
      else { setErr(r.err); setLoading(false); }
    },400);
  }

  function handleRegister(e) {
    e.preventDefault(); setErr("");
    if(!email.includes("@")) return setErr(L("Ungültige E-Mail.","Invalid email.","E-mail invalide.","E-mail non valida."));
    if(pw.length<6) return setErr(L("Passwort mind. 6 Zeichen.","Password min. 6 chars.","Mot de passe min. 6 car.","Password min. 6 car."));
    if(pw!==pw2) return setErr(L("Passwörter stimmen nicht überein.","Passwords don't match.","Mots de passe différents.","Password non corrispondono."));
    setLoading(true);
    setTimeout(()=>{
      const r = authRegister(email, pw, "free");
      if(r.ok) onSuccess(r.user);
      else { setErr(r.err); setLoading(false); }
    },400);
  }

  const inp = {background:"rgba(255,255,255,.07)",border:"1.5px solid rgba(255,255,255,.12)",borderRadius:10,padding:"11px 14px",width:"100%",color:"white",fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box",transition:"border-color .2s"};

  const loginLabel  = mode==="login";
  const btnBase     = {display:"flex",alignItems:"center",justifyContent:"center",gap:11,padding:"12px 16px",borderRadius:11,cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:600,transition:"all .18s",width:"100%",border:"1.5px solid"};

  const SOCIAL_LABELS = {
    google: { name:"Google", bg:"white", bc:"#dadce0", col:"#3c4043",
      icon:<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> },
    apple: { name:"Apple", bg:"#000", bc:"#000", col:"white",
      icon:<svg width="15" height="18" viewBox="0 0 15 18" fill="white"><path d="M12.94 9.45c-.02-1.87 1.53-2.77 1.6-2.81-.87-1.28-2.23-1.45-2.71-1.47-1.15-.12-2.26.68-2.84.68-.59 0-1.49-.66-2.45-.64-1.25.02-2.42.74-3.07 1.86C1.95 9.08 2.91 12.77 4.41 14.93c.74 1.04 1.62 2.2 2.77 2.16 1.11-.04 1.53-.71 2.87-.71 1.34 0 1.72.71 2.88.68 1.2-.02 1.96-1.07 2.68-2.12.85-1.21 1.2-2.39 1.21-2.45-.02-.01-2.31-.89-2.33-3.51l-.55.47zM11.05 3.32c.61-.75 1.03-1.79.92-2.83-.88.04-1.96.59-2.59 1.33-.57.65-1.07 1.71-.93 2.72.99.08 1.99-.51 2.6-1.22z"/></svg> },
    linkedin: { name:"LinkedIn", bg:"#0a66c2", bc:"#0a66c2", col:"white",
      icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
  };

  return (
    <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="mod" style={{maxWidth:420,textAlign:"left"}}>

        {/* Tabs */}
        <div style={{display:"flex",gap:4,background:"rgba(255,255,255,.06)",borderRadius:12,padding:4,marginBottom:24}}>
          {[["login",L("Einloggen","Sign in","Connexion","Accedi")],["register",L("Registrieren","Register","S'inscrire","Registrati")]].map(([m,lbl])=>(
            <button key={m} onClick={()=>{setMode(m);setErr("");setSocialStep(null);}}
              style={{flex:1,padding:"9px 0",borderRadius:9,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,transition:"all .2s",
                background:mode===m?"var(--em)":"transparent",color:mode===m?"white":"rgba(255,255,255,.4)"}}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Social Buttons ODER Inline-Eingabe */}
        {!socialStep ? (
          <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:20}}>
            {(["google","apple","linkedin"]).map(provider => {
              const s = SOCIAL_LABELS[provider];
              return (
                <button key={provider} onClick={()=>startSocial(provider)} disabled={!!socialLoading}
                  style={{...btnBase,background:s.bg,borderColor:s.bc,color:s.col,opacity:socialLoading===provider?0.7:1}}>
                  {socialLoading===provider ? <span>⏳</span> : s.icon}
                  {loginLabel
                    ? L(`Mit ${s.name} einloggen`,`Sign in with ${s.name}`,`Connexion avec ${s.name}`,`Accedi con ${s.name}`)
                    : L(`Mit ${s.name} registrieren`,`Sign up with ${s.name}`,`Inscription avec ${s.name}`,`Registrati con ${s.name}`)}
                </button>
              );
            })}
          </div>
        ) : (
          /* Inline Social Email Input – kein window.prompt, funktioniert überall */
          <div style={{marginBottom:20,animation:"fadeSlideIn .2s ease"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:SOCIAL_LABELS[socialStep].bg,border:"1.5px solid "+SOCIAL_LABELS[socialStep].bc,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {SOCIAL_LABELS[socialStep].icon}
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"white"}}>{SOCIAL_LABELS[socialStep].name}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.35)"}}>
                  {L(`E-Mail für ${SOCIAL_LABELS[socialStep].name}-Konto eingeben`,
                     `Enter your ${SOCIAL_LABELS[socialStep].name} account email`,
                     `Entrez l'e-mail de votre compte ${SOCIAL_LABELS[socialStep].name}`,
                     `Inserisci l'e-mail del tuo account ${SOCIAL_LABELS[socialStep].name}`)}
                </div>
              </div>
            </div>
            <input
              type="email"
              placeholder="name@beispiel.com"
              value={socialEmail}
              onChange={e=>{setSocialEmail(e.target.value);setSocialErr("");}}
              onKeyDown={e=>e.key==="Enter"&&confirmSocial()}
              autoFocus
              style={{...inp,marginBottom:socialErr?8:12}}
            />
            {socialErr && <div style={{color:"#ef4444",fontSize:12,padding:"6px 10px",background:"rgba(239,68,68,.08)",borderRadius:8,marginBottom:10}}>{socialErr}</div>}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setSocialStep(null);setSocialErr("");}}
                style={{flex:1,padding:"10px",background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"rgba(255,255,255,.6)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                ← {L("Zurück","Back","Retour","Indietro")}
              </button>
              <button onClick={confirmSocial} disabled={!!socialLoading}
                style={{flex:2,padding:"10px",background:"var(--em)",border:"none",borderRadius:10,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:socialLoading?0.7:1}}>
                {socialLoading ? "⏳ …" : L("Weiter →","Continue →","Continuer →","Continua →")}
              </button>
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <div style={{flex:1,height:1,background:"rgba(255,255,255,.08)"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.25)",fontWeight:600,letterSpacing:"1px"}}>{L("ODER MIT E-MAIL","OR WITH EMAIL","OU PAR E-MAIL","O CON E-MAIL")}</span>
          <div style={{flex:1,height:1,background:"rgba(255,255,255,.08)"}}/>
        </div>

        {/* E-Mail Login */}
        {mode==="login" && <>
          <form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:10}}>
            <input type="email" placeholder="E-Mail" value={email} onChange={e=>setEmail(e.target.value)} required style={inp}/>
            <div style={{position:"relative"}}>
              <input type={showPw?"text":"password"} placeholder={L("Passwort","Password","Mot de passe","Password")} value={pw} onChange={e=>setPw(e.target.value)} required style={{...inp,paddingRight:44}}/>
              <button type="button" onClick={()=>setShowPw(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.3)",fontSize:16}}>{showPw?"🙈":"👁"}</button>
            </div>
            {err&&<div style={{color:"#ef4444",fontSize:12,padding:"7px 11px",background:"rgba(239,68,68,.08)",borderRadius:8}}>{err}</div>}
            <button type="submit" className="btn b-em b-w" disabled={loading} style={{marginTop:2}}>
              {loading?"⏳ …":L("Einloggen →","Sign in →","Connexion →","Accedi →")}
            </button>
          </form>
          <div style={{textAlign:"center",marginTop:14,fontSize:12,color:"rgba(255,255,255,.25)"}}>
            {L("Kein Account?","No account?"," Pas de compte?","Nessun account?")} <button onClick={()=>setMode("register")} style={{background:"none",border:"none",color:"var(--em)",cursor:"pointer",fontWeight:700,fontSize:12}}>{L("Registrieren","Register","S'inscrire","Registrati")}</button>
          </div>
        </>}

        {/* E-Mail Registrierung */}
        {mode==="register" && <>
          <form onSubmit={handleRegister} style={{display:"flex",flexDirection:"column",gap:10}}>
            <input type="email" placeholder="E-Mail" value={email} onChange={e=>setEmail(e.target.value)} required style={inp}/>
            <div style={{position:"relative"}}>
              <input type={showPw?"text":"password"} placeholder={L("Passwort (mind. 6 Zeichen)","Password (min. 6 chars)","Mot de passe (min. 6 car.)","Password (min. 6 car.)")} value={pw} onChange={e=>setPw(e.target.value)} required style={{...inp,paddingRight:44}}/>
              <button type="button" onClick={()=>setShowPw(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.3)",fontSize:16}}>{showPw?"🙈":"👁"}</button>
            </div>
            <input type="password" placeholder={L("Passwort wiederholen","Repeat password","Répétez","Ripeti")} value={pw2} onChange={e=>setPw2(e.target.value)} required style={inp}/>
            {err&&<div style={{color:"#ef4444",fontSize:12,padding:"7px 11px",background:"rgba(239,68,68,.08)",borderRadius:8}}>{err}</div>}
            <button type="submit" className="btn b-em b-w" disabled={loading} style={{marginTop:2}}>
              {loading?"⏳ …":L("Gratis starten →","Start for free →","Commencer gratuitement →","Inizia gratis →")}
            </button>
          </form>
          <div style={{textAlign:"center",marginTop:14,fontSize:12,color:"rgba(255,255,255,.25)"}}>
            {L("Bereits ein Konto?","Already have an account?","Déjà un compte?","Hai già un account?")} <button onClick={()=>setMode("login")} style={{background:"none",border:"none",color:"var(--em)",cursor:"pointer",fontWeight:700,fontSize:12}}>{L("Einloggen","Sign in","Connexion","Accedi")}</button>
          </div>
        </>}

        <div style={{textAlign:"center",marginTop:20}}>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,.18)",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>
            {L("Schliessen","Close","Fermer","Chiudi")}
          </button>
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════
// 🛡️ ADMIN DASHBOARD
function MemberPanel({ lang, session, onClose }) {
  const L=(d,e,f,i)=>({de:d,en:e,fr:f,it:i}[lang]||d);
  const [members, setMembers] = React.useState([]);
  const [newEmail, setNewEmail] = React.useState("");
  const [err, setErr] = React.useState("");
  const [ok, setOk] = React.useState("");
  const maxSeats = session.plan==="family" ? 4 : 10;
  const planLabel = session.plan==="family" ? L("Familie","Family","Famille","Famiglia") : "Team";

  React.useEffect(()=>{
    const users = JSON.parse(localStorage.getItem("stf_auth_users")||"[]");
    const owner = users.find(u=>u.email.toLowerCase()===session.email.toLowerCase());
    setMembers(owner?.members||[session.email]);
  },[]);

  const add = () => {
    setErr(""); setOk("");
    if(!newEmail.trim()) return;
    const res = authAddMember(session.email, newEmail.trim());
    if(res.ok){
      setMembers(m=>[...m, newEmail.trim().toLowerCase()]);
      setNewEmail("");
      setOk(L("Mitglied hinzugefügt ✓","Member added ✓","Membre ajouté ✓","Membro aggiunto ✓"));
    } else { setErr(res.err); }
  };

  const remove = (email) => {
    if(email.toLowerCase()===session.email.toLowerCase()) return;
    const users = JSON.parse(localStorage.getItem("stf_auth_users")||"[]");
    const owner = users.find(u=>u.email.toLowerCase()===session.email.toLowerCase());
    if(owner){ owner.members = owner.members.filter(m=>m!==email.toLowerCase()); localStorage.setItem("stf_auth_users", JSON.stringify(users)); }
    setMembers(m=>m.filter(x=>x!==email.toLowerCase()));
  };

  return (
    <div className="mbg" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="mod" style={{maxWidth:460,textAlign:"left"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div>
            <h2 style={{fontSize:20,margin:0}}>👥 {planLabel}-{L("Mitglieder","Members","Membres","Membri")}</h2>
            <div style={{fontSize:11,color:"rgba(255,255,255,.3)",marginTop:3}}>{members.length}/{maxSeats} {L("Plätze belegt","seats used","places occupées","posti occupati")}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,.4)",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>

        {/* Mitgliederliste */}
        <div style={{marginBottom:16}}>
          {members.map((m,i)=>(
            <div key={m} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:"rgba(255,255,255,.04)",borderRadius:9,marginBottom:6,border:"1px solid rgba(255,255,255,.07)"}}>
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,var(--em),#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"white"}}>{m[0].toUpperCase()}</div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"white"}}>{m}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.3)"}}>{i===0?L("Admin (du)","Admin (you)","Admin (vous)","Admin (tu)"):L("Mitglied","Member","Membre","Membro")}</div>
                </div>
              </div>
              {i>0&&<button onClick={()=>remove(m)} style={{background:"rgba(239,68,68,.12)",border:"1px solid rgba(239,68,68,.2)",color:"#f87171",borderRadius:7,padding:"4px 9px",fontSize:11,cursor:"pointer",fontWeight:600}}>
                {L("Entfernen","Remove","Retirer","Rimuovi")}
              </button>}
            </div>
          ))}
        </div>

        {/* E-Mail hinzufügen */}
        {members.length < maxSeats ? (
          <div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:8}}>{L("E-Mail-Adresse des neuen Mitglieds eingeben:","Enter the email address of the new member:","Entrez l'adresse e-mail du nouveau membre:","Inserisci l'indirizzo e-mail del nuovo membro:")}</div>
            <div style={{display:"flex",gap:8}}>
              <input value={newEmail} onChange={e=>setNewEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}
                placeholder="name@beispiel.ch" type="email"
                style={{flex:1,padding:"9px 12px",borderRadius:9,border:"1.5px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.06)",color:"white",fontFamily:"var(--bd)",fontSize:13,outline:"none"}}/>
              <button onClick={add} className="btn b-em b-sm">{L("Hinzufügen","Add","Ajouter","Aggiungi")}</button>
            </div>
            {err&&<div style={{color:"#f87171",fontSize:12,marginTop:7}}>{err}</div>}
            {ok&&<div style={{color:"var(--em)",fontSize:12,marginTop:7}}>{ok}</div>}
            <div style={{fontSize:11,color:"rgba(255,255,255,.25)",marginTop:10,lineHeight:1.6}}>
              {L("Das Mitglied muss sich mit dieser E-Mail bei Stellify registrieren, um Zugang zu erhalten.","The member must register at Stellify with this email to gain access.","Le membre doit s'inscrire sur Stellify avec cet e-mail pour accéder.","Il membro deve registrarsi su Stellify con questa email per accedere.")}
            </div>
          </div>
        ) : (
          <div style={{textAlign:"center",padding:"16px",background:"rgba(245,158,11,.08)",borderRadius:10,border:"1px solid rgba(245,158,11,.2)",fontSize:13,color:"rgba(245,158,11,.8)"}}>
            {L(`Alle ${maxSeats} Plätze belegt.`,`All ${maxSeats} seats used.`,`Les ${maxSeats} places sont occupées.`,`Tutti i ${maxSeats} posti sono occupati.`)}
          </div>
        )}

        <button className="btn b-out b-sm" style={{width:"100%",marginTop:18,borderColor:"rgba(255,255,255,.12)",color:"rgba(255,255,255,.5)"}} onClick={onClose}>
          {L("Schliessen","Close","Fermer","Chiudi")}
        </button>
      </div>
    </div>
  );
}


function AdminDashboard({ lang, onClose }) {
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState(authGetUsers());
  const [upgradeModal, setUpgradeModal] = useState(null); // {email, currentPlan}
  const [newPlan, setNewPlan] = useState("pro");
  const chats = (() => { try { return JSON.parse(localStorage.getItem("stf_chats")||"[]"); } catch { return []; }})();

  const refresh = () => setUsers(authGetUsers());

  const filtered = users.filter(u=>
    u.email.toLowerCase().includes(search.toLowerCase()) || (u.plan||"").includes(search.toLowerCase()) || (u.displayName||"").toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: users.length,
    pro: users.filter(u=>u.plan==="pro").length,
    family: users.filter(u=>u.plan==="family").length,
    team: users.filter(u=>u.plan==="team").length,
    free: users.filter(u=>!u.plan||u.plan==="free").length,
  };

  // Hochrechnung monatlicher Umsatz (MRR)
  const mrr = (stats.pro * 19.90 + stats.family * 34.90 + stats.team * 59.90).toFixed(2);
  const arr = (parseFloat(mrr) * 12).toFixed(0);
  const convRate = stats.total > 0 ? ((stats.pro + stats.family + stats.team) / stats.total * 100).toFixed(1) : "0.0";

  const PLAN_COLORS = {pro:"#10b981",family:"#6366f1",team:"#f59e0b",free:"rgba(255,255,255,.35)"};
  const PLAN_ICONS = {pro:"✦",family:"👨‍👩‍👧",team:"🏢",free:"👤"};
  const PROVIDER_ICONS = {google:"G",apple:"",linkedin:"in",email:"@",stripe:"💳"};

  const handleUpgrade = (email) => {
    authUpgradePlan(email, newPlan);
    setUpgradeModal(null);
    refresh();
  };

  const exportCSV = () => {
    const rows = [["E-Mail","Plan","Angemeldet","Provider","Seats","Mitglieder"]];
    users.forEach(u=>rows.push([u.email, u.plan||"free", new Date(u.activatedAt||0).toLocaleDateString("de-CH"), u.provider||"email", u.seats||1, (u.members||[]).length]));
    const csv = rows.map(r=>r.join(";")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8,"+encodeURIComponent(csv); a.download = "stellify-nutzer.csv"; a.click();
  };

  const inpStyle = {width:"100%",padding:"9px 13px",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"white",fontFamily:"inherit",fontSize:13,outline:"none",boxSizing:"border-box"};

  return (
    <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="mod" style={{maxWidth:760,textAlign:"left",maxHeight:"92vh",overflowY:"auto",padding:"28px 24px"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:38,height:38,background:"rgba(245,158,11,.15)",border:"1.5px solid rgba(245,158,11,.3)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🛡️</div>
              <div>
                <h2 style={{fontSize:20,margin:0,fontFamily:"var(--hd)"}}>Admin Dashboard</h2>
                <div style={{fontSize:11,color:"rgba(255,255,255,.3)",marginTop:1}}>{C.name} · {C.domain} · Nur für JTSP</div>
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={exportCSV} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"6px 12px",color:"rgba(255,255,255,.5)",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>⬇ CSV Export</button>
            <button onClick={onClose} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"6px 12px",color:"rgba(255,255,255,.5)",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>✕</button>
          </div>
        </div>

        {/* KPI Karten */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
          {[
            {ico:"💰",lbl:"MRR (CHF)",val:`${mrr}`,sub:"Monatlich hochgerechnet",c:"rgba(16,185,129,.1)",bc:"rgba(16,185,129,.25)"},
            {ico:"📈",lbl:"ARR (CHF)",val:`${Number(arr).toLocaleString("de-CH")}`,sub:"Jahresumsatz-Prognose",c:"rgba(99,102,241,.1)",bc:"rgba(99,102,241,.25)"},
            {ico:"🎯",lbl:"Conv. Rate",val:`${convRate}%`,sub:"Free → Paid",c:"rgba(245,158,11,.1)",bc:"rgba(245,158,11,.25)"},
          ].map(k=>(
            <div key={k.lbl} style={{background:k.c,border:`1px solid ${k.bc}`,borderRadius:12,padding:"14px 16px"}}>
              <div style={{fontSize:18,marginBottom:4}}>{k.ico}</div>
              <div style={{fontFamily:"var(--hd)",fontSize:22,fontWeight:800,color:"white",lineHeight:1}}>{k.val}</div>
              <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.45)",marginTop:3,letterSpacing:"0.5px",textTransform:"uppercase"}}>{k.lbl}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.25)",marginTop:1}}>{k.sub}</div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
          {[["👥",stats.total,"Total","rgba(255,255,255,.05)","rgba(255,255,255,.08)"],["✦",stats.pro,"Pro","rgba(16,185,129,.08)","rgba(16,185,129,.2)"],["👨‍👩‍👧",stats.family,"Familie","rgba(99,102,241,.08)","rgba(99,102,241,.2)"],["🏢",stats.team,"Team","rgba(245,158,11,.08)","rgba(245,158,11,.2)"]].map(([ico,val,lbl,bg,bc])=>(
            <div key={lbl} style={{background:bg,border:`1px solid ${bc}`,borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:18}}>{ico}</div>
              <div style={{fontFamily:"var(--hd)",fontSize:20,fontWeight:800,color:"white"}}>{val}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.3)",textTransform:"uppercase",letterSpacing:"1px"}}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:4,background:"rgba(255,255,255,.04)",borderRadius:10,padding:4,marginBottom:16}}>
          {[["overview","Übersicht"],["users","Nutzer"],["chats","Chats"],["config","Config"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"7px 0",borderRadius:7,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,background:tab===t?"rgba(255,255,255,.12)":"transparent",color:tab===t?"white":"rgba(255,255,255,.35)"}}>
              {l}
            </button>
          ))}
        </div>

        {/* ÜBERSICHT TAB */}
        {tab==="overview" && (
          <div>
            <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:14,padding:18,marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,.4)",letterSpacing:"1px",marginBottom:12,textTransform:"uppercase"}}>Plan-Verteilung</div>
              {[["Pro",stats.pro,stats.total,"#10b981"],["Familie",stats.family,stats.total,"#6366f1"],["Team",stats.team,stats.total,"#f59e0b"],["Gratis",stats.free,stats.total,"rgba(255,255,255,.25)"]].map(([lbl,n,tot,c])=>(
                <div key={lbl} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.5)",width:60}}>{lbl}</div>
                  <div style={{flex:1,height:6,background:"rgba(255,255,255,.07)",borderRadius:10,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${tot?((n/tot)*100):0}%`,background:c,borderRadius:10,transition:"width .6s ease"}}/>
                  </div>
                  <div style={{fontSize:11,fontWeight:700,color:"white",width:30,textAlign:"right"}}>{n}</div>
                </div>
              ))}
            </div>
            <div style={{background:"rgba(16,185,129,.04)",border:"1px solid rgba(16,185,129,.15)",borderRadius:14,padding:"14px 18px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.4)",letterSpacing:"1px",marginBottom:8,textTransform:"uppercase"}}>Umsatz-Übersicht (Hochrechnung)</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {[
                  [`${stats.pro} × CHF 19.90`, "Pro", `= CHF ${(stats.pro*19.90).toFixed(2)}`],
                  [`${stats.family} × CHF 34.90`, "Familie", `= CHF ${(stats.family*34.90).toFixed(2)}`],
                  [`${stats.team} × CHF 59.90`, "Team", `= CHF ${(stats.team*59.90).toFixed(2)}`],
                ].map(([a,b,c])=>(
                  <div key={b} style={{background:"rgba(255,255,255,.04)",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontSize:10,color:"rgba(255,255,255,.35)"}}>{a}</div>
                    <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)",marginTop:2}}>{b}</div>
                    <div style={{fontSize:14,fontWeight:800,color:"var(--em)",marginTop:2}}>{c}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,color:"rgba(255,255,255,.35)"}}>Total MRR</span>
                <span style={{fontFamily:"var(--hd)",fontSize:18,fontWeight:800,color:"var(--em)"}}>CHF {mrr}</span>
              </div>
            </div>
          </div>
        )}

        {/* NUTZER TAB */}
        {tab==="users" && <>
          <input placeholder="Suchen nach E-Mail, Name, Plan…" value={search} onChange={e=>setSearch(e.target.value)} style={{...inpStyle,marginBottom:12}}/>
          {filtered.length===0 && <div style={{textAlign:"center",padding:24,color:"rgba(255,255,255,.25)",fontSize:13}}>Keine Nutzer gefunden</div>}
          {filtered.map(u=>(
            <div key={u.email} style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:12,padding:"12px 14px",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,.08)",border:"1.5px solid rgba(255,255,255,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,fontWeight:700}}>
                  {PLAN_ICONS[u.plan||"free"]}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{fontSize:13,fontWeight:700,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.displayName||u.email.split("@")[0]}</div>
                    {u.provider && u.provider!=="email" && <span style={{fontSize:9,fontWeight:700,background:"rgba(255,255,255,.08)",color:"rgba(255,255,255,.4)",borderRadius:6,padding:"1px 6px",textTransform:"uppercase"}}>{u.provider}</span>}
                  </div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.3)",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.2)",marginTop:2}}>
                    Seit {new Date(u.activatedAt||0).toLocaleDateString("de-CH")} · {(u.members||[]).length}/{u.seats||1} Seats
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                  <div style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:`${PLAN_COLORS[u.plan||"free"]}22`,color:PLAN_COLORS[u.plan||"free"],border:`1px solid ${PLAN_COLORS[u.plan||"free"]}44`,textTransform:"uppercase"}}>
                    {u.plan||"Free"}
                  </div>
                  <button onClick={()=>{setUpgradeModal({email:u.email,plan:u.plan});setNewPlan(u.plan==="free"?"pro":u.plan);}}
                    style={{fontSize:10,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:6,padding:"3px 9px",color:"rgba(255,255,255,.4)",cursor:"pointer",fontFamily:"inherit"}}>
                    Plan ändern
                  </button>
                </div>
              </div>
            </div>
          ))}
        </>}

        {/* CHATS TAB */}
        {tab==="chats" && <>
          <div style={{fontSize:12,color:"rgba(255,255,255,.3)",marginBottom:12}}>{chats.length} gespeicherte Chats</div>
          {chats.length===0 && <div style={{textAlign:"center",padding:24,color:"rgba(255,255,255,.25)",fontSize:13}}>Keine Chats vorhanden</div>}
          {chats.slice(0,20).map((c,i)=>(
            <div key={c.id||i} style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:10,padding:"10px 13px",marginBottom:6}}>
              <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,.7)"}}>{c.title||"Chat"}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.25)",marginTop:2}}>{c.msgs?.length||0} Nachrichten · {new Date(c.ts||0).toLocaleString("de-CH")}</div>
            </div>
          ))}
        </>}

        {/* CONFIG TAB */}
        {tab==="config" && (
          <div>
            <div style={{background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.2)",borderRadius:14,padding:"16px 18px",marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(245,158,11,.7)",letterSpacing:"1px",marginBottom:10,textTransform:"uppercase"}}>🔑 Admin-Zugangsdaten (nur du siehst das)</div>
              {[["E-Mail",C.ADMIN_EMAIL],["Passwort",C.ADMIN_PW],["Domain",C.domain],["Groq API Key",C.GROQ_KEY.slice(0,20)+"…"]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                  <span style={{fontSize:11,color:"rgba(255,255,255,.3)"}}>{k}</span>
                  <span style={{fontSize:11,fontFamily:"monospace",color:"rgba(255,255,255,.6)"}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:14,padding:"16px 18px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.4)",letterSpacing:"1px",marginBottom:10,textTransform:"uppercase"}}>💰 Aktuelle Preise</div>
              {[["Pro monatlich",`CHF ${C.priceM}`],["Pro jährlich",`CHF ${C.priceY}/Mo.`],["Familie",`CHF 34.90/Mo.`],["Team",`CHF 59.90/Mo.`],["Free Limit",`${C.FREE_LIMIT}× Gratis`],["Neue Tools Limit",`${C.NEW_TOOL_FREE_LIMIT}× Gratis`]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                  <span style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>{k}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"var(--em)"}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plan-Upgrade Modal */}
        {upgradeModal && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setUpgradeModal(null)}>
            <div style={{background:"#1a1a2e",border:"1px solid rgba(255,255,255,.12)",borderRadius:16,padding:"24px",maxWidth:340,width:"90%",animation:"scaleIn .2s ease"}} onClick={e=>e.stopPropagation()}>
              <div style={{fontSize:14,fontWeight:700,color:"white",marginBottom:4}}>Plan ändern</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.35)",marginBottom:16}}>{upgradeModal.email}</div>
              <select value={newPlan} onChange={e=>setNewPlan(e.target.value)} style={{...inpStyle,marginBottom:16}}>
                {["free","pro","family","team"].map(p=><option key={p} value={p} style={{background:"#1a1a2e"}}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setUpgradeModal(null)} style={{flex:1,padding:"10px",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"rgba(255,255,255,.4)",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>Abbrechen</button>
                <button onClick={()=>handleUpgrade(upgradeModal.email)} style={{flex:1,padding:"10px",background:"var(--em)",border:"none",borderRadius:10,color:"white",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>Speichern</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


// ════════════════════════════════════════
// 👤 PROFIL-MANAGER MODAL
function ProfileManager({ lang, onClose, onSelect, authSession }) {
  const L=(d,e,f,i)=>({de:d,en:e,fr:f,it:i}[lang]||d);
  const [profiles, setProfiles] = useState(() => loadProfiles());
  const [activeId, setActiveId] = useState(() => loadActiveProfileId());
  const [editing, setEditing] = useState(null); // null | {mode:"new"} | {mode:"edit", id}
  const EMPTY = {name:"",beruf:"",erfahrung:"",skills:"",sprachen:"",ausbildung:"",emoji:"👤"};
  const [form, setForm] = useState(EMPTY);

  const EMOJIS = ["👤","👨‍💼","👩‍💼","👨‍💻","👩‍💻","👨‍🔬","👩‍🔬","👨‍🎓","👩‍🎓","🧑‍⚕️","🧑‍🏫","🧑‍🎨","🧑‍🔧"];

  function openNew() { setForm({...EMPTY, id: "p"+Date.now()}); setEditing({mode:"new"}); }
  function openEdit(p) { setForm({...p}); setEditing({mode:"edit",id:p.id}); }

  function save() {
    if(!form.name) return;
    // Verknüpfe Profil mit eingeloggtem Account
    const profileData = {
      ...form,
      linkedEmail: authSession?.email?.toLowerCase() || form.linkedEmail || "",
    };
    let updated;
    if(editing.mode==="new") {
      updated = [...profiles, {...profileData, id: form.id||("p"+Date.now())}];
    } else {
      updated = profiles.map(p => p.id===editing.id ? {...profileData, id:editing.id} : p);
    }
    setProfiles(updated);
    saveProfiles(updated);
    setEditing(null);
  }

  function del(id) {
    const updated = profiles.filter(p => p.id !== id);
    setProfiles(updated);
    saveProfiles(updated);
    if(activeId === id) {
      const next = updated[0];
      setActiveId(next ? next.id : null);
      saveActiveProfileId(next ? next.id : "");
      onSelect(next || null);
    }
  }

  function activate(profile) {
    setActiveId(profile.id);
    saveActiveProfileId(profile.id);
    onSelect(profile);
    onClose();
  }

  if(editing) return (
    <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)setEditing(null)}}>
      <div className="mod" style={{maxWidth:500,textAlign:"left"}}>
        <h2 style={{marginBottom:4,fontSize:22}}>{editing.mode==="new"?L("Neues Profil","New profile","Nouveau profil","Nuovo profilo"):L("Profil bearbeiten","Edit profile","Modifier profil","Modifica profilo")}</h2>
        <p style={{marginBottom:18}}>{L("Angaben werden für alle Tools verwendet.","Used across all tools.","Utilisé pour tous les outils.","Usato per tutti gli strumenti.")}</p>

        {/* Emoji Picker */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:"rgba(255,255,255,.3)",marginBottom:8}}>{L("Avatar","Avatar","Avatar","Avatar")}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {EMOJIS.map(e=><button key={e} onClick={()=>setForm(f=>({...f,emoji:e}))}
              style={{width:36,height:36,borderRadius:8,border:`2px solid ${form.emoji===e?"var(--em)":"rgba(255,255,255,.1)"}`,background:form.emoji===e?"rgba(16,185,129,.15)":"rgba(255,255,255,.04)",fontSize:18,cursor:"pointer",transition:"all .15s"}}>{e}</button>)}
          </div>
        </div>

        <div className="fg2" style={{gap:10}}>
          <div className="field"><label style={{color:"rgba(255,255,255,.5)"}}>{L("Vorname & Nachname *","First & Last Name *","Prénom & Nom *","Nome & Cognome *")}</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder={L("z.B. Max Muster","e.g. John Smith","ex. Jean Dupont","es. Mario Rossi")} style={{background:"rgba(255,255,255,.07)",border:"1.5px solid rgba(255,255,255,.12)",color:"white"}}/></div>
          <div className="field"><label style={{color:"rgba(255,255,255,.5)"}}>{L("Aktueller Beruf","Current job","Emploi actuel","Lavoro attuale")}</label><input value={form.beruf} onChange={e=>setForm(f=>({...f,beruf:e.target.value}))} placeholder={L("z.B. Product Manager","e.g. Product Manager","ex. Chef de produit","es. Product Manager")} style={{background:"rgba(255,255,255,.07)",border:"1.5px solid rgba(255,255,255,.12)",color:"white"}}/></div>
          <div className="field"><label style={{color:"rgba(255,255,255,.5)"}}>{L("Erfahrung (Jahre)","Experience (years)","Expérience (ans)","Esperienza (anni)")}</label><input value={form.erfahrung} onChange={e=>setForm(f=>({...f,erfahrung:e.target.value}))} placeholder="z.B. 5" type="number" min="0" max="50" style={{background:"rgba(255,255,255,.07)",border:"1.5px solid rgba(255,255,255,.12)",color:"white"}}/></div>
          <div className="field"><label style={{color:"rgba(255,255,255,.5)"}}>{L("Sprachen","Languages","Langues","Lingue")}</label><input value={form.sprachen} onChange={e=>setForm(f=>({...f,sprachen:e.target.value}))} placeholder={L("z.B. DE, EN, FR","e.g. EN, DE, FR","ex. FR, DE, EN","es. IT, DE, EN")} style={{background:"rgba(255,255,255,.07)",border:"1.5px solid rgba(255,255,255,.12)",color:"white"}}/></div>
        </div>
        <div className="field"><label style={{color:"rgba(255,255,255,.5)"}}>{L("Skills","Skills","Compétences","Skills")}</label><textarea value={form.skills} onChange={e=>setForm(f=>({...f,skills:e.target.value}))} placeholder={L("z.B. Python, Projektmanagement, Teamführung","e.g. Python, project management, team leadership","ex. Python, gestion de projet","es. Python, gestione progetti")} style={{width:"100%",padding:"10px 13px",background:"rgba(255,255,255,.07)",border:"1.5px solid rgba(255,255,255,.12)",borderRadius:10,color:"white",fontFamily:"var(--bd)",fontSize:14,minHeight:60,resize:"none"}}/></div>
        <div className="field"><label style={{color:"rgba(255,255,255,.5)"}}>{L("Ausbildung","Education","Formation","Formazione")}</label><input value={form.ausbildung} onChange={e=>setForm(f=>({...f,ausbildung:e.target.value}))} placeholder={L("z.B. BSc Wirtschaftsinformatik, Uni Bern","e.g. BSc Business IT, Uni Berne","ex. BSc Informatique, Uni Berne","es. BSc Informatica, Uni Berna")} style={{background:"rgba(255,255,255,.07)",border:"1.5px solid rgba(255,255,255,.12)",color:"white"}}/></div>

        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button className="btn b-outd" style={{flex:1,borderColor:"rgba(255,255,255,.15)",color:"rgba(255,255,255,.6)"}} onClick={()=>setEditing(null)}>{L("Abbrechen","Cancel","Annuler","Annulla")}</button>
          <button className="btn b-em" style={{flex:1}} onClick={save} disabled={!form.name}>{L("Speichern","Save","Enregistrer","Salva")}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="mod" style={{maxWidth:480,textAlign:"left",maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <div>
            <h2 style={{fontSize:22,margin:0,marginBottom:2}}>{L("Meine Profile","My Profiles","Mes Profils","I miei Profili")}</h2>
            <div style={{fontSize:11,color:"rgba(255,255,255,.3)",fontWeight:400}}>{L("Profildaten für die KI (Name, Beruf, Skills…)","Your data for the AI (name, job, skills…)","Vos données pour l'IA (nom, métier, skills…)","I tuoi dati per l'IA (nome, lavoro, skill…)")}</div>
          </div>
          <button onClick={openNew} className="btn b-em b-sm">+ {L("Neu","New","Nouveau","Nuovo")}</button>
        </div>

        {profiles.length===0 && (
          <div style={{textAlign:"center",padding:"32px 20px",color:"rgba(255,255,255,.3)",fontSize:13}}>
            <div style={{fontSize:32,marginBottom:10}}>👤</div>
            <div>{L("Noch kein Profil. Erstelle dein erstes Profil.","No profile yet. Create your first profile.","Pas encore de profil. Créez votre premier profil.","Nessun profilo. Crea il tuo primo profilo.")}</div>
          </div>
        )}

        {profiles.map(p=>(
          <div key={p.id} style={{background:p.id===activeId?"rgba(16,185,129,.08)":"rgba(255,255,255,.04)",border:`1.5px solid ${p.id===activeId?"rgba(16,185,129,.3)":"rgba(255,255,255,.08)"}`,borderRadius:14,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:p.id===activeId?"rgba(16,185,129,.2)":"rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,border:`2px solid ${p.id===activeId?"var(--em)":"rgba(255,255,255,.1)"}`}}>{p.emoji||"👤"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"var(--hd)",fontSize:14,fontWeight:700,color:p.id===activeId?"var(--em)":"white",display:"flex",alignItems:"center",gap:8}}>
                {p.name}
                {p.id===activeId && <span style={{fontSize:10,background:"rgba(16,185,129,.2)",color:"var(--em)",padding:"1px 7px",borderRadius:20,fontWeight:700}}>AKTIV</span>}
              </div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:2}}>{p.beruf||"–"}{p.erfahrung?` · ${p.erfahrung} J.`:""}{p.sprachen?` · ${p.sprachen}`:""}</div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button onClick={()=>activate(p)}
                style={{padding:"5px 12px",borderRadius:8,border:"none",background:p.id===activeId?"var(--em)":"rgba(255,255,255,.1)",color:p.id===activeId?"white":"rgba(255,255,255,.6)",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"var(--bd)"}}>
                {p.id===activeId?"✓":L("Wählen","Select","Choisir","Scegli")}
              </button>
              <button onClick={()=>openEdit(p)} style={{padding:"5px 9px",borderRadius:8,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:"rgba(255,255,255,.5)",fontSize:12,cursor:"pointer"}}>✏️</button>
              <button onClick={()=>del(p.id)} style={{padding:"5px 9px",borderRadius:8,border:"1px solid rgba(239,68,68,.15)",background:"rgba(239,68,68,.06)",color:"#ef4444",fontSize:12,cursor:"pointer"}}>✕</button>
            </div>
          </div>
        ))}

        <button className="btn b-outd b-w" style={{marginTop:8,borderColor:"rgba(255,255,255,.12)",color:"rgba(255,255,255,.5)"}} onClick={onClose}>{L("Schliessen","Close","Fermer","Chiudi")}</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
export default function App() {
  const [lang,setLang]=useState("de"); const t=mkT(lang);
  const [page,setPage]=useState("landing");
  const [pro,setPro]=useState(false); const [usage,setUsage]=useState(0); const [proUsage,setProUsage]=useState(0);
  const [pw,setPw]=useState(false); const [yearly,setYearly]=useState(false);
  // Auth
  const [authSession, setAuthSession] = useState(()=>authGetSession());
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [showAdmin, setShowAdmin] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  // Multi-Profil
  const [showProfiles, setShowProfiles] = useState(false);
  const [activeProfile, setActiveProfile] = useState(()=>{
    const id = loadActiveProfileId();
    if(!id) return null;
    return loadProfiles().find(p=>p.id===id) || null;
  });
  // ── ONBOARDING ──
  const [showOnboarding, setShowOnboarding] = useState(()=>{ try { return !localStorage.getItem("stf_onb_done"); } catch { return true; }});
  const doneOnboarding = () => { try { localStorage.setItem("stf_onb_done","1"); } catch{} setShowOnboarding(false); };
  // ── PAGE TRANSITION PROGRESS ──
  const [pageLoading, setPageLoading] = useState(false);
  // app state
  const [step,setStep]=useState(0); const [docType,setDocType]=useState("motivation");
  const [tab,setTab]=useState(0); const [streaming,setStreaming]=useState(false);
  const [editing,setEditing]=useState(false); const [err,setErr]=useState("");
  const [copied,setCopied]=useState(false);
  const [results,setResults]=useState({motivation:"",lebenslauf:""});
  const [job,setJob]=useState({title:"",company:"",desc:"",branch:""});
  const [prof,setProf]=useState(()=>{
    const id = loadActiveProfileId();
    if(!id) return {name:"",beruf:"",erfahrung:"",skills:"",sprachen:"",ausbildung:""};
    const p = loadProfiles().find(x=>x.id===id);
    return p ? {name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""} : {name:"",beruf:"",erfahrung:"",skills:"",sprachen:"",ausbildung:""};
  });
  const [appDoc,setAppDoc]=useState(null); // uploaded CV for app page
  const [ck,setCk]=useState({});
  const [eTo,setETo]=useState(""); const [eSub,setESub]=useState(""); const [eMsg,setEMsg]=useState("");
  // coach
  const [icReady,setIcReady]=useState(false); const [icMsgs,setIcMsgs]=useState([]);
  const [icIn,setIcIn]=useState(""); const [icLoad,setIcLoad]=useState(false);
  const [icScore,setIcScore]=useState(null); const [icN,setIcN]=useState(0);
  const chatRef=useRef(null);
  // linkedin
  const [liData,setLiData]=useState({text:"",role:"",ach:""}); const [liRes,setLiRes]=useState(null); const [liLoad,setLiLoad]=useState(false);
  // ats
  const [atsCv,setAtsCv]=useState(""); const [atsJob,setAtsJob]=useState(""); const [atsDesc,setAtsDesc]=useState(""); const [atsRes,setAtsRes]=useState(null); const [atsLoad,setAtsLoad]=useState(false);
  // zeugnis
  const [zText,setZText]=useState(""); const [zRes,setZRes]=useState(null); const [zLoad,setZLoad]=useState(false);
  // jobmatch
  const [jmSkills,setJmSkills]=useState(""); const [jmEdu,setJmEdu]=useState(""); const [jmPref,setJmPref]=useState(""); const [jmRes,setJmRes]=useState(null); const [jmLoad,setJmLoad]=useState(false);
  // excel
  const [xlTask,setXlTask]=useState(""); const [xlRes,setXlRes]=useState(null); const [xlLoad,setXlLoad]=useState(false); const [xlCopied,setXlCopied]=useState(false);
  // pptx
  const [ppTask,setPpTask]=useState(""); const [ppSlides,setPpSlides]=useState(""); const [ppTone,setPpTone]=useState("professional"); const [ppRes,setPpRes]=useState(null); const [ppLoad,setPpLoad]=useState(false);
  // cookie banner
  const [cookieBanner,setCookieBanner]=useState(()=>{ try { return !localStorage.getItem("stf_cookie"); } catch{ return true; } });
  const acceptCookie=(all)=>{ try { localStorage.setItem("stf_cookie",all?"all":"essential"); } catch{} setCookieBanner(false); };


  const uj=useCallback((k,v)=>setJob(p=>({...p,[k]:v})),[]);
  const up=useCallback((k,v)=>setProf(p=>({...p,[k]:v})),[]);
  const L=(d,e,f,i)=>({de:d,en:e,fr:f,it:i}[lang]);
  const stripeLink=()=>yearly?C.stripeYearly:C.stripeMonthly;
  const canGen=()=>pro?(proUsage<C.PRO_LIMIT):(usage<C.FREE_LIMIT);
  const canGenPro=()=>proUsage<C.PRO_LIMIT;
  const nextReset=()=>{const d=new Date();d.setMonth(d.getMonth()+1);d.setDate(1);return d.toLocaleDateString(lang==="de"?"de-CH":lang==="fr"?"fr-CH":lang==="it"?"it-CH":"en-CH",{day:"numeric",month:"long",year:"numeric"});};

  const curDoc=()=>docType==="beide"?(tab===0?results.motivation:results.lebenslauf):results[docType];
  const setCurDoc=v=>{ if(docType==="beide") setResults(r=>tab===0?{...r,motivation:v}:{...r,lebenslauf:v}); else setResults(r=>({...r,[docType]:v})); };

  // Browser-Zurück-Button Support mit Page-Transition
  const navTo = useCallback((p) => {
    setPageLoading(true);
    window.history.pushState({page:p},"",`#${p==="landing"?"":p}`);
    setTimeout(() => { setPage(p); setPageLoading(false); }, 120);
  }, []);

  useEffect(()=>{
    // Initialen History-Eintrag setzen
    const hash = window.location.hash.replace("#","") || "landing";
    window.history.replaceState({page:hash},"",window.location.href);
    const onPop = (e) => setPage(e.state?.page || "landing");
    window.addEventListener("popstate", onPop);
    return ()=>window.removeEventListener("popstate", onPop);
  },[]);

  useEffect(()=>{
    window.scrollTo(0,0);
    const p=new URLSearchParams(window.location.search);
    if(p.get("pro")==="activated"){
      actPro();setPro(true);window.history.replaceState({},"",window.location.pathname);
      // Upgrade session if logged in
      const sess = authGetSession();
      if(sess) { authUpgradePlan(sess.email,"pro"); setAuthSession({...sess,plan:"pro"}); }
    }
    setUsage(getU().count); setProUsage(getProCount());
    const sess = authGetSession();
    if(sess) { setAuthSession(sess); if(sess.plan==="pro"||sess.plan==="family"||sess.plan==="team") setPro(true); else setPro(isPro()); }
    else setPro(isPro());
  },[page]);
  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[icMsgs]);
  useEffect(()=>{if(job.title&&prof.name)setESub(`Bewerbung als ${job.title} – ${prof.name}`);},[job.title,prof.name]);

  const generate=async()=>{
    if(!canGen()){setPw(true);return;} setStreaming(true); setErr(""); setEditing(false);
    const toGen=docType==="beide"?["motivation","lebenslauf"]:[docType];
    try{
      const res={...results};
      for(const tp of toGen){ res[tp]=""; setResults({...res});
        await streamAI(tp==="motivation"?t.motivPrompt(job,prof):t.cvPrompt(job,prof),
          chunk=>setResults(r=>tp==="motivation"?{...r,motivation:chunk}:{...r,lebenslauf:chunk}),
          null, pro ? "" : "free");
      }
      if(!pro){incU();setUsage(getU().count);} else {incPro();setProUsage(getProCount());} setStep(3);
    }catch(e){setErr(e.message);}finally{setStreaming(false);}
  };

  const copyDoc=()=>{navigator.clipboard.writeText(curDoc());setCopied(true);showToast(lang==="de"?"Kopiert! ✓":lang==="fr"?"Copié! ✓":lang==="it"?"Copiato! ✓":"Copied! ✓");setTimeout(()=>setCopied(false),2200);};
  const pdfDoc=()=>{if(!pro){setPw(true);return;}const w=window.open("","_blank");w.document.write(`<html><head><title>${C.name}</title><style>body{font-family:Georgia,serif;font-size:13px;line-height:1.9;color:#111;padding:64px;max-width:760px;margin:0 auto;white-space:pre-wrap}</style></head><body>${curDoc().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br/>")}</body></html>`);w.document.close();w.print();};
  const openEmail=()=>{if(!pro){setPw(true);return;}if(!eTo)return;window.open(`mailto:${eTo}?subject=${encodeURIComponent(eSub)}&body=${encodeURIComponent(curDoc()+(eMsg?"\n\n"+eMsg:""))}`);};

  const startIC=async()=>{if(!pro){setPw(true);return;}if(!canGenPro()){return;}setIcLoad(true);setIcMsgs([]);setIcScore(null);setIcN(0);
    try{const txt=await callAI(t.coach.icStart(job));setIcMsgs([{r:"ai",t:txt}]);setIcReady(true);}
    catch(e){setErr(e.message);}finally{setIcLoad(false);}};
  const sendIC=async()=>{if(!icIn.trim())return;if(!canGenPro())return;const um=icIn.trim();setIcIn("");const nc=icN+1;setIcN(nc);
    const msgs=[...icMsgs,{r:"u",t:um}];setIcMsgs(msgs);setIcLoad(true);
    try{if(nc>=5){const h=msgs.map(m=>`${m.r==="ai"?"Interviewer":"Kandidat"}: ${m.t}`).join("\n");
      const raw=await callAI(t.coach.icScore(h),"",C.MODEL_FAST);
      try{const sc=parseJSON(raw);setIcScore(sc);setIcMsgs([...msgs,{r:"ai",t:t.coach.icDone(sc.score)}]);}
      catch{setIcMsgs([...msgs,{r:"ai",t:"✓"}]);}
    }else{const history=msgs.map(m=>({role:m.r==="ai"?"assistant":"user",content:m.t}));
      const r2=await fetch(GROQ_URL,{method:"POST",headers:groqHeaders(),
        body:JSON.stringify({model:C.MODEL_FAST,max_tokens:400,messages:[{role:"system",content:t.coach.icNext(job)},...history]})});
      const d=await r2.json();if(d.error)throw new Error(d.error.message);
      setIcMsgs([...msgs,{r:"ai",t:d.choices?.[0]?.message?.content||""}]);}
      incPro();setProUsage(getProCount());
    }catch(e){setErr(e.message);}finally{setIcLoad(false);}};

  const runLI=async()=>{if(!pro){setPw(true);return;}if(!canGenPro()){return;}setLiLoad(true);setLiRes(null);
    try{const raw=await callAI(t.linkedin.prompt({...liData,beruf:prof.beruf,erfahrung:prof.erfahrung,skills:prof.skills}));
    setLiRes(parseJSON(raw));}catch(e){setErr(e.message);}finally{setLiLoad(false);}};

  const runATS=async()=>{if(!pro){setPw(true);return;}if(!canGenPro()){return;}setAtsLoad(true);setAtsRes(null);
    try{const raw=await callAI(t.ats.prompt(atsCv,atsJob,atsDesc));setAtsRes(parseJSON(raw));incPro();setProUsage(getProCount());}
    catch(e){setErr(e.message);}finally{setAtsLoad(false);}};

  const runZeugnis=async()=>{if(!pro){setPw(true);return;}if(!canGenPro()){return;}setZLoad(true);setZRes(null);
    try{const raw=await callAI(t.zeugnis.prompt(zText));setZRes(parseJSON(raw));incPro();setProUsage(getProCount());}
    catch(e){setErr(e.message);}finally{setZLoad(false);}};

  const runJM=async()=>{if(!pro){setPw(true);return;}if(!canGenPro()){return;}setJmLoad(true);setJmRes(null);
    try{const raw=await callAI(t.jobmatch.prompt(jmSkills,jmEdu,jmPref));setJmRes(parseJSON(raw));incPro();setProUsage(getProCount());}
    catch(e){setErr(e.message);}finally{setJmLoad(false);}};

  const runXL=async()=>{if(!pro){setPw(true);return;}if(!canGenPro()){return;}setXlLoad(true);setXlRes(null);
    const prompt=`Du bist ein Excel-Experte. Erstelle eine detaillierte Excel-Tabellenstruktur für folgende Aufgabe: "${xlTask}".
Antworte NUR mit JSON (kein Markdown, keine Backticks):
{"title":"Tabellentitel","description":"Kurze Beschreibung","sheets":[{"name":"Tabellenblatt1","headers":["Spalte1","Spalte2","Spalte3"],"sample_rows":[["Beispiel1","Beispiel2","100"],["Beispiel3","Beispiel4","200"]],"formulas":[{"cell":"C10","formula":"=SUMME(C2:C9)","description":"Summe aller Werte"},{"cell":"D2","formula":"=C2*0.077","description":"MwSt. 7.7%"}],"description":"Beschreibung dieses Blattes","formatting_tips":["Tipp 1 für Formatierung","Tipp 2"]}],"excel_tips":["Allgemeiner Tipp 1","Tipp 2"],"download_note":"Hinweis für den Nutzer"}`;
    try{const raw=await callAI(prompt);setXlRes(parseJSON(raw));incPro();setProUsage(getProCount());}
    catch(e){setErr(e.message);}finally{setXlLoad(false);}};

  const downloadCSV=()=>{
    if(!xlRes||!xlRes.sheets?.[0]) return;
    const sh=xlRes.sheets[0];
    const rows=[sh.headers,...(sh.sample_rows||[])];
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download=`${xlRes.title||"Stellify-Tabelle"}.csv`; a.click();
  };

  const downloadXLSX=async()=>{
    if(!xlRes||!xlRes.sheets?.[0]) return;
    const sh=xlRes.sheets[0];
    await downloadAsExcel(sh.sample_rows||[], sh.headers||[], sh.name||"Tabelle", "excel");
  };

  const runPP=async()=>{if(!pro){setPw(true);return;}if(!canGenPro()){return;}setPpLoad(true);setPpRes(null);
    const nSlides=parseInt(ppSlides)||6;
    const prompt=`Du bist ein PowerPoint-Experte. Erstelle eine professionelle Präsentation für: "${ppTask}". Ton: ${ppTone}. Anzahl Folien: ${nSlides}.
Antworte NUR mit JSON:
{"title":"Präsentationstitel","subtitle":"Untertitel","theme_suggestion":"Farbschema-Empfehlung (z.B. Dunkelblau/Grün professionell)","slides":[{"slide":1,"title":"Folientitel","layout":"title","content":["Bullet 1","Bullet 2","Bullet 3"],"speaker_note":"Was du bei dieser Folie sagen solltest","design_tip":"Gestaltungshinweis"},{"slide":2,"title":"...","layout":"content","content":["..."],"speaker_note":"...","design_tip":"..."}],"design_tips":["Allgemeiner Gestaltungstipp 1","Tipp 2"],"estimated_duration":"Geschätzte Präsentationsdauer"}`;
    try{const raw=await callAI(prompt);setPpRes(parseJSON(raw));incPro();setProUsage(getProCount());}
    catch(e){setErr(e.message);}finally{setPpLoad(false);}};

  // ── SHARED COMPONENTS ──
  const LangSw=()=><div className="ls">{LANGS.map(l=><button key={l} className={`lb ${lang===l?"on":""}`} onClick={()=>setLang(l)}>{FLAGS[l]}</button>)}</div>;

  const Nav=({dark})=>{
    const [mOpen,setMOpen]=useState(false);
    const [userMenuOpen,setUserMenuOpen]=useState(false);
    const lc=dark?"rgba(255,255,255,.38)":"var(--mu)";

    // Klick ausserhalb schliesst Menü
    useEffect(()=>{
      if(!userMenuOpen) return;
      const close=(e)=>{ if(!e.target.closest(".user-menu-wrap")) setUserMenuOpen(false); };
      document.addEventListener("mousedown",close);
      return ()=>document.removeEventListener("mousedown",close);
    },[userMenuOpen]);

    const doLogout=()=>{
      setUserMenuOpen(false);
      authClearSession(); setAuthSession(null);
      if(!isPro()) setPro(false);
    };

    return(
    <nav style={dark?{background:"rgba(7,7,14,.95)",borderColor:"rgba(255,255,255,.07)"}:{}}>
      <div className="ni">
        <div className="logo" onClick={()=>{navTo("landing");setMOpen(false);}} style={dark?{color:"white"}:{}}>{C.name}<div className="logo-dot"/>{pro&&<span className="pb">PRO</span>}</div>
        {/* Desktop nav */}
        <div className="nl nl-desk">
          <LangSw/>
          <button className="nlk" style={{color:lc}} onClick={()=>{navTo("landing");setTimeout(()=>document.getElementById("tools")?.scrollIntoView({behavior:"smooth"}),100)}}>{t.nav.tools}</button>
          <button className="nlk" style={{color:lc}} onClick={()=>{navTo("landing");setTimeout(()=>document.getElementById("preise")?.scrollIntoView({behavior:"smooth"}),100)}}>{t.nav.prices}</button>
          {pro&&<button className="nlk" style={{color:lc}} onClick={()=>{navTo("landing");setTimeout(()=>document.getElementById("faq")?.scrollIntoView({behavior:"smooth"}),100)}}>FAQ</button>}
          <button className="nlk" style={{color:"var(--em)",fontWeight:700}} onClick={()=>navTo("chat")}>💬 Stella</button>
          {/* Profil-Button */}
          <button onClick={()=>setShowProfiles(true)}
            style={{display:"flex",alignItems:"center",gap:6,background:activeProfile?"rgba(16,185,129,.12)":"rgba(11,11,18,.06)",border:"1.5px solid",borderColor:activeProfile?"rgba(16,185,129,.25)":"var(--bo)",borderRadius:20,padding:"5px 12px",cursor:"pointer",fontFamily:"var(--bd)",fontSize:12,fontWeight:600,color:activeProfile?"var(--em2)":dark?"rgba(255,255,255,.5)":"var(--mu)",transition:"all .2s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--em)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=activeProfile?"rgba(16,185,129,.25)":"var(--bo)";}}>
            <span style={{fontSize:14}}>{activeProfile?.emoji||"👤"}</span>
            <span style={{maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{activeProfile?.name||(lang==="fr"?"Profil":lang==="it"?"Profilo":"Profil")}</span>
            <span style={{fontSize:10,opacity:.6}}>▾</span>
          </button>
          {/* Login/User Button mit Dropdown */}
          {authSession ? (
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              {authSession.isAdmin && <button onClick={()=>setShowAdmin(true)}
                style={{padding:"5px 10px",borderRadius:8,border:"1px solid rgba(245,158,11,.3)",background:"rgba(245,158,11,.1)",color:"#f59e0b",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                🛡️ Admin
              </button>}
              {(authSession.plan==="family"||authSession.plan==="team")&&!authSession.isAdmin&&<button onClick={()=>setShowMembers(true)}
                style={{padding:"5px 10px",borderRadius:8,border:"1px solid rgba(99,102,241,.3)",background:"rgba(99,102,241,.08)",color:"#818cf8",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                👥 {lang==="de"?"Mitglieder":lang==="fr"?"Membres":lang==="it"?"Membri":"Members"}
              </button>}
              {/* User Dropdown */}
              <div style={{position:"relative"}} className="user-menu-wrap">
                <button onClick={()=>setUserMenuOpen(v=>!v)}
                  style={{display:"flex",alignItems:"center",gap:7,background:"linear-gradient(135deg,rgba(16,185,129,.18),rgba(16,185,129,.06))",border:"1.5px solid rgba(16,185,129,.35)",borderRadius:24,padding:"5px 12px 5px 5px",cursor:"pointer",fontFamily:"var(--bd)",fontSize:12,fontWeight:700,color:"var(--em2)",transition:"all .2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--em)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(16,185,129,.35)";}}>
                  <div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,var(--em),#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"white",flexShrink:0}}>
                    {(authSession.displayName||authSession.email)[0].toUpperCase()}
                  </div>
                  <span style={{maxWidth:88,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{authSession.displayName||authSession.email.split("@")[0]}</span>
                  {authSession.provider&&authSession.provider!=="email"&&<span style={{fontSize:9,fontWeight:700,background:"rgba(255,255,255,.12)",borderRadius:5,padding:"1px 5px",opacity:.7,textTransform:"capitalize"}}>{authSession.provider}</span>}
                  <span style={{fontSize:11,opacity:.5,marginLeft:2}}>{userMenuOpen?"▴":"▾"}</span>
                </button>

                {/* Dropdown Menü – Apple-Style */}
                {userMenuOpen&&<div style={{position:"absolute",top:"calc(100% + 10px)",right:0,minWidth:220,background:"rgba(20,20,30,.97)",border:"1px solid rgba(255,255,255,.1)",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,.5)",zIndex:2000,overflow:"hidden",backdropFilter:"blur(24px)",animation:"fadeSlideIn .18s ease"}}>
                  {/* User Info Header */}
                  <div style={{padding:"16px 16px 12px",borderBottom:"1px solid rgba(255,255,255,.07)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,var(--em),#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"white",flexShrink:0}}>
                        {(authSession.displayName||authSession.email)[0].toUpperCase()}
                      </div>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{authSession.displayName||authSession.email.split("@")[0]}</div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,.38)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{authSession.email}</div>
                      </div>
                    </div>
                    {authSession.plan&&authSession.plan!=="free"&&<div style={{marginTop:8,display:"inline-flex",alignItems:"center",gap:5,background:"rgba(16,185,129,.15)",border:"1px solid rgba(16,185,129,.3)",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,color:"var(--em)"}}>
                      ✦ {authSession.plan.charAt(0).toUpperCase()+authSession.plan.slice(1)}
                    </div>}
                  </div>

                  {/* Menu Items */}
                  <div style={{padding:"8px 0"}}>
                    {[
                      {ico:"👤", label:lang==="de"?"Profil verwalten":lang==="fr"?"Gérer le profil":lang==="it"?"Gestisci profilo":"Manage profile", action:()=>{setUserMenuOpen(false);setShowProfiles(true);}},
                      {ico:"⚙️", label:lang==="de"?"Einstellungen":lang==="fr"?"Paramètres":lang==="it"?"Impostazioni":"Settings", action:()=>{setUserMenuOpen(false);navTo("landing");}},
                      ...(pro?[{ico:"✦", label:lang==="de"?"Pro-Abo verwalten":lang==="fr"?"Gérer l'abonnement Pro":lang==="it"?"Gestisci abbonamento Pro":"Manage Pro subscription", action:()=>{setUserMenuOpen(false);navTo("landing");}}]:[{ico:"🚀", label:lang==="de"?"Pro freischalten":lang==="fr"?"Activer Pro":lang==="it"?"Attiva Pro":"Unlock Pro", action:()=>{setUserMenuOpen(false);setPw(true);}}]),
                    ].map((item,i)=>(
                      <button key={i} onClick={item.action}
                        style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:"none",border:"none",cursor:"pointer",fontFamily:"var(--bd)",fontSize:13,color:"rgba(255,255,255,.75)",textAlign:"left",transition:"background .15s"}}
                        onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.06)";}}
                        onMouseLeave={e=>{e.currentTarget.style.background="none";}}>
                        <span style={{fontSize:15,width:20,textAlign:"center"}}>{item.ico}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Logout – rot abgetrennt */}
                  <div style={{borderTop:"1px solid rgba(255,255,255,.07)",padding:"8px 0 6px"}}>
                    <button onClick={doLogout}
                      style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:"none",border:"none",cursor:"pointer",fontFamily:"var(--bd)",fontSize:13,color:"#f87171",textAlign:"left",transition:"background .15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,68,68,.08)";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="none";}}>
                      <span style={{fontSize:15,width:20,textAlign:"center"}}>→</span>
                      {lang==="de"?"Abmelden":lang==="fr"?"Se déconnecter":lang==="it"?"Disconnettersi":"Sign out"}
                    </button>
                  </div>
                </div>}
              </div>
            </div>
          ) : (
            <button onClick={()=>{setAuthMode("login");setShowAuth(true);}}
              style={{display:"flex",alignItems:"center",gap:7,background:"linear-gradient(135deg,rgba(16,185,129,.15),rgba(16,185,129,.05))",border:"1.5px solid rgba(16,185,129,.3)",borderRadius:24,padding:"6px 14px 6px 6px",cursor:"pointer",fontFamily:"var(--bd)",fontSize:12,fontWeight:700,color:"var(--em2)",transition:"all .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--em)";e.currentTarget.style.background="linear-gradient(135deg,rgba(16,185,129,.25),rgba(16,185,129,.1))";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(16,185,129,.3)";e.currentTarget.style.background="linear-gradient(135deg,rgba(16,185,129,.15),rgba(16,185,129,.05))";}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:"rgba(16,185,129,.2)",border:"1px solid rgba(16,185,129,.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0}}>👤</div>
              {lang==="de"?"Einloggen":lang==="fr"?"Connexion":lang==="it"?"Accedi":"Sign in"}
            </button>
          )}
          <button className="nc" onClick={()=>navTo("app")}>{lang==="de"?"Kostenlos starten":lang==="fr"?"Commencer":lang==="it"?"Inizia":"Start free"} →</button>
        </div>
        {/* Mobile hamburger */}
        <button className="ham" onClick={()=>setMOpen(v=>!v)} style={{background:"none",border:"none",cursor:"pointer",display:"none",flexDirection:"column",gap:4,padding:4,color:dark?"white":"var(--ink)"}}>
          <div style={{width:22,height:2,background:"currentColor",borderRadius:2,transition:"all .2s",transform:mOpen?"rotate(45deg) translate(4px,4px)":"none"}}/>
          <div style={{width:22,height:2,background:"currentColor",borderRadius:2,transition:"all .2s",opacity:mOpen?0:1}}/>
          <div style={{width:22,height:2,background:"currentColor",borderRadius:2,transition:"all .2s",transform:mOpen?"rotate(-45deg) translate(4px,-4px)":"none"}}/>
        </button>
      </div>
      {/* Mobile menu */}
      {mOpen&&<div style={{background:dark?"#0f0f1a":"white",borderTop:"1px solid",borderColor:dark?"rgba(255,255,255,.08)":"var(--bo)",padding:"12px 20px 16px",display:"flex",flexDirection:"column",gap:2}}>
        <LangSw/>
        <div style={{height:10}}/>
        {[[()=>navTo("app"),lang==="de"?"✍️ Bewerbung schreiben":lang==="fr"?"✍️ Rédiger une candidature":lang==="it"?"✍️ Scrivere candidatura":"✍️ Write application"],
          [()=>{navTo("landing");setTimeout(()=>document.getElementById("tools")?.scrollIntoView({behavior:"smooth"}),100);setMOpen(false);},lang==="de"?"🔧 Alle Tools":lang==="fr"?"🔧 Tous les outils":lang==="it"?"🔧 Tutti gli strumenti":"🔧 All tools"],
          [()=>{navTo("landing");setTimeout(()=>document.getElementById("preise")?.scrollIntoView({behavior:"smooth"}),100);setMOpen(false);},lang==="de"?"💶 Preise":lang==="fr"?"💶 Tarifs":lang==="it"?"💶 Prezzi":"💶 Pricing"],
          [()=>{navTo("landing");setTimeout(()=>document.getElementById("faq")?.scrollIntoView({behavior:"smooth"}),100);setMOpen(false);},"❓ FAQ"],
        ].map(([fn,lbl],i)=>(
          <button key={i} onClick={()=>{fn();setMOpen(false);}} style={{background:"none",border:"none",cursor:"pointer",fontFamily:"var(--bd)",fontSize:14,fontWeight:500,color:dark?"rgba(255,255,255,.7)":"var(--ink)",textAlign:"left",padding:"10px 0",borderBottom:i<3?"1px solid":"none",borderColor:dark?"rgba(255,255,255,.07)":"var(--bo)"}}>{lbl}</button>
        ))}
        <button className="btn b-em" style={{marginTop:10,justifyContent:"center"}} onClick={()=>{navTo("app");setMOpen(false);}}>{lang==="de"?"Kostenlos starten →":lang==="fr"?"Commencer →":lang==="it"?"Inizia →":"Start free →"}</button>
      </div>}
    </nav>
    );
  };

  const Footer=()=>(
    <footer>
      {/* Trust bar above footer */}
      <div style={{background:"rgba(255,255,255,.025)",borderTop:"1px solid rgba(255,255,255,.05)",borderBottom:"1px solid rgba(255,255,255,.05)",padding:"12px 24px",marginBottom:40}}>
        <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:"8px 36px",maxWidth:900,margin:"0 auto"}}>
          {[
            {ico:"🔒",txt:lang==="de"?"Keine Datenspeicherung":lang==="fr"?"Aucun stockage de données":lang==="it"?"Nessuna memorizzazione":"No data storage"},
            {ico:"🇨🇭",txt:lang==="de"?"Schweizer Unternehmen · Zug":lang==="fr"?"Société suisse · Zoug":lang==="it"?"Azienda svizzera · Zugo":"Swiss company · Zug"},
            {ico:"⚡",txt:lang==="de"?"Powered by Claude AI":lang==="fr"?"Propulsé par Claude AI":lang==="it"?"Alimentato da Claude AI":"Powered by Claude AI"},
            {ico:"🔐",txt:lang==="de"?"Sichere Zahlung via Stripe":lang==="fr"?"Paiement sécurisé via Stripe":lang==="it"?"Pagamento sicuro via Stripe":"Secure payment via Stripe"},
          ].map((tr,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"rgba(255,255,255,.32)",fontWeight:500,letterSpacing:".2px"}}>
              <span style={{fontSize:13}}>{tr.ico}</span><span>{tr.txt}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="fi">
        <div>
          <div className="fl">{C.name}<div className="logo-dot" style={{marginLeft:4,marginBottom:8}}/></div>
          <div style={{fontSize:13,color:"rgba(255,255,255,.3)",lineHeight:1.75,marginBottom:12,maxWidth:260}}>{t.legal.tagline}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.2)",marginBottom:4}}>📍 {C.address}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.2)",marginBottom:12}}>✉️ <a href={`mailto:${C.email}`} style={{color:"rgba(255,255,255,.25)",textDecoration:"none"}}>{C.email}</a></div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:14}}>
            {["Twint","Visa","Mastercard","PayPal","Apple Pay"].map(p=>(
              <div key={p} style={{fontSize:10,fontWeight:700,background:"rgba(255,255,255,.07)",color:"rgba(255,255,255,.35)",padding:"3px 8px",borderRadius:5,border:"1px solid rgba(255,255,255,.08)"}}>{p}</div>
            ))}
          </div>
        </div>
        <div className="fcol"><h5>{t.legal.product}</h5>
          <button onClick={()=>navTo("app")}>{lang==="de"?"✍️ Bewerbung":lang==="en"?"✍️ Application":lang==="fr"?"✍️ Candidature":"✍️ Candidatura"}</button>
          <button onClick={()=>navTo("linkedin")}>💼 LinkedIn</button>
          <button onClick={()=>navTo("ats")}>🤖 {t.nav.ats}</button>
          <button onClick={()=>navTo("zeugnis")}>📜 {t.nav.zeugnis}</button>
          <button onClick={()=>navTo("jobmatch")}>🎯 {t.nav.jobs}</button>
          <button onClick={()=>navTo("excel")}>📊 {t.nav.excel}</button>
          <button onClick={()=>navTo("pptx")}>📽️ {t.nav.pptx}</button>
          <button onClick={()=>navTo("coach")}>🎤 {t.nav.coach}</button>
          <button onClick={()=>navTo("li2job")}>🔗 {lang==="de"?"LinkedIn → Bewerbung":lang==="en"?"LinkedIn → Application":lang==="fr"?"LinkedIn → Candidature":"LinkedIn → Candidatura"}</button>
          <button onClick={()=>navTo("gehaltsrechner")}>💰 {lang==="de"?"KI-Gehaltsrechner":"Salary calculator"}</button>
          <button onClick={()=>navTo("lipost")}>✍️ {lang==="de"?"LinkedIn-Post Generator":"LinkedIn Post"}</button>
          <button onClick={()=>navTo("tracker")}>📋 {lang==="de"?"Bewerbungs-Tracker":"Application Tracker"}</button>
        </div>
        <div className="fcol">
          <h5>{lang==="de"?"Schule & Produktivität":lang==="fr"?"École & Productivité":lang==="it"?"Scuola & Produttività":"School & Productivity"}</h5>
          {GENERIC_TOOLS.map(g=><button key={g.id} onClick={()=>navTo(g.id)}>{g.ico} {g.t[lang]}</button>)}
        </div>
        <div className="fcol"><h5>{t.legal.legalL}</h5>
          <button onClick={()=>navTo("agb")}>{t.legal.agb}</button>
          <button onClick={()=>navTo("datenschutz")}>{t.legal.privacy}</button>
          <button onClick={()=>navTo("impressum")}>{t.legal.imprint}</button>
          <div style={{marginTop:16,fontSize:12,color:"rgba(255,255,255,.18)",lineHeight:1.6}}>
            {lang==="de"?"Stellify ist kein Rechts- oder Karriereberater. Alle KI-generierten Inhalte sind Entwürfe und Richtwerte – keine rechtsverbindlichen Dokumente. Alle Angaben ohne Gewähr.":
             lang==="fr"?"Stellify n'est pas un conseiller juridique ou de carrière.":
             lang==="it"?"Stellify non è un consulente legale o di carriera.":
             "Stellify is not a legal or career advisor. All information without guarantee."}
          </div>
        </div>
      </div>
      <div className="fbot">
        <div>© {new Date().getFullYear()} {C.name} · {C.owner} · {C.address}</div>
        <div style={{display:"flex",gap:12}}>{[["agb",t.legal.agb],["datenschutz",t.legal.privacy],["impressum",t.legal.imprint]].map(([p,l])=><button key={p} onClick={()=>navTo(p)} style={{background:"none",border:"none",color:"rgba(255,255,255,.2)",fontSize:11,cursor:"pointer",fontFamily:"var(--bd)"}}>{l}</button>)}</div>
      </div>
    </footer>
  );

  const PW=()=>(
    <div className="mbg" onClick={e=>e.target===e.currentTarget&&setPw(false)}>
      <div className="mod">
        <div style={{fontSize:32,marginBottom:10}}>✦</div>
        <h2>{t.modal.title}</h2><p>{t.modal.sub}</p>
        <div className="mod-pr">CHF {C.priceM}<span> / {lang==="en"?"mo":"Mo."}</span></div>
        <div className="mod-fts">{t.modal.feats.map(([ico,tx])=><div key={tx} className="mod-f"><div className="mod-fi">{ico}</div>{tx}</div>)}</div>
        <button className="btn b-em b-w" onClick={()=>window.open(stripeLink(),"_blank")}>{t.modal.btn}</button>
        <div className="mod-note">{t.modal.note}</div>
        <button className="btn b-out b-sm" style={{marginTop:9,width:"100%"}} onClick={()=>setPw(false)}>{t.modal.close}</button>
      </div>
    </div>
  );

  const UsageBar=()=>!pro?(
    <div className="ubar">
      <span><strong>{C.FREE_LIMIT-usage}</strong> {t.app.uLeft(C.FREE_LIMIT-usage)}</span>
      <div style={{display:"flex",alignItems:"center",gap:9}}>
        <div className="u-tr"><div className="u-fi" style={{width:`${(usage/C.FREE_LIMIT)*100}%`}}/></div>
        <button className="btn b-em b-sm" onClick={()=>setPw(true)}>Pro →</button>
      </div>
    </div>
  ):proUsage>=C.PRO_LIMIT?(
    <div style={{background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.25)",borderRadius:10,padding:"10px 16px",fontSize:13,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
      <span>⏳ {L("Monatliches Kontingent aufgebraucht","Monthly quota used up","Quota mensuel épuisé","Monthly quota used up")} · {L("Reset am","Reset on","Réinitialisation le","Reset on")} <strong>{nextReset()}</strong></span>
    </div>
  ):(
    <div className="ubar">
      <span style={{color:"var(--em)",fontWeight:600}}>✦ Pro · <strong>{C.PRO_LIMIT-proUsage}</strong> {L("von","of","de","of")} {C.PRO_LIMIT} {L("Generierungen übrig","generations left","générations restantes","generations left")}</span>
      <div style={{display:"flex",alignItems:"center",gap:9}}>
        <div className="u-tr"><div className="u-fi" style={{width:`${(proUsage/C.PRO_LIMIT)*100}%`,background:"var(--em)"}}/></div>
        <span style={{fontSize:11,color:"var(--mu)",whiteSpace:"nowrap"}}>↻ {nextReset()}</span>
      </div>
    </div>
  );

  const DEMO_OUTPUTS = {
    linkedin: L(
`🔍 LINKEDIN ANALYSE

Dein aktueller Profil-Score: 54/100 ⚠️

HEADLINE (aktuell): «Software Engineer bei UBS»
✦ Optimiert: «Senior Software Engineer | Python & Cloud | Zürich | Open to new opportunities»

ABOUT-SEKTION:
✗ Zu kurz – nur 2 Zeilen, Recruiter überspringen dich
✦ Empfehlung: 3–4 Absätze mit Erfolgen, Zahlen, Keywords

TOP 5 FEHLENDE KEYWORDS:
1. «Agile» – 340 Jobs in CH suchen das
2. «AWS / GCP» – 289 Jobs in CH
3. «Team lead» – 198 Jobs in CH
4. «Scrum Master» – 167 Jobs in CH
5. «Stakeholder management» – 145 Jobs in CH

→ Mit Optimierung: Score 88/100 ✅`,
`🔍 LINKEDIN ANALYSIS

Your current profile score: 54/100 ⚠️

HEADLINE (current): «Software Engineer at UBS»
✦ Optimized: «Senior Software Engineer | Python & Cloud | Zürich | Open to opportunities»

ABOUT SECTION:
✗ Too short – only 2 lines, recruiters skip you
✦ Recommendation: 3–4 paragraphs with achievements, numbers, keywords

TOP 5 MISSING KEYWORDS:
1. «Agile» – 340 jobs in CH
2. «AWS / GCP» – 289 jobs in CH
3. «Team lead» – 198 jobs in CH

→ With optimization: Score 88/100 ✅`,
`🔍 ANALYSE LINKEDIN

Score actuel: 54/100 ⚠️

TITRE (actuel): «Ingénieur logiciel chez UBS»
✦ Optimisé: «Senior Software Engineer | Python & Cloud | Zurich | Ouvert aux opportunités»

TOP 5 MOTS-CLÉS MANQUANTS:
1. «Agile» – 340 postes en CH
2. «AWS / GCP» – 289 postes en CH
3. «Chef d'équipe» – 198 postes en CH

→ Avec optimisation: Score 88/100 ✅`,
`🔍 ANALISI LINKEDIN

Score attuale: 54/100 ⚠️

TITOLO (attuale): «Software Engineer presso UBS»
✦ Ottimizzato: «Senior Software Engineer | Python & Cloud | Zurigo | Aperto a opportunità»

TOP 5 PAROLE CHIAVE MANCANTI:
1. «Agile» – 340 lavori in CH
2. «AWS / GCP» – 289 lavori in CH

→ Con ottimizzazione: Score 88/100 ✅`),

    ats: L(
`🤖 ATS-SIMULATION

Stelle: Senior Marketing Manager, Nestlé Vevey
CV-Score: 58/100 ⚠️ – Wird aussortiert!

✓ Positiv:
  Berufsbezeichnung stimmt (85% Match)
  Ausbildung vorhanden

✗ Kritisch fehlend:
  «FMCG» – 9× im Inserat, 0× in deinem CV
  «Brand Management» – 7× erwähnt, fehlt
  «P&L Verantwortung» – 5× erwähnt, fehlt
  «Go-to-Market» – 4× erwähnt, fehlt

Formatierungsfehler:
  ✗ Tabellen – von ATS nicht lesbar
  ✗ Spalten-Layout – wird durcheinander gebracht
  ✗ Grafiken im CV – werden ignoriert

→ Mit Anpassungen: Score 84/100 ✅ Einladung wahrscheinlich`,
`🤖 ATS SIMULATION

Position: Senior Marketing Manager, Nestlé Vevey
CV Score: 58/100 ⚠️ – Gets filtered out!

✓ Positive:
  Job title matches (85%)
  Education present

✗ Critically missing:
  «FMCG» – 9× in posting, 0× in your CV
  «Brand Management» – 7× mentioned, missing
  «P&L responsibility» – 5× mentioned, missing

Format errors:
  ✗ Tables – not readable by ATS
  ✗ Column layout – gets scrambled

→ With adjustments: Score 84/100 ✅`,
`🤖 SIMULATION ATS

Poste: Senior Marketing Manager, Nestlé Vevey
Score CV: 58/100 ⚠️ – Éliminé!

✗ Manquants critiques:
  «FMCG» – 9× dans l'offre, 0× dans votre CV
  «Brand Management» – 7× mentionné, absent
  «P&L» – 5× mentionné, absent

→ Avec ajustements: Score 84/100 ✅`,
`🤖 SIMULAZIONE ATS

Posizione: Senior Marketing Manager, Nestlé Vevey
Score CV: 58/100 ⚠️ – Eliminato!

✗ Mancanti critici:
  «FMCG» – 9× nell'annuncio, 0× nel tuo CV
  «Brand Management» – 7× menzionato, assente

→ Con adeguamenti: Score 84/100 ✅`),

    zeugnis: L(
`📜 ZEUGNIS-ANALYSE

⚠️ 3 versteckte Codes erkannt!

SATZ 1: «erledigte die Aufgaben zu unserer Zufriedenheit»
→ Code für: BEFRIEDIGEND (Note 3/5)
→ Gut wäre: «stets zu unserer vollsten Zufriedenheit»

SATZ 2: «zeigte Verständnis für die Belange der Kollegen»
→ Code für: KONFLIKTE im Team
→ Gut wäre: «arbeitete stets harmonisch im Team»

SATZ 3: «verlässt unser Unternehmen auf eigenen Wunsch»
→ NEUTRAL – keine versteckte Botschaft ✓

GESAMTBEWERTUNG: 2.5/5 ⚠️
→ Dieses Zeugnis NICHT bei Bewerbungen vorlegen!

Empfehlung: Arbeitgeber um Neuformulierung bitten.`,
`📜 REFERENCE ANALYSIS

⚠️ 3 hidden codes detected!

SENTENCE 1: «completed tasks to our satisfaction»
→ Code for: SATISFACTORY (Grade 3/5)
→ Good: «always to our complete satisfaction»

SENTENCE 2: «showed understanding for colleagues»
→ Code for: TEAM CONFLICTS
→ Good: «worked harmoniously in the team»

OVERALL RATING: 2.5/5 ⚠️
→ Do NOT submit this reference!`,
`📜 ANALYSE CERTIFICAT

⚠️ 3 codes cachés détectés!

PHRASE 1: «a exécuté les tâches à notre satisfaction»
→ Code pour: PASSABLE (Note 3/5)
→ Bien: «toujours à notre entière satisfaction»

ÉVALUATION GLOBALE: 2.5/5 ⚠️
→ Ne PAS soumettre ce certificat!`,
`📜 ANALISI CERTIFICATO

⚠️ 3 codici nascosti rilevati!

FRASE 1: «ha svolto i compiti a nostra soddisfazione»
→ Codice per: SUFFICIENTE (Voto 3/5)
→ Bene: «sempre con piena soddisfazione»

VALUTAZIONE: 2.5/5 ⚠️
→ NON presentare questo certificato!`),

    jobmatch: L(
`🎯 JOB-MATCHING RESULTAT

Profil: Marketing Manager · 6 J. · FMCG · Zürich · 100k+

TOP 5 STELLEN FÜR DICH:

1. Head of Marketing – Nestlé Vevey          92% ✅
2. Brand Manager – Lindt Kilchberg            88% ✅
3. Marketing Director – Migros Zürich         85% ✅
4. CMO – Feldschlösschen Rheinfelden          79%
5. Senior Brand Lead – Emmi Luzern           74%

💡 WARUM NESTLÉ AN #1:
✓ FMCG-Erfahrung ist perfekter Match
✓ Gehalt: CHF 115–135k (passt zu deinem Ziel)
✓ Standort Vevey: 1h von Zürich mit Zug
✓ Mehrsprachigkeit DE/FR wird aktiv gesucht
✓ Wachstumsbereich: Plant-based Foods

Nächster Schritt: Bewerbung direkt starten →`,
`🎯 JOB MATCHING RESULT

Profile: Marketing Manager · 6y · FMCG · Zürich · 100k+

TOP 5 POSITIONS FOR YOU:

1. Head of Marketing – Nestlé Vevey          92% ✅
2. Brand Manager – Lindt Kilchberg            88% ✅
3. Marketing Director – Migros Zürich         85% ✅
4. CMO – Feldschlösschen                      79%
5. Senior Brand Lead – Emmi Lucerne          74%

💡 WHY NESTLÉ AT #1:
✓ FMCG experience is a perfect match
✓ Salary: CHF 115–135k (matches your goal)
✓ Location Vevey: 1h from Zürich by train

Next step: Start your application →`,
`🎯 RÉSULTAT JOB MATCHING

Profil: Marketing Manager · 6 ans · FMCG · Zurich

TOP 5 POSTES POUR VOUS:
1. Head of Marketing – Nestlé Vevey    92% ✅
2. Brand Manager – Lindt Kilchberg     88% ✅
3. Directeur Marketing – Migros        85% ✅

💡 Salaire Nestlé: CHF 115–135k ✓`,
`🎯 RISULTATO JOB MATCHING

Profilo: Marketing Manager · 6 anni · FMCG · Zurigo

TOP 5 POSIZIONI PER TE:
1. Head of Marketing – Nestlé Vevey    92% ✅
2. Brand Manager – Lindt Kilchberg     88% ✅
3. Marketing Director – Migros         85% ✅`),

    coach: L(
`🎤 INTERVIEW-COACH BEWERTUNG

Frage: «Wo sehen Sie sich in 5 Jahren?»
Deine Antwort: «Ich möchte wachsen und mehr Verantwortung übernehmen.»

BEWERTUNG: 58/100 – Ausbaufähig ⚠️

✗ Probleme:
  Zu vage – klingt wie jede Antwort
  Kein Bezug zur Stelle / zum Unternehmen
  Keine konkreten Ziele genannt

✓ Stärken:
  Ambitionen erkennbar

💡 MUSTERLÖSUNG:
«In 5 Jahren sehe ich mich als Team Lead im Bereich Digital Marketing – idealerweise in einem Unternehmen wie Migros, wo ich die Digitalstrategie aktiv mitprägen kann. Ich plane, in den nächsten 2 Jahren zunächst tiefes Fachwissen in Performance Marketing aufzubauen, dann ein kleines Team zu übernehmen.»

→ Diese Antwort: 91/100 ✅`,
`🎤 INTERVIEW COACH RATING

Question: «Where do you see yourself in 5 years?»
Your answer: «I want to grow and take on more responsibility.»

RATING: 58/100 – Needs work ⚠️

✗ Issues:
  Too vague – sounds like every answer
  No reference to the role / company
  No concrete goals mentioned

💡 MODEL ANSWER:
«In 5 years I see myself as a Team Lead in Digital Marketing – ideally at a company like Migros, where I can actively shape the digital strategy. I plan to first build deep expertise in performance marketing, then take on a small team.»

→ This answer: 91/100 ✅`,
`🎤 COACH ENTRETIEN

Question: «Où vous voyez-vous dans 5 ans?»
Score: 58/100 ⚠️

✗ Trop vague – comme toutes les réponses
✗ Pas de référence au poste

💡 MODÈLE DE RÉPONSE:
«Dans 5 ans je me vois comme Team Lead Marketing digital chez Migros, ayant d'abord développé une expertise en performance marketing.»

→ Cette réponse: 91/100 ✅`,
`🎤 COACH COLLOQUIO

Domanda: «Dove si vede tra 5 anni?»
Punteggio: 58/100 ⚠️

✗ Troppo vago
✗ Nessun riferimento al ruolo

💡 RISPOSTA MODELLO:
«Tra 5 anni mi vedo come Team Lead nel Digital Marketing, avendo prima sviluppato competenze in performance marketing.»

→ Questa risposta: 91/100 ✅`),

    excel: L(
`📊 EXCEL-GENERATOR OUTPUT

Erstellt: «Haushaltsbuch 2025 – Monatliche Ausgaben»

TABELLENBLATT 1: Übersicht
┌─────────────┬──────────┬──────────┬─────────┐
│ Kategorie   │ Budget   │ Ist      │ Diff    │
├─────────────┼──────────┼──────────┼─────────┤
│ Miete       │ 1'800    │ 1'800    │ 0       │
│ Lebensmittel│ 600      │ 543.50   │ +56.50  │
│ Verkehr     │ 200      │ 187.00   │ +13.00  │
│ TOTAL       │ =SUMME() │ =SUMME() │ =B-C    │
└─────────────┴──────────┴──────────┴─────────┘

FORMELN ENTHALTEN:
✓ =SUMME(B2:B12) – Monatstotal
✓ =B13-C13 – Abweichung Budget/Ist
✓ =WENN(D13>0,"✓ Im Budget","⚠️ Überzogen")
✓ Bedingte Formatierung: Rot wenn über Budget

→ Download als .xlsx – direkt in Excel öffnen`,
`📊 EXCEL GENERATOR OUTPUT

Created: «Household Budget 2025 – Monthly Expenses»

SHEET 1: Overview
┌─────────────┬──────────┬──────────┬─────────┐
│ Category    │ Budget   │ Actual   │ Diff    │
├─────────────┼──────────┼──────────┼─────────┤
│ Rent        │ 1'800    │ 1'800    │ 0       │
│ Groceries   │ 600      │ 543.50   │ +56.50  │
│ TOTAL       │ =SUM()   │ =SUM()   │ =B-C    │
└─────────────┴──────────┴──────────┴─────────┘

FORMULAS INCLUDED:
✓ =SUM(B2:B12) – Monthly total
✓ =IF(D13>0,"✓ On budget","⚠️ Over budget")
✓ Conditional formatting: Red if over budget`,
`📊 GÉNÉRATEUR EXCEL

Créé: «Budget mensuel 2025»

FEUILLE 1: Vue d'ensemble
│ Catégorie   │ Budget │ Réel   │ Diff  │
│ Loyer       │ 1'800  │ 1'800  │ 0     │
│ Alimentation│ 600    │ 543.50 │+56.50 │

FORMULES INCLUSES:
✓ =SOMME(B2:B12)
✓ =SI(D13>0,"✓ Dans budget","⚠️ Dépassé")`,
`📊 GENERATORE EXCEL

Creato: «Budget mensile 2025»

FOGLIO 1: Panoramica
│ Categoria  │ Budget │ Reale  │ Diff  │
│ Affitto    │ 1'800  │ 1'800  │ 0     │
│ Alimentari │ 600    │ 543.50 │+56.50 │

FORMULE INCLUSE:
✓ =SOMMA(B2:B12)
✓ =SE(D13>0,"✓ In budget","⚠️ Superato")`),

    pptx: L(
`📽️ POWERPOINT-MAKER OUTPUT

Erstellt: «Quartalsreview Q1 2025» – 8 Folien

FOLIE 1 – Titelfolie:
  «Quartalsreview Q1 2025»
  Untertitel: «Marketing Performance & Ausblick Q2»

FOLIE 2 – Highlights:
  • Umsatz: CHF 2.4M (+18% vs. Vorjahr) ✅
  • Neue Kunden: 127 (+34%) ✅
  • NPS Score: 72 (Branche: 45) ✅

FOLIE 3 – Kennzahlen:
  [Balkendiagramm: Umsatz Jan–März]

FOLIE 4–7 – Detailanalyse pro Bereich

FOLIE 8 – Ausblick Q2:
  • Ziel: CHF 2.8M (+17%)
  • 3 Hauptinitiativen

SPRECHERNOTIZEN: Auf allen Folien enthalten
→ Download als .pptx – direkt in PowerPoint`,
`📽️ POWERPOINT MAKER OUTPUT

Created: «Q1 2025 Quarterly Review» – 8 slides

SLIDE 1 – Title: «Q1 2025 Quarterly Review»
SLIDE 2 – Highlights:
  • Revenue: CHF 2.4M (+18% vs last year) ✅
  • New customers: 127 (+34%) ✅
  • NPS Score: 72 (Industry avg: 45) ✅
SLIDE 3 – KPIs: [Bar chart: Revenue Jan–Mar]
SLIDES 4–7 – Detail analysis per area
SLIDE 8 – Q2 Outlook: Target CHF 2.8M

SPEAKER NOTES: Included on all slides
→ Download as .pptx – open directly in PowerPoint`,
`📽️ CRÉATEUR POWERPOINT

Créé: «Revue trimestrielle Q1 2025» – 8 diapositives

DIAPO 1: «Revue Q1 2025»
DIAPO 2 – Points forts:
  • Chiffre d'affaires: CHF 2.4M (+18%) ✅
  • Nouveaux clients: 127 (+34%) ✅

NOTES: Incluses sur toutes les diapositives`,
`📽️ CREATORE POWERPOINT

Creato: «Review Trimestrale Q1 2025» – 8 diapositive

DIAPOSITIVA 1: «Review Q1 2025»
DIAPOSITIVA 2 – Punti salienti:
  • Fatturato: CHF 2.4M (+18%) ✅
  • Nuovi clienti: 127 (+34%) ✅

NOTE: Incluse in tutte le diapositive`),
  };

  const Li2jobDemo=()=>(
    <div style={{background:"white",borderRadius:14,overflow:"hidden",border:"1px solid #e2e8f0",fontSize:12.5}}>
      {/* Top bar */}
      <div style={{background:"#0a66c2",padding:"10px 16px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:32,height:32,background:"white",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🔗</div>
        <div style={{flex:1}}>
          <div style={{color:"white",fontWeight:800,fontSize:12,lineHeight:1.2}}>LinkedIn → Bewerbung</div>
          <div style={{color:"rgba(255,255,255,.7)",fontSize:10.5}}>Senior Developer @ Google Zürich · ETH-Profil</div>
        </div>
        <div style={{background:"#10b981",borderRadius:20,padding:"3px 10px",fontSize:10,color:"white",fontWeight:700,flexShrink:0}}>✦ Live generiert</div>
      </div>

      {/* 3 output blocks stacked */}
      {/* Block 1: Motivationsschreiben */}
      <div style={{padding:"14px 16px",borderBottom:"1px solid #f1f5f9"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <span style={{background:"#fef3c7",borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:700,color:"#92400e"}}>✍️ Motivationsschreiben</span>
          <div style={{height:1,flex:1,background:"#e2e8f0"}}/>
        </div>
        <div style={{background:"#f8fafc",borderRadius:9,padding:"12px 14px",border:"1px solid #e2e8f0",lineHeight:1.75,color:"#334155"}}>
          <p style={{margin:"0 0 8px",fontWeight:600,fontSize:12,color:"#0f172a"}}>Sehr geehrte Damen und Herren,</p>
          <p style={{margin:"0 0 8px"}}>als ETH-Absolvent mit 4 Jahren Erfahrung in Python und React bewerbe ich mich für die Senior Developer Position. Meine Cloud-Expertise (GCP, AWS) passt direkt zu Ihren Anforderungen.</p>
          <p style={{margin:0,color:"#94a3b8",fontStyle:"italic",fontSize:11}}>… vollständiger Brief · live generiert in ~8 Sek.</p>
        </div>
      </div>

      {/* Block 2: CV Highlights */}
      <div style={{padding:"14px 16px",borderBottom:"1px solid #f1f5f9"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <span style={{background:"#dbeafe",borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:700,color:"#1d4ed8"}}>📄 Lebenslauf-Highlights</span>
          <div style={{height:1,flex:1,background:"#e2e8f0"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
          {[
            {ico:"🎓",v:"ETH Zürich B.Sc. Informatik"},
            {ico:"💼",v:"4 J. Full-Stack · Python, React"},
            {ico:"☁️",v:"GCP · AWS Certified"},
            {ico:"🏆",v:"Ladezeit –40% · 3 Enterprise-Apps"},
          ].map((r,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:7,background:i%2===0?"#f0f9ff":"#f8fafc",borderRadius:8,padding:"8px 10px",border:"1px solid #e2e8f0"}}>
              <span style={{fontSize:16,flexShrink:0}}>{r.ico}</span>
              <span style={{fontSize:11.5,color:"#1e293b",fontWeight:500,lineHeight:1.3}}>{r.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Block 3: Top-Argumente */}
      <div style={{padding:"14px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <span style={{background:"#f0fdf4",borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:700,color:"#15803d"}}>💡 Deine 3 stärksten Argumente</span>
          <div style={{height:1,flex:1,background:"#e2e8f0"}}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[
            {n:1,t:"ETH-Abschluss",   s:95,c:"#10b981",note:"Top-5%-Kandidatenpool"},
            {n:2,t:"Python-Expertise",s:92,c:"#0a66c2",note:"Kernsprache bei Google"},
            {n:3,t:"Kein Visum nötig",s:88,c:"#f59e0b",note:"Spart Google Aufwand"},
          ].map((a,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:`${a.c}08`,borderRadius:9,border:`1px solid ${a.c}22`}}>
              <div style={{width:22,height:22,background:a.c,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:10,fontWeight:800,flexShrink:0}}>{a.n}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:12,color:"#0f172a"}}>{a.t} <span style={{fontWeight:400,color:"#64748b"}}>· {a.note}</span></div>
                <div style={{height:4,background:"#e2e8f0",borderRadius:3,marginTop:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${a.s}%`,background:a.c,borderRadius:3}}/>
                </div>
              </div>
              <span style={{fontWeight:800,fontSize:12,color:a.c,flexShrink:0}}>{a.s}/100</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:"8px 16px",background:"#f0f9ff",borderTop:"1px solid #bae6fd",fontSize:11,color:"#0369a1",display:"flex",alignItems:"center",gap:6}}>
        <div style={{width:6,height:6,background:"#0ea5e9",borderRadius:"50%"}}/>
        {L("3 Abschnitte · alles aus einem LinkedIn-Export generiert","3 sections · all generated from one LinkedIn export","3 sections · tout généré depuis un export LinkedIn","3 sezioni · tutto da un export LinkedIn")}
      </div>
    </div>
  );

  const ExcelDemo=()=>{
    const rows=[
      {cat:L("Miete","Rent","Loyer","Affitto"),          budget:1800, ist:1800,  col:null},
      {cat:L("Lebensmittel","Groceries","Alimentation","Alimentari"), budget:600,  ist:543.5, col:null},
      {cat:L("Verkehr","Transport","Transport","Trasporti"),      budget:200,  ist:187,   col:null},
      {cat:L("Freizeit","Leisure","Loisirs","Tempo libero"),      budget:300,  ist:342,   col:"over"},
      {cat:L("Gesundheit","Health","Santé","Salute"),       budget:150,  ist:89,    col:null},
    ];
    const totalB=rows.reduce((s,r)=>s+r.budget,0);
    const totalI=rows.reduce((s,r)=>s+r.ist,0);
    const diff=(v,b)=>v<=b;
    return(
      <div style={{background:"white",borderRadius:12,overflow:"hidden",border:"1px solid #d1d5db",fontSize:12}}>
        {/* Excel toolbar */}
        <div style={{background:"#217346",padding:"6px 12px",display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:14}}>📊</div>
          <span style={{color:"white",fontWeight:700,fontSize:12}}>Haushaltsbuch_2025.xlsx</span>
          <span style={{marginLeft:"auto",color:"rgba(255,255,255,.6)",fontSize:11}}>Microsoft Excel</span>
        </div>
        {/* Sheet tab */}
        <div style={{background:"#f3f4f6",borderBottom:"1px solid #d1d5db",padding:"2px 0 0 8px",display:"flex",gap:1}}>
          <div style={{background:"white",border:"1px solid #d1d5db",borderBottom:"none",padding:"3px 14px",fontSize:11,color:"#217346",fontWeight:600,borderRadius:"3px 3px 0 0"}}>📋 {L("Übersicht","Overview","Vue d'ensemble","Panoramica")}</div>
          <div style={{background:"#e5e7eb",border:"1px solid #d1d5db",borderBottom:"none",padding:"3px 14px",fontSize:11,color:"#6b7280",borderRadius:"3px 3px 0 0"}}>📈 {L("Grafik","Chart","Graphique","Grafico")}</div>
        </div>
        {/* Column headers */}
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",background:"#217346",color:"white",fontWeight:700,fontSize:11}}>
          {[L("Kategorie","Category","Catégorie","Categoria"),L("Budget","Budget","Budget","Budget"),L("Ist","Actual","Réel","Reale"),L("Status","Status","Statut","Stato")].map((h,i)=>(
            <div key={i} style={{padding:"7px 10px",borderRight:"1px solid rgba(255,255,255,.2)",textAlign:i>0?"right":"left"}}>{h}</div>
          ))}
        </div>
        {/* Data rows */}
        {rows.map((r,i)=>{
          const ok=diff(r.ist,r.budget);
          return(
            <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",background:i%2===0?"white":"#f9fafb",borderBottom:"1px solid #f0f0f0"}}>
              <div style={{padding:"6px 10px",borderRight:"1px solid #e5e7eb",color:"#111"}}>{r.cat}</div>
              <div style={{padding:"6px 10px",borderRight:"1px solid #e5e7eb",textAlign:"right",color:"#374151",fontFamily:"monospace"}}>{r.budget.toLocaleString("de-CH")}</div>
              <div style={{padding:"6px 10px",borderRight:"1px solid #e5e7eb",textAlign:"right",fontFamily:"monospace",color:ok?"#374151":"#dc2626",fontWeight:ok?400:600}}>{r.ist.toLocaleString("de-CH")}</div>
              <div style={{padding:"6px 10px",textAlign:"right",fontSize:12}}>{ok?<span style={{color:"#16a34a",fontWeight:700}}>✓ OK</span>:<span style={{color:"#dc2626",fontWeight:700}}>⚠️ +{(r.ist-r.budget).toFixed(0)}</span>}</div>
            </div>
          );
        })}
        {/* Total row */}
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",background:"#f0fdf4",borderTop:"2px solid #217346"}}>
          <div style={{padding:"7px 10px",fontWeight:700,color:"#217346",fontSize:12}}>TOTAL <span style={{fontSize:10,fontWeight:400,color:"#6b7280"}}>· =SUMME(B2:B6)</span></div>
          <div style={{padding:"7px 10px",textAlign:"right",fontWeight:700,fontFamily:"monospace",color:"#217346"}}>{totalB.toLocaleString("de-CH")}</div>
          <div style={{padding:"7px 10px",textAlign:"right",fontWeight:700,fontFamily:"monospace",color:totalI<=totalB?"#16a34a":"#dc2626"}}>{totalI.toLocaleString("de-CH")}</div>
          <div style={{padding:"7px 10px",textAlign:"right",fontWeight:700,fontSize:12,color:totalI<=totalB?"#16a34a":"#dc2626"}}>{totalI<=totalB?"✓ Im Budget":"⚠️ Überzogen"}</div>
        </div>
        <div style={{padding:"8px 12px",background:"#f9fafb",fontSize:11,color:"#6b7280",borderTop:"1px solid #e5e7eb"}}>
          📌 {L("Formeln, bedingte Formatierung & Grafik-Tab enthalten","Formulas, conditional formatting & chart tab included","Formules, mise en forme conditionnelle & onglet graphique inclus","Formule, formattazione condizionale e scheda grafico incluse")}
        </div>
      </div>
    );
  };

  const PptxDemo=()=>{
    const [active,setActive]=useState(0);
    const accent="#C33B2E";
    const slides=[
      {n:1,lbl:L("Titelfolie","Title Slide","Diapo titre","Diapositiva titolo"),
       thumb:()=><div style={{background:`linear-gradient(135deg,${accent},#8e1a0e)`,width:"100%",height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",padding:"6px 7px"}}>
         <div style={{height:2,background:"rgba(255,255,255,.4)",marginBottom:4,width:"70%"}}/>
         <div style={{height:1,background:"rgba(255,255,255,.2)",width:"50%"}}/>
         <div style={{height:1,background:"rgba(255,255,255,.15)",marginTop:2,width:"60%"}}/>
       </div>,
       content:()=><div style={{flex:1,background:`linear-gradient(135deg,${accent} 0%,#8e1a0e 100%)`,display:"flex",flexDirection:"column",justifyContent:"center",padding:"28px 36px",position:"relative",overflow:"hidden"}}>
         <div style={{position:"absolute",right:-20,top:-20,width:140,height:140,background:"rgba(255,255,255,.06)",borderRadius:"50%"}}/>
         <div style={{position:"absolute",right:20,bottom:-30,width:90,height:90,background:"rgba(255,255,255,.04)",borderRadius:"50%"}}/>
         <div style={{fontSize:10,color:"rgba(255,255,255,.5)",fontWeight:600,letterSpacing:"2px",textTransform:"uppercase",marginBottom:12}}>STELLIFY · PRÄSENTATION</div>
         <div style={{fontFamily:"var(--hd)",fontSize:20,fontWeight:800,color:"white",lineHeight:1.25,marginBottom:10}}>{L("Quartalsreview","Quarterly Review","Revue Trimestrielle","Review Trimestrale")}<br/><span style={{color:"rgba(255,255,255,.7)"}}>Q1 2025</span></div>
         <div style={{width:40,height:3,background:"rgba(255,255,255,.4)",borderRadius:2,marginBottom:10}}/>
         <div style={{fontSize:12,color:"rgba(255,255,255,.65)",lineHeight:1.5}}>{L("Marketing Performance & Ausblick Q2","Marketing Performance & Q2 Outlook","Performance Marketing & Perspectives Q2","Performance Marketing & Prospettive Q2")}</div>
         <div style={{marginTop:18,display:"flex",gap:6}}>
           {["Marketing","Q1 2025",L("Schweiz","Switzerland","Suisse","Svizzera")].map((t,i)=><span key={i} style={{background:"rgba(255,255,255,.12)",color:"rgba(255,255,255,.8)",padding:"3px 9px",borderRadius:20,fontSize:10,fontWeight:600}}>{t}</span>)}
         </div>
       </div>},
      {n:2,lbl:L("Highlights","Highlights","Points forts","Punti salienti"),
       thumb:()=><div style={{background:"white",width:"100%",height:"100%",padding:"5px 6px"}}>
         <div style={{height:2,background:accent,marginBottom:3,width:"60%"}}/>
         {[80,65,72].map((w,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:2,marginBottom:2}}>
           <div style={{width:2,height:2,background:accent,borderRadius:"50%",flexShrink:0}}/>
           <div style={{height:1,background:"#e5e7eb",width:`${w}%`}}/>
         </div>)}
       </div>,
       content:()=><div style={{flex:1,background:"white",padding:"22px 28px",display:"flex",flexDirection:"column"}}>
         <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,paddingBottom:10,borderBottom:`2px solid ${accent}`}}>
           <div style={{width:4,height:20,background:accent,borderRadius:2}}/>
           <div style={{fontFamily:"var(--hd)",fontSize:16,fontWeight:800,color:"#1a1a1a"}}>{L("Highlights Q1 2025","Highlights Q1 2025","Points forts Q1 2025","Punti salienti Q1 2025")}</div>
         </div>
         {[
           {ico:"📈",kpi:L("Umsatz","Revenue","Chiffre d'affaires","Fatturato"),val:"CHF 2.4M",delta:"+18%",ok:true},
           {ico:"👥",kpi:L("Neue Kunden","New Customers","Nouveaux Clients","Nuovi Clienti"),val:"127",delta:"+34%",ok:true},
           {ico:"⭐",kpi:"NPS Score",val:"72",delta:L("Branche Ø 45","Industry avg. 45","Secteur moy. 45","Media sett. 45"),ok:true},
         ].map((r,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 12px",background:i%2===0?"#fafafa":"white",borderRadius:8,marginBottom:6,border:"1px solid #f0f0f0"}}>
           <div style={{fontSize:18,flexShrink:0}}>{r.ico}</div>
           <div style={{flex:1}}>
             <div style={{fontSize:11,color:"#6b7280",fontWeight:600}}>{r.kpi}</div>
             <div style={{fontFamily:"var(--hd)",fontSize:16,fontWeight:800,color:"#111"}}>{r.val}</div>
           </div>
           <div style={{background:r.ok?"#dcfce7":"#fee2e2",color:r.ok?"#16a34a":"#dc2626",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{r.delta}</div>
         </div>)}
       </div>},
      {n:3,lbl:L("Diagramm","Chart","Graphique","Grafico"),
       thumb:()=><div style={{background:"white",width:"100%",height:"100%",padding:"5px 6px",display:"flex",flexDirection:"column"}}>
         <div style={{height:2,background:accent,marginBottom:4,width:"50%"}}/>
         <div style={{flex:1,display:"flex",alignItems:"flex-end",gap:2}}>
           {[50,65,80].map((h,i)=><div key={i} style={{flex:1,background:i===2?accent:"#fca5a5",height:`${h}%`,borderRadius:"1px 1px 0 0"}}/>)}
         </div>
       </div>,
       content:()=><div style={{flex:1,background:"white",padding:"22px 28px",display:"flex",flexDirection:"column"}}>
         <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,paddingBottom:10,borderBottom:`2px solid ${accent}`}}>
           <div style={{width:4,height:20,background:accent,borderRadius:2}}/>
           <div style={{fontFamily:"var(--hd)",fontSize:16,fontWeight:800,color:"#1a1a1a"}}>{L("Umsatz Jan–März","Revenue Jan–Mar","CA Jan–Mars","Fatturato Gen–Mar")}</div>
         </div>
         <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
           <div style={{display:"flex",alignItems:"flex-end",gap:10,height:110,marginBottom:8}}>
             {[{m:"Jan",v:66,chf:"0.72M"},{m:"Feb",v:78,chf:"0.86M"},{m:L("Mär","Mar","Mars","Mar"),v:100,chf:"1.10M"}].map((bar,i)=>(
               <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                 <div style={{fontSize:11,fontWeight:700,color:i===2?accent:"#374151"}}>{bar.chf}</div>
                 <div style={{width:"100%",background:`linear-gradient(to top,${accent},#e74c3c)`,height:`${bar.v}%`,borderRadius:"4px 4px 0 0",opacity:i===2?1:0.55}}/>
                 <div style={{fontSize:11,color:"#6b7280",fontWeight:600}}>{bar.m}</div>
               </div>
             ))}
           </div>
           <div style={{height:1,background:"#e5e7eb",marginBottom:6}}/>
           <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#6b7280"}}>
             <span>📈 {L("Total Q1: CHF 2.68M","Total Q1: CHF 2.68M","Total Q1: CHF 2.68M","Totale Q1: CHF 2.68M")}</span>
             <span style={{color:"#16a34a",fontWeight:700}}>▲ +18% {L("vs. Vorjahr","vs. last year","vs. l'an dernier","vs. anno scorso")}</span>
           </div>
         </div>
       </div>},
      {n:4,lbl:L("Ausblick Q2","Q2 Outlook","Perspectives Q2","Prospettive Q2"),
       thumb:()=><div style={{background:"white",width:"100%",height:"100%",padding:"5px 6px"}}>
         <div style={{height:2,background:accent,marginBottom:3,width:"55%"}}/>
         {[75,60,68].map((w,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:2,marginBottom:2}}>
           <div style={{width:3,height:3,background:"#fbbf24",borderRadius:1,flexShrink:0}}/>
           <div style={{height:1,background:"#e5e7eb",width:`${w}%`}}/>
         </div>)}
       </div>,
       content:()=><div style={{flex:1,background:"white",padding:"22px 28px",display:"flex",flexDirection:"column"}}>
         <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,paddingBottom:10,borderBottom:`2px solid ${accent}`}}>
           <div style={{width:4,height:20,background:accent,borderRadius:2}}/>
           <div style={{fontFamily:"var(--hd)",fontSize:16,fontWeight:800,color:"#1a1a1a"}}>{L("Ausblick Q2 2025","Q2 2025 Outlook","Perspectives Q2 2025","Prospettive Q2 2025")}</div>
         </div>
         {[
           {num:"01",text:L("Umsatzziel: CHF 2.8M (+17%)","Revenue target: CHF 2.8M (+17%)","Objectif CA: CHF 2.8M (+17%)","Obiettivo fatturato: CHF 2.8M (+17%)")},
           {num:"02",text:L("Launch Produktlinie CH-West","Launch product line CH-West","Lancement gamme CH-Ouest","Lancio linea prodotti CH-Ovest")},
           {num:"03",text:L("Partnerschaften: 3 neue Enterprise-Deals","Partnerships: 3 new enterprise deals","Partenariats: 3 nouveaux accords","Partnership: 3 nuovi accordi enterprise")},
         ].map((item,i)=><div key={i} style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:12,padding:"10px 14px",background:"#fafafa",borderRadius:10,border:"1px solid #f0f0f0"}}>
           <div style={{width:28,height:28,background:accent,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
             <span style={{fontSize:10,fontWeight:800,color:"white"}}>{item.num}</span>
           </div>
           <div style={{fontSize:13,color:"#1a1a1a",lineHeight:1.5,paddingTop:5,fontWeight:500}}>{item.text}</div>
         </div>)}
       </div>},
    ];
    const cur=slides[active];
    const notes=[
      L("Willkommen & kurze Vorstellung. Agenda vorstellen.","Welcome & brief introduction. Present agenda.","Bienvenue & brève introduction. Présenter l'ordre du jour.","Benvenuti & breve introduzione. Presentare l'ordine del giorno."),
      L("Alle 3 KPIs übertroffen – kurz die Gründe erläutern.","All 3 KPIs exceeded – briefly explain the reasons.","Les 3 KPIs dépassés – expliquer brièvement les raisons.","Tutti e 3 i KPI superati – spiegare brevemente le ragioni."),
      L("März stärkstes Monat – Kampagne als Haupttreiber nennen.","March strongest month – mention campaign as main driver.","Mars meilleur mois – mentionner la campagne comme moteur.","Marzo mese più forte – citare la campagna come motore principale."),
      L("Ziele sind ehrgeizig aber realistisch – Details auf Anfrage.","Targets are ambitious but realistic – details on request.","Objectifs ambitieux mais réalistes – détails sur demande.","Obiettivi ambiziosi ma realistici – dettagli su richiesta."),
    ];
    return(
      <div style={{borderRadius:12,overflow:"hidden",border:"1px solid #d1d5db",fontSize:12,userSelect:"none"}}>
        {/* Title bar */}
        <div style={{background:"#B7372A",padding:"5px 12px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13}}>📽️</span>
          <span style={{color:"white",fontWeight:700,fontSize:11,flex:1}}>Quartalsreview_Q1_2025.pptx – PowerPoint</span>
          <div style={{display:"flex",gap:5}}>
            {["─","□","✕"].map((b,i)=><div key={i} style={{width:16,height:14,background:"rgba(255,255,255,.15)",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"white",cursor:"pointer"}}>{b}</div>)}
          </div>
        </div>
        {/* Ribbon */}
        <div style={{background:"#f3f4f6",borderBottom:"1px solid #d1d5db",padding:"3px 10px",display:"flex",gap:14,alignItems:"center"}}>
          {[L("Datei","File","Fichier","File"),L("Start","Home","Accueil","Home"),"Insert","Design"].map((tab,i)=>(
            <span key={i} style={{fontSize:10,color:i===1?"#B7372A":"#374151",fontWeight:i===1?700:400,cursor:"pointer",padding:"3px 0",borderBottom:i===1?"2px solid #B7372A":"2px solid transparent"}}>{tab}</span>
          ))}
          <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
            <div style={{background:"#B7372A",color:"white",fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:3,cursor:"pointer"}}>{L("Präsentieren","Present","Présenter","Presentare")} ▶</div>
          </div>
        </div>
        {/* Main area */}
        <div style={{display:"flex",background:"#404040",gap:0}}>
          {/* Slides panel */}
          <div style={{width:76,background:"#2b2b2b",padding:"8px 6px",display:"flex",flexDirection:"column",gap:4,overflowY:"auto",flexShrink:0}}>
            {slides.map((sl,i)=>(
              <div key={i} onClick={()=>setActive(i)} style={{cursor:"pointer",transition:"all .15s"}}>
                <div style={{fontSize:7,color:i===active?"#fff":"#888",marginBottom:2,textAlign:"center"}}>{i+1}</div>
                <div style={{width:"100%",paddingTop:"56.25%",position:"relative",borderRadius:2,overflow:"hidden",border:i===active?`2px solid #B7372A`:"2px solid transparent",boxShadow:i===active?"0 0 0 1px rgba(183,55,42,.4)":"none"}}>
                  <div style={{position:"absolute",inset:0}}>{sl.thumb()}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Canvas */}
          <div style={{flex:1,display:"flex",flexDirection:"column",background:"#505050",padding:"10px"}}>
            <div style={{background:"white",boxShadow:"0 4px 20px rgba(0,0,0,.4)",borderRadius:1,display:"flex",flexDirection:"column",overflow:"hidden",aspectRatio:"16/9",maxHeight:220}}>
              {cur.content()}
            </div>
            {/* Notes */}
            <div style={{marginTop:8,background:"rgba(0,0,0,.3)",borderRadius:4,padding:"6px 10px"}}>
              <div style={{fontSize:9,color:"rgba(255,255,255,.4)",fontWeight:600,letterSpacing:"1px",marginBottom:3}}>SPEAKER NOTES</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.65)",lineHeight:1.5}}>{notes[active]}</div>
            </div>
          </div>
        </div>
        {/* Status bar */}
        <div style={{background:"#B7372A",padding:"3px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:9,color:"rgba(255,255,255,.7)"}}>{L("Folie","Slide","Diapositive","Diapositiva")} {active+1} {L("von","of","sur","di")} {slides.length}</span>
          <span style={{fontSize:9,color:"rgba(255,255,255,.7)"}}>Widescreen (16:9)</span>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {["⊞","▣","◫"].map((ic,i)=><span key={i} style={{fontSize:10,color:"rgba(255,255,255,.5)",cursor:"pointer"}}>{ic}</span>)}
            <span style={{fontSize:9,color:"rgba(255,255,255,.5)"}}>72%</span>
          </div>
        </div>
      </div>
    );
  };

  const ProDemo=({toolId, sub})=>{
    const demo = DEMO_OUTPUTS[toolId];
    const strLink = yearly ? C.stripeYearly : C.stripeMonthly;
    return (
      <div>
        <div style={{background:"linear-gradient(135deg,#f0fdf9,#ecfdf5)",border:"1.5px solid rgba(16,185,129,.2)",borderRadius:18,padding:"20px 22px",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <span style={{background:"var(--em)",color:"white",borderRadius:7,padding:"2px 10px",fontSize:11,fontWeight:700}}>✦ {L("Beispiel-Output","Example output","Exemple de résultat","Esempio output")}</span>
            <span style={{fontSize:12,color:"var(--mu)"}}>{L("So sieht dein Ergebnis aus","This is what your result looks like","Voici votre résultat","Ecco il tuo risultato")}</span>
          </div>
          {toolId==="excel" ? <ExcelDemo/> :
           toolId==="pptx"  ? <PptxDemo/> :
           toolId==="li2job"? <Li2jobDemo/> :
           <div style={{background:"white",borderRadius:12,padding:"16px",border:"1px solid rgba(16,185,129,.12)",fontSize:13,color:"var(--ink)",lineHeight:1.85,whiteSpace:"pre-wrap",maxHeight:280,overflow:"hidden",maskImage:"linear-gradient(to bottom,black 60%,transparent 100%)",WebkitMaskImage:"linear-gradient(to bottom,black 60%,transparent 100%)"}}>
             {demo || sub}
           </div>}
        </div>
        <div className="card" style={{textAlign:"center",padding:"24px"}}>
          <div style={{fontSize:32,marginBottom:8}}>🚀</div>
          <div style={{fontFamily:"var(--hd)",fontSize:18,fontWeight:800,marginBottom:6}}>{L("Bereit für dein Ergebnis?","Ready for your result?","Prêt pour votre résultat?","Pronto per il tuo risultato?")}</div>
          <p style={{fontSize:13,color:"var(--mu)",marginBottom:18,lineHeight:1.7}}>{L(`Alle Tools · CHF ${C.priceM}/Mo. · Jederzeit kündbar`,`All tools · CHF ${C.priceM}/mo · Cancel anytime`,`Tous les outils · CHF ${C.priceM}/mois · Résiliable`,`Tutti gli strumenti · CHF ${C.priceM}/mese`)}</p>
          <button className="btn b-em" style={{width:"100%",justifyContent:"center"}} onClick={()=>window.open(strLink,"_blank")}>
            {L("Jetzt Pro werden & starten →","Become Pro & start →","Devenir Pro & commencer →","Diventa Pro & inizia →")}
          </button>
        </div>
      </div>
    );
  };

  const LockMsg=({sub})=>(<ProDemo toolId={page} sub={sub}/>);

  const TOOL_INFO = {
    app:      {ico:"✍️", title:L("Bewerbungen","Applications","Candidatures","Candidature"),       desc:L("Erstellt Motivationsschreiben & Lebenslauf in 60 Sekunden – live, auf dein Profil zugeschnitten.","Generates cover letter & CV in 60 seconds – live, tailored to your profile.","Génère lettre de motivation & CV en 60 secondes – en direct, adapté à votre profil.","Genera lettera di motivazione & CV in 60 secondi – live, su misura per il tuo profilo.")},
    linkedin: {ico:"💼", title:"LinkedIn Optimierung",                                              desc:L("Analysiert dein LinkedIn-Profil und optimiert Headline, About & Skills für Recruiter.","Analyzes your LinkedIn profile and optimizes Headline, About & Skills for recruiters.","Analyse votre profil LinkedIn et optimise Headline, About & Skills pour les recruteurs.","Analizza il tuo profilo LinkedIn e ottimizza Headline, About & Skills per i recruiter.")},
    ats:      {ico:"🤖", title:"ATS-Simulation",                                                   desc:L("Prüft ob dein Lebenslauf durch Recruiter-Software kommt – mit Score und konkreten Tipps.","Checks if your CV passes recruiting software – with score and concrete tips.","Vérifie si votre CV passe le logiciel de recrutement – avec score et conseils concrets.","Verifica se il tuo CV supera il software di recruiting – con punteggio e consigli concreti.")},
    zeugnis:  {ico:"📜", title:L("Zeugnis-Analyse","Reference Analysis","Analyse de certificat","Analisi referenze"), desc:L("Entschlüsselt den Schweizer Zeugnis-Code und zeigt was dein Arbeitszeugnis wirklich bedeutet.","Decodes the Swiss reference code and shows what your work reference really means.","Décode le code suisse des certificats et montre ce que votre certificat signifie vraiment.","Decodifica il codice svizzero dei certificati e mostra cosa significa davvero il tuo certificato.")},
    jobmatch: {ico:"🎯", title:"Job-Matching",                                                     desc:L("Findet deine Top 5 passenden Stellenprofile basierend auf deinen Skills und Wünschen.","Finds your top 5 matching job profiles based on your skills and preferences.","Trouve vos 5 postes idéaux basés sur vos compétences et préférences.","Trova i tuoi 5 profili di lavoro ideali basati sulle tue competenze e preferenze.")},
    coach:    {ico:"🎤", title:"Interview-Coach",                                                  desc:L("Simuliert ein echtes Vorstellungsgespräch und gibt dir danach eine Bewertung mit Tipps.","Simulates a real job interview and gives you a rating with tips afterwards.","Simule un vrai entretien d'embauche et vous donne ensuite une évaluation avec des conseils.","Simula un vero colloquio di lavoro e ti dà poi una valutazione con consigli.")},
    excel:    {ico:"📊", title:"Excel-Generator",                                                  desc:L("Beschreibe deine Tabelle – die KI erstellt Struktur, Spalten, Beispieldaten und Formeln.","Describe your spreadsheet – AI creates structure, columns, sample data and formulas.","Décrivez votre tableau – l'IA crée structure, colonnes, données d'exemple et formules.","Descrivi il tuo foglio – l'IA crea struttura, colonne, dati di esempio e formule.")},
    pptx:     {ico:"📽️", title:"PowerPoint-Maker",                                                desc:L("Erstellt eine komplette Präsentation mit Folien, Bullet Points und Sprechernotizen.","Creates a complete presentation with slides, bullet points and speaker notes.","Crée une présentation complète avec diapositives, points clés et notes de présentateur.","Crea una presentazione completa con diapositive, punti chiave e note del presentatore.")},
  };
  const ToolBanner=({pageId})=>{const info=TOOL_INFO[pageId];if(!info)return null;return(
    <div style={{background:"linear-gradient(135deg,rgba(16,185,129,.08),rgba(16,185,129,.03))",border:"1px solid rgba(16,185,129,.2)",borderRadius:14,padding:"16px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:14}}>
      <div style={{fontSize:32,flexShrink:0}}>{info.ico}</div>
      <div><div style={{fontFamily:"var(--hd)",fontSize:16,fontWeight:800,marginBottom:3}}>{info.title}</div>
      <div style={{fontSize:13,color:"var(--mu)",lineHeight:1.5}}>{info.desc}</div></div>
    </div>
  );};

  // ══════════════════ LANDING PAGE ══════════════════
  const authModals = <>
    {showAuth&&<AuthModal lang={lang} onClose={()=>setShowAuth(false)} defaultMode={authMode}
      onSuccess={(user)=>{
        const sess = {
          email: user.email,
          plan: user.plan,
          isAdmin: user.isAdmin||false,
          displayName: user.displayName||(user.email?.split("@")[0]||""),
          provider: user.provider||"email",
          avatar: user.avatar||"",
        };
        setAuthSession(sess);
        if(user.plan==="pro"||user.plan==="family"||user.plan==="team"||user.isAdmin){actPro();setPro(true);}
        // Auto-Profil: Falls der User ein gespeichertes Profil hat, lade es
        const profiles = loadProfiles();
        // Suche Profil mit gleicher E-Mail oder erstes Profil
        const linked = profiles.find(p=>p.linkedEmail===user.email.toLowerCase()) || profiles[0];
        if(linked) {
          setActiveProfile(linked);
          setProf({name:linked.name||"",beruf:linked.beruf||"",erfahrung:linked.erfahrung||"",skills:linked.skills||"",sprachen:linked.sprachen||"",ausbildung:linked.ausbildung||""});
          saveActiveProfileId(linked.id);
        }
        setShowAuth(false);
        showToast((lang==="de"?`Willkommen, ${sess.displayName}! 👋`:`Welcome, ${sess.displayName}! 👋`));
      }}/>}
    {showAdmin&&<AdminDashboard lang={lang} onClose={()=>setShowAdmin(false)}/>}
    {showMembers&&<MemberPanel lang={lang} session={authSession} onClose={()=>setShowMembers(false)}/>}
  </>;

  if(page==="landing") return(<>{<style>{FONTS+CSS}</style>}{pw&&<PW/>}
    {showOnboarding && <OnboardingFlow lang={lang} onDone={doneOnboarding}/>}
    {showProfiles&&<ProfileManager lang={lang} authSession={authSession} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    {authModals}
    <ToastContainer/>
    {pageLoading && <div className="top-progress"><div className="top-progress-bar" style={{width:"80%"}}/></div>}
    <ChatBot lang={lang} pro={pro} setPw={setPw} navTo={navTo} authSession={authSession} onAuthOpen={()=>{setAuthMode("login");setShowAuth(true);}}/>
    {cookieBanner&&<CookieBanner lang={lang} onAccept={acceptCookie}/>}
    <div className="page-anim">
      <Nav/>
      {/* HERO */}
      <section className="hero"><div className="hbg"/><div className="hdots"/>
        <div className="con">
          <div className="eyebrow">{t.hero.eye}</div>
          <h1 className="hh">{t.hero.h1a}<br/>{t.hero.h1b} <em>{t.hero.h1c}</em></h1>
          <p className="hsub">{t.hero.sub}</p>
          <div className="hctas">
            <button className="btn b-em b-lg" onClick={()=>navTo("app")}>{t.hero.cta}</button>
            <button className="btn b-out" onClick={()=>document.getElementById("tools")?.scrollIntoView({behavior:"smooth"})}>{t.hero.how}</button>
          </div>
          {/* Gratis-Hinweis – prominent */}
          <div style={{marginTop:16,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <button onClick={()=>navTo("app")} style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(16,185,129,.13)",border:"1.5px solid rgba(16,185,129,.35)",borderRadius:30,padding:"9px 20px",fontSize:13,fontWeight:700,color:"var(--em)",cursor:"pointer",transition:"all .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(16,185,129,.22)";e.currentTarget.style.transform="translateY(-1px)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(16,185,129,.13)";e.currentTarget.style.transform="none";}}>
              <span>🎁</span>
              <span>{lang==="de"?"Jetzt 1× kostenlos testen – ohne Kreditkarte":lang==="en"?"Try 1× for free – no credit card":lang==="fr"?"Essai 1× gratuit – sans carte":"Prova 1× gratis – senza carta"}</span>
              <span style={{opacity:.6}}>→</span>
            </button>
          </div>
          {/* Trust signals */}
          <div style={{display:"flex",flexWrap:"wrap",gap:"10px 20px",marginTop:18,alignItems:"center"}}>
            {[
              {ico:"🔒", txt:lang==="de"?"Keine Kreditkarte nötig":lang==="fr"?"Sans carte de crédit":lang==="it"?"Senza carta di credito":"No credit card needed"},
              {ico:"🇨🇭", txt:lang==="de"?"Schweizer Unternehmen":lang==="fr"?"Entreprise suisse":lang==="it"?"Azienda svizzera":"Swiss company"},
              {ico:"⚡", txt:lang==="de"?"1× gratis ausprobieren":lang==="fr"?"1× gratuit":lang==="it"?"1× gratis":"1× free to try"},
            ].map((tr,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"rgba(255,255,255,.38)",fontWeight:500}}>
                <span style={{fontSize:13}}>{tr.ico}</span><span>{tr.txt}</span>
              </div>
            ))}
          </div>
          <div className="hstats">{t.hero.stats.map((s,i)=><div key={i}><div className="stat-n">{s.n}</div><div className="stat-l">{s.l}</div></div>)}</div>
        </div>
      </section>

      {/* ═══ TOOLS HEADER ═══ */}
      <section style={{padding:"72px 0 48px",background:"var(--bg)"}} id="tools">
        <div className="con">
          <div className="sh shc">
            <div className="seye">{lang==="de"?"✦ 20+ Tools – ein Abo":lang==="en"?"✦ 20+ Tools – one subscription":lang==="fr"?"✦ 20+ outils – un abonnement":"✦ 20+ strumenti – un abbonamento"}</div>
            <h2 className="st">{lang==="de"?"Nicht nur für Jobsuchende.":lang==="en"?"Not just for job seekers.":lang==="fr"?"Pas seulement pour les chercheurs d'emploi.":"Non solo per chi cerca lavoro."}</h2>
            <p className="ss" style={{margin:"0 auto"}}>{lang==="de"?"Karriere, Schule, Produktivität – alles in einem Abo für CHF 19.90/Monat.":lang==="en"?"Career, school, productivity – all in one subscription for CHF 19.90/month.":lang==="fr"?"Carrière, école, productivité – tout pour CHF 19.90/mois.":"Carriera, scuola, produttività – tutto per CHF 19.90/mese."}</p>
            {/* Category pills */}
            <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:8,marginTop:24}}>
              {[
                {ico:"💼",lbl:lang==="de"?"Karriere":lang==="fr"?"Carrière":lang==="it"?"Carriera":"Career",n:"8"},
                {ico:"🎓",lbl:lang==="de"?"Schule":lang==="fr"?"École":lang==="it"?"Scuola":"School",n:"3"},
                {ico:"⚡",lbl:lang==="de"?"Produktivität":lang==="fr"?"Productivité":lang==="it"?"Produttività":"Productivity",n:"3"},
                {ico:"🌐",lbl:lang==="de"?"4 Sprachen":lang==="fr"?"4 langues":lang==="it"?"4 lingue":"4 languages",n:""},
              ].map((p,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6,background:"white",border:"1.5px solid var(--bo)",borderRadius:30,padding:"7px 16px",fontSize:13,fontWeight:600,color:"var(--ink)"}}>
                  <span>{p.ico}</span><span>{p.lbl}</span>{p.n&&<span style={{background:"var(--em3)",color:"var(--em2)",borderRadius:20,padding:"1px 7px",fontSize:11,fontWeight:700}}>{p.n}</span>}
                </div>
              ))}
            </div>
            {/* Price strip – schlank */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginTop:22,flexWrap:"wrap"}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:12,background:"white",border:"1.5px solid rgba(16,185,129,.22)",borderRadius:40,padding:"10px 10px 10px 20px",boxShadow:"0 2px 12px rgba(16,185,129,.07)"}}>
                <div style={{fontSize:13,color:"var(--mu)",fontWeight:500}}>
                  {lang==="de"?"Ab":lang==="fr"?"Dès":lang==="it"?"Da":"From"}{" "}
                  <span style={{fontFamily:"var(--hd)",fontSize:17,fontWeight:800,color:"var(--ink)"}}>CHF {C.priceY}</span>
                  <span style={{fontSize:12,color:"var(--mu)"}}>/Mo.</span>
                  <span style={{fontSize:10,color:"var(--mu)",fontStyle:"italic",marginLeft:2}}>{lang==="de"?"(jährlich)":lang==="fr"?"(annuel)":lang==="it"?"(annuale)":"(annual)"}</span>
                  <span style={{marginLeft:8,fontSize:11,background:"rgba(16,185,129,.1)",color:"var(--em2)",borderRadius:20,padding:"2px 9px",fontWeight:700}}>🔥 –25%</span>
                </div>
                <button onClick={()=>document.getElementById("preise")?.scrollIntoView({behavior:"smooth"})} style={{background:"var(--em)",color:"white",border:"none",borderRadius:25,padding:"9px 18px",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                  {lang==="de"?"Jetzt starten →":lang==="fr"?"Commencer →":lang==="it"?"Inizia →":"Get started →"}
                </button>
              </div>
              <div style={{fontSize:11,color:"var(--mu)"}}>🔒 {lang==="de"?"1× gratis · keine Kreditkarte":lang==="fr"?"1× gratuit · sans carte":"1× free · no credit card"}</div>
            </div>
          </div>
        </div>
      </section>
      <section style={{background:"var(--dk)",padding:"0 0 72px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(rgba(16,185,129,.05) 1px,transparent 1px)",backgroundSize:"28px 28px",pointerEvents:"none"}}/>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 60% 70% at 80% 50%,rgba(16,185,129,.07),transparent)",pointerEvents:"none"}}/>
        <div className="con" style={{position:"relative"}}>
          {/* Streak & Weekly Goals – nur für eingeloggte Nutzer */}
          {authSession && !authSession.isAdmin && (
            <div style={{paddingTop:32}}>
              <StreakBanner lang={lang}/>
            </div>
          )}
          <div style={{display:"flex",alignItems:"center",gap:12,paddingTop:authSession&&!authSession.isAdmin?0:52,marginBottom:28}}>
            <div style={{width:36,height:36,background:"var(--em3)",border:"1.5px solid rgba(16,185,129,.3)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>💼</div>
            <div>
              <div style={{fontFamily:"var(--hd)",fontSize:21,fontWeight:800,color:"white",letterSpacing:"-.5px"}}>{lang==="de"?"Karriere & Bewerbung":lang==="en"?"Career & Applications":lang==="fr"?"Carrière & Candidatures":"Carriera & Candidature"}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.3)",marginTop:2}}>{lang==="de"?"Für Jobsuchende & Berufstätige":lang==="en"?"For job seekers & professionals":lang==="fr"?"Pour chercheurs d'emploi & professionnels":"Per chi cerca lavoro & professionisti"}</div>
            </div>
          </div>

          {/* ✦ LI2JOB HERO CARD – Alleinstellungsmerkmal */}
          <div onClick={()=>navTo("li2job")} style={{cursor:"pointer",background:"linear-gradient(135deg,#0a66c2 0%,#004182 55%,#003068 100%)",border:"none",borderRadius:24,padding:"0",marginBottom:20,position:"relative",overflow:"hidden",transition:"all .28s",boxShadow:"0 8px 40px rgba(10,102,194,.25)"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-5px)";e.currentTarget.style.boxShadow="0 28px 64px rgba(10,102,194,.45)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 8px 40px rgba(10,102,194,.25)";}}>
            {/* Background design elements */}
            <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(rgba(255,255,255,.04) 1px,transparent 1px)",backgroundSize:"22px 22px",pointerEvents:"none"}}/>
            <div style={{position:"absolute",top:-60,right:-20,width:280,height:280,background:"radial-gradient(circle,rgba(255,255,255,.08),transparent 70%)",pointerEvents:"none"}}/>
            <div style={{position:"absolute",bottom:-40,left:-20,width:200,height:200,background:"radial-gradient(circle,rgba(10,102,194,.4),transparent 70%)",pointerEvents:"none"}}/>
            {/* Content */}
            <div style={{display:"flex",alignItems:"stretch",position:"relative"}}>
              {/* Left: Main content */}
              <div style={{flex:1,padding:"28px 30px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                  <span style={{fontSize:10,fontWeight:800,background:"white",color:"#0a66c2",padding:"4px 12px",borderRadius:20,letterSpacing:"1.5px",textTransform:"uppercase"}}>✦ {lang==="de"?"NEU & EINZIGARTIG":lang==="en"?"NEW & UNIQUE":lang==="fr"?"NOUVEAU":"UNICO"}</span>
                  <span style={{fontSize:10,fontWeight:700,background:"rgba(255,255,255,.12)",color:"rgba(255,255,255,.85)",padding:"4px 10px",borderRadius:20,border:"1px solid rgba(255,255,255,.2)",letterSpacing:"1px"}}>PRO</span>
                </div>
                <div style={{fontFamily:"var(--hd)",fontSize:"clamp(20px,2.5vw,28px)",fontWeight:900,color:"white",letterSpacing:"-1px",marginBottom:10,lineHeight:1.05}}>
                  LinkedIn → {lang==="de"?"Bewerbung":lang==="en"?"Application":lang==="fr"?"Candidature":"Candidatura"}
                </div>
                <p style={{fontSize:13,color:"rgba(255,255,255,.62)",lineHeight:1.75,marginBottom:18,maxWidth:500}}>
                  {lang==="de"?"Profil + Stelleninserat → KI erstellt Motivationsschreiben, CV-Highlights & Top-Argumente. In 30 Sekunden.":
                   lang==="en"?"Profile + job posting → AI creates cover letter, CV highlights & top arguments. In 30 seconds.":
                   lang==="fr"?"Profil + offre → l'IA crée lettre, points forts CV & arguments. En 30 secondes.":
                   "Profilo + offerta → l'IA crea lettera, punti CV & argomenti. In 30 secondi."}
                </p>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:20}}>
                  {(lang==="de"?["✓ Motivationsschreiben","✓ CV-Highlights","✓ 3 Killer-Argumente","✓ Auf Stelle zugeschnitten"]:
                    lang==="en"?["✓ Cover letter","✓ CV highlights","✓ 3 killer arguments","✓ Job-tailored"]:
                    lang==="fr"?["✓ Lettre de motivation","✓ Points forts CV","✓ 3 arguments","✓ Adapté"]:
                    ["✓ Lettera","✓ Punti CV","✓ 3 argomenti","✓ Su misura"]).map((tag,j)=>(
                    <span key={j} style={{fontSize:11,fontWeight:600,background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.78)",padding:"4px 12px",borderRadius:20,border:"1px solid rgba(255,255,255,.12)",backdropFilter:"blur(4px)"}}>{tag}</span>
                  ))}
                </div>
                <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"white",color:"#0a66c2",padding:"11px 24px",borderRadius:12,fontSize:13,fontWeight:800,boxShadow:"0 4px 16px rgba(0,0,0,.2)",letterSpacing:"-.2px"}}>
                  {lang==="de"?"Jetzt ausprobieren →":lang==="en"?"Try it now →":lang==="fr"?"Essayer →":"Prova ora →"}
                </div>
              </div>
              {/* Right: LinkedIn "in" logo as bold design element */}
              <div style={{width:140,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",borderLeft:"1px solid rgba(255,255,255,.08)",background:"rgba(0,0,0,.12)",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,transparent,rgba(0,0,0,.15))"}}/>
                <div style={{fontFamily:"Georgia,serif",fontSize:96,fontWeight:900,color:"white",opacity:.18,lineHeight:1,letterSpacing:"-6px",userSelect:"none",transform:"rotate(-5deg)"}}>in</div>
                <div style={{position:"absolute",bottom:16,right:16,width:36,height:36,background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.15)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontFamily:"Georgia,serif",fontWeight:900,color:"white"}}>in</div>
              </div>
            </div>
          </div>

          {/* ✦ LIPOST HERO CARD – LinkedIn-Post Generator */}
          <div onClick={()=>navTo("lipost")} style={{cursor:"pointer",background:"linear-gradient(135deg,#001f3f 0%,#003d7a 50%,#0a66c2 100%)",border:"none",borderRadius:20,padding:"0",marginBottom:12,position:"relative",overflow:"hidden",transition:"all .25s",boxShadow:"0 4px 24px rgba(10,102,194,.18)"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 20px 48px rgba(10,102,194,.35)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 4px 24px rgba(10,102,194,.18)";}}>
            <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(rgba(255,255,255,.03) 1px,transparent 1px)",backgroundSize:"18px 18px",pointerEvents:"none"}}/>
            <div style={{display:"flex",alignItems:"center",position:"relative"}}>
              <div style={{flex:1,padding:"22px 26px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:10,fontWeight:800,background:"linear-gradient(90deg,#0a66c2,#005fa3)",color:"white",padding:"3px 11px",borderRadius:20,letterSpacing:"1.5px",textTransform:"uppercase",border:"1px solid rgba(255,255,255,.2)"}}>✍️ {lang==="de"?"LINKEDIN POSTS":lang==="en"?"LINKEDIN POSTS":lang==="fr"?"POSTS LINKEDIN":"POSTS LINKEDIN"}</span>
                  <span style={{fontSize:10,fontWeight:700,background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.75)",padding:"3px 9px",borderRadius:20,border:"1px solid rgba(255,255,255,.15)"}}>PRO</span>
                </div>
                <div style={{fontFamily:"var(--hd)",fontSize:"clamp(16px,2vw,21px)",fontWeight:800,color:"white",letterSpacing:"-.5px",marginBottom:7,lineHeight:1.1}}>
                  {lang==="de"?"Automatische LinkedIn-Posts – Swiss-Style":lang==="en"?"Auto LinkedIn Posts – Swiss Style":lang==="fr"?"Posts LinkedIn automatiques":"Post LinkedIn automatici"}
                </div>
                <p style={{fontSize:12.5,color:"rgba(255,255,255,.55)",lineHeight:1.65,marginBottom:14,maxWidth:480}}>
                  {lang==="de"?"3 massgeschneiderte Posts in Sekunden – keine Corporate-Floskeln, kein «Freue mich riesig». Sofort kopieren.":
                   lang==="en"?"3 tailored posts in seconds – no corporate clichés. Copy immediately.":
                   lang==="fr"?"3 posts sur mesure en secondes – pas de clichés. Copiez immédiatement.":
                   "3 post su misura in secondi – niente cliché. Copia subito."}
                </p>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
                  {(lang==="de"?["✓ 3 Post-Varianten","✓ Neuer Job · Zertifikat · Insight","✓ Schweizer Stil","✓ Sofort kopierbar"]:
                    lang==="en"?["✓ 3 post variants","✓ New job · Certificate · Insight","✓ Swiss style","✓ Copy instantly"]:
                    lang==="fr"?["✓ 3 variantes","✓ Nouveau poste · Certificat","✓ Style suisse","✓ Prêt à copier"]:
                    ["✓ 3 varianti","✓ Nuovo posto · Certificato","✓ Stile svizzero","✓ Copia subito"]).map((tag,j)=>(
                    <span key={j} style={{fontSize:11,fontWeight:600,background:"rgba(255,255,255,.08)",color:"rgba(255,255,255,.7)",padding:"3px 10px",borderRadius:20,border:"1px solid rgba(255,255,255,.1)"}}>{tag}</span>
                  ))}
                </div>
                <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(255,255,255,.12)",color:"white",padding:"9px 20px",borderRadius:10,fontSize:12,fontWeight:700,border:"1px solid rgba(255,255,255,.18)"}}>
                  {lang==="de"?"Post generieren →":lang==="en"?"Generate post →":lang==="fr"?"Générer post →":"Genera post →"}
                </div>
              </div>
              {/* Right visual */}
              <div style={{width:120,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,padding:"20px 16px",borderLeft:"1px solid rgba(255,255,255,.06)"}}>
                {["Post 1","Post 2","Post 3"].map((p,i)=>(
                  <div key={i} style={{width:"100%",background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"7px 10px",fontSize:10,color:"rgba(255,255,255,.5)",fontFamily:"var(--hd)",fontWeight:600}}>{p} ✨</div>
                ))}
              </div>
            </div>
          </div>

          {/* ✦ 2-Column: Gehaltsrechner + Tracker */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            {/* Gehaltsrechner */}
            <div onClick={()=>navTo("gehaltsrechner")} style={{cursor:"pointer",background:"linear-gradient(135deg,rgba(5,150,105,.14),rgba(5,150,105,.04))",border:"1.5px solid rgba(5,150,105,.3)",borderRadius:18,padding:"20px 22px",position:"relative",overflow:"hidden",transition:"all .22s"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.borderColor="rgba(5,150,105,.55)";e.currentTarget.style.boxShadow="0 12px 36px rgba(5,150,105,.14)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.borderColor="rgba(5,150,105,.3)";e.currentTarget.style.boxShadow="none";}}>
              <div style={{position:"absolute",top:-16,right:-16,width:80,height:80,background:"radial-gradient(circle,rgba(16,185,129,.12),transparent)",borderRadius:"50%",pointerEvents:"none"}}/>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:36,height:36,background:"rgba(16,185,129,.15)",border:"1.5px solid rgba(16,185,129,.3)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>💰</div>
                <div>
                  <div style={{fontFamily:"var(--hd)",fontSize:14,fontWeight:800,color:"white",letterSpacing:"-.3px",lineHeight:1.2}}>{lang==="de"?"KI-Gehaltsrechner Schweiz":lang==="en"?"AI Salary Calculator CH":lang==="fr"?"Calculateur salaire IA CH":"Calcolatore stipendio CH"}</div>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--em)",letterSpacing:"1px",textTransform:"uppercase",marginTop:2}}>PRO</div>
                </div>
              </div>
              <p style={{fontSize:12,color:"rgba(255,255,255,.45)",lineHeight:1.6,marginBottom:14}}>
                {lang==="de"?"Branche, Erfahrung, Kanton → KI analysiert Marktlöhne & gibt dir deine Verhandlungsbasis.":
                 lang==="en"?"Industry, experience, canton → AI analyses market salaries & gives your negotiation base.":
                 lang==="fr"?"Secteur, expérience, canton → analyse des salaires du marché.":
                 "Settore, esperienza, cantone → analisi salari di mercato."}
              </p>
              <div style={{fontSize:12,color:"var(--em)",fontWeight:700}}>Gehalt berechnen →</div>
            </div>
            {/* Bewerbungs-Tracker */}
            <div onClick={()=>navTo("tracker")} style={{cursor:"pointer",background:"linear-gradient(135deg,rgba(139,92,246,.12),rgba(139,92,246,.04))",border:"1.5px solid rgba(139,92,246,.3)",borderRadius:18,padding:"20px 22px",position:"relative",overflow:"hidden",transition:"all .22s"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.borderColor="rgba(139,92,246,.55)";e.currentTarget.style.boxShadow="0 12px 36px rgba(139,92,246,.14)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.borderColor="rgba(139,92,246,.3)";e.currentTarget.style.boxShadow="none";}}>
              <div style={{position:"absolute",top:-16,right:-16,width:80,height:80,background:"radial-gradient(circle,rgba(139,92,246,.14),transparent)",borderRadius:"50%",pointerEvents:"none"}}/>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:36,height:36,background:"rgba(139,92,246,.15)",border:"1.5px solid rgba(139,92,246,.3)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>📋</div>
                <div>
                  <div style={{fontFamily:"var(--hd)",fontSize:14,fontWeight:800,color:"white",letterSpacing:"-.3px",lineHeight:1.2}}>{lang==="de"?"Bewerbungs-Tracker":lang==="en"?"Application Tracker":lang==="fr"?"Suivi candidatures":"Tracker candidature"}</div>
                  <div style={{fontSize:10,fontWeight:700,color:"#a78bfa",letterSpacing:"1px",textTransform:"uppercase",marginTop:2}}>PRO</div>
                </div>
              </div>
              <p style={{fontSize:12,color:"rgba(255,255,255,.45)",lineHeight:1.6,marginBottom:14}}>
                {lang==="de"?"Status-Board für alle Bewerbungen – Kanban, Prioritäten, Notizen. Immer den Überblick.":
                 lang==="en"?"Status board for all applications – Kanban, priorities, notes. Always stay on top.":
                 lang==="fr"?"Tableau de bord pour toutes vos candidatures – Kanban, priorités, notes.":
                 "Bacheca candidature – Kanban, priorità, note. Sempre aggiornato."}
              </p>
              <div style={{fontSize:12,color:"#a78bfa",fontWeight:700}}>Status-Board öffnen →</div>
            </div>
          </div>

          {/* Featured row */}
          <div className="feat-row">
            {(()=>{const item=t.tools.items[0]; return(
              <div className="feat-big" onClick={()=>navTo(item.page)} style={{cursor:"pointer",background:"linear-gradient(135deg,rgba(16,185,129,.14),rgba(16,185,129,.04))",border:"1.5px solid rgba(16,185,129,.3)",borderRadius:20,padding:30,position:"relative",overflow:"hidden",transition:"all .22s",gridRow:"span 2"}}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 20px 48px rgba(16,185,129,.18)";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
                <div style={{position:"absolute",top:-20,right:-20,width:110,height:110,background:"radial-gradient(circle,rgba(16,185,129,.18),transparent)",borderRadius:"50%",pointerEvents:"none"}}/>
                <div style={{fontSize:42,marginBottom:12}}>{item.ico}</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{fontFamily:"var(--hd)",fontSize:22,fontWeight:800,color:"white",letterSpacing:"-.5px"}}>{item.t}</div>
                  <span style={{fontSize:10,fontWeight:700,background:"rgba(16,185,129,.2)",color:"var(--em)",border:"1px solid rgba(16,185,129,.3)",padding:"2px 9px",borderRadius:20,textTransform:"uppercase",letterSpacing:"1px",flexShrink:0}}>1× Gratis</span>
                </div>
                <p style={{fontSize:13,color:"rgba(255,255,255,.48)",lineHeight:1.75,marginBottom:18}}>{item.p}</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:22}}>
                  {["Motivationsschreiben","CV","Live-Streaming","PDF"].map((tag,j)=>(
                    <span key={j} style={{fontSize:11,fontWeight:600,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.09)",color:"rgba(255,255,255,.45)",padding:"3px 10px",borderRadius:20}}>{tag}</span>
                  ))}
                </div>
                <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"var(--em)",color:"white",padding:"10px 20px",borderRadius:10,fontSize:13,fontWeight:700}}>
                  {lang==="de"?"Jetzt starten →":lang==="en"?"Start now →":lang==="fr"?"Commencer →":"Inizia →"}
                </div>
              </div>
            );})()}
            {[t.tools.items[1],t.tools.items[2]].map((item,i)=>(
              <div key={i} onClick={()=>navTo(item.page)} style={{cursor:"pointer",background:"rgba(59,130,246,.08)",border:"1.5px solid rgba(59,130,246,.2)",borderRadius:16,padding:22,transition:"all .22s"}}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.borderColor="rgba(59,130,246,.45)";e.currentTarget.style.boxShadow="0 8px 32px rgba(59,130,246,.12)";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.borderColor="rgba(59,130,246,.2)";e.currentTarget.style.boxShadow="none";}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div style={{fontSize:26}}>{item.ico}</div><span style={{fontSize:10,fontWeight:700,background:"rgba(59,130,246,.15)",color:"#60a5fa",border:"1px solid rgba(59,130,246,.2)",padding:"2px 8px",borderRadius:20}}>PRO</span></div>
                <div style={{fontFamily:"var(--hd)",fontSize:16,fontWeight:700,color:"white",marginBottom:5}}>{item.t}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.38)",lineHeight:1.65}}>{item.p}</div>
                <div style={{marginTop:11,fontSize:12,color:"#60a5fa",fontWeight:600}}>{lang==="de"?"Öffnen →":"Open →"}</div>
              </div>
            ))}
          </div>

          {/* 4 equal cards */}
          <div className="g5-grid">
            {t.tools.items.slice(3).map((item,i)=>{
              const C2=[
                {bg:"rgba(245,158,11,.08)",bd:"rgba(245,158,11,.22)",hv:"rgba(245,158,11,.4)",tc:"#fbbf24"},
                {bg:"rgba(16,185,129,.07)",bd:"rgba(16,185,129,.2)",hv:"rgba(16,185,129,.4)",tc:"#34d399"},
                {bg:"rgba(167,139,250,.08)",bd:"rgba(167,139,250,.22)",hv:"rgba(167,139,250,.4)",tc:"#a78bfa"},
                {bg:"rgba(251,113,133,.08)",bd:"rgba(251,113,133,.18)",hv:"rgba(251,113,133,.38)",tc:"#fb7185"},
              ][i%4];
              return(
                <div key={i} onClick={()=>navTo(item.page)} style={{cursor:"pointer",background:C2.bg,border:`1.5px solid ${C2.bd}`,borderRadius:16,padding:20,transition:"all .22s"}}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.borderColor=C2.hv;e.currentTarget.style.boxShadow=`0 8px 28px ${C2.bg}`;}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.borderColor=C2.bd;e.currentTarget.style.boxShadow="none";}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div style={{fontSize:24}}>{item.ico}</div><span style={{fontSize:10,fontWeight:700,background:`${C2.tc}22`,color:C2.tc,padding:"2px 8px",borderRadius:20}}>PRO</span></div>
                  <div style={{fontFamily:"var(--hd)",fontSize:14,fontWeight:700,color:"white",marginBottom:4}}>{item.t}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.38)",lineHeight:1.6,marginBottom:10}}>{item.p}</div>
                  <div style={{fontSize:12,color:C2.tc,fontWeight:600}}>{lang==="de"?"Öffnen →":"Open →"}</div>
                </div>
              );
            })}
          </div>

          {/* Karriere mini tools */}
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",color:"rgba(255,255,255,.18)",marginBottom:10}}>
            {lang==="de"?"Weitere Karriere-Tools":lang==="en"?"More career tools":lang==="fr"?"Plus d'outils":"Altri strumenti"}
          </div>

          <div className="mini-g">
            {GENERIC_TOOLS.filter(g=>g.cat==="karriere" && g.id!=="li2job").map(g=>(
              <div key={g.id} onClick={()=>navTo(g.id)} style={{cursor:"pointer",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:13,padding:"14px 16px",transition:"all .2s",display:"flex",flexDirection:"column",gap:7}}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.06)";e.currentTarget.style.borderColor="rgba(16,185,129,.25)";e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.03)";e.currentTarget.style.borderColor="rgba(255,255,255,.07)";e.currentTarget.style.transform="none";}}>
                <div style={{fontSize:20}}>{g.ico}</div>
                <div style={{fontFamily:"var(--hd)",fontSize:12,fontWeight:700,color:"white",lineHeight:1.3}}>{g.t[lang]}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.28)",lineHeight:1.45,flex:1}}>{g.sub[lang]}</div>
                <div style={{fontSize:11,color:"var(--em)",fontWeight:600}}>→</div>
              </div>
            ))}
          </div>

          {/* ✦ DEMO – direkt bei den Tools */}
          <div style={{marginTop:52,borderTop:"1px solid rgba(255,255,255,.06)",paddingTop:48}}>
            <div style={{marginBottom:28}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",color:"var(--em)",marginBottom:8}}>✦ {lang==="de"?"LIVE-VORSCHAU – SO SIEHT DAS ERGEBNIS AUS":lang==="en"?"LIVE PREVIEW – THIS IS WHAT YOU GET":lang==="fr"?"APERÇU LIVE – VOICI LE RÉSULTAT":"ANTEPRIMA LIVE – ECCO IL RISULTATO"}</div>
              <div style={{fontFamily:"var(--hd)",fontSize:24,fontWeight:800,color:"white",letterSpacing:"-.4px"}}>
                {lang==="de"?"Klick auf ein Tool – sieh sofort den Output.":lang==="en"?"Click a tool – see the output instantly.":lang==="fr"?"Cliquez sur un outil – voyez le résultat.":"Clicca su uno strumento – vedi subito il risultato."}
              </div>
            </div>
            <DemoSection lang={lang} navTo={navTo}/>
          </div>
        </div>
      </section>

      {/* ── SCHULE & PRODUKTIVITÄT LIGHT SECTION ── */}
      <section style={{background:"var(--bg)",padding:"64px 0 88px"}}>
        <div className="con">
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:44}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
                <div style={{width:36,height:36,background:"rgba(8,145,178,.1)",border:"1.5px solid rgba(8,145,178,.22)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🎓</div>
                <div>
                  <div style={{fontFamily:"var(--hd)",fontSize:19,fontWeight:800,letterSpacing:"-.3px"}}>{lang==="de"?"Schule & Ausbildung":lang==="en"?"School & Education":lang==="fr"?"École & Formation":"Scuola & Formazione"}</div>
                  <div style={{fontSize:12,color:"var(--mu)",marginTop:2}}>{lang==="de"?"Für Lernende, Lehrlinge & Studierende":lang==="en"?"For learners, apprentices & students":lang==="fr"?"Pour apprenants, apprentis & étudiants":"Per apprendisti e studenti"}</div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {GENERIC_TOOLS.filter(g=>g.cat==="ausbildung").map(g=>(
                  <div key={g.id} onClick={()=>navTo(g.id)} style={{cursor:"pointer",background:"white",border:"1.5px solid var(--bo)",borderRadius:14,padding:"15px 20px",display:"flex",alignItems:"center",gap:13,transition:"all .2s",boxShadow:"0 1px 4px rgba(11,11,18,.04)"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(8,145,178,.35)";e.currentTarget.style.transform="translateX(5px)";e.currentTarget.style.boxShadow="0 4px 20px rgba(8,145,178,.09)";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--bo)";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 1px 4px rgba(11,11,18,.04)";}}>
                    <div style={{width:40,height:40,background:"rgba(8,145,178,.07)",border:"1.5px solid rgba(8,145,178,.14)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{g.ico}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"var(--hd)",fontSize:14,fontWeight:700,marginBottom:2}}>{g.t[lang]}</div>
                      <div style={{fontSize:12,color:"var(--mu)",lineHeight:1.5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.sub[lang]}</div>
                    </div>
                    <div style={{fontSize:14,color:"#0891b2",fontWeight:700,flexShrink:0}}>→</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
                <div style={{width:36,height:36,background:"rgba(124,58,237,.09)",border:"1.5px solid rgba(124,58,237,.22)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>⚡</div>
                <div>
                  <div style={{fontFamily:"var(--hd)",fontSize:19,fontWeight:800,letterSpacing:"-.3px"}}>{lang==="de"?"Produktivität":lang==="en"?"Productivity":lang==="fr"?"Productivité":"Produttività"}</div>
                  <div style={{fontSize:12,color:"var(--mu)",marginTop:2}}>{lang==="de"?"Für alle – Excel, PPT, E-Mail, Übersetzer":lang==="en"?"For all – Excel, PPT, email, translator":lang==="fr"?"Pour tous – Excel, PPT, e-mail, traducteur":"Per tutti – Excel, PPT, e-mail, traduttore"}</div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[{page:"excel",ico:"📊",tl:{de:"Excel-Generator",en:"Excel Generator",fr:"Générateur Excel",it:"Generatore Excel"},sl:{de:"Profi-Tabellen mit Formeln per Beschreibung",en:"Pro spreadsheets with formulas from description",fr:"Tableaux pros avec formules sur description",it:"Fogli pro con formule da descrizione"},c:"#059669"},
                  {page:"pptx",ico:"📽️",tl:{de:"PowerPoint-Maker",en:"PowerPoint Maker",fr:"Créateur PowerPoint",it:"Creatore PowerPoint"},sl:{de:"Präsentationen für Schule, Uni & Arbeit",en:"Presentations for school, uni & work",fr:"Présentations pour école, université & travail",it:"Presentazioni per scuola, università e lavoro"},c:"#2563eb"},
                ].map(g=>(
                  <div key={g.page} onClick={()=>navTo(g.page)} style={{cursor:"pointer",background:"white",border:`1.5px solid ${g.c}28`,borderRadius:14,padding:"15px 20px",display:"flex",alignItems:"center",gap:13,transition:"all .2s",boxShadow:"0 1px 4px rgba(11,11,18,.04)"}}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateX(5px)";e.currentTarget.style.boxShadow=`0 4px 20px ${g.c}18`;}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 1px 4px rgba(11,11,18,.04)";}}>
                    <div style={{width:40,height:40,background:`${g.c}14`,border:`1.5px solid ${g.c}28`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{g.ico}</div>
                    <div style={{flex:1}}><div style={{fontFamily:"var(--hd)",fontSize:14,fontWeight:700,marginBottom:2}}>{g.tl[lang]}</div><div style={{fontSize:12,color:"var(--mu)"}}>{g.sl[lang]}</div></div>
                    <div style={{fontSize:14,color:g.c,fontWeight:700,flexShrink:0}}>→</div>
                  </div>
                ))}
                {GENERIC_TOOLS.filter(g=>g.cat==="produktivitaet").map(g=>(
                  <div key={g.id} onClick={()=>navTo(g.id)} style={{cursor:"pointer",background:"white",border:"1.5px solid var(--bo)",borderRadius:14,padding:"15px 20px",display:"flex",alignItems:"center",gap:13,transition:"all .2s",boxShadow:"0 1px 4px rgba(11,11,18,.04)"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(124,58,237,.3)";e.currentTarget.style.transform="translateX(5px)";e.currentTarget.style.boxShadow="0 4px 20px rgba(124,58,237,.08)";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--bo)";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 1px 4px rgba(11,11,18,.04)";}}>
                    <div style={{width:40,height:40,background:"rgba(124,58,237,.06)",border:"1.5px solid rgba(124,58,237,.14)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{g.ico}</div>
                    <div style={{flex:1,minWidth:0}}><div style={{fontFamily:"var(--hd)",fontSize:14,fontWeight:700,marginBottom:2}}>{g.t[lang]}</div><div style={{fontSize:12,color:"var(--mu)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.sub[lang]}</div></div>
                    <div style={{fontSize:14,color:"#7c3aed",fontWeight:700,flexShrink:0}}>→</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* TESTI */}
      <section className="sec sec-dk2">
        <div className="con">
          <div className="sh shc"><div className="seye">{t.testi.label}</div><h2 className="st">{t.testi.title}</h2></div>
          <div className="tg">{t.testi.items.map((x,i)=><div key={i} className="tc2"><div className="ts">{x.s}</div><p className="tq">«{x.t}»</p><div className="tn">{x.a}</div><div className="tr">{x.r}</div></div>)}</div>
        </div>
      </section>

      {/* HOW */}
      <section className="sec sec-dk">
        <div className="con">
          <div className="sh"><div className="seye">{t.how.label}</div><h2 className="st">{t.how.title}</h2><p className="ss">{t.how.sub}</p></div>
          <div className="srow">{t.how.steps.map((s,i)=><div key={i} className="sc"><div className="sn">{s.n}</div><h3>{s.t}</h3><p>{s.p}</p></div>)}</div>
        </div>
      </section>

      {/* WHY */}
      <section className="sec sec-w">
        <div className="con">
          <div className="sh"><div className="seye">{t.why.label}</div><h2 className="st">{t.why.title}</h2><p className="ss">{t.why.sub}</p></div>
          <div className="why-vs">
            <div className="why-col bad"><h4 style={{color:"#dc2626"}}>{t.why.badH}</h4><ul>{t.why.badL.map((x,i)=><li key={i}><span style={{color:"#fca5a5",flexShrink:0}}>✗</span><span>{x}</span></li>)}</ul></div>
            <div className="why-col good"><h4 style={{color:"var(--em2)"}}>{t.why.goodH}</h4><ul>{t.why.goodL.map((x,i)=><li key={i}><span style={{color:"var(--em)",flexShrink:0}}>✓</span><span>{x}</span></li>)}</ul></div>
          </div>
        </div>
      </section>

      {/* MARKET – Zahlen & Fakten */}
      <section className="sec sec-bg">
        <div className="con">
          <div className="sh shc"><div className="seye">{t.market.label}</div><h2 className="st">{t.market.title}</h2></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:18}}>
            {t.market.points.map((p,i)=>(
              <div key={i} style={{padding:"24px",background:"white",border:"1.5px solid var(--bo)",borderRadius:"var(--r2)"}}>
                <div style={{fontSize:28,marginBottom:10}}>{p.ico}</div>
                <div style={{fontFamily:"var(--hd)",fontSize:16,fontWeight:700,marginBottom:7}}>{p.t}</div>
                <div style={{fontSize:13,color:"var(--mu)",lineHeight:1.7}}>{p.p}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="sec sec-dk" id="preise">
        <div className="con">
          <div className="sh shc"><div className="seye">{t.price.label}</div><h2 className="st">{t.price.title}</h2><p className="ss">{t.price.sub}</p></div>
          <div className="btog">
            <span className={`bto ${!yearly?"on":""}`} onClick={()=>setYearly(false)}>{t.price.monthly}</span>
            <div className={`btsw ${yearly?"yr":""}`} onClick={()=>setYearly(v=>!v)}><div className="btt"/></div>
            <span className={`bto ${yearly?"on":""}`} onClick={()=>setYearly(true)}>{t.price.yearly}</span>
            {yearly&&<span className="save-t">{t.price.save}</span>}
          </div>
          <div className="pgrid">
            {t.price.tiers.map(tier=>(
              <div key={tier.id} className={`pc ${tier.best?"hl":""} ${tier.id==="team"?"hl2":""}`}>
                {tier.best&&<div className="bst">{t.price.recom}</div>}
                <div className={`ppl ${tier.best?"em":tier.id==="team"?"am":""}`}>{tier.name}</div>
                {tier.price===0&&<><div className="ppr">CHF 0<span> / {lang==="en"?"mo":"Mo."}</span></div><div className="pper">{tier.note}</div></>}
                {tier.priceM&&<>
                  <div className="ppr">CHF {yearly ? Number(tier.priceY).toFixed(2) : Number(tier.priceM).toFixed(2)}<span> / {lang==="en"?"mo":"Mo."}</span></div>
                  <div className="pper">
                    {yearly
                      ? (lang==="de"?`🔥 CHF ${Number(tier.priceY).toFixed(2)}/Mo. · spare ${Math.round((1-(tier.priceY/tier.priceM))*100)}% · CHF ${(tier.priceY*12).toFixed(2)}/Jahr`:
                         lang==="en"?`🔥 CHF ${Number(tier.priceY).toFixed(2)}/mo · save ${Math.round((1-(tier.priceY/tier.priceM))*100)}% · CHF ${(tier.priceY*12).toFixed(2)}/year`:
                         lang==="fr"?`🔥 CHF ${Number(tier.priceY).toFixed(2)}/mois · économisez ${Math.round((1-(tier.priceY/tier.priceM))*100)}%`:
                         `🔥 CHF ${Number(tier.priceY).toFixed(2)}/mese · risparmia ${Math.round((1-(tier.priceY/tier.priceM))*100)}%`)
                      : (lang==="de"?`Jährlich nur CHF ${Number(tier.priceY).toFixed(2)}/Mo. → ${Math.round((1-(tier.priceY/tier.priceM))*100)}% sparen`:
                         lang==="en"?`Annual plan: CHF ${Number(tier.priceY).toFixed(2)}/mo → save ${Math.round((1-(tier.priceY/tier.priceM))*100)}%`:
                         lang==="fr"?`Annuel: CHF ${Number(tier.priceY).toFixed(2)}/mois → économisez ${Math.round((1-(tier.priceY/tier.priceM))*100)}%`:
                         `Annuale: CHF ${Number(tier.priceY).toFixed(2)}/mese → risparmia ${Math.round((1-(tier.priceY/tier.priceM))*100)}%`)
                    }
                  </div>
                </>}
                {tier.price===null&&<><div className="ppr" style={{fontSize:26,letterSpacing:0}}>{lang==="de"?"Auf Anfrage":lang==="fr"?"Sur demande":lang==="it"?"Su richiesta":"On request"}</div><div className="pper">{tier.note}</div></>}
                <ul className="pfl">
                  {tier.list.map(f=><li key={f}><span className="pck">✓</span>{f}</li>)}
                  {(tier.no||[]).map(f=><li key={f} className="off"><span className="pcx">×</span>{f}</li>)}
                </ul>
                {tier.id==="free"&&<button className="btn b-out b-w" style={{borderColor:"rgba(255,255,255,.18)",color:"white"}} onClick={()=>navTo("app")}>{tier.btn}</button>}
                {tier.id==="pro"&&<button className={`btn ${tier.btnS} b-w`} onClick={()=>window.open(stripeLink(),"_blank")}>{tier.btn}</button>}
                {tier.id==="family"&&<button className={`btn b-out b-w`} style={{borderColor:"rgba(139,92,246,.4)",color:"rgba(167,139,250,.85)"}} onClick={()=>window.open(C.stripeFamily,"_blank")}>{tier.btn}</button>}
                {tier.id==="team"&&<button className={`btn b-out b-w`} style={{borderColor:"rgba(245,158,11,.4)",color:"rgba(245,158,11,.85)"}} onClick={()=>window.open(C.stripeTeam,"_blank")}>{tier.btn}</button>}
              </div>
            ))}
          </div>
          <div className="vb">
            <h4>{t.price.valTitle}</h4>
            {t.price.valPts.map((p,i)=><div key={i} className="vp"><span style={{color:"var(--em)",flexShrink:0}}>✓</span>{p}</div>)}
          </div>
          <div style={{textAlign:"center",marginTop:40}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"rgba(255,255,255,.26)",marginBottom:16}}>{t.payments.label}</div>
            <div className="pay-row">{t.payments.methods.map(m=><div key={m} className="pay-chip">{m}</div>)}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.2)",marginTop:12}}>{t.payments.sub}</div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FaqSection lang={lang} email={C.email}/>

      {/* ── NEUE TOOLS SECTION ── */}
      <section className="sec sec-w" style={{background:"var(--bg)"}}>
        <div className="con">
          <div className="sh shc">
            <div className="seye">✦ {lang==="de"?"Neue Tools · 2× gratis testen":lang==="fr"?"Nouveaux outils · 2× gratuit":lang==="it"?"Nuovi strumenti · 2× gratis":"New Tools · 2× free trial"}</div>
            <h2 className="st">{lang==="de"?"3 neue KI-Tools":lang==="fr"?"3 nouveaux outils IA":lang==="it"?"3 nuovi strumenti IA":"3 new AI tools"}</h2>
            <p className="ssub">{lang==="de"?"CV-Check, Interview-Vorbereitung & Inserat-Analyse – je 2× gratis testen, dann PRO.":lang==="fr"?"Check CV, préparation entretien & analyse d'offre – 2× gratuit, puis PRO.":lang==="it"?"Check CV, prep colloquio & analisi annuncio – 2× gratis, poi PRO.":"CV check, interview prep & job ad analysis – 2× free, then PRO."}</p>
          </div>
          <div style={{maxWidth:780,margin:"0 auto"}}>
            <CVScoreWidget lang={lang} pro={pro} setPw={setPw}/>
            <InterviewPrepWidget lang={lang} pro={pro} setPw={setPw}/>
            <JobAdAnalyzerWidget lang={lang} pro={pro} setPw={setPw}/>
          </div>
        </div>
      </section>

      <section className="cta-sec">
        <div className="csm">
          <h2 style={{fontFamily:"var(--hd)",fontSize:"clamp(36px,5vw,60px)",fontWeight:800,color:"white",letterSpacing:"-2px",lineHeight:1.05,marginBottom:16}}>
            {t.cta.title} <em style={{fontStyle:"normal",color:"var(--em)"}}>{t.cta.italic}</em>
          </h2>
          <p style={{fontSize:16,color:"rgba(255,255,255,.4)",marginBottom:32,lineHeight:1.7}}>{t.cta.sub}</p>
          <button className="btn b-em b-lg" onClick={()=>navTo("app")}>{t.cta.btn}</button>
        </div>
      </section>
      <Footer/>
    </div>
  </>);

  // ══════════════════ APPLICATION TOOL ══════════════════
  if(page==="app") return(<>{<style>{FONTS+CSS}</style>}{pw&&<PW/>}
    {authModals}
    <ToastContainer/>
    {showProfiles&&<ProfileManager lang={lang} authSession={authSession} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    <ChatBot lang={lang} pro={pro} setPw={setPw} navTo={navTo} authSession={authSession} onAuthOpen={()=>{setAuthMode("login");setShowAuth(true);}}/>
    <Nav dark/>
    <div className="page-anim">
    <div className="page-hdr dk">
      <h1>{t.app.title}</h1><p>{t.app.sub}</p>
      {step<3&&<div className="asteps">{t.app.steps.map((s,i)=><div key={i} className={`as ${i===step?"on":""} ${i<step?"done":""}`}>{i<step?"✓ ":`0${i+1}. `}{s}</div>)}</div>}
    </div>
    <div className="abody">
      <UsageBar/>

      {/* ✦ Beispiel-Vorschau direkt im Tool */}
      {step===0&&<AppDemo lang={lang}/>}

      {err&&<div className="err">⚠️ {err}<button style={{float:"right",background:"none",border:"none",cursor:"pointer",color:"#dc2626",fontWeight:700}} onClick={()=>setErr("")}>✕</button></div>}

      {step===0&&<div className="card">
        <div className="ct">{lang==="de"?"Die Stelle":lang==="fr"?"Le poste":lang==="it"?"Il posto":"The position"}</div>
        <div className="cs">{lang==="de"?"Wo möchtest du dich bewerben?":lang==="fr"?"Où souhaitez-vous postuler?":lang==="it"?"Dove vuoi candidarti?":"Where would you like to apply?"}</div>
        <div className="fg2">
          <div className="field"><label>{lang==="de"?"Stellenbezeichnung *":lang==="fr"?"Intitulé *":lang==="it"?"Titolo *":"Job title *"}</label><input value={job.title} onChange={e=>uj("title",e.target.value)}/></div>
          <div className="field"><label>{lang==="de"?"Unternehmen *":lang==="fr"?"Entreprise *":lang==="it"?"Azienda *":"Company *"}</label><input value={job.company} onChange={e=>uj("company",e.target.value)}/></div>
        </div>
        <div className="field"><label>{lang==="de"?"Branche":lang==="fr"?"Secteur":lang==="it"?"Settore":"Industry"}</label>
          <select value={job.branch} onChange={e=>uj("branch",e.target.value)}><option value="">–</option>{t.app.branches.map(b=><option key={b}>{b}</option>)}</select></div>
        <div className="field"><label>{lang==="de"?"Stellenbeschreibung (empfohlen)":lang==="fr"?"Description (recommandé)":lang==="it"?"Descrizione (consigliato)":"Job description (recommended)"}</label>
          <textarea value={job.desc} onChange={e=>uj("desc",e.target.value)} style={{minHeight:88}}/></div>
        <div className="frow"><button className="btn b-outd" onClick={()=>navTo("landing")}>{t.app.back}</button><button className="btn b-dk" disabled={!job.title||!job.company} onClick={()=>setStep(1)}>{t.app.next}</button></div>
      </div>}

      {step===1&&<div className="card">
        <div className="ct">{lang==="de"?"Dein Profil":lang==="fr"?"Votre profil":lang==="it"?"Il tuo profilo":"Your profile"}</div>
        <div className="cs">{lang==="de"?"Die KI erstellt massgeschneiderte Unterlagen.":lang==="fr"?"L'IA créera des documents sur mesure.":lang==="it"?"L'IA creerà documenti su misura.":"The AI will create tailored documents."}</div>
        <DocUpload lang={lang} file={appDoc}
          onFile={f=>setAppDoc({name:f.name,raw:f,extracted:false})}
          onText={(t,n)=>{ setAppDoc({name:n,text:t,extracted:true}); if(t.length>20){ const lines=t.split("\n"); const nm=lines.find(l=>l.trim().length>2&&l.trim().length<40); if(nm&&!prof.name)setProf(p=>({...p,name:nm.trim()})); } }}
          onClear={()=>setAppDoc(null)}/>
        <div className="fg2">
          <div className="field"><label>{lang==="de"?"Name *":lang==="fr"?"Nom *":lang==="it"?"Nome *":"Name *"}</label><input value={prof.name} onChange={e=>up("name",e.target.value)}/></div>
          <div className="field"><label>{lang==="de"?"Beruf *":lang==="fr"?"Métier *":lang==="it"?"Lavoro *":"Job *"}</label><input value={prof.beruf} onChange={e=>up("beruf",e.target.value)}/></div>
          <div className="field"><label>{lang==="de"?"Erfahrung (Jahre)":lang==="fr"?"Expérience (ans)":lang==="it"?"Esperienza (anni)":"Experience (years)"}</label><input type="number" min="0" max="50" value={prof.erfahrung} onChange={e=>up("erfahrung",e.target.value)}/></div>
          <div className="field"><label>{lang==="de"?"Sprachen":lang==="fr"?"Langues":lang==="it"?"Lingue":"Languages"}</label><input value={prof.sprachen} onChange={e=>up("sprachen",e.target.value)} placeholder="Deutsch, English, Français"/></div>
        </div>
        <div className="field"><label>{lang==="de"?"Skills & Stärken":lang==="fr"?"Compétences":lang==="it"?"Competenze":"Skills"}</label><textarea value={prof.skills} onChange={e=>up("skills",e.target.value)}/></div>
        <div className="field"><label>{lang==="de"?"Ausbildung":lang==="fr"?"Formation":lang==="it"?"Formazione":"Education"}</label><textarea value={prof.ausbildung} onChange={e=>up("ausbildung",e.target.value)} style={{minHeight:64}}/></div>
        <div className="frow"><button className="btn b-outd" onClick={()=>setStep(0)}>{t.app.back}</button><button className="btn b-dk" disabled={!prof.name||!prof.beruf} onClick={()=>setStep(2)}>{t.app.next}</button></div>
      </div>}

      {step===2&&<div className="card">
        <div className="ct">{lang==="de"?"Dokument wählen":lang==="fr"?"Choisir le document":lang==="it"?"Scegli il documento":"Choose document"}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          {[{k:"motivation",ico:"✍️",t:lang==="de"?"Motivationsschreiben":lang==="fr"?"Lettre de motivation":lang==="it"?"Lettera di motivazione":"Cover letter",d:lang==="de"?"Persönlich, überzeugend.":lang==="fr"?"Personnelle, convaincante.":lang==="it"?"Personale, convincente.":"Personal, convincing."},
            {k:"lebenslauf",ico:"📄",t:"Curriculum Vitae",d:lang==="de"?"Schweizer Format.":lang==="fr"?"Format suisse.":lang==="it"?"Formato svizzero.":"Swiss format."},
            {k:"beide",ico:"🚀",t:lang==="de"?"Beides":lang==="fr"?"Les deux":lang==="it"?"Entrambi":"Both",d:lang==="de"?"Vollständiges Dossier.":lang==="fr"?"Dossier complet.":lang==="it"?"Dossier completo.":"Complete dossier.",full:true}
          ].map(d=><button key={d.k} className={`tool-card ${docType===d.k?"":""}`} style={{cursor:"pointer",border:`1.5px solid ${docType===d.k?"var(--em)":"var(--bo)"}`,background:docType===d.k?"var(--em3)":"white",gridColumn:d.full?"1/-1":"auto"}} onClick={()=>setDocType(d.k)}>
            <div style={{fontSize:22,marginBottom:6}}>{d.ico}</div>
            <div style={{fontWeight:600,fontSize:14,marginBottom:3}}>{d.t}</div>
            <div style={{fontSize:12,color:"var(--mu)"}}>{d.d}</div>
          </button>)}
        </div>
        <div className="frow"><button className="btn b-outd" onClick={()=>setStep(1)}>{t.app.back}</button><button className="btn b-em" onClick={generate} disabled={streaming}>{streaming?t.app.genLoad:t.app.genBtn}</button></div>
      </div>}

      {(streaming||(step===3&&(results.motivation||results.lebenslauf)))&&<div className="card" style={{marginTop:streaming?18:0}}>
        {streaming&&<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,color:"var(--em)",fontWeight:600,fontSize:14}}>
          <div style={{width:9,height:9,background:"var(--em)",borderRadius:"50%",animation:"blink .8s step-end infinite"}}/>{t.app.stream}
        </div>}
        {docType==="beide"&&<div className="r-tabs">
          <button className={`r-tab ${tab===0?"on":""}`} onClick={()=>{setTab(0);setEditing(false)}}>{lang==="de"?"✍️ Motivationsschreiben":lang==="fr"?"✍️ Lettre":lang==="it"?"✍️ Lettera":"✍️ Cover letter"}</button>
          <button className={`r-tab ${tab===1?"on":""}`} onClick={()=>{setTab(1);setEditing(false)}}>{lang==="de"?"📋 Lebenslauf":"📋 CV"}</button>
        </div>}
        {!streaming&&<div className="r-bar">
          {copied&&<span className="ok" style={{margin:0,padding:"4px 11px"}}>{t.app.copied}</span>}
          <button className="btn b-outd b-sm" onClick={copyDoc}>📋 {t.app.copy}</button>
          <button className="btn b-outd b-sm" onClick={()=>{if(!pro){setPw(true);return;}setEditing(!editing);}}>{editing?`👁 ${t.app.prev}`:`✏️ ${t.app.edit}`}{!pro&&<span className="pb" style={{fontSize:8,marginLeft:3}}>PRO</span>}</button>
          <button className="btn b-outd b-sm" onClick={pdfDoc}>📥 PDF{!pro&&<span className="pb" style={{fontSize:8,marginLeft:3}}>PRO</span>}</button>
                  <button className="btn b-outd b-sm" onClick={()=>navTo("checklist")}>✅ {lang==="de"?"Checkliste":lang==="en"?"Checklist":lang==="fr"?"Checklist":"Checklist"}</button>
          <button className="btn b-outd b-sm" onClick={()=>{setStep(2);setResults({motivation:"",lebenslauf:""});setEditing(false);}}>🔄 {t.app.regen}</button>
        </div>}
        {editing&&!streaming?<textarea className="r-edit" value={curDoc()} onChange={e=>setCurDoc(e.target.value)}/>:<div className="r-doc">{curDoc()||(!streaming&&<span style={{color:"rgba(11,11,18,.25)",fontSize:13,fontStyle:"italic"}}>{lang==="de"?"Noch kein Inhalt – bitte erneut generieren.":lang==="fr"?"Pas encore de contenu – veuillez regénérer.":"No content yet – please generate again."}</span>)}{streaming&&<span className="cursor"/>}</div>}
      </div>}

      {step===3&&!streaming&&<>
        {/* Email */}
        <div className="card" style={{marginTop:14}}>
          <div className="ct" style={{fontSize:17}}>{t.email.title}</div>
          {!pro?<LockMsg sub={t.modal.sub}/>:<>
            <div className="fg2">
              <div className="field"><label>{t.email.toLbl}</label><input type="email" value={eTo} onChange={e=>setETo(e.target.value)} placeholder="recruiting@firma.ch"/></div>
              <div className="field"><label>{t.email.subjLbl}</label><input value={eSub} onChange={e=>setESub(e.target.value)}/></div>
            </div>
            <div className="field"><label>{lang==="de"?"Optionale Nachricht":lang==="fr"?"Message optionnel":lang==="it"?"Messaggio opzionale":"Optional message"}</label><textarea value={eMsg} onChange={e=>setEMsg(e.target.value)} placeholder={t.email.msgPh} style={{minHeight:60}}/></div>
            <button className="btn b-em" disabled={!eTo} onClick={openEmail}>{t.email.btn}</button>
            <div className="eml-note">ℹ️ {t.email.note}</div>
          </>}
        </div>
        {/* Quick nav */}
        {pro?<div style={{marginTop:14,display:"flex",gap:9,flexWrap:"wrap"}}>
          <button className="btn b-outd b-sm" style={{flex:1}} onClick={()=>navTo("ats")}>{t.app.goAts}</button>
          <button className="btn b-outd b-sm" style={{flex:1}} onClick={()=>navTo("coach")}>{t.app.goCoach}</button>
          <button className="btn b-outd b-sm" style={{flex:1}} onClick={()=>navTo("jobmatch")}>{lang==="de"?"🎯 Job-Matching →":lang==="fr"?"🎯 Matching →":lang==="it"?"🎯 Matching →":"🎯 Job matching →"}</button>
        </div>:<div className="ipw">
          <h3>{t.app.pw.title}</h3><p>{t.app.pw.sub}</p>
          <div className="ipw-pr">CHF {C.priceM}<span> / {lang==="en"?"mo":"Mo."}</span></div>
          <div className="ipw-fts">{t.app.pw.feats.map(f=><div key={f} className="ipw-ft"><span style={{color:"var(--em)"}}>✓</span>{f}</div>)}</div>
          <button className="btn b-em" onClick={()=>window.open(stripeLink(),"_blank")}>{t.app.pw.btn}</button>
          <div style={{marginTop:10,fontSize:11,color:"rgba(255,255,255,.25)"}}>{t.app.pw.secure}</div>
        </div>}
      </>}
    </div>
    <Footer/>
    </div>
  </>);

  // ══════════════════ ATS CHECK ══════════════════
  if(page==="ats") return(<>{<style>{FONTS+CSS}</style>}{pw&&<PW/>}
    {authModals}
    <ToastContainer/>
    {showProfiles&&<ProfileManager lang={lang} authSession={authSession} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    <ChatBot lang={lang} pro={pro} setPw={setPw} navTo={navTo} authSession={authSession} onAuthOpen={()=>{setAuthMode("login");setShowAuth(true);}}/>
    <Nav dark/>
    <div className="page-anim">
    <div className="page-hdr dk"><h1>{t.ats.title}</h1><p>{t.ats.sub}</p></div>
    <div className="abody">
      <ToolBanner pageId="ats"/>
      {err&&<div className="err">⚠️ {err}</div>}
      {!pro?<div className="card"><LockMsg sub={t.coach.lockedSub}/></div>:<>
        <div className="card">
          <div className="ct">{t.ats.title}</div><div className="cs">{t.ats.sub}</div>
          <div className="fg2">
            <div className="field"><label>{t.ats.jobLbl}</label><input value={atsJob} onChange={e=>setAtsJob(e.target.value)}/></div>
            <div className="field" style={{gridColumn:"1/-1"}}><label>{t.ats.jobDescLbl}</label><textarea value={atsDesc} onChange={e=>setAtsDesc(e.target.value)} placeholder={t.ats.jobDescPh} style={{minHeight:72}}/></div>
            <div className="field" style={{gridColumn:"1/-1"}}>
              <label>{t.ats.cvLbl}</label>
              <DocUpload lang={lang} file={null}
                onFile={async f=>{const txt=await new Promise((res)=>{const rd=new FileReader();rd.onload=e=>res(e.target.result);rd.readAsText(f);});setAtsCv(txt||"");}}
                onText={(t)=>setAtsCv(t)}
                onClear={()=>setAtsCv("")}/>
              <textarea value={atsCv} onChange={e=>setAtsCv(e.target.value)} placeholder={t.ats.cvPh} style={{minHeight:100}}/>
            </div>
          </div>
          <button className="btn b-em" onClick={runATS} disabled={atsLoad||!atsCv||!atsJob}>{atsLoad?t.ats.loading:t.ats.btn}</button>
        </div>
        {atsRes&&<div style={{marginTop:16}}>
          {/* Score ring */}
          <div className="ats-score">
            <div className="ats-ring">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="6"/>
                <circle cx="40" cy="40" r="34" fill="none" stroke={atsRes.score>=70?"#10b981":atsRes.score>=50?"#f59e0b":"#ef4444"} strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${2*Math.PI*34*atsRes.score/100} ${2*Math.PI*34}`}/>
              </svg>
              <div className="ats-ring-text"><div className="ats-ring-n">{atsRes.score}</div><div className="ats-ring-l">ATS</div></div>
            </div>
            <div className="ats-info">
              <div className="ats-grade">{t.ats.scoreLabel}: {atsRes.score}/100 – {atsRes.grade}</div>
              <div className="ats-sub">{atsRes.summary}</div>
            </div>
          </div>
          {/* Keywords */}
          <div className="card" style={{marginBottom:12}}>
            <h4 style={{fontFamily:"var(--hd)",fontSize:15,fontWeight:700,marginBottom:10,color:"var(--em2)"}}>{t.ats.found}</h4>
            <div className="kw-list">{(atsRes.keywords_found||[]).map((k,i)=><span key={i} className="kw found">{k}</span>)}</div>
          </div>
          <div className="card" style={{marginBottom:12}}>
            <h4 style={{fontFamily:"var(--hd)",fontSize:15,fontWeight:700,marginBottom:10,color:"#dc2626"}}>{t.ats.miss}</h4>
            <div className="kw-list">{(atsRes.keywords_missing||[]).map((k,i)=><span key={i} className="kw miss">{k}</span>)}</div>
          </div>
          <div className="card">
            <h4 style={{fontFamily:"var(--hd)",fontSize:15,fontWeight:700,marginBottom:14}}>{t.ats.tips}</h4>
            {(atsRes.tips||[]).map((tip,i)=><div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:"1px solid var(--bos)"}}>
              <div style={{width:24,height:24,background:"var(--em3)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"var(--em2)",flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:13,color:"var(--mu)",lineHeight:1.7,paddingTop:2}}>{tip}</div>
            </div>)}
          </div>
          <div style={{marginTop:14,display:"flex",gap:9,flexWrap:"wrap"}}>
            <button className="btn b-dk" style={{flex:1}} onClick={()=>navTo("app")}>{lang==="de"?"✍️ Bewerbung verbessern":lang==="fr"?"✍️ Améliorer candidature":lang==="it"?"✍️ Migliorare candidatura":"✍️ Improve application"}</button>
            <button className="btn b-outd b-sm" onClick={()=>downloadTxt(`ATS Score: ${atsRes.score}/100 – ${atsRes.grade}\n\n${atsRes.summary}\n\nGefundene Keywords: ${(atsRes.keywords_found||[]).join(", ")}\n\nFehlende Keywords: ${(atsRes.keywords_missing||[]).join(", ")}\n\nTipps:\n${(atsRes.tips||[]).map((t,i)=>`${i+1}. ${t}`).join("\n")}`,"ats")}>📄 TXT</button>
            <button className="btn b-outd b-sm" onClick={()=>downloadHtmlAsPdf(`ATS Score: ${atsRes.score}/100 – ${atsRes.grade}\n\n${atsRes.summary}\n\nGefundene Keywords: ${(atsRes.keywords_found||[]).join(", ")}\n\nFehlende Keywords: ${(atsRes.keywords_missing||[]).join(", ")}\n\nTipps:\n${(atsRes.tips||[]).map((t,i)=>`${i+1}. ${t}`).join("\n")}`,"ats")}>📕 PDF</button>
            <button className="btn b-outd b-sm" onClick={()=>downloadAsWord(`ATS Score: ${atsRes.score}/100 – ${atsRes.grade}\n\n${atsRes.summary}\n\nGefundene Keywords: ${(atsRes.keywords_found||[]).join(", ")}\n\nFehlende Keywords: ${(atsRes.keywords_missing||[]).join(", ")}\n\nTipps:\n${(atsRes.tips||[]).map((t,i)=>`${i+1}. ${t}`).join("\n")}`,"ats")}>📘 Word</button>
            <button className="btn b-outd b-sm" onClick={()=>downloadAsExcel([[atsRes.score+"/100",atsRes.grade,atsRes.summary,(atsRes.keywords_found||[]).join(", "),(atsRes.keywords_missing||[]).join(", ")]],["Score","Bewertung","Zusammenfassung","Keywords gefunden","Keywords fehlen"],"ATS-Check","ats")}>📊 Excel</button>
            <button className="btn b-outd b-sm" onClick={()=>dlPptxFromText(`ATS Score: ${atsRes.score}/100 – ${atsRes.grade}\n\n${atsRes.summary}\n\nTipps:\n${(atsRes.tips||[]).map((t,i)=>`${i+1}. ${t}`).join("\n")}`,"ATS-Check","ats")}>📽️ PPTX</button>
            <button className="btn b-outd b-sm" onClick={()=>{setAtsRes(null);setAtsCv("");setAtsJob("");}}>🔄</button>
          </div>
        </div>}
      </>}
    </div>
    <Footer/>
    </div>
  </>);

  // ══════════════════ ZEUGNIS ANALYSE ══════════════════
  if(page==="zeugnis") return(<>{<style>{FONTS+CSS}</style>}{pw&&<PW/>}
    {authModals}
    <ToastContainer/>
    {showProfiles&&<ProfileManager lang={lang} authSession={authSession} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    <ChatBot lang={lang} pro={pro} setPw={setPw} navTo={navTo} authSession={authSession} onAuthOpen={()=>{setAuthMode("login");setShowAuth(true);}}/>
    <Nav dark/>
    <div className="page-anim">
    <div className="page-hdr am"><h1>{t.zeugnis.title}</h1><p>{t.zeugnis.sub}</p></div>
    <div className="abody">
      <ToolBanner pageId="zeugnis"/>
      {err&&<div className="err">⚠️ {err}</div>}
      {!pro?<div className="card"><LockMsg sub={t.coach.lockedSub}/></div>:<>
        <div className="card">
          <div className="ct">{t.zeugnis.title}</div><div className="cs">{t.zeugnis.sub}</div>
          <DocUpload lang={lang} file={null}
            onFile={async f=>{const txt=await new Promise((res)=>{const rd=new FileReader();rd.onload=e=>res(e.target.result);rd.readAsText(f);});setZText(txt||"");}}
            onText={(t)=>setZText(t)}
            onClear={()=>setZText("")}/>
          <div className="field"><label>{t.zeugnis.textLbl}</label><textarea value={zText} onChange={e=>setZText(e.target.value)} placeholder={t.zeugnis.textPh} style={{minHeight:120}}/></div>
          <button className="btn b-em" onClick={runZeugnis} disabled={zLoad||!zText.trim()}>{zLoad?t.zeugnis.loading:t.zeugnis.btn}</button>
        </div>
        {zRes&&<div style={{marginTop:16}}>
          {/* Overall */}
          <div className="card" style={{marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
              <div className={`z-grade ${zRes.grade}`}>{zRes.grade}</div>
              <div>
                <div style={{fontFamily:"var(--hd)",fontSize:20,fontWeight:800,marginBottom:4}}>{t.zeugnis.overall}: {zRes.grade_text}</div>
                <div style={{fontSize:13,color:"var(--mu)",lineHeight:1.65}}>{zRes.overall}</div>
              </div>
            </div>
          </div>
          {/* Phrases */}
          <div className="card" style={{marginBottom:12}}>
            <h4 style={{fontFamily:"var(--hd)",fontSize:15,fontWeight:700,marginBottom:14}}>{t.zeugnis.phrases}</h4>
            {(zRes.phrases||[]).map((ph,i)=>(
              <div key={i} className="z-item">
                <div className={`z-grade ${ph.rating}`} style={{fontSize:14,width:36,height:36}}>{ph.rating}</div>
                <div className="z-content">
                  <div className="z-phrase">«{ph.original}»</div>
                  <div className="z-meaning">💡 {ph.decoded}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Tips */}
          <div className="card">
            <h4 style={{fontFamily:"var(--hd)",fontSize:15,fontWeight:700,marginBottom:14}}>{t.zeugnis.tips}</h4>
            {(zRes.tips||[]).map((tip,i)=><div key={i} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:"1px solid var(--bos)",fontSize:13,color:"var(--mu)",lineHeight:1.65}}>
              <span style={{color:"var(--am)",flexShrink:0}}>→</span>{tip}
            </div>)}
          </div>
          <div style={{display:"flex",gap:7,marginTop:12,flexWrap:"wrap"}}>
            <button className="btn b-outd b-sm" onClick={()=>downloadTxt(`Zeugnis-Analyse\n\nBewertung: ${zRes.grade} – ${zRes.grade_text}\n${zRes.overall}\n\nPhrasen:\n${(zRes.phrases||[]).map(p=>`${p.rating}: «${p.original}» → ${p.decoded}`).join("\n")}\n\nTipps:\n${(zRes.tips||[]).map((t,i)=>`${i+1}. ${t}`).join("\n")}`,"zeugnis")}>📄 TXT</button>
            <button className="btn b-outd b-sm" onClick={()=>downloadHtmlAsPdf(`Zeugnis-Analyse\n\nBewertung: ${zRes.grade} – ${zRes.grade_text}\n${zRes.overall}\n\nPhrasen:\n${(zRes.phrases||[]).map(p=>`${p.rating}: «${p.original}» → ${p.decoded}`).join("\n")}\n\nTipps:\n${(zRes.tips||[]).map((t,i)=>`${i+1}. ${t}`).join("\n")}`,"zeugnis")}>📕 PDF</button>
            <button className="btn b-outd b-sm" onClick={()=>downloadAsWord(`Zeugnis-Analyse\n\nBewertung: ${zRes.grade} – ${zRes.grade_text}\n${zRes.overall}\n\nPhrasen:\n${(zRes.phrases||[]).map(p=>`${p.rating}: «${p.original}» → ${p.decoded}`).join("\n")}\n\nTipps:\n${(zRes.tips||[]).map((t,i)=>`${i+1}. ${t}`).join("\n")}`,"zeugnis")}>📘 Word</button>
            <button className="btn b-outd b-sm" onClick={()=>downloadAsExcel((zRes.phrases||[]).map(p=>[p.rating,p.original,p.decoded]),["Bewertung","Original-Phrase","Bedeutung"],"Zeugnis-Analyse","zeugnis")}>📊 Excel</button>
            <button className="btn b-outd b-sm" onClick={()=>dlPptxFromText(`Zeugnis-Analyse\n\nBewertung: ${zRes.grade} – ${zRes.grade_text}\n\n${zRes.overall}\n\nTipps:\n${(zRes.tips||[]).map((t,i)=>`${i+1}. ${t}`).join("\n")}`,"Zeugnis-Analyse","zeugnis")}>📽️ PPTX</button>
            <button className="btn b-outd b-sm" onClick={()=>{setZRes(null);setZText("");}}>🔄 {lang==="de"?"Neues Zeugnis":lang==="fr"?"Nouveau certificat":lang==="it"?"Nuovo certificato":"New reference"}</button>
          </div>
        </div>}
      </>}
    </div>
    <Footer/>
    </div>
  </>);

  // ══════════════════ JOB MATCHING ══════════════════
  if(page==="jobmatch") return(<>{<style>{FONTS+CSS}</style>}{pw&&<PW/>}
    {authModals}
    <ToastContainer/>
    {showProfiles&&<ProfileManager lang={lang} authSession={authSession} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    <ChatBot lang={lang} pro={pro} setPw={setPw} navTo={navTo} authSession={authSession} onAuthOpen={()=>{setAuthMode("login");setShowAuth(true);}}/>
    <Nav dark/>
    <div className="page-anim">
    <div className="page-hdr vi"><h1>{t.jobmatch.title}</h1><p>{t.jobmatch.sub}</p></div>
    <div className="abody">
      <ToolBanner pageId="jobmatch"/>
      {err&&<div className="err">⚠️ {err}</div>}
      {!pro?<div className="card"><LockMsg sub={t.coach.lockedSub}/></div>:<>
        <div className="card">
          <div className="ct">{t.jobmatch.title}</div><div className="cs">{t.jobmatch.sub}</div>
          <div className="field"><label>{t.jobmatch.skillsLbl}</label><textarea value={jmSkills||prof.skills} onChange={e=>setJmSkills(e.target.value)} placeholder={t.jobmatch.skillsPh} style={{minHeight:100}}/></div>
          <div className="fg2">
            <div className="field"><label>{t.jobmatch.eduLbl}</label><input value={jmEdu||prof.ausbildung} onChange={e=>setJmEdu(e.target.value)} placeholder={t.jobmatch.eduPh}/></div>
            <div className="field"><label>{t.jobmatch.prefLbl}</label><input value={jmPref} onChange={e=>setJmPref(e.target.value)} placeholder={t.jobmatch.prefPh}/></div>
          </div>
          <button className="btn b-em" onClick={runJM} disabled={jmLoad||!jmSkills&&!prof.skills}>{jmLoad?t.jobmatch.loading:t.jobmatch.btn}</button>
        </div>
        {jmRes&&<div style={{marginTop:16}}>
          {(jmRes.matches||[]).map((m,i)=>(
            <div key={i} className="jm-result">
              <div className="jm-top">
                <div className="jm-rank">#{m.rank}</div>
                <div className="jm-info">
                  <div className="jm-title">{m.title}</div>
                  <div style={{fontSize:12,color:"var(--mu)"}}>{m.industry} {m.salary&&`· ${m.salary}`}</div>
                </div>
                <div className="jm-bar-wrap">
                  <div className="jm-pct">{m.fit}%</div>
                  <div className="jm-bar"><div className="jm-bar-fi" style={{width:`${m.fit}%`}}/></div>
                </div>
              </div>
              <div className="jm-body">
                {m.description}
                <div className="jm-chips">{(m.skills_match||[]).map((s,j)=><span key={j} className="jm-chip">✓ {s}</span>)}</div>
              </div>
            </div>
          ))}
          <div style={{marginTop:14,display:"flex",gap:9,flexWrap:"wrap"}}>
            <button className="btn b-em" style={{flex:1}} onClick={()=>navTo("app")}>{lang==="de"?"✍️ Jetzt bewerben →":lang==="fr"?"✍️ Postuler →":lang==="it"?"✍️ Candidarsi →":"✍️ Apply now →"}</button>
            <button className="btn b-outd b-sm" onClick={()=>{const t=(jmRes.matches||[]).map(m=>`#${m.rank} ${m.title} (${m.fit}% Fit)\n${m.description}`).join("\n\n");downloadHtmlAsPdf(t,"jobmatch");}}>📕 PDF</button>
            <button className="btn b-outd b-sm" onClick={()=>{const t=(jmRes.matches||[]).map(m=>`#${m.rank} ${m.title} (${m.fit}% Fit)\n${m.description}`).join("\n\n");downloadAsWord(t,"jobmatch");}}>📘 Word</button>
            <button className="btn b-outd b-sm" onClick={()=>{const rows=(jmRes.matches||[]).map(m=>[m.rank,m.title,m.fit+"%",m.industry||"",m.salary||""]);downloadAsExcel(rows,["Rang","Job","Fit","Branche","Gehalt"],"Job-Matching","jobmatch");}}>📊 Excel</button>
            <button className="btn b-outd b-sm" onClick={()=>{const t=(jmRes.matches||[]).map(m=>`#${m.rank} ${m.title} (${m.fit}% Fit)\n${m.description}`).join("\n\n");dlPptxFromText(t,"Job-Matching","jobmatch");}}>📽️ PPTX</button>
            <button className="btn b-outd b-sm" onClick={()=>setJmRes(null)}>🔄</button>
          </div>
        </div>}
      </>}
    </div>
    <Footer/>
    </div>
  </>);

  // ══════════════════ LINKEDIN ══════════════════
  if(page==="linkedin") return(<>{<style>{FONTS+CSS}</style>}{pw&&<PW/>}
    {authModals}
    <ToastContainer/>
    {showProfiles&&<ProfileManager lang={lang} authSession={authSession} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    <ChatBot lang={lang} pro={pro} setPw={setPw} navTo={navTo} authSession={authSession} onAuthOpen={()=>{setAuthMode("login");setShowAuth(true);}}/>
    <Nav dark/>
    <div className="page-anim">
    <div className="page-hdr bl"><h1>{t.linkedin.title}</h1><p>{t.linkedin.sub}</p></div>
    <div className="abody">
      <ToolBanner pageId="linkedin"/>
      {err&&<div className="err">⚠️ {err}</div>}
      {!pro?<div className="card"><LockMsg sub={t.coach.lockedSub}/></div>:<>
        <div className="card">
          <div className="ct">{t.linkedin.title}</div><div className="cs">{t.linkedin.sub}</div>
          <DocUpload lang={lang} file={null}
            onFile={async f=>{const txt=await new Promise((res)=>{const rd=new FileReader();rd.onload=e=>res(e.target.result);rd.readAsText(f);});setLiData(p=>({...p,text:txt||""}));}}
            onText={(t)=>setLiData(p=>({...p,text:t}))}
            onClear={()=>setLiData(p=>({...p,text:""}))}/>
          <div className="field"><label>{t.linkedin.analyzeLabel}</label><textarea value={liData.text} onChange={e=>setLiData(d=>({...d,text:e.target.value}))} placeholder={t.linkedin.analyzePh} style={{minHeight:80}}/></div>
          <div className="fg2">
            <div className="field"><label>{t.linkedin.roleLbl}</label><input value={liData.role} onChange={e=>setLiData(d=>({...d,role:e.target.value}))} placeholder={t.linkedin.rolePh}/></div>
            <div className="field"><label>{t.linkedin.achLbl}</label><input value={liData.ach} onChange={e=>setLiData(d=>({...d,ach:e.target.value}))} placeholder={t.linkedin.achPh}/></div>
          </div>
          <button className="btn b-bl" onClick={runLI} disabled={liLoad}>{liLoad?t.linkedin.load:t.linkedin.btn}</button>
        </div>
        {liRes&&<>
          <div className="li-res" style={{marginTop:14}}><h4>🔵 {t.linkedin.resH}</h4><div style={{fontSize:16,fontWeight:600,color:"#0a66c2"}}>{liRes.headline}</div><button className="btn b-outd b-sm" style={{marginTop:10}} onClick={()=>navigator.clipboard.writeText(liRes.headline)}>📋 {t.linkedin.copy}</button></div>
          <div className="li-res"><h4>📝 {t.linkedin.resA}</h4><div style={{fontSize:14,lineHeight:1.8,color:"var(--ink)",whiteSpace:"pre-wrap"}}>{liRes.about}</div><button className="btn b-outd b-sm" style={{marginTop:10}} onClick={()=>navigator.clipboard.writeText(liRes.about)}>📋 {t.linkedin.copy}</button></div>
          <div className="li-res"><h4>🏷️ {t.linkedin.resS}</h4><div className="li-skills">{(liRes.skills||[]).map((s,i)=><span key={i} className="li-sk">{s}</span>)}</div></div>
          <div style={{display:"flex",gap:7,marginTop:14,flexWrap:"wrap"}}>
            <button className="btn b-outd b-sm" onClick={()=>downloadTxt(`${liRes.headline}\n\n${liRes.about}\n\nSkills: ${(liRes.skills||[]).join(", ")}`,"linkedin")}>📄 TXT</button>
            <button className="btn b-outd b-sm" onClick={()=>downloadHtmlAsPdf(`${liRes.headline}\n\n${liRes.about}\n\nSkills: ${(liRes.skills||[]).join(", ")}`,"linkedin")}>📕 PDF</button>
            <button className="btn b-outd b-sm" onClick={()=>downloadAsWord(`${liRes.headline}\n\n${liRes.about}\n\nSkills: ${(liRes.skills||[]).join(", ")}`,"linkedin")}>📘 Word</button>
            <button className="btn b-outd b-sm" onClick={()=>downloadAsExcel([["Headline",liRes.headline],["Skills",(liRes.skills||[]).join(", ")]],["Feld","Inhalt"],"LinkedIn","linkedin")}>📊 Excel</button>
            <button className="btn b-outd b-sm" onClick={()=>dlPptxFromText(`${liRes.headline}\n\n${liRes.about}\n\nSkills: ${(liRes.skills||[]).join(", ")}`,"LinkedIn Optimierung","linkedin")}>📽️ PPTX</button>
            <button className="btn b-outd b-sm" onClick={()=>{setLiRes(null);}}>🔄 {lang==="de"?"Neu":lang==="fr"?"Nouveau":lang==="it"?"Nuovo":"New"}</button>
          </div>
        </>}
      </>}
    </div>
    <Footer/>
    </div>
  </>);

  // ══════════════════ CHECKLIST ══════════════════
  if(page==="checklist") return(<>{<style>{FONTS+CSS}</style>}{pw&&<PW/>}
    {authModals}
    <ToastContainer/>
    {showProfiles&&<ProfileManager lang={lang} authSession={authSession} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    <Nav dark/>
    <div className="page-hdr dk"><h1>{t.checklist.title}</h1><p>{t.checklist.sub}</p></div>
    <div className="abody">
      {!pro?<div className="card"><LockMsg sub={t.coach.lockedSub}/></div>:<>
        {(()=>{const done=t.checklist.items.filter(i=>ck[i.id]).length,tot=t.checklist.items.length,pct=Math.round(done/tot*100);return(
          <div className="cl-sb">
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:7,color:"var(--em2)"}}>{t.checklist.score(done,tot)}</div>
              <div className="cl-bar"><div className="cl-fi" style={{width:`${pct}%`}}/></div>
            </div>
            <div className="cl-pct">{pct}%</div>
          </div>);})()}
        {t.checklist.items.every(i=>ck[i.id])&&<div className="ok" style={{textAlign:"center",marginBottom:14}}>{t.checklist.perfect}</div>}
        <div className="card">
          {t.checklist.items.map(item=>(
            <div key={item.id} className="cl-row" onClick={()=>setCk(c=>({...c,[item.id]:!c[item.id]}))}>
              <div className={`cl-box ${ck[item.id]?"on":""}`}>{ck[item.id]&&"✓"}</div>
              <div className="cl-text"><h5 className={ck[item.id]?"d":""}>{item.t}</h5><p>{item.d}</p></div>
            </div>
          ))}
        </div>
      </>}
    </div>
    <Footer/>
  </>);

  // ══════════════════ INTERVIEW COACH ══════════════════
  if(page==="coach") return(<>{<style>{FONTS+CSS}</style>}{pw&&<PW/>}
    {authModals}
    {showProfiles&&<ProfileManager lang={lang} authSession={authSession} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    <ChatBot lang={lang} pro={pro} setPw={setPw} navTo={navTo} authSession={authSession} onAuthOpen={()=>{setAuthMode("login");setShowAuth(true);}}/>
    <Nav dark/>
    <div className="page-hdr dk"><h1>{t.coach.title}</h1><p>{t.coach.sub}</p></div>
    <div className="abody">
      <ToolBanner pageId="coach"/>
      {err&&<div className="err">⚠️ {err}</div>}
      {!pro?<div className="card"><LockMsg sub={t.coach.lockedSub}/></div>:!icReady?(
        <div className="card">
          <div className="ct">{t.coach.ready}</div><div className="cs">{t.coach.readySub}</div>
          {!job.title&&<div className="err" style={{marginBottom:14}}>{t.coach.noJob}</div>}
          {job.title&&<div className="ok" style={{marginBottom:16}}>💼 {t.coach.qOf(0).replace("0/5","–")} {job.title}{job.company?` @ ${job.company}`:""}</div>}
          <div className="frow"><button className="btn b-outd" onClick={()=>navTo("app")}>{t.app.back}</button><button className="btn b-em" onClick={startIC} disabled={icLoad||!job.title}>{icLoad?t.coach.prep:t.coach.start}</button></div>
        </div>
      ):(
        <>
          {icScore&&<div className="score-box">
            <div style={{display:"flex",gap:20,flexWrap:"wrap",alignItems:"flex-start"}}>
              <div><div className="score-n">{icScore.score}<span>/100</span></div><div className="score-bar"><div className="score-fi" style={{width:`${icScore.score}%`}}/></div></div>
              <div style={{flex:1}}><div style={{fontFamily:"var(--hd)",fontSize:16,fontWeight:700,marginBottom:9}}>{t.coach.result}</div><div style={{fontSize:13,lineHeight:1.7,color:"rgba(11,11,18,.7)",marginBottom:7}}>{icScore.feedback}</div>{icScore.staerken&&<div style={{fontSize:12,color:"var(--em2)",marginBottom:3}}>{t.coach.strengths} {icScore.staerken.join(", ")}</div>}{icScore.verbesserung&&<div style={{fontSize:12,color:"var(--mu)"}}>{t.coach.tip} {icScore.verbesserung}</div>}</div>
            </div>
          </div>}
          <div className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div className="ct" style={{fontSize:17,margin:0}}>{t.coach.title}</div>
              <div style={{fontSize:12,color:"var(--mu)",fontWeight:600}}>{t.coach.qOf(Math.min(icN,5))}</div>
            </div>
            <div className="chat" ref={chatRef}>
              {icMsgs.map((m,i)=><div key={i} className={`msg ${m.r==="u"?"u":""}`}>
                <div className={`msg-av ${m.r==="ai"?"ai":"us"}`}>{m.r==="ai"?"🤖":"👤"}</div>
                <div className="msg-b">{m.t}</div>
              </div>)}
              {icLoad&&<div className="msg"><div className="msg-av ai">🤖</div><div className="msg-b" style={{color:"var(--mu)"}}>…</div></div>}
            </div>
            {!icScore&&<div className="ic-inp" style={{marginTop:14}}>
              <textarea value={icIn} onChange={e=>setIcIn(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!icLoad){e.preventDefault();sendIC();}}} placeholder={t.coach.ph} disabled={icLoad}/>
              <button className="btn b-em" onClick={sendIC} disabled={icLoad||!icIn.trim()}>{t.coach.send}</button>
            </div>}
            {icScore&&<button className="btn b-dk b-w" style={{marginTop:14}} onClick={()=>{setIcReady(false);setIcScore(null);setIcMsgs([]);setIcN(0);}}>{t.coach.newIC}</button>}
            {icScore&&<div style={{display:"flex",gap:7,marginTop:10,flexWrap:"wrap"}}>
              {(()=>{const txt=`Interview-Coach Ergebnis\nScore: ${icScore.score}/100\n\n${icScore.feedback}\n\nStärken: ${(icScore.staerken||[]).join(", ")}\nTipp: ${icScore.verbesserung||""}\n\nGesprächsverlauf:\n${icMsgs.map(m=>`${m.r==="u"?"Du":"Coach"}: ${m.t}`).join("\n")}`; return(<>
                <button className="btn b-outd b-sm" onClick={()=>downloadHtmlAsPdf(txt,"coach")}>📕 PDF</button>
                <button className="btn b-outd b-sm" onClick={()=>downloadAsWord(txt,"coach")}>📘 Word</button>
                <button className="btn b-outd b-sm" onClick={()=>dlExcelFromText(txt,"coach")}>📊 Excel</button>
                <button className="btn b-outd b-sm" onClick={()=>dlPptxFromText(txt,"Interview-Coach","coach")}>📽️ PPTX</button>
              </>);})()}
            </div>}
          </div>
        </>
      )}
    </div>
    <Footer/>
  </>);

  // ══════════════════ EXCEL GENERATOR ══════════════════
  if(page==="excel") return(<>{<style>{FONTS+CSS}</style>}{pw&&<PW/>}
    {authModals}
    {showProfiles&&<ProfileManager lang={lang} authSession={authSession} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    <ChatBot lang={lang} pro={pro} setPw={setPw} navTo={navTo} authSession={authSession} onAuthOpen={()=>{setAuthMode("login");setShowAuth(true);}}/>
    <Nav dark/>
    <div className="page-hdr" style={{background:"linear-gradient(135deg,#166534,#15803d)",padding:"48px 28px 0",textAlign:"center"}}>
      <h1 style={{fontFamily:"var(--hd)",fontSize:32,fontWeight:800,color:"white",marginBottom:7,letterSpacing:"-1px"}}>📊 {t.nav.excel}</h1>
      <p style={{fontSize:14,color:"rgba(255,255,255,.4)",paddingBottom:34}}>{L("Professionelle Excel-Tabellen mit Formeln – für jeden Bereich.","Professional Excel spreadsheets with formulas – for any purpose.","Tableaux Excel professionnels avec formules – pour tous.","Fogli Excel professionali con formule – per tutti.")}</p>
    </div>
    <div className="abody">
      <ToolBanner pageId="excel"/>
      {err&&<div className="err">⚠️ {err}</div>}
      {!pro?<div className="card"><LockMsg sub={L("Der Excel-Generator ist in Pro enthalten. CHF 19.90/Monat.","The Excel generator is included in Pro. CHF 19.90/month.","Le générateur Excel est inclus dans Pro. CHF 19.90/mois.","Il generatore Excel è incluso in Pro. CHF 19.90/mese.")}/></div>:<>
        <div className="card">
          <div className="ct">📊 {t.nav.excel}</div>
          <div className="cs">{L("Beschreibe deine Aufgabe – die KI erstellt die perfekte Struktur mit Formeln.","Describe your task – AI creates the perfect structure with formulas.","Décrivez votre tâche – l'IA crée la structure parfaite avec formules.","Descrivi il tuo compito – l'IA crea la struttura perfetta con formule.")}</div>
          {/* Examples */}
          <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14}}>
            {[
              L("Budget-Übersicht Haushalt","Household budget overview","Budget ménage","Budget domestico"),
              L("Reisekostenabrechnung","Travel expense report","Frais de déplacement","Nota spese viaggio"),
              L("Stundenerfassung / Lohnabrechnung","Time tracking / Payroll","Suivi des heures / Paie","Rilevazione ore / Buste paga"),
              L("Lehrplan-Noten-Tracker","Grade tracker","Suivi de notes","Tracker voti"),
              L("Projektplan mit Meilensteinen","Project plan with milestones","Plan de projet","Piano di progetto"),
              L("Inventarliste Shop","Shop inventory list","Liste d'inventaire","Lista inventario"),
            ].map((ex,i)=><button key={i} className="btn b-outd b-sm" style={{fontSize:12,padding:"5px 12px"}} onClick={()=>setXlTask(ex)}>{ex}</button>)}
          </div>
          <div className="field"><label>{L("Deine Aufgabe *","Your task *","Votre tâche *","Il tuo compito *")}</label>
            <textarea value={xlTask} onChange={e=>setXlTask(e.target.value)} placeholder={L("z.B. Ich brauche eine Haushaltsbuchhaltung mit monatlichen Kategorien, Soll/Ist-Vergleich und Jahressummen.","e.g. I need a household budget with monthly categories, target/actual comparison and yearly totals.","ex. J'ai besoin d'un budget ménage avec catégories mensuelles, comparaison prévu/réel et totaux annuels.","es. Ho bisogno di un budget domestico con categorie mensili, confronto obiettivo/reale e totali annuali.")} style={{minHeight:100}}/></div>
          <button className="btn b-em" onClick={runXL} disabled={xlLoad||!xlTask.trim()}>{xlLoad?L("Erstelle…","Creating…","Création…","Creando…"):L("📊 Excel erstellen","📊 Create Excel","📊 Créer Excel","📊 Crea Excel")}</button>
        </div>

        {xlRes&&<div style={{marginTop:16}}>
          <div className="card" style={{background:"linear-gradient(135deg,rgba(22,101,52,.04),white)",border:"1.5px solid rgba(22,101,52,.2)",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:16}}>
              <div>
                <div style={{fontFamily:"var(--hd)",fontSize:22,fontWeight:800,letterSpacing:"-.5px",marginBottom:5}}>📊 {xlRes.title}</div>
                <div style={{fontSize:13,color:"var(--mu)",lineHeight:1.7}}>{xlRes.description}</div>
              </div>
              <button className="btn b-em b-sm" onClick={downloadCSV} style={{flexShrink:0}}>📥 {L("CSV herunterladen","Download CSV","Télécharger CSV","Scarica CSV")}</button>
            </div>

            {(xlRes.sheets||[]).map((sh,si)=>(
              <div key={si} style={{marginBottom:16}}>
                <div style={{fontFamily:"var(--hd)",fontSize:16,fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{background:"rgba(22,101,52,.1)",color:"#166534",padding:"2px 10px",borderRadius:20,fontSize:12,fontWeight:700}}>📋 {sh.name}</span>
                  <span style={{fontSize:12,color:"var(--mu)",fontWeight:400}}>{sh.description}</span>
                </div>
                {/* Table preview */}
                <div style={{overflowX:"auto",borderRadius:10,border:"1.5px solid var(--bo)",marginBottom:12}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead>
                      <tr style={{background:"#166534"}}>{(sh.headers||[]).map((h,i)=><th key={i} style={{padding:"9px 14px",textAlign:"left",color:"white",fontWeight:700,whiteSpace:"nowrap"}}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {(sh.sample_rows||[]).map((row,ri)=><tr key={ri} style={{background:ri%2===0?"white":"#f9fafb"}}>
                        {row.map((cell,ci)=><td key={ci} style={{padding:"8px 14px",borderBottom:"1px solid var(--bos)",color:"var(--ink)"}}>{cell}</td>)}
                      </tr>)}
                      <tr style={{background:"#f0fdf4",fontWeight:700}}>
                        {(sh.headers||[]).map((_,i)=><td key={i} style={{padding:"8px 14px",color:"#166534",fontSize:12}}>{i===0?L("↳ Formeln","↳ Formulas","↳ Formules","↳ Formule"):""}</td>)}
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* Formulas */}
                {sh.formulas?.length>0&&<>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"#166534"}}>📐 {L("Enthaltene Formeln","Included formulas","Formules incluses","Formule incluse")}</div>
                  {sh.formulas.map((f,fi)=>(
                    <div key={fi} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:"1px solid var(--bos)",alignItems:"flex-start"}}>
                      <div style={{background:"#dcfce7",color:"#166534",padding:"3px 10px",borderRadius:6,fontFamily:"monospace",fontSize:12,flexShrink:0,fontWeight:700}}>{f.cell}</div>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"monospace",fontSize:12,color:"#166534",marginBottom:3,background:"#f0fdf4",padding:"3px 8px",borderRadius:4,display:"inline-block"}}>{f.formula}</div>
                        <div style={{fontSize:12,color:"var(--mu)",marginTop:3}}>{f.description}</div>
                      </div>
                    </div>
                  ))}
                </>}
                {sh.formatting_tips?.length>0&&<div style={{marginTop:10,padding:"10px 14px",background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.2)",borderRadius:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#92400e",marginBottom:6}}>🎨 {L("Formatierungstipps","Formatting tips","Conseils de mise en forme","Consigli di formattazione")}</div>
                  {sh.formatting_tips.map((tip,ti)=><div key={ti} style={{fontSize:12,color:"rgba(11,11,18,.6)",lineHeight:1.6,paddingLeft:4}}>→ {tip}</div>)}
                </div>}
              </div>
            ))}
          </div>

          {/* General tips */}
          <div className="card">
            <div style={{fontFamily:"var(--hd)",fontSize:16,fontWeight:700,marginBottom:12}}>💡 {L("Excel-Profi-Tipps","Excel pro tips","Conseils Excel pro","Consigli Excel pro")}</div>
            {(xlRes.excel_tips||[]).map((tip,i)=><div key={i} style={{display:"flex",gap:9,padding:"9px 0",borderBottom:"1px solid var(--bos)",fontSize:13,color:"var(--mu)",lineHeight:1.65}}>
              <span style={{color:"#166534",flexShrink:0}}>✓</span>{tip}
            </div>)}
            {xlRes.download_note&&<div style={{marginTop:14,padding:"10px 14px",background:"var(--em3)",border:"1px solid rgba(16,185,129,.2)",borderRadius:10,fontSize:13,color:"var(--em2)"}}>{xlRes.download_note}</div>}
          </div>
          <div style={{marginTop:12,display:"flex",gap:9,flexWrap:"wrap"}}>
            <button className="btn b-em b-sm" style={{background:"#217346"}} onClick={downloadXLSX}>📊 {L("Excel (.xlsx)","Excel (.xlsx)","Excel (.xlsx)","Excel (.xlsx)")}</button>
            <button className="btn b-outd b-sm" onClick={downloadCSV}>📄 CSV</button>
            <button className="btn b-outd b-sm" onClick={()=>{
              const sh=xlRes.sheets?.[0];
              const txt=sh?`${xlRes.title||""}\n\n${[sh.headers,...(sh.sample_rows||[])].map(r=>r.join(" | ")).join("\n")}`:"";
              downloadHtmlAsPdf(txt,"excel");}}>📕 PDF</button>
            <button className="btn b-outd b-sm" onClick={()=>{
              const sh=xlRes.sheets?.[0];
              const txt=sh?`${xlRes.title||""}\n\n${[sh.headers,...(sh.sample_rows||[])].map(r=>r.join(" | ")).join("\n")}`:"";
              downloadAsWord(txt,"excel");}}>📘 Word</button>
            <button className="btn b-outd b-sm" onClick={()=>{
              const sh=xlRes.sheets?.[0];
              const txt=sh?`${xlRes.title||""}\n\n${[sh.headers,...(sh.sample_rows||[])].map(r=>r.join(" | ")).join("\n")}`:"";
              dlPptxFromText(txt,xlRes.title||"Excel","excel");}}>📽️ PPTX</button>
            <button className="btn b-outd b-sm" onClick={()=>{setXlRes(null);setXlTask("");}}>🔄</button>
          </div>
        </div>}
      </>}
    </div>
    <Footer/>
  </>);

  // ══════════════════ POWERPOINT MAKER ══════════════════
  if(page==="pptx") return(<>{<style>{FONTS+CSS}</style>}{pw&&<PW/>}
    {authModals}
    {showProfiles&&<ProfileManager lang={lang} authSession={authSession} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    <ChatBot lang={lang} pro={pro} setPw={setPw} navTo={navTo} authSession={authSession} onAuthOpen={()=>{setAuthMode("login");setShowAuth(true);}}/>
    <Nav dark/>
    <div className="page-hdr" style={{background:"linear-gradient(135deg,#1e3a5f,#2563eb)",padding:"48px 28px 0",textAlign:"center"}}>
      <h1 style={{fontFamily:"var(--hd)",fontSize:32,fontWeight:800,color:"white",marginBottom:7,letterSpacing:"-1px"}}>📽️ {t.nav.pptx}</h1>
      <p style={{fontSize:14,color:"rgba(255,255,255,.4)",paddingBottom:34}}>{L("Professionelle Präsentationen für Schule, Uni & Arbeit.","Professional presentations for school, uni & work.","Présentations professionnelles pour école, université & travail.","Presentazioni professionali per scuola, università e lavoro.")}</p>
    </div>
    <div className="abody">
      <ToolBanner pageId="pptx"/>
      {err&&<div className="err">⚠️ {err}</div>}
      {!pro?<div className="card"><LockMsg sub={L("Der PowerPoint-Maker ist in Pro enthalten. CHF 19.90/Monat.","The PowerPoint maker is included in Pro. CHF 19.90/month.","Le créateur PowerPoint est inclus dans Pro. CHF 19.90/mois.","Il creatore PowerPoint è incluso in Pro. CHF 19.90/mese.")}/></div>:<>
        <div className="card">
          <div className="ct">📽️ {t.nav.pptx}</div>
          <div className="cs">{L("Beschreibe dein Thema – die KI erstellt eine komplette Präsentation mit Inhalt, Struktur und Sprechernotizen.","Describe your topic – AI creates a complete presentation with content, structure and speaker notes.","Décrivez votre sujet – l'IA crée une présentation complète.","Descrivi il tuo argomento – l'IA crea una presentazione completa.")}</div>
          {/* Examples */}
          <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14}}>
            {[
              L("Mein Ferienbericht","My holiday report","Mon rapport de vacances","Il mio rapporto di vacanza"),
              L("Klimawandel für die Schule","Climate change for school","Changement climatique scolaire","Cambiamento climatico"),
              L("Businessplan für Startup","Business plan for startup","Business plan startup","Business plan startup"),
              L("Jahresbericht Verein","Annual association report","Rapport annuel association","Relazione annuale associazione"),
              L("Produktpräsentation","Product presentation","Présentation produit","Presentazione prodotto"),
            ].map((ex,i)=><button key={i} className="btn b-outd b-sm" style={{fontSize:12,padding:"5px 12px"}} onClick={()=>setPpTask(ex)}>{ex}</button>)}
          </div>
          <div className="field"><label>{L("Thema / Aufgabe *","Topic / Task *","Sujet / Tâche *","Argomento / Compito *")}</label>
            <textarea value={ppTask} onChange={e=>setPpTask(e.target.value)} placeholder={L("z.B. Eine Präsentation über die Vor- und Nachteile von KI für Gymnasiasten, Dauer ca. 10 Minuten.","e.g. A presentation about the pros and cons of AI for high school students, duration approx. 10 minutes.","ex. Une présentation sur les avantages et inconvénients de l'IA pour lycéens, durée environ 10 minutes.","es. Una presentazione sui pro e contro dell'IA per studenti, durata circa 10 minuti.")} style={{minHeight:90}}/></div>
          <div className="fg2">
            <div className="field"><label>{L("Anzahl Folien","Number of slides","Nombre de diapositives","Numero di diapositive")}</label>
              <select value={ppSlides} onChange={e=>setPpSlides(e.target.value)}>
                {[5,6,8,10,12,15].map(n=><option key={n} value={n}>{n} {L("Folien","slides","diapositives","diapositive")}</option>)}
              </select>
            </div>
            <div className="field"><label>{L("Ton / Stil","Tone / Style","Ton / Style","Tono / Stile")}</label>
              <select value={ppTone} onChange={e=>setPpTone(e.target.value)}>
                <option value="professional">{L("Professionell","Professional","Professionnel","Professionale")}</option>
                <option value="academic">{L("Akademisch / Schularbeit","Academic / School","Académique","Accademico")}</option>
                <option value="creative">{L("Kreativ & Modern","Creative & Modern","Créatif & Moderne","Creativo & Moderno")}</option>
                <option value="minimal">{L("Minimalistisch","Minimalist","Minimaliste","Minimalista")}</option>
                <option value="startup">{L("Startup / Pitch","Startup / Pitch","Startup / Pitch","Startup / Pitch")}</option>
              </select>
            </div>
          </div>
          <button className="btn b-bl" onClick={runPP} disabled={ppLoad||!ppTask.trim()}>{ppLoad?L("Erstelle Folien…","Creating slides…","Création des diapositives…","Creando diapositive…"):L("📽️ Präsentation erstellen","📽️ Create presentation","📽️ Créer présentation","📽️ Crea presentazione")}</button>
        </div>

        {ppRes&&<div style={{marginTop:16}}>
          {/* Header */}
          <div style={{background:"linear-gradient(135deg,#1e3a5f,#2563eb)",borderRadius:"var(--r2)",padding:28,marginBottom:14,color:"white",textAlign:"center"}}>
            <div style={{fontFamily:"var(--hd)",fontSize:26,fontWeight:800,letterSpacing:"-1px",marginBottom:6}}>{ppRes.title}</div>
            {ppRes.subtitle&&<div style={{fontSize:15,color:"rgba(255,255,255,.6)",marginBottom:10}}>{ppRes.subtitle}</div>}
            <div style={{display:"flex",gap:20,justifyContent:"center",flexWrap:"wrap"}}>
              {ppRes.theme_suggestion&&<span style={{fontSize:12,background:"rgba(255,255,255,.1)",padding:"4px 12px",borderRadius:20}}>🎨 {ppRes.theme_suggestion}</span>}
              {ppRes.estimated_duration&&<span style={{fontSize:12,background:"rgba(255,255,255,.1)",padding:"4px 12px",borderRadius:20}}>⏱️ {ppRes.estimated_duration}</span>}
              <span style={{fontSize:12,background:"rgba(255,255,255,.1)",padding:"4px 12px",borderRadius:20}}>📋 {(ppRes.slides||[]).length} {L("Folien","slides","diapositives","diapositive")}</span>
            </div>
          </div>

          {/* Slides */}
          {(ppRes.slides||[]).map((slide,i)=>(
            <div key={i} style={{background:"white",border:"1.5px solid var(--bo)",borderRadius:"var(--r2)",marginBottom:10,overflow:"hidden"}}>
              <div style={{background:i===0?"linear-gradient(135deg,#1e3a5f,#2563eb)":"var(--dk3)",padding:"14px 20px",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:32,height:32,background:"rgba(255,255,255,.12)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--hd)",fontSize:13,fontWeight:800,color:"white",flexShrink:0}}>{slide.slide}</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--hd)",fontSize:15,fontWeight:700,color:"white"}}>{slide.title}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:"1px",marginTop:2}}>{slide.layout}</div>
                </div>
                {slide.design_tip&&<div style={{fontSize:11,color:"rgba(255,255,255,.4)",maxWidth:160,textAlign:"right",lineHeight:1.4}}>💡 {slide.design_tip}</div>}
              </div>
              <div style={{padding:"16px 20px"}}>
                {(slide.content||[]).map((item,ci)=>(
                  <div key={ci} style={{display:"flex",gap:10,padding:"6px 0",borderBottom:ci<slide.content.length-1?"1px solid var(--bos)":"none",fontSize:13,color:"var(--ink)",lineHeight:1.6}}>
                    <span style={{color:"var(--bl)",flexShrink:0,fontWeight:700}}>→</span>{item}
                  </div>
                ))}
                {slide.speaker_note&&<div style={{marginTop:10,padding:"9px 13px",background:"#fffbf0",border:"1px solid rgba(245,158,11,.2)",borderRadius:8,fontSize:12,color:"#92400e",display:"flex",gap:7,lineHeight:1.6}}>
                  <span style={{flexShrink:0}}>🎤</span><span>{slide.speaker_note}</span>
                </div>}
              </div>
            </div>
          ))}

          {/* Design tips */}
          {ppRes.design_tips?.length>0&&<div className="card" style={{marginBottom:12}}>
            <div style={{fontFamily:"var(--hd)",fontSize:15,fontWeight:700,marginBottom:12}}>🎨 {L("Design-Tipps für PowerPoint","Design tips for PowerPoint","Conseils design PowerPoint","Consigli design PowerPoint")}</div>
            {ppRes.design_tips.map((tip,i)=><div key={i} style={{display:"flex",gap:9,padding:"8px 0",borderBottom:"1px solid var(--bos)",fontSize:13,color:"var(--mu)",lineHeight:1.65}}><span style={{color:"var(--bl)",flexShrink:0}}>→</span>{tip}</div>)}
          </div>}

          {/* Copy all content */}
          <div className="card">
            <div style={{fontFamily:"var(--hd)",fontSize:15,fontWeight:700,marginBottom:10}}>📋 {L("Gesamten Inhalt kopieren","Copy all content","Copier tout le contenu","Copia tutto il contenuto")}</div>
            <div className="r-doc" style={{maxHeight:240,fontSize:12}}>
              {`${ppRes.title}\n${ppRes.subtitle||""}\n\n`+
               (ppRes.slides||[]).map(s=>`FOLIE ${s.slide}: ${s.title}\n${(s.content||[]).map(c=>`• ${c}`).join("\n")}\n[Sprechernotiz: ${s.speaker_note||""}]`).join("\n\n")}
            </div>
            <div style={{marginTop:10,display:"flex",gap:9,flexWrap:"wrap"}}>
              <button className="btn b-outd b-sm" onClick={()=>{
                const txt=`${ppRes.title}\n${ppRes.subtitle||""}\n\n`+(ppRes.slides||[]).map(s=>`FOLIE ${s.slide}: ${s.title}\n${(s.content||[]).map(c=>`• ${c}`).join("\n")}\n[Sprechernotiz: ${s.speaker_note||""}]`).join("\n\n");
                navigator.clipboard.writeText(txt);}}>📋 {L("Kopieren","Copy","Copier","Copia")}</button>
              <button className="btn b-outd b-sm" onClick={()=>{
                const txt=`${ppRes.title}\n${ppRes.subtitle||""}\n\n`+(ppRes.slides||[]).map(s=>`FOLIE ${s.slide}: ${s.title}\n${(s.content||[]).map(c=>`• ${c}`).join("\n")}\n[Sprechernotiz: ${s.speaker_note||""}]`).join("\n\n");
                downloadTxt(txt,"pptx");}}>📄 TXT</button>
              <button className="btn b-outd b-sm" onClick={()=>{
                const txt=`${ppRes.title}\n${ppRes.subtitle||""}\n\n`+(ppRes.slides||[]).map(s=>`FOLIE ${s.slide}: ${s.title}\n${(s.content||[]).map(c=>`• ${c}`).join("\n")}\n[Sprechernotiz: ${s.speaker_note||""}]`).join("\n\n");
                downloadHtmlAsPdf(txt,"pptx");}}>📕 PDF</button>
              <button className="btn b-outd b-sm" onClick={()=>{
                const txt=`${ppRes.title}\n${ppRes.subtitle||""}\n\n`+(ppRes.slides||[]).map(s=>`FOLIE ${s.slide}: ${s.title}\n${(s.content||[]).map(c=>`• ${c}`).join("\n")}\n[Sprechernotiz: ${s.speaker_note||""}]`).join("\n\n");
                downloadAsWord(txt,"pptx");}}>📘 Word</button>
              <button className="btn b-outd b-sm" onClick={()=>downloadAsExcel((ppRes.slides||[]).map(s=>[s.slide,s.title,(s.content||[]).join("; "),s.speaker_note||""]),["Folie","Titel","Inhalt","Sprechernotiz"],"Präsentation","pptx")}>📊 Excel</button>
              <button className="btn b-em b-sm" style={{fontWeight:700}} onClick={()=>downloadAsPptx(ppRes.slides,ppRes.title,"pptx")}>📽️ .pptx</button>
              <button className="btn b-outd b-sm" onClick={()=>{setPpRes(null);setPpTask("");}}>🔄 {L("Neu","New","Nouveau","Nuovo")}</button>
            </div>
          </div>
        </div>}
      </>}
    </div>
    <Footer/>
  </>);

  // ══════════════════ STELLA VOLLBILD-CHAT ══════════════════
  if(page==="chat") {
    const chatUsage2 = getChatCount();
    const isLoggedIn2 = !!authSession;
    const canChat2   = isLoggedIn2 && (pro || chatUsage2 < C.CHAT_FREE_LIMIT);
    const remaining2 = pro ? "∞" : Math.max(0, C.CHAT_FREE_LIMIT - chatUsage2);
    const L2 = (d,e,f,i) => ({de:d,en:e,fr:f,it:i}[lang]||d);

    const SYSTEM2 = `Du bist Stella, die KI-Karriere-Assistentin von Stellify – dem Schweizer AI Career Copilot. Du hast tiefes Wissen über alle Aspekte der Karriere, Bewerbung, Arbeitsmarkt Schweiz und Produktivität.

DEIN WISSEN & FÄHIGKEITEN:

Bewerbungen & Lebenslauf:
- Du kennst den Aufbau perfekter Schweizer Motivationsschreiben (Einleitung mit Bezug zur Stelle, Hauptteil mit konkreten Erfolgen und Zahlen, Schluss mit Mehrwert)
- Du weisst, dass Schweizer Lebensläufe meist 1-2 Seiten, tabellarisch, mit Foto sind
- Du kennst ATS-Systeme (Applicant Tracking Systems) und wie man Keywords optimiert
- Du kannst konkrete Formulierungen, Phrasen und ganze Abschnitte schreiben

Schweizer Arbeitsmarkt:
- Du kennst die wichtigsten Branchen: Finanz (UBS, CS/UBS, Zurich Insurance), Pharma (Novartis, Roche, Lonza), MEM (ABB, Georg Fischer), IT, Tourismus
- Du kennst typische Schweizer Gehälter nach Branche und Erfahrung
- Du weisst über das Schweizer Arbeitsrecht: Kündigungsfristen (1 Monat Probezeit, dann 1-3 Monate je nach Dienstjahren), Sperrfristen, Zeugnisnoten (sehr gut/gut/genügend im Zeugnis-Code)
- Du kennst RAV, ALV, Quellensteuer, 13. Monatslohn, Ferienanspruch (mind. 4 Wochen)

Gehaltsverhandlung:
- Du kennst Gehaltsrahmen für gängige Berufe in der Schweiz
- Du kennst Taktiken: Anker setzen, Gegenargumente entkräften, nicht zuerst eine Zahl nennen
- Du kannst konkrete Sätze für Gehaltsverhandlungen liefern

LinkedIn & Personal Branding:
- Du kennst den LinkedIn-Algorithmus und was Recruiter sehen wollen
- Du kannst Headlines, About-Sections und Erfahrungsbeschreibungen optimieren

Interview-Vorbereitung:
- Du kennst die STAR-Methode (Situation, Task, Action, Result)
- Du kennst typische Schweizer Interview-Fragen und wie man antwortet
- Du kannst Stärken/Schwächen, Gehaltsvorstellungen, Motivationsfragen coachen

Schweizer Arbeitszeugnisse:
- Du kennst den Zeugnis-Code: "stets zu unserer vollsten Zufriedenheit" = sehr gut, "zu unserer vollen Zufriedenheit" = gut, "zu unserer Zufriedenheit" = genügend
- Du kannst versteckte negative Formulierungen erkennen

Karriereplanung:
- Du kannst 30-60-90-Tage-Pläne erstellen
- Du kennst Netzwerk-Strategien, Cold-Outreach-Taktiken
- Du kennst Weiterbildungsmöglichkeiten in der Schweiz (CAS, MAS, MBA, Berufsprüfung, eidg. Diplom)

Schule & Ausbildung:
- Du kennst das Schweizer Bildungssystem (Berufslehre EFZ/EBA, Gymnasium, FH, Uni, ETH)
- Du kannst Lehrstellen-Bewerbungen und Motivationsschreiben für Jugendliche schreiben
- Du kannst Lernpläne, Zusammenfassungen und Prüfungsstrategien erstellen

Produktivität & Kommunikation:
- Du kannst professionelle E-Mails, Meeting-Protokolle schreiben
- Du übersetzt Texte professionell in DE/EN/FR/IT
- Du erstellst strukturierte Excel-Vorlagen und PowerPoint-Präsentationen

STELLIFY-TOOLS (empfehle passende Tools mit ihrem Namen):
✍️ Bewerbungen, 💼 LinkedIn Optimierung, 🤖 ATS-Simulation, 📜 Zeugnis-Analyse, 🎯 Job-Matching, 🎤 Interview-Coach, 📊 Excel-Generator, 📽️ PowerPoint-Maker, 💰 Gehaltsverhandlung, 🤝 Networking-Nachricht, 📤 Kündigung schreiben, 🗓️ 30-60-90-Tage-Plan, 🏆 Referenzschreiben, 📚 Lernplan, 📝 Zusammenfassung, 🎓 Lehrstelle, ✉️ E-Mail, 📋 Protokoll, 🌍 Übersetzer

VERHALTEN:
- Antworte in der Sprache des Nutzers (Standard: Deutsch/Schweizerdeutsch-freundlich)
- Gib konkrete, umsetzbare Antworten – nicht nur allgemeine Tipps
- Wenn du etwas schreibst (z.B. ein Satz für eine Bewerbung), schreib ihn direkt aus
- Empfehle passende Stellify-Tools wenn sinnvoll, aber zwinge nichts auf
- Sei warm, direkt, professionell – wie ein erfahrener Karriere-Coach
- Preis: Gratis (1× Bewerbung/Monat) oder Pro CHF 19.90/Mo`;

    const TOOL_MAP2 = {
      "bewerbung":["app"],"bewerbungen":["app"],"linkedin":["linkedin"],"ats":["ats"],
      "zeugnis":["zeugnis"],"job-matching":["jobmatch"],"interview":["coach"],
      "excel":["excel"],"powerpoint":["pptx"],"gehalt":["gehalt"],
      "networking":["networking"],"kündigung":["kuendigung"],"30-60-90":["plan306090"],
      "referenz":["referenz"],"lernplan":["lernplan"],"lehrstelle":["lehrstelle"],
      "e-mail":["email"],"protokoll":["protokoll"],"übersetzer":["uebersetzer"],
      "gehaltsrechner":["gehaltsrechner"],"lohn":["gehaltsrechner"],"salary":["gehaltsrechner"],
      "tracker":["tracker"],"tracking":["tracker"],"verfolgen":["tracker"],
      "lipost":["lipost"],"linkedin post":["lipost"],"post":["lipost"],
    };

    function ChatPage() {
      const [chatMsgs, setChatMsgs] = useState([{r:"ai",t:L2(
        "Hallo! Ich bin Stella 👋 Deine KI-Karriere-Assistentin von Stellify. Wie kann ich dir heute helfen?",
        "Hello! I'm Stella 👋 Your AI career assistant from Stellify. How can I help you today?",
        "Bonjour! Je suis Stella 👋 Comment puis-je vous aider aujourd'hui?",
        "Ciao! Sono Stella 👋 Come posso aiutarti oggi?"
      )}]);
      const [chatIn, setChatIn]       = useState("");
      const [chatLoad, setChatLoad]   = useState(false);
      const [localUsage, setLocalUsage] = useState(chatUsage2);
      const endRef = useRef(null);
      useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[chatMsgs]);

      const localCanChat = pro || localUsage < C.CHAT_FREE_LIMIT;

      const renderMsg2 = (text) => {
        let remaining = text;
        Object.keys(TOOL_MAP2).forEach(key=>{
          remaining = remaining.replace(new RegExp(key,"gi"),`<TOOL:${TOOL_MAP2[key][0]}:${key}>`);
        });
        return remaining.split(/(<TOOL:[^>]+>)/).map((seg,i)=>{
          const m=seg.match(/^<TOOL:([^:]+):(.+)>$/);
          if(m) return <button key={i} onClick={()=>navTo(m[1])}
            style={{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(16,185,129,.15)",border:"1px solid rgba(16,185,129,.3)",borderRadius:8,padding:"2px 10px",fontSize:13,fontWeight:700,color:"var(--em)",cursor:"pointer",margin:"2px 3px"}}>
            {m[2]} →</button>;
          return <span key={i}>{seg}</span>;
        });
      };

      const send2 = async (msg) => {
        const txt = (msg||chatIn).trim();
        if(!txt||chatLoad||!localCanChat) return;
        setChatIn("");
        const newMsgs = [...chatMsgs, {r:"u", t:txt}];
        setChatMsgs(newMsgs);
        setChatLoad(true);
        if(!pro){ incChat(); setLocalUsage(u=>u+1); }
        try {
          const apiMsgs = [];
          for(const m of newMsgs) {
            const role = m.r==="u" ? "user" : "assistant";
            if(apiMsgs.length > 0 && apiMsgs[apiMsgs.length-1].role === role) continue;
            apiMsgs.push({role, content: m.t});
          }
          while(apiMsgs.length && apiMsgs[0].role !== "user") apiMsgs.shift();
          const finalMsgs = apiMsgs.slice(-10);

          const res = await fetch(GROQ_URL, {
            method: "POST",
            headers: groqHeaders(),
            body: JSON.stringify({
              model: C.MODEL_FAST,
              max_tokens: 600,
              messages: [{role:"system",content:SYSTEM2}, ...finalMsgs]
            })
          });
          const data = await res.json();
          if(!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
          const reply = data.choices?.[0]?.message?.content || "Bitte nochmals versuchen.";
          setChatMsgs(m=>[...m, {r:"ai", t:reply}]);
        } catch(e) {
          setChatMsgs(m=>[...m, {r:"ai", t:`⚠️ ${e.message}`}]);
        } finally {
          setChatLoad(false);
        }
      };

      return (<>{<style>{FONTS+CSS}</style>}
        <div style={{height:"100dvh",display:"flex",flexDirection:"column",background:"var(--dk)",overflow:"hidden"}}>
          {/* Top Nav */}
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:"1px solid rgba(255,255,255,.07)",background:"var(--dk2)",flexShrink:0}}>
            <button onClick={()=>navTo("landing")} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,padding:"7px 14px",fontSize:13,color:"rgba(255,255,255,.6)",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              ← {L2("Zurück","Back","Retour","Indietro")}
            </button>
            <div style={{flex:1,display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}>
              <div style={{width:32,height:32,background:"var(--em)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🤖</div>
              <div>
                <div style={{fontFamily:"var(--hd)",fontSize:15,fontWeight:800,color:"white"}}>Stella</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.35)"}}>{L2("KI-Karriere-Assistentin","AI Career Assistant","Assistante carrière IA","Assistente carriera IA")} · <span style={{color:"#22c55e"}}>●</span> Online</div>
              </div>
            </div>
            <div style={{fontSize:12,color:pro?"var(--em)":"rgba(255,255,255,.35)",fontWeight:600,minWidth:60,textAlign:"right"}}>
              {pro ? "Pro ∞" : `${Math.max(0,C.CHAT_FREE_LIMIT-localUsage)}/${C.CHAT_FREE_LIMIT}`}
            </div>
          </div>

          {/* Messages Area */}
          <div style={{flex:1,overflowY:"auto",padding:"24px 16px",display:"flex",flexDirection:"column",gap:20,maxWidth:780,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>
            {chatMsgs.map((m,i)=>(
              <div key={i} style={{display:"flex",gap:12,flexDirection:m.r==="u"?"row-reverse":"row",alignItems:"flex-end"}}>
                <div style={{width:34,height:34,borderRadius:"50%",background:m.r==="u"?"rgba(16,185,129,.25)":"rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>
                  {m.r==="u"?"👤":"🤖"}
                </div>
                <div style={{maxWidth:"72%",background:m.r==="u"?"rgba(16,185,129,.18)":"rgba(255,255,255,.05)",border:`1px solid ${m.r==="u"?"rgba(16,185,129,.3)":"rgba(255,255,255,.08)"}`,borderRadius:m.r==="u"?"20px 20px 4px 20px":"20px 20px 20px 4px",padding:"12px 16px",fontSize:14,color:m.r==="u"?"rgba(255,255,255,.9)":"rgba(255,255,255,.82)",lineHeight:1.7}}>
                  {m.r==="ai"?renderMsg2(m.t):m.t}
                </div>
              </div>
            ))}
            {chatLoad&&<div style={{display:"flex",gap:12,alignItems:"flex-end"}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:"rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🤖</div>
              <div style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",borderRadius:"20px 20px 20px 4px",padding:"14px 18px",display:"flex",gap:5,alignItems:"center"}}>
                {[0,1,2].map(j=><div key={j} style={{width:7,height:7,borderRadius:"50%",background:"var(--em)",animation:`pulse 1.2s ease-in-out ${j*0.2}s infinite`}}/>)}
              </div>
            </div>}
            <div ref={endRef}/>
          </div>

          {/* Limit Banner */}
          {!localCanChat&&<div style={{background:"rgba(245,158,11,.1)",borderTop:"1px solid rgba(245,158,11,.2)",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexShrink:0}}>
            <div style={{fontSize:13,color:"rgba(245,158,11,.8)"}}>{L2("10 Gratis-Nachrichten aufgebraucht","10 free messages used","10 messages gratuits utilisés","10 messaggi gratuiti esauriti")}</div>
            <button onClick={()=>setPw(true)} style={{background:"var(--am)",color:"white",border:"none",borderRadius:10,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
              {L2("Pro freischalten →","Unlock Pro →","Activer Pro →","Sblocca Pro →")}
            </button>
          </div>}

          {/* Input Area */}
          <div style={{borderTop:"1px solid rgba(255,255,255,.07)",padding:"16px 20px",background:"var(--dk2)",flexShrink:0}}>
            <div style={{maxWidth:780,margin:"0 auto",display:"flex",gap:10,alignItems:"flex-end"}}>
              <div style={{flex:1,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:16,padding:"12px 16px",display:"flex",alignItems:"flex-end",gap:10}}>
                <textarea value={chatIn} onChange={e=>setChatIn(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!chatLoad&&localCanChat){e.preventDefault();send2();}}}
                  placeholder={localCanChat ? L2("Schreib eine Nachricht…","Write a message…","Écrire un message…","Scrivi un messaggio…") : L2("Pro freischalten für mehr Nachrichten…","Unlock Pro for more messages…","Activer Pro pour plus…","Sblocca Pro per di più…")}
                  disabled={!localCanChat||chatLoad}
                  style={{flex:1,background:"none",border:"none",color:"white",fontSize:14,resize:"none",outline:"none",minHeight:24,maxHeight:120,lineHeight:1.6}}
                  rows={1}/>
              </div>
              <button onClick={()=>send2()} disabled={!chatIn.trim()||chatLoad||!localCanChat}
                style={{width:46,height:46,borderRadius:14,background:chatIn.trim()&&localCanChat?"var(--em)":"rgba(255,255,255,.08)",border:"none",cursor:chatIn.trim()&&localCanChat?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,transition:"all .2s"}}>
                {chatLoad?"⏳":"➤"}
              </button>
            </div>
            <div style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,.18)",marginTop:8}}>{L2("Stella kann Fehler machen. Wichtige Entscheidungen bitte selbst prüfen.","Stella can make mistakes. Please verify important decisions yourself.","Stella peut faire des erreurs. Vérifiez les décisions importantes.","Stella può fare errori. Verifica le decisioni importanti.")}</div>
          </div>
        </div>
        <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.3);opacity:1}}`}</style>
      </>);
    }
    return <ChatPage/>;
  }

  // ══════════════════ LEGAL ══════════════════
  const LD=()=>new Date().toLocaleDateString("de-CH",{month:"long",year:"numeric"});
  const LS=({ch})=><>{<style>{FONTS+CSS}</style>}<Nav/><div className="legal">{ch}</div><Footer/></>;
  if(page==="agb") return <LS ch={<>
    <h1>AGB / CGV / CGC / T&C</h1><div className="legal-d">Stand: {LD()} · {C.domain}</div>
    <h2>1. Geltungsbereich</h2><p>{C.name} ({C.domain}) wird betrieben von {C.owner}, {C.address}. Mit der Nutzung akzeptierst du diese AGB.</p>
    <h2>2. Leistungen</h2><p>{C.name} ist ein KI-gestützter All-in-One Career & Produktivitäts-Copilot mit 20+ Tools, u.a.: Bewerbungsgenerator, LinkedIn-Optimierung, ATS-Simulation, Zeugnis-Analyse, Job-Matching, Interview-Coach, Excel-Generator, PowerPoint-Maker, Gehaltsverhandlungs-Coach, Networking-Nachrichten, Kündigung, 30-60-90-Tage-Plan, Referenzschreiben, Lehrstellen-Bewerbung, Lernplan, Zusammenfassung, E-Mail-Assistent, Meeting-Protokoll, Übersetzer. Es wird kein Erfolg garantiert.</p>
    <h2>3. Abonnement & Zahlung</h2><p>Gratis: 1 Bewerbungsgenerierung/Monat. Pro: CHF 19.90/Monat (monatlich kündbar) oder CHF 14.90/Monat (jährlich = CHF 226.80/Jahr). Pro enthält: Unbegrenzte Bewerbungen, LinkedIn-Optimierung, ATS-Simulation, Zeugnis-Analyse, Job-Matching, Interview-Coach, Excel-Generator, PowerPoint-Maker. Zahlung via Stripe (Twint, Visa, Mastercard, Amex, PayPal, Apple Pay, Google Pay, SEPA, Klarna). Automatische Verlängerung. Kündigung jederzeit per E-Mail.</p>
    <h2>4. Haftung</h2><p>Keine Haftung für Qualität generierter Inhalte, Vollständigkeit der KI-Analysen oder indirekte Schäden.</p>
    <h2>5. Recht & Gerichtsstand</h2><p>Schweizer Recht. Gerichtsstand: Zürich. Kontakt: <a href={`mailto:${C.email}`}>{C.email}</a></p>
  </>}/>;
  if(page==="datenschutz") return <LS ch={<>
    <h1>Datenschutz / Privacy</h1><div className="legal-d">DSG (CH) · DSGVO (EU) · Stand: {LD()}</div>
    <h2>Verantwortlich</h2><p>{C.owner}, {C.address} · <a href={`mailto:${C.email}`}>{C.email}</a></p>
    <h2>Erhobene Daten</h2><ul><li>Eingabedaten (Lebenslauf, Zeugnisse, Profildaten) – werden nicht dauerhaft gespeichert</li><li>Nutzungsstatistiken: IP-Adresse (anonymisiert, 30 Tage)</li><li>Zahlungsdaten: ausschliesslich via Stripe (PCI-DSS-konform)</li></ul>
    <h2>KI-Verarbeitung</h2><p>Eingaben werden zur Verarbeitung an Anthropic (anthropic.com) übermittelt. Anthropic verarbeitet keine Daten für eigene Zwecke.</p>
    <h2>Drittanbieter</h2><p>Stripe (stripe.com/privacy) · Anthropic (anthropic.com/privacy)</p>
    <h2>Deine Rechte</h2><p>Auskunft, Berichtigung, Löschung jederzeit: <a href={`mailto:${C.email}`}>{C.email}</a></p>
    <h2>Sicherheit</h2><p>HTTPS/TLS. Keine Marketing-Cookies. Kein Verkauf von Daten.</p>
  </>}/>;
  if(page==="impressum") return <LS ch={<>
    <h1>Impressum</h1><div className="legal-d">Art. 12 DSG</div>
    <h2>Betreiber</h2>
    <p><strong>JTSP</strong><br/>{C.address}<br/><a href={`mailto:${C.email}`}>{C.email}</a><br/>{C.domain}</p>
    <h2>Erfinder & Gründer</h2>
    <p><strong>JTSP</strong> – Erfinder und Gründer von {C.name}. Idee, Konzept und Vision für den ersten vollständigen AI Career & Produktivitäts-Copilot der Schweiz.</p>
    <h2>Datenschutzbeauftragter</h2>
    <p>Bei Datenschutzanfragen: <a href={`mailto:${C.email}`}>{C.email}</a></p>
    <h2>Haftungsausschluss</h2><p>Schweizer Recht · Gerichtsstand: Zürich</p>
  </>}/>;
  // ══════════════════ BEWERBUNGS-TRACKER ══════════════════
  if(page==="tracker") return(<>{<style>{FONTS+CSS}</style>}{pw&&<PW/>}
    {authModals}
    {showProfiles&&<ProfileManager lang={lang} authSession={authSession} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    <ChatBot lang={lang} pro={pro} setPw={setPw} navTo={navTo} authSession={authSession} onAuthOpen={()=>{setAuthMode("login");setShowAuth(true);}}/>
    <Nav dark/>
    <BewerbungsTracker lang={lang} pro={pro} setPw={setPw} navTo={navTo}/>
    <Footer/>
  </>);

  // ══════════════════ GENERIC TOOLS ROUTING ══════════════════
  const activeTool = GENERIC_TOOLS.find(g => g.id === page);
  if (activeTool) return (
    <>{<style>{FONTS+CSS}</style>}{pw&&<PW/>}
      <Nav dark/>
      <GenericToolPage tool={activeTool} lang={lang} pro={pro} setPw={setPw} setPage={setPage} yearly={yearly} C={C} proUsage={proUsage} setProUsage={setProUsage}/>
      <Footer/>
    </>
  );

  // Einziger Cookie-Banner auf App-Ebene
  return (<>
    {/* Render der aktuellen Seite wird oben zurückgegeben – dieser Code ist nie erreichbar */}
  </>);
}
