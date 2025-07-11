import { EventEmitter } from "@/utils/event-emitter";
import {
  hasPeriodicBackgroundSync,
  hasBackgroundSync,
} from "@/types/service-worker";
import type { Peer, Message } from "@/types";

/**
 * Mesh node information
 */
export interface MeshNode {
  /** Unique identifier for the node */
  id: string;
  /** Node capabilities */
  capabilities: NodeCapabilities;
  /** Last heartbeat timestamp */
  lastHeartbeat: number;
  /** Node's known peers */
  knownPeers: string[];
  /** Node's routing table version */
  routingVersion: number;
}

/**
 * Node capabilities and features
 */
interface NodeCapabilities {
  /** Whether node can relay messages */
  canRelay: boolean;
  /** Whether node is a bridge to other networks */
  isBridge: boolean;
  /** Maximum message TTL supported */
  maxTTL: number;
  /** Supported protocol versions */
  protocolVersions: number[];
}

/**
 * Coordination message types
 */
enum CoordinationMessageType {
  HEARTBEAT = "HEARTBEAT",
  TOPOLOGY_UPDATE = "TOPOLOGY_UPDATE",
  ROUTE_ANNOUNCEMENT = "ROUTE_ANNOUNCEMENT",
  PEER_DISCOVERY = "PEER_DISCOVERY",
  SYNC_REQUEST = "SYNC_REQUEST",
  SYNC_RESPONSE = "SYNC_RESPONSE",
}

/**
 * Coordination message structure
 */
interface CoordinationMessage {
  /** Message type */
  type: CoordinationMessageType;
  /** Source node ID */
  nodeId: string;
  /** Message payload */
  payload: any;
  /** Message timestamp */
  timestamp: number;
  /** Message version */
  version: number;
}

/**
 * Service Worker mesh coordinator that manages mesh topology
 * and coordinates between multiple instances/tabs
 */
export class MeshCoordinator extends EventEmitter {
  private nodes = new Map<string, MeshNode>();
  private nodeId: string;
  private serviceWorker: ServiceWorker | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private syncInterval: NodeJS.Timeout | null = null;

  /** Coordination configuration */
  private readonly CONFIG = {
    HEARTBEAT_INTERVAL: 10000, // 10 seconds
    NODE_TIMEOUT: 30000, // 30 seconds
    SYNC_INTERVAL: 15000, // 15 seconds
    MAX_NODES: 50,
    PROTOCOL_VERSION: 1,
  };

  constructor() {
    super();
    this.nodeId = this.generateNodeId();
    this.initializeCoordination();
  }

  /**
   * Initialize mesh coordination
   */
  private async initializeCoordination(): Promise<void> {
    try {
      // Initialize broadcast channel for cross-tab communication
      this.initializeBroadcastChannel();

      // Register service worker if supported
      if ("serviceWorker" in navigator) {
        await this.registerServiceWorker();
      }

      // Start coordination processes
      this.startHeartbeat();
      this.startSynchronization();

      // Register this node
      this.registerNode({
        id: this.nodeId,
        capabilities: this.getNodeCapabilities(),
        lastHeartbeat: Date.now(),
        knownPeers: [],
        routingVersion: 0,
      });

      this.emit("coordinator-initialized", { nodeId: this.nodeId });
    } catch (error) {
      console.error("Failed to initialize mesh coordinator:", error);
      this.emit("coordinator-error", error);
    }
  }

  /**
   * Initialize broadcast channel for cross-tab communication
   */
  private initializeBroadcastChannel(): void {
    if ("BroadcastChannel" in window) {
      this.broadcastChannel = new BroadcastChannel("bluchat-mesh");

      this.broadcastChannel.onmessage = (event) => {
        this.handleCoordinationMessage(event.data);
      };
    } else {
      console.warn(
        "BroadcastChannel not supported, using localStorage fallback",
      );
      // Implement localStorage-based fallback
      this.initializeLocalStorageFallback();
    }
  }

  /**
   * Initialize localStorage-based fallback for older browsers
   */
  private initializeLocalStorageFallback(): void {
    window.addEventListener("storage", (event) => {
      if (event.key === "bluchat-mesh-message" && event.newValue) {
        try {
          const message = JSON.parse(event.newValue);
          this.handleCoordinationMessage(message);
        } catch (error) {
          console.error("Failed to parse coordination message:", error);
        }
      }
    });
  }

