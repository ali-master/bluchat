import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import type { Peer, Message, EncryptedData, Channel } from "@/types";
import { CryptoService } from "@/services/crypto-service";
import { ChannelService } from "@/services/channel-service";
import { PrivacyService } from "@/services/privacy-service";

interface AppState {
  // Connection state
  isScanning: boolean;
  peers: Map<string, Peer>;
  connectionStatus: "connected" | "disconnected" | "scanning";

  // Messages state
  messages: Message[];
  processedMessageIds: Set<string>;

  // Channel state
  currentChannel: string;
  channels: Channel[];

  // UI state
  isSidebarOpen: boolean;
  theme: "light" | "dark";
  searchQuery: string;
  searchResults: Message[];

  // Services
  cryptoService: CryptoService;
  channelService: ChannelService;
  privacyService: PrivacyService;
  publicKey: string | null;

  // Actions
  setScanning: (isScanning: boolean) => void;
  addPeer: (peer: Peer) => void;
  removePeer: (peerId: string) => void;
  updatePeerRssi: (peerId: string, rssi: number) => void;

  // Bluetooth service actions
  startAdvertising: () => Promise<void>;
  stopAdvertising: () => void;
  getMeshTopology: () => any;
  disconnectBluetooth: () => void;

  addMessage: (message: Message) => void;
  updateMessageStatus: (messageId: string, status: Message["status"]) => void;
  markMessageAsProcessed: (messageId: string) => void;

  setCurrentChannel: (channel: string) => void;
  addChannel: (channel: Channel) => void;
  removeChannel: (channelName: string) => void;
  joinChannelWithState: (
    channelName: string,
    password?: string,
  ) => Promise<void>;
  leaveChannelWithState: (channelName: string) => Promise<void>;

  // Channel service actions
  discoverChannel: (channelName: string) => Promise<void>;
  getChannelState: (channelName: string) => any;
  getActiveChannels: () => any[];
  getAllChannels: () => any[];
  startChannelDiscovery: () => void;
  stopChannelDiscovery: () => void;
  updateChannelActivity: (channelName: string) => void;
  hasOwnerPrivileges: (channelName: string, userId: string) => boolean;
  setChannelOwner: (channelName: string, userId: string) => void;

  toggleSidebar: () => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;

  // Search actions
  setSearchQuery: (query: string) => void;
  searchMessages: (query: string) => void;
  clearSearch: () => void;

  // Crypto actions
  initializeCrypto: () => Promise<void>;
  encryptMessage: (text: string, recipient?: string) => Promise<EncryptedData>;
  decryptMessage: (
    encryptedData: EncryptedData,
    sender?: string,
  ) => Promise<string>;
  signMessage: (message: Message) => Promise<string>;
  verifyMessage: (
    message: Message,
    signature: string,
    publicKey: string,
  ) => Promise<boolean>;
  generateMessageId: () => string;
  wipeKeys: () => Promise<void>;

  // Getters
  getMessagesForChannel: (channel: string) => Message[];
  getPeerCount: () => number;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        isScanning: false,
        peers: new Map(),
        connectionStatus: "disconnected",
        messages: [],
        processedMessageIds: new Set(),
        currentChannel: "public",
        channels: [{ name: "public", password: null, createdAt: Date.now() }],
        isSidebarOpen: true,
        theme: "dark",
        searchQuery: "",
        searchResults: [],
        cryptoService: new CryptoService(),
        channelService: new ChannelService(),
        privacyService: new PrivacyService(),
        publicKey: null,

        // Connection actions
        setScanning: (isScanning) =>
          set({
            isScanning,
            connectionStatus: isScanning
              ? "scanning"
              : get().peers.size > 0
                ? "connected"
                : "disconnected",
          }),

        addPeer: (peer) =>
          set((state) => {
            const peers = new Map(state.peers);
            peers.set(peer.id, peer);
            return {
              peers,
              connectionStatus: "connected",
            };
          }),

        removePeer: (peerId) =>
          set((state) => {
            const peers = new Map(state.peers);
            peers.delete(peerId);
            return {
              peers,
              connectionStatus: peers.size > 0 ? "connected" : "disconnected",
            };
          }),

        updatePeerRssi: (peerId, rssi) =>
          set((state) => {
            const peers = new Map(state.peers);
            const peer = peers.get(peerId);
            if (peer) {
              peers.set(peerId, { ...peer, rssi });
            }
            return { peers };
          }),

        // Message actions
        addMessage: (message) =>
          set((state) => ({
            messages: [...state.messages, message],
          })),

        updateMessageStatus: (messageId, status) =>
          set((state) => ({
            messages: state.messages.map((msg) =>
              msg.id === messageId ? { ...msg, status } : msg,
            ),
          })),

        markMessageAsProcessed: (messageId) =>
          set((state) => {
            const processedMessageIds = new Set(state.processedMessageIds);
            processedMessageIds.add(messageId);
            return { processedMessageIds };
          }),

        // Channel actions
        setCurrentChannel: (channel) => set({ currentChannel: channel }),

        addChannel: (channel) =>
          set((state) => ({
            channels: [...state.channels, channel],
          })),

        removeChannel: (channelName) =>
          set((state) => ({
            channels: state.channels.filter((ch) => ch.name !== channelName),
            currentChannel:
              state.currentChannel === channelName
                ? "public"
                : state.currentChannel,
          })),

