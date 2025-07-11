/**
 * Service Worker for BluChat mesh coordination
 * Handles background scanning and mesh topology management
 */

// Worker configuration
const CONFIG = {
  CACHE_NAME: "bluchat-v1",
  MESH_DB_NAME: "bluchat-mesh",
  MESH_DB_VERSION: 1,
  SCAN_INTERVAL: 30000, // 30 seconds
  MAX_CACHED_MESSAGES: 1000,
};

// Active connections and state
let meshState = {
  nodes: new Map(),
  pendingMessages: [],
  lastScanTime: 0,
  isScanning: false,
};

/**
 * Service worker installation
 */
self.addEventListener("install", (event) => {
  console.log("[Mesh Worker] Installing...");

  event.waitUntil(
    Promise.all([
      // Pre-cache essential files
      caches.open(CONFIG.CACHE_NAME).then((cache) => {
        return cache.addAll(["/"]).catch((error) => {
          console.warn("[Mesh Worker] Cache initialization failed:", error);
          // Continue without caching
          return Promise.resolve();
        });
      }),
      // Initialize IndexedDB for mesh data
      initializeMeshDatabase().catch((error) => {
        console.warn("[Mesh Worker] DB initialization failed:", error);
        return Promise.resolve();
      }),
    ]),
  );

  // Skip waiting to activate immediately
  self.skipWaiting();
});

/**
 * Service worker activation
 */
self.addEventListener("activate", (event) => {
  console.log("[Mesh Worker] Activating...");

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CONFIG.CACHE_NAME)
            .map((name) => caches.delete(name)),
        );
      }),
      // Claim all clients
      self.clients.claim(),
    ]),
  );
});

/**
 * Handle fetch requests
 */
self.addEventListener("fetch", (event) => {
  // Only cache GET requests from http/https
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if available
      if (response) {
        return response;
      }

      // Otherwise fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Cache successful responses from http/https only
        if (networkResponse && networkResponse.status === 200) {
          const url = new URL(event.request.url);

          // Only cache http/https requests
          if (url.protocol === "http:" || url.protocol === "https:") {
            const responseToCache = networkResponse.clone();

            caches
              .open(CONFIG.CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.warn("[Mesh Worker] Cache put failed:", error);
              });
          }
        }

        return networkResponse;
      });
    }),
  );
});

/**
 * Handle messages from clients
 */
self.addEventListener("message", (event) => {
  try {
    const { type, message } = event.data;

    switch (type) {
      case "mesh-coordination":
        handleMeshCoordination(message, event.source);
        break;
      case "start-background-scan":
        startBackgroundScanning();
        break;
      case "stop-background-scan":
        stopBackgroundScanning();
        break;
      case "get-mesh-state":
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            type: "mesh-state",
            state: serializeMeshState(),
          });
        }
        break;
      default:
        console.warn("[Mesh Worker] Unknown message type:", type);
    }
  } catch (error) {
    console.error("[Mesh Worker] Message handling error:", error);
  }
});

/**
 * Handle periodic sync for background updates
 */
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "mesh-sync") {
    event.waitUntil(performMeshSync());
  }
});

/**
 * Handle push notifications for mesh updates
 */
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  if (data.type === "mesh-update") {
    event.waitUntil(
      handleMeshUpdate(data).then(() => {
        // Notify all clients of the update
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "mesh-update",
              payload: data,
            });
          });
        });
      }),
    );
  }
});

/**
 * Initialize IndexedDB for mesh data storage
 */
async function initializeMeshDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CONFIG.MESH_DB_NAME, CONFIG.MESH_DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores
      if (!db.objectStoreNames.contains("messages")) {
        db.createObjectStore("messages", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("nodes")) {
        db.createObjectStore("nodes", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("routes")) {
        db.createObjectStore("routes", { keyPath: "id" });
      }
    };
  });
}

/**
 * Handle mesh coordination messages
 */
async function handleMeshCoordination(message, source) {
  const { type, nodeId, payload } = message;

  // Update mesh state
  switch (type) {
    case "HEARTBEAT":
      updateNodeHeartbeat(nodeId, payload);
      break;
    case "TOPOLOGY_UPDATE":
      updateMeshTopology(nodeId, payload);
      break;
    case "ROUTE_ANNOUNCEMENT":
      updateRoutes(nodeId, payload);
      break;
  }

  // Store in database
  await storeMeshUpdate(message);

  // Broadcast to other clients
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    if (client.id !== source.id) {
      client.postMessage({
        type: "mesh-coordination",
        message,
      });
    }
  });
}

