import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

export function ConnectionStatus() {
  const { connectionStatus, peers } = useAppStore();

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500";
      case "scanning":
        return "bg-yellow-500 animate-pulse";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return `${peers.size} connected`;
      case "scanning":
        return "Scanning...";
      default:
        return "Offline";
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={cn("h-2 w-2 rounded-full", getStatusColor())} />
      <span className="text-muted-foreground">{getStatusText()}</span>
    </div>
  );
}
