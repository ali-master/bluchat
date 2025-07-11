# BluChat Cross-Platform Bluetooth Setup Guide

## Overview
BluChat uses Web Bluetooth API which has specific requirements and limitations for cross-platform connectivity between Android and macOS devices.

## Requirements

### macOS Requirements
- macOS 10.15 (Catalina) or later
- Chrome, Edge, or Opera browser (Safari doesn't support Web Bluetooth)
- Bluetooth must be enabled in System Preferences
- Browser must have permission to use Bluetooth

### Android Requirements
- Android 6.0 (Marshmallow) or later
- Chrome for Android 85+ or Edge
- Bluetooth and Location Services must be enabled
- Browser must have Bluetooth permission granted

## Setup Instructions

### On macOS
1. **Use a supported browser**: Chrome, Edge, or Opera (NOT Safari)
2. **Enable Bluetooth**: System Preferences → Bluetooth → Turn On
3. **Grant permissions**: When prompted, allow the website to use Bluetooth
4. **HTTPS Required**: Access the app via HTTPS (https://localhost or deployed URL)

### On Android
1. **Enable Bluetooth**: Settings → Bluetooth → Turn On
2. **Enable Location**: Settings → Location → Turn On (required for BLE scanning)
3. **Use Chrome/Edge**: Install and use Chrome or Edge browser
4. **Grant permissions**: Allow Bluetooth and Location permissions when prompted

## Connection Process

### Method 1: Android as Central, macOS as Peripheral
1. On macOS: Click "Start Advertising" (simulated - Web Bluetooth limitation)
2. On Android: Click "Scan for Devices"
3. Select the macOS device from the list
4. Confirm pairing on both devices

### Method 2: Direct Connection with Shared UUIDs
1. Both devices must use the same Service UUID
2. Export UUID configuration from one device
3. Import the same configuration on the other device
4. Use manual connection with device address

## Troubleshooting

### Common Issues

1. **"No devices found" on Android**
   - Ensure Location Services are enabled
   - Check that both devices are using the same Service UUID
   - Try moving devices closer (within 10 meters)
   - Restart Bluetooth on both devices

2. **"Connection failed" errors**
   - Verify HTTPS is being used (not HTTP)
   - Clear browser cache and cookies
   - Reset Bluetooth on both devices
   - Try using fallback UUIDs

3. **"Unsupported browser" on macOS**
   - Switch from Safari to Chrome/Edge/Opera
   - Update browser to latest version

4. **Permissions denied**
   - Reset site permissions in browser settings
   - For Chrome: chrome://settings/content/bluetoothDevices
   - Grant all requested permissions

## Technical Limitations

### Web Bluetooth API Limitations
- Cannot act as a true peripheral (server) mode
- Cannot perform background scanning
- Requires user gesture to initiate connection
- Limited to Central/Client role only

### Cross-Platform Considerations
- iOS/iPadOS: Not supported (no Web Bluetooth API)
- Windows: Requires Windows 10 version 1903+
- Linux: Requires Chrome with experimental features

## Alternative Solutions

### For Production Use
Consider implementing native apps with:
- React Native with react-native-ble-plx
- Flutter with flutter_blue_plus
- Native Android/iOS development

### For Testing
Use two Android devices or two computers (Windows/macOS/Linux) with Chrome for best compatibility.

## UUID Configuration

### Default UUIDs
If custom UUIDs fail, use these standard Bluetooth UUIDs:
- Service: `0000180f-0000-1000-8000-00805f9b34fb` (Battery Service)
- Characteristic: `00002a19-0000-1000-8000-00805f9b34fb` (Battery Level)

### Custom UUID Format
BluChat uses the format: `0000xxxx-0000-1000-8000-00805f9b34fb`
Where `xxxx` is a 4-digit hex value unique to your app instance.

## Development Tips

1. **Use Chrome DevTools**
   - chrome://bluetooth-internals for debugging
   - Monitor console for detailed error messages

2. **Test with Known Working Devices**
   - Use two computers first to verify the app works
   - Then test with mobile devices

3. **Enable Experimental Features** (if needed)
   - chrome://flags/#enable-experimental-web-platform-features
   - Enable "Experimental Web Platform features"

## Security Notes

- Always use HTTPS in production
- Implement proper authentication before establishing connections
- Validate all received data
- Use encryption for sensitive messages