  /**
   * Register service worker for background mesh coordination
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.register(
        "/mesh-worker.js",
        { scope: "/" },
      );

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      this.serviceWorker =
        registration.active || registration.installing || registration.waiting;

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.type === "mesh-coordination") {
          this.handleServiceWorkerMessage(event.data);
        }
      });

      // Register for background sync only when worker is active
      if (
        registration.active &&
        "serviceWorker" in navigator &&
        hasBackgroundSync(registration)
      ) {
        try {
          await registration.sync.register("mesh-sync");
          console.log("Background sync registered");
        } catch (error) {
          console.warn("Background sync registration failed:", error);
        }
      }

      // Register for periodic sync if available
      if (
        "serviceWorker" in navigator &&
        hasPeriodicBackgroundSync(registration)
      ) {
        try {
          await registration.periodicSync.register("mesh-sync", {
            minInterval: 24 * 60 * 60 * 1000, // 24 hours
          });
          console.log("Periodic sync registered");
        } catch (error) {
          console.warn("Periodic sync registration failed:", error);
        }
      }

      this.emit("service-worker-registered", registration);
    } catch (error) {
      console.error("Service worker registration failed:", error);
    }
  }

  /**
   * Start heartbeat broadcasting
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.broadcastHeartbeat();
    }, this.CONFIG.HEARTBEAT_INTERVAL);

    // Send initial heartbeat
    this.broadcastHeartbeat();
  }

  /**
   * Start periodic synchronization
   */
  private startSynchronization(): void {
    this.syncInterval = setInterval(() => {
      this.synchronizeMeshState();
    }, this.CONFIG.SYNC_INTERVAL);
  }

  /**
   * Broadcast heartbeat to all nodes
   */
  private broadcastHeartbeat(): void {
    const node = this.nodes.get(this.nodeId);
    if (!node) return;

    this.broadcastMessage({
      type: CoordinationMessageType.HEARTBEAT,
      nodeId: this.nodeId,
      payload: {
        capabilities: node.capabilities,
        knownPeers: node.knownPeers,
        routingVersion: node.routingVersion,
      },
      timestamp: Date.now(),
      version: this.CONFIG.PROTOCOL_VERSION,
    });
  }

  /**
   * Synchronize mesh state across nodes
   */
  private synchronizeMeshState(): void {
    // Remove stale nodes
    this.pruneStaleNodes();

    // Request sync from other nodes if needed
    if (this.shouldRequestSync()) {
      this.broadcastMessage({
        type: CoordinationMessageType.SYNC_REQUEST,
        nodeId: this.nodeId,
        payload: {
          routingVersion: this.getLocalRoutingVersion(),
        },
        timestamp: Date.now(),
        version: this.CONFIG.PROTOCOL_VERSION,
      });
    }
  }

  /**
   * Handle coordination message from other nodes
   * @param message - Coordination message
   */
  private handleCoordinationMessage(message: CoordinationMessage): void {
    // Ignore own messages
    if (message.nodeId === this.nodeId) return;

    // Validate protocol version
    if (message.version !== this.CONFIG.PROTOCOL_VERSION) {
      console.warn("Protocol version mismatch:", message.version);
      return;
    }

    switch (message.type) {
      case CoordinationMessageType.HEARTBEAT:
        this.handleHeartbeat(message);
        break;
      case CoordinationMessageType.TOPOLOGY_UPDATE:
        this.handleTopologyUpdate(message);
        break;
      case CoordinationMessageType.ROUTE_ANNOUNCEMENT:
        this.handleRouteAnnouncement(message);
        break;
      case CoordinationMessageType.PEER_DISCOVERY:
        this.handlePeerDiscovery(message);
        break;
      case CoordinationMessageType.SYNC_REQUEST:
        this.handleSyncRequest(message);
        break;
      case CoordinationMessageType.SYNC_RESPONSE:
        this.handleSyncResponse(message);
        break;
    }
  }

  /**
   * Handle heartbeat from another node
   * @param message - Heartbeat message
   */
  private handleHeartbeat(message: CoordinationMessage): void {
    const { nodeId, payload } = message;

    // Update or register node
    const existingNode = this.nodes.get(nodeId);
    if (existingNode) {
      existingNode.lastHeartbeat = Date.now();
      existingNode.capabilities = payload.capabilities;
      existingNode.knownPeers = payload.knownPeers;
      existingNode.routingVersion = payload.routingVersion;
    } else {
      this.registerNode({
        id: nodeId,
        capabilities: payload.capabilities,
        lastHeartbeat: Date.now(),
        knownPeers: payload.knownPeers || [],
        routingVersion: payload.routingVersion || 0,
      });
    }

    this.emit("node-heartbeat", { nodeId, payload });
  }

  /**
   * Handle topology update
   * @param message - Topology update message
   */
  private handleTopologyUpdate(message: CoordinationMessage): void {
    const { payload } = message;
    this.emit("topology-update", payload);
  }

