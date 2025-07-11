import { useEffect } from "react";
import { Toaster } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { BluetoothService } from "@/services/bluetooth-service";
import { StorageService } from "@/services/storage-service";
import { CryptoService } from "@/services/crypto-service";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { ChatArea } from "@/components/chat-area";
import { useConfirm } from "@/hooks/use-confirm";
import { confirmService } from "@/services/confirm-service";

// Initialize services
const bluetoothService = new BluetoothService();
const storageService = new StorageService();
const cryptoService = new CryptoService();

// Make services available globally immediately
if (typeof window !== "undefined") {
  window.bluetoothService = bluetoothService;
  window.storageService = storageService;
  window.cryptoService = cryptoService;
}

export function App() {
  const { addMessage, addPeer, removePeer, theme } = useAppStore();
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    // Initialize theme on app start
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    // Initialize confirm service
    confirmService.setConfirmFunction(confirm);

    // Initialize services
    const initServices = async () => {
      await storageService.init();
      await cryptoService.init();

      // Load stored messages
      const channels = useAppStore.getState().channels;
      for (const channel of channels) {
        const messages = await storageService.getMessages(channel.name);
        messages.forEach((msg) => {
          addMessage({
            ...msg,
            isMine: msg.sender === cryptoService.getPublicKey(),
            status: "stored",
          });
        });
      }
    };

    void initServices();

    // Set up Bluetooth event listeners
    bluetoothService.on("peer-connected", (peer) => {
      addPeer(peer);
    });

    bluetoothService.on("peer-disconnected", (peerId) => {
      removePeer(peerId);
    });

    // Listen for discovery scan events
    bluetoothService.on("discovery-scan", (data) => {
      console.log("Discovery scan performed:", data);
    });

    // Listen for advertising events
    bluetoothService.on("advertising", (data) => {
      console.log("Advertising:", data);
    });

    // Start advertising automatically
    bluetoothService.startAdvertising().catch(console.error);

    bluetoothService.on("message-received", async (message) => {
      // Handle incoming message
      const { markMessageAsProcessed, processedMessageIds } =
        useAppStore.getState();

      if (processedMessageIds.has(message.id)) {
        return;
      }

      markMessageAsProcessed(message.id);

      let decryptedText = message.text;
      if (message.encrypted && message.channel !== "public") {
        try {
          const channel = useAppStore
            .getState()
            .channels.find((ch) => ch.name === message.channel);
          if (channel) {
            decryptedText = await cryptoService.decryptFromChannel(
              message.encrypted,
              message.channel,
              channel.password || "",
            );
          }
        } catch (error) {
          console.error("Failed to decrypt message:", error);
          return;
        }
      }

      const displayMessage = {
        ...message,
        text: decryptedText,
        isMine: false,
        status: "received" as const,
      };

      await storageService.saveMessage(message);
      addMessage(displayMessage);
    });

    return () => {
      bluetoothService.removeAllListeners();
    };
  }, [addMessage, addPeer, removePeer, confirm]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <ChatArea />
      </div>
      <Toaster position="top-center" />
      <ConfirmDialog />
    </div>
  );
}
