import { EventEmitter } from "@/utils/event-emitter";
import { hasBatteryAPI } from "@/types/service-worker";
import type { BatteryManager } from "@/types/service-worker";

/**
 * Scanning mode configuration
 */
export interface ScanMode {
  /** Interval between scans in milliseconds */
  interval: number;
  /** Duration of each scan in milliseconds */
  duration: number;
  /** Whether to use passive scanning */
  passive: boolean;
  /** Power level for active scanning */
  powerLevel: "low" | "medium" | "high";
}

/**
 * Scan statistics for optimization
 */
export interface ScanStats {
  /** Number of devices discovered */
  devicesFound: number;
  /** Number of successful connections */
  connectionsEstablished: number;
  /** Average RSSI of discovered devices */
  averageRssi: number;
  /** Battery level at scan time */
  batteryLevel: number;
  /** Timestamp of the scan */
  timestamp: number;
}

/**
 * Optimization strategy for scanning
 */
interface OptimizationStrategy {
  /** Name of the strategy */
  name: string;
  /** Function to determine if strategy should be applied */
  shouldApply: (stats: ScanStats[], context: ScanContext) => boolean;
  /** Function to apply the strategy */
  apply: (currentMode: ScanMode) => ScanMode;
}

/**
 * Context information for scanning decisions
 */
interface ScanContext {
  /** Current battery level (0-100) */
  batteryLevel: number;
  /** Whether device is charging */
  isCharging: boolean;
  /** Number of active connections */
  activeConnections: number;
  /** Time since last successful connection */
  timeSinceLastConnection: number;
  /** Whether app is in foreground */
  isAppActive: boolean;
}

/**
 * Advanced background scanning optimizer that adapts scanning behavior
 * based on device state, battery level, and historical success rates
 */
export class ScanningOptimizer extends EventEmitter {
  private scanHistory: ScanStats[] = [];
  private currentMode: ScanMode;
  private strategies: OptimizationStrategy[] = [];
  private optimizationInterval: NodeJS.Timeout | null = null;

  /** Default scan modes for different scenarios */
  private readonly SCAN_MODES = {
    aggressive: {
      interval: 5000,
      duration: 3000,
      passive: false,
      powerLevel: "high" as const,
    },
    balanced: {
      interval: 15000,
      duration: 2000,
      passive: false,
      powerLevel: "medium" as const,
    },
    conservative: {
      interval: 30000,
      duration: 1000,
      passive: true,
      powerLevel: "low" as const,
    },
    minimal: {
      interval: 60000,
      duration: 500,
      passive: true,
      powerLevel: "low" as const,
    },
  };

  constructor() {
    super();
    this.currentMode = this.SCAN_MODES.balanced;
    this.initializeStrategies();
    this.initializeBatteryMonitoring().catch(console.warn);
    this.initializeConnectionTracking();
  }

