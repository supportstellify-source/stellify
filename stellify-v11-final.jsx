import React, { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════
//  ⚙️  KONFIGURATION
// ═══════════════════════════════════════════
const C = {
  name: "Stellify",
  tagline: "Dein nächster Job. KI-schnell.",
  domain: "stellify.ch",
  email: "support@stellify.ch",
  address: "6300 Zug, Schweiz",
  owner: "JTSP",
  stripeMonthly: "https://buy.stripe.com/cNi14m58gbdve0MbaZ2B202",
  stripeYearly:  "https://buy.stripe.com/8x2cN4asAchzg8U92R2B205",
  priceM: "19.90",
  priceY: "14.90",
  FREE_LIMIT: 1,
  PRO_LIMIT: 100, // 100 Erstellungen pro Woche (Reset: Montag 07:00)
  CHAT_FREE_LIMIT: 25,

  ULTIMATE_LIMIT: 9999999,  // effektiv unbegrenzt
  stripeUltimate: "https://buy.stripe.com/aFafZg9ow81jbSEgvj2B206",
  stripeUltimateYearly: "https://buy.stripe.com/14A9ASfMU95nbSEdj72B203",

  priceUltimate: "49.90",
  priceUltimateYearly: "39.90",

  ADMIN_EMAIL: "admin@stellify.ch",
  ADMIN_PW: "Stellify2025!",
  // ── GROQ CONFIG ──────────────────────────────
  // GROQ_KEY wird serverseitig in api/ai.js verwaltet
  MODEL_FAST: "llama-3.1-8b-instant",      // Schnell & günstig
  MODEL_FULL: "llama-3.3-70b-versatile",   // Smart, für Bewerbungen etc.
  REFERRAL_DISCOUNT: 20,   // % Rabatt für geworbene Freunde
  REFERRAL_REWARD: 1,      // Monate gratis für Werber
  // ─────────────────────────────────────────────
  FREE_MAX_TOKENS: 500,
};

const GROQ_URL = "/api/ai";
const groqHeaders = () => ({ "Content-Type": "application/json" });

const getWeekKey = () => {
  const d = new Date();
  // Letzter Montag berechnen
  const day = d.getDay(); // 0=So, 1=Mo...
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d); monday.setDate(d.getDate() + diff);
  return monday.toISOString().slice(0,10); // "2026-03-16"
};
const getU = () => {
  try {
    const d = JSON.parse(localStorage.getItem("stf_u")||"{}");
    const m = new Date().toISOString().slice(0,7);   // monatlicher Reset für Free
    const w = getWeekKey();                           // wöchentlicher Reset für Pro
    const resetMonth = d.month !== m;
    const resetDay   = d.day   !== new Date().toISOString().slice(0,10);
    const resetWeek = d.week !== w;
    if(resetMonth) return {month:m, week:w, count:0, proCount:0, chatCount:0};
    if(resetWeek)  return {...d, week:w, proCount:0}; // Pro-Limit weekly reset (Montag 07:00)
    return d;
  } catch { return {month:"", week:"", count:0, proCount:0, chatCount:0}; }
};
const incU   = () => { const u=getU(); u.count++; localStorage.setItem("stf_u",JSON.stringify(u)); };
const incPro = () => { const u=getU(); u.proCount=(u.proCount||0)+1; localStorage.setItem("stf_u",JSON.stringify(u)); };
const incChat= () => { const u=getU(); u.chatCount=(u.chatCount||0)+1; localStorage.setItem("stf_u",JSON.stringify(u)); };
const getChatCount = () => getU().chatCount||0;
const getProCount = () => getU().proCount||0;
const isPro  = () => { try { return localStorage.getItem("stf_pro")==="true"; } catch { return false; }};
const actPro = () => { try { localStorage.setItem("stf_pro","true"); } catch {}};

// ── REFERRAL ──────────────────────────────────────────────
const genReferralCode = (email) => {
  // Einfacher deterministischer Code aus E-Mail
  let h = 0;
  for(let i=0; i<email.length; i++) h = ((h<<5)-h)+email.charCodeAt(i);
  return "STF" + Math.abs(h).toString(36).toUpperCase().slice(0,6);
};
const getReferralData = () => { try { return JSON.parse(localStorage.getItem("stf_referral")||"{}"); } catch { return {}; }};
const applyReferral = (code) => {
  const data = getReferralData();
  if(data.applied) return {ok:false, msg:"Bereits verwendet."};
  localStorage.setItem("stf_referral", JSON.stringify({applied:true, code, discount:C.REFERRAL_DISCOUNT, appliedAt:Date.now()}));
  return {ok:true};
};

// ── AUTH SYSTEM ─────────────────────────────────────────────
const AUTH_KEY = "stf_auth_users"; // [{email,pw,plan,seats,members,activatedAt}]
const SESSION_KEY = "stf_session"; // {email,plan}

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
function authRegister(email, pw, plan) {
  const users = authGetUsers();
  if(users.find(u=>u.email.toLowerCase()===email.toLowerCase())) return {ok:false,err:"E-Mail bereits registriert."};
  const user = {email:email.toLowerCase(), pw, plan:plan||"free", seats:plan==="ultimate"?9999999:1, members:[email.toLowerCase()], activatedAt:Date.now()};
  users.push(user);
  authSaveUsers(users);
  authSetSession({email:user.email, plan:user.plan});
  return {ok:true, user};
}
function authLogin(email, pw) {
  const users = authGetUsers();
  const user = users.find(u=>u.email.toLowerCase()===email.toLowerCase() && u.pw===pw);
  if(!user) return {ok:false,err:"E-Mail oder Passwort falsch."};
  authSetSession({email:user.email, plan:user.plan});
  return {ok:true, user};
}
function authUpgradePlan(email, plan) {
  const users = authGetUsers();
  const idx = users.findIndex(u=>u.email.toLowerCase()===email.toLowerCase());
  if(idx>=0){
    users[idx].plan = plan;
    if(plan==="ultimate") users[idx].seats = 9999999;
    authSaveUsers(users);
    authSetSession({email:users[idx].email, plan});
    return users[idx];
  }
  // Neuer User via Stripe
  const user = {email:email.toLowerCase(), pw:"", plan, seats:plan==="ultimate"?9999999:1, members:[email.toLowerCase()], activatedAt:Date.now()};
  users.push(user);
  authSaveUsers(users);
  authSetSession({email:user.email, plan});
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
function authIsAdmin(email,pw) {
  return email.toLowerCase()===C.ADMIN_EMAIL.toLowerCase() && pw===C.ADMIN_PW;
}
function authRequestReset(email) {
  const users = authGetUsers();
  const user = users.find(u=>u.email.toLowerCase()===email.toLowerCase());
  if(!user) return {ok:false, err:"E-Mail nicht gefunden."};
  // Reset-Token generieren (vereinfacht – in Produktion via echter E-Mail)
  const token = Math.random().toString(36).slice(2,10).toUpperCase();
  const resets = JSON.parse(localStorage.getItem("stf_resets")||"{}");
  resets[token] = {email:user.email, expires:Date.now()+3600000};
  localStorage.setItem("stf_resets", JSON.stringify(resets));
  // In Produktion: E-Mail senden. Hier: Token im Alert anzeigen
  return {ok:true, token, msg:`Dein Reset-Code: ${token} (gültig 1 Stunde)`};
}
function authResetPassword(token, newPw) {
  const resets = JSON.parse(localStorage.getItem("stf_resets")||"{}");
  const reset = resets[token];
  if(!reset) return {ok:false, err:"Ungültiger oder abgelaufener Code."};
  if(Date.now() > reset.expires) return {ok:false, err:"Code abgelaufen. Bitte neu anfordern."};
  const users = authGetUsers();
  const idx = users.findIndex(u=>u.email===reset.email);
  if(idx<0) return {ok:false, err:"Nutzer nicht gefunden."};
  users[idx].pw = newPw;
  authSaveUsers(users);
  delete resets[token];
  localStorage.setItem("stf_resets", JSON.stringify(resets));
  return {ok:true};
}

// 🧠 MODEL ROUTING
const HAIKU_TOOLS = ["free","email","protokoll","uebersetzer","networking","kuendigung","lernplan","zusammenfassung","gehalt","plan306090","referenz","lehrstelle"];
const getModel = (toolId) => HAIKU_TOOLS.includes(toolId) ? C.MODEL_FAST : C.MODEL_FULL;
const getTokens = (toolId, stream=false) => toolId==="free" ? C.FREE_MAX_TOKENS : HAIKU_TOOLS.includes(toolId) ? (stream?600:500) : (stream?1400:1200);

// Groq: system als erste Message mit role:"system"
function buildMessages(prompt, system) {
  const msgs = [];
  if(system) msgs.push({role:"system", content:system});
  if(typeof prompt === "string") msgs.push({role:"user", content:prompt});
  else msgs.push(...prompt); // Array von Messages direkt
  return msgs;
}

async function callAI(prompt, system, toolId="") {
  let r;
  try {
    r = await fetch(GROQ_URL, {
      method:"POST",
      headers: groqHeaders(),
      body: JSON.stringify({
        model: getModel(toolId),
        max_tokens: getTokens(toolId),
        messages: buildMessages(prompt, system)
      })
    });
  } catch(e) { throw new Error("Netzwerkfehler – bitte Internetverbindung prüfen."); }
  if(r.status===401) throw new Error("API-Schlüssel ungültig – Groq Key prüfen.");
  if(r.status===429) throw new Error("Zu viele Anfragen – bitte kurz warten.");
  if(r.status===503||r.status===529) throw new Error("KI überlastet – in 30 Sek. nochmals versuchen.");
  const d = await r.json();
  if(d.error) throw new Error(d.error.message);
  return d.choices?.[0]?.message?.content || "";
}

async function streamAI(prompt, onChunk, system, toolId="") {
  let resp;
  try {
    resp = await fetch(GROQ_URL, {
      method:"POST",
      headers: groqHeaders(),
      body: JSON.stringify({
        model: getModel(toolId),
        max_tokens: getTokens(toolId, true),
        stream: true,
        messages: buildMessages(prompt, system)
      })
    });
  } catch(e) { throw new Error("Netzwerkfehler – bitte Internetverbindung prüfen."); }
  if(!resp.ok) {
    let msg = "API-Fehler";
    try { const e=await resp.json(); msg=e.error?.message||msg; } catch{}
    if(resp.status===429) msg="Zu viele Anfragen – bitte 30 Sekunden warten und nochmals versuchen.";
    if(resp.status===503||resp.status===529) msg="KI momentan überlastet – bitte in einer Minute nochmals versuchen.";
    if(resp.status===401) msg="API-Schlüssel ungültig.";
    throw new Error(msg);
  }
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
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');`;
const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--ink:#1A1A18;--bg:#FAFAF8;--em:#2563EB;--em2:#1D4ED8;--em3:rgba(37,99,235,.10);--am:#f59e0b;--am2:rgba(245,158,11,.14);--bl:#2563EB;--bl2:rgba(37,99,235,.12);--mu:#5C5C58;--bo:rgba(26,26,24,.09);--bos:rgba(26,26,24,.05);--dk:#0F0F0E;--dk2:#141412;--dk3:#1A1A18;--hd:'Instrument Serif',Georgia,serif;--bd:'DM Sans',system-ui,sans-serif;--r:12px;--r2:18px}
/* ── APPLE-STYLE ENHANCEMENTS ──────────────────── */
@supports(backdrop-filter:blur(0)){
  .glass{background:rgba(255,255,255,.08)!important;backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);border:1px solid rgba(255,255,255,.12)!important}
  .glass-dk{background:rgba(15,15,26,.72)!important;backdrop-filter:blur(24px) saturate(160%);-webkit-backdrop-filter:blur(24px) saturate(160%);border:1px solid rgba(255,255,255,.08)!important}
}
/* Smooth spring transitions */
.btn,.tool-card,.pc,.card{transition:transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .2s ease,border-color .2s ease,background .2s ease!important}.card:hover{box-shadow:0 8px 24px rgba(0,0,0,.1);border-color:var(--bo)}
.btn:hover,.tool-card:hover{transform:translateY(-2px)!important;box-shadow:0 8px 24px rgba(0,0,0,.15)!important}
.btn:active,.tool-card:active{transform:translateY(0) scale(.97)!important;transition-duration:.08s!important}
/* Bubble / pill badges */
.apple-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:.2px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.apple-pill.green{background:rgba(16,185,129,.18);border:1px solid rgba(16,185,129,.3);color:#10b981}
.apple-pill.amber{background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.28);color:#f59e0b}
.apple-pill.blue{background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.28);color:#60a5fa}
.apple-pill.white{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);color:rgba(255,255,255,.8)}
/* Floating card depth */
.fc,.sc,.card{box-shadow:0 2px 12px rgba(0,0,0,.08),0 0 0 1px var(--bos)}
.fc:hover,.sc:hover{box-shadow:0 8px 32px rgba(0,0,0,.14),0 0 0 1px var(--bo);transform:translateY(-3px)}
/* Gradient orbs / background bubbles */
.orb{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none;opacity:.35;animation:orbFloat 8s ease-in-out infinite alternate;will-change:transform}
@keyframes orbFloat{from{transform:translate3d(0,0,0)}to{transform:translate3d(20px,-30px,0)}}
/* Frosted hero */
.hero-glass{background:linear-gradient(135deg,rgba(16,185,129,.06) 0%,rgba(0,0,0,0) 60%)}
/* Spring scale on interactive */
.spring{transition:transform .22s cubic-bezier(.34,1.56,.64,1)!important}
.spring:hover{transform:scale(1.03)!important}
.spring:active{transform:scale(.96)!important}
/* Scrollbar Apple-style */
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(37,99,235,.25);border-radius:99px}
::-webkit-scrollbar-thumb:hover{background:rgba(37,99,235,.45)}
/* SF-style focus ring */
*:focus-visible{outline:2px solid var(--em);outline-offset:3px;border-radius:6px}
/* Smooth page transitions */
.page-enter{animation:pageIn .28s cubic-bezier(.25,.46,.45,.94) both}
@keyframes pageIn{from{opacity:0;transform:translate3d(0,12px,0)}to{opacity:1;transform:translate3d(0,0,0)}}
html{scroll-behavior:smooth}body{background:var(--bg);color:var(--ink);font-family:var(--bd);font-weight:300;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeSpeed}
*{box-sizing:border-box}
section{contain:layout style paint}
.modal-layer{contain:layout style}
img,svg{display:block}
button{cursor:pointer;-webkit-tap-highlight-color:transparent}
input,textarea,select{-webkit-appearance:none}
::selection{background:rgba(16,185,129,.25);color:inherit}
::-moz-selection{background:rgba(16,185,129,.25);color:inherit}
/* NAV */
nav{position:sticky;top:0;z-index:200;background:rgba(242,243,247,.9);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);border-bottom:1px solid rgba(11,11,18,.07);box-shadow:0 1px 0 rgba(0,0,0,.05)}
.ni{max-width:1200px;margin:0 auto;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;gap:10px}
.logo{font-family:var(--hd);font-size:21px;font-weight:800;cursor:pointer;letter-spacing:-.5px;display:flex;align-items:center;color:var(--ink)}
.logo-dot{width:8px;height:8px;background:var(--em);border-radius:50%;margin-left:2px;margin-bottom:8px;flex-shrink:0}
.pb{font-size:10px;font-weight:700;background:linear-gradient(135deg,var(--em),var(--em2));color:white;padding:2px 8px;border-radius:20px;margin-left:8px;text-transform:uppercase;letter-spacing:.5px}
.nl{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.nl-desk{display:flex}
.ham{display:none!important}
@media(max-width:680px){.nl-desk{display:none!important}.ham{display:flex!important}}
.nlk{font-size:13px;color:var(--mu);cursor:pointer;background:none;border:none;font-family:var(--bd);transition:color .18s;white-space:nowrap;padding:0}.nlk:hover{color:var(--ink)}
.nc{background:linear-gradient(135deg,#10b981,#059669);color:white;padding:9px 18px;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:var(--bd);transition:all .2s;box-shadow:0 2px 10px rgba(16,185,129,.3);transition:transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .18s}.nc:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(16,185,129,.45)}.nc:active{transform:scale(.96)}.nc:hover{background:var(--em)}
.ls{display:flex;background:rgba(11,11,18,.06);border:1.5px solid rgba(11,11,18,.08);border-radius:12px;padding:4px;gap:3px}
.lb{padding:5px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:transparent;font-family:var(--bd);color:var(--mu);transition:all .18s;letter-spacing:.3px}.lb.on{background:white;color:var(--ink);box-shadow:0 2px 8px rgba(11,11,18,.12);font-weight:700}
/* HERO */
.hero{background:var(--dk);overflow:hidden;position:relative;padding:100px 0 88px}
.hbg{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 70% 80% at 80% 20%,rgba(16,185,129,.14) 0%,transparent 60%),radial-gradient(ellipse 50% 60% at 5% 90%,rgba(59,130,246,.07) 0%,transparent 60%)}
.hdots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.04) 1px,transparent 1px);background-size:32px 32px;pointer-events:none}
.con{max-width:1200px;margin:0 auto;padding:0 28px}.csm{max-width:820px;margin:0 auto;padding:0 28px}.page-wrap{animation:pageIn .3s cubic-bezier(.25,.46,.45,.94) both}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--em);background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.25);padding:6px 16px;border-radius:999px;margin-bottom:26px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 2px 12px rgba(16,185,129,.15)}
h1.hh{font-family:var(--hd);font-size:clamp(48px,7vw,88px);font-weight:800;line-height:.96;letter-spacing:-3.5px;color:white;margin-bottom:22px;max-width:960px;background:linear-gradient(135deg,#fff 60%,rgba(255,255,255,.7));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
h1.hh em{font-style:normal;color:var(--em)}
.hsub{font-size:18px;font-weight:300;color:rgba(255,255,255,.55);max-width:600px;line-height:1.72;margin-bottom:38px;letter-spacing:-.1px}
.hctas{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.hstats{margin-top:64px;display:flex;gap:40px;flex-wrap:wrap}
.stat-n{font-family:var(--hd);font-size:30px;font-weight:800;color:white;letter-spacing:-1px;line-height:1}.stat-l{font-size:12px;color:rgba(255,255,255,.36);margin-top:4px}.hstats>div{transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s ease}.hstats>div:hover{transform:translateY(-4px) scale(1.03);box-shadow:0 16px 40px rgba(0,0,0,.25)}
/* BUTTONS */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border-radius:10px;font-family:var(--bd);font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .2s;white-space:nowrap;text-decoration:none}
.b-em{background:linear-gradient(135deg,#10b981,#059669);color:white;box-shadow:0 2px 14px rgba(16,185,129,.32)}.b-em:hover{background:linear-gradient(135deg,#0ea572,#047857);box-shadow:0 8px 24px rgba(16,185,129,.48)}
.b-dk{background:var(--ink);color:white}.b-dk:hover{background:#18182e;transform:translateY(-2px)}
.b-bl{background:var(--bl);color:white}.b-bl:hover{background:#2563eb;transform:translateY(-2px);box-shadow:0 10px 28px rgba(59,130,246,.28)}
.b-out{background:transparent;color:white;border:1.5px solid rgba(255,255,255,.2)}.b-out:hover{border-color:rgba(255,255,255,.5);background:rgba(255,255,255,.05)}
.b-outd{background:transparent;color:var(--ink);border:1.5px solid var(--bo)}.b-outd:hover{border-color:var(--em);color:var(--em)}
.b-sm{padding:8px 16px;font-size:13px}.b-lg{padding:15px 34px;font-size:15px}.b-w{width:100%}
.btn:disabled{opacity:.35;cursor:not-allowed!important;transform:none!important;box-shadow:none!important}
/* SECTIONS */
.sec{padding:88px 0}.sec-dk{background:var(--dk)}.sec-dk2{background:var(--dk2)}.sec-w{background:white}.sec-bg{background:var(--bg)}
.sh{margin-bottom:50px}.shc{text-align:center}.shc .ss{margin:0 auto}
.seye{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--em);margin-bottom:16px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);padding:5px 14px;border-radius:999px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.st{font-family:var(--hd);font-size:clamp(32px,4vw,50px);font-weight:800;line-height:1.05;letter-spacing:-1.5px;margin-bottom:14px}
.sec-dk .st,.sec-dk2 .st{color:white}
.ss{font-size:16px;font-weight:300;line-height:1.75;color:var(--mu);max-width:560px}
.sec-dk .ss,.sec-dk2 .ss{color:rgba(255,255,255,.42)}
/* TOOLS GRID */
.tools-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.tool-card{padding:28px;border-radius:var(--r2);border:1.5px solid var(--bo);background:white;cursor:pointer;transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s ease,border-color .2s ease;position:relative;overflow:hidden;text-align:left;will-change:transform;-webkit-tap-highlight-color:transparent}.tool-card:hover{transform:translateY(-3px) scale(1.01);box-shadow:0 12px 32px rgba(0,0,0,.1);border-color:var(--em)}.tool-card:active{transform:scale(.97);transition-duration:.08s}
.tool-card::before{content:'';position:absolute;inset:0;opacity:0;transition:opacity .2s;background:linear-gradient(135deg,rgba(16,185,129,.04),transparent)}
.tool-card:hover{transform:translateY(-4px);box-shadow:0 14px 36px rgba(11,11,18,.1);border-color:rgba(16,185,129,.35)}.tool-card:hover::before{opacity:1}
.tool-card.bl:hover{border-color:rgba(59,130,246,.4)}.tool-card.am:hover{border-color:rgba(245,158,11,.4)}
.tc-ico{font-size:30px;margin-bottom:12px;transition:transform .22s cubic-bezier(.34,1.56,.64,1);display:inline-block}.tool-card:hover .tc-ico{transform:scale(1.18) translateY(-3px)}
.tc-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px}
.tc-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:.5px;flex-shrink:0;margin-top:2px}
.tc-em{background:var(--em3);color:var(--em2)}.tc-bl{background:var(--bl2);color:var(--bl)}.tc-am{background:var(--am2);color:#92400e}
.tc-t{font-family:var(--hd);font-size:17px;font-weight:700;margin-bottom:6px;color:var(--ink)}
.tc-p{font-size:13px;line-height:1.7;color:var(--mu)}
/* WHY VS */
.why-vs{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:40px}
.why-col{border-radius:var(--r2);padding:28px;border:1.5px solid var(--bo)}
.why-col.bad{background:#fff8f8;border-color:rgba(239,68,68,.15)}.why-col.good{background:rgba(16,185,129,.04);border-color:rgba(16,185,129,.2)}
.why-col h4{font-family:var(--hd);font-size:15px;font-weight:700;margin-bottom:13px}
.why-col li{font-size:13px;line-height:1.7;color:var(--mu);padding:6px 0;border-bottom:1px solid rgba(11,11,18,.06);display:flex;align-items:flex-start;gap:8px;list-style:none}.why-col li:last-child{border:none}
/* FEATURES */
.feat-row{display:grid;grid-template-columns:1.6fr 1fr 1fr;gap:14px;margin-bottom:14px}
@media(max-width:680px){.feat-row{grid-template-columns:1fr;gap:12px}.feat-row .feat-big{grid-row:span 1!important}}
/* 5-Karten Grid: 3+2 */
.g5-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:14px}
.g5-grid>*:last-child:nth-child(3n+1){grid-column:span 3}
@media(max-width:680px){.g5-grid{grid-template-columns:1fr 1fr}.g5-grid>*:last-child:nth-child(odd){grid-column:span 2}}
/* Mini-Tools: letzte einsame Karte voll-breit */
.mini-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:9px}
@media(max-width:680px){.mini-g{grid-template-columns:1fr 1fr}.mini-g>*:last-child:nth-child(odd){grid-column:span 2}}
.fc{padding:24px;background:white;border:1.5px solid var(--bo);border-radius:var(--r2);position:relative;transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s ease,border-color .2s;will-change:transform}.fc:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.08);border-color:var(--em)}.fc:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.08);border-color:var(--em)}
.fc:hover{border-color:var(--em);box-shadow:0 6px 28px rgba(16,185,129,.08);transform:translateY(-2px)}
.fc-ico{font-size:24px;margin-bottom:10px}.fc h4{font-family:var(--hd);font-size:15px;font-weight:700;margin-bottom:6px}.fc p{font-size:13px;line-height:1.7;color:var(--mu)}
.pp{position:absolute;top:13px;right:13px;font-size:10px;font-weight:700;background:linear-gradient(135deg,var(--em),var(--em2));color:white;padding:2px 8px;border-radius:20px}
.pp-am{background:linear-gradient(135deg,var(--am),#d97706)}
/* STEPS */
.srow{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;position:relative}
.srow::before{display:none}
.sc{padding:28px 24px;background:var(--dk3);border:1.5px solid rgba(255,255,255,.07);border-radius:var(--r2);transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s ease,border-color .2s,background .2s;will-change:transform}.sc:hover{transform:translateY(-3px);background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.16);box-shadow:0 12px 32px rgba(0,0,0,.2)}.sc:hover{transform:translateY(-3px);background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.15);box-shadow:0 12px 32px rgba(0,0,0,.2)}
.sn{width:48px;height:48px;background:rgba(16,185,129,.12);border:1.5px solid rgba(16,185,129,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--hd);font-size:16px;font-weight:800;color:var(--em);margin-bottom:16px}
.sc h3{font-family:var(--hd);font-size:17px;font-weight:700;color:white;margin-bottom:8px}.sc p{font-size:13px;line-height:1.75;color:rgba(255,255,255,.42)}
/* TESTI */
.tg{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.tc2{padding:26px;background:var(--dk3);border:1.5px solid rgba(255,255,255,.07);border-radius:var(--r2)}
.ts{color:var(--em);font-size:13px;margin-bottom:10px;letter-spacing:3px}.tq{font-size:14px;line-height:1.75;color:rgba(255,255,255,.7);margin-bottom:14px;font-style:italic}
.tn{font-size:13px;font-weight:600;color:white}.tr{font-size:12px;color:rgba(255,255,255,.3);margin-top:2px}
/* PRICING */
.btog{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:40px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:99px;padding:4px 8px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);width:fit-content;margin-left:auto;margin-right:auto}
.bto{font-size:14px;font-weight:500;color:rgba(255,255,255,.4);cursor:pointer;transition:color .18s}.bto.on{color:white}
.btsw{width:50px;height:27px;background:rgba(255,255,255,.1);border-radius:20px;cursor:pointer;position:relative;border:1.5px solid rgba(255,255,255,.14);transition:background .2s;flex-shrink:0}
.btsw.yr{background:var(--em)}.btt{position:absolute;top:3px;left:3px;width:17px;height:17px;background:white;border-radius:50%;transition:transform .2s}.btsw.yr .btt{transform:translateX(23px)}
.save-t{background:rgba(245,158,11,.15);color:var(--am);border:1px solid rgba(245,158,11,.3);font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px}
.pgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;max-width:1160px;margin:0 auto}
.pc{border-radius:var(--r2);padding:26px 22px;border:1.5px solid rgba(255,255,255,.08);background:var(--dk3);position:relative;transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s ease,border-color .2s ease}
.pc.hl{border-color:var(--em);background:rgba(16,185,129,.07);box-shadow:0 0 0 1px rgba(16,185,129,.15),0 16px 48px rgba(16,185,129,.12)}.pc.hl2{border-color:rgba(245,158,11,.3);background:rgba(245,158,11,.04)}
.bst{position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#10b981,#059669);color:white;font-size:11px;font-weight:700;padding:5px 16px;border-radius:999px;white-space:nowrap;box-shadow:0 4px 14px rgba(16,185,129,.4);letter-spacing:.3px}
.ppl{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:10px}
.ppl.em{color:var(--em)}.ppl.am{color:var(--am)}
.ppr{font-family:var(--hd);font-size:38px;font-weight:800;color:white;line-height:1;margin-bottom:4px;letter-spacing:-2px}
.ppr span{font-size:16px;font-weight:400;color:rgba(255,255,255,.3);font-family:var(--bd);letter-spacing:0}
.pper{font-size:12px;color:rgba(255,255,255,.3);margin-bottom:24px}
.pfl{list-style:none;margin-bottom:24px}
.pfl li{font-size:13px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:flex-start;gap:8px;color:rgba(255,255,255,.7);line-height:1.5}.pfl li:last-child{border:none}
.pfl li.off{color:rgba(255,255,255,.2)}.pck{color:var(--em);flex-shrink:0}.pcx{color:rgba(255,255,255,.18);flex-shrink:0}
.pay-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;margin-top:26px}
.pay-chip{padding:7px 14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:9px;font-size:13px;font-weight:500;color:rgba(255,255,255,.58)}
.vb{background:rgba(16,185,129,.06);border:1.5px solid rgba(16,185,129,.2);border-radius:var(--r2);padding:28px;margin:28px auto 0;max-width:860px;display:grid;grid-template-columns:1fr 1fr;gap:11px}
.vb h4{font-family:var(--hd);font-size:20px;font-weight:800;color:white;grid-column:1/-1;margin-bottom:4px}
.vp{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:rgba(255,255,255,.56);line-height:1.6}
/* CTA */
.cta-sec{background:linear-gradient(135deg,var(--dk),#0a1810);padding:92px 0;text-align:center;position:relative;overflow:hidden}
.cta-sec::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 60% 60% at 50% 50%,rgba(16,185,129,.1),transparent);pointer-events:none}
/* TOOL PAGES */
.page-hdr{padding:52px 28px 28px;text-align:center;background:var(--bg);border-bottom:1.5px solid var(--bo)}
.page-hdr.dk,.page-hdr.bl,.page-hdr.am,.page-hdr.vi{background:var(--bg)}
.page-hdr h1{font-family:var(--hd);font-size:32px;font-weight:400;color:var(--ink);margin-bottom:7px;letter-spacing:-1px}.page-hdr p{font-size:14px;color:var(--mu)}
.asteps{max-width:640px;margin:28px auto 0;display:flex;border-bottom:2px solid var(--bo)}
.as{flex:1;text-align:center;padding:10px 5px;font-size:12px;font-weight:600;color:var(--mu);transition:all .25s;border-radius:10px;-webkit-tap-highlight-color:transparent}.as.on:not(.complete){background:rgba(37,99,235,.06);border-radius:10px}.as:hover{background:rgba(37,99,235,.04);border-radius:10px}
.as.on{color:var(--em);border-bottom:2px solid var(--em);margin-bottom:-2px}.as.done{color:var(--mu)}
.abody{max-width:740px;margin:0 auto;padding:38px 28px 80px}
/* CARDS */
.card{background:white;border:1.5px solid var(--bo);border-radius:var(--r2);padding:32px;box-shadow:0 4px 20px rgba(11,11,18,.06)}
.ct{font-family:var(--hd);font-size:22px;font-weight:800;margin-bottom:4px;letter-spacing:-.5px}
.cs{font-size:13px;color:var(--mu);margin-bottom:20px;line-height:1.6}
.field{margin-bottom:14px}
.field label{display:block;font-size:10px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:var(--mu);margin-bottom:6px}
.field input,.field textarea,.field select{width:100%;padding:11px 14px;border:1.5px solid var(--bo);border-radius:12px;font-family:var(--bd);font-size:14px;font-weight:300;color:var(--ink);background:#fafafa;outline:none;transition:border-color .18s,box-shadow .18s,transform .15s;resize:none}.field input:focus,.field textarea:focus,.field select:focus{border-color:var(--em);box-shadow:0 0 0 3px rgba(16,185,129,.1);transform:translateY(-1px)}
.field input:focus,.field textarea:focus,.field select:focus{border-color:var(--em);background:white;box-shadow:0 0 0 3px rgba(16,185,129,.07)}
.field textarea{min-height:84px;line-height:1.65}
.fg2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.frow{display:flex;justify-content:space-between;align-items:center;margin-top:18px;gap:10px}
/* UPLOAD ZONE */
.upz{border:2px dashed rgba(16,185,129,.35);border-radius:14px;padding:26px;text-align:center;cursor:pointer;transition:all .2s;background:rgba(16,185,129,.03);margin-bottom:14px;position:relative}
.upz:hover,.upz.drag{border-color:var(--em);background:var(--em3)}
.upz input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.upz-ico{font-size:30px;margin-bottom:8px}.upz h4{font-family:var(--hd);font-size:14px;font-weight:700;margin-bottom:4px}.upz p{font-size:12px;color:var(--mu)}
.upz-ok{background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:9px 14px;font-size:13px;color:#15803d;margin-bottom:12px;display:flex;align-items:center;gap:7px}
/* STREAMING */
.spin{width:32px;height:32px;border:2px solid rgba(16,185,129,.2);border-top-color:var(--em);border-radius:50%;animation:sp .75s linear infinite;will-change:transform}
@keyframes sp{to{transform:rotate(360deg)}}
.cursor{display:inline-block;width:2px;height:1em;background:var(--em);margin-left:1px;animation:blink .8s step-end infinite;vertical-align:text-bottom;will-change:opacity}
.progress-bar{height:6px;border-radius:99px;background:linear-gradient(90deg,var(--em),#059669);transition:width .6s cubic-bezier(.34,1.56,.64,1);box-shadow:0 0 8px rgba(16,185,129,.4)}
.progress-track{height:6px;border-radius:99px;background:rgba(16,185,129,.12);overflow:hidden}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
.r-doc{background:#f8f9fc;border:1.5px solid var(--bo);border-radius:14px;padding:24px;font-size:14px;line-height:1.9;color:var(--ink);white-space:pre-wrap;max-height:460px;overflow-y:auto;font-family:var(--bd);min-height:80px;box-shadow:0 2px 8px rgba(0,0,0,.04) inset}
.r-doc::-webkit-scrollbar{width:4px}.r-doc::-webkit-scrollbar-thumb{background:rgba(16,185,129,.3);border-radius:4px}
.r-edit{background:white;border:1.5px solid var(--em);border-radius:12px;padding:22px;font-size:14px;line-height:1.9;color:var(--ink);width:100%;min-height:340px;outline:none;font-family:var(--bd);resize:vertical;box-shadow:0 0 0 3px rgba(16,185,129,.07)}
.r-bar{display:flex;gap:7px;justify-content:flex-end;margin-bottom:10px;flex-wrap:wrap}
.r-tabs{display:flex;border-bottom:2px solid var(--bo);margin-bottom:16px}
.r-tab{padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer;border:none;background:transparent;font-family:var(--bd);color:var(--mu);border-bottom:2px solid transparent;margin-bottom:-2px;transition:all .18s}.r-tab.on{color:var(--em);border-bottom-color:var(--em)}
/* STATUS BARS – Glassmorphism Progress Tracker */
.ubar{background:rgba(16,185,129,.04);border:1px solid rgba(16,185,129,.18);border-radius:14px;padding:12px 16px;margin-bottom:15px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:13px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 4px 24px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.04)}
.u-tr{position:relative;flex:1;min-width:80px;height:7px;background:rgba(255,255,255,.06);border-radius:99px;overflow:visible;cursor:pointer}
.u-tr::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#1a1a2e;border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.7);font-size:10px;font-weight:600;padding:5px 10px;border-radius:8px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .2s;z-index:9999}
.u-tr:hover::after{opacity:1}
.u-fi{height:100%;border-radius:99px;transition:width .5s ease-in-out;box-shadow:0 0 8px currentColor}
@keyframes barPulse{0%,100%{opacity:1}50%{opacity:.55}}
.ok{background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:10px 15px;font-size:13px;color:#15803d;margin-bottom:15px}
.err{background:#fff1f1;border:1px solid #fca5a5;border-radius:10px;padding:10px 15px;font-size:13px;color:#dc2626;margin-bottom:14px}
/* Free badge pill */
.free-pill{display:inline-flex;align-items:center;gap:7px;background:rgba(16,185,129,.12);border:1.5px solid rgba(16,185,129,.3);borderRadius:30px;padding:8px 18px;font-size:13px;font-weight:700;color:var(--em);cursor:pointer;transition:all .2s}
.free-pill:hover{background:rgba(16,185,129,.2);transform:translateY(-1px)}
/* MODAL PAYWALL */
.mbg{position:fixed;inset:0;background:rgba(7,7,14,.88);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px}
.mod{background:rgba(18,18,28,.96);animation:modalSpring .35s cubic-bezier(.34,1.56,.64,1) both;backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);border:1px solid rgba(255,255,255,.1);border-radius:28px;padding:44px;max-width:480px;width:100%;color:white;text-align:center;box-shadow:0 32px 80px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.05);animation:modalIn .26s cubic-bezier(.34,1.56,.64,1)}@keyframes modalSpring{from{opacity:0;transform:translate3d(0,16px,0) scale(.88)}to{opacity:1;transform:translate3d(0,0,0) scale(1)}}@keyframes modalIn{from{opacity:0;transform:scale(.9) translateY(16px)}to{opacity:1;transform:none}}
.mod h2{font-family:var(--hd);font-size:30px;font-weight:800;margin-bottom:8px;letter-spacing:-1px}
.mod p{font-size:13px;color:rgba(255,255,255,.42);margin-bottom:20px;line-height:1.7}
.mod-pr{font-family:var(--hd);font-size:44px;font-weight:800;color:var(--em);margin-bottom:4px;letter-spacing:-2px}
.mod-pr span{font-size:16px;color:rgba(255,255,255,.3);font-family:var(--bd);font-weight:300}
.mod-fts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0 20px}
.mod-f{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:10px;font-size:12px;color:rgba(255,255,255,.6)}
.mod-fi{font-size:18px;margin-bottom:3px}
.mod-note{font-size:11px;color:rgba(255,255,255,.2);margin-top:10px;line-height:1.6}
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
.ipw{animation:modalSpring .3s cubic-bezier(.34,1.56,.64,1) both;background:rgba(12,12,22,.97);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);border:1px solid rgba(16,185,129,.16);border-radius:24px;padding:32px;margin-top:18px;text-align:center;color:white;box-shadow:0 20px 50px rgba(0,0,0,.4),0 0 40px rgba(16,185,129,.06)}
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
  .page-hdr{padding:28px 14px 14px}
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
/* ── HERO TWO-COLUMN ── */
.hero-inner{display:grid;grid-template-columns:1fr 440px;gap:60px;align-items:center}
.hero-text{min-width:0}
.hero-preview{display:flex;justify-content:flex-end;align-items:center}
@media(max-width:1060px){.hero-inner{grid-template-columns:1fr}.hero-preview{display:none}}
/* ── SCROLL REVEAL ── */
.reveal{opacity:0;transform:translateY(30px);transition:opacity .6s cubic-bezier(.4,0,.2,1),transform .65s cubic-bezier(.34,1.2,.64,1)}
.reveal.on{opacity:1;transform:none}
/* ── TESTIMONIALS ── */
.testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:48px}
.testi-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:28px 24px;transition:transform .22s ease,border-color .2s;position:relative}
.testi-card:hover{transform:translateY(-4px);border-color:rgba(16,185,129,.22)}
.testi-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--em),transparent);border-radius:20px 20px 0 0;opacity:0;transition:opacity .2s}
.testi-card:hover::before{opacity:1}
/* ── HOW IT WORKS ── */
.steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:52px}
.step-card{background:white;border:1.5px solid var(--bo);border-radius:20px;padding:32px 26px;position:relative;transition:transform .22s ease,box-shadow .22s,border-color .2s}
.step-card:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(11,11,18,.09);border-color:rgba(16,185,129,.3)}
.step-num{font-size:11px;font-weight:800;letter-spacing:3px;color:var(--em);margin-bottom:12px;font-family:var(--bd)}
.step-arr{position:absolute;top:50%;right:-28px;transform:translateY(-50%);color:rgba(16,185,129,.35);font-size:22px;z-index:1;pointer-events:none}
/* ── LOGO STRIP ── */
.logo-strip{display:flex;align-items:center;justify-content:center;gap:28px;flex-wrap:wrap;padding:28px 0;margin-top:20px;border-top:1px solid rgba(255,255,255,.07)}
.logo-chip{font-size:12px;font-weight:700;color:rgba(255,255,255,.2);letter-spacing:.5px;padding:6px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.08);white-space:nowrap}
@media(max-width:820px){
  .testi-grid,.steps-grid{grid-template-columns:1fr;gap:14px}
  .step-arr{display:none}
}

