import { openDB } from "idb";
import type { IDBPDatabase, DBSchema } from "idb";
import type { Peer, Message, Channel } from "@/types";

interface BluchatDB extends DBSchema {
  messages: {
    key: string;
    value: Message & { savedAt: number };
    indexes: {
      channel: string;
      timestamp: number;
      sender: string;
    };
  };
  channels: {
    key: string;
    value: Channel;
    indexes: {
      lastActivity: number;
    };
  };
  peers: {
    key: string;
    value: Peer & { lastSeen: number };
    indexes: {
      lastSeen: number;
    };
  };
  keys: {
    key: string;
    value: {
      type: string;
      key: string;
      createdAt: number;
    };
  };
  storage: {
    key: string;
    value: {
      key: string;
      data: any;
      createdAt: number;
    };
  };
}

const DB_NAME = "bluchat";
const DB_VERSION = 2;

export class StorageService {
  private db: IDBPDatabase<BluchatDB> | null = null;

  /**
   * Force database reset for development/migration purposes
   */
  async resetDatabase() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    // Delete the database
    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);

    return new Promise<void>((resolve, reject) => {
      deleteRequest.onerror = () => reject(deleteRequest.error);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onblocked = () => {
        console.warn("Database deletion blocked. Please close other tabs.");
        resolve(); // Continue anyway
      };
    });
  }

  isInitialized(): boolean {
    return this.db !== null;
  }

  async init() {
    try {
      console.log("Initializing storage service...");
      this.db = await openDB<BluchatDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion) {
          console.log(`Database upgrade: ${oldVersion} -> ${newVersion}`);

          // Handle version 1 to 2 migration
          if (oldVersion < 1) {
            console.log("Creating initial object stores...");
            // Create initial stores
            if (!db.objectStoreNames.contains("messages")) {
              const messageStore = db.createObjectStore("messages", {
                keyPath: "id",
              });
              messageStore.createIndex("channel", "channel");
              messageStore.createIndex("timestamp", "timestamp");
              messageStore.createIndex("sender", "sender");
            }

            if (!db.objectStoreNames.contains("channels")) {
              const channelStore = db.createObjectStore("channels", {
                keyPath: "name",
              });
              channelStore.createIndex("lastActivity", "lastActivity");
            }

            if (!db.objectStoreNames.contains("peers")) {
              const peerStore = db.createObjectStore("peers", {
                keyPath: "id",
              });
              peerStore.createIndex("lastSeen", "lastSeen");
            }

            if (!db.objectStoreNames.contains("keys")) {
              db.createObjectStore("keys", { keyPath: "type" });
            }
          }

          // Add storage object store in version 2
          if (oldVersion < 2) {
            console.log("Adding storage object store...");
            if (!db.objectStoreNames.contains("storage")) {
              db.createObjectStore("storage", { keyPath: "key" });
            }
          }
        },
      });
      console.log("Storage service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize storage service:", error);
      throw error;
    }
  }

  async saveMessage(message: Message) {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction("messages", "readwrite");
    await tx.objectStore("messages").put({
      ...message,
      savedAt: Date.now(),
    });
    await tx.done;
  }

  async getMessages(channel: string, limit = 100): Promise<Message[]> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction("messages", "readonly");
    const index = tx.objectStore("messages").index("channel");
    const messages = await index.getAll(channel);

    return messages
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-limit)
      .map(({ savedAt, ...msg }) => msg);
  }

  async hasMessage(messageId: string): Promise<boolean> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction("messages", "readonly");
    const message = await tx.objectStore("messages").get(messageId);
    return !!message;
  }

  async deleteOldMessages(maxAge = 7 * 24 * 60 * 60 * 1000) {
    if (!this.db) throw new Error("Database not initialized");

    const cutoff = Date.now() - maxAge;
    const tx = this.db.transaction("messages", "readwrite");
    const store = tx.objectStore("messages");
    const index = store.index("timestamp");

    const range = IDBKeyRange.upperBound(cutoff);

    for await (const cursor of index.iterate(range)) {
      await cursor.delete();
    }

    await tx.done;
  }

  async saveChannel(channel: Channel) {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction("channels", "readwrite");
    await tx.objectStore("channels").put({
      ...channel,
      lastActivity: Date.now(),
    });
    await tx.done;
  }

  async getChannels(): Promise<Channel[]> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction("channels", "readonly");
    const channels = await tx.objectStore("channels").getAll();
    return channels.sort(
      (a, b) => (b.lastActivity || 0) - (a.lastActivity || 0),
    );
  }

  async savePeer(peer: Peer) {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction("peers", "readwrite");
    await tx.objectStore("peers").put({
      ...peer,
      lastSeen: Date.now(),
    });
    await tx.done;
  }

  async getPeers(): Promise<Peer[]> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction("peers", "readonly");
    return await tx.objectStore("peers").getAll();
  }

  async saveKey(type: string, key: string) {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction("keys", "readwrite");
    await tx.objectStore("keys").put({
      type,
      key,
      createdAt: Date.now(),
    });
    await tx.done;
  }

  async getKey(type: string): Promise<string | undefined> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction("keys", "readonly");
    const result = await tx.objectStore("keys").get(type);
    return result?.key;
  }

  async setItem(key: string, value: any) {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const tx = this.db.transaction("storage", "readwrite");
      await tx.objectStore("storage").put({
        key,
        data: value,
        createdAt: Date.now(),
      });
      await tx.done;
      console.log(`Successfully stored item with key: ${key}`);
    } catch (error) {
      console.error(`Failed to store item with key ${key}:`, error);
      throw error;
    }
  }

  async getItem(key: string): Promise<any> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const tx = this.db.transaction("storage", "readonly");
      const result = await tx.objectStore("storage").get(key);
      console.log(`Retrieved item with key ${key}:`, result?.data);
      return result?.data;
    } catch (error) {
      console.error(`Failed to retrieve item with key ${key}:`, error);
      throw error;
    }
  }

  async clearAll() {
    if (!this.db) throw new Error("Database not initialized");

    const stores = [
      "messages",
      "channels",
      "peers",
      "keys",
      "storage",
    ] as const;
    const tx = this.db.transaction(stores, "readwrite");

    for (const store of stores) {
      await tx.objectStore(store).clear();
    }

    await tx.done;
  }

  async exportData() {
    if (!this.db) throw new Error("Database not initialized");

    const data = {
      messages: await this.db.getAll("messages"),
      channels: await this.db.getAll("channels"),
      peers: await this.db.getAll("peers"),
      exportedAt: Date.now(),
    };

    return JSON.stringify(data, null, 2);
  }

  async importData(jsonData: string) {
    if (!this.db) throw new Error("Database not initialized");

    const data = JSON.parse(jsonData);
    const tx = this.db.transaction(
      ["messages", "channels", "peers"],
      "readwrite",
    );

    for (const message of data.messages || []) {
      await tx.objectStore("messages").put(message);
    }

    for (const channel of data.channels || []) {
      await tx.objectStore("channels").put(channel);
    }

    for (const peer of data.peers || []) {
      await tx.objectStore("peers").put(peer);
    }

    await tx.done;
  }
}
