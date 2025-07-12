import { EventEmitter } from "@/utils/event-emitter";
import type { Peer, Message } from "@/types";

interface RTCConnection {
  id: string;
  connection: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  isInitiator: boolean;
}

export class WebRTCService extends EventEmitter {
  private connections = new Map<string, RTCConnection>();
  private localPeerId: string;
  private isListening = false;

  // STUN servers for NAT traversal
  private readonly rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  constructor() {
    super();
    this.localPeerId = this.generatePeerId();
  }

  private generatePeerId(): string {
    return `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start listening for incoming connections
   */
  async startListening(): Promise<void> {
    this.isListening = true;
    console.log("🎧 WebRTC service started listening for connections");
    this.emit("listening-started");
  }

  /**
   * Create a connection offer to another peer
   */
  async createOffer(peerId: string): Promise<string> {
    const connection = new RTCPeerConnection(this.rtcConfig);
    const dataChannel = connection.createDataChannel("messages", {
      ordered: true,
    });

    const rtcConnection: RTCConnection = {
      id: peerId,
      connection,
      dataChannel,
      isInitiator: true,
    };

    this.setupConnection(rtcConnection);
    this.connections.set(peerId, rtcConnection);

    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);

    console.log(`📤 Created offer for peer: ${peerId}`);
    return JSON.stringify(offer);
  }

  /**
   * Handle an incoming offer
   */
  async handleOffer(peerId: string, offerStr: string): Promise<string> {
    const offer = JSON.parse(offerStr);
    const connection = new RTCPeerConnection(this.rtcConfig);

    const rtcConnection: RTCConnection = {
      id: peerId,
      connection,
      dataChannel: null,
      isInitiator: false,
    };

    // Handle incoming data channel
    connection.ondatachannel = (event) => {
      rtcConnection.dataChannel = event.channel;
      this.setupDataChannel(rtcConnection);
    };

    this.setupConnection(rtcConnection);
    this.connections.set(peerId, rtcConnection);

    await connection.setRemoteDescription(offer);
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);

    console.log(`📥 Created answer for peer: ${peerId}`);
    return JSON.stringify(answer);
  }

  /**
   * Handle an answer to our offer
   */
  async handleAnswer(peerId: string, answerStr: string): Promise<void> {
    const answer = JSON.parse(answerStr);
    const rtcConnection = this.connections.get(peerId);

    if (!rtcConnection) {
      throw new Error(`No connection found for peer: ${peerId}`);
    }

    await rtcConnection.connection.setRemoteDescription(answer);
    console.log(`✅ Processed answer from peer: ${peerId}`);
  }

  /**
   * Handle ICE candidate
   */
  async handleIceCandidate(
    peerId: string,
    candidateStr: string,
  ): Promise<void> {
    const candidate = JSON.parse(candidateStr);
    const rtcConnection = this.connections.get(peerId);

    if (!rtcConnection) {
      console.warn(`No connection found for ICE candidate from: ${peerId}`);
      return;
    }

    await rtcConnection.connection.addIceCandidate(candidate);
    console.log(`🧊 Added ICE candidate from peer: ${peerId}`);
  }

  /**
   * Send a message to a specific peer
   */
  async sendMessage(peerId: string, message: Message): Promise<void> {
    const rtcConnection = this.connections.get(peerId);

    if (!rtcConnection || !rtcConnection.dataChannel) {
      throw new Error(`No active connection to peer: ${peerId}`);
    }

    if (rtcConnection.dataChannel.readyState !== "open") {
      throw new Error(`Connection to ${peerId} is not ready`);
    }

    const messageStr = JSON.stringify(message);
    rtcConnection.dataChannel.send(messageStr);
    console.log(`📤 Message sent to ${peerId}: ${message.text}`);
  }

  /**
   * Broadcast message to all connected peers
   */
  async broadcastMessage(message: Message): Promise<void> {
    const connectedPeers = Array.from(this.connections.values()).filter(
      (conn) => conn.dataChannel?.readyState === "open",
    );

    if (connectedPeers.length === 0) {
      throw new Error("No connected peers to send message to");
    }

    let successCount = 0;
    for (const rtcConnection of connectedPeers) {
      try {
        await this.sendMessage(rtcConnection.id, message);
        successCount++;
      } catch (error) {
        console.error(`Failed to send to ${rtcConnection.id}:`, error);
      }
    }

    console.log(
      `✅ Message broadcast to ${successCount}/${connectedPeers.length} peers`,
    );
  }

  /**
   * Get connected peers
   */
  getConnectedPeers(): Peer[] {
    return Array.from(this.connections.values())
      .filter((conn) => conn.dataChannel?.readyState === "open")
      .map((conn) => ({
        id: conn.id,
        name: `WebRTC Peer`,
        rssi: -50, // Mock RSSI
        lastSeen: Date.now(),
      }));
  }

  /**
   * Disconnect from a peer
   */
  disconnectPeer(peerId: string): void {
    const rtcConnection = this.connections.get(peerId);
    if (rtcConnection) {
      rtcConnection.connection.close();
      this.connections.delete(peerId);
      console.log(`🔌 Disconnected from peer: ${peerId}`);
      this.emit("peer-disconnected", peerId);
    }
  }

  /**
   * Disconnect from all peers
   */
  disconnectAll(): void {
    for (const [peerId, rtcConnection] of this.connections) {
      rtcConnection.connection.close();
      console.log(`🔌 Disconnected from peer: ${peerId}`);
      this.emit("peer-disconnected", peerId);
    }
    this.connections.clear();
    this.isListening = false;
  }

  private setupConnection(rtcConnection: RTCConnection): void {
    const { connection, id } = rtcConnection;

    // Handle ICE candidates
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`🧊 ICE candidate for ${id}:`, event.candidate);
        this.emit("ice-candidate", {
          peerId: id,
          candidate: JSON.stringify(event.candidate),
        });
      }
    };

    // Handle connection state changes
    connection.onconnectionstatechange = () => {
      console.log(
        `🔗 Connection state for ${id}: ${connection.connectionState}`,
      );

      if (connection.connectionState === "connected") {
        this.emit("peer-connected", {
          id,
          name: `WebRTC Peer`,
          rssi: -50,
          lastSeen: Date.now(),
        });
      } else if (
        connection.connectionState === "disconnected" ||
        connection.connectionState === "failed"
      ) {
        this.emit("peer-disconnected", id);
      }
    };

    // Setup data channel for initiator
    if (rtcConnection.isInitiator && rtcConnection.dataChannel) {
      this.setupDataChannel(rtcConnection);
    }
  }

  private setupDataChannel(rtcConnection: RTCConnection): void {
    const { dataChannel, id } = rtcConnection;

    if (!dataChannel) return;

    dataChannel.onopen = () => {
      console.log(`📡 Data channel opened with ${id}`);
    };

    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log(`📥 Received message from ${id}:`, message.text);
        this.emit("message-received", message);
      } catch (error) {
        console.error(`Failed to parse message from ${id}:`, error);
      }
    };

    dataChannel.onerror = (error) => {
      console.error(`Data channel error with ${id}:`, error);
    };

    dataChannel.onclose = () => {
      console.log(`📡 Data channel closed with ${id}`);
    };
  }

  /**
   * Get local peer ID
   */
  getLocalPeerId(): string {
    return this.localPeerId;
  }

  /**
   * Check if service is listening
   */
  isServiceListening(): boolean {
    return this.isListening;
  }
}
