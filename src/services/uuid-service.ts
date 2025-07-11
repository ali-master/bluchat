import { StorageService } from "./storage-service";

/**
 * UUID configuration for Bluetooth services
 */
interface UUIDConfig {
  /** Main service UUID */
  serviceUUID: string;
  /** Primary characteristic UUID for data transfer */
  characteristicUUID: string;
  /** Notification characteristic UUID */
  notificationUUID: string;
  /** Control characteristic UUID */
  controlUUID: string;
  /** Generated timestamp */
  generatedAt: number;
  /** Application identifier */
  appId: string;
}

/**
 * Service for managing Bluetooth UUIDs with proper generation and persistence
 */
export class UUIDService {
  private static instance: UUIDService;
  private storageService: StorageService;
  private config: UUIDConfig | null = null;

  /** Storage key for UUID configuration */
  private readonly STORAGE_KEY = "bluchat-uuid-config";

  /** Base UUID for custom services (Bluetooth SIG allocated range) */
  private readonly BASE_UUID = "0000xxxx-0000-1000-8000-00805f9b34fb";

  /** Application-specific namespace for UUID generation */
  private readonly APP_NAMESPACE = "bluchat-mesh-2025";

  private constructor() {
    this.storageService = new StorageService();
  }

  /**
   * Get singleton instance
   * @returns UUIDService instance
   */
  static getInstance(): UUIDService {
    if (!UUIDService.instance) {
      UUIDService.instance = new UUIDService();
    }
    return UUIDService.instance;
  }

  /**
   * Initialize UUID service and load or generate UUIDs
   */
  async initialize(): Promise<void> {
    try {
      await this.storageService.init();
      await this.loadOrGenerateUUIDs();
    } catch (error) {
      console.error("Failed to initialize UUID service:", error);
      // Reset database and try again
      try {
        await this.storageService.resetDatabase();
        await this.storageService.init();
        await this.loadOrGenerateUUIDs();
      } catch (resetError) {
        console.error("Failed to reset database:", resetError);
        // Use fallback configuration
        this.config = this.getFallbackConfig();
      }
    }
  }

  /**
   * Load existing UUIDs or generate new ones
   */
  private async loadOrGenerateUUIDs(): Promise<void> {
    try {
      // Try to load existing configuration
      const stored = await this.storageService.getItem(this.STORAGE_KEY);

      if (stored && this.isValidConfig(stored)) {
        this.config = stored;
        console.log("Loaded existing UUID configuration:", this.config);
      } else {
        // Generate new UUIDs
        this.config = await this.generateUUIDConfig();
        await this.storageService.setItem(this.STORAGE_KEY, this.config);
        console.log("Generated new UUID configuration:", this.config);
      }
    } catch (error) {
      console.error("Failed to load/generate UUIDs:", error);
      // Use fallback UUIDs
      this.config = this.getFallbackConfig();
    }
  }

  /**
   * Validate UUID configuration
   * @param config - Configuration to validate
   * @returns Whether configuration is valid
   */
  private isValidConfig(config: any): config is UUIDConfig {
    return (
      config &&
      typeof config.serviceUUID === "string" &&
      typeof config.characteristicUUID === "string" &&
      typeof config.notificationUUID === "string" &&
      typeof config.controlUUID === "string" &&
      typeof config.generatedAt === "number" &&
      typeof config.appId === "string"
    );
  }

  /**
   * Generate new UUID configuration
   * @returns Generated UUID configuration
   */
  private async generateUUIDConfig(): Promise<UUIDConfig> {
    // Generate unique app ID based on installation
    const appId = await this.generateAppId();

    // Generate service-specific UUIDs
    const serviceUUID = this.generateServiceUUID(appId, "main");
    const characteristicUUID = this.generateServiceUUID(appId, "data");
    const notificationUUID = this.generateServiceUUID(appId, "notify");
    const controlUUID = this.generateServiceUUID(appId, "control");

    return {
      serviceUUID,
      characteristicUUID,
      notificationUUID,
      controlUUID,
      generatedAt: Date.now(),
      appId,
    };
  }

  /**
   * Generate unique application ID
   * @returns Application ID
   */
  private async generateAppId(): Promise<string> {
    // Use a combination of timestamp and random values
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const browserInfo = this.getBrowserFingerprint();

    // Create a hash of the combined values
    const combined = `${this.APP_NAMESPACE}-${timestamp}-${random}-${browserInfo}`;
    const hash = await this.hashString(combined);

    // Return first 8 characters of hash
    return hash.substring(0, 8);
  }