  /**
   * Handle route announcement
   * @param message - Route announcement message
   */
  private handleRouteAnnouncement(message: CoordinationMessage): void {
    const { nodeId, payload } = message;
    this.emit("route-announcement", { nodeId, routes: payload.routes });
  }

  /**
   * Handle peer discovery
   * @param message - Peer discovery message
   */
  private handlePeerDiscovery(message: CoordinationMessage): void {
    const { nodeId, payload } = message;
    this.emit("peer-discovery", { nodeId, peers: payload.peers });
  }

  /**
   * Handle sync request
   * @param _message - Sync request message (unused)
   */
  private handleSyncRequest(_message: CoordinationMessage): void {
    // Send current mesh state to requesting node
    this.broadcastMessage({
      type: CoordinationMessageType.SYNC_RESPONSE,
      nodeId: this.nodeId,
      payload: {
        nodes: Array.from(this.nodes.values()),
        routingVersion: this.getLocalRoutingVersion(),
        topology: this.getMeshTopology(),
      },
      timestamp: Date.now(),
      version: this.CONFIG.PROTOCOL_VERSION,
    });
  }

  /**
   * Handle sync response
   * @param message - Sync response message
   */
  private handleSyncResponse(message: CoordinationMessage): void {
    const { payload } = message;

    // Update local state with received data
    if (payload.nodes) {
      payload.nodes.forEach((node: MeshNode) => {
        if (node.id !== this.nodeId) {
          this.nodes.set(node.id, node);
        }
      });
    }

    this.emit("mesh-synchronized", payload);
  }

  /**
   * Handle message from service worker
   * @param data - Service worker message data
   */
  private handleServiceWorkerMessage(data: any): void {
    switch (data.action) {
      case "mesh-update":
        this.emit("service-worker-update", data.payload);
        break;
      case "background-scan-result":
        this.emit("background-scan-result", data.payload);
        break;
      case "mesh-health-alert":
        this.handleMeshHealthAlert(data.payload);
        break;
      case "route-optimization":
        this.handleRouteOptimization(data.payload);
        break;
      case "network-partition-detected":
        this.handleNetworkPartition(data.payload);
        break;
    }
  }

  /**
   * Handle mesh health alert from service worker
   * @param payload - Health alert data
   */
  private handleMeshHealthAlert(payload: any): void {
    console.warn("Mesh health alert:", payload);
    this.emit("mesh-health-alert", payload);

    // Take corrective action if needed
    if (payload.issues) {
      payload.issues.forEach((issue: any) => {
        switch (issue.type) {
          case "stale-nodes":
            this.handleStaleNodes(issue.nodes);
            break;
          case "isolated-nodes":
            this.handleIsolatedNodes(issue.nodes);
            break;
          case "partition":
            this.handleNetworkPartition(issue);
            break;
        }
      });
    }
  }

  /**
   * Handle route optimization suggestions
   * @param payload - Route optimization data
   */
  private handleRouteOptimization(payload: any): void {
    console.log("Route optimization suggestion:", payload);
    this.emit("route-optimization", payload);
  }

  /**
   * Handle network partition detection
   * @param payload - Partition data
   */
  private handleNetworkPartition(payload: any): void {
    console.warn("Network partition detected:", payload);
    this.emit("network-partition", payload);

    // Request immediate sync from all available nodes
    this.broadcastMessage({
      type: CoordinationMessageType.SYNC_REQUEST,
      nodeId: this.nodeId,
      payload: {
        urgent: true,
        reason: "partition-recovery",
        routingVersion: this.getLocalRoutingVersion(),
      },
      timestamp: Date.now(),
      version: this.CONFIG.PROTOCOL_VERSION,
    });
  }

  /**
   * Handle stale nodes by removing them from topology
   * @param staleNodeIds - IDs of stale nodes
   */
  private handleStaleNodes(staleNodeIds: string[]): void {
    staleNodeIds.forEach((nodeId) => {
      this.nodes.delete(nodeId);
      this.emit("node-removed", nodeId);
    });
  }

  /**
   * Handle isolated nodes by attempting reconnection
   * @param isolatedNodeIds - IDs of isolated nodes
   */
  private handleIsolatedNodes(isolatedNodeIds: string[]): void {
    // In a real implementation, this would trigger connection attempts
    this.emit("nodes-isolated", isolatedNodeIds);
  }

