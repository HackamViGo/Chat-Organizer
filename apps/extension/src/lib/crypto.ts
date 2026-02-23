
/**
 * BrainBox Crypto Utilities
 * Used for encrypting/decrypting sensitive tokens in local storage.
 */

async function deriveKey(): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(chrome.runtime.id),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { 
            name: 'PBKDF2', 
            salt: new TextEncoder().encode('brainbox-salt'), 
            iterations: 100000, 
            hash: 'SHA-256' 
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

export async function encryptToken(token: string): Promise<string> {
    if (!token || typeof token !== 'string') return token;
    
    const key = await deriveKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(token);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    
    // Convert to Base64
    return btoa(String.fromCharCode(...combined));
}

export async function decryptToken(encryptedValue: any): Promise<string | null> {
    if (!encryptedValue) return null;
    
    // If it's not a string, it might be old plain data or a corrupted object
    if (typeof encryptedValue !== 'string') {
        console.warn('[Crypto] Attempted to decrypt non-string value:', typeof encryptedValue);
        // If it looks like a JWT, return it as is (fallback for old plain text)
        if (encryptedValue && typeof encryptedValue === 'string' && encryptedValue.split('.').length === 3) {
            return encryptedValue;
        }
        return null;
    }

    try {
        const key = await deriveKey();
        
        // Validate Base64 before attempting atob to avoid DOMException
        const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
        if (!base64Regex.test(encryptedValue)) {
            // Not base64? Maybe it's a plain text JWT
            if (encryptedValue.split('.').length === 3) return encryptedValue;
            throw new Error('Invalid Base64 character in encrypted value');
        }

        const combinedString = atob(encryptedValue);
        const combined = new Uint8Array(combinedString.length);
        for (let i = 0; i < combinedString.length; i++) {
            combined[i] = combinedString.charCodeAt(i);
        }
        
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);
        
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
        return new TextDecoder().decode(decrypted);
    } catch (e) {
        console.error('[Crypto] Decryption failed:', e);
        // Fallback: If it's a valid JWT, return it
        if (typeof encryptedValue === 'string' && encryptedValue.split('.').length === 3) {
            return encryptedValue;
        }
        return null;
    }
}
