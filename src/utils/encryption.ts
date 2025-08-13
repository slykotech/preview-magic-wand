import React from 'react';

// End-to-end encryption utilities using Web Crypto API
export class E2EEncryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;

  // Generate a new encryption key
  static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  // Export key to store in localStorage or share with partner
  static async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return this.arrayBufferToBase64(exported);
  }

  // Import key from stored format
  static async importKey(keyData: string): Promise<CryptoKey> {
    const keyBuffer = this.base64ToArrayBuffer(keyData);
    return await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt a message
  static async encrypt(message: string, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      key,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return this.arrayBufferToBase64(combined);
  }

  // Decrypt a message
  static async decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
    try {
      const combined = this.base64ToArrayBuffer(encryptedData);
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, this.IV_LENGTH);
      const encrypted = combined.slice(this.IV_LENGTH);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '[Unable to decrypt message]';
    }
  }

  // Derive a shared key from partner's public key and our private key
  static async deriveSharedKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
    const sharedSecret = await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: publicKey,
      },
      privateKey,
      256
    );

    return await crypto.subtle.importKey(
      'raw',
      sharedSecret,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Generate ECDH key pair for key exchange
  static async generateKeyPair(): Promise<CryptoKeyPair> {
    return await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      ['deriveKey', 'deriveBits']
    );
  }

  // Export public key for sharing
  static async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', publicKey);
    return this.arrayBufferToBase64(exported);
  }

  // Import public key from partner
  static async importPublicKey(keyData: string): Promise<CryptoKey> {
    const keyBuffer = this.base64ToArrayBuffer(keyData);
    return await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      []
    );
  }

  // Utility functions
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Generate a simple shared secret from couple ID (fallback method)
  static async generateCoupleSharedKey(coupleId: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const data = encoder.encode(coupleId + 'lovesync-encryption-salt');
    
    // Use PBKDF2 to derive a key from the couple ID
    const baseKey = await crypto.subtle.importKey(
      'raw',
      data,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('lovesync-salt-2024'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }
}

// Hook for managing encryption in chat
export const useE2EEncryption = (coupleId: string | undefined) => {
  const [encryptionKey, setEncryptionKey] = React.useState<CryptoKey | null>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    if (coupleId) {
      initializeEncryption();
    }
  }, [coupleId]);

  const initializeEncryption = async () => {
    if (!coupleId) return;

    try {
      // For simplicity, we'll use a shared key based on couple ID
      // In a production app, you'd want proper key exchange
      const key = await E2EEncryption.generateCoupleSharedKey(coupleId);
      setEncryptionKey(key);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
    }
  };

  const encryptMessage = async (message: string): Promise<string> => {
    if (!encryptionKey) return message;
    
    try {
      return await E2EEncryption.encrypt(message, encryptionKey);
    } catch (error) {
      console.error('Encryption failed:', error);
      return message;
    }
  };

  const decryptMessage = async (encryptedMessage: string): Promise<string> => {
    if (!encryptionKey) return encryptedMessage;
    
    try {
      return await E2EEncryption.decrypt(encryptedMessage, encryptionKey);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '[Unable to decrypt]';
    }
  };

  return {
    isInitialized,
    encryptMessage,
    decryptMessage,
  };
};