  /**
   * Initialize optimization strategies
   */
  private initializeStrategies(): void {
    // Battery conservation strategy
    this.strategies.push({
      name: "battery-conservation",
      shouldApply: (_, context) =>
        context.batteryLevel < 20 && !context.isCharging,
      apply: () => this.SCAN_MODES.minimal,
    });

    // Low activity strategy
    this.strategies.push({
      name: "low-activity",
      shouldApply: (stats, context) => {
        const recentStats = this.getRecentStats(stats, 5);
        const avgDevices = this.calculateAverage(
          recentStats.map((s) => s.devicesFound),
        );
        return avgDevices < 1 && context.timeSinceLastConnection > 300000; // 5 minutes
      },
      apply: (current) => ({
        ...current,
        interval: Math.min(current.interval * 1.5, 120000),
        duration: Math.max(current.duration * 0.8, 500),
      }),
    });

    // High activity strategy
    this.strategies.push({
      name: "high-activity",
      shouldApply: (stats, context) => {
        const recentStats = this.getRecentStats(stats, 5);
        const avgDevices = this.calculateAverage(
          recentStats.map((s) => s.devicesFound),
        );
        return avgDevices > 3 && context.isAppActive;
      },
      apply: () => this.SCAN_MODES.aggressive,
    });

    // Adaptive RSSI strategy
    this.strategies.push({
      name: "adaptive-rssi",
      shouldApply: (stats) => {
        const recentStats = this.getRecentStats(stats, 10);
        const avgRssi = this.calculateAverage(
          recentStats.map((s) => s.averageRssi),
        );
        return avgRssi < -80; // Weak signals
      },
      apply: (current) => ({
        ...current,
        duration: Math.min(current.duration * 1.2, 5000),
        powerLevel: "high" as const,
      }),
    });

    // Time-based optimization strategy
    this.strategies.push({
      name: "time-based-optimization",
      shouldApply: (_, context) => {
        const hour = new Date().getHours();
        // Less aggressive scanning during night hours (22:00 - 06:00)
        return (hour >= 22 || hour <= 6) && context.batteryLevel < 50;
      },
      apply: () => this.SCAN_MODES.conservative,
    });

    // Connection success rate strategy
    this.strategies.push({
      name: "connection-success-rate",
      shouldApply: (stats) => {
        const recentStats = this.getRecentStats(stats, 20);
        if (recentStats.length < 10) return false;

        const successRate =
          recentStats.filter((s) => s.connectionsEstablished > 0).length /
          recentStats.length;
        return successRate < 0.1; // Less than 10% success rate
      },
      apply: (current) => ({
        ...current,
        interval: Math.min(current.interval * 2, 180000), // Up to 3 minutes
        duration: Math.max(current.duration * 0.5, 500),
      }),
    });

    // Adaptive power strategy based on environment
    this.strategies.push({
      name: "adaptive-power",
      shouldApply: (stats, context) => {
        const recentStats = this.getRecentStats(stats, 5);
        const avgRssi = this.calculateAverage(
          recentStats.map((s) => s.averageRssi),
        );
        // Use high power when environment is noisy (weak signals) but battery is good
        return avgRssi < -70 && context.batteryLevel > 70 && context.isCharging;
      },
      apply: (current) => ({
        ...current,
        powerLevel: "high" as const,
        duration: Math.min(current.duration * 1.5, 4000),
      }),
    });
  }

  /**
   * Start the optimization process
   */
  startOptimization(): void {
    if (this.optimizationInterval) return;

    this.optimizationInterval = setInterval(() => {
      this.optimizeScanMode();
    }, 30000); // Optimize every 30 seconds

    this.emit("optimization-started");
  }

