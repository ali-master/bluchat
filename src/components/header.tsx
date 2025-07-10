import { Menu, Bluetooth } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";
import { ConnectionStatus } from "./connection-status";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  const { toggleSidebar, setScanning } = useAppStore();

  const handleStartScanning = () => {
    const bluetoothService = (window as any).bluetoothService;
    if (bluetoothService) {
      setScanning(true);
      bluetoothService.startScanning().finally(() => {
        setScanning(false);
      });
    }
  };

  return (
    <header className="border-b bg-card p-4">
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
          <h1 className="text-xl font-semibold">BluChat</h1>
        </div>

        <div className="flex items-center gap-4">
          <ConnectionStatus />
          <ThemeToggle />
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
