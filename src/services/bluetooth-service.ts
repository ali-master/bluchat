import { EventEmitter } from "@/utils/event-emitter";
import { MessageProtocol } from "@/utils/message-protocol";
import type { Peer, Message } from "@/types";

const SERVICE_UUID = "00001234-0000-1000-8000-00805f9b34fb";
const CHARACTERISTIC_UUID = "00001235-0000-1000-8000-00805f9b34fb";

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

  async startScanning() {
    if (this.isScanning) return;

    try {
      this.isScanning = true;

      // Start continuous scanning for mesh discovery
      this.scanInterval = setInterval(async () => {
        try {
          await this.performDiscoveryScan();
        } catch (error) {
          console.error("Discovery scan error:", error);
        }
      }, 10000); // Scan every 10 seconds

      // Initial device connection request
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
        optionalServices: [SERVICE_UUID],
      });

      await this.connectToDevice(device);
    } catch (error) {
      console.error("Bluetooth scanning error:", error);
      this.stopScanning();
    }
  }

  private async performDiscoveryScan() {
    // Note: Web Bluetooth API limitations prevent true continuous scanning
    // In a real implementation, this would use native BLE scanning capabilities
    console.log("Performing mesh discovery scan...");

    // Emit discovery event for UI feedback
    this.emit("discovery-scan", { timestamp: Date.now() });
  }

  stopScanning() {
    this.isScanning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  private async connectToDevice(device: BluetoothDevice) {
    try {
      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic =
        await service.getCharacteristic(CHARACTERISTIC_UUID);

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

      // Update mesh routing information
      this.updateMeshRoute(fromDeviceId, message.sender);

      this.emit("message-received", message);

      // Auto-relay message if TTL > 1
      if (message.ttl && message.ttl > 1) {
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

    // Web Bluetooth doesn't support advertising/peripheral mode
    // This simulates advertising behavior for development
    console.warn(
      "Web Bluetooth API does not support advertising mode - simulating",
    );

    this.isAdvertising = true;
    this.advertisingInterval = setInterval(() => {
      this.emit("advertising", {
        nodeId: this.generateNodeId(),
        serviceUuid: SERVICE_UUID,
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

  getMeshTopology() {
    return {
      connectedPeers: Array.from(this.devices.values()),
      routingTable: Object.fromEntries(this.meshRoutes),
      totalConnections: this.connections.size,
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

  disconnect() {
    // Stop all intervals
    this.stopScanning();
    this.stopAdvertising();
    this.stopLatencyMeasurement();

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
