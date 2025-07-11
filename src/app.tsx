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
  const { theme } = useAppStore();
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    // Initialize theme on app start
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    // Initialize confirm service
    confirmService.setConfirmFunction(confirm);

    // Initialize all services
    const initServices = async () => {
      try {
        console.log("Initializing all services...");

        // Initialize storage service first
        await storageService.init();
        console.log("✓ Storage service initialized");

        // Initialize crypto service
        await cryptoService.init();
        console.log("✓ Crypto service initialized");

        // Bluetooth service initializes itself automatically
        console.log("✓ Bluetooth service initializing...");

        // Load stored messages
        const { channels, addMessage: addMsg } = useAppStore.getState();
        for (const channel of channels) {
          const messages = await storageService.getMessages(channel.name);
          messages.forEach((msg) => {
            addMsg({
              ...msg,
              isMine: msg.sender === cryptoService.getPublicKey(),
              status: "stored",
            });
          });
        }

        console.log("✓ All services initialized successfully");
        useAppStore.getState().setServicesInitialized(true);
      } catch (error) {
        console.error("Failed to initialize services:", error);
        useAppStore.getState().setServicesInitialized(false);
        // You might want to show a toast or error message to the user
      }
    };

    void initServices();

    // Set up Bluetooth event listeners
    bluetoothService.on("peer-connected", (peer) => {
      useAppStore.getState().addPeer(peer);
    });

    bluetoothService.on("peer-disconnected", (peerId) => {
      useAppStore.getState().removePeer(peerId);
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
      useAppStore.getState().addMessage(displayMessage);
    });

    return () => {
      bluetoothService.removeAllListeners();
    };
  }, []); // Empty dependency array - initialization should only happen once

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
