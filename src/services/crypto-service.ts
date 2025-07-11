import nacl from "tweetnacl";
import scrypt from "scrypt-js";
import type { EncryptedData } from "@/types";

export class CryptoService {
  private signKeyPair: nacl.SignKeyPair | null = null;
  private boxKeyPair: nacl.BoxKeyPair | null = null;
  private channelKeys = new Map<string, Uint8Array>();
  private peerKeys = new Map<string, Uint8Array>(); // Shared keys with peers

  private encodeBase64(data: Uint8Array): string {
    return btoa(String.fromCharCode(...data));
  }

  private decodeBase64(data: string): Uint8Array {
    return new Uint8Array(
      atob(data)
        .split("")
        .map((char) => char.charCodeAt(0)),
    );
  }

  private encodeUTF8(text: string): Uint8Array {
    return new TextEncoder().encode(text);
  }

  private decodeUTF8(data: Uint8Array): string {
    return new TextDecoder().decode(data);
  }

  async init() {
    // Initialize signing key pair
    const storedSignPrivateKey = localStorage.getItem(
      "bluchat_sign_private_key",
    );
    if (storedSignPrivateKey) {
      const privateKey = this.decodeBase64(storedSignPrivateKey);
      this.signKeyPair = nacl.sign.keyPair.fromSecretKey(privateKey);
    } else {
      this.signKeyPair = nacl.sign.keyPair();
      localStorage.setItem(
        "bluchat_sign_private_key",
        this.encodeBase64(this.signKeyPair.secretKey),
      );
    }

    // Initialize X25519 key pair for key exchange
    const storedBoxPrivateKey = localStorage.getItem("bluchat_box_private_key");
    if (storedBoxPrivateKey) {
      const privateKey = this.decodeBase64(storedBoxPrivateKey);
      this.boxKeyPair = nacl.box.keyPair.fromSecretKey(privateKey);
    } else {
      this.boxKeyPair = nacl.box.keyPair();
      localStorage.setItem(
        "bluchat_box_private_key",
        this.encodeBase64(this.boxKeyPair.secretKey),
      );
    }
  }

  isInitialized(): boolean {
    return this.signKeyPair !== null && this.boxKeyPair !== null;
  }

  getPublicKey(): string {
    if (!this.signKeyPair) throw new Error("Crypto service not initialized");
    return this.encodeBase64(this.signKeyPair.publicKey);
  }

  getBoxPublicKey(): string {
    if (!this.boxKeyPair) throw new Error("Crypto service not initialized");
    return this.encodeBase64(this.boxKeyPair.publicKey);
  }

  // X25519 key exchange - derive shared secret with peer
  async performKeyExchange(peerBoxPublicKey: string): Promise<string> {
    if (!this.boxKeyPair) throw new Error("Crypto service not initialized");

    const peerPublicKeyBytes = this.decodeBase64(peerBoxPublicKey);
    const sharedSecret = nacl.box.before(
      peerPublicKeyBytes,
      this.boxKeyPair.secretKey,
    );

    // Store shared key for this peer
    this.peerKeys.set(peerBoxPublicKey, sharedSecret);

    return this.encodeBase64(sharedSecret);
  }

  async encryptForPeer(
    message: string,
    peerBoxPublicKey: string,
  ): Promise<EncryptedData> {
    if (!this.boxKeyPair) throw new Error("Crypto service not initialized");

    // Get or derive shared secret
    let sharedSecret = this.peerKeys.get(peerBoxPublicKey);
    if (!sharedSecret) {
      await this.performKeyExchange(peerBoxPublicKey);
      sharedSecret = this.peerKeys.get(peerBoxPublicKey)!;
    }

    const nonce = nacl.randomBytes(24);
    const messageBytes = this.encodeUTF8(message);

    // Use the pre-computed shared secret for faster encryption
    const encrypted = nacl.box.after(messageBytes, nonce, sharedSecret);

    return {
      nonce: this.encodeBase64(nonce),
      ciphertext: this.encodeBase64(encrypted),
    };
  }

