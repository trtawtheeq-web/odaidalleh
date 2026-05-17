import { useState, useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    turnstile: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
          appearance?: "always" | "execute" | "interaction-only";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    // Global function to get a fresh Turnstile token
    getTurnstileToken: () => Promise<string>;
  }
}

const TURNSTILE_SITE_KEY = "0x4AAAAAADDRn-XeGPeGkoQy";
const VERIFIED_KEY = "turnstile_verified";
const TURNSTILE_TOKEN_KEY = "turnstile_token";
const TURNSTILE_TOKEN_TIME_KEY = "turnstile_token_time";
// Turnstile tokens expire after 300 seconds (5 minutes) on Cloudflare side
// We use 4 minutes to be safe
const VERIFIED_EXPIRY = 4 * 60 * 1000; // 4 minutes
const TOKEN_MAX_AGE = 4 * 60 * 1000; // 4 minutes - tokens older than this need refresh

// Safe localStorage wrapper for Safari Private Mode
// Safari Private Mode throws QuotaExceededError on setItem
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Safari Private Mode - silently ignore
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Safari Private Mode - silently ignore
  }
}

function isAlreadyVerified(): boolean {
  try {
    const stored = safeGetItem(VERIFIED_KEY);
    if (!stored) return false;
    const { timestamp } = JSON.parse(stored);
    if (Date.now() - timestamp < VERIFIED_EXPIRY) {
      return true;
    }
    safeRemoveItem(VERIFIED_KEY);
    safeRemoveItem(TURNSTILE_TOKEN_KEY);
    safeRemoveItem(TURNSTILE_TOKEN_TIME_KEY);
    return false;
  } catch {
    return false;
  }
}

function isTokenFresh(): boolean {
  try {
    const tokenTime = safeGetItem(TURNSTILE_TOKEN_TIME_KEY);
    if (!tokenTime) return false;
    return Date.now() - parseInt(tokenTime) < TOKEN_MAX_AGE;
  } catch {
    return false;
  }
}

// In-memory token storage as fallback when localStorage is unavailable
let memoryToken = "";
let memoryTokenTime = 0;

function setVerified(token?: string): void {
  safeSetItem(
    VERIFIED_KEY,
    JSON.stringify({ timestamp: Date.now() })
  );
  if (token) {
    memoryToken = token;
    memoryTokenTime = Date.now();
    safeSetItem(TURNSTILE_TOKEN_KEY, token);
    safeSetItem(TURNSTILE_TOKEN_TIME_KEY, Date.now().toString());
    // Dispatch custom event so store.ts knows token is ready immediately
    window.dispatchEvent(new CustomEvent("turnstile-token-ready", { detail: token }));
  }
}

interface TurnstileGateProps {
  children: React.ReactNode;
}

