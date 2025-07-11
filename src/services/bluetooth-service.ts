import { EventEmitter } from "@/utils/event-emitter";
import { MessageProtocol } from "@/utils/message-protocol";
import type { Peer, Message } from "@/types";
import { ScanningOptimizer } from "./scanning-optimizer";
import { MeshCoordinator } from "./mesh-coordinator";
import { UUIDService } from "./uuid-service";

export type { MeshNode } from "./mesh-coordinator";
export type { ScanMode, ScanStats } from "./scanning-optimizer";
export type { UUIDConfig } from "./uuid-service";

interface BluetoothConnection {
  device: BluetoothDevice;
  server: BluetoothRemoteGATTServer;
  service: BluetoothRemoteGATTService;
  characteristic: BluetoothRemoteGATTCharacteristic;
  rssi: number;
}

export class BluetoothService extends EventEmitter {
  private devices = new Map<string, Peer>();
  private connections = new Map<string, BluetoothConnection>();
  private isScanning = false;
  private isAdvertising = false;
  private processedMessages = new Set<string>();
  private meshRoutes = new Map<string, Set<string>>(); // deviceId -> Set of connected deviceIds
  private scanInterval: NodeJS.Timeout | null = null;
  private advertisingInterval: NodeJS.Timeout | null = null;
  private pingRequests = new Map<
    string,
    { timestamp: number; peerId: string }
  >(); // messageId -> ping data
  private latencyInterval: NodeJS.Timeout | null = null;
  private scanningOptimizer: ScanningOptimizer;
  private meshCoordinator: MeshCoordinator;
  private uuidService: UUIDService;
  private isInitialized = false;

  constructor() {
    super();
    this.scanningOptimizer = new ScanningOptimizer();
    this.meshCoordinator = new MeshCoordinator();
    this.uuidService = UUIDService.getInstance();
    this.initializeService();
  }

  /**
   * Initialize the Bluetooth service with UUID generation
   */
  private async initializeService(): Promise<void> {
    try {
      await this.uuidService.initialize();

      // Request Bluetooth permissions on initialization
      await this.requestBluetoothPermissions();

      this.initializeOptimizations();
      this.isInitialized = true;
      this.emit("service-initialized", {
        config: this.uuidService.getConfig(),
      });
    } catch (error) {
      console.error("Failed to initialize Bluetooth service:", error);
      this.emit("service-error", error);
    }
  }

  /**
   * Request Bluetooth permissions on initialization
   */
  private async requestBluetoothPermissions(): Promise<void> {
    try {
      if (!navigator.bluetooth) {
        throw new Error("Web Bluetooth API not supported in this browser");
      }

      // Check if Bluetooth is available
      const isAvailable = await navigator.bluetooth.getAvailability();
      if (!isAvailable) {
        console.warn("Bluetooth is not available on this device");
        return;
      }

      console.log(
        "Bluetooth permissions will be requested when scanning starts",
      );
      this.emit("bluetooth-ready");
    } catch (error) {
      console.warn("Bluetooth not available:", error);
      this.emit("bluetooth-unavailable", error);
    }
  }