  /**
   * Stop the optimization process
   */
  stopOptimization(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }
    this.emit("optimization-stopped");
  }

  /**
   * Record scan statistics
   * @param stats - Statistics from the latest scan
   */
  recordScanStats(stats: Omit<ScanStats, "timestamp">): void {
    const fullStats: ScanStats = {
      ...stats,
      timestamp: Date.now(),
    };

    this.scanHistory.push(fullStats);

    // Keep only last 100 scans
    if (this.scanHistory.length > 100) {
      this.scanHistory = this.scanHistory.slice(-100);
    }

    this.emit("stats-recorded", fullStats);
  }

  /**
   * Get the current scan mode
   * @returns Current scanning configuration
   */
  getCurrentMode(): ScanMode {
    return { ...this.currentMode };
  }

  /**
   * Manually set scan mode
   * @param mode - Predefined mode name or custom mode
   */
  setScanMode(mode: keyof typeof this.SCAN_MODES | ScanMode): void {
    if (typeof mode === "string") {
      this.currentMode = { ...this.SCAN_MODES[mode] };
    } else {
      this.currentMode = { ...mode };
    }

    this.emit("mode-changed", this.currentMode);
  }

  /**
   * Optimize scan mode based on current context and history
   */
  private optimizeScanMode(): void {
    const context = this.getCurrentContext();

    // Apply strategies in order
    for (const strategy of this.strategies) {
      if (strategy.shouldApply(this.scanHistory, context)) {
        const newMode = strategy.apply(this.currentMode);

        if (this.isDifferentMode(newMode, this.currentMode)) {
          this.currentMode = newMode;
          this.emit("mode-optimized", {
            mode: newMode,
            strategy: strategy.name,
            context,
          });
          break; // Apply only one strategy per optimization cycle
        }
      }
    }
  }

  /**
   * Get current context for optimization decisions
   * @returns Current device and app context
   */
  private getCurrentContext(): ScanContext {
    // In a real implementation, these would come from actual APIs
    return {
      batteryLevel: this.getBatteryLevel(),
      isCharging: this.isDeviceCharging(),
      activeConnections: this.getActiveConnectionCount(),
      timeSinceLastConnection: this.getTimeSinceLastConnection(),
      isAppActive: this.isAppInForeground(),
    };
  }

  /**
   * Get battery level using real Battery API
   * @returns Battery level 0-100
   */
  public getBatteryLevel(): number {
    // Use cached battery level from async initialization
    return this.cachedBatteryLevel;
  }

  private cachedBatteryLevel: number = 100;
  private batteryManager: BatteryManager | null = null;

  /**
   * Initialize battery monitoring
   */
  private async initializeBatteryMonitoring(): Promise<void> {
    if (hasBatteryAPI(navigator)) {
      try {
        this.batteryManager = await navigator.getBattery();
        this.cachedBatteryLevel = Math.round(this.batteryManager.level * 100);

        // Listen for battery changes
        this.batteryManager.addEventListener("levelchange", () => {
          this.cachedBatteryLevel = Math.round(
            this.batteryManager!.level * 100,
          );
          this.emit("battery-level-changed", this.cachedBatteryLevel);
        });

        this.batteryManager.addEventListener("chargingchange", () => {
          this.emit("charging-state-changed", this.batteryManager!.charging);
        });
      } catch (error) {
        console.warn("Battery API not available:", error);
      }
    }
  }

  /**
   * Check if device is charging using real Battery API
   * @returns Whether device is plugged in
   */
  private isDeviceCharging(): boolean {
    return this.batteryManager?.charging || false;
  }

  private activeConnections: number = 0;
  private lastConnectionTime: number = 0;

  /**
   * Initialize connection tracking
   */
  private initializeConnectionTracking(): void {
    // Listen for connection events from parent service
    this.on("connection-established", () => {
      this.activeConnections++;
      this.lastConnectionTime = Date.now();
    });

    this.on("connection-lost", () => {
      this.activeConnections = Math.max(0, this.activeConnections - 1);
    });
  }

  /**
   * Get number of active connections
   * @returns Count of active connections
   */
  private getActiveConnectionCount(): number {
    return this.activeConnections;
  }

  /**
   * Update connection count from external source
   * @param count - Number of active connections
   */
  setActiveConnectionCount(count: number): void {
    this.activeConnections = count;
  }

  /**
   * Get time since last successful connection
   * @returns Milliseconds since last connection
   */
  private getTimeSinceLastConnection(): number {
    if (this.lastConnectionTime === 0) {
      // Check scan history if no direct connection tracking
      const lastConnection = this.scanHistory
        .filter((s) => s.connectionsEstablished > 0)
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      return lastConnection ? Date.now() - lastConnection.timestamp : Infinity;
    }

    return Date.now() - this.lastConnectionTime;
  }

  /**
   * Check if app is in foreground
   * @returns Whether app is currently active
   */
  private isAppInForeground(): boolean {
    return !document.hidden;
  }

  /**
   * Get recent scan statistics
   * @param stats - Full statistics array
   * @param count - Number of recent stats to return
   * @returns Recent statistics
   */
  private getRecentStats(stats: ScanStats[], count: number): ScanStats[] {
    return stats.slice(-count);
  }

  /**
   * Calculate average of numbers
   * @param numbers - Array of numbers
   * @returns Average value
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Check if two scan modes are different
   * @param mode1 - First mode
   * @param mode2 - Second mode
   * @returns Whether modes differ
   */
  private isDifferentMode(mode1: ScanMode, mode2: ScanMode): boolean {
    return (
      mode1.interval !== mode2.interval ||
      mode1.duration !== mode2.duration ||
      mode1.passive !== mode2.passive ||
      mode1.powerLevel !== mode2.powerLevel
    );
  }

  /**
   * Get optimization statistics
   * @returns Summary of optimization performance
   */
  getOptimizationStats(): {
    totalScans: number;
    averageDevicesPerScan: number;
    averageConnectionRate: number;
    currentMode: ScanMode;
    scanHistory: ScanStats[];
  } {
    const totalScans = this.scanHistory.length;
    const averageDevicesPerScan = this.calculateAverage(
      this.scanHistory.map((s) => s.devicesFound),
    );
    const averageConnectionRate =
      totalScans > 0
        ? this.scanHistory.filter((s) => s.connectionsEstablished > 0).length /
          totalScans
        : 0;

    return {
      totalScans,
      averageDevicesPerScan,
      averageConnectionRate,
      currentMode: this.getCurrentMode(),
      scanHistory: [...this.scanHistory],
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopOptimization();
    this.scanHistory = [];
    this.removeAllListeners();
  }
}