  /**
   * Generate a service-specific UUID
   * @param appId - Application identifier
   * @param service - Service name
   * @returns Generated UUID
   */
  private generateServiceUUID(appId: string, service: string): string {
    // Create a deterministic UUID based on app ID and service
    const combined = `${appId}-${service}`;
    const hash = this.simpleHash(combined);

    // Format as 16-bit UUID (4 hex digits)
    const uuid16 = hash.substring(0, 4).toLowerCase();

    // Insert into base UUID template
    return this.BASE_UUID.replace("xxxx", uuid16);
  }

  /**
   * Get browser fingerprint for unique identification
   * @returns Browser fingerprint
   */
  private getBrowserFingerprint(): string {
    const components = [
      navigator.userAgent,
      navigator.language,
      `${screen.width}x${screen.height}`,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
    ];

    return components.join("-");
  }

  /**
   * Create SHA-256 hash of a string
   * @param str - String to hash
   * @returns Hash as hex string
   */
  private async hashString(str: string): Promise<string> {
    if (crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } else {
      // Fallback to simple hash
      return this.simpleHash(str);
    }
  }

  /**
   * Simple hash function for fallback
   * @param str - String to hash
   * @returns Hash as hex string
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }

  /**
   * Get fallback UUID configuration
   * @returns Fallback configuration
   */
  private getFallbackConfig(): UUIDConfig {
    return {
      serviceUUID: "0000ff00-0000-1000-8000-00805f9b34fb",
      characteristicUUID: "0000ff01-0000-1000-8000-00805f9b34fb",
      notificationUUID: "0000ff02-0000-1000-8000-00805f9b34fb",
      controlUUID: "0000ff03-0000-1000-8000-00805f9b34fb",
      generatedAt: Date.now(),
      appId: "fallback",
    };
  }

  /**
   * Get service UUID
   * @returns Service UUID
   */
  getServiceUUID(): string {
    if (!this.config) {
      throw new Error("UUID service not initialized");
    }
    return this.config.serviceUUID;
  }

  /**
   * Get characteristic UUID
   * @returns Characteristic UUID
   */
  getCharacteristicUUID(): string {
    if (!this.config) {
      throw new Error("UUID service not initialized");
    }
    return this.config.characteristicUUID;
  }

  /**
   * Get notification UUID
   * @returns Notification UUID
   */
  getNotificationUUID(): string {
    if (!this.config) {
      throw new Error("UUID service not initialized");
    }
    return this.config.notificationUUID;
  }

  /**
   * Get control UUID
   * @returns Control UUID
   */
  getControlUUID(): string {
    if (!this.config) {
      throw new Error("UUID service not initialized");
    }
    return this.config.controlUUID;
  }

  /**
   * Get full UUID configuration
   * @returns UUID configuration
   */
  getConfig(): UUIDConfig {
    if (!this.config) {
      throw new Error("UUID service not initialized");
    }
    return { ...this.config };
  }

  /**
   * Get app identifier
   * @returns Application ID
   */
  getAppId(): string {
    if (!this.config) {
      throw new Error("UUID service not initialized");
    }
    return this.config.appId;
  }

  /**
   * Regenerate UUIDs (useful for testing or reset)
   * @returns New UUID configuration
   */
  async regenerateUUIDs(): Promise<UUIDConfig> {
    this.config = await this.generateUUIDConfig();
    await this.storageService.setItem(this.STORAGE_KEY, this.config);
    console.log("Regenerated UUID configuration:", this.config);
    return this.config;
  }

  /**
   * Export UUID configuration for sharing
   * @returns Shareable UUID configuration
   */
  exportConfig(): string {
    if (!this.config) {
      throw new Error("UUID service not initialized");
    }

    // Create a shareable format
    const shareableConfig = {
      service: this.config.serviceUUID,
      characteristics: {
        data: this.config.characteristicUUID,
        notification: this.config.notificationUUID,
        control: this.config.controlUUID,
      },
      appId: this.config.appId,
      version: "1.0",
    };

    return JSON.stringify(shareableConfig, null, 2);
  }

  /**
   * Import UUID configuration from shared format
   * @param configStr - Configuration string
   * @returns Whether import was successful
   */
  async importConfig(configStr: string): Promise<boolean> {
    try {
      const imported = JSON.parse(configStr);

      if (imported.service && imported.characteristics) {
        this.config = {
          serviceUUID: imported.service,
          characteristicUUID: imported.characteristics.data,
          notificationUUID: imported.characteristics.notification,
          controlUUID: imported.characteristics.control,
          generatedAt: Date.now(),
          appId: imported.appId || "imported",
        };

        await this.storageService.setItem(this.STORAGE_KEY, this.config);
        return true;
      }
    } catch (error) {
      console.error("Failed to import UUID configuration:", error);
    }

    return false;
  }
}
