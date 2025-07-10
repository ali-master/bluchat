import nacl from "tweetnacl";
import scrypt from "scrypt-js";
import type { EncryptedData } from "@/types";

export class CryptoService {
  private keyPair: nacl.SignKeyPair | null = null;
  private channelKeys = new Map<string, Uint8Array>();

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
    const storedPrivateKey = localStorage.getItem("bluchat_private_key");

    if (storedPrivateKey) {
      const privateKey = this.decodeBase64(storedPrivateKey);
      this.keyPair = nacl.sign.keyPair.fromSecretKey(privateKey);
    } else {
      this.keyPair = nacl.sign.keyPair();
      localStorage.setItem(
        "bluchat_private_key",
        this.encodeBase64(this.keyPair.secretKey),
      );
    }
  }

  getPublicKey(): string {
    if (!this.keyPair) throw new Error("Crypto service not initialized");
    return this.encodeBase64(this.keyPair.publicKey);
  }

  async encryptForPeer(
    message: string,
    peerPublicKey: string,
  ): Promise<EncryptedData> {
    const ephemeralKeyPair = nacl.box.keyPair();
    const nonce = nacl.randomBytes(24);
    const messageBytes = this.encodeUTF8(message);
    const peerPublicKeyBytes = this.decodeBase64(peerPublicKey);

    const encrypted = nacl.box(
      messageBytes,
      nonce,
      peerPublicKeyBytes,
      ephemeralKeyPair.secretKey,
    );

    return {
      ephemeralPublicKey: this.encodeBase64(ephemeralKeyPair.publicKey),
      nonce: this.encodeBase64(nonce),
      ciphertext: this.encodeBase64(encrypted),
    };
  }

  async decryptFromPeer(encryptedData: EncryptedData): Promise<string> {
    if (!this.keyPair) throw new Error("Crypto service not initialized");

    const ephemeralPublicKey = this.decodeBase64(
      encryptedData.ephemeralPublicKey!,
    );
    const nonce = this.decodeBase64(encryptedData.nonce);
    const ciphertext = this.decodeBase64(encryptedData.ciphertext);

    const decrypted = nacl.box.open(
      ciphertext,
      nonce,
      ephemeralPublicKey,
      this.keyPair.secretKey,
    );

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
    if (!this.keyPair) throw new Error("Crypto service not initialized");

    const messageBytes = this.encodeUTF8(JSON.stringify(message));
    const signature = nacl.sign.detached(messageBytes, this.keyPair.secretKey);
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
    this.keyPair = null;
    this.channelKeys.clear();
    localStorage.removeItem("bluchat_private_key");

    // Generate new keys
    this.keyPair = nacl.sign.keyPair();
    localStorage.setItem(
      "bluchat_private_key",
      this.encodeBase64(this.keyPair.secretKey),
    );
  }
}
