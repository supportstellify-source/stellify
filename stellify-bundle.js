var _Stellify = (() => {
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });

  // home/claude/stellify-build/src/main.jsx
  var import_jsx_runtime = { jsx: window.React.createElement, jsxs: window.React.createElement, Fragment: window.React.Fragment };
  var { useState, useEffect, useRef, useCallback, useMemo, memo, lazy, Suspense } = React;
  var C = {
    name: "Stellify",
    tagline: "AI Career Copilot Schweiz",
    domain: "stellify.ch",
    email: "support@stellify.ch",
    address: "6300 Zug, Schweiz",
    owner: "JTSP",
    stripeMonthly: "https://buy.stripe.com/MONTHLY_LINK",
    stripeYearly: "https://buy.stripe.com/YEARLY_LINK",
    priceM: "19.90",
    // ← Angepasst: niedrigere Einstiegshürde = mehr Conversions
    priceY: "14.90",
    // ← Angepasst: bei Jahresabo (~25% Rabatt)
    FREE_LIMIT: 1,
    PRO_LIMIT: 60,
    CHAT_FREE_LIMIT: 20,
    NEW_TOOL_FREE_LIMIT: 2,
    // ← NEU: 3 neue Tools je 2× gratis testbar
    FAMILY_LIMIT: 4,
    TEAM_LIMIT: 10,
    stripeFamily: "https://buy.stripe.com/FAMILY_LINK",
    stripeTeam: "https://buy.stripe.com/TEAM_LINK",
    priceFamily: "34.90",
    // ← Angepasst
    priceUnlimited: "59.90",
    // ← Angepasst
    // ── ADMIN (nur für JTSP) ──────────────────────────
    ADMIN_EMAIL: "admin@stellify.ch",
    ADMIN_PW: "Stf!Admin#2025$JTSP",
    // ← Sicheres PW
    ADMIN_SECRET: "JTSP_STELLIFY_ADMIN",
    // ← geheimer Token
    // ── GROQ CONFIG ──────────────────────────────
    GROQ_KEY: "GROQ_KEY_PLACEHOLDER",
    // ── ANTHROPIC CONFIG ──────────────────────────────────
    ANTHROPIC_KEY: "YOUR_ANTHROPIC_API_KEY_HERE",
    MODEL_FAST: "llama-3.1-8b-instant",
    MODEL_FULL: "llama-3.3-70b-versatile",
    FREE_MAX_TOKENS: 500
  };
  var GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
  var groqHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${C.GROQ_KEY}`
  });
  var getU = () => {
    try {
      const d = JSON.parse(localStorage.getItem("stf_u") || "{}"), m = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      return d.month !== m ? { month: m, count: 0, proCount: 0, chatCount: 0 } : d;
    } catch {
      return { month: "", count: 0, proCount: 0, chatCount: 0 };
    }
  };
  var incU = () => {
    const u = getU();
    u.count++;
    localStorage.setItem("stf_u", JSON.stringify(u));
  };
  var incPro = () => {
    const u = getU();
    u.proCount = (u.proCount || 0) + 1;
    localStorage.setItem("stf_u", JSON.stringify(u));
  };
  var incChat = () => {
    const u = getU();
    u.chatCount = (u.chatCount || 0) + 1;
    localStorage.setItem("stf_u", JSON.stringify(u));
  };
  var getChatCount = () => getU().chatCount || 0;
  var getProCount = () => getU().proCount || 0;
  var isPro = () => {
    try {
      return localStorage.getItem("stf_pro") === "true";
    } catch {
      return false;
    }
  };
  var actPro = () => {
    try {
      localStorage.setItem("stf_pro", "true");
    } catch {
    }
  };
  var getNewToolUsage = () => {
    try {
      const d = JSON.parse(localStorage.getItem("stf_ntu") || "{}"), m = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      return d.month !== m ? { month: m, cvScore: 0, interviewPrep: 0, jobAdAnalyzer: 0 } : d;
    } catch {
      return { month: "", cvScore: 0, interviewPrep: 0, jobAdAnalyzer: 0 };
    }
  };
  var incNewTool = (tool) => {
    const u = getNewToolUsage();
    u[tool] = (u[tool] || 0) + 1;
    localStorage.setItem("stf_ntu", JSON.stringify(u));
  };
  var getNewToolCount = (tool) => getNewToolUsage()[tool] || 0;
  var AUTH_KEY = "stf_auth_users";
  var SESSION_KEY = "stf_session";
  function authGetUsers() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || "[]");
    } catch {
      return [];
    }
  }
  function authSaveUsers(users) {
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(users));
    } catch {
    }
  }
  function authGetSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }
  function authSetSession(session) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
    }
  }
  function authClearSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
    }
  }
  function authRegister(email, pw, plan, provider = "email", displayName = "", avatar = "") {
    const users = authGetUsers();
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) return { ok: false, err: "E-Mail bereits registriert." };
    const user = {
      email: email.toLowerCase(),
      pw,
      plan: plan || "free",
      seats: plan === "family" ? 4 : plan === "team" ? 10 : 1,
      members: [email.toLowerCase()],
      activatedAt: Date.now(),
      provider,
      displayName: displayName || email.split("@")[0],
      avatar,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    users.push(user);
    authSaveUsers(users);
    authSetSession({ email: user.email, plan: user.plan, displayName: user.displayName, avatar: user.avatar, provider });
    return { ok: true, user };
  }
  function authSocialLogin(provider, email, displayName, avatar) {
    const users = authGetUsers();
    let user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      user = {
        email: email.toLowerCase(),
        pw: "",
        plan: "free",
        seats: 1,
        members: [email.toLowerCase()],
        activatedAt: Date.now(),
        provider,
        displayName,
        avatar,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      users.push(user);
      authSaveUsers(users);
    } else {
      user.provider = provider;
      user.avatar = avatar || user.avatar;
      authSaveUsers(users);
    }
    authSetSession({ email: user.email, plan: user.plan, displayName: user.displayName || displayName, avatar: user.avatar || avatar, provider });
    return { ok: true, user };
  }
  function authLogin(email, pw) {
    const users = authGetUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.pw === pw);
    if (!user) return { ok: false, err: "E-Mail oder Passwort falsch." };
    authSetSession({ email: user.email, plan: user.plan, displayName: user.displayName, avatar: user.avatar, provider: user.provider });
    return { ok: true, user };
  }
  function authUpgradePlan(email, plan) {
    const users = authGetUsers();
    const idx = users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase());
    if (idx >= 0) {
      users[idx].plan = plan;
      if (plan === "family") users[idx].seats = 4;
      if (plan === "team") users[idx].seats = 10;
      authSaveUsers(users);
      const sess2 = authGetSession();
      authSetSession({ ...sess2, email: users[idx].email, plan });
      return users[idx];
    }
    const user = { email: email.toLowerCase(), pw: "", plan, seats: plan === "family" ? 4 : plan === "team" ? 10 : 1, members: [email.toLowerCase()], activatedAt: Date.now(), provider: "stripe" };
    users.push(user);
    authSaveUsers(users);
    const sess = authGetSession();
    authSetSession({ ...sess, email: user.email, plan });
    return user;
  }
  function authAddMember(ownerEmail, memberEmail) {
    const users = authGetUsers();
    const owner = users.find((u) => u.email.toLowerCase() === ownerEmail.toLowerCase());
    if (!owner) return { ok: false, err: "Kein Account gefunden." };
    if ((owner.members || []).length >= owner.seats) return { ok: false, err: `Maximale Anzahl (${owner.seats}) erreicht.` };
    if ((owner.members || []).includes(memberEmail.toLowerCase())) return { ok: false, err: "Bereits Mitglied." };
    owner.members = [...owner.members || [], memberEmail.toLowerCase()];
    authSaveUsers(users);
    return { ok: true };
  }
  function authIsAdmin(email, pw) {
    return email.toLowerCase() === C.ADMIN_EMAIL.toLowerCase() && (pw === C.ADMIN_PW || pw === C.ADMIN_SECRET);
  }
  var HAIKU_TOOLS = ["free", "email", "protokoll", "uebersetzer", "networking", "kuendigung", "lernplan", "zusammenfassung", "gehalt", "plan306090", "referenz", "lehrstelle"];
  var getModel = (toolId) => HAIKU_TOOLS.includes(toolId) ? C.MODEL_FAST : C.MODEL_FULL;
  var getTokens = (toolId, stream = false) => toolId === "free" ? C.FREE_MAX_TOKENS : HAIKU_TOOLS.includes(toolId) ? stream ? 600 : 500 : stream ? 1400 : 1200;
  function buildMessages(prompt, system) {
    const msgs = [];
    if (system) msgs.push({ role: "system", content: system });
    if (typeof prompt === "string") msgs.push({ role: "user", content: prompt });
    else msgs.push(...prompt);
    return msgs;
  }
  async function callAI(prompt, system, toolId = "") {
    let r;
    try {
      r = await fetch(GROQ_URL, {
        method: "POST",
        headers: groqHeaders(),
        body: JSON.stringify({
          model: getModel(toolId),
          max_tokens: getTokens(toolId),
          messages: buildMessages(prompt, system)
        })
      });
    } catch (e) {
      throw new Error("Netzwerkfehler \u2013 bitte Internetverbindung pr\xFCfen.");
    }
    if (r.status === 401) throw new Error("API-Schl\xFCssel ung\xFCltig \u2013 Groq Key pr\xFCfen.");
    if (r.status === 429) throw new Error("Zu viele Anfragen \u2013 bitte kurz warten.");
    if (r.status === 503 || r.status === 529) throw new Error("KI \xFCberlastet \u2013 in 30 Sek. nochmals versuchen.");
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    return d.choices?.[0]?.message?.content || "";
  }
  async function streamAI(prompt, onChunk, system, toolId = "") {
    let resp;
    try {
      resp = await fetch(GROQ_URL, {
        method: "POST",
        headers: groqHeaders(),
        body: JSON.stringify({
          model: getModel(toolId),
          max_tokens: getTokens(toolId, true),
          stream: true,
          messages: buildMessages(prompt, system)
        })
      });
    } catch (e) {
      throw new Error("Netzwerkfehler \u2013 bitte Internetverbindung pr\xFCfen.");
    }
    if (!resp.ok) {
      const e = await resp.json();
      throw new Error(e.error?.message || "API Fehler");
    }
    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of dec.decode(value, { stream: true }).split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const ev = JSON.parse(data);
          const t = ev.choices?.[0]?.delta?.content;
          if (t) {
            full += t;
            onChunk(full);
          }
        } catch {
        }
      }
    }
    return full;
  }
  async function callAIWithFileStreaming(file, prompt, onChunk) {
    return await streamAI(prompt, onChunk, "", C.MODEL_FULL);
  }
  var FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Figtree:wght@300;400;500;600&display=swap');`;
  var CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--ink:#0b0b12;--bg:#f2f3f7;--em:#10b981;--em2:#059669;--em3:rgba(16,185,129,.11);--am:#f59e0b;--am2:rgba(245,158,11,.14);--bl:#3b82f6;--bl2:rgba(59,130,246,.12);--mu:rgba(11,11,18,.46);--bo:rgba(11,11,18,.1);--bos:rgba(11,11,18,.06);--dk:#07070e;--dk2:#0f0f1a;--dk3:#161624;--hd:'Bricolage Grotesque',system-ui,sans-serif;--bd:'Figtree',system-ui,sans-serif;--r:12px;--r2:20px}
html{scroll-behavior:smooth}body{background:var(--bg);color:var(--ink);font-family:var(--bd);font-weight:300;-webkit-font-smoothing:antialiased}
/* NAV */
nav{position:sticky;top:0;z-index:200;background:rgba(242,243,247,.94);backdrop-filter:blur(20px);border-bottom:1px solid var(--bo)}
.ni{max-width:1200px;margin:0 auto;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;gap:10px}
.logo{font-family:var(--hd);font-size:21px;font-weight:800;cursor:pointer;letter-spacing:-.5px;display:flex;align-items:center;color:var(--ink)}
.logo-dot{width:8px;height:8px;background:var(--em);border-radius:50%;margin-left:2px;margin-bottom:8px;flex-shrink:0}
.pb{font-size:10px;font-weight:700;background:linear-gradient(135deg,var(--em),var(--em2));color:white;padding:2px 8px;border-radius:20px;margin-left:8px;text-transform:uppercase;letter-spacing:.5px}
.nl{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.nl-desk{display:flex}
.ham{display:none!important}
@media(max-width:680px){.nl-desk{display:none!important}.ham{display:flex!important}}
.nlk{font-size:13px;color:var(--mu);cursor:pointer;background:none;border:none;font-family:var(--bd);transition:color .18s;white-space:nowrap;padding:0}.nlk:hover{color:var(--ink)}
.nc{background:var(--ink);color:white;padding:8px 18px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:var(--bd);transition:all .2s}.nc:hover{background:var(--em)}
.ls{display:flex;background:rgba(11,11,18,.06);border:1.5px solid rgba(11,11,18,.08);border-radius:12px;padding:4px;gap:3px}
.lb{padding:5px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:transparent;font-family:var(--bd);color:var(--mu);transition:all .18s;letter-spacing:.3px}.lb.on{background:white;color:var(--ink);box-shadow:0 2px 8px rgba(11,11,18,.12);font-weight:700}
/* HERO */
.hero{background:var(--dk);overflow:hidden;position:relative;padding:100px 0 88px}
.hbg{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 70% 80% at 80% 20%,rgba(16,185,129,.14) 0%,transparent 60%),radial-gradient(ellipse 50% 60% at 5% 90%,rgba(59,130,246,.07) 0%,transparent 60%)}
.hdots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.04) 1px,transparent 1px);background-size:32px 32px;pointer-events:none}
.con{max-width:1200px;margin:0 auto;padding:0 28px}.csm{max-width:820px;margin:0 auto;padding:0 28px}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--em);background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);padding:5px 14px;border-radius:20px;margin-bottom:26px}
h1.hh{font-family:var(--hd);font-size:clamp(48px,7vw,84px);font-weight:800;line-height:.98;letter-spacing:-3px;color:white;margin-bottom:22px;max-width:900px}
h1.hh em{font-style:normal;color:var(--em)}
.hsub{font-size:18px;font-weight:300;color:rgba(255,255,255,.5);max-width:580px;line-height:1.75;margin-bottom:38px}
.hctas{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.hstats{margin-top:64px;display:flex;gap:40px;flex-wrap:wrap}
.stat-n{font-family:var(--hd);font-size:30px;font-weight:800;color:white;letter-spacing:-1px;line-height:1}.stat-l{font-size:12px;color:rgba(255,255,255,.36);margin-top:4px}
/* BUTTONS */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border-radius:10px;font-family:var(--bd);font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .2s;white-space:nowrap;text-decoration:none}
.b-em{background:var(--em);color:white}.b-em:hover{background:var(--em2);transform:translateY(-2px);box-shadow:0 10px 28px rgba(16,185,129,.28)}
.b-dk{background:var(--ink);color:white}.b-dk:hover{background:#18182e;transform:translateY(-2px)}
.b-bl{background:var(--bl);color:white}.b-bl:hover{background:#2563eb;transform:translateY(-2px);box-shadow:0 10px 28px rgba(59,130,246,.28)}
.b-out{background:transparent;color:white;border:1.5px solid rgba(255,255,255,.2)}.b-out:hover{border-color:rgba(255,255,255,.5);background:rgba(255,255,255,.05)}
.b-outd{background:transparent;color:var(--ink);border:1.5px solid var(--bo)}.b-outd:hover{border-color:var(--em);color:var(--em)}
.b-sm{padding:8px 16px;font-size:13px}.b-lg{padding:15px 34px;font-size:15px}.b-w{width:100%}
.btn:disabled{opacity:.35;cursor:not-allowed!important;transform:none!important;box-shadow:none!important}
/* SECTIONS */
.sec{padding:88px 0}.sec-dk{background:var(--dk)}.sec-dk2{background:var(--dk2)}.sec-w{background:white}.sec-bg{background:var(--bg)}
.sh{margin-bottom:50px}.shc{text-align:center}.shc .ss{margin:0 auto}
.seye{font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--em);margin-bottom:12px}
.st{font-family:var(--hd);font-size:clamp(32px,4vw,50px);font-weight:800;line-height:1.05;letter-spacing:-1.5px;margin-bottom:14px}
.sec-dk .st,.sec-dk2 .st{color:white}
.ss{font-size:16px;font-weight:300;line-height:1.75;color:var(--mu);max-width:560px}
.sec-dk .ss,.sec-dk2 .ss{color:rgba(255,255,255,.42)}
/* TOOLS GRID */
.tools-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.tool-card{padding:28px;border-radius:var(--r2);border:1.5px solid var(--bo);background:white;cursor:pointer;transition:all .22s;position:relative;overflow:hidden;text-align:left}
.tool-card::before{content:'';position:absolute;inset:0;opacity:0;transition:opacity .2s;background:linear-gradient(135deg,rgba(16,185,129,.04),transparent)}
.tool-card:hover{transform:translateY(-4px);box-shadow:0 14px 36px rgba(11,11,18,.1);border-color:rgba(16,185,129,.35)}.tool-card:hover::before{opacity:1}
.tool-card.bl:hover{border-color:rgba(59,130,246,.4)}.tool-card.am:hover{border-color:rgba(245,158,11,.4)}
.tc-ico{font-size:30px;margin-bottom:12px}
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
.fc{padding:24px;background:white;border:1.5px solid var(--bo);border-radius:var(--r2);position:relative;transition:all .22s}
.fc:hover{border-color:var(--em);box-shadow:0 6px 28px rgba(16,185,129,.08);transform:translateY(-2px)}
.fc-ico{font-size:24px;margin-bottom:10px}.fc h4{font-family:var(--hd);font-size:15px;font-weight:700;margin-bottom:6px}.fc p{font-size:13px;line-height:1.7;color:var(--mu)}
.pp{position:absolute;top:13px;right:13px;font-size:10px;font-weight:700;background:linear-gradient(135deg,var(--em),var(--em2));color:white;padding:2px 8px;border-radius:20px}
.pp-am{background:linear-gradient(135deg,var(--am),#d97706)}
/* STEPS */
.srow{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;position:relative}
.srow::before{display:none}
.sc{padding:28px 24px;background:var(--dk3);border:1.5px solid rgba(255,255,255,.07);border-radius:var(--r2)}
.sn{width:48px;height:48px;background:rgba(16,185,129,.12);border:1.5px solid rgba(16,185,129,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--hd);font-size:16px;font-weight:800;color:var(--em);margin-bottom:16px}
.sc h3{font-family:var(--hd);font-size:17px;font-weight:700;color:white;margin-bottom:8px}.sc p{font-size:13px;line-height:1.75;color:rgba(255,255,255,.42)}
/* TESTI */
.tg{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.tc2{padding:26px;background:var(--dk3);border:1.5px solid rgba(255,255,255,.07);border-radius:var(--r2)}
.ts{color:var(--em);font-size:13px;margin-bottom:10px;letter-spacing:3px}.tq{font-size:14px;line-height:1.75;color:rgba(255,255,255,.7);margin-bottom:14px;font-style:italic}
.tn{font-size:13px;font-weight:600;color:white}.tr{font-size:12px;color:rgba(255,255,255,.3);margin-top:2px}
/* PRICING */
.btog{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:40px}
.bto{font-size:14px;font-weight:500;color:rgba(255,255,255,.4);cursor:pointer;transition:color .18s}.bto.on{color:white}
.btsw{width:50px;height:27px;background:rgba(255,255,255,.1);border-radius:20px;cursor:pointer;position:relative;border:1.5px solid rgba(255,255,255,.14);transition:background .2s;flex-shrink:0}
.btsw.yr{background:var(--em)}.btt{position:absolute;top:3px;left:3px;width:17px;height:17px;background:white;border-radius:50%;transition:transform .2s}.btsw.yr .btt{transform:translateX(23px)}
.save-t{background:rgba(245,158,11,.15);color:var(--am);border:1px solid rgba(245,158,11,.3);font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px}
.pgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;max-width:1160px;margin:0 auto}
.pc{border-radius:var(--r2);padding:26px 22px;border:1.5px solid rgba(255,255,255,.08);background:var(--dk3);position:relative}
.pc.hl{border-color:var(--em);background:rgba(16,185,129,.06)}.pc.hl2{border-color:rgba(245,158,11,.3);background:rgba(245,158,11,.04)}
.bst{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--em);color:white;font-size:11px;font-weight:700;padding:4px 14px;border-radius:20px;white-space:nowrap}
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
.page-hdr{padding:48px 28px 0;text-align:center}
.page-hdr.dk{background:var(--dk)}.page-hdr.bl{background:linear-gradient(135deg,#0a66c2,#0077b5)}.page-hdr.am{background:linear-gradient(135deg,#92400e,#b45309)}.page-hdr.vi{background:linear-gradient(135deg,#4c1d95,#6d28d9)}
.page-hdr h1{font-family:var(--hd);font-size:32px;font-weight:800;color:white;margin-bottom:7px;letter-spacing:-1px}.page-hdr p{font-size:14px;color:rgba(255,255,255,.4)}
.asteps{max-width:640px;margin:28px auto 0;display:flex;border-bottom:2px solid rgba(255,255,255,.07)}
.as{flex:1;text-align:center;padding:10px 5px;font-size:12px;font-weight:600;color:rgba(255,255,255,.22);transition:all .25s}
.as.on{color:var(--em);border-bottom:2px solid var(--em);margin-bottom:-2px}.as.done{color:rgba(255,255,255,.4)}
.abody{max-width:740px;margin:0 auto;padding:38px 28px 80px}
/* CARDS */
.card{background:white;border:1.5px solid var(--bo);border-radius:var(--r2);padding:32px;box-shadow:0 4px 20px rgba(11,11,18,.06)}
.ct{font-family:var(--hd);font-size:22px;font-weight:800;margin-bottom:4px;letter-spacing:-.5px}
.cs{font-size:13px;color:var(--mu);margin-bottom:20px;line-height:1.6}
.field{margin-bottom:14px}
.field label{display:block;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--mu);margin-bottom:5px}
.field input,.field textarea,.field select{width:100%;padding:10px 13px;border:1.5px solid var(--bo);border-radius:10px;font-family:var(--bd);font-size:14px;font-weight:300;color:var(--ink);background:#fafafa;outline:none;transition:border-color .18s;resize:none}
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
.spin{width:32px;height:32px;border:2px solid rgba(16,185,129,.2);border-top-color:var(--em);border-radius:50%;animation:sp .75s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.cursor{display:inline-block;width:2px;height:1em;background:var(--em);margin-left:1px;animation:blink .8s step-end infinite;vertical-align:text-bottom}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
.r-doc{background:#fafafa;border:1.5px solid var(--bo);border-radius:12px;padding:22px;font-size:14px;line-height:1.9;color:var(--ink);white-space:pre-wrap;max-height:460px;overflow-y:auto;font-family:var(--bd);min-height:80px}
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
.mbg{position:fixed;inset:0;background:rgba(7,7,14,.82);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px)}
.mod{background:var(--dk2);border:1.5px solid rgba(255,255,255,.08);border-radius:24px;padding:44px;max-width:480px;width:100%;color:white;text-align:center}
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
/* \u2500\u2500 PAGE TRANSITION ANIMATIONS \u2500\u2500 */
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
  function OnboardingFlow({ lang, onDone }) {
    const [step, setStep] = useState(0);
    const L = (d, e, f, i) => ({ de: d, en: e, fr: f, it: i })[lang] || d;
    const TOTAL = 4;
    const steps = [
      {
        ico: "\u{1F44B}",
        h: L("Willkommen bei Stellify!", "Welcome to Stellify!", "Bienvenue sur Stellify!", "Benvenuto su Stellify!"),
        p: L(
          "Dein pers\xF6nlicher KI-Karriere-Copilot f\xFCr den Schweizer Arbeitsmarkt. In 4 Schritten zeigen wir dir, wie du in wenigen Minuten deine Traumstelle findest.",
          "Your personal AI career copilot for the Swiss job market. In 4 steps we'll show you how to land your dream job in minutes.",
          "Votre copilote IA carri\xE8re pour le march\xE9 suisse. En 4 \xE9tapes, d\xE9couvrez comment trouver votre emploi de r\xEAve en quelques minutes.",
          "Il tuo copilota IA per il mercato svizzero. In 4 passaggi ti mostriamo come trovare il lavoro dei tuoi sogni in pochi minuti."
        ),
        feats: [
          { ico: "\u{1F1E8}\u{1F1ED}", t: L("Swiss-Standard", "Swiss Standard", "Standard suisse", "Standard svizzero") },
          { ico: "\u{1F310}", t: L("4 Sprachen", "4 Languages", "4 langues", "4 lingue") },
          { ico: "\u26A1", t: L("~30 Sek.", "~30 sec.", "~30 sec.", "~30 sec.") },
          { ico: "\u{1F512}", t: L("Privat & sicher", "Private & secure", "Priv\xE9 & s\xE9curis\xE9", "Privato & sicuro") }
        ]
      },
      {
        ico: "\u270D\uFE0F",
        h: L("Bewerbungen in 30 Sekunden", "Applications in 30 seconds", "Candidatures en 30 secondes", "Candidature in 30 secondi"),
        p: L(
          "Gib dein Profil einmal ein \u2013 die KI erstellt Motivationsschreiben und Lebenslauf auf Schweizer Standard. Inkl. ATS-Optimierung f\xFCr maximale Erfolgsquote.",
          "Enter your profile once \u2013 the AI creates a cover letter and CV to Swiss standards. Incl. ATS optimization for maximum success.",
          "Entrez votre profil une fois \u2013 l'IA cr\xE9e lettre et CV aux standards suisses. Avec optimisation ATS.",
          "Inserisci il profilo una volta \u2013 l'IA crea lettera e CV agli standard svizzeri. Con ottimizzazione ATS."
        ),
        feats: [
          { ico: "\u{1F4DD}", t: "Motivationsschreiben" },
          { ico: "\u{1F4C4}", t: "Curriculum Vitae" },
          { ico: "\u{1F916}", t: "ATS-Check" },
          { ico: "\u{1F4CA}", t: "Score 0\u2013100" }
        ]
      },
      {
        ico: "\u{1F3AF}",
        h: L("20+ Tools. Alles an einem Ort.", "20+ Tools. All in one place.", "20+ outils. Tout au m\xEAme endroit.", "20+ strumenti. Tutto in un posto."),
        p: L(
          "LinkedIn-Optimierung, Zeugnis-Analyse, Job-Matching, Interview-Coach, Gehaltsverhandlung und vieles mehr \u2013 alles f\xFCr den Schweizer Arbeitsmarkt gemacht.",
          "LinkedIn optimization, reference analysis, job matching, interview coach, salary negotiation and much more \u2013 all made for the Swiss job market.",
          "Optimisation LinkedIn, analyse de certificat, matching, coach, n\xE9gociation \u2013 tout pour le march\xE9 suisse.",
          "Ottimizzazione LinkedIn, analisi certificati, job matching, coach, negoziazione stipendio \u2013 tutto per il mercato svizzero."
        ),
        feats: [
          { ico: "\u{1F4BC}", t: "LinkedIn" },
          { ico: "\u{1F4DC}", t: L("Zeugnis", "Reference", "Certificat", "Certificato") },
          { ico: "\u{1F3A4}", t: "Interview" },
          { ico: "\u{1F4B0}", t: L("Gehalt", "Salary", "Salaire", "Stipendio") }
        ]
      },
      {
        ico: "\u{1F680}",
        h: L("Bereit loszulegen?", "Ready to get started?", "Pr\xEAt \xE0 commencer?", "Pronti a iniziare?"),
        p: L(
          "Starte kostenlos mit einer Gratisbewerbung. Kein Abo n\xF6tig. Upgrade auf Pro f\xFCr unbegrenzte Nutzung aller 20+ Tools.",
          "Start free with one application. No subscription needed. Upgrade to Pro for unlimited access to all 20+ tools.",
          "Commencez gratuitement avec une candidature. Sans abonnement. Passez \xE0 Pro pour un acc\xE8s illimit\xE9.",
          "Inizia gratis con una candidatura. Senza abbonamento. Passa a Pro per accesso illimitato."
        ),
        feats: [
          { ico: "\u{1F381}", t: L("1\xD7 Gratis", "1\xD7 Free", "1\xD7 Gratuit", "1\xD7 Gratis") },
          { ico: "\u2726", t: "Pro: CHF 19.90" },
          { ico: "\u{1F504}", t: L("K\xFCndbar", "Cancel anytime", "R\xE9siliable", "Annullabile") },
          { ico: "\u{1F4B3}", t: "Twint \xB7 Stripe" }
        ]
      }
    ];
    const cur = steps[step];
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "onb-bg", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "onb-card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "onb-prog", children: steps.map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `onb-dot ${i <= step ? "on" : ""}` }, i)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "onb-step", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "onb-ico", children: cur.ico }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "onb-h", children: cur.h }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "onb-p", children: cur.p }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "onb-cards", children: cur.feats.map((f, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "onb-feat", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "onb-feat-ico", children: f.ico }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "onb-feat-t", children: f.t })
        ] }, i)) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 10 }, children: [
          step > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              onClick: () => setStep((s) => s - 1),
              style: { flex: 1, padding: "13px", background: "rgba(255,255,255,.06)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 14, color: "rgba(255,255,255,.5)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--bd)", transition: "all .18s" },
              children: "\u2190"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              onClick: () => step < TOTAL - 1 ? setStep((s) => s + 1) : onDone(),
              style: { flex: 3, padding: "13px", background: "var(--em)", border: "none", borderRadius: 14, color: "white", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--bd)", transition: "all .2s", letterSpacing: "-.2px" },
              children: step < TOTAL - 1 ? L("Weiter \u2192", "Continue \u2192", "Continuer \u2192", "Continua \u2192") : L("Los geht's! \u2192", "Let's go! \u2192", "C'est parti! \u2192", "Inizia! \u2192")
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            onClick: onDone,
            style: { textAlign: "center", marginTop: 12, background: "none", border: "none", color: "rgba(255,255,255,.2)", fontSize: 12, cursor: "pointer", fontFamily: "var(--bd)" },
            children: L("\xDCberspringen", "Skip", "Passer", "Salta")
          }
        )
      ] }, step)
    ] }) });
  }
  var _toastSetter = null;
  function setGlobalToaster(fn) {
    _toastSetter = fn;
  }
  function showToast(msg, type = "success", duration = 3e3) {
    if (_toastSetter) _toastSetter((prev) => [...prev, { id: Date.now(), msg, type, duration }]);
  }
  function ToastContainer() {
    const [toasts, setToasts] = useState([]);
    useEffect(() => {
      setGlobalToaster(setToasts);
      return () => setGlobalToaster(null);
    }, []);
    useEffect(() => {
      if (!toasts.length) return;
      const t = setTimeout(() => setToasts((prev) => prev.slice(1)), toasts[0].duration || 3e3);
      return () => clearTimeout(t);
    }, [toasts]);
    if (!toasts.length) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "toast-wrap", children: toasts.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `toast ${t.type}`, onClick: () => setToasts((prev) => prev.filter((x) => x.id !== t.id)), children: [
      t.type === "success" ? "\u2713" : t.type === "error" ? "\u26A0\uFE0F" : "\u2139\uFE0F",
      " ",
      t.msg
    ] }, t.id)) });
  }
  var getStreak = () => {
    try {
      const d = JSON.parse(localStorage.getItem("stf_streak") || "{}");
      const today = (/* @__PURE__ */ new Date()).toDateString();
      const yesterday = new Date(Date.now() - 864e5).toDateString();
      if (d.lastVisit === today) return d;
      if (d.lastVisit === yesterday) return { ...d, streak: (d.streak || 0) + 1, lastVisit: today };
      return { streak: 1, lastVisit: today, best: Math.max(d.best || 0, d.streak || 1) };
    } catch {
      return { streak: 1, lastVisit: (/* @__PURE__ */ new Date()).toDateString(), best: 1 };
    }
  };
  var touchStreak = () => {
    const s = getStreak();
    localStorage.setItem("stf_streak", JSON.stringify(s));
    return s;
  };
  var WEEKLY_CHALLENGES = [
    { id: "wc1", ico: "\u{1F4C4}", de: "Erstelle ein Motivationsschreiben", en: "Create a cover letter", fr: "Cr\xE9er une lettre de motivation", it: "Crea una lettera di motivazione", tool: "app", xp: 50 },
    { id: "wc2", ico: "\u{1F4BC}", de: "Optimiere dein LinkedIn-Profil", en: "Optimize your LinkedIn", fr: "Optimiser votre profil LinkedIn", it: "Ottimizza il tuo profilo LinkedIn", tool: "linkedin", xp: 75 },
    { id: "wc3", ico: "\u{1F916}", de: "Mach einen ATS-Check", en: "Do an ATS check", fr: "Faire une v\xE9rification ATS", it: "Fai un controllo ATS", tool: "ats", xp: 60 },
    { id: "wc4", ico: "\u{1F4B0}", de: "Simuliere eine Gehaltsverhandlung", en: "Simulate salary negotiation", fr: "Simuler une n\xE9gociation salariale", it: "Simula una trattativa salariale", tool: "gehalt", xp: 80 },
    { id: "wc5", ico: "\u{1F3A4}", de: "Bereite dich auf 5 Fragen vor", en: "Prepare 5 interview questions", fr: "Pr\xE9parez 5 questions d'entretien", it: "Prepara 5 domande colloquio", tool: "coach", xp: 70 }
  ];
  var getWeeklyProgress = () => {
    try {
      return JSON.parse(localStorage.getItem("stf_wc") || "{}");
    } catch {
      return {};
    }
  };
  function StreakBanner({ lang }) {
    const L = (d, e, f, i) => ({ de: d, en: e, fr: f, it: i })[lang] || d;
    const [streak, setStreak] = useState(null);
    const [challenges, setChallenges] = useState({});
    useEffect(() => {
      const s = touchStreak();
      setStreak(s);
      setChallenges(getWeeklyProgress());
    }, []);
    if (!streak) return null;
    const done = WEEKLY_CHALLENGES.filter((c) => challenges[c.id]).length;
    const total = WEEKLY_CHALLENGES.length;
    const pct = Math.round(done / total * 100);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "linear-gradient(135deg,rgba(245,158,11,.12),rgba(239,68,68,.08))", border: "1.5px solid rgba(245,158,11,.25)", borderRadius: 16, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 32, lineHeight: 1 }, children: streak.streak >= 7 ? "\u{1F525}" : streak.streak >= 3 ? "\u26A1" : "\u2726" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 28, fontWeight: 800, color: "white", lineHeight: 1 }, children: streak.streak }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: "rgba(255,255,255,.45)", marginTop: 2 }, children: L(`Tag${streak.streak !== 1 ? "e" : ""} Streak`, `Day${streak.streak !== 1 ? "s" : ""} streak`, `Jour${streak.streak !== 1 ? "s" : ""} de suite`, `Giorn${streak.streak !== 1 ? "i" : "o"} di fila`) }),
          streak.best > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 10, color: "rgba(245,158,11,.5)", marginTop: 1 }, children: L(`Rekord: ${streak.best} Tage`, `Best: ${streak.best} days`, `Record: ${streak.best} jours`, `Record: ${streak.best} giorni`) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "linear-gradient(135deg,rgba(99,102,241,.1),rgba(16,185,129,.06))", border: "1.5px solid rgba(99,102,241,.2)", borderRadius: 16, padding: "16px 18px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", letterSpacing: "1px", textTransform: "uppercase" }, children: L("Wochenziele", "Weekly Goals", "Objectifs hebdo", "Obiettivi settimana") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 11, fontWeight: 800, color: done === total ? "var(--em)" : "rgba(255,255,255,.5)" }, children: [
            done,
            "/",
            total
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: 5, background: "rgba(255,255,255,.08)", borderRadius: 10, overflow: "hidden", marginBottom: 8 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: "100%", width: `${pct}%`, background: done === total ? "var(--em)" : "#6366f1", borderRadius: 10, transition: "width .6s ease" } }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", gap: 4, flexWrap: "wrap" }, children: WEEKLY_CHALLENGES.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, opacity: challenges[c.id] ? 1 : 0.35, filter: challenges[c.id] ? "none" : "grayscale(1)", transition: "all .3s" }, children: c.ico }, c.id)) }),
        done === total && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 10, color: "var(--em)", marginTop: 4, fontWeight: 700 }, children: [
          "\u{1F389} ",
          L("Alle erledigt!", "All done!", "Tout compl\xE9t\xE9!", "Tutto fatto!")
        ] })
      ] })
    ] });
  }
  function CVScoreWidget({ lang, pro, setPw }) {
    const L = (d, e, f, i) => ({ de: d, en: e, fr: f, it: i })[lang] || d;
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [score, setScore] = useState(null);
    const [tips, setTips] = useState([]);
    const usageCount = getNewToolCount("cvScore");
    const canUse = pro || usageCount < C.NEW_TOOL_FREE_LIMIT;
    const run = async () => {
      if (!canUse) {
        setPw(true);
        return;
      }
      if (!text.trim()) return;
      setLoading(true);
      setScore(null);
      setTips([]);
      try {
        const prompt = L(
          `Du bist ein Schweizer CV-Experte. Analysiere diesen Lebenslauf-Text und gib einen Score von 0-100 zur\xFCck sowie 3 konkrete Verbesserungstipps. Antworte NUR mit validem JSON: {"score":75,"grade":"Gut","tips":["Tipp1","Tipp2","Tipp3"],"strengths":["St\xE4rke1","St\xE4rke2"]}. CV-Text:
${text}`,
          `You are a Swiss CV expert. Analyze this CV text and return a score 0-100 and 3 concrete improvement tips. Reply ONLY with valid JSON: {"score":75,"grade":"Good","tips":["Tip1","Tip2","Tip3"],"strengths":["Strength1","Strength2"]}. CV:
${text}`,
          `Tu es expert CV suisse. Analyse ce CV et retourne un score 0-100 et 3 conseils. R\xE9ponds UNIQUEMENT avec JSON valide: {"score":75,"grade":"Bien","tips":["Conseil1","Conseil2","Conseil3"],"strengths":["Force1","Force2"]}. CV:
${text}`,
          `Sei un esperto CV svizzero. Analizza questo CV e restituisci un punteggio 0-100 e 3 consigli. Rispondi SOLO con JSON valido: {"score":75,"grade":"Buono","tips":["Consiglio1","Consiglio2","Consiglio3"],"strengths":["Forza1","Forza2"]}. CV:
${text}`
        );
        const res = await callAI(prompt, null, "free");
        const clean = res.replace(/```json|```/g, "").trim();
        const data = JSON.parse(clean);
        setScore(data.score);
        setTips(data);
        if (!pro) incNewTool("cvScore");
        showToast(L("CV-Score berechnet! \u2713", "CV score calculated! \u2713", "Score calcul\xE9! \u2713", "Score calcolato! \u2713"));
      } catch (e) {
        showToast(L("Fehler beim Analysieren", "Error analyzing", "Erreur analyse", "Errore analisi"), "error");
      } finally {
        setLoading(false);
      }
    };
    const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card slide-up", style: { marginBottom: 16 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 40, height: 40, background: "rgba(16,185,129,.12)", border: "1.5px solid rgba(16,185,129,.25)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }, children: "\u{1F4CA}" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 16, fontWeight: 800 }, children: L("Schnell-CV-Check", "Quick CV Check", "Check CV rapide", "Check CV rapido") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "var(--mu)" }, children: L("Score in Sekunden", "Score in seconds", "Score en secondes", "Score in secondi") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { marginLeft: "auto", fontSize: 10, fontWeight: 700, background: canUse ? "rgba(16,185,129,.1)" : "rgba(99,102,241,.1)", color: canUse ? "var(--em)" : "#6366f1", border: `1px solid ${canUse ? "rgba(16,185,129,.2)" : "rgba(99,102,241,.2)"}`, borderRadius: 20, padding: "2px 10px", textTransform: "uppercase" }, children: pro ? "PRO" : canUse ? `${C.NEW_TOOL_FREE_LIMIT - usageCount}\xD7 Gratis` : "PRO" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "textarea",
        {
          value: text,
          onChange: (e) => setText(e.target.value),
          placeholder: L("Lebenslauf-Text hier einf\xFCgen\u2026", "Paste CV text here\u2026", "Coller le texte du CV ici\u2026", "Incolla testo del CV qui\u2026"),
          style: { width: "100%", padding: "10px 13px", border: "1.5px solid var(--bo)", borderRadius: 10, fontFamily: "var(--bd)", fontSize: 13, resize: "none", minHeight: 80, outline: "none", background: "#fafafa", boxSizing: "border-box", lineHeight: 1.6 }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          onClick: run,
          disabled: loading || !text.trim(),
          style: { marginTop: 10, padding: "10px 20px", background: text.trim() ? "var(--em)" : "var(--bo)", color: text.trim() ? "white" : "var(--mu)", border: "none", borderRadius: 10, fontFamily: "var(--bd)", fontSize: 13, fontWeight: 700, cursor: text.trim() ? "pointer" : "default", transition: "all .2s" },
          children: loading ? L("Analysiere\u2026", "Analyzing\u2026", "Analyse\u2026", "Analisi\u2026") : L("CV analysieren \u2192", "Analyze CV \u2192", "Analyser \u2192", "Analizza \u2192")
        }
      ),
      score !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 16, padding: 16, background: score >= 75 ? "#f0fdf4" : score >= 50 ? "#fffbeb" : "#fff1f2", border: `1.5px solid ${color}33`, borderRadius: 12 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 44, fontWeight: 800, color, lineHeight: 1 }, children: score }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 16, fontWeight: 800, color }, children: tips.grade }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: 5, width: 120, background: "rgba(0,0,0,.08)", borderRadius: 10, marginTop: 4, overflow: "hidden" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: "100%", width: `${score}%`, background: color, borderRadius: 10, transition: "width .8s ease" } }) })
          ] })
        ] }),
        (tips.strengths || []).length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { marginBottom: 8 }, children: tips.strengths.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 12, color: "#15803d", display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 3 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u2713" }),
          s
        ] }, i)) }),
        (tips.tips || []).map((tip, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8, padding: "7px 0", borderTop: "1px solid rgba(0,0,0,.06)", fontSize: 12, color: "rgba(11,11,18,.65)", lineHeight: 1.6 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: "#f59e0b", flexShrink: 0, fontWeight: 700 }, children: [
            i + 1,
            "."
          ] }),
          tip
        ] }, i))
      ] })
    ] });
  }
  function InterviewPrepWidget({ lang, pro, setPw }) {
    const L = (d, e, f, i) => ({ de: d, en: e, fr: f, it: i })[lang] || d;
    const [job, setJob] = useState("");
    const [loading, setLoading] = useState(false);
    const [questions, setQuestions] = useState(null);
    const usageCount = getNewToolCount("interviewPrep");
    const canUse = pro || usageCount < C.NEW_TOOL_FREE_LIMIT;
    const run = async () => {
      if (!canUse) {
        setPw(true);
        return;
      }
      if (!job.trim()) return;
      setLoading(true);
      setQuestions(null);
      try {
        const prompt = L(
          `Schweizer Interview-Coach: Erstelle die 5 h\xE4ufigsten Interviewfragen f\xFCr "${job}" im Schweizer Markt. Antworte NUR mit JSON: {"questions":[{"q":"Frage?","hint":"Kurzer Tipp"}]}`,
          `Swiss interview coach: Create the 5 most common interview questions for "${job}". Reply ONLY with JSON: {"questions":[{"q":"Question?","hint":"Short tip"}]}`,
          `Coach entretien suisse: Les 5 questions les plus fr\xE9quentes pour "${job}". R\xE9pondre UNIQUEMENT JSON: {"questions":[{"q":"Question?","hint":"Conseil"}]}`,
          `Coach colloquio svizzero: Le 5 domande pi\xF9 frequenti per "${job}". Rispondere SOLO JSON: {"questions":[{"q":"Domanda?","hint":"Consiglio"}]}`
        );
        const res = await callAI(prompt, null, "free");
        const clean = res.replace(/```json|```/g, "").trim();
        setQuestions(JSON.parse(clean).questions || []);
        if (!pro) incNewTool("interviewPrep");
        showToast(L("5 Fragen generiert \u2713", "5 questions generated \u2713", "5 questions g\xE9n\xE9r\xE9es \u2713", "5 domande generate \u2713"));
      } catch (e) {
        showToast("Error", "error");
      } finally {
        setLoading(false);
      }
    };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card slide-up", style: { marginBottom: 16 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 40, height: 40, background: "rgba(167,139,250,.12)", border: "1.5px solid rgba(167,139,250,.25)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }, children: "\u{1F3A4}" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 16, fontWeight: 800 }, children: L("Interview-Vorbereitung", "Interview Prep", "Pr\xE9paration entretien", "Preparazione colloquio") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "var(--mu)" }, children: L("5 Topfragen in Sekunden", "Top 5 questions instantly", "5 questions cl\xE9s", "5 domande chiave") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { marginLeft: "auto", fontSize: 10, fontWeight: 700, background: canUse ? "rgba(167,139,250,.12)" : "rgba(99,102,241,.1)", color: canUse ? "#a78bfa" : "#6366f1", border: `1px solid ${canUse ? "rgba(167,139,250,.25)" : "rgba(99,102,241,.2)"}`, borderRadius: 20, padding: "2px 10px", textTransform: "uppercase" }, children: pro ? "PRO" : canUse ? `${C.NEW_TOOL_FREE_LIMIT - usageCount}\xD7 Gratis` : "PRO" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            value: job,
            onChange: (e) => setJob(e.target.value),
            onKeyDown: (e) => e.key === "Enter" && run(),
            placeholder: L("Stelle eingeben, z.B. Softwareentwickler\u2026", "Enter position, e.g. Software Engineer\u2026", "Saisir le poste, ex. D\xE9veloppeur\u2026", "Inserisci il ruolo, es. Sviluppatore\u2026"),
            style: { flex: 1, padding: "10px 13px", border: "1.5px solid var(--bo)", borderRadius: 10, fontFamily: "var(--bd)", fontSize: 13, outline: "none", background: "#fafafa" }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            onClick: run,
            disabled: loading || !job.trim(),
            style: { padding: "10px 18px", background: job.trim() ? "#7c3aed" : "var(--bo)", color: job.trim() ? "white" : "var(--mu)", border: "none", borderRadius: 10, fontFamily: "var(--bd)", fontSize: 13, fontWeight: 700, cursor: job.trim() ? "pointer" : "default", transition: "all .2s", whiteSpace: "nowrap" },
            children: loading ? "\u2026" : L("Fragen \u2192", "Questions \u2192", "Questions \u2192", "Domande \u2192")
          }
        )
      ] }),
      questions && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 14 }, children: [
        questions.map((q, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "12px 0", borderBottom: "1px solid var(--bos)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 4 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 22, height: 22, background: "rgba(124,58,237,.1)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#7c3aed", flexShrink: 0 }, children: i + 1 }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontFamily: "var(--hd)", fontSize: 14, fontWeight: 700, color: "var(--ink)", lineHeight: 1.4 }, children: [
              "\xAB",
              q.q,
              "\xBB"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 12, color: "var(--mu)", marginLeft: 32, lineHeight: 1.6 }, children: [
            "\u{1F4A1} ",
            q.hint
          ] })
        ] }, i)),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            onClick: () => setPw && setPw(true),
            style: { marginTop: 12, width: "100%", padding: "10px", background: "rgba(124,58,237,.06)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 10, color: "#7c3aed", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--bd)" },
            children: L("\u2192 Volles Interview-Training mit Bewertung", "\u2192 Full interview training with scoring", "\u2192 Entra\xEEnement complet", "\u2192 Allenamento completo")
          }
        )
      ] })
    ] });
  }
  function JobAdAnalyzerWidget({ lang, pro, setPw }) {
    const L = (d, e, f, i) => ({ de: d, en: e, fr: f, it: i })[lang] || d;
    const [ad, setAd] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const usageCount = getNewToolCount("jobAdAnalyzer");
    const canUse = pro || usageCount < C.NEW_TOOL_FREE_LIMIT;
    const run = async () => {
      if (!canUse) {
        setPw(true);
        return;
      }
      if (!ad.trim()) return;
      setLoading(true);
      setResult(null);
      try {
        const prompt = L(
          `Analysiere dieses Schweizer Stelleninserat und extrahiere die wichtigsten Informationen. Antworte NUR mit JSON: {"title":"","company":"","salary_range":"CHF X-Y","keywords":["kw1","kw2","kw3","kw4","kw5"],"must_haves":["m1","m2","m3"],"nice_to_haves":["n1","n2"],"red_flags":[],"match_tips":["Tipp zum Match"]}.
Inserat:
${ad}`,
          `Analyze this Swiss job posting and extract key info. Reply ONLY with JSON: {"title":"","company":"","salary_range":"CHF X-Y","keywords":["kw1","kw2","kw3","kw4","kw5"],"must_haves":["m1","m2","m3"],"nice_to_haves":["n1","n2"],"red_flags":[],"match_tips":["Match tip"]}.
Posting:
${ad}`,
          `Analysez cette offre d'emploi suisse. R\xE9pondez UNIQUEMENT JSON: {"title":"","company":"","salary_range":"CHF X-Y","keywords":["mc1","mc2","mc3","mc4","mc5"],"must_haves":["o1","o2","o3"],"nice_to_haves":["o1","o2"],"red_flags":[],"match_tips":["Conseil"]}.
Offre:
${ad}`,
          `Analizza questo annuncio di lavoro svizzero. Risposta SOLO JSON: {"title":"","company":"","salary_range":"CHF X-Y","keywords":["p1","p2","p3","p4","p5"],"must_haves":["r1","r2","r3"],"nice_to_haves":["n1","n2"],"red_flags":[],"match_tips":["Consiglio"]}.
Annuncio:
${ad}`
        );
        const res = await callAI(prompt, null, "free");
        const clean = res.replace(/```json|```/g, "").trim();
        setResult(JSON.parse(clean));
        if (!pro) incNewTool("jobAdAnalyzer");
        showToast(L("Inserat analysiert \u2713", "Ad analyzed \u2713", "Offre analys\xE9e \u2713", "Annuncio analizzato \u2713"));
      } catch (e) {
        showToast("Error", "error");
      } finally {
        setLoading(false);
      }
    };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card slide-up", style: { marginBottom: 16 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 40, height: 40, background: "rgba(245,158,11,.1)", border: "1.5px solid rgba(245,158,11,.2)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }, children: "\u{1F50D}" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 16, fontWeight: 800 }, children: L("Inserat-Analyse", "Job Ad Analyzer", "Analyse d'offre", "Analisi annuncio") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "var(--mu)" }, children: L("Keywords & Musthaves extrahieren", "Extract keywords & must-haves", "Extraire mots-cl\xE9s", "Estrai parole chiave") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { marginLeft: "auto", fontSize: 10, fontWeight: 700, background: canUse ? "rgba(245,158,11,.1)" : "rgba(99,102,241,.1)", color: canUse ? "#b45309" : "#6366f1", border: `1px solid ${canUse ? "rgba(245,158,11,.2)" : "rgba(99,102,241,.2)"}`, borderRadius: 20, padding: "2px 10px", textTransform: "uppercase" }, children: pro ? "PRO" : canUse ? `${C.NEW_TOOL_FREE_LIMIT - usageCount}\xD7 Gratis` : "PRO" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "textarea",
        {
          value: ad,
          onChange: (e) => setAd(e.target.value),
          placeholder: L("Stelleninserat hier einf\xFCgen\u2026", "Paste job posting here\u2026", "Coller l'offre d'emploi ici\u2026", "Incolla l'annuncio di lavoro qui\u2026"),
          style: { width: "100%", padding: "10px 13px", border: "1.5px solid var(--bo)", borderRadius: 10, fontFamily: "var(--bd)", fontSize: 13, resize: "none", minHeight: 80, outline: "none", background: "#fafafa", boxSizing: "border-box", lineHeight: 1.6 }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          onClick: run,
          disabled: loading || !ad.trim(),
          style: { marginTop: 10, padding: "10px 20px", background: ad.trim() ? "#b45309" : "var(--bo)", color: ad.trim() ? "white" : "var(--mu)", border: "none", borderRadius: 10, fontFamily: "var(--bd)", fontSize: 13, fontWeight: 700, cursor: ad.trim() ? "pointer" : "default", transition: "all .2s" },
          children: loading ? L("Analysiere\u2026", "Analyzing\u2026", "Analyse\u2026", "Analisi\u2026") : L("Analysieren \u2192", "Analyze \u2192", "Analyser \u2192", "Analizza \u2192")
        }
      ),
      result && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 14 }, children: [
        result.title && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontFamily: "var(--hd)", fontSize: 15, fontWeight: 800, marginBottom: 4 }, children: [
          result.title,
          result.company ? ` @ ${result.company}` : ""
        ] }),
        result.salary_range && result.salary_range !== "CHF X-Y" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: "var(--em2)", marginBottom: 10 }, children: [
          "\u{1F4B0} ",
          result.salary_range
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginBottom: 10 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--mu)", marginBottom: 6 }, children: "Keywords" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: (result.keywords || []).map((k, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { padding: "3px 10px", background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.15)", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "var(--em2)" }, children: k }, i)) })
        ] }),
        (result.must_haves || []).length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginBottom: 10 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--mu)", marginBottom: 6 }, children: "Must-Have" }),
          result.must_haves.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 12, color: "var(--ink)", display: "flex", gap: 6, marginBottom: 3 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "#ef4444" }, children: "\u25CF" }),
            m
          ] }, i))
        ] }),
        (result.match_tips || []).length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.15)", borderRadius: 10, padding: "10px 14px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 11, fontWeight: 700, color: "#92400e", marginBottom: 4 }, children: [
            "\u{1F4A1} ",
            L("Match-Tipps", "Match Tips", "Conseils de match", "Consigli di match")
          ] }),
          result.match_tips.map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "#92400e", lineHeight: 1.6 }, children: t }, i))
        ] })
      ] })
    ] });
  }
  var mkT = (lang) => {
    const L = (d, f, i, e) => ({ de: d, fr: f, it: i, en: e })[lang];
    return {
      nav: {
        home: L("Start", "Accueil", "Home", "Home"),
        prices: L("Preise", "Tarifs", "Prezzi", "Pricing"),
        tools: L("Tools", "Outils", "Strumenti", "Tools"),
        excel: L("Excel-Generator", "Excel Generator", "G\xE9n\xE9rateur Excel", "Generatore Excel"),
        pptx: L("PowerPoint", "PowerPoint", "PowerPoint", "PowerPoint"),
        ats: "ATS-Check",
        zeugnis: L("Zeugnis", "Certificat", "Certificato", "Reference"),
        jobs: L("Job-Matching", "Jobs", "Lavori", "Job Match")
      },
      hero: {
        eye: L(`\u2726 ${C.name} \u2013 ${C.tagline}`, `\u2726 ${C.name} \u2013 Copilote IA Carri\xE8re Suisse`, `\u2726 ${C.name} \u2013 Copilota IA Carriera Svizzera`, `\u2726 ${C.name} \u2013 ${C.tagline}`),
        h1a: L("Deine Karriere.", "Votre carri\xE8re.", "La tua carriera.", "Your career."),
        h1b: L("Dein", "Votre", "Il tuo", "Your"),
        h1c: L("KI-Copilot.", "Copilote IA.", "Copilota IA.", "AI Copilot."),
        sub: L(
          "11 KI-Tools in einem. Bewerbungen, LinkedIn, ATS-Check, Job-Matching, Zeugnisanalyse, Interview-Coach + 5 weitere \u2013 f\xFCr den Schweizer Arbeitsmarkt.",
          "11 outils IA en un. Candidatures, LinkedIn, ATS, matching, certificats et coach + 5 autres \u2013 pour le march\xE9 suisse.",
          "11 strumenti IA in uno. Candidature, LinkedIn, ATS, matching, certificati e coach + 5 altri \u2013 per il mercato svizzero.",
          "11 AI tools in one. Applications, LinkedIn, ATS check, job matching, reference analysis, interview coach + 5 more \u2013 for the Swiss job market."
        ),
        cta: L("Kostenlos starten \u2192", "Commencer gratuitement \u2192", "Inizia gratis \u2192", "Start for free \u2192"),
        how: L("Alle Tools ansehen", "Voir les outils", "Vedi gli strumenti", "See all tools"),
        stats: [
          { n: "18+", l: L("KI-Tools", "AI tools", "outils IA", "strumenti IA") },
          { n: "3'000+", l: L("Dokumente erstellt", "docs created", "documents cr\xE9\xE9s", "documenti creati") },
          { n: "4", l: L("Sprachen", "languages", "langues", "lingue") },
          { n: "CHF 19.90", l: L("statt CHF 300 Berater", "vs CHF 300 advisor", "vs CHF 300 conseil", "vs CHF 300 consulente") }
        ]
      },
      tools: {
        label: L("20+ Tools. Ein Copilot.", "20+ Outils. Un Copilote.", "20+ Strumenti. Un Copilota.", "20+ Tools. One Copilot."),
        title: L("Alles f\xFCr deine Karriere in der Schweiz.", "Tout pour votre carri\xE8re en Suisse.", "Tutto per la tua carriera in Svizzera.", "Everything for your career in Switzerland."),
        sub: L("Kein Hin-und-Her zwischen verschiedenen Apps. Alles an einem Ort.", "Fini les allers-retours entre apps. Tout en un endroit.", "Niente avanti e indietro tra app. Tutto in un posto.", "No more switching between apps. Everything in one place."),
        items: [
          // 1. Hook – 1× gratis, sofort Wert erleben
          { page: "app", ico: "\u270D\uFE0F", t: L("Bewerbung schreiben", "Write Application", "R\xE9diger candidature", "Scrivi candidatura"), p: L("Motivationsschreiben & Lebenslauf in 60 Sek. Schweizer Format. 1\xD7 gratis.", "Cover letter & CV in 60 sec. Swiss format. 1\xD7 free.", "Lettre & CV en 60 sec. Format suisse. 1\xD7 gratuit.", "Lettera & CV in 60 sec. Formato svizzero. 1\xD7 gratuito."), badge: "1\xD7 Gratis", bc: "tc-em", col: "" },
          // 2. Richtige Stelle finden – vor der Bewerbung
          { page: "jobmatch", ico: "\u{1F3AF}", t: L("Job-Matching", "Job Matching", "Matching emploi", "Job Matching"), p: L("KI findet deine Top 5 passenden Stellen mit Fit-Score. Keine Blindbewerbungen mehr.", "AI finds your top 5 matching jobs with fit score. No more blind applications.", "L'IA trouve vos 5 postes id\xE9aux. Plus de candidatures au hasard.", "L'IA trova i tuoi 5 lavori ideali. Niente pi\xF9 candidature al buio."), badge: "PRO", bc: "tc-em", col: "" },
          // 3. CV optimieren – damit es durchkommt
          { page: "ats", ico: "\u{1F916}", t: L("ATS-Check", "ATS Check", "V\xE9rification ATS", "Controllo ATS"), p: L("Testet ob dein Lebenslauf Recruiter-Software besteht. Score + konkrete Fixes.", "Tests if your CV passes recruiter software. Score + concrete fixes.", "Teste si votre CV passe les logiciels RH. Score + am\xE9liorations.", "Testa se il tuo CV supera i software HR. Score + miglioramenti concreti."), badge: "PRO", bc: "tc-bl", col: "bl" },
          // 4. LinkedIn – Recruiter kommen zu dir
          { page: "linkedin", ico: "\u{1F4BC}", t: "LinkedIn", p: L("Profil analysieren & optimieren \u2013 Headline, About, Skills. Recruiter finden dich.", "Analyze & optimize your profile. Recruiters will find you.", "Analyser & optimiser \u2013 Titre, About, comp\xE9tences. Les recruteurs vous trouvent.", "Analizzare & ottimizzare. I recruiter ti trovano."), badge: "PRO", bc: "tc-bl", col: "bl" },
          // 5. Interview – kurz vor dem Ziel
          { page: "coach", ico: "\u{1F3A4}", t: L("Interview-Coach", "Interview Coach", "Coach entretien", "Coach colloquio"), p: L("KI simuliert 5 echte Fragen, bewertet Antworten, gibt Note 0\u2013100.", "AI simulates 5 real questions, evaluates your answers, gives score 0\u2013100.", "L'IA simule 5 questions r\xE9elles, \xE9value et note 0\u2013100.", "L'IA simula 5 domande reali, valuta e d\xE0 voto 0\u2013100."), badge: "PRO", bc: "tc-em", col: "" },
          // 6. Zeugnis – Schweizer Spezialität
          { page: "zeugnis", ico: "\u{1F4DC}", t: L("Zeugnis-Analyse", "Reference Analysis", "Analyse certificat", "Analisi certificato"), p: L("Schweizer Zeugnis-Code entschl\xFCsselt. Was steht wirklich drin? Tausende kennen es nicht.", "Swiss work reference decoded. What does it really say? Thousands don't know.", "D\xE9code le certificat suisse. Que dit-il vraiment? Des milliers l'ignorent.", "Decodifica il certificato svizzero. Cosa dice davvero?"), badge: "PRO", bc: "tc-am", col: "am" },
          // 7+8. Produktivität – für alle, nicht nur Jobsuche
          { page: "excel", ico: "\u{1F4CA}", t: L("Excel-Generator", "Excel Generator", "G\xE9n\xE9rateur Excel", "Generatore Excel"), p: L("Profi-Tabellen mit Formeln per Beschreibung. F\xFCr Arbeit, Schule, Privat.", "Professional spreadsheets with formulas. For work, school, personal use.", "Tableaux pros avec formules. Pour travail, \xE9cole, usage personnel.", "Fogli professionali con formule. Per lavoro, scuola, uso personale."), badge: "PRO", bc: "tc-em", col: "" },
          { page: "pptx", ico: "\u{1F4FD}\uFE0F", t: L("PowerPoint-Maker", "PowerPoint Maker", "Cr\xE9ateur PowerPoint", "Creatore PowerPoint"), p: L("Strukturierte Pr\xE4sentationen in Minuten \u2013 f\xFCr Schule, Uni & Arbeit.", "Structured presentations in minutes \u2013 for school, uni & work.", "Pr\xE9sentations structur\xE9es en minutes \u2013 \xE9cole, universit\xE9 & travail.", "Presentazioni strutturate in minuti \u2013 scuola, universit\xE0 e lavoro."), badge: "PRO", bc: "tc-bl", col: "bl" }
        ]
      },
      why: {
        label: L("Warum Stellify?", "Pourquoi Stellify?", "Perch\xE9 Stellify?", "Why Stellify?"),
        title: L("Der erste echte AI Career Copilot f\xFCr die Schweiz.", "Le premier vrai copilote IA carri\xE8re pour la Suisse.", "Il primo vero AI career copilot per la Svizzera.", "The first real AI career copilot for Switzerland."),
        sub: L("Andere Tools machen eines. Stellify macht alles \u2013 und versteht den Schweizer Markt.", "D'autres font une chose. Stellify fait tout \u2013 et comprend le march\xE9 suisse.", "Altri strumenti fanno una cosa. Stellify fa tutto \u2013 e capisce il mercato svizzero.", "Other tools do one thing. Stellify does all \u2013 and understands the Swiss market."),
        badH: L("\u274C ChatGPT / einzelne Tools", "\u274C ChatGPT / outils s\xE9par\xE9s", "\u274C ChatGPT / strumenti separati", "\u274C ChatGPT / separate tools"),
        goodH: "\u2705 Stellify",
        badL: L(
          ["Leeres Chatfenster, du weisst nicht was eingeben", "Kein Schweizer Format/Standard", "Kein ATS-Check \u2013 du weisst nicht ob dein CV gelesen wird", "Kein Zeugnis-Decoder \u2013 Schweizer Code bleibt ein R\xE4tsel", "Kein Job-Matching \u2013 du bewirbst dich ins Blaue", "6 verschiedene Apps, kein roter Faden"],
          ["Champ vide, on ne sait pas quoi \xE9crire", "Pas de format suisse", "Pas d'ATS \u2013 vous ne savez pas si votre CV est lu", "Pas de d\xE9codeur de certificat", "Pas de matching \u2013 vous postulez au hasard", "6 apps diff\xE9rentes, pas de fil rouge"],
          ["Campo vuoto, non sai cosa scrivere", "Nessun formato svizzero", "Nessun ATS \u2013 non sai se il tuo CV viene letto", "Nessun decoder certificato", "Nessun matching \u2013 ti candidi al buio", "6 app diverse, nessun filo conduttore"],
          ["Empty box, you don't know what to type", "No Swiss format/standard", "No ATS check \u2013 you don't know if your CV gets read", "No reference decoder \u2013 Swiss code remains a mystery", "No job matching \u2013 you apply blindly", "6 different apps, no coherent flow"]
        ),
        goodL: L(
          ["Gef\xFChrter Prozess in 3 Schritten, kinderleicht", "Optimiert f\xFCr CH-Format in DE/FR/IT/EN", "ATS-Simulation pr\xFCft Keywords & gibt Score", "Zeugnis-Analyse entschl\xFCsselt Schweizer Code", "Job-Matching zeigt wo du 80%+ passst", "Alles in einem \u2013 ein Profil, sechs Tools"],
          ["Processus guid\xE9 3 \xE9tapes, tr\xE8s simple", "Optimis\xE9 format suisse DE/FR/IT/EN", "Simulation ATS v\xE9rifie mots-cl\xE9s & score", "Analyse certificat d\xE9code le code suisse", "Matching montre o\xF9 vous avez 80%+", "Tout en un \u2013 un profil, six outils"],
          ["Processo guidato 3 passi, semplicissimo", "Ottimizzato formato svizzero DE/FR/IT/EN", "Simulazione ATS verifica keywords & score", "Analisi certificato decodifica il codice svizzero", "Matching mostra dove hai 80%+", "Tutto in uno \u2013 un profilo, sei strumenti"],
          ["Guided 3-step process, incredibly simple", "Optimized Swiss format in DE/FR/IT/EN", "ATS simulation checks keywords & gives score", "Reference analysis decodes Swiss code", "Job matching shows where you fit 80%+", "All in one \u2013 one profile, six tools"]
        )
      },
      how: {
        label: L("Wie es funktioniert", "Comment \xE7a marche", "Come funziona", "How it works"),
        title: L("Profil einmal anlegen. Alle 20+ Tools nutzen.", "Cr\xE9ez votre profil une fois. Utilisez les 20+ outils.", "Crea il profilo una volta. Usa tutti i 20+ strumenti.", "Set up your profile once. Use all 20+ tools."),
        sub: L("Dein Profil ist die Basis f\xFCr alle 20+ Tools.", "Votre profil est la base de tous les 20+ outils.", "Il tuo profilo \xE8 la base per tutti i 20+ strumenti.", "Your profile is the basis for all 20+ tools."),
        steps: L(
          [{ n: "01", t: "Profil anlegen", p: "Stelle, Erfahrung, Skills \u2013 einmal eingeben oder CV hochladen. Die KI liest alles automatisch." }, { n: "02", t: "Tool w\xE4hlen", p: "Bewerbung schreiben, ATS pr\xFCfen, Zeugnis analysieren, Jobs finden oder Interview \xFCben." }, { n: "03", t: "Live-Ergebnis", p: "Das Ergebnis erscheint Wort f\xFCr Wort in Echtzeit \u2013 du siehst sofort, wie dein Dokument entsteht." }],
          [{ n: "01", t: "Cr\xE9er le profil", p: "Poste, exp\xE9rience, comp\xE9tences \u2013 entrer une fois ou uploader un CV. L'IA lit tout automatiquement." }, { n: "02", t: "Choisir l'outil", p: "R\xE9diger candidature, ATS, analyser certificat, trouver emplois ou s'entra\xEEner." }, { n: "03", t: "R\xE9sultat en direct", p: "Le r\xE9sultat appara\xEEt mot par mot en temps r\xE9el \u2013 vous voyez votre document prendre forme instantan\xE9ment." }],
          [{ n: "01", t: "Crea il profilo", p: "Posto, esperienza, skills \u2013 inserire una volta o caricare il CV. L'IA legge tutto automaticamente." }, { n: "02", t: "Scegli lo strumento", p: "Scrivere candidatura, ATS, analizzare certificato, trovare lavori o esercitarsi." }, { n: "03", t: "Risultato live", p: "Il risultato appare parola per parola in tempo reale \u2013 vedi subito il tuo documento prendere forma." }],
          [{ n: "01", t: "Create profile", p: "Position, experience, skills \u2013 enter once or upload your CV. AI reads everything automatically." }, { n: "02", t: "Choose a tool", p: "Write application, ATS check, analyze reference, find jobs or practice interview." }, { n: "03", t: "Live result", p: "The result appears word by word in real time \u2013 watch your document come to life instantly." }]
        )
      },
      market: {
        label: L("Marktpotenzial", "Potentiel march\xE9", "Potenziale mercato", "Market potential"),
        title: L("Warum jetzt. Warum Schweiz.", "Pourquoi maintenant. Pourquoi la Suisse.", "Perch\xE9 adesso. Perch\xE9 la Svizzera.", "Why now. Why Switzerland."),
        points: L(
          [{ ico: "\u{1F4C8}", t: "Jobwechsel nehmen zu", p: "Durchschnittlich alle 3 Jahre wechseln Arbeitnehmer in der Schweiz ihren Job." }, { ico: "\u23F0", t: "Bewerbungen kosten Zeit", p: "Eine gute Bewerbung dauert 3\u20135 Stunden. Mit KI: 3 Minuten." }, { ico: "\u{1F916}", t: "KI wird akzeptiert", p: "78% der Schweizer Arbeitnehmer w\xFCrden KI f\xFCr Karrierehilfe nutzen." }, { ico: "\u{1F1E8}\u{1F1ED}", t: "Kein gutes CH-Tool", p: "Keine L\xF6sung versteht das Schweizer Zeugnis-System, ATS-Anforderungen und 4 Sprachen." }],
          [{ ico: "\u{1F4C8}", t: "Changements de poste croissants", p: "En moyenne, les salari\xE9s changent d'emploi tous les 3 ans en Suisse." }, { ico: "\u23F0", t: "Candidatures chronophages", p: "Une bonne candidature prend 3-5h. Avec l'IA: 3 minutes." }, { ico: "\u{1F916}", t: "IA de plus en plus accept\xE9e", p: "78% des salari\xE9s suisses utiliseraient l'IA pour leur carri\xE8re." }, { ico: "\u{1F1E8}\u{1F1ED}", t: "Aucun bon outil suisse", p: "Aucune solution comprend le syst\xE8me de certificats CH, l'ATS et 4 langues." }],
          [{ ico: "\u{1F4C8}", t: "Cambi di lavoro in crescita", p: "In media i lavoratori svizzeri cambiano lavoro ogni 3 anni." }, { ico: "\u23F0", t: "Candidature richiedono tempo", p: "Una buona candidatura richiede 3-5 ore. Con l'IA: 3 minuti." }, { ico: "\u{1F916}", t: "IA sempre pi\xF9 accettata", p: "Il 78% dei lavoratori svizzeri userebbe l'IA per la carriera." }, { ico: "\u{1F1E8}\u{1F1ED}", t: "Nessun buon tool svizzero", p: "Nessuna soluzione capisce i certificati svizzeri, ATS e 4 lingue." }],
          [{ ico: "\u{1F4C8}", t: "Job changes increasing", p: "On average, Swiss employees change jobs every 3 years." }, { ico: "\u23F0", t: "Applications take time", p: "A good application takes 3\u20135 hours. With AI: 3 minutes." }, { ico: "\u{1F916}", t: "AI increasingly accepted", p: "78% of Swiss employees would use AI for career help." }, { ico: "\u{1F1E8}\u{1F1ED}", t: "No good Swiss tool", p: "No solution understands Swiss work references, ATS requirements and 4 languages." }]
        )
      },
      testi: {
        label: L("Was Nutzer sagen", "T\xE9moignages", "Testimonianze", "Testimonials"),
        title: L("Echte Resultate.", "R\xE9sultats r\xE9els.", "Risultati reali.", "Real results."),
        items: L(
          [{ s: "\u2605\u2605\u2605\u2605\u2605", t: "In 2 Minuten ein perfektes Motivationsschreiben. Ich habe den Job bekommen!", a: "Sophie K.", r: "Marketingmanagerin, Z\xFCrich" }, { s: "\u2605\u2605\u2605\u2605\u2605", t: "Der ATS-Check hat gezeigt, dass mein Lebenslauf bei 40% der Firmen aussortiert wurde. Nach der Optimierung: 91%.", a: "Lukas B.", r: "Softwareentwickler, Bern" }, { s: "\u2605\u2605\u2605\u2605\u2605", t: "Ich habe endlich verstanden was in meinem Arbeitszeugnis steht. Das Zeugnis war nicht so gut wie ich dachte.", a: "Mia T.", r: "Projektleiterin, Basel" }],
          [{ s: "\u2605\u2605\u2605\u2605\u2605", t: "En 2 minutes une lettre parfaite. J'ai obtenu le poste!", a: "Sophie K.", r: "Responsable marketing, Zurich" }, { s: "\u2605\u2605\u2605\u2605\u2605", t: "L'ATS m'a montr\xE9 que mon CV \xE9tait rejet\xE9 \xE0 40%. Apr\xE8s optimisation: 91%.", a: "Lukas B.", r: "D\xE9veloppeur, Berne" }, { s: "\u2605\u2605\u2605\u2605\u2605", t: "J'ai enfin compris ce que dit mon certificat de travail.", a: "Mia T.", r: "Cheffe de projet, B\xE2le" }],
          [{ s: "\u2605\u2605\u2605\u2605\u2605", t: "In 2 minuti una lettera perfetta. Ho ottenuto il lavoro!", a: "Sophie K.", r: "Responsabile marketing, Zurigo" }, { s: "\u2605\u2605\u2605\u2605\u2605", t: "L'ATS mi ha mostrato che il mio CV veniva scartato al 40%. Dopo ottimizzazione: 91%.", a: "Lukas B.", r: "Sviluppatore, Berna" }, { s: "\u2605\u2605\u2605\u2605\u2605", t: "Ho finalmente capito cosa c'\xE8 nel mio certificato di lavoro.", a: "Mia T.", r: "Project manager, Basilea" }],
          [{ s: "\u2605\u2605\u2605\u2605\u2605", t: "In 2 minutes a perfect cover letter. I got the job!", a: "Sophie K.", r: "Marketing manager, Zurich" }, { s: "\u2605\u2605\u2605\u2605\u2605", t: "The ATS check showed my CV was rejected at 40% of companies. After optimization: 91%.", a: "Lukas B.", r: "Software developer, Berne" }, { s: "\u2605\u2605\u2605\u2605\u2605", t: "I finally understood what my work reference says. It wasn't as good as I thought.", a: "Mia T.", r: "Project manager, Basel" }]
        )
      },
      price: {
        label: L("Preise", "Tarifs", "Prezzi", "Pricing"),
        title: L("Ein Preis. 19+ Tools.", "One price. 19+ tools.", "Un prix. 19+ outils.", "Un prezzo. 19+ strumenti."),
        sub: L("Jederzeit k\xFCndbar. Keine versteckten Kosten.", "R\xE9siliable \xE0 tout moment.", "Cancellabile in qualsiasi momento.", "Cancel anytime. No hidden costs."),
        monthly: L("Monatlich", "Mensuel", "Mensile", "Monthly"),
        yearly: L("J\xE4hrlich", "Annuel", "Annuale", "Yearly"),
        save: L("25% sparen", "\xC9conomisez 25%", "Risparmia 25%", "Save 25%"),
        recom: L("Empfohlen", "Recommand\xE9", "Consigliato", "Recommended"),
        tiers: [
          {
            id: "free",
            name: L("Gratis", "Gratuit", "Gratuito", "Free"),
            price: 0,
            note: L("F\xFCr immer kostenlos", "Gratuit pour toujours", "Sempre gratuito", "Free forever"),
            list: L([`${C.FREE_LIMIT} Generierungen / Monat`, "Motivationsschreiben", "Lebenslauf", "CV hochladen", "Text kopieren"], [`${C.FREE_LIMIT} g\xE9n\xE9rations / mois`, "Lettre de motivation", "CV", "Upload CV", "Copier"], [`${C.FREE_LIMIT} generazioni / mese`, "Lettera motivazione", "CV", "Upload CV", "Copia"], [`${C.FREE_LIMIT} generations / month`, "Cover letter", "CV", "Upload CV", "Copy text"]),
            no: L(["LinkedIn", "ATS-Check", "Zeugnis-Analyse", "Job-Matching", "Interview-Coach", "PDF-Export", "E-Mail senden", "Bewerbungs-Tracker", "KI-Gehaltsrechner", "20+ weitere Tools"], ["LinkedIn", "ATS check", "Reference analysis", "Job matching", "Interview coach", "PDF export", "Email send", "Application tracker", "Salary calculator", "20+ more tools"], ["LinkedIn", "ATS", "Analyse certificat", "Matching", "Coach", "PDF", "E-mail", "Tracker", "Calculateur salaire", "20+ autres outils"], ["LinkedIn", "ATS", "Analisi certificato", "Matching", "Coach", "PDF", "E-mail", "Tracker", "Calcolatore stipendio", "20+ altri strumenti"]),
            btn: L("Kostenlos starten", "Commencer gratuitement", "Inizia gratis", "Start for free"),
            btnS: "b-out"
          },
          {
            id: "pro",
            name: "Pro",
            priceM: 19.9,
            priceY: 14.9,
            best: true,
            note: L("1 Person \xB7 Monatlich k\xFCndbar", "1 person \xB7 Cancel monthly", "1 personne \xB7 R\xE9siliable", "1 persona \xB7 Annullabile"),
            yearNote: L("\u{1F525} CHF 14.90/Mo. bei Jahresabo \u2013 CHF 226.80/Jahr", "\u{1F525} CHF 14.90/mo with annual plan \u2013 CHF 226.80/year", "\u{1F525} CHF 14.90/mois avec abonnement annuel", "\u{1F525} CHF 14.90/mese con abbonamento annuale"),
            list: L(
              ["\u270D\uFE0F Unbegrenzte Bewerbungen", "\u{1F4BC} LinkedIn Analyse & Optimierung", "\u{1F916} ATS-Simulation mit Score", "\u{1F4DC} Zeugnis-Analyse & Decoder", "\u{1F3AF} Job-Matching (Top 5 Profile)", "\u{1F3A4} Interview-Coach (Note 0\u2013100)", "\u{1F4CA} Excel-Generator mit Formeln", "\u{1F4FD}\uFE0F PowerPoint-Maker", "\u{1F4B0} KI-Gehaltsrechner Schweiz", "\u{1F4CB} Bewerbungs-Tracker", "\u270D\uFE0F LinkedIn-Post Generator", "\u2705 Alle 20+ Tools \xB7 Alle 4 Sprachen"],
              ["\u270D\uFE0F Unlimited applications", "\u{1F4BC} LinkedIn analysis", "\u{1F916} ATS simulation", "\u{1F4DC} Work reference analysis", "\u{1F3AF} Job matching (Top 5)", "\u{1F3A4} Interview coach", "\u{1F4CA} Excel generator", "\u{1F4FD}\uFE0F PowerPoint maker", "\u{1F4B0} Swiss salary calculator", "\u{1F4CB} Application tracker", "\u270D\uFE0F LinkedIn post generator", "\u2705 All 20+ tools \xB7 All 4 languages"],
              ["\u270D\uFE0F Documents illimit\xE9s", "\u{1F4BC} LinkedIn", "\u{1F916} ATS", "\u{1F4DC} Certificat", "\u{1F3AF} Matching", "\u{1F3A4} Coach", "\u{1F4CA} Excel", "\u{1F4FD}\uFE0F PowerPoint", "\u{1F4B0} Calculateur salaire", "\u{1F4CB} Tracker", "\u270D\uFE0F Posts LinkedIn", "\u2705 Tous les 20+ outils"],
              ["\u270D\uFE0F Documenti illimitati", "\u{1F4BC} LinkedIn", "\u{1F916} ATS", "\u{1F4DC} Certificato", "\u{1F3AF} Matching", "\u{1F3A4} Coach", "\u{1F4CA} Excel", "\u{1F4FD}\uFE0F PowerPoint", "\u{1F4B0} Calcolatore stipendio", "\u{1F4CB} Tracker", "\u270D\uFE0F Post LinkedIn", "\u2705 Tutti i 20+ strumenti"]
            ),
            btn: L("Jetzt Pro werden \u2192 CHF 19.90/Mo.", "Become Pro \u2192 CHF 19.90/mo", "Devenir Pro \u2192 CHF 19.90/mois", "Diventa Pro \u2192 CHF 19.90/mese"),
            btnS: "b-em"
          },
          {
            id: "family",
            name: L("Familie \u{1F468}\u200D\u{1F469}\u200D\u{1F467}", "Family \u{1F468}\u200D\u{1F469}\u200D\u{1F467}", "Famille \u{1F468}\u200D\u{1F469}\u200D\u{1F467}", "Famiglia \u{1F468}\u200D\u{1F469}\u200D\u{1F467}"),
            priceM: 34.9,
            priceY: 26.9,
            best: false,
            note: L(`${C.PRO_LIMIT} Generierungen/Mo. pro Person \xB7 alle Tools`, `${C.PRO_LIMIT} generations/mo per person \xB7 all tools`, `${C.PRO_LIMIT} g\xE9n\xE9rations/mois par personne \xB7 tous les outils`, `${C.PRO_LIMIT} generazioni/mese per persona \xB7 tutti gli strumenti`),
            yearNote: L("\u{1F525} CHF 26.90/Mo. bei Jahresabo \u2013 CHF 322.80/Jahr", "\u{1F525} CHF 26.90/mo annual \u2013 CHF 322.80/year", "\u{1F525} CHF 26.90/mois annuel", "\u{1F525} CHF 26.90/mese annuale"),
            list: L(
              ["\u2705 Alle 20+ Tools f\xFCr alle Mitglieder", "\u270D\uFE0F Unbegrenzte Bewerbungen", "\u{1F4BC} LinkedIn \u2192 Bewerbung", "\u{1F916} ATS-Check & Zeugnis-Analyse", "\u{1F3AF} Job-Matching & Interview-Coach", "\u{1F4B0} KI-Gehaltsrechner Schweiz", "\u{1F4CB} Bewerbungs-Tracker", "\u{1F468}\u200D\u{1F469}\u200D\u{1F467} Bis 4 Familienmitglieder", "\u{1F4A1} ~50% g\xFCnstiger als 4\xD7 Pro"],
              ["\u2705 All 20+ tools for all members", "\u270D\uFE0F Unlimited applications", "\u{1F4BC} LinkedIn \u2192 Application", "\u{1F916} ATS check & reference analysis", "\u{1F3AF} Job matching & interview coach", "\u{1F4B0} Swiss salary calculator", "\u{1F4CB} Application tracker", "\u{1F468}\u200D\u{1F469}\u200D\u{1F467} Up to 4 family members", "\u{1F4A1} ~50% cheaper than 4\xD7 Pro"],
              ["\u2705 Tous 20+ outils pour tous", "\u270D\uFE0F Documents illimit\xE9s", "\u{1F4BC} LinkedIn \u2192 Candidature", "\u{1F916} ATS & analyse certificat", "\u{1F3AF} Matching & coach entretien", "\u{1F4B0} Calculateur salaire suisse", "\u{1F4CB} Tracker candidatures", "\u{1F468}\u200D\u{1F469}\u200D\u{1F467} Jusqu'\xE0 4 membres", "\u{1F4A1} ~50% moins cher que 4\xD7 Pro"],
              ["\u2705 Tutti 20+ strumenti per tutti", "\u270D\uFE0F Documenti illimitati", "\u{1F4BC} LinkedIn \u2192 Candidatura", "\u{1F916} ATS & analisi certificato", "\u{1F3AF} Matching & coach colloquio", "\u{1F4B0} Calcolatore stipendio svizzero", "\u{1F4CB} Tracker candidature", "\u{1F468}\u200D\u{1F469}\u200D\u{1F467} Fino a 4 membri", "\u{1F4A1} ~50% pi\xF9 economico di 4\xD7 Pro"]
            ),
            btn: L("Familie starten \u2192 CHF 34.90/Mo.", "Start family \u2192 CHF 34.90/mo", "Famille \u2192 CHF 34.90/mois", "Famiglia \u2192 CHF 34.90/mese"),
            btnS: "b-em"
          },
          {
            id: "team",
            name: L("Team \u{1F3E2}", "Team \u{1F3E2}", "Team \u{1F3E2}", "Team \u{1F3E2}"),
            priceM: 59.9,
            priceY: 44.9,
            best: false,
            note: L(`Unbegrenzte Nutzung \xB7 ${C.PRO_LIMIT} Generierungen/Mo. pro Person`, `Unlimited usage \xB7 ${C.PRO_LIMIT} generations/mo per person`, `Usage illimit\xE9 \xB7 ${C.PRO_LIMIT} g\xE9n\xE9rations/mois par personne`, `Utilizzo illimitato \xB7 ${C.PRO_LIMIT} generazioni/mese per persona`),
            yearNote: L("\u{1F525} CHF 44.90/Mo. bei Jahresabo \u2013 CHF 538.80/Jahr", "\u{1F525} CHF 44.90/mo annual", "\u{1F525} CHF 44.90/mois annuel", "\u{1F525} CHF 44.90/mese annuale"),
            list: L(
              ["\u{1F3E2} Bis 10 Personen", "\u2705 Alle 20+ Tools f\xFCr alle", "\u270D\uFE0F Unbegrenzte Bewerbungen", "\u{1F4BC} LinkedIn \u2192 Bewerbung", "\u{1F916} ATS-Check & Zeugnis-Analyse", "\u{1F3AF} Job-Matching & Interview-Coach", "\u{1F4B0} KI-Gehaltsrechner Schweiz", "\u{1F4CB} Bewerbungs-Tracker", "\u{1F6E1}\uFE0F Priority Support"],
              ["\u{1F3E2} Up to 10 people", "\u2705 All 20+ tools for all", "\u270D\uFE0F Unlimited applications", "\u{1F4BC} LinkedIn \u2192 Application", "\u{1F916} ATS check & reference analysis", "\u{1F3AF} Job matching & interview coach", "\u{1F4B0} Swiss salary calculator", "\u{1F4CB} Application tracker", "\u{1F6E1}\uFE0F Priority support"],
              ["\u{1F3E2} Jusqu'\xE0 10 personnes", "\u2705 Tous 20+ outils pour tous", "\u270D\uFE0F Documents illimit\xE9s", "\u{1F4BC} LinkedIn \u2192 Candidature", "\u{1F916} ATS & certificats", "\u{1F3AF} Matching & coach", "\u{1F4B0} Calculateur salaire", "\u{1F4CB} Tracker", "\u{1F6E1}\uFE0F Support prioritaire"],
              ["\u{1F3E2} Fino a 10 persone", "\u2705 Tutti 20+ strumenti per tutti", "\u270D\uFE0F Documenti illimitati", "\u{1F4BC} LinkedIn \u2192 Candidatura", "\u{1F916} ATS & certificati", "\u{1F3AF} Matching & coach", "\u{1F4B0} Calcolatore stipendio", "\u{1F4CB} Tracker", "\u{1F6E1}\uFE0F Supporto prioritario"]
            ),
            btn: L("Team starten \u2192 CHF 59.90/Mo.", "Start team \u2192 CHF 59.90/mo", "D\xE9marrer \xE9quipe \u2192 CHF 59.90/mois", "Avvia team \u2192 CHF 59.90/mese"),
            btnS: "b-out"
          }
        ],
        valTitle: L("CHF 19.90 \u2013 lohnt sich das?", "CHF 19.90 \u2013 \xE7a vaut la peine?", "CHF 19.90 \u2013 vale la pena?", "CHF 19.90 \u2013 is it worth it?"),
        valPts: L(
          ["Ein Karriereberater kostet CHF 200\u2013400 / Sitzung", "Eine schlechte Bewerbung = verpasste Stelle", "Zeugnis nicht verstanden = falscher Job", "1 erfolgreiche Bewerbung = Abo hat sich gerechnet", "Ein schlechter ATS-Score = CV wird nie gelesen", "Stellify spart dir 3\u20135 Std. pro Bewerbung"],
          ["Un conseiller co\xFBte CHF 200\u2013400 / s\xE9ance", "Mauvais score ATS = votre CV n'est jamais lu", "Certificat mal compris = mauvais emploi", "1 mois de candidature r\xE9ussie rembourse tout"],
          ["Un consulente costa CHF 200\u2013400 / seduta", "Score ATS basso = il tuo CV non viene mai letto", "Certificato non capito = lavoro sbagliato", "1 mese di candidatura riuscita ripaga tutto"],
          ["A career advisor costs CHF 200\u2013400 / session", "Bad ATS score = your CV is never read", "Reference misunderstood = wrong job", "1 successful application month pays for everything"]
        )
      },
      payments: {
        label: L("Bezahle wie du willst", "Payez comme vous voulez", "Paga come vuoi", "Pay your way"),
        sub: L("Sicher via Stripe verarbeitet.", "Traitement s\xE9curis\xE9 via Stripe.", "Elaborazione sicura via Stripe.", "Securely processed via Stripe."),
        methods: ["\u{1F1E8}\u{1F1ED} Twint", "\u{1F4B3} Visa", "\u{1F4B3} Mastercard", "\u{1F4B3} Amex", "\u{1F17F}\uFE0F PayPal", "\u{1F34E} Apple Pay", "\u{1F916} Google Pay", "\u{1F3E6} SEPA", "\u{1F6D2} Klarna"]
      },
      cta: {
        title: L("Deine Karriere verdient", "Votre carri\xE8re m\xE9rite", "La tua carriera merita", "Your career deserves"),
        italic: L("deinen pers\xF6nlichen Copilot.", "votre copilote personnel.", "il tuo copilota personale.", "your personal copilot."),
        sub: L("Kostenlos starten. 20+ Tools. Schweizer Standard. Jederzeit k\xFCndbar.", "Commencer gratuitement. 20+ outils. Standard suisse. R\xE9siliable.", "Inizia gratis. 20+ strumenti. Standard svizzero. Cancellabile.", "Start free. 20+ tools. Swiss standard. Cancel anytime."),
        btn: L("Jetzt kostenlos starten \u2192", "Commencer gratuitement \u2192", "Inizia gratis ora \u2192", "Start for free now \u2192")
      },
      app: {
        title: L("Bewerbung erstellen", "Cr\xE9er votre candidature", "Crea la tua candidatura", "Create your application"),
        sub: L("Live-Streaming \xB7 Schweizer Format \xB7 60 Sekunden", "Streaming live \xB7 Format suisse \xB7 60 secondes", "Streaming live \xB7 Formato svizzero \xB7 60 secondi", "Live streaming \xB7 Swiss format \xB7 60 seconds"),
        steps: L(["Stelle", "Profil", "Dokument"], ["Poste", "Profil", "Document"], ["Posto", "Profilo", "Documento"], ["Position", "Profile", "Document"]),
        uLeft: (n) => L(`kostenlose Generierung${n !== 1 ? "en" : ""} \xFCbrig`, `g\xE9n\xE9ration${n !== 1 ? "s" : ""} restante${n !== 1 ? "s" : ""}`, `generazion${n !== 1 ? "i" : "e"} rimast${n !== 1 ? "e" : "a"}`, `free generation${n !== 1 ? "s" : ""} remaining`),
        proActive: L("\u2726 Pro aktiv \u2013 alle 20+ Tools freigeschaltet", "\u2726 Pro active \u2013 all 20+ tools unlocked", "\u2726 Pro actif \u2013 20+ outils disponibles", "\u2726 Pro attivo \u2013 20+ strumenti disponibili"),
        branches: L(
          ["Technologie / IT", "Finanzen / Versicherung", "Gesundheit / Pharma", "Marketing", "Handel", "Industrie", "Bildung / Forschung", "\xD6ffentlicher Dienst", "Tourismus", "Andere"],
          ["Technologie / IT", "Finance / Assurance", "Sant\xE9 / Pharma", "Marketing", "Commerce", "Industrie", "\xC9ducation", "Service public", "Tourisme", "Autre"],
          ["Tecnologia / IT", "Finanza / Assicurazione", "Salute / Pharma", "Marketing", "Commercio", "Industria", "Istruzione", "Servizio pubblico", "Turismo", "Altro"],
          ["Technology / IT", "Finance / Insurance", "Healthcare / Pharma", "Marketing", "Retail", "Industry", "Education", "Public sector", "Tourism", "Other"]
        ),
        back: L("\u2190 Zur\xFCck", "\u2190 Retour", "\u2190 Indietro", "\u2190 Back"),
        next: L("Weiter \u2192", "Suivant \u2192", "Avanti \u2192", "Next \u2192"),
        copy: L("Kopieren", "Copier", "Copia", "Copy"),
        copied: L("\u2713 Kopiert!", "\u2713 Copi\xE9!", "\u2713 Copiato!", "\u2713 Copied!"),
        edit: L("Bearbeiten", "Modifier", "Modifica", "Edit"),
        prev: L("Vorschau", "Aper\xE7u", "Anteprima", "Preview"),
        pdf: L("PDF", "PDF", "PDF", "PDF"),
        regen: L("Neu", "Nouveau", "Nuovo", "New"),
        stream: L("KI schreibt live\u2026", "L'IA r\xE9dige en direct\u2026", "L'IA scrive live\u2026", "AI writing live\u2026"),
        genBtn: L("\u2728 Jetzt erstellen", "\u2728 Cr\xE9er maintenant", "\u2728 Crea ora", "\u2728 Create now"),
        genLoad: L("Generiere\u2026", "G\xE9n\xE9ration\u2026", "Generando\u2026", "Generating\u2026"),
        goCoach: L("\u{1F3A4} Interview-Coach \u2192", "\u{1F3A4} Coach \u2192", "\u{1F3A4} Coach \u2192", "\u{1F3A4} Interview Coach \u2192"),
        goAts: L("\u{1F916} ATS-Check \u2192", "\u{1F916} ATS \u2192", "\u{1F916} ATS \u2192", "\u{1F916} ATS Check \u2192"),
        goCl: L("\u2705 Checkliste \u2192", "\u2705 Check-liste \u2192", "\u2705 Checklist \u2192", "\u2705 Checklist \u2192"),
        goLi: L("\u{1F4BC} LinkedIn \u2192", "\u{1F4BC} LinkedIn \u2192", "\u{1F4BC} LinkedIn \u2192", "\u{1F4BC} LinkedIn \u2192"),
        pw: {
          title: L("Noch mehr mit Pro \u2726", "Plus avec Pro \u2726", "Di pi\xF9 con Pro \u2726", "More with Pro \u2726"),
          sub: L("Du siehst wie gut es funktioniert.", "Vous voyez comment \xE7a marche.", "Vedi come funziona bene.", "You see how well it works."),
          feats: L(["LinkedIn", "ATS", "Zeugnis", "Coach", "Matching"], ["LinkedIn", "ATS", "Certificat", "Coach", "Matching"], ["LinkedIn", "ATS", "Certificato", "Coach", "Matching"], ["LinkedIn", "ATS", "Reference", "Coach", "Matching"]),
          btn: L(`Pro werden \u2013 CHF ${C.priceM}/Mo. \u2192`, `Devenir Pro \u2013 CHF ${C.priceM}/Mo. \u2192`, `Diventa Pro \u2013 CHF ${C.priceM}/Mo. \u2192`, `Become Pro \u2013 CHF ${C.priceM}/mo \u2192`),
          secure: L("Stripe \xB7 Twint \xB7 Jederzeit k\xFCndbar", "Stripe \xB7 Twint \xB7 R\xE9siliable", "Stripe \xB7 Twint \xB7 Cancellabile", "Stripe \xB7 Twint \xB7 Cancel anytime")
        }
      },
      email: {
        title: L("\u2709\uFE0F Direkt per E-Mail senden", "\u2709\uFE0F Envoi direct par e-mail", "\u2709\uFE0F Invio diretto per e-mail", "\u2709\uFE0F Send directly by email"),
        toLbl: L("E-Mail des Unternehmens *", "E-mail de l'entreprise *", "E-mail dell'azienda *", "Company email *"),
        subjLbl: L("Betreff", "Objet", "Oggetto", "Subject"),
        msgPh: L("Mit freundlichen Gr\xFCssen\u2026", "Cordiales salutations\u2026", "Cordiali saluti\u2026", "Kind regards\u2026"),
        btn: L("\u2709\uFE0F E-Mail \xF6ffnen", "\u2709\uFE0F Ouvrir e-mail", "\u2709\uFE0F Apri e-mail", "\u2709\uFE0F Open email"),
        note: L("\xD6ffnet deinen E-Mail-Client mit dem Anschreiben.", "Ouvre votre client avec la lettre.", "Apre il client con la lettera.", "Opens your email client with the cover letter.")
      },
      checklist: {
        title: L("\u2705 Bewerbungs-Checkliste", "\u2705 Check-liste candidature", "\u2705 Checklist candidatura", "\u2705 Application Checklist"),
        sub: L("Hake ab was erledigt ist.", "Cochez ce qui est fait.", "Spunta cosa \xE8 fatto.", "Tick off what's done."),
        score: (n, t) => L(`${n}/${t} erledigt`, `${n}/${t} effectu\xE9s`, `${n}/${t} completati`, `${n} of ${t} done`),
        perfect: L("\u{1F389} Vollst\xE4ndig! Bereit.", "\u{1F389} Complet! Pr\xEAt.", "\u{1F389} Completo! Pronto.", "\u{1F389} Complete! Ready."),
        items: L(
          [{ id: "m", t: "Motivationsschreiben", d: "Pers\xF6nlich, fehlerfrei, auf die Stelle zugeschnitten" }, { id: "cv", t: "Lebenslauf", d: "Aktuell, max. 2 Seiten, Schweizer Format" }, { id: "ats", t: "ATS-Check gemacht", d: "Score 70%+ \u2013 Lebenslauf kommt durch Recruiting-Software" }, { id: "foto", t: "Bewerbungsfoto", d: "Professionell, aktuell, neutraler Hintergrund" }, { id: "zeug", t: "Arbeitszeugnisse", d: "Letzte 2\u20133 Stellen, Original oder zertifiziert" }, { id: "dipl", t: "Diplome & Zertifikate", d: "Relevante Abschl\xFCsse" }, { id: "ref", t: "Referenzpersonen", d: "2\u20133 Personen, kontaktiert" }, { id: "mail", t: "Professionelle E-Mail", d: "vorname.nachname@..." }, { id: "spell", t: "Rechtschreibung gepr\xFCft", d: "Alles gelesen, null Fehler" }, { id: "fu", t: "Follow-up geplant", d: "Wann rufst du nach?" }],
          [{ id: "m", t: "Lettre de motivation", d: "Personnelle, sans fautes" }, { id: "cv", t: "Curriculum vitae", d: "\xC0 jour, max. 2 pages" }, { id: "ats", t: "ATS effectu\xE9", d: "Score 70%+ \u2013 CV passe les logiciels" }, { id: "foto", t: "Photo", d: "Professionnelle, fond neutre" }, { id: "zeug", t: "Certificats", d: "2\u20133 derniers postes" }, { id: "dipl", t: "Dipl\xF4mes", d: "Formations pertinentes" }, { id: "ref", t: "R\xE9f\xE9rences", d: "2\u20133 personnes contact\xE9es" }, { id: "mail", t: "E-mail pro", d: "prenom.nom@..." }, { id: "spell", t: "Orthographe", d: "Tout relu" }, { id: "fu", t: "Suivi planifi\xE9", d: "Quand relancez-vous?" }],
          [{ id: "m", t: "Lettera motivazione", d: "Personale, senza errori" }, { id: "cv", t: "Curriculum vitae", d: "Aggiornato, max. 2 pagine" }, { id: "ats", t: "ATS effettuato", d: "Score 70%+ \u2013 CV passa i software" }, { id: "foto", t: "Foto", d: "Professionale, sfondo neutro" }, { id: "zeug", t: "Certificati", d: "Ultimi 2\u20133 posti" }, { id: "dipl", t: "Diplomi", d: "Formazioni pertinenti" }, { id: "ref", t: "Referenze", d: "2\u20133 persone contattate" }, { id: "mail", t: "E-mail professionale", d: "nome.cognome@..." }, { id: "spell", t: "Ortografia", d: "Tutto riletto" }, { id: "fu", t: "Follow-up pianificato", d: "Quando ricontatti?" }],
          [{ id: "m", t: "Cover letter", d: "Personal, error-free, tailored" }, { id: "cv", t: "Curriculum vitae", d: "Current, max. 2 pages" }, { id: "ats", t: "ATS check done", d: "Score 70%+ \u2013 CV passes recruiting software" }, { id: "foto", t: "Application photo", d: "Professional, neutral background" }, { id: "zeug", t: "Work references", d: "Last 2\u20133 positions" }, { id: "dipl", t: "Diplomas", d: "Relevant qualifications" }, { id: "ref", t: "References", d: "2\u20133 people contacted" }, { id: "mail", t: "Professional email", d: "firstname.lastname@..." }, { id: "spell", t: "Spelling checked", d: "Everything re-read" }, { id: "fu", t: "Follow-up planned", d: "When will you call?" }]
        )
      },
      ats: {
        title: L("\u{1F916} ATS-Simulation", "\u{1F916} Simulation ATS", "\u{1F916} Simulazione ATS", "\u{1F916} ATS Simulation"),
        sub: L("Pr\xFCft ob dein Lebenslauf durch Recruiter-Software kommt.", "V\xE9rifie si votre CV passe les logiciels RH.", "Controlla se il tuo CV passa i software HR.", "Checks if your CV passes recruiter software."),
        cvLbl: L("Dein Lebenslauf (Text einf\xFCgen) *", "Votre CV (coller le texte) *", "Il tuo CV (incolla il testo) *", "Your CV (paste text) *"),
        cvPh: L("Lebenslauf-Text einf\xFCgen\u2026", "Collez votre CV\u2026", "Incolla il tuo CV\u2026", "Paste your CV text here\u2026"),
        jobLbl: L("Stellenbezeichnung *", "Intitul\xE9 du poste *", "Titolo del posto *", "Job title *"),
        jobDescLbl: L("Stellenbeschreibung (empfohlen)", "Description du poste (recommand\xE9)", "Descrizione (consigliato)", "Job description (recommended)"),
        jobDescPh: L("Inserat einf\xFCgen f\xFCr bessere Keyword-Analyse\u2026", "Collez l'annonce pour une meilleure analyse\u2026", "Incolla l'annuncio per un'analisi migliore\u2026", "Paste job ad for better keyword analysis\u2026"),
        btn: L("\u{1F916} ATS-Check starten", "\u{1F916} Lancer l'ATS", "\u{1F916} Avvia ATS", "\u{1F916} Run ATS check"),
        loading: L("Simuliere ATS\u2026", "Simulation ATS\u2026", "Simulando ATS\u2026", "Simulating ATS\u2026"),
        scoreLabel: L("ATS-Score", "Score ATS", "Score ATS", "ATS Score"),
        found: L("\u2713 Gefundene Keywords", "\u2713 Mots-cl\xE9s trouv\xE9s", "\u2713 Keywords trovati", "\u2713 Keywords found"),
        miss: L("\u2717 Fehlende Keywords", "\u2717 Mots-cl\xE9s manquants", "\u2717 Keywords mancanti", "\u2717 Missing keywords"),
        tips: L("\u{1F4A1} Optimierungstipps", "\u{1F4A1} Conseils d'optimisation", "\u{1F4A1} Consigli di ottimizzazione", "\u{1F4A1} Optimization tips"),
        prompt: (cv, job, desc) => L(
          `Du bist ein KI-Simulator f\xFCr ATS-Systeme (Applicant Tracking Software). Analysiere diesen Lebenslauf f\xFCr die Stelle "${job}" auf Keyword-Match und Vollst\xE4ndigkeit. Hinweis: Score ist KI-Sch\xE4tzung, kein offizieller Wert. Antworte NUR mit JSON:
{"score":82,"grade":"Gut","summary":"2 S\xE4tze zur Gesamtbewertung","keywords_found":["Python","Projektmanagement","Deutsch"],"keywords_missing":["Scrum","SQL","Englisch"],"tips":["Tipp 1 (konkret)","Tipp 2","Tipp 3"]}
Stelle: ${job}
Inserat: ${desc || "nicht angegeben"}
Lebenslauf:
${cv}`,
          `Tu es un syst\xE8me ATS pour RH suisses. Analyse ce CV pour le poste "${job}". R\xE9ponds UNIQUEMENT avec JSON:
{"score":82,"grade":"Bien","summary":"2 phrases","keywords_found":["Python"],"keywords_missing":["Scrum"],"tips":["Conseil 1","Conseil 2","Conseil 3"]}
Poste: ${job}
Annonce: ${desc || "non fournie"}
CV:
${cv}`,
          `Sei un sistema ATS per HR svizzeri. Analizza questo CV per il posto "${job}". Rispondi SOLO con JSON:
{"score":82,"grade":"Bene","summary":"2 frasi","keywords_found":["Python"],"keywords_missing":["Scrum"],"tips":["Consiglio 1","Consiglio 2","Consiglio 3"]}
Posto: ${job}
Annuncio: ${desc || "non fornito"}
CV:
${cv}`,
          `You are an ATS system for Swiss HR. Analyze this CV for the position "${job}". Reply ONLY with JSON:
{"score":82,"grade":"Good","summary":"2 sentences","keywords_found":["Python"],"keywords_missing":["Scrum"],"tips":["Tip 1","Tip 2","Tip 3"]}
Position: ${job}
Job ad: ${desc || "not provided"}
CV:
${cv}`
        )
      },
      zeugnis: {
        title: L("\u{1F4DC} Zeugnis-Analyse", "\u{1F4DC} Analyse certificat", "\u{1F4DC} Analisi certificato", "\u{1F4DC} Reference Analysis"),
        sub: L("Entschl\xFCssle den Schweizer Zeugnis-Code. Was steht wirklich drin?", "D\xE9chiffrez le code suisse. Que dit vraiment votre certificat?", "Decodifica il codice svizzero. Cosa dice davvero il tuo certificato?", "Decode the Swiss reference code. What does it really say?"),
        textLbl: L("Zeugnis-Text einf\xFCgen *", "Texte du certificat *", "Testo del certificato *", "Reference text *"),
        textPh: L("Ganzen Zeugnistext hier einf\xFCgen\u2026", "Collez ici le texte complet du certificat\u2026", "Incolla qui il testo completo del certificato\u2026", "Paste the full reference text here\u2026"),
        btn: L("\u{1F4DC} Zeugnis analysieren", "\u{1F4DC} Analyser le certificat", "\u{1F4DC} Analizza il certificato", "\u{1F4DC} Analyse reference"),
        loading: L("Analysiere\u2026", "Analyse\u2026", "Analizzando\u2026", "Analysing\u2026"),
        overall: L("Gesamtbewertung", "\xC9valuation globale", "Valutazione globale", "Overall assessment"),
        phrases: L("Entschl\xFCsselte Formulierungen", "Formulations d\xE9chiffr\xE9es", "Formulazioni decifrate", "Decoded phrases"),
        tips: L("\u{1F4A1} Was du tun solltest", "\u{1F4A1} Ce que vous devriez faire", "\u{1F4A1} Cosa dovresti fare", "\u{1F4A1} What you should do"),
        prompt: (text) => L(
          `Du bist Schweizer HR-Experte und kennst den vollst\xE4ndigen Zeugnis-Code des Schweizerischen Obligationenrechts (OR). Analysiere dieses Zeugnis und entschl\xFCssle jede Formulierung gem\xE4ss dem offiziellen Schweizer Zeugnis-Decoder ("stets zu unserer vollsten Zufriedenheit" = sehr gut, "zu unserer vollsten Zufriedenheit" = gut, "zu unserer Zufriedenheit" = befriedigend, "im Grossen und Ganzen" = gen\xFCgend, "war bem\xFCht" = ungen\xFCgend). Antworte NUR mit JSON:
{"grade":"A","grade_text":"Sehr gut","overall":"2-3 S\xE4tze zur Gesamtbewertung","phrases":[{"original":"hat die ihm \xFCbertragenen Aufgaben stets zu unserer vollsten Zufriedenheit erledigt","decoded":"Bestnote \u2013 entspricht einer 6","rating":"A"},{"original":"war bem\xFCht","decoded":"Schwache Formulierung \u2013 bedeutet mangelhafte Leistung","rating":"D"}],"tips":["Tipp 1","Tipp 2"]}
Zeugnis:
${text}`,
          `Tu es expert en certificats de travail suisses. Analyse ce certificat. R\xE9ponds UNIQUEMENT avec JSON:
{"grade":"A","grade_text":"Tr\xE8s bien","overall":"2-3 phrases","phrases":[{"original":"phrase originale","decoded":"sens r\xE9el","rating":"A"}],"tips":["Conseil"]}
Certificat:
${text}`,
          `Sei esperto di certificati di lavoro svizzeri. Analizza questo certificato. Rispondi SOLO con JSON:
{"grade":"A","grade_text":"Molto bene","overall":"2-3 frasi","phrases":[{"original":"frase originale","decoded":"significato reale","rating":"A"}],"tips":["Consiglio"]}
Certificato:
${text}`,
          `You are an expert in Swiss work references. Analyse this reference. Reply ONLY with JSON:
{"grade":"A","grade_text":"Excellent","overall":"2-3 sentences","phrases":[{"original":"original phrase","decoded":"real meaning","rating":"A"}],"tips":["Tip"]}
Reference:
${text}`
        )
      },
      jobmatch: {
        title: L("\u{1F3AF} Job-Matching", "\u{1F3AF} Matching emploi", "\u{1F3AF} Job Matching", "\u{1F3AF} Job Matching"),
        sub: L("Die KI analysiert dein Profil und findet die Top 5 passenden Stellen.", "L'IA analyse votre profil et trouve les 5 postes les mieux adapt\xE9s.", "L'IA analizza il tuo profilo e trova i 5 posti pi\xF9 adatti.", "AI analyzes your profile and finds your top 5 matching positions."),
        skillsLbl: L("Skills & Erfahrung *", "Comp\xE9tences & exp\xE9rience *", "Competenze & esperienza *", "Skills & experience *"),
        skillsPh: L("z.B. 5 Jahre Projektmanagement, Python, Teamf\xFChrung, Finanzen\u2026", "ex. 5 ans gestion de projet, Python, management\u2026", "es. 5 anni gestione progetti, Python, management\u2026", "e.g. 5 years project management, Python, team leadership, finance\u2026"),
        eduLbl: L("Ausbildung", "Formation", "Formazione", "Education"),
        eduPh: L("z.B. BSc Wirtschaftsinformatik, Uni Bern", "ex. BSc Informatique, Uni Berne", "es. BSc Informatica, Uni Berna", "e.g. BSc Business Informatics, Uni Berne"),
        prefLbl: L("Pr\xE4ferenzen (optional)", "Pr\xE9f\xE9rences (optionnel)", "Preferenze (opzionale)", "Preferences (optional)"),
        prefPh: L("z.B. Homeoffice, Startup, Z\xFCrich, 100%\u2026", "ex. T\xE9l\xE9travail, startup, Zurich\u2026", "es. Telelavoro, startup, Zurigo\u2026", "e.g. Home office, startup, Zurich, 100%\u2026"),
        btn: L("\u{1F3AF} Matching starten", "\u{1F3AF} Lancer le matching", "\u{1F3AF} Avvia matching", "\u{1F3AF} Start matching"),
        loading: L("Analysiere Profil\u2026", "Analyse du profil\u2026", "Analizzando profilo\u2026", "Analysing profile\u2026"),
        fitScore: L("Fit-Score", "Score d'ad\xE9quation", "Score compatibilit\xE0", "Fit score"),
        applyBtn: L("Bewerben \u2192", "Postuler \u2192", "Candidarsi \u2192", "Apply \u2192"),
        prompt: (skills, edu, pref) => L(
          `Du bist ein Karriereberater f\xFCr den Schweizer Arbeitsmarkt. Analysiere dieses Profil und finde die Top 5 passenden Stellenprofile. Antworte NUR mit JSON:
{"matches":[{"rank":1,"title":"Senior Project Manager","fit":91,"industry":"Technologie","description":"Kurze Beschreibung warum dieser Job passt (2 S\xE4tze)","skills_match":["Projektmanagement","Python"],"salary":"CHF 110\u2013140k"},{"rank":2,"title":"...","fit":84,...}]}
Skills & Erfahrung: ${skills}
Ausbildung: ${edu || "nicht angegeben"}
Pr\xE4ferenzen: ${pref || "keine"}`,
          `Tu es conseiller carri\xE8re pour le march\xE9 suisse. Analyse ce profil et trouve les 5 postes id\xE9aux. R\xE9ponds UNIQUEMENT avec JSON:
{"matches":[{"rank":1,"title":"Chef de projet senior","fit":91,"industry":"Technologie","description":"Pourquoi ce poste correspond (2 phrases)","skills_match":["Gestion de projet"],"salary":"CHF 110\u2013140k"}]}
Comp\xE9tences: ${skills}
Formation: ${edu || "n/a"}
Pr\xE9f\xE9rences: ${pref || "aucune"}`,
          `Sei consulente carriera per il mercato svizzero. Analizza questo profilo e trova i 5 posti ideali. Rispondi SOLO con JSON:
{"matches":[{"rank":1,"title":"Senior Project Manager","fit":91,"industry":"Tecnologia","description":"Perch\xE9 questo lavoro corrisponde (2 frasi)","skills_match":["Gestione progetti"],"salary":"CHF 110\u2013140k"}]}
Skills: ${skills}
Formazione: ${edu || "n/d"}
Preferenze: ${pref || "nessuna"}`,
          `You are a career advisor for the Swiss job market. Analyse this profile and find the top 5 matching positions. Reply ONLY with JSON:
{"matches":[{"rank":1,"title":"Senior Project Manager","fit":91,"industry":"Technology","description":"Why this job fits (2 sentences)","skills_match":["Project management"],"salary":"CHF 110\u2013140k"}]}
Skills & experience: ${skills}
Education: ${edu || "not provided"}
Preferences: ${pref || "none"}`
        )
      },
      coach: {
        title: L("\u{1F3A4} Interview-Coach", "\u{1F3A4} Coach d'entretien", "\u{1F3A4} Coach colloquio", "\u{1F3A4} Interview Coach"),
        sub: L("KI simuliert 5 echte Fragen, bewertet Antworten, gibt Note 0\u2013100.", "L'IA simule 5 vraies questions, \xE9value et note de 0 \xE0 100.", "L'IA simula 5 domande reali, valuta e d\xE0 voto 0\u2013100.", "AI simulates 5 real questions, evaluates answers, gives score 0\u2013100."),
        ready: L("Bereit f\xFCr dein Interview?", "Pr\xEAt pour votre entretien?", "Pronto per il colloquio?", "Ready for your interview?"),
        readySub: L("5 Fragen \xB7 KI-Bewertung \xB7 Konkrete Tipps", "5 questions \xB7 \xC9valuation \xB7 Conseils", "5 domande \xB7 Valutazione \xB7 Consigli", "5 questions \xB7 AI evaluation \xB7 Concrete tips"),
        noJob: L("Bitte zuerst Stelle angeben.", "Veuillez d'abord entrer un poste.", "Inserisci prima un posto.", "Please enter a position first."),
        start: L("Interview starten \u2192", "D\xE9marrer \u2192", "Inizia \u2192", "Start interview \u2192"),
        prep: L("Bereite vor\u2026", "Pr\xE9paration\u2026", "Preparando\u2026", "Preparing\u2026"),
        qOf: (n) => L(`Frage ${n}/5`, `Question ${n}/5`, `Domanda ${n}/5`, `Question ${n}/5`),
        ph: L("Deine Antwort\u2026", "Votre r\xE9ponse\u2026", "La tua risposta\u2026", "Your answer\u2026"),
        send: L("Senden", "Envoyer", "Invia", "Send"),
        newIC: L("\u{1F504} Neues Interview", "\u{1F504} Nouvel entretien", "\u{1F504} Nuovo colloquio", "\u{1F504} New interview"),
        result: L("Dein Ergebnis", "Votre r\xE9sultat", "Il tuo risultato", "Your result"),
        strengths: L("St\xE4rken:", "Points forts:", "Punti di forza:", "Strengths:"),
        tip: L("Tipp:", "Conseil:", "Consiglio:", "Tip:"),
        locked: L("Pro-Feature", "Pro", "Pro", "Pro Feature"),
        lockedSub: L("Der Interview-Coach ist in Pro enthalten.", "Le coach est inclus dans Pro.", "Il coach \xE8 incluso in Pro.", "The interview coach is included in Pro."),
        icStart: (j) => L(
          `Du bist HR-Interviewer in der Schweiz f\xFCr "${j.title || "diese Stelle"}" bei "${j.company || "diesem Unternehmen"}". Stelle deine erste Interviewfrage auf Schweizer Hochdeutsch. Nur die Frage.`,
          `Tu es recruteur en Suisse pour "${j.title || "ce poste"}" chez "${j.company || "cette entreprise"}". Pose ta premi\xE8re question d'entretien en fran\xE7ais. Seulement la question.`,
          `Sei recruiter svizzero per "${j.title || "questo posto"}" presso "${j.company || "questa azienda"}". Fai la tua prima domanda di colloquio in italiano. Solo la domanda.`,
          `You are an HR interviewer in Switzerland for "${j.title || "this position"}" at "${j.company || "this company"}". Ask your first interview question in English. Only the question.`
        ),
        icNext: (j) => L(
          `Interviewer f\xFCr "${j.title || "diese Stelle"}": Reagiere 1 Satz, dann neue tiefgehende Frage. Schweizer Hochdeutsch.`,
          `Recruteur pour "${j.title || "ce poste"}": R\xE9agis en 1 phrase, puis nouvelle question approfondie. En fran\xE7ais.`,
          `Recruiter per "${j.title || "questo posto"}": Reagisci in 1 frase, poi nuova domanda approfondita. In italiano.`,
          `Interviewer for "${j.title || "this role"}": React in 1 sentence, then new in-depth question. In English.`
        ),
        icScore: (h) => L(
          `Analysiere dieses Interview. NUR JSON: {"score":75,"feedback":"2-3 S\xE4tze","staerken":["S1","S2"],"verbesserung":"1 Tipp"}
${h}`,
          `Analyse cet entretien. UNIQUEMENT JSON: {"score":75,"feedback":"2-3 phrases","staerken":["P1"],"verbesserung":"1 conseil"}
${h}`,
          `Analizza questo colloquio. SOLO JSON: {"score":75,"feedback":"2-3 frasi","staerken":["P1"],"verbesserung":"1 consiglio"}
${h}`,
          `Analyse this interview. ONLY JSON: {"score":75,"feedback":"2-3 sentences","staerken":["S1"],"verbesserung":"1 tip"}
${h}`
        ),
        icDone: (s) => L(`\u{1F3AF} Fertig! Dein Score: ${s}/100`, `\u{1F3AF} Termin\xE9! Score: ${s}/100`, `\u{1F3AF} Finito! Score: ${s}/100`, `\u{1F3AF} Done! Score: ${s}/100`)
      },
      linkedin: {
        title: L("\u{1F4BC} LinkedIn Analyse & Optimierung", "\u{1F4BC} LinkedIn Analyse & Optimisation", "\u{1F4BC} LinkedIn Analisi & Ottimizzazione", "\u{1F4BC} LinkedIn Analysis & Optimization"),
        sub: L("Die KI macht dein Profil f\xFCr Recruiter unwiderstehlich.", "L'IA rend votre profil irr\xE9sistible pour les recruteurs.", "L'IA rende il tuo profilo irresistibile per i recruiter.", "The AI makes your profile irresistible to recruiters."),
        analyzeLabel: L("LinkedIn-Profil Text (About + Erfahrung)", "Texte profil LinkedIn (About + Exp\xE9rience)", "Testo profilo LinkedIn (About + Esperienza)", "LinkedIn profile text (About + Experience)"),
        analyzePh: L("F\xFCge deinen aktuellen LinkedIn-Text ein oder beschreibe dein Profil\u2026", "Collez votre texte LinkedIn ou d\xE9crivez votre profil\u2026", "Incolla il tuo testo LinkedIn o descrivi il tuo profilo\u2026", "Paste your current LinkedIn text or describe your profile\u2026"),
        roleLbl: L("Zielrolle", "Poste cible", "Ruolo target", "Target role"),
        rolePh: L("z.B. Senior Product Manager", "ex. Chef de produit senior", "es. Senior Product Manager", "e.g. Senior Product Manager"),
        achLbl: L("Top 3 Erfolge", "3 meilleures r\xE9alisations", "Top 3 successi", "Top 3 achievements"),
        achPh: L("z.B. Team von 10 gef\xFChrt\u2026", "ex. \xC9quipe de 10 g\xE9r\xE9e\u2026", "es. Team di 10 gestito\u2026", "e.g. Led team of 10\u2026"),
        btn: L("\u{1F4BC} LinkedIn optimieren \u2192", "\u{1F4BC} Optimiser \u2192", "\u{1F4BC} Ottimizzare \u2192", "\u{1F4BC} Optimize \u2192"),
        load: L("Optimiere\u2026", "Optimisation\u2026", "Ottimizzando\u2026", "Optimizing\u2026"),
        resH: L("\u{1F680} Optimierter Headline", "\u{1F680} Titre optimis\xE9", "\u{1F680} Headline ottimizzato", "\u{1F680} Optimized headline"),
        resA: L("\u{1F4DD} About-Sektion", "\u{1F4DD} Section About", "\u{1F4DD} Sezione About", "\u{1F4DD} About section"),
        resS: L("\u{1F3F7}\uFE0F Empfohlene Skills", "\u{1F3F7}\uFE0F Comp\xE9tences", "\u{1F3F7}\uFE0F Skills consigliati", "\u{1F3F7}\uFE0F Recommended skills"),
        copy: L("Kopieren", "Copier", "Copia", "Copy"),
        prompt: (d) => `You are a LinkedIn career coach for the Swiss job market. Optimize this profile. Reply ONLY with valid JSON. Write the headline and about section in ${L("Schweizer Hochdeutsch (kein \xDF)", "fran\xE7ais", "italiano", "English")}.
Current text: ${d.text || "not provided"}
Target role: ${d.role || "not provided"}
Achievements: ${d.ach || "not provided"}
Current job: ${d.beruf || "not provided"} | Experience: ${d.erfahrung || 0} years | Skills: ${d.skills || "not provided"}
Required JSON: {"headline":"max 220 chars","about":"3-4 paragraphs first person ~250 words","skills":["Skill1","Skill2","Skill3","Skill4","Skill5","Skill6","Skill7","Skill8","Skill9","Skill10"]}`
      },
      modal: {
        title: `${C.name} Pro`,
        sub: L("Alle 20+ KI-Tools freischalten.", "D\xE9bloquer les 20+ outils IA.", "Sblocca i 20+ strumenti IA.", "Unlock all 20+ AI tools."),
        feats: L(
          [["\u270D\uFE0F", "Bewerbungen"], ["\u{1F916}", "ATS"], ["\u{1F4DC}", "Zeugnis"], ["\u{1F3AF}", "Matching"], ["\u{1F4BC}", "LinkedIn"], ["\u{1F3A4}", "Coach"]],
          [["\u270D\uFE0F", "Candidatures"], ["\u{1F916}", "ATS"], ["\u{1F4DC}", "Certificat"], ["\u{1F3AF}", "Matching"], ["\u{1F4BC}", "LinkedIn"], ["\u{1F3A4}", "Coach"]],
          [["\u270D\uFE0F", "Candidature"], ["\u{1F916}", "ATS"], ["\u{1F4DC}", "Certificato"], ["\u{1F3AF}", "Matching"], ["\u{1F4BC}", "LinkedIn"], ["\u{1F3A4}", "Coach"]],
          [["\u270D\uFE0F", "Applications"], ["\u{1F916}", "ATS"], ["\u{1F4DC}", "Reference"], ["\u{1F3AF}", "Matching"], ["\u{1F4BC}", "LinkedIn"], ["\u{1F3A4}", "Coach"]]
        ),
        btn: L("Jetzt Pro werden \u2192", "Devenir Pro \u2192", "Diventa Pro \u2192", "Become Pro \u2192"),
        close: L("Schliessen", "Fermer", "Chiudi", "Close"),
        note: L("Stripe \xB7 Twint \xB7 Kreditkarte \xB7 PayPal \xB7 Apple Pay \xB7 Jederzeit k\xFCndbar", "Stripe \xB7 Twint \xB7 CB \xB7 PayPal \xB7 Apple Pay \xB7 R\xE9siliable", "Stripe \xB7 Twint \xB7 CC \xB7 PayPal \xB7 Apple Pay \xB7 Cancellabile", "Stripe \xB7 Twint \xB7 Credit card \xB7 PayPal \xB7 Apple Pay \xB7 Cancel anytime")
      },
      legal: {
        agb: L("AGB", "CGV", "CGC", "T&C"),
        privacy: L("Datenschutz", "Confidentialit\xE9", "Privacy", "Privacy"),
        imprint: L("Impressum", "Mentions l\xE9gales", "Note legali", "Imprint"),
        product: L("Produkt", "Produit", "Prodotto", "Product"),
        legalL: L("Rechtliches", "L\xE9gal", "Note legali", "Legal"),
        tagline: L(`${C.tagline} \u2013 Schweizer Standard.`, `${C.tagline} \u2013 Standard suisse.`, `${C.tagline} \u2013 Standard svizzero.`, `${C.tagline} \u2013 Swiss standard.`)
      },
      motivPrompt: (j, p) => L(
        `Erfahrener Karrierecoach: Professionelles Motivationsschreiben Schweizer Hochdeutsch (kein \xDF).
Stelle: ${j.title} bei ${j.company} | Branche: ${j.branch || "k.A."} | Inserat: ${j.desc || "k.A."}
${p.name} | ${p.beruf} | ${p.erfahrung} J. | Skills: ${p.skills} | Sprachen: ${p.sprachen} | Ausbildung: ${p.ausbildung}
~350 W\xF6rter, direkt mit Brief beginnen (Ort/Datum/Anschrift).`,
        `Coach carri\xE8re: Lettre de motivation fran\xE7aise pour le march\xE9 suisse.
Poste: ${j.title} chez ${j.company} | ${p.name} | ${p.beruf} | ${p.erfahrung} ans | ${p.skills}
~350 mots, commencer directement par la lettre.`,
        `Coach carriera: Lettera di motivazione italiana per il mercato svizzero.
Posto: ${j.title} presso ${j.company} | ${p.name} | ${p.beruf} | ${p.erfahrung} anni | ${p.skills}
~350 parole, iniziare direttamente con la lettera.`,
        `Career coach: Professional English cover letter for Swiss job market.
Position: ${j.title} at ${j.company} | ${p.name} | ${p.beruf} | ${p.erfahrung} years | ${p.skills}
~350 words, start directly with the letter.`
      ),
      cvPrompt: (j, p) => L(
        `Erfahrener Karrierecoach: Vollst\xE4ndiger Lebenslauf Schweizer Hochdeutsch im CH-Format.
${p.name} | ${p.beruf} | ${p.erfahrung} J. | ${p.skills} | ${p.sprachen} | ${p.ausbildung} | Ziel: ${j.title} bei ${j.company}
Alle Sektionen: Pers\xF6nliche Angaben, Berufsprofil, Berufserfahrung, Ausbildung, Skills, Sprachen.`,
        `Coach carri\xE8re: CV complet fran\xE7ais format suisse. ${p.name} | ${p.beruf} | ${p.erfahrung} ans | ${p.skills} | Poste: ${j.title} chez ${j.company}. Toutes sections.`,
        `Coach carriera: CV completo italiano formato svizzero. ${p.name} | ${p.beruf} | ${p.erfahrung} anni | ${p.skills} | Posto: ${j.title} presso ${j.company}. Tutte le sezioni.`,
        `Career coach: Complete English CV in Swiss format. ${p.name} | ${p.beruf} | ${p.erfahrung} years | ${p.skills} | Target: ${j.title} at ${j.company}. All sections.`
      )
    };
  };
  var GENERIC_TOOLS = [
    // ── KARRIERE ──
    {
      id: "gehalt",
      ico: "\u{1F4B0}",
      color: "#059669",
      cat: "karriere",
      t: { de: "Gehaltsverhandlung", en: "Salary Negotiation", fr: "N\xE9gociation salariale", it: "Negoziazione stipendio" },
      sub: { de: "KI simuliert das Gespr\xE4ch & gibt dir starke Argumente.", en: "AI simulates the conversation & gives you strong arguments.", fr: "L'IA simule la conversation & vous donne des arguments solides.", it: "L'IA simula la conversazione & ti d\xE0 argomenti solidi." },
      inputs: [
        { k: "job", lbl: { de: "Deine Stelle", en: "Your position", fr: "Votre poste", it: "Il tuo posto" }, ph: { de: "z.B. Softwareentwickler", en: "e.g. Software Engineer", fr: "ex. Ing\xE9nieur logiciel", it: "es. Ingegnere software" }, req: true },
        { k: "curr", lbl: { de: "Aktuelles Gehalt (CHF)", en: "Current salary (CHF)", fr: "Salaire actuel (CHF)", it: "Stipendio attuale (CHF)" }, ph: { de: "z.B. 95'000", en: "e.g. 95,000", fr: "ex. 95'000", it: "es. 95'000" }, req: true },
        { k: "target", lbl: { de: "Zielgehalt (CHF)", en: "Target salary (CHF)", fr: "Salaire cible (CHF)", it: "Stipendio target (CHF)" }, ph: { de: "z.B. 115'000", en: "e.g. 115,000", fr: "ex. 115'000", it: "es. 115'000" }, req: true },
        { k: "exp", lbl: { de: "Berufserfahrung & St\xE4rken", en: "Experience & strengths", fr: "Exp\xE9rience & points forts", it: "Esperienza & punti di forza" }, ph: { de: "z.B. 6 Jahre, 3 Mio. Umsatz generiert, Team geleitet", en: "e.g. 6 years, \u20AC3M revenue generated, led team", fr: "ex. 6 ans, 3M CHF CA, gestion d'\xE9quipe", it: "es. 6 anni, 3M CHF fatturato, team guidato" }, type: "textarea", req: false }
      ],
      prompt: (v, l) => ({
        de: `Du bist Karrierecoach in der Schweiz. Erstelle einen vollst\xE4ndigen Gehaltsverhandlungs-Leitfaden auf Schweizer Hochdeutsch (kein \xDF).
Stelle: ${v.job} | Aktuell: CHF ${v.curr} | Ziel: CHF ${v.target} | St\xE4rken: ${v.exp || "nicht angegeben"}

Erstelle:
1. Einstiegssatz f\xFCr die Verhandlung
2. 5 starke Argumente mit konkreten Formulierungen
3. Antwort auf "Das Budget ist leider voll"
4. Antwort auf "Wir m\xFCssen das intern besprechen"
5. Abschlusssatz
6. Do's & Don'ts`,
        en: `You are a career coach in Switzerland. Create a complete salary negotiation guide in English.
Position: ${v.job} | Current: CHF ${v.curr} | Target: CHF ${v.target} | Strengths: ${v.exp || "not provided"}

Create:
1. Opening sentence for the negotiation
2. 5 strong arguments with concrete phrases
3. Response to "The budget is unfortunately full"
4. Response to "We need to discuss this internally"
5. Closing sentence
6. Do's & Don'ts`,
        fr: `Tu es coach carri\xE8re en Suisse. Cr\xE9e un guide complet de n\xE9gociation salariale en fran\xE7ais.
Poste: ${v.job} | Actuel: CHF ${v.curr} | Cible: CHF ${v.target} | Points forts: ${v.exp || "non fourni"}

Cr\xE9e:
1. Phrase d'ouverture
2. 5 arguments forts avec formulations concr\xE8tes
3. R\xE9ponse \xE0 "Le budget est malheureusement plein"
4. R\xE9ponse \xE0 "Nous devons en discuter en interne"
5. Phrase de cl\xF4ture
6. \xC0 faire & \xC0 \xE9viter`,
        it: `Sei un coach carriera in Svizzera. Crea una guida completa alla negoziazione dello stipendio in italiano.
Posto: ${v.job} | Attuale: CHF ${v.curr} | Target: CHF ${v.target} | Punti di forza: ${v.exp || "non fornito"}

Crea:
1. Frase di apertura
2. 5 argomenti forti con formulazioni concrete
3. Risposta a "Purtroppo il budget \xE8 esaurito"
4. Risposta a "Dobbiamo discuterne internamente"
5. Frase di chiusura
6. Da fare & Da evitare`
      })[l]
    },
    {
      id: "networking",
      ico: "\u{1F91D}",
      color: "#0a66c2",
      cat: "karriere",
      t: { de: "Networking-Nachricht", en: "Networking Message", fr: "Message de networking", it: "Messaggio di networking" },
      sub: { de: "Perfekte LinkedIn-Kontaktanfrage oder Cold-E-Mail an Recruiter.", en: "Perfect LinkedIn connection request or cold email to recruiters.", fr: "Demande de connexion LinkedIn parfaite ou e-mail \xE0 recruteurs.", it: "Perfetta richiesta di connessione LinkedIn o e-mail a recruiter." },
      inputs: [
        { k: "type", lbl: { de: "Nachrichtentyp", en: "Message type", fr: "Type de message", it: "Tipo di messaggio" }, type: "select", opts: { de: ["LinkedIn-Kontaktanfrage", "Cold-E-Mail an Recruiter", "Nachfassnachricht nach Bewerbung", "Dankes-E-Mail nach Interview"], en: ["LinkedIn connection request", "Cold email to recruiter", "Follow-up after application", "Thank you email after interview"], fr: ["Demande LinkedIn", "E-mail \xE0 recruteur", "Suivi apr\xE8s candidature", "E-mail de remerciement"], it: ["Richiesta LinkedIn", "E-mail a recruiter", "Follow-up dopo candidatura", "E-mail di ringraziamento"] }, req: true },
        { k: "empf", lbl: { de: "Empf\xE4nger (Name / Firma / Rolle)", en: "Recipient (name / company / role)", fr: "Destinataire (nom / entreprise / r\xF4le)", it: "Destinatario (nome / azienda / ruolo)" }, ph: { de: "z.B. Sarah M\xFCller, HR-Leiterin, Google Z\xFCrich", en: "e.g. Sarah Miller, HR Lead, Google Zurich", fr: "ex. Sarah M\xFCller, DRH, Google Zurich", it: "es. Sarah M\xFCller, HR Lead, Google Zurigo" }, req: true },
        { k: "ich", lbl: { de: "Wer bist du?", en: "Who are you?", fr: "Qui \xEAtes-vous?", it: "Chi sei?" }, ph: { de: "z.B. Softwareentwickler, 5 Jahre, Python-Spezialist", en: "e.g. Software engineer, 5 years, Python specialist", fr: "ex. D\xE9veloppeur, 5 ans, sp\xE9cialiste Python", it: "es. Sviluppatore, 5 anni, specialista Python" }, req: true },
        { k: "ziel", lbl: { de: "Was willst du erreichen?", en: "What do you want to achieve?", fr: "Que souhaitez-vous accomplir?", it: "Cosa vuoi ottenere?" }, ph: { de: "z.B. Bewerbungsgespr\xE4ch, Informationsgespr\xE4ch, Job-Angebot", en: "e.g. Job interview, informational interview, job offer", fr: "ex. Entretien d'embauche, caf\xE9 virtuel", it: "es. Colloquio di lavoro, chiacchierata informativa" }, req: false }
      ],
      prompt: (v, l) => ({
        de: `Erfahrener Karrierecoach Schweiz: Schreibe eine kurze, professionelle ${v.type} auf Schweizer Hochdeutsch (kein \xDF). An: ${v.empf}. Von: ${v.ich}. Ziel: ${v.ziel || "Kontakt kn\xFCpfen"}. Authentisch, nicht spammy. Max. 150 W\xF6rter.`,
        en: `Career coach Switzerland: Write a short, professional ${v.type} in English. To: ${v.empf}. From: ${v.ich}. Goal: ${v.ziel || "connect"}. Authentic, not spammy. Max 150 words.`,
        fr: `Coach carri\xE8re Suisse: \xC9cris un(e) ${v.type} court(e) et professionnel(le) en fran\xE7ais. \xC0: ${v.empf}. De: ${v.ich}. Objectif: ${v.ziel || "prendre contact"}. Authentique. Max 150 mots.`,
        it: `Coach carriera Svizzera: Scrivi un/una ${v.type} breve e professionale in italiano. A: ${v.empf}. Da: ${v.ich}. Obiettivo: ${v.ziel || "connettersi"}. Autentico. Max 150 parole.`
      })[l]
    },
    {
      id: "kuendigung",
      ico: "\u{1F4E4}",
      color: "#dc2626",
      cat: "karriere",
      t: { de: "K\xFCndigung schreiben", en: "Resignation Letter", fr: "Lettre de d\xE9mission", it: "Lettera di dimissioni" },
      sub: { de: "Entwurf im Schweizer Format \u2013 bitte K\xFCndigungsfristen im Arbeitsvertrag pr\xFCfen.", en: "Draft in Swiss format \u2013 please verify notice periods in your employment contract.", fr: "Brouillon au format suisse \u2013 v\xE9rifiez les d\xE9lais dans votre contrat de travail.", it: "Bozza in formato svizzero \u2013 verifica i termini nel contratto di lavoro." },
      inputs: [
        { k: "name", lbl: { de: "Dein Name", en: "Your name", fr: "Votre nom", it: "Il tuo nome" }, ph: { de: "Max Mustermann", en: "John Doe", fr: "Jean Dupont", it: "Mario Rossi" }, req: true },
        { k: "firma", lbl: { de: "Arbeitgeber / Firma", en: "Employer / Company", fr: "Employeur / Entreprise", it: "Datore di lavoro / Azienda" }, ph: { de: "Musterfirma AG, Z\xFCrich", en: "Example Corp, Zurich", fr: "Exemple SA, Zurich", it: "Esempio SA, Zurigo" }, req: true },
        { k: "datum", lbl: { de: "Letzter Arbeitstag (gew\xFCnscht)", en: "Desired last day of work", fr: "Dernier jour de travail souhait\xE9", it: "Ultimo giorno di lavoro desiderato" }, ph: { de: "z.B. 31. M\xE4rz 2026", en: "e.g. March 31, 2026", fr: "ex. 31 mars 2026", it: "es. 31 marzo 2026" }, req: true },
        { k: "grund", lbl: { de: "Grund (optional \u2013 erscheint NICHT im Brief)", en: "Reason (optional \u2013 will NOT appear in letter)", fr: "Raison (optionnel \u2013 n'appara\xEEt PAS dans la lettre)", it: "Motivo (opzionale \u2013 NON appare nella lettera)" }, ph: { de: "z.B. Neuer Job, bessere Perspektiven", en: "e.g. New job, better opportunities", fr: "ex. Nouvel emploi", it: "es. Nuovo lavoro" }, req: false }
      ],
      prompt: (v, l) => ({
        de: `Schreibe eine professionelle K\xFCndigung auf Schweizer Hochdeutsch (kein \xDF) gem\xE4ss Schweizer Obligationenrecht (OR Art. 335). Neutrale, sachliche Formulierung. Dank f\xFCr die Zusammenarbeit. Kein Grund angeben.
Name: ${v.name} | Firma: ${v.firma} | Letzter Arbeitstag: ${v.datum}
NICHT erw\xE4hnen: ${v.grund || "\u2013"}. Vollst\xE4ndiger Brief: Ort/Datum, vollst\xE4ndige Anschrift, Betreff, Anrede, K\xFCndigung per Datum, Dankesformel, freundliche Gr\xFCsse, Unterschrift. Einschreiben-Hinweis am Ende.`,
        en: `Write a professional resignation letter in English for the Swiss job market.
Name: ${v.name} | Company: ${v.firma} | Last day: ${v.datum}
DO NOT mention: ${v.grund || "\u2013"}. Complete letter with date, address, subject line.`,
        fr: `R\xE9dige une lettre de d\xE9mission professionnelle en fran\xE7ais pour le march\xE9 suisse.
Nom: ${v.name} | Entreprise: ${v.firma} | Dernier jour: ${v.datum}
NE PAS mentionner: ${v.grund || "\u2013"}. Lettre compl\xE8te.`,
        it: `Scrivi una lettera di dimissioni professionale in italiano per il mercato svizzero.
Nome: ${v.name} | Azienda: ${v.firma} | Ultimo giorno: ${v.datum}
NON menzionare: ${v.grund || "\u2013"}. Lettera completa.`
      })[l]
    },
    {
      id: "plan306090",
      ico: "\u{1F5D3}\uFE0F",
      color: "#7c3aed",
      cat: "karriere",
      t: { de: "30-60-90-Tage-Plan", en: "30-60-90 Day Plan", fr: "Plan 30-60-90 jours", it: "Piano 30-60-90 giorni" },
      sub: { de: "Strukturierter Einarbeitungsplan f\xFCr deinen neuen Job.", en: "Structured onboarding plan for your new job.", fr: "Plan d'int\xE9gration structur\xE9 pour votre nouvel emploi.", it: "Piano di inserimento strutturato per il tuo nuovo lavoro." },
      inputs: [
        { k: "job", lbl: { de: "Deine neue Stelle", en: "Your new position", fr: "Votre nouveau poste", it: "Il tuo nuovo posto" }, ph: { de: "z.B. Product Manager, Fintech-Startup", en: "e.g. Product Manager, Fintech startup", fr: "ex. Chef de produit, startup Fintech", it: "es. Product Manager, startup Fintech" }, req: true },
        { k: "ziele", lbl: { de: "Was sind die Hauptziele?", en: "What are the main goals?", fr: "Quels sont les objectifs principaux?", it: "Quali sono gli obiettivi principali?" }, ph: { de: "z.B. Team kennenlernen, Roadmap verstehen, erste Features liefern", en: "e.g. Meet the team, understand roadmap, deliver first features", fr: "ex. Rencontrer l'\xE9quipe, comprendre la feuille de route", it: "es. Conoscere il team, capire la roadmap" }, type: "textarea", req: false }
      ],
      prompt: (v, l) => ({
        de: `Erstelle einen detaillierten 30-60-90-Tage-Einarbeitungsplan auf Schweizer Hochdeutsch (kein \xDF) f\xFCr: ${v.job}. Ziele: ${v.ziele || "Nicht angegeben"}.
Struktur: Klare Abschnitte f\xFCr Tag 1-30, 31-60, 61-90. Je: Priorit\xE4ten, konkrete Aufgaben, Meilensteine, Erfolgsmessung. Praxisnah und umsetzbar.`,
        en: `Create a detailed 30-60-90 day onboarding plan in English for: ${v.job}. Goals: ${v.ziele || "not provided"}.
Structure: Clear sections for days 1-30, 31-60, 61-90. Each: priorities, concrete tasks, milestones, success metrics. Practical and actionable.`,
        fr: `Cr\xE9e un plan d'int\xE9gration 30-60-90 jours d\xE9taill\xE9 en fran\xE7ais pour: ${v.job}. Objectifs: ${v.ziele || "non fournis"}.
Structure: Sections claires pour jours 1-30, 31-60, 61-90. Chaque section: priorit\xE9s, t\xE2ches concr\xE8tes, jalons, mesure du succ\xE8s.`,
        it: `Crea un piano di inserimento 30-60-90 giorni dettagliato in italiano per: ${v.job}. Obiettivi: ${v.ziele || "non forniti"}.
Struttura: Sezioni chiare per giorni 1-30, 31-60, 61-90. Ogni sezione: priorit\xE0, compiti concreti, traguardi, misurazione del successo.`
      })[l]
    },
    {
      id: "referenz",
      ico: "\u{1F3C6}",
      color: "#b45309",
      cat: "karriere",
      t: { de: "Referenzschreiben", en: "Reference Letter", fr: "Lettre de r\xE9f\xE9rence", it: "Lettera di referenza" },
      sub: { de: "KI erstellt einen Entwurf \u2013 Arbeitgeber pr\xFCft und unterschreibt. Kein Ersatz f\xFCr rechtliche Beratung.", en: "AI creates a draft \u2013 employer reviews and signs. Not a substitute for legal advice.", fr: "L'IA cr\xE9e un brouillon \u2013 l'employeur v\xE9rifie et signe. Ne remplace pas un conseil juridique.", it: "L'IA crea una bozza \u2013 il datore verifica e firma. Non sostituisce la consulenza legale." },
      inputs: [
        { k: "mitarb", lbl: { de: "Name des Mitarbeiters", en: "Employee name", fr: "Nom de l'employ\xE9(e)", it: "Nome del dipendente" }, ph: { de: "Max Mustermann", en: "John Doe", fr: "Jean Dupont", it: "Mario Rossi" }, req: true },
        { k: "stelle", lbl: { de: "Stelle & Dauer", en: "Position & duration", fr: "Poste & dur\xE9e", it: "Posto & durata" }, ph: { de: "z.B. Projektleiter, 3 Jahre", en: "e.g. Project manager, 3 years", fr: "ex. Chef de projet, 3 ans", it: "es. Project manager, 3 anni" }, req: true },
        { k: "leist", lbl: { de: "Wichtigste Leistungen & St\xE4rken", en: "Key achievements & strengths", fr: "Principales r\xE9alisations & points forts", it: "Principali risultati & punti di forza" }, ph: { de: "z.B. Hat ein Team von 8 geleitet, Projekt 20% fr\xFCher abgeliefert, sehr zuverl\xE4ssig", en: "e.g. Led a team of 8, delivered project 20% early, very reliable", fr: "ex. Dirig\xE9 \xE9quipe de 8, livr\xE9 projet en avance", it: "es. Guidato team di 8, progetto consegnato in anticipo" }, type: "textarea", req: true },
        { k: "note", lbl: { de: "Gesamtnote (f\xFCr Zeugnis-Formulierung)", en: "Overall grade (for reference wording)", fr: "Note globale (pour la formulation)", it: "Voto complessivo (per la formulazione)" }, type: "select", opts: { de: ["Sehr gut (6)", "Gut (5)", "Befriedigend (4)", "Gen\xFCgend (3)"], en: ["Excellent", "Good", "Satisfactory", "Sufficient"], fr: ["Excellent", "Bien", "Satisfaisant", "Suffisant"], it: ["Eccellente", "Buono", "Soddisfacente", "Sufficiente"] }, req: true }
      ],
      prompt: (v, l) => ({
        de: `Schreibe ein professionelles Schweizer Arbeitszeugnis auf Schweizer Hochdeutsch (kein \xDF) mit der korrekten Zeugnis-Sprache.
Mitarbeiter: ${v.mitarb} | Stelle: ${v.stelle} | Note: ${v.note}
Leistungen: ${v.leist}
Verwende die korrekte Schweizer Zeugnis-Formulierung entsprechend der Note. Vollst\xE4ndiges Zeugnis.`,
        en: `Write a professional Swiss work reference letter in English with appropriate Swiss reference language conventions.
Employee: ${v.mitarb} | Position: ${v.stelle} | Grade: ${v.note}
Achievements: ${v.leist}
Use appropriate language for the given grade level. Complete reference letter.`,
        fr: `R\xE9dige un certificat de travail suisse professionnel en fran\xE7ais avec le langage appropri\xE9.
Employ\xE9(e): ${v.mitarb} | Poste: ${v.stelle} | Note: ${v.note}
R\xE9alisations: ${v.leist}
Certificat de travail complet.`,
        it: `Scrivi un certificato di lavoro svizzero professionale in italiano con il linguaggio appropriato.
Dipendente: ${v.mitarb} | Posto: ${v.stelle} | Voto: ${v.note}
Risultati: ${v.leist}
Certificato di lavoro completo.`
      })[l]
    },
    // ── AUSBILDUNG ──
    {
      id: "lehrstelle",
      ico: "\u{1F393}",
      color: "#0891b2",
      cat: "ausbildung",
      t: { de: "Lehrstellen-Bewerbung", en: "Apprenticeship Application", fr: "Candidature apprentissage", it: "Candidatura apprendistato" },
      sub: { de: "Speziell f\xFCr das Schweizer Lehrstellensystem optimiert.", en: "Specifically optimized for the Swiss apprenticeship system.", fr: "Sp\xE9cialement optimis\xE9 pour le syst\xE8me suisse d'apprentissage.", it: "Specificamente ottimizzato per il sistema svizzero di apprendistato." },
      inputs: [
        { k: "beruf", lbl: { de: "Lehrberuf *", en: "Apprenticeship trade *", fr: "M\xE9tier *", it: "Mestiere *" }, ph: { de: "z.B. Kaufmann/-frau EFZ, Informatiker EFZ", en: "e.g. Commercial employee, IT specialist", fr: "ex. Employ\xE9 de commerce AFC", it: "es. Impiegato di commercio AFC" }, req: true },
        { k: "firma", lbl: { de: "Lehrfirma *", en: "Company *", fr: "Entreprise *", it: "Azienda *" }, ph: { de: "z.B. UBS AG, Z\xFCrich", en: "e.g. UBS AG, Zurich", fr: "ex. UBS SA, Zurich", it: "es. UBS SA, Zurigo" }, req: true },
        { k: "name", lbl: { de: "Dein Name", en: "Your name", fr: "Votre nom", it: "Il tuo nome" }, ph: { de: "Max Mustermann", en: "John Doe", fr: "Jean Dupont", it: "Mario Rossi" }, req: true },
        { k: "alter", lbl: { de: "Alter / Schuljahr", en: "Age / School year", fr: "\xC2ge / Ann\xE9e scolaire", it: "Et\xE0 / Anno scolastico" }, ph: { de: "z.B. 15 Jahre, 3. Sek", en: "e.g. 15 years, 9th grade", fr: "ex. 15 ans, 3e secondaire", it: "es. 15 anni, 3a media" }, req: false },
        { k: "staerken", lbl: { de: "St\xE4rken & Interessen", en: "Strengths & interests", fr: "Points forts & int\xE9r\xEAts", it: "Punti di forza & interessi" }, ph: { de: "z.B. Mathe gut, fleissig, computererfahren", en: "e.g. Good at maths, hardworking, computer savvy", fr: "ex. Bon en maths, travailleur, \xE0 l'aise en informatique", it: "es. Bravo in matematica, laborioso, esperto di computer" }, type: "textarea", req: false }
      ],
      prompt: (v, l) => ({
        de: `Schreibe ein professionelles Motivationsschreiben f\xFCr eine Lehrstelle auf Schweizer Hochdeutsch (kein \xDF).
Lehrberuf: ${v.beruf} | Firma: ${v.firma} | Name: ${v.name} | Alter: ${v.alter || "nicht angegeben"} | St\xE4rken: ${v.staerken || "nicht angegeben"}
Ton: jugendlich aber professionell, authentisch, enthusiastisch. Schweizer Lehrstellenformat. ~250 W\xF6rter.`,
        en: `Write a professional motivation letter for an apprenticeship in English for the Swiss system.
Trade: ${v.beruf} | Company: ${v.firma} | Name: ${v.name} | Age: ${v.alter || "not provided"} | Strengths: ${v.staerken || "not provided"}
Tone: youthful but professional, authentic, enthusiastic. ~250 words.`,
        fr: `R\xE9dige une lettre de motivation pour un apprentissage en fran\xE7ais pour le syst\xE8me suisse.
M\xE9tier: ${v.beruf} | Entreprise: ${v.firma} | Nom: ${v.name} | \xC2ge: ${v.alter || "n/a"} | Points forts: ${v.staerken || "n/a"}
Ton: jeune mais professionnel, authentique. ~250 mots.`,
        it: `Scrivi una lettera di motivazione per un apprendistato in italiano per il sistema svizzero.
Mestiere: ${v.beruf} | Azienda: ${v.firma} | Nome: ${v.name} | Et\xE0: ${v.alter || "n/d"} | Punti di forza: ${v.staerken || "n/d"}
Tono: giovanile ma professionale, autentico. ~250 parole.`
      })[l]
    },
    {
      id: "lernplan",
      ico: "\u{1F4DA}",
      color: "#0891b2",
      cat: "ausbildung",
      t: { de: "Lernplan Generator", en: "Study Plan Generator", fr: "G\xE9n\xE9rateur de plan d'\xE9tude", it: "Generatore piano di studio" },
      sub: { de: "KI erstellt deinen strukturierten Lernplan f\xFCr Matura, LAP oder Pr\xFCfungen.", en: "AI creates your structured study plan for any exam.", fr: "L'IA cr\xE9e votre plan d'\xE9tude structur\xE9 pour n'importe quel examen.", it: "L'IA crea il tuo piano di studio strutturato per qualsiasi esame." },
      inputs: [
        { k: "pruef", lbl: { de: "Pr\xFCfung / Fach *", en: "Exam / Subject *", fr: "Examen / Mati\xE8re *", it: "Esame / Materia *" }, ph: { de: "z.B. Matura Mathematik, LAP Kaufmann, Semesterpr\xFCfung BWL", en: "e.g. Final maths exam, apprenticeship exam", fr: "ex. Maturit\xE9 math\xE9matiques, examen de fin d'apprentissage", it: "es. Maturit\xE0 matematica, esame finale apprendistato" }, req: true },
        { k: "datum", lbl: { de: "Pr\xFCfungsdatum", en: "Exam date", fr: "Date de l'examen", it: "Data dell'esame" }, ph: { de: "z.B. 15. Juni 2026", en: "e.g. June 15, 2026", fr: "ex. 15 juin 2026", it: "es. 15 giugno 2026" }, req: true },
        { k: "niveau", lbl: { de: "Dein aktuelles Niveau", en: "Your current level", fr: "Votre niveau actuel", it: "Il tuo livello attuale" }, type: "select", opts: { de: ["Anf\xE4nger \u2013 fast nichts vorbereitet", "Mittelm\xE4ssig \u2013 Grundlagen da", "Gut \u2013 muss nur \xFCben", "Fast fertig \u2013 letzte Details"], en: ["Beginner \u2013 barely prepared", "Intermediate \u2013 basics there", "Good \u2013 just need practice", "Almost done \u2013 last details"], fr: ["D\xE9butant \u2013 presque rien", "Interm\xE9diaire \u2013 bases ok", "Bien \u2013 juste besoin de pratiquer", "Presque pr\xEAt \u2013 derniers d\xE9tails"], it: ["Principiante \u2013 quasi nulla", "Intermedio \u2013 basi ok", "Buono \u2013 solo pratica", "Quasi pronto \u2013 ultimi dettagli"] }, req: true },
        { k: "themen", lbl: { de: "Schwierige Themen (optional)", en: "Difficult topics (optional)", fr: "Sujets difficiles (optionnel)", it: "Argomenti difficili (opzionale)" }, ph: { de: "z.B. Integralrechnung, Buchhaltung Abschluss", en: "e.g. Integral calculus, closing accounts", fr: "ex. Calcul int\xE9gral, cl\xF4ture comptable", it: "es. Calcolo integrale, chiusura contabile" }, req: false }
      ],
      prompt: (v, l) => ({
        de: `Erstelle einen detaillierten Lernplan auf Schweizer Hochdeutsch (kein \xDF) f\xFCr: ${v.pruef}
Pr\xFCfungsdatum: ${v.datum} | Niveau: ${v.niveau} | Schwierige Themen: ${v.themen || "nicht angegeben"}
Struktur: Wochenplan bis zur Pr\xFCfung, t\xE4gliche Lernzeiten, Themenverteilung, Wiederholungsphase, Tipps f\xFCr Pr\xFCfungstag.`,
        en: `Create a detailed study plan in English for: ${v.pruef}
Exam date: ${v.datum} | Level: ${v.niveau} | Difficult topics: ${v.themen || "not provided"}
Structure: Weekly plan until exam, daily study times, topic distribution, revision phase, exam day tips.`,
        fr: `Cr\xE9e un plan d'\xE9tude d\xE9taill\xE9 en fran\xE7ais pour: ${v.pruef}
Date: ${v.datum} | Niveau: ${v.niveau} | Sujets difficiles: ${v.themen || "n/a"}
Structure: Plan hebdomadaire, heures d'\xE9tude quotidiennes, r\xE9partition des sujets, r\xE9vision, conseils le jour J.`,
        it: `Crea un piano di studio dettagliato in italiano per: ${v.pruef}
Data: ${v.datum} | Livello: ${v.niveau} | Argomenti difficili: ${v.themen || "n/d"}
Struttura: Piano settimanale, ore di studio giornaliere, distribuzione argomenti, fase di ripasso, consigli per il giorno dell'esame.`
      })[l]
    },
    {
      id: "zusammenfassung",
      ico: "\u{1F4C4}",
      color: "#0891b2",
      cat: "ausbildung",
      t: { de: "Zusammenfassung", en: "Summary", fr: "R\xE9sum\xE9", it: "Riassunto" },
      sub: { de: "Text oder Thema eingeben \u2013 KI erstellt eine kompakte Zusammenfassung.", en: "Enter text or topic \u2013 AI creates a compact summary.", fr: "Entrez un texte ou sujet \u2013 l'IA cr\xE9e un r\xE9sum\xE9 compact.", it: "Inserisci testo o argomento \u2013 l'IA crea un riassunto compatto." },
      inputs: [
        { k: "text", lbl: { de: "Text / Thema *", en: "Text / Topic *", fr: "Texte / Sujet *", it: "Testo / Argomento *" }, ph: { de: "Text einf\xFCgen oder Thema beschreiben\u2026", en: "Paste text or describe topic\u2026", fr: "Collez un texte ou d\xE9crivez un sujet\u2026", it: "Incolla il testo o descrivi l'argomento\u2026" }, type: "textarea", req: true, tall: true },
        { k: "laenge", lbl: { de: "Gew\xFCnschte L\xE4nge", en: "Desired length", fr: "Longueur souhait\xE9e", it: "Lunghezza desiderata" }, type: "select", opts: { de: ["Sehr kurz (5 S\xE4tze)", "Kurz (10-15 S\xE4tze)", "Mittel (1 Seite)", "Ausf\xFChrlich (2 Seiten)"], en: ["Very short (5 sentences)", "Short (10-15 sentences)", "Medium (1 page)", "Detailed (2 pages)"], fr: ["Tr\xE8s court (5 phrases)", "Court (10-15 phrases)", "Moyen (1 page)", "D\xE9taill\xE9 (2 pages)"], it: ["Molto breve (5 frasi)", "Breve (10-15 frasi)", "Medio (1 pagina)", "Dettagliato (2 pagine)"] }, req: false },
        { k: "zweck", lbl: { de: "Zweck (optional)", en: "Purpose (optional)", fr: "Objectif (optionnel)", it: "Scopo (opzionale)" }, ph: { de: "z.B. F\xFCr Matura-Lernen, Referat, Gesch\xE4ftsmeeting", en: "e.g. For exam prep, presentation, business meeting", fr: "ex. Pour r\xE9vision, expos\xE9, r\xE9union", it: "es. Per studio, presentazione, riunione" }, req: false }
      ],
      prompt: (v, l) => ({
        de: `Erstelle eine ${v.laenge || "mittellange"} Zusammenfassung auf Schweizer Hochdeutsch (kein \xDF). Zweck: ${v.zweck || "allgemein"}.
Text/Thema:
${v.text}
Strukturiert, klar, die wichtigsten Punkte auf den Punkt.`,
        en: `Create a ${v.laenge || "medium-length"} summary in English. Purpose: ${v.zweck || "general"}.
Text/Topic:
${v.text}
Structured, clear, hitting all key points.`,
        fr: `Cr\xE9e un r\xE9sum\xE9 ${v.laenge || "de longueur moyenne"} en fran\xE7ais. Objectif: ${v.zweck || "g\xE9n\xE9ral"}.
Texte/Sujet:
${v.text}
Structur\xE9, clair, les points cl\xE9s mis en avant.`,
        it: `Crea un riassunto ${v.laenge || "di media lunghezza"} in italiano. Scopo: ${v.zweck || "generale"}.
Testo/Argomento:
${v.text}
Strutturato, chiaro, i punti chiave in evidenza.`
      })[l]
    },
    // ── PRODUKTIVITÄT ──
    {
      id: "email",
      ico: "\u2709\uFE0F",
      color: "#7c3aed",
      cat: "produktivitaet",
      t: { de: "E-Mail Assistent", en: "Email Assistant", fr: "Assistant e-mail", it: "Assistente e-mail" },
      sub: { de: "Schwierige E-Mails formulieren \u2013 Beschwerden, Reklamationen, Anfragen.", en: "Formulate difficult emails \u2013 complaints, enquiries, negotiations.", fr: "Formule des e-mails difficiles \u2013 plaintes, r\xE9clamations, demandes.", it: "Formula e-mail difficili \u2013 reclami, richieste, negoziazioni." },
      inputs: [
        { k: "typ", lbl: { de: "E-Mail-Typ", en: "Email type", fr: "Type d'e-mail", it: "Tipo di e-mail" }, type: "select", opts: { de: ["Beschwerde / Reklamation", "Freundliche Mahnung", "Gehaltserh\xF6hungs-Anfrage", "Professionelle Ablehnung", "Entschuldigungs-E-Mail", "Kundenanfrage", "Interne Mitteilung", "K\xFCndigungsbest\xE4tigung"], en: ["Complaint / Claim", "Friendly reminder", "Raise request", "Professional decline", "Apology email", "Customer inquiry", "Internal notice", "Cancellation confirmation"], fr: ["Plainte / R\xE9clamation", "Rappel amical", "Demande d'augmentation", "Refus professionnel", "E-mail d'excuses", "Demande client", "Note interne", "Confirmation r\xE9siliation"], it: ["Reclamo / Lamentela", "Promemoria amichevole", "Richiesta aumento", "Rifiuto professionale", "E-mail di scuse", "Richiesta cliente", "Comunicazione interna", "Conferma disdetta"] }, req: true },
        { k: "an", lbl: { de: "An (Empf\xE4nger)", en: "To (recipient)", fr: "\xC0 (destinataire)", it: "A (destinatario)" }, ph: { de: "z.B. Herr Meier, Kundendienst Swisscom", en: "e.g. Mr. Smith, Customer Service", fr: "ex. M. Dupont, Service client", it: "es. Sig. Rossi, Servizio clienti" }, req: true },
        { k: "thema", lbl: { de: "Thema / Situation", en: "Topic / Situation", fr: "Sujet / Situation", it: "Argomento / Situazione" }, ph: { de: "z.B. Ich habe am 3. M\xE4rz eine Rechnung erhalten, die falsch ist. Der Betrag ist 150 CHF zu hoch.", en: "e.g. I received an incorrect invoice on March 3. The amount is 150 CHF too high.", fr: "ex. J'ai re\xE7u une facture incorrecte le 3 mars. Le montant est 150 CHF trop \xE9lev\xE9.", it: "es. Ho ricevuto una fattura errata il 3 marzo. L'importo \xE8 150 CHF troppo alto." }, type: "textarea", req: true },
        { k: "ton", lbl: { de: "Ton", en: "Tone", fr: "Ton", it: "Tono" }, type: "select", opts: { de: ["Professionell & sachlich", "Freundlich & diplomatisch", "Bestimmt & klar", "Formell"], en: ["Professional & factual", "Friendly & diplomatic", "Firm & clear", "Formal"], fr: ["Professionnel & factuel", "Amical & diplomatique", "Ferme & clair", "Formel"], it: ["Professionale & fattuale", "Amichevole & diplomatico", "Deciso & chiaro", "Formale"] }, req: false }
      ],
      prompt: (v, l) => ({
        de: `Schreibe eine professionelle ${v.typ}-E-Mail auf Schweizer Hochdeutsch (kein \xDF). Ton: ${v.ton || "professionell & sachlich"}.
An: ${v.an} | Thema: ${v.thema}
Mit Betreffzeile. Klar, pr\xE4zise, Schweizer Stil.`,
        en: `Write a professional ${v.typ} email in English. Tone: ${v.ton || "professional & factual"}.
To: ${v.an} | Topic: ${v.thema}
Include subject line. Clear, precise, professional style.`,
        fr: `R\xE9dige un e-mail professionnel de type ${v.typ} en fran\xE7ais. Ton: ${v.ton || "professionnel & factuel"}.
\xC0: ${v.an} | Sujet: ${v.thema}
Avec ligne d'objet. Clair, pr\xE9cis.`,
        it: `Scrivi un'e-mail professionale di tipo ${v.typ} in italiano. Tono: ${v.ton || "professionale & fattuale"}.
A: ${v.an} | Argomento: ${v.thema}
Con oggetto. Chiara, precisa.`
      })[l]
    },
    {
      id: "protokoll",
      ico: "\u{1F4CB}",
      color: "#0891b2",
      cat: "produktivitaet",
      t: { de: "Meeting-Protokoll", en: "Meeting Minutes", fr: "Proc\xE8s-verbal", it: "Verbale riunione" },
      sub: { de: "Stichworte eingeben \u2192 fertiges Protokoll im Schweizer Format.", en: "Enter bullet points \u2192 complete meeting minutes.", fr: "Entrez des notes \u2192 proc\xE8s-verbal complet.", it: "Inserisci appunti \u2192 verbale completo." },
      inputs: [
        { k: "titel", lbl: { de: "Meetingtitel / Thema", en: "Meeting title / Topic", fr: "Titre / Sujet", it: "Titolo / Argomento" }, ph: { de: "z.B. Quartalsbesprechung Q1 2026", en: "e.g. Q1 2026 quarterly review", fr: "ex. Revue trimestrielle Q1 2026", it: "es. Revisione trimestrale Q1 2026" }, req: true },
        { k: "datum", lbl: { de: "Datum & Teilnehmer", en: "Date & participants", fr: "Date & participants", it: "Data & partecipanti" }, ph: { de: "z.B. 7. M\xE4rz 2026, Max M., Sarah K., Lukas B.", en: "e.g. March 7, 2026, Max M., Sarah K.", fr: "ex. 7 mars 2026, Max M., Sarah K.", it: "es. 7 marzo 2026, Max M., Sarah K." }, req: false },
        { k: "punkte", lbl: { de: "Besprochene Punkte (Stichworte) *", en: "Discussed points (bullet notes) *", fr: "Points discut\xE9s (notes) *", it: "Punti discussi (appunti) *" }, ph: { de: "z.B.\n- Umsatz Q1: 2.3 Mio., +12% vs. Vorjahr\n- Marketing plant neue Kampagne April\n- IT: Server-Update n\xE4chste Woche\n- N\xE4chstes Meeting: 4. April", en: "e.g.\n- Q1 revenue: 2.3M, +12% vs last year\n- Marketing planning new campaign April\n- IT: server update next week\n- Next meeting: April 4", fr: "ex.\n- CA T1: 2.3M, +12%\n- Marketing planifie campagne avril\n- IT: mise \xE0 jour serveur\n- Prochain: 4 avril", it: "es.\n- Fatturato Q1: 2.3M, +12%\n- Marketing: campagna ad aprile\n- IT: aggiornamento server\n- Prossimo: 4 aprile" }, type: "textarea", req: true, tall: true }
      ],
      prompt: (v, l) => ({
        de: `Erstelle ein professionelles Meeting-Protokoll auf Schweizer Hochdeutsch (kein \xDF) aus diesen Stichworten.
Meeting: ${v.titel} | ${v.datum || ""}
Punkte:
${v.punkte}
Format: Traktanden, Beschl\xFCsse, Verantwortlichkeiten, Pendenzen, n\xE4chste Schritte. Professionell, klar.`,
        en: `Create professional meeting minutes in English from these notes.
Meeting: ${v.titel} | ${v.datum || ""}
Points:
${v.punkte}
Format: Agenda items, decisions, responsibilities, outstanding items, next steps. Professional, clear.`,
        fr: `Cr\xE9e un proc\xE8s-verbal professionnel en fran\xE7ais \xE0 partir de ces notes.
R\xE9union: ${v.titel} | ${v.datum || ""}
Points:
${v.punkte}
Format: Ordre du jour, d\xE9cisions, responsabilit\xE9s, points en suspens, prochaines \xE9tapes.`,
        it: `Crea un verbale professionale in italiano da questi appunti.
Riunione: ${v.titel} | ${v.datum || ""}
Punti:
${v.punkte}
Formato: Ordine del giorno, decisioni, responsabilit\xE0, punti aperti, prossimi passi.`
      })[l]
    },
    {
      id: "uebersetzer",
      ico: "\u{1F310}",
      color: "#0f766e",
      cat: "produktivitaet",
      t: { de: "\xDCbersetzer mit Kontext", en: "Contextual Translator", fr: "Traducteur contextuel", it: "Traduttore contestuale" },
      sub: { de: "Nicht nur W\xF6rter \u2013 ganze Dokumente mit Branchenkontext \xFCbersetzen.", en: "Not just words \u2013 translate entire documents with industry context.", fr: "Pas seulement des mots \u2013 traduisez des documents entiers avec contexte.", it: "Non solo parole \u2013 traduci interi documenti con contesto di settore." },
      inputs: [
        { k: "von", lbl: { de: "Von Sprache", en: "From language", fr: "De la langue", it: "Dalla lingua" }, type: "select", opts: { de: ["Deutsch", "Englisch", "Franz\xF6sisch", "Italienisch", "Spanisch", "Portugiesisch"], en: ["German", "English", "French", "Italian", "Spanish", "Portuguese"], fr: ["Allemand", "Anglais", "Fran\xE7ais", "Italien", "Espagnol", "Portugais"], it: ["Tedesco", "Inglese", "Francese", "Italiano", "Spagnolo", "Portoghese"] }, req: true },
        { k: "nach", lbl: { de: "Nach Sprache", en: "To language", fr: "Vers la langue", it: "Nella lingua" }, type: "select", opts: { de: ["Deutsch (Schweizer Hochdeutsch)", "Englisch", "Franz\xF6sisch", "Italienisch", "Spanisch", "Portugiesisch"], en: ["German (Swiss Standard)", "English", "French", "Italian", "Spanish", "Portuguese"], fr: ["Allemand (suisse)", "Anglais", "Fran\xE7ais", "Italien", "Espagnol", "Portugais"], it: ["Tedesco (svizzero)", "Inglese", "Francese", "Italiano", "Spagnolo", "Portoghese"] }, req: true },
        { k: "kontext", lbl: { de: "Kontext / Branche", en: "Context / Industry", fr: "Contexte / Secteur", it: "Contesto / Settore" }, type: "select", opts: { de: ["Allgemein", "Business & Finanzen", "Juristisch / Vertr\xE4ge", "Medizin & Gesundheit", "Technologie & IT", "Marketing", "Bewerbung & HR", "Wissenschaft"], en: ["General", "Business & Finance", "Legal / Contracts", "Medical & Health", "Technology & IT", "Marketing", "HR & Applications", "Science"], fr: ["G\xE9n\xE9ral", "Business & Finance", "Juridique", "M\xE9decine", "Technologie", "Marketing", "RH", "Science"], it: ["Generale", "Business & Finanza", "Legale", "Medicina", "Tecnologia", "Marketing", "HR", "Scienza"] }, req: false },
        { k: "text", lbl: { de: "Text zum \xDCbersetzen *", en: "Text to translate *", fr: "Texte \xE0 traduire *", it: "Testo da tradurre *" }, ph: { de: "Text hier einf\xFCgen\u2026", en: "Paste text here\u2026", fr: "Collez le texte ici\u2026", it: "Incolla il testo qui\u2026" }, type: "textarea", req: true, tall: true }
      ],
      prompt: (v, l) => ({
        de: `\xDCbersetze den folgenden Text von ${v.von} nach ${v.nach}. Kontext: ${v.kontext || "Allgemein"}. Bei Schweizer Hochdeutsch: kein \xDF. Nat\xFCrlich, professionell, kontextsensibel. Nur die \xDCbersetzung, keine Erkl\xE4rungen.

${v.text}`,
        en: `Translate the following text from ${v.von} to ${v.nach}. Context: ${v.kontext || "General"}. Natural, professional, context-aware translation. Only the translation, no explanations.

${v.text}`,
        fr: `Traduis le texte suivant de ${v.von} vers ${v.nach}. Contexte: ${v.kontext || "G\xE9n\xE9ral"}. Naturel, professionnel, sensible au contexte. Uniquement la traduction.

${v.text}`,
        it: `Traduci il seguente testo da ${v.von} a ${v.nach}. Contesto: ${v.kontext || "Generale"}. Naturale, professionale, sensibile al contesto. Solo la traduzione.

${v.text}`
      })[l]
    },
    // ── LINKEDIN → BEWERBUNG ──
    {
      id: "li2job",
      ico: "\u{1F517}",
      color: "#0a66c2",
      cat: "karriere",
      t: { de: "LinkedIn \u2192 Bewerbung", en: "LinkedIn \u2192 Application", fr: "LinkedIn \u2192 Candidature", it: "LinkedIn \u2192 Candidatura" },
      sub: { de: "LinkedIn-Profil + Stelleninserat \u2192 komplette Bewerbung in Sekunden.", en: "LinkedIn profile + job posting \u2192 complete application in seconds.", fr: "Profil LinkedIn + offre d'emploi \u2192 candidature compl\xE8te en secondes.", it: "Profilo LinkedIn + offerta di lavoro \u2192 candidatura completa in secondi." },
      inputs: [
        { k: "li", lbl: { de: "Dein LinkedIn-Profil (Text kopieren) *", en: "Your LinkedIn profile (copy text) *", fr: "Votre profil LinkedIn (copier le texte) *", it: "Il tuo profilo LinkedIn (copia il testo) *" }, ph: { de: "Kopiere deinen LinkedIn-Profiltext hier rein \u2013 About, Erfahrungen, Skills, Ausbildung\u2026", en: "Paste your LinkedIn profile text here \u2013 About, Experience, Skills, Education\u2026", fr: "Collez votre texte de profil LinkedIn \u2013 About, Exp\xE9riences, Comp\xE9tences, Formation\u2026", it: "Incolla il testo del tuo profilo LinkedIn \u2013 About, Esperienze, Competenze, Formazione\u2026" }, type: "textarea", req: true, tall: true },
        { k: "stelle", lbl: { de: "LinkedIn-Stelleninserat (Text kopieren) *", en: "LinkedIn job posting (copy text) *", fr: "Offre d'emploi LinkedIn (copier le texte) *", it: "Offerta di lavoro LinkedIn (copia il testo) *" }, ph: { de: "Kopiere den vollst\xE4ndigen Stellenbeschrieb von LinkedIn hier rein\u2026", en: "Paste the full job description from LinkedIn here\u2026", fr: "Collez la description compl\xE8te du poste LinkedIn ici\u2026", it: "Incolla la descrizione completa del lavoro LinkedIn qui\u2026" }, type: "textarea", req: true, tall: true },
        { k: "ton", lbl: { de: "Ton", en: "Tone", fr: "Ton", it: "Tono" }, type: "select", opts: { de: ["Professionell & pr\xE4zise", "Engagiert & enthusiastisch", "Konservativ & seri\xF6s", "Kreativ & modern"], en: ["Professional & precise", "Engaged & enthusiastic", "Conservative & serious", "Creative & modern"], fr: ["Professionnel & pr\xE9cis", "Engag\xE9 & enthousiaste", "Conservateur & s\xE9rieux", "Cr\xE9atif & moderne"], it: ["Professionale & preciso", "Coinvolto & entusiasta", "Conservativo & serio", "Creativo & moderno"] }, req: false }
      ],
      prompt: (v, l) => ({
        de: `Du bist ein erstklassiger Bewerbungsexperte in der Schweiz. Analysiere das LinkedIn-Profil und das Stelleninserat und erstelle eine massgeschneiderte, \xFCberzeugende Bewerbung auf Schweizer Hochdeutsch (kein \xDF, kein "herzlichen Dank" Klischee).

LINKEDIN-PROFIL:
${v.li}

STELLENINSERAT:
${v.stelle}

TON: ${v.ton || "Professionell & pr\xE4zise"}

Erstelle:

# MOTIVATIONSSCHREIBEN
[Vollst\xE4ndiges, professionelles Motivationsschreiben \u2013 3-4 Abs\xE4tze. Zeige konkret wie das Profil zur Stelle passt. Nutze Keywords aus dem Inserat.]

---

# LEBENSLAUF-HIGHLIGHTS
[Die 5-7 wichtigsten Punkte aus dem LinkedIn-Profil, direkt auf diese Stelle zugeschnitten mit relevanten Skills und Erfahrungen hervorgehoben]

---

# WARUM DU DER RICHTIGE KANDIDAT BIST
[3 starke, konkrete Argumente warum genau dieses Profil f\xFCr genau diese Stelle ideal ist]`,
        en: `You are a top application expert in Switzerland. Analyze the LinkedIn profile and job posting and create a tailored, compelling application in English.

LINKEDIN PROFILE:
${v.li}

JOB POSTING:
${v.stelle}

TONE: ${v.ton || "Professional & precise"}

Create:

# COVER LETTER
[Complete, professional cover letter \u2013 3-4 paragraphs. Show concretely how the profile matches the position. Use keywords from the posting.]

---

# CV HIGHLIGHTS
[The 5-7 most important points from the LinkedIn profile, directly tailored to this position with relevant skills and experience highlighted]

---

# WHY YOU ARE THE RIGHT CANDIDATE
[3 strong, concrete arguments why exactly this profile is ideal for exactly this position]`,
        fr: `Tu es un expert en candidatures en Suisse. Analyse le profil LinkedIn et l'offre d'emploi et cr\xE9e une candidature personnalis\xE9e et convaincante en fran\xE7ais.

PROFIL LINKEDIN:
${v.li}

OFFRE D'EMPLOI:
${v.stelle}

TON: ${v.ton || "Professionnel & pr\xE9cis"}

Cr\xE9e:

# LETTRE DE MOTIVATION
[Lettre compl\xE8te et professionnelle \u2013 3-4 paragraphes. Montre concr\xE8tement comment le profil correspond au poste.]

---

# POINTS FORTS DU CV
[Les 5-7 points les plus importants du profil LinkedIn, directement adapt\xE9s \xE0 ce poste]

---

# POURQUOI VOUS \xCATES LE BON CANDIDAT
[3 arguments forts et concrets]`,
        it: `Sei un esperto di candidature in Svizzera. Analizza il profilo LinkedIn e l'offerta di lavoro e crea una candidatura personalizzata e convincente in italiano.

PROFILO LINKEDIN:
${v.li}

OFFERTA DI LAVORO:
${v.stelle}

TONO: ${v.ton || "Professionale & preciso"}

Crea:

# LETTERA DI MOTIVAZIONE
[Lettera completa e professionale \u2013 3-4 paragrafi. Mostra concretamente come il profilo corrisponde alla posizione.]

---

# PUNTI DI FORZA DEL CV
[I 5-7 punti pi\xF9 importanti del profilo LinkedIn, direttamente adattati a questa posizione]

---

# PERCH\xC9 SEI IL CANDIDATO GIUSTO
[3 argomenti forti e concreti]`
      })[l]
    },
    // ── GEHALTSRECHNER ──
    {
      id: "gehaltsrechner",
      ico: "\u{1F4B0}",
      color: "#059669",
      cat: "karriere",
      t: { de: "KI-Gehaltsrechner Schweiz", en: "AI Salary Calculator Switzerland", fr: "Calculateur salaire IA Suisse", it: "Calcolatore stipendio IA Svizzera" },
      sub: { de: "Gehaltssch\xE4tzung nach Jobtitel, Branche, Kanton & Erfahrung \u2013 Richtwerte, keine Garantie.", en: "Salary estimate by job title, industry, canton & experience \u2013 indicative values, not guaranteed.", fr: "Estimation salariale par titre, secteur, canton & exp\xE9rience \u2013 valeurs indicatives.", it: "Stima salariale per titolo, settore, cantone & esperienza \u2013 valori indicativi." },
      inputs: [
        { k: "job", lbl: { de: "Jobtitel *", en: "Job title *", fr: "Titre du poste *", it: "Titolo del posto *" }, ph: { de: "z.B. Senior Software Engineer, HR Business Partner, Projektleiter", en: "e.g. Senior Software Engineer, HR Business Partner, Project Manager", fr: "ex. Ing\xE9nieur logiciel senior, Chef de projet", it: "es. Senior Software Engineer, Project Manager" }, req: true },
        { k: "branche", lbl: { de: "Branche *", en: "Industry *", fr: "Secteur *", it: "Settore *" }, type: "select", opts: { de: ["IT & Software", "Finanzen & Banking", "Gesundheitswesen", "Ingenieurwesen", "Marketing & Kommunikation", "Recht & Compliance", "Bildung", "Logistik", "Personalwesen (HR)", "Beratung", "Gastronomie", "Bau & Architektur"], en: ["IT & Software", "Finance & Banking", "Healthcare", "Engineering", "Marketing", "Legal", "Education", "Logistics", "HR", "Consulting", "Hospitality", "Construction"], fr: ["IT & Logiciels", "Finance", "Sant\xE9", "Ing\xE9nierie", "Marketing", "Juridique", "\xC9ducation", "Logistique", "RH", "Conseil", "H\xF4tellerie", "Construction"], it: ["IT & Software", "Finanza", "Sanit\xE0", "Ingegneria", "Marketing", "Legale", "Istruzione", "Logistica", "HR", "Consulenza", "Ospitalit\xE0", "Costruzione"] }, req: true },
        { k: "kanton", lbl: { de: "Kanton / Region", en: "Canton / Region", fr: "Canton / R\xE9gion", it: "Cantone / Regione" }, type: "select", opts: { de: ["Z\xFCrich", "Genf", "Basel-Stadt", "Zug", "Bern", "Lausanne", "Luzern", "St. Gallen", "Winterthur", "Aarau", "Thun", "Chur", "Sion/Sitten"], en: ["Zurich", "Geneva", "Basel-City", "Zug", "Bern", "Lausanne", "Lucerne", "St. Gallen", "Winterthur", "Aarau", "Thun", "Chur", "Sion"], fr: ["Zurich", "Gen\xE8ve", "B\xE2le-Ville", "Zoug", "Berne", "Lausanne", "Lucerne", "Saint-Gall", "Winterthour", "Aarau", "Thoune", "Coire", "Sion"], it: ["Zurigo", "Ginevra", "Basilea-Citt\xE0", "Zugo", "Berna", "Losanna", "Lucerna", "San Gallo", "Winterthur", "Aarau", "Thun", "Coira", "Sion"] }, req: false },
        { k: "erfahrung", lbl: { de: "Berufserfahrung", en: "Experience", fr: "Exp\xE9rience", it: "Esperienza" }, type: "select", opts: { de: ["0\u20132 Jahre", "3\u20135 Jahre", "6\u201310 Jahre", "11\u201315 Jahre", "16+ Jahre"], en: ["0\u20132 years", "3\u20135 years", "6\u201310 years", "11\u201315 years", "16+ years"], fr: ["0\u20132 ans", "3\u20135 ans", "6\u201310 ans", "11\u201315 ans", "16+ ans"], it: ["0\u20132 anni", "3\u20135 anni", "6\u201310 anni", "11\u201315 anni", "16+ anni"] }, req: false },
        { k: "abschluss", lbl: { de: "H\xF6chster Abschluss", en: "Highest degree", fr: "Dipl\xF4me le plus \xE9lev\xE9", it: "Titolo di studio pi\xF9 alto" }, type: "select", opts: { de: ["Lehre / Berufsausbildung", "Berufsmaturit\xE4t", "Bachelor", "Master / Lizentiat", "Doktorat / PhD"], en: ["Apprenticeship", "Vocational Maturity", "Bachelor", "Master", "PhD"], fr: ["Apprentissage", "Maturit\xE9 professionnelle", "Bachelor", "Master", "Doctorat"], it: ["Apprendistato", "Maturit\xE0 professionale", "Bachelor", "Master", "Dottorato"] }, req: false }
      ],
      prompt: (v, l) => ({
        de: `Du bist Schweizer Gehaltsexperte 2025/26. Erstelle eine Gehaltssch\xE4tzung basierend auf Marktdaten (Salarium BFS, Lohnrechner, Michael Page, Robert Half). Antworte NUR mit JSON (kein Markdown). Wichtig: Alle Angaben sind Richtwerte, keine Garantien.
{"min":85000,"median":105000,"max":130000,"vergleich_schweiz":"12% \xFCber dem Schweizer Median","kanton_faktor":"Z\xFCrich: +8% vs CH-Durchschnitt","tipps":["Tipp 1","Tipp 2","Tipp 3"],"verhandlungstipp":"Konkreter Satz f\xFCr die Verhandlung","branchentrend":"Einsch\xE4tzung zur Gehaltsentwicklung"}
Profil: Jobtitel: ${v.job} | Branche: ${v.branche || "k.A."} | Kanton: ${v.kanton || "Schweiz"} | Erfahrung: ${v.erfahrung || "k.A."} | Abschluss: ${v.abschluss || "k.A."}`,
        en: `You are a Swiss salary expert 2025/26. Analyse the job market and create a realistic salary estimate. Reply ONLY with JSON (no markdown):
{"min":85000,"median":105000,"max":130000,"vergleich_schweiz":"12% above Swiss median","kanton_faktor":"Zurich: +8% vs CH average","tipps":["Tip 1","Tip 2","Tip 3"],"verhandlungstipp":"Concrete negotiation sentence","branchentrend":"Industry salary outlook"}
Profile: Job: ${v.job} | Industry: ${v.branche || "n/a"} | Canton: ${v.kanton || "Switzerland"} | Experience: ${v.erfahrung || "n/a"} | Degree: ${v.abschluss || "n/a"}`,
        fr: `Tu es expert salarial suisse 2025/26. Cr\xE9e une estimation salariale r\xE9aliste. R\xE9ponds UNIQUEMENT avec JSON:
{"min":85000,"median":105000,"max":130000,"vergleich_schweiz":"12% au-dessus de la m\xE9diane suisse","kanton_faktor":"Gen\xE8ve: +10% vs moyenne CH","tipps":["Conseil 1","Conseil 2","Conseil 3"],"verhandlungstipp":"Phrase concr\xE8te pour n\xE9gocier","branchentrend":"Perspectives salariales du secteur"}
Profil: Titre: ${v.job} | Secteur: ${v.branche || "n/d"} | Canton: ${v.kanton || "Suisse"} | Exp\xE9rience: ${v.erfahrung || "n/d"} | Dipl\xF4me: ${v.abschluss || "n/d"}`,
        it: `Sei un esperto di stipendi svizzeri 2025/26. Crea una stima salariale realistica. Rispondi SOLO con JSON:
{"min":85000,"median":105000,"max":130000,"vergleich_schweiz":"12% sopra la mediana svizzera","kanton_faktor":"Zurigo: +8% vs media CH","tipps":["Consiglio 1","Consiglio 2","Consiglio 3"],"verhandlungstipp":"Frase concreta per la negoziazione","branchentrend":"Prospettive salariali del settore"}
Profilo: Titolo: ${v.job} | Settore: ${v.branche || "n/d"} | Cantone: ${v.kanton || "Svizzera"} | Esperienza: ${v.erfahrung || "n/d"} | Titolo: ${v.abschluss || "n/d"}`
      })[l]
    },
    // ── LINKEDIN POST GENERATOR ──
    {
      id: "lipost",
      ico: "\u270D\uFE0F",
      color: "#0a66c2",
      cat: "karriere",
      t: { de: "LinkedIn-Post Generator", en: "LinkedIn Post Generator", fr: "G\xE9n\xE9rateur post LinkedIn", it: "Generatore post LinkedIn" },
      sub: { de: "3 massgeschneiderte Posts \u2013 Swiss-Style, keine Corporate-Floskeln, sofort kopierbar.", en: "3 tailored posts \u2013 Swiss style, no corporate clich\xE9s, ready to copy.", fr: "3 posts sur mesure \u2013 style suisse, sans clich\xE9s d'entreprise, pr\xEAts \xE0 copier.", it: "3 post su misura \u2013 stile svizzero, senza clich\xE9 aziendali, pronti da copiare." },
      inputs: [
        { k: "typ", lbl: { de: "Post-Typ *", en: "Post type *", fr: "Type de post *", it: "Tipo di post *" }, type: "select", opts: { de: ["\u{1F389} Neue Stelle angetreten", "\u{1F4DA} Weiterbildung / Zertifikat", "\u{1F4A1} Erfahrung & Erkenntnisse teilen", "\u{1F3C6} Projekterfolg / Meilenstein", "\u{1F50D} Offen f\xFCr neue M\xF6glichkeiten", "\u{1F4AC} Fachliche Meinung zu Branchenthema"], en: ["\u{1F389} Started new position", "\u{1F4DA} Training / Certificate", "\u{1F4A1} Share experience & insights", "\u{1F3C6} Project success / Milestone", "\u{1F50D} Open to opportunities", "\u{1F4AC} Professional opinion on industry topic"], fr: ["\u{1F389} Nouveau poste", "\u{1F4DA} Formation / Certificat", "\u{1F4A1} Partager exp\xE9rience", "\u{1F3C6} Succ\xE8s projet", "\u{1F50D} Ouvert aux opportunit\xE9s", "\u{1F4AC} Opinion professionnelle"], it: ["\u{1F389} Nuovo posto", "\u{1F4DA} Formazione / Certificato", "\u{1F4A1} Condividere esperienza", "\u{1F3C6} Successo progetto", "\u{1F50D} Aperto a opportunit\xE0", "\u{1F4AC} Opinione professionale"] }, req: true },
        { k: "details", lbl: { de: "Details & Kontext *", en: "Details & context *", fr: "D\xE9tails & contexte *", it: "Dettagli & contesto *" }, ph: { de: "z.B. Ich trete als Head of Product bei einem Z\xFCrcher FinTech an. Davor 4 Jahre bei Swisscom. Freue mich besonders auf das internationale Team und die Mission...", en: "e.g. I'm joining as Head of Product at a Zurich FinTech. Previously 4 years at Swisscom. Especially excited about the international team and the mission...", fr: "ex. Je rejoins en tant que Head of Product dans une FinTech zurichoise. Auparavant 4 ans chez Swisscom...", it: "es. Entro come Head of Product in una FinTech di Zurigo. Prima 4 anni a Swisscom..." }, type: "textarea", req: true, tall: true },
        { k: "ton", lbl: { de: "Tonalit\xE4t", en: "Tone", fr: "Tonalit\xE9", it: "Tonalit\xE0" }, type: "select", opts: { de: ["Pers\xF6nlich & authentisch", "Professionell & sachlich", "Motivierend & inspirierend", "Direkt & pr\xE4gnant"], en: ["Personal & authentic", "Professional & factual", "Motivating & inspiring", "Direct & concise"], fr: ["Personnel & authentique", "Professionnel & factuel", "Motivant & inspirant", "Direct & concis"], it: ["Personale & autentico", "Professionale & fattuale", "Motivante & ispirante", "Diretto & conciso"] }, req: false },
        { k: "laenge", lbl: { de: "L\xE4nge", en: "Length", fr: "Longueur", it: "Lunghezza" }, type: "select", opts: { de: ["Kurz (100\u2013150 W\xF6rter)", "Mittel (200\u2013300 W\xF6rter)", "Lang (400+ W\xF6rter)"], en: ["Short (100\u2013150 words)", "Medium (200\u2013300 words)", "Long (400+ words)"], fr: ["Court (100\u2013150 mots)", "Moyen (200\u2013300 mots)", "Long (400+ mots)"], it: ["Breve (100\u2013150 parole)", "Medio (200\u2013300 parole)", "Lungo (400+ parole)"] }, req: false }
      ],
      prompt: (v, l) => ({
        de: `Du bist LinkedIn-Experte f\xFCr den Schweizer Stellenmarkt. Erstelle 3 verschiedene LinkedIn-Posts auf Schweizer Hochdeutsch (kein \xDF, kein "herzlichen Dank" Klischee, kein "Freue mich riesig").
Post-Typ: ${v.typ} | Ton: ${v.ton || "Pers\xF6nlich & authentisch"} | L\xE4nge: ${v.laenge || "Mittel"}
Details: ${v.details}
Antworte NUR mit JSON-Array (kein Markdown):
[{"variante":"Variante 1","post":"vollst\xE4ndiger Post-Text mit \\n f\xFCr Zeilenumbr\xFCche","warum":"Kurze Begr\xFCndung warum dieser Stil wirkt"},{"variante":"Variante 2","post":"...","warum":"..."},{"variante":"Variante 3","post":"...","warum":"..."}]`,
        en: `You are a LinkedIn expert for the Swiss job market. Create 3 different LinkedIn posts in English. No corporate clich\xE9s.
Post type: ${v.typ} | Tone: ${v.ton || "Personal & authentic"} | Length: ${v.laenge || "Medium"}
Details: ${v.details}
Reply ONLY with JSON array (no markdown):
[{"variante":"Variant 1","post":"full post text with \\n for line breaks","warum":"Short reason why this style works"},{"variante":"Variant 2","post":"...","warum":"..."},{"variante":"Variant 3","post":"...","warum":"..."}]`,
        fr: `Tu es expert LinkedIn pour le march\xE9 suisse. Cr\xE9e 3 posts LinkedIn diff\xE9rents en fran\xE7ais. Pas de clich\xE9s d'entreprise.
Type: ${v.typ} | Ton: ${v.ton || "Personnel & authentique"} | Longueur: ${v.laenge || "Moyen"}
D\xE9tails: ${v.details}
R\xE9ponds UNIQUEMENT avec un tableau JSON:
[{"variante":"Variante 1","post":"texte complet avec \\n","warum":"Raison courte"},{"variante":"Variante 2","post":"...","warum":"..."},{"variante":"Variante 3","post":"...","warum":"..."}]`,
        it: `Sei un esperto LinkedIn per il mercato svizzero. Crea 3 post LinkedIn diversi in italiano. No clich\xE9 aziendali.
Tipo: ${v.typ} | Tono: ${v.ton || "Personale & autentico"} | Lunghezza: ${v.laenge || "Medio"}
Dettagli: ${v.details}
Rispondi SOLO con array JSON:
[{"variante":"Variante 1","post":"testo completo con \\n","warum":"Motivo breve"},{"variante":"Variante 2","post":"...","warum":"..."},{"variante":"Variante 3","post":"...","warum":"..."}]`
      })[l]
    }
  ];
  function slugify(page2) {
    return (page2 || "stellify").replace(/[^a-z0-9]/gi, "-").toLowerCase();
  }
  function blobDownload(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      document.body.removeChild(a);
    }, 1e3);
  }
  async function downloadHtmlAsPdf(text, page2) {
    try {
      if (!window.jspdf) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
          s.onload = res;
          s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const margin = 20, pageW = doc.internal.pageSize.getWidth(), maxW = pageW - margin * 2;
      let y = margin;
      const lines = doc.splitTextToSize(text, maxW);
      lines.forEach((line) => {
        if (y > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 6;
      });
      doc.save(`stellify-${slugify(page2)}.pdf`);
    } catch (e) {
      console.error("PDF error:", e);
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;line-height:1.8;font-size:13px}pre{white-space:pre-wrap;font-family:inherit}</style></head><body><pre>${text.replace(/</g, "&lt;")}</pre></body></html>`;
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
        setTimeout(() => w.print(), 400);
      }
    }
  }
  async function downloadAsWord(text, page2) {
    try {
      if (!window.docx) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.min.js";
          s.onload = res;
          s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = window.docx;
      const paragraphs = text.split("\n").map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return new Paragraph({ spacing: { after: 120 } });
        const isBullet = trimmed.startsWith("\u2022") || trimmed.startsWith("-");
        const isHeading = /^[A-ZÄÖÜ\s✍📄💡🔵🎤]{4,}$/.test(trimmed) || trimmed.endsWith(":");
        return new Paragraph({
          heading: isHeading ? HeadingLevel.HEADING_2 : void 0,
          bullet: isBullet ? { level: 0 } : void 0,
          children: [new TextRun({
            text: isBullet ? trimmed.replace(/^[•\-]\s*/, "") : trimmed,
            size: 22,
            font: "Calibri",
            bold: isHeading
          })],
          spacing: { after: isHeading ? 160 : 100 }
        });
      });
      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs
        }]
      });
      const buffer = await Packer.toBlob(doc);
      blobDownload(buffer, `stellify-${slugify(page2)}.docx`);
    } catch (e) {
      console.error("Word error:", e);
      const rtf = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Calibri;}}\\f0\\fs22\\sa180 ${text.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}").replace(/\n/g, "\\par\n")}}`;
      blobDownload(new Blob([rtf], { type: "application/rtf" }), `stellify-${slugify(page2)}.rtf`);
    }
  }
  async function downloadAsPptx(slides, title, page2) {
    try {
      if (!window.PptxGenJS) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js";
          s.onload = res;
          s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      const pptx = new window.PptxGenJS();
      pptx.layout = "LAYOUT_16x9";
      pptx.theme = { headFontFace: "Calibri", bodyFontFace: "Calibri" };
      const ts = pptx.addSlide();
      ts.background = { color: "0F172A" };
      ts.addText(title || "Stellify", { x: 0.5, y: 1.5, w: 9, h: 1.5, fontSize: 36, bold: true, color: "FFFFFF", align: "center" });
      ts.addText("Erstellt mit Stellify \xB7 stellify.ch", { x: 0.5, y: 3.5, w: 9, h: 0.5, fontSize: 14, color: "10b981", align: "center" });
      (slides || []).forEach((sl) => {
        const s = pptx.addSlide();
        s.background = { color: "FFFFFF" };
        s.addText(sl.title || "", { x: 0.5, y: 0.4, w: 9, h: 0.8, fontSize: 22, bold: true, color: "0F172A" });
        s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.2, w: 9, h: 0.04, fill: { color: "10B981" } });
        const content = (sl.content || []).map((c) => `\u2022 ${c}`).join("\n");
        s.addText(content, { x: 0.5, y: 1.4, w: 9, h: 4.5, fontSize: 14, color: "334155", valign: "top" });
        if (sl.speaker_note) s.addNotes(sl.speaker_note);
      });
      await pptx.writeFile({ fileName: `stellify-${slugify(page2)}.pptx` });
    } catch (e) {
      console.error("PPTX error:", e);
      alert("PowerPoint-Export fehlgeschlagen. Bitte Inhalt kopieren.");
    }
  }
  async function downloadAsExcel(rows, headers, sheetName, page2) {
    try {
      const XLSX = window.XLSX;
      if (!XLSX) {
        console.error("SheetJS nicht geladen");
        return;
      }
      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = headers.map(() => ({ wch: 20 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName || "Stellify");
      XLSX.writeFile(wb, `stellify-${slugify(page2)}.xlsx`);
    } catch (e) {
      console.error("Excel error:", e);
      const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
      blobDownload(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `stellify-${slugify(page2)}.csv`);
    }
  }
  function downloadTxt(text, page2) {
    blobDownload(new Blob([text], { type: "text/plain;charset=utf-8" }), `stellify-${slugify(page2)}.txt`);
  }
  function dlExcelFromText(text, page2) {
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    const rows = lines.map((l) => [l.trim()]);
    downloadAsExcel(rows, ["Inhalt"], page2, page2);
  }
  function dlPptxFromText(text, title, page2) {
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    const size = 6;
    const slides = [];
    for (let i = 0; i < lines.length; i += size) {
      slides.push({ slide: Math.floor(i / size) + 1, title: title || "Folie " + (Math.floor(i / size) + 1), content: lines.slice(i, i + size), speaker_note: "" });
    }
    if (!slides.length) slides.push({ slide: 1, title: title || page2, content: [text.slice(0, 200)], speaker_note: "" });
    downloadAsPptx(slides, title || page2, page2);
  }
  var LANGS = ["de", "en", "fr", "it"];
  var FLAGS = { de: "DE", en: "EN", fr: "FR", it: "IT" };
  function GenericToolPage({ tool, lang, pro, setPw, setPage, yearly, C: C2, proUsage, setProUsage }) {
    const L = (d, e, f, i) => ({ de: d, en: e, fr: f, it: i })[lang];
    const [vals, setVals] = useState({});
    const [result, setResult] = useState("");
    const [streaming, setStreaming] = useState(false);
    const [err, setErr] = useState("");
    const [copied, setCopied] = useState(false);
    const [docFile, setDocFile] = useState(null);
    const [docText, setDocText] = useState("");
    const [docLoading, setDocLoading] = useState(false);
    const stripeLink = () => yearly ? C2.stripeYearly : C2.stripeMonthly;
    const nextReset = () => {
      const d = /* @__PURE__ */ new Date();
      d.setMonth(d.getMonth() + 1);
      d.setDate(1);
      return d.toLocaleDateString(lang === "de" ? "de-CH" : lang === "fr" ? "fr-CH" : lang === "it" ? "it-CH" : "en-CH", { day: "numeric", month: "long", year: "numeric" });
    };
    const limitHit = pro && proUsage >= C2.PRO_LIMIT;
    const setV = (k, v) => setVals((p) => ({ ...p, [k]: v }));
    const canRun = tool.inputs.filter((i) => i.req).every((i) => (vals[i.k] || "").trim()) || !!docFile;
    const handleDoc = async (file) => {
      if (!file) return;
      setDocLoading(true);
      setErr("");
      try {
        if (file.name.endsWith(".docx")) {
          const mammoth = window.mammoth;
          if (!mammoth) {
            console.error("Mammoth nicht geladen");
            return;
          }
          const ab = await file.arrayBuffer();
          const res = await mammoth.extractRawText({ arrayBuffer: ab });
          setDocText(res.value);
          setDocFile({ name: file.name, type: "text", text: res.value });
        } else {
          setDocFile({ name: file.name, type: file.type, raw: file });
        }
      } catch (e) {
        setErr(L("Fehler beim Lesen der Datei.", "Error reading file.", "Erreur lors de la lecture.", "Errore durante la lettura."));
      } finally {
        setDocLoading(false);
      }
    };
    const run = async () => {
      if (!pro) {
        setPw(true);
        return;
      }
      if (limitHit) return;
      setStreaming(true);
      setResult("");
      setErr("");
      try {
        const inputSummary = Object.entries(vals).map(([k, v]) => `${k}: ${v}`).join("\n");
        const docContext = docFile?.type === "text" ? `

Dokument-Inhalt:
${docFile.text}` : "";
        const prompt = tool.prompt(vals, lang) + docContext;
        if (docFile && docFile.type !== "text") {
          const full = await callAIWithFileStreaming(docFile.raw, prompt, (chunk) => setResult(chunk));
        } else {
          await streamAI(prompt, (chunk) => setResult(chunk), null, tool.id);
        }
        incPro();
        if (setProUsage) setProUsage(getProCount());
      } catch (e) {
        setErr(e.message);
      } finally {
        setStreaming(false);
      }
    };
    const hdrColor = tool.color || "#10b981";
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: `linear-gradient(135deg,${hdrColor}dd,${hdrColor})`, padding: "48px 28px 34px", textAlign: "center" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontFamily: "var(--hd)", fontSize: 32, fontWeight: 800, color: "white", marginBottom: 7, letterSpacing: "-1px" }, children: [
          tool.ico,
          " ",
          tool.t[lang]
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 14, color: "rgba(255,255,255,.5)" }, children: tool.sub[lang] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { maxWidth: 740, margin: "0 auto", padding: "36px 28px 80px" }, children: [
        err && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "err", children: [
          "\u26A0\uFE0F ",
          err
        ] }),
        limitHit && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)", borderRadius: 12, padding: "16px 20px", marginBottom: 16, textAlign: "center" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 24, marginBottom: 6 }, children: "\u23F3" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 16, fontWeight: 800, marginBottom: 4 }, children: L("Monatliches Kontingent aufgebraucht", "Monthly quota used up", "Quota mensuel \xE9puis\xE9", "Quota mensile esaurito") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 13, color: "var(--mu)" }, children: [
            L("N\xE4chster Reset:", "Next reset:", "Prochaine r\xE9initialisation:", "Prossimo reset:"),
            " ",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: nextReset() })
          ] })
        ] }),
        !pro ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "linear-gradient(135deg,#f0fdf9,#ecfdf5)", border: "1.5px solid rgba(16,185,129,.2)", borderRadius: 18, padding: "20px 22px", marginBottom: 14 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { background: "var(--em)", color: "white", borderRadius: 7, padding: "2px 10px", fontSize: 11, fontWeight: 700 }, children: [
                "\u2726 ",
                L("Beispiel-Output", "Example output", "Exemple de r\xE9sultat", "Esempio output")
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: "var(--mu)" }, children: L("So sieht dein Ergebnis aus", "This is what your result looks like", "Voici votre r\xE9sultat", "Ecco il tuo risultato") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { background: "white", borderRadius: 12, padding: "16px", border: "1px solid rgba(16,185,129,.12)", fontSize: 13, color: "var(--ink)", lineHeight: 1.85, whiteSpace: "pre-wrap", maxHeight: 260, overflow: "hidden", maskImage: "linear-gradient(to bottom,black 55%,transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom,black 55%,transparent 100%)" }, children: tool.id === "li2job" ? L(
              `\u270D\uFE0F MOTIVATIONSSCHREIBEN

Sehr geehrte Damen und Herren,

als ETH-Absolvent mit 4 Jahren Erfahrung in Python und React bewerbe ich mich mit grossem Interesse auf die Position als Senior Developer bei Google Z\xFCrich. Meine Expertise in skalierbaren Cloud-Architekturen (GCP, AWS) deckt sich direkt mit Ihren Anforderungen.

\u{1F4C4} LEBENSLAUF-HIGHLIGHTS
\u2022 ETH Z\xFCrich \u2013 B.Sc. Informatik (2020), Note: 5.4
\u2022 4 Jahre Full-Stack (Python, React, Node.js, GCP)
\u2022 Projektleitung f\xFCr 3 Enterprise-Anwendungen (50k+ Nutzer)
\u2022 Open-Source-Contributor: 800+ GitHub Stars

\u{1F4A1} DEINE 3 ST\xC4RKSTEN ARGUMENTE
1. ETH-Abschluss \u2192 Google priorisiert Top-Hochschulen weltweit
2. Python + GCP \u2192 exakt die gesuchte Tech-Stack-Kombination
3. Schweizer Arbeitserlaubnis \u2192 kein Visum, sofort verf\xFCgbar`,
              `\u270D\uFE0F COVER LETTER

Dear Hiring Team,

As an ETH graduate with 4 years of Python and React experience, I'm excited to apply for the Senior Developer position at Google Z\xFCrich. My expertise in scalable cloud architectures (GCP, AWS) directly matches your requirements.

\u{1F4C4} CV HIGHLIGHTS
\u2022 ETH Z\xFCrich \u2013 B.Sc. Computer Science (2020), GPA: 5.4
\u2022 4 years Full-Stack (Python, React, Node.js, GCP)
\u2022 Led 3 enterprise applications (50k+ users)
\u2022 Open-Source contributor: 800+ GitHub Stars

\u{1F4A1} YOUR 3 STRONGEST ARGUMENTS
1. ETH degree \u2192 Google prioritizes top universities worldwide
2. Python + GCP \u2192 exactly the tech stack combination sought
3. Swiss work permit \u2192 no visa needed, immediately available`,
              `\u270D\uFE0F LETTRE DE MOTIVATION

Madame, Monsieur,

Dipl\xF4m\xE9 de l'ETH avec 4 ans d'exp\xE9rience Python et React, je postule avec enthousiasme au poste de Senior Developer chez Google Z\xFCrich. Mon expertise en architectures cloud (GCP, AWS) correspond directement \xE0 vos besoins.

\u{1F4C4} POINTS FORTS CV
\u2022 ETH Zurich \u2013 B.Sc. Informatique (2020), Note: 5.4
\u2022 4 ans Full-Stack (Python, React, Node.js, GCP)
\u2022 Conduite de 3 applications enterprise (50k+ utilisateurs)

\u{1F4A1} VOS 3 MEILLEURS ARGUMENTS
1. Dipl\xF4me ETH \u2192 Google priorise les meilleures universit\xE9s
2. Python + GCP \u2192 exactement la stack technique recherch\xE9e
3. Permis de travail suisse \u2192 disponible imm\xE9diatement`,
              `\u270D\uFE0F LETTERA DI MOTIVAZIONE

Gentili Signori,

Come laureato ETH con 4 anni di esperienza Python e React, mi candido con entusiasmo per la posizione di Senior Developer presso Google Z\xFCrich.

\u{1F4C4} PUNTI DI FORZA CV
\u2022 ETH Zurigo \u2013 B.Sc. Informatica (2020), Voto: 5.4
\u2022 4 anni Full-Stack (Python, React, Node.js, GCP)
\u2022 Gestione di 3 applicazioni enterprise (50k+ utenti)

\u{1F4A1} I TUOI 3 ARGOMENTI PI\xD9 FORTI
1. Laurea ETH \u2192 Google priorizza le migliori universit\xE0
2. Python + GCP \u2192 esattamente la tech stack cercata
3. Permesso di lavoro svizzero \u2192 disponibile subito`
            ) : L(
              `\u26A1 KI-Ergebnis \u2013 Beispiel

Dies ist ein Beispiel-Output f\xFCr dieses Tool.
Mit Pro erh\xE4ltst du dein pers\xF6nliches, auf dich
zugeschnittenes Ergebnis in Sekunden.

\u2713 Professionell formuliert
\u2713 Auf deine Eingaben zugeschnitten  
\u2713 Sofort kopierbar & verwendbar`,
              `\u26A1 AI result \u2013 Example

This is a sample output for this tool.
With Pro you get your personal, tailored
result in seconds.

\u2713 Professionally written
\u2713 Tailored to your inputs
\u2713 Ready to copy & use`,
              `\u26A1 R\xE9sultat IA \u2013 Exemple

Ceci est un exemple de r\xE9sultat pour cet outil.
Avec Pro vous obtenez votre r\xE9sultat personnel
en quelques secondes.`,
              `\u26A1 Risultato IA \u2013 Esempio

Questo \xE8 un esempio di output per questo strumento.
Con Pro ottieni il tuo risultato personale in secondi.`
            ) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", style: { textAlign: "center", padding: "24px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 32, marginBottom: 8 }, children: "\u{1F680}" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 18, fontWeight: 800, marginBottom: 6 }, children: L("Bereit f\xFCr dein Ergebnis?", "Ready for your result?", "Pr\xEAt pour votre r\xE9sultat?", "Pronto per il tuo risultato?") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { fontSize: 13, color: "var(--mu)", marginBottom: 18, lineHeight: 1.7 }, children: L(`Pro \u2013 CHF ${C2.priceM}/Mo. \xB7 Alle Tools \xB7 Jederzeit k\xFCndbar`, `Pro \u2013 CHF ${C2.priceM}/mo \xB7 All tools \xB7 Cancel anytime`, `Pro \u2013 CHF ${C2.priceM}/mois \xB7 Tous les outils \xB7 R\xE9siliable`, `Pro \u2013 CHF ${C2.priceM}/mese \xB7 Tutti gli strumenti`) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em", style: { width: "100%", justifyContent: "center" }, onClick: () => window.open(stripeLink(), "_blank"), children: L("Jetzt Pro werden & starten \u2192", "Become Pro & start \u2192", "Devenir Pro & commencer \u2192", "Diventa Pro & inizia \u2192") })
          ] })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginBottom: 16 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--mu)", marginBottom: 8 }, children: L("\u{1F4CE} Dokument hochladen (optional)", "\u{1F4CE} Upload document (optional)", "\u{1F4CE} Joindre un document (optionnel)", "\u{1F4CE} Carica documento (opzionale)") }),
              docFile ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 18 }, children: docFile.type === "text" ? "\u{1F4C4}" : docFile.type?.startsWith("image/") ? "\u{1F5BC}\uFE0F" : "\u{1F4C4}" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontWeight: 600, fontSize: 13, color: "#15803d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: docFile.name }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: "#16a34a" }, children: docFile.type === "text" ? L("Word-Dokument \u2013 Text extrahiert \u2713", "Word document \u2013 text extracted \u2713", "Document Word \u2013 texte extrait \u2713", "Documento Word \u2013 testo estratto \u2713") : L("Bereit zur Analyse \u2713", "Ready for analysis \u2713", "Pr\xEAt pour l'analyse \u2713", "Pronto per l'analisi \u2713") })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => {
                  setDocFile(null);
                  setDocText("");
                }, style: { background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#6b7280", flexShrink: 0 }, children: "\u2715" })
              ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { display: "block", cursor: "pointer" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "div",
                  {
                    style: { border: "2px dashed rgba(16,185,129,.3)", borderRadius: 12, padding: "16px", textAlign: "center", background: "rgba(16,185,129,.02)", transition: "all .2s" },
                    onDragOver: (e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = "var(--em)";
                      e.currentTarget.style.background = "var(--em3)";
                    },
                    onDragLeave: (e) => {
                      e.currentTarget.style.borderColor = "rgba(16,185,129,.3)";
                      e.currentTarget.style.background = "rgba(16,185,129,.02)";
                    },
                    onDrop: (e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = "rgba(16,185,129,.3)";
                      e.currentTarget.style.background = "rgba(16,185,129,.02)";
                      const f = e.dataTransfer.files[0];
                      if (f) handleDoc(f);
                    },
                    children: docLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 13, color: "var(--em)" }, children: L("Lese Datei\u2026", "Reading file\u2026", "Lecture\u2026", "Lettura\u2026") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 24, marginBottom: 4 }, children: "\u{1F4CE}" }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 13, fontWeight: 600, color: "var(--mu)", marginBottom: 2 }, children: L("PDF, Word oder Bild hier ablegen", "Drop PDF, Word or image here", "D\xE9posez PDF, Word ou image ici", "Rilascia PDF, Word o immagine qui") }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: "rgba(11,11,18,.3)" }, children: L("oder klicken zum Ausw\xE4hlen \xB7 PDF, .docx, JPG, PNG", "or click to select \xB7 PDF, .docx, JPG, PNG", "ou cliquer pour s\xE9lectionner \xB7 PDF, .docx, JPG, PNG", "o clicca per selezionare \xB7 PDF, .docx, JPG, PNG") })
                    ] })
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "file", accept: ".pdf,.docx,.doc,image/*", style: { display: "none" }, onChange: (e) => {
                  const f = e.target.files?.[0];
                  if (f) handleDoc(f);
                } })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { borderTop: "1px solid var(--bo)", paddingTop: 14 }, children: tool.inputs.map((inp) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
                inp.lbl[lang],
                inp.req && " *"
              ] }),
              inp.type === "textarea" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: vals[inp.k] || "", onChange: (e) => setV(inp.k, e.target.value), placeholder: inp.ph?.[lang] || "", style: { minHeight: inp.tall ? 140 : 80 } }) : inp.type === "select" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: vals[inp.k] || "", onChange: (e) => setV(inp.k, e.target.value), children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u2013" }),
                (inp.opts?.[lang] || []).map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: o }, o))
              ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: vals[inp.k] || "", onChange: (e) => setV(inp.k, e.target.value), placeholder: inp.ph?.[lang] || "" })
            ] }, inp.k)) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em", onClick: run, disabled: streaming || !canRun && !docFile, style: { background: hdrColor, marginTop: 14 }, children: streaming ? L("Erstelle\u2026", "Creating\u2026", "Cr\xE9ation\u2026", "Creando\u2026") : `${tool.ico} ${L("Erstellen", "Create", "Cr\xE9er", "Crea")}` })
          ] }),
          (streaming || result) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", style: { marginTop: 14 }, children: [
            streaming && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 9, marginBottom: 12, color: hdrColor, fontWeight: 600, fontSize: 13 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 8, height: 8, background: hdrColor, borderRadius: "50%", animation: "blink .8s step-end infinite" } }),
              L("KI schreibt\u2026", "AI writing\u2026", "L'IA r\xE9dige\u2026", "L'IA scrive\u2026")
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 7, justifyContent: "flex-end", marginBottom: 10, flexWrap: "wrap" }, children: [
              copied && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ok", style: { margin: 0, padding: "4px 11px" }, children: [
                "\u2713 ",
                L("Kopiert!", "Copied!", "Copi\xE9!", "Copiato!")
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "btn b-outd b-sm", onClick: () => {
                navigator.clipboard.writeText(result);
                setCopied(true);
                setTimeout(() => setCopied(false), 2e3);
              }, children: [
                "\u{1F4CB} ",
                L("Kopieren", "Copy", "Copier", "Copia")
              ] }),
              !streaming && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => downloadTxt(result, page), children: "\u{1F4C4} TXT" }),
              !streaming && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => downloadHtmlAsPdf(result, page), children: "\u{1F4D5} PDF" }),
              !streaming && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => downloadAsWord(result, page), children: "\u{1F4D8} Word" }),
              !streaming && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => dlExcelFromText(result, page), children: "\u{1F4CA} Excel" }),
              !streaming && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => dlPptxFromText(result, tool.t?.[lang] || page, page), children: "\u{1F4FD}\uFE0F PPTX" }),
              !streaming && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "btn b-outd b-sm", onClick: () => {
                setResult("");
                setVals({});
              }, children: [
                "\u{1F504} ",
                L("Neu", "New", "Nouveau", "Nuovo")
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "r-doc", children: [
              result,
              streaming && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "cursor" })
            ] })
          ] })
        ] })
      ] })
    ] });
  }
  function AppDemo({ lang }) {
    const [open, setOpen] = useState(false);
    const L = (d, e, f, i) => ({ de: d, en: e, fr: f, it: i })[lang] || d;
    const example = L(
      `Sehr geehrte Damen und Herren

Mit grossem Interesse habe ich Ihre Ausschreibung f\xFCr die Position als Product Manager bei Migros Z\xFCrich gelesen. Als erfahrener Produktmanager mit f\xFCnf Jahren FMCG-Erfahrung bringe ich strategisches Denken und operative St\xE4rke mit.

Meine Mehrsprachigkeit (DE/EN/FR) erm\xF6glicht reibungslose Zusammenarbeit in der ganzen Schweiz. Besonders reizt mich Ihr Engagement f\xFCr Nachhaltigkeit.

Freundliche Gr\xFCsse, [Ihr Name]`,
      `Dear Sir or Madam,

I read your advertisement for the Product Manager position at Migros Z\xFCrich with great interest. With five years of FMCG experience I bring strategic thinking and operational strength.

My multilingual skills (DE/EN/FR) enable seamless collaboration across Switzerland.

Kind regards, [Your Name]`,
      `Madame, Monsieur,

Votre offre pour le poste de Product Manager chez Migros m'a beaucoup int\xE9ress\xE9. Fort de 5 ans d'exp\xE9rience FMCG, j'apporte vision strat\xE9gique et rigueur op\xE9rationnelle.

Cordialement, [Votre nom]`,
      `Gentili Signori,

Il vostro annuncio per Product Manager a Migros mi ha molto interessato. Con 5 anni di esperienza FMCG porto pensiero strategico e forza operativa.

Cordiali saluti, [Il suo nome]`
    );
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginBottom: 16, borderRadius: 16, overflow: "hidden", border: "1.5px solid rgba(16,185,129,.2)" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => setOpen((o) => !o), style: { width: "100%", background: "linear-gradient(135deg,#f0fdf9,#ecfdf5)", border: "none", padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { background: "var(--em)", color: "white", borderRadius: 7, padding: "2px 9px", fontSize: 11, fontWeight: 700, flexShrink: 0 }, children: [
            "\u2726 ",
            L("Beispiel-Output", "Example output", "Exemple de r\xE9sultat", "Esempio output")
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: "var(--mu)", textAlign: "left" }, children: L("So sieht dein fertiges Motivationsschreiben aus", "This is what your cover letter looks like", "Voici votre lettre de motivation", "Ecco la tua lettera") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 16, color: "var(--em)", flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }, children: "\u25BE" })
      ] }),
      open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "white", padding: "16px 18px", borderTop: "1px solid rgba(16,185,129,.1)" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }, children: [{ ico: "\u270D\uFE0F", t: L("Motivationsschreiben", "Cover letter", "Lettre de motivation", "Lettera") }, { ico: "\u{1F4C4}", t: L("Lebenslauf-Struktur", "CV structure", "Structure CV", "Struttura CV") }, { ico: "\u{1F4A1}", t: L("3 Killer-Argumente", "3 key arguments", "3 arguments cl\xE9s", "3 argomenti") }].map((x, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--mu)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: x.ico }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: 600, color: "var(--tx)" }, children: x.t })
        ] }, i)) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { background: "#f8fffe", border: "1px solid rgba(16,185,129,.15)", borderRadius: 12, padding: "14px 16px", fontSize: 13, color: "var(--ink)", lineHeight: 1.85, whiteSpace: "pre-wrap", maxHeight: 220, overflow: "hidden", maskImage: "linear-gradient(to bottom,black 60%,transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom,black 60%,transparent 100%)" }, children: example }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 10, fontSize: 11, color: "var(--em)", fontWeight: 600 }, children: [
          "\u26A1 ",
          L("Dein Ergebnis ist auf deine Stelle & dein Profil zugeschnitten \u2013 nicht generisch.", "Your result is tailored to your job & profile \u2013 not generic.", "Votre r\xE9sultat est adapt\xE9 \xE0 votre poste & profil.", "Il tuo risultato \xE8 personalizzato per te.")
        ] })
      ] })
    ] });
  }
  function DemoSection({ lang, navTo }) {
    const [demoTab, setDemoTab] = useState(0);
    const L = (d, e, f, i) => ({ de: d, en: e, fr: f, it: i })[lang] || d;
    const demos = [
      {
        id: "app",
        ico: "\u270D\uFE0F",
        label: L("Bewerbung", "Application", "Candidature", "Candidatura"),
        badge: L("1\xD7 Gratis", "1\xD7 Free", "1\xD7 Gratuit", "1\xD7 Gratis"),
        badgeCol: "#10b981",
        input: [{ l: L("Stelle", "Position", "Poste", "Posizione"), v: "Product Manager, Migros Z\xFCrich" }, { l: L("Erfahrung", "Experience", "Exp\xE9rience", "Esperienza"), v: L("5 Jahre PM, FMCG, DE/EN/FR", "5 years PM, FMCG, DE/EN/FR", "5 ans PM, FMCG, DE/EN/FR", "5 anni PM, FMCG, DE/EN/FR") }],
        output: L(
          `Sehr geehrte Damen und Herren

Mit grossem Interesse habe ich Ihre Ausschreibung f\xFCr die Position als Product Manager bei Migros Z\xFCrich gelesen. Als erfahrener Produktmanager mit f\xFCnf Jahren Branchenerfahrung im FMCG-Bereich bringe ich genau die Kombination aus strategischem Denken und operativer Umsetzungsst\xE4rke mit, die diese Rolle erfordert.

Meine Mehrsprachigkeit in Deutsch, Englisch und Franz\xF6sisch erm\xF6glicht mir eine reibungslose Zusammenarbeit in der gesamten Schweiz.

Ich freue mich auf ein pers\xF6nliches Gespr\xE4ch.
Freundliche Gr\xFCsse, [Ihr Name]`,
          `Dear Sir or Madam,

I read your advertisement for the Product Manager position at Migros Z\xFCrich with great interest. With five years of FMCG experience, I bring the strategic thinking and operational execution this role requires.

My multilingual skills (German, English, French) enable seamless collaboration across Switzerland.

Kind regards, [Your Name]`,
          `Madame, Monsieur,

Votre offre pour le poste de Product Manager chez Migros Z\xFCrich a retenu toute mon attention. Fort de cinq ans d'exp\xE9rience FMCG, j'apporte la combinaison de r\xE9flexion strat\xE9gique et d'ex\xE9cution op\xE9rationnelle que ce r\xF4le exige.

Cordialement, [Votre nom]`,
          `Gentili Signore e Signori,

Ho letto con grande interesse il vostro annuncio per la posizione di Product Manager presso Migros Z\xFCrich. Con cinque anni di esperienza nel settore FMCG, porto esattamente la combinazione di pensiero strategico ed esecuzione operativa.

Cordiali saluti, [Il suo nome]`
        )
      },
      {
        id: "li2job",
        ico: "\u{1F517}",
        label: "LinkedIn \u2192 " + L("Bewerbung", "Application", "Candidature", "Candidatura"),
        badge: "PRO",
        badgeCol: "#0a66c2",
        input: [{ l: "LinkedIn-Profil", v: L("Software Engineer, 4 J. Erfahrung, ETH Z\xFCrich, Python/React", "Software Engineer, 4y exp, ETH Z\xFCrich, Python/React", "Ing\xE9nieur logiciel, 4 ans exp, ETH Zurich", "Ingegnere SW, 4 anni, ETH Zurigo") }, { l: L("Stelle", "Job posting", "Offre", "Offerta"), v: "Senior Dev, Google Z\xFCrich" }],
        output: L(
          `\u270D\uFE0F MOTIVATIONSSCHREIBEN

Sehr geehrte Damen und Herren,
als ETH-Absolvent mit 4 Jahren Erfahrung in Python und React bin ich begeistert von der Senior Developer Position bei Google Z\xFCrich...

\u{1F4C4} LEBENSLAUF-HIGHLIGHTS
\u2022 ETH Z\xFCrich \u2013 B.Sc. Informatik (2020)
\u2022 4 Jahre Full-Stack-Entwicklung (Python, React, Node.js)
\u2022 Projektleitung f\xFCr 3 Enterprise-Anwendungen

\u{1F4A1} DEINE 3 ST\xC4RKSTEN ARGUMENTE
1. ETH-Abschluss \u2192 Google legt grossen Wert auf Top-Hochschulen
2. Python-Expertise \u2192 Kernsprache bei Google
3. Schweizer Arbeitsmarkterfahrung \u2192 kein Visum n\xF6tig`,
          `\u270D\uFE0F COVER LETTER

Dear Hiring Team,
As an ETH graduate with 4 years of Python and React experience, I'm excited about the Senior Developer role at Google Z\xFCrich...

\u{1F4C4} CV HIGHLIGHTS
\u2022 ETH Z\xFCrich \u2013 B.Sc. Computer Science (2020)
\u2022 4 years Full-Stack (Python, React, Node.js)
\u2022 Led 3 enterprise application projects

\u{1F4A1} YOUR 3 STRONGEST ARGUMENTS
1. ETH degree \u2192 Google values top universities
2. Python expertise \u2192 Google's core language
3. Swiss work experience \u2192 no visa required`,
          `\u270D\uFE0F LETTRE DE MOTIVATION

Madame, Monsieur,
En tant que dipl\xF4m\xE9 de l'ETH avec 4 ans d'exp\xE9rience Python et React, je suis enthousiaste pour ce poste...

\u{1F4C4} POINTS FORTS CV
\u2022 ETH Zurich \u2013 B.Sc. Informatique (2020)
\u2022 4 ans Full-Stack (Python, React, Node.js)

\u{1F4A1} VOS 3 MEILLEURS ARGUMENTS
1. Dipl\xF4me ETH \u2192 Google valorise les grandes \xE9coles
2. Expertise Python \u2192 langage cl\xE9 chez Google
3. Exp\xE9rience suisse \u2192 pas de visa requis`,
          `\u270D\uFE0F LETTERA DI MOTIVAZIONE

Gentili Signori,
Come laureato all'ETH con 4 anni di esperienza in Python e React, sono entusiasta di questa posizione...

\u{1F4C4} PUNTI DI FORZA CV
\u2022 ETH Zurigo \u2013 B.Sc. Informatica (2020)
\u2022 4 anni Full-Stack (Python, React, Node.js)

\u{1F4A1} I TUOI 3 ARGOMENTI PI\xD9 FORTI
1. Laurea ETH \u2192 Google valorizza le top universit\xE0
2. Competenza Python \u2192 linguaggio chiave di Google
3. Esperienza svizzera \u2192 nessun visto necessario`
        )
      },
      {
        id: "linkedin",
        ico: "\u{1F4BC}",
        label: L("LinkedIn Optimierung", "LinkedIn Optimization", "Optimisation LinkedIn", "Ottimizzazione LinkedIn"),
        badge: "PRO",
        badgeCol: "#3b82f6",
        input: [{ l: L("Aktuelle Headline", "Current headline", "Headline actuelle", "Headline attuale"), v: L("Software Engineer at Startup Z\xFCrich", "Software Engineer at Startup Z\xFCrich", "Software Engineer chez Startup Zurich", "Software Engineer presso Startup Zurigo") }, { l: L("Zielposition", "Target role", "Poste cible", "Posizione target"), v: L("Senior Dev bei Google / Microsoft", "Senior Dev at Google / Microsoft", "Senior Dev chez Google / Microsoft", "Senior Dev presso Google / Microsoft") }],
        output: L(
          `\u{1F535} OPTIMIERTE HEADLINE
\xABSenior Software Engineer | Python & React | Scalable Systems | ETH Z\xFCrich\xBB
\u2192 +340% mehr Recruiter-Klicks durch Keywords

\u{1F4DD} ABOUT-SECTION (Vorschlag)
Ich entwickle skalierbare Web-Applikationen mit Python und React. Mit 4 Jahren Erfahrung und ETH-Abschluss helfe ich Teams, komplexe Probleme elegant zu l\xF6sen.

\u{1F3F7}\uFE0F TOP-SKILLS F\xDCR RECRUITER
Python \xB7 React \xB7 Node.js \xB7 Cloud Architecture \xB7 Agile \xB7 System Design \xB7 TypeScript

\u{1F4A1} 3 PROFIL-TIPPS
1. Profilbild professionell \u2192 21\xD7 mehr Views
2. \xABOpen to Work\xBB aktivieren (nur f\xFCr Recruiter sichtbar)
3. 3 Empfehlungen anfragen \u2013 boosten Glaubw\xFCrdigkeit`,
          `\u{1F535} OPTIMIZED HEADLINE
\xABSenior Software Engineer | Python & React | Scalable Systems | ETH Z\xFCrich\xBB
\u2192 +340% more recruiter clicks through keywords

\u{1F4DD} ABOUT SECTION
I build scalable web applications with Python and React. With 4 years of experience and an ETH degree, I help teams solve complex problems elegantly.

\u{1F3F7}\uFE0F TOP SKILLS FOR RECRUITERS
Python \xB7 React \xB7 Node.js \xB7 Cloud Architecture \xB7 Agile \xB7 System Design \xB7 TypeScript

\u{1F4A1} 3 PROFILE TIPS
1. Professional headshot \u2192 21\xD7 more views
2. Activate \xABOpen to Work\xBB (only visible to recruiters)
3. Request 3 recommendations \u2013 boosts credibility`,
          `\u{1F535} HEADLINE OPTIMIS\xC9E
\xABSenior Software Engineer | Python & React | Syst\xE8mes \xC9volutifs | ETH Zurich\xBB
\u2192 +340% de clics recruteurs gr\xE2ce aux mots-cl\xE9s

\u{1F4DD} SECTION \xC0 PROPOS
Je d\xE9veloppe des applications web \xE9volutives avec Python et React. Dipl\xF4m\xE9 de l'ETH, j'aide les \xE9quipes \xE0 r\xE9soudre des probl\xE8mes complexes \xE9l\xE9gamment.

\u{1F3F7}\uFE0F TOP COMP\xC9TENCES
Python \xB7 React \xB7 Node.js \xB7 Cloud \xB7 Agile \xB7 System Design

\u{1F4A1} 3 CONSEILS PROFIL
1. Photo professionnelle \u2192 21\xD7 plus de vues
2. Activer \xABOuvert aux opportunit\xE9s\xBB (visible uniquement aux recruteurs)
3. Demander 3 recommandations`,
          `\u{1F535} HEADLINE OTTIMIZZATA
\xABSenior Software Engineer | Python & React | Sistemi Scalabili | ETH Zurigo\xBB
\u2192 +340% pi\xF9 clic dai recruiter grazie alle keyword

\u{1F4DD} SEZIONE ABOUT
Sviluppo applicazioni web scalabili con Python e React. Con 4 anni di esperienza e laurea ETH, aiuto i team a risolvere problemi complessi.

\u{1F3F7}\uFE0F TOP SKILL PER RECRUITER
Python \xB7 React \xB7 Node.js \xB7 Cloud \xB7 Agile \xB7 System Design

\u{1F4A1} 3 CONSIGLI PROFILO
1. Foto professionale \u2192 21\xD7 pi\xF9 visualizzazioni
2. Attivare \xABAperto a opportunit\xE0\xBB
3. Richiedere 3 raccomandazioni`
        )
      },
      {
        label: "ATS-Check",
        badge: "PRO",
        badgeCol: "#3b82f6",
        input: [{ l: L("Stelle", "Position", "Poste", "Posizione"), v: "Software Engineer, Google Z\xFCrich" }, { l: "CV", v: L("Kurzer Lebenslauf ohne Keywords", "Short CV without keywords", "CV court sans mots-cl\xE9s", "CV breve senza parole chiave") }],
        output: L(
          `ATS-Score: 62/100 \u26A0\uFE0F

\u2713 Was gut ist:
  Berufsbezeichnung stimmt \xFCberein
  Hochschulabschluss vorhanden

\u2717 Was fehlt \u2013 kritisch:
  \xABPython\xBB fehlt (7\xD7 im Inserat)
  \xABAgile/Scrum\xBB fehlt (5\xD7 erw\xE4hnt)
  \xABCloud GCP/AWS\xBB fehlt (4\xD7 erw\xE4hnt)
  Keine messbaren Erfolge (Zahlen, %)

3 Verbesserungen:
1. \xABPython\xBB in Skills einf\xFCgen
2. \xABScrum\xBB und \xABAgile\xBB erg\xE4nzen
3. \xABLadezeit um 40% optimiert\xBB statt \xABPerformance verbessert\xBB

\u2192 Mit Anpassungen: Score 84/100 \u2705`,
          `ATS Score: 62/100 \u26A0\uFE0F

\u2713 What's good:
  Job title matches
  University degree present

\u2717 What's missing \u2013 critical:
  \xABPython\xBB missing (7\xD7 in posting)
  \xABAgile/Scrum\xBB missing (5\xD7 mentioned)
  \xABCloud GCP/AWS\xBB missing (4\xD7 mentioned)
  No measurable achievements

3 improvements:
1. Add \xABPython\xBB to skills
2. Include \xABScrum\xBB and \xABAgile\xBB
3. Write \xABLoad time reduced by 40%\xBB

\u2192 With adjustments: Score 84/100 \u2705`,
          `Score ATS: 62/100 \u26A0\uFE0F

\u2713 Ce qui est bien:
  Titre de poste correspond
  Dipl\xF4me universitaire pr\xE9sent

\u2717 Ce qui manque:
  \xABPython\xBB absent (7\xD7 dans l'offre)
  \xABAgile/Scrum\xBB absent (5\xD7 mentionn\xE9)
  Pas de r\xE9alisations mesurables

3 am\xE9liorations:
1. Ajouter \xABPython\xBB aux comp\xE9tences
2. Inclure \xABScrum\xBB et \xABAgile\xBB
3. \xC9crire \xABTemps de chargement r\xE9duit de 40%\xBB

\u2192 Avec ajustements: Score 84/100 \u2705`,
          `Score ATS: 62/100 \u26A0\uFE0F

\u2713 Cosa va bene:
  Titolo corrisponde
  Laurea presente

\u2717 Cosa manca:
  \xABPython\xBB mancante (7\xD7 nell'annuncio)
  \xABAgile/Scrum\xBB mancante
  Nessun risultato misurabile

3 miglioramenti:
1. Aggiungere \xABPython\xBB alle competenze
2. Includere \xABScrum\xBB e \xABAgile\xBB
3. Scrivere \xABTempo caricamento ridotto 40%\xBB

\u2192 Con adeguamenti: Score 84/100 \u2705`
        )
      },
      {
        id: "zeugnis",
        ico: "\u{1F4DC}",
        label: L("Zeugnis-Analyse", "Reference", "Analyse certificat", "Analisi certificato"),
        badge: "PRO",
        badgeCol: "#f59e0b",
        input: [{ l: L("Zeugnis-Auszug", "Reference extract", "Extrait certificat", "Estratto certificato"), v: L("\xABHerr M\xFCller erledigte die Aufgaben zu unserer Zufriedenheit und zeigte stets Verst\xE4ndnis f\xFCr Kollegen.\xBB", "\xABMr. M\xFCller completed tasks to our satisfaction and always showed understanding for colleagues.\xBB", "\xABM. M\xFCller a ex\xE9cut\xE9 les t\xE2ches \xE0 notre satisfaction et a toujours fait preuve de compr\xE9hension.\xBB", "\xABIl Sig. M\xFCller ha svolto i compiti a nostra soddisfazione e ha sempre mostrato comprensione.\xBB") }],
        output: L(
          `\u26A0\uFE0F 2 versteckte Codes erkannt!

\xABzu unserer Zufriedenheit\xBB
\u2192 Bedeutet: BEFRIEDIGEND (Note 3/5)
\u2192 Gut w\xE4re: \xABvollster Zufriedenheit\xBB

\xABzeigte Verst\xE4ndnis f\xFCr Kollegen\xBB
\u2192 Bedeutet: KONFLIKTE im Team
\u2192 Gut w\xE4re: \xABharmonisch zusammengearbeitet\xBB

Gesamtbewertung: 2.5/5 \u26A0\uFE0F
\u2192 Dieses Zeugnis NICHT vorlegen!

Empfehlung: Bitte den Arbeitgeber um
\xABvollster Zufriedenheit\xBB + \xABharmonischer Zusammenarbeit\xBB`,
          `\u26A0\uFE0F 2 hidden codes detected!

\xABto our satisfaction\xBB
\u2192 Means: SATISFACTORY (Grade 3/5)
\u2192 Good would be: \xABcomplete satisfaction\xBB

\xABshowed understanding for colleagues\xBB
\u2192 Means: CONFLICTS in the team
\u2192 Good would be: \xABworked harmoniously\xBB

Overall rating: 2.5/5 \u26A0\uFE0F
\u2192 Do NOT submit this reference!

Recommendation: Ask employer for
\xABcomplete satisfaction\xBB + \xABharmonious collaboration\xBB`,
          `\u26A0\uFE0F 2 codes cach\xE9s d\xE9tect\xE9s!

\xAB\xE0 notre satisfaction\xBB
\u2192 Signifie: PASSABLE (Note 3/5)
\u2192 Bien: \xABenti\xE8re satisfaction\xBB

\xABcompr\xE9hension pour coll\xE8gues\xBB
\u2192 Signifie: CONFLITS en \xE9quipe
\u2192 Bien: \xABtravaill\xE9 harmonieusement\xBB

\xC9valuation globale: 2.5/5 \u26A0\uFE0F
\u2192 Ne PAS soumettre ce certificat!`,
          `\u26A0\uFE0F 2 codici nascosti rilevati!

\xABa nostra soddisfazione\xBB
\u2192 Significa: SUFFICIENTE (Voto 3/5)
\u2192 Bene sarebbe: \xABpiena soddisfazione\xBB

\xABmostrato comprensione per colleghi\xBB
\u2192 Significa: CONFLITTI nel team
\u2192 Bene: \xABcollaborato armoniosamente\xBB

Valutazione complessiva: 2.5/5 \u26A0\uFE0F
\u2192 NON presentare questo certificato!`
        )
      },
      {
        id: "jobmatch",
        ico: "\u{1F3AF}",
        label: L("Job-Matching", "Job Matching", "Matching emploi", "Job Matching"),
        badge: "PRO",
        badgeCol: "#10b981",
        input: [{ l: L("Dein Profil", "Your profile", "Votre profil", "Il tuo profilo"), v: L("Marketing Manager, 6 J., FMCG, Z\xFCrich, 100k+", "Marketing Manager, 6y, FMCG, Z\xFCrich, 100k+", "Responsable Marketing, 6 ans, FMCG, Zurich", "Marketing Manager, 6 anni, FMCG, Zurigo") }],
        output: L(
          `\u{1F3AF} Deine Top 5 Job-Matches:

1. Head of Marketing \u2013 Nestl\xE9 Vevey       92% \u2705
2. Brand Manager \u2013 Lindt Kilchberg         88% \u2705
3. Marketing Director \u2013 Migros Z\xFCrich      85% \u2705
4. CMO \u2013 Feldschl\xF6sschen Rheinfelden       79% 
5. Senior Brand Lead \u2013 Emmi Luzern         74%

\u{1F4A1} Warum Nestl\xE9 an #1:
\u2713 FMCG-Erfahrung ist perfekt
\u2713 Gehaltsniveau passt (CHF 110-130k)
\u2713 Standort Vevey: 1h von Z\xFCrich
\u2713 Deine Sprachkenntnisse gesucht

N\xE4chster Schritt: Bewerbung f\xFCr Nestl\xE9 \u2192`,
          `\u{1F3AF} Your Top 5 Job Matches:

1. Head of Marketing \u2013 Nestl\xE9 Vevey       92% \u2705
2. Brand Manager \u2013 Lindt Kilchberg         88% \u2705
3. Marketing Director \u2013 Migros Z\xFCrich      85% \u2705
4. CMO \u2013 Feldschl\xF6sschen Rheinfelden       79%
5. Senior Brand Lead \u2013 Emmi Lucerne        74%

\u{1F4A1} Why Nestl\xE9 at #1:
\u2713 FMCG experience is perfect match
\u2713 Salary level fits (CHF 110-130k)
\u2713 Location Vevey: 1h from Z\xFCrich
\u2713 Your language skills in demand

Next step: Apply for Nestl\xE9 \u2192`,
          `\u{1F3AF} Vos 5 Meilleurs Emplois:

1. Head of Marketing \u2013 Nestl\xE9 Vevey       92% \u2705
2. Brand Manager \u2013 Lindt Kilchberg         88% \u2705
3. Directeur Marketing \u2013 Migros Z\xFCrich     85% \u2705
4. CMO \u2013 Feldschl\xF6sschen               79%
5. Senior Brand Lead \u2013 Emmi Lucerne    74%

\u{1F4A1} Pourquoi Nestl\xE9 en #1:
\u2713 Exp\xE9rience FMCG parfaite
\u2713 Salaire adapt\xE9 (CHF 110-130k)
\u2713 Vevey: 1h de Zurich`,
          `\u{1F3AF} I Tuoi Top 5 Lavori:

1. Head of Marketing \u2013 Nestl\xE9 Vevey       92% \u2705
2. Brand Manager \u2013 Lindt Kilchberg         88% \u2705
3. Marketing Director \u2013 Migros Z\xFCrich      85% \u2705
4. CMO \u2013 Feldschl\xF6sschen               79%
5. Senior Brand Lead \u2013 Emmi Lucerna    74%

\u{1F4A1} Perch\xE9 Nestl\xE9 al #1:
\u2713 Esperienza FMCG perfetta
\u2713 Livello salariale adatto (CHF 110-130k)
\u2713 Posizione Vevey: 1h da Zurigo`
        )
      },
      {
        id: "coach",
        ico: "\u{1F3A4}",
        label: L("Interview-Coach", "Interview Coach", "Coach entretien", "Coach colloquio"),
        badge: "PRO",
        badgeCol: "#a78bfa",
        input: [{ l: L("Simulierte Frage", "Simulated question", "Question simul\xE9e", "Domanda simulata"), v: L("\xABWo sehen Sie sich in 5 Jahren?\xBB", "\xABWhere do you see yourself in 5 years?\xBB", "\xABO\xF9 vous voyez-vous dans 5 ans?\xBB", "\xABDove si vede tra 5 anni?\xBB") }, { l: L("Deine Antwort", "Your answer", "Votre r\xE9ponse", "La sua risposta"), v: L("Ich m\xF6chte wachsen und mehr Verantwortung \xFCbernehmen.", "I want to grow and take on more responsibility.", "Je veux \xE9voluer et prendre plus de responsabilit\xE9s.", "Voglio crescere e assumere pi\xF9 responsabilit\xE0.") }],
        output: L(
          `\u{1F4CA} Bewertung: 61/100 \u2013 Ausbauf\xE4hig

\u2713 Positiv:
  Ambition klar erkennbar

\u2717 Schwach:
  Zu vage \u2013 kein Bezug zur Stelle
  Kein konkreter Plan genannt
  Klingt nach jedem Bewerber

\u{1F4A1} Bessere Antwort:
\xABIn 5 Jahren sehe ich mich in einer F\xFChrungsrolle im Marketing bei einem FMCG-Unternehmen. Bei Migros m\xF6chte ich zuerst die Marke XY mit aufbauen, dann ein Team von 3\u20135 Personen leiten. Das deckt sich mit Ihrer Wachstumsstrategie Schweiz 2028.\xBB

\u2192 Score mit verbesserter Antwort: 89/100 \u2705`,
          `\u{1F4CA} Score: 61/100 \u2013 Needs improvement

\u2713 Positive:
  Ambition clearly visible

\u2717 Weak:
  Too vague \u2013 no reference to the role
  No concrete plan mentioned
  Sounds like every applicant

\u{1F4A1} Better answer:
\xABIn 5 years I see myself in a marketing leadership role at an FMCG company. At Migros I'd first help build brand XY, then lead a team of 3\u20135 people. This aligns with your Switzerland 2028 growth strategy.\xBB

\u2192 Score with improved answer: 89/100 \u2705`,
          `\u{1F4CA} Score: 61/100 \u2013 \xC0 am\xE9liorer

\u2713 Positif:
  Ambition clairement visible

\u2717 Faible:
  Trop vague \u2013 pas de lien avec le poste
  Aucun plan concret

\u{1F4A1} Meilleure r\xE9ponse:
\xABDans 5 ans, je me vois dans un r\xF4le de leadership marketing. Chez Migros, je souhaite d'abord d\xE9velopper la marque XY, puis diriger une \xE9quipe de 3-5 personnes.\xBB

\u2192 Score am\xE9lior\xE9: 89/100 \u2705`,
          `\u{1F4CA} Punteggio: 61/100 \u2013 Da migliorare

\u2713 Positivo:
  Ambizione chiaramente visibile

\u2717 Debole:
  Troppo vago \u2013 nessun riferimento al ruolo
  Nessun piano concreto

\u{1F4A1} Risposta migliore:
\xABTra 5 anni mi vedo in un ruolo di leadership nel marketing. Da Migros vorrei prima sviluppare il marchio XY, poi guidare un team di 3-5 persone.\xBB

\u2192 Punteggio migliorato: 89/100 \u2705`
        )
      }
    ];
    const demo = demos[demoTab];
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }, children: demos.map((d, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => setDemoTab(i), style: { padding: "8px 14px", borderRadius: 10, border: `1.5px solid ${i === demoTab ? "rgba(16,185,129,.5)" : "rgba(255,255,255,.08)"}`, background: i === demoTab ? "rgba(16,185,129,.12)" : "rgba(255,255,255,.03)", color: i === demoTab ? "var(--em)" : "rgba(255,255,255,.35)", fontFamily: "var(--hd)", fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "all .18s", display: "flex", alignItems: "center", gap: 6, gridColumn: i === demos.length - 1 && demos.length % 2 !== 0 ? "span 2" : "span 1", justifyContent: "flex-start" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: d.ico }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { flex: 1, textAlign: "left" }, children: d.label }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, background: d.badgeCol + "33", color: d.badgeCol, padding: "1px 7px", borderRadius: 20, fontWeight: 700, flexShrink: 0 }, children: d.badge })
      ] }, i)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1.7fr", gap: 14, alignItems: "start" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,.18)", marginBottom: 12 }, children: lang === "de" ? "EINGABE" : "INPUT" }),
          demo.input.map((inp, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginBottom: 10 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: "rgba(255,255,255,.28)", marginBottom: 3 }, children: inp.l }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 8, padding: "8px 11px", fontSize: 12, color: "rgba(255,255,255,.5)", lineHeight: 1.5 }, children: inp.v })
          ] }, i)),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 14, padding: "9px 13px", background: "rgba(16,185,129,.07)", border: "1px solid rgba(16,185,129,.13)", borderRadius: 8, fontSize: 11, color: "rgba(16,185,129,.6)" }, children: [
            "\u26A1 ",
            lang === "de" ? "KI generiert in ~15 Sek." : lang === "en" ? "AI generates in ~15 sec." : lang === "fr" ? "L'IA g\xE9n\xE8re en ~15 sec." : "~15 sec."
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => navTo(demo.id), style: { width: "100%", marginTop: 10, background: "var(--em)", color: "white", border: "none", borderRadius: 9, padding: "10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }, children: lang === "de" ? "Selbst ausprobieren \u2192" : lang === "en" ? "Try it yourself \u2192" : lang === "fr" ? "Essayer \u2192" : "Prova ora \u2192" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "rgba(255,255,255,.03)", border: "1.5px solid rgba(16,185,129,.18)", borderRadius: 16, padding: 20 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "var(--em)" }, children: "\u2726 STELLIFY OUTPUT" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(16,185,129,.4)" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 5, height: 5, background: "var(--em)", borderRadius: "50%" } }),
              lang === "de" ? "Live generiert" : "Live generated"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "rgba(255,255,255,.62)", lineHeight: 1.9, whiteSpace: "pre-wrap", maxHeight: 300, overflow: "hidden", maskImage: "linear-gradient(to bottom,white 70%,transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom,white 70%,transparent 100%)" }, children: demo.output })
        ] })
      ] })
    ] });
  }
  function FaqSection({ lang, email }) {
    const [open, setOpen] = useState(null);
    const faqs = lang === "de" ? [
      { q: "Wie sicher sind meine Daten?", a: "Deine Daten werden nicht gespeichert. Jede Anfrage wird direkt an die Anthropic API gesendet und danach nicht protokolliert. Kein Training auf deinen Daten." },
      { q: "Kann ich jederzeit k\xFCndigen?", a: "Ja \u2013 du kannst monatlich k\xFCndigen, ohne Mindestlaufzeit oder versteckte Geb\xFChren. \xDCber Stripe verwaltest du dein Abo selbst." },
      { q: "Wie viele Generierungen habe ich?", a: `Gratis: ${C.FREE_LIMIT} Generierung${C.FREE_LIMIT !== 1 ? "en" : ""} zum Testen. Pro, Familie & Team: je ${C.PRO_LIMIT} Generierungen/Monat pro Person. Das Kontingent erneuert sich am 1. des Folgemonats automatisch.` },
      { q: "Funktioniert Stellify f\xFCr alle Branchen?", a: "Ja. Die KI ist auf den Schweizer Jobmarkt trainiert und kennt Gepflogenheiten aus IT, Finanzen, Gesundheit, Bildung, Gastronomie und mehr." },
      { q: "Welche Sprachen werden unterst\xFCtzt?", a: "Vollst\xE4ndig auf Deutsch, Englisch, Franz\xF6sisch und Italienisch \u2013 ideal f\xFCr Jobs in allen Sprachregionen der Schweiz." },
      { q: "Gibt es einen Studentenrabatt?", a: "Aktuell nicht, aber der Jahrespreis (CHF 14.90/Mo.) macht das Abo f\xFCr alle erschwinglich. Meld dich bei uns f\xFCr spezielle Konditionen." }
    ] : lang === "fr" ? [
      { q: "Mes donn\xE9es sont-elles s\xE9curis\xE9es?", a: "Vos donn\xE9es ne sont pas stock\xE9es. Chaque requ\xEAte est envoy\xE9e directement \xE0 l'API Anthropic et n'est pas enregistr\xE9e." },
      { q: "Puis-je r\xE9silier \xE0 tout moment?", a: "Oui \u2013 r\xE9siliation mensuelle possible, sans dur\xE9e minimale ni frais cach\xE9s." },
      { q: "Combien de g\xE9n\xE9rations par plan?", a: "Gratuit: 1 g\xE9n\xE9ration. Pro: 60/mois par personne. Famille: 60/mois par personne (3 personnes). Unlimited: 60/mois par personne, membres illimit\xE9s. Le quota se renouvelle automatiquement le 1er du mois suivant." },
      { q: "Fonctionne pour tous les secteurs?", a: "Oui. L'IA conna\xEEt les habitudes du march\xE9 suisse dans tous les secteurs." },
      { q: "Quelles langues sont support\xE9es?", a: "Allemand, anglais, fran\xE7ais et italien \u2013 id\xE9al pour toutes les r\xE9gions linguistiques." },
      { q: "Y a-t-il une r\xE9duction \xE9tudiants?", a: "Pas actuellement, mais le prix annuel (CHF 14.90/mois) est accessible \xE0 tous." }
    ] : lang === "it" ? [
      { q: "I miei dati sono sicuri?", a: "I tuoi dati non vengono salvati. Ogni richiesta viene inviata direttamente all'API Anthropic e non viene registrata." },
      { q: "Posso cancellare in qualsiasi momento?", a: "S\xEC \u2013 cancellazione mensile possibile, senza durata minima o costi nascosti." },
      { q: "Cosa succede dopo 60 generazioni?", a: "Dopo 60 generazioni Pro al mese, il limite si ripristina automaticamente il 1\xB0 del mese successivo." },
      { q: "Funziona per tutti i settori?", a: "S\xEC. L'IA conosce le abitudini del mercato svizzero in tutti i settori." },
      { q: "Quali lingue sono supportate?", a: "Tedesco, inglese, francese e italiano \u2013 ideale per tutte le regioni linguistiche." },
      { q: "C'\xE8 uno sconto studenti?", a: "Al momento no, ma il prezzo annuale (CHF 14.90/mese) \xE8 accessibile a tutti." }
    ] : [
      { q: "Is my data secure?", a: "Your data is not stored. Each request is sent directly to the Anthropic API and not logged. No training on your data." },
      { q: "Can I cancel at any time?", a: "Yes \u2013 monthly cancellation possible, no minimum term or hidden fees. Manage your subscription directly via Stripe." },
      { q: "What happens after 60 generations?", a: "After 60 Pro generations per month, your limit resets automatically on the 1st of the following month." },
      { q: "Does it work for all industries?", a: "Yes. The AI is trained on the Swiss job market and knows conventions across IT, finance, health, education, hospitality and more." },
      { q: "Which languages are supported?", a: "Fully available in German, English, French and Italian \u2013 ideal for jobs across all Swiss language regions." },
      { q: "Is there a student discount?", a: "Not currently, but the annual price (CHF 14.90/mo.) makes the subscription affordable for everyone." }
    ];
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "sec sec-w", id: "faq", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "con", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sh shc", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "seye", children: lang === "de" ? "\u2726 H\xE4ufige Fragen" : lang === "fr" ? "\u2726 Questions fr\xE9quentes" : lang === "it" ? "\u2726 Domande frequenti" : "\u2726 Frequently Asked Questions" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "st", children: lang === "de" ? "Alles was du wissen musst" : lang === "fr" ? "Tout ce que vous devez savoir" : lang === "it" ? "Tutto quello che devi sapere" : "Everything you need to know" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { maxWidth: 740, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }, children: faqs.map((faq, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { border: "1.5px solid", borderRadius: 14, overflow: "hidden", transition: "border-color .2s", borderColor: open === i ? "rgba(16,185,129,.4)" : "var(--bo)" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => setOpen(open === i ? null : i), style: { width: "100%", background: open === i ? "rgba(16,185,129,.04)" : "white", border: "none", cursor: "pointer", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, textAlign: "left", fontFamily: "var(--bd)", transition: "background .18s" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 15, fontWeight: 700, color: "var(--ink)", lineHeight: 1.4 }, children: faq.q }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 20, color: "var(--em)", flexShrink: 0, transform: open === i ? "rotate(45deg)" : "none", transition: "transform .2s", fontWeight: 300, lineHeight: 1 }, children: "+" })
        ] }),
        open === i && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: "14px 22px 18px", fontSize: 14, color: "var(--mu)", lineHeight: 1.75, borderTop: "1px solid var(--bo)", background: "rgba(16,185,129,.02)" }, children: faq.a })
      ] }, i)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { textAlign: "center", marginTop: 32 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 13, color: "var(--mu)" }, children: lang === "de" ? "Noch Fragen? " : lang === "fr" ? "D'autres questions? " : lang === "it" ? "Altre domande? " : "More questions? " }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: `mailto:${email}`, style: { fontSize: 13, color: "var(--em)", fontWeight: 600, textDecoration: "underline" }, children: email })
      ] })
    ] }) });
  }
  function DocUpload({ lang, onFile, onText, file, onClear }) {
    const [loading, setLoading] = useState(false);
    const L = (d, e, f, i) => ({ de: d, en: e, fr: f, it: i })[lang] || d;
    const handle = async (f) => {
      if (!f) return;
      setLoading(true);
      try {
        if (f.name.endsWith(".docx") || f.name.endsWith(".doc")) {
          const mammoth = window.mammoth;
          if (!mammoth) {
            console.error("Mammoth nicht geladen");
            return;
          }
          const ab = await f.arrayBuffer();
          const res = await mammoth.extractRawText({ arrayBuffer: ab });
          onText(res.value, f.name);
        } else {
          onFile(f);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    return file ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 18 }, children: file.isImage ? "\u{1F5BC}\uFE0F" : "\u{1F4C4}" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontWeight: 600, fontSize: 13, color: "#15803d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: file.name }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: "#16a34a" }, children: file.extracted ? L("Text extrahiert \u2713", "Text extracted \u2713", "Texte extrait \u2713", "Testo estratto \u2713") : L("Bereit \u2713", "Ready \u2713", "Pr\xEAt \u2713", "Pronto \u2713") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: onClear, style: { background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#6b7280" }, children: "\u2715" })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { display: "block", cursor: "pointer", marginBottom: 14 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "div",
        {
          style: { border: "2px dashed rgba(16,185,129,.3)", borderRadius: 12, padding: "14px", textAlign: "center", background: "rgba(16,185,129,.02)", transition: "all .18s" },
          onDragOver: (e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = "var(--em)";
            e.currentTarget.style.background = "var(--em3)";
          },
          onDragLeave: (e) => {
            e.currentTarget.style.borderColor = "rgba(16,185,129,.3)";
            e.currentTarget.style.background = "rgba(16,185,129,.02)";
          },
          onDrop: (e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = "rgba(16,185,129,.3)";
            e.currentTarget.style.background = "rgba(16,185,129,.02)";
            const f = e.dataTransfer.files[0];
            if (f) handle(f);
          },
          children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 13, color: "var(--em)", padding: "4px 0" }, children: L("Lese Datei\u2026", "Reading file\u2026", "Lecture\u2026", "Lettura\u2026") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 22, marginBottom: 3 }, children: "\u{1F4CE}" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, fontWeight: 600, color: "var(--mu)" }, children: L("Dokument hochladen \xB7 PDF, Word, JPG, PNG", "Upload document \xB7 PDF, Word, JPG, PNG", "Joindre un document \xB7 PDF, Word, JPG, PNG", "Carica documento \xB7 PDF, Word, JPG, PNG") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: "rgba(11,11,18,.28)", marginTop: 2 }, children: L("Ablegen oder klicken", "Drop or click", "D\xE9poser ou cliquer", "Trascina o clicca") })
          ] })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "file", accept: ".pdf,.docx,.doc,image/jpeg,image/png,image/jpg", style: { display: "none" }, onChange: (e) => {
        const f = e.target.files?.[0];
        if (f) handle(f);
      } })
    ] });
  }
  function CookieBanner({ lang, onAccept }) {
    const L = (d, e, f, i) => ({ de: d, en: e, fr: f, it: i })[lang] || d;
    const [details, setDetails] = useState(false);
    const accept = (all) => {
      onAccept(all);
    };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999, background: "rgba(11,11,18,.98)", borderTop: "1px solid rgba(255,255,255,.1)", padding: "14px 16px 20px", boxShadow: "0 -8px 32px rgba(0,0,0,.5)" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "flex-start", gap: 10 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 20, flexShrink: 0 }, children: "\u{1F36A}" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 13, fontWeight: 800, color: "white", marginBottom: 4 }, children: L("Datenschutz & Cookies", "Privacy & Cookies", "Confidentialit\xE9 & Cookies", "Privacy & Cookie") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { fontSize: 12, color: "rgba(255,255,255,.45)", lineHeight: 1.5, margin: 0 }, children: L(
            "Wir verwenden Cookies f\xFCr den Betrieb und zur Verbesserung deiner Erfahrung.",
            "We use cookies to operate the site and improve your experience.",
            "Nous utilisons des cookies pour faire fonctionner le site.",
            "Utilizziamo i cookie per il funzionamento del sito."
          ) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8, width: "100%" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            onClick: () => accept(false),
            style: { flex: 1, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", color: "rgba(255,255,255,.7)", borderRadius: 12, padding: "11px 8px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
            children: L("Nur notwendige", "Essential only", "Essentiels", "Solo essenziali")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            onClick: () => accept(true),
            style: { flex: 1, background: "var(--em)", border: "none", color: "white", borderRadius: 12, padding: "11px 8px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
            children: L("Alle akzeptieren \u2713", "Accept all \u2713", "Tout accepter \u2713", "Accetta tutti \u2713")
          }
        )
      ] })
    ] }) });
  }
  var PROFILES_KEY = "stf_profiles";
  var ACTIVE_PROFILE_KEY = "stf_active_profile";
  function loadProfiles() {
    try {
      const raw = localStorage.getItem(PROFILES_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
    }
    return [];
  }
  function saveProfiles(profiles) {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    } catch {
    }
  }
  function loadActiveProfileId() {
    try {
      return localStorage.getItem(ACTIVE_PROFILE_KEY) || null;
    } catch {
      return null;
    }
  }
  function saveActiveProfileId(id) {
    try {
      localStorage.setItem(ACTIVE_PROFILE_KEY, id);
    } catch {
    }
  }
  var CHATS_KEY = "stf_chats";
  var ACTIVE_CHAT_KEY = "stf_active_chat";
  function loadChats() {
    try {
      const raw = localStorage.getItem(CHATS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
    }
    return [];
  }
  function saveChats(chats) {
    try {
      localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    } catch {
    }
  }
  function loadActiveChatId() {
    try {
      return localStorage.getItem(ACTIVE_CHAT_KEY) || null;
    } catch {
      return null;
    }
  }
  function saveActiveChatId(id) {
    try {
      localStorage.setItem(ACTIVE_CHAT_KEY, id);
    } catch {
    }
  }
  function makeChatId() {
    return "c" + Date.now();
  }
  function makeChatTitle(msgs) {
    const first = msgs.find((m) => m.r === "u");
    if (!first) return "Neuer Chat";
    return first.t.slice(0, 36) + (first.t.length > 36 ? "\u2026" : "");
  }
  function ChatBot({ lang, pro, setPw, navTo, authSession, onAuthOpen }) {
    const L = (d, e, f, i) => ({ de: d, en: e, fr: f, it: i })[lang] || d;
    const [open, setOpen] = useState(false);
    const [bubble, setBubble] = useState(false);
    const [cookieDone, setCookieDone] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [chatUsage, setChatUsage] = useState(0);
    const [showHistory, setShowHistory] = useState(false);
    const bottomRef = useRef(null);
    const [chats, setChats] = useState(() => loadChats());
    const [activeChatId, setActiveChatId] = useState(() => loadActiveChatId());
    const msgs = (() => {
      const chat = chats.find((c) => c.id === activeChatId);
      return chat ? chat.msgs : [];
    })();
    function setMsgs(updater) {
      setChats((prev) => {
        const updated = typeof updater === "function" ? updater(msgs) : updater;
        let newChats;
        if (!activeChatId) {
          const id = makeChatId();
          saveActiveChatId(id);
          setActiveChatId(id);
          newChats = [{ id, title: makeChatTitle(updated), msgs: updated, ts: Date.now() }, ...prev];
        } else {
          newChats = prev.map(
            (c) => c.id === activeChatId ? { ...c, msgs: updated, title: makeChatTitle(updated), ts: Date.now() } : c
          );
          if (!newChats.find((c) => c.id === activeChatId)) {
            newChats = [{ id: activeChatId, title: makeChatTitle(updated), msgs: updated, ts: Date.now() }, ...prev];
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
      const welcome = { r: "ai", t: L(
        "Hallo! Ich bin Stella \u{1F44B} Deine KI-Karriere-Assistentin von Stellify. Wie kann ich dir helfen?",
        "Hi! I'm Stella \u{1F44B} Your AI career assistant from Stellify. How can I help?",
        "Bonjour! Je suis Stella \u{1F44B} Comment puis-je vous aider?",
        "Ciao! Sono Stella \u{1F44B} Come posso aiutarti?"
      ) };
      const newChats = [{ id, title: "Neuer Chat", msgs: [welcome], ts: Date.now() }, ...chats];
      setChats(newChats);
      saveChats(newChats);
    }
    function deleteChat(id, e) {
      e.stopPropagation();
      const updated = chats.filter((c) => c.id !== id);
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
    useEffect(() => {
      try {
        setCookieDone(!!localStorage.getItem("stf_cookie"));
      } catch {
      }
      const iv = setInterval(() => {
        try {
          if (localStorage.getItem("stf_cookie")) {
            setCookieDone(true);
            clearInterval(iv);
          }
        } catch {
        }
      }, 500);
      return () => clearInterval(iv);
    }, []);
    useEffect(() => {
      setChatUsage(getChatCount());
    }, [open]);
    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [msgs]);
    useEffect(() => {
      const seen = sessionStorage.getItem("stf_bubble");
      if (seen) return;
      const t = setTimeout(() => {
        setBubble(true);
        sessionStorage.setItem("stf_bubble", "1");
      }, 8e3);
      return () => clearTimeout(t);
    }, []);
    const isLoggedIn = !!authSession;
    const canChat = isLoggedIn && (pro || chatUsage < C.CHAT_FREE_LIMIT);
    const needsLogin = !isLoggedIn;
    const SYSTEM = `Du bist Stella, die KI-Karriere-Assistentin von Stellify. Du hast tiefes Wissen \xFCber Karriere, Bewerbungen, den Schweizer Arbeitsmarkt und Produktivit\xE4t.

Dein Wissen umfasst: Schweizer Bewerbungsunterlagen (Motivationsschreiben, Lebenslauf mit Foto, 1-2 Seiten), ATS-Optimierung, Schweizer Arbeitsrecht (K\xFCndigungsfristen, Sperrfristen, Zeugnis-Code: "stets zu vollsten Zufriedenheit"=sehr gut), Geh\xE4lter nach Branche/Erfahrung, LinkedIn-Optimierung, Interview-Vorbereitung (STAR-Methode), Gehaltsverhandlungs-Taktiken, Schweizer Bildungssystem (EFZ, FH, Uni, CAS/MAS).

Tools von Stellify:
\u270D\uFE0F Bewerbungen (1\xD7 gratis), \u{1F4BC} LinkedIn Optimierung, \u{1F916} ATS-Simulation, \u{1F4DC} Zeugnis-Analyse, \u{1F3AF} Job-Matching, \u{1F3A4} Interview-Coach, \u{1F4CA} Excel-Generator, \u{1F4FD}\uFE0F PowerPoint-Maker, \u{1F4B0} Gehaltsverhandlung, \u{1F91D} Networking-Nachricht, \u{1F4E4} K\xFCndigung schreiben, \u{1F5D3}\uFE0F 30-60-90-Tage-Plan, \u{1F3C6} Referenzschreiben, \u{1F4DA} Lernplan, \u{1F4DD} Zusammenfassung, \u{1F393} Lehrstelle, \u2709\uFE0F E-Mail, \u{1F4CB} Protokoll, \u{1F30D} \xDCbersetzer, \u{1F4B0} KI-Gehaltsrechner Schweiz, \u{1F4CB} Bewerbungs-Tracker, \u270D\uFE0F LinkedIn-Post Generator

Verhalten: Antworte konkret und umsetzbar (max. 3-4 S\xE4tze im Widget). Schreib Beispieltexte direkt aus wenn gefragt. Empfehle Tool-Namen exakt wie oben damit Links funktionieren. Sei warm, direkt, wie ein erfahrener Karriere-Coach.`;
    const TOOL_MAP = {
      "bewerbung": ["\u270D\uFE0F Bewerbungen", "app"],
      "bewerbungen": ["\u270D\uFE0F Bewerbungen", "app"],
      "linkedin": ["\u{1F4BC} LinkedIn", "linkedin"],
      "ats": ["\u{1F916} ATS-Simulation", "ats"],
      "zeugnis": ["\u{1F4DC} Zeugnis-Analyse", "zeugnis"],
      "job-matching": ["\u{1F3AF} Job-Matching", "jobmatch"],
      "interview": ["\u{1F3A4} Interview-Coach", "coach"],
      "excel": ["\u{1F4CA} Excel-Generator", "excel"],
      "powerpoint": ["\u{1F4FD}\uFE0F PowerPoint-Maker", "pptx"],
      "gehalt": ["\u{1F4B0} Gehaltsverhandlung", "gehalt"],
      "networking": ["\u{1F91D} Networking", "networking"],
      "k\xFCndigung": ["\u{1F4E4} K\xFCndigung", "kuendigung"],
      "30-60-90": ["\u{1F5D3}\uFE0F 30-60-90-Plan", "plan306090"],
      "referenz": ["\u{1F3C6} Referenzschreiben", "referenz"],
      "lernplan": ["\u{1F4DA} Lernplan", "lernplan"],
      "zusammenfassung": ["\u{1F4DD} Zusammenfassung", "zusammenfassung"],
      "lehrstelle": ["\u{1F393} Lehrstelle", "lehrstelle"],
      "e-mail": ["\u2709\uFE0F E-Mail", "email"],
      "protokoll": ["\u{1F4CB} Protokoll", "protokoll"],
      "\xFCbersetzer": ["\u{1F30D} \xDCbersetzer", "uebersetzer"],
      "gehaltsrechner": ["\u{1F4B0} KI-Gehaltsrechner", "gehaltsrechner"],
      "tracker": ["\u{1F4CB} Bewerbungs-Tracker", "tracker"],
      "linkedin-post": ["\u270D\uFE0F LinkedIn-Post", "lipost"]
    };
    const renderMsg = (text) => {
      const parts = [];
      let remaining2 = text;
      Object.entries(TOOL_MAP).forEach(([key, [label, page2]]) => {
        remaining2 = remaining2.replace(
          new RegExp(`(${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
          `<TOOL:${page2}:${label}>`
        );
      });
      const segments = remaining2.split(/(<TOOL:[^>]+>)/);
      return segments.map((seg, i) => {
        const m = seg.match(/^<TOOL:([^:]+):(.+)>$/);
        if (m) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            onClick: () => {
              setOpen(false);
              navTo(m[1]);
            },
            style: { display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(16,185,129,.15)", border: "1px solid rgba(16,185,129,.3)", borderRadius: 8, padding: "2px 9px", fontSize: 12, fontWeight: 700, color: "var(--em)", cursor: "pointer", margin: "1px 2px" },
            children: [
              m[2],
              " \u2192"
            ]
          },
          i
        );
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: seg }, i);
      });
    };
    const send = async () => {
      if (!input.trim() || loading) return;
      if (needsLogin) {
        onAuthOpen && onAuthOpen();
        return;
      }
      if (!canChat) {
        setPw(true);
        return;
      }
      const userMsg = input.trim();
      setInput("");
      const newMsgs = [...msgs, { r: "u", t: userMsg }];
      setMsgs(newMsgs);
      setLoading(true);
      if (!pro) {
        incChat();
        setChatUsage((c) => c + 1);
      }
      try {
        const apiMsgs = [];
        for (const m of newMsgs) {
          const role = m.r === "u" ? "user" : "assistant";
          if (apiMsgs.length > 0 && apiMsgs[apiMsgs.length - 1].role === role) continue;
          apiMsgs.push({ role, content: m.t });
        }
        while (apiMsgs.length && apiMsgs[0].role !== "user") apiMsgs.shift();
        const finalMsgs = apiMsgs.slice(-10);
        const msgsWithSystem = [{ role: "system", content: SYSTEM }, ...finalMsgs];
        const res = await fetch(GROQ_URL, {
          method: "POST",
          headers: groqHeaders(),
          body: JSON.stringify({ model: C.MODEL_FAST, max_tokens: 600, messages: msgsWithSystem })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
        const reply = data.choices?.[0]?.message?.content || "Bitte nochmals versuchen.";
        setMsgs((m) => [...m, { r: "ai", t: reply }]);
      } catch (e) {
        setMsgs((m) => [...m, { r: "ai", t: `\u26A0\uFE0F ${e.message}` }]);
      } finally {
        setLoading(false);
      }
    };
    const remaining = pro ? "\u221E" : Math.max(0, C.CHAT_FREE_LIMIT - chatUsage);
    const openChat = () => {
      setBubble(false);
      if (!open && msgs.length === 0 && !activeChatId) {
        newChat();
      }
      setOpen((o) => !o);
    };
    const fmtDate = (ts) => {
      if (!ts) return "";
      const d = new Date(ts);
      const now = /* @__PURE__ */ new Date();
      const diff = now - d;
      if (diff < 864e5) return d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
      if (diff < 6048e5) return d.toLocaleDateString("de-CH", { weekday: "short" });
      return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" });
    };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      cookieDone && bubble && !open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "div",
        {
          style: { position: "fixed", bottom: 90, right: 20, maxWidth: 220, background: "var(--dk2)", border: "1px solid rgba(16,185,129,.3)", borderRadius: "14px 14px 4px 14px", padding: "11px 14px", zIndex: 1002, boxShadow: "0 8px 32px rgba(0,0,0,.4)", cursor: "pointer", animation: "fadeSlideUp .4s ease" },
          onClick: openChat,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: (e) => {
              e.stopPropagation();
              setBubble(false);
            }, style: { position: "absolute", top: 6, right: 8, background: "none", border: "none", color: "rgba(255,255,255,.3)", fontSize: 12, cursor: "pointer", lineHeight: 1 }, children: "\u2715" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 13, color: "rgba(255,255,255,.85)", lineHeight: 1.5, paddingRight: 12 }, children: L("Hallo \u{1F44B} Welches Tool passt zu dir? Frag mich!", "Hi \u{1F44B} Which tool suits you? Ask me!", "Bonjour \u{1F44B} Quel outil vous convient?", "Ciao \u{1F44B} Quale tool fa per te?") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: "var(--em)", fontWeight: 600, marginTop: 5 }, children: L("Mit Stella chatten \u2192", "Chat with Stella \u2192", "Discuter avec Stella \u2192", "Chatta con Stella \u2192") })
          ]
        }
      ),
      cookieDone && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          onClick: openChat,
          style: { position: "fixed", bottom: open ? 248 : 24, right: 24, width: 56, height: 56, borderRadius: "50%", background: "var(--em)", border: "none", cursor: "pointer", zIndex: 1001, boxShadow: "0 4px 20px rgba(16,185,129,.45)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, transition: "all .3s", transform: open ? "rotate(10deg)" : "none" },
          children: [
            open ? "\u2715" : "\u{1F4AC}",
            bubble && !open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "absolute", top: 0, right: 0, width: 14, height: 14, borderRadius: "50%", background: "#ef4444", border: "2px solid white" } })
          ]
        }
      ),
      open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { position: "fixed", bottom: 92, right: 24, width: 360, maxWidth: "calc(100vw - 32px)", background: "var(--dk2)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,.5)", zIndex: 1e3, display: "flex", flexDirection: "column", overflow: "hidden" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "linear-gradient(135deg,rgba(16,185,129,.2),rgba(16,185,129,.08))", borderBottom: "1px solid rgba(255,255,255,.07)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 34, height: 34, background: "var(--em)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }, children: "\u{1F916}" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 13, fontWeight: 800, color: "white" }, children: "Stella \u2013 Stellify" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 10, color: "rgba(255,255,255,.4)" }, children: pro ? L("Pro \xB7 Unbegrenzt", "Pro \xB7 Unlimited", "Pro \xB7 Illimit\xE9", "Pro \xB7 Illimitato") : `${remaining}/${C.CHAT_FREE_LIMIT} ${L("Nachrichten", "messages", "messages", "messaggi")}` })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              onClick: () => setShowHistory((h) => !h),
              title: L("Verlauf", "History", "Historique", "Cronologia"),
              style: { background: showHistory ? "rgba(16,185,129,.25)" : "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, color: showHistory ? "var(--em)" : "rgba(255,255,255,.6)", flexShrink: 0, transition: "all .2s" },
              children: "\u{1F550}"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              onClick: newChat,
              title: L("Neuer Chat", "New chat", "Nouveau chat", "Nuova chat"),
              style: { background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, color: "rgba(255,255,255,.6)", flexShrink: 0, transition: "all .2s" },
              onMouseEnter: (e) => e.currentTarget.style.background = "rgba(255,255,255,.15)",
              onMouseLeave: (e) => e.currentTarget.style.background = "rgba(255,255,255,.08)",
              children: "\u270F\uFE0F"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e", flexShrink: 0 } })
        ] }),
        showHistory && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "rgba(7,7,14,.98)", borderBottom: "1px solid rgba(255,255,255,.07)", maxHeight: 260, overflowY: "auto" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: "10px 14px 6px", fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,.25)" }, children: L("Verlauf", "History", "Historique", "Cronologia") }),
          chats.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: "14px", fontSize: 12, color: "rgba(255,255,255,.3)", textAlign: "center" }, children: L("Noch keine Chats", "No chats yet", "Pas encore de chats", "Nessuna chat") }),
          chats.map((chat) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "div",
            {
              onClick: () => switchChat(chat.id),
              style: { display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", cursor: "pointer", background: chat.id === activeChatId ? "rgba(16,185,129,.1)" : "transparent", borderLeft: `2px solid ${chat.id === activeChatId ? "var(--em)" : "transparent"}`, transition: "all .15s" },
              onMouseEnter: (e) => {
                if (chat.id !== activeChatId) e.currentTarget.style.background = "rgba(255,255,255,.04)";
              },
              onMouseLeave: (e) => {
                if (chat.id !== activeChatId) e.currentTarget.style.background = "transparent";
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 14, flexShrink: 0 }, children: "\u{1F4AC}" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, fontWeight: 600, color: chat.id === activeChatId ? "var(--em)" : "rgba(255,255,255,.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: chat.title || "Chat" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 10, color: "rgba(255,255,255,.25)", marginTop: 1 }, children: [
                    fmtDate(chat.ts),
                    " \xB7 ",
                    chat.msgs.length,
                    " ",
                    L("Nachrichten", "messages", "messages", "messaggi")
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    onClick: (e) => deleteChat(chat.id, e),
                    style: { background: "none", border: "none", color: "rgba(255,255,255,.2)", cursor: "pointer", fontSize: 12, padding: "2px 4px", borderRadius: 4, flexShrink: 0, transition: "color .15s" },
                    onMouseEnter: (e) => e.currentTarget.style.color = "#ef4444",
                    onMouseLeave: (e) => e.currentTarget.style.color = "rgba(255,255,255,.2)",
                    children: "\u2715"
                  }
                )
              ]
            },
            chat.id
          ))
        ] }),
        !showHistory && needsLogin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "28px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 36 }, children: "\u{1F510}" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 15, fontWeight: 800, color: "white" }, children: lang === "de" ? "Einloggen zum Chatten" : lang === "fr" ? "Connexion pour chatter" : "Sign in to chat" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "rgba(255,255,255,.4)", lineHeight: 1.6 }, children: lang === "de" ? "20 kostenlose Fragen an Stella \u2013 registriere dich gratis." : lang === "fr" ? "20 questions gratuites \u2013 inscrivez-vous." : "20 free questions for Stella \u2013 register free." }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => onAuthOpen && onAuthOpen(), className: "btn b-em b-w", style: { fontSize: 13 }, children: lang === "de" ? "Einloggen / Registrieren \u2192" : lang === "fr" ? "Connexion / Inscription \u2192" : "Sign in / Register \u2192" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: "rgba(255,255,255,.2)" }, children: lang === "de" ? "Kein Abo n\xF6tig \xB7 Sofort starten" : "No subscription needed \xB7 Start instantly" })
        ] }),
        !showHistory && !needsLogin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, minHeight: 200 }, children: [
            msgs.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8, flexDirection: m.r === "u" ? "row-reverse" : "row", alignItems: "flex-start" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 28, height: 28, borderRadius: "50%", background: m.r === "u" ? "rgba(16,185,129,.2)" : "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }, children: m.r === "u" ? "\u{1F464}" : "\u{1F916}" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { maxWidth: "78%", background: m.r === "u" ? "rgba(16,185,129,.15)" : "rgba(255,255,255,.05)", border: `1px solid ${m.r === "u" ? "rgba(16,185,129,.25)" : "rgba(255,255,255,.07)"}`, borderRadius: m.r === "u" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "9px 12px", fontSize: 13, color: "rgba(255,255,255,.85)", lineHeight: 1.6 }, children: m.r === "ai" ? renderMsg(m.t) : m.t })
            ] }, i)),
            loading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8, alignItems: "flex-start" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }, children: "\u{1F916}" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "14px 14px 14px 4px", padding: "9px 12px" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", gap: 4 }, children: [0, 1, 2].map((j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 6, height: 6, borderRadius: "50%", background: "var(--em)", opacity: 0.7, animation: `pulse 1.2s ease-in-out ${j * 0.2}s infinite` } }, j)) }) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: bottomRef })
          ] }),
          !canChat && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "10px 14px", background: "rgba(245,158,11,.08)", borderTop: "1px solid rgba(245,158,11,.15)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "rgba(245,158,11,.8)" }, children: L("Gratis-Limit erreicht", "Free limit reached", "Limite gratuit atteint", "Limite raggiunto") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => setPw(true), style: { background: "var(--am)", color: "white", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }, children: [
              "Pro ",
              L("freischalten", "unlock", "activer", "sblocca"),
              " \u2192"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { borderTop: "1px solid rgba(255,255,255,.07)", padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-end" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "textarea",
              {
                value: input,
                onChange: (e) => setInput(e.target.value),
                onKeyDown: (e) => {
                  if (e.key === "Enter" && !e.shiftKey && !loading && canChat) {
                    e.preventDefault();
                    send();
                  }
                },
                placeholder: canChat ? L("Frag mich etwas\u2026", "Ask me anything\u2026", "Posez-moi une question\u2026", "Chiedimi qualcosa\u2026") : L("Pro freischalten\u2026", "Unlock Pro\u2026", "Activer Pro\u2026", "Sblocca Pro\u2026"),
                disabled: !canChat || loading,
                style: { flex: 1, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "8px 11px", fontSize: 13, color: "white", resize: "none", minHeight: 36, maxHeight: 90, outline: "none", lineHeight: 1.5 },
                rows: 1
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                onClick: send,
                disabled: !input.trim() || loading || !canChat,
                style: { width: 36, height: 36, borderRadius: 10, background: input.trim() && canChat ? "var(--em)" : "rgba(255,255,255,.08)", border: "none", cursor: input.trim() && canChat ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, transition: "background .2s" },
                children: loading ? "\u23F3" : "\u27A4"
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `@keyframes pulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.3);opacity:1}}@keyframes fadeSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}` })
    ] });
  }
  function BewerbungsTracker({ lang, pro, setPw, navTo }) {
    const L = (d, e, f, i) => ({ de: d, en: e, fr: f, it: i })[lang] || d;
    const STATUS = {
      beworben: { de: "Beworben", en: "Applied", fr: "Postul\xE9", it: "Candidato", col: "#3b82f6", bg: "rgba(59,130,246,.1)" },
      pruefung: { de: "In Pr\xFCfung", en: "Under review", fr: "En cours", it: "In esame", col: "#f59e0b", bg: "rgba(245,158,11,.1)" },
      interview: { de: "Interview", en: "Interview", fr: "Entretien", it: "Colloquio", col: "#8b5cf6", bg: "rgba(139,92,246,.1)" },
      angebot: { de: "Angebot", en: "Offer", fr: "Offre", it: "Offerta", col: "#10b981", bg: "rgba(16,185,129,.1)" },
      abgelehnt: { de: "Abgelehnt", en: "Rejected", fr: "Refus\xE9", it: "Rifiutato", col: "#ef4444", bg: "rgba(239,68,68,.1)" },
      zurueck: { de: "Zur\xFCckgezogen", en: "Withdrawn", fr: "Retir\xE9", it: "Ritirato", col: "#6b7280", bg: "rgba(107,114,128,.1)" }
    };
    const DEMO = [
      { id: 1, firma: "Migros", stelle: "Product Manager", datum: "2026-02-15", status: "interview", prio: "hoch", notiz: "2. Interview am 20.3." },
      { id: 2, firma: "Swiss Re", stelle: "Risk Analyst", datum: "2026-02-20", status: "pruefung", prio: "mittel", notiz: "" },
      { id: 3, firma: "Nestl\xE9", stelle: "Marketing Manager", datum: "2026-03-01", status: "beworben", prio: "tief", notiz: "\xDCber LinkedIn beworben" }
    ];
    const [jobs, setJobs] = useState(DEMO);
    const [filter, setFilter] = useState("alle");
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({ firma: "", stelle: "", datum: "", status: "beworben", prio: "mittel", notiz: "" });
    const filtered = filter === "alle" ? jobs : jobs.filter((j) => j.status === filter);
    const stats = Object.keys(STATUS).map((k) => ({ key: k, label: STATUS[k][lang] || STATUS[k].de, count: jobs.filter((j) => j.status === k).length, col: STATUS[k].col }));
    function openAdd() {
      setForm({ firma: "", stelle: "", datum: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), status: "beworben", prio: "mittel", notiz: "" });
      setModal({ mode: "add" });
    }
    function openEdit(job) {
      setForm({ ...job });
      setModal({ mode: "edit", job });
    }
    function save() {
      if (!form.firma || !form.stelle) return;
      if (modal.mode === "add") setJobs((j) => [...j, { ...form, id: Date.now() }]);
      else setJobs((j) => j.map((x) => x.id === modal.job.id ? { ...form, id: x.id } : x));
      setModal(null);
    }
    function del(id) {
      setJobs((j) => j.filter((x) => x.id !== id));
    }
    function changeStatus(id, st) {
      setJobs((j) => j.map((x) => x.id === id ? { ...x, status: st } : x));
    }
    const prioCol = { hoch: "#ef4444", mittel: "#f59e0b", tief: "#6b7280" };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { minHeight: "80vh", background: "var(--bg)" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "page-hdr dk", style: { paddingBottom: 32 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "con", style: { maxWidth: 900 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => navTo("landing"), style: { background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", color: "rgba(255,255,255,.7)", borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "var(--bd)" }, children: [
            "\u2190 ",
            L("Zur\xFCck", "Back", "Retour", "Indietro")
          ] }),
          !pro && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { background: "linear-gradient(135deg,#10b981,#059669)", color: "white", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }, children: "PRO" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [
          "\u{1F4CB} ",
          L("Bewerbungs-Tracker", "Application Tracker", "Suivi des candidatures", "Tracker candidature")
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: L("Alle Bewerbungen im \xDCberblick \u2013 Status, Priorit\xE4t, Notizen.", "All applications at a glance \u2013 status, priority, notes.", "Toutes les candidatures \u2013 statut, priorit\xE9, notes.", "Tutte le candidature \u2013 stato, priorit\xE0, note.") })
      ] }) }),
      !pro ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "abody", style: { maxWidth: 640, textAlign: "center" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ipw", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: [
          "\u{1F4CB} ",
          L("Bewerbungs-Tracker freischalten", "Unlock Application Tracker", "D\xE9bloquer le tracker", "Sblocca il tracker")
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: L("Behalte alle Bewerbungen im Blick. Status, Priorit\xE4t, Notizen \u2013 alles an einem Ort.", "Keep all applications in view. Status, priority, notes \u2013 all in one place.", "Suivez toutes vos candidatures. Statut, priorit\xE9, notes \u2013 tout en un.", "Tieni traccia di tutte le candidature. Stato, priorit\xE0, note \u2013 tutto in un posto.") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ipw-pr", children: [
          "CHF ",
          C.priceM,
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "/Mo." })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ipw-fts", children: ["\u{1F4CB} Tracker", "\u270D\uFE0F Bewerbungen", "\u{1F916} ATS", "\u{1F4DC} Zeugnis", "\u{1F3AF} Matching"].map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ipw-ft", children: [
          "\u2713 ",
          f
        ] }, f)) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "btn b-em b-lg b-w", onClick: () => setPw(true), children: [
          "\u2726 ",
          L("Pro freischalten \u2192", "Unlock Pro \u2192", "Activer Pro \u2192", "Attiva Pro \u2192")
        ] })
      ] }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { maxWidth: 900, margin: "0 auto", padding: "32px 20px 80px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10, marginBottom: 24 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { onClick: () => setFilter("alle"), style: { cursor: "pointer", padding: "14px 16px", background: filter === "alle" ? "var(--ink)" : "white", border: "1.5px solid " + (filter === "alle" ? "var(--ink)" : "var(--bo)"), borderRadius: 12, textAlign: "center" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 26, fontWeight: 800, color: filter === "alle" ? "white" : "var(--ink)" }, children: jobs.length }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: filter === "alle" ? "rgba(255,255,255,.6)" : "var(--mu)", marginTop: 3 }, children: L("Alle", "All", "Toutes", "Tutte") })
          ] }),
          stats.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { onClick: () => setFilter(filter === s.key ? "alle" : s.key), style: { cursor: "pointer", padding: "14px 16px", background: filter === s.key ? s.col : "white", border: "1.5px solid " + (filter === s.key ? s.col : "var(--bo)"), borderRadius: 12, textAlign: "center", transition: "all .18s" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 26, fontWeight: 800, color: filter === s.key ? "white" : s.col }, children: s.count }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: filter === s.key ? "rgba(255,255,255,.7)" : "var(--mu)", marginTop: 3 }, children: s.label })
          ] }, s.key))
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 13, color: "var(--mu)" }, children: [
            filtered.length,
            " ",
            L("Eintr\xE4ge", "entries", "entr\xE9es", "voci")
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "btn b-em b-sm", onClick: openAdd, children: [
            "+ ",
            L("Neue Bewerbung", "New application", "Nouvelle candidature", "Nuova candidatura")
          ] })
        ] }),
        filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { textAlign: "center", padding: "48px 20px", color: "var(--mu)", fontSize: 14 }, children: L("Keine Bewerbungen in dieser Kategorie.", "No applications in this category.", "Aucune candidature dans cette cat\xE9gorie.", "Nessuna candidatura in questa categoria.") }) : filtered.map((job) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "white", border: "1.5px solid var(--bo)", borderRadius: 14, padding: "16px 20px", marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start", transition: "box-shadow .18s" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, minWidth: 200 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 16, fontWeight: 700 }, children: job.stelle }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 8, height: 8, borderRadius: "50%", background: prioCol[job.prio], flexShrink: 0 }, title: job.prio })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 13, color: "var(--mu)", marginBottom: job.notiz ? 6 : 0 }, children: [
              job.firma,
              " \xB7 ",
              job.datum
            ] }),
            job.notiz && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "var(--mu)", background: "var(--bos)", borderRadius: 6, padding: "4px 9px", display: "inline-block" }, children: job.notiz })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "select",
              {
                value: job.status,
                onChange: (e) => changeStatus(job.id, e.target.value),
                style: { padding: "5px 10px", borderRadius: 8, border: "1.5px solid", borderColor: STATUS[job.status].col, background: STATUS[job.status].bg, color: STATUS[job.status].col, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--bd)" },
                children: Object.entries(STATUS).map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: k, children: v[lang] || v.de }, k))
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => openEdit(job), style: { background: "none", border: "1px solid var(--bo)", borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: "var(--bd)", color: "var(--ink)" }, children: "\u270F\uFE0F" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => del(job.id), style: { background: "none", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer", color: "#ef4444", fontFamily: "var(--bd)" }, children: "\u2715" })
          ] })
        ] }, job.id))
      ] }),
      modal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mbg", onClick: (e) => {
        if (e.target === e.currentTarget) setModal(null);
      }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mod", style: { maxWidth: 520 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { style: { marginBottom: 20 }, children: modal.mode === "add" ? L("Neue Bewerbung", "New application", "Nouvelle candidature", "Nuova candidatura") : L("Bearbeiten", "Edit", "Modifier", "Modifica") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "fg2", style: { textAlign: "left" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: L("Stelle *", "Position *", "Poste *", "Posizione *") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: form.stelle, onChange: (e) => setForm((f) => ({ ...f, stelle: e.target.value })), placeholder: L("z.B. Product Manager", "e.g. Product Manager", "ex. Chef de produit", "es. Product Manager") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: L("Firma *", "Company *", "Entreprise *", "Azienda *") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: form.firma, onChange: (e) => setForm((f) => ({ ...f, firma: e.target.value })), placeholder: L("z.B. Nestl\xE9 AG", "e.g. Nestl\xE9 AG", "ex. Nestl\xE9 SA", "es. Nestl\xE9 SA") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: L("Datum", "Date", "Date", "Data") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "date", value: form.datum, onChange: (e) => setForm((f) => ({ ...f, datum: e.target.value })) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Status" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { value: form.status, onChange: (e) => setForm((f) => ({ ...f, status: e.target.value })), style: { width: "100%", padding: "10px 13px", border: "1.5px solid var(--bo)", borderRadius: 10, fontFamily: "var(--bd)", fontSize: 14, background: "#fafafa" }, children: Object.entries(STATUS).map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: k, children: v[lang] || v.de }, k)) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: L("Priorit\xE4t", "Priority", "Priorit\xE9", "Priorit\xE0") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: form.prio, onChange: (e) => setForm((f) => ({ ...f, prio: e.target.value })), style: { width: "100%", padding: "10px 13px", border: "1.5px solid var(--bo)", borderRadius: 10, fontFamily: "var(--bd)", fontSize: 14, background: "#fafafa" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "hoch", children: L("Hoch", "High", "Haute", "Alta") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "mittel", children: L("Mittel", "Medium", "Moyenne", "Media") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "tief", children: L("Tief", "Low", "Basse", "Bassa") })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", style: { textAlign: "left", marginTop: 12 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: L("Notiz", "Note", "Note", "Nota") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: form.notiz, onChange: (e) => setForm((f) => ({ ...f, notiz: e.target.value })), placeholder: L("z.B. N\xE4chster Schritt, Kontaktperson\u2026", "e.g. Next step, contact person\u2026", "ex. Prochaine \xE9tape, contact\u2026", "es. Prossimo passo, contatto\u2026"), style: { width: "100%", padding: "10px 13px", border: "1.5px solid var(--bo)", borderRadius: 10, fontFamily: "var(--bd)", fontSize: 14, background: "#fafafa", minHeight: 64, resize: "none" } })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 10, marginTop: 20 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd", style: { flex: 1 }, onClick: () => setModal(null), children: L("Abbrechen", "Cancel", "Annuler", "Annulla") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em", style: { flex: 1 }, onClick: save, disabled: !form.firma || !form.stelle, children: L("Speichern", "Save", "Enregistrer", "Salva") })
        ] })
      ] }) })
    ] });
  }
  function AuthModal({ lang, onClose, onSuccess, defaultMode = "login" }) {
    const L = (d, e, f, i) => ({ de: d, en: e, fr: f, it: i })[lang] || d;
    const [mode, setMode] = useState(defaultMode);
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [pw2, setPw2] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const [socialLoading, setSocialLoading] = useState("");
    const [socialEmail, setSocialEmail] = useState("");
    const [socialProvider, setSocialProvider] = useState("");
    const [showSocialInput, setShowSocialInput] = useState(false);
    const PROVIDERS = [
      {
        id: "google",
        label: "Google",
        bg: "white",
        color: "#3c4043",
        border: "#dadce0",
        logo: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: "18", height: "18", viewBox: "0 0 24 24", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { fill: "#4285F4", d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { fill: "#34A853", d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { fill: "#FBBC05", d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { fill: "#EA4335", d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" })
        ] })
      },
      {
        id: "apple",
        label: "Apple",
        bg: "#000",
        color: "white",
        border: "#000",
        logo: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: "16", height: "18", viewBox: "0 0 814 1000", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { fill: "white", d: "M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 411.6 0 282.7 0 157.4c0-190.5 124.4-291.2 247.2-291.2 65.5 0 120 43.1 161.3 43.1 39.5 0 101.2-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" }) })
      },
      {
        id: "linkedin",
        label: "LinkedIn",
        bg: "#0a66c2",
        color: "white",
        border: "#0a66c2",
        logo: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontFamily: "Georgia,serif", fontSize: 14, fontWeight: 900, color: "white" }, children: "in" })
      }
    ];
    const handleSocialLogin = (provider) => {
      setSocialProvider(provider);
      setShowSocialInput(true);
      setErr("");
    };
    const confirmSocialLogin = () => {
      if (!socialEmail.includes("@")) {
        setErr(L("G\xFCltige E-Mail eingeben", "Enter valid email", "E-mail valide requise", "E-mail valida richiesta"));
        return;
      }
      setSocialLoading(socialProvider);
      setTimeout(() => {
        const displayName = socialEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const r = authSocialLogin(socialProvider, socialEmail, displayName, "");
        setSocialLoading("");
        setShowSocialInput(false);
        if (r.ok) onSuccess(r.user);
      }, 800);
    };
    function handleLogin(e) {
      e.preventDefault();
      setErr("");
      setLoading(true);
      setTimeout(() => {
        if (authIsAdmin(email, pw)) {
          onSuccess({ email, plan: "admin", isAdmin: true });
          return;
        }
        const r = authLogin(email, pw);
        if (r.ok) onSuccess(r.user);
        else {
          setErr(r.err);
          setLoading(false);
        }
      }, 400);
    }
    function handleRegister(e) {
      e.preventDefault();
      setErr("");
      if (!email.includes("@")) return setErr(L("Ung\xFCltige E-Mail.", "Invalid email.", "E-mail invalide.", "E-mail non valida."));
      if (pw.length < 6) return setErr(L("Passwort mind. 6 Zeichen.", "Password min. 6 chars.", "Mot de passe min. 6 car.", "Password min. 6 car."));
      if (pw !== pw2) return setErr(L("Passw\xF6rter stimmen nicht \xFCberein.", "Passwords don't match.", "Mots de passe diff\xE9rents.", "Password non corrispondono."));
      setLoading(true);
      setTimeout(() => {
        const r = authRegister(email, pw, "free");
        if (r.ok) onSuccess(r.user);
        else {
          setErr(r.err);
          setLoading(false);
        }
      }, 400);
    }
    const inp = { background: "rgba(255,255,255,.07)", border: "1.5px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "11px 14px", width: "100%", color: "white", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color .2s" };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mbg", onClick: (e) => {
      if (e.target === e.currentTarget) onClose();
    }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mod", style: { maxWidth: 420, textAlign: "left" }, children: [
      showSocialInput && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { animation: "fadeSlideIn .3s ease" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => {
            setShowSocialInput(false);
            setErr("");
          }, style: { background: "rgba(255,255,255,.08)", border: "none", color: "white", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 13 }, children: [
            "\u2190 ",
            L("Zur\xFCck", "Back", "Retour", "Indietro")
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 13, color: "rgba(255,255,255,.4)" }, children: L(
            `Mit ${socialProvider.charAt(0).toUpperCase() + socialProvider.slice(1)} fortfahren`,
            `Continue with ${socialProvider.charAt(0).toUpperCase() + socialProvider.slice(1)}`,
            `Continuer avec ${socialProvider.charAt(0).toUpperCase() + socialProvider.slice(1)}`,
            `Continua con ${socialProvider.charAt(0).toUpperCase() + socialProvider.slice(1)}`
          ) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "20px", marginBottom: 16, textAlign: "center" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 14, lineHeight: 1.6 }, children: L(
            "In Produktion \xF6ffnet sich hier das echte OAuth-Fenster von Google/Apple/LinkedIn. F\xFCr die Demo: E-Mail eingeben.",
            "In production, the real OAuth popup from Google/Apple/LinkedIn opens here. For demo: enter your email.",
            "En production, la vraie fen\xEAtre OAuth s'ouvre ici. Pour la d\xE9mo: entrez votre e-mail.",
            "In produzione si apre la vera finestra OAuth. Per la demo: inserisci la tua e-mail."
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              type: "email",
              value: socialEmail,
              onChange: (e) => setSocialEmail(e.target.value),
              onKeyDown: (e) => e.key === "Enter" && confirmSocialLogin(),
              placeholder: "your@email.com",
              style: { ...inp, marginBottom: 12 },
              autoFocus: true
            }
          ),
          err && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: "#ef4444", fontSize: 12, marginBottom: 8 }, children: err }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              onClick: confirmSocialLogin,
              disabled: !!socialLoading,
              style: { width: "100%", padding: "12px", background: "var(--em)", border: "none", borderRadius: 10, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
              children: socialLoading ? "\u23F3 \u2026" : L("Weiter \u2192", "Continue \u2192", "Continuer \u2192", "Continua \u2192")
            }
          )
        ] })
      ] }),
      !showSocialInput && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", gap: 4, background: "rgba(255,255,255,.06)", borderRadius: 12, padding: 4, marginBottom: 24 }, children: [["login", L("Einloggen", "Sign in", "Connexion", "Accedi")], ["register", L("Registrieren", "Register", "S'inscrire", "Registrati")]].map(([m, lbl]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            onClick: () => {
              setMode(m);
              setErr("");
            },
            style: {
              flex: 1,
              padding: "9px 0",
              borderRadius: 9,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 700,
              transition: "all .2s",
              background: mode === m ? "var(--em)" : "transparent",
              color: mode === m ? "white" : "rgba(255,255,255,.4)"
            },
            children: lbl
          },
          m
        )) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }, children: PROVIDERS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            onClick: () => handleSocialLogin(p.id),
            disabled: !!socialLoading,
            style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px 16px", background: p.bg, border: `1.5px solid ${p.border}`, borderRadius: 11, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: p.color, transition: "all .18s", opacity: socialLoading === p.id ? 0.7 : 1 },
            children: [
              socialLoading === p.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 14 }, children: "\u23F3" }) : p.logo,
              L(
                `Mit ${p.label} ${mode === "login" ? "einloggen" : "registrieren"}`,
                `${mode === "login" ? "Sign in" : "Sign up"} with ${p.label}`,
                `${mode === "login" ? "Connexion" : "Inscription"} avec ${p.label}`,
                `${mode === "login" ? "Accedi" : "Registrati"} con ${p.label}`
              )
            ]
          },
          p.id
        )) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { flex: 1, height: 1, background: "rgba(255,255,255,.08)" } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: "rgba(255,255,255,.25)", fontWeight: 600, letterSpacing: "1px" }, children: L("ODER MIT E-MAIL", "OR WITH EMAIL", "OU PAR E-MAIL", "O CON E-MAIL") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { flex: 1, height: 1, background: "rgba(255,255,255,.08)" } })
        ] }),
        mode === "login" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: handleLogin, style: { display: "flex", flexDirection: "column", gap: 10 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "email", placeholder: "E-Mail", value: email, onChange: (e) => setEmail(e.target.value), required: true, style: inp }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { position: "relative" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: showPw ? "text" : "password", placeholder: L("Passwort", "Password", "Mot de passe", "Password"), value: pw, onChange: (e) => setPw(e.target.value), required: true, style: { ...inp, paddingRight: 44 } }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => setShowPw((v) => !v), style: { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.3)", fontSize: 16 }, children: showPw ? "\u{1F648}" : "\u{1F441}" })
            ] }),
            err && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: "#ef4444", fontSize: 12, padding: "7px 11px", background: "rgba(239,68,68,.08)", borderRadius: 8 }, children: err }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", className: "btn b-em b-w", disabled: loading, style: { marginTop: 2 }, children: loading ? "\u23F3 \u2026" : L("Einloggen \u2192", "Sign in \u2192", "Connexion \u2192", "Accedi \u2192") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { textAlign: "center", marginTop: 14, fontSize: 12, color: "rgba(255,255,255,.25)" }, children: [
            L("Kein Account?", "No account?", " Pas de compte?", "Nessun account?"),
            " ",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => setMode("register"), style: { background: "none", border: "none", color: "var(--em)", cursor: "pointer", fontWeight: 700, fontSize: 12 }, children: L("Registrieren", "Register", "S'inscrire", "Registrati") })
          ] })
        ] }),
        mode === "register" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: handleRegister, style: { display: "flex", flexDirection: "column", gap: 10 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "email", placeholder: "E-Mail", value: email, onChange: (e) => setEmail(e.target.value), required: true, style: inp }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { position: "relative" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: showPw ? "text" : "password", placeholder: L("Passwort (mind. 6 Zeichen)", "Password (min. 6 chars)", "Mot de passe (min. 6 car.)", "Password (min. 6 car.)"), value: pw, onChange: (e) => setPw(e.target.value), required: true, style: { ...inp, paddingRight: 44 } }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => setShowPw((v) => !v), style: { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.3)", fontSize: 16 }, children: showPw ? "\u{1F648}" : "\u{1F441}" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "password", placeholder: L("Passwort wiederholen", "Repeat password", "R\xE9p\xE9tez", "Ripeti"), value: pw2, onChange: (e) => setPw2(e.target.value), required: true, style: inp }),
            err && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: "#ef4444", fontSize: 12, padding: "7px 11px", background: "rgba(239,68,68,.08)", borderRadius: 8 }, children: err }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", className: "btn b-em b-w", disabled: loading, style: { marginTop: 2 }, children: loading ? "\u23F3 \u2026" : L("Gratis starten \u2192", "Start for free \u2192", "Commencer gratuitement \u2192", "Inizia gratis \u2192") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { textAlign: "center", marginTop: 14, fontSize: 12, color: "rgba(255,255,255,.25)" }, children: [
            L("Bereits ein Konto?", "Already have an account?", "D\xE9j\xE0 un compte?", "Hai gi\xE0 un account?"),
            " ",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => setMode("login"), style: { background: "none", border: "none", color: "var(--em)", cursor: "pointer", fontWeight: 700, fontSize: 12 }, children: L("Einloggen", "Sign in", "Connexion", "Accedi") })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { textAlign: "center", marginTop: 20 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: onClose, style: { background: "none", border: "none", color: "rgba(255,255,255,.18)", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }, children: L("Schliessen", "Close", "Fermer", "Chiudi") }) })
    ] }) });
  }
  function MemberPanel({ lang, session, onClose }) {
    const L = (d, e, f, i) => ({ de: d, en: e, fr: f, it: i })[lang] || d;
    const [members, setMembers] = React.useState([]);
    const [newEmail, setNewEmail] = React.useState("");
    const [err, setErr] = React.useState("");
    const [ok, setOk] = React.useState("");
    const maxSeats = session.plan === "family" ? 4 : 10;
    const planLabel = session.plan === "family" ? L("Familie", "Family", "Famille", "Famiglia") : "Team";
    React.useEffect(() => {
      const users = JSON.parse(localStorage.getItem("stf_auth_users") || "[]");
      const owner = users.find((u) => u.email.toLowerCase() === session.email.toLowerCase());
      setMembers(owner?.members || [session.email]);
    }, []);
    const add = () => {
      setErr("");
      setOk("");
      if (!newEmail.trim()) return;
      const res = authAddMember(session.email, newEmail.trim());
      if (res.ok) {
        setMembers((m) => [...m, newEmail.trim().toLowerCase()]);
        setNewEmail("");
        setOk(L("Mitglied hinzugef\xFCgt \u2713", "Member added \u2713", "Membre ajout\xE9 \u2713", "Membro aggiunto \u2713"));
      } else {
        setErr(res.err);
      }
    };
    const remove = (email) => {
      if (email.toLowerCase() === session.email.toLowerCase()) return;
      const users = JSON.parse(localStorage.getItem("stf_auth_users") || "[]");
      const owner = users.find((u) => u.email.toLowerCase() === session.email.toLowerCase());
      if (owner) {
        owner.members = owner.members.filter((m) => m !== email.toLowerCase());
        localStorage.setItem("stf_auth_users", JSON.stringify(users));
      }
      setMembers((m) => m.filter((x) => x !== email.toLowerCase()));
    };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mbg", onClick: (e) => e.target === e.currentTarget && onClose(), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mod", style: { maxWidth: 460, textAlign: "left" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { style: { fontSize: 20, margin: 0 }, children: [
            "\u{1F465} ",
            planLabel,
            "-",
            L("Mitglieder", "Members", "Membres", "Membri")
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 3 }, children: [
            members.length,
            "/",
            maxSeats,
            " ",
            L("Pl\xE4tze belegt", "seats used", "places occup\xE9es", "posti occupati")
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: onClose, style: { background: "none", border: "none", color: "rgba(255,255,255,.4)", fontSize: 20, cursor: "pointer" }, children: "\u2715" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { marginBottom: 16 }, children: members.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,.04)", borderRadius: 9, marginBottom: 6, border: "1px solid rgba(255,255,255,.07)" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 9 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,var(--em),#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white" }, children: m[0].toUpperCase() }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 13, fontWeight: 600, color: "white" }, children: m }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 10, color: "rgba(255,255,255,.3)" }, children: i === 0 ? L("Admin (du)", "Admin (you)", "Admin (vous)", "Admin (tu)") : L("Mitglied", "Member", "Membre", "Membro") })
          ] })
        ] }),
        i > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => remove(m), style: { background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.2)", color: "#f87171", borderRadius: 7, padding: "4px 9px", fontSize: 11, cursor: "pointer", fontWeight: 600 }, children: L("Entfernen", "Remove", "Retirer", "Rimuovi") })
      ] }, m)) }),
      members.length < maxSeats ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 8 }, children: L("E-Mail-Adresse des neuen Mitglieds eingeben:", "Enter the email address of the new member:", "Entrez l'adresse e-mail du nouveau membre:", "Inserisci l'indirizzo e-mail del nuovo membro:") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              value: newEmail,
              onChange: (e) => setNewEmail(e.target.value),
              onKeyDown: (e) => e.key === "Enter" && add(),
              placeholder: "name@beispiel.ch",
              type: "email",
              style: { flex: 1, padding: "9px 12px", borderRadius: 9, border: "1.5px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", color: "white", fontFamily: "var(--bd)", fontSize: 13, outline: "none" }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: add, className: "btn b-em b-sm", children: L("Hinzuf\xFCgen", "Add", "Ajouter", "Aggiungi") })
        ] }),
        err && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: "#f87171", fontSize: 12, marginTop: 7 }, children: err }),
        ok && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: "var(--em)", fontSize: 12, marginTop: 7 }, children: ok }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 10, lineHeight: 1.6 }, children: L("Das Mitglied muss sich mit dieser E-Mail bei Stellify registrieren, um Zugang zu erhalten.", "The member must register at Stellify with this email to gain access.", "Le membre doit s'inscrire sur Stellify avec cet e-mail pour acc\xE9der.", "Il membro deve registrarsi su Stellify con questa email per accedere.") })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { textAlign: "center", padding: "16px", background: "rgba(245,158,11,.08)", borderRadius: 10, border: "1px solid rgba(245,158,11,.2)", fontSize: 13, color: "rgba(245,158,11,.8)" }, children: L(`Alle ${maxSeats} Pl\xE4tze belegt.`, `All ${maxSeats} seats used.`, `Les ${maxSeats} places sont occup\xE9es.`, `Tutti i ${maxSeats} posti sono occupati.`) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-out b-sm", style: { width: "100%", marginTop: 18, borderColor: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.5)" }, onClick: onClose, children: L("Schliessen", "Close", "Fermer", "Chiudi") })
    ] }) });
  }
  function AdminDashboard({ lang, onClose }) {
    const [tab, setTab] = useState("overview");
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState(authGetUsers());
    const [upgradeModal, setUpgradeModal] = useState(null);
    const [newPlan, setNewPlan] = useState("pro");
    const chats = (() => {
      try {
        return JSON.parse(localStorage.getItem("stf_chats") || "[]");
      } catch {
        return [];
      }
    })();
    const refresh = () => setUsers(authGetUsers());
    const filtered = users.filter(
      (u) => u.email.toLowerCase().includes(search.toLowerCase()) || (u.plan || "").includes(search.toLowerCase()) || (u.displayName || "").toLowerCase().includes(search.toLowerCase())
    );
    const stats = {
      total: users.length,
      pro: users.filter((u) => u.plan === "pro").length,
      family: users.filter((u) => u.plan === "family").length,
      team: users.filter((u) => u.plan === "team").length,
      free: users.filter((u) => !u.plan || u.plan === "free").length
    };
    const mrr = (stats.pro * 19.9 + stats.family * 34.9 + stats.team * 59.9).toFixed(2);
    const arr = (parseFloat(mrr) * 12).toFixed(0);
    const convRate = stats.total > 0 ? ((stats.pro + stats.family + stats.team) / stats.total * 100).toFixed(1) : "0.0";
    const PLAN_COLORS = { pro: "#10b981", family: "#6366f1", team: "#f59e0b", free: "rgba(255,255,255,.35)" };
    const PLAN_ICONS = { pro: "\u2726", family: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}", team: "\u{1F3E2}", free: "\u{1F464}" };
    const PROVIDER_ICONS = { google: "G", apple: "", linkedin: "in", email: "@", stripe: "\u{1F4B3}" };
    const handleUpgrade = (email) => {
      authUpgradePlan(email, newPlan);
      setUpgradeModal(null);
      refresh();
    };
    const exportCSV = () => {
      const rows = [["E-Mail", "Plan", "Angemeldet", "Provider", "Seats", "Mitglieder"]];
      users.forEach((u) => rows.push([u.email, u.plan || "free", new Date(u.activatedAt || 0).toLocaleDateString("de-CH"), u.provider || "email", u.seats || 1, (u.members || []).length]));
      const csv = rows.map((r) => r.join(";")).join("\n");
      const a = document.createElement("a");
      a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
      a.download = "stellify-nutzer.csv";
      a.click();
    };
    const inpStyle = { width: "100%", padding: "9px 13px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, color: "white", fontFamily: "inherit", fontSize: 13, outline: "none", boxSizing: "border-box" };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mbg", onClick: (e) => {
      if (e.target === e.currentTarget) onClose();
    }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mod", style: { maxWidth: 760, textAlign: "left", maxHeight: "92vh", overflowY: "auto", padding: "28px 24px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 38, height: 38, background: "rgba(245,158,11,.15)", border: "1.5px solid rgba(245,158,11,.3)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }, children: "\u{1F6E1}\uFE0F" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { style: { fontSize: 20, margin: 0, fontFamily: "var(--hd)" }, children: "Admin Dashboard" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 1 }, children: [
              C.name,
              " \xB7 ",
              C.domain,
              " \xB7 Nur f\xFCr JTSP"
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: exportCSV, style: { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "6px 12px", color: "rgba(255,255,255,.5)", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }, children: "\u2B07 CSV Export" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: onClose, style: { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "6px 12px", color: "rgba(255,255,255,.5)", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }, children: "\u2715" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }, children: [
        { ico: "\u{1F4B0}", lbl: "MRR (CHF)", val: `${mrr}`, sub: "Monatlich hochgerechnet", c: "rgba(16,185,129,.1)", bc: "rgba(16,185,129,.25)" },
        { ico: "\u{1F4C8}", lbl: "ARR (CHF)", val: `${Number(arr).toLocaleString("de-CH")}`, sub: "Jahresumsatz-Prognose", c: "rgba(99,102,241,.1)", bc: "rgba(99,102,241,.25)" },
        { ico: "\u{1F3AF}", lbl: "Conv. Rate", val: `${convRate}%`, sub: "Free \u2192 Paid", c: "rgba(245,158,11,.1)", bc: "rgba(245,158,11,.25)" }
      ].map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: k.c, border: `1px solid ${k.bc}`, borderRadius: 12, padding: "14px 16px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 18, marginBottom: 4 }, children: k.ico }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 22, fontWeight: 800, color: "white", lineHeight: 1 }, children: k.val }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.45)", marginTop: 3, letterSpacing: "0.5px", textTransform: "uppercase" }, children: k.lbl }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 10, color: "rgba(255,255,255,.25)", marginTop: 1 }, children: k.sub })
      ] }, k.lbl)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 20 }, children: [["\u{1F465}", stats.total, "Total", "rgba(255,255,255,.05)", "rgba(255,255,255,.08)"], ["\u2726", stats.pro, "Pro", "rgba(16,185,129,.08)", "rgba(16,185,129,.2)"], ["\u{1F468}\u200D\u{1F469}\u200D\u{1F467}", stats.family, "Familie", "rgba(99,102,241,.08)", "rgba(99,102,241,.2)"], ["\u{1F3E2}", stats.team, "Team", "rgba(245,158,11,.08)", "rgba(245,158,11,.2)"]].map(([ico, val, lbl, bg, bc]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: bg, border: `1px solid ${bc}`, borderRadius: 10, padding: "10px", textAlign: "center" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 18 }, children: ico }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 20, fontWeight: 800, color: "white" }, children: val }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 10, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: "1px" }, children: lbl })
      ] }, lbl)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", gap: 4, background: "rgba(255,255,255,.04)", borderRadius: 10, padding: 4, marginBottom: 16 }, children: [["overview", "\xDCbersicht"], ["users", "Nutzer"], ["chats", "Chats"], ["config", "Config"]].map(([t, l]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => setTab(t), style: { flex: 1, padding: "7px 0", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700, background: tab === t ? "rgba(255,255,255,.12)" : "transparent", color: tab === t ? "white" : "rgba(255,255,255,.35)" }, children: l }, t)) }),
      tab === "overview" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: 18, marginBottom: 14 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.4)", letterSpacing: "1px", marginBottom: 12, textTransform: "uppercase" }, children: "Plan-Verteilung" }),
          [["Pro", stats.pro, stats.total, "#10b981"], ["Familie", stats.family, stats.total, "#6366f1"], ["Team", stats.team, stats.total, "#f59e0b"], ["Gratis", stats.free, stats.total, "rgba(255,255,255,.25)"]].map(([lbl, n, tot, c]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: "rgba(255,255,255,.5)", width: 60 }, children: lbl }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { flex: 1, height: 6, background: "rgba(255,255,255,.07)", borderRadius: 10, overflow: "hidden" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: "100%", width: `${tot ? n / tot * 100 : 0}%`, background: c, borderRadius: 10, transition: "width .6s ease" } }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, fontWeight: 700, color: "white", width: 30, textAlign: "right" }, children: n })
          ] }, lbl))
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "rgba(16,185,129,.04)", border: "1px solid rgba(16,185,129,.15)", borderRadius: 14, padding: "14px 18px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", letterSpacing: "1px", marginBottom: 8, textTransform: "uppercase" }, children: "Umsatz-\xDCbersicht (Hochrechnung)" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }, children: [
            [`${stats.pro} \xD7 CHF 19.90`, "Pro", `= CHF ${(stats.pro * 19.9).toFixed(2)}`],
            [`${stats.family} \xD7 CHF 34.90`, "Familie", `= CHF ${(stats.family * 34.9).toFixed(2)}`],
            [`${stats.team} \xD7 CHF 59.90`, "Team", `= CHF ${(stats.team * 59.9).toFixed(2)}`]
          ].map(([a, b, c]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "rgba(255,255,255,.04)", borderRadius: 10, padding: "10px 12px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 10, color: "rgba(255,255,255,.35)" }, children: a }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.5)", marginTop: 2 }, children: b }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 14, fontWeight: 800, color: "var(--em)", marginTop: 2 }, children: c })
          ] }, b)) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: "rgba(255,255,255,.35)" }, children: "Total MRR" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontFamily: "var(--hd)", fontSize: 18, fontWeight: 800, color: "var(--em)" }, children: [
              "CHF ",
              mrr
            ] })
          ] })
        ] })
      ] }),
      tab === "users" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { placeholder: "Suchen nach E-Mail, Name, Plan\u2026", value: search, onChange: (e) => setSearch(e.target.value), style: { ...inpStyle, marginBottom: 12 } }),
        filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { textAlign: "center", padding: 24, color: "rgba(255,255,255,.25)", fontSize: 13 }, children: "Keine Nutzer gefunden" }),
        filtered.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "12px 14px", marginBottom: 8 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,.08)", border: "1.5px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, fontWeight: 700 }, children: PLAN_ICONS[u.plan || "free"] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 13, fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: u.displayName || u.email.split("@")[0] }),
              u.provider && u.provider !== "email" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 9, fontWeight: 700, background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.4)", borderRadius: 6, padding: "1px 6px", textTransform: "uppercase" }, children: u.provider })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: u.email }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 10, color: "rgba(255,255,255,.2)", marginTop: 2 }, children: [
              "Seit ",
              new Date(u.activatedAt || 0).toLocaleDateString("de-CH"),
              " \xB7 ",
              (u.members || []).length,
              "/",
              u.seats || 1,
              " Seats"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: `${PLAN_COLORS[u.plan || "free"]}22`, color: PLAN_COLORS[u.plan || "free"], border: `1px solid ${PLAN_COLORS[u.plan || "free"]}44`, textTransform: "uppercase" }, children: u.plan || "Free" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                onClick: () => {
                  setUpgradeModal({ email: u.email, plan: u.plan });
                  setNewPlan(u.plan === "free" ? "pro" : u.plan);
                },
                style: { fontSize: 10, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 6, padding: "3px 9px", color: "rgba(255,255,255,.4)", cursor: "pointer", fontFamily: "inherit" },
                children: "Plan \xE4ndern"
              }
            )
          ] })
        ] }) }, u.email))
      ] }),
      tab === "chats" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 12, color: "rgba(255,255,255,.3)", marginBottom: 12 }, children: [
          chats.length,
          " gespeicherte Chats"
        ] }),
        chats.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { textAlign: "center", padding: 24, color: "rgba(255,255,255,.25)", fontSize: 13 }, children: "Keine Chats vorhanden" }),
        chats.slice(0, 20).map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 10, padding: "10px 13px", marginBottom: 6 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.7)" }, children: c.title || "Chat" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 2 }, children: [
            c.msgs?.length || 0,
            " Nachrichten \xB7 ",
            new Date(c.ts || 0).toLocaleString("de-CH")
          ] })
        ] }, c.id || i))
      ] }),
      tab === "config" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.2)", borderRadius: 14, padding: "16px 18px", marginBottom: 14 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, fontWeight: 700, color: "rgba(245,158,11,.7)", letterSpacing: "1px", marginBottom: 10, textTransform: "uppercase" }, children: "\u{1F511} Admin-Zugangsdaten (nur du siehst das)" }),
          [["E-Mail", C.ADMIN_EMAIL], ["Passwort", C.ADMIN_PW], ["Domain", C.domain], ["Groq API Key", C.GROQ_KEY.slice(0, 20) + "\u2026"]].map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: "rgba(255,255,255,.3)" }, children: k }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,.6)" }, children: v })
          ] }, k))
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "16px 18px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", letterSpacing: "1px", marginBottom: 10, textTransform: "uppercase" }, children: "\u{1F4B0} Aktuelle Preise" }),
          [["Pro monatlich", `CHF ${C.priceM}`], ["Pro j\xE4hrlich", `CHF ${C.priceY}/Mo.`], ["Familie", `CHF 34.90/Mo.`], ["Team", `CHF 59.90/Mo.`], ["Free Limit", `${C.FREE_LIMIT}\xD7 Gratis`], ["Neue Tools Limit", `${C.NEW_TOOL_FREE_LIMIT}\xD7 Gratis`]].map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: "rgba(255,255,255,.4)" }, children: k }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, fontWeight: 700, color: "var(--em)" }, children: v })
          ] }, k))
        ] })
      ] }),
      upgradeModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }, onClick: () => setUpgradeModal(null), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "#1a1a2e", border: "1px solid rgba(255,255,255,.12)", borderRadius: 16, padding: "24px", maxWidth: 340, width: "90%", animation: "scaleIn .2s ease" }, onClick: (e) => e.stopPropagation(), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 14, fontWeight: 700, color: "white", marginBottom: 4 }, children: "Plan \xE4ndern" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 16 }, children: upgradeModal.email }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { value: newPlan, onChange: (e) => setNewPlan(e.target.value), style: { ...inpStyle, marginBottom: 16 }, children: ["free", "pro", "family", "team"].map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: p, style: { background: "#1a1a2e" }, children: p.charAt(0).toUpperCase() + p.slice(1) }, p)) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => setUpgradeModal(null), style: { flex: 1, padding: "10px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, color: "rgba(255,255,255,.4)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }, children: "Abbrechen" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => handleUpgrade(upgradeModal.email), style: { flex: 1, padding: "10px", background: "var(--em)", border: "none", borderRadius: 10, color: "white", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }, children: "Speichern" })
        ] })
      ] }) })
    ] }) });
  }
  function ProfileManager({ lang, onClose, onSelect }) {
    const L = (d, e, f, i) => ({ de: d, en: e, fr: f, it: i })[lang] || d;
    const [profiles, setProfiles] = useState(() => loadProfiles());
    const [activeId, setActiveId] = useState(() => loadActiveProfileId());
    const [editing, setEditing] = useState(null);
    const EMPTY = { name: "", beruf: "", erfahrung: "", skills: "", sprachen: "", ausbildung: "", emoji: "\u{1F464}" };
    const [form, setForm] = useState(EMPTY);
    const EMOJIS = ["\u{1F464}", "\u{1F468}\u200D\u{1F4BC}", "\u{1F469}\u200D\u{1F4BC}", "\u{1F468}\u200D\u{1F4BB}", "\u{1F469}\u200D\u{1F4BB}", "\u{1F468}\u200D\u{1F52C}", "\u{1F469}\u200D\u{1F52C}", "\u{1F468}\u200D\u{1F393}", "\u{1F469}\u200D\u{1F393}", "\u{1F9D1}\u200D\u2695\uFE0F", "\u{1F9D1}\u200D\u{1F3EB}", "\u{1F9D1}\u200D\u{1F3A8}", "\u{1F9D1}\u200D\u{1F527}"];
    function openNew() {
      setForm({ ...EMPTY, id: "p" + Date.now() });
      setEditing({ mode: "new" });
    }
    function openEdit(p) {
      setForm({ ...p });
      setEditing({ mode: "edit", id: p.id });
    }
    function save() {
      if (!form.name) return;
      let updated;
      if (editing.mode === "new") {
        updated = [...profiles, { ...form, id: form.id || "p" + Date.now() }];
      } else {
        updated = profiles.map((p) => p.id === editing.id ? { ...form, id: editing.id } : p);
      }
      setProfiles(updated);
      saveProfiles(updated);
      setEditing(null);
    }
    function del(id) {
      const updated = profiles.filter((p) => p.id !== id);
      setProfiles(updated);
      saveProfiles(updated);
      if (activeId === id) {
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
    if (editing) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mbg", onClick: (e) => {
      if (e.target === e.currentTarget) setEditing(null);
    }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mod", style: { maxWidth: 500, textAlign: "left" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { style: { marginBottom: 4, fontSize: 22 }, children: editing.mode === "new" ? L("Neues Profil", "New profile", "Nouveau profil", "Nuovo profilo") : L("Profil bearbeiten", "Edit profile", "Modifier profil", "Modifica profilo") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { marginBottom: 18 }, children: L("Angaben werden f\xFCr alle Tools verwendet.", "Used across all tools.", "Utilis\xE9 pour tous les outils.", "Usato per tutti gli strumenti.") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginBottom: 14 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginBottom: 8 }, children: L("Avatar", "Avatar", "Avatar", "Avatar") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" }, children: EMOJIS.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            onClick: () => setForm((f) => ({ ...f, emoji: e })),
            style: { width: 36, height: 36, borderRadius: 8, border: `2px solid ${form.emoji === e ? "var(--em)" : "rgba(255,255,255,.1)"}`, background: form.emoji === e ? "rgba(16,185,129,.15)" : "rgba(255,255,255,.04)", fontSize: 18, cursor: "pointer", transition: "all .15s" },
            children: e
          },
          e
        )) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "fg2", style: { gap: 10 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: { color: "rgba(255,255,255,.5)" }, children: L("Vorname & Nachname *", "First & Last Name *", "Pr\xE9nom & Nom *", "Nome & Cognome *") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: form.name, onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })), placeholder: L("z.B. Max Muster", "e.g. John Smith", "ex. Jean Dupont", "es. Mario Rossi"), style: { background: "rgba(255,255,255,.07)", border: "1.5px solid rgba(255,255,255,.12)", color: "white" } })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: { color: "rgba(255,255,255,.5)" }, children: L("Aktueller Beruf", "Current job", "Emploi actuel", "Lavoro attuale") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: form.beruf, onChange: (e) => setForm((f) => ({ ...f, beruf: e.target.value })), placeholder: L("z.B. Product Manager", "e.g. Product Manager", "ex. Chef de produit", "es. Product Manager"), style: { background: "rgba(255,255,255,.07)", border: "1.5px solid rgba(255,255,255,.12)", color: "white" } })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: { color: "rgba(255,255,255,.5)" }, children: L("Erfahrung (Jahre)", "Experience (years)", "Exp\xE9rience (ans)", "Esperienza (anni)") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: form.erfahrung, onChange: (e) => setForm((f) => ({ ...f, erfahrung: e.target.value })), placeholder: "z.B. 5", type: "number", min: "0", max: "50", style: { background: "rgba(255,255,255,.07)", border: "1.5px solid rgba(255,255,255,.12)", color: "white" } })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: { color: "rgba(255,255,255,.5)" }, children: L("Sprachen", "Languages", "Langues", "Lingue") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: form.sprachen, onChange: (e) => setForm((f) => ({ ...f, sprachen: e.target.value })), placeholder: L("z.B. DE, EN, FR", "e.g. EN, DE, FR", "ex. FR, DE, EN", "es. IT, DE, EN"), style: { background: "rgba(255,255,255,.07)", border: "1.5px solid rgba(255,255,255,.12)", color: "white" } })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: { color: "rgba(255,255,255,.5)" }, children: L("Skills", "Skills", "Comp\xE9tences", "Skills") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: form.skills, onChange: (e) => setForm((f) => ({ ...f, skills: e.target.value })), placeholder: L("z.B. Python, Projektmanagement, Teamf\xFChrung", "e.g. Python, project management, team leadership", "ex. Python, gestion de projet", "es. Python, gestione progetti"), style: { width: "100%", padding: "10px 13px", background: "rgba(255,255,255,.07)", border: "1.5px solid rgba(255,255,255,.12)", borderRadius: 10, color: "white", fontFamily: "var(--bd)", fontSize: 14, minHeight: 60, resize: "none" } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: { color: "rgba(255,255,255,.5)" }, children: L("Ausbildung", "Education", "Formation", "Formazione") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: form.ausbildung, onChange: (e) => setForm((f) => ({ ...f, ausbildung: e.target.value })), placeholder: L("z.B. BSc Wirtschaftsinformatik, Uni Bern", "e.g. BSc Business IT, Uni Berne", "ex. BSc Informatique, Uni Berne", "es. BSc Informatica, Uni Berna"), style: { background: "rgba(255,255,255,.07)", border: "1.5px solid rgba(255,255,255,.12)", color: "white" } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 10, marginTop: 20 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd", style: { flex: 1, borderColor: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.6)" }, onClick: () => setEditing(null), children: L("Abbrechen", "Cancel", "Annuler", "Annulla") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em", style: { flex: 1 }, onClick: save, disabled: !form.name, children: L("Speichern", "Save", "Enregistrer", "Salva") })
      ] })
    ] }) });
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mbg", onClick: (e) => {
      if (e.target === e.currentTarget) onClose();
    }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mod", style: { maxWidth: 480, textAlign: "left", maxHeight: "85vh", overflowY: "auto" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { style: { fontSize: 22, margin: 0, marginBottom: 2 }, children: L("Meine Profile", "My Profiles", "Mes Profils", "I miei Profili") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: "rgba(255,255,255,.3)", fontWeight: 400 }, children: L("Profildaten f\xFCr die KI (Name, Beruf, Skills\u2026)", "Your data for the AI (name, job, skills\u2026)", "Vos donn\xE9es pour l'IA (nom, m\xE9tier, skills\u2026)", "I tuoi dati per l'IA (nome, lavoro, skill\u2026)") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: openNew, className: "btn b-em b-sm", children: [
          "+ ",
          L("Neu", "New", "Nouveau", "Nuovo")
        ] })
      ] }),
      profiles.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { textAlign: "center", padding: "32px 20px", color: "rgba(255,255,255,.3)", fontSize: 13 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 32, marginBottom: 10 }, children: "\u{1F464}" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: L("Noch kein Profil. Erstelle dein erstes Profil.", "No profile yet. Create your first profile.", "Pas encore de profil. Cr\xE9ez votre premier profil.", "Nessun profilo. Crea il tuo primo profilo.") })
      ] }),
      profiles.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: p.id === activeId ? "rgba(16,185,129,.08)" : "rgba(255,255,255,.04)", border: `1.5px solid ${p.id === activeId ? "rgba(16,185,129,.3)" : "rgba(255,255,255,.08)"}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 44, height: 44, borderRadius: "50%", background: p.id === activeId ? "rgba(16,185,129,.2)" : "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, border: `2px solid ${p.id === activeId ? "var(--em)" : "rgba(255,255,255,.1)"}` }, children: p.emoji || "\u{1F464}" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontFamily: "var(--hd)", fontSize: 14, fontWeight: 700, color: p.id === activeId ? "var(--em)" : "white", display: "flex", alignItems: "center", gap: 8 }, children: [
            p.name,
            p.id === activeId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, background: "rgba(16,185,129,.2)", color: "var(--em)", padding: "1px 7px", borderRadius: 20, fontWeight: 700 }, children: "AKTIV" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 2 }, children: [
            p.beruf || "\u2013",
            p.erfahrung ? ` \xB7 ${p.erfahrung} J.` : "",
            p.sprachen ? ` \xB7 ${p.sprachen}` : ""
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 6, flexShrink: 0 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              onClick: () => activate(p),
              style: { padding: "5px 12px", borderRadius: 8, border: "none", background: p.id === activeId ? "var(--em)" : "rgba(255,255,255,.1)", color: p.id === activeId ? "white" : "rgba(255,255,255,.6)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--bd)" },
              children: p.id === activeId ? "\u2713" : L("W\xE4hlen", "Select", "Choisir", "Scegli")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => openEdit(p), style: { padding: "5px 9px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.5)", fontSize: 12, cursor: "pointer" }, children: "\u270F\uFE0F" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => del(p.id), style: { padding: "5px 9px", borderRadius: 8, border: "1px solid rgba(239,68,68,.15)", background: "rgba(239,68,68,.06)", color: "#ef4444", fontSize: 12, cursor: "pointer" }, children: "\u2715" })
        ] })
      ] }, p.id)),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-w", style: { marginTop: 8, borderColor: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.5)" }, onClick: onClose, children: L("Schliessen", "Close", "Fermer", "Chiudi") })
    ] }) });
  }
  function App() {
    const [lang, setLang] = useState("de");
    const t = mkT(lang);
    const [page2, setPage] = useState("landing");
    const [pro, setPro] = useState(false);
    const [usage, setUsage] = useState(0);
    const [proUsage, setProUsage] = useState(0);
    const [pw, setPw] = useState(false);
    const [yearly, setYearly] = useState(false);
    const [authSession, setAuthSession] = useState(() => authGetSession());
    const [showAuth, setShowAuth] = useState(false);
    const [authMode, setAuthMode] = useState("login");
    const [showAdmin, setShowAdmin] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [showProfiles, setShowProfiles] = useState(false);
    const [activeProfile, setActiveProfile] = useState(() => {
      const id = loadActiveProfileId();
      if (!id) return null;
      return loadProfiles().find((p) => p.id === id) || null;
    });
    const [showOnboarding, setShowOnboarding] = useState(false);
    const doneOnboarding = () => {
      try {
        localStorage.setItem("stf_onb_done", "1");
      } catch {
      }
      setShowOnboarding(false);
    };
    const [pageLoading, setPageLoading] = useState(false);
    const [step, setStep] = useState(0);
    const [docType, setDocType] = useState("motivation");
    const [tab, setTab] = useState(0);
    const [streaming, setStreaming] = useState(false);
    const [editing, setEditing] = useState(false);
    const [err, setErr] = useState("");
    const [copied, setCopied] = useState(false);
    const [results, setResults] = useState({ motivation: "", lebenslauf: "" });
    const [job, setJob] = useState({ title: "", company: "", desc: "", branch: "" });
    const [prof, setProf] = useState(() => {
      const id = loadActiveProfileId();
      if (!id) return { name: "", beruf: "", erfahrung: "", skills: "", sprachen: "", ausbildung: "" };
      const p = loadProfiles().find((x) => x.id === id);
      return p ? { name: p.name || "", beruf: p.beruf || "", erfahrung: p.erfahrung || "", skills: p.skills || "", sprachen: p.sprachen || "", ausbildung: p.ausbildung || "" } : { name: "", beruf: "", erfahrung: "", skills: "", sprachen: "", ausbildung: "" };
    });
    const [appDoc, setAppDoc] = useState(null);
    const [ck, setCk] = useState({});
    const [eTo, setETo] = useState("");
    const [eSub, setESub] = useState("");
    const [eMsg, setEMsg] = useState("");
    const [icReady, setIcReady] = useState(false);
    const [icMsgs, setIcMsgs] = useState([]);
    const [icIn, setIcIn] = useState("");
    const [icLoad, setIcLoad] = useState(false);
    const [icScore, setIcScore] = useState(null);
    const [icN, setIcN] = useState(0);
    const chatRef = useRef(null);
    const [liData, setLiData] = useState({ text: "", role: "", ach: "" });
    const [liRes, setLiRes] = useState(null);
    const [liLoad, setLiLoad] = useState(false);
    const [atsCv, setAtsCv] = useState("");
    const [atsJob, setAtsJob] = useState("");
    const [atsDesc, setAtsDesc] = useState("");
    const [atsRes, setAtsRes] = useState(null);
    const [atsLoad, setAtsLoad] = useState(false);
    const [zText, setZText] = useState("");
    const [zRes, setZRes] = useState(null);
    const [zLoad, setZLoad] = useState(false);
    const [jmSkills, setJmSkills] = useState("");
    const [jmEdu, setJmEdu] = useState("");
    const [jmPref, setJmPref] = useState("");
    const [jmRes, setJmRes] = useState(null);
    const [jmLoad, setJmLoad] = useState(false);
    const [xlTask, setXlTask] = useState("");
    const [xlRes, setXlRes] = useState(null);
    const [xlLoad, setXlLoad] = useState(false);
    const [xlCopied, setXlCopied] = useState(false);
    const [ppTask, setPpTask] = useState("");
    const [ppSlides, setPpSlides] = useState("");
    const [ppTone, setPpTone] = useState("professional");
    const [ppRes, setPpRes] = useState(null);
    const [ppLoad, setPpLoad] = useState(false);
    const [cookieBanner, setCookieBanner] = useState(() => {
      try {
        return !localStorage.getItem("stf_cookie");
      } catch {
        return true;
      }
    });
    const acceptCookie = (all) => {
      try {
        localStorage.setItem("stf_cookie", all ? "all" : "essential");
      } catch {
      }
      setCookieBanner(false);
    };
    const uj = useCallback((k, v) => setJob((p) => ({ ...p, [k]: v })), []);
    const up = useCallback((k, v) => setProf((p) => ({ ...p, [k]: v })), []);
    const L = (d, e, f, i) => ({ de: d, en: e, fr: f, it: i })[lang];
    const stripeLink = () => yearly ? C.stripeYearly : C.stripeMonthly;
    const canGen = () => pro ? proUsage < C.PRO_LIMIT : usage < C.FREE_LIMIT;
    const canGenPro = () => proUsage < C.PRO_LIMIT;
    const nextReset = () => {
      const d = /* @__PURE__ */ new Date();
      d.setMonth(d.getMonth() + 1);
      d.setDate(1);
      return d.toLocaleDateString(lang === "de" ? "de-CH" : lang === "fr" ? "fr-CH" : lang === "it" ? "it-CH" : "en-CH", { day: "numeric", month: "long", year: "numeric" });
    };
    const curDoc = () => docType === "beide" ? tab === 0 ? results.motivation : results.lebenslauf : results[docType];
    const setCurDoc = (v) => {
      if (docType === "beide") setResults((r) => tab === 0 ? { ...r, motivation: v } : { ...r, lebenslauf: v });
      else setResults((r) => ({ ...r, [docType]: v }));
    };
    const navTo = useCallback((p) => {
      setPageLoading(true);
      window.history.pushState({ page: p }, "", `#${p === "landing" ? "" : p}`);
      setTimeout(() => {
        setPage(p);
        setPageLoading(false);
      }, 120);
    }, []);
    useEffect(() => {
      const hash = window.location.hash.replace("#", "") || "landing";
      window.history.replaceState({ page: hash }, "", window.location.href);
      const onPop = (e) => setPage(e.state?.page || "landing");
      window.addEventListener("popstate", onPop);
      return () => window.removeEventListener("popstate", onPop);
    }, []);
    useEffect(() => {
      window.scrollTo(0, 0);
      const p = new URLSearchParams(window.location.search);
      if (p.get("pro") === "activated") {
        actPro();
        setPro(true);
        window.history.replaceState({}, "", window.location.pathname);
        const sess2 = authGetSession();
        if (sess2) {
          authUpgradePlan(sess2.email, "pro");
          setAuthSession({ ...sess2, plan: "pro" });
        }
      }
      setUsage(getU().count);
      setProUsage(getProCount());
      const sess = authGetSession();
      if (sess) {
        setAuthSession(sess);
        if (sess.plan === "pro" || sess.plan === "family" || sess.plan === "team") setPro(true);
        else setPro(isPro());
      } else setPro(isPro());
    }, [page2]);
    useEffect(() => {
      if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [icMsgs]);
    useEffect(() => {
      if (job.title && prof.name) setESub(`Bewerbung als ${job.title} \u2013 ${prof.name}`);
    }, [job.title, prof.name]);
    const generate = async () => {
      if (!canGen()) {
        setPw(true);
        return;
      }
      setStreaming(true);
      setErr("");
      setEditing(false);
      const toGen = docType === "beide" ? ["motivation", "lebenslauf"] : [docType];
      try {
        const res = { ...results };
        for (const tp of toGen) {
          res[tp] = "";
          setResults({ ...res });
          await streamAI(
            tp === "motivation" ? t.motivPrompt(job, prof) : t.cvPrompt(job, prof),
            (chunk) => setResults((r) => tp === "motivation" ? { ...r, motivation: chunk } : { ...r, lebenslauf: chunk }),
            null,
            pro ? "" : "free"
          );
        }
        if (!pro) {
          incU();
          setUsage(getU().count);
        } else {
          incPro();
          setProUsage(getProCount());
        }
        setStep(3);
      } catch (e) {
        setErr(e.message);
      } finally {
        setStreaming(false);
      }
    };
    const copyDoc = () => {
      navigator.clipboard.writeText(curDoc());
      setCopied(true);
      showToast(lang === "de" ? "Kopiert! \u2713" : lang === "fr" ? "Copi\xE9! \u2713" : lang === "it" ? "Copiato! \u2713" : "Copied! \u2713");
      setTimeout(() => setCopied(false), 2200);
    };
    const pdfDoc = () => {
      if (!pro) {
        setPw(true);
        return;
      }
      const w = window.open("", "_blank");
      w.document.write(`<html><head><title>${C.name}</title><style>body{font-family:Georgia,serif;font-size:13px;line-height:1.9;color:#111;padding:64px;max-width:760px;margin:0 auto;white-space:pre-wrap}</style></head><body>${curDoc().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")}</body></html>`);
      w.document.close();
      w.print();
    };
    const openEmail = () => {
      if (!pro) {
        setPw(true);
        return;
      }
      if (!eTo) return;
      window.open(`mailto:${eTo}?subject=${encodeURIComponent(eSub)}&body=${encodeURIComponent(curDoc() + (eMsg ? "\n\n" + eMsg : ""))}`);
    };
    const startIC = async () => {
      if (!pro) {
        setPw(true);
        return;
      }
      if (!canGenPro()) {
        return;
      }
      setIcLoad(true);
      setIcMsgs([]);
      setIcScore(null);
      setIcN(0);
      try {
        const txt = await callAI(t.coach.icStart(job));
        setIcMsgs([{ r: "ai", t: txt }]);
        setIcReady(true);
      } catch (e) {
        setErr(e.message);
      } finally {
        setIcLoad(false);
      }
    };
    const sendIC = async () => {
      if (!icIn.trim()) return;
      if (!canGenPro()) return;
      const um = icIn.trim();
      setIcIn("");
      const nc = icN + 1;
      setIcN(nc);
      const msgs = [...icMsgs, { r: "u", t: um }];
      setIcMsgs(msgs);
      setIcLoad(true);
      try {
        if (nc >= 5) {
          const h = msgs.map((m) => `${m.r === "ai" ? "Interviewer" : "Kandidat"}: ${m.t}`).join("\n");
          const raw = await callAI(t.coach.icScore(h), "", C.MODEL_FAST);
          try {
            const sc = parseJSON(raw);
            setIcScore(sc);
            setIcMsgs([...msgs, { r: "ai", t: t.coach.icDone(sc.score) }]);
          } catch {
            setIcMsgs([...msgs, { r: "ai", t: "\u2713" }]);
          }
        } else {
          const history = msgs.map((m) => ({ role: m.r === "ai" ? "assistant" : "user", content: m.t }));
          const sysMsg = { role: "system", content: t.coach.icNext(job) };
          const r2 = await fetch(GROQ_URL, {
            method: "POST",
            headers: groqHeaders(),
            body: JSON.stringify({ model: C.MODEL_FAST, max_tokens: 400, messages: [sysMsg, ...history] })
          });
          const d = await r2.json();
          if (d.error) throw new Error(d.error.message);
          setIcMsgs([...msgs, { r: "ai", t: d.choices?.[0]?.message?.content || "" }]);
        }
        incPro();
        setProUsage(getProCount());
      } catch (e) {
        setErr(e.message);
      } finally {
        setIcLoad(false);
      }
    };
    const runLI = async () => {
      if (!pro) {
        setPw(true);
        return;
      }
      if (!canGenPro()) {
        return;
      }
      setLiLoad(true);
      setLiRes(null);
      try {
        const raw = await callAI(t.linkedin.prompt({ ...liData, beruf: prof.beruf, erfahrung: prof.erfahrung, skills: prof.skills }));
        setLiRes(parseJSON(raw));
      } catch (e) {
        setErr(e.message);
      } finally {
        setLiLoad(false);
      }
    };
    const runATS = async () => {
      if (!pro) {
        setPw(true);
        return;
      }
      if (!canGenPro()) {
        return;
      }
      setAtsLoad(true);
      setAtsRes(null);
      try {
        const raw = await callAI(t.ats.prompt(atsCv, atsJob, atsDesc));
        setAtsRes(parseJSON(raw));
        incPro();
        setProUsage(getProCount());
      } catch (e) {
        setErr(e.message);
      } finally {
        setAtsLoad(false);
      }
    };
    const runZeugnis = async () => {
      if (!pro) {
        setPw(true);
        return;
      }
      if (!canGenPro()) {
        return;
      }
      setZLoad(true);
      setZRes(null);
      try {
        const raw = await callAI(t.zeugnis.prompt(zText));
        setZRes(parseJSON(raw));
        incPro();
        setProUsage(getProCount());
      } catch (e) {
        setErr(e.message);
      } finally {
        setZLoad(false);
      }
    };
    const runJM = async () => {
      if (!pro) {
        setPw(true);
        return;
      }
      if (!canGenPro()) {
        return;
      }
      setJmLoad(true);
      setJmRes(null);
      try {
        const raw = await callAI(t.jobmatch.prompt(jmSkills, jmEdu, jmPref));
        setJmRes(parseJSON(raw));
        incPro();
        setProUsage(getProCount());
      } catch (e) {
        setErr(e.message);
      } finally {
        setJmLoad(false);
      }
    };
    const runXL = async () => {
      if (!pro) {
        setPw(true);
        return;
      }
      if (!canGenPro()) {
        return;
      }
      setXlLoad(true);
      setXlRes(null);
      const prompt = `Du bist ein Excel-Experte. Erstelle eine detaillierte Excel-Tabellenstruktur f\xFCr folgende Aufgabe: "${xlTask}".
Antworte NUR mit JSON (kein Markdown, keine Backticks):
{"title":"Tabellentitel","description":"Kurze Beschreibung","sheets":[{"name":"Tabellenblatt1","headers":["Spalte1","Spalte2","Spalte3"],"sample_rows":[["Beispiel1","Beispiel2","100"],["Beispiel3","Beispiel4","200"]],"formulas":[{"cell":"C10","formula":"=SUMME(C2:C9)","description":"Summe aller Werte"},{"cell":"D2","formula":"=C2*0.077","description":"MwSt. 7.7%"}],"description":"Beschreibung dieses Blattes","formatting_tips":["Tipp 1 f\xFCr Formatierung","Tipp 2"]}],"excel_tips":["Allgemeiner Tipp 1","Tipp 2"],"download_note":"Hinweis f\xFCr den Nutzer"}`;
      try {
        const raw = await callAI(prompt);
        setXlRes(parseJSON(raw));
        incPro();
        setProUsage(getProCount());
      } catch (e) {
        setErr(e.message);
      } finally {
        setXlLoad(false);
      }
    };
    const downloadCSV = () => {
      if (!xlRes || !xlRes.sheets?.[0]) return;
      const sh = xlRes.sheets[0];
      const rows = [sh.headers, ...sh.sample_rows || []];
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${xlRes.title || "Stellify-Tabelle"}.csv`;
      a.click();
    };
    const downloadXLSX = async () => {
      if (!xlRes || !xlRes.sheets?.[0]) return;
      const sh = xlRes.sheets[0];
      await downloadAsExcel(sh.sample_rows || [], sh.headers || [], sh.name || "Tabelle", "excel");
    };
    const runPP = async () => {
      if (!pro) {
        setPw(true);
        return;
      }
      if (!canGenPro()) {
        return;
      }
      setPpLoad(true);
      setPpRes(null);
      const nSlides = parseInt(ppSlides) || 6;
      const prompt = `Du bist ein PowerPoint-Experte. Erstelle eine professionelle Pr\xE4sentation f\xFCr: "${ppTask}". Ton: ${ppTone}. Anzahl Folien: ${nSlides}.
Antworte NUR mit JSON:
{"title":"Pr\xE4sentationstitel","subtitle":"Untertitel","theme_suggestion":"Farbschema-Empfehlung (z.B. Dunkelblau/Gr\xFCn professionell)","slides":[{"slide":1,"title":"Folientitel","layout":"title","content":["Bullet 1","Bullet 2","Bullet 3"],"speaker_note":"Was du bei dieser Folie sagen solltest","design_tip":"Gestaltungshinweis"},{"slide":2,"title":"...","layout":"content","content":["..."],"speaker_note":"...","design_tip":"..."}],"design_tips":["Allgemeiner Gestaltungstipp 1","Tipp 2"],"estimated_duration":"Gesch\xE4tzte Pr\xE4sentationsdauer"}`;
      try {
        const raw = await callAI(prompt);
        setPpRes(parseJSON(raw));
        incPro();
        setProUsage(getProCount());
      } catch (e) {
        setErr(e.message);
      } finally {
        setPpLoad(false);
      }
    };
    const LangSw = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ls", children: LANGS.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: `lb ${lang === l ? "on" : ""}`, onClick: () => setLang(l), children: FLAGS[l] }, l)) });
    const Nav = ({ dark }) => {
      const [mOpen, setMOpen] = useState(false);
      const lc = dark ? "rgba(255,255,255,.38)" : "var(--mu)";
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", { style: dark ? { background: "rgba(7,7,14,.95)", borderColor: "rgba(255,255,255,.07)" } : {}, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ni", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "logo", onClick: () => {
            navTo("landing");
            setMOpen(false);
          }, style: dark ? { color: "white" } : {}, children: [
            C.name,
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "logo-dot" }),
            pro && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pb", children: "PRO" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nl nl-desk", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LangSw, {}),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nlk", style: { color: lc }, onClick: () => {
              navTo("landing");
              setTimeout(() => document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" }), 100);
            }, children: t.nav.tools }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nlk", style: { color: lc }, onClick: () => {
              navTo("landing");
              setTimeout(() => document.getElementById("preise")?.scrollIntoView({ behavior: "smooth" }), 100);
            }, children: t.nav.prices }),
            pro && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nlk", style: { color: lc }, onClick: () => {
              navTo("landing");
              setTimeout(() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" }), 100);
            }, children: "FAQ" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nlk", style: { color: "var(--em)", fontWeight: 700 }, onClick: () => navTo("chat"), children: "\u{1F4AC} Stella" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                onClick: () => setShowProfiles(true),
                style: { display: "flex", alignItems: "center", gap: 6, background: activeProfile ? "rgba(16,185,129,.12)" : "rgba(11,11,18,.06)", border: "1.5px solid", borderColor: activeProfile ? "rgba(16,185,129,.25)" : "var(--bo)", borderRadius: 20, padding: "5px 12px", cursor: "pointer", fontFamily: "var(--bd)", fontSize: 12, fontWeight: 600, color: activeProfile ? "var(--em2)" : dark ? "rgba(255,255,255,.5)" : "var(--mu)", transition: "all .2s" },
                onMouseEnter: (e) => {
                  e.currentTarget.style.borderColor = "var(--em)";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.borderColor = activeProfile ? "rgba(16,185,129,.25)" : "var(--bo)";
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 14 }, children: activeProfile?.emoji || "\u{1F464}" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: activeProfile?.name || (lang === "fr" ? "Profil" : lang === "it" ? "Profilo" : "Profil") }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, opacity: 0.6 }, children: "\u25BE" })
                ]
              }
            ),
            authSession ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
              authSession.isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  onClick: () => setShowAdmin(true),
                  style: { padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(245,158,11,.3)", background: "rgba(245,158,11,.1)", color: "#f59e0b", fontSize: 11, fontWeight: 700, cursor: "pointer" },
                  children: "\u{1F6E1}\uFE0F Admin"
                }
              ),
              (authSession.plan === "family" || authSession.plan === "team") && !authSession.isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "button",
                {
                  onClick: () => setShowMembers(true),
                  style: { padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(99,102,241,.3)", background: "rgba(99,102,241,.08)", color: "#818cf8", fontSize: 11, fontWeight: 700, cursor: "pointer" },
                  children: [
                    "\u{1F465} ",
                    lang === "de" ? "Mitglieder" : lang === "fr" ? "Membres" : lang === "it" ? "Membri" : "Members"
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "relative" }, className: "user-menu-wrap", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "button",
                {
                  onClick: () => {
                    if (window.confirm(lang === "de" ? `Abmelden von ${authSession.email}?` : `Sign out from ${authSession.email}?`)) {
                      authClearSession();
                      setAuthSession(null);
                      if (!isPro()) setPro(false);
                    }
                  },
                  style: { display: "flex", alignItems: "center", gap: 7, background: "linear-gradient(135deg,rgba(16,185,129,.18),rgba(16,185,129,.06))", border: "1.5px solid rgba(16,185,129,.35)", borderRadius: 24, padding: "5px 14px 5px 5px", cursor: "pointer", fontFamily: "var(--bd)", fontSize: 12, fontWeight: 700, color: "var(--em2)", transition: "all .2s" },
                  onMouseEnter: (e) => {
                    e.currentTarget.style.borderColor = "var(--em)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  },
                  onMouseLeave: (e) => {
                    e.currentTarget.style.borderColor = "rgba(16,185,129,.35)";
                    e.currentTarget.style.transform = "none";
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,var(--em),#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white", flexShrink: 0, overflow: "hidden" }, children: authSession.avatar ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", { src: authSession.avatar, style: { width: "100%", height: "100%", objectFit: "cover" }, alt: "" }) : (authSession.displayName || authSession.email)[0].toUpperCase() }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: authSession.displayName || authSession.email.split("@")[0] }),
                    authSession.provider && authSession.provider !== "email" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 9, fontWeight: 700, background: "rgba(255,255,255,.12)", borderRadius: 6, padding: "1px 5px", textTransform: "capitalize", opacity: 0.7 }, children: authSession.provider }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 9, opacity: 0.4 }, children: "\u25BE" })
                  ]
                }
              ) })
            ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                onClick: () => {
                  setAuthMode("login");
                  setShowAuth(true);
                },
                style: { display: "flex", alignItems: "center", gap: 7, background: "linear-gradient(135deg,rgba(16,185,129,.15),rgba(16,185,129,.05))", border: "1.5px solid rgba(16,185,129,.3)", borderRadius: 24, padding: "6px 14px 6px 6px", cursor: "pointer", fontFamily: "var(--bd)", fontSize: 12, fontWeight: 700, color: "var(--em2)", transition: "all .2s" },
                onMouseEnter: (e) => {
                  e.currentTarget.style.borderColor = "var(--em)";
                  e.currentTarget.style.background = "linear-gradient(135deg,rgba(16,185,129,.25),rgba(16,185,129,.1))";
                  e.currentTarget.style.transform = "translateY(-1px)";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.borderColor = "rgba(16,185,129,.3)";
                  e.currentTarget.style.background = "linear-gradient(135deg,rgba(16,185,129,.15),rgba(16,185,129,.05))";
                  e.currentTarget.style.transform = "none";
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 24, height: 24, borderRadius: "50%", background: "rgba(16,185,129,.2)", border: "1px solid rgba(16,185,129,.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }, children: "\u{1F464}" }),
                  lang === "de" ? "Einloggen" : lang === "fr" ? "Connexion" : lang === "it" ? "Accedi" : "Sign in"
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "nc", onClick: () => navTo("app"), children: [
              lang === "de" ? "Kostenlos starten" : lang === "fr" ? "Commencer" : lang === "it" ? "Inizia" : "Start free",
              " \u2192"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "ham", onClick: () => setMOpen((v) => !v), style: { background: "none", border: "none", cursor: "pointer", display: "none", flexDirection: "column", gap: 4, padding: 4, color: dark ? "white" : "var(--ink)" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 22, height: 2, background: "currentColor", borderRadius: 2, transition: "all .2s", transform: mOpen ? "rotate(45deg) translate(4px,4px)" : "none" } }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 22, height: 2, background: "currentColor", borderRadius: 2, transition: "all .2s", opacity: mOpen ? 0 : 1 } }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 22, height: 2, background: "currentColor", borderRadius: 2, transition: "all .2s", transform: mOpen ? "rotate(-45deg) translate(4px,-4px)" : "none" } })
          ] })
        ] }),
        mOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: dark ? "#0f0f1a" : "white", borderTop: "1px solid", borderColor: dark ? "rgba(255,255,255,.08)" : "var(--bo)", padding: "12px 20px 16px", display: "flex", flexDirection: "column", gap: 2 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LangSw, {}),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: 10 } }),
          [
            [() => navTo("app"), lang === "de" ? "\u270D\uFE0F Bewerbung schreiben" : lang === "fr" ? "\u270D\uFE0F R\xE9diger une candidature" : lang === "it" ? "\u270D\uFE0F Scrivere candidatura" : "\u270D\uFE0F Write application"],
            [() => {
              navTo("landing");
              setTimeout(() => document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" }), 100);
              setMOpen(false);
            }, lang === "de" ? "\u{1F527} Alle Tools" : lang === "fr" ? "\u{1F527} Tous les outils" : lang === "it" ? "\u{1F527} Tutti gli strumenti" : "\u{1F527} All tools"],
            [() => {
              navTo("landing");
              setTimeout(() => document.getElementById("preise")?.scrollIntoView({ behavior: "smooth" }), 100);
              setMOpen(false);
            }, lang === "de" ? "\u{1F4B6} Preise" : lang === "fr" ? "\u{1F4B6} Tarifs" : lang === "it" ? "\u{1F4B6} Prezzi" : "\u{1F4B6} Pricing"],
            [() => {
              navTo("landing");
              setTimeout(() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" }), 100);
              setMOpen(false);
            }, "\u2753 FAQ"]
          ].map(([fn, lbl], i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => {
            fn();
            setMOpen(false);
          }, style: { background: "none", border: "none", cursor: "pointer", fontFamily: "var(--bd)", fontSize: 14, fontWeight: 500, color: dark ? "rgba(255,255,255,.7)" : "var(--ink)", textAlign: "left", padding: "10px 0", borderBottom: i < 3 ? "1px solid" : "none", borderColor: dark ? "rgba(255,255,255,.07)" : "var(--bo)" }, children: lbl }, i)),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em", style: { marginTop: 10, justifyContent: "center" }, onClick: () => {
            navTo("app");
            setMOpen(false);
          }, children: lang === "de" ? "Kostenlos starten \u2192" : lang === "fr" ? "Commencer \u2192" : lang === "it" ? "Inizia \u2192" : "Start free \u2192" })
        ] })
      ] });
    };
    const Footer = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { background: "rgba(255,255,255,.025)", borderTop: "1px solid rgba(255,255,255,.05)", borderBottom: "1px solid rgba(255,255,255,.05)", padding: "12px 24px", marginBottom: 40 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 36px", maxWidth: 900, margin: "0 auto" }, children: [
        { ico: "\u{1F512}", txt: lang === "de" ? "Keine Datenspeicherung" : lang === "fr" ? "Aucun stockage de donn\xE9es" : lang === "it" ? "Nessuna memorizzazione" : "No data storage" },
        { ico: "\u{1F1E8}\u{1F1ED}", txt: lang === "de" ? "Schweizer Unternehmen \xB7 Zug" : lang === "fr" ? "Soci\xE9t\xE9 suisse \xB7 Zoug" : lang === "it" ? "Azienda svizzera \xB7 Zugo" : "Swiss company \xB7 Zug" },
        { ico: "\u26A1", txt: lang === "de" ? "Powered by Claude AI" : lang === "fr" ? "Propuls\xE9 par Claude AI" : lang === "it" ? "Alimentato da Claude AI" : "Powered by Claude AI" },
        { ico: "\u{1F510}", txt: lang === "de" ? "Sichere Zahlung via Stripe" : lang === "fr" ? "Paiement s\xE9curis\xE9 via Stripe" : lang === "it" ? "Pagamento sicuro via Stripe" : "Secure payment via Stripe" }
      ].map((tr, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,.32)", fontWeight: 500, letterSpacing: ".2px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 13 }, children: tr.ico }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: tr.txt })
      ] }, i)) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "fi", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "fl", children: [
            C.name,
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "logo-dot", style: { marginLeft: 4, marginBottom: 8 } })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 13, color: "rgba(255,255,255,.3)", lineHeight: 1.75, marginBottom: 12, maxWidth: 260 }, children: t.legal.tagline }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 12, color: "rgba(255,255,255,.2)", marginBottom: 4 }, children: [
            "\u{1F4CD} ",
            C.address
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 12, color: "rgba(255,255,255,.2)", marginBottom: 12 }, children: [
            "\u2709\uFE0F ",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: `mailto:${C.email}`, style: { color: "rgba(255,255,255,.25)", textDecoration: "none" }, children: C.email })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }, children: ["Twint", "Visa", "Mastercard", "PayPal", "Apple Pay"].map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 10, fontWeight: 700, background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.35)", padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(255,255,255,.08)" }, children: p }, p)) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "fcol", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h5", { children: t.legal.product }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => navTo("app"), children: lang === "de" ? "\u270D\uFE0F Bewerbung" : lang === "en" ? "\u270D\uFE0F Application" : lang === "fr" ? "\u270D\uFE0F Candidature" : "\u270D\uFE0F Candidatura" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => navTo("linkedin"), children: "\u{1F4BC} LinkedIn" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => navTo("ats"), children: [
            "\u{1F916} ",
            t.nav.ats
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => navTo("zeugnis"), children: [
            "\u{1F4DC} ",
            t.nav.zeugnis
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => navTo("jobmatch"), children: [
            "\u{1F3AF} ",
            t.nav.jobs
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => navTo("excel"), children: [
            "\u{1F4CA} ",
            t.nav.excel
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => navTo("pptx"), children: [
            "\u{1F4FD}\uFE0F ",
            t.nav.pptx
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => navTo("coach"), children: [
            "\u{1F3A4} ",
            t.nav.coach
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => navTo("li2job"), children: [
            "\u{1F517} ",
            lang === "de" ? "LinkedIn \u2192 Bewerbung" : lang === "en" ? "LinkedIn \u2192 Application" : lang === "fr" ? "LinkedIn \u2192 Candidature" : "LinkedIn \u2192 Candidatura"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => navTo("gehaltsrechner"), children: [
            "\u{1F4B0} ",
            lang === "de" ? "KI-Gehaltsrechner" : "Salary calculator"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => navTo("lipost"), children: [
            "\u270D\uFE0F ",
            lang === "de" ? "LinkedIn-Post Generator" : "LinkedIn Post"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => navTo("tracker"), children: [
            "\u{1F4CB} ",
            lang === "de" ? "Bewerbungs-Tracker" : "Application Tracker"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "fcol", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h5", { children: lang === "de" ? "Schule & Produktivit\xE4t" : lang === "fr" ? "\xC9cole & Productivit\xE9" : lang === "it" ? "Scuola & Produttivit\xE0" : "School & Productivity" }),
          GENERIC_TOOLS.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => navTo(g.id), children: [
            g.ico,
            " ",
            g.t[lang]
          ] }, g.id))
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "fcol", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h5", { children: t.legal.legalL }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => navTo("agb"), children: t.legal.agb }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => navTo("datenschutz"), children: t.legal.privacy }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => navTo("impressum"), children: t.legal.imprint }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { marginTop: 16, fontSize: 12, color: "rgba(255,255,255,.18)", lineHeight: 1.6 }, children: lang === "de" ? "Stellify ist kein Rechts- oder Karriereberater. Alle KI-generierten Inhalte sind Entw\xFCrfe und Richtwerte \u2013 keine rechtsverbindlichen Dokumente. Alle Angaben ohne Gew\xE4hr." : lang === "fr" ? "Stellify n'est pas un conseiller juridique ou de carri\xE8re." : lang === "it" ? "Stellify non \xE8 un consulente legale o di carriera." : "Stellify is not a legal or career advisor. All information without guarantee." })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "fbot", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          "\xA9 ",
          (/* @__PURE__ */ new Date()).getFullYear(),
          " ",
          C.name,
          " \xB7 ",
          C.owner,
          " \xB7 ",
          C.address
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", gap: 12 }, children: [["agb", t.legal.agb], ["datenschutz", t.legal.privacy], ["impressum", t.legal.imprint]].map(([p, l]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => navTo(p), style: { background: "none", border: "none", color: "rgba(255,255,255,.2)", fontSize: 11, cursor: "pointer", fontFamily: "var(--bd)" }, children: l }, p)) })
      ] })
    ] });
    const PW = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mbg", onClick: (e) => e.target === e.currentTarget && setPw(false), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mod", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 32, marginBottom: 10 }, children: "\u2726" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: t.modal.title }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t.modal.sub }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mod-pr", children: [
        "CHF ",
        C.priceM,
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          " / ",
          lang === "en" ? "mo" : "Mo."
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mod-fts", children: t.modal.feats.map(([ico, tx]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mod-f", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mod-fi", children: ico }),
        tx
      ] }, tx)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em b-w", onClick: () => window.open(stripeLink(), "_blank"), children: t.modal.btn }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mod-note", children: t.modal.note }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-out b-sm", style: { marginTop: 9, width: "100%" }, onClick: () => setPw(false), children: t.modal.close })
    ] }) });
    const UsageBar = () => !pro ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ubar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: C.FREE_LIMIT - usage }),
        " ",
        t.app.uLeft(C.FREE_LIMIT - usage)
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 9 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "u-tr", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "u-fi", style: { width: `${usage / C.FREE_LIMIT * 100}%` } }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em b-sm", onClick: () => setPw(true), children: "Pro \u2192" })
      ] })
    ] }) : proUsage >= C.PRO_LIMIT ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.25)", borderRadius: 10, padding: "10px 16px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
      "\u23F3 ",
      L("Monatliches Kontingent aufgebraucht", "Monthly quota used up", "Quota mensuel \xE9puis\xE9", "Monthly quota used up"),
      " \xB7 ",
      L("Reset am", "Reset on", "R\xE9initialisation le", "Reset on"),
      " ",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: nextReset() })
    ] }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ubar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: "var(--em)", fontWeight: 600 }, children: [
        "\u2726 Pro \xB7 ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: C.PRO_LIMIT - proUsage }),
        " ",
        L("von", "of", "de", "of"),
        " ",
        C.PRO_LIMIT,
        " ",
        L("Generierungen \xFCbrig", "generations left", "g\xE9n\xE9rations restantes", "generations left")
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 9 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "u-tr", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "u-fi", style: { width: `${proUsage / C.PRO_LIMIT * 100}%`, background: "var(--em)" } }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 11, color: "var(--mu)", whiteSpace: "nowrap" }, children: [
          "\u21BB ",
          nextReset()
        ] })
      ] })
    ] });
    const DEMO_OUTPUTS = {
      linkedin: L(
        `\u{1F50D} LINKEDIN ANALYSE

Dein aktueller Profil-Score: 54/100 \u26A0\uFE0F

HEADLINE (aktuell): \xABSoftware Engineer bei UBS\xBB
\u2726 Optimiert: \xABSenior Software Engineer | Python & Cloud | Z\xFCrich | Open to new opportunities\xBB

ABOUT-SEKTION:
\u2717 Zu kurz \u2013 nur 2 Zeilen, Recruiter \xFCberspringen dich
\u2726 Empfehlung: 3\u20134 Abs\xE4tze mit Erfolgen, Zahlen, Keywords

TOP 5 FEHLENDE KEYWORDS:
1. \xABAgile\xBB \u2013 340 Jobs in CH suchen das
2. \xABAWS / GCP\xBB \u2013 289 Jobs in CH
3. \xABTeam lead\xBB \u2013 198 Jobs in CH
4. \xABScrum Master\xBB \u2013 167 Jobs in CH
5. \xABStakeholder management\xBB \u2013 145 Jobs in CH

\u2192 Mit Optimierung: Score 88/100 \u2705`,
        `\u{1F50D} LINKEDIN ANALYSIS

Your current profile score: 54/100 \u26A0\uFE0F

HEADLINE (current): \xABSoftware Engineer at UBS\xBB
\u2726 Optimized: \xABSenior Software Engineer | Python & Cloud | Z\xFCrich | Open to opportunities\xBB

ABOUT SECTION:
\u2717 Too short \u2013 only 2 lines, recruiters skip you
\u2726 Recommendation: 3\u20134 paragraphs with achievements, numbers, keywords

TOP 5 MISSING KEYWORDS:
1. \xABAgile\xBB \u2013 340 jobs in CH
2. \xABAWS / GCP\xBB \u2013 289 jobs in CH
3. \xABTeam lead\xBB \u2013 198 jobs in CH

\u2192 With optimization: Score 88/100 \u2705`,
        `\u{1F50D} ANALYSE LINKEDIN

Score actuel: 54/100 \u26A0\uFE0F

TITRE (actuel): \xABIng\xE9nieur logiciel chez UBS\xBB
\u2726 Optimis\xE9: \xABSenior Software Engineer | Python & Cloud | Zurich | Ouvert aux opportunit\xE9s\xBB

TOP 5 MOTS-CL\xC9S MANQUANTS:
1. \xABAgile\xBB \u2013 340 postes en CH
2. \xABAWS / GCP\xBB \u2013 289 postes en CH
3. \xABChef d'\xE9quipe\xBB \u2013 198 postes en CH

\u2192 Avec optimisation: Score 88/100 \u2705`,
        `\u{1F50D} ANALISI LINKEDIN

Score attuale: 54/100 \u26A0\uFE0F

TITOLO (attuale): \xABSoftware Engineer presso UBS\xBB
\u2726 Ottimizzato: \xABSenior Software Engineer | Python & Cloud | Zurigo | Aperto a opportunit\xE0\xBB

TOP 5 PAROLE CHIAVE MANCANTI:
1. \xABAgile\xBB \u2013 340 lavori in CH
2. \xABAWS / GCP\xBB \u2013 289 lavori in CH

\u2192 Con ottimizzazione: Score 88/100 \u2705`
      ),
      ats: L(
        `\u{1F916} ATS-SIMULATION

Stelle: Senior Marketing Manager, Nestl\xE9 Vevey
CV-Score: 58/100 \u26A0\uFE0F \u2013 Wird aussortiert!

\u2713 Positiv:
  Berufsbezeichnung stimmt (85% Match)
  Ausbildung vorhanden

\u2717 Kritisch fehlend:
  \xABFMCG\xBB \u2013 9\xD7 im Inserat, 0\xD7 in deinem CV
  \xABBrand Management\xBB \u2013 7\xD7 erw\xE4hnt, fehlt
  \xABP&L Verantwortung\xBB \u2013 5\xD7 erw\xE4hnt, fehlt
  \xABGo-to-Market\xBB \u2013 4\xD7 erw\xE4hnt, fehlt

Formatierungsfehler:
  \u2717 Tabellen \u2013 von ATS nicht lesbar
  \u2717 Spalten-Layout \u2013 wird durcheinander gebracht
  \u2717 Grafiken im CV \u2013 werden ignoriert

\u2192 Mit Anpassungen: Score 84/100 \u2705 Einladung wahrscheinlich`,
        `\u{1F916} ATS SIMULATION

Position: Senior Marketing Manager, Nestl\xE9 Vevey
CV Score: 58/100 \u26A0\uFE0F \u2013 Gets filtered out!

\u2713 Positive:
  Job title matches (85%)
  Education present

\u2717 Critically missing:
  \xABFMCG\xBB \u2013 9\xD7 in posting, 0\xD7 in your CV
  \xABBrand Management\xBB \u2013 7\xD7 mentioned, missing
  \xABP&L responsibility\xBB \u2013 5\xD7 mentioned, missing

Format errors:
  \u2717 Tables \u2013 not readable by ATS
  \u2717 Column layout \u2013 gets scrambled

\u2192 With adjustments: Score 84/100 \u2705`,
        `\u{1F916} SIMULATION ATS

Poste: Senior Marketing Manager, Nestl\xE9 Vevey
Score CV: 58/100 \u26A0\uFE0F \u2013 \xC9limin\xE9!

\u2717 Manquants critiques:
  \xABFMCG\xBB \u2013 9\xD7 dans l'offre, 0\xD7 dans votre CV
  \xABBrand Management\xBB \u2013 7\xD7 mentionn\xE9, absent
  \xABP&L\xBB \u2013 5\xD7 mentionn\xE9, absent

\u2192 Avec ajustements: Score 84/100 \u2705`,
        `\u{1F916} SIMULAZIONE ATS

Posizione: Senior Marketing Manager, Nestl\xE9 Vevey
Score CV: 58/100 \u26A0\uFE0F \u2013 Eliminato!

\u2717 Mancanti critici:
  \xABFMCG\xBB \u2013 9\xD7 nell'annuncio, 0\xD7 nel tuo CV
  \xABBrand Management\xBB \u2013 7\xD7 menzionato, assente

\u2192 Con adeguamenti: Score 84/100 \u2705`
      ),
      zeugnis: L(
        `\u{1F4DC} ZEUGNIS-ANALYSE

\u26A0\uFE0F 3 versteckte Codes erkannt!

SATZ 1: \xABerledigte die Aufgaben zu unserer Zufriedenheit\xBB
\u2192 Code f\xFCr: BEFRIEDIGEND (Note 3/5)
\u2192 Gut w\xE4re: \xABstets zu unserer vollsten Zufriedenheit\xBB

SATZ 2: \xABzeigte Verst\xE4ndnis f\xFCr die Belange der Kollegen\xBB
\u2192 Code f\xFCr: KONFLIKTE im Team
\u2192 Gut w\xE4re: \xABarbeitete stets harmonisch im Team\xBB

SATZ 3: \xABverl\xE4sst unser Unternehmen auf eigenen Wunsch\xBB
\u2192 NEUTRAL \u2013 keine versteckte Botschaft \u2713

GESAMTBEWERTUNG: 2.5/5 \u26A0\uFE0F
\u2192 Dieses Zeugnis NICHT bei Bewerbungen vorlegen!

Empfehlung: Arbeitgeber um Neuformulierung bitten.`,
        `\u{1F4DC} REFERENCE ANALYSIS

\u26A0\uFE0F 3 hidden codes detected!

SENTENCE 1: \xABcompleted tasks to our satisfaction\xBB
\u2192 Code for: SATISFACTORY (Grade 3/5)
\u2192 Good: \xABalways to our complete satisfaction\xBB

SENTENCE 2: \xABshowed understanding for colleagues\xBB
\u2192 Code for: TEAM CONFLICTS
\u2192 Good: \xABworked harmoniously in the team\xBB

OVERALL RATING: 2.5/5 \u26A0\uFE0F
\u2192 Do NOT submit this reference!`,
        `\u{1F4DC} ANALYSE CERTIFICAT

\u26A0\uFE0F 3 codes cach\xE9s d\xE9tect\xE9s!

PHRASE 1: \xABa ex\xE9cut\xE9 les t\xE2ches \xE0 notre satisfaction\xBB
\u2192 Code pour: PASSABLE (Note 3/5)
\u2192 Bien: \xABtoujours \xE0 notre enti\xE8re satisfaction\xBB

\xC9VALUATION GLOBALE: 2.5/5 \u26A0\uFE0F
\u2192 Ne PAS soumettre ce certificat!`,
        `\u{1F4DC} ANALISI CERTIFICATO

\u26A0\uFE0F 3 codici nascosti rilevati!

FRASE 1: \xABha svolto i compiti a nostra soddisfazione\xBB
\u2192 Codice per: SUFFICIENTE (Voto 3/5)
\u2192 Bene: \xABsempre con piena soddisfazione\xBB

VALUTAZIONE: 2.5/5 \u26A0\uFE0F
\u2192 NON presentare questo certificato!`
      ),
      jobmatch: L(
        `\u{1F3AF} JOB-MATCHING RESULTAT

Profil: Marketing Manager \xB7 6 J. \xB7 FMCG \xB7 Z\xFCrich \xB7 100k+

TOP 5 STELLEN F\xDCR DICH:

1. Head of Marketing \u2013 Nestl\xE9 Vevey          92% \u2705
2. Brand Manager \u2013 Lindt Kilchberg            88% \u2705
3. Marketing Director \u2013 Migros Z\xFCrich         85% \u2705
4. CMO \u2013 Feldschl\xF6sschen Rheinfelden          79%
5. Senior Brand Lead \u2013 Emmi Luzern           74%

\u{1F4A1} WARUM NESTL\xC9 AN #1:
\u2713 FMCG-Erfahrung ist perfekter Match
\u2713 Gehalt: CHF 115\u2013135k (passt zu deinem Ziel)
\u2713 Standort Vevey: 1h von Z\xFCrich mit Zug
\u2713 Mehrsprachigkeit DE/FR wird aktiv gesucht
\u2713 Wachstumsbereich: Plant-based Foods

N\xE4chster Schritt: Bewerbung direkt starten \u2192`,
        `\u{1F3AF} JOB MATCHING RESULT

Profile: Marketing Manager \xB7 6y \xB7 FMCG \xB7 Z\xFCrich \xB7 100k+

TOP 5 POSITIONS FOR YOU:

1. Head of Marketing \u2013 Nestl\xE9 Vevey          92% \u2705
2. Brand Manager \u2013 Lindt Kilchberg            88% \u2705
3. Marketing Director \u2013 Migros Z\xFCrich         85% \u2705
4. CMO \u2013 Feldschl\xF6sschen                      79%
5. Senior Brand Lead \u2013 Emmi Lucerne          74%

\u{1F4A1} WHY NESTL\xC9 AT #1:
\u2713 FMCG experience is a perfect match
\u2713 Salary: CHF 115\u2013135k (matches your goal)
\u2713 Location Vevey: 1h from Z\xFCrich by train

Next step: Start your application \u2192`,
        `\u{1F3AF} R\xC9SULTAT JOB MATCHING

Profil: Marketing Manager \xB7 6 ans \xB7 FMCG \xB7 Zurich

TOP 5 POSTES POUR VOUS:
1. Head of Marketing \u2013 Nestl\xE9 Vevey    92% \u2705
2. Brand Manager \u2013 Lindt Kilchberg     88% \u2705
3. Directeur Marketing \u2013 Migros        85% \u2705

\u{1F4A1} Salaire Nestl\xE9: CHF 115\u2013135k \u2713`,
        `\u{1F3AF} RISULTATO JOB MATCHING

Profilo: Marketing Manager \xB7 6 anni \xB7 FMCG \xB7 Zurigo

TOP 5 POSIZIONI PER TE:
1. Head of Marketing \u2013 Nestl\xE9 Vevey    92% \u2705
2. Brand Manager \u2013 Lindt Kilchberg     88% \u2705
3. Marketing Director \u2013 Migros         85% \u2705`
      ),
      coach: L(
        `\u{1F3A4} INTERVIEW-COACH BEWERTUNG

Frage: \xABWo sehen Sie sich in 5 Jahren?\xBB
Deine Antwort: \xABIch m\xF6chte wachsen und mehr Verantwortung \xFCbernehmen.\xBB

BEWERTUNG: 58/100 \u2013 Ausbauf\xE4hig \u26A0\uFE0F

\u2717 Probleme:
  Zu vage \u2013 klingt wie jede Antwort
  Kein Bezug zur Stelle / zum Unternehmen
  Keine konkreten Ziele genannt

\u2713 St\xE4rken:
  Ambitionen erkennbar

\u{1F4A1} MUSTERL\xD6SUNG:
\xABIn 5 Jahren sehe ich mich als Team Lead im Bereich Digital Marketing \u2013 idealerweise in einem Unternehmen wie Migros, wo ich die Digitalstrategie aktiv mitpr\xE4gen kann. Ich plane, in den n\xE4chsten 2 Jahren zun\xE4chst tiefes Fachwissen in Performance Marketing aufzubauen, dann ein kleines Team zu \xFCbernehmen.\xBB

\u2192 Diese Antwort: 91/100 \u2705`,
        `\u{1F3A4} INTERVIEW COACH RATING

Question: \xABWhere do you see yourself in 5 years?\xBB
Your answer: \xABI want to grow and take on more responsibility.\xBB

RATING: 58/100 \u2013 Needs work \u26A0\uFE0F

\u2717 Issues:
  Too vague \u2013 sounds like every answer
  No reference to the role / company
  No concrete goals mentioned

\u{1F4A1} MODEL ANSWER:
\xABIn 5 years I see myself as a Team Lead in Digital Marketing \u2013 ideally at a company like Migros, where I can actively shape the digital strategy. I plan to first build deep expertise in performance marketing, then take on a small team.\xBB

\u2192 This answer: 91/100 \u2705`,
        `\u{1F3A4} COACH ENTRETIEN

Question: \xABO\xF9 vous voyez-vous dans 5 ans?\xBB
Score: 58/100 \u26A0\uFE0F

\u2717 Trop vague \u2013 comme toutes les r\xE9ponses
\u2717 Pas de r\xE9f\xE9rence au poste

\u{1F4A1} MOD\xC8LE DE R\xC9PONSE:
\xABDans 5 ans je me vois comme Team Lead Marketing digital chez Migros, ayant d'abord d\xE9velopp\xE9 une expertise en performance marketing.\xBB

\u2192 Cette r\xE9ponse: 91/100 \u2705`,
        `\u{1F3A4} COACH COLLOQUIO

Domanda: \xABDove si vede tra 5 anni?\xBB
Punteggio: 58/100 \u26A0\uFE0F

\u2717 Troppo vago
\u2717 Nessun riferimento al ruolo

\u{1F4A1} RISPOSTA MODELLO:
\xABTra 5 anni mi vedo come Team Lead nel Digital Marketing, avendo prima sviluppato competenze in performance marketing.\xBB

\u2192 Questa risposta: 91/100 \u2705`
      ),
      excel: L(
        `\u{1F4CA} EXCEL-GENERATOR OUTPUT

Erstellt: \xABHaushaltsbuch 2025 \u2013 Monatliche Ausgaben\xBB

TABELLENBLATT 1: \xDCbersicht
\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502 Kategorie   \u2502 Budget   \u2502 Ist      \u2502 Diff    \u2502
\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
\u2502 Miete       \u2502 1'800    \u2502 1'800    \u2502 0       \u2502
\u2502 Lebensmittel\u2502 600      \u2502 543.50   \u2502 +56.50  \u2502
\u2502 Verkehr     \u2502 200      \u2502 187.00   \u2502 +13.00  \u2502
\u2502 TOTAL       \u2502 =SUMME() \u2502 =SUMME() \u2502 =B-C    \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518

FORMELN ENTHALTEN:
\u2713 =SUMME(B2:B12) \u2013 Monatstotal
\u2713 =B13-C13 \u2013 Abweichung Budget/Ist
\u2713 =WENN(D13>0,"\u2713 Im Budget","\u26A0\uFE0F \xDCberzogen")
\u2713 Bedingte Formatierung: Rot wenn \xFCber Budget

\u2192 Download als .xlsx \u2013 direkt in Excel \xF6ffnen`,
        `\u{1F4CA} EXCEL GENERATOR OUTPUT

Created: \xABHousehold Budget 2025 \u2013 Monthly Expenses\xBB

SHEET 1: Overview
\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502 Category    \u2502 Budget   \u2502 Actual   \u2502 Diff    \u2502
\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
\u2502 Rent        \u2502 1'800    \u2502 1'800    \u2502 0       \u2502
\u2502 Groceries   \u2502 600      \u2502 543.50   \u2502 +56.50  \u2502
\u2502 TOTAL       \u2502 =SUM()   \u2502 =SUM()   \u2502 =B-C    \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518

FORMULAS INCLUDED:
\u2713 =SUM(B2:B12) \u2013 Monthly total
\u2713 =IF(D13>0,"\u2713 On budget","\u26A0\uFE0F Over budget")
\u2713 Conditional formatting: Red if over budget`,
        `\u{1F4CA} G\xC9N\xC9RATEUR EXCEL

Cr\xE9\xE9: \xABBudget mensuel 2025\xBB

FEUILLE 1: Vue d'ensemble
\u2502 Cat\xE9gorie   \u2502 Budget \u2502 R\xE9el   \u2502 Diff  \u2502
\u2502 Loyer       \u2502 1'800  \u2502 1'800  \u2502 0     \u2502
\u2502 Alimentation\u2502 600    \u2502 543.50 \u2502+56.50 \u2502

FORMULES INCLUSES:
\u2713 =SOMME(B2:B12)
\u2713 =SI(D13>0,"\u2713 Dans budget","\u26A0\uFE0F D\xE9pass\xE9")`,
        `\u{1F4CA} GENERATORE EXCEL

Creato: \xABBudget mensile 2025\xBB

FOGLIO 1: Panoramica
\u2502 Categoria  \u2502 Budget \u2502 Reale  \u2502 Diff  \u2502
\u2502 Affitto    \u2502 1'800  \u2502 1'800  \u2502 0     \u2502
\u2502 Alimentari \u2502 600    \u2502 543.50 \u2502+56.50 \u2502

FORMULE INCLUSE:
\u2713 =SOMMA(B2:B12)
\u2713 =SE(D13>0,"\u2713 In budget","\u26A0\uFE0F Superato")`
      ),
      pptx: L(
        `\u{1F4FD}\uFE0F POWERPOINT-MAKER OUTPUT

Erstellt: \xABQuartalsreview Q1 2025\xBB \u2013 8 Folien

FOLIE 1 \u2013 Titelfolie:
  \xABQuartalsreview Q1 2025\xBB
  Untertitel: \xABMarketing Performance & Ausblick Q2\xBB

FOLIE 2 \u2013 Highlights:
  \u2022 Umsatz: CHF 2.4M (+18% vs. Vorjahr) \u2705
  \u2022 Neue Kunden: 127 (+34%) \u2705
  \u2022 NPS Score: 72 (Branche: 45) \u2705

FOLIE 3 \u2013 Kennzahlen:
  [Balkendiagramm: Umsatz Jan\u2013M\xE4rz]

FOLIE 4\u20137 \u2013 Detailanalyse pro Bereich

FOLIE 8 \u2013 Ausblick Q2:
  \u2022 Ziel: CHF 2.8M (+17%)
  \u2022 3 Hauptinitiativen

SPRECHERNOTIZEN: Auf allen Folien enthalten
\u2192 Download als .pptx \u2013 direkt in PowerPoint`,
        `\u{1F4FD}\uFE0F POWERPOINT MAKER OUTPUT

Created: \xABQ1 2025 Quarterly Review\xBB \u2013 8 slides

SLIDE 1 \u2013 Title: \xABQ1 2025 Quarterly Review\xBB
SLIDE 2 \u2013 Highlights:
  \u2022 Revenue: CHF 2.4M (+18% vs last year) \u2705
  \u2022 New customers: 127 (+34%) \u2705
  \u2022 NPS Score: 72 (Industry avg: 45) \u2705
SLIDE 3 \u2013 KPIs: [Bar chart: Revenue Jan\u2013Mar]
SLIDES 4\u20137 \u2013 Detail analysis per area
SLIDE 8 \u2013 Q2 Outlook: Target CHF 2.8M

SPEAKER NOTES: Included on all slides
\u2192 Download as .pptx \u2013 open directly in PowerPoint`,
        `\u{1F4FD}\uFE0F CR\xC9ATEUR POWERPOINT

Cr\xE9\xE9: \xABRevue trimestrielle Q1 2025\xBB \u2013 8 diapositives

DIAPO 1: \xABRevue Q1 2025\xBB
DIAPO 2 \u2013 Points forts:
  \u2022 Chiffre d'affaires: CHF 2.4M (+18%) \u2705
  \u2022 Nouveaux clients: 127 (+34%) \u2705

NOTES: Incluses sur toutes les diapositives`,
        `\u{1F4FD}\uFE0F CREATORE POWERPOINT

Creato: \xABReview Trimestrale Q1 2025\xBB \u2013 8 diapositive

DIAPOSITIVA 1: \xABReview Q1 2025\xBB
DIAPOSITIVA 2 \u2013 Punti salienti:
  \u2022 Fatturato: CHF 2.4M (+18%) \u2705
  \u2022 Nuovi clienti: 127 (+34%) \u2705

NOTE: Incluse in tutte le diapositive`
      )
    };
    const Li2jobDemo = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "white", borderRadius: 14, overflow: "hidden", border: "1px solid #e2e8f0", fontSize: 12.5 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "#0a66c2", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 32, height: 32, background: "white", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }, children: "\u{1F517}" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: "white", fontWeight: 800, fontSize: 12, lineHeight: 1.2 }, children: "LinkedIn \u2192 Bewerbung" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: "rgba(255,255,255,.7)", fontSize: 10.5 }, children: "Senior Developer @ Google Z\xFCrich \xB7 ETH-Profil" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { background: "#10b981", borderRadius: 20, padding: "3px 10px", fontSize: 10, color: "white", fontWeight: 700, flexShrink: 0 }, children: "\u2726 Live generiert" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "14px 16px", borderBottom: "1px solid #f1f5f9" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { background: "#fef3c7", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: "#92400e" }, children: "\u270D\uFE0F Motivationsschreiben" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: 1, flex: 1, background: "#e2e8f0" } })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "#f8fafc", borderRadius: 9, padding: "12px 14px", border: "1px solid #e2e8f0", lineHeight: 1.75, color: "#334155" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { margin: "0 0 8px", fontWeight: 600, fontSize: 12, color: "#0f172a" }, children: "Sehr geehrte Damen und Herren," }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { margin: "0 0 8px" }, children: "als ETH-Absolvent mit 4 Jahren Erfahrung in Python und React bewerbe ich mich f\xFCr die Senior Developer Position. Meine Cloud-Expertise (GCP, AWS) passt direkt zu Ihren Anforderungen." }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { margin: 0, color: "#94a3b8", fontStyle: "italic", fontSize: 11 }, children: "\u2026 vollst\xE4ndiger Brief \xB7 live generiert in ~8 Sek." })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "14px 16px", borderBottom: "1px solid #f1f5f9" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { background: "#dbeafe", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: "#1d4ed8" }, children: "\u{1F4C4} Lebenslauf-Highlights" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: 1, flex: 1, background: "#e2e8f0" } })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }, children: [
          { ico: "\u{1F393}", v: "ETH Z\xFCrich B.Sc. Informatik" },
          { ico: "\u{1F4BC}", v: "4 J. Full-Stack \xB7 Python, React" },
          { ico: "\u2601\uFE0F", v: "GCP \xB7 AWS Certified" },
          { ico: "\u{1F3C6}", v: "Ladezeit \u201340% \xB7 3 Enterprise-Apps" }
        ].map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 7, background: i % 2 === 0 ? "#f0f9ff" : "#f8fafc", borderRadius: 8, padding: "8px 10px", border: "1px solid #e2e8f0" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 16, flexShrink: 0 }, children: r.ico }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11.5, color: "#1e293b", fontWeight: 500, lineHeight: 1.3 }, children: r.v })
        ] }, i)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "14px 16px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { background: "#f0fdf4", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: "#15803d" }, children: "\u{1F4A1} Deine 3 st\xE4rksten Argumente" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: 1, flex: 1, background: "#e2e8f0" } })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [
          { n: 1, t: "ETH-Abschluss", s: 95, c: "#10b981", note: "Top-5%-Kandidatenpool" },
          { n: 2, t: "Python-Expertise", s: 92, c: "#0a66c2", note: "Kernsprache bei Google" },
          { n: 3, t: "Kein Visum n\xF6tig", s: 88, c: "#f59e0b", note: "Spart Google Aufwand" }
        ].map((a, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: `${a.c}08`, borderRadius: 9, border: `1px solid ${a.c}22` }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 22, height: 22, background: a.c, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 800, flexShrink: 0 }, children: a.n }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontWeight: 700, fontSize: 12, color: "#0f172a" }, children: [
              a.t,
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontWeight: 400, color: "#64748b" }, children: [
                "\xB7 ",
                a.note
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: 4, background: "#e2e8f0", borderRadius: 3, marginTop: 4, overflow: "hidden" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: "100%", width: `${a.s}%`, background: a.c, borderRadius: 3 } }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontWeight: 800, fontSize: 12, color: a.c, flexShrink: 0 }, children: [
            a.s,
            "/100"
          ] })
        ] }, i)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "8px 16px", background: "#f0f9ff", borderTop: "1px solid #bae6fd", fontSize: 11, color: "#0369a1", display: "flex", alignItems: "center", gap: 6 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 6, height: 6, background: "#0ea5e9", borderRadius: "50%" } }),
        L("3 Abschnitte \xB7 alles aus einem LinkedIn-Export generiert", "3 sections \xB7 all generated from one LinkedIn export", "3 sections \xB7 tout g\xE9n\xE9r\xE9 depuis un export LinkedIn", "3 sezioni \xB7 tutto da un export LinkedIn")
      ] })
    ] });
    const ExcelDemo = () => {
      const rows = [
        { cat: L("Miete", "Rent", "Loyer", "Affitto"), budget: 1800, ist: 1800, col: null },
        { cat: L("Lebensmittel", "Groceries", "Alimentation", "Alimentari"), budget: 600, ist: 543.5, col: null },
        { cat: L("Verkehr", "Transport", "Transport", "Trasporti"), budget: 200, ist: 187, col: null },
        { cat: L("Freizeit", "Leisure", "Loisirs", "Tempo libero"), budget: 300, ist: 342, col: "over" },
        { cat: L("Gesundheit", "Health", "Sant\xE9", "Salute"), budget: 150, ist: 89, col: null }
      ];
      const totalB = rows.reduce((s, r) => s + r.budget, 0);
      const totalI = rows.reduce((s, r) => s + r.ist, 0);
      const diff = (v, b) => v <= b;
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "white", borderRadius: 12, overflow: "hidden", border: "1px solid #d1d5db", fontSize: 12 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "#217346", padding: "6px 12px", display: "flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 14 }, children: "\u{1F4CA}" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "white", fontWeight: 700, fontSize: 12 }, children: "Haushaltsbuch_2025.xlsx" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { marginLeft: "auto", color: "rgba(255,255,255,.6)", fontSize: 11 }, children: "Microsoft Excel" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "#f3f4f6", borderBottom: "1px solid #d1d5db", padding: "2px 0 0 8px", display: "flex", gap: 1 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "white", border: "1px solid #d1d5db", borderBottom: "none", padding: "3px 14px", fontSize: 11, color: "#217346", fontWeight: 600, borderRadius: "3px 3px 0 0" }, children: [
            "\u{1F4CB} ",
            L("\xDCbersicht", "Overview", "Vue d'ensemble", "Panoramica")
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "#e5e7eb", border: "1px solid #d1d5db", borderBottom: "none", padding: "3px 14px", fontSize: 11, color: "#6b7280", borderRadius: "3px 3px 0 0" }, children: [
            "\u{1F4C8} ",
            L("Grafik", "Chart", "Graphique", "Grafico")
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "#217346", color: "white", fontWeight: 700, fontSize: 11 }, children: [L("Kategorie", "Category", "Cat\xE9gorie", "Categoria"), L("Budget", "Budget", "Budget", "Budget"), L("Ist", "Actual", "R\xE9el", "Reale"), L("Status", "Status", "Statut", "Stato")].map((h, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: "7px 10px", borderRight: "1px solid rgba(255,255,255,.2)", textAlign: i > 0 ? "right" : "left" }, children: h }, i)) }),
        rows.map((r, i) => {
          const ok = diff(r.ist, r.budget);
          return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: i % 2 === 0 ? "white" : "#f9fafb", borderBottom: "1px solid #f0f0f0" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: "6px 10px", borderRight: "1px solid #e5e7eb", color: "#111" }, children: r.cat }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: "6px 10px", borderRight: "1px solid #e5e7eb", textAlign: "right", color: "#374151", fontFamily: "monospace" }, children: r.budget.toLocaleString("de-CH") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: "6px 10px", borderRight: "1px solid #e5e7eb", textAlign: "right", fontFamily: "monospace", color: ok ? "#374151" : "#dc2626", fontWeight: ok ? 400 : 600 }, children: r.ist.toLocaleString("de-CH") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: "6px 10px", textAlign: "right", fontSize: 12 }, children: ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "#16a34a", fontWeight: 700 }, children: "\u2713 OK" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: "#dc2626", fontWeight: 700 }, children: [
              "\u26A0\uFE0F +",
              (r.ist - r.budget).toFixed(0)
            ] }) })
          ] }, i);
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "#f0fdf4", borderTop: "2px solid #217346" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "7px 10px", fontWeight: 700, color: "#217346", fontSize: 12 }, children: [
            "TOTAL ",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, fontWeight: 400, color: "#6b7280" }, children: "\xB7 =SUMME(B2:B6)" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: "7px 10px", textAlign: "right", fontWeight: 700, fontFamily: "monospace", color: "#217346" }, children: totalB.toLocaleString("de-CH") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: "7px 10px", textAlign: "right", fontWeight: 700, fontFamily: "monospace", color: totalI <= totalB ? "#16a34a" : "#dc2626" }, children: totalI.toLocaleString("de-CH") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: "7px 10px", textAlign: "right", fontWeight: 700, fontSize: 12, color: totalI <= totalB ? "#16a34a" : "#dc2626" }, children: totalI <= totalB ? "\u2713 Im Budget" : "\u26A0\uFE0F \xDCberzogen" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "8px 12px", background: "#f9fafb", fontSize: 11, color: "#6b7280", borderTop: "1px solid #e5e7eb" }, children: [
          "\u{1F4CC} ",
          L("Formeln, bedingte Formatierung & Grafik-Tab enthalten", "Formulas, conditional formatting & chart tab included", "Formules, mise en forme conditionnelle & onglet graphique inclus", "Formule, formattazione condizionale e scheda grafico incluse")
        ] })
      ] });
    };
    const PptxDemo = () => {
      const [active, setActive] = useState(0);
      const accent = "#C33B2E";
      const slides = [
        {
          n: 1,
          lbl: L("Titelfolie", "Title Slide", "Diapo titre", "Diapositiva titolo"),
          thumb: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: `linear-gradient(135deg,${accent},#8e1a0e)`, width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "6px 7px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: 2, background: "rgba(255,255,255,.4)", marginBottom: 4, width: "70%" } }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: 1, background: "rgba(255,255,255,.2)", width: "50%" } }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: 1, background: "rgba(255,255,255,.15)", marginTop: 2, width: "60%" } })
          ] }),
          content: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, background: `linear-gradient(135deg,${accent} 0%,#8e1a0e 100%)`, display: "flex", flexDirection: "column", justifyContent: "center", padding: "28px 36px", position: "relative", overflow: "hidden" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "absolute", right: -20, top: -20, width: 140, height: 140, background: "rgba(255,255,255,.06)", borderRadius: "50%" } }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "absolute", right: 20, bottom: -30, width: 90, height: 90, background: "rgba(255,255,255,.04)", borderRadius: "50%" } }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 10, color: "rgba(255,255,255,.5)", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }, children: "STELLIFY \xB7 PR\xC4SENTATION" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontFamily: "var(--hd)", fontSize: 20, fontWeight: 800, color: "white", lineHeight: 1.25, marginBottom: 10 }, children: [
              L("Quartalsreview", "Quarterly Review", "Revue Trimestrielle", "Review Trimestrale"),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "rgba(255,255,255,.7)" }, children: "Q1 2025" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 40, height: 3, background: "rgba(255,255,255,.4)", borderRadius: 2, marginBottom: 10 } }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "rgba(255,255,255,.65)", lineHeight: 1.5 }, children: L("Marketing Performance & Ausblick Q2", "Marketing Performance & Q2 Outlook", "Performance Marketing & Perspectives Q2", "Performance Marketing & Prospettive Q2") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { marginTop: 18, display: "flex", gap: 6 }, children: ["Marketing", "Q1 2025", L("Schweiz", "Switzerland", "Suisse", "Svizzera")].map((t2, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { background: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.8)", padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 600 }, children: t2 }, i)) })
          ] })
        },
        {
          n: 2,
          lbl: L("Highlights", "Highlights", "Points forts", "Punti salienti"),
          thumb: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "white", width: "100%", height: "100%", padding: "5px 6px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: 2, background: accent, marginBottom: 3, width: "60%" } }),
            [80, 65, 72].map((w, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 2, marginBottom: 2 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 2, height: 2, background: accent, borderRadius: "50%", flexShrink: 0 } }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: 1, background: "#e5e7eb", width: `${w}%` } })
            ] }, i))
          ] }),
          content: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, background: "white", padding: "22px 28px", display: "flex", flexDirection: "column" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 10, borderBottom: `2px solid ${accent}` }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 4, height: 20, background: accent, borderRadius: 2 } }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 16, fontWeight: 800, color: "#1a1a1a" }, children: L("Highlights Q1 2025", "Highlights Q1 2025", "Points forts Q1 2025", "Punti salienti Q1 2025") })
            ] }),
            [
              { ico: "\u{1F4C8}", kpi: L("Umsatz", "Revenue", "Chiffre d'affaires", "Fatturato"), val: "CHF 2.4M", delta: "+18%", ok: true },
              { ico: "\u{1F465}", kpi: L("Neue Kunden", "New Customers", "Nouveaux Clients", "Nuovi Clienti"), val: "127", delta: "+34%", ok: true },
              { ico: "\u2B50", kpi: "NPS Score", val: "72", delta: L("Branche \xD8 45", "Industry avg. 45", "Secteur moy. 45", "Media sett. 45"), ok: true }
            ].map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", background: i % 2 === 0 ? "#fafafa" : "white", borderRadius: 8, marginBottom: 6, border: "1px solid #f0f0f0" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 18, flexShrink: 0 }, children: r.ico }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: "#6b7280", fontWeight: 600 }, children: r.kpi }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 16, fontWeight: 800, color: "#111" }, children: r.val })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { background: r.ok ? "#dcfce7" : "#fee2e2", color: r.ok ? "#16a34a" : "#dc2626", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }, children: r.delta })
            ] }, i))
          ] })
        },
        {
          n: 3,
          lbl: L("Diagramm", "Chart", "Graphique", "Grafico"),
          thumb: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "white", width: "100%", height: "100%", padding: "5px 6px", display: "flex", flexDirection: "column" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: 2, background: accent, marginBottom: 4, width: "50%" } }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { flex: 1, display: "flex", alignItems: "flex-end", gap: 2 }, children: [50, 65, 80].map((h, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { flex: 1, background: i === 2 ? accent : "#fca5a5", height: `${h}%`, borderRadius: "1px 1px 0 0" } }, i)) })
          ] }),
          content: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, background: "white", padding: "22px 28px", display: "flex", flexDirection: "column" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 10, borderBottom: `2px solid ${accent}` }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 4, height: 20, background: accent, borderRadius: 2 } }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 16, fontWeight: 800, color: "#1a1a1a" }, children: L("Umsatz Jan\u2013M\xE4rz", "Revenue Jan\u2013Mar", "CA Jan\u2013Mars", "Fatturato Gen\u2013Mar") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", alignItems: "flex-end", gap: 10, height: 110, marginBottom: 8 }, children: [{ m: "Jan", v: 66, chf: "0.72M" }, { m: "Feb", v: 78, chf: "0.86M" }, { m: L("M\xE4r", "Mar", "Mars", "Mar"), v: 100, chf: "1.10M" }].map((bar, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, fontWeight: 700, color: i === 2 ? accent : "#374151" }, children: bar.chf }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: "100%", background: `linear-gradient(to top,${accent},#e74c3c)`, height: `${bar.v}%`, borderRadius: "4px 4px 0 0", opacity: i === 2 ? 1 : 0.55 } }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: "#6b7280", fontWeight: 600 }, children: bar.m })
              ] }, i)) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: 1, background: "#e5e7eb", marginBottom: 6 } }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
                  "\u{1F4C8} ",
                  L("Total Q1: CHF 2.68M", "Total Q1: CHF 2.68M", "Total Q1: CHF 2.68M", "Totale Q1: CHF 2.68M")
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: "#16a34a", fontWeight: 700 }, children: [
                  "\u25B2 +18% ",
                  L("vs. Vorjahr", "vs. last year", "vs. l'an dernier", "vs. anno scorso")
                ] })
              ] })
            ] })
          ] })
        },
        {
          n: 4,
          lbl: L("Ausblick Q2", "Q2 Outlook", "Perspectives Q2", "Prospettive Q2"),
          thumb: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "white", width: "100%", height: "100%", padding: "5px 6px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: 2, background: accent, marginBottom: 3, width: "55%" } }),
            [75, 60, 68].map((w, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 2, marginBottom: 2 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 3, height: 3, background: "#fbbf24", borderRadius: 1, flexShrink: 0 } }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: 1, background: "#e5e7eb", width: `${w}%` } })
            ] }, i))
          ] }),
          content: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, background: "white", padding: "22px 28px", display: "flex", flexDirection: "column" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 10, borderBottom: `2px solid ${accent}` }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 4, height: 20, background: accent, borderRadius: 2 } }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 16, fontWeight: 800, color: "#1a1a1a" }, children: L("Ausblick Q2 2025", "Q2 2025 Outlook", "Perspectives Q2 2025", "Prospettive Q2 2025") })
            ] }),
            [
              { num: "01", text: L("Umsatzziel: CHF 2.8M (+17%)", "Revenue target: CHF 2.8M (+17%)", "Objectif CA: CHF 2.8M (+17%)", "Obiettivo fatturato: CHF 2.8M (+17%)") },
              { num: "02", text: L("Launch Produktlinie CH-West", "Launch product line CH-West", "Lancement gamme CH-Ouest", "Lancio linea prodotti CH-Ovest") },
              { num: "03", text: L("Partnerschaften: 3 neue Enterprise-Deals", "Partnerships: 3 new enterprise deals", "Partenariats: 3 nouveaux accords", "Partnership: 3 nuovi accordi enterprise") }
            ].map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 12, padding: "10px 14px", background: "#fafafa", borderRadius: 10, border: "1px solid #f0f0f0" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 28, height: 28, background: accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, fontWeight: 800, color: "white" }, children: item.num }) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 13, color: "#1a1a1a", lineHeight: 1.5, paddingTop: 5, fontWeight: 500 }, children: item.text })
            ] }, i))
          ] })
        }
      ];
      const cur = slides[active];
      const notes = [
        L("Willkommen & kurze Vorstellung. Agenda vorstellen.", "Welcome & brief introduction. Present agenda.", "Bienvenue & br\xE8ve introduction. Pr\xE9senter l'ordre du jour.", "Benvenuti & breve introduzione. Presentare l'ordine del giorno."),
        L("Alle 3 KPIs \xFCbertroffen \u2013 kurz die Gr\xFCnde erl\xE4utern.", "All 3 KPIs exceeded \u2013 briefly explain the reasons.", "Les 3 KPIs d\xE9pass\xE9s \u2013 expliquer bri\xE8vement les raisons.", "Tutti e 3 i KPI superati \u2013 spiegare brevemente le ragioni."),
        L("M\xE4rz st\xE4rkstes Monat \u2013 Kampagne als Haupttreiber nennen.", "March strongest month \u2013 mention campaign as main driver.", "Mars meilleur mois \u2013 mentionner la campagne comme moteur.", "Marzo mese pi\xF9 forte \u2013 citare la campagna come motore principale."),
        L("Ziele sind ehrgeizig aber realistisch \u2013 Details auf Anfrage.", "Targets are ambitious but realistic \u2013 details on request.", "Objectifs ambitieux mais r\xE9alistes \u2013 d\xE9tails sur demande.", "Obiettivi ambiziosi ma realistici \u2013 dettagli su richiesta.")
      ];
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { borderRadius: 12, overflow: "hidden", border: "1px solid #d1d5db", fontSize: 12, userSelect: "none" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "#B7372A", padding: "5px 12px", display: "flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 13 }, children: "\u{1F4FD}\uFE0F" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "white", fontWeight: 700, fontSize: 11, flex: 1 }, children: "Quartalsreview_Q1_2025.pptx \u2013 PowerPoint" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", gap: 5 }, children: ["\u2500", "\u25A1", "\u2715"].map((b, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 16, height: 14, background: "rgba(255,255,255,.15)", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "white", cursor: "pointer" }, children: b }, i)) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "#f3f4f6", borderBottom: "1px solid #d1d5db", padding: "3px 10px", display: "flex", gap: 14, alignItems: "center" }, children: [
          [L("Datei", "File", "Fichier", "File"), L("Start", "Home", "Accueil", "Home"), "Insert", "Design"].map((tab2, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: i === 1 ? "#B7372A" : "#374151", fontWeight: i === 1 ? 700 : 400, cursor: "pointer", padding: "3px 0", borderBottom: i === 1 ? "2px solid #B7372A" : "2px solid transparent" }, children: tab2 }, i)),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "#B7372A", color: "white", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 3, cursor: "pointer" }, children: [
            L("Pr\xE4sentieren", "Present", "Pr\xE9senter", "Presentare"),
            " \u25B6"
          ] }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", background: "#404040", gap: 0 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 76, background: "#2b2b2b", padding: "8px 6px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto", flexShrink: 0 }, children: slides.map((sl, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { onClick: () => setActive(i), style: { cursor: "pointer", transition: "all .15s" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 7, color: i === active ? "#fff" : "#888", marginBottom: 2, textAlign: "center" }, children: i + 1 }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: "100%", paddingTop: "56.25%", position: "relative", borderRadius: 2, overflow: "hidden", border: i === active ? `2px solid #B7372A` : "2px solid transparent", boxShadow: i === active ? "0 0 0 1px rgba(183,55,42,.4)" : "none" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "absolute", inset: 0 }, children: sl.thumb() }) })
          ] }, i)) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, display: "flex", flexDirection: "column", background: "#505050", padding: "10px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { background: "white", boxShadow: "0 4px 20px rgba(0,0,0,.4)", borderRadius: 1, display: "flex", flexDirection: "column", overflow: "hidden", aspectRatio: "16/9", maxHeight: 220 }, children: cur.content() }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 8, background: "rgba(0,0,0,.3)", borderRadius: 4, padding: "6px 10px" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 9, color: "rgba(255,255,255,.4)", fontWeight: 600, letterSpacing: "1px", marginBottom: 3 }, children: "SPEAKER NOTES" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 10, color: "rgba(255,255,255,.65)", lineHeight: 1.5 }, children: notes[active] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "#B7372A", padding: "3px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 9, color: "rgba(255,255,255,.7)" }, children: [
            L("Folie", "Slide", "Diapositive", "Diapositiva"),
            " ",
            active + 1,
            " ",
            L("von", "of", "sur", "di"),
            " ",
            slides.length
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 9, color: "rgba(255,255,255,.7)" }, children: "Widescreen (16:9)" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 6, alignItems: "center" }, children: [
            ["\u229E", "\u25A3", "\u25EB"].map((ic, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: "rgba(255,255,255,.5)", cursor: "pointer" }, children: ic }, i)),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 9, color: "rgba(255,255,255,.5)" }, children: "72%" })
          ] })
        ] })
      ] });
    };
    const ProDemo = ({ toolId, sub }) => {
      const demo = DEMO_OUTPUTS[toolId];
      const strLink = yearly ? C.stripeYearly : C.stripeMonthly;
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "linear-gradient(135deg,#f0fdf9,#ecfdf5)", border: "1.5px solid rgba(16,185,129,.2)", borderRadius: 18, padding: "20px 22px", marginBottom: 14 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { background: "var(--em)", color: "white", borderRadius: 7, padding: "2px 10px", fontSize: 11, fontWeight: 700 }, children: [
              "\u2726 ",
              L("Beispiel-Output", "Example output", "Exemple de r\xE9sultat", "Esempio output")
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: "var(--mu)" }, children: L("So sieht dein Ergebnis aus", "This is what your result looks like", "Voici votre r\xE9sultat", "Ecco il tuo risultato") })
          ] }),
          toolId === "excel" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExcelDemo, {}) : toolId === "pptx" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PptxDemo, {}) : toolId === "li2job" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Li2jobDemo, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { background: "white", borderRadius: 12, padding: "16px", border: "1px solid rgba(16,185,129,.12)", fontSize: 13, color: "var(--ink)", lineHeight: 1.85, whiteSpace: "pre-wrap", maxHeight: 280, overflow: "hidden", maskImage: "linear-gradient(to bottom,black 60%,transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom,black 60%,transparent 100%)" }, children: demo || sub })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", style: { textAlign: "center", padding: "24px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 32, marginBottom: 8 }, children: "\u{1F680}" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 18, fontWeight: 800, marginBottom: 6 }, children: L("Bereit f\xFCr dein Ergebnis?", "Ready for your result?", "Pr\xEAt pour votre r\xE9sultat?", "Pronto per il tuo risultato?") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { fontSize: 13, color: "var(--mu)", marginBottom: 18, lineHeight: 1.7 }, children: L(`Alle Tools \xB7 CHF ${C.priceM}/Mo. \xB7 Jederzeit k\xFCndbar`, `All tools \xB7 CHF ${C.priceM}/mo \xB7 Cancel anytime`, `Tous les outils \xB7 CHF ${C.priceM}/mois \xB7 R\xE9siliable`, `Tutti gli strumenti \xB7 CHF ${C.priceM}/mese`) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em", style: { width: "100%", justifyContent: "center" }, onClick: () => window.open(strLink, "_blank"), children: L("Jetzt Pro werden & starten \u2192", "Become Pro & start \u2192", "Devenir Pro & commencer \u2192", "Diventa Pro & inizia \u2192") })
        ] })
      ] });
    };
    const LockMsg = ({ sub }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProDemo, { toolId: page2, sub });
    const TOOL_INFO = {
      app: { ico: "\u270D\uFE0F", title: L("Bewerbungen", "Applications", "Candidatures", "Candidature"), desc: L("Erstellt Motivationsschreiben & Lebenslauf in 60 Sekunden \u2013 live, auf dein Profil zugeschnitten.", "Generates cover letter & CV in 60 seconds \u2013 live, tailored to your profile.", "G\xE9n\xE8re lettre de motivation & CV en 60 secondes \u2013 en direct, adapt\xE9 \xE0 votre profil.", "Genera lettera di motivazione & CV in 60 secondi \u2013 live, su misura per il tuo profilo.") },
      linkedin: { ico: "\u{1F4BC}", title: "LinkedIn Optimierung", desc: L("Analysiert dein LinkedIn-Profil und optimiert Headline, About & Skills f\xFCr Recruiter.", "Analyzes your LinkedIn profile and optimizes Headline, About & Skills for recruiters.", "Analyse votre profil LinkedIn et optimise Headline, About & Skills pour les recruteurs.", "Analizza il tuo profilo LinkedIn e ottimizza Headline, About & Skills per i recruiter.") },
      ats: { ico: "\u{1F916}", title: "ATS-Simulation", desc: L("Pr\xFCft ob dein Lebenslauf durch Recruiter-Software kommt \u2013 mit Score und konkreten Tipps.", "Checks if your CV passes recruiting software \u2013 with score and concrete tips.", "V\xE9rifie si votre CV passe le logiciel de recrutement \u2013 avec score et conseils concrets.", "Verifica se il tuo CV supera il software di recruiting \u2013 con punteggio e consigli concreti.") },
      zeugnis: { ico: "\u{1F4DC}", title: L("Zeugnis-Analyse", "Reference Analysis", "Analyse de certificat", "Analisi referenze"), desc: L("Entschl\xFCsselt den Schweizer Zeugnis-Code und zeigt was dein Arbeitszeugnis wirklich bedeutet.", "Decodes the Swiss reference code and shows what your work reference really means.", "D\xE9code le code suisse des certificats et montre ce que votre certificat signifie vraiment.", "Decodifica il codice svizzero dei certificati e mostra cosa significa davvero il tuo certificato.") },
      jobmatch: { ico: "\u{1F3AF}", title: "Job-Matching", desc: L("Findet deine Top 5 passenden Stellenprofile basierend auf deinen Skills und W\xFCnschen.", "Finds your top 5 matching job profiles based on your skills and preferences.", "Trouve vos 5 postes id\xE9aux bas\xE9s sur vos comp\xE9tences et pr\xE9f\xE9rences.", "Trova i tuoi 5 profili di lavoro ideali basati sulle tue competenze e preferenze.") },
      coach: { ico: "\u{1F3A4}", title: "Interview-Coach", desc: L("Simuliert ein echtes Vorstellungsgespr\xE4ch und gibt dir danach eine Bewertung mit Tipps.", "Simulates a real job interview and gives you a rating with tips afterwards.", "Simule un vrai entretien d'embauche et vous donne ensuite une \xE9valuation avec des conseils.", "Simula un vero colloquio di lavoro e ti d\xE0 poi una valutazione con consigli.") },
      excel: { ico: "\u{1F4CA}", title: "Excel-Generator", desc: L("Beschreibe deine Tabelle \u2013 die KI erstellt Struktur, Spalten, Beispieldaten und Formeln.", "Describe your spreadsheet \u2013 AI creates structure, columns, sample data and formulas.", "D\xE9crivez votre tableau \u2013 l'IA cr\xE9e structure, colonnes, donn\xE9es d'exemple et formules.", "Descrivi il tuo foglio \u2013 l'IA crea struttura, colonne, dati di esempio e formule.") },
      pptx: { ico: "\u{1F4FD}\uFE0F", title: "PowerPoint-Maker", desc: L("Erstellt eine komplette Pr\xE4sentation mit Folien, Bullet Points und Sprechernotizen.", "Creates a complete presentation with slides, bullet points and speaker notes.", "Cr\xE9e une pr\xE9sentation compl\xE8te avec diapositives, points cl\xE9s et notes de pr\xE9sentateur.", "Crea una presentazione completa con diapositive, punti chiave e note del presentatore.") }
    };
    const ToolBanner = ({ pageId }) => {
      const info = TOOL_INFO[pageId];
      if (!info) return null;
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "linear-gradient(135deg,rgba(16,185,129,.08),rgba(16,185,129,.03))", border: "1px solid rgba(16,185,129,.2)", borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 32, flexShrink: 0 }, children: info.ico }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 16, fontWeight: 800, marginBottom: 3 }, children: info.title }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 13, color: "var(--mu)", lineHeight: 1.5 }, children: info.desc })
        ] })
      ] });
    };
    const authModals = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      showAuth && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        AuthModal,
        {
          lang,
          onClose: () => setShowAuth(false),
          defaultMode: authMode,
          onSuccess: (user) => {
            setAuthSession({ email: user.email, plan: user.plan, isAdmin: user.isAdmin });
            if (user.plan === "pro" || user.plan === "family" || user.plan === "team" || user.isAdmin) {
              actPro();
              setPro(true);
            }
            setShowAuth(false);
          }
        }
      ),
      showAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminDashboard, { lang, onClose: () => setShowAdmin(false) }),
      showMembers && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MemberPanel, { lang, session: authSession, onClose: () => setShowMembers(false) })
    ] });
    if (page2 === "landing") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: FONTS + CSS }),
      pw && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PW, {}),
      showOnboarding && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OnboardingFlow, { lang, onDone: doneOnboarding }),
      showProfiles && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileManager, { lang, onClose: () => setShowProfiles(false), onSelect: (p) => {
        if (p) {
          setActiveProfile(p);
          setProf({ name: p.name || "", beruf: p.beruf || "", erfahrung: p.erfahrung || "", skills: p.skills || "", sprachen: p.sprachen || "", ausbildung: p.ausbildung || "" });
        }
      } }),
      authModals,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToastContainer, {}),
      pageLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "top-progress", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "top-progress-bar", style: { width: "80%" } }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatBot, { lang, pro, setPw, navTo, authSession, onAuthOpen: () => {
        setAuthMode("login");
        setShowAuth(true);
      } }),
      cookieBanner && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CookieBanner, { lang, onAccept: acceptCookie }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-anim", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Nav, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "hero", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "hbg" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "hdots" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "con", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "eyebrow", children: t.hero.eye }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { className: "hh", children: [
              t.hero.h1a,
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
              t.hero.h1b,
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: t.hero.h1c })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "hsub", children: t.hero.sub }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "hctas", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em b-lg", onClick: () => navTo("app"), children: t.hero.cta }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-out", onClick: () => document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" }), children: t.hero.how })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { marginTop: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                onClick: () => navTo("app"),
                style: { display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(16,185,129,.13)", border: "1.5px solid rgba(16,185,129,.35)", borderRadius: 30, padding: "9px 20px", fontSize: 13, fontWeight: 700, color: "var(--em)", cursor: "pointer", transition: "all .2s" },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "rgba(16,185,129,.22)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = "rgba(16,185,129,.13)";
                  e.currentTarget.style.transform = "none";
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u{1F381}" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: lang === "de" ? "Jetzt 1\xD7 kostenlos testen \u2013 ohne Kreditkarte" : lang === "en" ? "Try 1\xD7 for free \u2013 no credit card" : lang === "fr" ? "Essai 1\xD7 gratuit \u2013 sans carte" : "Prova 1\xD7 gratis \u2013 senza carta" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { opacity: 0.6 }, children: "\u2192" })
                ]
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexWrap: "wrap", gap: "10px 20px", marginTop: 18, alignItems: "center" }, children: [
              { ico: "\u{1F512}", txt: lang === "de" ? "Keine Kreditkarte n\xF6tig" : lang === "fr" ? "Sans carte de cr\xE9dit" : lang === "it" ? "Senza carta di credito" : "No credit card needed" },
              { ico: "\u{1F1E8}\u{1F1ED}", txt: lang === "de" ? "Schweizer Unternehmen" : lang === "fr" ? "Entreprise suisse" : lang === "it" ? "Azienda svizzera" : "Swiss company" },
              { ico: "\u26A1", txt: lang === "de" ? "1\xD7 gratis ausprobieren" : lang === "fr" ? "1\xD7 gratuit" : lang === "it" ? "1\xD7 gratis" : "1\xD7 free to try" }
            ].map((tr, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,.38)", fontWeight: 500 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 13 }, children: tr.ico }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: tr.txt })
            ] }, i)) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "hstats", children: t.hero.stats.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stat-n", children: s.n }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stat-l", children: s.l })
            ] }, i)) })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { style: { padding: "72px 0 48px", background: "var(--bg)" }, id: "tools", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "con", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sh shc", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "seye", children: lang === "de" ? "\u2726 20+ Tools \u2013 ein Abo" : lang === "en" ? "\u2726 20+ Tools \u2013 one subscription" : lang === "fr" ? "\u2726 20+ outils \u2013 un abonnement" : "\u2726 20+ strumenti \u2013 un abbonamento" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "st", children: lang === "de" ? "Nicht nur f\xFCr Jobsuchende." : lang === "en" ? "Not just for job seekers." : lang === "fr" ? "Pas seulement pour les chercheurs d'emploi." : "Non solo per chi cerca lavoro." }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ss", style: { margin: "0 auto" }, children: lang === "de" ? "Karriere, Schule, Produktivit\xE4t \u2013 alles in einem Abo f\xFCr CHF 19.90/Monat." : lang === "en" ? "Career, school, productivity \u2013 all in one subscription for CHF 19.90/month." : lang === "fr" ? "Carri\xE8re, \xE9cole, productivit\xE9 \u2013 tout pour CHF 19.90/mois." : "Carriera, scuola, produttivit\xE0 \u2013 tutto per CHF 19.90/mese." }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 24 }, children: [
            { ico: "\u{1F4BC}", lbl: lang === "de" ? "Karriere" : lang === "fr" ? "Carri\xE8re" : lang === "it" ? "Carriera" : "Career", n: "8" },
            { ico: "\u{1F393}", lbl: lang === "de" ? "Schule" : lang === "fr" ? "\xC9cole" : lang === "it" ? "Scuola" : "School", n: "3" },
            { ico: "\u26A1", lbl: lang === "de" ? "Produktivit\xE4t" : lang === "fr" ? "Productivit\xE9" : lang === "it" ? "Produttivit\xE0" : "Productivity", n: "3" },
            { ico: "\u{1F310}", lbl: lang === "de" ? "4 Sprachen" : lang === "fr" ? "4 langues" : lang === "it" ? "4 lingue" : "4 languages", n: "" }
          ].map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6, background: "white", border: "1.5px solid var(--bo)", borderRadius: 30, padding: "7px 16px", fontSize: 13, fontWeight: 600, color: "var(--ink)" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: p.ico }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: p.lbl }),
            p.n && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { background: "var(--em3)", color: "var(--em2)", borderRadius: 20, padding: "1px 7px", fontSize: 11, fontWeight: 700 }, children: p.n })
          ] }, i)) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 22, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "inline-flex", alignItems: "center", gap: 12, background: "white", border: "1.5px solid rgba(16,185,129,.22)", borderRadius: 40, padding: "10px 10px 10px 20px", boxShadow: "0 2px 12px rgba(16,185,129,.07)" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 13, color: "var(--mu)", fontWeight: 500 }, children: [
                lang === "de" ? "Ab" : lang === "fr" ? "D\xE8s" : lang === "it" ? "Da" : "From",
                " ",
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontFamily: "var(--hd)", fontSize: 17, fontWeight: 800, color: "var(--ink)" }, children: [
                  "CHF ",
                  C.priceY
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: "var(--mu)" }, children: "/Mo." }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: "var(--mu)", fontStyle: "italic", marginLeft: 2 }, children: lang === "de" ? "(j\xE4hrlich)" : lang === "fr" ? "(annuel)" : lang === "it" ? "(annuale)" : "(annual)" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { marginLeft: 8, fontSize: 11, background: "rgba(16,185,129,.1)", color: "var(--em2)", borderRadius: 20, padding: "2px 9px", fontWeight: 700 }, children: "\u{1F525} \u201325%" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => document.getElementById("preise")?.scrollIntoView({ behavior: "smooth" }), style: { background: "var(--em)", color: "white", border: "none", borderRadius: 25, padding: "9px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }, children: lang === "de" ? "Jetzt starten \u2192" : lang === "fr" ? "Commencer \u2192" : lang === "it" ? "Inizia \u2192" : "Get started \u2192" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 11, color: "var(--mu)" }, children: [
              "\u{1F512} ",
              lang === "de" ? "1\xD7 gratis \xB7 keine Kreditkarte" : lang === "fr" ? "1\xD7 gratuit \xB7 sans carte" : "1\xD7 free \xB7 no credit card"
            ] })
          ] })
        ] }) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { style: { background: "var(--dk)", padding: "0 0 72px", position: "relative", overflow: "hidden" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(16,185,129,.05) 1px,transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 70% at 80% 50%,rgba(16,185,129,.07),transparent)", pointerEvents: "none" } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "con", style: { position: "relative" }, children: [
            authSession && !authSession.isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { paddingTop: 32 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StreakBanner, { lang }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 12, paddingTop: authSession && !authSession.isAdmin ? 0 : 52, marginBottom: 28 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 36, height: 36, background: "var(--em3)", border: "1.5px solid rgba(16,185,129,.3)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }, children: "\u{1F4BC}" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 21, fontWeight: 800, color: "white", letterSpacing: "-.5px" }, children: lang === "de" ? "Karriere & Bewerbung" : lang === "en" ? "Career & Applications" : lang === "fr" ? "Carri\xE8re & Candidatures" : "Carriera & Candidature" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "rgba(255,255,255,.3)", marginTop: 2 }, children: lang === "de" ? "F\xFCr Jobsuchende & Berufst\xE4tige" : lang === "en" ? "For job seekers & professionals" : lang === "fr" ? "Pour chercheurs d'emploi & professionnels" : "Per chi cerca lavoro & professionisti" })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "div",
              {
                onClick: () => navTo("li2job"),
                style: { cursor: "pointer", background: "linear-gradient(135deg,#0a66c2 0%,#004182 55%,#003068 100%)", border: "none", borderRadius: 24, padding: "0", marginBottom: 20, position: "relative", overflow: "hidden", transition: "all .28s", boxShadow: "0 8px 40px rgba(10,102,194,.25)" },
                onMouseEnter: (e) => {
                  e.currentTarget.style.transform = "translateY(-5px)";
                  e.currentTarget.style.boxShadow = "0 28px 64px rgba(10,102,194,.45)";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "0 8px 40px rgba(10,102,194,.25)";
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,.04) 1px,transparent 1px)", backgroundSize: "22px 22px", pointerEvents: "none" } }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "absolute", top: -60, right: -20, width: 280, height: 280, background: "radial-gradient(circle,rgba(255,255,255,.08),transparent 70%)", pointerEvents: "none" } }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "absolute", bottom: -40, left: -20, width: 200, height: 200, background: "radial-gradient(circle,rgba(10,102,194,.4),transparent 70%)", pointerEvents: "none" } }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "stretch", position: "relative" }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, padding: "28px 30px" }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 10, fontWeight: 800, background: "white", color: "#0a66c2", padding: "4px 12px", borderRadius: 20, letterSpacing: "1.5px", textTransform: "uppercase" }, children: [
                          "\u2726 ",
                          lang === "de" ? "NEU & EINZIGARTIG" : lang === "en" ? "NEW & UNIQUE" : lang === "fr" ? "NOUVEAU" : "UNICO"
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, fontWeight: 700, background: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.85)", padding: "4px 10px", borderRadius: 20, border: "1px solid rgba(255,255,255,.2)", letterSpacing: "1px" }, children: "PRO" })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontFamily: "var(--hd)", fontSize: "clamp(20px,2.5vw,28px)", fontWeight: 900, color: "white", letterSpacing: "-1px", marginBottom: 10, lineHeight: 1.05 }, children: [
                        "LinkedIn \u2192 ",
                        lang === "de" ? "Bewerbung" : lang === "en" ? "Application" : lang === "fr" ? "Candidature" : "Candidatura"
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { fontSize: 13, color: "rgba(255,255,255,.62)", lineHeight: 1.75, marginBottom: 18, maxWidth: 500 }, children: lang === "de" ? "Profil + Stelleninserat \u2192 KI erstellt Motivationsschreiben, CV-Highlights & Top-Argumente. In 30 Sekunden." : lang === "en" ? "Profile + job posting \u2192 AI creates cover letter, CV highlights & top arguments. In 30 seconds." : lang === "fr" ? "Profil + offre \u2192 l'IA cr\xE9e lettre, points forts CV & arguments. En 30 secondes." : "Profilo + offerta \u2192 l'IA crea lettera, punti CV & argomenti. In 30 secondi." }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }, children: (lang === "de" ? ["\u2713 Motivationsschreiben", "\u2713 CV-Highlights", "\u2713 3 Killer-Argumente", "\u2713 Auf Stelle zugeschnitten"] : lang === "en" ? ["\u2713 Cover letter", "\u2713 CV highlights", "\u2713 3 killer arguments", "\u2713 Job-tailored"] : lang === "fr" ? ["\u2713 Lettre de motivation", "\u2713 Points forts CV", "\u2713 3 arguments", "\u2713 Adapt\xE9"] : ["\u2713 Lettera", "\u2713 Punti CV", "\u2713 3 argomenti", "\u2713 Su misura"]).map((tag, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.78)", padding: "4px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,.12)", backdropFilter: "blur(4px)" }, children: tag }, j)) }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "inline-flex", alignItems: "center", gap: 8, background: "white", color: "#0a66c2", padding: "11px 24px", borderRadius: 12, fontSize: 13, fontWeight: 800, boxShadow: "0 4px 16px rgba(0,0,0,.2)", letterSpacing: "-.2px" }, children: lang === "de" ? "Jetzt ausprobieren \u2192" : lang === "en" ? "Try it now \u2192" : lang === "fr" ? "Essayer \u2192" : "Prova ora \u2192" })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { width: 140, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.12)", position: "relative", overflow: "hidden" }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "absolute", inset: 0, background: "linear-gradient(135deg,transparent,rgba(0,0,0,.15))" } }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "Georgia,serif", fontSize: 96, fontWeight: 900, color: "white", opacity: 0.18, lineHeight: 1, letterSpacing: "-6px", userSelect: "none", transform: "rotate(-5deg)" }, children: "in" }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "absolute", bottom: 16, right: 16, width: 36, height: 36, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontFamily: "Georgia,serif", fontWeight: 900, color: "white" }, children: "in" })
                    ] })
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "div",
              {
                onClick: () => navTo("lipost"),
                style: { cursor: "pointer", background: "linear-gradient(135deg,#001f3f 0%,#003d7a 50%,#0a66c2 100%)", border: "none", borderRadius: 20, padding: "0", marginBottom: 12, position: "relative", overflow: "hidden", transition: "all .25s", boxShadow: "0 4px 24px rgba(10,102,194,.18)" },
                onMouseEnter: (e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 20px 48px rgba(10,102,194,.35)";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "0 4px 24px rgba(10,102,194,.18)";
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,.03) 1px,transparent 1px)", backgroundSize: "18px 18px", pointerEvents: "none" } }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", position: "relative" }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, padding: "22px 26px" }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 10, fontWeight: 800, background: "linear-gradient(90deg,#0a66c2,#005fa3)", color: "white", padding: "3px 11px", borderRadius: 20, letterSpacing: "1.5px", textTransform: "uppercase", border: "1px solid rgba(255,255,255,.2)" }, children: [
                          "\u270D\uFE0F ",
                          lang === "de" ? "LINKEDIN POSTS" : lang === "en" ? "LINKEDIN POSTS" : lang === "fr" ? "POSTS LINKEDIN" : "POSTS LINKEDIN"
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, fontWeight: 700, background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.75)", padding: "3px 9px", borderRadius: 20, border: "1px solid rgba(255,255,255,.15)" }, children: "PRO" })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: "clamp(16px,2vw,21px)", fontWeight: 800, color: "white", letterSpacing: "-.5px", marginBottom: 7, lineHeight: 1.1 }, children: lang === "de" ? "Automatische LinkedIn-Posts \u2013 Swiss-Style" : lang === "en" ? "Auto LinkedIn Posts \u2013 Swiss Style" : lang === "fr" ? "Posts LinkedIn automatiques" : "Post LinkedIn automatici" }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { fontSize: 12.5, color: "rgba(255,255,255,.55)", lineHeight: 1.65, marginBottom: 14, maxWidth: 480 }, children: lang === "de" ? "3 massgeschneiderte Posts in Sekunden \u2013 keine Corporate-Floskeln, kein \xABFreue mich riesig\xBB. Sofort kopieren." : lang === "en" ? "3 tailored posts in seconds \u2013 no corporate clich\xE9s. Copy immediately." : lang === "fr" ? "3 posts sur mesure en secondes \u2013 pas de clich\xE9s. Copiez imm\xE9diatement." : "3 post su misura in secondi \u2013 niente clich\xE9. Copia subito." }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }, children: (lang === "de" ? ["\u2713 3 Post-Varianten", "\u2713 Neuer Job \xB7 Zertifikat \xB7 Insight", "\u2713 Schweizer Stil", "\u2713 Sofort kopierbar"] : lang === "en" ? ["\u2713 3 post variants", "\u2713 New job \xB7 Certificate \xB7 Insight", "\u2713 Swiss style", "\u2713 Copy instantly"] : lang === "fr" ? ["\u2713 3 variantes", "\u2713 Nouveau poste \xB7 Certificat", "\u2713 Style suisse", "\u2713 Pr\xEAt \xE0 copier"] : ["\u2713 3 varianti", "\u2713 Nuovo posto \xB7 Certificato", "\u2713 Stile svizzero", "\u2713 Copia subito"]).map((tag, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.7)", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(255,255,255,.1)" }, children: tag }, j)) }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.12)", color: "white", padding: "9px 20px", borderRadius: 10, fontSize: 12, fontWeight: 700, border: "1px solid rgba(255,255,255,.18)" }, children: lang === "de" ? "Post generieren \u2192" : lang === "en" ? "Generate post \u2192" : lang === "fr" ? "G\xE9n\xE9rer post \u2192" : "Genera post \u2192" })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 120, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "20px 16px", borderLeft: "1px solid rgba(255,255,255,.06)" }, children: ["Post 1", "Post 2", "Post 3"].map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { width: "100%", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "7px 10px", fontSize: 10, color: "rgba(255,255,255,.5)", fontFamily: "var(--hd)", fontWeight: 600 }, children: [
                      p,
                      " \u2728"
                    ] }, i)) })
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "div",
                {
                  onClick: () => navTo("gehaltsrechner"),
                  style: { cursor: "pointer", background: "linear-gradient(135deg,rgba(5,150,105,.14),rgba(5,150,105,.04))", border: "1.5px solid rgba(5,150,105,.3)", borderRadius: 18, padding: "20px 22px", position: "relative", overflow: "hidden", transition: "all .22s" },
                  onMouseEnter: (e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.borderColor = "rgba(5,150,105,.55)";
                    e.currentTarget.style.boxShadow = "0 12px 36px rgba(5,150,105,.14)";
                  },
                  onMouseLeave: (e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.borderColor = "rgba(5,150,105,.3)";
                    e.currentTarget.style.boxShadow = "none";
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "absolute", top: -16, right: -16, width: 80, height: 80, background: "radial-gradient(circle,rgba(16,185,129,.12),transparent)", borderRadius: "50%", pointerEvents: "none" } }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 36, height: 36, background: "rgba(16,185,129,.15)", border: "1.5px solid rgba(16,185,129,.3)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }, children: "\u{1F4B0}" }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 14, fontWeight: 800, color: "white", letterSpacing: "-.3px", lineHeight: 1.2 }, children: lang === "de" ? "KI-Gehaltsrechner Schweiz" : lang === "en" ? "AI Salary Calculator CH" : lang === "fr" ? "Calculateur salaire IA CH" : "Calcolatore stipendio CH" }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 10, fontWeight: 700, color: "var(--em)", letterSpacing: "1px", textTransform: "uppercase", marginTop: 2 }, children: "PRO" })
                      ] })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { fontSize: 12, color: "rgba(255,255,255,.45)", lineHeight: 1.6, marginBottom: 14 }, children: lang === "de" ? "Branche, Erfahrung, Kanton \u2192 KI analysiert Marktl\xF6hne & gibt dir deine Verhandlungsbasis." : lang === "en" ? "Industry, experience, canton \u2192 AI analyses market salaries & gives your negotiation base." : lang === "fr" ? "Secteur, exp\xE9rience, canton \u2192 analyse des salaires du march\xE9." : "Settore, esperienza, cantone \u2192 analisi salari di mercato." }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "var(--em)", fontWeight: 700 }, children: "Gehalt berechnen \u2192" })
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "div",
                {
                  onClick: () => navTo("tracker"),
                  style: { cursor: "pointer", background: "linear-gradient(135deg,rgba(139,92,246,.12),rgba(139,92,246,.04))", border: "1.5px solid rgba(139,92,246,.3)", borderRadius: 18, padding: "20px 22px", position: "relative", overflow: "hidden", transition: "all .22s" },
                  onMouseEnter: (e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.borderColor = "rgba(139,92,246,.55)";
                    e.currentTarget.style.boxShadow = "0 12px 36px rgba(139,92,246,.14)";
                  },
                  onMouseLeave: (e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.borderColor = "rgba(139,92,246,.3)";
                    e.currentTarget.style.boxShadow = "none";
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "absolute", top: -16, right: -16, width: 80, height: 80, background: "radial-gradient(circle,rgba(139,92,246,.14),transparent)", borderRadius: "50%", pointerEvents: "none" } }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 36, height: 36, background: "rgba(139,92,246,.15)", border: "1.5px solid rgba(139,92,246,.3)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }, children: "\u{1F4CB}" }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 14, fontWeight: 800, color: "white", letterSpacing: "-.3px", lineHeight: 1.2 }, children: lang === "de" ? "Bewerbungs-Tracker" : lang === "en" ? "Application Tracker" : lang === "fr" ? "Suivi candidatures" : "Tracker candidature" }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 10, fontWeight: 700, color: "#a78bfa", letterSpacing: "1px", textTransform: "uppercase", marginTop: 2 }, children: "PRO" })
                      ] })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { fontSize: 12, color: "rgba(255,255,255,.45)", lineHeight: 1.6, marginBottom: 14 }, children: lang === "de" ? "Status-Board f\xFCr alle Bewerbungen \u2013 Kanban, Priorit\xE4ten, Notizen. Immer den \xDCberblick." : lang === "en" ? "Status board for all applications \u2013 Kanban, priorities, notes. Always stay on top." : lang === "fr" ? "Tableau de bord pour toutes vos candidatures \u2013 Kanban, priorit\xE9s, notes." : "Bacheca candidature \u2013 Kanban, priorit\xE0, note. Sempre aggiornato." }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "#a78bfa", fontWeight: 700 }, children: "Status-Board \xF6ffnen \u2192" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "feat-row", children: [
              (() => {
                const item = t.tools.items[0];
                return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  "div",
                  {
                    className: "feat-big",
                    onClick: () => navTo(item.page),
                    style: { cursor: "pointer", background: "linear-gradient(135deg,rgba(16,185,129,.14),rgba(16,185,129,.04))", border: "1.5px solid rgba(16,185,129,.3)", borderRadius: 20, padding: 30, position: "relative", overflow: "hidden", transition: "all .22s", gridRow: "span 2" },
                    onMouseEnter: (e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 20px 48px rgba(16,185,129,.18)";
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "none";
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "absolute", top: -20, right: -20, width: 110, height: 110, background: "radial-gradient(circle,rgba(16,185,129,.18),transparent)", borderRadius: "50%", pointerEvents: "none" } }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 42, marginBottom: 12 }, children: item.ico }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 22, fontWeight: 800, color: "white", letterSpacing: "-.5px" }, children: item.t }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, fontWeight: 700, background: "rgba(16,185,129,.2)", color: "var(--em)", border: "1px solid rgba(16,185,129,.3)", padding: "2px 9px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "1px", flexShrink: 0 }, children: "1\xD7 Gratis" })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { fontSize: 13, color: "rgba(255,255,255,.48)", lineHeight: 1.75, marginBottom: 18 }, children: item.p }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 22 }, children: ["Motivationsschreiben", "CV", "Live-Streaming", "PDF"].map((tag, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)", color: "rgba(255,255,255,.45)", padding: "3px 10px", borderRadius: 20 }, children: tag }, j)) }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "inline-flex", alignItems: "center", gap: 7, background: "var(--em)", color: "white", padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700 }, children: lang === "de" ? "Jetzt starten \u2192" : lang === "en" ? "Start now \u2192" : lang === "fr" ? "Commencer \u2192" : "Inizia \u2192" })
                    ]
                  }
                );
              })(),
              [t.tools.items[1], t.tools.items[2]].map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "div",
                {
                  onClick: () => navTo(item.page),
                  style: { cursor: "pointer", background: "rgba(59,130,246,.08)", border: "1.5px solid rgba(59,130,246,.2)", borderRadius: 16, padding: 22, transition: "all .22s" },
                  onMouseEnter: (e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.borderColor = "rgba(59,130,246,.45)";
                    e.currentTarget.style.boxShadow = "0 8px 32px rgba(59,130,246,.12)";
                  },
                  onMouseLeave: (e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.borderColor = "rgba(59,130,246,.2)";
                    e.currentTarget.style.boxShadow = "none";
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 10 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 26 }, children: item.ico }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, fontWeight: 700, background: "rgba(59,130,246,.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,.2)", padding: "2px 8px", borderRadius: 20 }, children: "PRO" })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 16, fontWeight: 700, color: "white", marginBottom: 5 }, children: item.t }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "rgba(255,255,255,.38)", lineHeight: 1.65 }, children: item.p }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { marginTop: 11, fontSize: 12, color: "#60a5fa", fontWeight: 600 }, children: lang === "de" ? "\xD6ffnen \u2192" : "Open \u2192" })
                  ]
                },
                i
              ))
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "g5-grid", children: t.tools.items.slice(3).map((item, i) => {
              const C2 = [
                { bg: "rgba(245,158,11,.08)", bd: "rgba(245,158,11,.22)", hv: "rgba(245,158,11,.4)", tc: "#fbbf24" },
                { bg: "rgba(16,185,129,.07)", bd: "rgba(16,185,129,.2)", hv: "rgba(16,185,129,.4)", tc: "#34d399" },
                { bg: "rgba(167,139,250,.08)", bd: "rgba(167,139,250,.22)", hv: "rgba(167,139,250,.4)", tc: "#a78bfa" },
                { bg: "rgba(251,113,133,.08)", bd: "rgba(251,113,133,.18)", hv: "rgba(251,113,133,.38)", tc: "#fb7185" }
              ][i % 4];
              return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "div",
                {
                  onClick: () => navTo(item.page),
                  style: { cursor: "pointer", background: C2.bg, border: `1.5px solid ${C2.bd}`, borderRadius: 16, padding: 20, transition: "all .22s" },
                  onMouseEnter: (e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.borderColor = C2.hv;
                    e.currentTarget.style.boxShadow = `0 8px 28px ${C2.bg}`;
                  },
                  onMouseLeave: (e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.borderColor = C2.bd;
                    e.currentTarget.style.boxShadow = "none";
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 8 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 24 }, children: item.ico }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, fontWeight: 700, background: `${C2.tc}22`, color: C2.tc, padding: "2px 8px", borderRadius: 20 }, children: "PRO" })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 14, fontWeight: 700, color: "white", marginBottom: 4 }, children: item.t }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "rgba(255,255,255,.38)", lineHeight: 1.6, marginBottom: 10 }, children: item.p }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: C2.tc, fontWeight: 600 }, children: lang === "de" ? "\xD6ffnen \u2192" : "Open \u2192" })
                  ]
                },
                i
              );
            }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,.18)", marginBottom: 10 }, children: lang === "de" ? "Weitere Karriere-Tools" : lang === "en" ? "More career tools" : lang === "fr" ? "Plus d'outils" : "Altri strumenti" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mini-g", children: GENERIC_TOOLS.filter((g) => g.cat === "karriere" && g.id !== "li2job").map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "div",
              {
                onClick: () => navTo(g.id),
                style: { cursor: "pointer", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 13, padding: "14px 16px", transition: "all .2s", display: "flex", flexDirection: "column", gap: 7 },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,.06)";
                  e.currentTarget.style.borderColor = "rgba(16,185,129,.25)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,.07)";
                  e.currentTarget.style.transform = "none";
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 20 }, children: g.ico }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 12, fontWeight: 700, color: "white", lineHeight: 1.3 }, children: g.t[lang] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: "rgba(255,255,255,.28)", lineHeight: 1.45, flex: 1 }, children: g.sub[lang] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: "var(--em)", fontWeight: 600 }, children: "\u2192" })
                ]
              },
              g.id
            )) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 52, borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 48 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginBottom: 28 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "var(--em)", marginBottom: 8 }, children: [
                  "\u2726 ",
                  lang === "de" ? "LIVE-VORSCHAU \u2013 SO SIEHT DAS ERGEBNIS AUS" : lang === "en" ? "LIVE PREVIEW \u2013 THIS IS WHAT YOU GET" : lang === "fr" ? "APER\xC7U LIVE \u2013 VOICI LE R\xC9SULTAT" : "ANTEPRIMA LIVE \u2013 ECCO IL RISULTATO"
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 24, fontWeight: 800, color: "white", letterSpacing: "-.4px" }, children: lang === "de" ? "Klick auf ein Tool \u2013 sieh sofort den Output." : lang === "en" ? "Click a tool \u2013 see the output instantly." : lang === "fr" ? "Cliquez sur un outil \u2013 voyez le r\xE9sultat." : "Clicca su uno strumento \u2013 vedi subito il risultato." })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DemoSection, { lang, navTo })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { style: { background: "var(--bg)", padding: "64px 0 88px" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "con", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 44 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 36, height: 36, background: "rgba(8,145,178,.1)", border: "1.5px solid rgba(8,145,178,.22)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }, children: "\u{1F393}" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 19, fontWeight: 800, letterSpacing: "-.3px" }, children: lang === "de" ? "Schule & Ausbildung" : lang === "en" ? "School & Education" : lang === "fr" ? "\xC9cole & Formation" : "Scuola & Formazione" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "var(--mu)", marginTop: 2 }, children: lang === "de" ? "F\xFCr Lernende, Lehrlinge & Studierende" : lang === "en" ? "For learners, apprentices & students" : lang === "fr" ? "Pour apprenants, apprentis & \xE9tudiants" : "Per apprendisti e studenti" })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: GENERIC_TOOLS.filter((g) => g.cat === "ausbildung").map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "div",
              {
                onClick: () => navTo(g.id),
                style: { cursor: "pointer", background: "white", border: "1.5px solid var(--bo)", borderRadius: 14, padding: "15px 20px", display: "flex", alignItems: "center", gap: 13, transition: "all .2s", boxShadow: "0 1px 4px rgba(11,11,18,.04)" },
                onMouseEnter: (e) => {
                  e.currentTarget.style.borderColor = "rgba(8,145,178,.35)";
                  e.currentTarget.style.transform = "translateX(5px)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(8,145,178,.09)";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.borderColor = "var(--bo)";
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "0 1px 4px rgba(11,11,18,.04)";
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 40, height: 40, background: "rgba(8,145,178,.07)", border: "1.5px solid rgba(8,145,178,.14)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }, children: g.ico }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 14, fontWeight: 700, marginBottom: 2 }, children: g.t[lang] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "var(--mu)", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: g.sub[lang] })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 14, color: "#0891b2", fontWeight: 700, flexShrink: 0 }, children: "\u2192" })
                ]
              },
              g.id
            )) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 36, height: 36, background: "rgba(124,58,237,.09)", border: "1.5px solid rgba(124,58,237,.22)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }, children: "\u26A1" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 19, fontWeight: 800, letterSpacing: "-.3px" }, children: lang === "de" ? "Produktivit\xE4t" : lang === "en" ? "Productivity" : lang === "fr" ? "Productivit\xE9" : "Produttivit\xE0" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "var(--mu)", marginTop: 2 }, children: lang === "de" ? "F\xFCr alle \u2013 Excel, PPT, E-Mail, \xDCbersetzer" : lang === "en" ? "For all \u2013 Excel, PPT, email, translator" : lang === "fr" ? "Pour tous \u2013 Excel, PPT, e-mail, traducteur" : "Per tutti \u2013 Excel, PPT, e-mail, traduttore" })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
              [
                { page: "excel", ico: "\u{1F4CA}", tl: { de: "Excel-Generator", en: "Excel Generator", fr: "G\xE9n\xE9rateur Excel", it: "Generatore Excel" }, sl: { de: "Profi-Tabellen mit Formeln per Beschreibung", en: "Pro spreadsheets with formulas from description", fr: "Tableaux pros avec formules sur description", it: "Fogli pro con formule da descrizione" }, c: "#059669" },
                { page: "pptx", ico: "\u{1F4FD}\uFE0F", tl: { de: "PowerPoint-Maker", en: "PowerPoint Maker", fr: "Cr\xE9ateur PowerPoint", it: "Creatore PowerPoint" }, sl: { de: "Pr\xE4sentationen f\xFCr Schule, Uni & Arbeit", en: "Presentations for school, uni & work", fr: "Pr\xE9sentations pour \xE9cole, universit\xE9 & travail", it: "Presentazioni per scuola, universit\xE0 e lavoro" }, c: "#2563eb" }
              ].map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "div",
                {
                  onClick: () => navTo(g.page),
                  style: { cursor: "pointer", background: "white", border: `1.5px solid ${g.c}28`, borderRadius: 14, padding: "15px 20px", display: "flex", alignItems: "center", gap: 13, transition: "all .2s", boxShadow: "0 1px 4px rgba(11,11,18,.04)" },
                  onMouseEnter: (e) => {
                    e.currentTarget.style.transform = "translateX(5px)";
                    e.currentTarget.style.boxShadow = `0 4px 20px ${g.c}18`;
                  },
                  onMouseLeave: (e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 1px 4px rgba(11,11,18,.04)";
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 40, height: 40, background: `${g.c}14`, border: `1.5px solid ${g.c}28`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }, children: g.ico }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 14, fontWeight: 700, marginBottom: 2 }, children: g.tl[lang] }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "var(--mu)" }, children: g.sl[lang] })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 14, color: g.c, fontWeight: 700, flexShrink: 0 }, children: "\u2192" })
                  ]
                },
                g.page
              )),
              GENERIC_TOOLS.filter((g) => g.cat === "produktivitaet").map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "div",
                {
                  onClick: () => navTo(g.id),
                  style: { cursor: "pointer", background: "white", border: "1.5px solid var(--bo)", borderRadius: 14, padding: "15px 20px", display: "flex", alignItems: "center", gap: 13, transition: "all .2s", boxShadow: "0 1px 4px rgba(11,11,18,.04)" },
                  onMouseEnter: (e) => {
                    e.currentTarget.style.borderColor = "rgba(124,58,237,.3)";
                    e.currentTarget.style.transform = "translateX(5px)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(124,58,237,.08)";
                  },
                  onMouseLeave: (e) => {
                    e.currentTarget.style.borderColor = "var(--bo)";
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 1px 4px rgba(11,11,18,.04)";
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 40, height: 40, background: "rgba(124,58,237,.06)", border: "1.5px solid rgba(124,58,237,.14)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }, children: g.ico }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 14, fontWeight: 700, marginBottom: 2 }, children: g.t[lang] }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "var(--mu)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: g.sub[lang] })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 14, color: "#7c3aed", fontWeight: 700, flexShrink: 0 }, children: "\u2192" })
                  ]
                },
                g.id
              ))
            ] })
          ] })
        ] }) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "sec sec-dk2", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "con", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sh shc", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "seye", children: t.testi.label }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "st", children: t.testi.title })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "tg", children: t.testi.items.map((x, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "tc2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ts", children: x.s }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "tq", children: [
              "\xAB",
              x.t,
              "\xBB"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "tn", children: x.a }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "tr", children: x.r })
          ] }, i)) })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "sec sec-dk", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "con", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sh", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "seye", children: t.how.label }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "st", children: t.how.title }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ss", children: t.how.sub })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "srow", children: t.how.steps.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sc", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "sn", children: s.n }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: s.t }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: s.p })
          ] }, i)) })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "sec sec-w", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "con", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sh", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "seye", children: t.why.label }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "st", children: t.why.title }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ss", children: t.why.sub })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "why-vs", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "why-col bad", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { style: { color: "#dc2626" }, children: t.why.badH }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: t.why.badL.map((x, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "#fca5a5", flexShrink: 0 }, children: "\u2717" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: x })
              ] }, i)) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "why-col good", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { style: { color: "var(--em2)" }, children: t.why.goodH }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: t.why.goodL.map((x, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--em)", flexShrink: 0 }, children: "\u2713" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: x })
              ] }, i)) })
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "sec sec-bg", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "con", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sh shc", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "seye", children: t.market.label }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "st", children: t.market.title })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18 }, children: t.market.points.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "24px", background: "white", border: "1.5px solid var(--bo)", borderRadius: "var(--r2)" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 28, marginBottom: 10 }, children: p.ico }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 16, fontWeight: 700, marginBottom: 7 }, children: p.t }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 13, color: "var(--mu)", lineHeight: 1.7 }, children: p.p })
          ] }, i)) })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "sec sec-dk", id: "preise", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "con", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sh shc", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "seye", children: t.price.label }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "st", children: t.price.title }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ss", children: t.price.sub })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "btog", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `bto ${!yearly ? "on" : ""}`, onClick: () => setYearly(false), children: t.price.monthly }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `btsw ${yearly ? "yr" : ""}`, onClick: () => setYearly((v) => !v), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "btt" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `bto ${yearly ? "on" : ""}`, onClick: () => setYearly(true), children: t.price.yearly }),
            yearly && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "save-t", children: t.price.save })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pgrid", children: t.price.tiers.map((tier) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `pc ${tier.best ? "hl" : ""} ${tier.id === "team" ? "hl2" : ""}`, children: [
            tier.best && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bst", children: t.price.recom }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `ppl ${tier.best ? "em" : tier.id === "team" ? "am" : ""}`, children: tier.name }),
            tier.price === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ppr", children: [
                "CHF 0",
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
                  " / ",
                  lang === "en" ? "mo" : "Mo."
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pper", children: tier.note })
            ] }),
            tier.priceM && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ppr", children: [
                "CHF ",
                yearly ? Number(tier.priceY).toFixed(2) : Number(tier.priceM).toFixed(2),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
                  " / ",
                  lang === "en" ? "mo" : "Mo."
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pper", children: yearly ? lang === "de" ? `\u{1F525} CHF ${Number(tier.priceY).toFixed(2)}/Mo. \xB7 spare ${Math.round((1 - tier.priceY / tier.priceM) * 100)}% \xB7 CHF ${(tier.priceY * 12).toFixed(2)}/Jahr` : lang === "en" ? `\u{1F525} CHF ${Number(tier.priceY).toFixed(2)}/mo \xB7 save ${Math.round((1 - tier.priceY / tier.priceM) * 100)}% \xB7 CHF ${(tier.priceY * 12).toFixed(2)}/year` : lang === "fr" ? `\u{1F525} CHF ${Number(tier.priceY).toFixed(2)}/mois \xB7 \xE9conomisez ${Math.round((1 - tier.priceY / tier.priceM) * 100)}%` : `\u{1F525} CHF ${Number(tier.priceY).toFixed(2)}/mese \xB7 risparmia ${Math.round((1 - tier.priceY / tier.priceM) * 100)}%` : lang === "de" ? `J\xE4hrlich nur CHF ${Number(tier.priceY).toFixed(2)}/Mo. \u2192 ${Math.round((1 - tier.priceY / tier.priceM) * 100)}% sparen` : lang === "en" ? `Annual plan: CHF ${Number(tier.priceY).toFixed(2)}/mo \u2192 save ${Math.round((1 - tier.priceY / tier.priceM) * 100)}%` : lang === "fr" ? `Annuel: CHF ${Number(tier.priceY).toFixed(2)}/mois \u2192 \xE9conomisez ${Math.round((1 - tier.priceY / tier.priceM) * 100)}%` : `Annuale: CHF ${Number(tier.priceY).toFixed(2)}/mese \u2192 risparmia ${Math.round((1 - tier.priceY / tier.priceM) * 100)}%` })
            ] }),
            tier.price === null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ppr", style: { fontSize: 26, letterSpacing: 0 }, children: lang === "de" ? "Auf Anfrage" : lang === "fr" ? "Sur demande" : lang === "it" ? "Su richiesta" : "On request" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pper", children: tier.note })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", { className: "pfl", children: [
              tier.list.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pck", children: "\u2713" }),
                f
              ] }, f)),
              (tier.no || []).map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: "off", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pcx", children: "\xD7" }),
                f
              ] }, f))
            ] }),
            tier.id === "free" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-out b-w", style: { borderColor: "rgba(255,255,255,.18)", color: "white" }, onClick: () => navTo("app"), children: tier.btn }),
            tier.id === "pro" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: `btn ${tier.btnS} b-w`, onClick: () => window.open(stripeLink(), "_blank"), children: tier.btn }),
            tier.id === "family" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: `btn b-out b-w`, style: { borderColor: "rgba(139,92,246,.4)", color: "rgba(167,139,250,.85)" }, onClick: () => window.open(C.stripeFamily, "_blank"), children: tier.btn }),
            tier.id === "team" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: `btn b-out b-w`, style: { borderColor: "rgba(245,158,11,.4)", color: "rgba(245,158,11,.85)" }, onClick: () => window.open(C.stripeTeam, "_blank"), children: tier.btn })
          ] }, tier.id)) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "vb", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: t.price.valTitle }),
            t.price.valPts.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "vp", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--em)", flexShrink: 0 }, children: "\u2713" }),
              p
            ] }, i))
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { textAlign: "center", marginTop: 40 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,.26)", marginBottom: 16 }, children: t.payments.label }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pay-row", children: t.payments.methods.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pay-chip", children: m }, m)) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "rgba(255,255,255,.2)", marginTop: 12 }, children: t.payments.sub })
          ] })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FaqSection, { lang, email: C.email }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "sec sec-w", style: { background: "var(--bg)" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "con", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sh shc", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "seye", children: [
              "\u2726 ",
              lang === "de" ? "Neue Tools \xB7 2\xD7 gratis testen" : lang === "fr" ? "Nouveaux outils \xB7 2\xD7 gratuit" : lang === "it" ? "Nuovi strumenti \xB7 2\xD7 gratis" : "New Tools \xB7 2\xD7 free trial"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "st", children: lang === "de" ? "3 neue KI-Tools" : lang === "fr" ? "3 nouveaux outils IA" : lang === "it" ? "3 nuovi strumenti IA" : "3 new AI tools" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ssub", children: lang === "de" ? "CV-Check, Interview-Vorbereitung & Inserat-Analyse \u2013 je 2\xD7 gratis testen, dann PRO." : lang === "fr" ? "Check CV, pr\xE9paration entretien & analyse d'offre \u2013 2\xD7 gratuit, puis PRO." : lang === "it" ? "Check CV, prep colloquio & analisi annuncio \u2013 2\xD7 gratis, poi PRO." : "CV check, interview prep & job ad analysis \u2013 2\xD7 free, then PRO." })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { maxWidth: 780, margin: "0 auto" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CVScoreWidget, { lang, pro, setPw }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InterviewPrepWidget, { lang, pro, setPw }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobAdAnalyzerWidget, { lang, pro, setPw })
          ] })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "cta-sec", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "csm", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { style: { fontFamily: "var(--hd)", fontSize: "clamp(36px,5vw,60px)", fontWeight: 800, color: "white", letterSpacing: "-2px", lineHeight: 1.05, marginBottom: 16 }, children: [
            t.cta.title,
            " ",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { style: { fontStyle: "normal", color: "var(--em)" }, children: t.cta.italic })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { fontSize: 16, color: "rgba(255,255,255,.4)", marginBottom: 32, lineHeight: 1.7 }, children: t.cta.sub }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em b-lg", onClick: () => navTo("app"), children: t.cta.btn })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Footer, {})
      ] })
    ] });
    if (page2 === "app") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: FONTS + CSS }),
      pw && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PW, {}),
      authModals,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToastContainer, {}),
      showProfiles && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileManager, { lang, onClose: () => setShowProfiles(false), onSelect: (p) => {
        if (p) {
          setActiveProfile(p);
          setProf({ name: p.name || "", beruf: p.beruf || "", erfahrung: p.erfahrung || "", skills: p.skills || "", sprachen: p.sprachen || "", ausbildung: p.ausbildung || "" });
        }
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatBot, { lang, pro, setPw, navTo, authSession, onAuthOpen: () => {
        setAuthMode("login");
        setShowAuth(true);
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Nav, { dark: true }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-anim", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-hdr dk", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: t.app.title }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t.app.sub }),
          step < 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "asteps", children: t.app.steps.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `as ${i === step ? "on" : ""} ${i < step ? "done" : ""}`, children: [
            i < step ? "\u2713 " : `0${i + 1}. `,
            s
          ] }, i)) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "abody", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsageBar, {}),
          step === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppDemo, { lang }),
          err && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "err", children: [
            "\u26A0\uFE0F ",
            err,
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: { float: "right", background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontWeight: 700 }, onClick: () => setErr(""), children: "\u2715" })
          ] }),
          step === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ct", children: lang === "de" ? "Die Stelle" : lang === "fr" ? "Le poste" : lang === "it" ? "Il posto" : "The position" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cs", children: lang === "de" ? "Wo m\xF6chtest du dich bewerben?" : lang === "fr" ? "O\xF9 souhaitez-vous postuler?" : lang === "it" ? "Dove vuoi candidarti?" : "Where would you like to apply?" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "fg2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: lang === "de" ? "Stellenbezeichnung *" : lang === "fr" ? "Intitul\xE9 *" : lang === "it" ? "Titolo *" : "Job title *" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: job.title, onChange: (e) => uj("title", e.target.value) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: lang === "de" ? "Unternehmen *" : lang === "fr" ? "Entreprise *" : lang === "it" ? "Azienda *" : "Company *" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: job.company, onChange: (e) => uj("company", e.target.value) })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: lang === "de" ? "Branche" : lang === "fr" ? "Secteur" : lang === "it" ? "Settore" : "Industry" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: job.branch, onChange: (e) => uj("branch", e.target.value), children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u2013" }),
                t.app.branches.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: b }, b))
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: lang === "de" ? "Stellenbeschreibung (empfohlen)" : lang === "fr" ? "Description (recommand\xE9)" : lang === "it" ? "Descrizione (consigliato)" : "Job description (recommended)" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: job.desc, onChange: (e) => uj("desc", e.target.value), style: { minHeight: 88 } })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "frow", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd", onClick: () => navTo("landing"), children: t.app.back }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-dk", disabled: !job.title || !job.company, onClick: () => setStep(1), children: t.app.next })
            ] })
          ] }),
          step === 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ct", children: lang === "de" ? "Dein Profil" : lang === "fr" ? "Votre profil" : lang === "it" ? "Il tuo profilo" : "Your profile" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cs", children: lang === "de" ? "Die KI erstellt massgeschneiderte Unterlagen." : lang === "fr" ? "L'IA cr\xE9era des documents sur mesure." : lang === "it" ? "L'IA creer\xE0 documenti su misura." : "The AI will create tailored documents." }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              DocUpload,
              {
                lang,
                file: appDoc,
                onFile: (f) => setAppDoc({ name: f.name, raw: f, extracted: false }),
                onText: (t2, n) => {
                  setAppDoc({ name: n, text: t2, extracted: true });
                  if (t2.length > 20) {
                    const lines = t2.split("\n");
                    const nm = lines.find((l) => l.trim().length > 2 && l.trim().length < 40);
                    if (nm && !prof.name) setProf((p) => ({ ...p, name: nm.trim() }));
                  }
                },
                onClear: () => setAppDoc(null)
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "fg2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: lang === "de" ? "Name *" : lang === "fr" ? "Nom *" : lang === "it" ? "Nome *" : "Name *" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: prof.name, onChange: (e) => up("name", e.target.value) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: lang === "de" ? "Beruf *" : lang === "fr" ? "M\xE9tier *" : lang === "it" ? "Lavoro *" : "Job *" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: prof.beruf, onChange: (e) => up("beruf", e.target.value) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: lang === "de" ? "Erfahrung (Jahre)" : lang === "fr" ? "Exp\xE9rience (ans)" : lang === "it" ? "Esperienza (anni)" : "Experience (years)" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", min: "0", max: "50", value: prof.erfahrung, onChange: (e) => up("erfahrung", e.target.value) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: lang === "de" ? "Sprachen" : lang === "fr" ? "Langues" : lang === "it" ? "Lingue" : "Languages" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: prof.sprachen, onChange: (e) => up("sprachen", e.target.value), placeholder: "Deutsch, English, Fran\xE7ais" })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: lang === "de" ? "Skills & St\xE4rken" : lang === "fr" ? "Comp\xE9tences" : lang === "it" ? "Competenze" : "Skills" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: prof.skills, onChange: (e) => up("skills", e.target.value) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: lang === "de" ? "Ausbildung" : lang === "fr" ? "Formation" : lang === "it" ? "Formazione" : "Education" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: prof.ausbildung, onChange: (e) => up("ausbildung", e.target.value), style: { minHeight: 64 } })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "frow", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd", onClick: () => setStep(0), children: t.app.back }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-dk", disabled: !prof.name || !prof.beruf, onClick: () => setStep(2), children: t.app.next })
            ] })
          ] }),
          step === 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ct", children: lang === "de" ? "Dokument w\xE4hlen" : lang === "fr" ? "Choisir le document" : lang === "it" ? "Scegli il documento" : "Choose document" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }, children: [
              { k: "motivation", ico: "\u270D\uFE0F", t: lang === "de" ? "Motivationsschreiben" : lang === "fr" ? "Lettre de motivation" : lang === "it" ? "Lettera di motivazione" : "Cover letter", d: lang === "de" ? "Pers\xF6nlich, \xFCberzeugend." : lang === "fr" ? "Personnelle, convaincante." : lang === "it" ? "Personale, convincente." : "Personal, convincing." },
              { k: "lebenslauf", ico: "\u{1F4C4}", t: "Curriculum Vitae", d: lang === "de" ? "Schweizer Format." : lang === "fr" ? "Format suisse." : lang === "it" ? "Formato svizzero." : "Swiss format." },
              { k: "beide", ico: "\u{1F680}", t: lang === "de" ? "Beides" : lang === "fr" ? "Les deux" : lang === "it" ? "Entrambi" : "Both", d: lang === "de" ? "Vollst\xE4ndiges Dossier." : lang === "fr" ? "Dossier complet." : lang === "it" ? "Dossier completo." : "Complete dossier.", full: true }
            ].map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: `tool-card ${docType === d.k ? "" : ""}`, style: { cursor: "pointer", border: `1.5px solid ${docType === d.k ? "var(--em)" : "var(--bo)"}`, background: docType === d.k ? "var(--em3)" : "white", gridColumn: d.full ? "1/-1" : "auto" }, onClick: () => setDocType(d.k), children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 22, marginBottom: 6 }, children: d.ico }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontWeight: 600, fontSize: 14, marginBottom: 3 }, children: d.t }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "var(--mu)" }, children: d.d })
            ] }, d.k)) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "frow", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd", onClick: () => setStep(1), children: t.app.back }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em", onClick: generate, disabled: streaming, children: streaming ? t.app.genLoad : t.app.genBtn })
            ] })
          ] }),
          (streaming || step === 3 && (results.motivation || results.lebenslauf)) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", style: { marginTop: streaming ? 18 : 0 }, children: [
            streaming && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14, color: "var(--em)", fontWeight: 600, fontSize: 14 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 9, height: 9, background: "var(--em)", borderRadius: "50%", animation: "blink .8s step-end infinite" } }),
              t.app.stream
            ] }),
            docType === "beide" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "r-tabs", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: `r-tab ${tab === 0 ? "on" : ""}`, onClick: () => {
                setTab(0);
                setEditing(false);
              }, children: lang === "de" ? "\u270D\uFE0F Motivationsschreiben" : lang === "fr" ? "\u270D\uFE0F Lettre" : lang === "it" ? "\u270D\uFE0F Lettera" : "\u270D\uFE0F Cover letter" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: `r-tab ${tab === 1 ? "on" : ""}`, onClick: () => {
                setTab(1);
                setEditing(false);
              }, children: lang === "de" ? "\u{1F4CB} Lebenslauf" : "\u{1F4CB} CV" })
            ] }),
            !streaming && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "r-bar", children: [
              copied && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ok", style: { margin: 0, padding: "4px 11px" }, children: t.app.copied }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "btn b-outd b-sm", onClick: copyDoc, children: [
                "\u{1F4CB} ",
                t.app.copy
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "btn b-outd b-sm", onClick: () => {
                if (!pro) {
                  setPw(true);
                  return;
                }
                setEditing(!editing);
              }, children: [
                editing ? `\u{1F441} ${t.app.prev}` : `\u270F\uFE0F ${t.app.edit}`,
                !pro && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pb", style: { fontSize: 8, marginLeft: 3 }, children: "PRO" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "btn b-outd b-sm", onClick: pdfDoc, children: [
                "\u{1F4E5} PDF",
                !pro && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pb", style: { fontSize: 8, marginLeft: 3 }, children: "PRO" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "btn b-outd b-sm", onClick: () => navTo("checklist"), children: [
                "\u2705 ",
                lang === "de" ? "Checkliste" : lang === "en" ? "Checklist" : lang === "fr" ? "Checklist" : "Checklist"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "btn b-outd b-sm", onClick: () => {
                setStep(2);
                setResults({ motivation: "", lebenslauf: "" });
                setEditing(false);
              }, children: [
                "\u{1F504} ",
                t.app.regen
              ] })
            ] }),
            editing && !streaming ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { className: "r-edit", value: curDoc(), onChange: (e) => setCurDoc(e.target.value) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "r-doc", children: [
              curDoc() || !streaming && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "rgba(11,11,18,.25)", fontSize: 13, fontStyle: "italic" }, children: lang === "de" ? "Noch kein Inhalt \u2013 bitte erneut generieren." : lang === "fr" ? "Pas encore de contenu \u2013 veuillez reg\xE9n\xE9rer." : "No content yet \u2013 please generate again." }),
              streaming && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "cursor" })
            ] })
          ] }),
          step === 3 && !streaming && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", style: { marginTop: 14 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ct", style: { fontSize: 17 }, children: t.email.title }),
              !pro ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockMsg, { sub: t.modal.sub }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "fg2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: t.email.toLbl }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "email", value: eTo, onChange: (e) => setETo(e.target.value), placeholder: "recruiting@firma.ch" })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: t.email.subjLbl }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: eSub, onChange: (e) => setESub(e.target.value) })
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: lang === "de" ? "Optionale Nachricht" : lang === "fr" ? "Message optionnel" : lang === "it" ? "Messaggio opzionale" : "Optional message" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: eMsg, onChange: (e) => setEMsg(e.target.value), placeholder: t.email.msgPh, style: { minHeight: 60 } })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em", disabled: !eTo, onClick: openEmail, children: t.email.btn }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "eml-note", children: [
                  "\u2139\uFE0F ",
                  t.email.note
                ] })
              ] })
            ] }),
            pro ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 14, display: "flex", gap: 9, flexWrap: "wrap" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", style: { flex: 1 }, onClick: () => navTo("ats"), children: t.app.goAts }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", style: { flex: 1 }, onClick: () => navTo("coach"), children: t.app.goCoach }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", style: { flex: 1 }, onClick: () => navTo("jobmatch"), children: lang === "de" ? "\u{1F3AF} Job-Matching \u2192" : lang === "fr" ? "\u{1F3AF} Matching \u2192" : lang === "it" ? "\u{1F3AF} Matching \u2192" : "\u{1F3AF} Job matching \u2192" })
            ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ipw", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: t.app.pw.title }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t.app.pw.sub }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ipw-pr", children: [
                "CHF ",
                C.priceM,
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
                  " / ",
                  lang === "en" ? "mo" : "Mo."
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ipw-fts", children: t.app.pw.feats.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ipw-ft", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--em)" }, children: "\u2713" }),
                f
              ] }, f)) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em", onClick: () => window.open(stripeLink(), "_blank"), children: t.app.pw.btn }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { marginTop: 10, fontSize: 11, color: "rgba(255,255,255,.25)" }, children: t.app.pw.secure })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Footer, {})
      ] })
    ] });
    if (page2 === "ats") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: FONTS + CSS }),
      pw && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PW, {}),
      authModals,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToastContainer, {}),
      showProfiles && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileManager, { lang, onClose: () => setShowProfiles(false), onSelect: (p) => {
        if (p) {
          setActiveProfile(p);
          setProf({ name: p.name || "", beruf: p.beruf || "", erfahrung: p.erfahrung || "", skills: p.skills || "", sprachen: p.sprachen || "", ausbildung: p.ausbildung || "" });
        }
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatBot, { lang, pro, setPw, navTo, authSession, onAuthOpen: () => {
        setAuthMode("login");
        setShowAuth(true);
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Nav, { dark: true }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-anim", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-hdr dk", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: t.ats.title }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t.ats.sub })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "abody", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBanner, { pageId: "ats" }),
          err && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "err", children: [
            "\u26A0\uFE0F ",
            err
          ] }),
          !pro ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "card", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockMsg, { sub: t.coach.lockedSub }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ct", children: t.ats.title }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cs", children: t.ats.sub }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "fg2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: t.ats.jobLbl }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: atsJob, onChange: (e) => setAtsJob(e.target.value) })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", style: { gridColumn: "1/-1" }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: t.ats.jobDescLbl }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: atsDesc, onChange: (e) => setAtsDesc(e.target.value), placeholder: t.ats.jobDescPh, style: { minHeight: 72 } })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", style: { gridColumn: "1/-1" }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: t.ats.cvLbl }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    DocUpload,
                    {
                      lang,
                      file: null,
                      onFile: async (f) => {
                        const txt = await new Promise((res) => {
                          const rd = new FileReader();
                          rd.onload = (e) => res(e.target.result);
                          rd.readAsText(f);
                        });
                        setAtsCv(txt || "");
                      },
                      onText: (t2) => setAtsCv(t2),
                      onClear: () => setAtsCv("")
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: atsCv, onChange: (e) => setAtsCv(e.target.value), placeholder: t.ats.cvPh, style: { minHeight: 100 } })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em", onClick: runATS, disabled: atsLoad || !atsCv || !atsJob, children: atsLoad ? t.ats.loading : t.ats.btn })
            ] }),
            atsRes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 16 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ats-score", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ats-ring", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: "80", height: "80", viewBox: "0 0 80 80", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "40", cy: "40", r: "34", fill: "none", stroke: "rgba(255,255,255,.1)", strokeWidth: "6" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "circle",
                      {
                        cx: "40",
                        cy: "40",
                        r: "34",
                        fill: "none",
                        stroke: atsRes.score >= 70 ? "#10b981" : atsRes.score >= 50 ? "#f59e0b" : "#ef4444",
                        strokeWidth: "6",
                        strokeLinecap: "round",
                        strokeDasharray: `${2 * Math.PI * 34 * atsRes.score / 100} ${2 * Math.PI * 34}`
                      }
                    )
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ats-ring-text", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ats-ring-n", children: atsRes.score }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ats-ring-l", children: "ATS" })
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ats-info", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ats-grade", children: [
                    t.ats.scoreLabel,
                    ": ",
                    atsRes.score,
                    "/100 \u2013 ",
                    atsRes.grade
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ats-sub", children: atsRes.summary })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", style: { marginBottom: 12 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { style: { fontFamily: "var(--hd)", fontSize: 15, fontWeight: 700, marginBottom: 10, color: "var(--em2)" }, children: t.ats.found }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "kw-list", children: (atsRes.keywords_found || []).map((k, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "kw found", children: k }, i)) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", style: { marginBottom: 12 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { style: { fontFamily: "var(--hd)", fontSize: 15, fontWeight: 700, marginBottom: 10, color: "#dc2626" }, children: t.ats.miss }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "kw-list", children: (atsRes.keywords_missing || []).map((k, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "kw miss", children: k }, i)) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { style: { fontFamily: "var(--hd)", fontSize: 15, fontWeight: 700, marginBottom: 14 }, children: t.ats.tips }),
                (atsRes.tips || []).map((tip, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--bos)" }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 24, height: 24, background: "var(--em3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--em2)", flexShrink: 0 }, children: i + 1 }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 13, color: "var(--mu)", lineHeight: 1.7, paddingTop: 2 }, children: tip })
                ] }, i))
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 14, display: "flex", gap: 9, flexWrap: "wrap" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-dk", style: { flex: 1 }, onClick: () => navTo("app"), children: lang === "de" ? "\u270D\uFE0F Bewerbung verbessern" : lang === "fr" ? "\u270D\uFE0F Am\xE9liorer candidature" : lang === "it" ? "\u270D\uFE0F Migliorare candidatura" : "\u270D\uFE0F Improve application" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => downloadTxt(`ATS Score: ${atsRes.score}/100 \u2013 ${atsRes.grade}

${atsRes.summary}

Gefundene Keywords: ${(atsRes.keywords_found || []).join(", ")}

Fehlende Keywords: ${(atsRes.keywords_missing || []).join(", ")}

Tipps:
${(atsRes.tips || []).map((t2, i) => `${i + 1}. ${t2}`).join("\n")}`, "ats"), children: "\u{1F4C4} TXT" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => downloadHtmlAsPdf(`ATS Score: ${atsRes.score}/100 \u2013 ${atsRes.grade}

${atsRes.summary}

Gefundene Keywords: ${(atsRes.keywords_found || []).join(", ")}

Fehlende Keywords: ${(atsRes.keywords_missing || []).join(", ")}

Tipps:
${(atsRes.tips || []).map((t2, i) => `${i + 1}. ${t2}`).join("\n")}`, "ats"), children: "\u{1F4D5} PDF" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => downloadAsWord(`ATS Score: ${atsRes.score}/100 \u2013 ${atsRes.grade}

${atsRes.summary}

Gefundene Keywords: ${(atsRes.keywords_found || []).join(", ")}

Fehlende Keywords: ${(atsRes.keywords_missing || []).join(", ")}

Tipps:
${(atsRes.tips || []).map((t2, i) => `${i + 1}. ${t2}`).join("\n")}`, "ats"), children: "\u{1F4D8} Word" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => downloadAsExcel([[atsRes.score + "/100", atsRes.grade, atsRes.summary, (atsRes.keywords_found || []).join(", "), (atsRes.keywords_missing || []).join(", ")]], ["Score", "Bewertung", "Zusammenfassung", "Keywords gefunden", "Keywords fehlen"], "ATS-Check", "ats"), children: "\u{1F4CA} Excel" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => dlPptxFromText(`ATS Score: ${atsRes.score}/100 \u2013 ${atsRes.grade}

${atsRes.summary}

Tipps:
${(atsRes.tips || []).map((t2, i) => `${i + 1}. ${t2}`).join("\n")}`, "ATS-Check", "ats"), children: "\u{1F4FD}\uFE0F PPTX" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => {
                  setAtsRes(null);
                  setAtsCv("");
                  setAtsJob("");
                }, children: "\u{1F504}" })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Footer, {})
      ] })
    ] });
    if (page2 === "zeugnis") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: FONTS + CSS }),
      pw && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PW, {}),
      authModals,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToastContainer, {}),
      showProfiles && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileManager, { lang, onClose: () => setShowProfiles(false), onSelect: (p) => {
        if (p) {
          setActiveProfile(p);
          setProf({ name: p.name || "", beruf: p.beruf || "", erfahrung: p.erfahrung || "", skills: p.skills || "", sprachen: p.sprachen || "", ausbildung: p.ausbildung || "" });
        }
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatBot, { lang, pro, setPw, navTo, authSession, onAuthOpen: () => {
        setAuthMode("login");
        setShowAuth(true);
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Nav, { dark: true }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-anim", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-hdr am", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: t.zeugnis.title }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t.zeugnis.sub })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "abody", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBanner, { pageId: "zeugnis" }),
          err && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "err", children: [
            "\u26A0\uFE0F ",
            err
          ] }),
          !pro ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "card", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockMsg, { sub: t.coach.lockedSub }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ct", children: t.zeugnis.title }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cs", children: t.zeugnis.sub }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                DocUpload,
                {
                  lang,
                  file: null,
                  onFile: async (f) => {
                    const txt = await new Promise((res) => {
                      const rd = new FileReader();
                      rd.onload = (e) => res(e.target.result);
                      rd.readAsText(f);
                    });
                    setZText(txt || "");
                  },
                  onText: (t2) => setZText(t2),
                  onClear: () => setZText("")
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: t.zeugnis.textLbl }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: zText, onChange: (e) => setZText(e.target.value), placeholder: t.zeugnis.textPh, style: { minHeight: 120 } })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em", onClick: runZeugnis, disabled: zLoad || !zText.trim(), children: zLoad ? t.zeugnis.loading : t.zeugnis.btn })
            ] }),
            zRes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 16 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "card", style: { marginBottom: 12 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `z-grade ${zRes.grade}`, children: zRes.grade }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontFamily: "var(--hd)", fontSize: 20, fontWeight: 800, marginBottom: 4 }, children: [
                    t.zeugnis.overall,
                    ": ",
                    zRes.grade_text
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 13, color: "var(--mu)", lineHeight: 1.65 }, children: zRes.overall })
                ] })
              ] }) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", style: { marginBottom: 12 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { style: { fontFamily: "var(--hd)", fontSize: 15, fontWeight: 700, marginBottom: 14 }, children: t.zeugnis.phrases }),
                (zRes.phrases || []).map((ph, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "z-item", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `z-grade ${ph.rating}`, style: { fontSize: 14, width: 36, height: 36 }, children: ph.rating }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "z-content", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "z-phrase", children: [
                      "\xAB",
                      ph.original,
                      "\xBB"
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "z-meaning", children: [
                      "\u{1F4A1} ",
                      ph.decoded
                    ] })
                  ] })
                ] }, i))
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { style: { fontFamily: "var(--hd)", fontSize: 15, fontWeight: 700, marginBottom: 14 }, children: t.zeugnis.tips }),
                (zRes.tips || []).map((tip, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--bos)", fontSize: 13, color: "var(--mu)", lineHeight: 1.65 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--am)", flexShrink: 0 }, children: "\u2192" }),
                  tip
                ] }, i))
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 7, marginTop: 12, flexWrap: "wrap" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => downloadTxt(`Zeugnis-Analyse

Bewertung: ${zRes.grade} \u2013 ${zRes.grade_text}
${zRes.overall}

Phrasen:
${(zRes.phrases || []).map((p) => `${p.rating}: \xAB${p.original}\xBB \u2192 ${p.decoded}`).join("\n")}

Tipps:
${(zRes.tips || []).map((t2, i) => `${i + 1}. ${t2}`).join("\n")}`, "zeugnis"), children: "\u{1F4C4} TXT" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => downloadHtmlAsPdf(`Zeugnis-Analyse

Bewertung: ${zRes.grade} \u2013 ${zRes.grade_text}
${zRes.overall}

Phrasen:
${(zRes.phrases || []).map((p) => `${p.rating}: \xAB${p.original}\xBB \u2192 ${p.decoded}`).join("\n")}

Tipps:
${(zRes.tips || []).map((t2, i) => `${i + 1}. ${t2}`).join("\n")}`, "zeugnis"), children: "\u{1F4D5} PDF" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => downloadAsWord(`Zeugnis-Analyse

Bewertung: ${zRes.grade} \u2013 ${zRes.grade_text}
${zRes.overall}

Phrasen:
${(zRes.phrases || []).map((p) => `${p.rating}: \xAB${p.original}\xBB \u2192 ${p.decoded}`).join("\n")}

Tipps:
${(zRes.tips || []).map((t2, i) => `${i + 1}. ${t2}`).join("\n")}`, "zeugnis"), children: "\u{1F4D8} Word" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => downloadAsExcel((zRes.phrases || []).map((p) => [p.rating, p.original, p.decoded]), ["Bewertung", "Original-Phrase", "Bedeutung"], "Zeugnis-Analyse", "zeugnis"), children: "\u{1F4CA} Excel" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => dlPptxFromText(`Zeugnis-Analyse

Bewertung: ${zRes.grade} \u2013 ${zRes.grade_text}

${zRes.overall}

Tipps:
${(zRes.tips || []).map((t2, i) => `${i + 1}. ${t2}`).join("\n")}`, "Zeugnis-Analyse", "zeugnis"), children: "\u{1F4FD}\uFE0F PPTX" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "btn b-outd b-sm", onClick: () => {
                  setZRes(null);
                  setZText("");
                }, children: [
                  "\u{1F504} ",
                  lang === "de" ? "Neues Zeugnis" : lang === "fr" ? "Nouveau certificat" : lang === "it" ? "Nuovo certificato" : "New reference"
                ] })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Footer, {})
      ] })
    ] });
    if (page2 === "jobmatch") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: FONTS + CSS }),
      pw && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PW, {}),
      authModals,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToastContainer, {}),
      showProfiles && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileManager, { lang, onClose: () => setShowProfiles(false), onSelect: (p) => {
        if (p) {
          setActiveProfile(p);
          setProf({ name: p.name || "", beruf: p.beruf || "", erfahrung: p.erfahrung || "", skills: p.skills || "", sprachen: p.sprachen || "", ausbildung: p.ausbildung || "" });
        }
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatBot, { lang, pro, setPw, navTo, authSession, onAuthOpen: () => {
        setAuthMode("login");
        setShowAuth(true);
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Nav, { dark: true }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-anim", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-hdr vi", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: t.jobmatch.title }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t.jobmatch.sub })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "abody", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBanner, { pageId: "jobmatch" }),
          err && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "err", children: [
            "\u26A0\uFE0F ",
            err
          ] }),
          !pro ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "card", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockMsg, { sub: t.coach.lockedSub }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ct", children: t.jobmatch.title }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cs", children: t.jobmatch.sub }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: t.jobmatch.skillsLbl }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: jmSkills || prof.skills, onChange: (e) => setJmSkills(e.target.value), placeholder: t.jobmatch.skillsPh, style: { minHeight: 100 } })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "fg2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: t.jobmatch.eduLbl }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: jmEdu || prof.ausbildung, onChange: (e) => setJmEdu(e.target.value), placeholder: t.jobmatch.eduPh })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: t.jobmatch.prefLbl }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: jmPref, onChange: (e) => setJmPref(e.target.value), placeholder: t.jobmatch.prefPh })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em", onClick: runJM, disabled: jmLoad || !jmSkills && !prof.skills, children: jmLoad ? t.jobmatch.loading : t.jobmatch.btn })
            ] }),
            jmRes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 16 }, children: [
              (jmRes.matches || []).map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "jm-result", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "jm-top", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "jm-rank", children: [
                    "#",
                    m.rank
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "jm-info", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "jm-title", children: m.title }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 12, color: "var(--mu)" }, children: [
                      m.industry,
                      " ",
                      m.salary && `\xB7 ${m.salary}`
                    ] })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "jm-bar-wrap", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "jm-pct", children: [
                      m.fit,
                      "%"
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "jm-bar", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "jm-bar-fi", style: { width: `${m.fit}%` } }) })
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "jm-body", children: [
                  m.description,
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "jm-chips", children: (m.skills_match || []).map((s, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "jm-chip", children: [
                    "\u2713 ",
                    s
                  ] }, j)) })
                ] })
              ] }, i)),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 14, display: "flex", gap: 9, flexWrap: "wrap" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em", style: { flex: 1 }, onClick: () => navTo("app"), children: lang === "de" ? "\u270D\uFE0F Jetzt bewerben \u2192" : lang === "fr" ? "\u270D\uFE0F Postuler \u2192" : lang === "it" ? "\u270D\uFE0F Candidarsi \u2192" : "\u270D\uFE0F Apply now \u2192" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => {
                  const t2 = (jmRes.matches || []).map((m) => `#${m.rank} ${m.title} (${m.fit}% Fit)
${m.description}`).join("\n\n");
                  downloadHtmlAsPdf(t2, "jobmatch");
                }, children: "\u{1F4D5} PDF" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => {
                  const t2 = (jmRes.matches || []).map((m) => `#${m.rank} ${m.title} (${m.fit}% Fit)
${m.description}`).join("\n\n");
                  downloadAsWord(t2, "jobmatch");
                }, children: "\u{1F4D8} Word" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => {
                  const rows = (jmRes.matches || []).map((m) => [m.rank, m.title, m.fit + "%", m.industry || "", m.salary || ""]);
                  downloadAsExcel(rows, ["Rang", "Job", "Fit", "Branche", "Gehalt"], "Job-Matching", "jobmatch");
                }, children: "\u{1F4CA} Excel" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => {
                  const t2 = (jmRes.matches || []).map((m) => `#${m.rank} ${m.title} (${m.fit}% Fit)
${m.description}`).join("\n\n");
                  dlPptxFromText(t2, "Job-Matching", "jobmatch");
                }, children: "\u{1F4FD}\uFE0F PPTX" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => setJmRes(null), children: "\u{1F504}" })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Footer, {})
      ] })
    ] });
    if (page2 === "linkedin") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: FONTS + CSS }),
      pw && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PW, {}),
      authModals,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToastContainer, {}),
      showProfiles && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileManager, { lang, onClose: () => setShowProfiles(false), onSelect: (p) => {
        if (p) {
          setActiveProfile(p);
          setProf({ name: p.name || "", beruf: p.beruf || "", erfahrung: p.erfahrung || "", skills: p.skills || "", sprachen: p.sprachen || "", ausbildung: p.ausbildung || "" });
        }
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatBot, { lang, pro, setPw, navTo, authSession, onAuthOpen: () => {
        setAuthMode("login");
        setShowAuth(true);
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Nav, { dark: true }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-anim", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-hdr bl", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: t.linkedin.title }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t.linkedin.sub })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "abody", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBanner, { pageId: "linkedin" }),
          err && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "err", children: [
            "\u26A0\uFE0F ",
            err
          ] }),
          !pro ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "card", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockMsg, { sub: t.coach.lockedSub }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ct", children: t.linkedin.title }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cs", children: t.linkedin.sub }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                DocUpload,
                {
                  lang,
                  file: null,
                  onFile: async (f) => {
                    const txt = await new Promise((res) => {
                      const rd = new FileReader();
                      rd.onload = (e) => res(e.target.result);
                      rd.readAsText(f);
                    });
                    setLiData((p) => ({ ...p, text: txt || "" }));
                  },
                  onText: (t2) => setLiData((p) => ({ ...p, text: t2 })),
                  onClear: () => setLiData((p) => ({ ...p, text: "" }))
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: t.linkedin.analyzeLabel }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: liData.text, onChange: (e) => setLiData((d) => ({ ...d, text: e.target.value })), placeholder: t.linkedin.analyzePh, style: { minHeight: 80 } })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "fg2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: t.linkedin.roleLbl }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: liData.role, onChange: (e) => setLiData((d) => ({ ...d, role: e.target.value })), placeholder: t.linkedin.rolePh })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: t.linkedin.achLbl }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: liData.ach, onChange: (e) => setLiData((d) => ({ ...d, ach: e.target.value })), placeholder: t.linkedin.achPh })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-bl", onClick: runLI, disabled: liLoad, children: liLoad ? t.linkedin.load : t.linkedin.btn })
            ] }),
            liRes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "li-res", style: { marginTop: 14 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", { children: [
                  "\u{1F535} ",
                  t.linkedin.resH
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 16, fontWeight: 600, color: "#0a66c2" }, children: liRes.headline }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "btn b-outd b-sm", style: { marginTop: 10 }, onClick: () => navigator.clipboard.writeText(liRes.headline), children: [
                  "\u{1F4CB} ",
                  t.linkedin.copy
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "li-res", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", { children: [
                  "\u{1F4DD} ",
                  t.linkedin.resA
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 14, lineHeight: 1.8, color: "var(--ink)", whiteSpace: "pre-wrap" }, children: liRes.about }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "btn b-outd b-sm", style: { marginTop: 10 }, onClick: () => navigator.clipboard.writeText(liRes.about), children: [
                  "\u{1F4CB} ",
                  t.linkedin.copy
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "li-res", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", { children: [
                  "\u{1F3F7}\uFE0F ",
                  t.linkedin.resS
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "li-skills", children: (liRes.skills || []).map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "li-sk", children: s }, i)) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 7, marginTop: 14, flexWrap: "wrap" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => downloadTxt(`${liRes.headline}

${liRes.about}

Skills: ${(liRes.skills || []).join(", ")}`, "linkedin"), children: "\u{1F4C4} TXT" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => downloadHtmlAsPdf(`${liRes.headline}

${liRes.about}

Skills: ${(liRes.skills || []).join(", ")}`, "linkedin"), children: "\u{1F4D5} PDF" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => downloadAsWord(`${liRes.headline}

${liRes.about}

Skills: ${(liRes.skills || []).join(", ")}`, "linkedin"), children: "\u{1F4D8} Word" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => downloadAsExcel([["Headline", liRes.headline], ["Skills", (liRes.skills || []).join(", ")]], ["Feld", "Inhalt"], "LinkedIn", "linkedin"), children: "\u{1F4CA} Excel" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => dlPptxFromText(`${liRes.headline}

${liRes.about}

Skills: ${(liRes.skills || []).join(", ")}`, "LinkedIn Optimierung", "linkedin"), children: "\u{1F4FD}\uFE0F PPTX" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "btn b-outd b-sm", onClick: () => {
                  setLiRes(null);
                }, children: [
                  "\u{1F504} ",
                  lang === "de" ? "Neu" : lang === "fr" ? "Nouveau" : lang === "it" ? "Nuovo" : "New"
                ] })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Footer, {})
      ] })
    ] });
    if (page2 === "checklist") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: FONTS + CSS }),
      pw && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PW, {}),
      authModals,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToastContainer, {}),
      showProfiles && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileManager, { lang, onClose: () => setShowProfiles(false), onSelect: (p) => {
        if (p) {
          setActiveProfile(p);
          setProf({ name: p.name || "", beruf: p.beruf || "", erfahrung: p.erfahrung || "", skills: p.skills || "", sprachen: p.sprachen || "", ausbildung: p.ausbildung || "" });
        }
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Nav, { dark: true }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-hdr dk", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: t.checklist.title }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t.checklist.sub })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "abody", children: !pro ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "card", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockMsg, { sub: t.coach.lockedSub }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        (() => {
          const done = t.checklist.items.filter((i) => ck[i.id]).length, tot = t.checklist.items.length, pct = Math.round(done / tot * 100);
          return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "cl-sb", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 13, fontWeight: 600, marginBottom: 7, color: "var(--em2)" }, children: t.checklist.score(done, tot) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cl-bar", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cl-fi", style: { width: `${pct}%` } }) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "cl-pct", children: [
              pct,
              "%"
            ] })
          ] });
        })(),
        t.checklist.items.every((i) => ck[i.id]) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ok", style: { textAlign: "center", marginBottom: 14 }, children: t.checklist.perfect }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "card", children: t.checklist.items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "cl-row", onClick: () => setCk((c) => ({ ...c, [item.id]: !c[item.id] })), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `cl-box ${ck[item.id] ? "on" : ""}`, children: ck[item.id] && "\u2713" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "cl-text", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h5", { className: ck[item.id] ? "d" : "", children: item.t }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: item.d })
          ] })
        ] }, item.id)) })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Footer, {})
    ] });
    if (page2 === "coach") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: FONTS + CSS }),
      pw && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PW, {}),
      authModals,
      showProfiles && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileManager, { lang, onClose: () => setShowProfiles(false), onSelect: (p) => {
        if (p) {
          setActiveProfile(p);
          setProf({ name: p.name || "", beruf: p.beruf || "", erfahrung: p.erfahrung || "", skills: p.skills || "", sprachen: p.sprachen || "", ausbildung: p.ausbildung || "" });
        }
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatBot, { lang, pro, setPw, navTo, authSession, onAuthOpen: () => {
        setAuthMode("login");
        setShowAuth(true);
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Nav, { dark: true }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-hdr dk", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: t.coach.title }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t.coach.sub })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "abody", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBanner, { pageId: "coach" }),
        err && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "err", children: [
          "\u26A0\uFE0F ",
          err
        ] }),
        !pro ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "card", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockMsg, { sub: t.coach.lockedSub }) }) : !icReady ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ct", children: t.coach.ready }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cs", children: t.coach.readySub }),
          !job.title && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "err", style: { marginBottom: 14 }, children: t.coach.noJob }),
          job.title && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ok", style: { marginBottom: 16 }, children: [
            "\u{1F4BC} ",
            t.coach.qOf(0).replace("0/5", "\u2013"),
            " ",
            job.title,
            job.company ? ` @ ${job.company}` : ""
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "frow", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd", onClick: () => navTo("app"), children: t.app.back }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em", onClick: startIC, disabled: icLoad || !job.title, children: icLoad ? t.coach.prep : t.coach.start })
          ] })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          icScore && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "score-box", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "score-n", children: [
                icScore.score,
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "/100" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "score-bar", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "score-fi", style: { width: `${icScore.score}%` } }) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 16, fontWeight: 700, marginBottom: 9 }, children: t.coach.result }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 13, lineHeight: 1.7, color: "rgba(11,11,18,.7)", marginBottom: 7 }, children: icScore.feedback }),
              icScore.staerken && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 12, color: "var(--em2)", marginBottom: 3 }, children: [
                t.coach.strengths,
                " ",
                icScore.staerken.join(", ")
              ] }),
              icScore.verbesserung && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 12, color: "var(--mu)" }, children: [
                t.coach.tip,
                " ",
                icScore.verbesserung
              ] })
            ] })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ct", style: { fontSize: 17, margin: 0 }, children: t.coach.title }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "var(--mu)", fontWeight: 600 }, children: t.coach.qOf(Math.min(icN, 5)) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "chat", ref: chatRef, children: [
              icMsgs.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `msg ${m.r === "u" ? "u" : ""}`, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `msg-av ${m.r === "ai" ? "ai" : "us"}`, children: m.r === "ai" ? "\u{1F916}" : "\u{1F464}" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "msg-b", children: m.t })
              ] }, i)),
              icLoad && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "msg", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "msg-av ai", children: "\u{1F916}" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "msg-b", style: { color: "var(--mu)" }, children: "\u2026" })
              ] })
            ] }),
            !icScore && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ic-inp", style: { marginTop: 14 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: icIn, onChange: (e) => setIcIn(e.target.value), onKeyDown: (e) => {
                if (e.key === "Enter" && !e.shiftKey && !icLoad) {
                  e.preventDefault();
                  sendIC();
                }
              }, placeholder: t.coach.ph, disabled: icLoad }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em", onClick: sendIC, disabled: icLoad || !icIn.trim(), children: t.coach.send })
            ] }),
            icScore && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-dk b-w", style: { marginTop: 14 }, onClick: () => {
              setIcReady(false);
              setIcScore(null);
              setIcMsgs([]);
              setIcN(0);
            }, children: t.coach.newIC }),
            icScore && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }, children: (() => {
              const txt = `Interview-Coach Ergebnis
Score: ${icScore.score}/100

${icScore.feedback}

St\xE4rken: ${(icScore.staerken || []).join(", ")}
Tipp: ${icScore.verbesserung || ""}

Gespr\xE4chsverlauf:
${icMsgs.map((m) => `${m.r === "u" ? "Du" : "Coach"}: ${m.t}`).join("\n")}`;
              return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => downloadHtmlAsPdf(txt, "coach"), children: "\u{1F4D5} PDF" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => downloadAsWord(txt, "coach"), children: "\u{1F4D8} Word" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => dlExcelFromText(txt, "coach"), children: "\u{1F4CA} Excel" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => dlPptxFromText(txt, "Interview-Coach", "coach"), children: "\u{1F4FD}\uFE0F PPTX" })
              ] });
            })() })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Footer, {})
    ] });
    if (page2 === "excel") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: FONTS + CSS }),
      pw && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PW, {}),
      authModals,
      showProfiles && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileManager, { lang, onClose: () => setShowProfiles(false), onSelect: (p) => {
        if (p) {
          setActiveProfile(p);
          setProf({ name: p.name || "", beruf: p.beruf || "", erfahrung: p.erfahrung || "", skills: p.skills || "", sprachen: p.sprachen || "", ausbildung: p.ausbildung || "" });
        }
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatBot, { lang, pro, setPw, navTo, authSession, onAuthOpen: () => {
        setAuthMode("login");
        setShowAuth(true);
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Nav, { dark: true }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-hdr", style: { background: "linear-gradient(135deg,#166534,#15803d)", padding: "48px 28px 0", textAlign: "center" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { style: { fontFamily: "var(--hd)", fontSize: 32, fontWeight: 800, color: "white", marginBottom: 7, letterSpacing: "-1px" }, children: [
          "\u{1F4CA} ",
          t.nav.excel
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { fontSize: 14, color: "rgba(255,255,255,.4)", paddingBottom: 34 }, children: L("Professionelle Excel-Tabellen mit Formeln \u2013 f\xFCr jeden Bereich.", "Professional Excel spreadsheets with formulas \u2013 for any purpose.", "Tableaux Excel professionnels avec formules \u2013 pour tous.", "Fogli Excel professionali con formule \u2013 per tutti.") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "abody", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBanner, { pageId: "excel" }),
        err && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "err", children: [
          "\u26A0\uFE0F ",
          err
        ] }),
        !pro ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "card", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockMsg, { sub: L("Der Excel-Generator ist in Pro enthalten. CHF 19.90/Monat.", "The Excel generator is included in Pro. CHF 19.90/month.", "Le g\xE9n\xE9rateur Excel est inclus dans Pro. CHF 19.90/mois.", "Il generatore Excel \xE8 incluso in Pro. CHF 19.90/mese.") }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ct", children: [
              "\u{1F4CA} ",
              t.nav.excel
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cs", children: L("Beschreibe deine Aufgabe \u2013 die KI erstellt die perfekte Struktur mit Formeln.", "Describe your task \u2013 AI creates the perfect structure with formulas.", "D\xE9crivez votre t\xE2che \u2013 l'IA cr\xE9e la structure parfaite avec formules.", "Descrivi il tuo compito \u2013 l'IA crea la struttura perfetta con formule.") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }, children: [
              L("Budget-\xDCbersicht Haushalt", "Household budget overview", "Budget m\xE9nage", "Budget domestico"),
              L("Reisekostenabrechnung", "Travel expense report", "Frais de d\xE9placement", "Nota spese viaggio"),
              L("Stundenerfassung / Lohnabrechnung", "Time tracking / Payroll", "Suivi des heures / Paie", "Rilevazione ore / Buste paga"),
              L("Lehrplan-Noten-Tracker", "Grade tracker", "Suivi de notes", "Tracker voti"),
              L("Projektplan mit Meilensteinen", "Project plan with milestones", "Plan de projet", "Piano di progetto"),
              L("Inventarliste Shop", "Shop inventory list", "Liste d'inventaire", "Lista inventario")
            ].map((ex, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", style: { fontSize: 12, padding: "5px 12px" }, onClick: () => setXlTask(ex), children: ex }, i)) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: L("Deine Aufgabe *", "Your task *", "Votre t\xE2che *", "Il tuo compito *") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: xlTask, onChange: (e) => setXlTask(e.target.value), placeholder: L("z.B. Ich brauche eine Haushaltsbuchhaltung mit monatlichen Kategorien, Soll/Ist-Vergleich und Jahressummen.", "e.g. I need a household budget with monthly categories, target/actual comparison and yearly totals.", "ex. J'ai besoin d'un budget m\xE9nage avec cat\xE9gories mensuelles, comparaison pr\xE9vu/r\xE9el et totaux annuels.", "es. Ho bisogno di un budget domestico con categorie mensili, confronto obiettivo/reale e totali annuali."), style: { minHeight: 100 } })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em", onClick: runXL, disabled: xlLoad || !xlTask.trim(), children: xlLoad ? L("Erstelle\u2026", "Creating\u2026", "Cr\xE9ation\u2026", "Creando\u2026") : L("\u{1F4CA} Excel erstellen", "\u{1F4CA} Create Excel", "\u{1F4CA} Cr\xE9er Excel", "\u{1F4CA} Crea Excel") })
          ] }),
          xlRes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 16 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", style: { background: "linear-gradient(135deg,rgba(22,101,52,.04),white)", border: "1.5px solid rgba(22,101,52,.2)", marginBottom: 12 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontFamily: "var(--hd)", fontSize: 22, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 5 }, children: [
                    "\u{1F4CA} ",
                    xlRes.title
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 13, color: "var(--mu)", lineHeight: 1.7 }, children: xlRes.description })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "btn b-em b-sm", onClick: downloadCSV, style: { flexShrink: 0 }, children: [
                  "\u{1F4E5} ",
                  L("CSV herunterladen", "Download CSV", "T\xE9l\xE9charger CSV", "Scarica CSV")
                ] })
              ] }),
              (xlRes.sheets || []).map((sh, si) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginBottom: 16 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontFamily: "var(--hd)", fontSize: 16, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { background: "rgba(22,101,52,.1)", color: "#166534", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }, children: [
                    "\u{1F4CB} ",
                    sh.name
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: "var(--mu)", fontWeight: 400 }, children: sh.description })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { overflowX: "auto", borderRadius: 10, border: "1.5px solid var(--bo)", marginBottom: 12 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { style: { background: "#166534" }, children: (sh.headers || []).map((h, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { style: { padding: "9px 14px", textAlign: "left", color: "white", fontWeight: 700, whiteSpace: "nowrap" }, children: h }, i)) }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [
                    (sh.sample_rows || []).map((row, ri) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { style: { background: ri % 2 === 0 ? "white" : "#f9fafb" }, children: row.map((cell, ci) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: { padding: "8px 14px", borderBottom: "1px solid var(--bos)", color: "var(--ink)" }, children: cell }, ci)) }, ri)),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { style: { background: "#f0fdf4", fontWeight: 700 }, children: (sh.headers || []).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: { padding: "8px 14px", color: "#166534", fontSize: 12 }, children: i === 0 ? L("\u21B3 Formeln", "\u21B3 Formulas", "\u21B3 Formules", "\u21B3 Formule") : "" }, i)) })
                  ] })
                ] }) }),
                sh.formulas?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontWeight: 700, fontSize: 13, marginBottom: 8, color: "#166534" }, children: [
                    "\u{1F4D0} ",
                    L("Enthaltene Formeln", "Included formulas", "Formules incluses", "Formule incluse")
                  ] }),
                  sh.formulas.map((f, fi) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--bos)", alignItems: "flex-start" }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { background: "#dcfce7", color: "#166534", padding: "3px 10px", borderRadius: 6, fontFamily: "monospace", fontSize: 12, flexShrink: 0, fontWeight: 700 }, children: f.cell }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1 }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "monospace", fontSize: 12, color: "#166534", marginBottom: 3, background: "#f0fdf4", padding: "3px 8px", borderRadius: 4, display: "inline-block" }, children: f.formula }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "var(--mu)", marginTop: 3 }, children: f.description })
                    ] })
                  ] }, fi))
                ] }),
                sh.formatting_tips?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 10, padding: "10px 14px", background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.2)", borderRadius: 10 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 6 }, children: [
                    "\u{1F3A8} ",
                    L("Formatierungstipps", "Formatting tips", "Conseils de mise en forme", "Consigli di formattazione")
                  ] }),
                  sh.formatting_tips.map((tip, ti) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 12, color: "rgba(11,11,18,.6)", lineHeight: 1.6, paddingLeft: 4 }, children: [
                    "\u2192 ",
                    tip
                  ] }, ti))
                ] })
              ] }, si))
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontFamily: "var(--hd)", fontSize: 16, fontWeight: 700, marginBottom: 12 }, children: [
                "\u{1F4A1} ",
                L("Excel-Profi-Tipps", "Excel pro tips", "Conseils Excel pro", "Consigli Excel pro")
              ] }),
              (xlRes.excel_tips || []).map((tip, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 9, padding: "9px 0", borderBottom: "1px solid var(--bos)", fontSize: 13, color: "var(--mu)", lineHeight: 1.65 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "#166534", flexShrink: 0 }, children: "\u2713" }),
                tip
              ] }, i)),
              xlRes.download_note && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { marginTop: 14, padding: "10px 14px", background: "var(--em3)", border: "1px solid rgba(16,185,129,.2)", borderRadius: 10, fontSize: 13, color: "var(--em2)" }, children: xlRes.download_note })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 12, display: "flex", gap: 9, flexWrap: "wrap" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "btn b-em b-sm", style: { background: "#217346" }, onClick: downloadXLSX, children: [
                "\u{1F4CA} ",
                L("Excel (.xlsx)", "Excel (.xlsx)", "Excel (.xlsx)", "Excel (.xlsx)")
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: downloadCSV, children: "\u{1F4C4} CSV" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => {
                const sh = xlRes.sheets?.[0];
                const txt = sh ? `${xlRes.title || ""}

${[sh.headers, ...sh.sample_rows || []].map((r) => r.join(" | ")).join("\n")}` : "";
                downloadHtmlAsPdf(txt, "excel");
              }, children: "\u{1F4D5} PDF" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => {
                const sh = xlRes.sheets?.[0];
                const txt = sh ? `${xlRes.title || ""}

${[sh.headers, ...sh.sample_rows || []].map((r) => r.join(" | ")).join("\n")}` : "";
                downloadAsWord(txt, "excel");
              }, children: "\u{1F4D8} Word" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => {
                const sh = xlRes.sheets?.[0];
                const txt = sh ? `${xlRes.title || ""}

${[sh.headers, ...sh.sample_rows || []].map((r) => r.join(" | ")).join("\n")}` : "";
                dlPptxFromText(txt, xlRes.title || "Excel", "excel");
              }, children: "\u{1F4FD}\uFE0F PPTX" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => {
                setXlRes(null);
                setXlTask("");
              }, children: "\u{1F504}" })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Footer, {})
    ] });
    if (page2 === "pptx") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: FONTS + CSS }),
      pw && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PW, {}),
      authModals,
      showProfiles && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileManager, { lang, onClose: () => setShowProfiles(false), onSelect: (p) => {
        if (p) {
          setActiveProfile(p);
          setProf({ name: p.name || "", beruf: p.beruf || "", erfahrung: p.erfahrung || "", skills: p.skills || "", sprachen: p.sprachen || "", ausbildung: p.ausbildung || "" });
        }
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatBot, { lang, pro, setPw, navTo, authSession, onAuthOpen: () => {
        setAuthMode("login");
        setShowAuth(true);
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Nav, { dark: true }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-hdr", style: { background: "linear-gradient(135deg,#1e3a5f,#2563eb)", padding: "48px 28px 0", textAlign: "center" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { style: { fontFamily: "var(--hd)", fontSize: 32, fontWeight: 800, color: "white", marginBottom: 7, letterSpacing: "-1px" }, children: [
          "\u{1F4FD}\uFE0F ",
          t.nav.pptx
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { fontSize: 14, color: "rgba(255,255,255,.4)", paddingBottom: 34 }, children: L("Professionelle Pr\xE4sentationen f\xFCr Schule, Uni & Arbeit.", "Professional presentations for school, uni & work.", "Pr\xE9sentations professionnelles pour \xE9cole, universit\xE9 & travail.", "Presentazioni professionali per scuola, universit\xE0 e lavoro.") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "abody", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolBanner, { pageId: "pptx" }),
        err && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "err", children: [
          "\u26A0\uFE0F ",
          err
        ] }),
        !pro ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "card", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockMsg, { sub: L("Der PowerPoint-Maker ist in Pro enthalten. CHF 19.90/Monat.", "The PowerPoint maker is included in Pro. CHF 19.90/month.", "Le cr\xE9ateur PowerPoint est inclus dans Pro. CHF 19.90/mois.", "Il creatore PowerPoint \xE8 incluso in Pro. CHF 19.90/mese.") }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ct", children: [
              "\u{1F4FD}\uFE0F ",
              t.nav.pptx
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cs", children: L("Beschreibe dein Thema \u2013 die KI erstellt eine komplette Pr\xE4sentation mit Inhalt, Struktur und Sprechernotizen.", "Describe your topic \u2013 AI creates a complete presentation with content, structure and speaker notes.", "D\xE9crivez votre sujet \u2013 l'IA cr\xE9e une pr\xE9sentation compl\xE8te.", "Descrivi il tuo argomento \u2013 l'IA crea una presentazione completa.") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }, children: [
              L("Mein Ferienbericht", "My holiday report", "Mon rapport de vacances", "Il mio rapporto di vacanza"),
              L("Klimawandel f\xFCr die Schule", "Climate change for school", "Changement climatique scolaire", "Cambiamento climatico"),
              L("Businessplan f\xFCr Startup", "Business plan for startup", "Business plan startup", "Business plan startup"),
              L("Jahresbericht Verein", "Annual association report", "Rapport annuel association", "Relazione annuale associazione"),
              L("Produktpr\xE4sentation", "Product presentation", "Pr\xE9sentation produit", "Presentazione prodotto")
            ].map((ex, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", style: { fontSize: 12, padding: "5px 12px" }, onClick: () => setPpTask(ex), children: ex }, i)) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: L("Thema / Aufgabe *", "Topic / Task *", "Sujet / T\xE2che *", "Argomento / Compito *") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: ppTask, onChange: (e) => setPpTask(e.target.value), placeholder: L("z.B. Eine Pr\xE4sentation \xFCber die Vor- und Nachteile von KI f\xFCr Gymnasiasten, Dauer ca. 10 Minuten.", "e.g. A presentation about the pros and cons of AI for high school students, duration approx. 10 minutes.", "ex. Une pr\xE9sentation sur les avantages et inconv\xE9nients de l'IA pour lyc\xE9ens, dur\xE9e environ 10 minutes.", "es. Una presentazione sui pro e contro dell'IA per studenti, durata circa 10 minuti."), style: { minHeight: 90 } })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "fg2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: L("Anzahl Folien", "Number of slides", "Nombre de diapositives", "Numero di diapositive") }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { value: ppSlides, onChange: (e) => setPpSlides(e.target.value), children: [5, 6, 8, 10, 12, 15].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", { value: n, children: [
                  n,
                  " ",
                  L("Folien", "slides", "diapositives", "diapositive")
                ] }, n)) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "field", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: L("Ton / Stil", "Tone / Style", "Ton / Style", "Tono / Stile") }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: ppTone, onChange: (e) => setPpTone(e.target.value), children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "professional", children: L("Professionell", "Professional", "Professionnel", "Professionale") }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "academic", children: L("Akademisch / Schularbeit", "Academic / School", "Acad\xE9mique", "Accademico") }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "creative", children: L("Kreativ & Modern", "Creative & Modern", "Cr\xE9atif & Moderne", "Creativo & Moderno") }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "minimal", children: L("Minimalistisch", "Minimalist", "Minimaliste", "Minimalista") }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "startup", children: L("Startup / Pitch", "Startup / Pitch", "Startup / Pitch", "Startup / Pitch") })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-bl", onClick: runPP, disabled: ppLoad || !ppTask.trim(), children: ppLoad ? L("Erstelle Folien\u2026", "Creating slides\u2026", "Cr\xE9ation des diapositives\u2026", "Creando diapositive\u2026") : L("\u{1F4FD}\uFE0F Pr\xE4sentation erstellen", "\u{1F4FD}\uFE0F Create presentation", "\u{1F4FD}\uFE0F Cr\xE9er pr\xE9sentation", "\u{1F4FD}\uFE0F Crea presentazione") })
          ] }),
          ppRes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 16 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "linear-gradient(135deg,#1e3a5f,#2563eb)", borderRadius: "var(--r2)", padding: 28, marginBottom: 14, color: "white", textAlign: "center" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 26, fontWeight: 800, letterSpacing: "-1px", marginBottom: 6 }, children: ppRes.title }),
              ppRes.subtitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 15, color: "rgba(255,255,255,.6)", marginBottom: 10 }, children: ppRes.subtitle }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }, children: [
                ppRes.theme_suggestion && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 12, background: "rgba(255,255,255,.1)", padding: "4px 12px", borderRadius: 20 }, children: [
                  "\u{1F3A8} ",
                  ppRes.theme_suggestion
                ] }),
                ppRes.estimated_duration && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 12, background: "rgba(255,255,255,.1)", padding: "4px 12px", borderRadius: 20 }, children: [
                  "\u23F1\uFE0F ",
                  ppRes.estimated_duration
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 12, background: "rgba(255,255,255,.1)", padding: "4px 12px", borderRadius: 20 }, children: [
                  "\u{1F4CB} ",
                  (ppRes.slides || []).length,
                  " ",
                  L("Folien", "slides", "diapositives", "diapositive")
                ] })
              ] })
            ] }),
            (ppRes.slides || []).map((slide, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "white", border: "1.5px solid var(--bo)", borderRadius: "var(--r2)", marginBottom: 10, overflow: "hidden" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: i === 0 ? "linear-gradient(135deg,#1e3a5f,#2563eb)" : "var(--dk3)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 32, height: 32, background: "rgba(255,255,255,.12)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--hd)", fontSize: 13, fontWeight: 800, color: "white", flexShrink: 0 }, children: slide.slide }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 15, fontWeight: 700, color: "white" }, children: slide.title }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 2 }, children: slide.layout })
                ] }),
                slide.design_tip && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 11, color: "rgba(255,255,255,.4)", maxWidth: 160, textAlign: "right", lineHeight: 1.4 }, children: [
                  "\u{1F4A1} ",
                  slide.design_tip
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "16px 20px" }, children: [
                (slide.content || []).map((item, ci) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 10, padding: "6px 0", borderBottom: ci < slide.content.length - 1 ? "1px solid var(--bos)" : "none", fontSize: 13, color: "var(--ink)", lineHeight: 1.6 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--bl)", flexShrink: 0, fontWeight: 700 }, children: "\u2192" }),
                  item
                ] }, ci)),
                slide.speaker_note && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 10, padding: "9px 13px", background: "#fffbf0", border: "1px solid rgba(245,158,11,.2)", borderRadius: 8, fontSize: 12, color: "#92400e", display: "flex", gap: 7, lineHeight: 1.6 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { flexShrink: 0 }, children: "\u{1F3A4}" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: slide.speaker_note })
                ] })
              ] })
            ] }, i)),
            ppRes.design_tips?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", style: { marginBottom: 12 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontFamily: "var(--hd)", fontSize: 15, fontWeight: 700, marginBottom: 12 }, children: [
                "\u{1F3A8} ",
                L("Design-Tipps f\xFCr PowerPoint", "Design tips for PowerPoint", "Conseils design PowerPoint", "Consigli design PowerPoint")
              ] }),
              ppRes.design_tips.map((tip, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 9, padding: "8px 0", borderBottom: "1px solid var(--bos)", fontSize: 13, color: "var(--mu)", lineHeight: 1.65 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--bl)", flexShrink: 0 }, children: "\u2192" }),
                tip
              ] }, i))
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontFamily: "var(--hd)", fontSize: 15, fontWeight: 700, marginBottom: 10 }, children: [
                "\u{1F4CB} ",
                L("Gesamten Inhalt kopieren", "Copy all content", "Copier tout le contenu", "Copia tutto il contenuto")
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "r-doc", style: { maxHeight: 240, fontSize: 12 }, children: `${ppRes.title}
${ppRes.subtitle || ""}

` + (ppRes.slides || []).map((s) => `FOLIE ${s.slide}: ${s.title}
${(s.content || []).map((c) => `\u2022 ${c}`).join("\n")}
[Sprechernotiz: ${s.speaker_note || ""}]`).join("\n\n") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 10, display: "flex", gap: 9, flexWrap: "wrap" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "btn b-outd b-sm", onClick: () => {
                  const txt = `${ppRes.title}
${ppRes.subtitle || ""}

` + (ppRes.slides || []).map((s) => `FOLIE ${s.slide}: ${s.title}
${(s.content || []).map((c) => `\u2022 ${c}`).join("\n")}
[Sprechernotiz: ${s.speaker_note || ""}]`).join("\n\n");
                  navigator.clipboard.writeText(txt);
                }, children: [
                  "\u{1F4CB} ",
                  L("Kopieren", "Copy", "Copier", "Copia")
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => {
                  const txt = `${ppRes.title}
${ppRes.subtitle || ""}

` + (ppRes.slides || []).map((s) => `FOLIE ${s.slide}: ${s.title}
${(s.content || []).map((c) => `\u2022 ${c}`).join("\n")}
[Sprechernotiz: ${s.speaker_note || ""}]`).join("\n\n");
                  downloadTxt(txt, "pptx");
                }, children: "\u{1F4C4} TXT" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => {
                  const txt = `${ppRes.title}
${ppRes.subtitle || ""}

` + (ppRes.slides || []).map((s) => `FOLIE ${s.slide}: ${s.title}
${(s.content || []).map((c) => `\u2022 ${c}`).join("\n")}
[Sprechernotiz: ${s.speaker_note || ""}]`).join("\n\n");
                  downloadHtmlAsPdf(txt, "pptx");
                }, children: "\u{1F4D5} PDF" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => {
                  const txt = `${ppRes.title}
${ppRes.subtitle || ""}

` + (ppRes.slides || []).map((s) => `FOLIE ${s.slide}: ${s.title}
${(s.content || []).map((c) => `\u2022 ${c}`).join("\n")}
[Sprechernotiz: ${s.speaker_note || ""}]`).join("\n\n");
                  downloadAsWord(txt, "pptx");
                }, children: "\u{1F4D8} Word" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-outd b-sm", onClick: () => downloadAsExcel((ppRes.slides || []).map((s) => [s.slide, s.title, (s.content || []).join("; "), s.speaker_note || ""]), ["Folie", "Titel", "Inhalt", "Sprechernotiz"], "Pr\xE4sentation", "pptx"), children: "\u{1F4CA} Excel" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn b-em b-sm", style: { fontWeight: 700 }, onClick: () => downloadAsPptx(ppRes.slides, ppRes.title, "pptx"), children: "\u{1F4FD}\uFE0F .pptx" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "btn b-outd b-sm", onClick: () => {
                  setPpRes(null);
                  setPpTask("");
                }, children: [
                  "\u{1F504} ",
                  L("Neu", "New", "Nouveau", "Nuovo")
                ] })
              ] })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Footer, {})
    ] });
    if (page2 === "chat") {
      let ChatPage2 = function() {
        const [chatMsgs, setChatMsgs] = useState([{ r: "ai", t: L2(
          "Hallo! Ich bin Stella \u{1F44B} Deine KI-Karriere-Assistentin von Stellify. Wie kann ich dir heute helfen?",
          "Hello! I'm Stella \u{1F44B} Your AI career assistant from Stellify. How can I help you today?",
          "Bonjour! Je suis Stella \u{1F44B} Comment puis-je vous aider aujourd'hui?",
          "Ciao! Sono Stella \u{1F44B} Come posso aiutarti oggi?"
        ) }]);
        const [chatIn, setChatIn] = useState("");
        const [chatLoad, setChatLoad] = useState(false);
        const [localUsage, setLocalUsage] = useState(chatUsage2);
        const endRef = useRef(null);
        useEffect(() => {
          endRef.current?.scrollIntoView({ behavior: "smooth" });
        }, [chatMsgs]);
        const localCanChat = pro || localUsage < C.CHAT_FREE_LIMIT;
        const renderMsg2 = (text) => {
          let remaining = text;
          Object.keys(TOOL_MAP2).forEach((key) => {
            remaining = remaining.replace(new RegExp(key, "gi"), `<TOOL:${TOOL_MAP2[key][0]}:${key}>`);
          });
          return remaining.split(/(<TOOL:[^>]+>)/).map((seg, i) => {
            const m = seg.match(/^<TOOL:([^:]+):(.+)>$/);
            if (m) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                onClick: () => navTo(m[1]),
                style: { display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(16,185,129,.15)", border: "1px solid rgba(16,185,129,.3)", borderRadius: 8, padding: "2px 10px", fontSize: 13, fontWeight: 700, color: "var(--em)", cursor: "pointer", margin: "2px 3px" },
                children: [
                  m[2],
                  " \u2192"
                ]
              },
              i
            );
            return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: seg }, i);
          });
        };
        const send2 = async (msg) => {
          const txt = (msg || chatIn).trim();
          if (!txt || chatLoad || !localCanChat) return;
          setChatIn("");
          const newMsgs = [...chatMsgs, { r: "u", t: txt }];
          setChatMsgs(newMsgs);
          setChatLoad(true);
          if (!pro) {
            incChat();
            setLocalUsage((u) => u + 1);
          }
          try {
            const apiMsgs = [];
            for (const m of newMsgs) {
              const role = m.r === "u" ? "user" : "assistant";
              if (apiMsgs.length > 0 && apiMsgs[apiMsgs.length - 1].role === role) continue;
              apiMsgs.push({ role, content: m.t });
            }
            while (apiMsgs.length && apiMsgs[0].role !== "user") apiMsgs.shift();
            const finalMsgs = apiMsgs.slice(-10);
            const msgsWithSystem = [{ role: "system", content: SYSTEM2 }, ...finalMsgs];
            const res = await fetch(GROQ_URL, {
              method: "POST",
              headers: groqHeaders(),
              body: JSON.stringify({
                model: C.MODEL_FAST,
                max_tokens: 600,
                messages: msgsWithSystem
              })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
            const reply = data.choices?.[0]?.message?.content || "Bitte nochmals versuchen.";
            setChatMsgs((m) => [...m, { r: "ai", t: reply }]);
          } catch (e) {
            setChatMsgs((m) => [...m, { r: "ai", t: `\u26A0\uFE0F ${e.message}` }]);
          } finally {
            setChatLoad(false);
          }
        };
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: FONTS + CSS }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { height: "100dvh", display: "flex", flexDirection: "column", background: "var(--dk)", overflow: "hidden" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,.07)", background: "var(--dk2)", flexShrink: 0 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => navTo("landing"), style: { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "7px 14px", fontSize: 13, color: "rgba(255,255,255,.6)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }, children: [
                "\u2190 ",
                L2("Zur\xFCck", "Back", "Retour", "Indietro")
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 32, height: 32, background: "var(--em)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }, children: "\u{1F916}" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontFamily: "var(--hd)", fontSize: 15, fontWeight: 800, color: "white" }, children: "Stella" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 11, color: "rgba(255,255,255,.35)" }, children: [
                    L2("KI-Karriere-Assistentin", "AI Career Assistant", "Assistante carri\xE8re IA", "Assistente carriera IA"),
                    " \xB7 ",
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "#22c55e" }, children: "\u25CF" }),
                    " Online"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: pro ? "var(--em)" : "rgba(255,255,255,.35)", fontWeight: 600, minWidth: 60, textAlign: "right" }, children: pro ? "Pro \u221E" : `${Math.max(0, C.CHAT_FREE_LIMIT - localUsage)}/${C.CHAT_FREE_LIMIT}` })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, overflowY: "auto", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 780, width: "100%", margin: "0 auto", boxSizing: "border-box" }, children: [
              chatMsgs.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 12, flexDirection: m.r === "u" ? "row-reverse" : "row", alignItems: "flex-end" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 34, height: 34, borderRadius: "50%", background: m.r === "u" ? "rgba(16,185,129,.25)" : "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }, children: m.r === "u" ? "\u{1F464}" : "\u{1F916}" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { maxWidth: "72%", background: m.r === "u" ? "rgba(16,185,129,.18)" : "rgba(255,255,255,.05)", border: `1px solid ${m.r === "u" ? "rgba(16,185,129,.3)" : "rgba(255,255,255,.08)"}`, borderRadius: m.r === "u" ? "20px 20px 4px 20px" : "20px 20px 20px 4px", padding: "12px 16px", fontSize: 14, color: m.r === "u" ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.82)", lineHeight: 1.7 }, children: m.r === "ai" ? renderMsg2(m.t) : m.t })
              ] }, i)),
              chatLoad && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 12, alignItems: "flex-end" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }, children: "\u{1F916}" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "20px 20px 20px 4px", padding: "14px 18px", display: "flex", gap: 5, alignItems: "center" }, children: [0, 1, 2].map((j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: 7, height: 7, borderRadius: "50%", background: "var(--em)", animation: `pulse 1.2s ease-in-out ${j * 0.2}s infinite` } }, j)) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: endRef })
            ] }),
            !localCanChat && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "rgba(245,158,11,.1)", borderTop: "1px solid rgba(245,158,11,.2)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 13, color: "rgba(245,158,11,.8)" }, children: L2("10 Gratis-Nachrichten aufgebraucht", "10 free messages used", "10 messages gratuits utilis\xE9s", "10 messaggi gratuiti esauriti") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => setPw(true), style: { background: "var(--am)", color: "white", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }, children: L2("Pro freischalten \u2192", "Unlock Pro \u2192", "Activer Pro \u2192", "Sblocca Pro \u2192") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { borderTop: "1px solid rgba(255,255,255,.07)", padding: "16px 20px", background: "var(--dk2)", flexShrink: 0 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { maxWidth: 780, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-end" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { flex: 1, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "flex-end", gap: 10 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "textarea",
                  {
                    value: chatIn,
                    onChange: (e) => setChatIn(e.target.value),
                    onKeyDown: (e) => {
                      if (e.key === "Enter" && !e.shiftKey && !chatLoad && localCanChat) {
                        e.preventDefault();
                        send2();
                      }
                    },
                    placeholder: localCanChat ? L2("Schreib eine Nachricht\u2026", "Write a message\u2026", "\xC9crire un message\u2026", "Scrivi un messaggio\u2026") : L2("Pro freischalten f\xFCr mehr Nachrichten\u2026", "Unlock Pro for more messages\u2026", "Activer Pro pour plus\u2026", "Sblocca Pro per di pi\xF9\u2026"),
                    disabled: !localCanChat || chatLoad,
                    style: { flex: 1, background: "none", border: "none", color: "white", fontSize: 14, resize: "none", outline: "none", minHeight: 24, maxHeight: 120, lineHeight: 1.6 },
                    rows: 1
                  }
                ) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    onClick: () => send2(),
                    disabled: !chatIn.trim() || chatLoad || !localCanChat,
                    style: { width: 46, height: 46, borderRadius: 14, background: chatIn.trim() && localCanChat ? "var(--em)" : "rgba(255,255,255,.08)", border: "none", cursor: chatIn.trim() && localCanChat ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, transition: "all .2s" },
                    children: chatLoad ? "\u23F3" : "\u27A4"
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { textAlign: "center", fontSize: 11, color: "rgba(255,255,255,.18)", marginTop: 8 }, children: L2("Stella kann Fehler machen. Wichtige Entscheidungen bitte selbst pr\xFCfen.", "Stella can make mistakes. Please verify important decisions yourself.", "Stella peut faire des erreurs. V\xE9rifiez les d\xE9cisions importantes.", "Stella pu\xF2 fare errori. Verifica le decisioni importanti.") })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `@keyframes pulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.3);opacity:1}}` })
        ] });
      };
      var ChatPage = ChatPage2;
      const chatUsage2 = getChatCount();
      const isLoggedIn2 = !!authSession;
      const canChat2 = isLoggedIn2 && (pro || chatUsage2 < C.CHAT_FREE_LIMIT);
      const remaining2 = pro ? "\u221E" : Math.max(0, C.CHAT_FREE_LIMIT - chatUsage2);
      const L2 = (d, e, f, i) => ({ de: d, en: e, fr: f, it: i })[lang] || d;
      const SYSTEM2 = `Du bist Stella, die KI-Karriere-Assistentin von Stellify \u2013 dem Schweizer AI Career Copilot. Du hast tiefes Wissen \xFCber alle Aspekte der Karriere, Bewerbung, Arbeitsmarkt Schweiz und Produktivit\xE4t.

DEIN WISSEN & F\xC4HIGKEITEN:

Bewerbungen & Lebenslauf:
- Du kennst den Aufbau perfekter Schweizer Motivationsschreiben (Einleitung mit Bezug zur Stelle, Hauptteil mit konkreten Erfolgen und Zahlen, Schluss mit Mehrwert)
- Du weisst, dass Schweizer Lebensl\xE4ufe meist 1-2 Seiten, tabellarisch, mit Foto sind
- Du kennst ATS-Systeme (Applicant Tracking Systems) und wie man Keywords optimiert
- Du kannst konkrete Formulierungen, Phrasen und ganze Abschnitte schreiben

Schweizer Arbeitsmarkt:
- Du kennst die wichtigsten Branchen: Finanz (UBS, CS/UBS, Zurich Insurance), Pharma (Novartis, Roche, Lonza), MEM (ABB, Georg Fischer), IT, Tourismus
- Du kennst typische Schweizer Geh\xE4lter nach Branche und Erfahrung
- Du weisst \xFCber das Schweizer Arbeitsrecht: K\xFCndigungsfristen (1 Monat Probezeit, dann 1-3 Monate je nach Dienstjahren), Sperrfristen, Zeugnisnoten (sehr gut/gut/gen\xFCgend im Zeugnis-Code)
- Du kennst RAV, ALV, Quellensteuer, 13. Monatslohn, Ferienanspruch (mind. 4 Wochen)

Gehaltsverhandlung:
- Du kennst Gehaltsrahmen f\xFCr g\xE4ngige Berufe in der Schweiz
- Du kennst Taktiken: Anker setzen, Gegenargumente entkr\xE4ften, nicht zuerst eine Zahl nennen
- Du kannst konkrete S\xE4tze f\xFCr Gehaltsverhandlungen liefern

LinkedIn & Personal Branding:
- Du kennst den LinkedIn-Algorithmus und was Recruiter sehen wollen
- Du kannst Headlines, About-Sections und Erfahrungsbeschreibungen optimieren

Interview-Vorbereitung:
- Du kennst die STAR-Methode (Situation, Task, Action, Result)
- Du kennst typische Schweizer Interview-Fragen und wie man antwortet
- Du kannst St\xE4rken/Schw\xE4chen, Gehaltsvorstellungen, Motivationsfragen coachen

Schweizer Arbeitszeugnisse:
- Du kennst den Zeugnis-Code: "stets zu unserer vollsten Zufriedenheit" = sehr gut, "zu unserer vollen Zufriedenheit" = gut, "zu unserer Zufriedenheit" = gen\xFCgend
- Du kannst versteckte negative Formulierungen erkennen

Karriereplanung:
- Du kannst 30-60-90-Tage-Pl\xE4ne erstellen
- Du kennst Netzwerk-Strategien, Cold-Outreach-Taktiken
- Du kennst Weiterbildungsm\xF6glichkeiten in der Schweiz (CAS, MAS, MBA, Berufspr\xFCfung, eidg. Diplom)

Schule & Ausbildung:
- Du kennst das Schweizer Bildungssystem (Berufslehre EFZ/EBA, Gymnasium, FH, Uni, ETH)
- Du kannst Lehrstellen-Bewerbungen und Motivationsschreiben f\xFCr Jugendliche schreiben
- Du kannst Lernpl\xE4ne, Zusammenfassungen und Pr\xFCfungsstrategien erstellen

Produktivit\xE4t & Kommunikation:
- Du kannst professionelle E-Mails, Meeting-Protokolle schreiben
- Du \xFCbersetzt Texte professionell in DE/EN/FR/IT
- Du erstellst strukturierte Excel-Vorlagen und PowerPoint-Pr\xE4sentationen

STELLIFY-TOOLS (empfehle passende Tools mit ihrem Namen):
\u270D\uFE0F Bewerbungen, \u{1F4BC} LinkedIn Optimierung, \u{1F916} ATS-Simulation, \u{1F4DC} Zeugnis-Analyse, \u{1F3AF} Job-Matching, \u{1F3A4} Interview-Coach, \u{1F4CA} Excel-Generator, \u{1F4FD}\uFE0F PowerPoint-Maker, \u{1F4B0} Gehaltsverhandlung, \u{1F91D} Networking-Nachricht, \u{1F4E4} K\xFCndigung schreiben, \u{1F5D3}\uFE0F 30-60-90-Tage-Plan, \u{1F3C6} Referenzschreiben, \u{1F4DA} Lernplan, \u{1F4DD} Zusammenfassung, \u{1F393} Lehrstelle, \u2709\uFE0F E-Mail, \u{1F4CB} Protokoll, \u{1F30D} \xDCbersetzer

VERHALTEN:
- Antworte in der Sprache des Nutzers (Standard: Deutsch/Schweizerdeutsch-freundlich)
- Gib konkrete, umsetzbare Antworten \u2013 nicht nur allgemeine Tipps
- Wenn du etwas schreibst (z.B. ein Satz f\xFCr eine Bewerbung), schreib ihn direkt aus
- Empfehle passende Stellify-Tools wenn sinnvoll, aber zwinge nichts auf
- Sei warm, direkt, professionell \u2013 wie ein erfahrener Karriere-Coach
- Preis: Gratis (1\xD7 Bewerbung/Monat) oder Pro CHF 19.90/Mo`;
      const TOOL_MAP2 = {
        "bewerbung": ["app"],
        "bewerbungen": ["app"],
        "linkedin": ["linkedin"],
        "ats": ["ats"],
        "zeugnis": ["zeugnis"],
        "job-matching": ["jobmatch"],
        "interview": ["coach"],
        "excel": ["excel"],
        "powerpoint": ["pptx"],
        "gehalt": ["gehalt"],
        "networking": ["networking"],
        "k\xFCndigung": ["kuendigung"],
        "30-60-90": ["plan306090"],
        "referenz": ["referenz"],
        "lernplan": ["lernplan"],
        "lehrstelle": ["lehrstelle"],
        "e-mail": ["email"],
        "protokoll": ["protokoll"],
        "\xFCbersetzer": ["uebersetzer"],
        "gehaltsrechner": ["gehaltsrechner"],
        "lohn": ["gehaltsrechner"],
        "salary": ["gehaltsrechner"],
        "tracker": ["tracker"],
        "tracking": ["tracker"],
        "verfolgen": ["tracker"],
        "lipost": ["lipost"],
        "linkedin post": ["lipost"],
        "post": ["lipost"]
      };
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatPage2, {});
    }
    const LD = () => (/* @__PURE__ */ new Date()).toLocaleDateString("de-CH", { month: "long", year: "numeric" });
    const LS = ({ ch }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: FONTS + CSS }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Nav, {}),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "legal", children: ch }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Footer, {})
    ] });
    if (page2 === "agb") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LS, { ch: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "AGB / CGV / CGC / T&C" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "legal-d", children: [
        "Stand: ",
        LD(),
        " \xB7 ",
        C.domain
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "1. Geltungsbereich" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
        C.name,
        " (",
        C.domain,
        ") wird betrieben von ",
        C.owner,
        ", ",
        C.address,
        ". Mit der Nutzung akzeptierst du diese AGB."
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "2. Leistungen" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
        C.name,
        " ist ein KI-gest\xFCtzter All-in-One Career & Produktivit\xE4ts-Copilot mit 20+ Tools, u.a.: Bewerbungsgenerator, LinkedIn-Optimierung, ATS-Simulation, Zeugnis-Analyse, Job-Matching, Interview-Coach, Excel-Generator, PowerPoint-Maker, Gehaltsverhandlungs-Coach, Networking-Nachrichten, K\xFCndigung, 30-60-90-Tage-Plan, Referenzschreiben, Lehrstellen-Bewerbung, Lernplan, Zusammenfassung, E-Mail-Assistent, Meeting-Protokoll, \xDCbersetzer. Es wird kein Erfolg garantiert."
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "3. Abonnement & Zahlung" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Gratis: 1 Bewerbungsgenerierung/Monat. Pro: CHF 19.90/Monat (monatlich k\xFCndbar) oder CHF 14.90/Monat (j\xE4hrlich = CHF 226.80/Jahr). Pro enth\xE4lt: Unbegrenzte Bewerbungen, LinkedIn-Optimierung, ATS-Simulation, Zeugnis-Analyse, Job-Matching, Interview-Coach, Excel-Generator, PowerPoint-Maker. Zahlung via Stripe (Twint, Visa, Mastercard, Amex, PayPal, Apple Pay, Google Pay, SEPA, Klarna). Automatische Verl\xE4ngerung. K\xFCndigung jederzeit per E-Mail." }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "4. Haftung" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Keine Haftung f\xFCr Qualit\xE4t generierter Inhalte, Vollst\xE4ndigkeit der KI-Analysen oder indirekte Sch\xE4den." }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "5. Recht & Gerichtsstand" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
        "Schweizer Recht. Gerichtsstand: Z\xFCrich. Kontakt: ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: `mailto:${C.email}`, children: C.email })
      ] })
    ] }) });
    if (page2 === "datenschutz") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LS, { ch: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Datenschutz / Privacy" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "legal-d", children: [
        "DSG (CH) \xB7 DSGVO (EU) \xB7 Stand: ",
        LD()
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Verantwortlich" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
        C.owner,
        ", ",
        C.address,
        " \xB7 ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: `mailto:${C.email}`, children: C.email })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Erhobene Daten" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Eingabedaten (Lebenslauf, Zeugnisse, Profildaten) \u2013 werden nicht dauerhaft gespeichert" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Nutzungsstatistiken: IP-Adresse (anonymisiert, 30 Tage)" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Zahlungsdaten: ausschliesslich via Stripe (PCI-DSS-konform)" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "KI-Verarbeitung" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Eingaben werden zur Verarbeitung an Anthropic (anthropic.com) \xFCbermittelt. Anthropic verarbeitet keine Daten f\xFCr eigene Zwecke." }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Drittanbieter" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Stripe (stripe.com/privacy) \xB7 Anthropic (anthropic.com/privacy)" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Deine Rechte" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
        "Auskunft, Berichtigung, L\xF6schung jederzeit: ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: `mailto:${C.email}`, children: C.email })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Sicherheit" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "HTTPS/TLS. Keine Marketing-Cookies. Kein Verkauf von Daten." })
    ] }) });
    if (page2 === "impressum") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LS, { ch: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Impressum" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "legal-d", children: "Art. 12 DSG" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Betreiber" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "JTSP" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
        C.address,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: `mailto:${C.email}`, children: C.email }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
        C.domain
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Erfinder & Gr\xFCnder" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "JTSP" }),
        " \u2013 Erfinder und Gr\xFCnder von ",
        C.name,
        ". Idee, Konzept und Vision f\xFCr den ersten vollst\xE4ndigen AI Career & Produktivit\xE4ts-Copilot der Schweiz."
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Datenschutzbeauftragter" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
        "Bei Datenschutzanfragen: ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: `mailto:${C.email}`, children: C.email })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Haftungsausschluss" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Schweizer Recht \xB7 Gerichtsstand: Z\xFCrich" })
    ] }) });
    if (page2 === "tracker") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: FONTS + CSS }),
      pw && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PW, {}),
      authModals,
      showProfiles && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileManager, { lang, onClose: () => setShowProfiles(false), onSelect: (p) => {
        if (p) {
          setActiveProfile(p);
          setProf({ name: p.name || "", beruf: p.beruf || "", erfahrung: p.erfahrung || "", skills: p.skills || "", sprachen: p.sprachen || "", ausbildung: p.ausbildung || "" });
        }
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatBot, { lang, pro, setPw, navTo, authSession, onAuthOpen: () => {
        setAuthMode("login");
        setShowAuth(true);
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Nav, { dark: true }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BewerbungsTracker, { lang, pro, setPw, navTo }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Footer, {})
    ] });
    const activeTool = GENERIC_TOOLS.find((g) => g.id === page2);
    if (activeTool) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: FONTS + CSS }),
      pw && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PW, {}),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Nav, { dark: true }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GenericToolPage, { tool: activeTool, lang, pro, setPw, setPage, yearly, C, proUsage, setProUsage }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Footer, {})
    ] });
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, {});
  }
  var rootEl = document.getElementById("root");
  if (rootEl) {
    ReactDOM.createRoot(rootEl).render(React.createElement(App));
  }
})();
