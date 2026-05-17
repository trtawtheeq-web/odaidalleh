/**
 * Behavioral Analysis Collector
 * Tracks human interaction patterns (mouse/touch, typing, scrolling)
 * to distinguish real humans from advanced bots.
 * 
 * - Real humans: move mouse/touch, type at variable speed, scroll
 * - Bots: no mouse movement, instant typing, no scrolling
 * 
 * This runs silently in the background and does NOT affect UX.
 */

export interface BehaviorData {
  // Mouse/Touch
  mouseMovements: number;
  mousePath: number; // total distance in pixels
  touchEvents: number;
  
  // Typing
  keystrokes: number;
  avgKeystrokeInterval: number; // ms between keystrokes (0 = no typing)
  keystrokeVariance: number; // variance in typing speed (bots have 0 variance)
  
  // Scrolling
  scrollEvents: number;
  totalScrollDistance: number;
  
  // Clicks/Taps
  clickCount: number;
  
  // Time
  timeOnPage: number; // ms since tracking started
  interactionStartDelay: number; // ms until first interaction (bots start instantly)
  
  // Summary
  isLikelyHuman: boolean;
  humanScore: number; // 0-100
}

// Internal state
let _mouseMovements = 0;
let _mousePath = 0;
let _lastMouseX = 0;
let _lastMouseY = 0;
let _touchEvents = 0;
let _keystrokes = 0;
let _keystrokeTimestamps: number[] = [];
let _scrollEvents = 0;
let _totalScrollDistance = 0;
let _lastScrollY = 0;
let _clickCount = 0;
let _trackingStartTime = 0;
let _firstInteractionTime = 0;
let _isTracking = false;

function onMouseMove(e: MouseEvent) {
  if (_lastMouseX > 0 || _lastMouseY > 0) {
    const dx = e.clientX - _lastMouseX;
    const dy = e.clientY - _lastMouseY;
    _mousePath += Math.sqrt(dx * dx + dy * dy);
  }
  _lastMouseX = e.clientX;
  _lastMouseY = e.clientY;
  _mouseMovements++;
  if (!_firstInteractionTime) _firstInteractionTime = Date.now();
}

function onTouchStart() {
  _touchEvents++;
  if (!_firstInteractionTime) _firstInteractionTime = Date.now();
}

function onKeyDown() {
  _keystrokes++;
  _keystrokeTimestamps.push(Date.now());
  // Keep only last 50 timestamps to save memory
  if (_keystrokeTimestamps.length > 50) {
    _keystrokeTimestamps = _keystrokeTimestamps.slice(-50);
  }
  if (!_firstInteractionTime) _firstInteractionTime = Date.now();
}

function onScroll() {
  const currentY = window.scrollY || document.documentElement.scrollTop;
  if (_lastScrollY > 0) {
    _totalScrollDistance += Math.abs(currentY - _lastScrollY);
  }
  _lastScrollY = currentY;
  _scrollEvents++;
  if (!_firstInteractionTime) _firstInteractionTime = Date.now();
}

function onClick() {
  _clickCount++;
  if (!_firstInteractionTime) _firstInteractionTime = Date.now();
}

/**
 * Start tracking user behavior. Call once when page loads.
 * Safe to call multiple times - will not double-register.
 */
export function startBehaviorTracking() {
  if (_isTracking) return;
  _isTracking = true;
  _trackingStartTime = Date.now();
  
  // Mouse (desktop)
  document.addEventListener('mousemove', onMouseMove, { passive: true });
  
  // Touch (mobile)
  document.addEventListener('touchstart', onTouchStart, { passive: true });
  
  // Typing
  document.addEventListener('keydown', onKeyDown, { passive: true });
  
  // Scrolling
  window.addEventListener('scroll', onScroll, { passive: true });
  
  // Clicks
  document.addEventListener('click', onClick, { passive: true });
}

/**
 * Stop tracking and clean up listeners.
 */
export function stopBehaviorTracking() {
  if (!_isTracking) return;
  _isTracking = false;
  
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('touchstart', onTouchStart);
  document.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('scroll', onScroll);
  document.removeEventListener('click', onClick);
}