/**
 * Update node heartbeat information
 */
function updateNodeHeartbeat(nodeId, payload) {
  meshState.nodes.set(nodeId, {
    id: nodeId,
    lastHeartbeat: Date.now(),
    ...payload,
  });

  // Prune stale nodes
  const now = Date.now();
  const staleThreshold = 60000; // 1 minute

  for (const [id, node] of meshState.nodes) {
    if (now - node.lastHeartbeat > staleThreshold) {
      meshState.nodes.delete(id);
    }
  }
}

/**
 * Update mesh topology
 */
function updateMeshTopology(nodeId, payload) {
  const node = meshState.nodes.get(nodeId);
  if (node) {
    node.peers = payload.peers;
    node.routingVersion = payload.routingVersion;
  }
}

/**
 * Update routing information
 */
async function updateRoutes(nodeId, payload) {
  const db = await initializeMeshDatabase();
  const transaction = db.transaction(["routes"], "readwrite");
  const store = transaction.objectStore("routes");

  // Store routes
  for (const route of payload.routes) {
    await store.put({
      id: `${nodeId}_${route.destination}`,
      source: nodeId,
      destination: route.destination,
      nextHop: route.nextHop,
      metric: route.metric,
      timestamp: Date.now(),
    });
  }
}

/**
 * Store mesh update in database
 */
async function storeMeshUpdate(message) {
  const db = await initializeMeshDatabase();
  const transaction = db.transaction(["messages"], "readwrite");
  const store = transaction.objectStore("messages");

  // Add timestamp if not present
  if (!message.timestamp) {
    message.timestamp = Date.now();
  }

  // Ensure message has an id property (required for keyPath)
  if (!message.id) {
    message.id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Store message
  await store.put(message);

  // Clean up old messages
  const allMessages = await store.getAll();
  if (allMessages.length > CONFIG.MAX_CACHED_MESSAGES) {
    const oldMessages = allMessages
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, allMessages.length - CONFIG.MAX_CACHED_MESSAGES);

    for (const msg of oldMessages) {
      await store.delete(msg.id);
    }
  }
}

/**
 * Start background scanning
 */
let scanInterval = null;

function startBackgroundScanning() {
  if (scanInterval) return;

  console.log("[Mesh Worker] Starting background scanning...");

  scanInterval = setInterval(() => {
    performBackgroundScan();
  }, CONFIG.SCAN_INTERVAL);

  // Perform initial scan
  performBackgroundScan();
}

/**
 * Stop background scanning
 */
function stopBackgroundScanning() {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
    console.log("[Mesh Worker] Stopped background scanning");
  }
}

/**
 * Perform background scan
 */
async function performBackgroundScan() {
  if (meshState.isScanning) return;

  meshState.isScanning = true;
  meshState.lastScanTime = Date.now();

  try {
    // Simulate scanning (in real implementation, this would use Web Bluetooth)
    const scanResults = await simulateScan();

    // Process scan results
    const processedResults = processScanResults(scanResults);

    // Analyze scan results for optimization
    const scanAnalysis = await analyzeScanResults(processedResults);

    // Notify clients
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "background-scan-result",
        payload: {
          ...processedResults,
          analysis: scanAnalysis,
        },
      });
    });

    // Store results
    await storeScanResults(processedResults);

    // Trigger optimization if needed
    if (scanAnalysis.optimizationNeeded) {
      await triggerScanOptimization(scanAnalysis);
    }
  } catch (error) {
    console.error("[Mesh Worker] Scan error:", error);
  } finally {
    meshState.isScanning = false;
  }
}

/**
 * Simulate bluetooth scan (mock implementation)
 */
async function simulateScan() {
  // In real implementation, this would use Web Bluetooth API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        devices: [
          { id: "device1", name: "BluChat Device 1", rssi: -60 },
          { id: "device2", name: "BluChat Device 2", rssi: -75 },
        ],
        timestamp: Date.now(),
      });
    }, 1000);
  });
}

/**
 * Process scan results
 */
