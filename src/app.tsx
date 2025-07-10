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
import { cn } from "@/lib/utils";

// Initialize services
const bluetoothService = new BluetoothService();
const storageService = new StorageService();
const cryptoService = new CryptoService();

export function App() {
  const { isSidebarOpen, addMessage, addPeer, removePeer } = useAppStore();
  const { confirm, ConfirmDialog } = useConfirm();

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

    initServices();

    // Set up Bluetooth event listeners
    bluetoothService.on("peer-connected", (peer) => {
      addPeer(peer);
    });

    bluetoothService.on("peer-disconnected", (peerId) => {
      removePeer(peerId);
    });

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

      // Relay message if TTL > 1
      if (message.ttl > 1) {
        await bluetoothService.relayMessage({
          ...message,
          ttl: message.ttl - 1,
        });
      }
    });

    return () => {
      bluetoothService.removeAllListeners();
    };
  }, [addMessage, addPeer, removePeer, confirm]);

  // Make services available globally for components
  if (typeof window !== "undefined") {
    (window as any).bluetoothService = bluetoothService;
    (window as any).storageService = storageService;
    (window as any).cryptoService = cryptoService;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          "flex-1 flex flex-col transition-all duration-300",
          isSidebarOpen ? "ml-64" : "ml-0",
        )}
      >
        <Header />
        <ChatArea />
      </div>
      <Toaster position="top-center" />
      <ConfirmDialog />
    </div>
  );
}