  async decryptFromPeer(
    encryptedData: EncryptedData,
    peerBoxPublicKey: string,
  ): Promise<string> {
    if (!this.boxKeyPair) throw new Error("Crypto service not initialized");

    // Get shared secret for this peer
    let sharedSecret = this.peerKeys.get(peerBoxPublicKey);
    if (!sharedSecret) {
      await this.performKeyExchange(peerBoxPublicKey);
      sharedSecret = this.peerKeys.get(peerBoxPublicKey)!;
    }

    const nonce = this.decodeBase64(encryptedData.nonce);
    const ciphertext = this.decodeBase64(encryptedData.ciphertext);

    // Use the pre-computed shared secret for faster decryption
    const decrypted = nacl.box.open.after(ciphertext, nonce, sharedSecret);

    if (!decrypted) {
      throw new Error("Failed to decrypt message");
    }

    return this.decodeUTF8(decrypted);
  }

  async deriveChannelKey(
    channelName: string,
    password: string,
  ): Promise<Uint8Array> {
    const cacheKey = `${channelName}:${password}`;

    if (this.channelKeys.has(cacheKey)) {
      return this.channelKeys.get(cacheKey)!;
    }

    const salt = this.encodeUTF8(`bluchat:${channelName}`);
    const passwordBytes = this.encodeUTF8(password);

    // Use scrypt for key derivation: N=16384, r=8, p=1, dkLen=32
    const key = await scrypt.scrypt(passwordBytes, salt, 16384, 8, 1, 32);

    this.channelKeys.set(cacheKey, key);

    return key;
  }

  async encryptForChannel(
    message: string,
    channelName: string,
    password = "",
  ): Promise<EncryptedData> {
    const key = await this.deriveChannelKey(channelName, password);
    const nonce = nacl.randomBytes(24);
    const messageBytes = this.encodeUTF8(message);

    const encrypted = nacl.secretbox(messageBytes, nonce, key);

    return {
      nonce: this.encodeBase64(nonce),
      ciphertext: this.encodeBase64(encrypted),
    };
  }

  async decryptFromChannel(
    encryptedData: EncryptedData,
    channelName: string,
    password = "",
  ): Promise<string> {
    const key = await this.deriveChannelKey(channelName, password);
    const nonce = this.decodeBase64(encryptedData.nonce);
    const ciphertext = this.decodeBase64(encryptedData.ciphertext);

    const decrypted = nacl.secretbox.open(ciphertext, nonce, key);

    if (!decrypted) {
      throw new Error("Failed to decrypt channel message");
    }

    return this.decodeUTF8(decrypted);
  }

  async signMessage(message: any): Promise<string> {
    if (!this.signKeyPair) throw new Error("Crypto service not initialized");

    const messageBytes = this.encodeUTF8(JSON.stringify(message));
    const signature = nacl.sign.detached(
      messageBytes,
      this.signKeyPair.secretKey,
    );
    return this.encodeBase64(signature);
  }

  async verifyMessage(
    message: any,
    signature: string,
    publicKey: string,
  ): Promise<boolean> {
    const messageBytes = this.encodeUTF8(JSON.stringify(message));
    const signatureBytes = this.decodeBase64(signature);
    const publicKeyBytes = this.decodeBase64(publicKey);

    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes,
    );
  }

  generateMessageId(): string {
    return this.encodeBase64(nacl.randomBytes(16));
  }

  async wipeKeys() {
    this.signKeyPair = null;
    this.boxKeyPair = null;
    this.channelKeys.clear();
    this.peerKeys.clear();
    localStorage.removeItem("bluchat_sign_private_key");
    localStorage.removeItem("bluchat_box_private_key");

    // Generate new keys
    this.signKeyPair = nacl.sign.keyPair();
    this.boxKeyPair = nacl.box.keyPair();
    localStorage.setItem(
      "bluchat_sign_private_key",
      this.encodeBase64(this.signKeyPair.secretKey),
    );
    localStorage.setItem(
      "bluchat_box_private_key",
      this.encodeBase64(this.boxKeyPair.secretKey),
    );
  }
}
