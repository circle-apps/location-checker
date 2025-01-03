interface WifiNetwork {
  macAddress: string;
  signalStrength: number;
  channel?: number;
  age?: number;
  signalToNoiseRatio?: number;
}

interface WifiResponse {
  networks: WifiNetwork[];
  error?: string;
}

const WIFI_API_URL = 'http://localhost:8000/api/wifi';

export async function scanWifiNetworks(): Promise<WifiNetwork[]> {
  try {
    console.log('[WiFi Service] Starting WiFi scan');
    const response = await fetch(WIFI_API_URL);
    const data: WifiResponse = await response.json();

    // filter out unwanted mac addresses
    // macs = macs.filter(m => 0 === (2 & Number.parseInt(m[1], 16)) && m.substr(0, 8).toUpperCase() !== '00:00:5E');
    data.networks = data.networks.filter(
      (m) => 0 === (2 & Number.parseInt(m.macAddress[1], 16)) && m.macAddress.substr(0, 8).toUpperCase() !== '00:00:5E',
    );

    if (!response.ok) {
      throw new Error(data.error || 'Failed to scan WiFi networks');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    console.log('[WiFi Service] Scan complete', { networks: data.networks });
    return data.networks;
  } catch (error) {
    console.error('[WiFi Service] Error scanning WiFi:', error);
    throw error;
  }
}