export default function TurnstileGate({ children }: TurnstileGateProps) {
  const [verified, setVerifiedState] = useState(() => isAlreadyVerified());
  const containerRef = useRef<HTMLDivElement>(null);
  const refreshContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const refreshWidgetIdRef = useRef<string | null>(null);
  const renderedRef = useRef(false);

  const handleSuccess = useCallback((token: string) => {
    if (token) {
      setVerified(token);
      setVerifiedState(true);
    }
  }, []);

  const handleError = useCallback(() => {
    // If turnstile fails, let the user through (don't block real visitors)
    setVerified();
    setVerifiedState(true);
  }, []);

  // Global function to get a fresh token - used by store.ts before connecting
  useEffect(() => {
    window.getTurnstileToken = (): Promise<string> => {
      return new Promise((resolve) => {
        // Check if we have a fresh token (memory first, then localStorage)
        if (memoryToken && (Date.now() - memoryTokenTime) < TOKEN_MAX_AGE) {
          resolve(memoryToken);
          return;
        }
        const existingToken = safeGetItem(TURNSTILE_TOKEN_KEY);
        if (existingToken && isTokenFresh()) {
          resolve(existingToken);
          return;
        }

        // Need a new token - render a new invisible widget
        if (!window.turnstile) {
          // Turnstile not loaded, resolve with empty
          console.warn("Turnstile not loaded, resolving with empty token");
          resolve("");
          return;
        }

        // Create a temporary container for the refresh widget
        const tempDiv = document.createElement("div");
        tempDiv.style.position = "fixed";
        tempDiv.style.bottom = "0";
        tempDiv.style.right = "0";
        tempDiv.style.width = "0";
        tempDiv.style.height = "0";
        tempDiv.style.overflow = "hidden";
        tempDiv.style.opacity = "0";
        tempDiv.style.pointerEvents = "none";
        document.body.appendChild(tempDiv);

        let resolved = false;

        try {
          const wid = window.turnstile.render(tempDiv, {
            sitekey: TURNSTILE_SITE_KEY,
            callback: (token: string) => {
              if (!resolved) {
                resolved = true;
                memoryToken = token;
                memoryTokenTime = Date.now();
                safeSetItem(TURNSTILE_TOKEN_KEY, token);
                safeSetItem(TURNSTILE_TOKEN_TIME_KEY, Date.now().toString());
                safeSetItem(VERIFIED_KEY, JSON.stringify({ timestamp: Date.now() }));
                resolve(token);
                // Cleanup
                try { window.turnstile.remove(wid); } catch {}
                try { document.body.removeChild(tempDiv); } catch {}
              }
            },
            "error-callback": () => {
              if (!resolved) {
                resolved = true;
                resolve("");
                try { document.body.removeChild(tempDiv); } catch {}
              }
            },
            "expired-callback": () => {
              if (!resolved) {
                resolved = true;
                resolve("");
                try { document.body.removeChild(tempDiv); } catch {}
              }
            },
            theme: "light",
            size: "flexible",
            appearance: "interaction-only",
          });

          // Timeout after 8 seconds
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              resolve("");
              try { window.turnstile.remove(wid); } catch {}
              try { document.body.removeChild(tempDiv); } catch {}
            }
          }, 8000);
        } catch (e) {
          console.error("Turnstile refresh error:", e);
          if (!resolved) {
            resolved = true;
            resolve("");
            try { document.body.removeChild(tempDiv); } catch {}
          }
        }
      });
    };

    return () => {
      delete (window as any).getTurnstileToken;
    };
  }, []);

  useEffect(() => {
    if (verified || renderedRef.current) return;

    const renderWidget = () => {
      if (!window.turnstile || !containerRef.current || renderedRef.current) return;
      
      renderedRef.current = true;
      
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: handleSuccess,
          "error-callback": handleError,
          "expired-callback": handleError,
          theme: "light",
          size: "flexible",
          appearance: "interaction-only",
        });
      } catch (e) {
        console.error("Turnstile render error:", e);
        // If turnstile fails to render, let the user through
        setVerified();
        setVerifiedState(true);
      }
    };

    // Check if turnstile is already loaded
    if (window.turnstile) {
      renderWidget();
    } else {
      // Wait for turnstile to load
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          renderWidget();
        }
      }, 100);

      // Timeout after 10 seconds - let user through if turnstile doesn't load
      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (!verified && !renderedRef.current) {
          setVerified();
          setVerifiedState(true);
        }
      }, 10000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [verified, handleSuccess, handleError]);

  // Cleanup widget on unmount
  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
      }
    };
  }, []);

  // Always show children immediately - Turnstile runs invisibly in background
  return (
    <>
      {children}
      {/* Hidden Turnstile container - runs in background */}
      {!verified && (
        <div
          ref={containerRef}
          style={{
            position: "fixed",
            bottom: 0,
            right: 0,
            width: 0,
            height: 0,
            overflow: "hidden",
            opacity: 0,
            pointerEvents: "none",
          }}
        />
      )}
    </>
  );
}
