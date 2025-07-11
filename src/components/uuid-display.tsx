import { useState, useEffect } from "react";
import {
  Upload,
  RefreshCw,
  Download,
  Copy,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { CardTitle, CardHeader, CardContent, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UUIDConfig {
  serviceUUID: string;
  characteristicUUID: string;
  notificationUUID: string;
  controlUUID: string;
  generatedAt: number;
  appId: string;
}

/**
 * Component to display and manage Bluetooth UUIDs
 */
export function UUIDDisplay() {
  const [config, setConfig] = useState<UUIDConfig | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importConfig, setImportConfig] = useState("");

  useEffect(() => {
    const updateConfig = () => {
      if (window.bluetoothService && window.bluetoothService.isReady()) {
        try {
          const uuidConfig = window.bluetoothService.getUUIDConfig();
          setConfig(uuidConfig);
        } catch (error) {
          console.error("Failed to get UUID config:", error);
        }
      }
    };

    updateConfig();

    // Listen for service initialization
    if (window.bluetoothService) {
      const handleInitialized = () => updateConfig();
      const handleRegenerated = () => updateConfig();

      window.bluetoothService.on("service-initialized", handleInitialized);
      window.bluetoothService.on("uuids-regenerated", handleRegenerated);

      return () => {
        window.bluetoothService.off("service-initialized", handleInitialized);
        window.bluetoothService.off("uuids-regenerated", handleRegenerated);
      };
    }
  }, []);

  /**
   * Copy UUID to clipboard
   * @param uuid - UUID to copy
   * @param type - Type of UUID for feedback
   */
  const copyToClipboard = async (uuid: string, type: string) => {
    try {
      await navigator.clipboard.writeText(uuid);
      toast.success(`${type} UUID copied to clipboard`);
    } catch (error) {
      console.error("Failed to copy UUID:", error);
      toast.error(`Failed to copy ${type} UUID`);
    }
  };

  /**
   * Regenerate all UUIDs
   */
  const handleRegenerate = async () => {
    if (!window.bluetoothService) {
      console.error("BluetoothService not available");
      return;
    }

    if (!window.bluetoothService.isReady()) {
      console.error("BluetoothService not ready");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Regenerating UUIDs...");
      const newConfig = await window.bluetoothService.regenerateUUIDs();
      console.log("New UUID config:", newConfig);
      setConfig(newConfig);
    } catch (error) {
      console.error("Failed to regenerate UUIDs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Export UUID configuration
   */
  const handleExport = () => {
    if (!window.bluetoothService) return;

    try {
      const exportedConfig = window.bluetoothService.exportUUIDConfig();

      // Download as file
      const blob = new Blob([exportedConfig], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bluchat-uuids-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export UUIDs:", error);
    }
  };

  /**
   * Import UUID configuration
   */
  const handleImport = async () => {
    if (!window.bluetoothService || !importConfig.trim()) return;

    setIsLoading(true);
    try {
      const success =
        await window.bluetoothService.importUUIDConfig(importConfig);
      if (success) {
        const newConfig = window.bluetoothService.getUUIDConfig();
        setConfig(newConfig);
        setImportConfig("");
        setShowImport(false);
      } else {
        console.error("Failed to import UUID configuration");
      }
    } catch (error) {
      console.error("Import error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Format timestamp for display
   * @param timestamp - Timestamp to format
   * @returns Formatted date string
   */
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * Truncate UUID for compact display
   * @param uuid - UUID to truncate
   * @returns Truncated UUID
   */
  const truncateUUID = (uuid: string): string => {
    return `${uuid.substring(0, 8)}...${uuid.substring(uuid.length - 4)}`;
  };

  if (!config) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <div className="h-4 w-4 rounded-full bg-yellow-500 animate-pulse" />
            <span className="truncate">UUID Configuration</span>
            <Badge variant="outline" className="ml-auto text-xs">
              Initializing
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader
        className="pb-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center gap-2 text-sm">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span className="truncate">UUID Configuration</span>
          <Badge variant="outline" className="ml-auto text-xs">
            App ID: {config.appId}
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
          {/* Service Info */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium">Service Information</h4>
              <span className="text-xs text-muted-foreground">
                {formatDate(config.generatedAt)}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">App ID</span>
                <div className="flex items-center gap-1">
                  <code className="bg-muted px-1 rounded text-xs">
                    {config.appId}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0"
                    onClick={() => copyToClipboard(config.appId, "App ID")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* UUIDs */}
          <div>
            <h4 className="text-xs font-medium mb-2">Bluetooth UUIDs</h4>
            <div className="space-y-2">
              {[
                { label: "Service", uuid: config.serviceUUID },
                { label: "Data", uuid: config.characteristicUUID },
                { label: "Notify", uuid: config.notificationUUID },
                { label: "Control", uuid: config.controlUUID },
              ].map(({ label, uuid }) => (
                <div
                  key={label}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground w-12">{label}</span>
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <code className="bg-muted px-1 rounded text-xs truncate flex-1">
                      {truncateUUID(uuid)}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 flex-shrink-0"
                      onClick={() => copyToClipboard(uuid, label)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Import/Export Section */}
          {showImport ? (
            <div>
              <h4 className="text-xs font-medium mb-2">Import Configuration</h4>
              <div className="space-y-2">
                <Textarea
                  placeholder="Paste UUID configuration JSON here..."
                  value={importConfig}
                  onChange={(e) => setImportConfig(e.target.value)}
                  className="text-xs h-20"
                />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={handleImport}
                    disabled={!importConfig.trim() || isLoading}
                    className="flex-1 text-xs h-7"
                  >
                    Import
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowImport(false)}
                    className="text-xs h-7"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Action Buttons */
            <div>
              <h4 className="text-xs font-medium mb-2">Actions</h4>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRegenerate}
                  disabled={isLoading}
                  className="text-xs h-7"
                >
                  <RefreshCw
                    className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")}
                  />
                  Regenerate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExport}
                  className="text-xs h-7"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowImport(true)}
                  className="text-xs h-7 col-span-2"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Import Configuration
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