  /**
   * Register a new node in the mesh
   * @param node - Node information
   */
  private registerNode(node: MeshNode): void {
    if (this.nodes.size >= this.CONFIG.MAX_NODES) {
      // Remove oldest node to make room
      const oldestNode = Array.from(this.nodes.values()).sort(
        (a, b) => a.lastHeartbeat - b.lastHeartbeat,
      )[0];
      if (oldestNode) {
        this.nodes.delete(oldestNode.id);
      }
    }

    this.nodes.set(node.id, node);
    this.emit("node-registered", node);
  }

  /**
   * Remove stale nodes that haven't sent heartbeats
   */
  private pruneStaleNodes(): void {
    const now = Date.now();
    const staleNodes: string[] = [];

    this.nodes.forEach((node, id) => {
      if (
        id !== this.nodeId &&
        now - node.lastHeartbeat > this.CONFIG.NODE_TIMEOUT
      ) {
        staleNodes.push(id);
      }
    });

    staleNodes.forEach((id) => {
      this.nodes.delete(id);
      this.emit("node-removed", id);
    });
  }

  /**
   * Broadcast message to all nodes
   * @param message - Message to broadcast
   */
  private broadcastMessage(message: CoordinationMessage): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(message);
    } else {
      // Fallback to localStorage
      localStorage.setItem("bluchat-mesh-message", JSON.stringify(message));
    }

    // Also send to service worker if available
    if (this.serviceWorker) {
      this.serviceWorker.postMessage({
        type: "mesh-coordination",
        message,
      });
    }
  }

  /**
   * Generate unique node ID
   * @returns Generated node ID
   */
  private generateNodeId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get node capabilities
   * @returns Current node capabilities
   */
  private getNodeCapabilities(): NodeCapabilities {
    return {
      canRelay: true,
      isBridge: "serviceWorker" in navigator,
      maxTTL: 7,
      protocolVersions: [this.CONFIG.PROTOCOL_VERSION],
    };
  }

  /**
   * Check if sync should be requested
   * @returns Whether to request sync
   */
  private shouldRequestSync(): boolean {
    // Request sync if we have fewer nodes than others report
    const localNodeCount = this.nodes.size;
    const reportedCounts = Array.from(this.nodes.values()).map(
      (n) => n.knownPeers.length,
    );

    return reportedCounts.some((count) => count > localNodeCount + 2);
  }

  /**
   * Get local routing version
   * @returns Current routing table version
   */
  private getLocalRoutingVersion(): number {
    const node = this.nodes.get(this.nodeId);
    return node?.routingVersion || 0;
  }

  /**
   * Get current mesh topology
   * @returns Mesh topology information
   */
  getMeshTopology(): {
    nodes: MeshNode[];
    connections: Array<{ from: string; to: string }>;
    bridges: string[];
  } {
    const nodes = Array.from(this.nodes.values());
    const connections: Array<{ from: string; to: string }> = [];
    const bridges = nodes
      .filter((n) => n.capabilities.isBridge)
      .map((n) => n.id);

    // Build connection map from known peers
    nodes.forEach((node) => {
      node.knownPeers.forEach((peerId) => {
        connections.push({ from: node.id, to: peerId });
      });
    });

    return { nodes, connections, bridges };
  }

  /**
   * Update peer information for this node
   * @param peers - Current peer list
   */
  updatePeers(peers: Peer[]): void {
    const node = this.nodes.get(this.nodeId);
    if (node) {
      node.knownPeers = peers.map((p) => p.id);
      node.routingVersion++;

      // Announce topology update
      this.broadcastMessage({
        type: CoordinationMessageType.TOPOLOGY_UPDATE,
        nodeId: this.nodeId,
        payload: {
          peers: node.knownPeers,
          routingVersion: node.routingVersion,
        },
        timestamp: Date.now(),
        version: this.CONFIG.PROTOCOL_VERSION,
      });
    }
  }

  /**
   * Coordinate message relay through optimal path
   * @param _message - Message to relay (unused in pathfinding)
   * @param targetId - Target node/peer ID
   * @returns Optimal relay path
   */
  findOptimalPath(_message: Message, targetId: string): string[] {
    // Simple BFS to find shortest path
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; path: string[] }> = [
      { nodeId: this.nodeId, path: [this.nodeId] },
    ];

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;

      if (nodeId === targetId) {
        return path;
      }

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = this.nodes.get(nodeId);
      if (node) {
        node.knownPeers.forEach((peerId) => {
          if (!visited.has(peerId)) {
            queue.push({ nodeId: peerId, path: [...path, peerId] });
          }
        });
      }
    }

    return []; // No path found
  }

  /**
   * Get coordination statistics
   * @returns Coordination stats
   */
  getCoordinationStats(): {
    totalNodes: number;
    activeNodes: number;
    bridges: number;
    averageConnections: number;
  } {
    const now = Date.now();
    const activeNodes = Array.from(this.nodes.values()).filter(
      (n) => now - n.lastHeartbeat < this.CONFIG.NODE_TIMEOUT,
    );

    const totalConnections = activeNodes.reduce(
      (sum, node) => sum + node.knownPeers.length,
      0,
    );

    return {
      totalNodes: this.nodes.size,
      activeNodes: activeNodes.length,
      bridges: activeNodes.filter((n) => n.capabilities.isBridge).length,
      averageConnections:
        activeNodes.length > 0 ? totalConnections / activeNodes.length : 0,
    };
  }

  /**
   * Start background scanning through service worker
   */
  startBackgroundScanning(): void {
    if (this.serviceWorker) {
      this.serviceWorker.postMessage({
        type: "start-background-scan",
      });
    }
  }

  /**
   * Stop background scanning
   */
  stopBackgroundScanning(): void {
    if (this.serviceWorker) {
      this.serviceWorker.postMessage({
        type: "stop-background-scan",
      });
    }
  }

  /**
   * Get mesh state from service worker
   */
  async getMeshStateFromServiceWorker(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.serviceWorker) {
        reject(new Error("Service worker not available"));
        return;
      }

      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === "mesh-state") {
          resolve(event.data.state);
        } else {
          reject(new Error("Unexpected response type"));
        }
      };

      this.serviceWorker.postMessage({ type: "get-mesh-state" }, [
        messageChannel.port2,
      ]);
    });
  }

  /**
   * Optimize mesh topology by identifying and fixing issues
   */
  async optimizeMeshTopology(): Promise<void> {
    const topology = this.getMeshTopology();
    const optimizations: any[] = [];

    // Find nodes with too many connections (hubs)
    const hubs = topology.nodes.filter((node) => node.knownPeers.length > 10);
    hubs.forEach((hub) => {
      optimizations.push({
        type: "load-balancing",
        nodeId: hub.id,
        suggestion: "distribute-connections",
        reason: "node-overloaded",
      });
    });

    // Find nodes with too few connections (isolated)
    const isolated = topology.nodes.filter(
      (node) => node.knownPeers.length < 2,
    );
    isolated.forEach((node) => {
      optimizations.push({
        type: "connectivity",
        nodeId: node.id,
        suggestion: "increase-connections",
        reason: "node-isolated",
      });
    });

    // Find potential bridge nodes
    const bridgeNodes = this.identifyBridgeNodes(topology);
    bridgeNodes.forEach((nodeId) => {
      optimizations.push({
        type: "bridge-enhancement",
        nodeId,
        suggestion: "enhance-bridge-capabilities",
        reason: "critical-bridge-node",
      });
    });

    if (optimizations.length > 0) {
      this.emit("topology-optimization", optimizations);

      // Send optimization suggestions to service worker
      if (this.serviceWorker) {
        this.serviceWorker.postMessage({
          type: "topology-optimization",
          optimizations,
        });
      }
    }
  }

  /**
   * Identify bridge nodes in the mesh topology
   * @param topology - Current mesh topology
   * @returns Array of bridge node IDs
   */
  private identifyBridgeNodes(topology: any): string[] {
    const bridgeNodes: string[] = [];

    // Simple bridge detection: nodes whose removal would disconnect the graph
    topology.nodes.forEach((node: any) => {
      const withoutNode = {
        ...topology,
        nodes: topology.nodes.filter((n: any) => n.id !== node.id),
        connections: topology.connections.filter(
          (c: any) => c.from !== node.id && c.to !== node.id,
        ),
      };

      // Check if removing this node disconnects the graph
      if (this.isGraphDisconnected(withoutNode)) {
        bridgeNodes.push(node.id);
      }
    });

    return bridgeNodes;
  }

  /**
   * Check if a graph is disconnected
   * @param topology - Graph topology
   * @returns Whether the graph is disconnected
   */
  private isGraphDisconnected(topology: any): boolean {
    if (topology.nodes.length === 0) return false;

    const visited = new Set<string>();
    const stack = [topology.nodes[0].id];

    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      if (visited.has(nodeId)) continue;

      visited.add(nodeId);

      // Add connected nodes to stack
      topology.connections.forEach((connection: any) => {
        if (connection.from === nodeId && !visited.has(connection.to)) {
          stack.push(connection.to);
        }
        if (connection.to === nodeId && !visited.has(connection.from)) {
          stack.push(connection.from);
        }
      });
    }

    return visited.size < topology.nodes.length;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    this.nodes.clear();
    this.removeAllListeners();
  }
}