  /**
   * Initialize scanning optimizations and mesh coordination
   */
  private initializeOptimizations(): void {
    // Listen to optimizer events
    this.scanningOptimizer.on("mode-optimized", (data) => {
      console.log("Scan mode optimized:", data);
      this.applyScanMode(data.mode);
    });

    this.scanningOptimizer.on("battery-level-changed", (level) => {
      console.log("Battery level changed:", level);
      this.emit("battery-level-changed", level);
    });

    this.scanningOptimizer.on("charging-state-changed", (charging) => {
      console.log("Charging state changed:", charging);
      this.emit("charging-state-changed", charging);
    });

    // Listen to coordinator events
    this.meshCoordinator.on("topology-update", (data) => {
      this.emit("mesh-topology-changed", data);
    });

    this.meshCoordinator.on("peer-discovery", (data) => {
      console.log("Peer discovery from mesh:", data);
    });

    this.meshCoordinator.on("mesh-health-alert", (data) => {
      console.warn("Mesh health alert:", data);
      this.emit("mesh-health-alert", data);
    });

    this.meshCoordinator.on("route-optimization", (data) => {
      console.log("Route optimization:", data);
      this.emit("route-optimization", data);
    });

    this.meshCoordinator.on("network-partition", (data) => {
      console.error("Network partition detected:", data);
      this.emit("network-partition", data);
    });

    this.meshCoordinator.on("background-scan-result", (data) => {
      console.log("Background scan result:", data);
      this.emit("background-scan-result", data);

      // Process background scan results
      this.processBackgroundScanResults(data);
    });

    // Start optimization and background scanning
    this.scanningOptimizer.startOptimization();
    this.meshCoordinator.startBackgroundScanning();
  }

