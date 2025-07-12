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
                  "For Web Bluetooth to work:\n\n" +
                  "• Both devices must have Bluetooth enabled\n" +
                  "• Use Chrome, Edge, or Opera (Safari doesn't support Web Bluetooth)\n" +
                  "• One device clicks 'Start Advertising' (in sidebar)\n" +
                  "• Other device clicks 'Scan' and selects the device\n" +
                  "• Accept the pairing request on both devices",
                duration: 10000,
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
