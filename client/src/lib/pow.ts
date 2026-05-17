// Proof of Work client module
// Gets challenge from server, solves it in Web Worker, returns solution

const API_URL = import.meta.env.VITE_API_URL 
  || (import.meta.env.MODE === 'production' 
    ? `https://api.${window.location.hostname}` 
    : "http://localhost:3001");

interface PoWChallenge {
  challengeId: string;
  challenge: string;
  difficulty: number;
}

interface PoWSolution {
  challengeId: string;
  nonce: string;
}

/**
 * Get a PoW challenge from the server and solve it using Web Worker
 * Returns the solution (challengeId + nonce) to include in connection-token request
 * Takes ~2-3 seconds on a real device (runs in background, doesn't block UI)
 */
export async function solveProofOfWork(): Promise<PoWSolution> {
  // 1. Get challenge from server
  const response = await fetch(`${API_URL}/api/pow-challenge`, {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to get PoW challenge');
  }
  
  const challenge: PoWChallenge = await response.json();
  
  // 2. Solve in Web Worker (background thread)
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('PoW timeout'));
    }, 25000); // 25 second timeout
    
    const worker = new Worker(
      new URL('./pow-worker.ts', import.meta.url),
      { type: 'module' }
    );
    
    worker.onmessage = (e) => {
      if (e.data.nonce !== undefined) {
        clearTimeout(timeout);
        worker.terminate();
        resolve({
          challengeId: challenge.challengeId,
          nonce: e.data.nonce
        });
      }
      // Progress updates are ignored (could be used for UI feedback)
    };
    
    worker.onerror = (err) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(err);
    };
    
    // Start solving
    worker.postMessage({
      challenge: challenge.challenge,
      difficulty: challenge.difficulty
    });
  });
}