  /**
   * Apply optimized scan mode
   * @param mode - Scan mode to apply
   */
  private applyScanMode(mode: any): void {
    // Update scan interval based on optimization
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = setInterval(async () => {
        try {
          await this.performDiscoveryScan();
        } catch (error) {
          console.error("Discovery scan error:", error);
        }
      }, mode.interval);
    }
  }

  /**
   * Wait for service to be initialized
   */
  async waitForInitialization(timeout: number = 10000): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.isInitialized) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          resolve();
        }
      }, 100);

      const timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error("Bluetooth service initialization timeout"));
      }, timeout);

      // Also listen for initialization event
      const initListener = () => {
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
        this.off("service-initialized", initListener);
        resolve();
      };
      this.on("service-initialized", initListener);
    });
  }

  /**
   * Start Bluetooth scanning for nearby devices
   */
  async startScanning() {
    if (this.isScanning) return;

    // Check if service is initialized
    if (!this.isInitialized) {
      console.log("Waiting for Bluetooth service to initialize...");
      try {
        await this.waitForInitialization();
      } catch (error) {
        console.error("Bluetooth service not ready:", error);
        throw new Error(
          "Bluetooth service not ready. Please wait and try again.",
        );
      }
    }

    try {
      this.isScanning = true;

      // Get current scan mode from optimizer
      const scanMode = this.scanningOptimizer.getCurrentMode();

      // Start continuous scanning for mesh discovery
      this.scanInterval = setInterval(async () => {
        try {
          await this.performDiscoveryScan();
        } catch (error) {
          console.error("Discovery scan error:", error);
        }
      }, scanMode.interval);

      // Request device selection from user
      const serviceUUID = this.uuidService.getServiceUUID();

      try {
        // Try with custom service first
        const device = await navigator.bluetooth.requestDevice({
          filters: [{ services: [serviceUUID] }],
          optionalServices: [
            "0000180f-0000-1000-8000-00805f9b34fb", // Battery Service
            "00001800-0000-1000-8000-00805f9b34fb", // Generic Access
            "00001801-0000-1000-8000-00805f9b34fb", // Generic Attribute
          ],
        });
        await this.connectToDevice(device);
      } catch (error) {
        console.warn("Custom service not found, trying with common services");

        // Fallback to common services
        try {
          const device = await navigator.bluetooth.requestDevice({
            filters: [
              { services: ["0000180f-0000-1000-8000-00805f9b34fb"] }, // Battery Service
              { services: ["00001800-0000-1000-8000-00805f9b34fb"] }, // Generic Access
            ],
            optionalServices: [
              serviceUUID,
              "0000180f-0000-1000-8000-00805f9b34fb",
              "00001800-0000-1000-8000-00805f9b34fb",
              "00001801-0000-1000-8000-00805f9b34fb",
            ],
          });
          await this.connectToDevice(device);
        } catch (fallbackError) {
          console.warn("Fallback connection failed, trying accept all devices");

          // Final fallback - accept all devices
          const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [
              serviceUUID,
              "0000180f-0000-1000-8000-00805f9b34fb",
              "00001800-0000-1000-8000-00805f9b34fb",
              "00001801-0000-1000-8000-00805f9b34fb",
            ],
          });
          await this.connectToDevice(device);
        }
      }
    } catch (error) {
      console.error("Bluetooth scanning error:", error);
      this.stopScanning();
    }
  }

  /**
   * Perform discovery scan and record statistics
   */
  private async performDiscoveryScan() {
    // Note: Web Bluetooth API limitations prevent true continuous scanning
    // In a real implementation, this would use native BLE scanning capabilities
    console.log("Performing mesh discovery scan...");

    const scanStartTime = Date.now();
    const devicesBefore = this.devices.size;
    const connectionsBefore = this.connections.size;

    // Emit discovery event for UI feedback
    this.emit("discovery-scan", { timestamp: scanStartTime });

    // Record scan statistics for optimization
    const scanStats = {
      devicesFound: this.devices.size - devicesBefore,
      connectionsEstablished: this.connections.size - connectionsBefore,
      averageRssi: this.calculateAverageRssi(),
      batteryLevel: this.getBatteryLevel(),
    };

    this.scanningOptimizer.recordScanStats(scanStats);
  }

  /**
   * Calculate average RSSI from connected devices
   * @returns Average RSSI value
   */
  private calculateAverageRssi(): number {
    const rssiValues = Array.from(this.connections.values()).map((c) => c.rssi);
    if (rssiValues.length === 0) return -100;
    return rssiValues.reduce((a, b) => a + b, 0) / rssiValues.length;
  }

  /**
   * Get current battery level (mock implementation)
   * @returns Battery level 0-100
   */
  private getBatteryLevel(): number {
    // In real implementation, use Battery Status API
    return 75; // Mock value
  }

  stopScanning() {
    this.isScanning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  /**
   * Connect to a Bluetooth device and set up communication
   * @param device - Bluetooth device to connect to
   */
  private async connectToDevice(device: BluetoothDevice) {
    try {
      console.log(`Attempting to connect to: ${device.name || device.id}`);
      const server = await device.gatt!.connect();
      const serviceUUID = this.uuidService.getServiceUUID();
      const characteristicUUID = this.uuidService.getCharacteristicUUID();

      let service: BluetoothRemoteGATTService | undefined;
      let characteristic: BluetoothRemoteGATTCharacteristic | undefined;

      try {
        // Try custom service first
        service = await server.getPrimaryService(serviceUUID);
        characteristic = await service.getCharacteristic(characteristicUUID);
        console.log("Connected using custom UUID service");
      } catch (error) {
        console.warn("Custom service not found, trying fallback...");

        // Try common services as fallback for cross-platform compatibility
        const fallbackServices = [
          {
            service: "0000180f-0000-1000-8000-00805f9b34fb",
            char: "00002a19-0000-1000-8000-00805f9b34fb",
          }, // Battery
          {
            service: "0000180a-0000-1000-8000-00805f9b34fb",
            char: "00002a29-0000-1000-8000-00805f9b34fb",
          }, // Device Info
        ];

        let connected = false;
        for (const fallback of fallbackServices) {
          try {
            service = await server.getPrimaryService(fallback.service);
            characteristic = await service.getCharacteristic(fallback.char);
            console.log(
              `Connected using fallback service: ${fallback.service}`,
            );
            connected = true;
            break;
          } catch (e) {
            continue;
          }
        }

        if (!connected) {
          throw new Error("No compatible service found");
        }
      }

      if (!service || !characteristic) {
        throw new Error("No compatible service or characteristic found");
      }

      const connection: BluetoothConnection = {
        device,
        server,
        service,
        characteristic,
        rssi: -50,
      };

      this.connections.set(device.id, connection);

      const peer: Peer = {
        id: device.id,
        name: device.name || "Unknown",
        rssi: connection.rssi,
        lastSeen: Date.now(),
      };

      this.devices.set(device.id, peer);

      // Initialize mesh routing table for this peer
      this.meshRoutes.set(device.id, new Set());

      characteristic.addEventListener(
        "characteristicvaluechanged",
        (event: any) => {
          this.handleIncomingMessage(event.target.value, device.id);
        },
      );

      await characteristic.startNotifications();

      device.addEventListener("gattserverdisconnected", () => {
        this.handleDisconnection(device.id);
      });

      // Send mesh topology announcement
      await this.sendMeshAnnouncement(connection);

      // Start latency monitoring for this peer
      this.startLatencyMeasurement();

      // Update mesh coordinator
      this.meshCoordinator.updatePeers(Array.from(this.devices.values()));

      // Update scanning optimizer connection count
      this.scanningOptimizer.setActiveConnectionCount(this.connections.size);
      this.scanningOptimizer.recordConnectionSuccess(device.id);

      this.emit("peer-connected", peer);
    } catch (error) {
      console.error("Connection error:", error);
      this.handleDisconnection(device.id);
    }
  }

  private handleDisconnection(deviceId: string) {
    this.connections.delete(deviceId);
    this.devices.delete(deviceId);
    this.meshRoutes.delete(deviceId);

    // Clean up routing tables that reference this device
    for (const [_peerId, routes] of this.meshRoutes) {
      routes.delete(deviceId);
    }

    // Update mesh coordinator
    this.meshCoordinator.updatePeers(Array.from(this.devices.values()));

    // Update scanning optimizer connection count
    this.scanningOptimizer.setActiveConnectionCount(this.connections.size);
    this.scanningOptimizer.emit("connection-lost");

    this.emit("peer-disconnected", deviceId);
  }

  private async sendMeshAnnouncement(connection: BluetoothConnection) {
    // Send mesh topology information to newly connected peer
    const announcement = {
      type: "MESH_ANNOUNCE",
      nodeId: this.generateNodeId(),
      connectedPeers: Array.from(this.devices.keys()),
      timestamp: Date.now(),
    };

    const data = new TextEncoder().encode(JSON.stringify(announcement));
    await this.sendToDevice(connection, data);
  }

  private generateNodeId(): string {
    // Generate a unique node ID for mesh identification
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async broadcastMessage(message: Message) {
    const packets = MessageProtocol.encode(message);

    for (const [deviceId, connection] of this.connections) {
      try {
        // Send all fragments in sequence
        for (const packet of packets) {
          await this.sendToDevice(connection, packet);
          // Small delay between fragments to prevent congestion
          if (packets.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }
      } catch (error) {
        console.error(`Failed to send to ${deviceId}:`, error);
      }
    }
  }

  async relayMessage(message: Message, excludeDeviceId?: string) {
    if (this.processedMessages.has(message.id)) {
      return;
    }

    // Check TTL - don't relay if TTL is 0 or less
    if (!message.ttl || message.ttl <= 0) {
      return;
    }

    this.processedMessages.add(message.id);

    // Clean up old message IDs after 5 minutes
    setTimeout(() => {
      this.processedMessages.delete(message.id);
    }, 300000);

    // Decrement TTL for relay
    const relayMessage = { ...message, ttl: message.ttl - 1 };
    const packets = MessageProtocol.encode(relayMessage);

    // Relay to all connected peers except the one we received from
    for (const [deviceId, connection] of this.connections) {
      if (deviceId === excludeDeviceId) continue; // Don't relay back to sender

      try {
        // Send all fragments for relay
        for (const packet of packets) {
          await this.sendToDevice(connection, packet);
          if (packets.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 30));
          }
        }
        console.log(
          `Relayed message ${message.id} to ${deviceId}, TTL: ${relayMessage.ttl}`,
        );
      } catch (error) {
        console.error(`Failed to relay to ${deviceId}:`, error);
      }
    }
  }

  private async sendToDevice(
    connection: BluetoothConnection,
    data: Uint8Array,
  ) {
    // Send data as single packet (fragmentation is handled at protocol level)
    await connection.characteristic.writeValue(data);
  }

  private handleIncomingMessage(data: DataView, fromDeviceId: string) {
    try {
      // First try to parse as JSON for ping/pong messages
      const text = new TextDecoder().decode(new Uint8Array(data.buffer));
      try {
        const jsonMessage = JSON.parse(text);
        if (jsonMessage.type === "PING") {
          this.sendPingResponse(jsonMessage, fromDeviceId);
          return;
        } else if (jsonMessage.type === "PONG") {
          this.handlePingResponse(jsonMessage, fromDeviceId);
          return;
        } else if (jsonMessage.type === "MESH_ANNOUNCE") {
          console.log("Received mesh announcement:", jsonMessage);
          return;
        }
      } catch {
        // Not a JSON message, continue with normal protocol decoding
      }

      const message = MessageProtocol.decode(new Uint8Array(data.buffer));

      // Handle fragments (would need full fragment reassembly logic)
      if (!message) {
        console.log("Received message fragment - reassembly not implemented");
        return;
      }

      if (this.processedMessages.has(message.id)) {
        return;
      }

      // Mark as processed immediately to prevent loops
      this.processedMessages.add(message.id);

      // Clean up old message IDs after 5 minutes
      setTimeout(() => {
        this.processedMessages.delete(message.id);
      }, 300000);

      // Update mesh routing information
      this.updateMeshRoute(fromDeviceId, message.sender);

      this.emit("message-received", message);

      // Only relay if this is not our own message and TTL > 1
      if (
        message.sender !== this.generateNodeId() &&
        message.ttl &&
        message.ttl > 1 &&
        this.connections.size > 1
      ) {
        setTimeout(() => {
          this.relayMessage(message, fromDeviceId);
        }, Math.random() * 1000); // Random delay to prevent collision
      }
    } catch (error) {
      console.error("Failed to decode message:", error);
    }
  }

  private updateMeshRoute(directPeer: string, originalSender: string) {
    // Track which peers can reach which senders for mesh routing
    if (!this.meshRoutes.has(directPeer)) {
      this.meshRoutes.set(directPeer, new Set());
    }
    this.meshRoutes.get(directPeer)!.add(originalSender);
  }

  async startAdvertising() {
    if (this.isAdvertising) return;

    // Wait for service to be initialized
    if (!this.isInitialized) {
      console.log("Service not initialized yet, waiting...");
      return new Promise<void>((resolve) => {
        const initListener = () => {
          this.off("service-initialized", initListener);
          this.startAdvertising().then(resolve);
        };
        this.on("service-initialized", initListener);
      });
    }

    // Web Bluetooth doesn't support advertising/peripheral mode
    // This simulates advertising behavior for development
    console.warn(
      "Web Bluetooth API does not support advertising mode - simulating",
    );

    this.isAdvertising = true;
    this.advertisingInterval = setInterval(() => {
      this.emit("advertising", {
        nodeId: this.generateNodeId(),
        serviceUuid: this.uuidService.getServiceUUID(),
        timestamp: Date.now(),
      });
    }, 5000); // Advertise every 5 seconds
  }

  stopAdvertising() {
    this.isAdvertising = false;
    if (this.advertisingInterval) {
      clearInterval(this.advertisingInterval);
      this.advertisingInterval = null;
    }
  }

  /**
   * Get comprehensive mesh topology including optimization stats
   * @returns Mesh topology and optimization information
   */
  getMeshTopology() {
    const coordinatorTopology = this.meshCoordinator.getMeshTopology();
    const optimizationStats = this.scanningOptimizer.getOptimizationStats();

    return {
      connectedPeers: Array.from(this.devices.values()),
      routingTable: Object.fromEntries(this.meshRoutes),
      totalConnections: this.connections.size,
      meshNodes: coordinatorTopology.nodes,
      bridges: coordinatorTopology.bridges,
      scanMode: optimizationStats.currentMode,
      scanStats: {
        totalScans: optimizationStats.totalScans,
        averageDevicesPerScan: optimizationStats.averageDevicesPerScan,
        connectionRate: optimizationStats.averageConnectionRate,
      },
    };
  }

  // Latency measurement methods
  private startLatencyMeasurement() {
    if (this.latencyInterval) return;

    this.latencyInterval = setInterval(() => {
      this.measurePeerLatencies();
    }, 10000); // Measure latency every 10 seconds
  }

  private stopLatencyMeasurement() {
    if (this.latencyInterval) {
      clearInterval(this.latencyInterval);
      this.latencyInterval = null;
    }
  }

  private async measurePeerLatencies() {
    for (const [peerId, _connection] of this.connections) {
      try {
        await this.pingPeer(peerId);
      } catch (error) {
        console.error(`Failed to ping peer ${peerId}:`, error);
      }
    }
  }

  private async pingPeer(peerId: string) {
    const connection = this.connections.get(peerId);
    if (!connection) return;

    const pingId = this.generateNodeId();
    const pingMessage = {
      type: "PING",
      id: pingId,
      timestamp: Date.now(),
      targetPeer: peerId,
    };

    // Store ping request
    this.pingRequests.set(pingId, {
      timestamp: Date.now(),
      peerId,
    });

    // Clean up old ping requests after 30 seconds
    setTimeout(() => {
      this.pingRequests.delete(pingId);
    }, 30000);

    const data = new TextEncoder().encode(JSON.stringify(pingMessage));
    await this.sendToDevice(connection, data);
  }

  private handlePingResponse(response: any, fromDeviceId: string) {
    const pingData = this.pingRequests.get(response.pingId);
    if (!pingData || pingData.peerId !== fromDeviceId) return;

    const latency = Date.now() - pingData.timestamp;

    // Update peer latency
    const peer = this.devices.get(fromDeviceId);
    if (peer) {
      peer.latency = latency;
      this.devices.set(fromDeviceId, peer);

      this.emit("peer-latency-updated", {
        peerId: fromDeviceId,
        latency,
      });
    }

    // Clean up ping request
    this.pingRequests.delete(response.pingId);
  }

  private async sendPingResponse(pingMessage: any, fromDeviceId: string) {
    const connection = this.connections.get(fromDeviceId);
    if (!connection) return;

    const pongMessage = {
      type: "PONG",
      pingId: pingMessage.id,
      timestamp: Date.now(),
    };

    const data = new TextEncoder().encode(JSON.stringify(pongMessage));
    await this.sendToDevice(connection, data);
  }

  getConnectedPeers(): Peer[] {
    return Array.from(this.devices.values());
  }

  /**
   * Get scanning optimization statistics
   * @returns Optimization statistics
   */
  getScanOptimizationStats() {
    return this.scanningOptimizer.getOptimizationStats();
  }

  /**
   * Get mesh coordination statistics
   * @returns Coordination statistics
   */
  getMeshCoordinationStats() {
    return this.meshCoordinator.getCoordinationStats();
  }

  /**
   * Manually set scan mode for testing
   * @param mode - Scan mode name or configuration
   */
  setScanMode(mode: "aggressive" | "balanced" | "conservative" | "minimal") {
    this.scanningOptimizer.setScanMode(mode);
  }

  /**
   * Get UUID configuration for debugging and sharing
   * @returns UUID configuration
   */
  getUUIDConfig() {
    if (!this.isInitialized) {
      throw new Error("Bluetooth service not initialized");
    }
    return this.uuidService.getConfig();
  }

  /**
   * Export UUID configuration for sharing with other devices
   * @returns Shareable UUID configuration string
   */
  exportUUIDConfig(): string {
    if (!this.isInitialized) {
      throw new Error("Bluetooth service not initialized");
    }
    return this.uuidService.exportConfig();
  }

  /**
   * Import UUID configuration from another device
   * @param configStr - Configuration string to import
   * @returns Whether import was successful
   */
  async importUUIDConfig(configStr: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error("Bluetooth service not initialized");
    }
    return this.uuidService.importConfig(configStr);
  }

  /**
   * Regenerate UUIDs (useful for testing or reset)
   * @returns New UUID configuration
   */
  async regenerateUUIDs() {
    if (!this.isInitialized) {
      throw new Error("Bluetooth service not initialized");
    }
    const newConfig = await this.uuidService.regenerateUUIDs();
    this.emit("uuids-regenerated", newConfig);
    return newConfig;
  }

  /**
   * Check if service is properly initialized
   * @returns Whether service is ready for use
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Process background scan results from service worker
   * @param data - Background scan result data
   */
  private processBackgroundScanResults(data: any): void {
    console.log("Processing background scan results:", data);

    // Update scan statistics
    if (data.devices) {
      const scanStats = {
        devicesFound: data.devices.length,
        connectionsEstablished: 0, // Background scans don't establish connections
        averageRssi:
          data.devices.reduce(
            (sum: number, device: any) => sum + device.rssi,
            0,
          ) / data.devices.length || -100,
        batteryLevel: this.scanningOptimizer.getBatteryLevel?.() || 100,
      };

      this.scanningOptimizer.recordScanStats(scanStats);
    }

    // Process optimization recommendations
    if (data.analysis?.recommendations) {
      data.analysis.recommendations.forEach((rec: any) => {
        switch (rec.type) {
          case "scan-frequency":
            this.handleScanFrequencyRecommendation(rec);
            break;
          case "scan-power":
            this.handleScanPowerRecommendation(rec);
            break;
        }
      });
    }
  }

  /**
   * Handle scan frequency recommendation
   * @param recommendation - Scan frequency recommendation
   */
  private handleScanFrequencyRecommendation(recommendation: any): void {
    console.log("Handling scan frequency recommendation:", recommendation);

    switch (recommendation.suggestion) {
      case "reduce-scan-frequency":
        this.scanningOptimizer.setScanMode("conservative");
        break;
      case "increase-scan-frequency":
        this.scanningOptimizer.setScanMode("aggressive");
        break;
    }
  }

  /**
   * Handle scan power recommendation
   * @param recommendation - Scan power recommendation
   */
  private handleScanPowerRecommendation(recommendation: any): void {
    console.log("Handling scan power recommendation:", recommendation);

    // This would adjust the scan power level
    // For now, we'll emit an event for UI feedback
    this.emit("scan-power-recommendation", recommendation);
  }

  /**
   * Manually trigger mesh topology optimization
   */
  async optimizeMeshTopology(): Promise<void> {
    await this.meshCoordinator.optimizeMeshTopology();
  }

  /**
   * Get mesh health status
   */
  async getMeshHealth(): Promise<any> {
    try {
      const meshState =
        await this.meshCoordinator.getMeshStateFromServiceWorker();
      return meshState;
    } catch (error) {
      console.error("Failed to get mesh health:", error);
      return null;
    }
  }

  /**
   * Disconnect all connections and clean up resources
   */
  disconnect() {
    // Stop all intervals
    this.stopScanning();
    this.stopAdvertising();
    this.stopLatencyMeasurement();

    // Stop optimization services
    this.scanningOptimizer.stopOptimization();
    this.meshCoordinator.stopBackgroundScanning();
    this.meshCoordinator.destroy();

    // Disconnect all connections
    for (const connection of this.connections.values()) {
      if (connection.server.connected) {
        connection.server.disconnect();
      }
    }

    this.connections.clear();
    this.devices.clear();
    this.meshRoutes.clear();
    this.processedMessages.clear();
    this.pingRequests.clear();
  }
}