function processScanResults(results) {
  return {
    ...results,
    processed: true,
    meshNodes: meshState.nodes.size,
    knownDevices: results.devices.filter((d) =>
      Array.from(meshState.nodes.values()).some((n) => n.deviceId === d.id),
    ).length,
  };
}

/**
 * Store scan results in database
 */
async function storeScanResults(results) {
  const db = await initializeMeshDatabase();
  const transaction = db.transaction(["messages"], "readwrite");
  const store = transaction.objectStore("messages");

  await store.put({
    id: `scan_${results.timestamp}`,
    type: "SCAN_RESULT",
    timestamp: results.timestamp,
    payload: results,
  });
}

/**
 * Perform periodic mesh synchronization
 */
async function performMeshSync() {
  console.log("[Mesh Worker] Performing mesh sync...");

  try {
    // Get all stored mesh data
    const db = await initializeMeshDatabase();
    const transaction = db.transaction(["nodes", "routes"], "readonly");

    const nodes = await transaction.objectStore("nodes").getAll();
    const routes = await transaction.objectStore("routes").getAll();

    // Analyze mesh health
    const meshHealth = analyzeMeshHealth(nodes, routes);

    // Notify clients if issues detected
    if (meshHealth.issues.length > 0) {
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: "mesh-health-alert",
          payload: meshHealth,
        });
      });
    }

    return meshHealth;
  } catch (error) {
    console.error("[Mesh Worker] Sync error:", error);
    throw error;
  }
}

/**
 * Handle mesh update from push notification
 */
async function handleMeshUpdate(data) {
  // Update local mesh state
  if (data.nodes) {
    data.nodes.forEach((node) => {
      meshState.nodes.set(node.id, node);
    });
  }

  // Store update
  await storeMeshUpdate({
    id: `update_${Date.now()}`,
    type: "MESH_UPDATE",
    payload: data,
    timestamp: Date.now(),
  });

  return true;
}

/**
 * Serialize mesh state for transmission
 */
function serializeMeshState() {
  return {
    nodes: Array.from(meshState.nodes.values()),
    pendingMessages: meshState.pendingMessages,
    lastScanTime: meshState.lastScanTime,
    isScanning: meshState.isScanning,
  };
}

/**
 * Analyze scan results for optimization opportunities
 */
async function analyzeScanResults(results) {
  const analysis = {
    optimizationNeeded: false,
    recommendations: [],
    metrics: {
      deviceDensity: results.devices.length,
      averageRssi:
        results.devices.reduce((sum, d) => sum + d.rssi, 0) /
        results.devices.length,
      signalQuality: "good",
    },
  };

  // Analyze device density
  if (results.devices.length > 10) {
    analysis.optimizationNeeded = true;
    analysis.recommendations.push({
      type: "scan-frequency",
      suggestion: "reduce-scan-frequency",
      reason: "high-device-density",
    });
  } else if (results.devices.length < 2) {
    analysis.optimizationNeeded = true;
    analysis.recommendations.push({
      type: "scan-frequency",
      suggestion: "increase-scan-frequency",
      reason: "low-device-density",
    });
  }

  // Analyze signal quality
  if (analysis.metrics.averageRssi < -80) {
    analysis.metrics.signalQuality = "poor";
    analysis.optimizationNeeded = true;
    analysis.recommendations.push({
      type: "scan-power",
      suggestion: "increase-scan-power",
      reason: "poor-signal-quality",
    });
  }

  return analysis;
}

/**
 * Trigger scan optimization based on analysis
 */
async function triggerScanOptimization(analysis) {
  console.log("[Mesh Worker] Triggering scan optimization:", analysis);

  // Notify clients about optimization
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: "scan-optimization",
      payload: analysis,
    });
  });
}

/**
 * Enhanced mesh health analysis with predictive capabilities
 */
