interface WifiNetwork {
  macAddress: string;
  signalStrength: number;
  channel?: number;
  age?: number;
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
