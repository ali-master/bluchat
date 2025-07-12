import { Menu, Info, Bluetooth } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";
import { ConnectionStatus } from "./connection-status";
import { ThemeToggle } from "./theme-toggle";
import { SearchBox } from "./search-box";
import { toast } from "sonner";

export function Header() {
  const { toggleSidebar, setScanning, getPeerCount } = useAppStore();

  const handleStartScanning = async () => {
    if (!window.bluetoothService) return;

    // Show connection instructions
    toast.info("Connection Guide", {
      description:
        "1. One device should click 'Start Advertising' in Network Status\n2. The other device should click 'Scan' to find and connect",
      duration: 5000,
    });

    try {
      setScanning(true);

      // Start scanning (non-blocking)
      await window.bluetoothService.startScanning();

      // Then try to connect to a device
      await window.bluetoothService.connectToNewDevice();

      if (getPeerCount() > 0) {
        toast.success("Connected successfully!");
      }
    } catch (error) {
      console.error("Scanning/connection error:", error);

      if (error instanceof Error && error.message.includes("User cancelled")) {
        toast.info("Connection cancelled");
      } else if (
        error instanceof Error &&
        error.message.includes("Unsupported device")
      ) {
        toast.error("Device not compatible", {
          description:
            "This device doesn't support the required Bluetooth services. Try connecting from the other device, or use manual WebRTC connection mode.",
          duration: 8000,
        });
      } else {
        toast.error(
          "Connection failed. Make sure Bluetooth is enabled on both devices.",
        );
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <header className="border-b bg-card p-3 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <SearchBox />
        </div>

        <div className="flex items-center gap-4">
          <ConnectionStatus />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              toast("📱 How to Connect Devices", {
                description:
                  "BluChat supports multiple connection methods:\n\n" +
                  "🔵 Bluetooth + WebRTC (Recommended):\n" +
                  "1. Both devices have Bluetooth enabled\n" +
                  "2. One device clicks 'Start Advertising'\n" +
                  "3. Other device clicks 'Scan' and selects device\n" +
                  "4. WebRTC connection established automatically\n\n" +
                  "🟡 WebRTC-only (if Bluetooth fails):\n" +
                  "1. Check browser console for connection details\n" +
                  "2. Manually share Peer ID and Offer/Answer\n" +
                  "3. Direct peer-to-peer connection without Bluetooth\n\n" +
                  "📱 Use Chrome, Edge, or Opera browser",
                duration: 15000,
              });
            }}
            className="flex items-center gap-2"
          >
            <Info className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartScanning}
            className="flex items-center gap-2"
          >
            <Bluetooth className="h-4 w-4" />
            Scan
          </Button>
        </div>
      </div>
    </header>
  );
}
