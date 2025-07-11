import lz4 from "lz4js";
import type { Message } from "@/types";

const VERSION = 1;
const MESSAGE_TYPES = {
  TEXT: 0x01,
  CHANNEL: 0x02,
  PRIVATE: 0x03,
  PING: 0x04,
  PONG: 0x05,
  ANNOUNCE: 0x06,
  FRAGMENT: 0x07,
  KEY_EXCHANGE: 0x08,
};

const MAX_PACKET_SIZE = 512; // Maximum BLE packet size
const HEADER_SIZE = 32; // Extended header size

export class MessageProtocol {
  static encode(message: Message): Uint8Array[] {
    // Encode payload first
    const payload = this.encodePayload(message);
    const compressed = this.compress(payload);

    // Check if fragmentation is needed
    const totalSize = HEADER_SIZE + compressed.length;

    if (totalSize <= MAX_PACKET_SIZE) {
      // Single packet
      return [this.createPacket(message, compressed, false, 0, 1)];
    } else {
      // Fragment the message
      return this.fragmentMessage(message, compressed);
    }
  }

  private static createPacket(
    message: Message,
    payload: Uint8Array,
    isFragment: boolean,
    fragmentIndex: number,
    totalFragments: number,
  ): Uint8Array {
    const header = new Uint8Array(HEADER_SIZE);
    const view = new DataView(header.buffer);

    // Version and type
    view.setUint8(0, VERSION);
    view.setUint8(1, isFragment ? MESSAGE_TYPES.FRAGMENT : MESSAGE_TYPES.TEXT);

    // Message ID (16 bytes)
    const messageIdBytes = this.encodeId(message.id, 16);
    header.set(messageIdBytes, 2);

    // Sender ID (8 bytes)
    const senderId = this.encodeId(message.sender || "", 8);
    header.set(senderId, 18);

    // Fragment info
    view.setUint8(26, fragmentIndex);
    view.setUint8(27, totalFragments);

    // TTL and flags
    view.setUint8(28, message.ttl || 7);
    view.setUint8(29, message.encrypted ? 1 : 0);

    // Timestamp (2 bytes - relative)
    const relativeTime = Date.now() % 65536;
    view.setUint16(30, relativeTime);

    // Combine header and payload
    const result = new Uint8Array(header.length + payload.length);
    result.set(header);
    result.set(payload, header.length);

    return result;
  }

  private static fragmentMessage(
    message: Message,
    payload: Uint8Array,
  ): Uint8Array[] {
    const maxPayloadSize = MAX_PACKET_SIZE - HEADER_SIZE;
    const fragments: Uint8Array[] = [];
    const totalFragments = Math.ceil(payload.length / maxPayloadSize);

    for (let i = 0; i < totalFragments; i++) {
      const start = i * maxPayloadSize;
      const end = Math.min(start + maxPayloadSize, payload.length);
      const fragmentPayload = payload.slice(start, end);

      const packet = this.createPacket(
        message,
        fragmentPayload,
        true,
        i,
        totalFragments,
      );
      fragments.push(packet);
    }

    return fragments;
  }

  static decode(data: Uint8Array): Message | null {
    const view = new DataView(data.buffer);

    // Check version
    const version = view.getUint8(0);
    if (version !== VERSION) {
      throw new Error(`Unsupported protocol version: ${version}`);
    }

    const messageType = view.getUint8(1);

    // Handle fragmented messages differently
    if (messageType === MESSAGE_TYPES.FRAGMENT) {
      return this.decodeFragment(data);
    }

    // Extract header fields for regular messages
    const messageId = this.decodeId(new Uint8Array(data.slice(2, 18)), 16);
    const senderId = this.decodeId(new Uint8Array(data.slice(18, 26)), 8);
    // Skip fragment fields for regular messages
    // const _fragmentIndex = view.getUint8(26);
    // const _totalFragments = view.getUint8(27);
    const ttl = view.getUint8(28);
    const isEncrypted = view.getUint8(29) === 1;
    const timestamp = view.getUint16(30);

    // Extract and decompress payload
    const compressedPayload = new Uint8Array(data.slice(HEADER_SIZE));
    const payload = this.decompress(compressedPayload);

    // Decode payload
    const message = this.decodePayload(payload);

    return {
      ...message,
      id: messageId,
      sender: senderId,
      ttl,
      encrypted: isEncrypted ? message.encrypted : undefined,
      timestamp: this.expandTimestamp(timestamp),
    } as Message;
  }

  private static decodeFragment(_data: Uint8Array): Message | null {
    // Fragment decoding would require maintaining a fragment cache
    // For now, return null to indicate this is a fragment that needs assembly
    return null;
  }

  private static expandTimestamp(relativeTime: number): number {
    // Expand relative timestamp back to full timestamp
    const now = Date.now();
    const currentRelative = now % 65536;
    const timeDiff = relativeTime - currentRelative;

    return now + timeDiff;
  }

  private static encodePayload(message: Message): Uint8Array {
    const data = {
      id: message.id,
      timestamp: message.timestamp,
      channel: message.channel,
      text: message.text,
      encrypted: message.encrypted,
      signature: message.signature,
    };

    return new TextEncoder().encode(JSON.stringify(data));
  }

  private static decodePayload(data: Uint8Array): Partial<Message> {
    const json = new TextDecoder().decode(data);
    return JSON.parse(json);
  }

  private static decompress(data: Uint8Array): Uint8Array {
    try {
      return lz4.decompress(data);
    } catch (error) {
      console.error("Decompression failed:", error);
      return data;
    }
  }

  private static encodeId(idString: string, length: number = 8): Uint8Array {
    if (!idString) return new Uint8Array(length);

    const encoder = new TextEncoder();
    const bytes = encoder.encode(idString);
    const result = new Uint8Array(length);
    result.set(bytes.slice(0, length));
    return result;
  }

  private static decodeId(idBytes: Uint8Array, _length?: number): string {
    const decoder = new TextDecoder();
    const trimmed = idBytes.filter((b) => b !== 0);
    return decoder.decode(trimmed);
  }

  // Create key exchange message
  static createKeyExchange(
    publicKey: string,
    boxPublicKey: string,
  ): Uint8Array {
    const header = new Uint8Array(HEADER_SIZE);
    const view = new DataView(header.buffer);

    view.setUint8(0, VERSION);
    view.setUint8(1, MESSAGE_TYPES.KEY_EXCHANGE);

    const payload = {
      signPublicKey: publicKey,
      boxPublicKey,
      timestamp: Date.now(),
    };

    const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
    const result = new Uint8Array(header.length + payloadBytes.length);
    result.set(header);
    result.set(payloadBytes, header.length);

    return result;
  }

  // Optimize compression based on content type
  private static compress(data: Uint8Array): Uint8Array {
    try {
      // Only compress if data is larger than 64 bytes
      if (data.length < 64) {
        return data;
      }

      const compressed = lz4.compress(data);

      // Only use compressed version if it's actually smaller
      return compressed.length < data.length ? compressed : data;
    } catch (error) {
      console.error("Compression failed:", error);
      return data;
    }
  }
}
