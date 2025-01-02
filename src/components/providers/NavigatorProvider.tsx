import { useRef } from "react";
import { LocationData, LocationProvider, LocationError } from "../../types";

interface NavigatorProviderProps {
  gpsTimeout: number;
  liveTracking: boolean;
  onLocationUpdate: (location: LocationData) => void;
  onError: (error: any) => void;
}

export function useNavigatorProvider({
  gpsTimeout,
  liveTracking,
  onLocationUpdate,
  onError,
}: NavigatorProviderProps): LocationProvider {
  const watchIdRef = useRef<number | null>(null);

  const cleanup = () => {
    console.log("[Navigator Provider] Cleaning up watch");
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const getLocation = () => {
    return new Promise<LocationData>((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        reject(
          new LocationError(
            "Geolocation not supported",
            "Browser doesn't support location",
            "Please use a modern browser that supports geolocation or try a different provider."
          )
        );
        return;
      }

      console.log("[Navigator Provider] Starting location request", {
        liveTracking,
        timeout: gpsTimeout,
      });

      const timeout = gpsTimeout * 1000;
      const options = {
        enableHighAccuracy: true,
        timeout: timeout,
        maximumAge: 0,
      };

      const handlePosition = (position: GeolocationPosition) => {
        console.log("[Navigator Provider] Position received", {
          coords: position.coords,
          timestamp: new Date(position.timestamp).toISOString(),
        });

        const locationData = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          provider: "navigator",
          isLive: liveTracking,
        };
        onLocationUpdate(locationData);
        resolve(locationData);
      };

      const handleError = (err: GeolocationPositionError) => {
        console.error("[Navigator Provider] Position error", {
          code: err.code,
          message: err.message,
        });

        let userMessage: string;
        let userDetails: string;

        switch (err.code) {
          case GeolocationPositionError.PERMISSION_DENIED:
            userMessage = "Location access denied";
            userDetails = `Please enable location services in your browser settings and try again.
              \nFor Chrome: Settings > Privacy and Security > Site Settings > Location
              \nFor Firefox: Settings > Privacy & Security > Permissions > Location
              \nFor Safari: Settings > Websites > Location Services`;
            break;
          case GeolocationPositionError.POSITION_UNAVAILABLE:
            userMessage = "Location unavailable";
            userDetails = `Unable to determine your location. This could be due to:
              \n- GPS signal is blocked (are you indoors?)
              \n- Device location hardware issues
              \n- No GPS fix available
              \nPlease try again or use a different provider.`;
            break;
          case GeolocationPositionError.TIMEOUT:
            userMessage = "Location request timeout";
            userDetails = `Request timed out after ${gpsTimeout} seconds. This could be due to:
              \n- Poor GPS signal
              \n- Slow network connection
              \nTry increasing the timeout or use a different provider.`;
            break;
          default:
            userMessage = "Location error";
            userDetails =
              "An unknown error occurred while getting your location.";
        }

        reject(new LocationError(err.message, userMessage, userDetails));
      };

      if (liveTracking) {
        console.log("[Navigator Provider] Starting live tracking");
        watchIdRef.current = navigator.geolocation.watchPosition(
          handlePosition,
          handleError,
          options
        );
      } else {
        console.log("[Navigator Provider] Getting current position");
        navigator.geolocation.getCurrentPosition(
          handlePosition,
          handleError,
          options
        );
      }
    });
  };

  return {
    name: "Device GPS/Location",
    description: "Using device's built-in location services",
    getLocation,
    cleanup,
  };
}