/* ══════════════════════════════════════════
   PROTOTYPE DESIGN – LIGHT LANDING PAGE
══════════════════════════════════════════ */

/* Hero */
.lp-hero{background:var(--bg);padding:80px 0;min-height:calc(100vh - 64px);display:flex;align-items:center}
.lp-hero-inner{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:64px}
@media(max-width:900px){.lp-hero-inner{grid-template-columns:1fr;gap:44px}}
.lp-hero-badge{display:inline-flex;align-items:center;gap:8px;background:var(--em3);color:var(--em);font-size:13px;font-weight:500;padding:6px 14px;border-radius:100px;margin-bottom:28px;border:1px solid rgba(37,99,235,.18)}
.lp-badge-dot{width:6px;height:6px;border-radius:50%;background:var(--em);display:inline-block;flex-shrink:0}
.lp-h1{font-family:var(--hd);font-size:clamp(40px,5vw,60px);font-weight:400;line-height:1.06;letter-spacing:-1.5px;color:var(--ink);margin-bottom:24px}
.lp-h1 em{font-style:italic;color:var(--em)}
.lp-hero-sub{font-size:18px;font-weight:300;color:var(--mu);line-height:1.7;margin-bottom:40px;max-width:480px}
.lp-hero-actions{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-bottom:48px}
.lp-hero-stats{display:flex;gap:32px;padding-top:24px;border-top:1px solid var(--bo);flex-wrap:wrap}
.lp-stat-num{font-family:var(--hd);font-size:24px;font-weight:400;color:var(--ink);display:block;letter-spacing:-.5px}
.lp-stat-label{font-size:12px;color:var(--mu);display:block;margin-top:2px}
.lp-hero-visual{position:relative}
@media(max-width:900px){.lp-hero-visual{display:none}}

/* Chat mockup */
.lp-chat{background:white;border:1px solid var(--bo);border-radius:24px;padding:22px;box-shadow:0 12px 48px rgba(0,0,0,.09),0 4px 16px rgba(0,0,0,.04);position:relative;overflow:hidden}
.lp-chat::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--em) 0%,#818CF8 50%,#06B6D4 100%);border-radius:24px 24px 0 0}
.lp-chat-hdr{display:flex;align-items:center;gap:12px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--bo)}
.lp-chat-av{width:34px;height:34px;border-radius:9px;background:var(--em);display:flex;align-items:center;justify-content:center;font-family:var(--hd);font-size:14px;color:#fff;flex-shrink:0}
.lp-chat-name{font-size:14px;font-weight:500;color:var(--ink)}
.lp-chat-status{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--mu);margin-top:1px}
.lp-status-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;display:inline-block;flex-shrink:0}
.lp-msgs{display:flex;flex-direction:column;gap:10px}
.lp-msg-u{align-self:flex-end;background:var(--em);color:white;padding:9px 13px;border-radius:14px 14px 4px 14px;font-size:13px;max-width:84%;line-height:1.5}
.lp-msg-a{align-self:flex-start;background:var(--bg);color:var(--ink);border:1px solid var(--bo);padding:9px 13px;border-radius:14px 14px 14px 4px;font-size:13px;max-width:88%;line-height:1.55}
.lp-typing{display:flex;align-items:center;gap:4px;padding:10px 13px;background:var(--bg);border:1px solid var(--bo);border-radius:14px;align-self:flex-start;margin-top:2px}
.lp-typing-dot{width:7px;height:7px;border-radius:50%;background:var(--mu);opacity:.5;animation:lpTyp 1.2s ease-in-out infinite}
.lp-typing-dot:nth-child(2){animation-delay:.2s}
.lp-typing-dot:nth-child(3){animation-delay:.4s}
@keyframes lpTyp{0%,80%,100%{transform:scale(.5);opacity:.25}40%{transform:scale(1);opacity:.7}}
.lp-fc{position:absolute;background:white;border:1px solid var(--bo);border-radius:12px;padding:9px 13px;box-shadow:0 4px 18px rgba(0,0,0,.1);font-size:12px;display:flex;align-items:center;gap:7px;white-space:nowrap}
.lp-fc1{bottom:-16px;left:-18px}
.lp-fc2{top:20px;right:-18px}
.lp-fc-green{font-weight:700;color:#22c55e}
.lp-fc-blue{font-weight:700;color:var(--em)}

/* Logos */
.lp-logos{padding:36px 0;border-top:1px solid var(--bo);border-bottom:1px solid var(--bo);text-align:center;background:white}
.lp-logos-label{font-size:11px;font-weight:600;color:var(--mu);letter-spacing:.1em;text-transform:uppercase;margin-bottom:20px}
.lp-logos-mw{overflow:hidden;position:relative}
.lp-logos-mw::before,.lp-logos-mw::after{content:'';position:absolute;top:0;bottom:0;width:80px;z-index:2;pointer-events:none}
.lp-logos-mw::before{left:0;background:linear-gradient(to right,white,transparent)}
.lp-logos-mw::after{right:0;background:linear-gradient(to left,white,transparent)}
.lp-logos-m{display:flex;align-items:center;gap:52px;width:max-content;animation:lpMar 26s linear infinite}
.lp-logos-m:hover{animation-play-state:paused}
@keyframes lpMar{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.lp-logo{font-family:var(--hd);font-size:16px;color:var(--mu);opacity:.4;white-space:nowrap;user-select:none;transition:opacity .2s}
.lp-logo:hover{opacity:.8}

/* Section headers */
.lp-section{padding:88px 0}
.lp-section-alt{background:white}
.lp-label{font-size:12px;font-weight:600;color:var(--em);letter-spacing:.1em;text-transform:uppercase;margin-bottom:14px;display:block}
.lp-title{font-family:var(--hd);font-size:clamp(28px,3.5vw,44px);font-weight:400;line-height:1.1;letter-spacing:-1px;color:var(--ink);margin-bottom:16px}
.lp-title em{font-style:italic;color:var(--em)}
.lp-sub{font-size:16px;font-weight:300;color:var(--mu);line-height:1.75;max-width:560px}
.lp-center{text-align:center}.lp-center .lp-sub{margin:0 auto}

/* Tool cards */
.lp-tool-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
@media(max-width:1000px){.lp-tool-grid{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.lp-tool-grid{grid-template-columns:1fr}}
.lp-tool-card{background:white;border:1.5px solid var(--bo);border-radius:var(--r2);padding:26px;cursor:pointer;transition:transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .2s,border-color .2s;position:relative;overflow:hidden;text-align:left}
.lp-tool-card:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(0,0,0,.09);border-color:var(--em)}
.lp-tool-ico{font-size:26px;margin-bottom:12px;display:inline-block;transition:transform .2s cubic-bezier(.34,1.56,.64,1)}
.lp-tool-card:hover .lp-tool-ico{transform:scale(1.15) translateY(-2px)}
.lp-tool-title{font-family:var(--hd);font-size:16px;font-weight:400;color:var(--ink);margin-bottom:6px}
.lp-tool-desc{font-size:13px;color:var(--mu);line-height:1.7}
.lp-badge{font-size:10px;font-weight:600;padding:2px 9px;border-radius:20px;letter-spacing:.3px;position:absolute;top:14px;right:14px}
.lp-badge-free{background:var(--em3);color:var(--em)}
.lp-badge-pro{background:rgba(37,99,235,.08);color:var(--em);border:1px solid rgba(37,99,235,.2)}

/* How it works */
.lp-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
@media(max-width:900px){.lp-steps{grid-template-columns:1fr 1fr}}
@media(max-width:480px){.lp-steps{grid-template-columns:1fr}}
.lp-step{background:white;border:1.5px solid var(--bo);border-radius:var(--r2);padding:26px 22px;transition:transform .2s,box-shadow .2s}
.lp-step:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.08)}
.lp-step-n{width:42px;height:42px;border-radius:50%;background:var(--em3);border:1.5px solid rgba(37,99,235,.2);display:flex;align-items:center;justify-content:center;font-family:var(--hd);font-size:16px;font-weight:400;color:var(--em);margin-bottom:16px;flex-shrink:0}
.lp-step h4{font-family:var(--hd);font-size:16px;font-weight:400;color:var(--ink);margin-bottom:8px}
.lp-step p{font-size:13px;line-height:1.7;color:var(--mu)}

/* Testimonials light */
.lp-testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
@media(max-width:900px){.lp-testi-grid{grid-template-columns:1fr}}
.lp-testi-card{background:white;border:1.5px solid var(--bo);border-radius:var(--r2);padding:24px;transition:transform .2s,box-shadow .2s}
.lp-testi-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.08)}
.lp-testi-stars{color:#f59e0b;font-size:14px;letter-spacing:2px;margin-bottom:14px}
.lp-testi-text{font-size:14px;line-height:1.8;color:var(--mu);font-style:italic;margin-bottom:20px;font-weight:300}
.lp-testi-author{display:flex;align-items:center;gap:12px;padding-top:16px;border-top:1px solid var(--bo)}
.lp-testi-av{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;color:white;flex-shrink:0}
.lp-testi-name{font-size:13px;font-weight:500;color:var(--ink)}
.lp-testi-role{font-size:11px;color:var(--mu);margin-top:2px}

/* CV Compare */
.lp-cv-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px;max-width:860px;margin:0 auto}
@media(max-width:680px){.lp-cv-grid{grid-template-columns:1fr}}
.lp-cv-card{background:var(--bg);border:1px solid var(--bo);border-radius:var(--r2);overflow:hidden}
.lp-cv-hdr{padding:11px 16px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--bo);font-size:13px;font-weight:500}
.lp-cv-hdr.bad{background:#FFF5F5;color:#B91C1C}
.lp-cv-hdr.good{background:#F0FDF4;color:#059669}
.lp-cv-body{padding:16px;display:flex;flex-direction:column;gap:9px}
.lp-cv-block{padding:10px 11px;border-radius:8px;border:1px solid var(--bo);background:white;display:flex;flex-direction:column;gap:6px}
.lp-cv-block.bad{border-color:rgba(239,68,68,.2)}
.lp-cv-block.good{border-color:rgba(5,150,105,.25)}
.lp-cv-label{font-size:10px;font-weight:600;color:var(--mu);letter-spacing:.05em;text-transform:uppercase}
.lp-cv-line{height:8px;border-radius:100px;background:var(--bo)}
.lp-cv-line.sh{width:40%}.lp-cv-line.md{width:65%}.lp-cv-line.lg{width:88%}.lp-cv-line.fl{width:100%}
.lp-cv-block.good .lp-cv-line{background:rgba(5,150,105,.2)}
.lp-cv-ai{font-size:10px;font-weight:600;color:#059669;background:#F0FDF4;border-radius:20px;padding:2px 8px;display:inline-block;width:fit-content}
.lp-cv-score{padding:10px 11px}
.lp-cv-score-row{display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px}
.lp-cv-track{height:6px;border-radius:100px;background:var(--bo);overflow:hidden}
.lp-cv-fill{height:100%;border-radius:100px}

/* CTA section */
.lp-cta{background:var(--ink);padding:88px 0;text-align:center;position:relative;overflow:hidden}
.lp-cta::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 60% 60% at 50% 50%,rgba(37,99,235,.12),transparent);pointer-events:none}
.btn-white{font-family:var(--bd);font-size:16px;font-weight:500;color:var(--ink);background:white;border:none;cursor:pointer;padding:15px 32px;border-radius:var(--r2);display:inline-flex;align-items:center;gap:8px;transition:transform .15s,box-shadow .15s;box-shadow:0 4px 16px rgba(0,0,0,.15)}
.btn-white:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.2)}

/* Reveal animation on landing */
.lp-reveal{opacity:0;transform:translateY(18px);transition:opacity .5s ease,transform .5s ease}
.lp-reveal.v{opacity:1;transform:none}
`;


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
      sub: L("6 KI-Tools in einem. Bewerbungen, LinkedIn, ATS-Check, Job-Matching, Zeugnisanalyse und Interview-Coach – für den Schweizer Arbeitsmarkt.",
             "6 outils IA en un. Candidatures, LinkedIn, ATS, matching, certificats et coach – pour le marché suisse.",
             "6 strumenti IA in uno. Candidature, LinkedIn, ATS, matching, certificati e coach – per il mercato svizzero.",
             "6 AI tools in one. Applications, LinkedIn, ATS check, job matching, reference analysis and interview coach – for the Swiss job market."),
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
        {page:"app",  ico:"✍️",t:L("Bewerbungen","Applications","Candidatures","Candidature"),p:L("Motivationsschreiben & Lebenslauf in 60 Sekunden, live generiert. 1× gratis testen.","Cover letter & CV in 60 seconds, live generated. Try 1× for free.","Lettre & CV en 60 secondes, génération en direct. 1× gratuit.","Lettera & CV in 60 secondi, generazione live. 1× gratuito."),badge:"1× Gratis",bc:"tc-em",col:""},
        {page:"linkedin",ico:"💼",t:"LinkedIn",p:L("Profil analysieren & optimieren – Headline, About, Skills für Recruiter.","Analyze & optimize – headline, about, skills for recruiters.","Analyser & optimiser – Titre, About, compétences pour recruteurs.","Analizzare & ottimizzare – Headline, About, skills per recruiter."),badge:"PRO",bc:"tc-bl",col:"bl"},
        {page:"ats",  ico:"🤖",t:L("ATS-Simulation","ATS Simulation","Simulation ATS","Simulazione ATS"),p:L("Prüft ob dein Lebenslauf durch Recruiter-Software kommt. Mit Score & Tipps.","Checks if your CV passes recruiter software. With score & tips.","Vérifie si votre CV passe les logiciels RH. Avec score & conseils.","Controlla se il tuo CV passa i software HR. Con score & consigli."),badge:"PRO",bc:"tc-bl",col:"bl"},
        {page:"zeugnis",ico:"📜",t:L("Zeugnis-Analyse","Reference Analysis","Analyse certificat","Analisi certificato"),p:L("Schweizer Arbeitszeugnis-Code entschlüsselt. Was steht wirklich drin?","Decodes Swiss work references. What do they really say?","Décode le certificat de travail suisse. Que dit-il vraiment?","Decodifica il certificato svizzero. Cosa dice davvero?"),badge:"PRO",bc:"tc-am",col:"am"},
        {page:"jobmatch",ico:"🎯",t:L("Job-Matching","Job Matching","Matching emploi","Job Matching"),p:L("KI findet deine Top 5 passenden Stellenprofile mit Fit-Score.","AI finds your top 5 matching job profiles with fit score.","L'IA trouve vos 5 postes idéaux avec score d'adéquation.","L'IA trova i tuoi 5 profili di lavoro con score di compatibilità."),badge:"PRO",bc:"tc-em",col:""},
        {page:"coach", ico:"🎤",t:L("Interview-Coach","Interview Coach","Coach entretien","Coach colloquio"),p:L("KI simuliert 5 echte Fragen, bewertet Antworten, gibt Note 0–100.","AI simulates 5 real questions, evaluates answers, gives score 0–100.","L'IA simule 5 vraies questions, évalue et note de 0 à 100.","L'IA simula 5 domande reali, valuta e dà voto 0–100."),badge:"PRO",bc:"tc-em",col:""},
        {page:"excel", ico:"📊",t:L("Excel-Generator","Excel Generator","Générateur Excel","Generatore Excel"),p:L("KI erstellt professionelle Excel-Tabellen mit Formeln – für jeden Bereich. Nicht nur für Jobsuchende.","AI creates professional Excel spreadsheets with formulas – for any purpose. Not just for job seekers.","L'IA crée des tableaux Excel avec formules – pour tous. Pas seulement pour les chercheurs d'emploi.","L'IA crea fogli Excel professionali con formule – per tutti. Non solo per chi cerca lavoro."),badge:"PRO",bc:"tc-em",col:""},
        {page:"pptx",  ico:"📽️",t:L("PowerPoint-Maker","PowerPoint Maker","Créateur PowerPoint","Creatore PowerPoint"),p:L("KI erstellt strukturierte Präsentationen mit professionellem Inhalt – für Schule, Uni, Arbeit.","AI creates structured presentations with professional content – for school, uni, work.","L'IA crée des présentations structurées – pour l'école, l'université, le travail.","L'IA crea presentazioni strutturate – per scuola, università, lavoro."),badge:"PRO",bc:"tc-bl",col:"bl"},
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
      yearly: L("Jährlich 🎁","Annuel 🎁","Annuale 🎁","Yearly 🎁"),
      save:   L("2 Monate gratis","2 mois offerts","2 mesi gratis","2 months free"),
      recom:  L("Empfohlen","Recommandé","Consigliato","Recommended"),
      tiers:[
        {id:"free",name:L("Gratis","Gratuit","Gratuito","Free"),price:0,
         note:L("Kostenlos loslegen – ohne Kreditkarte.","Start for free – no credit card needed.","Gratuit pour toujours – sans carte.","Gratis per sempre – senza carta."),
         desc:L(
           "Einmal ausprobieren – kostenlos und ohne Kreditkarte.",
           "Try it once – free, no credit card needed.",
           "Essayez une fois – gratuit, sans carte bancaire.",
           "Prova una volta – gratuito, senza carta di credito."
         ),
         list:L(
           [`Eine vollständige KI-Bewerbung inklusive Motivationsschreiben und Lebenslauf.`,`Du kannst dein CV hochladen – Stellify liest es automatisch.`,`${C.CHAT_FREE_LIMIT} Fragen an Stella, die KI-Karriereberaterin.`,`Kein Abo, keine Kreditkarte nötig.`],
           [`One complete AI application including cover letter and CV.`,`Upload your CV – Stellify reads it automatically.`,`${C.CHAT_FREE_LIMIT} questions to Stella, the AI career advisor.`,`No subscription, no credit card needed.`],
           [`Une candidature complète avec lettre de motivation et CV.`,`Importez votre CV – Stellify le lit automatiquement.`,`${C.CHAT_FREE_LIMIT} questions à Stella, la conseillère carrière IA.`,`Sans abonnement ni carte bancaire.`],
           [`Una candidatura completa con lettera di motivazione e CV.`,`Carica il tuo CV – Stellify lo legge automaticamente.`,`${C.CHAT_FREE_LIMIT} domande a Stella, la consulente carriera IA.`,`Senza abbonamento né carta di credito.`]
         ),
         no:L(["LinkedIn","ATS-Check","Zeugnis-Analyse","Job-Matching","Interview-Coach","PDF-Export","20+ weitere Tools"],["LinkedIn","ATS check","Reference analysis","Job matching","Interview coach","PDF export","20+ more tools"],["LinkedIn","ATS","Certificat","Matching","Coach","PDF","20+ outils"],["LinkedIn","ATS","Certificato","Matching","Coach","PDF","20+ strumenti"]),
         btn:L("Kostenlos starten","Commencer gratuitement","Inizia gratis","Start for free"),btnS:"b-out"},
        {id:"pro",name:"Pro",priceM:19.90,priceY:14.90,best:true,
         note:L("Monatlich kündbar · Erneuerung jeden Montag 07:00","Monthly · Erneuerung every Monday 07:00","Mensuel · Rechargement lundi 07:00","Mensile · Ricarica lunedì 07:00"),
         yearNote:L("🎁 Jahresabo – 2 Monate gratis · CHF 14.90/Mo.","🎁 Annual plan – 2 months free · CHF 14.90/mo","🔥 CHF 14.90/mois avec abonnement annuel","🔥 CHF 14.90/mese con abbonamento annuale"),
         desc:L(
           "Pro gibt dir vollen Zugriff auf alle 20+ Tools. Du erhältst täglich ein festes Nutzungsvolumen – perfekt für regelmässige Bewerbungen und Karriere-Optimierungen.",
           "Pro is limited – you have a weekly volume that erneuerungs automatically every Monday.",
           "Pro est limité – vous avez un volume hebdomadaire rechargé automatiquement chaque lundi.",
           "Pro è limitato – hai una volume settimanale che si ricarica automaticamente ogni lunedì."
         ),
         list:L(
           ["Alle 20+ Tools sind vollständig freigeschaltet – keine Einschränkungen.","Du siehst im Profil jederzeit wie viel deines Wochennutzungsvolumens noch übrig ist.","Jeden Montag um 07:00 Uhr wird dein Nutzungsvolumen automatisch aufgefüllt.","Die KI optimiert dein LinkedIn-Profil gezielt für Schweizer Recruiter.","Der ATS-Check prüft ob dein CV durch Recruiter-Software kommt und gibt dir einen Score.","Die Zeugnis-Analyse entschlüsselt den versteckten Code in Schweizer Arbeitszeugnissen.","Job-Matching zeigt dir die fünf Stellen die am besten zu deinem Profil passen.","Der Interview-Coach simuliert echte Fragen und bewertet deine Antworten mit 0–100.","Im Bewerbungs-Tracker behältst du alle laufenden Bewerbungen im Überblick.","Der Swiss Bias-Checker prüft deinen Text auf unbewusste Formulierungen.","Die Skill-Gap-Analyse zeigt dir was dir für eine Stelle noch fehlt – und wie du es schliesst."],
           ["All 20+ tools are fully unlocked – no restrictions.","Your profile always shows how much of your weekly volume is left.","Every Monday at 07:00 your volume is automatically erneuerunged.","The AI optimises your LinkedIn profile specifically for Swiss recruiters.","The ATS check tests if your CV passes recruiter software and gives you a score.","The reference analysis decodes the hidden language in Swiss work references.","Job matching shows the five positions that fit your profile best.","The interview coach simulates real questions and scores your answers 0–100.","The application tracker gives you a clear overview of all ongoing applications.","The Swiss bias checker reviews your text for unconscious phrasing.","The skill gap analysis shows what you need for a role – and how to get there."],
           ["Tous les 20+ outils entièrement débloqués – sans restrictions.","Votre profil indique toujours combien de votre volume hebdomadaire il vous reste.","Chaque lundi à 07h00, votre volume est automatiquement rechargé.","L'IA optimise votre profil LinkedIn pour les recruteurs suisses.","Le contrôle ATS vérifie si votre CV passe les logiciels RH et vous donne un score.","L'analyse de certificat déchiffre le langage caché des certificats suisses.","Le matching emploi montre les cinq postes qui correspondent le mieux à votre profil.","Le coach entretien simule de vraies questions et note vos réponses de 0 à 100.","Le tracker candidatures vous donne une vue d'ensemble de toutes vos candidatures.","Le vérificateur de biais suisse analyse vos formulations inconscientes.","L'analyse des lacunes montre ce qu'il vous manque pour un poste."],
           ["Tutti i 20+ strumenti completamente sbloccati – senza restrizioni.","Il tuo profilo mostra sempre quanto del tuo volume settimanale rimane.","Ogni lunedì alle 07:00 il tuo volume viene ricaricato automaticamente.","L'IA ottimizza il tuo profilo LinkedIn per i recruiter svizzeri.","Il controllo ATS verifica se il tuo CV supera i software HR e ti dà un punteggio.","L'analisi del certificato decodifica il linguaggio nascosto dei certificati svizzeri.","Il job matching mostra i cinque posti che si adattano meglio al tuo profilo.","Il coach colloquio simula domande reali e valuta le tue risposte da 0 a 100.","Il tracker candidature ti dà una panoramica di tutte le candidature in corso.","Il controllo bias svizzero esamina le tue formulazioni inconsce.","L'analisi skill gap mostra cosa ti manca per un posto e come colmare il divario."]
         ),
         btn:L("Pro werden → CHF 19.90/Mo.","Become Pro → CHF 19.90/mo","Devenir Pro → CHF 19.90/mois","Diventa Pro → CHF 19.90/mese"),btnS:"b-em"},
        {id:"ultimate",name:L("Ultimate ♾️","Ultimate ♾️","Ultimate ♾️","Ultimate ♾️"),priceM:49.90,priceY:39.90,best:false,
         note:L("Absolut keine Limits – für tägliche Intensivnutzung.","Absolutely no limits – for daily intensive use.","Aucune limite – pour une utilisation quotidienne intensive.","Nessun limite – per un uso intensivo quotidiano."),
         yearNote:L("🎁 Jahresabo – 2 Monate gratis · CHF 39.90/Mo.","🎁 Annual plan – 2 months free · CHF 39.90/mo","🔥 CHF 39.90/mois avec abonnement annuel","🔥 CHF 39.90/mese con abbonamento annuale"),
         desc:L(
           "Ultimate ist unlimitiert – keine Limits, kein Nutzungsvolumen, kein Warten.",
           "Ultimate is your personal career copilot without any restrictions. Unlimited use of all tools, 24/7, for maximum career success.",
           "Ultimate est illimité – aucune limite, aucun volume, aucune attente.",
           "Ultimate è illimitato – nessun limite, nessuna volume, nessuna attesa."
         ),
         list:L(
           ["Kein Nutzungsvolumen, kein Erneuerung, kein Warten – du nutzt Stellify ohne jede Einschränkung.","Alle 20+ Tools in allen vier Sprachen sind jederzeit und unbegrenzt verfügbar.","Der Swiss Bias-Checker prüft deine Texte auf unbewusste Formulierungen.","Die Skill-Gap-Analyse zeigt dir konkret was dir für eine Stelle noch fehlt.","Die KI optimiert dein LinkedIn-Profil gezielt für den Schweizer Markt.","Der ATS-Check gibt dir einen Score und zeigt welche Keywords noch fehlen.","Die Zeugnis-Analyse entschlüsselt den versteckten Code in Schweizer Arbeitszeugnissen.","Job-Matching findet die fünf Stellen die am besten zu deinem Profil passen.","Der Interview-Coach simuliert echte Gespräche und gibt dir eine Bewertung 0–100.","Priority Support – bei Fragen antwortet das Stellify-Team bevorzugt."],
           ["No volume, no erneuerung, no waiting – use Stellify without any restrictions.","All 20+ tools in all four languages are available at any time without limits.","The Swiss bias checker reviews your texts for unconscious phrasing.","The skill gap analysis shows you exactly what you need for a position.","The AI optimises your LinkedIn profile specifically for the Swiss market.","The ATS check gives you a score and shows which keywords are missing.","The reference analysis decodes the hidden language in Swiss work references.","Job matching finds the five positions that fit your profile best.","The interview coach simulates real conversations and scores you 0–100.","Priority support – the Stellify team responds to your questions first."],
           ["Aucun volume, aucune recharge, aucune attente – utilisez Stellify sans aucune restriction.","Tous les 20+ outils dans les quatre langues sont disponibles à tout moment.","Le vérificateur de biais suisse analyse vos formulations inconscientes.","L'analyse des lacunes vous montre exactement ce qu'il vous manque pour un poste.","L'IA optimise votre profil LinkedIn pour le marché suisse.","Le contrôle ATS vous donne un score et montre les mots-clés manquants.","L'analyse de certificat déchiffre le langage caché des certificats suisses.","Le matching emploi trouve les cinq postes qui correspondent le mieux à votre profil.","Le coach entretien simule de vraies conversations et vous note de 0 à 100.","Support prioritaire – l'équipe Stellify répond à vos questions en premier."],
           ["Nessuna volume, nessuna ricarica, nessuna attesa – usa Stellify senza alcuna restrizione.","Tutti i 20+ strumenti in tutte e quattro le lingue sono sempre disponibili.","Il controllo bias svizzero esamina le tue formulazioni inconsce.","L'analisi skill gap mostra esattamente cosa ti manca per un posto.","L'IA ottimizza il tuo profilo LinkedIn per il mercato svizzero.","Il controllo ATS ti dà un punteggio e mostra le keyword mancanti.","L'analisi del certificato decodifica il linguaggio nascosto dei certificati svizzeri.","Il job matching trova i cinque posti che si adattano meglio al tuo profilo.","Il coach colloquio simula conversazioni reali e ti valuta da 0 a 100.","Supporto prioritario – il team Stellify risponde alle tue domande per primo."]
         ),
         btn:L("Ultimate starten → CHF 49.90/Mo.","Start Ultimate → CHF 49.90/mo","Démarrer Ultimate → CHF 49.90/mois","Avvia Ultimate → CHF 49.90/mese"),btnS:"b-out"},
      ],
      valTitle:L("CHF 19.90 – lohnt sich das?","CHF 19.90 – is it worth it?","CHF 19.90 – ça vaut la peine?","CHF 19.90 – vale la pena?"),
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
      methods:["🇨🇭 Twint","💳 Visa","💳 Mastercard","💳 Amex","🍎 Apple Pay","🤖 Google Pay","🏦 SEPA","🏦 PostFinance","🛒 Klarna"],
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
        btn:L(`Pro werden → CHF ${C.priceM}/Mo.`,`Devenir Pro → CHF ${C.priceM}/Mo.`,`Diventa Pro → CHF ${C.priceM}/Mo.`,`Become Pro → CHF ${C.priceM}/mo`),
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
      {k:"schnupper",lbl:{de:"🔑 Schnupperlehre (Swiss-USP!)",en:"🔑 Trial placement (Schnupperlehre)",fr:"🔑 Stage d'orientation (Schnupperlehre)",it:"🔑 Stage orientamento (Schnupperlehre)"},ph:{de:"z.B. 3 Tage bei UBS, 14.–16. Jan. 2026 – was hat dich beeindruckt?",en:"e.g. 3 days at UBS, 14–16 Jan 2026 – what impressed you?",fr:"ex. 3 jours chez UBS, 14–16 jan. 2026 – qu'est-ce qui vous a impressionné?",it:"es. 3 giorni da UBS, 14–16 gen. 2026 – cosa ti ha impressionato?"},type:"textarea",req:false},
      {k:"noten",   lbl:{de:"Noten Mathe / Deutsch (optional)",en:"Grades Maths / German (optional)",fr:"Notes Maths / Allemand (optionnel)",it:"Voti Matematica / Tedesco (opzionale)"},ph:{de:"z.B. Mathe 5.5, Deutsch 5 – Lehrbetriebe schauen genau hin!",en:"e.g. Maths A, German B – companies check these!",fr:"ex. Maths 5.5, Allemand 5",it:"es. Matematica 5.5, Tedesco 5"},req:false},
    ],
    prompt:(v,l)=>({
      de:`Schreibe ein professionelles Motivationsschreiben für eine Lehrstelle auf Schweizer Hochdeutsch (kein ß, kein "Ausbildungsplatz" – immer "Lehrstelle"/"Lernende*r").
PFLICHTSTRUKTUR (Swiss-Apprentice-Format):
1. EINLEITUNG: Bezug auf Berufsmesse oder Schnupperlehre bei ${v.firma}
2. HAUPTTEIL 1 – Motivation & Talent: Warum dieser Lehrberuf, persönliche Stärken
3. HAUPTTEIL 2 – Warum ${v.firma}: Konkreter Bezug auf die Firma
4. HAUPTTEIL 3 (WICHTIGSTER TEIL!): Schnupperlehre-Erlebnis: ${v.schnupper||"falls vorhanden – Datum, Ort, konkretes Erlebnis, Fazit"}
5. SCHLUSS: Einladung zum Vorstellungsgespräch

FORMAT: Absenderadresse links oben | Datum rechtsbündig "Zürich, ${new Date().toLocaleDateString("de-CH",{day:"numeric",month:"long",year:"numeric"})}" | Betreff fett: **Bewerbung als Lernende*r ${v.beruf} EFZ**

Daten: Lehrberuf: ${v.beruf} | Firma: ${v.firma} | Name: ${v.name} | Alter: ${v.alter||"nicht angegeben"} | Stärken: ${v.staerken||"nicht angegeben"} | Noten: ${v.noten||"nicht angegeben"}
Schweizer Rechtschreibung. ~280 Wörter. Ton: jugendlich, authentisch, professionell.`,
      en:`Write a professional motivation letter for a Swiss apprenticeship in English.
MANDATORY STRUCTURE:
1. INTRODUCTION: Reference to career fair or trial placement at ${v.firma}
2. MAIN PART 1 – Motivation & talent: Why this trade, personal strengths
3. MAIN PART 2 – Why ${v.firma}: Specific reference to the company
4. MAIN PART 3 (MOST IMPORTANT!): Trial placement (Schnupperlehre): ${v.schnupper||"if applicable – dates, location, experience, conclusion"}
5. CLOSING: Invite to interview

