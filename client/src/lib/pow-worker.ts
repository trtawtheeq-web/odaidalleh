// Proof of Work Web Worker
// Runs in background thread - doesn't block UI
// Finds a nonce where SHA-256(challenge + nonce) starts with `difficulty` zeros in hex

self.onmessage = async (e: MessageEvent) => {
  const { challenge, difficulty } = e.data;
  const prefix = '0'.repeat(difficulty);
  let nonce = 0;
  
  while (true) {
    const data = challenge + nonce.toString();
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (hashHex.startsWith(prefix)) {
      self.postMessage({ nonce: nonce.toString(), hash: hashHex });
      return;
    }
    nonce++;
    
    // Report progress every 10000 iterations
    if (nonce % 10000 === 0) {
      self.postMessage({ progress: nonce });
    }
  }
};
