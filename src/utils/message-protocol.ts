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
};

export class MessageProtocol {
  static encode(message: Message): Uint8Array {
    const header = new Uint8Array(20);
    const view = new DataView(header.buffer);

    // Version and type
    view.setUint8(0, VERSION);
    view.setUint8(1, MESSAGE_TYPES.TEXT);

    // Sender and recipient IDs (8 bytes each)
    const senderId = this.encodeId(message.sender || "");
    const recipientId = this.encodeId(message.recipient || "");

    header.set(senderId, 2);
    header.set(recipientId, 10);

    // TTL and encrypted flag
    view.setUint8(18, message.ttl || 7);
    view.setUint8(19, message.encrypted ? 1 : 0);

    // Encode payload
    const payload = this.encodePayload(message);
    const compressed = this.compress(payload);

    // Combine header and payload
    const result = new Uint8Array(header.length + compressed.length);
    result.set(header);
    result.set(compressed, header.length);

    return result;
  }

  static decode(data: Uint8Array): Message {
    const view = new DataView(data.buffer);

    // Check version
    const version = view.getUint8(0);
    if (version !== VERSION) {
      throw new Error(`Unsupported protocol version: ${version}`);
    }

    // Extract header fields
    // const type = view.getUint8(1); // Reserved for future use
    const senderId = new Uint8Array(data.slice(2, 10));
    const recipientId = new Uint8Array(data.slice(10, 18));
    const ttl = view.getUint8(18);
    const isEncrypted = view.getUint8(19) === 1;

    // Extract and decompress payload
    const compressedPayload = new Uint8Array(data.slice(20));
    const payload = this.decompress(compressedPayload);

    // Decode payload
    const message = this.decodePayload(payload);

    return {
      ...message,
      sender: this.decodeId(senderId),
      recipient: this.decodeId(recipientId),
      ttl,
      encrypted: isEncrypted ? message.encrypted : undefined,
    } as Message;
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

  private static compress(data: Uint8Array): Uint8Array {
    try {
      return lz4.compress(data);
    } catch (error) {
      console.error("Compression failed:", error);
      return data;
    }
  }

  private static decompress(data: Uint8Array): Uint8Array {
    try {
      return lz4.decompress(data);
    } catch (error) {
      console.error("Decompression failed:", error);
      return data;
    }
  }

  private static encodeId(idString: string): Uint8Array {
    if (!idString) return new Uint8Array(8);

    const encoder = new TextEncoder();
    const bytes = encoder.encode(idString);
    const result = new Uint8Array(8);
    result.set(bytes.slice(0, 8));
    return result;
  }

  private static decodeId(idBytes: Uint8Array): string {
    const decoder = new TextDecoder();
    const trimmed = idBytes.filter((b) => b !== 0);
    return decoder.decode(trimmed);
  }
}
