var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// index.js
var MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
var PER_IP_DAILY_LIMIT = 15;
var GLOBAL_DAILY_LIMIT = 500;
var MAX_INPUT_CHARS = 2400;
var ALLOWED_KINDS = /* @__PURE__ */ new Set(["bio", "headline", "experience", "project"]);
function reply(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }, headers || {})
  });
}
__name(reply, "reply");
function parseOrigins(env) {
  return new Set(String(env.ALLOWED_ORIGINS || "").split(",").map(function(item) {
    return item.trim();
  }).filter(Boolean));
}
__name(parseOrigins, "parseOrigins");
function cors(request, origins) {
  const origin = request.headers.get("Origin") || "";
  const headers = {
    "vary": "Origin",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization",
    "access-control-max-age": "86400"
  };
  if (origins.has(origin)) headers["access-control-allow-origin"] = origin;
  return headers;
}
__name(cors, "cors");
function clean(value, max) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max || MAX_INPUT_CHARS) : "";
}
__name(clean, "clean");
async function hash(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map(function(n) {
    return n.toString(16).padStart(2, "0");
  }).join("");
}
__name(hash, "hash");
function kindName(kind) {
  return { bio: "professional biography", headline: "professional headline", experience: "work-experience bullet", project: "portfolio project description" }[kind];
}
__name(kindName, "kindName");
function systemPrompt(locale, kind) {
  if (locale === "ar") {
    return "\u0623\u0646\u062A \u0645\u062D\u0631\u0631 \u0645\u0647\u0646\u064A \u0645\u062A\u062E\u0635\u0635 \u0644\u0645\u0646\u0635\u0629 '\u062A\u0642\u062F\u0651\u0645' (Taqdom.me). \u0623\u0639\u062F \u0635\u064A\u0627\u063A\u0629 " + (kind === "bio" ? "\u0627\u0644\u0646\u0628\u0630\u0629 \u0627\u0644\u0645\u0647\u0646\u064A\u0629" : "\u0627\u0644\u0645\u0633\u0645\u0649 \u0627\u0644\u0648\u0638\u064A\u0641\u064A") + " \u0628\u0644\u063A\u0629 \u0639\u0631\u0628\u064A\u0629 \u0641\u0635\u062D\u0649 \u0639\u0635\u0631\u064A\u0629\u060C \u0623\u0646\u064A\u0642\u0629\u060C \u0648\u0627\u062B\u0642\u0629 \u0648\u0628\u0644\u0627\u063A\u0629 \u0637\u0628\u064A\u0639\u064A\u0629 \u062F\u0648\u0646 \u062A\u0643\u0644\u0641 \u0623\u0648 \u0631\u0643\u0627\u0643\u0629. \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0645\u0635\u0637\u0644\u062D\u0627\u062A \u0627\u0644\u0645\u0647\u0646\u064A\u0629 \u0627\u0644\u0645\u0639\u0627\u0635\u0631\u0629 (\u0645\u062B\u0644\u0627\u064B: '\u0645\u0635\u0645\u0645 \u0648\u0627\u062C\u0647\u0627\u062A \u0648\u062A\u062C\u0631\u0628\u0629 \u0645\u0633\u062A\u062E\u062F\u0645' \u0644\u0640 UI/UX Designer\u060C \u0648\u0644\u0627 \u062A\u062A\u0631\u062C\u0645 \u0627\u0644\u0645\u0635\u0637\u0644\u062D\u0627\u062A \u062A\u0631\u062C\u0645\u0629 \u062D\u0631\u0641\u064A\u0629 \u0631\u0643\u064A\u0643\u0629 \u0645\u062B\u0644 '\u0645\u062F\u062E\u0644'). \u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u0627\u0644\u0645\u0635\u0637\u0644\u062D\u0627\u062A \u0627\u0644\u062A\u0642\u0646\u064A\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629 \u0645\u062B\u0644 UI/UX \u0648 Full-Stack \u0648 React \u0648 AI \u0643\u0645\u0627 \u0647\u064A \u0623\u0648 \u062A\u0639\u0631\u064A\u0628\u0647\u0627 \u0627\u0644\u0645\u0623\u0644\u0648\u0641. \u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u0643\u0644 \u0627\u0644\u062D\u0642\u0627\u0626\u0642 \u0648\u0627\u0644\u062E\u0628\u0631\u0627\u062A \u0648\u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u0643\u0645\u0627 \u0647\u064A \u062F\u0648\u0646 \u062A\u062D\u0631\u064A\u0641. \u0623\u0631\u062C\u0639 \u0641\u0642\u0637 \u0627\u0644\u0646\u0635 \u0627\u0644\u0645\u062D\u0633\u0646 \u0645\u0628\u0627\u0634\u0631\u0629 \u0628\u062F\u0648\u0646 \u0645\u0642\u062F\u0645\u0627\u062A\u060C \u0628\u062F\u0648\u0646 \u0639\u0644\u0627\u0645\u0627\u062A \u062A\u0646\u0635\u064A\u0635\u060C \u0648\u0628\u062F\u0648\u0646 \u0643\u0648\u062F \u0645\u0627\u0631\u0643\u062F\u0627\u0648\u0646.";
  }
  return "You are Taqdom Career Editor. Rewrite the supplied " + kindName(kind) + " in clear, natural, globally professional English. Preserve all factual details, names, dates, metrics, qualifications, skills and claims exactly as supplied. Never invent experience, results, employers, degrees or awards. Improve clarity, grammar, and professional impact. Return only the revised text with no quotes, commentary or markdown.";
}
__name(systemPrompt, "systemPrompt");
async function reserveQuota(env, request, kind) {
  if (!env.TAQDOM_DB) throw new Error("D1 binding is missing");
  const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const forwardedIp = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = await hash(forwardedIp + "|" + day + "|taqdom-ai-limit-v1");
  const reservation = await env.TAQDOM_DB.prepare(
    "INSERT INTO ai_requests (ip_hash, purpose) SELECT ?, ? WHERE (SELECT COUNT(*) FROM ai_requests WHERE created_at >= datetime('now', '-24 hours')) < ? AND (SELECT COUNT(*) FROM ai_requests WHERE ip_hash = ? AND date(created_at) = date('now')) < ?"
  ).bind(ipHash, kind, GLOBAL_DAILY_LIMIT, ipHash, PER_IP_DAILY_LIMIT).run();
  const changes = Number(reservation && reservation.meta && reservation.meta.changes || 0);
  if (changes !== 1) {
    const globalCount = await env.TAQDOM_DB.prepare(
      "SELECT COUNT(*) AS total FROM ai_requests WHERE created_at >= datetime('now', '-24 hours')"
    ).first();
    if (Number(globalCount && globalCount.total || 0) >= GLOBAL_DAILY_LIMIT) {
      return { allowed: false, reason: "daily_capacity_reached" };
    }
    return { allowed: false, reason: "daily_limit_reached" };
  }
  const current = await env.TAQDOM_DB.prepare(
    "SELECT COUNT(*) AS total FROM ai_requests WHERE ip_hash = ? AND date(created_at) = date('now')"
  ).bind(ipHash).first();
  await env.TAQDOM_DB.prepare(
    "DELETE FROM ai_requests WHERE created_at < datetime('now', '-3 days')"
  ).run();
  return { allowed: true, used: Number(current && current.total || 1) };
}
__name(reserveQuota, "reserveQuota");
async function improve(request, env, corsHeaders) {
  if (!env.AI || !env.TAQDOM_DB) return reply({ error: "service_not_configured" }, 503, corsHeaders);
  const parsed = await readJson(request, 12e3);
  if (parsed.error) return reply({ error: parsed.error }, parsed.status, corsHeaders);
  const body = parsed.body || {};
  const rawText = body && typeof body.text === "string" ? body.text : "";
  if (rawText.length > MAX_INPUT_CHARS) return reply({ error: "text_too_long", maxCharacters: MAX_INPUT_CHARS }, 400, corsHeaders);
  const text = clean(rawText, MAX_INPUT_CHARS);
  const kind = body && ALLOWED_KINDS.has(body.kind) ? body.kind : "bio";
  const locale = body && body.locale === "ar" ? "ar" : "en";
  if (text.length < 5) return reply({ error: "text_too_short" }, 400, corsHeaders);
  let quota;
  try {
    quota = await reserveQuota(env, request, kind);
  } catch (error) {
    console.error("AI quota check failed", error && error.name || "Error");
    return reply({ error: "quota_service_unavailable" }, 503, corsHeaders);
  }
  if (!quota.allowed) return reply({ error: quota.reason, limit: PER_IP_DAILY_LIMIT }, 429, corsHeaders);
  try {
    const result = await env.AI.run(env.MODEL || MODEL, {
      messages: [
        { role: "system", content: systemPrompt(locale, kind) },
        { role: "user", content: "Text to improve:\n" + text }
      ],
      max_tokens: kind === "bio" ? 450 : 250,
      temperature: 0.3
    });
    const output = clean(result && (result.response || result.result) || "", 3e3);
    if (!output) return reply({ error: "empty_ai_response" }, 502, corsHeaders);
    return reply({ text: output, model: env.MODEL || MODEL, remainingToday: Math.max(0, PER_IP_DAILY_LIMIT - quota.used) }, 200, corsHeaders);
  } catch (error) {
    console.error("Workers AI request failed", error && error.name || "Error");
    return reply({ error: "ai_temporarily_unavailable" }, 502, corsHeaders);
  }
}
__name(improve, "improve");
function isOriginAllowed(origin, origins) {
  return Boolean(origin) && origins.has(origin);
}
__name(isOriginAllowed, "isOriginAllowed");
function encodeB64Url(bytes) {
  return btoa(Array.from(bytes).map(function(b) {
    return String.fromCharCode(b);
  }).join("")).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
__name(encodeB64Url, "encodeB64Url");
function decodeB64Url(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const raw = atob(padded);
  return Uint8Array.from(raw, function(c) {
    return c.charCodeAt(0);
  });
}
__name(decodeB64Url, "decodeB64Url");
function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return encodeB64Url(bytes);
}
__name(randomToken, "randomToken");
async function derivePassword(password, saltText) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: decodeB64Url(saltText), iterations: 1e5, hash: "SHA-256" }, key, 256);
  return encodeB64Url(new Uint8Array(bits));
}
__name(derivePassword, "derivePassword");
function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
__name(constantTimeEqual, "constantTimeEqual");
function sessionCookie(token, maxAge) {
  return "__Host-taqdom_session=" + token + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + maxAge;
}
__name(sessionCookie, "sessionCookie");
function getSessionToken(request) {
  const cookie = request.headers.get("Cookie") || "";
  const found = cookie.split(";").map(function(part) {
    return part.trim();
  }).find(function(part) {
    return part.startsWith("__Host-taqdom_session=");
  });
  return found ? found.slice("__Host-taqdom_session=".length) : "";
}
__name(getSessionToken, "getSessionToken");
function publicUser(row) {
  return { id: row.id, email: row.email, displayName: row.display_name, locale: row.locale, emailVerified: Boolean(row.email_verified), createdAt: row.created_at };
}
__name(publicUser, "publicUser");
async function newSession(env, userId) {
  const token = randomToken();
  const tokenHash = await hash(token);
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 19).replace("T", " ");
  await env.TAQDOM_DB.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)").bind(tokenHash, userId, expires).run();
  await env.TAQDOM_DB.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
  return token;
}
__name(newSession, "newSession");
async function currentUser(request, env) {
  if (!env.TAQDOM_DB) return null;
  const token = getSessionToken(request);
  if (!token || token.length > 200) return null;
  const tokenHash = await hash(token);
  const row = await env.TAQDOM_DB.prepare("SELECT u.id,u.email,u.display_name,u.locale,u.email_verified,u.created_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at > datetime('now')").bind(tokenHash).first();
  if (row) await env.TAQDOM_DB.prepare("UPDATE sessions SET last_seen_at=datetime('now') WHERE token_hash=?").bind(tokenHash).run();
  return row ? { row, tokenHash } : null;
}
__name(currentUser, "currentUser");
async function authAttemptAllowed(env, request, kind, email, limit, windowMinutes) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = await hash("auth|" + kind + "|" + ip + "|" + email + "|taqdom-auth-rate-v1");
  await env.TAQDOM_DB.prepare("INSERT INTO auth_attempts (attempt_key,kind) VALUES (?,?)").bind(key, kind).run();
  const row = await env.TAQDOM_DB.prepare("SELECT COUNT(*) AS total FROM auth_attempts WHERE attempt_key=? AND created_at >= datetime('now', ?)").bind(key, "-" + windowMinutes + " minutes").first();
  await env.TAQDOM_DB.prepare("DELETE FROM auth_attempts WHERE created_at < datetime('now','-2 days')").run();
  return Number(row && row.total || 0) <= limit;
}
__name(authAttemptAllowed, "authAttemptAllowed");
function toSlug(text) {
  return String(text || "").toLowerCase().replace(/[\s_]+/g, "-").replace(/[^\w\u0600-\u06ff\-]+/g, "").replace(/^-+|-+$/g, "").slice(0, 60) || "portfolio";
}
__name(toSlug, "toSlug");
const RESERVED_SUBDOMAINS = new Set(["www","api","app","admin","assets","static","cdn","mail","smtp","ftp","support","help","status","docs","blog","dev","staging","preview","dashboard","auth","login","register","pricing","about","templates","features","contact","privacy","terms","taqdom"]);
__name(RESERVED_SUBDOMAINS, "RESERVED_SUBDOMAINS");
function normalizeSubdomain(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}
__name(normalizeSubdomain, "normalizeSubdomain");
function isValidSubdomain(value) {
  return typeof value === "string" &&
    value.length >= 3 && value.length <= 30 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value) &&
    !RESERVED_SUBDOMAINS.has(value);
}
__name(isValidSubdomain, "isValidSubdomain");
function safeStoredAssetUrl(value) {
  const raw = typeof value === "string" ? value.trim().slice(0, 1000) : "";
  if (!raw) return "";
  if (/^\/api\/media\/[a-f0-9-]{10,100}$/i.test(raw)) return raw;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : "";
  } catch (_) {
    return "";
  }
}
__name(safeStoredAssetUrl, "safeStoredAssetUrl");
function mediaIdFromUrl(value) {
  const match = typeof value === "string" ? value.match(/^\/api\/media\/([a-f0-9-]{10,100})$/i) : null;
  return match ? match[1] : "";
}
__name(mediaIdFromUrl, "mediaIdFromUrl");
async function validateDocumentMedia(env, ownerId, portfolioId, document) {
  const refs = [document.avatarUrl].concat((document.projectDetails || []).map((item) => item && item.imageUrl));
  const ids = [...new Set(refs.map(mediaIdFromUrl).filter(Boolean))];
  if (!ids.length) return document;
  const placeholders = ids.map(() => "?").join(",");
  const result = await env.TAQDOM_DB.prepare(
    "SELECT id, portfolio_id FROM media WHERE owner_id=? AND id IN (" + placeholders + ")"
  ).bind(ownerId, ...ids).all();
  const allowed = new Set((result.results || []).filter((row) => !row.portfolio_id || row.portfolio_id === portfolioId).map((row) => row.id));
  if (document.avatarUrl && mediaIdFromUrl(document.avatarUrl) && !allowed.has(mediaIdFromUrl(document.avatarUrl))) document.avatarUrl = "";
  document.projectDetails = (document.projectDetails || []).map((item) => {
    if (!item || !mediaIdFromUrl(item.imageUrl) || allowed.has(mediaIdFromUrl(item.imageUrl))) return item;
    return { ...item, imageUrl: "" };
  });
  return document;
}
__name(validateDocumentMedia, "validateDocumentMedia");
async function syncPortfolioMedia(env, ownerId, portfolioId, document) {
  const ids = [...new Set([document.avatarUrl, ...(document.projectDetails || []).map((item) => item && item.imageUrl)].map(mediaIdFromUrl).filter(Boolean))];
  const updates = ids.map((id) => env.TAQDOM_DB.prepare(
    "UPDATE media SET portfolio_id=? WHERE id=? AND owner_id=? AND (portfolio_id IS NULL OR portfolio_id=?)"
  ).bind(portfolioId, id, ownerId, portfolioId));
  const cleanup = ids.length
    ? env.TAQDOM_DB.prepare("DELETE FROM media WHERE owner_id=? AND portfolio_id=? AND id NOT IN (" + ids.map(() => "?").join(",") + ")").bind(ownerId, portfolioId, ...ids)
    : env.TAQDOM_DB.prepare("DELETE FROM media WHERE owner_id=? AND portfolio_id=?").bind(ownerId, portfolioId);
  await env.TAQDOM_DB.batch([...updates, cleanup]);
}
__name(syncPortfolioMedia, "syncPortfolioMedia");
function sanitizeDocument(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const str = /* @__PURE__ */ __name(function(value, max) {
    return typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max) : "";
  }, "str");
  const visible = input.visible && typeof input.visible === "object" ? input.visible : {};
  const projects = Array.isArray(input.projects) ? input.projects.filter(function(p) {
    return typeof p === "string";
  }).slice(0, 24).map(function(p) {
    return str(p, 160);
  }) : [];
  const projectDetails = Array.isArray(input.projectDetails) ? input.projectDetails.filter(function(item) {
    return item && typeof item === "object" && !Array.isArray(item);
  }).slice(0, 24).map(function(item) {
    const detail = item || {};
    const rawUrl = str(detail.url, 500);
    let url = "";
    try {
      const parsedUrl = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : "https://" + rawUrl);
      if ((parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:") && parsedUrl.hostname.includes(".")) url = parsedUrl.href;
    } catch (_) {
    }
    const rawImageUrl = str(detail.imageUrl, 1e3);
    const imageUrl = /^\/api\/media\/[a-f0-9-]{10,100}$/i.test(rawImageUrl) ? rawImageUrl : /^https:\/\//i.test(rawImageUrl) ? rawImageUrl : "";
    return {
      description: str(detail.description, 600),
      url,
      imageUrl
    };
  }) : [];
  const skills = Array.isArray(input.skills) ? input.skills.filter(function(item) {
    return typeof item === "string";
  }).slice(0, 30).map(function(item) {
    return str(item, 80);
  }).filter(Boolean) : [];
  const experience = Array.isArray(input.experience) ? input.experience.filter(function(item) {
    return item && typeof item === "object" && !Array.isArray(item);
  }).slice(0, 12).map(function(item) {
    const entry = item || {};
    return {
      role: str(entry.role, 160),
      company: str(entry.company, 160),
      period: str(entry.period, 100),
      description: str(entry.description, 600)
    };
  }).filter(function(item) { return item.role || item.company || item.description; }) : [];
  const socialLinks = Array.isArray(input.socialLinks) ? input.socialLinks.filter(function(item) {
    return item && typeof item === "object" && !Array.isArray(item);
  }).slice(0, 12).map(function(item) {
    const entry = item || {};
    const label = str(entry.label, 60);
    const rawUrl = str(entry.url, 500);
    let url = "";
    try {
      const parsed = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : "https://" + rawUrl);
      if ((parsed.protocol === "https:" || parsed.protocol === "http:") && parsed.hostname.includes(".")) url = parsed.href;
    } catch (_) {}
    return { label, url };
  }).filter(function(item) { return item.label && item.url; }) : [];
  const accent = typeof input.accent === "string" && /^#[0-9a-f]{6}$/i.test(input.accent) ? input.accent : "#b7ff64";
  const allowedBackgroundStyles = ["signature", "aurora", "glass", "orbit", "calm"];
  const backgroundStyle = allowedBackgroundStyles.includes(input.backgroundStyle) ? input.backgroundStyle : "signature";
  const allowedSectionOrder = ["about", "skills", "experience", "projects", "socials", "contact"];
  const requestedSectionOrder = Array.isArray(input.sectionOrder) ? input.sectionOrder.filter(function(key) {
    return allowedSectionOrder.includes(key);
  }) : [];
  const sectionOrder = [...new Set(requestedSectionOrder)].concat(allowedSectionOrder.filter(function(key) {
    return !requestedSectionOrder.includes(key);
  }));
  return {
    name: str(input.name, 120),
    role: str(input.role, 180),
    bio: str(input.bio, 2400),
    email: str(input.email, 254),
    location: str(input.location, 160),
    accent,
    avatarUrl: safeStoredAssetUrl(input.avatarUrl),
    backgroundStyle,
    templateId: str(input.templateId, 100) || "design-0",
    projects,
    projectDetails,
    skills,
    experience,
    socialLinks,
    sectionOrder,
    visible: {
      about: visible.about !== false,
      skills: visible.skills !== false,
      experience: visible.experience !== false,
      projects: visible.projects !== false,
      socials: visible.socials !== false,
      contact: visible.contact !== false
    }
  };
}
__name(sanitizeDocument, "sanitizeDocument");
async function readJson(request, maxBytes) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes) return { error: "request_too_large", status: 413 };
  const reader = request.body && request.body.getReader();
  if (!reader) return { error: "invalid_json", status: 400 };
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      total += item.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { error: "request_too_large", status: 413 };
      }
      chunks.push(item.value);
    }
  } catch (_) {
    return { error: "invalid_json", status: 400 };
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return { body: JSON.parse(new TextDecoder().decode(bytes)) }; }
  catch (_) { return { error: "invalid_json", status: 400 }; }
}
__name(readJson, "readJson");
function validRasterImage(base64, mimeType) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) return false;
  if (typeof base64 !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) return false;
  let raw; try { raw = atob(base64); } catch (_) { return false; }
  if (raw.length < 12 || raw.length > 1100000) return false;
  const b = (i) => raw.charCodeAt(i);
  if (mimeType === "image/jpeg") return b(0) === 255 && b(1) === 216 && b(2) === 255 && b(raw.length - 2) === 255 && b(raw.length - 1) === 217;
  if (mimeType === "image/png") return b(0) === 137 && b(1) === 80 && b(2) === 78 && b(3) === 71 && b(4) === 13 && b(5) === 10 && b(6) === 26 && b(7) === 10 && raw.slice(-8, -4) === "IEND";
  const size = b(4) + (b(5) << 8) + (b(6) << 16) + (b(7) << 24);
  return raw.slice(0,4) === "RIFF" && raw.slice(8,12) === "WEBP" && size === raw.length - 8;
}
__name(validRasterImage, "validRasterImage");
async function routeAuthApi(request, env, corsHeaders, origins) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  if (path.startsWith("/api/portfolios/public/") && method === "GET") {
    if (!env.TAQDOM_DB) return reply({ error: "service_not_configured" }, 503, corsHeaders);
    const identifier = decodeURIComponent(path.slice("/api/portfolios/public/".length));
    const row = await env.TAQDOM_DB.prepare(
      "SELECT id, title, template_id, slug, status, revision, document_json, updated_at FROM portfolios WHERE (id=? OR slug=? COLLATE NOCASE) AND status='published'"
    ).bind(identifier, identifier).first();
    if (!row) return reply({ error: "not_found" }, 404, corsHeaders);
    let doc = {};
    try {
      doc = JSON.parse(row.document_json);
    } catch (_) {
    }
    return reply({
      portfolio: {
        id: row.id,
        title: row.title,
        templateId: row.template_id,
        slug: row.slug || row.id,
        status: row.status,
        revision: Number(row.revision || 1),
        document: doc,
        updatedAt: row.updated_at
      }
    }, 200, corsHeaders);
  }
  if (path.startsWith("/api/media/") && method === "GET") {
    if (!env.TAQDOM_DB) return new Response("Service Not Configured", { status: 503 });
    const id = path.slice("/api/media/".length);
    const row = await env.TAQDOM_DB.prepare("SELECT mime_type, data_base64 FROM media WHERE id=?").bind(id).first();
    if (!row) return new Response("Not Found", { status: 404 });
    if (!["image/jpeg", "image/png", "image/webp"].includes(row.mime_type)) return new Response("Unsupported Media Type", { status: 415, headers: { "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
    try {
      const raw = atob(row.data_base64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": row.mime_type,
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'; sandbox",
          "access-control-allow-origin": "*"
        }
      });
    } catch (_) {
      return new Response("Corrupted Image", { status: 500 });
    }
  }
  if (path === "/api/media" && method === "POST") {
    if (!env.TAQDOM_DB) return reply({ error: "service_not_configured" }, 503, corsHeaders);
    const session = await currentUser(request, env);
    if (!session) return reply({ error: "not_authenticated" }, 401, corsHeaders);
    if (request.headers.get("Origin") && !isOriginAllowed(request.headers.get("Origin") || "", origins)) return reply({ error: "origin_not_allowed" }, 403, corsHeaders);
    const parsed = await readJson(request, 15e5);
    if (parsed.error) return reply({ error: parsed.error }, parsed.status, corsHeaders);
    const body = parsed.body || {};
    const requestedPortfolioId = typeof body.portfolioId === "string" ? body.portfolioId.trim() : "";
    let portfolioId = "";
    if (requestedPortfolioId) {
      const ownerCheck = await env.TAQDOM_DB.prepare("SELECT id FROM portfolios WHERE id=? AND owner_id=?").bind(requestedPortfolioId, session.row.id).first();
      if (!ownerCheck) return reply({ error: "not_found" }, 404, corsHeaders);
      portfolioId = requestedPortfolioId;
    }
    const mediaCount = await env.TAQDOM_DB.prepare("SELECT COUNT(*) AS total FROM media WHERE owner_id=?").bind(session.row.id).first();
    if (Number(mediaCount && mediaCount.total || 0) >= 60) return reply({ error: "media_limit_reached", limit: 60 }, 429, corsHeaders);
    let mimeType = "";
    let b64 = "";
    if (typeof body.data === "string" && body.data.startsWith("data:image/")) {
      const parts = body.data.match(/^data:(image\/[a-zA-Z0-9\+\-]+);base64,(.+)$/);
      if (parts) {
        mimeType = parts[1];
        b64 = parts[2];
      }
    } else if (typeof body.base64 === "string" && body.base64.length > 0) {
      b64 = body.base64;
      mimeType = typeof body.mimeType === "string" && body.mimeType.startsWith("image/") ? body.mimeType : "image/jpeg";
    }
    if (!b64 || !mimeType) return reply({ error: "invalid_image" }, 400, corsHeaders);
    if (b64.length > 15e5) return reply({ error: "image_too_large" }, 413, corsHeaders);
    if (!validRasterImage(b64, mimeType)) return reply({ error: "unsupported_or_invalid_image" }, 400, corsHeaders);
    const id = crypto.randomUUID();
    await env.TAQDOM_DB.prepare(
      "INSERT INTO media (id, owner_id, portfolio_id, mime_type, data_base64) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, session.row.id, portfolioId || null, mimeType, b64).run();
    return reply({ ok: true, id, url: "/api/media/" + id }, 201, corsHeaders);
  }
  if (path.startsWith("/api/media/") && method === "DELETE") {
    if (!env.TAQDOM_DB) return reply({ error: "service_not_configured" }, 503, corsHeaders);
    const session = await currentUser(request, env);
    if (!session) return reply({ error: "not_authenticated" }, 401, corsHeaders);
    const id = path.slice("/api/media/".length);
    const ownerCheck = await env.TAQDOM_DB.prepare("SELECT id FROM media WHERE id=? AND owner_id=?").bind(id, session.row.id).first();
    if (!ownerCheck) return reply({ error: "not_found" }, 404, corsHeaders);
    await env.TAQDOM_DB.prepare("DELETE FROM media WHERE id=? AND owner_id=?").bind(id, session.row.id).run();
    return reply({ ok: true }, 200, corsHeaders);
  }
  if (path === "/api/messages" && method === "POST") {
    if (!env.TAQDOM_DB) return reply({ error: "service_not_configured" }, 503, corsHeaders);
    const parsed = await readJson(request, 8e3);
    if (parsed.error) return reply({ error: parsed.error }, parsed.status, corsHeaders);
    const body = parsed.body || {};
    const portfolioId = typeof body.portfolioId === "string" ? body.portfolioId.trim() : "";
    const name = typeof body.senderName === "string" ? body.senderName.trim().slice(0, 100) : typeof body.name === "string" ? body.name.trim().slice(0, 100) : "\u0632\u0627\u0626\u0631";
    const email = typeof body.senderEmail === "string" ? body.senderEmail.trim().slice(0, 200) : typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 2e3) : "";
    if (!portfolioId || message.length < 3) return reply({ error: "invalid_message" }, 400, corsHeaders);
    const publishedTarget = await env.TAQDOM_DB.prepare("SELECT id FROM portfolios WHERE id=? AND status='published'").bind(portfolioId).first();
    if (!publishedTarget) return reply({ error: "not_found" }, 404, corsHeaders);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const ipHash = await hash(ip + "|taqdom-message-limit-v1");
    const quota = await env.TAQDOM_DB.prepare("INSERT INTO message_attempts (ip_hash, portfolio_id) SELECT ?, ? WHERE (SELECT COUNT(*) FROM message_attempts WHERE ip_hash=? AND created_at >= datetime('now','-10 minutes')) < 25 AND (SELECT COUNT(*) FROM message_attempts WHERE ip_hash=? AND portfolio_id=? AND created_at >= datetime('now','-10 minutes')) < 5").bind(ipHash, portfolioId, ipHash, ipHash, portfolioId).run();
    if (Number(quota && quota.meta && quota.meta.changes || 0) !== 1) return reply({ error: "message_rate_limit" }, 429, corsHeaders);
    await env.TAQDOM_DB.prepare("DELETE FROM message_attempts WHERE created_at < datetime('now','-2 days')").run();
    const id = crypto.randomUUID();
    await env.TAQDOM_DB.prepare(
      "INSERT INTO messages (id, portfolio_id, sender_name, sender_email, message) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, portfolioId, name, email, message).run();
    return reply({ ok: true, message: "sent" }, 201, corsHeaders);
  }
  if (path.startsWith("/api/messages/") && method === "GET") {
    if (!env.TAQDOM_DB) return reply({ error: "service_not_configured" }, 503, corsHeaders);
    const session = await currentUser(request, env);
    if (!session) return reply({ error: "not_authenticated" }, 401, corsHeaders);
    const portfolioId = path.slice("/api/messages/".length);
    const ownerCheck = await env.TAQDOM_DB.prepare(
      "SELECT id FROM portfolios WHERE id=? AND owner_id=?"
    ).bind(portfolioId, session.row.id).first();
    if (!ownerCheck) return reply({ error: "not_found" }, 404, corsHeaders);
    const result = await env.TAQDOM_DB.prepare(
      "SELECT id, sender_name, sender_email, message, created_at FROM messages WHERE portfolio_id=? ORDER BY created_at DESC LIMIT 50"
    ).bind(portfolioId).all();
    return reply({ messages: result.results || [] }, 200, corsHeaders);
  }
  if (path.startsWith("/api/messages/") && method === "DELETE") {
    if (!env.TAQDOM_DB) return reply({ error: "service_not_configured" }, 503, corsHeaders);
    const session = await currentUser(request, env);
    if (!session) return reply({ error: "not_authenticated" }, 401, corsHeaders);
    const messageId = path.slice("/api/messages/".length);
    const ownerCheck = await env.TAQDOM_DB.prepare(
      "SELECT m.id FROM messages m JOIN portfolios p ON p.id=m.portfolio_id WHERE m.id=? AND p.owner_id=?"
    ).bind(messageId, session.row.id).first();
    if (!ownerCheck) return reply({ error: "not_found" }, 404, corsHeaders);
    await env.TAQDOM_DB.prepare("DELETE FROM messages WHERE id=?").bind(messageId).run();
    return reply({ ok: true }, 200, corsHeaders);
  }
  if (!path.startsWith("/api/auth/") && !path.startsWith("/api/portfolios")) return null;
  if (!env.TAQDOM_DB) return reply({ error: "service_not_configured" }, 503, corsHeaders);
  const changesState = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
  const origin = request.headers.get("Origin") || "";
  if (changesState && !isOriginAllowed(origin, origins)) return reply({ error: "origin_not_allowed" }, 403, corsHeaders);
  if (path === "/api/auth/register" && method === "POST") {
    const parsed = await readJson(request, 12e3);
    if (parsed.error) return reply({ error: parsed.error }, parsed.status, corsHeaders);
    const body = parsed.body || {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const displayName = typeof body.displayName === "string" ? body.displayName.trim().replace(/\s+/g, " ").slice(0, 100) : "";
    const locale = body.locale === "en" ? "en" : "ar";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return reply({ error: "invalid_email" }, 400, corsHeaders);
    if (displayName.length < 2) return reply({ error: "invalid_name" }, 400, corsHeaders);
    if (password.length < 10 || password.length > 128) return reply({ error: "weak_password" }, 400, corsHeaders);
    if (!await authAttemptAllowed(env, request, "register", email, 6, 60)) return reply({ error: "too_many_attempts" }, 429, corsHeaders);
    const userId = crypto.randomUUID();
    const saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
    const salt = encodeB64Url(saltBytes);
    const passwordHash = await derivePassword(password, salt);
    try {
      await env.TAQDOM_DB.prepare("INSERT INTO users (id,email,display_name,password_salt,password_hash,locale) VALUES (?,?,?,?,?,?)").bind(userId, email, displayName, salt, passwordHash, locale).run();
    } catch (_) {
      return reply({ error: "email_already_registered" }, 409, corsHeaders);
    }
    const token = await newSession(env, userId);
    const user = await env.TAQDOM_DB.prepare("SELECT id,email,display_name,locale,email_verified,created_at FROM users WHERE id=?").bind(userId).first();
    return reply({ user: publicUser(user), message: "account_created" }, 201, Object.assign({}, corsHeaders, { "set-cookie": sessionCookie(token, 2592e3) }));
  }
  if (path === "/api/auth/login" && method === "POST") {
    const parsed = await readJson(request, 12e3);
    if (parsed.error) return reply({ error: parsed.error }, parsed.status, corsHeaders);
    const body = parsed.body || {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || email.length > 254 || password.length < 1 || password.length > 128) return reply({ error: "invalid_credentials" }, 401, corsHeaders);
    if (!await authAttemptAllowed(env, request, "login", email, 10, 15)) return reply({ error: "too_many_attempts" }, 429, corsHeaders);
    const row = await env.TAQDOM_DB.prepare("SELECT id,email,display_name,password_salt,password_hash,locale,email_verified,created_at FROM users WHERE email=? COLLATE NOCASE").bind(email).first();
    const salt = row && row.password_salt ? row.password_salt : encodeB64Url(new TextEncoder().encode("taqdom-dummy-salt"));
    const candidate = await derivePassword(password, salt);
    if (!row || !constantTimeEqual(candidate, row.password_hash)) return reply({ error: "invalid_credentials" }, 401, corsHeaders);
    const token = await newSession(env, row.id);
    return reply({ user: publicUser(row) }, 200, Object.assign({}, corsHeaders, { "set-cookie": sessionCookie(token, 2592e3) }));
  }
  if (path === "/api/auth/me" && method === "GET") {
    const session = await currentUser(request, env);
    return session ? reply({ user: publicUser(session.row) }, 200, corsHeaders) : reply({ error: "not_authenticated" }, 401, corsHeaders);
  }
  if (path === "/api/auth/logout" && method === "POST") {
    const token = getSessionToken(request);
    if (token) await env.TAQDOM_DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await hash(token)).run();
    return reply({ ok: true }, 200, Object.assign({}, corsHeaders, { "set-cookie": sessionCookie("", 0) }));
  }
  if (path === "/api/auth/password" && method === "POST") {
    const session = await currentUser(request, env);
    if (!session) return reply({ error: "not_authenticated" }, 401, corsHeaders);
    const parsed = await readJson(request, 12e3);
    if (parsed.error) return reply({ error: parsed.error }, parsed.status, corsHeaders);
    const body = parsed.body || {};
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (newPassword.length < 10 || newPassword.length > 128) return reply({ error: "weak_password" }, 400, corsHeaders);
    const userRow = await env.TAQDOM_DB.prepare("SELECT id,password_salt,password_hash FROM users WHERE id=?").bind(session.row.id).first();
    if (!userRow) return reply({ error: "not_authenticated" }, 401, corsHeaders);
    const candidate = await derivePassword(currentPassword, userRow.password_salt);
    if (!constantTimeEqual(candidate, userRow.password_hash)) return reply({ error: "invalid_current_password" }, 401, corsHeaders);
    const saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
    const salt = encodeB64Url(saltBytes);
    const passwordHash = await derivePassword(newPassword, salt);
    await env.TAQDOM_DB.prepare("UPDATE users SET password_salt=?,password_hash=?,updated_at=datetime('now') WHERE id=?").bind(salt, passwordHash, session.row.id).run();
    await env.TAQDOM_DB.prepare("DELETE FROM sessions WHERE user_id=? AND token_hash<>?").bind(session.row.id, session.tokenHash).run();
    return reply({ ok: true }, 200, corsHeaders);
  }
  if (path === "/api/auth/account" && method === "DELETE") {
    const session = await currentUser(request, env);
    if (!session) return reply({ error: "not_authenticated" }, 401, corsHeaders);
    const userId = session.row.id;
    await env.TAQDOM_DB.batch([
      env.TAQDOM_DB.prepare("DELETE FROM messages WHERE portfolio_id IN (SELECT id FROM portfolios WHERE owner_id=?)").bind(userId),
      env.TAQDOM_DB.prepare("DELETE FROM media WHERE owner_id=?").bind(userId),
      env.TAQDOM_DB.prepare("DELETE FROM portfolios WHERE owner_id=?").bind(userId),
      env.TAQDOM_DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(userId),
      env.TAQDOM_DB.prepare("DELETE FROM users WHERE id=?").bind(userId)
    ]);
    return reply({ ok: true }, 200, Object.assign({}, corsHeaders, { "set-cookie": sessionCookie("", 0) }));
  }
  if (path === "/api/portfolios" && (method === "GET" || method === "POST")) {
    const session = await currentUser(request, env);
    if (!session) return reply({ error: "not_authenticated" }, 401, corsHeaders);
    const userId = session.row.id;
    if (method === "GET") {
      const result = await env.TAQDOM_DB.prepare("SELECT id,title,template_id,slug,document_json,status,revision,created_at,updated_at FROM portfolios WHERE owner_id=? ORDER BY updated_at DESC").bind(userId).all();
      const items = (result.results || []).map(function(row) {
        let document2 = {};
        try {
          document2 = JSON.parse(row.document_json);
        } catch (_) {
        }
        return { id: row.id, title: row.title, templateId: row.template_id, slug: row.slug, document: document2, status: row.status, revision: Number(row.revision || 1), createdAt: row.created_at, updatedAt: row.updated_at };
      });
      return reply({ portfolios: items }, 200, corsHeaders);
    }
    const parsed = await readJson(request, 8e4);
    if (parsed.error) return reply({ error: parsed.error }, parsed.status, corsHeaders);
    const body = parsed.body || {};
    let document = sanitizeDocument(body.document);
    if (!document) return reply({ error: "invalid_document" }, 400, corsHeaders);
    document = await validateDocumentMedia(env, userId, "", document);
    const count = await env.TAQDOM_DB.prepare("SELECT COUNT(*) AS total FROM portfolios WHERE owner_id=?").bind(userId).first();
    if (Number(count && count.total || 0) >= 20) return reply({ error: "portfolio_limit_reached", limit: 20 }, 429, corsHeaders);
    const id = crypto.randomUUID();
    const title = (typeof body.title === "string" ? body.title.trim().slice(0, 120) : "") || document.name || "My portfolio";
    const templateId = (typeof body.templateId === "string" ? body.templateId.slice(0, 100) : document.templateId) || "design-0";
    const requestedSlug = normalizeSubdomain(body.slug);
    if (body.slug !== void 0 && !isValidSubdomain(requestedSlug)) return reply({ error: "invalid_subdomain" }, 400, corsHeaders);
    const emailLocalPart = typeof session.row.email === "string" ? session.row.email.split("@")[0] : "";
    const emailBase = normalizeSubdomain(toSlug(emailLocalPart).replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20));
    const generatedSlug = (isValidSubdomain(emailBase) ? emailBase : "site") + "-" + id.slice(0, 6);
    const slug = requestedSlug || generatedSlug;
    const slugTaken = await env.TAQDOM_DB.prepare("SELECT id FROM portfolios WHERE lower(slug)=lower(?)").bind(slug).first();
    if (slugTaken) return reply({ error: "subdomain_taken" }, 409, corsHeaders);
    const status = body.status === "published" ? "published" : "draft";
    try {
      await env.TAQDOM_DB.prepare("INSERT INTO portfolios (id,owner_id,title,template_id,slug,status,document_json) VALUES (?,?,?,?,?,?,?)").bind(id, userId, title, templateId, slug, status, JSON.stringify(document)).run();
    } catch (error) {
      if (requestedSlug && /unique|constraint/i.test(String(error && error.message || error))) return reply({ error: "subdomain_taken" }, 409, corsHeaders);
      throw error;
    }
    await syncPortfolioMedia(env, userId, id, document);
    const item = await env.TAQDOM_DB.prepare("SELECT id,title,template_id,slug,document_json,status,revision,created_at,updated_at FROM portfolios WHERE id=? AND owner_id=?").bind(id, userId).first();
    return reply({ portfolio: { id: item.id, title: item.title, templateId: item.template_id, slug: item.slug, document: JSON.parse(item.document_json), status: item.status, revision: Number(item.revision || 1), createdAt: item.created_at, updatedAt: item.updated_at } }, 201, corsHeaders);
  }
  const match = path.match(/^\/api\/portfolios\/([0-9a-f-]{36})$/i);
  if (match && (method === "PUT" || method === "GET" || method === "DELETE")) {
    const session = await currentUser(request, env);
    if (!session) return reply({ error: "not_authenticated" }, 401, corsHeaders);
    const id = match[1];
    if (method === "GET") {
      const row = await env.TAQDOM_DB.prepare("SELECT id,title,template_id,slug,document_json,status,revision,created_at,updated_at FROM portfolios WHERE id=? AND owner_id=?").bind(id, session.row.id).first();
      if (!row) return reply({ error: "not_found" }, 404, corsHeaders);
      let document2 = {};
      try {
        document2 = JSON.parse(row.document_json);
      } catch (_) {
      }
      return reply({ portfolio: { id: row.id, title: row.title, templateId: row.template_id, slug: row.slug, document: document2, status: row.status, revision: Number(row.revision || 1), createdAt: row.created_at, updatedAt: row.updated_at } }, 200, corsHeaders);
    }
    if (method === "DELETE") {
      const result2 = await env.TAQDOM_DB.batch([
        env.TAQDOM_DB.prepare("DELETE FROM messages WHERE portfolio_id=?").bind(id),
        env.TAQDOM_DB.prepare("DELETE FROM media WHERE owner_id=? AND portfolio_id=?").bind(session.row.id, id),
        env.TAQDOM_DB.prepare("DELETE FROM portfolios WHERE id=? AND owner_id=?").bind(id, session.row.id)
      ]);
      const deleted = Number(result2?.[2]?.meta?.changes || 0);
      return deleted ? reply({ ok: true }, 200, corsHeaders) : reply({ error: "not_found" }, 404, corsHeaders);
    }
    const parsed = await readJson(request, 8e4);
    if (parsed.error) return reply({ error: parsed.error }, parsed.status, corsHeaders);
    const body = parsed.body || {};
    let document = sanitizeDocument(body.document);
    if (!document) return reply({ error: "invalid_document" }, 400, corsHeaders);
    document = await validateDocumentMedia(env, session.row.id, id, document);
    const title = (typeof body.title === "string" ? body.title.trim().slice(0, 120) : "") || document.name || "My portfolio";
    const templateId = (typeof body.templateId === "string" ? body.templateId.slice(0, 100) : document.templateId) || "design-0";
    const existingPortfolio = await env.TAQDOM_DB.prepare("SELECT status,slug,revision FROM portfolios WHERE id=? AND owner_id=?").bind(id, session.row.id).first();
    if (!existingPortfolio) return reply({ error: "not_found" }, 404, corsHeaders);
    const providedRevision = body.revision ?? body.baseRevision;
    if (providedRevision !== void 0 && Number(providedRevision) !== Number(existingPortfolio.revision || 1)) {
      return reply({ error: "portfolio_conflict", revision: Number(existingPortfolio.revision || 1) }, 409, corsHeaders);
    }
    const nextRevision = Number(existingPortfolio.revision || 1) + 1;
    const status = body.status === "published" ? "published" : body.status === "draft" ? "draft" : existingPortfolio.status;
    const handleWasProvided = body.slug !== void 0;
    const requestedSlug = handleWasProvided ? normalizeSubdomain(body.slug) : existingPortfolio.slug;
    if (handleWasProvided && !isValidSubdomain(requestedSlug)) return reply({ error: "invalid_subdomain" }, 400, corsHeaders);
    if (handleWasProvided && requestedSlug !== existingPortfolio.slug) {
      const slugTaken = await env.TAQDOM_DB.prepare("SELECT id FROM portfolios WHERE lower(slug)=lower(?) AND id<>?").bind(requestedSlug, id).first();
      if (slugTaken) return reply({ error: "subdomain_taken" }, 409, corsHeaders);
    }
    let result;
    try {
      result = await env.TAQDOM_DB.prepare("UPDATE portfolios SET title=?,template_id=?,status=?,slug=?,document_json=?,revision=?,updated_at=datetime('now') WHERE id=? AND owner_id=? AND revision=?").bind(title, templateId, status, requestedSlug, JSON.stringify(document), nextRevision, id, session.row.id, Number(existingPortfolio.revision || 1)).run();
    } catch (error) {
      if (handleWasProvided && requestedSlug !== existingPortfolio.slug && /unique|constraint/i.test(String(error && error.message || error))) return reply({ error: "subdomain_taken" }, 409, corsHeaders);
      throw error;
    }
    if (!Number(result.meta && result.meta.changes || 0)) {
      const latest = await env.TAQDOM_DB.prepare("SELECT revision FROM portfolios WHERE id=? AND owner_id=?").bind(id, session.row.id).first();
      return latest
        ? reply({ error: "portfolio_conflict", revision: Number(latest.revision || 1) }, 409, corsHeaders)
        : reply({ error: "not_found" }, 404, corsHeaders);
    }
    await syncPortfolioMedia(env, session.row.id, id, document);
    return reply({ ok: true, status, revision: nextRevision, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, 200, corsHeaders);
  }
  return reply({ error: "not_found" }, 404, corsHeaders);
}
__name(routeAuthApi, "routeAuthApi");
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origins = parseOrigins(env);
    const headers = cors(request, origins);
    const origin = request.headers.get("Origin") || "";
    if (origin && !isOriginAllowed(origin, origins)) return reply({ error: "origin_not_allowed" }, 403, headers);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (url.pathname === "/api/health" && request.method === "GET") {
      return reply({ ok: true, service: "taqdom-studio-api", aiConfigured: Boolean(env.AI), databaseConfigured: Boolean(env.TAQDOM_DB), mediaConfigured: true, paymentEnabled: false }, 200, headers);
    }
    const authResponse = await routeAuthApi(request, env, headers, origins);
    if (authResponse) return authResponse;
    if (url.pathname === "/api/ai/improve" && request.method === "POST") return improve(request, env, headers);
    return reply({ error: "not_found" }, 404, headers);
  }
};
export {
  index_default as default
};

