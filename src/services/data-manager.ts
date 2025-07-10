import type { StorageService } from "./storage-service";
import type { Channel } from "@/types";

export class DataManager {
  constructor(private storageService: StorageService) {}

  async initializeApp() {
    await this.storageService.init();
  }

  async cleanupOldData() {
    // Delete messages older than 7 days
    await this.storageService.deleteOldMessages();
  }

  async manageChannels() {
    const channels = await this.storageService.getChannels();
    console.log("Available channels:", channels);

    // Save a sample channel if none exist
    if (channels.length === 0) {
      const defaultChannel: Channel = {
        name: "general",
        password: null,
        createdAt: Date.now(),
      };
      await this.storageService.saveChannel(defaultChannel);
    }
  }

  async managePeers() {
    const peers = await this.storageService.getPeers();
    console.log("Known peers:", peers);

    // Clean up old peers (example)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentPeers = peers.filter((peer) => peer.lastSeen > oneDayAgo);

    // Save active peers back
    for (const peer of recentPeers) {
      await this.storageService.savePeer(peer);
    }
  }

  async manageKeys() {
    // Save app configuration keys
    await this.storageService.saveKey("app_version", "1.0.0");
    await this.storageService.saveKey("last_cleanup", Date.now().toString());

    // Retrieve keys
    const version = await this.storageService.getKey("app_version");
    const lastCleanup = await this.storageService.getKey("last_cleanup");

    console.log("App version:", version);
    console.log("Last cleanup:", lastCleanup);
  }

  async exportBackup(): Promise<string> {
    return await this.storageService.exportData();
  }

  async importBackup(jsonData: string): Promise<void> {
    await this.storageService.importData(jsonData);
  }

  async checkMessageExists(messageId: string): Promise<boolean> {
    return await this.storageService.hasMessage(messageId);
  }

  async resetAllData(): Promise<void> {
    await this.storageService.clearAll();
  }
}
