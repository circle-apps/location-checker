import { LocationData, LocationProvider, LocationError } from '../../types';

interface IpProviderProps {
  onLocationUpdate: (location: LocationData) => void;
  onError: (error: any) => void;
}

export function useIpProvider({ onLocationUpdate, onError }: IpProviderProps): LocationProvider {
  const getLocation = async () => {
    try {
      console.log('[IP Provider] Starting location request');

      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();

      if (!response.ok) {
        console.error('[IP Provider] API error', {
          status: response.status,
          data,
        });

        let error: LocationError;
        if (response.status === 429) {
          error = new LocationError(
            'Rate limit exceeded',
            'Rate limit exceeded',
            'Too many requests to IP geolocation service. Please wait a moment and try again.',
          );
        } else {
          error = new LocationError(
            'IP Geolocation service error',
            'IP Geolocation error',
            'Failed to get location using IP address. Please try a different provider.',
          );
        }
        error.status = response.status;
        throw error;
      }

      if (!data.latitude || !data.longitude) {
        console.error('[IP Provider] Invalid response', { data });
        throw new LocationError(
          'Invalid location data',
          'Invalid location data',
          'The IP geolocation service returned invalid data. Please try a different provider.',
        );
      }

      console.log('[IP Provider] Location received', { data });

      const locationData: LocationData = {
        lat: data.latitude,
        lon: data.longitude,
        accuracy: 5000, // IP geolocation is typically accurate to city level
        provider: 'ip',
        isLive: false,
      };

      onLocationUpdate(locationData);
      return locationData;
    } catch (error: any) {
      console.error('[IP Provider] Error', { error });

      // If it's not already a LocationError, wrap it
      if (!(error instanceof LocationError)) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          error = new LocationError(
            error.message,
            'Network error',
            'Failed to connect to IP geolocation service. Please check your internet connection and try again.',
          );
        } else {
          error = new LocationError(
            error.message || 'Unknown error',
            'IP Geolocation error',
            'An unexpected error occurred while getting location from IP. Please try a different provider.',
          );
        }
      }

      onError(error);
      throw error;
    }
  };

  return {
    name: 'IP-based Location',
    description: 'Using IP address to approximate location (less accurate)',
    getLocation,
    cleanup: () => {},
  };
}