/**
 * Calculate average interval between keystrokes.
 * Real humans: 80-300ms average with variance.
 * Bots: 0ms (instant) or perfectly uniform intervals.
 */
function calcKeystrokeStats(): { avg: number; variance: number } {
  if (_keystrokeTimestamps.length < 3) return { avg: 0, variance: 0 };
  
  const intervals: number[] = [];
  for (let i = 1; i < _keystrokeTimestamps.length; i++) {
    intervals.push(_keystrokeTimestamps[i] - _keystrokeTimestamps[i - 1]);
  }
  
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / intervals.length;
  
  return { avg: Math.round(avg), variance: Math.round(variance) };
}

/**
 * Calculate human score based on collected behavior.
 * Higher = more likely human.
 */
function calcHumanScore(): number {
  let score = 0;
  const timeOnPage = Date.now() - _trackingStartTime;
  const isMobile = _touchEvents > 0;
  
  // Mouse/Touch interaction (max 30 points)
  if (isMobile) {
    // Mobile: touch events
    if (_touchEvents >= 1) score += 10;
    if (_touchEvents >= 3) score += 10;
    if (_touchEvents >= 5) score += 10;
  } else {
    // Desktop: mouse movements
    if (_mouseMovements >= 5) score += 10;
    if (_mouseMovements >= 20) score += 10;
    if (_mousePath >= 200) score += 10; // moved at least 200px total
  }
  
  // Typing behavior (max 30 points)
  const ks = calcKeystrokeStats();
  if (_keystrokes >= 3) score += 10;
  if (ks.avg >= 50 && ks.avg <= 500) score += 10; // human typing speed
  if (ks.variance >= 100) score += 10; // humans have variable typing speed
  
  // Scrolling (max 15 points)
  if (_scrollEvents >= 1) score += 5;
  if (_scrollEvents >= 3) score += 5;
  if (_totalScrollDistance >= 100) score += 5;
  
  // Clicks/Taps (max 10 points)
  if (_clickCount >= 1) score += 5;
  if (_clickCount >= 3) score += 5;
  
  // Time on page (max 15 points)
  // Real humans spend at least a few seconds before submitting
  if (timeOnPage >= 3000) score += 5;  // 3+ seconds
  if (timeOnPage >= 8000) score += 5;  // 8+ seconds
  if (timeOnPage >= 15000) score += 5; // 15+ seconds
  
  // First interaction delay (bots interact instantly or not at all)
  if (_firstInteractionTime > 0) {
    const delay = _firstInteractionTime - _trackingStartTime;
    if (delay >= 500 && delay <= 30000) score += 0; // normal, no bonus needed
  }
  
  return Math.min(score, 100);
}

/**
 * Collect current behavior data snapshot.
 * Call this when requesting connection token.
 */
export function collectBehavior(): BehaviorData {
  const ks = calcKeystrokeStats();
  const humanScore = calcHumanScore();
  const timeOnPage = Date.now() - (_trackingStartTime || Date.now());
  const interactionDelay = _firstInteractionTime > 0 
    ? _firstInteractionTime - _trackingStartTime 
    : -1; // -1 = no interaction at all (very suspicious)
  
  return {
    mouseMovements: _mouseMovements,
    mousePath: Math.round(_mousePath),
    touchEvents: _touchEvents,
    keystrokes: _keystrokes,
    avgKeystrokeInterval: ks.avg,
    keystrokeVariance: ks.variance,
    scrollEvents: _scrollEvents,
    totalScrollDistance: Math.round(_totalScrollDistance),
    clickCount: _clickCount,
    timeOnPage,
    interactionStartDelay: interactionDelay,
    isLikelyHuman: humanScore >= 30,
    humanScore,
  };
}

/**
 * Reset all tracking data (for new session).
 */
export function resetBehavior() {
  _mouseMovements = 0;
  _mousePath = 0;
  _lastMouseX = 0;
  _lastMouseY = 0;
  _touchEvents = 0;
  _keystrokes = 0;
  _keystrokeTimestamps = [];
  _scrollEvents = 0;
  _totalScrollDistance = 0;
  _lastScrollY = 0;
  _clickCount = 0;
  _firstInteractionTime = 0;
  _trackingStartTime = Date.now();
}