Data: Trade: ${v.beruf} | Company: ${v.firma} | Name: ${v.name} | Age: ${v.alter||"not provided"} | Strengths: ${v.staerken||"not provided"} | Grades: ${v.noten||"not provided"}
~280 words. Tone: youthful but professional, authentic.`,
      fr:`Rédige une lettre de motivation pour un apprentissage en suisse en français.
STRUCTURE OBLIGATOIRE:
1. INTRODUCTION: Référence à la foire professionnelle ou stage chez ${v.firma}
2. PARTIE PRINCIPALE 1 – Motivation & talent
3. PARTIE PRINCIPALE 2 – Pourquoi ${v.firma}
4. PARTIE PRINCIPALE 3 (LA PLUS IMPORTANTE!): Stage d'orientation: ${v.schnupper||"si applicable – dates, lieu, expérience, conclusion"}
5. CONCLUSION: Invitation à l'entretien

Données: Métier: ${v.beruf} | Entreprise: ${v.firma} | Nom: ${v.name} | Âge: ${v.alter||"n/a"} | Points forts: ${v.staerken||"n/a"} | Notes: ${v.noten||"n/a"}
~280 mots. Ton: jeune mais professionnel, authentique.`,
      it:`Scrivi una lettera di motivazione per un apprendistato svizzero in italiano.
STRUTTURA OBBLIGATORIA:
1. INTRODUZIONE: Riferimento a fiera professionale o stage da ${v.firma}
2. PARTE PRINCIPALE 1 – Motivazione & talento
3. PARTE PRINCIPALE 2 – Perché ${v.firma}
4. PARTE PRINCIPALE 3 (LA PIÙ IMPORTANTE!): Stage orientamento: ${v.schnupper||"se applicabile – date, luogo, esperienza, conclusione"}
5. CHIUSURA: Invito a colloquio

Dati: Mestiere: ${v.beruf} | Azienda: ${v.firma} | Nome: ${v.name} | Età: ${v.alter||"n/d"} | Punti di forza: ${v.staerken||"n/d"} | Voti: ${v.noten||"n/d"}
~280 parole. Tono: giovanile ma professionale, autentico.`,
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
  // ── SWISS BIAS CHECKER ──
  { id:"biaschecker", ico:"🔍", color:"#7c3aed", cat:"karriere",
    t:{de:"Swiss-Bias-Checker",en:"Swiss Bias Checker",fr:"Vérificateur biais suisse",it:"Controllo bias svizzero"},
    sub:{de:"Prüft dein Bewerbungsdossier auf unbewusste Vorurteile & Diskriminierungsrisiken.",en:"Checks your application for unconscious bias & discrimination risks.",fr:"Vérifie votre dossier pour biais inconscients et risques de discrimination.",it:"Controlla il tuo dossier per pregiudizi inconsci e rischi di discriminazione."},
    inputs:[
      {k:"text",lbl:{de:"Text prüfen (Motivationsschreiben / CV) *",en:"Text to check (cover letter / CV) *",fr:"Texte à vérifier *",it:"Testo da verificare *"},ph:{de:"Deinen Text hier einfügen…",en:"Paste your text here…",fr:"Collez votre texte ici…",it:"Incolla il tuo testo qui…"},type:"textarea",req:true,tall:true},
      {k:"ziel",lbl:{de:"Zielstelle / Branche",en:"Target position / Industry",fr:"Poste cible / Secteur",it:"Posizione target / Settore"},ph:{de:"z.B. Projektleiter, Finanzsektor",en:"e.g. Project manager, finance sector",fr:"ex. Chef de projet, secteur financier",it:"es. Project manager, settore finanziario"},req:false},
    ],
    prompt:(v,l)=>(({
      de:`Du bist Schweizer HR-Experte für Diversity & Inclusion. Analysiere diesen Text auf unbewusste Vorurteile (Alter, Geschlecht, Herkunft, Religion, Sprache) und Formulierungen die im Schweizer Arbeitsmarkt diskriminierend wirken könnten. Antworte auf Schweizer Hochdeutsch (kein ß). NUR JSON:\n{"risiko":"niedrig|mittel|hoch","score":85,"zusammenfassung":"2 Sätze","probleme":[{"phrase":"Originaltext","problem":"Erklärung","besser":"Verbesserte Version"}],"staerken":["positiver Aspekt 1","positiver Aspekt 2"],"empfehlung":"Gesamttipp"}\nText: ${v.text}\nZielstelle: ${v.ziel||"nicht angegeben"}`,
      en:`You are a Swiss HR expert for Diversity & Inclusion. Analyse this text for unconscious bias (age, gender, origin, religion, language) and phrasing that could be discriminatory in the Swiss job market. JSON only:\n{"risiko":"low|medium|high","score":85,"zusammenfassung":"2 sentences","probleme":[{"phrase":"original text","problem":"explanation","besser":"improved version"}],"staerken":["positive 1"],"empfehlung":"Overall tip"}\nText: ${v.text}\nTarget role: ${v.ziel||"not provided"}`,
      fr:`Tu es un expert RH suisse en Diversité & Inclusion. Analyse ce texte pour les biais inconscients et formulations potentiellement discriminatoires. JSON uniquement:\n{"risiko":"faible|moyen|élevé","score":85,"zusammenfassung":"2 phrases","probleme":[{"phrase":"texte original","problem":"explication","besser":"version améliorée"}],"staerken":["point fort 1"],"empfehlung":"Conseil global"}\nTexte: ${v.text}`,
      it:`Sei un esperto HR svizzero di Diversity & Inclusion. Analizza questo testo per pregiudizi inconsci. Solo JSON:\n{"risiko":"basso|medio|alto","score":85,"zusammenfassung":"2 frasi","probleme":[{"phrase":"testo originale","problem":"spiegazione","besser":"versione migliorata"}],"staerken":["punto forte 1"],"empfehlung":"Consiglio generale"}\nTesto: ${v.text}`,
    })[l]),
  },
  // ── SKILL GAP ANALYSE ──
  { id:"skillgap", ico:"📊", color:"#0891b2", cat:"karriere",
    t:{de:"Skill-Gap-Analyse",en:"Skill Gap Analysis",fr:"Analyse des lacunes",it:"Analisi skill gap"},
    sub:{de:"Vergleicht dein Profil mit dem Stelleninserat und zeigt was dir noch fehlt.",en:"Compares your profile with the job ad and shows what you're missing.",fr:"Compare votre profil avec l'annonce et montre ce qui manque.",it:"Confronta il tuo profilo con l'annuncio e mostra cosa manca."},
    inputs:[
      {k:"profil",lbl:{de:"Dein Profil (Skills / Erfahrung) *",en:"Your profile (skills / experience) *",fr:"Votre profil (compétences / expérience) *",it:"Il tuo profilo (competenze / esperienza) *"},ph:{de:"z.B. 5 Jahre Python, Projektmanagement, Deutsch/Englisch, Bachelor Informatik…",en:"e.g. 5 years Python, project management, German/English, BSc Computer Science…",fr:"ex. 5 ans Python, gestion de projet, allemand/anglais…",it:"es. 5 anni Python, gestione progetti, tedesco/inglese…"},type:"textarea",req:true,tall:true},
      {k:"inserat",lbl:{de:"Stelleninserat *",en:"Job advertisement *",fr:"Offre d'emploi *",it:"Annuncio di lavoro *"},ph:{de:"Das Inserat hier einfügen…",en:"Paste the job ad here…",fr:"Collez l'offre ici…",it:"Incolla l'annuncio qui…"},type:"textarea",req:true,tall:true},
    ],
    prompt:(v,l)=>(({
      de:`Du bist Karriereberater Schweiz. Analysiere die Lücken zwischen diesem Profil und diesem Stelleninserat. Schweizer Hochdeutsch (kein ß). NUR JSON:\n{"match_score":72,"zusammenfassung":"2 Sätze Gesamtbild","staerken":[{"skill":"Python","relevanz":"hoch","vorhanden":true}],"luecken":[{"skill":"Scrum Master Zertifikat","relevanz":"hoch","lernzeit":"2–3 Monate","ressource":"Scrum.org / Coursera"}],"sofort_machbar":["Tipp der sofort umsetzbar ist"],"fazit":"Empfehlung ob Bewerbung lohnt"}\nProfil:\n${v.profil}\nInserat:\n${v.inserat}`,
      en:`You are a Swiss career advisor. Analyse the gaps between this profile and this job ad. JSON only:\n{"match_score":72,"zusammenfassung":"2 sentences overview","staerken":[{"skill":"Python","relevanz":"high","vorhanden":true}],"luecken":[{"skill":"Scrum Master cert","relevanz":"high","lernzeit":"2–3 months","ressource":"Scrum.org"}],"sofort_machbar":["Immediately actionable tip"],"fazit":"Recommendation on whether to apply"}\nProfile:\n${v.profil}\nJob ad:\n${v.inserat}`,
      fr:`Tu es un conseiller carrière suisse. Analyse les lacunes entre ce profil et cette offre. JSON uniquement:\n{"match_score":72,"zusammenfassung":"2 phrases","staerken":[{"skill":"Python","relevanz":"élevée","vorhanden":true}],"luecken":[{"skill":"Certif. Scrum","relevanz":"élevée","lernzeit":"2–3 mois","ressource":"Scrum.org"}],"sofort_machbar":["Conseil immédiat"],"fazit":"Recommandation"}\nProfil:\n${v.profil}\nOffre:\n${v.inserat}`,
      it:`Sei un consulente carriera svizzero. Analizza le lacune tra questo profilo e questo annuncio. Solo JSON:\n{"match_score":72,"zusammenfassung":"2 frasi","staerken":[{"skill":"Python","relevanz":"alta","vorhanden":true}],"luecken":[{"skill":"Cert. Scrum","relevanz":"alta","lernzeit":"2–3 mesi","ressource":"Scrum.org"}],"sofort_machbar":["Consiglio immediato"],"fazit":"Raccomandazione"}\nProfilo:\n${v.profil}\nAnnuncio:\n${v.inserat}`,
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
  const nextReset=()=>{
    const d=new Date();
    d.setDate(d.getDate()+1);d.setHours(0,0,0,0);
    const diff=d-new Date();
    const h=Math.floor(diff/3600000);
    const min=Math.floor((diff%3600000)/60000);
    return lang==="de"?`in ${h}h ${min}min (Mitternacht)`:lang==="fr"?`dans ${h}h ${min}min (minuit)`:lang==="it"?`tra ${h}h ${min}min (mezzanotte)`:`in ${h}h ${min}min (midnight)`;
  };
  const limitHit = pro && authSession?.plan!=="ultimate" && proUsage >= C.PRO_LIMIT;

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

  // Special JSON result rendering for bias + skillgap
  const renderSpecialResult = () => {
    if(!result) return null;
    try {
      const d = JSON.parse(result.replace(/```json|```/g,"").trim());
      if(tool.id==="biaschecker") {
        const col = d.risiko==="niedrig"||d.risiko==="low"?"#10b981":d.risiko==="mittel"||d.risiko==="medium"?"#f59e0b":"#ef4444";
        return (
          <div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <div style={{fontFamily:"var(--hd)",fontSize:42,fontWeight:800,color:col}}>{d.score}</div>
              <div>
                <div style={{fontSize:11,color:"rgba(0,0,0,.4)",textTransform:"uppercase",letterSpacing:"1px"}}>Bias-Score</div>
                <div style={{fontSize:13,fontWeight:700,color:col,textTransform:"uppercase"}}>{d.risiko}</div>
              </div>
            </div>
            <p style={{fontSize:14,color:"var(--mu)",marginBottom:16}}>{d.zusammenfassung}</p>
            {d.probleme?.length>0&&<div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:"#dc2626",marginBottom:8}}>⚠️ Gefundene Probleme</div>
              {d.probleme.map((p,i)=>(
                <div key={i} style={{background:"rgba(239,68,68,.05)",border:"1px solid rgba(239,68,68,.15)",borderRadius:10,padding:"12px",marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#dc2626",marginBottom:4}}>«{p.phrase}»</div>
                  <div style={{fontSize:12,color:"var(--mu)",marginBottom:6}}>{p.problem}</div>
                  <div style={{fontSize:12,color:"#059669",fontWeight:600}}>✓ Besser: {p.besser}</div>
                </div>
              ))}
            </div>}
            {d.staerken?.length>0&&<div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:"#059669",marginBottom:8}}>✅ Stärken</div>
              {d.staerken.map((s,i)=><div key={i} style={{fontSize:13,color:"var(--mu)",padding:"4px 0"}}>✓ {s}</div>)}
            </div>}
            {d.empfehlung&&<div style={{background:"rgba(16,185,129,.08)",borderRadius:10,padding:"12px",fontSize:13,color:"var(--ink)"}}><strong>💡 Empfehlung:</strong> {d.empfehlung}</div>}
          </div>
        );
      }
      if(tool.id==="skillgap") {
        const pct = d.match_score||0;
        const col = pct>=80?"#10b981":pct>=60?"#f59e0b":"#ef4444";
        return (
          <div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <div style={{fontFamily:"var(--hd)",fontSize:42,fontWeight:800,color:col}}>{pct}%</div>
              <div><div style={{fontSize:11,color:"rgba(0,0,0,.4)",textTransform:"uppercase",letterSpacing:"1px"}}>Match Score</div></div>
            </div>
            <div style={{background:"rgba(0,0,0,.04)",borderRadius:8,overflow:"hidden",marginBottom:16}}>
              <div style={{height:8,width:`${pct}%`,background:col,transition:"width .8s ease"}}/>
            </div>
            <p style={{fontSize:14,color:"var(--mu)",marginBottom:16}}>{d.zusammenfassung}</p>
            {d.luecken?.length>0&&<div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:"#dc2626",marginBottom:8}}>📚 Zu schliessende Lücken</div>
              {d.luecken.map((l,i)=>(
                <div key={i} style={{background:"rgba(239,68,68,.05)",border:"1px solid rgba(239,68,68,.12)",borderRadius:10,padding:"12px",marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{fontSize:13,fontWeight:700}}>{l.skill}</div>
                    <div style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(239,68,68,.12)",color:"#dc2626"}}>{l.relevanz}</div>
                  </div>
                  <div style={{fontSize:12,color:"var(--mu)"}}>⏱ {l.lernzeit} · 📖 {l.ressource}</div>
                </div>
              ))}
            </div>}
            {d.sofort_machbar?.length>0&&<div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:"#059669",marginBottom:8}}>⚡ Sofort umsetzbar</div>
              {d.sofort_machbar.map((s,i)=><div key={i} style={{fontSize:13,color:"var(--mu)",padding:"4px 0"}}>→ {s}</div>)}
            </div>}
            {d.fazit&&<div style={{background:"rgba(16,185,129,.08)",borderRadius:10,padding:"12px",fontSize:13,color:"var(--ink)"}}><strong>🎯 Fazit:</strong> {d.fazit}</div>}
          </div>
        );
      }
    } catch(e) {}
    return null;
  };

  const hdrColor = tool.color || "#10b981";

  return (
    <>
      <div style={{background:`linear-gradient(135deg,${hdrColor}cc,${hdrColor}ee)`,padding:"52px 28px 36px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{fontFamily:"var(--hd)",fontSize:32,fontWeight:800,color:"white",marginBottom:7,letterSpacing:"-1px"}}>{tool.ico} {tool.t[lang]}</div>
        <div style={{fontSize:14,color:"rgba(255,255,255,.5)"}}>{tool.sub[lang]}</div>
      </div>
      <div style={{maxWidth:740,margin:"0 auto",padding:"36px 28px 80px"}}>
        {err&&<div className="err">⚠️ {err}</div>}
        {limitHit&&(
          <div style={{background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.3)",borderRadius:12,padding:"16px 20px",marginBottom:16,textAlign:"center"}}>
            <div style={{fontSize:24,marginBottom:6}}>⏳</div>
            <div style={{fontFamily:"var(--hd)",fontSize:16,fontWeight:800,marginBottom:4}}>{L("Monatliches Nutzungsvolumen aufgebraucht","Monthly volume used up","Volume mensuel épuisé","Volume mensile esaurito")}</div>
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
                {(tool.id==="biaschecker"||tool.id==="skillgap")&&!streaming&&result?(
                  <div style={{background:"white",borderRadius:14,padding:"22px",border:"1px solid var(--bo)"}}>{renderSpecialResult()||<div className="r-doc">{result}</div>}</div>
                ):(
                  <div className="r-doc">{result||(!streaming&&<span style={{color:"rgba(11,11,18,.25)",fontSize:13,fontStyle:"italic"}}>{L("Noch kein Inhalt.","No content yet.","Pas encore de contenu.","Nessun contenuto.")}</span>)}{streaming&&<span className="cursor"/>}</div>
                )}
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
`Anna Müller · Seestrasse 44 · 8002 Zürich · anna.mueller@email.ch

                                                    Zürich, 23. März 2026
Migros-Genossenschafts-Bund
Limmatstrasse 152, 8031 Zürich
z. Hd. Personalmanagement

**Bewerbung als Product Manager Digital (80–100%)**

Sehr geehrte Damen und Herren

Als jemand, der täglich Migros-Apps nutzt und die digitale Transformation im Retail aus erster Hand kennt, war Ihre Stellenausschreibung sofort ein Muss für mich.

In meinen fünf Jahren als Product Manager bei Coop Digital habe ich drei mobile Apps von 0 auf 4.8 Sterne gebracht und den digitalen Umsatz um CHF 2,4 Mio. jährlich gesteigert. Mit meiner Mehrsprachigkeit (DE/EN/FR) überbrücke ich Deutschschweizer Pragmatismus mit romandischer Kundenorientierung – ein Plus, das im Schweizer Retail oft unterschätzt wird.

Besonders schätze ich Ihre «Nachhaltigkeit 2030»-Initiative: In meiner letzten Rolle habe ich eine CO₂-Tracking-Funktion für 800'000 User entwickelt, die nun schweizweit ausgezeichnet wird.

Ich freue mich auf ein persönliches Gespräch und stehe ab sofort zur Verfügung.

Freundliche Grüsse
Anna Müller

Beilagen: Lebenslauf mit Foto, Arbeitszeugnisse (UBS, Coop Digital), Diplome

─────────────────────────────
✅ ATS-Score: 91/100 · ✅ Schweizer Format · ✅ Keywords aus Inserat ✓`,
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

💡 Bessere Antwort (STAR-Methode):
«In 5 Jahren sehe ich mich in einer Führungsrolle im Marketing. Bei Migros möchte ich zunächst die Digitalstrategie für Marke XY mitgestalten, dann ein Team von 3–5 Personen leiten.»

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
    {
      id:"lehrstelle", ico:"🎓",
      label:L("Lehrstellen-Bewerbung 🇨🇭","Apprenticeship 🇨🇭","Apprentissage 🇨🇭","Apprendistato 🇨🇭"),
      badge:L("Swiss USP","Swiss USP","Swiss USP","Swiss USP"), badgeCol:"#ef4444",
      input:[{l:L("Lehrberuf + Firma","Trade + Company","Métier + Entreprise","Mestiere + Azienda"),v:"Kauffrau EFZ · UBS AG Zürich"},{l:L("🔑 Schnupperlehre","🔑 Trial placement","🔑 Stage orientation","🔑 Stage orientamento"),v:L("3 Tage bei UBS Jan. 2026, Kundenberatung","3 days UBS Jan 2026, client advisory","3 jours UBS jan. 2026, conseil client","3 giorni UBS gen. 2026, consulenza")}],
      output:L(
`Lena Müller · Seestrasse 4 · 8002 Zürich
lena.mueller@gmail.com · 079 123 45 67

                              Zürich, 23. März 2026
UBS AG – Personalmanagement
Bahnhofstrasse 45, 8001 Zürich

**Bewerbung als Lernende Kauffrau EFZ**

Sehr geehrte Damen und Herren

An der Berufsmesse Zürich besuchte ich Ihren Stand – seitdem ist UBS mein absoluter Wunsch-Lehrort.

Ich bringe ausgezeichnete Noten mit: Mathe 5.5, Deutsch 5. Strukturiertes Arbeiten und echte Begeisterung für die Finanzbranche sind meine Stärken.

Während meiner 3-tägigen Schnupperlehre vom 14.–16. Januar 2026 begleitete ich Kundenberater Thomas Huber. Besonders beeindruckt hat mich das lösungsorientierte Arbeiten im Team. Dieser Einblick hat meinen Berufswunsch endgültig bestätigt.

Ich freue mich sehr auf ein persönliches Gespräch.

Freundliche Grüsse · Lena Müller
Beilagen: Lebenslauf mit Foto, Schulzeugnis, Schnupperlehrbestätigung UBS

──────────────────────────────────────
✅ Kein «ß» · ✅ Schnupperlehre HT3 · ✅ Noten 5.5/5
✅ Datum rechtsbündig · ✅ Betreff fett + EFZ · ✅ Swiss-Format`,
`Lena Müller · Seestrasse 4 · 8002 Zürich

                              Zurich, 23 March 2026
UBS AG – HR Department
Bahnhofstrasse 45, 8001 Zurich

**Application as Apprentice Commercial Employee EFZ**

Dear Sir or Madam,

At the Berufsmesse Zürich I visited your stand – since then UBS has been my absolute top-choice employer for my apprenticeship.

I bring excellent grades: Maths 5.5, German 5. Structured working and genuine enthusiasm for finance are my strengths.

During my 3-day trial placement (14–16 Jan 2026) I shadowed client advisor Thomas Huber. His solution-oriented approach deeply impressed me and confirmed my career choice.

Kind regards · Lena Müller

──────────────────────────────────────
✅ Swiss format · ✅ Trial placement in main body · ✅ Grades listed`,
`Lena Müller · Seestrasse 4 · 8002 Zürich

**Candidature comme Apprentie employée de commerce AFC**

À la Berufsmesse Zürich j'ai visité votre stand – depuis, UBS est mon premier choix.

Notes: Maths 5.5, Allemand 5. Durant mon stage du 14–16 janv. 2026 j'ai accompagné le conseiller Thomas Huber – son approche orientée solutions m'a profondément marquée.

Cordialement · Lena Müller

✅ Format suisse · ✅ Stage mentionné · ✅ Notes indiquées`,
`Lena Müller · Seestrasse 4 · 8002 Zurigo

**Candidatura Apprendista impiegata di commercio AFC**

Alla Berufsmesse Zürich ho visitato il vostro stand – da allora UBS è la mia prima scelta.

Voti: Matematica 5.5, Tedesco 5. Durante il mio stage 14–16 gen. 2026 ho affiancato Thomas Huber – il suo approccio mi ha profondamente impressionata.

Cordiali saluti · Lena Müller

✅ Formato svizzero · ✅ Stage menzionato · ✅ Voti indicati`)
    },
  ];
  const demo = demos[demoTab];
  return (
    <div>
      {/* Tool Tabs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:20}}>
        {demos.map((d,i)=>(
          <button key={i} onClick={()=>setDemoTab(i)} style={{padding:"8px 12px",borderRadius:10,border:`1.5px solid ${i===demoTab?(d.badgeCol||"rgba(16,185,129,.5)")+"66":"rgba(255,255,255,.07)"}`,background:i===demoTab?(d.badgeCol||"rgba(16,185,129,.1)")+"1a":"rgba(255,255,255,.03)",color:i===demoTab?"white":"rgba(255,255,255,.35)",fontFamily:"var(--hd)",fontWeight:700,fontSize:12,cursor:"pointer",transition:"all .18s",display:"flex",alignItems:"center",gap:6,justifyContent:"flex-start"}}>
            <span style={{fontSize:15}}>{d.ico}</span>
            <span style={{flex:1,textAlign:"left",fontSize:11,lineHeight:1.2}}>{d.label}</span>
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


// ── ANIMATED STAT BOX (count-up on scroll into view) ──────────────────
function AnimatedStatBox({ n, l }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(()=>{
    const obs = new IntersectionObserver(([e])=>{ if(e.isIntersecting){ setStarted(true); obs.disconnect(); }},{threshold:.5});
    if(ref.current) obs.observe(ref.current);
    return ()=>obs.disconnect();
  },[]);

  useEffect(()=>{
    if(!started){ setDisplayed("0"); return; }
    // Parse value: "3'000+" → prefix="", num=3000, suffix="+"
    //              "CHF 19.90" → prefix="CHF ", num=19.90, suffix=""
    //              "18+" → prefix="", num=18, suffix="+"
    const clean = n.replace(/'/g,"");
    const m = clean.match(/^([^0-9]*)([0-9]+(?:\.[0-9]+)?)([^0-9]*)$/);
    if(!m){ setDisplayed(n); return; }
    const [, pre, numStr, suf] = m;
    const target = parseFloat(numStr);
    const isFloat = numStr.includes(".");
    const hasSwissThousands = n.includes("'");
    const duration = 1400;
    const start = Date.now();
    const fmt = (v) => {
      const rounded = isFloat ? v.toFixed(2) : Math.floor(v);
      const str = hasSwissThousands ? String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g,"'") : String(rounded);
      return `${pre}${str}${suf}`;
    };
    setDisplayed(fmt(0));
    const timer = setInterval(()=>{
      const p = Math.min((Date.now()-start)/duration, 1);
      const eased = 1 - Math.pow(1-p, 3);
      setDisplayed(fmt(eased * target));
      if(p>=1) clearInterval(timer);
    }, 16);
    return ()=>clearInterval(timer);
  },[started, n]);

  return (
    <div ref={ref}>
      <div className="stat-n">{displayed || n}</div>
      <div className="stat-l">{l}</div>
    </div>
  );
}

function FaqSection({lang, email}) {
  const [open,setOpen]=useState(null);
  const faqs=lang==="de"?[
    {q:"Wie sicher sind meine Daten?",a:"Deine Daten werden nicht gespeichert. Jede Anfrage wird direkt an die Anthropic API gesendet und danach nicht protokolliert. Kein Training auf deinen Daten."},
    {q:"Kann ich jederzeit kündigen?",a:"Ja – du kannst monatlich kündigen, ohne Mindestlaufzeit oder versteckte Gebühren. Über Stripe verwaltest du dein Abo selbst."},
    {q:"Wie viele Generierungen habe ich?",a:`Gratis: ${C.FREE_LIMIT} Generierung${C.FREE_LIMIT!==1?"en":""} zum Testen. Pro: ${C.PRO_LIMIT} Generierungen/Woche (Erneuerung jeden Montag 07:00). Ultimate: unbegrenzt.`},
    {q:"Funktioniert Stellify für alle Branchen?",a:"Ja. Die KI ist auf den Schweizer Jobmarkt trainiert und kennt Gepflogenheiten aus IT, Finanzen, Gesundheit, Bildung, Gastronomie und mehr."},
    {q:"Welche Sprachen werden unterstützt?",a:"Vollständig auf Deutsch, Englisch, Französisch und Italienisch – ideal für Jobs in allen Sprachregionen der Schweiz."},
    {q:"Gibt es einen Studentenrabatt?",a:"Aktuell nicht, aber der Jahrespreis (CHF 18.90/Mo.) macht das Abo für alle erschwinglich. Meld dich bei uns für spezielle Konditionen."},
  ]:lang==="fr"?[
    {q:"Mes données sont-elles sécurisées?",a:"Vos données ne sont pas stockées. Chaque requête est envoyée directement à l'API Anthropic et n'est pas enregistrée."},
    {q:"Puis-je résilier à tout moment?",a:"Oui – résiliation mensuelle possible, sans durée minimale ni frais cachés."},
    {q:"Combien de générations par plan?",a:"Gratuit: 1 génération. Pro: 60/mois par personne. Famille: 60/mois par personne (3 personnes). Unlimited: 60/mois par personne, membres illimités. Le volume se renouvelle automatiquement le 1er du mois suivant."},
    {q:"Fonctionne pour tous les secteurs?",a:"Oui. L'IA connaît les habitudes du marché suisse dans tous les secteurs."},
    {q:"Quelles langues sont supportées?",a:"Allemand, anglais, français et italien – idéal pour toutes les régions linguistiques."},
    {q:"Y a-t-il une réduction étudiants?",a:"Pas actuellement, mais le prix annuel (CHF 18.90/mois) est accessible à tous."},
  ]:lang==="it"?[
    {q:"I miei dati sono sicuri?",a:"I tuoi dati non vengono salvati. Ogni richiesta viene inviata direttamente all'API Anthropic e non viene registrata."},
    {q:"Posso cancellare in qualsiasi momento?",a:"Sì – cancellazione mensile possibile, senza durata minima o costi nascosti."},
    {q:"Cosa succede dopo 60 generazioni?",a:"Dopo 60 generazioni Pro al mese, il limite si ripristina automaticamente il 1° del mese successivo."},
    {q:"Funziona per tutti i settori?",a:"Sì. L'IA conosce le abitudini del mercato svizzero in tutti i settori."},
    {q:"Quali lingue sono supportate?",a:"Tedesco, inglese, francese e italiano – ideale per tutte le regioni linguistiche."},
    {q:"C'è uno sconto studenti?",a:"Al momento no, ma il prezzo annuale (CHF 18.90/mese) è accessibile a tutti."},
  ]:[
    {q:"Is my data secure?",a:"Your data is not stored. Each request is sent directly to the Anthropic API and not logged. No training on your data."},
    {q:"Can I cancel at any time?",a:"Yes – monthly cancellation possible, no minimum term or hidden fees. Manage your subscription directly via Stripe."},
    {q:"What happens after 60 generations?",a:"After 60 Pro generations per month, your limit resets automatically on the 1st of the following month."},
    {q:"Does it work for all industries?",a:"Yes. The AI is trained on the Swiss job market and knows conventions across IT, finance, health, education, hospitality and more."},
    {q:"Which languages are supported?",a:"Fully available in German, English, French and Italian – ideal for jobs across all Swiss language regions."},
    {q:"Is there a student discount?",a:"Not currently, but the annual price (CHF 18.90/mo.) makes the subscription affordable for everyone."},
  ];
  return(
    <section style={{padding:"88px 0",background:"var(--bg)"}} id="faq">
      <div className="con">
        <div style={{textAlign:"center",marginBottom:48}}>
          <span className="lp-label">✦ FAQ</span>
          <h2 className="lp-title" style={{textAlign:"center",margin:"0 auto 14px"}}>{lang==="de"?"Häufige Fragen":lang==="fr"?"Questions fréquentes":lang==="it"?"Domande frequenti":"Frequently asked questions"}</h2>
          <p className="lp-sub" style={{margin:"0 auto"}}>{lang==="de"?"Alles was du wissen musst – klar und ehrlich.":lang==="fr"?"Tout ce que vous devez savoir – clairement.":lang==="it"?"Tutto quello che devi sapere.":"Everything you need to know – clear and honest."}</p>
        </div>
        <div style={{maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:8}}>
          {faqs.map((faq,i)=>(
            <div key={i} className="lp-reveal" style={{transitionDelay:`${i*0.06}s`,
              background:open===i?"rgba(37,99,235,.04)":"white",
              border:`1.5px solid ${open===i?"rgba(37,99,235,.25)":"var(--bo)"}`,
              borderRadius:14,overflow:"hidden",transition:"border-color .2s,background .2s",
              boxShadow:open===i?"0 2px 12px rgba(37,99,235,.08)":"none"}}>
              <button onClick={()=>setOpen(open===i?null:i)}
                style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:"18px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,textAlign:"left",fontFamily:"var(--bd)"}}>
                <span style={{fontSize:15,fontWeight:500,color:"var(--ink)",lineHeight:1.4}}>{faq.q}</span>
                <div style={{width:26,height:26,borderRadius:"50%",background:open===i?"var(--em)":"var(--em3)",border:`1.5px solid ${open===i?"var(--em)":"rgba(37,99,235,.2)"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .2s,transform .2s",transform:open===i?"rotate(45deg)":"none"}}>
                  <span style={{fontSize:16,color:open===i?"white":"var(--em)",lineHeight:1,fontWeight:300}}>+</span>
                </div>
              </button>
              {open===i&&<div style={{padding:"0 22px 18px",fontSize:14,color:"var(--mu)",lineHeight:1.8,borderTop:"1px solid var(--bo)",paddingTop:14}}>
                {faq.a}
              </div>}
            </div>
          ))}
        </div>
        <div style={{textAlign:"center",marginTop:44}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:12,background:"white",border:"1.5px solid var(--bo)",borderRadius:16,padding:"16px 28px",boxShadow:"0 2px 12px rgba(0,0,0,.06)"}}>
            <span style={{fontSize:22}}>💬</span>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:14,fontWeight:500,color:"var(--ink)",marginBottom:2}}>{lang==="de"?"Noch Fragen?":lang==="fr"?"D'autres questions?":lang==="it"?"Altre domande?":"Still have questions?"}</div>
              <a href={`mailto:${email}`} style={{fontSize:13,color:"var(--em)",fontWeight:600,textDecoration:"none"}}>{email}</a>
            </div>
          </div>
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
// ══════════════════════════════════════════════════════════
// SPLASH SCREEN
// ══════════════════════════════════════════════════════════
function SplashScreen({ onDone }) {
  const [phase, setPhase] = React.useState(0);
  useEffect(() => {
    const t1 = setTimeout(()=>setPhase(1), 180);
    const t2 = setTimeout(()=>setPhase(2), 620);
    const t3 = setTimeout(()=>setPhase(3), 1100);
    const t4 = setTimeout(onDone, 2600);
    return () => { clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);clearTimeout(t4); };
  }, []);
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,overflow:"hidden",
      background:"#FAFAF8",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      transition:"opacity .5s ease",opacity:phase===3?0:1,pointerEvents:phase===3?"none":"auto"}}>
      <style>{`
        @keyframes spl-in{from{opacity:0;transform:scale(.72) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes spl-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spl-bar{from{width:0}to{width:100%}}
        @keyframes spl-dot{0%,80%,100%{transform:scale(.45);opacity:.2}40%{transform:scale(1);opacity:.9}}
        @keyframes spl-pulse{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.06);opacity:1}}
      `}</style>

      {/* Subtle dot grid */}
      <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(rgba(37,99,235,.055) 1px,transparent 1px)",backgroundSize:"28px 28px",pointerEvents:"none"}}/>

      {/* Blue glow behind icon */}
      {phase>=1&&<div style={{position:"absolute",width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(37,99,235,.1) 0%,transparent 70%)",pointerEvents:"none",animation:"spl-in .6s ease both"}}/>}

      {/* Icon */}
      <div style={{
        width:76,height:76,borderRadius:22,
        background:"linear-gradient(135deg,#2563EB,#1D4ED8)",
        display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,
        boxShadow:"0 8px 32px rgba(37,99,235,.28),0 2px 8px rgba(37,99,235,.15)",
        animation:"spl-in .5s cubic-bezier(.34,1.56,.64,1) both, spl-pulse 2.8s ease 0.6s infinite",
        marginBottom:22,position:"relative",zIndex:1
      }}>✦</div>

      {/* Brand name */}
      {phase>=1&&<div style={{
        fontFamily:"'Instrument Serif',Georgia,serif",
        fontSize:42,fontWeight:400,color:"#1A1A18",letterSpacing:"-1px",
        animation:"spl-up .45s cubic-bezier(.34,1.56,.64,1) both",
        marginBottom:6,position:"relative",zIndex:1
      }}>Stellify</div>}

      {/* Tagline */}
      {phase>=2&&<div style={{
        fontSize:12,fontWeight:400,color:"#5C5C58",letterSpacing:".07em",
        animation:"spl-up .38s ease both",marginBottom:26,position:"relative",zIndex:1
      }}>AI Career Copilot · 🇨🇭 Schweiz</div>}

      {/* Loading dots */}
      {phase>=2&&<div style={{display:"flex",gap:7,position:"relative",zIndex:1,animation:"spl-up .3s ease .05s both"}}>
        {[0,1,2].map(i=>(
          <div key={i} style={{width:7,height:7,borderRadius:"50%",background:"#2563EB",opacity:.25,animation:`spl-dot 1.2s ease-in-out ${i*.2}s infinite`}}/>
        ))}
      </div>}

      {/* Progress bar */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:"rgba(37,99,235,.08)"}}>
        <div style={{height:"100%",background:"linear-gradient(90deg,#2563EB,#818CF8,#06B6D4)",animation:"spl-bar 2.2s cubic-bezier(.4,0,.2,1) forwards"}}/>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// OFFLINE BANNER
// ══════════════════════════════════════════════════════════
function OfflineBanner({ lang }) {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const on  = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online",on); window.removeEventListener("offline",off); };
  }, []);
  if (!offline) return null;
  const msg = lang==="de"?"📡 Keine Internetverbindung – bitte Verbindung prüfen.":
              lang==="fr"?"📡 Pas de connexion – vérifiez votre réseau.":
              lang==="it"?"📡 Nessuna connessione – controlla la rete.":
              "📡 No internet connection – please check your network.";
  return (
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:8888,background:"linear-gradient(90deg,#dc2626,#b91c1c)",color:"white",textAlign:"center",padding:"10px 16px",fontSize:13,fontWeight:600,fontFamily:"var(--bd)"}}>
      {msg}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// REFERRAL PANEL
