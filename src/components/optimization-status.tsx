import { useState, useEffect } from "react";
import { Zap, ChevronRight, ChevronDown, Activity } from "lucide-react";
import { CardTitle, CardHeader, CardContent, Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScanMode {
  interval: number;
  duration: number;
  passive: boolean;
  powerLevel: "low" | "medium" | "high";
}

interface OptimizationStats {
  totalScans: number;
  averageDevicesPerScan: number;
  averageConnectionRate: number;
  currentMode: ScanMode;
}

interface CoordinationStats {
  totalNodes: number;
  activeNodes: number;
  bridges: number;
  averageConnections: number;
}

/**
 * Component to display Bluetooth scanning optimization and mesh coordination status
 */
export function OptimizationStatus() {
  const [optimizationStats, setOptimizationStats] =
    useState<OptimizationStats | null>(null);
  const [coordinationStats, setCoordinationStats] =
    useState<CoordinationStats | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      if (window.bluetoothService) {
        const optStats = window.bluetoothService.getScanOptimizationStats();
        const coordStats = window.bluetoothService.getMeshCoordinationStats();

        setOptimizationStats(optStats);
        setCoordinationStats(coordStats);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Get scan mode display name
   */
  const getScanModeName = (mode: ScanMode): string => {
    if (mode.interval <= 5000) return "Aggressive";
    if (mode.interval <= 15000) return "Balanced";
    if (mode.interval <= 30000) return "Conservative";
    return "Minimal";
  };

  /**
   * Get scan mode color
   */
  const getScanModeColor = (mode: ScanMode): string => {
    if (mode.interval <= 5000) return "text-red-500";
    if (mode.interval <= 15000) return "text-yellow-500";
    if (mode.interval <= 30000) return "text-blue-500";
    return "text-green-500";
  };

  /**
   * Get power level icon
   */
  const getPowerLevelIcon = (level: string) => {
    switch (level) {
      case "high":
        return <Zap className="h-3 w-3 text-red-500" />;
      case "medium":
        return <Zap className="h-3 w-3 text-yellow-500" />;
      case "low":
        return <Zap className="h-3 w-3 text-green-500" />;
      default:
        return null;
    }
  };

  /**
   * Set manual scan mode
   */
  const setScanMode = (
    mode: "aggressive" | "balanced" | "conservative" | "minimal",
  ) => {
    if (window.bluetoothService) {
      window.bluetoothService.setScanMode(mode);
    }
  };

  if (!optimizationStats || !coordinationStats) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader
        className="pb-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4" />
          <span className="truncate">Optimization Status</span>
          <Badge
            variant="outline"
            className={cn(
              "ml-auto text-xs",
              getScanModeColor(optimizationStats.currentMode),
            )}
          >
            {getScanModeName(optimizationStats.currentMode)}
          </Badge>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 transition-transform duration-200" />
          ) : (
            <ChevronRight className="h-4 w-4 transition-transform duration-200" />
          )}
        </CardTitle>
      </CardHeader>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <CardContent className="space-y-3 p-3">
          {/* Scan Statistics */}
          <div>
            <h4 className="text-xs font-medium mb-2">Scan Performance</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total Scans</span>
                <AnimatedNumber
                  value={optimizationStats.totalScans}
                  className="font-medium"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Avg Devices/Scan</span>
                <AnimatedNumber
                  value={Number(
                    optimizationStats.averageDevicesPerScan.toFixed(1),
                  )}
                  className="font-medium"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Connection Rate</span>
                <div className="flex items-center gap-2">
                  <Progress
                    value={optimizationStats.averageConnectionRate * 100}
                    className="w-16 h-2"
                  />
                  <span className="font-medium">
                    {(optimizationStats.averageConnectionRate * 100).toFixed(0)}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Current Scan Mode */}
          <div>
            <h4 className="text-xs font-medium mb-2">Current Mode</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Interval</span>
                <span className="font-medium">
                  {(optimizationStats.currentMode.interval / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">
                  {(optimizationStats.currentMode.duration / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Power</span>
                <div className="flex items-center gap-1">
                  {getPowerLevelIcon(optimizationStats.currentMode.powerLevel)}
                  <span className="font-medium capitalize">
                    {optimizationStats.currentMode.powerLevel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mesh Coordination */}
          <div>
            <h4 className="text-xs font-medium mb-2">Mesh Coordination</h4>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <div className="text-sm font-bold text-primary">
                  <AnimatedNumber value={coordinationStats.activeNodes} />
                  <span className="text-xs text-muted-foreground">
                    /{coordinationStats.totalNodes}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Active Nodes
                </div>
              </div>
              <div>
                <div className="text-sm font-bold text-primary">
                  <AnimatedNumber value={coordinationStats.bridges} />
                </div>
                <div className="text-xs text-muted-foreground">Bridges</div>
              </div>
            </div>
          </div>

          {/* Manual Mode Selection */}
          <div>
            <h4 className="text-xs font-medium mb-2">Manual Override</h4>
            <div className="grid grid-cols-2 gap-1">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => setScanMode("aggressive")}
              >
                Aggressive
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => setScanMode("balanced")}
              >
                Balanced
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => setScanMode("conservative")}
              >
                Conservative
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => setScanMode("minimal")}
              >
                Minimal
              </Button>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