function analyzeMeshHealth(nodes, routes) {
  const issues = [];
  const now = Date.now();

  // Check for stale nodes
  const staleNodes = nodes.filter((n) => now - n.lastHeartbeat > 120000);
  if (staleNodes.length > 0) {
    issues.push({
      type: "stale-nodes",
      severity: "medium",
      count: staleNodes.length,
      nodes: staleNodes.map((n) => n.id),
    });
  }

  // Check for isolated nodes
  const isolatedNodes = nodes.filter(
    (n) => !routes.some((r) => r.source === n.id || r.destination === n.id),
  );
  if (isolatedNodes.length > 0) {
    issues.push({
      type: "isolated-nodes",
      severity: "high",
      count: isolatedNodes.length,
      nodes: isolatedNodes.map((n) => n.id),
    });
  }

  // Check for network partitions
  const partitions = detectNetworkPartitions(nodes, routes);
  if (partitions.length > 1) {
    issues.push({
      type: "network-partition",
      severity: "critical",
      partitions: partitions.map((p) => p.map((n) => n.id)),
    });
  }

  // Predict potential issues
  const predictions = predictPotentialIssues(nodes, routes);

  // Calculate mesh metrics
  const metrics = {
    totalNodes: nodes.length,
    activeNodes: nodes.filter((n) => now - n.lastHeartbeat < 30000).length,
    totalRoutes: routes.length,
    averageRouteAge:
      routes.length > 0
        ? routes.reduce((sum, r) => sum + (now - r.timestamp), 0) /
          routes.length
        : 0,
    connectivity: calculateConnectivity(nodes, routes),
    resilience: calculateResilience(nodes, routes),
  };

  return {
    healthy: issues.length === 0,
    issues,
    predictions,
    metrics,
    timestamp: now,
  };
}

/**
 * Detect network partitions in the mesh
 */
function detectNetworkPartitions(nodes, routes) {
  const partitions = [];
  const visited = new Set();

  nodes.forEach((node) => {
    if (visited.has(node.id)) return;

    const partition = [];
    const stack = [node];

    while (stack.length > 0) {
      const current = stack.pop();
      if (visited.has(current.id)) continue;

      visited.add(current.id);
      partition.push(current);

      // Find connected nodes
      routes.forEach((route) => {
        if (route.source === current.id) {
          const target = nodes.find((n) => n.id === route.destination);
          if (target && !visited.has(target.id)) {
            stack.push(target);
          }
        }
        if (route.destination === current.id) {
          const source = nodes.find((n) => n.id === route.source);
          if (source && !visited.has(source.id)) {
            stack.push(source);
          }
        }
      });
    }

    if (partition.length > 0) {
      partitions.push(partition);
    }
  });

  return partitions;
}

/**
 * Predict potential mesh issues
 */
function predictPotentialIssues(nodes, routes) {
  const predictions = [];
  const now = Date.now();

  // Predict node failures based on heartbeat patterns
  nodes.forEach((node) => {
    const timeSinceHeartbeat = now - node.lastHeartbeat;
    if (timeSinceHeartbeat > 60000 && timeSinceHeartbeat < 120000) {
      predictions.push({
        type: "node-failure-risk",
        nodeId: node.id,
        probability: Math.min(timeSinceHeartbeat / 120000, 0.9),
        timeToFailure: 120000 - timeSinceHeartbeat,
      });
    }
  });

  // Predict route failures based on age
  routes.forEach((route) => {
    const routeAge = now - route.timestamp;
    if (routeAge > 300000) {
      // 5 minutes
      predictions.push({
        type: "route-staleness",
        routeId: route.id,
        age: routeAge,
        recommendation: "refresh-route",
      });
    }
  });

  return predictions;
}

/**
 * Calculate mesh connectivity score
 */
function calculateConnectivity(nodes, routes) {
  if (nodes.length === 0) return 0;

  const totalPossibleConnections = (nodes.length * (nodes.length - 1)) / 2;
  const actualConnections = routes.length;

  return Math.min(actualConnections / totalPossibleConnections, 1);
}

/**
 * Calculate mesh resilience score
 */
function calculateResilience(nodes, routes) {
  if (nodes.length === 0) return 0;

  // Simple resilience calculation based on redundant paths
  const nodeConnections = new Map();
  nodes.forEach((node) => nodeConnections.set(node.id, 0));

  routes.forEach((route) => {
    nodeConnections.set(
      route.source,
      (nodeConnections.get(route.source) || 0) + 1,
    );
    nodeConnections.set(
      route.destination,
      (nodeConnections.get(route.destination) || 0) + 1,
    );
  });

  const averageConnections =
    Array.from(nodeConnections.values()).reduce(
      (sum, count) => sum + count,
      0,
    ) / nodes.length;

  // Resilience is higher when nodes have more connections
  return Math.min(averageConnections / 4, 1); // Normalize to 0-1 scale
}

// Log service worker start
console.log("[Mesh Worker] Service worker started");
