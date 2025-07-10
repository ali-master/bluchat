import { WifiOff, Wifi } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

export function PeerList() {
  const { peers } = useAppStore();
  const peerArray = Array.from(peers.values());

  const getSignalStrength = (rssi: number) => {
    if (rssi > -50) return 4;
    if (rssi > -60) return 3;
    if (rssi > -70) return 2;
    return 1;
  };

  const getSignalColor = (rssi: number) => {
    if (rssi > -50) return "text-green-500";
    if (rssi > -60) return "text-yellow-500";
    if (rssi > -70) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <div className="p-4">
      <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
        Connected Peers ({peerArray.length})
      </h3>

      {peerArray.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <WifiOff className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">No peers connected</p>
          <p className="text-xs">Tap scan to find nearby devices</p>
        </div>
      ) : (
        <div className="space-y-2">
          {peerArray.map((peer) => (
            <div
              key={peer.id}
              className="flex items-center justify-between p-2 rounded-md hover:bg-accent"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{peer.name}</p>
                <p className="text-xs text-muted-foreground">
                  {peer.id.slice(0, 8)}...
                </p>
              </div>

              <div
                className={cn(
                  "flex items-center gap-1",
                  getSignalColor(peer.rssi),
                )}
              >
                <Wifi className="h-4 w-4" />
                <div className="flex gap-0.5">
                  {[...Array.from({ length: 4 })].map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1 bg-current rounded-full",
                        i < getSignalStrength(peer.rssi)
                          ? "opacity-100"
                          : "opacity-30",
                      )}
                      style={{ height: `${(i + 1) * 3 + 2}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
