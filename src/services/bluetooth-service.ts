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
  private processedMessages = new Set<string>();

  async startScanning() {
    if (this.isScanning) return;

    try {
      this.isScanning = true;
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
        optionalServices: [SERVICE_UUID],
      });

      await this.connectToDevice(device);
    } catch (error) {
      console.error("Bluetooth scanning error:", error);
      this.isScanning = false;
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

      characteristic.addEventListener(
        "characteristicvaluechanged",
        (event: any) => {
          this.handleIncomingMessage(event.target.value);
        },
      );

      await characteristic.startNotifications();

      device.addEventListener("gattserverdisconnected", () => {
        this.handleDisconnection(device.id);
      });

      this.emit("peer-connected", peer);
    } catch (error) {
      console.error("Connection error:", error);
      this.handleDisconnection(device.id);
    }
  }

  private handleDisconnection(deviceId: string) {
    this.connections.delete(deviceId);
    this.devices.delete(deviceId);
    this.emit("peer-disconnected", deviceId);
  }

  async broadcastMessage(message: Message) {
    const packet = MessageProtocol.encode(message);

    for (const [deviceId, connection] of this.connections) {
      try {
        await this.sendToDevice(connection, packet);
      } catch (error) {
        console.error(`Failed to send to ${deviceId}:`, error);
      }
    }
  }

  async relayMessage(message: Message) {
    if (this.processedMessages.has(message.id)) {
      return;
    }

    this.processedMessages.add(message.id);

    // Clean up old message IDs after 5 minutes
    setTimeout(() => {
      this.processedMessages.delete(message.id);
    }, 300000);

    await this.broadcastMessage(message);
  }

  private async sendToDevice(
    connection: BluetoothConnection,
    data: Uint8Array,
  ) {
    const chunks = this.chunkData(data);

    for (const chunk of chunks) {
      await connection.characteristic.writeValue(chunk);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  private chunkData(data: Uint8Array, maxSize = 512): Uint8Array[] {
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < data.byteLength; i += maxSize) {
      chunks.push(data.slice(i, i + maxSize));
    }
    return chunks;
  }

  private handleIncomingMessage(data: DataView) {
    try {
      const message = MessageProtocol.decode(new Uint8Array(data.buffer));

      if (this.processedMessages.has(message.id)) {
        return;
      }

      this.emit("message-received", message);
    } catch (error) {
      console.error("Failed to decode message:", error);
    }
  }

  async startAdvertising() {
    // Web Bluetooth doesn't support advertising/peripheral mode
    // This would need a different approach or native app support
    console.warn("Web Bluetooth API does not support advertising mode");
  }

  getConnectedPeers(): Peer[] {
    return Array.from(this.devices.values());
  }

  disconnect() {
    for (const connection of this.connections.values()) {
      if (connection.server.connected) {
        connection.server.disconnect();
      }
    }

    this.connections.clear();
    this.devices.clear();
  }
}
