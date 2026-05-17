/**
 * Browser Fingerprint Collector (Enhanced)
 * Collects browser/device characteristics to verify real human visitors
 * when Turnstile fails to load (e.g., tracking prevention blocks it).
 * 
 * This does NOT track users - it only checks if the browser is real.
 * Bots (headless browsers) have very different fingerprints than real browsers.
 * 
 * Enhanced with:
 * - Audio fingerprint (AudioContext)
 * - Performance timing analysis
 * - Advanced automation detection
 * - Chrome-specific consistency checks
 */

export interface BrowserFingerprint {
  // Screen info
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  pixelRatio: number;
  
  // Browser info
  language: string;
  languages: string[];
  timezone: string;
  timezoneOffset: number;
  cookiesEnabled: boolean;
  doNotTrack: string | null;
  
  // Hardware
  hardwareConcurrency: number;
  maxTouchPoints: number;
  platform: string;
  
  // Canvas fingerprint (hash only - not tracking, just bot detection)
  canvasHash: string;
  
  // WebGL info
  webglVendor: string;
  webglRenderer: string;
  
  // Fonts detection (count only)
  fontsCount: number;
  
  // Behavior signals
  hasSessionStorage: boolean;
  hasLocalStorage: boolean;
  hasIndexedDB: boolean;
  
  // Anti-automation detection
  isWebDriver: boolean;
  hasPlugins: boolean;
  pluginCount: number;
  hasNotificationPermission: boolean;
  screenAvailDiff: boolean;
  
  // === NEW: Enhanced detection ===
  
  // Audio fingerprint
  audioHash: string;
  
  // Performance timing
  perfTimingConsistent: boolean;
  
  // Advanced automation detection
  chromeConsistent: boolean; // Chrome-specific APIs match UA
  hasChrome: boolean;
  hasPermissions: boolean;
  speechSynthesisVoices: number;
  connectionType: string;
  deviceMemory: number;
  
  // Property descriptor checks (bots override with Object.defineProperty)
  navigatorPropsNatural: boolean;
  
  // iframe check
  isInIframe: boolean;
  
  // Timestamp
  collectedAt: number;
}

function getCanvasHash(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no_canvas";
    
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("Browser Test", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("Browser Test", 4, 17);
    
    const dataUrl = canvas.toDataURL();
    // Simple hash
    let hash = 0;
    for (let i = 0; i < dataUrl.length; i++) {
      const char = dataUrl.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash.toString(36);
  } catch {
    return "error";
  }
}

function getWebGLInfo(): { vendor: string; renderer: string } {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return { vendor: "no_webgl", renderer: "no_webgl" };
    
    const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return { vendor: "no_debug", renderer: "no_debug" };
    
    return {
      vendor: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "unknown",
      renderer: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "unknown",
    };
  } catch {
    return { vendor: "error", renderer: "error" };
  }
}

function countFonts(): number {
  const testFonts = [
    "Arial", "Verdana", "Times New Roman", "Courier New", "Georgia",
    "Palatino", "Garamond", "Comic Sans MS", "Impact", "Lucida Console",
    "Tahoma", "Trebuchet MS", "Arial Black", "Helvetica",
  ];
  
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;
    
    const baseFonts = ["monospace", "sans-serif", "serif"];
    const testString = "mmmmmmmmmmlli";
    const testSize = "72px";
    
    const baseWidths: Record<string, number> = {};
    for (const base of baseFonts) {
      ctx.font = `${testSize} ${base}`;
      baseWidths[base] = ctx.measureText(testString).width;
    }
    
    let count = 0;
    for (const font of testFonts) {
      for (const base of baseFonts) {
        ctx.font = `${testSize} '${font}', ${base}`;
        if (ctx.measureText(testString).width !== baseWidths[base]) {
          count++;
          break;
        }
      }
    }
    return count;
  } catch {
    return -1;
  }
}

/**
 * Audio fingerprint using AudioContext.
 * Each real device produces a slightly different audio signal.
 * Headless browsers often produce identical or no signal.
 */
function getAudioHash(): string {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return "no_audio";
    
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const analyser = ctx.createAnalyser();
    const gain = ctx.createGain();
    const processor = ctx.createScriptProcessor ? ctx.createScriptProcessor(4096, 1, 1) : null;
    
    // Use compressor for fingerprinting (produces device-specific output)
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -50;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.25;
    
    oscillator.type = "triangle";
    oscillator.frequency.value = 10000;
    
    oscillator.connect(compressor);
    compressor.connect(analyser);
    gain.gain.value = 0; // mute - no sound output
    analyser.connect(gain);
    gain.connect(ctx.destination);
    
    oscillator.start(0);
    
    // Get frequency data
    const data = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(data);
    
    // Hash the data
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      if (isFinite(data[i])) {
        hash = ((hash << 5) - hash) + Math.round(data[i] * 1000);
        hash |= 0;
      }
    }
    
    oscillator.stop();
    ctx.close();
    
    return hash !== 0 ? hash.toString(36) : "silent";
  } catch {
    return "error";
  }
}

/**
 * Check if performance timing values are consistent.
 * Bots often have suspicious timing patterns.
 */