// ══════════════════════════════════════════════════════════
function ReferralPanel({ lang, session, onClose }) {
  const L=(d,e,f,i)=>({de:d,en:e,fr:f,it:i}[lang]||d);
  const code = session?.email ? genReferralCode(session.email) : "–";
  const link = `https://stellify.ch?ref=${code}`;
  const [copied, setCopied] = useState(false);
  const [refInput, setRefInput] = useState("");
  const [refMsg, setRefMsg] = useState("");

  const copy = () => {
    navigator.clipboard?.writeText(link).catch(()=>{});
    setCopied(true); setTimeout(()=>setCopied(false), 2000);
  };
  const applyCode = () => {
    if(!refInput.trim()) return;
    const res = applyReferral(refInput.trim().toUpperCase());
    setRefMsg(res.ok ? L(`✅ ${C.REFERRAL_DISCOUNT}% Rabatt aktiviert!`,`✅ ${C.REFERRAL_DISCOUNT}% discount activated!`,`✅ ${C.REFERRAL_DISCOUNT}% de réduction activé!`,`✅ ${C.REFERRAL_DISCOUNT}% di sconto attivato!`) : `❌ ${res.msg}`);
  };

  return (
    <div className="mbg" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="mod" style={{maxWidth:440,textAlign:"left"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{fontSize:20,margin:0}}>🎁 {L("Freunde einladen","Invite friends","Inviter des amis","Invita amici")}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,.4)",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",borderRadius:12,padding:"16px",marginBottom:16}}>
          <div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginBottom:8}}>{L("Dein persönlicher Einladungslink:","Your personal invite link:","Votre lien d'invitation:","Il tuo link di invito:")}</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{flex:1,fontSize:12,color:"var(--em)",wordBreak:"break-all",fontFamily:"monospace"}}>{link}</div>
            <button onClick={copy} className="btn b-em b-sm" style={{flexShrink:0}}>{copied?"✓":L("Kopieren","Copy","Copier","Copia")}</button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          <div style={{background:"rgba(255,255,255,.04)",borderRadius:10,padding:"14px",textAlign:"center"}}>
            <div style={{fontSize:24,fontWeight:800,color:"var(--em)"}}>1 Mt.</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginTop:4}}>{L("Gratis für dich","Free for you","Gratuit pour vous","Gratis per te")}</div>
          </div>
          <div style={{background:"rgba(255,255,255,.04)",borderRadius:10,padding:"14px",textAlign:"center"}}>
            <div style={{fontSize:24,fontWeight:800,color:"var(--am)"}}>-{C.REFERRAL_DISCOUNT}%</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginTop:4}}>{L("Rabatt für Freund","Discount for friend","Réduction pour l'ami","Sconto per l'amico")}</div>
          </div>
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,.08)",paddingTop:16,marginTop:4}}>
          <div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginBottom:8}}>{L("Hast du einen Code? Hier einlösen:","Have a code? Redeem here:","Vous avez un code? Saisissez-le ici:","Hai un codice? Riscattalo qui:")}</div>
          <div style={{display:"flex",gap:8}}>
            <input value={refInput} onChange={e=>setRefInput(e.target.value.toUpperCase())} placeholder="STF123ABC"
              style={{flex:1,padding:"9px 12px",borderRadius:9,border:"1.5px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.06)",color:"white",fontFamily:"monospace",fontSize:13,outline:"none",letterSpacing:"1px"}}/>
            <button onClick={applyCode} className="btn b-em b-sm">{L("Einlösen","Redeem","Utiliser","Riscatta")}</button>
          </div>
          {refMsg&&<div style={{fontSize:12,marginTop:8,color:refMsg.startsWith("✅")?"var(--em)":"#f87171"}}>{refMsg}</div>}
        </div>
        <button className="btn b-out b-sm" style={{width:"100%",marginTop:16,borderColor:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.4)"}} onClick={onClose}>{L("Schliessen","Close","Fermer","Chiudi")}</button>
      </div>
    </div>
  );
}


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

  // Chat-Verlauf State
  const [chats, setChats] = useState(() => loadChats());
  const [activeChatId, setActiveChatId] = useState(() => loadActiveChatId());

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
    // Vollständige Begrüssung für neue Chats
    const planLabel = authSession?.plan === "ultimate" ? "Ultimate" : authSession?.plan === "pro" ? "Pro" : "Free";
    const welcome = {r:"ai", t: L(
      `Hallo! Ich bin **Stella** ✨ – deine persönliche KI-Karriere-Assistentin von Stellify.\n\nIch freue mich riesig, dich an Bord zu haben! Egal ob du ein perfektes Motivationsschreiben brauchst, deinen Lebenslauf optimieren möchtest oder Fragen zum Schweizer Arbeitsmarkt hast – ich bin hier.\n\n**So startest du am besten:**\n1. **Wähle ein Tool** – Unsere Smart Forms unter [Tools](/app) erstellen Dokumente direkt für dich\n2. **Frag mich alles** – Karriere, Bewerbung, Gehalt, LinkedIn – ich helfe dir\n3. **Bleib im Überblick** – Dein Abo-Status: **${planLabel}**\n\nWie kann ich dir heute helfen? 🚀`,
      `Hi! I'm **Stella** ✨ – your personal AI career assistant from Stellify.\n\nI'm so excited to have you on board! Whether you need a perfect cover letter, want to optimize your CV, or have questions about the Swiss job market – I'm here.\n\n**Best way to get started:**\n1. **Choose a Tool** – Our Smart Forms at [Tools](/app) create documents directly for you\n2. **Ask me anything** – Career, applications, salary, LinkedIn – I'll help\n3. **Stay on top** – Your plan: **${planLabel}**\n\nHow can I help you today? 🚀`,
      `Bonjour! Je suis **Stella** ✨ – votre assistante IA carrière de Stellify.\n\nComment puis-je vous aider aujourd'hui? 🚀`,
      `Ciao! Sono **Stella** ✨ – la tua assistente IA carriera di Stellify.\n\nCome posso aiutarti oggi? 🚀`
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
    try { setCookieDone(!!localStorage.getItem("stf_cookie_v2")); } catch{}
    const iv = setInterval(()=>{ try { if(localStorage.getItem("stf_cookie_v2")) { setCookieDone(true); clearInterval(iv); } } catch{} },500);
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
  const isUltimatePlan = authSession?.plan === "ultimate" || authSession?.isAdmin;
  const isProPlan = pro && !isUltimatePlan;
  const isFreePlan = isLoggedIn && !isProPlan && !isUltimatePlan;
  // Ultimate: no limit. Pro: 25 questions/day. Free: blocked from technical questions. Non-logged: SYSTEM_PUBLIC.
  const canChat = !isLoggedIn || isUltimatePlan || chatUsage < C.CHAT_FREE_LIMIT;
  const needsUpgrade = isLoggedIn && isProPlan && chatUsage >= C.CHAT_FREE_LIMIT;

  // System-Prompt für nicht eingeloggte User: nur Seiten-Infos
  const SYSTEM_PUBLIC = `Du bist Stella, die freundliche KI-Assistentin von Stellify – dem Schweizer AI Career Copilot. Du beantwortest NUR Fragen zu Stellify, seinen Tools, Funktionen und Abonnements.

Stellify-Tools (20+): ✍️ Bewerbungen (1× gratis), 💼 LinkedIn Optimierung, 🤖 ATS-Simulation, 📜 Zeugnis-Analyse, 🎯 Job-Matching, 🎤 Interview-Coach, 📊 Excel-Generator, 📽️ PowerPoint-Maker, 💰 Gehaltsverhandlung, 🤝 Networking-Nachricht, 📤 Kündigung, 🗓️ 30-60-90-Plan, 📚 Lernplan, ✉️ E-Mail-Assistent und weitere.

Preise: Gratis (1 Bewerbung, kein Abo), Pro CHF 14.90/Mo. jährlich (CHF 178.80/Jahr), Ultimate CHF 39.90/Mo. jährlich (CHF 478.80/Jahr). Alle Pläne jederzeit kündbar via Stripe. Twint, Kreditkarte, Apple Pay akzeptiert.

WICHTIG: Wenn jemand konkrete Karriere-Fragen stellt (Bewerbung schreiben, Lohnverhandlung, Zeugnis deuten usw.), antworte freundlich: "Das ist eine spannende Fachfrage! Um dir hierbei mit voller Experten-Präzision zu helfen, benötigst du ein Stellify-Konto. Registriere dich jetzt gratis – deine erste Bewerbung ist kostenlos!" Beantworte keine konkreten Karrierefragen ohne Login.`;

  // System-Prompt für Free-Tier User (eingeloggt, aber kein Pro/Ultimate)
  const SYSTEM_FREE = `Du bist Stella, die freundliche KI-Assistentin von Stellify – dem Schweizer AI Career Copilot. Der User ist eingeloggt aber hat den kostenlosen Plan.

Du darfst IMMER beantworten:
- Fragen zu Stellify, seinen Tools, Preisen und Funktionen
- Allgemeine Informationen zum Schweizer Arbeitsmarkt (kurze Überblicks-Antworten)
- Hilfe bei der Navigation und den Features der Plattform

Du MUSST ablehnen (mit Upgrade-Hinweis) bei:
- Konkreten Bewerbungs-Texten schreiben (Motivationsschreiben, Lebenslauf-Formulierungen)
- Spezifischen Gehaltsverhandlungs-Strategien oder Lohnanalysen
- Tiefgehender Karriereberatung, Fachfragen aus Bereichen wie Recht, Finanzen, IT, Medizin
- Erstellung von Excel-Tabellen, PowerPoint-Präsentationen, LinkedIn-Posts
- Zeugnis-Interpretation oder ATS-Optimierung für konkrete Stellen

Wenn jemand eine fachspezifische Anfrage stellt, antworte IMMER so (passe den Text dem Kontext an):
"Das ist eine spannende Fachfrage! 🚀 Um dir hierbei mit voller Experten-Präzision zu helfen und tiefere Analysen zu erstellen, benötigst du Stellify Pro. Mit Pro schalte ich mein gesamtes Fachwissen für dich frei – inklusive ${C.PRO_LIMIT} Erstellungen pro Woche und 25 Fragen täglich. Upgrade jetzt für CHF 14.90/Mo. und starte sofort!"

Preise: Pro CHF 19.90/Mo. oder CHF 14.90/Mo. jährlich. Ultimate CHF 49.90/Mo. oder CHF 39.90/Mo. jährlich. Jederzeit kündbar.`;

  const SYSTEM_FULL = `Du bist Stella, die KI-Karriere-Assistentin von Stellify. Du hast tiefes Wissen über Karriere, Bewerbungen, den Schweizer Arbeitsmarkt und Produktivität.

Dein Wissen umfasst: Schweizer Bewerbungsunterlagen (Motivationsschreiben, Lebenslauf mit Foto oben rechts, 1-2 Seiten), ATS-Optimierung, Schweizer Arbeitsrecht (Kündigungsfristen, Sperrfristen, Zeugnis-Code: "stets zu vollsten Zufriedenheit"=sehr gut), Gehälter nach Branche/Erfahrung, LinkedIn-Optimierung, Interview-Vorbereitung (STAR-Methode), Gehaltsverhandlungs-Taktiken, Schweizer Bildungssystem (EFZ, EBA, FH, Uni, CAS/MAS).

🇨🇭 SCHWEIZER LEHRSTELLENWISSEN (besonders wichtig!):
- Immer "Lehrstelle" (nie "Ausbildungsplatz"), "Lernende*r" (nie "Azubi"), "Motivationsschreiben" (nie "Anschreiben"), "Berufslehre" (nie "Ausbildung")
- Schnupperlehre ist der WICHTIGSTE Teil einer Lehrstellenbewerbung in der Schweiz – fast niemand bekommt eine Lehrstelle ohne vorheriges Schnuppern. Immer Datum + Betrieb + konkretes Erlebnis + Fazit erwähnen.
- Swiss-Apprentice CV-Format: Kopfzeile Name links, Foto oben rechts, Schnupperlehren-Sektion als zweite Sektion (nach persönlichen Daten), Noten (Mathe/Deutsch/Englisch) separat ausweisen, Referenzen (Lehrer, Schnupperlehre-Betreuer)
- Motivationsschreiben-Struktur: Einleitung (Bezug Berufsmesse/Schnuppern) → HT1 (Motivation/Talent) → HT2 (Warum diese Firma) → HT3 WICHTIGSTER TEIL: Schnupperlehre mit Details → Schluss (Interview-Einladung)
- Format: Datum rechtsbündig "Ort, DD. Monat JJJJ", Betreff fett "Bewerbung als Lernende*r [Beruf] EFZ/EBA", Schweizer Rechtschreibung (kein ß → ss)
- Multicheck / Basic-Check: Viele Firmen (v.a. grosse) verlangen diese Tests. Tipp: Multicheck-Übungshefte, Zeitmanagement üben
- Typische Lehrberufe Schweiz: Kaufmann/-frau EFZ, Informatiker EFZ, Detailhandelsfachmann/-frau EFZ, Polymechaniker EFZ, Mediamatiker EFZ, Fachmann/-frau Gesundheit EFZ (FaGe), Coiffeur/-euse EFZ
- EFZ = Eidgenössisches Fähigkeitszeugnis (3-4 Jahre), EBA = Eidgenössisches Berufsattest (2 Jahre)
- Berufsmessen Schweiz: Berufsmesse Zürich (Oktober), Didacta, Gibb Bern, Sprungbrett Basel

Tools von Stellify:
✍️ Bewerbungen (1× gratis), 💼 LinkedIn Optimierung, 🤖 ATS-Simulation, 📜 Zeugnis-Analyse, 🎯 Job-Matching, 🎤 Interview-Coach, 📊 Excel-Generator, 📽️ PowerPoint-Maker, 💰 Gehaltsverhandlung, 🤝 Networking-Nachricht, 📤 Kündigung schreiben, 🗓️ 30-60-90-Tage-Plan, 🏆 Referenzschreiben, 📚 Lernplan, 📝 Zusammenfassung, 🎓 Lehrstelle, ✉️ E-Mail, 📋 Protokoll, 🌍 Übersetzer, 💰 KI-Gehaltsrechner Schweiz, 📋 Bewerbungs-Tracker, ✍️ LinkedIn-Post Generator

Verhalten: Antworte konkret und umsetzbar (max. 3-4 Sätze im Widget). Schreib Beispieltexte direkt aus wenn gefragt. Empfehle Tool-Namen exakt wie oben damit Links funktionieren. Sei warm, direkt, wie ein erfahrener Karriere-Coach. Du bist Profi – keine Limits, keine Einschränkungen für diesen User.`;

  const SYSTEM = isUltimatePlan ? SYSTEM_FULL : isProPlan ? SYSTEM_FULL : isFreePlan ? SYSTEM_FREE : SYSTEM_PUBLIC;

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
    let remaining = text;
    Object.entries(TOOL_MAP).forEach(([key,[label,page]])=>{
      remaining = remaining.replace(new RegExp(`(${label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`, "gi"),
        `<TOOL:${page}:${label}>`);
    });
    const segments = remaining.split(/(<TOOL:[^>]+>)/);
    const hasUpgradeCue = !pro && /Pro\b|upgraden|upgrade|CHF 14[\.,]90|CHF 19[\.,]90|Pro schalte|benötigst.*Pro|Pro.*freischalten/i.test(text);
    return <>
      {segments.map((seg,i)=>{
        const m = seg.match(/^<TOOL:([^:]+):(.+)>$/);
        if(m) return <button key={i} onClick={()=>{setOpen(false);navTo(m[1]);}}
          style={{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(16,185,129,.15)",border:"1px solid rgba(16,185,129,.3)",borderRadius:8,padding:"2px 9px",fontSize:12,fontWeight:700,color:"var(--em)",cursor:"pointer",margin:"1px 2px"}}>
          {m[2]} →</button>;
        return <span key={i}>{seg}</span>;
      })}
      {hasUpgradeCue&&<div style={{marginTop:10}}>
        <button onClick={()=>{setOpen(false);window.open(C.stripeMonthly,"_blank");}}
          style={{display:"inline-flex",alignItems:"center",gap:6,background:"linear-gradient(135deg,#10b981,#059669)",color:"white",border:"none",borderRadius:10,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 12px rgba(16,185,129,.35)"}}>
          🚀 {L("Pro upgraden – CHF 19.90/Mo.","Upgrade to Pro – CHF 19.90/mo","Passer Pro – CHF 19.90/mo","Aggiorna Pro – CHF 19.90/me")} →
        </button>
      </div>}
    </>;
  };

  const send = async () => {
    if(!input.trim()||loading) return;
    if(needsUpgrade){ setPw(true); return; }
    const userMsg = input.trim();
    setInput("");
    const newMsgs = [...msgs, {r:"u", t:userMsg}];
    setMsgs(newMsgs);
    setLoading(true);
    if(isLoggedIn && !pro){ incChat(); setChatUsage(c=>c+1); }
    try {
      const apiMsgs = [];
      for(const m of newMsgs) {
        const role = m.r==="u" ? "user" : "assistant";
        if(apiMsgs.length > 0 && apiMsgs[apiMsgs.length-1].role === role) continue;
        apiMsgs.push({role, content: m.t});
      }
      while(apiMsgs.length && apiMsgs[0].role !== "user") apiMsgs.shift();
      const finalMsgs = apiMsgs.slice(-10);
      const msgsWithSystem = [{role:"system",content:SYSTEM}, ...finalMsgs];
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: groqHeaders(),
        body: JSON.stringify({ model: C.MODEL_FAST, max_tokens: 600, messages: msgsWithSystem })
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
    if (!open && msgs.length === 0 && !activeChatId) {
      newChat();
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
    {/* ── CHAT WINDOW ── */}
    {open&&(
      <div style={{position:"fixed",bottom:96,right:24,width:440,maxWidth:"calc(100vw - 32px)",height:"min(640px,calc(100vh - 110px))",background:"#08081a",border:"1px solid rgba(255,255,255,.09)",borderRadius:24,boxShadow:"0 40px 100px rgba(0,0,0,.75),0 0 0 1px rgba(16,185,129,.06) inset",zIndex:1000,display:"flex",flexDirection:"column",overflow:"hidden",animation:"chatIn .28s cubic-bezier(.34,1.2,.64,1)"}}>

        {/* ── HEADER ── */}
        <div style={{background:"linear-gradient(180deg,rgba(16,185,129,.1) 0%,transparent 100%)",borderBottom:"1px solid rgba(255,255,255,.06)",padding:"14px 16px 12px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{position:"relative",flexShrink:0}}>
            <div style={{width:40,height:40,background:"linear-gradient(135deg,#10b981 0%,#059669 100%)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 0 0 2.5px rgba(16,185,129,.2),0 4px 16px rgba(16,185,129,.35)"}}>✦</div>
            <div style={{position:"absolute",bottom:1,right:1,width:10,height:10,borderRadius:"50%",background:"#22c55e",border:"2.5px solid #08081a",boxShadow:"0 0 8px #22c55e"}}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"var(--hd)",fontSize:15,fontWeight:800,color:"white",letterSpacing:"-.4px",lineHeight:1.2}}>Stella</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.3)",marginTop:1,letterSpacing:.2}}>
              {L("KI-Karriere-Assistentin · Stellify","AI Career Assistant · Stellify","Assistante IA · Stellify","Assistente IA · Stellify")}
            </div>
          </div>
          {/* Plan badge */}
          {authSession&&<div style={{fontSize:10,fontWeight:700,letterSpacing:.5,padding:"3px 9px",borderRadius:99,background:isUltimatePlan?"rgba(245,158,11,.15)":"rgba(16,185,129,.12)",color:isUltimatePlan?"#f59e0b":"var(--em)",border:`1px solid ${isUltimatePlan?"rgba(245,158,11,.25)":"rgba(16,185,129,.2)"}`}}>
            {isUltimatePlan?"ULTIMATE":"PRO"}
          </div>}
          {/* New chat */}
          <button onClick={newChat} title={L("Neuer Chat","New chat","Nouveau chat","Nuova chat")}
            style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.07)",borderRadius:10,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"rgba(255,255,255,.4)",flexShrink:0,transition:"all .18s",fontSize:14}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.1)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"}>✎</button>
          {/* Close */}
          <button onClick={()=>setOpen(false)}
            style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.07)",borderRadius:10,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"rgba(255,255,255,.4)",flexShrink:0,transition:"all .18s",fontSize:13}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.1)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"}>✕</button>
        </div>

        {/* ── CHAT HISTORY (always visible, collapsible) ── */}
        <div style={{borderBottom:"1px solid rgba(255,255,255,.05)",background:"rgba(0,0,8,.4)",flexShrink:0}}>
          <button onClick={()=>setShowHistory(h=>!h)}
            style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:"8px 16px",display:"flex",alignItems:"center",gap:8,color:"rgba(255,255,255,.3)",fontFamily:"var(--bd)",fontSize:11,fontWeight:600,letterSpacing:.5}}>
            <span style={{color:"rgba(255,255,255,.2)",fontSize:12}}>⏱</span>
            <span style={{flex:1,textAlign:"left",textTransform:"uppercase",letterSpacing:1}}>{L("Chat-Verlauf","History","Historique","Cronologia")} {chats.length>0&&`(${chats.length})`}</span>
            <span style={{fontSize:10,transform:showHistory?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
          </button>
          {showHistory&&<div style={{maxHeight:180,overflowY:"auto",padding:"0 0 6px"}}>
            {chats.length===0&&<div style={{padding:"12px 16px",fontSize:12,color:"rgba(255,255,255,.2)",textAlign:"center"}}>{L("Noch keine Chats","No chats yet","Pas de chats","Nessuna chat")}</div>}
            {chats.map(chat=>(
              <div key={chat.id} onClick={()=>switchChat(chat.id)}
                style={{display:"flex",alignItems:"center",gap:10,padding:"9px 16px",cursor:"pointer",background:chat.id===activeChatId?"rgba(16,185,129,.08)":"transparent",borderLeft:`2px solid ${chat.id===activeChatId?"var(--em)":"transparent"}`,transition:"all .12s"}}
                onMouseEnter={e=>{if(chat.id!==activeChatId)e.currentTarget.style.background="rgba(255,255,255,.03)";}}
                onMouseLeave={e=>{if(chat.id!==activeChatId)e.currentTarget.style.background="transparent";}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:chat.id===activeChatId?"var(--em)":"rgba(255,255,255,.18)",flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:chat.id===activeChatId?"rgba(255,255,255,.9)":"rgba(255,255,255,.5)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{chat.title||"Chat"}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.18)",marginTop:1}}>{fmtDate(chat.ts)}</div>
                </div>
                <button onClick={e=>deleteChat(chat.id,e)} style={{background:"none",border:"none",color:"rgba(255,255,255,.12)",cursor:"pointer",fontSize:11,padding:"2px 4px",borderRadius:4,transition:"color .12s"}}
                  onMouseEnter={e=>e.currentTarget.style.color="#ef4444"} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,.12)"}>✕</button>
              </div>
            ))}
          </div>}
        </div>

        {/* ── LOGIN GATE ── */}
        {needsLogin ? (
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 28px",textAlign:"center",gap:20}}>
            <div style={{width:64,height:64,background:"linear-gradient(135deg,#10b981,#059669)",borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,boxShadow:"0 12px 32px rgba(16,185,129,.35)"}}>✦</div>
            <div>
              <div style={{fontFamily:"var(--hd)",fontSize:18,fontWeight:800,color:"white",marginBottom:8,letterSpacing:"-.4px"}}>
                {L("Mit Stella chatten","Chat with Stella","Discuter avec Stella","Chatta con Stella")}
              </div>
              <div style={{fontSize:13,color:"rgba(255,255,255,.35)",lineHeight:1.75,maxWidth:280}}>
                {L("Registriere dich gratis und erhalte sofort Zugang zu persönlicher KI-Karriereberatung.","Sign up free and get instant access to personal AI career coaching.","Inscrivez-vous gratuitement pour accéder aux conseils IA personnalisés.","Registrati gratis per la consulenza di carriera IA personale.")}
              </div>
            </div>
            <button onClick={()=>onAuthOpen&&onAuthOpen()} style={{background:"linear-gradient(135deg,#10b981,#059669)",color:"white",border:"none",borderRadius:14,padding:"13px 32px",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 6px 20px rgba(16,185,129,.4)",width:"100%"}}>
              {L("Gratis registrieren →","Sign up for free →","S'inscrire gratuitement →","Registrati gratis →")}
            </button>
            <div style={{fontSize:11,color:"rgba(255,255,255,.15)"}}>
              {L("Kein Abo · Keine Kreditkarte · Sofort starten","No subscription · No credit card · Start instantly","Sans abonnement · Sans carte","Senza abbonamento · Senza carta")}
            </div>
          </div>
        ) : (
          <>
            {/* ── MESSAGES ── */}
            <div style={{flex:1,overflowY:"auto",padding:"18px 16px",display:"flex",flexDirection:"column",gap:14,scrollbarWidth:"thin",scrollbarColor:"rgba(255,255,255,.06) transparent"}}>
              {msgs.map((m,i)=>(
                <div key={i} style={{display:"flex",gap:10,flexDirection:m.r==="u"?"row-reverse":"row",alignItems:"flex-end"}}>
                  {m.r==="ai"&&<div style={{width:28,height:28,background:"linear-gradient(135deg,#10b981,#059669)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0,boxShadow:"0 2px 10px rgba(16,185,129,.35)"}}>✦</div>}
                  <div style={{maxWidth:"78%",background:m.r==="u"?"linear-gradient(135deg,rgba(16,185,129,.2),rgba(16,185,129,.1))":"rgba(255,255,255,.05)",border:`1px solid ${m.r==="u"?"rgba(16,185,129,.25)":"rgba(255,255,255,.07)"}`,borderRadius:m.r==="u"?"18px 18px 4px 18px":"4px 18px 18px 18px",padding:"11px 15px",fontSize:13.5,color:m.r==="u"?"rgba(255,255,255,.92)":"rgba(255,255,255,.82)",lineHeight:1.7,letterSpacing:"-.1px",wordBreak:"break-word"}}>
                    {m.r==="ai"?renderMsg(m.t):m.t}
                  </div>
                  {m.r==="u"&&authSession&&<div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,rgba(16,185,129,.3),rgba(16,185,129,.1))",border:"1px solid rgba(16,185,129,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"var(--em)",flexShrink:0}}>{authSession.email[0].toUpperCase()}</div>}
                </div>
              ))}
              {loading&&(
                <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
                  <div style={{width:28,height:28,background:"linear-gradient(135deg,#10b981,#059669)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0}}>✦</div>
                  <div style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.07)",borderRadius:"4px 18px 18px 18px",padding:"13px 18px",display:"flex",gap:5,alignItems:"center"}}>
                    {[0,1,2].map(j=><div key={j} style={{width:5,height:5,borderRadius:"50%",background:"var(--em)",animation:`pulse 1.3s ease-in-out ${j*0.22}s infinite`}}/>)}
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* ── UPGRADE BANNER (Pro limit reached) ── */}
            {needsUpgrade&&(
              <div style={{padding:"12px 16px",background:"rgba(245,158,11,.06)",borderTop:"1px solid rgba(245,158,11,.1)",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#f59e0b",marginBottom:2}}>{L("Limit erreicht","Limit reached","Limite atteint","Limite raggiunto")}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.35)",lineHeight:1.4}}>{L("Upgrade auf Ultimate für unlimitierte Karriereberatung","Upgrade to Ultimate for unlimited career coaching","Passez à Ultimate pour un coaching illimité","Passa a Ultimate per coaching illimitato")}</div>
                </div>
                <button onClick={()=>setPw(true)} style={{background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"white",border:"none",borderRadius:10,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 12px rgba(245,158,11,.35)",flexShrink:0,whiteSpace:"nowrap"}}>
                  Ultimate →
                </button>
              </div>
            )}

            {/* ── SIGNUP HINT (not logged in) ── */}
            {!isLoggedIn&&(
              <div style={{padding:"10px 16px",background:"rgba(16,185,129,.04)",borderTop:"1px solid rgba(16,185,129,.07)",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                <div style={{fontSize:11,color:"rgba(255,255,255,.28)",lineHeight:1.5,flex:1}}>{L("Für persönliche Karriere-Beratung anmelden","Sign in for personal career coaching","Se connecter pour le coaching","Accedi per il coaching personale")}</div>
                <button onClick={()=>onAuthOpen&&onAuthOpen()} style={{background:"var(--em)",color:"white",border:"none",borderRadius:8,padding:"6px 14px",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
                  {L("Gratis →","Free →","Gratuit →","Gratis →")}
                </button>
              </div>
            )}

            {/* ── INPUT ── */}
            <div style={{borderTop:"1px solid rgba(255,255,255,.05)",padding:"12px 14px 14px",background:"rgba(4,4,14,.6)",flexShrink:0}}>
              <div style={{display:"flex",gap:8,alignItems:"flex-end",background:"rgba(255,255,255,.06)",border:`1px solid ${needsUpgrade?"rgba(245,158,11,.2)":"rgba(255,255,255,.08)"}`,borderRadius:18,padding:"10px 10px 10px 16px",transition:"border-color .2s"}}
                onFocusCapture={e=>e.currentTarget.style.borderColor=needsUpgrade?"rgba(245,158,11,.3)":"rgba(16,185,129,.25)"}
                onBlurCapture={e=>e.currentTarget.style.borderColor=needsUpgrade?"rgba(245,158,11,.2)":"rgba(255,255,255,.08)"}>
                <textarea value={input} onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!loading&&canChat){e.preventDefault();send();}}}
                  placeholder={needsUpgrade ? L("Upgrade für weitere Fragen","Upgrade for more questions","Passez à l'offre supérieure","Aggiorna per altre domande") : L("Frag Stella etwas…","Ask Stella anything…","Demandez à Stella…","Chiedi a Stella…")}
                  disabled={needsUpgrade||loading}
                  style={{flex:1,background:"none",border:"none",color:"rgba(255,255,255,.88)",fontSize:14,resize:"none",minHeight:22,maxHeight:100,outline:"none",lineHeight:1.6,padding:0,fontFamily:"var(--bd)"}}
                  rows={1}/>
                <button onClick={send} disabled={!input.trim()||loading||needsUpgrade}
                  style={{width:36,height:36,borderRadius:12,background:input.trim()&&!needsUpgrade?"linear-gradient(135deg,#10b981,#059669)":"rgba(255,255,255,.05)",border:"none",cursor:input.trim()&&!needsUpgrade?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,transition:"all .2s",boxShadow:input.trim()&&!needsUpgrade?"0 3px 12px rgba(16,185,129,.45)":"none"}}>
                  {loading ? <div style={{width:14,height:14,borderRadius:"50%",border:"2px solid rgba(255,255,255,.2)",borderTopColor:"var(--em)",animation:"spin .7s linear infinite"}}/> : <span style={{color:input.trim()&&!needsUpgrade?"white":"rgba(255,255,255,.2)"}}>↑</span>}
                </button>
              </div>
              <div style={{textAlign:"center",fontSize:10,color:"rgba(255,255,255,.1)",marginTop:8,letterSpacing:.2}}>
                {L("Stella kann Fehler machen – wichtige Entscheidungen selbst prüfen","Stella may make mistakes – verify important decisions","Stella peut se tromper – vérifiez les décisions importantes","Stella può sbagliare – verifica le decisioni importanti")}
              </div>
            </div>
          </>
        )}
      </div>
    )}

    <style>{`
      @keyframes pulse{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.4);opacity:1}}
      @keyframes fadeSlideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
      @keyframes chatIn{from{opacity:0;transform:scale(.95) translateY(12px)}to{opacity:1;transform:none}}
      @keyframes chatPulse{0%{transform:scale(1);opacity:.55}70%{transform:scale(1.28);opacity:0}100%{transform:scale(1.28);opacity:0}}
      @keyframes spin{to{transform:rotate(360deg)}}
    `}</style>
  </>);
}
// ════════════════════════════════════════
// 📋 BEWERBUNGS-TRACKER (inkl. RAV-Export)
const TRACKER_KEY = "stf_tracker_v2";
function loadTrackerJobs() { try { const r=localStorage.getItem(TRACKER_KEY); return r?JSON.parse(r):[]; } catch { return []; } }
function saveTrackerJobs(jobs) { try { localStorage.setItem(TRACKER_KEY,JSON.stringify(jobs)); } catch {} }

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
  const ART = ["Schriftlich (E-Mail/Portal)","Telefonisch","Persönlich (Spontanbesuch)","Brief (Post)","Online-Formular"];
  const ERGEBNIS = ["Ausstehend","Einladung zum Interview","Absage erhalten","Angebot erhalten","Kein Feedback"];

  const [jobs, setJobs] = useState(()=>{ const saved=loadTrackerJobs(); return saved.length>0?saved:[
    {id:1, firma:"Migros", ort:"Zürich", stelle:"Product Manager", kontakt:"Personalabteilung", art:"Schriftlich (E-Mail/Portal)", datum:"2026-02-15", status:"interview", ergebnis:"Einladung zum Interview", prio:"hoch", notiz:"2. Interview am 20.3."},
    {id:2, firma:"Swiss Re", ort:"Zürich", stelle:"Risk Analyst", kontakt:"", art:"Online-Formular", datum:"2026-02-20", status:"pruefung", ergebnis:"Ausstehend", prio:"mittel", notiz:""},
    {id:3, firma:"Nestlé", ort:"Vevey", stelle:"Marketing Manager", kontakt:"hr@nestle.com", art:"Schriftlich (E-Mail/Portal)", datum:"2026-03-01", status:"beworben", ergebnis:"Ausstehend", prio:"tief", notiz:"Über LinkedIn beworben"},
  ]; });
  const [filter, setFilter] = useState("alle");
  const [modal, setModal] = useState(null);
  const emptyForm = {firma:"",ort:"",stelle:"",kontakt:"",art:"Schriftlich (E-Mail/Portal)",datum:new Date().toISOString().slice(0,10),status:"beworben",ergebnis:"Ausstehend",prio:"mittel",notiz:""};
  const [form, setForm] = useState(emptyForm);

  // Persist to localStorage whenever jobs change
  useEffect(()=>{ saveTrackerJobs(jobs); },[jobs]);

  const filtered = filter==="alle" ? jobs : jobs.filter(j=>j.status===filter);
  const stats = Object.keys(STATUS).map(k=>({key:k, label:STATUS[k][lang]||STATUS[k].de, count:jobs.filter(j=>j.status===k).length, col:STATUS[k].col}));

  function openAdd() { setForm({...emptyForm,datum:new Date().toISOString().slice(0,10)}); setModal({mode:"add"}); }
  function openEdit(job) { setForm({...emptyForm,...job}); setModal({mode:"edit",job}); }
  function save() {
    if(!form.firma||!form.stelle) return;
    if(modal.mode==="add") setJobs(j=>[...j,{...form,id:Date.now()}]);
    else setJobs(j=>j.map(x=>x.id===modal.job.id?{...form,id:x.id}:x));
    setModal(null);
  }
  function del(id) { setJobs(j=>j.filter(x=>x.id!==id)); }
  function changeStatus(id,st) { setJobs(j=>j.map(x=>x.id===id?{...x,status:st}:x)); }

  // RAV PDF Export (Nachweis der persönlichen Arbeitsbemühungen – SECO)
  function exportRAV() {
    const month = new Date().toLocaleDateString("de-CH",{month:"long",year:"numeric"});
    const rows = jobs.map((j,i)=>`| ${String(i+1).padStart(2," ")} | ${j.datum||"-"} | ${j.firma||"-"} | ${j.ort||"-"} | ${j.stelle||"-"} | ${j.art||"-"} | ${j.kontakt||"Personalabteilung"} | ${j.ergebnis||"Ausstehend"} |`).join("\n");
    const txt = `NACHWEIS DER PERSÖNLICHEN ARBEITSBEMÜHUNGEN
Formular gemäss SECO / ALK – Monat: ${month}
Erstellt mit Stellify.ch | Datum: ${new Date().toLocaleDateString("de-CH")}
════════════════════════════════════════════════════════════════

Nr. | Datum       | Firma              | Ort       | Stelle/Funktion        | Art der Bewerbung           | Kontaktperson       | Ergebnis
----+-------------+--------------------+-----------+------------------------+-----------------------------+---------------------+-------------------
${jobs.map((j,i)=>`${String(i+1).padStart(3," ")} | ${(j.datum||"-").padEnd(11," ")} | ${(j.firma||"-").padEnd(18," ")} | ${(j.ort||"-").padEnd(9," ")} | ${(j.stelle||"-").padEnd(22," ")} | ${(j.art||"-").padEnd(27," ")} | ${(j.kontakt||"Personalabteilung").padEnd(19," ")} | ${j.ergebnis||"Ausstehend"}`).join("\n")}

TOTAL BEWERBUNGEN DIESEN MONAT: ${jobs.length}

Unterschrift: ________________________    Datum: ________________

════════════════════════════════════════════════════════════════
Hinweis: Dieses Dokument wurde automatisch generiert.
Bitte beim RAV-Berater / der RAV-Beraterin abgeben.
Pflichtfelder gemäss ALV Art. 17: Datum, Firma, Ort, Funktion, Art der Bewerbung, Kontaktperson.
`;
    const blob = new Blob([txt],{type:"text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download=`RAV-Nachweis-${new Date().toISOString().slice(0,7)}.txt`;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); document.body.removeChild(a); },300);
  }

  const prioCol = {hoch:"#ef4444",mittel:"#f59e0b",tief:"#6b7280"};

  return (
    <div style={{minHeight:"80vh",background:"var(--bg)"}}>
      {/* Header */}
      <div className="page-hdr dk" style={{paddingBottom:32}}>
        <div className="con" style={{maxWidth:900}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <button onClick={()=>navTo("landing")} style={{background:"rgba(0,0,0,.06)",border:"1px solid var(--bo)",color:"var(--mu)",borderRadius:8,padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:"var(--bd)"}}>← {L("Zurück","Back","Retour","Indietro")}</button>
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

          {/* Add + RAV Export buttons */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
            <div style={{fontSize:13,color:"var(--mu)"}}>{filtered.length} {L("Einträge","entries","entrées","voci")}</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <button className="btn b-sm" style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.25)",color:"#dc2626",fontWeight:700}} onClick={exportRAV}>
                📄 {L("RAV-Nachweis exportieren","Export RAV proof","Exporter preuve RAV","Esporta prova RAV")}
              </button>
              <button className="btn b-em b-sm" onClick={openAdd}>+ {L("Neue Bewerbung","New application","Nouvelle candidature","Nuova candidatura")}</button>
            </div>
          </div>
          <div style={{background:"rgba(239,68,68,.05)",border:"1px solid rgba(239,68,68,.12)",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#b91c1c"}}>
            💡 {L(`RAV-Pflichtfelder: Datum, Firma, Ort, Stelle, Art der Bewerbung, Kontaktperson. Exportiere am Monatsende den "Nachweis der persönlichen Arbeitsbemühungen" (SECO).`,`RAV required fields: date, company, location, position, type, contact. Export the monthly proof at month-end.`,`Champs RAV obligatoires: date, entreprise, lieu, poste, type, contact. Exportez le justificatif mensuel.`,`Campi RAV obbligatori: data, azienda, luogo, posizione, tipo, contatto. Esporta la prova mensile.`)}
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
                <div style={{fontSize:13,color:"var(--mu)",marginBottom:4}}>{job.firma}{job.ort?` · ${job.ort}`:""} · {job.datum}</div>
                {job.art&&<div style={{fontSize:11,color:"rgba(59,130,246,.8)",background:"rgba(59,130,246,.08)",borderRadius:5,padding:"2px 8px",display:"inline-block",marginBottom:job.kontakt||job.notiz?4:0}}>{job.art}</div>}
                {job.kontakt&&<div style={{fontSize:11,color:"var(--mu)",display:"block",marginBottom:job.notiz?4:0}}>👤 {job.kontakt}</div>}
                {job.ergebnis&&job.ergebnis!=="Ausstehend"&&<div style={{fontSize:11,color:"#059669",background:"rgba(5,150,105,.08)",borderRadius:5,padding:"2px 8px",display:"inline-block",marginBottom:job.notiz?4:0}}>{job.ergebnis}</div>}
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
            <div style={{background:"rgba(239,68,68,.05)",border:"1px solid rgba(239,68,68,.12)",borderRadius:8,padding:"8px 12px",fontSize:11.5,color:"#b91c1c",marginBottom:14}}>
              📄 {L("RAV-Pflichtfelder: Firma, Ort, Stelle, Art der Bewerbung und Kontaktperson werden für den SECO-Export benötigt.","RAV required: Company, location, position, type and contact are needed for the SECO export.","Champs RAV obligatoires pour l'export SECO.","Campi RAV obbligatori per l'export SECO.")}
            </div>
            <div className="fg2" style={{textAlign:"left"}}>
              <div className="field"><label>{L("Stelle / Funktion *","Position *","Poste *","Posizione *")}</label><input value={form.stelle} onChange={e=>setForm(f=>({...f,stelle:e.target.value}))} placeholder={L("z.B. Informatiker EFZ (Systemtechnik)","e.g. Commercial Employee EFZ","ex. Employée de commerce AFC","es. Impiegata di commercio AFC")}/></div>
              <div className="field"><label>{L("Firma *","Company *","Entreprise *","Azienda *")}</label><input value={form.firma} onChange={e=>setForm(f=>({...f,firma:e.target.value}))} placeholder={L("z.B. Swisscom AG","e.g. Swisscom AG","ex. Swisscom SA","es. Swisscom SA")}/></div>
              <div className="field"><label>{L("Ort (RAV-Pflicht)","Location (RAV)","Lieu (RAV)","Luogo (RAV)")}</label><input value={form.ort||""} onChange={e=>setForm(f=>({...f,ort:e.target.value}))} placeholder={L("z.B. Zürich","e.g. Zurich","ex. Zurich","es. Zurigo")}/></div>
              <div className="field"><label>{L("Kontaktperson (RAV-Pflicht)","Contact person (RAV)","Personne de contact (RAV)","Persona di contatto (RAV)")}</label><input value={form.kontakt||""} onChange={e=>setForm(f=>({...f,kontakt:e.target.value}))} placeholder={L("z.B. Personalabteilung, Frau Müller","e.g. HR department","ex. Service RH","es. Ufficio HR")}/></div>
              <div className="field"><label>{L("Art der Bewerbung (RAV-Pflicht)","Application type (RAV)","Type candidature (RAV)","Tipo candidatura (RAV)")}</label>
                <select value={form.art||"Schriftlich (E-Mail/Portal)"} onChange={e=>setForm(f=>({...f,art:e.target.value}))} style={{width:"100%",padding:"10px 13px",border:"1.5px solid var(--bo)",borderRadius:10,fontFamily:"var(--bd)",fontSize:14,background:"#fafafa"}}>
                  {ART.map(a=><option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="field"><label>{L("Datum","Date","Date","Data")}</label><input type="date" value={form.datum} onChange={e=>setForm(f=>({...f,datum:e.target.value}))}/></div>
              <div className="field"><label>Status</label>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={{width:"100%",padding:"10px 13px",border:"1.5px solid var(--bo)",borderRadius:10,fontFamily:"var(--bd)",fontSize:14,background:"#fafafa"}}>
                  {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v[lang]||v.de}</option>)}
                </select>
              </div>
              <div className="field"><label>{L("Ergebnis","Result","Résultat","Risultato")}</label>
                <select value={form.ergebnis||"Ausstehend"} onChange={e=>setForm(f=>({...f,ergebnis:e.target.value}))} style={{width:"100%",padding:"10px 13px",border:"1.5px solid var(--bo)",borderRadius:10,fontFamily:"var(--bd)",fontSize:14,background:"#fafafa"}}>
                  {ERGEBNIS.map(r=><option key={r} value={r}>{r}</option>)}
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
            <div className="field" style={{textAlign:"left",marginTop:4}}>
              <label>{L("Notiz","Note","Note","Nota")}</label>
              <textarea value={form.notiz} onChange={e=>setForm(f=>({...f,notiz:e.target.value}))} placeholder={L("z.B. Nächster Schritt, Interview-Datum…","e.g. Next step, interview date…","ex. Prochaine étape…","es. Prossimo passo…")} style={{width:"100%",padding:"10px 13px",border:"1.5px solid var(--bo)",borderRadius:10,fontFamily:"var(--bd)",fontSize:14,background:"#fafafa",minHeight:64,resize:"none"}}/>
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
function AuthModal({ lang, onClose, onSuccess, defaultMode="login" }) {
  const L=(d,e,f,i)=>({de:d,en:e,fr:f,it:i}[lang]||d);
  const [mode, setMode] = useState(defaultMode);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPw, setNewPw] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [agbChecked, setAgbChecked] = useState(false);

  const GOOGLE_CLIENT_ID = "370460173343-bnc71e8tib764unofcd6sqf7slesehih.apps.googleusercontent.com";

  // Google Sign-In via Identity Services (JWT credential flow)
  const handleGoogleLogin = () => {
    setErr(""); setGLoading(true);
    const doGIS = () => {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            try {
              if (!response.credential) throw new Error("no credential");
              // Decode JWT payload (base64url → JSON)
              const payload = JSON.parse(atob(response.credential.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));
              if (!payload.email) throw new Error("no email");
              if (!authGetUser(payload.email)) authRegister(payload.email, "google-"+Date.now(), "free");
              onSuccess(authGetUser(payload.email));
            } catch {
              setErr(L("Google-Login fehlgeschlagen.","Google sign-in failed.","Échec Google.","Errore Google."));
            }
            setGLoading(false);
          },
          use_fedcm_for_prompt: false,
          cancel_on_tap_outside: true,
        });
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            setErr(L("Google-Popup nicht verfügbar – bitte prüfe die Popup-Einstellungen des Browsers.","Google popup unavailable – please check your browser popup settings.","Popup Google indisponible.","Popup Google non disponibile."));
            setGLoading(false);
          } else if (notification.isSkippedMoment()) {
            setGLoading(false);
          }
        });
      } catch {
        setErr(L("Google-Login nicht verfügbar.","Google sign-in not available.","Google non disponible.","Google non disponibile."));
        setGLoading(false);
      }
    };
    if (window.google?.accounts?.id) { doGIS(); }
    else {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.onload = () => setTimeout(doGIS, 100);
      s.onerror = () => { setErr(L("Google konnte nicht geladen werden.","Failed to load Google.","Impossible de charger Google.","Impossibile caricare Google.")); setGLoading(false); };
      document.head.appendChild(s);
    }
  };

  function handleLogin(e) {
    e.preventDefault(); setErr(""); setLoading(true);
    setTimeout(()=>{
      if(authIsAdmin(email,pw)){ onSuccess({email,plan:"admin",isAdmin:true}); return; }
      const r = authLogin(email, pw);
      if(r.ok) onSuccess(r.user);
      else setErr(r.err);
      setLoading(false);
    },400);
  }

  function handleRegister(e) {
    e.preventDefault(); setErr("");
    if(!email.includes("@")) return setErr(L("Ungültige E-Mail.","Invalid email.","E-mail invalide.","E-mail non valida."));
    if(pw.length<6) return setErr(L("Passwort mind. 6 Zeichen.","Password min. 6 chars.","Min. 6 caractères.","Min. 6 caratteri."));
    if(pw!==pw2) return setErr(L("Passwörter stimmen nicht überein.","Passwords don't match.","Mots de passe différents.","Password diverse."));
    if(!agbChecked) return setErr(L("Bitte AGB und Datenschutzerklärung akzeptieren.","Please accept the Terms and Privacy Policy.","Veuillez accepter les CGU et la politique de confidentialité.","Accetta i Termini e la Privacy Policy."));
    setLoading(true);
    setTimeout(()=>{
      const r = authRegister(email, pw, "free");
      if(r.ok) onSuccess(r.user);
      else setErr(r.err);
      setLoading(false);
    },400);
  }

  function handleForgot(e) {
    e.preventDefault(); setErr(""); setLoading(true);
    setTimeout(()=>{
      const r = authRequestReset(email);
      if(r.ok) { setInfo(r.msg); setMode("reset"); }
      else setErr(r.err);
      setLoading(false);
    },400);
  }

  function handleReset(e) {
    e.preventDefault(); setErr("");
    if(newPw.length<6) return setErr(L("Passwort mind. 6 Zeichen.","Min. 6 chars.","Min. 6 car.","Min. 6 car."));
    const r = authResetPassword(resetToken.toUpperCase(), newPw);
    if(r.ok) { setInfo(L("Passwort geändert! Bitte einloggen.","Password changed! Please sign in.","Mot de passe changé!","Password cambiata!")); setMode("login"); }
    else setErr(r.err);
  }

  // Shared input style
  const inp = {
    background:"rgba(255,255,255,.06)",
    border:"1.5px solid rgba(255,255,255,.1)",
    borderRadius:12,padding:"14px 16px",width:"100%",
    color:"white",fontFamily:"inherit",fontSize:14,
    outline:"none",boxSizing:"border-box",transition:"border-color .2s, background .2s",
    WebkitTextFillColor:"white"
  };
  const inpFocus = (e) => { e.target.style.borderColor="var(--em)"; e.target.style.background="rgba(16,185,129,.06)"; };
  const inpBlur  = (e) => { e.target.style.borderColor="rgba(255,255,255,.1)"; e.target.style.background="rgba(255,255,255,.06)"; };

  const ErrBox = ({msg}) => msg ? <div style={{color:"#f87171",fontSize:12,padding:"10px 14px",background:"rgba(239,68,68,.08)",borderRadius:10,border:"1px solid rgba(239,68,68,.15)",lineHeight:1.5}}>{msg}</div> : null;
  const InfoBox = ({msg}) => msg ? <div style={{color:"#34d399",fontSize:12,padding:"10px 14px",background:"rgba(16,185,129,.08)",borderRadius:10,border:"1px solid rgba(16,185,129,.15)",lineHeight:1.5}}>{msg}</div> : null;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}>

      <div style={{width:"100%",maxWidth:440,background:"#0f0f1c",border:"1px solid rgba(255,255,255,.08)",borderRadius:24,padding:"40px 36px",position:"relative",boxShadow:"0 40px 100px rgba(0,0,0,.8),0 0 0 1px rgba(16,185,129,.06) inset",animation:"authIn .25s cubic-bezier(.34,1.56,.64,1)"}}>

        {/* Close */}
        <button onClick={onClose} style={{position:"absolute",top:18,right:18,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"rgba(255,255,255,.4)",fontSize:14,transition:"all .2s"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.12)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.06)"}>✕</button>

        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:52,height:52,background:"linear-gradient(135deg,#10b981,#059669)",borderRadius:16,fontSize:22,marginBottom:14,boxShadow:"0 8px 24px rgba(16,185,129,.35)"}}>✦</div>
          <div style={{fontFamily:"var(--hd)",fontSize:22,fontWeight:800,color:"white",letterSpacing:"-0.5px",lineHeight:1.2}}>
            {mode==="login" ? L("Willkommen zurück","Welcome back","Bon retour","Bentornato") :
             mode==="register" ? L("Konto erstellen","Create account","Créer un compte","Crea account") :
             mode==="forgot" ? L("Passwort zurücksetzen","Reset password","Réinitialiser","Reimposta") :
             L("Neues Passwort","New password","Nouveau mot de passe","Nuova password")}
          </div>
          {(mode==="login"||mode==="register") && <div style={{fontSize:13,color:"rgba(255,255,255,.3)",marginTop:5}}>
            {mode==="login"
              ? L("Melde dich bei Stellify an","Sign in to Stellify","Connectez-vous à Stellify","Accedi a Stellify")
              : L("Starte gratis – kein Abo nötig","Start free – no subscription needed","Démarrez gratuitement","Inizia gratis")}
          </div>}
        </div>

        {/* Google Button */}
        {(mode==="login"||mode==="register") && <>
          <button onClick={handleGoogleLogin} disabled={gLoading}
            style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:gLoading?"rgba(255,255,255,.06)":"rgba(255,255,255,.95)",border:"1px solid rgba(255,255,255,.15)",borderRadius:14,padding:"13px 16px",cursor:gLoading?"default":"pointer",fontFamily:"inherit",fontSize:14,fontWeight:600,color:gLoading?"rgba(255,255,255,.4)":"#1a1a2e",transition:"all .2s",marginBottom:18,boxShadow:gLoading?"none":"0 2px 8px rgba(0,0,0,.2)"}}
            onMouseEnter={e=>{ if(!gLoading){ e.currentTarget.style.background="white"; e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.3)"; }}}
            onMouseLeave={e=>{ if(!gLoading){ e.currentTarget.style.background="rgba(255,255,255,.95)"; e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,.2)"; }}}>
            {gLoading
              ? <><div style={{width:18,height:18,borderRadius:"50%",border:"2px solid rgba(255,255,255,.2)",borderTopColor:"var(--em)",animation:"spin .7s linear infinite"}}/><span>{L("Verbinde…","Connecting…","Connexion…","Connessione…")}</span></>
              : <><svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {L("Mit Google fortfahren","Continue with Google","Continuer avec Google","Continua con Google")}</>}
          </button>

          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
            <div style={{flex:1,height:"1px",background:"rgba(255,255,255,.07)"}}/>
            <span style={{fontSize:12,color:"rgba(255,255,255,.22)",fontWeight:500,letterSpacing:".3px"}}>{L("oder","or","ou","oppure")}</span>
            <div style={{flex:1,height:"1px",background:"rgba(255,255,255,.07)"}}/>
          </div>
        </>}

        {/* Login Form */}
        {mode==="login" && <>
          <form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:12}}>
            <input type="email" placeholder="E-Mail" value={email} onChange={e=>setEmail(e.target.value)} required style={inp} onFocus={inpFocus} onBlur={inpBlur} autoComplete="email"/>
            <div style={{position:"relative"}}>
              <input type={showPw?"text":"password"} placeholder={L("Passwort","Password","Mot de passe","Password")} value={pw} onChange={e=>setPw(e.target.value)} required style={{...inp,paddingRight:48}} onFocus={inpFocus} onBlur={inpBlur} autoComplete="current-password"/>
              <button type="button" onClick={()=>setShowPw(v=>!v)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.25)",fontSize:15,padding:4,lineHeight:1}}>{showPw?"◉":"○"}</button>
            </div>
            <ErrBox msg={err}/><InfoBox msg={info}/>
            <button type="submit" disabled={loading} style={{marginTop:2,padding:"14px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"white",fontFamily:"var(--bd)",fontSize:15,fontWeight:700,cursor:loading?"default":"pointer",boxShadow:"0 4px 16px rgba(16,185,129,.3)",transition:"all .2s",opacity:loading?.7:1}}>
              {loading ? L("Einloggen…","Signing in…","Connexion…","Accesso…") : L("Einloggen","Sign in","Se connecter","Accedi")}
            </button>
          </form>
          <div style={{textAlign:"center",marginTop:6}}>
            <button type="button" onClick={()=>{setMode("forgot");setErr("");setInfo("");}} style={{background:"none",border:"none",color:"rgba(255,255,255,.3)",cursor:"pointer",fontSize:12,fontFamily:"inherit",padding:"4px 0"}}>
              {L("Passwort vergessen?","Forgot password?","Mot de passe oublié?","Password dimenticata?")}
            </button>
          </div>
          <div style={{textAlign:"center",marginTop:20,paddingTop:20,borderTop:"1px solid rgba(255,255,255,.06)",fontSize:13,color:"rgba(255,255,255,.3)"}}>
            {L("Noch kein Konto?","No account yet?","Pas encore de compte?","Nessun account?")}
            {" "}<button onClick={()=>{setMode("register");setErr("");}} style={{background:"none",border:"none",color:"var(--em)",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>
              {L("Gratis registrieren","Sign up free","S'inscrire","Registrati")}
            </button>
          </div>
        </>}

        {/* Register Form */}
        {mode==="register" && <>
          <form onSubmit={handleRegister} style={{display:"flex",flexDirection:"column",gap:12}}>
            <input type="email" placeholder="E-Mail" value={email} onChange={e=>setEmail(e.target.value)} required style={inp} onFocus={inpFocus} onBlur={inpBlur} autoComplete="email"/>
            <div style={{position:"relative"}}>
              <input type={showPw?"text":"password"} placeholder={L("Passwort (mind. 6 Zeichen)","Password (min. 6 chars)","Mot de passe (min. 6 car.)","Password (min. 6 car.)")} value={pw} onChange={e=>setPw(e.target.value)} required style={{...inp,paddingRight:48}} onFocus={inpFocus} onBlur={inpBlur} autoComplete="new-password"/>
              <button type="button" onClick={()=>setShowPw(v=>!v)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.25)",fontSize:15,padding:4,lineHeight:1}}>{showPw?"◉":"○"}</button>
            </div>
            <input type="password" placeholder={L("Passwort wiederholen","Repeat password","Répétez","Ripeti")} value={pw2} onChange={e=>setPw2(e.target.value)} required style={inp} onFocus={inpFocus} onBlur={inpBlur} autoComplete="new-password"/>
            {/* AGB Pflicht-Checkbox */}
            <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${agbChecked?"rgba(16,185,129,.35)":"rgba(255,255,255,.1)"}`,background:agbChecked?"rgba(16,185,129,.06)":"transparent",transition:"all .2s"}}>
              <div style={{position:"relative",flexShrink:0,marginTop:1}}>
                <input type="checkbox" checked={agbChecked} onChange={e=>setAgbChecked(e.target.checked)} style={{opacity:0,position:"absolute",width:18,height:18,cursor:"pointer",margin:0}}/>
                <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${agbChecked?"#10b981":"rgba(255,255,255,.25)"}`,background:agbChecked?"#10b981":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",flexShrink:0}}>
                  {agbChecked&&<span style={{color:"white",fontSize:11,fontWeight:800,lineHeight:1}}>✓</span>}
                </div>
              </div>
              <span style={{fontSize:11,color:"rgba(255,255,255,.45)",lineHeight:1.6}}>
                {L("Ich akzeptiere die ","I accept the ","J'accepte les ","Accetto i ")}
                <span onClick={e=>{e.preventDefault();e.stopPropagation();}} style={{color:"var(--em)",textDecoration:"underline",cursor:"pointer"}} onClickCapture={()=>window.open("#agb","_blank")}>{L("AGB","Terms","CGU","Termini")}</span>
                {L(" und die "," and the "," et la "," e la ")}
                <span style={{color:"var(--em)",textDecoration:"underline",cursor:"pointer"}} onClickCapture={()=>window.open("#datenschutz","_blank")}>{L("Datenschutzerklärung","Privacy Policy","Politique de confidentialité","Privacy Policy")}</span>
                {L(" von Stellify."," of Stellify."," de Stellify."," di Stellify.")}
              </span>
            </label>
            <ErrBox msg={err}/>
            <button type="submit" disabled={loading||!agbChecked} style={{marginTop:2,padding:"14px",borderRadius:14,border:"none",background:agbChecked?"linear-gradient(135deg,#10b981,#059669)":"rgba(255,255,255,.08)",color:agbChecked?"white":"rgba(255,255,255,.3)",fontFamily:"var(--bd)",fontSize:15,fontWeight:700,cursor:(loading||!agbChecked)?"not-allowed":"pointer",boxShadow:agbChecked?"0 4px 16px rgba(16,185,129,.3)":"none",transition:"all .2s"}}>
              {loading ? L("Erstelle Konto…","Creating account…","Création…","Creazione…") : L("Konto erstellen","Create account","Créer mon compte","Crea account")}
            </button>
          </form>
          <div style={{textAlign:"center",marginTop:20,paddingTop:20,borderTop:"1px solid rgba(255,255,255,.06)",fontSize:13,color:"rgba(255,255,255,.3)"}}>
            {L("Bereits ein Konto?","Already have an account?","Déjà un compte?","Hai già un account?")}
            {" "}<button onClick={()=>{setMode("login");setErr("");}} style={{background:"none",border:"none",color:"var(--em)",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>
              {L("Einloggen","Sign in","Connexion","Accedi")}
            </button>
          </div>
        </>}

        {/* Forgot Password */}
        {mode==="forgot" && <>
          <p style={{fontSize:13,color:"rgba(255,255,255,.4)",marginBottom:20,lineHeight:1.7}}>
            {L("Gib deine E-Mail ein. Du erhältst einen Reset-Code.","Enter your email. You'll receive a reset code.","Entrez votre e-mail pour recevoir un code.","Inserisci l'email per ricevere il codice.")}
          </p>
          <form onSubmit={handleForgot} style={{display:"flex",flexDirection:"column",gap:12}}>
            <input type="email" placeholder="E-Mail" value={email} onChange={e=>setEmail(e.target.value)} required style={inp} onFocus={inpFocus} onBlur={inpBlur}/>
            <ErrBox msg={err}/>
            <button type="submit" disabled={loading} style={{padding:"14px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"white",fontFamily:"var(--bd)",fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(16,185,129,.3)"}}>
              {loading ? "…" : L("Reset-Code senden","Send reset code","Envoyer le code","Invia codice")}
            </button>
          </form>
          <div style={{textAlign:"center",marginTop:16}}>
            <button onClick={()=>{setMode("login");setErr("");}} style={{background:"none",border:"none",color:"rgba(255,255,255,.3)",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>← {L("Zurück zum Login","Back to sign in","Retour","Torna al login")}</button>
          </div>
        </>}

        {/* Reset Password */}
        {mode==="reset" && <>
          <InfoBox msg={info}/>
          <form onSubmit={handleReset} style={{display:"flex",flexDirection:"column",gap:12,marginTop:info?12:0}}>
            <input placeholder={L("Reset-Code eingeben","Enter reset code","Entrez le code","Inserisci il codice")} value={resetToken} onChange={e=>setResetToken(e.target.value)} required style={{...inp,fontFamily:"monospace",letterSpacing:3,textTransform:"uppercase",textAlign:"center"}} onFocus={inpFocus} onBlur={inpBlur}/>
            <input type="password" placeholder={L("Neues Passwort","New password","Nouveau mot de passe","Nuova password")} value={newPw} onChange={e=>setNewPw(e.target.value)} required style={inp} onFocus={inpFocus} onBlur={inpBlur}/>
            <ErrBox msg={err}/>
            <button type="submit" style={{padding:"14px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"white",fontFamily:"var(--bd)",fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(16,185,129,.3)"}}>
              {L("Passwort ändern","Change password","Changer le mot de passe","Cambia password")}
            </button>
          </form>
        </>}

      </div>
      <style>{`@keyframes authIn{from{opacity:0;transform:scale(.92) translateY(12px)}to{opacity:1;transform:none}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
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
  const maxSeats = 9999999;
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
  const L=(d,e,f,i)=>({de:d,en:e,fr:f,it:i}[lang]||d);
  const [tab, setTab] = useState("users");
  const [search, setSearch] = useState("");
  const users = authGetUsers();
  const chats = (() => { try { return JSON.parse(localStorage.getItem("stf_chats")||"[]"); } catch { return []; }})();

  const filtered = users.filter(u=>
    u.email.includes(search.toLowerCase()) || (u.plan||"").includes(search.toLowerCase())
  );

  const stats = {
    total: users.length,
    pro: users.filter(u=>u.plan==="pro").length,
    ultimate: users.filter(u=>u.plan==="ultimate").length,
    free: users.filter(u=>!u.plan||u.plan==="free").length,
  };

  const PLAN_COLORS = {pro:"#10b981",ultimate:"#f59e0b",free:"rgba(255,255,255,.2)"};

  return (
    <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="mod" style={{maxWidth:700,textAlign:"left",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div>
            <h2 style={{fontSize:22,margin:0}}>🛡️ Admin Dashboard</h2>
            <div style={{fontSize:11,color:"rgba(255,255,255,.3)",marginTop:2}}>{C.name} · {C.domain}</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"6px 12px",color:"rgba(255,255,255,.5)",cursor:"pointer",fontSize:12}}>✕ Schliessen</button>
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
          {[["👥","Total",stats.total,"rgba(255,255,255,.06)"],["✦","Pro",stats.pro,"rgba(16,185,129,.1)"],["♾️","Ultimate",stats.ultimate,"rgba(245,158,11,.1)"],["🆓","Free",stats.free,"rgba(255,255,255,.04)"]].map(([ico,lbl,val,bg])=>(
            <div key={lbl} style={{background:bg,border:"1px solid rgba(255,255,255,.08)",borderRadius:12,padding:"12px 14px",textAlign:"center"}}>
              <div style={{fontSize:20}}>{ico}</div>
              <div style={{fontFamily:"var(--hd)",fontSize:22,fontWeight:800,color:"white",lineHeight:1}}>{val}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:2}}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:4,background:"rgba(255,255,255,.04)",borderRadius:10,padding:4,marginBottom:16}}>
          {[["users",L("Nutzer","Users","Utilisateurs","Utenti")],["chats","Chats"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"7px 0",borderRadius:7,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,background:tab===t?"rgba(255,255,255,.1)":"transparent",color:tab===t?"white":"rgba(255,255,255,.35)"}}>
              {l}
            </button>
          ))}
        </div>

        {tab==="users" && <>
          <input placeholder={L("Suchen…","Search…","Rechercher…","Cerca…")} value={search} onChange={e=>setSearch(e.target.value)}
            style={{width:"100%",padding:"9px 13px",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"white",fontFamily:"inherit",fontSize:13,outline:"none",marginBottom:12,boxSizing:"border-box"}}/>
          {filtered.length===0 && <div style={{textAlign:"center",padding:24,color:"rgba(255,255,255,.25)",fontSize:13}}>Keine Nutzer gefunden</div>}
          {filtered.map(u=>(
            <div key={u.email} style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:12,padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>
                {u.plan==="ultimate"?"♾️":u.plan==="pro"?"✦":"👤"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.3)",marginTop:1}}>
                  {new Date(u.activatedAt||0).toLocaleDateString("de-CH")} · {(u.members||[]).length}/{u.seats} Seats
                </div>
              </div>
              <div style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:`${PLAN_COLORS[u.plan]||PLAN_COLORS.free}22`,color:PLAN_COLORS[u.plan]||"rgba(255,255,255,.4)",border:`1px solid ${PLAN_COLORS[u.plan]||"rgba(255,255,255,.1)"}44`,flexShrink:0,textTransform:"uppercase"}}>
                {u.plan||"Free"}
              </div>
            </div>
          ))}
        </>}

        {tab==="chats" && <>
          <div style={{fontSize:12,color:"rgba(255,255,255,.3)",marginBottom:12}}>{chats.length} {L("gespeicherte Chats (aktuelle Session)","saved chats (current session)","chats enregistrés","chat salvate")}</div>
          {chats.slice(0,20).map((c,i)=>(
            <div key={c.id||i} style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:10,padding:"10px 13px",marginBottom:6}}>
              <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,.7)"}}>{c.title||"Chat"}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.25)",marginTop:2}}>{c.msgs?.length||0} Nachrichten · {new Date(c.ts||0).toLocaleString("de-CH")}</div>
            </div>
          ))}
        </>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// 👤 PROFIL-MANAGER MODAL
function ProfileManager({ lang, onClose, onSelect }) {
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
    let updated;
    if(editing.mode==="new") {
      updated = [...profiles, {...form, id: form.id||("p"+Date.now())}];
    } else {
      updated = profiles.map(p => p.id===editing.id ? {...form, id:editing.id} : p);
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
  // Nav wird weiter unten in App() definiert

  // Footer wird weiter unten in App() definiert

function PromoBanner({ lang, navTo, setPw, onClose }) {
  const L2=(d,e,f,i)=>({de:d,en:e,fr:f,it:i}[lang]);
  return (
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:500,background:"linear-gradient(135deg,#10b981,#059669)",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,boxShadow:"0 2px 12px rgba(16,185,129,.4)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flex:1,flexWrap:"wrap"}}>
        <span style={{fontSize:16}}>🎁</span>
        <span style={{fontSize:13,fontWeight:600,color:"white"}}>
          {L2(
            "1× komplett gratis testen – kein Abo, keine Kreditkarte nötig.",
            "Try once completely free – no subscription, no credit card needed.",
            "Essai gratuit 1× – sans abonnement ni carte bancaire.",
            "Prova 1× gratis – senza abbonamento né carta di credito."
          )}
        </span>
        <button
          onClick={()=>navTo("app")}
          style={{background:"white",color:"#059669",border:"none",padding:"5px 14px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0,transition:"all .2s"}}
          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 4px 10px rgba(0,0,0,.15)";}}
          onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
          {L2("Jetzt starten →","Start now →","Commencer →","Inizia ora →")}
        </button>
      </div>
      <button
        onClick={onClose}
        style={{background:"none",border:"none",color:"rgba(255,255,255,.7)",cursor:"pointer",fontSize:18,flexShrink:0,padding:"0 4px",lineHeight:1,transition:"color .18s"}}
        onMouseEnter={e=>e.currentTarget.style.color="white"}
        onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,.7)"}>
        ✕
      </button>
    </div>
  );
}

export default function App() {
  const [lang,setLang]=useState("de");
  const t = React.useMemo(()=>mkT(lang), [lang]);
  const [page,setPage]=useState("landing");
  const [pro,setPro]=useState(false); const [usage,setUsage]=useState(0); const [proUsage,setProUsage]=useState(0);
  const [splash,setSplash]=useState(()=>!sessionStorage.getItem("stf_splashed"));
  const [showPromo,setShowPromo]=useState(false);
  const closePromo=()=>{ try{sessionStorage.setItem("stf_promo_shown","1");}catch{} setShowPromo(false); };
  const [showReferral,setShowReferral]=useState(false);
  const [pw,setPw]=useState(false); const [yearly,setYearly]=useState(false); // Monatlich Standard
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
  const [cookieBanner,setCookieBanner]=useState(()=>{
    try {
      const v = localStorage.getItem("stf_cookie_v2");
      return !v;
    } catch { return true; }
  });
  const acceptCookie=(all)=>{ try { localStorage.setItem("stf_cookie_v2",all?"all":"essential"); } catch{} setCookieBanner(false); };

  // Promo-Modal: erscheint nach 12 Sekunden beim ersten Besuch der Session
  useEffect(()=>{
    try {
      if(sessionStorage.getItem("stf_promo_shown")) return; // already shown/dismissed this session
      const timer = setTimeout(()=>{
        if(!sessionStorage.getItem("stf_promo_shown")) {
          setShowPromo(true);
          sessionStorage.setItem("stf_promo_shown","1");
        }
      }, 12000);
      return ()=>clearTimeout(timer);
    } catch {}
  },[]);

  // PromoModal Komponente
  const PromoModal=()=>(
    <div className="mbg" onClick={e=>e.target===e.currentTarget&&closePromo()}>
      <div className="mod">
        <div style={{fontSize:36,marginBottom:10}}>🎁</div>
        <h2>{L("Stellify gratis testen","Try Stellify for free","Essayez Stellify gratuitement","Prova Stellify gratis")}</h2>
        <p style={{marginBottom:16}}>{L(
          "1 vollständige KI-Bewerbung kostenlos – ohne Kreditkarte, ohne Abo.",
          "1 complete AI application for free – no credit card, no subscription.",
          "1 candidature IA complète gratuitement – sans carte ni abonnement.",
          "1 candidatura IA completa gratis – senza carta né abbonamento."
        )}</p>
        <div className="mod-fts">
          {[["✍️",L("Motivationsschreiben","Cover letter","Lettre motivation","Lettera motivazione")],
            ["📄",L("Lebenslauf","CV","CV","CV")],
            ["🤖","ATS-Check"],
            ["📜",L("Zeugnis-Analyse","Reference Analysis","Analyse certificat","Analisi certificato")]
          ].map(([ico,tx])=><div key={tx} className="mod-f"><div className="mod-fi">{ico}</div>{tx}</div>)}
        </div>
        <button className="btn b-em b-w" style={{marginBottom:8}} onClick={()=>{ closePromo(); }}>
          {L("Jetzt kostenlos starten →","Start for free now →","Commencer gratuitement →","Inizia gratis ora →")}
        </button>
        <div className="mod-note">{L("Keine Kreditkarte · Kein Abo · Jederzeit kündbar","No credit card · No subscription · Cancel anytime","Sans carte · Sans abonnement · Résiliable","Senza carta · Senza abbonamento · Cancellabile")}</div>
        <button className="btn b-out b-sm" style={{marginTop:9,width:"100%"}} onClick={closePromo}>
          {L("Vielleicht später","Maybe later","Peut-être plus tard","Forse dopo")}
        </button>
      </div>
    </div>
  );

  const uj=(k,v)=>setJob(p=>({...p,[k]:v})); const up=(k,v)=>setProf(p=>({...p,[k]:v}));
  const L=(d,e,f,i)=>({de:d,en:e,fr:f,it:i}[lang]);
  const stripeLink=()=>yearly?C.stripeYearly:C.stripeMonthly;
  const canGen=()=>pro?(proUsage<C.PRO_LIMIT):(usage<C.FREE_LIMIT);
  const canGenPro=()=>authSession?.plan==="ultimate"||proUsage<C.PRO_LIMIT;
  const nextReset=()=>{
    const d=new Date();
    d.setDate(d.getDate()+1);d.setHours(0,0,0,0);
    const diff=d-new Date();
    const h=Math.floor(diff/3600000);
    const min=Math.floor((diff%3600000)/60000);
    return lang==="de"?`in ${h}h ${min}min (Mitternacht)`:lang==="fr"?`dans ${h}h ${min}min (minuit)`:lang==="it"?`tra ${h}h ${min}min (mezzanotte)`:`in ${h}h ${min}min (midnight)`;
  };

  const curDoc=()=>docType==="beide"?(tab===0?results.motivation:results.lebenslauf):results[docType];
  const setCurDoc=v=>{ if(docType==="beide") setResults(r=>tab===0?{...r,motivation:v}:{...r,lebenslauf:v}); else setResults(r=>({...r,[docType]:v})); };

  // Browser-Zurück-Button Support
  const navTo = (p) => {
    window.history.pushState({page:p},"",`#${p==="landing"?"":p}`);
    setPage(p);
  };

  const handleGoogleLogin = () => {
    const clientId = "370460173343-bnc71e8tib764unofcd6sqf7slesehih.apps.googleusercontent.com";
    const doLogin = () => {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "email profile",
          callback: async (resp) => {
            if (resp.error) return;
            try {
              const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${resp.access_token}` } });
              const u = await r.json();
              if (!u.email) return;
              if (!authGetUser(u.email)) authRegister(u.email, "google-"+Date.now(), "free");
              const user = authGetUser(u.email);
              const sess = {email:user.email, plan:user.plan||"free", name:u.name||""};
              authSetSession(sess); setAuthSession(sess);
              if(sess.plan==="pro"||sess.plan==="ultimate") setPro(true);
              setShowAuth(false);
            } catch(e) { console.error(e); }
          }
        });
        client.requestAccessToken({ prompt: "select_account" });
      } catch(e) { console.error(e); }
    };
    if (window.google?.accounts?.oauth2) { doLogin(); }
    else {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.onload = doLogin;
      document.head.appendChild(s);
    }
  };

  useEffect(()=>{
    const hash = window.location.hash.replace("#","") || "landing";
    window.history.replaceState({page:hash},"",window.location.href);
    const onPop = (e) => setPage(e.state?.page || "landing");
    window.addEventListener("popstate", onPop);
    // Google OAuth Session
    const params = new URLSearchParams(window.location.search);
    const gs = params.get("google_session");
    if (gs) {
      try {
        const sd = JSON.parse(atob(decodeURIComponent(gs)));
        const users = authGetUsers();
        if (!users.find(u=>u.email===sd.email)) authRegister(sd.email,"google-"+Date.now(),"free");
        const sess = {email:sd.email, plan:authGetUser(sd.email)?.plan||"free", name:sd.name||""};
        authSetSession(sess); setAuthSession(sess);
        if(sess.plan==="pro"||sess.plan==="ultimate") setPro(true);
      } catch(e) { console.error(e); }
      window.history.replaceState({},"",window.location.pathname);
    }
    return ()=>window.removeEventListener("popstate", onPop);
  },[]);

  // Scroll reveal via IntersectionObserver
  useEffect(()=>{
    const timer = setTimeout(()=>{
      const obs = new IntersectionObserver((entries)=>{
        entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("on"); e.target.classList.add("v"); obs.unobserve(e.target); }});
      },{threshold:0.1,rootMargin:"0px 0px -40px 0px"});
      document.querySelectorAll(".reveal,.lp-reveal").forEach(el=>obs.observe(el));
      return ()=>obs.disconnect();
    },80);
    return ()=>clearTimeout(timer);
  },[page]);

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
    if(sess) { setAuthSession(sess); if(sess.plan==="pro"||sess.plan==="ultimate") setPro(true); else setPro(isPro()); }
    else setPro(isPro());
  },[page]);
  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[icMsgs]);
  useEffect(()=>{if(job.title&&prof.name)setESub(`Bewerbung als ${job.title} – ${prof.name}`);},[job.title,prof.name]);

  const generate=async()=>{
    if(!canGen()){setPw(true);return;} setStreaming(true); setErr(""); setEditing(false);
    const toGen=docType==="beide"?["motivation","lebenslauf"]:[docType];
    try{
      for(const tp of toGen){
        setResults(r=>({...r,[tp]:""}));
        await streamAI(tp==="motivation"?t.motivPrompt(job,prof):t.cvPrompt(job,prof),
          chunk=>setResults(r=>tp==="motivation"?{...r,motivation:chunk}:{...r,lebenslauf:chunk}),
          null, pro ? "" : "free");
      }
      if(!pro){incU();setUsage(getU().count);} else {incPro();setProUsage(getProCount());} setStep(3);
    }catch(e){setErr(e.message);}finally{setStreaming(false);}
  };

  const copyDoc=()=>{navigator.clipboard.writeText(curDoc());setCopied(true);setTimeout(()=>setCopied(false),2200);};
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
      const sysMsg={role:"system",content:t.coach.icNext(job)};
      const r2=await fetch(GROQ_URL,{method:"POST",headers:groqHeaders(),
        body:JSON.stringify({model:C.MODEL_FAST,max_tokens:400,messages:[sysMsg,...history]})});
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
  // ── NAV (innerhalb App) ──────────────────────────────
  const Nav=({dark})=>{
    const [mOpen,setMOpen]=useState(false);
    const lc=dark?"rgba(255,255,255,.38)":"var(--mu)";
    return(
    <nav style={dark?{background:"rgba(7,7,14,.82)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderColor:"rgba(255,255,255,.07)"}:{}}>
      <div className="ni">
        <div className="logo" onClick={()=>{navTo("landing");setMOpen(false);}} style={dark?{color:"white"}:{}}>{C.name}<div className="logo-dot"/>{pro&&<span className="pb">PRO</span>}</div>
        <div className="nl nl-desk">
          <LangSw/>
          <button className="nlk" style={{color:lc}} onClick={()=>{navTo("landing");setTimeout(()=>document.getElementById("tools")?.scrollIntoView({behavior:"smooth"}),100)}}>{t.nav.tools}</button>
          <button className="nlk" style={{color:lc}} onClick={()=>{navTo("landing");setTimeout(()=>document.getElementById("preise")?.scrollIntoView({behavior:"smooth"}),100)}}>{t.nav.prices}</button>
          <button className="nlk" style={{color:"var(--em)",fontWeight:700,position:"relative"}} onClick={()=>navTo("chat")}
            title={lang==="de"?"Stella – deine KI-Karriere-Assistentin. Klicke um zu chatten!":lang==="en"?"Stella – your AI career assistant. Click to chat!":lang==="fr"?"Stella – votre assistante IA carrière. Cliquez pour chatter!":"Stella – la tua assistente IA carriera. Clicca per chattare!"}>
            ✦ Stella
            <span style={{position:"absolute",top:-6,right:-6,width:8,height:8,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 6px #22c55e"}}/>
          </button>
          <button onClick={()=>setShowProfiles(true)} style={{display:"flex",alignItems:"center",gap:6,background:activeProfile?"rgba(16,185,129,.12)":"rgba(11,11,18,.06)",border:"1.5px solid",borderColor:activeProfile?"rgba(16,185,129,.25)":"var(--bo)",borderRadius:20,padding:"5px 12px",cursor:"pointer",fontFamily:"var(--bd)",fontSize:12,fontWeight:600,color:activeProfile?"var(--em2)":dark?"rgba(255,255,255,.5)":"var(--mu)",transition:"all .2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="var(--em)"} onMouseLeave={e=>e.currentTarget.style.borderColor=activeProfile?"rgba(16,185,129,.25)":"var(--bo)"}>
            <span style={{fontSize:14}}>{activeProfile?.emoji||"👤"}</span>
            <span style={{maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{activeProfile?.name||(lang==="de"?"Profil":"Profile")}</span>
            <span style={{fontSize:10,opacity:.6}}>▾</span>
          </button>
          {authSession ? (
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              {authSession.isAdmin&&<button onClick={()=>setShowAdmin(true)} style={{padding:"5px 10px",borderRadius:8,border:"1px solid rgba(245,158,11,.3)",background:"rgba(245,158,11,.1)",color:"#f59e0b",fontSize:11,fontWeight:700,cursor:"pointer"}}>🛡️ Admin</button>}
              <button onClick={()=>{if(window.confirm(lang==="de"?`Abmelden?`:`Sign out?`)){authClearSession();setAuthSession(null);if(!isPro())setPro(false);}}} style={{display:"flex",alignItems:"center",gap:7,background:"linear-gradient(135deg,rgba(16,185,129,.18),rgba(16,185,129,.06))",border:"1.5px solid rgba(16,185,129,.35)",borderRadius:24,padding:"5px 14px 5px 5px",cursor:"pointer",fontFamily:"var(--bd)",fontSize:12,fontWeight:700,color:"var(--em2)"}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:"linear-gradient(135deg,var(--em),#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"white"}}>{authSession.email[0].toUpperCase()}</div>
                <span style={{maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{authSession.email.split("@")[0]}</span>
              </button>
            </div>
          ) : (
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>handleGoogleLogin()} style={{display:"flex",alignItems:"center",gap:6,background:"white",border:"1.5px solid #dadce0",borderRadius:24,padding:"5px 12px",cursor:"pointer",fontFamily:"var(--bd)",fontSize:12,fontWeight:600,color:"#3c4043",boxShadow:"0 1px 3px rgba(0,0,0,.08)"}}>
                <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </button>
              <button onClick={()=>{setAuthMode("login");setShowAuth(true);}} style={{display:"flex",alignItems:"center",gap:7,background:"linear-gradient(135deg,rgba(16,185,129,.15),rgba(16,185,129,.05))",border:"1.5px solid rgba(16,185,129,.3)",borderRadius:24,padding:"6px 14px 6px 6px",cursor:"pointer",fontFamily:"var(--bd)",fontSize:12,fontWeight:700,color:"var(--em2)"}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:"rgba(16,185,129,.2)",border:"1px solid rgba(16,185,129,.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>👤</div>
                {lang==="de"?"E-Mail":"Email"}
              </button>
            </div>
          )}
          <button className="nc" onClick={()=>navTo("app")}>{lang==="de"?"Kostenlos starten":lang==="fr"?"Commencer":lang==="it"?"Inizia":"Start free"} →</button>
        </div>
        <button className="ham" onClick={()=>setMOpen(v=>!v)} style={{background:"none",border:"none",cursor:"pointer",display:"none",flexDirection:"column",gap:4,padding:4,color:dark?"white":"var(--ink)"}}>
          <div style={{width:22,height:2,background:"currentColor",borderRadius:2,transition:"all .2s",transform:mOpen?"rotate(45deg) translate(4px,4px)":"none"}}/>
          <div style={{width:22,height:2,background:"currentColor",borderRadius:2,transition:"all .2s",opacity:mOpen?0:1}}/>
          <div style={{width:22,height:2,background:"currentColor",borderRadius:2,transition:"all .2s",transform:mOpen?"rotate(-45deg) translate(4px,-4px)":"none"}}/>
        </button>
      </div>
      {mOpen&&<div style={{background:"#0a0a16",borderTop:"1px solid rgba(255,255,255,.07)",padding:"8px 0 16px",display:"flex",flexDirection:"column"}}>
        {/* Nav links */}
        {[
          {fn:()=>navTo("app"),ico:"✍️",lbl:lang==="de"?"Bewerbung":lang==="fr"?"Candidature":lang==="it"?"Candidatura":"Application"},
          {fn:()=>navTo("chat"),ico:"💬",lbl:"Stella AI",badge:lang==="de"?"Neu":"New"},
          {fn:()=>{navTo("landing");setTimeout(()=>document.getElementById("tools")?.scrollIntoView({behavior:"smooth"}),100);},ico:"🔧",lbl:lang==="de"?"Alle Tools":lang==="fr"?"Outils":lang==="it"?"Strumenti":"All Tools"},
          {fn:()=>{navTo("landing");setTimeout(()=>document.getElementById("preise")?.scrollIntoView({behavior:"smooth"}),100);},ico:"💶",lbl:lang==="de"?"Preise":lang==="fr"?"Tarifs":lang==="it"?"Prezzi":"Pricing"},
        ].map(({fn,ico,lbl,badge},i)=>(
          <button key={i} onClick={()=>{fn();setMOpen(false);}}
            style={{background:"none",border:"none",cursor:"pointer",fontFamily:"var(--bd)",fontSize:14,fontWeight:500,color:"rgba(255,255,255,.75)",textAlign:"left",padding:"13px 22px",display:"flex",alignItems:"center",gap:12,borderBottom:"1px solid rgba(255,255,255,.04)"}}>
            <span style={{fontSize:18,width:24,textAlign:"center"}}>{ico}</span>
            <span style={{flex:1}}>{lbl}</span>
            {badge&&<span style={{fontSize:10,fontWeight:700,background:"var(--em)",color:"white",padding:"2px 7px",borderRadius:99,letterSpacing:.5}}>{badge}</span>}
          </button>
        ))}
        {/* Auth section */}
        <div style={{margin:"12px 16px 4px",display:"flex",flexDirection:"column",gap:8}}>
          {authSession ? (
            <div style={{display:"flex",alignItems:"center",gap:10,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",borderRadius:12,padding:"12px 14px"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,var(--em),#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"white",flexShrink:0}}>{authSession.email[0].toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{authSession.email.split("@")[0]}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.35)",textTransform:"capitalize"}}>{authSession.plan||"free"} Plan</div>
              </div>
            </div>
          ) : (
            <button onClick={()=>{setAuthMode("login");setShowAuth(true);setMOpen(false);}} style={{background:"rgba(16,185,129,.12)",border:"1.5px solid rgba(16,185,129,.3)",borderRadius:12,padding:"12px",color:"var(--em)",fontFamily:"var(--bd)",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              👤 {lang==="de"?"Anmelden / Registrieren":lang==="fr"?"Se connecter":lang==="it"?"Accedi":"Sign in / Register"}
            </button>
          )}
          <button className="btn b-em" style={{justifyContent:"center",padding:"13px"}} onClick={()=>{navTo("app");setMOpen(false);}}>
            {lang==="de"?"Kostenlos starten →":lang==="fr"?"Commencer →":lang==="it"?"Inizia →":"Start free →"}
          </button>
          <div style={{padding:"8px 4px"}}>
            <LangSw/>
          </div>
        </div>
      </div>}
    </nav>);
  };

  // ── FOOTER (innerhalb App) ────────────────────────────
  const Footer=()=>(
    <footer>
      <div style={{borderBottom:"1px solid rgba(255,255,255,.05)",padding:"12px 24px",marginBottom:40}}>
        <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:"8px 36px",maxWidth:900,margin:"0 auto"}}>
          {[{ico:"🔒",txt:lang==="de"?"Keine Datenspeicherung":"No data storage"},
            {ico:"🇨🇭",txt:lang==="de"?"Schweizer Unternehmen · Zug":"Swiss company · Zug"},
            {ico:"🔐",txt:lang==="de"?"Sichere Zahlung via Stripe":"Secure payment via Stripe"},
          ].map((tr,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"rgba(255,255,255,.32)",fontWeight:500}}>
              <span>{tr.ico}</span><span>{tr.txt}</span>
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
            {["Twint","Visa","Mastercard","Apple Pay","Google Pay","PostFinance"].map(p=>(
              <div key={p} style={{fontSize:10,fontWeight:700,background:"rgba(255,255,255,.07)",color:"rgba(255,255,255,.35)",padding:"3px 8px",borderRadius:5,border:"1px solid rgba(255,255,255,.08)"}}>{p}</div>
            ))}
          </div>
        </div>
        <div className="fcol"><h5>{t.legal.product}</h5>
          <button onClick={()=>navTo("app")}>{lang==="de"?"✍️ Bewerbung":"✍️ Application"}</button>
          <button onClick={()=>navTo("linkedin")}>💼 LinkedIn</button>
          <button onClick={()=>navTo("ats")}>🤖 ATS-Check</button>
          <button onClick={()=>navTo("zeugnis")}>📜 {lang==="de"?"Zeugnis-Analyse":"Reference"}</button>
          <button onClick={()=>navTo("jobmatch")}>🎯 Job-Matching</button>
          <button onClick={()=>navTo("coach")}>🎤 Interview-Coach</button>
          <button onClick={()=>navTo("gehaltsrechner")}>💰 {lang==="de"?"Gehaltsrechner":"Salary"}</button>
          <button onClick={()=>navTo("tracker")}>📋 {lang==="de"?"Bewerbungs-Tracker":"Tracker"}</button>
        </div>
        <div className="fcol">
          <h5>{lang==="de"?"Schule & Produktivität":"School & Productivity"}</h5>
          {GENERIC_TOOLS.map(g=><button key={g.id} onClick={()=>navTo(g.id)}>{g.ico} {g.t[lang]}</button>)}
        </div>
        <div className="fcol"><h5>{t.legal.legalL}</h5>
          <button onClick={()=>navTo("agb")}>{t.legal.agb}</button>
          <button onClick={()=>navTo("datenschutz")}>{t.legal.privacy}</button>
          <button onClick={()=>navTo("impressum")}>{t.legal.imprint}</button>
        </div>
      </div>
      <div className="fbot">
        <div>© {new Date().getFullYear()} {C.name} · {C.owner} · {C.address}</div>
        <div style={{display:"flex",gap:12}}>{[["agb",t.legal.agb],["datenschutz",t.legal.privacy],["impressum",t.legal.imprint]].map(([p,l])=><button key={p} onClick={()=>navTo(p)} style={{background:"none",border:"none",color:"rgba(255,255,255,.2)",fontSize:11,cursor:"pointer",fontFamily:"var(--bd)"}}>{l}</button>)}</div>
      </div>
    </footer>
  );


  // Nav & Footer defined above App

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
    <div style={{background:"linear-gradient(135deg,rgba(245,158,11,.12),rgba(245,158,11,.06))",border:"1.5px solid rgba(245,158,11,.3)",borderRadius:14,padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
      <div>
        <div style={{fontFamily:"var(--hd)",fontSize:14,fontWeight:800,color:"#f59e0b",marginBottom:3}}>
          💎 {L("Wochen-Limit erreicht – bereit für mehr?","Weekly limit reached – ready for more?","Limite hebdomadaire atteint?","Limite settimanale raggiunto?")}
        </div>
        <div style={{fontSize:12,color:"rgba(255,255,255,.5)",lineHeight:1.5}}>
          {L(`Du hast das Maximum aus deinem Pro-Abo diese Woche herausgeholt! Dein Limit wird Montag um 07:00 Uhr zurückgesetzt. Jetzt auf Ultimate upgraden und sofort unlimitiert weiterarbeiten. 💎`,
             `You've maxed out your Pro plan this week! Limit resets Monday at 07:00. Upgrade to Ultimate and continue without waiting.`,
             `Vous avez maximisé votre plan Pro cette semaine! Upgrade vers Ultimate pour continuer sans attendre.`,
             `Hai raggiunto il massimo del tuo piano Pro questa settimana! Upgrade a Ultimate per continuare senza attese.`)}
        </div>
        <div style={{fontSize:11,color:"rgba(245,158,11,.6)",marginTop:4}}>
          🔄 {L("Pro-Limit erneuert sich Montag um 07:00 Uhr","Pro limit resets Monday at 07:00","Renouvellement lundi à 07h","Il limite si rinnova lunedì alle 07:00")}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8,flexShrink:0}}>
        <button onClick={()=>window.open(C.stripeUltimate,"_blank")} className="btn" style={{background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"white",border:"none",padding:"10px 20px",fontSize:13,fontWeight:700,borderRadius:10,cursor:"pointer",boxShadow:"0 4px 14px rgba(245,158,11,.4)"}}>
          ♾️ {L("Ultimate holen →","Get Ultimate →","Obtenir Ultimate →","Ottieni Ultimate →")}
        </button>
        <div style={{fontSize:10,color:"rgba(255,255,255,.25)",textAlign:"center"}}>CHF 39.90/Mo. · {L("2 Monate gratis","2 months free","2 mois offerts","2 mesi gratis")}</div>
      </div>
    </div>
  ):(
    <div className="ubar" style={{borderColor:proUsage/C.PRO_LIMIT>=0.85?"rgba(239,68,68,.3)":proUsage/C.PRO_LIMIT>=0.6?"rgba(245,158,11,.25)":"rgba(16,185,129,.18)"}}>
      <div style={{display:"flex",flexDirection:"column",gap:2}}>
        <span style={{color:proUsage/C.PRO_LIMIT>=0.85?"#ef4444":proUsage/C.PRO_LIMIT>=0.6?"#f59e0b":"var(--em)",fontWeight:700,fontSize:13}}>✦ Pro · <strong>{C.PRO_LIMIT-proUsage}</strong>/{C.PRO_LIMIT} {L("diese Woche","this week","cette semaine","questa settimana")}</span>
        <span style={{fontSize:11,color:"rgba(255,255,255,.3)"}}>🔄 {L("Reset Montag 07:00","Resets Mon 07:00","Lundi 07h","Lunedì 07:00")}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:9,flex:1,maxWidth:200}}>
        {(()=>{
          const pct = proUsage/C.PRO_LIMIT;
          const barColor = pct>=0.85?"#ef4444":pct>=0.6?"#f59e0b":"#10b981";
          const tooltip = L(`Noch ${C.PRO_LIMIT-proUsage} Erstellungen bis Montag 07:00 Uhr`,`${C.PRO_LIMIT-proUsage} creations left until Monday 07:00`,`${C.PRO_LIMIT-proUsage} créations restantes`,`${C.PRO_LIMIT-proUsage} creazioni rimanenti`);
          return <div className="u-tr" data-tip={tooltip}>
            <div className="u-fi" style={{width:`${pct*100}%`,background:barColor,color:barColor,animation:pct>=0.85?"barPulse 1.4s ease-in-out infinite":"none"}}/>
          </div>;
        })()}
        {proUsage/C.PRO_LIMIT>=0.8&&<button onClick={()=>window.open(C.stripeUltimateYearly,"_blank")} style={{background:"rgba(245,158,11,.15)",border:"1px solid rgba(245,158,11,.3)",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,color:"#f59e0b",cursor:"pointer",whiteSpace:"nowrap"}}>♾️ Ultimate</button>}
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

    plan306090: `🗓️ 30-60-90-TAGE-PLAN

Stelle: Senior Marketing Manager · Swisscom Bern | Start: 1. April 2026

📅 ERSTE 30 TAGE – «Verstehen»
Woche 1-2: Onboarding, alle Stakeholder kennenlernen, Prozesse verstehen
Woche 3-4: KPIs analysieren, bestehende Kampagnen bewerten
→ Ziel: 20 Key-Personen kennen, vollständiges KPI-Briefing

📅 TAGE 31-60 – «Beitragen»
Social-Media-Audit durchführen und präsentieren
Ersten Quick Win liefern: +10% Engagement
→ Ziel: Als Experte sichtbar werden

📅 TAGE 61-90 – «Führen»
Q3-Marketingstrategie präsentieren und Budget-Proposal einreichen
→ Ziel: Strategieplan genehmigt, als «Go-To-Person» positioniert

🎯 KPIs: Tag 30: Feedback positiv | Tag 60: Projekt live | Tag 90: Strategie approved`,

    referenz: `🏆 REFERENZSCHREIBEN

Für: Thomas Keller, Senior Developer
Von: Dr. Maria Suter, CTO · ABC Tech AG Zürich

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sehr geehrte Damen und Herren,

ich empfehle Herrn Thomas Keller ohne Einschränkung für eine Führungsposition.

In 3 Jahren bei ABC Tech AG hat Herr Keller die Migration unserer Plattform auf Microservices geleitet – CHF 2.5M Projekt, 3 Wochen vor Plan abgeschlossen. Er führte ein 5-köpfiges Team mit hoher Eigenverantwortung.

Besonders beeindruckend: Seine Fähigkeit, komplexe Technik verständlich zu kommunizieren.

Dr. Maria Suter, CTO | abc-tech.ch | +41 44 123 45 67

✅ Professioneller Ton · Konkrete Zahlen · Persönlicher Kontakt`,


    networking: L(
`🤝 NETWORKING-NACHRICHT – LinkedIn

An: Sarah Müller, HR-Leiterin, Google Zürich
Von: Marco Berger, Senior Developer, 6 Jahre Erfahrung

──────────────────────────────────────
KONTAKTANFRAGE (LinkedIn):
"Guten Tag Frau Müller,

Ihr Beitrag über Engineering-Kultur bei Google hat mich sehr angesprochen – besonders Ihr Punkt über psychologische Sicherheit im Team.

Als Senior Developer mit 6 Jahren Erfahrung in Python und Cloud-Architekturen interessiere ich mich für die Möglichkeiten bei Google Zürich. Ich würde mich freuen, Sie in meinem Netzwerk zu haben.

Mit freundlichen Grüssen
Marco Berger"

WARUM ES FUNKTIONIERT:
✓ Konkreter Anlass (ihr Beitrag)
✓ Kurz und respektvoll
✓ Keine direkte Bitte um Job
✓ Mehrwert für sie erkennbar`,
`🤝 NETWORKING MESSAGE

To: Sarah Miller, HR Lead, Google Zurich
From: Marco Berger, Senior Developer, 6 years experience

CONNECTION REQUEST:
"Hello Sarah,

Your post about engineering culture at Google really resonated with me – especially your point about psychological safety in teams.

As a Senior Developer with 6 years of experience in Python and Cloud architecture, I'm very interested in opportunities at Google Zurich. I'd be happy to connect.

Best regards, Marco Berger"

WHY IT WORKS: ✓ Specific hook ✓ Brief & respectful ✓ No direct ask ✓ Value clear`,
`🤝 MESSAGE DE NETWORKING

À: Sarah Müller, DRH, Google Zurich

DEMANDE DE CONNEXION:
"Bonjour Madame Müller,

Votre article sur la culture d'ingénierie chez Google m'a beaucoup inspiré.

En tant que développeur senior avec 6 ans d'expérience, je suis intéressé par les opportunités chez Google Zurich. Ce serait un plaisir de vous avoir dans mon réseau.

Cordialement, Marco Berger"`,
`🤝 MESSAGGIO DI NETWORKING

A: Sarah Müller, HR Lead, Google Zurigo

RICHIESTA CONNESSIONE:
"Buongiorno Sig.ra Müller,

Il suo articolo sulla cultura ingegneristica di Google mi ha ispirato molto.

Come sviluppatore senior con 6 anni di esperienza, sono interessato alle opportunità presso Google Zurigo.

Cordiali saluti, Marco Berger"`),

    lehrstelle: L(
`🎓 LEHRSTELLEN-BEWERBUNG (Swiss-Apprentice Format)

Lehrberuf: Kaufmann/-frau EFZ | Firma: UBS AG, Zürich | Name: Lena Müller, 15 J.
Schnupperlehre: ✅ 3 Tage bei UBS, 14.–16. Jan. 2026

──────────────────────────────────────
Lena Müller · Seestrasse 12 · 8001 Zürich
lena.mueller@gmail.com · 079 123 45 67 · geb. 15.04.2010
Heimatort: Küsnacht ZH

UBS AG – Personalabteilung
Bahnhofstrasse 45
8001 Zürich

                                    Zürich, 18. März 2026

**Bewerbung als Lernende Kauffrau EFZ (Dienstleistung & Administration) – Lehrstelle 2026**

Sehr geehrte Damen und Herren

Anlässlich der Berufsmesse Zürich 2025, an welcher ich Ihren Stand besuchte, habe ich mein Interesse für die UBS vertieft und mich daraufhin für eine Schnupperlehre beworben.

Während meiner 3-tägigen Schnupperlehre vom 14. bis 16. Januar 2026 bei der UBS Filiale Zürich-City konnte ich erste wertvolle Einblicke in den Berufsalltag einer Kauffrau EFZ gewinnen. Besonders beeindruckt hat mich die professionelle Zusammenarbeit im Team und der direkte Kundenkontakt. Dieser Einblick hat meinen Berufswunsch nachhaltig bestätigt.

Ich bin Lena, 15 Jahre alt, und besuche die 3. Klasse Sekundarschule Niveau A in Zürich-Altstetten. In Mathematik (Note 5.5) und Deutsch (Note 5) gehöre ich zu den Besten meiner Klasse. Seit zwei Jahren führe ich als Klassenkassierin die Vereinsrechnung – eine Aufgabe, die meine Freude an kaufmännischer Arbeit täglich stärkt.

Die UBS wähle ich, weil sie als grösste Schweizer Privatbank für Qualität, Verlässlichkeit und echte Entwicklungsmöglichkeiten steht. Das von Ihnen angebotene interne Ausbildungsprogramm für Lernende und die Möglichkeit der Berufsmaturität sind für meine Karriere genau das Richtige.

Gerne stelle ich mich Ihnen in einem persönlichen Gespräch vor und überzeuge Sie davon, dass ich die richtige Kandidatin für Ihre Lehrstelle bin.

Mit freundlichen Grüssen
Lena Müller

Beilagen: Lebenslauf inkl. Bewerbungsfoto, Schulzeugnis 2025/26, Schnupperlehrbestätigung UBS
──────────────────────────────────────
✓ Schweizer Rechtschreibung (kein ß)  ✓ Schnupperlehre erwähnt (Swiss USP!)
✓ Datum + Ort rechtsbündig  ✓ Betreff fett + EFZ  ✓ Noten angegeben`,
`🎓 SWISS APPRENTICESHIP APPLICATION

Trade: Commercial employee EFZ | Company: UBS AG, Zurich | Name: Lena Müller, 15
Trial placement (Schnupperlehre): ✅ 3 days at UBS, 14–16 Jan 2026

Lena Müller · Seestrasse 12 · 8001 Zurich
lena.mueller@gmail.com · 079 123 45 67

                              Zurich, 18 March 2026

**Application for Apprenticeship as Commercial Employee EFZ – 2026**

Dear HR Team

At the Berufsmesse Zürich 2025, I visited your stand and was inspired to apply for a trial placement (Schnupperlehre).

During my 3-day trial placement from 14–16 January 2026 at UBS Zurich-City, I gained valuable insight into the daily work of a commercial employee. I was particularly impressed by the teamwork and direct client contact. This experience confirmed my career choice.

I am Lena, 15 years old, in 3rd year secondary school (Niveau A) in Zurich. In maths (5.5) and German (5) I rank among the top students. For two years I have managed our class fund – work that strengthens my passion for commercial tasks daily.

I would be delighted to present myself in a personal interview.

Kind regards, Lena Müller

Enclosures: CV with photo, school report 2025/26, Schnupperlehre confirmation UBS
──────────────────────────────────────
✓ Swiss format  ✓ Trial placement highlighted (Swiss USP!)  ✓ Grades included`,
`🎓 CANDIDATURE APPRENTISSAGE

Métier: Employée de commerce AFC | Entreprise: UBS SA, Zurich

Chère équipe UBS,

Depuis ma visite scolaire chez UBS, je sais que je veux devenir employée de commerce – chez vous.

Je m'appelle Lena, 15 ans, en 3e secondaire à Zurich. Je suis parmi les meilleurs élèves en mathématiques et économie. Je gère la caisse de classe depuis deux ans.

Dans l'attente d'un entretien,
Lena Müller`,
`🎓 CANDIDATURA APPRENDISTATO

Mestiere: Impiegata di commercio AFC | Azienda: UBS SA, Zurigo

Gentile team UBS,

Da quando ho visitato UBS durante una gita scolastica, so che voglio diventare impiegata di commercio – da voi.

Mi chiamo Lena, 15 anni. In matematica ed economia sono tra i migliori della classe.

Distinti saluti, Lena Müller`),

    kuendigung: L(
`📤 KÜNDIGUNG – MUSTER

Name: Thomas Keller | Firma: Musterfirma AG, Zürich

──────────────────────────────────────
Thomas Keller
Beispielstrasse 5
8001 Zürich
thomas.keller@email.ch

Musterfirma AG
z.H. HR-Abteilung / Frau Sabine Huber
Industriestrasse 10
8001 Zürich

Zürich, 18. März 2026

KÜNDIGUNG DES ARBEITSVERHÄLTNISSES

Sehr geehrte Frau Huber,

hiermit kündige ich mein Arbeitsverhältnis als Senior Accountant ordentlich und fristgerecht per 31. Mai 2026 (3 Monate Kündigungsfrist gemäss Arbeitsvertrag).

Ich bedanke mich herzlich für die gute Zusammenarbeit und die wertvollen Erfahrungen der vergangenen vier Jahre. Ich werde bis zum letzten Arbeitstag meine Aufgaben gewissenhaft erfüllen und stehe für eine Übergabe vollumfänglich zur Verfügung.

Ich bitte Sie, mir ein wohlwollendes Arbeitszeugnis auszustellen.

Mit freundlichen Grüssen

Thomas Keller

──────────────────────────────────────
✓ Schriftform eingehalten (OR Art. 335)
✓ Kündigungsfrist korrekt (3 Monate = letzter Tag des Monats)
✓ Kein Kündigungsgrund angegeben (nicht nötig)
✓ Zeugnis-Bitte enthalten (wichtig für gutes Zeugnis)`,
`📤 RESIGNATION LETTER

Thomas Keller | Zurich | March 18, 2026

Dear Ms Huber,

I hereby resign from my position as Senior Accountant with the contractual notice period of 3 months, effective May 31, 2026.

I sincerely thank you for the excellent collaboration over the past four years. I will fulfill my duties diligently until my last working day and am fully available for a handover.

I kindly request a positive work reference letter.

Kind regards, Thomas Keller

✓ Written form observed ✓ Notice period correct ✓ No reason required ✓ Reference request included`,
`📤 LETTRE DE DÉMISSION

Thomas Keller | Zurich | 18 mars 2026

Madame Huber,

Je résilie mon contrat de travail en tant que Senior Accountant avec un préavis de 3 mois, au 31 mai 2026.

Je vous remercie chaleureusement pour notre excellente collaboration. Je reste disponible pour une transition complète.

Je vous prie de bien vouloir m'établir un certificat de travail élogieux.

Cordialement, Thomas Keller`,
`📤 LETTERA DI DIMISSIONI

Thomas Keller | Zurigo | 18 marzo 2026

Gentile Sig.ra Huber,

Mi dimetto dal mio incarico di Senior Accountant con preavviso di 3 mesi, con effetto dal 31 maggio 2026.

La ringrazio per la piacevole collaborazione. Sono disponibile per un passaggio di consegne completo.

La prego di rilasciarmi un certificato di lavoro favorevole.

Distinti saluti, Thomas Keller`),

    gehalt: L(
`💰 GEHALTSVERHANDLUNGS-LEITFADEN

Deine Situation: Senior Developer · Aktuell CHF 105'000 · Ziel CHF 125'000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EINSTIEGSSATZ:
"Ich schätze unsere Zusammenarbeit sehr und möchte offen über meine Vergütung sprechen, 
da ich den Markt beobachte und meine Leistungen einschätzen kann."

TOP 5 ARGUMENTE:
① Marktdaten: Salarium.ch Median für Senior Developer Zürich: CHF 118'000–132'000
② Performance: 3 Kritische Projekte pünktlich geliefert, CHF 2.4M Umsatz mitgeneriert
③ Skills-Premium: Python + Cloud-Expertise = 22% über Marktdurchschnitt
④ Fluktuationskosten: Neueinstieg kostet 150-200% eines Jahresgehalts
⑤ Inflations-Ausgleich: 3 Jahre ohne Erhöhung = 9% realer Kaufkraftverlust

ANTWORT AUF "Budget ist leider voll":
"Ich verstehe das. Wäre eine Einmalprämie von CHF 15'000 oder 
mehr Home-Office-Tage denkbar als Alternative?"

ANTWORT AUF "Wir müssen das intern besprechen":
"Das verstehe ich. Bis wann darf ich mit einer Rückmeldung rechnen? 
Ich würde mich gerne am [Datum] nochmals melden."

ABSCHLUSSSATZ: "Ich freue mich auf eine faire Lösung, die unsere 
langfristige Zusammenarbeit stärkt."

DO's ✓: Schweigen nach deiner Zahl · Erst höher ansetzen · Schriftlich festhalten
DON'Ts ✗: Gehalt mit privatem Bedarf begründen · Erste Zahl sofort akzeptieren`,
`💰 SALARY NEGOTIATION GUIDE

Your situation: Senior Developer | Current CHF 105'000 | Target CHF 125'000

OPENING: "I value our collaboration and would like to openly discuss compensation."

TOP 5 ARGUMENTS:
① Market: Salarium.ch median for Senior Developer Zurich: CHF 118k–132k
② Performance: 3 critical projects delivered on time
③ Skills premium: Python/Cloud = 22% above market average
④ Retention: New hire costs 150-200% annual salary
⑤ Inflation: 3 years = 9% real salary loss

RESPONSE TO "Budget is full": "Could we discuss a CHF 15k bonus or extra home office?"
CLOSING: "I look forward to a fair solution strengthening our long-term collaboration."`,
`💰 NÉGOCIATION SALARIALE

Situation: CHF 105'000 → CHF 125'000

OUVERTURE: "Je valorise notre collaboration et souhaite discuter de ma rémunération."
CLÉ: Salarium.ch médiane CHF 118k–132k pour Zurich
RÉPONSE: "Une prime de CHF 15k serait-elle possible si le budget est limité?"`,
`💰 NEGOZIAZIONE STIPENDIO

Situazione: CHF 105'000 → CHF 125'000

APERTURA: "Apprezzo la nostra collaborazione e vorrei discutere della retribuzione."
ARGOMENTO: Salarium.ch mediana CHF 118k–132k per Zurigo
RISPOSTA: "Sarebbe possibile un bonus di CHF 15k se il budget è limitato?"`)
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
        setAuthSession({email:user.email,plan:user.plan,isAdmin:user.isAdmin});
        if(user.plan==="pro"||user.plan==="ultimate"||user.isAdmin){actPro();setPro(true);}
        setShowAuth(false);
      }}/>}
    {showAdmin&&<AdminDashboard lang={lang} onClose={()=>setShowAdmin(false)}/>}
    {showReferral&&<ReferralPanel lang={lang} session={authSession} onClose={()=>setShowReferral(false)}/>}
    {showMembers&&<MemberPanel lang={lang} session={authSession} onClose={()=>setShowMembers(false)}/>}
  </>;

  // ── Shared overlays (appear on every page) ──────────────
  // PromoModal ist oben definiert

  const sharedOverlays = <>
      {showPromo && page==="landing" && <PromoBanner lang={lang} navTo={navTo} setPw={setPw} onClose={closePromo}/>}
    {splash&&<SplashScreen onDone={()=>{setSplash(false);try{sessionStorage.setItem("stf_splashed","1");}catch{}}}/>}
    <OfflineBanner lang={lang}/>
    {showReferral&&<ReferralPanel lang={lang} session={authSession} onClose={()=>setShowReferral(false)}/>}
    {showPromo&&!authSession&&<PromoModal/>}
  </>;

  if(page==="landing") return(<>{<style>{FONTS+CSS}</style>}{sharedOverlays}{pw&&<PW/>}
    {showProfiles&&<ProfileManager lang={lang} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    {authModals}
    {cookieBanner&&<CookieBanner lang={lang} onAccept={acceptCookie}/>}
    <div>
      <Nav/>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner con">
          {/* Left text */}
          <div>
            <div className="lp-hero-badge">
              <span className="lp-badge-dot"/>
              {lang==="de"?"KI-gestützt für den Schweizer Arbeitsmarkt":lang==="fr"?"Propulsé par l'IA pour le marché suisse":lang==="it"?"Potenziato dall'IA per il mercato svizzero":"AI-powered for the Swiss job market"}
            </div>
            <h1 className="lp-h1">{t.hero.h1a}<br/>{t.hero.h1b} <em>{t.hero.h1c}</em></h1>
            <p className="lp-hero-sub">{t.hero.sub}</p>
            <div className="lp-hero-actions">
              <button className="btn b-em b-lg" onClick={()=>navTo("app")}>{t.hero.cta}</button>
              <button className="btn b-outd" onClick={()=>document.getElementById("tools")?.scrollIntoView({behavior:"smooth"})}>{t.hero.how}</button>
            </div>
            <div className="lp-hero-stats">
              {[{n:"18+",l:t.hero.stats[0].l},{n:"3'000+",l:t.hero.stats[1].l},{n:"4",l:t.hero.stats[2].l}].map((s,i)=>(
                <div key={i}>
                  <span className="lp-stat-num">{s.n}</span>
                  <span className="lp-stat-label">{s.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Chat mockup */}
          <div className="lp-hero-visual">
            <div style={{position:"relative"}}>
              <div className="lp-chat">
                <div className="lp-chat-hdr">
                  <div className="lp-chat-av">S</div>
                  <div>
                    <div className="lp-chat-name">Stella – KI-Assistentin</div>
                    <div className="lp-chat-status"><span className="lp-status-dot"/>{lang==="de"?"Online – bereit zu helfen":"Online – ready to help"}</div>
                  </div>
                </div>
                <div className="lp-msgs">
                  <div className="lp-msg-u">{lang==="de"?"Kannst du mein Motivationsschreiben für Swisscom optimieren?":lang==="fr"?"Peux-tu optimiser ma lettre de motivation pour Swisscom ?":"Can you optimize my cover letter for Swisscom?"}</div>
                  <div className="lp-msg-a">
                    <strong>{lang==="de"?"Natürlich!":lang==="fr"?"Bien sûr !":"Of course!"}</strong>
                    {lang==="de"?" Ich habe dein Schreiben analysiert – hier sind die 3 wichtigsten Optimierungen:":lang==="fr"?" J'ai analysé ta lettre – voici les 3 améliorations clés :":" I've analysed your letter – here are the 3 key improvements:"}
                    <br/>
                    {lang==="de"?"✓ ATS-Keywords · ✓ CH-Format · ✓ Firmen-Bezug":lang==="fr"?"✓ Mots-clés ATS · ✓ Format CH · ✓ Lien entreprise":"✓ ATS keywords · ✓ CH format · ✓ Company reference"}
                  </div>
                  <div className="lp-typing"><div className="lp-typing-dot"/><div className="lp-typing-dot"/><div className="lp-typing-dot"/></div>
                </div>
              </div>
              <div className="lp-fc lp-fc1">
                <span>📈</span>
                <div>
                  <div style={{fontSize:11,fontWeight:500,color:"var(--ink)"}}>CV-Score</div>
                  <div className="lp-fc-green">54 → 94 &nbsp;+40↑</div>
                </div>
              </div>
              <div className="lp-fc lp-fc2">
                <span>🎯</span>
                <div>
                  <div style={{fontSize:11,fontWeight:500,color:"var(--ink)"}}>{lang==="de"?"Jobs gefunden":lang==="fr"?"Offres trouvées":"Jobs found"}</div>
                  <div className="lp-fc-blue">24 {lang==="de"?"passende":lang==="fr"?"correspondantes":"matching"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LOGOS ── */}
      <div className="lp-logos">
        <p className="lp-logos-label">{lang==="de"?"Vertrauen von Jobsuchenden bei":lang==="fr"?"La confiance des candidats chez":lang==="it"?"La fiducia dei candidati presso":"Trusted by job seekers at"}</p>
        <div className="lp-logos-mw">
          <div className="lp-logos-m">
            {["Swisscom","Migros","UBS","Nestlé","Roche","SBB","ABB","Zurich","Novartis","PostFinance",
              "Swisscom","Migros","UBS","Nestlé","Roche","SBB","ABB","Zurich","Novartis","PostFinance"].map((l,i)=>(
              <span key={i} className="lp-logo">{l}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── TOOLS ── */}
      <section className="lp-section" id="tools">
        <div className="con">
          <div style={{marginBottom:48}} className="lp-reveal">
            <span className="lp-label">{t.tools.label}</span>
            <h2 className="lp-title">{t.tools.title}</h2>
            <p className="lp-sub">{t.tools.sub}</p>
          </div>
          <div className="lp-tool-grid">
            {t.tools.items.map((item,i)=>(
              <div key={i} className="lp-tool-card lp-reveal" style={{transitionDelay:`${i*.08}s`}} onClick={()=>navTo(item.page)}>
                <span className={`lp-badge ${item.badge==="1× Gratis"||item.badge==="1× Free"||item.badge==="1× Gratuit"||item.badge==="1× Gratuito"?"lp-badge-free":"lp-badge-pro"}`}>{item.badge}</span>
                <div className="lp-tool-ico">{item.ico}</div>
                <div className="lp-tool-title">{item.t}</div>
                <div className="lp-tool-desc">{item.p}</div>
              </div>
            ))}
          </div>
          {/* Mini tools strip */}
          {GENERIC_TOOLS.length>0&&<div style={{marginTop:32,display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center"}}>
            <div style={{width:"100%",textAlign:"center",fontSize:12,fontWeight:600,color:"var(--mu)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:8}}>{lang==="de"?"& weitere Tools":"& more tools"}</div>
            {GENERIC_TOOLS.map(g=>(
              <button key={g.id} onClick={()=>navTo(g.id)} style={{display:"flex",alignItems:"center",gap:8,background:"white",border:"1.5px solid var(--bo)",borderRadius:30,padding:"8px 16px",fontSize:13,fontWeight:500,color:"var(--ink)",cursor:"pointer",transition:"all .18s",fontFamily:"var(--bd)"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--em)";e.currentTarget.style.color="var(--em)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--bo)";e.currentTarget.style.color="var(--ink)";}}>
                <span>{g.ico}</span><span>{g.t[lang]||g.t.de}</span>
              </button>
            ))}
          </div>}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-section lp-section-alt">
        <div className="con">
          <div style={{textAlign:"center",marginBottom:48}} className="lp-reveal">
            <span className="lp-label">{lang==="de"?"So funktioniert's":lang==="fr"?"Comment ça marche":lang==="it"?"Come funziona":"How it works"}</span>
            <h2 className="lp-title" style={{textAlign:"center",margin:"0 auto 16px"}}>
              {lang==="de"?"In 3 Schritten zum":lang==="fr"?"En 3 étapes vers":lang==="it"?"In 3 passi verso":"In 3 steps to your"} <em>{lang==="de"?"Traumjob":lang==="fr"?"poste idéal":lang==="it"?"lavoro dei sogni":"dream job"}</em>
            </h2>
            <p className="lp-sub" style={{margin:"0 auto"}}>{t.how.sub}</p>
          </div>
          <div className="lp-steps">
            {t.how.steps.map((s,i)=>(
              <div key={i} className="lp-step lp-reveal" style={{transitionDelay:`${i*.1}s`}}>
                <div className="lp-step-n">{s.n}</div>
                <h4>{s.t}</h4>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="sec sec-dk" id="preise" style={{position:"relative",overflow:"hidden"}}>
        <div className="orb" style={{width:500,height:500,background:"radial-gradient(circle,rgba(37,99,235,.15),transparent)",top:"-120px",right:"-100px",animationDelay:"-2s",opacity:.4}}/>
        <div className="con">
          <div className="sh shc lp-reveal">
            <div className="seye">{t.price.label}</div>
            <h2 className="st">{t.price.title}</h2>
            <p className="ss">{t.price.sub}</p>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,marginTop:24}}>
              <div style={{display:"inline-flex",alignItems:"center",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:99,padding:4,gap:4}}>
                <button onClick={()=>setYearly(false)} style={{padding:"8px 22px",borderRadius:99,border:"none",background:!yearly?"white":"transparent",color:!yearly?"var(--ink)":"rgba(255,255,255,.45)",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .22s",fontFamily:"var(--bd)",whiteSpace:"nowrap"}}>{t.price.monthly}</button>
                <button onClick={()=>setYearly(true)} style={{padding:"8px 22px",borderRadius:99,border:"none",background:yearly?"var(--em)":"transparent",color:yearly?"white":"rgba(255,255,255,.45)",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .22s",display:"flex",alignItems:"center",gap:8,fontFamily:"var(--bd)",whiteSpace:"nowrap"}}>
                  {t.price.yearly}
                  <span style={{background:yearly?"rgba(255,255,255,.2)":"rgba(37,99,235,.25)",color:yearly?"white":"var(--em)",borderRadius:99,padding:"1px 8px",fontSize:11,fontWeight:700}}>–17%</span>
                </button>
              </div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,maxWidth:1100,margin:"0 auto"}}>
            {t.price.tiers.map((tier,tierIdx)=>{
              const isFree=tier.id==="free",isPro=tier.id==="pro",isUlt=tier.id==="ultimate",isStarter=tier.id==="starter";
              const fmt=(n)=>Number(n).toFixed(2);
              const displayPrice=tier.oneTime?fmt(tier.priceM):(yearly&&tier.priceY?fmt(tier.priceY):(tier.price===0?"0":fmt(tier.priceM)));
              return(
                <div key={tier.id} className="lp-reveal" style={{
                  borderRadius:18,padding:"26px 22px",position:"relative",
                  border:isPro?"2px solid var(--em)":isUlt?"2px solid rgba(245,158,11,.4)":isStarter?"2px solid rgba(239,68,68,.4)":"1.5px solid rgba(255,255,255,.09)",
                  background:isPro?"rgba(37,99,235,.08)":isUlt?"rgba(245,158,11,.04)":isStarter?"rgba(239,68,68,.04)":"var(--dk3)",
                  boxShadow:isPro?"0 0 0 1px rgba(37,99,235,.15),0 20px 60px rgba(37,99,235,.1)":"none",
                  transition:"transform .22s cubic-bezier(.34,1.56,.64,1)",transitionDelay:`${tierIdx*.1}s`
                }} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-4px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
                  {isPro&&<div style={{position:"absolute",top:-13,left:"50%",transform:"translateX(-50%)",background:"var(--em)",color:"white",fontSize:11,fontWeight:700,padding:"4px 16px",borderRadius:999,whiteSpace:"nowrap",letterSpacing:.3}}>{t.price.recom}</div>}
                  {isStarter&&<div style={{position:"absolute",top:-13,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,#ef4444,#dc2626)",color:"white",fontSize:11,fontWeight:700,padding:"4px 16px",borderRadius:999,whiteSpace:"nowrap"}}>🎒 {lang==="de"?"Für Schüler":lang==="en"?"For Students":lang==="fr"?"Pour Élèves":"Per Studenti"}</div>}
                  {isUlt&&<div style={{position:"absolute",top:-13,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"white",fontSize:11,fontWeight:700,padding:"4px 16px",borderRadius:999,whiteSpace:"nowrap"}}>⭐ Ultimate</div>}
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:isPro?"var(--em)":isUlt?"#f59e0b":isStarter?"#ef4444":"rgba(255,255,255,.28)",marginBottom:10}}>{tier.name}</div>
                  <div style={{fontFamily:"var(--hd)",fontSize:36,fontWeight:400,color:"white",lineHeight:1,marginBottom:4,letterSpacing:"-1px"}}>
                    {tier.price===0?(lang==="de"?"Gratis":lang==="fr"?"Gratuit":"Free"):`CHF ${displayPrice}`}
                    {tier.oneTime&&<span style={{fontSize:13,fontWeight:400,color:"rgba(255,255,255,.35)",fontFamily:"var(--bd)",letterSpacing:0}}> {lang==="de"?"einmalig":lang==="fr"?"unique":"one-time"}</span>}
                    {!tier.oneTime&&tier.price!==0&&<span style={{fontSize:13,fontWeight:400,color:"rgba(255,255,255,.35)",fontFamily:"var(--bd)",letterSpacing:0}}>/Mo.</span>}
                  </div>
                  <p style={{fontSize:12,color:"rgba(255,255,255,.38)",marginBottom:18,lineHeight:1.5}}>{tier.note}</p>
                  <ul style={{listStyle:"none",marginBottom:20}}>
                    {(tier.list||[]).slice(0,5).map((li,j)=>(
                      <li key={j} style={{fontSize:12,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.05)",display:"flex",alignItems:"flex-start",gap:8,color:"rgba(255,255,255,.65)",lineHeight:1.5}}>
                        <span style={{color:"var(--em)",flexShrink:0,marginTop:1}}>✓</span>{li.replace(/^✦\s*/,"")}
                      </li>
                    ))}
                  </ul>
                  {isPro&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <button onClick={()=>window.open(C.stripeMonthly,"_blank")} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:"var(--em)",color:"white",fontFamily:"var(--bd)",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s"}}>
                      {lang==="de"?"Monatlich – CHF "+C.priceM+"/Mo. →":lang==="fr"?"Mensuel – CHF "+C.priceM+"/mo →":"Monthly – CHF "+C.priceM+"/mo →"}
                    </button>
                    <button onClick={()=>window.open(C.stripeYearly,"_blank")} style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid var(--em)",background:"transparent",color:"var(--em)",fontFamily:"var(--bd)",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s"}}>
                      {lang==="de"?"Jährlich – CHF "+C.priceY+"/Mo. →":lang==="fr"?"Annuel – CHF "+C.priceY+"/mo →":"Yearly – CHF "+C.priceY+"/mo →"}<span style={{marginLeft:6,background:"rgba(37,99,235,.12)",borderRadius:99,padding:"1px 7px",fontSize:11}}>–17%</span>
                    </button>
                  </div>}
                  {isFree&&<button onClick={()=>navTo("app")} style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid rgba(255,255,255,.12)",background:"transparent",color:"rgba(255,255,255,.7)",fontFamily:"var(--bd)",fontSize:14,fontWeight:500,cursor:"pointer",transition:"all .2s"}}>
                    {lang==="de"?"Kostenlos starten":lang==="fr"?"Commencer gratuitement":lang==="it"?"Inizia gratis":"Start for free"}
                  </button>}
                  {isUlt&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <button onClick={()=>window.open(C.stripeUltimate,"_blank")} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"white",fontFamily:"var(--bd)",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                      {lang==="de"?"Monatlich – CHF "+C.priceUltimate+"/Mo. →":lang==="fr"?"Mensuel – CHF "+C.priceUltimate+"/mo →":"Monthly – CHF "+C.priceUltimate+"/mo →"}
                    </button>
                    <button onClick={()=>window.open(C.stripeUltimateYearly,"_blank")} style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid #f59e0b",background:"transparent",color:"#f59e0b",fontFamily:"var(--bd)",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                      {lang==="de"?"Jährlich – CHF "+C.priceUltimateYearly+"/Mo. →":lang==="fr"?"Annuel – CHF "+C.priceUltimateYearly+"/mo →":"Yearly – CHF "+C.priceUltimateYearly+"/mo →"}<span style={{marginLeft:6,background:"rgba(245,158,11,.12)",borderRadius:99,padding:"1px 7px",fontSize:11}}>–20%</span>
                    </button>
                  </div>}
                  {isStarter&&<button onClick={()=>window.open(C.stripeStarter,"_blank")} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#ef4444,#dc2626)",color:"white",fontFamily:"var(--bd)",fontSize:14,fontWeight:600,cursor:"pointer"}}>
                    {tier.btn||`Starter – CHF ${C.priceStarter}`}
                  </button>}
                  <div style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,.18)",marginTop:10}}>{lang==="de"?"Stripe · Twint · Jederzeit kündbar":lang==="fr"?"Stripe · Twint · Résiliable":"Stripe · Twint · Cancel anytime"}</div>
                </div>
              );
            })}
          </div>
          <div style={{textAlign:"center",marginTop:36}}>
            <div className="pay-row">{t.payments.methods.map(m=><div key={m} className="pay-chip">{m}</div>)}</div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="lp-section">
        <div className="con">
          <div style={{marginBottom:48}} className="lp-reveal">
            <span className="lp-label">{t.testi.label}</span>
            <h2 className="lp-title">{t.testi.title}</h2>
            <p className="lp-sub">{lang==="de"?"Echte Erfahrungen aus dem Schweizer Arbeitsmarkt.":lang==="fr"?"Retours réels du marché du travail suisse.":lang==="it"?"Esperienze reali dal mercato del lavoro svizzero.":"Real experiences from the Swiss job market."}</p>
          </div>
          <div className="lp-testi-grid">
            {t.testi.items.map((item,i)=>(
              <div key={i} className="lp-testi-card lp-reveal" style={{transitionDelay:`${i*.1}s`}}>
                <div className="lp-testi-stars">{item.s}</div>
                <p className="lp-testi-text">„{item.t}"</p>
                <div className="lp-testi-author">
                  <div className="lp-testi-av" style={{background:["#2563EB","#059669","#9333EA"][i%3]}}>{item.a[0]}</div>
                  <div>
                    <div className="lp-testi-name">{item.a}</div>
                    <div className="lp-testi-role">{item.r}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CV COMPARE ── */}
      <section className="lp-section lp-section-alt">
        <div className="con">
          <div style={{textAlign:"center",marginBottom:48}} className="lp-reveal">
            <span className="lp-label">{lang==="de"?"Vorher / Nachher":lang==="fr"?"Avant / Après":lang==="it"?"Prima / Dopo":"Before / After"}</span>
            <h2 className="lp-title" style={{textAlign:"center",margin:"0 auto 16px"}}>
              {lang==="de"?"Was KI-Optimierung":lang==="fr"?"Ce que l'optimisation IA":lang==="it"?"Cosa fa l'ottimizzazione IA":"What AI optimisation"}<br/>
              <em>{lang==="de"?"wirklich":lang==="fr"?"vraiment":lang==="it"?"veramente":"really"}</em> {lang==="de"?"bewirkt":lang==="fr"?"apporte":lang==="it"?"porta":"does"}
            </h2>
            <p className="lp-sub" style={{margin:"0 auto"}}>{lang==="de"?"Sieh selbst, wie Stellify ein durchschnittliches CV in eine überzeugende Bewerbung verwandelt.":lang==="fr"?"Voyez comment Stellify transforme un CV ordinaire en une candidature convaincante.":"See how Stellify turns an average CV into a compelling application."}</p>
          </div>
          <div className="lp-cv-grid lp-reveal">
            {/* BEFORE */}
            <div className="lp-cv-card">
              <div className="lp-cv-hdr bad">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                {lang==="de"?"Vorher – ChatGPT / Claude / andere KI":lang==="fr"?"Avant – ChatGPT / Claude / autre IA":"Before – ChatGPT / Claude / other AI"}
              </div>
              <div className="lp-cv-body">
                {[
                  {l:lang==="de"?"Zusammenfassung":lang==="fr"?"Résumé":"Summary",lines:["lg","md"]},
                  {l:lang==="de"?"Berufserfahrung":lang==="fr"?"Expérience":"Experience",lines:["fl","md","sh"]},
                  {l:lang==="de"?"Fähigkeiten":lang==="fr"?"Compétences":"Skills",lines:["lg","sh"]}
                ].map((b,i)=>(
                  <div key={i} className="lp-cv-block bad">
                    <div className="lp-cv-label">{b.l}</div>
                    {b.lines.map((c,j)=><div key={j} className={`lp-cv-line ${c}`}/>)}
                  </div>
                ))}
                <div className="lp-cv-score">
                  <div className="lp-cv-score-row"><span>CV-Score</span><span style={{color:"#EF4444",fontWeight:600}}>54 / 100</span></div>
                  <div className="lp-cv-track"><div className="lp-cv-fill" style={{width:"54%",background:"#EF4444"}}/></div>
                </div>
              </div>
            </div>
            {/* AFTER */}
            <div className="lp-cv-card" style={{borderColor:"rgba(5,150,105,.3)"}}>
              <div className="lp-cv-hdr good">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {lang==="de"?"Nachher – KI-optimiert von Stellify":lang==="fr"?"Après – Optimisé par Stellify":"After – AI optimised by Stellify"}
              </div>
              <div className="lp-cv-body">
                {[
                  {l:lang==="de"?"Zusammenfassung":lang==="fr"?"Résumé":"Summary",lines:["fl","lg"],ai:"✓ KI-optimiert"},
                  {l:lang==="de"?"Berufserfahrung":lang==="fr"?"Expérience":"Experience",lines:["fl","lg","md"],ai:"✓ ATS-Keywords"},
                  {l:lang==="de"?"Fähigkeiten":lang==="fr"?"Compétences":"Skills",lines:["fl","lg"],ai:"✓ CH-Standard"}
                ].map((b,i)=>(
                  <div key={i} className="lp-cv-block good">
                    <div className="lp-cv-label">{b.l}</div>
                    {b.lines.map((c,j)=><div key={j} className={`lp-cv-line ${c}`}/>)}
                    <span className="lp-cv-ai">{b.ai}</span>
                  </div>
                ))}
                <div className="lp-cv-score">
                  <div className="lp-cv-score-row"><span>CV-Score</span><span style={{color:"#059669",fontWeight:600}}>94 / 100 &nbsp;+40 ↑</span></div>
                  <div className="lp-cv-track"><div className="lp-cv-fill" style={{width:"94%",background:"#059669"}}/></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <FaqSection lang={lang} email={C.email}/>

      {/* ── CTA ── */}
      <section className="lp-cta">
        <div className="con" style={{position:"relative",zIndex:1}}>
          <h2 className="lp-title" style={{color:"white",textAlign:"center",marginBottom:16}}>{lang==="de"?"Starte noch heute.":lang==="fr"?"Commencez dès aujourd'hui.":lang==="it"?"Inizia oggi stesso.":"Start today."}</h2>
          <p style={{fontSize:16,color:"rgba(255,255,255,.48)",marginBottom:36,textAlign:"center",fontWeight:300}}>{lang==="de"?"Kostenlos. Ohne Kreditkarte. In 2 Minuten eingerichtet.":lang==="fr"?"Gratuit. Sans carte bancaire. Prêt en 2 minutes.":"Free. No credit card. Set up in 2 minutes."}</p>
          <div style={{display:"flex",justifyContent:"center"}}>
            <button className="btn-white" onClick={()=>navTo("app")}>
              {lang==="de"?"Jetzt kostenlos starten →":lang==="fr"?"Commencer gratuitement →":lang==="it"?"Inizia gratis ora →":"Start for free now →"}
            </button>
          </div>
        </div>
      </section>

      <Footer/>
    </div>
  </>);


  // ══════════════════ APPLICATION TOOL ══════════════════
  if(page==="app") return(<>{<style>{FONTS+CSS}</style>}{sharedOverlays}{pw&&<PW/>}
    {authModals}
    {showProfiles&&<ProfileManager lang={lang} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    <Nav dark/>
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
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:4}}>
          <div>
            <div className="ct" style={{margin:0}}>{lang==="de"?"Dein Profil":lang==="fr"?"Votre profil":lang==="it"?"Il tuo profilo":"Your profile"}</div>
            <div className="cs">{lang==="de"?"Die KI erstellt massgeschneiderte Unterlagen.":lang==="fr"?"L'IA créera des documents sur mesure.":lang==="it"?"L'IA creerà documenti su misura.":"The AI will create tailored documents."}</div>
          </div>
          {activeProfile&&(activeProfile.name||activeProfile.beruf)&&<button type="button" onClick={()=>{
            setProf({
              name:activeProfile.name||prof.name,
              beruf:activeProfile.beruf||prof.beruf,
              erfahrung:activeProfile.erfahrung||prof.erfahrung,
              skills:activeProfile.skills||prof.skills,
              sprachen:activeProfile.sprachen||prof.sprachen,
              ausbildung:activeProfile.ausbildung||prof.ausbildung
            });
          }} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(16,185,129,.1)",border:"1.5px solid rgba(16,185,129,.3)",borderRadius:10,padding:"7px 14px",fontSize:12,fontWeight:700,color:"var(--em)",cursor:"pointer",flexShrink:0,transition:"all .2s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(16,185,129,.18)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(16,185,129,.1)"}>
            ⚡ {lang==="de"?`Auto-Fill: ${activeProfile.name||activeProfile.beruf}`:lang==="en"?`Auto-Fill: ${activeProfile.name||activeProfile.beruf}`:lang==="fr"?`Remplir: ${activeProfile.name||activeProfile.beruf}`:`Auto-riempi: ${activeProfile.name||activeProfile.beruf}`}
          </button>}
        </div>
        <DocUpload lang={lang} file={appDoc}
          onFile={f=>setAppDoc({name:f.name,raw:f,extracted:false})}
          onText={(t,n)=>{ setAppDoc({name:n,text:t,extracted:true}); if(t.length>20){ const lines=t.split("\n"); const nm=lines.find(l=>l.trim().length>2&&l.trim().length<40); if(nm&&!prof.name)setProf(p=>({...p,name:nm.trim()})); } }}
          onClear={()=>setAppDoc(null)}/>
        <div className="fg2">
          <div className="field"><label style={{color:!prof.name?"#ef4444":"inherit"}}>{lang==="de"?"Name *":lang==="fr"?"Nom *":lang==="it"?"Nome *":"Name *"}{!prof.name&&<span style={{fontSize:10,color:"#ef4444",marginLeft:4}}>{lang==="de"?"Pflichtfeld":"required"}</span>}</label><input value={prof.name} onChange={e=>up("name",e.target.value)} style={{borderColor:!prof.name?"rgba(239,68,68,.4)":""}}/></div>
          <div className="field"><label style={{color:!prof.beruf?"#ef4444":"inherit"}}>{lang==="de"?"Beruf *":lang==="fr"?"Métier *":lang==="it"?"Lavoro *":"Job *"}{!prof.beruf&&<span style={{fontSize:10,color:"#ef4444",marginLeft:4}}>{lang==="de"?"Pflichtfeld":"required"}</span>}</label><input value={prof.beruf} onChange={e=>up("beruf",e.target.value)} style={{borderColor:!prof.beruf?"rgba(239,68,68,.4)":""}}/></div>
          <div className="field"><label>{lang==="de"?"Erfahrung (Jahre)":lang==="fr"?"Expérience (ans)":lang==="it"?"Esperienza (anni)":"Experience (years)"}</label><input type="number" min="0" max="50" value={prof.erfahrung} onChange={e=>up("erfahrung",e.target.value)}/></div>
          <div className="field"><label>{lang==="de"?"Sprachen":lang==="fr"?"Langues":lang==="it"?"Lingue":"Languages"}</label><input value={prof.sprachen} onChange={e=>up("sprachen",e.target.value)} placeholder="Deutsch, English, Français"/></div>
        </div>
        <div className="field"><label>{lang==="de"?"Skills & Stärken":lang==="fr"?"Compétences":lang==="it"?"Competenze":"Skills"}</label><textarea value={prof.skills} onChange={e=>up("skills",e.target.value)} placeholder={lang==="de"?"z.B. Projektmanagement, MS Office, Kommunikation…":lang==="en"?"e.g. Project management, MS Office, Communication…":"e.g. Gestion de projet, MS Office, Communication…"}/></div>
        <div className="field"><label>{lang==="de"?"Ausbildung":lang==="fr"?"Formation":lang==="it"?"Formazione":"Education"}</label><textarea value={prof.ausbildung} onChange={e=>up("ausbildung",e.target.value)} style={{minHeight:64}} placeholder={lang==="de"?"z.B. Bachelor Wirtschaft ZHAW, KV-Abschluss…":"e.g. Bachelor Business ZHAW, Commercial diploma…"}/></div>
        <div className="frow">
          <button className="btn b-outd" onClick={()=>setStep(0)}>{t.app.back}</button>
          <button className="btn b-dk" disabled={!prof.name||!prof.beruf} onClick={()=>setStep(2)} style={{opacity:(!prof.name||!prof.beruf)?.5:1}} title={(!prof.name||!prof.beruf)?(lang==="de"?"Name und Beruf sind Pflichtfelder":"Name and Job are required"):""}>
            {t.app.next}
          </button>
        </div>
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
  </>);

  // ══════════════════ ATS CHECK ══════════════════
  if(page==="ats") return(<>{<style>{FONTS+CSS}</style>}{pw&&<PW/>}
    {authModals}
    {showProfiles&&<ProfileManager lang={lang} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    <Nav dark/>
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
  </>);

  // ══════════════════ ZEUGNIS ANALYSE ══════════════════
  if(page==="zeugnis") return(<>{<style>{FONTS+CSS}</style>}{pw&&<PW/>}
    {authModals}
    {showProfiles&&<ProfileManager lang={lang} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    <Nav dark/>
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
  </>);

  // ══════════════════ JOB MATCHING ══════════════════
  if(page==="jobmatch") return(<>{<style>{FONTS+CSS}</style>}{pw&&<PW/>}
    {authModals}
    {showProfiles&&<ProfileManager lang={lang} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    <Nav dark/>
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
  </>);

  // ══════════════════ LINKEDIN ══════════════════
  if(page==="linkedin") return(<>{<style>{FONTS+CSS}</style>}{pw&&<PW/>}
    {authModals}
    {showProfiles&&<ProfileManager lang={lang} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    <Nav dark/>
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
  </>);

  // ══════════════════ CHECKLIST ══════════════════
  if(page==="checklist") return(<>{<style>{FONTS+CSS}</style>}{pw&&<PW/>}
    {authModals}
    {showProfiles&&<ProfileManager lang={lang} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
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
  if(page==="coach") return(<>{<style>{FONTS+CSS}</style>}{sharedOverlays}{pw&&<PW/>}
    {authModals}
    {showProfiles&&<ProfileManager lang={lang} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
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
  if(page==="excel") return(<>{<style>{FONTS+CSS}</style>}{sharedOverlays}{pw&&<PW/>}
    {authModals}
    {showProfiles&&<ProfileManager lang={lang} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    <Nav dark/>
    <div className="page-hdr">
      <h1>📊 {t.nav.excel}</h1>
      <p>{L("Professionelle Excel-Tabellen mit Formeln – für jeden Bereich.","Professional Excel spreadsheets with formulas – for any purpose.","Tableaux Excel professionnels avec formules – pour tous.","Fogli Excel professionali con formule – per tutti.")}</p>
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
  if(page==="pptx") return(<>{<style>{FONTS+CSS}</style>}{sharedOverlays}{pw&&<PW/>}
    {authModals}
    {showProfiles&&<ProfileManager lang={lang} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    <Nav dark/>
    <div className="page-hdr">
      <h1>📽️ {t.nav.pptx}</h1>
      <p>{L("Professionelle Präsentationen für Schule, Uni & Arbeit.","Professional presentations for school, uni & work.","Présentations professionnelles pour école, université & travail.","Presentazioni professionali per scuola, università e lavoro.")}</p>
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
    const isUltimate2 = authSession?.plan === "ultimate" || authSession?.isAdmin;
    const isPro2 = pro && !isUltimate2;
    const isFree2 = isLoggedIn2 && !isPro2 && !isUltimate2;
    const canChat2   = isLoggedIn2 && (isUltimate2 || isPro2 ? chatUsage2 < C.CHAT_FREE_LIMIT : true);
    const remaining2 = isUltimate2 ? "∞" : Math.max(0, C.CHAT_FREE_LIMIT - chatUsage2);
    const L2 = (d,e,f,i) => ({de:d,en:e,fr:f,it:i}[lang]||d);
    // suppress unused var warning
    void canChat2; void remaining2;

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

Schule & Ausbildung (Schweizer Lehrstellensystem – WICHTIG!):
- Du kennst das Schweizer Bildungssystem (Berufslehre EFZ/EBA, Gymnasium, FH, Uni, ETH)
- Du weisst: IMMER "Lehrstelle" (NIE "Ausbildungsplatz"), "Lernende*r" (NIE "Azubi"), "Motivationsschreiben" (NIE "Anschreiben"), "Berufslehre" (NIE "Ausbildung")
- Schnupperlehre ist DER entscheidende Swiss-USP: Fast keine Lehrstelle ohne Schnuppern. Immer nach Schnupperlehre-Erfahrung fragen und in Motivationsschreiben als HT3 ausführlich beschreiben (Datum, Betrieb, konkretes Erlebnis, Fazit)
- Swiss-Apprentice CV: Foto oben rechts, Schnupperlehren-Sektion an 2. Stelle, Noten (Mathe/Deutsch) ausweisen, Referenzen (Lehrer, Schnupperlehre-Betreuer)
- Motivationsschreiben-Struktur: 1. Einleitung (Berufsmesse/Schnupperlehre) → 2. Motivation/Talent → 3. Warum diese Firma → 4. SCHNUPPERLEHRE-DETAILS (wichtigster Teil!) → 5. Interview-Einladung
- Format: Datum rechtsbündig "Ort, DD. Monat JJJJ", Betreff fett "Bewerbung als Lernende*r [Beruf] EFZ/EBA", Schweizer Rechtschreibung (kein ß)
- Multicheck/Basic-Check: Viele grosse Firmen verlangen diese Tests – Übungshefte empfehlen
- EFZ = 3-4 Jahre, EBA = 2 Jahre. Typische Lehrberufe: Kaufmann/-frau EFZ, Informatiker EFZ, FaGe EFZ, Detailhandelsfachmann/-frau EFZ, Polymechaniker EFZ
- RAV/ALV: Nachweis Arbeitsbemühungen braucht: Datum, Firma+Ort, Stelle, Art der Bewerbung (Schriftlich/Telefonisch/Persönlich), Kontaktperson – Stellify Tracker hilft dabei!
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

    // SYSTEM_FREE2: Blocks technical questions for free-tier users
    const SYSTEM_FREE2 = `Du bist Stella, die freundliche KI-Assistentin von Stellify – dem Schweizer AI Career Copilot. Der User ist eingeloggt aber hat den kostenlosen Plan.

Du darfst IMMER beantworten: Fragen zu Stellify, Tools, Preisen, Navigation und allgemeine Überblicks-Infos zum Arbeitsmarkt.

Bei fachspezifischen Anfragen (Bewerbungstexte schreiben, Gehaltsverhandlung, ATS-Optimierung, LinkedIn-Posts, Excel/PowerPoint erstellen, Karriereberatung in der Tiefe) antworte stets:
"Das ist eine spannende Fachfrage! 🚀 Um dir hierbei mit voller Experten-Präzision zu helfen, benötigst du Stellify Pro. Mit Pro schalte ich mein gesamtes Fachwissen für dich frei – ${C.PRO_LIMIT} Erstellungen/Woche und 25 Fragen täglich. Upgrade jetzt für CHF 14.90/Mo. jährlich!"

Bleibe freundlich, motivierend und konsequent. Beantworte keine konkreten Karrierefragen ohne Pro-Abo.`;

    const ACTIVE_SYSTEM2 = isUltimate2 || isPro2 ? SYSTEM2 : isFree2 ? SYSTEM_FREE2 : `Du bist Stella von Stellify. Beantworte NUR Fragen zu Stellify und seinen Tools. Für Karriereberatung: "Registriere dich gratis für deine erste Bewerbung!"`;

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
      // ── Persistent chat state (same localStorage as ChatBot overlay) ──
      const [cp2Chats, setCp2Chats] = useState(()=>loadChats());
      const [cp2ActiveId, setCp2ActiveId] = useState(()=>loadActiveChatId());
      const [chatIn, setChatIn]     = useState("");
      const [chatLoad, setChatLoad] = useState(false);
      const [localUsage, setLocalUsage] = useState(chatUsage2);
      const [sidebarOpen, setSidebarOpen] = useState(true);
      const endRef = useRef(null);

      // Get active chat messages
      const activeMsgs = (() => {
        if(!cp2ActiveId) return [];
        const c = cp2Chats.find(c=>c.id===cp2ActiveId);
        return c ? c.msgs : [];
      })();

      useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[cp2Chats, cp2ActiveId]);

      const localCanChat = pro || localUsage < C.CHAT_FREE_LIMIT;

      // Helpers
      function cp2SaveChats(chats){ setCp2Chats(chats); saveChats(chats); }
      function cp2SetMsgs(updater){
        const current = (() => {
          if(!cp2ActiveId) return [];
          const c = cp2Chats.find(c=>c.id===cp2ActiveId);
          return c ? c.msgs : [];
        })();
        const updated = typeof updater === "function" ? updater(current) : updater;
        let newChats;
        if(!cp2ActiveId){
          const id = makeChatId();
          setCp2ActiveId(id); saveActiveChatId(id);
          newChats = [{id, title:makeChatTitle(updated), msgs:updated, ts:Date.now()}, ...cp2Chats];
        } else {
          const exists = cp2Chats.find(c=>c.id===cp2ActiveId);
          if(exists){
            newChats = cp2Chats.map(c=>c.id===cp2ActiveId ? {...c, msgs:updated, title:makeChatTitle(updated), ts:Date.now()} : c);
          } else {
            newChats = [{id:cp2ActiveId, title:makeChatTitle(updated), msgs:updated, ts:Date.now()}, ...cp2Chats];
          }
        }
        cp2SaveChats(newChats);
      }

      function cp2NewChat(){
        const id = makeChatId();
        const planLabel = authSession?.plan==="ultimate"?"Ultimate":authSession?.plan==="pro"?"Pro":"Free";
        const welcome = {r:"ai", t:L2(
          `Hallo! Ich bin **Stella** ✦ – deine persönliche KI-Karriere-Assistentin von Stellify.\n\nDein Plan: **${planLabel}**\n\nWie kann ich dir heute helfen? 🚀`,
          `Hello! I'm **Stella** ✦ – your personal AI career assistant from Stellify.\n\nYour plan: **${planLabel}**\n\nHow can I help you today? 🚀`,
          `Bonjour! Je suis **Stella** ✦ – ton assistante carrière IA de Stellify.\n\nTon plan: **${planLabel}**\n\nComment puis-je t'aider aujourd'hui? 🚀`,
          `Ciao! Sono **Stella** ✦ – la tua assistente carriera IA di Stellify.\n\nIl tuo piano: **${planLabel}**\n\nCome posso aiutarti oggi? 🚀`
        )};
        const newChats = [{id, title:L2("Neuer Chat","New Chat","Nouveau chat","Nuova chat"), msgs:[welcome], ts:Date.now()}, ...cp2Chats];
        cp2SaveChats(newChats);
        setCp2ActiveId(id); saveActiveChatId(id);
        setChatIn("");
      }

      function cp2DeleteChat(id, e){
        e.stopPropagation();
        const newChats = cp2Chats.filter(c=>c.id!==id);
        cp2SaveChats(newChats);
        if(cp2ActiveId===id){
          const next = newChats[0];
          setCp2ActiveId(next?next.id:null);
          saveActiveChatId(next?next.id:"");
        }
      }

      function cp2SwitchChat(id){ setCp2ActiveId(id); saveActiveChatId(id); }

      useEffect(()=>{
        if(cp2Chats.length===0){ cp2NewChat(); }
        else if(!cp2ActiveId && cp2Chats.length>0){ cp2SwitchChat(cp2Chats[0].id); }
      },[]); // eslint-disable-line

      const renderMsg2 = (text) => {
        if(!text) return null;
        return text.split("\n").map((line,li)=>{
          const parts = line.split(/(\*\*[^*]+\*\*)/).map((seg,si)=>{
            if(seg.startsWith("**")&&seg.endsWith("**"))
              return <strong key={si} style={{color:"white",fontWeight:700}}>{seg.slice(2,-2)}</strong>;
            // inline tool links
            const spans = []; let last=0;
            Object.keys(TOOL_MAP2).forEach(key=>{
              const re=new RegExp(`\\b${key}\\b`,"gi"); let m2;
              while((m2=re.exec(seg))!==null){
                if(m2.index>last) spans.push(seg.slice(last,m2.index));
                spans.push(<button key={`${si}-${m2.index}`} onClick={()=>navTo(TOOL_MAP2[key][0])}
                  style={{display:"inline-flex",alignItems:"center",gap:3,background:"rgba(16,185,129,.15)",border:"1px solid rgba(16,185,129,.3)",borderRadius:7,padding:"1px 9px",fontSize:12,fontWeight:700,color:"var(--em)",cursor:"pointer",margin:"1px 2px"}}>
                  {m2[0]} →</button>);
                last=m2.index+m2[0].length;
              }
            });
            if(spans.length===0) return <span key={si}>{seg}</span>;
            spans.push(seg.slice(last));
            return <span key={si}>{spans}</span>;
          });
          return <span key={li}>{li>0&&<br/>}{parts}</span>;
        });
      };

      const fmtDate = (ts) => {
        const d=new Date(ts), now=new Date(), diff=now-d;
        if(diff<86400000) return d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
        if(diff<604800000) return d.toLocaleDateString([],{weekday:"short"});
        return d.toLocaleDateString([],{day:"2-digit",month:"2-digit"});
      };

      const send2 = async (msg) => {
        const txt = (msg||chatIn).trim();
        if(!txt||chatLoad||!localCanChat) return;
        setChatIn("");
        const prevMsgs = activeMsgs;
        const newMsgs = [...prevMsgs, {r:"u", t:txt}];
        cp2SetMsgs(newMsgs);
        setChatLoad(true);
        if(!pro){ incChat(); setLocalUsage(u=>u+1); }
        try {
          const apiMsgs = [];
          for(const m of newMsgs){
            const role = m.r==="u"?"user":"assistant";
            if(apiMsgs.length>0&&apiMsgs[apiMsgs.length-1].role===role) continue;
            apiMsgs.push({role, content:typeof m.t==="string"?m.t:String(m.t||"")});
          }
          while(apiMsgs.length&&apiMsgs[0].role!=="user") apiMsgs.shift();
          const msgsWithSystem = [{role:"system",content:ACTIVE_SYSTEM2}, ...apiMsgs.slice(-10)];
          const res = await fetch(GROQ_URL,{method:"POST",headers:groqHeaders(),body:JSON.stringify({model:C.MODEL_FAST,max_tokens:700,messages:msgsWithSystem})});
          const data = await res.json();
          if(res.status===401) throw new Error(L2("Stella ist kurz offline. Der Admin muss den API-Schlüssel erneuern.","Stella is briefly offline. Please try again later.","Stella est brièvement hors ligne. Réessayez.","Stella è offline. Riprova più tardi."));
          if(!res.ok) throw new Error(data?.error?.message||L2(`Verbindungsfehler (${res.status}) – bitte nochmals versuchen.`,`Connection error (${res.status}).`,`Erreur (${res.status}).`,`Errore (${res.status}).`));
          const reply = data.choices?.[0]?.message?.content||L2("Bitte nochmals versuchen.","Please try again.","Veuillez réessayer.","Riprova.");
          cp2SetMsgs(m=>[...m,{r:"ai",t:reply}]);
        } catch(e){
          cp2SetMsgs(m=>[...m,{r:"ai",t:`⚠️ ${e.message}`}]);
        } finally { setChatLoad(false); }
      };

      return (<>{<style>{FONTS+CSS+`
@keyframes pulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.3);opacity:1}}
.cp2-ci{background:transparent;border:none;border-radius:10px;padding:10px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;width:100%;text-align:left;transition:background .15s;color:rgba(255,255,255,.65);font-size:12.5px;}
.cp2-ci:hover,.cp2-ci.act{background:rgba(255,255,255,.08);}
.cp2-ci.act{color:white;}
.cp2-db{opacity:0;transition:opacity .15s;margin-left:auto;flex-shrink:0;background:none;border:none;cursor:pointer;color:rgba(255,255,255,.35);font-size:13px;padding:2px 5px;border-radius:4px;}
.cp2-ci:hover .cp2-db{opacity:1;}
.cp2-db:hover{color:#ef4444;background:rgba(239,68,68,.1);}
.cp2-qb{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:99px;padding:7px 14px;font-size:12px;color:rgba(255,255,255,.45);cursor:pointer;transition:all .2s;font-family:inherit;}
.cp2-qb:hover{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.25);color:var(--em);}
@media(max-width:680px){.cp2-sb{position:fixed!important;z-index:200;left:0;top:0;height:100%;transform:translateX(-100%);transition:transform .25s ease;}
.cp2-sb.open{transform:translateX(0);}
.cp2-mob{display:flex!important;}}
      `}</style>}
        <div style={{height:"100dvh",display:"flex",flexDirection:"row",background:"#08081a",overflow:"hidden"}}>

          {/* ══ LEFT SIDEBAR ══ */}
          <div className={`cp2-sb${sidebarOpen?" open":""}`} style={{width:262,minWidth:262,background:"#0c0c1e",borderRight:"1px solid rgba(255,255,255,.05)",display:"flex",flexDirection:"column",height:"100dvh",overflow:"hidden",flexShrink:0}}>
            {/* Brand */}
            <div style={{padding:"16px 14px 10px",borderBottom:"1px solid rgba(255,255,255,.05)",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                <span style={{fontFamily:"var(--hd)",fontSize:16,fontWeight:900,color:"var(--em)",letterSpacing:"-0.5px"}}>✦ Stellify</span>
                <span style={{fontSize:10,color:"rgba(255,255,255,.2)",marginLeft:"auto",fontStyle:"italic"}}>AI Chat</span>
              </div>
              <button onClick={cp2NewChat} style={{width:"100%",background:"rgba(16,185,129,.1)",border:"1px solid rgba(16,185,129,.22)",borderRadius:10,padding:"9px 12px",color:"var(--em)",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"background .2s"}}>
                <span>✦</span>{L2("Neuer Chat","New Chat","Nouveau chat","Nuova chat")}
              </button>
            </div>
            {/* Chat list */}
            <div style={{flex:1,overflowY:"auto",padding:"6px 5px"}}>
              {cp2Chats.length===0&&<div style={{padding:"24px 12px",fontSize:12,color:"rgba(255,255,255,.2)",textAlign:"center"}}>{L2("Noch keine Chats","No chats yet","Pas encore de conversations","Nessuna chat ancora")}</div>}
              {cp2Chats.map(c=>(
                <button key={c.id} className={`cp2-ci${cp2ActiveId===c.id?" act":""}`} onClick={()=>cp2SwitchChat(c.id)}>
                  <span style={{fontSize:11,flexShrink:0,opacity:.4}}>💬</span>
                  <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title||L2("Chat","Chat","Chat","Chat")}</span>
                  <span style={{fontSize:10,color:"rgba(255,255,255,.22)",flexShrink:0,marginRight:2}}>{fmtDate(c.ts)}</span>
                  <button className="cp2-db" onClick={(e)=>cp2DeleteChat(c.id,e)} title={L2("Löschen","Delete","Supprimer","Elimina")}>✕</button>
                </button>
              ))}
            </div>
            {/* Footer */}
            <div style={{borderTop:"1px solid rgba(255,255,255,.05)",padding:"10px 8px",flexShrink:0,display:"flex",flexDirection:"column",gap:5}}>
              {authSession&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:8,background:"rgba(255,255,255,.03)"}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:"rgba(16,185,129,.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0,fontWeight:700,color:"var(--em)"}}>
                  {authSession.name?authSession.name[0].toUpperCase():"U"}
                </div>
                <div style={{flex:1,overflow:"hidden"}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.55)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{authSession.name||authSession.email||"User"}</div>
                  <div style={{fontSize:10,color:isUltimate2?"#f59e0b":isPro2?"var(--em)":"rgba(255,255,255,.28)"}}>{isUltimate2?"✦ Ultimate":isPro2?"✦ Pro":"Free"}</div>
                </div>
              </div>}
              <button onClick={()=>navTo("landing")} style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.06)",borderRadius:8,padding:"7px 10px",color:"rgba(255,255,255,.4)",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all .15s"}}>
                ← {L2("Zurück zu Stellify","Back to Stellify","Retour à Stellify","Torna a Stellify")}
              </button>
            </div>
          </div>

          {/* ══ RIGHT CHAT AREA ══ */}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
            {/* Chat Header */}
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:"1px solid rgba(255,255,255,.06)",background:"rgba(0,0,0,.18)",flexShrink:0}}>
              <button onClick={()=>setSidebarOpen(o=>!o)} className="cp2-mob" style={{display:"none",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.09)",borderRadius:8,padding:"6px 10px",color:"rgba(255,255,255,.45)",cursor:"pointer",fontSize:15}}>☰</button>
              <div style={{width:36,height:36,background:"linear-gradient(135deg,var(--em),#0ea5e9)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,color:"white",fontWeight:700,flexShrink:0}}>✦</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"var(--hd)",fontSize:15,fontWeight:800,color:"white"}}>Stella</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.32)"}}>{L2("KI-Karriere-Assistentin","AI Career Assistant","Assistante carrière IA","Assistente carriera IA")} · <span style={{color:"#22c55e",fontSize:10}}>●</span> Online</div>
              </div>
              {isUltimate2&&<div style={{fontSize:11,color:"#f59e0b",fontWeight:700,background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.2)",borderRadius:99,padding:"3px 10px"}}>✦ Ultimate</div>}
              {isPro2&&!isUltimate2&&<div style={{fontSize:11,color:"var(--em)",fontWeight:700,background:"rgba(16,185,129,.1)",border:"1px solid rgba(16,185,129,.2)",borderRadius:99,padding:"3px 10px"}}>✦ Pro</div>}
              {isFree2&&<button onClick={()=>setPw(true)} style={{fontSize:11,color:"#f59e0b",fontWeight:700,background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.18)",borderRadius:99,padding:"4px 12px",cursor:"pointer"}}>
                {L2("Pro freischalten ✦","Unlock Pro ✦","Activer Pro ✦","Sblocca Pro ✦")}
              </button>}
              {!isLoggedIn2&&<button onClick={()=>setShowAuth(true)} style={{fontSize:11,color:"var(--em)",fontWeight:700,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.18)",borderRadius:99,padding:"4px 12px",cursor:"pointer"}}>
                {L2("Anmelden","Log in","Connexion","Accedi")}
              </button>}
            </div>

            {/* Messages */}
            <div style={{flex:1,overflowY:"auto",padding:"24px 20px",display:"flex",flexDirection:"column",gap:0,boxSizing:"border-box"}}>
              <div style={{maxWidth:760,width:"100%",margin:"0 auto",display:"flex",flexDirection:"column",gap:18}}>
                {activeMsgs.length===0&&<div style={{textAlign:"center",padding:"64px 20px",color:"rgba(255,255,255,.2)"}}>
                  <div style={{fontSize:44,marginBottom:10}}>✦</div>
                  <div style={{fontFamily:"var(--hd)",fontSize:22,fontWeight:800,color:"rgba(255,255,255,.25)",marginBottom:6}}>Stella</div>
                  <div style={{fontSize:13}}>{L2("Deine KI-Karriere-Assistentin. Stell mir eine Frage!","Your AI career assistant. Ask me anything!","Ton assistante carrière IA. Pose-moi une question!","La tua assistente. Fammi una domanda!")}</div>
                </div>}
                {activeMsgs.map((m,i)=>(
                  <div key={i} style={{display:"flex",gap:12,flexDirection:m.r==="u"?"row-reverse":"row",alignItems:"flex-end"}}>
                    <div style={{width:33,height:33,borderRadius:"50%",background:m.r==="u"?"rgba(16,185,129,.2)":"linear-gradient(135deg,var(--em),#0ea5e9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:m.r==="u"?13:15,flexShrink:0,fontWeight:700,color:"white"}}>
                      {m.r==="u"?(authSession?.name?authSession.name[0].toUpperCase():"U"):"✦"}
                    </div>
                    <div style={{maxWidth:"73%",background:m.r==="u"?"rgba(16,185,129,.12)":"rgba(255,255,255,.04)",border:`1px solid ${m.r==="u"?"rgba(16,185,129,.22)":"rgba(255,255,255,.06)"}`,borderRadius:m.r==="u"?"18px 18px 4px 18px":"18px 18px 18px 4px",padding:"11px 15px",fontSize:14,color:m.r==="u"?"rgba(255,255,255,.9)":"rgba(255,255,255,.82)",lineHeight:1.75}}>
                      {m.r==="ai"?renderMsg2(m.t):m.t}
                    </div>
                  </div>
                ))}
                {chatLoad&&<div style={{display:"flex",gap:12,alignItems:"flex-end"}}>
                  <div style={{width:33,height:33,borderRadius:"50%",background:"linear-gradient(135deg,var(--em),#0ea5e9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:"white",fontWeight:700}}>✦</div>
                  <div style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.06)",borderRadius:"18px 18px 18px 4px",padding:"13px 17px",display:"flex",gap:5,alignItems:"center"}}>
                    {[0,1,2].map(j=><div key={j} style={{width:7,height:7,borderRadius:"50%",background:"var(--em)",animation:`pulse 1.2s ease-in-out ${j*0.2}s infinite`}}/>)}
                  </div>
                </div>}
                <div ref={endRef}/>
              </div>
            </div>

            {/* Upgrade banner */}
            {!localCanChat&&<div style={{background:"rgba(245,158,11,.07)",borderTop:"1px solid rgba(245,158,11,.15)",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexShrink:0}}>
              <div style={{fontSize:13,color:"rgba(245,158,11,.75)"}}>{L2("Chat-Limit erreicht – Pro für unlimitierte Gespräche freischalten","Chat limit reached – unlock Pro for unlimited chats","Limite atteint – activer Pro","Limite raggiunto – sblocca Pro")}</div>
              <button onClick={()=>setPw(true)} style={{background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"white",border:"none",borderRadius:10,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Pro ✦ →</button>
            </div>}

            {/* Quick prompts */}
            {activeMsgs.length<=1&&!chatLoad&&<div style={{padding:"0 20px 10px",display:"flex",gap:7,flexWrap:"wrap",justifyContent:"center",flexShrink:0}}>
              {[
                L2("✍️ Motivationsschreiben","✍️ Cover letter","✍️ Lettre de motivation","✍️ Lettera motivazione"),
                L2("💰 Gehalt verhandeln","💰 Salary negotiation","💰 Salaire","💰 Stipendio"),
                L2("💼 LinkedIn optimieren","💼 LinkedIn","💼 LinkedIn","💼 LinkedIn"),
                L2("🎤 Interview vorbereiten","🎤 Interview tips","🎤 Entretien","🎤 Colloquio"),
              ].map((q,qi)=>(
                <button key={qi} className="cp2-qb" onClick={()=>send2(q.replace(/^[^\s]+\s/,""))}>{q}</button>
              ))}
            </div>}

            {/* Input */}
            <div style={{borderTop:"1px solid rgba(255,255,255,.06)",padding:"14px 20px 16px",background:"rgba(0,0,0,.12)",flexShrink:0}}>
              <div style={{maxWidth:760,margin:"0 auto",display:"flex",gap:10,alignItems:"flex-end"}}>
                <div style={{flex:1,background:"rgba(255,255,255,.05)",border:`1px solid ${localCanChat?"rgba(255,255,255,.09)":"rgba(245,158,11,.18)"}`,borderRadius:16,padding:"12px 16px",display:"flex",alignItems:"flex-end",gap:10,transition:"border-color .2s"}}>
                  <textarea value={chatIn} onChange={e=>setChatIn(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!chatLoad&&localCanChat){e.preventDefault();send2();}}}
                    placeholder={localCanChat?L2("Frag Stella etwas…","Ask Stella anything…","Pose une question…","Chiedi a Stella…"):L2("Chat-Limit erreicht","Chat limit reached","Limite atteint","Limite raggiunto")}
                    disabled={!localCanChat||chatLoad}
                    style={{flex:1,background:"none",border:"none",color:"white",fontSize:14,resize:"none",outline:"none",minHeight:24,maxHeight:140,lineHeight:1.65,fontFamily:"inherit"}}
                    rows={1}/>
                </div>
                <button onClick={()=>send2()} disabled={!chatIn.trim()||chatLoad||!localCanChat}
                  style={{width:46,height:46,borderRadius:14,background:chatIn.trim()&&localCanChat?"var(--em)":"rgba(255,255,255,.05)",border:`1px solid ${chatIn.trim()&&localCanChat?"var(--em)":"rgba(255,255,255,.07)"}`,cursor:chatIn.trim()&&localCanChat?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,transition:"all .2s",color:"white"}}>
                  {chatLoad?"⏳":"➤"}
                </button>
              </div>
              <div style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,.13)",marginTop:7}}>{L2("Stella kann Fehler machen – wichtige Entscheidungen bitte selbst prüfen.","Stella can make mistakes – please verify important decisions.","Stella peut faire des erreurs – vérifiez les décisions importantes.","Stella può sbagliare – verifica le decisioni importanti.")}</div>
            </div>
          </div>
        </div>
      </>);
    }
    return <ChatPage/>;
  }

  // ══════════════════ LEGAL ══════════════════
  const LD=()=>new Date().toLocaleDateString("de-CH",{month:"long",year:"numeric"});
  const LS=({ch})=><>{<style>{FONTS+CSS}</style>}<Nav/><div className="legal">{ch}</div><Footer/></>;
  if(page==="agb") return <LS ch={<>
    <h1>AGB / CGV / CGC / T&amp;C</h1><div className="legal-d">Stand: {LD()} · {C.domain}</div>
    <h2>1. Geltungsbereich</h2>
    <p>{C.name} ({C.domain}) wird betrieben von {C.owner}, {C.address}. Mit der Registrierung oder Nutzung des Dienstes akzeptierst du diese Allgemeinen Geschäftsbedingungen.</p>
    <h2>2. Leistungen</h2>
    <p>{C.name} ist ein KI-gestützter All-in-One Career &amp; Produktivitäts-Copilot mit 20+ Tools (u. a. Bewerbungsgenerator, LinkedIn-Optimierung, ATS-Simulation, Zeugnis-Analyse, Interview-Coach, Gehaltscoach, Excel-Generator, PowerPoint-Maker, Networking, Lernplan, Übersetzer u. v. m.). Die KI-Ausgaben sind unverbindliche Entwürfe – kein Erfolg wird garantiert.</p>
    <h2>3. Nutzerkonten</h2>
    <p>Du bist für die Sicherheit deines Kontos verantwortlich. Falschangaben (Name, E-Mail, Alter) berechtigen uns zur sofortigen Kontosperrung. Mindestalter: 16 Jahre.</p>
    <h2>4. Abonnement &amp; Zahlung</h2>
    <p><strong>Gratis:</strong> 1 Generierung/Monat, 20 Chat-Nachrichten/Tag.<br/>
    <strong>Pro:</strong> CHF 19.90/Monat oder CHF 14.90/Monat (jährlich, = CHF 178.80/Jahr).<br/>
    <strong>Ultimate:</strong> CHF 49.90/Monat oder CHF 39.90/Monat (jährlich, = CHF 478.80/Jahr).<br/>
    Zahlung ausschliesslich via Stripe (Twint, Visa, Mastercard, Amex, PayPal, Apple Pay, Google Pay, SEPA). Abonnements verlängern sich automatisch. Kündigung jederzeit per E-Mail an <a href={`mailto:${C.email}`}>{C.email}</a> oder über Stripe Customer Portal – wirksam zum Ende der bezahlten Periode.</p>
    <h2>5. Widerrufsrecht</h2>
    <p>Da es sich um digitale Inhalte handelt, die sofort nach Vertragsschluss bereitgestellt werden, erlischt das Widerrufsrecht mit Beginn der Nutzung gemäss Art. 40e OR (Schweiz) bzw. EU-Richtlinie 2011/83/EU. Bei technischen Problemen wenden wir uns kulant an: <a href={`mailto:${C.email}`}>{C.email}</a>.</p>
    <h2>6. Haftung</h2>
    <p>Die Haftung für KI-generierte Inhalte, Qualität der Ausgaben, Vollständigkeit von Analysen oder indirekte Schäden ist ausgeschlossen. {C.name} ist kein Rechts-, Karriere- oder Finanzberater. Maximale Haftung: bezahlter Betrag der letzten 12 Monate.</p>
    <h2>7. Verbotene Nutzung</h2>
    <p>Untersagt sind: automatisierte Massenabfragen (Scraping), Umgehung von Nutzungslimits, Weitergabe von Account-Zugängen, Verwendung für illegale Zwecke oder Erstellung diskriminierender Inhalte.</p>
    <h2>8. Änderungen</h2>
    <p>Wir behalten uns vor, diese AGB mit 30 Tagen Voranzeige per E-Mail zu ändern. Bei wesentlichen Änderungen hast du das Recht, das Abonnement zu kündigen.</p>
    <h2>9. Recht &amp; Gerichtsstand</h2>
    <p>Schweizer Recht (OR, DSG). Gerichtsstand: Zug. Kontakt: <a href={`mailto:${C.email}`}>{C.email}</a></p>
  </>}/>;
  if(page==="datenschutz") return <LS ch={<>
    <h1>Datenschutz / Privacy</h1><div className="legal-d">DSG (CH) · DSGVO (EU) · Stand: {LD()}</div>
    <h2>1. Verantwortlicher</h2>
    <p>{C.owner}, {C.address}<br/>E-Mail: <a href={`mailto:${C.email}`}>{C.email}</a><br/>Website: {C.domain}</p>
    <h2>2. Erhobene Daten &amp; Zweck</h2>
    <ul>
      <li><strong>Kontodaten</strong> (E-Mail, Name): Vertragserfüllung, Authentifizierung – bis zur Kontolöschung gespeichert.</li>
      <li><strong>Eingabedaten</strong> (Lebenslauf, Zeugnisse, Profildaten): Verarbeitung durch KI – werden nicht dauerhaft auf unseren Servern gespeichert.</li>
      <li><strong>Nutzungsstatistiken</strong>: IP-Adresse (anonymisiert, 30 Tage), Sitzungsdaten zur Nutzungslimitierung.</li>
      <li><strong>Zahlungsdaten</strong>: Ausschliesslich via Stripe (PCI-DSS-konform) – wir speichern keine Kartendaten.</li>
    </ul>
    <h2>3. Rechtsgrundlage</h2>
    <p>Schweizer DSG Art. 6 (Datenbearbeitung zur Vertragserfüllung) sowie EU DSGVO Art. 6 Abs. 1 lit. b (Vertragserfüllung) und lit. f (berechtigtes Interesse) für EU-Nutzerinnen und -Nutzer.</p>
    <h2>4. KI-Verarbeitung</h2>
    <p>Eingaben werden zur KI-Verarbeitung an Groq, Inc. (groq.com, USA) übermittelt. Groq verarbeitet Daten ausschliesslich zur unmittelbaren Beantwortung der Anfrage und trainiert keine Modelle auf deinen Inhalten. Rechtsgrundlage für Drittlandtransfer: Standardvertragsklauseln (SCC).</p>
    <h2>5. Drittanbieter &amp; Auftragsverarbeiter</h2>
    <ul>
      <li><strong>Stripe, Inc.</strong> – Zahlungsabwicklung · <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">stripe.com/privacy</a></li>
      <li><strong>Groq, Inc.</strong> – KI-Inferenz · <a href="https://groq.com/privacy" target="_blank" rel="noreferrer">groq.com/privacy</a></li>
      <li><strong>Vercel, Inc.</strong> – Hosting &amp; Serverless Functions · <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">vercel.com/legal/privacy-policy</a></li>
    </ul>
    <h2>6. Deine Rechte</h2>
    <p>Du hast jederzeit das Recht auf <strong>Auskunft, Berichtigung, Löschung, Einschränkung, Datenportabilität</strong> und <strong>Widerspruch</strong>. Anfragen an: <a href={`mailto:${C.email}`}>{C.email}</a>. Wir antworten innerhalb von 30 Tagen. Du hast zudem das Recht, Beschwerde bei der zuständigen Aufsichtsbehörde einzureichen (CH: EDÖB – edoeb.admin.ch; EU: zuständige nationale Behörde).</p>
    <h2>7. Cookies &amp; Tracking</h2>
    <p>Wir verwenden ausschliesslich technisch notwendige Cookies (Session, Authentifizierung). Keine Marketing-, Tracking- oder Analyse-Cookies. Kein Google Analytics. Kein Facebook Pixel.</p>
    <h2>8. Sicherheit</h2>
    <p>HTTPS/TLS für alle Verbindungen. Passwörter werden gehasht gespeichert. Kein Verkauf von Nutzerdaten an Dritte.</p>
    <h2>9. Kontakt &amp; Beschwerden</h2>
    <p>Datenschutzanfragen: <a href={`mailto:${C.email}`}>{C.email}</a></p>
  </>}/>;
  if(page==="impressum") return <LS ch={<>
    <h1>Impressum</h1><div className="legal-d">gemäss Art. 12 DSG &amp; § 5 TMG</div>
    <h2>Betreiber &amp; Verantwortlicher</h2>
    <p>
      <strong>{C.owner}</strong><br/>
      {C.address}<br/>
      E-Mail: <a href={`mailto:${C.email}`}>{C.email}</a><br/>
      Website: <a href={`https://${C.domain}`} target="_blank" rel="noreferrer">{C.domain}</a>
    </p>
    <h2>Dienst</h2>
    <p><strong>{C.name}</strong> – KI-gestützter Career &amp; Produktivitäts-Copilot für die Schweiz. Betrieb als digitaler Dienst gemäss Schweizer Recht.</p>
    <h2>Inhaltlich verantwortlich</h2>
    <p>{C.owner}, {C.address}</p>
    <h2>Datenschutzbeauftragter</h2>
    <p>Da kein formeller DSB erforderlich (KMU), richten Sie Datenschutzanfragen direkt an: <a href={`mailto:${C.email}`}>{C.email}</a></p>
    <h2>Streitschlichtung</h2>
    <p>Wir nehmen nicht an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teil. Bei Streitigkeiten gilt Schweizer Recht, Gerichtsstand Zug.</p>
    <h2>Haftungsausschluss</h2>
    <p>Trotz sorgfältiger Prüfung übernehmen wir keine Haftung für externe Links. Für den Inhalt verlinkter Seiten sind ausschliesslich deren Betreiber verantwortlich.</p>
    <h2>Urheberrecht</h2>
    <p>Alle Inhalte und Grafiken auf {C.domain} unterliegen dem Urheberrecht. Vervielfältigung ohne Genehmigung ist untersagt.</p>
  </>}/>;
  // ══════════════════ BEWERBUNGS-TRACKER ══════════════════
  if(page==="tracker") return(<>{<style>{FONTS+CSS}</style>}{sharedOverlays}{pw&&<PW/>}
    {authModals}
    {showProfiles&&<ProfileManager lang={lang} onClose={()=>setShowProfiles(false)} onSelect={p=>{if(p){setActiveProfile(p);setProf({name:p.name||"",beruf:p.beruf||"",erfahrung:p.erfahrung||"",skills:p.skills||"",sprachen:p.sprachen||"",ausbildung:p.ausbildung||""});}}}/>}
    <Nav dark/>
    <BewerbungsTracker lang={lang} pro={pro} setPw={setPw} navTo={navTo}/>
    <Footer/>
  </>);

  // ══════════════════ GENERIC TOOLS ROUTING ══════════════════
  const activeTool = GENERIC_TOOLS.find(g => g.id === page);
  if (activeTool) return (
    <>{<style>{FONTS+CSS}</style>}{sharedOverlays}{pw&&<PW/>}
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

import { createRoot } from "react-dom/client";
const _root = document.getElementById("root");
if (_root) createRoot(_root).render(<App />);
