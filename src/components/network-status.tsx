import { useState, useEffect } from "react";
import { WifiOff, Wifi, Users, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardTitle, CardHeader, CardContent, Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/stores/app-store";
import { AnimatedNumber } from "@/components/ui/animated-number";

interface MeshTopology {
  connectedPeers: any[];
  routingTable: Record<string, string[]>;
  totalConnections: number;
}

export function NetworkStatus() {
  const {
    connectionStatus,
    getPeerCount,
    getMeshTopology,
    startAdvertising,
    stopAdvertising,
    disconnectBluetooth,
  } = useAppStore();

  const [meshData, setMeshData] = useState<MeshTopology>({
    connectedPeers: [],
    routingTable: {},
    totalConnections: 0,
  });

  const [isAdvertising, setIsAdvertising] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const topology = getMeshTopology();
      setMeshData(topology);
    }, 2000);

    return () => clearInterval(interval);
  }, [getMeshTopology]);

  const handleStartAdvertising = async () => {
    try {
      await startAdvertising();
      setIsAdvertising(true);
    } catch (error) {
      console.error("Failed to start advertising:", error);
    }
  };

  const handleStopAdvertising = () => {
    stopAdvertising();
    setIsAdvertising(false);
  };

  const handleDisconnect = () => {
    disconnectBluetooth();
    setIsAdvertising(false);
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <Wifi className="h-6 w-6 text-green-500" />;
      case "scanning":
        return <Network className="h-6 w-6 text-yellow-500" />;
      default:
        return <WifiOff className="h-6 w-6 text-red-500" />;
    }
  };

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500";
      case "scanning":
        return "bg-yellow-500";
      default:
        return "bg-red-500";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {getConnectionIcon()}
          <span className="truncate">Network Status</span>
          <Badge
            variant="outline"
            className={`ml-auto text-xs ${getConnectionColor()}`}
          >
            {connectionStatus}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        {/* Connection Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">
              <AnimatedNumber
                value={getPeerCount()}
                className="text-lg font-bold"
              />
            </div>
            <div className="text-xs text-muted-foreground">Peers</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-primary">
              <AnimatedNumber
                value={meshData.totalConnections}
                className="text-lg font-bold"
              />
            </div>
            <div className="text-xs text-muted-foreground">Routes</div>
          </div>
        </div>

        {/* Mesh Topology Info */}
        {meshData.connectedPeers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Connected Peers</h4>
            <div className="space-y-2">
              {meshData.connectedPeers.slice(0, 3).map((peer, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1 mr-2 text-xs">
                      {peer.name || peer.id}
                    </span>
                    <Badge variant="secondary" className="text-xs px-1">
                      {peer.rssi}dBm
                    </Badge>
                  </div>
                  {peer.latency && (
                    <div className="flex justify-end">
                      <Badge variant="outline" className="text-xs px-1">
                        {peer.latency}ms
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
              {meshData.connectedPeers.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +
                  <AnimatedNumber
                    value={meshData.connectedPeers.length - 3}
                    className="inline"
                  />{" "}
                  more peers
                </div>
              )}
            </div>
          </div>
        )}

        {/* Routing Table Info */}
        {Object.keys(meshData.routingTable).length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Mesh Routes</h4>
            <div className="text-xs text-muted-foreground">
              <AnimatedNumber
                value={Object.keys(meshData.routingTable).length}
                className="inline"
              />{" "}
              routing entries
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-2">
          {!isAdvertising ? (
            <Button
              onClick={handleStartAdvertising}
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              <Network className="h-3 w-3 mr-1" />
              Start Advertising
            </Button>
          ) : (
            <Button
              onClick={handleStopAdvertising}
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              <WifiOff className="h-3 w-3 mr-1" />
              Stop Advertising
            </Button>
          )}

          <Button
            onClick={handleDisconnect}
            variant="destructive"
            size="sm"
            className="w-full text-xs"
          >
            <Users className="h-3 w-3 mr-1" />
            Disconnect All
          </Button>
        </div>

        {/* Status Message */}
        <div className="text-xs text-muted-foreground text-center">
          {connectionStatus === "disconnected" &&
            "Not connected to mesh network"}
          {connectionStatus === "scanning" && "Scanning for nearby devices..."}
          {connectionStatus === "connected" &&
            `Connected to ${getPeerCount()} peer${getPeerCount() !== 1 ? "s" : ""}`}
        </div>
      </CardContent>
    </Card>
  );
}
