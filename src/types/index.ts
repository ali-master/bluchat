export interface Peer {
  id: string;
  name: string;
  rssi: number;
  lastSeen: number;
  latency?: number; // Round-trip time in milliseconds
}

export interface Message {
  id: string;
  text?: string;
  encrypted?: EncryptedData;
  timestamp: number;
  channel: string;
  sender: string;
  recipient?: string;
  ttl: number;
  isMine: boolean;
  status: "sending" | "sent" | "failed" | "received" | "stored";
  signature?: string;
}

export interface EncryptedData {
  nonce: string;
  ciphertext: string;
  ephemeralPublicKey?: string;
}

export interface Channel {
  name: string;
  password: string | null;
  createdAt: number;
  lastActivity?: number;
}

export interface BluetoothConnection {
  device: BluetoothDevice;
  server: BluetoothRemoteGATTServer;
  service: BluetoothRemoteGATTService;
  characteristic: BluetoothRemoteGATTCharacteristic;
  rssi: number;
}