        joinChannelWithState: async (channelName, password) => {
          const { channelService } = get();
          try {
            await channelService.joinChannel(channelName, password);
            // Channel will be added via event listener
          } catch (error) {
            console.error("Failed to join channel:", error);
            throw error;
          }
        },

        leaveChannelWithState: async (channelName) => {
          const { channelService } = get();
          try {
            await channelService.leaveChannel(channelName);
            // Channel will be removed via event listener
          } catch (error) {
            console.error("Failed to leave channel:", error);
            throw error;
          }
        },

        // UI actions
        toggleSidebar: () =>
          set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

        setTheme: (theme) => {
          set({ theme });
          document.documentElement.classList.toggle("dark", theme === "dark");
        },

        toggleTheme: () => {
          const newTheme = get().theme === "light" ? "dark" : "light";
          get().setTheme(newTheme);
        },

        // Search actions
        setSearchQuery: (query) => set({ searchQuery: query }),

        searchMessages: (query) => {
          if (!query.trim()) {
            set({ searchResults: [] });
            return;
          }

          const { messages } = get();
          const results = messages.filter((message) =>
            message.text?.toLowerCase().includes(query.toLowerCase()),
          );

          set({ searchResults: results, searchQuery: query });
        },

        clearSearch: () => set({ searchQuery: "", searchResults: [] }),

        // Service initialization
        initializeCrypto: async () => {
          const { cryptoService, privacyService } = get();
          await cryptoService.init();
          await privacyService.init();
          set({ publicKey: cryptoService.getPublicKey() });
        },

        encryptMessage: async (text, recipient) => {
          const { cryptoService, currentChannel, channels } = get();
          const channel = channels.find((ch) => ch.name === currentChannel);

          if (recipient) {
            // Encrypt for specific peer
            return await cryptoService.encryptForPeer(text, recipient);
          } else {
            // Encrypt for channel
            return await cryptoService.encryptForChannel(
              text,
              currentChannel,
              channel?.password || "",
            );
          }
        },

        decryptMessage: async (encryptedData, sender) => {
          const { cryptoService, currentChannel, channels } = get();
          const channel = channels.find((ch) => ch.name === currentChannel);

          if (sender) {
            // Decrypt from specific peer - need peer's box public key
            // For now, using sender as the box public key (this would need proper peer management)
            return await cryptoService.decryptFromPeer(encryptedData, sender);
          } else {
            // Decrypt from channel
            return await cryptoService.decryptFromChannel(
              encryptedData,
              currentChannel,
              channel?.password || "",
            );
          }
        },

        signMessage: async (message) => {
          const { cryptoService } = get();
          return await cryptoService.signMessage(message);
        },

        verifyMessage: async (message, signature, publicKey) => {
          const { cryptoService } = get();
          return await cryptoService.verifyMessage(
            message,
            signature,
            publicKey,
          );
        },

        generateMessageId: () => {
          const { cryptoService } = get();
          return cryptoService.generateMessageId();
        },

        wipeKeys: async () => {
          const { cryptoService } = get();
          await cryptoService.wipeKeys();
          set({ publicKey: cryptoService.getPublicKey() });
        },

        // Bluetooth service actions
        startAdvertising: async () => {
          if (window.bluetoothService) {
            await window.bluetoothService.startAdvertising();
          }
        },

        stopAdvertising: () => {
          if (window.bluetoothService) {
            window.bluetoothService.stopAdvertising();
          }
        },

        getMeshTopology: () => {
          if (window.bluetoothService) {
            return window.bluetoothService.getMeshTopology();
          }
          return { connectedPeers: [], routingTable: {}, totalConnections: 0 };
        },

        disconnectBluetooth: () => {
          if (window.bluetoothService) {
            window.bluetoothService.disconnect();
          }
          set({
            peers: new Map(),
            connectionStatus: "disconnected",
            isScanning: false,
          });
        },

        // Channel service actions
        discoverChannel: async (channelName) => {
          const { channelService } = get();
          await channelService.discoverChannel(channelName);
        },

        getChannelState: (channelName) => {
          const { channelService } = get();
          return channelService.getChannelState(channelName);
        },

        getActiveChannels: () => {
          const { channelService } = get();
          return channelService.getActiveChannels();
        },

        getAllChannels: () => {
          const { channelService } = get();
          return channelService.getAllChannels();
        },

        startChannelDiscovery: () => {
          const { channelService } = get();
          channelService.startChannelDiscovery();
        },

        stopChannelDiscovery: () => {
          const { channelService } = get();
          channelService.stopChannelDiscovery();
        },

        updateChannelActivity: (channelName) => {
          const { channelService } = get();
          channelService.updateChannelActivity(channelName);
        },

        hasOwnerPrivileges: (channelName, userId) => {
          const { channelService } = get();
          return channelService.hasOwnerPrivileges(channelName, userId);
        },

        setChannelOwner: (channelName, userId) => {
          const { channelService } = get();
          channelService.setChannelOwner(channelName, userId);
        },

        // Getters
        getMessagesForChannel: (channel) => {
          return get().messages.filter((msg) => msg.channel === channel);
        },

        getPeerCount: () => get().peers.size,
      }),
      {
        name: "bluchat-store",
        partialize: (state) => ({
          channels: state.channels,
          currentChannel: state.currentChannel,
          theme: state.theme,
        }),
      },
    ),
  ),
);
