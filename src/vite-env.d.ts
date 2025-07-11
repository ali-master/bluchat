/// <reference types="vite/client" />
/// <reference types="vite/types/importMeta.d.ts" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="web-bluetooth" />

import type { BluetoothService } from "@/services/bluetooth-service";
import type { StorageService } from "@/services/storage-service";
import type { CryptoService } from "@/services/crypto-service";

declare global {
  interface Window {
    bluetoothService: BluetoothService;
    storageService: StorageService;
    cryptoService: CryptoService;
  }
}
