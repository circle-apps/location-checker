import { useState, useEffect } from 'react';
import { LocationData, LocationProvider, LocationError } from '../../types';
import { getStoredApiKey, setStoredApiKey, removeStoredApiKey } from '../../utils/storage';

interface GoogleProviderProps {
  useWifi: boolean;
  useCellular: boolean;
  useIp: boolean;
  networkInfo: {
    mcc: string;
    mnc: string;
    carrier: string;
  };
  onLocationUpdate: (location: LocationData) => void;
  onError: (error: any) => void;
}

interface WifiNetwork {
  macAddress: string;
  signalStrength: number;
  channel?: number;
}

interface CellTower {
  cellId: number;
  locationAreaCode: number;
  mobileCountryCode: number;
  mobileNetworkCode: number;
  signalStrength?: number;
}

export function useGoogleProvider({
  useWifi,
  useCellular,
  useIp,
  networkInfo,
  onLocationUpdate,
  onError,
}: GoogleProviderProps): LocationProvider {
  const [apiKey, setApiKey] = useState<string | null>(getStoredApiKey());
  const [wifiNetworks, _setWifiNetworks] = useState<WifiNetwork[]>([]);
  const [cellTowers, _setCellTowers] = useState<CellTower[]>([]);

  useEffect(() => {
    if (useWifi) {
      try {
        fetch('http://localhost:3000/api/networkInfo')
          .then((resp) => resp.json())
          .then((data) => {
            _setWifiNetworks([data]);
          });

        // Request WiFi networks if available
        // if ('getNetworkInformation' in navigator) {
        //   // This is a placeholder as the Network Information API doesn't actually provide WiFi data
        //   // In a real implementation, you'd need to use platform-specific APIs or a native bridge
        //   console.warn('[Google Provider] WiFi scanning not available in browser');
        // }
      } catch (error) {
        console.log('Error : ', error);
      }
    }
  }, [useWifi]);

  console.log('wifiNetworks >>', wifiNetworks);
  const getLocation = async () => {
    // Get or prompt for API key first
    let currentApiKey = apiKey;
    if (!currentApiKey) {
      const key = window.prompt('Please enter your Google Geolocation API key:');
      if (!key) {
        throw new LocationError(
          'No API key provided',
          'API key required',
          'Please provide a valid Google Geolocation API key to use this provider.',
        );
      }
      setApiKey(key);
      setStoredApiKey(key);
      currentApiKey = key; // Use the new key immediately
    }

    // Validate that at least one location method is selected
    if (!useWifi && !useCellular && !useIp) {
      throw new LocationError(
        'No methods selected',
        'No location methods selected',
        'Please select at least one location method (WiFi, Cellular, or IP)',
      );
    }

    try {
      const payload: any = {
        considerIp: useIp,
      };

      if (useCellular && networkInfo.mcc && networkInfo.mnc) {
        if (!/^\d+$/.test(networkInfo.mcc)) {
          throw new LocationError('Invalid MCC', 'Invalid Mobile Country Code', 'Mobile Country Code must be numeric');
        }
        if (!/^\d+$/.test(networkInfo.mnc)) {
          throw new LocationError('Invalid MNC', 'Invalid Mobile Network Code', 'Mobile Network Code must be numeric');
        }

        payload.radioType = 'gsm';
        payload.homeMobileCountryCode = parseInt(networkInfo.mcc);
        payload.homeMobileNetworkCode = parseInt(networkInfo.mnc);
        if (networkInfo.carrier) {
          payload.carrier = networkInfo.carrier;
        }

        // Only add cell towers if we have valid network info
        if (cellTowers.length > 0) {
          payload.cellTowers = cellTowers;
        } else {
          console.warn('[Google Provider] No cell tower information available');
        }
      }

      if (useWifi) {
        if (wifiNetworks.length >= 0) {
          payload.wifiAccessPoints = wifiNetworks;
        } else {
          console.warn('[Google Provider] Insufficient WiFi access points available');
          if (!useIp && !useCellular) {
            throw new LocationError(
              'Insufficient WiFi data',
              'WiFi location unavailable',
              'At least 2 WiFi access points are required for WiFi-based location. Please enable IP or Cellular methods.',
            );
          }
        }
      }

      console.log('[Google Provider] Sending request', { payload });

      const response = await fetch(`https://www.googleapis.com/geolocation/v1/geolocate?key=${currentApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[Google Provider] API error', {
          status: response.status,
          data,
        });

        let error: LocationError;
        if (response.status === 403 || (response.status === 400 && data.error?.message?.includes('API key not valid'))) {
          error = new LocationError(
            'Invalid API Key',
            'API Key Error',
            'The provided API key is not valid. Please check your API key and try again.',
          );
          // Clear invalid API key
          setApiKey(null);
          removeStoredApiKey();
          // Re-prompt for API key
          const newKey = window.prompt('Your API key was invalid. Please enter a valid Google Geolocation API key:');
          if (newKey) {
            setApiKey(newKey);
            setStoredApiKey(newKey);
            // Retry the request with new key
            return getLocation();
          }
        } else if (response.status === 429) {
          error = new LocationError(
            'Rate limit exceeded',
            'Too many requests',
            'You have exceeded the quota for API requests. Please wait a moment and try again.',
          );
        } else if (response.status === 400) {
          error = new LocationError(
            data.error?.message || 'Bad Request',
            'Request Error',
            'The request was invalid. ' + (data.error?.message || 'Please check your settings and try again.'),
          );
        } else {
          error = new LocationError(
            data.error?.message || 'Google Geolocation API error',
            'API Error',
            'Failed to get location using Google Geolocation API. ' +
              (data.error?.message || 'Please try again or use a different provider.'),
          );
        }
        error.status = response.status;
        throw error;
      }

      console.log('[Google Provider] Location received', { data });

      const locationData: LocationData = {
        lat: data.location.lat,
        lon: data.location.lng,
        accuracy: data.accuracy,
        provider: 'google',
        isLive: false,
      };

      onLocationUpdate(locationData);
      return locationData;
    } catch (error: any) {
      console.error('[Google Provider] Error', { error });

      if (!(error instanceof LocationError)) {
        error = new LocationError(
          error.message || 'Unknown error',
          'Google Geolocation error',
          'An unexpected error occurred. Please try a different provider.',
        );
      }

      onError(error);
      throw error;
    }
  };

  return {
    name: 'Google Geolocation API',
    description: 'Using Google Geolocation API with multiple location methods',
    apiKey: apiKey || undefined,
    getLocation,
    cleanup: () => {},
  };
}
