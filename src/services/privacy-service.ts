import nacl from "tweetnacl";
import { EventEmitter } from "@/utils/event-emitter";

interface EphemeralIdentity {
  id: string;
  keyPair: nacl.BoxKeyPair;
  signKeyPair: nacl.SignKeyPair;
  createdAt: number;
  expiresAt: number;
}

interface CoverTrafficOptions {
  enabled: boolean;
  interval: number; // milliseconds
  randomDelay: number; // max random delay
}

export class PrivacyService extends EventEmitter {
  private currentIdentity: EphemeralIdentity | null = null;
  private identityRotationInterval: NodeJS.Timeout | null = null;
  private coverTrafficInterval: NodeJS.Timeout | null = null;
  private coverTrafficOptions: CoverTrafficOptions = {
    enabled: false,
    interval: 60000, // 1 minute
    randomDelay: 30000, // 30 seconds
  };

  // Identity rotation every 2 hours by default
  private readonly IDENTITY_LIFETIME = 2 * 60 * 60 * 1000;

  async init(): Promise<void> {
    await this.generateNewIdentity();
    this.startIdentityRotation();
  }

  async generateNewIdentity(): Promise<EphemeralIdentity> {
    const boxKeyPair = nacl.box.keyPair();
    const signKeyPair = nacl.sign.keyPair();
    const now = Date.now();

    const identity: EphemeralIdentity = {
      id: this.generateEphemeralId(),
      keyPair: boxKeyPair,
      signKeyPair,
      createdAt: now,
      expiresAt: now + this.IDENTITY_LIFETIME,
    };

    const oldIdentity = this.currentIdentity;
    this.currentIdentity = identity;

    this.emit("identity-changed", {
      old: oldIdentity,
      new: identity,
    });

    console.log(`Generated new ephemeral identity: ${identity.id}`);
    return identity;
  }

  private generateEphemeralId(): string {
    // Generate a random ephemeral ID using high-entropy randomness
    const randomBytes = nacl.randomBytes(16);
    return Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  getCurrentIdentity(): EphemeralIdentity | null {
    return this.currentIdentity;
  }

  getCurrentPublicKeys(): {
    boxPublicKey: string;
    signPublicKey: string;
  } | null {
    if (!this.currentIdentity) return null;

    return {
      boxPublicKey: this.encodeBase64(this.currentIdentity.keyPair.publicKey),
      signPublicKey: this.encodeBase64(
        this.currentIdentity.signKeyPair.publicKey,
      ),
    };
  }

  private startIdentityRotation(): void {
    if (this.identityRotationInterval) return;

    this.identityRotationInterval = setInterval(() => {
      this.rotateIdentity();
    }, this.IDENTITY_LIFETIME);
  }

  private async rotateIdentity(): Promise<void> {
    if (!this.currentIdentity) return;

    // Check if current identity has expired
    const now = Date.now();
    if (now >= this.currentIdentity.expiresAt) {
      await this.generateNewIdentity();
    }
  }

  stopIdentityRotation(): void {
    if (this.identityRotationInterval) {
      clearInterval(this.identityRotationInterval);
      this.identityRotationInterval = null;
    }
  }

  // Cover traffic generation
  enableCoverTraffic(options?: Partial<CoverTrafficOptions>): void {
    this.coverTrafficOptions = {
      ...this.coverTrafficOptions,
      ...options,
      enabled: true,
    };
    this.startCoverTraffic();
  }

  disableCoverTraffic(): void {
    this.coverTrafficOptions.enabled = false;
    this.stopCoverTraffic();
  }

  private startCoverTraffic(): void {
    if (this.coverTrafficInterval || !this.coverTrafficOptions.enabled) return;

    this.coverTrafficInterval = setInterval(() => {
      this.generateCoverTraffic();
    }, this.coverTrafficOptions.interval);
  }

  private generateCoverTraffic(): void {
    // Add random delay to timing
    const delay = Math.random() * this.coverTrafficOptions.randomDelay;

    setTimeout(() => {
      const coverMessage = this.createCoverMessage();
      this.emit("cover-traffic", coverMessage);
    }, delay);
  }

  private createCoverMessage(): any {
    // Generate dummy message for cover traffic
    const dummyTexts = [
      "ping",
      "status check",
      "network test",
      "keep alive",
      "heartbeat",
    ];

    const randomText =
      dummyTexts[Math.floor(Math.random() * dummyTexts.length)];

    return {
      id: this.generateEphemeralId(),
      text: randomText,
      channel: "system",
      timestamp: Date.now(),
      isCoverTraffic: true,
      ttl: 1, // Cover traffic should not propagate far
    };
  }

  private stopCoverTraffic(): void {
    if (this.coverTrafficInterval) {
      clearInterval(this.coverTrafficInterval);
      this.coverTrafficInterval = null;
    }
  }

  // Timing randomization to prevent traffic analysis
  addTimingNoise(baseDelay: number = 0): number {
    // Add random jitter to transmission timing
    const jitter = Math.random() * 2000; // 0-2 seconds
    return baseDelay + jitter;
  }

  // Message padding for uniform size
  padMessage(message: string, targetSize: number = 256): string {
    if (message.length >= targetSize) {
      return message;
    }

    // Add random padding to reach target size
    const paddingNeeded = targetSize - message.length;
    const padding = this.generateRandomPadding(paddingNeeded);

    return `${message}\x00${padding}`; // Null separator + padding
  }

  removePadding(paddedMessage: string): string {
    const nullIndex = paddedMessage.indexOf("\x00");
    return nullIndex !== -1
      ? paddedMessage.substring(0, nullIndex)
      : paddedMessage;
  }

  private generateRandomPadding(length: number): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  // Anonymity set management
  isPartOfAnonymitySet(_peerId: string, _minimumSetSize: number = 3): boolean {
    // In a real implementation, this would check the current anonymity set
    // For now, assume we have sufficient anonymity if we have multiple peers
    return true; // Simplified for demo
  }

  // Privacy metrics
  getPrivacyMetrics(): any {
    return {
      currentIdentityAge: this.currentIdentity
        ? Date.now() - this.currentIdentity.createdAt
        : 0,
      identityRotationEnabled: !!this.identityRotationInterval,
      coverTrafficEnabled: this.coverTrafficOptions.enabled,
      nextIdentityRotation: this.currentIdentity
        ? this.currentIdentity.expiresAt - Date.now()
        : 0,
    };
  }

  private encodeBase64(data: Uint8Array): string {
    return btoa(String.fromCharCode(...data));
  }

  destroy(): void {
    this.stopIdentityRotation();
    this.stopCoverTraffic();
    this.currentIdentity = null;
    this.removeAllListeners();
  }
}