function checkPerfTiming(): boolean {
  try {
    const perf = performance;
    if (!perf || !perf.timing) return true; // can't check, assume ok
    
    const t = perf.timing;
    // Navigation start should be before load
    if (t.navigationStart > 0 && t.loadEventEnd > 0) {
      const loadTime = t.loadEventEnd - t.navigationStart;
      // Page load under 5ms is suspicious (bots load instantly)
      if (loadTime > 0 && loadTime < 5) return false;
    }
    
    // Check if performance.now() actually increments
    const t1 = performance.now();
    // Small computation to ensure time passes
    let x = 0;
    for (let i = 0; i < 1000; i++) x += i;
    const t2 = performance.now();
    // If no time passed, timing is faked
    if (t2 - t1 === 0) return false;
    
    return true;
  } catch {
    return true; // can't check, assume ok
  }
}

/**
 * Check Chrome-specific API consistency.
 * If UA says Chrome but Chrome APIs are missing = spoofed UA.
 */
function checkChromeConsistency(): boolean {
  try {
    const ua = navigator.userAgent;
    const isChrome = ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('OPR');
    
    if (!isChrome) return true; // not Chrome, skip check
    
    // Real Chrome has window.chrome object
    const hasChrome = !!(window as any).chrome;
    if (!hasChrome) return false; // UA says Chrome but no chrome object
    
    // Real Chrome has chrome.runtime (even in non-extension context it exists)
    // Note: Some privacy extensions remove this, so don't hard-fail
    
    return true;
  } catch {
    return true;
  }
}

/**
 * Check if navigator properties are native (not overridden with Object.defineProperty).
 * Bots use Object.defineProperty to fake navigator.webdriver, plugins, etc.
 */
function checkNavigatorPropsNatural(): boolean {
  try {
    // Check if navigator.webdriver property descriptor looks natural
    const desc = Object.getOwnPropertyDescriptor(navigator, 'webdriver');
    
    // In real browsers, webdriver is either:
    // 1. Not a direct property (inherited from prototype) - desc is undefined
    // 2. A configurable property
    // In Puppeteer stealth, it's deleted or redefined with specific descriptors
    
    // Check prototype chain - real browsers have it on Navigator.prototype
    const protoDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'webdriver');
    if (protoDesc && protoDesc.get) {
      // Has getter on prototype - this is normal for real browsers
      // But if there's also a direct property, it was overridden
      if (desc !== undefined) return false; // overridden!
    }
    
    // Check if languages was overridden (bots often fake this)
    const langDesc = Object.getOwnPropertyDescriptor(navigator, 'languages');
    if (langDesc && langDesc.value !== undefined && !langDesc.configurable) {
      // Direct non-configurable value property = likely faked
      return false;
    }
    
    return true;
  } catch {
    return true; // can't check, assume ok
  }
}

export function collectFingerprint(): BrowserFingerprint {
  const webgl = getWebGLInfo();
  
  // Anti-automation detection
  const isWebDriver = !!(navigator as any).webdriver;
  const pluginCount = navigator.plugins?.length || 0;
  const hasPlugins = pluginCount > 0;
  const hasNotificationPermission = typeof Notification !== 'undefined';
  const screenAvailDiff = (window.screen?.availHeight || 0) < (window.screen?.height || 0) ||
                          (window.screen?.availWidth || 0) < (window.screen?.width || 0);
  
  // === NEW: Enhanced detection ===
  const audioHash = getAudioHash();
  const perfTimingConsistent = checkPerfTiming();
  const chromeConsistent = checkChromeConsistency();
  const navigatorPropsNatural = checkNavigatorPropsNatural();
  
  // Chrome object presence
  const hasChrome = !!(window as any).chrome;
  
  // Permissions API
  const hasPermissions = !!(navigator as any).permissions;
  
  // Speech synthesis voices (real browsers have voices, headless often has 0)
  let speechVoices = 0;
  try {
    speechVoices = window.speechSynthesis?.getVoices()?.length || 0;
  } catch { /* ignore */ }
  
  // Network connection type
  let connType = "unknown";
  try {
    connType = (navigator as any).connection?.effectiveType || "unknown";
  } catch { /* ignore */ }
  
  // Device memory (Chrome-specific, 0 in other browsers)
  let devMemory = 0;
  try {
    devMemory = (navigator as any).deviceMemory || 0;
  } catch { /* ignore */ }
  
  // iframe check
  const isInIframe = window !== window.top;
  
  return {
    screenWidth: window.screen?.width || 0,
    screenHeight: window.screen?.height || 0,
    colorDepth: window.screen?.colorDepth || 0,
    pixelRatio: window.devicePixelRatio || 1,
    
    language: navigator.language || "",
    languages: Array.from(navigator.languages || []),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    timezoneOffset: new Date().getTimezoneOffset(),
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    platform: navigator.platform || "",
    
    canvasHash: getCanvasHash(),
    
    webglVendor: webgl.vendor,
    webglRenderer: webgl.renderer,
    
    fontsCount: countFonts(),
    
    hasSessionStorage: !!window.sessionStorage,
    hasLocalStorage: !!window.localStorage,
    hasIndexedDB: !!window.indexedDB,
    
    // Anti-automation (original)
    isWebDriver,
    hasPlugins,
    pluginCount,
    hasNotificationPermission,
    screenAvailDiff,
    
    // Enhanced detection (new)
    audioHash,
    perfTimingConsistent,
    chromeConsistent,
    hasChrome,
    hasPermissions,
    speechSynthesisVoices: speechVoices,
    connectionType: connType,
    deviceMemory: devMemory,
    navigatorPropsNatural,
    isInIframe,
    
    collectedAt: Date.now(),
  };
}
