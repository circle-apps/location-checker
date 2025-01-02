import { useState, useRef, useEffect } from 'react';
import { LocationData, LocationProvider } from './types';
import { Map } from './components/Map';
import { StatusIndicator } from './components/StatusIndicator';
import { Toast } from './components/Toast';
import { useNavigatorProvider } from './components/providers/NavigatorProvider';
import { useGoogleProvider } from './components/providers/GoogleProvider';
import { useIpProvider } from './components/providers/IpProvider';
import 'leaflet/dist/leaflet.css';

function App() {
  const [currentProvider, setCurrentProvider] = useState<string>('navigator');
  const currentProviderRef = useRef<string>('navigator');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<{
    message: string;
    details: string;
  } | null>(null);
  const [liveTracking, setLiveTracking] = useState<boolean>(true);
  const [gpsTimeout, setGpsTimeout] = useState<number>(10);
  const [useWifi, setUseWifi] = useState<boolean>(false);
  const [useCellular, setUseCellular] = useState<boolean>(false);
  const [useIp, setUseIp] = useState<boolean>(true);
  const [networkInfo, setNetworkInfo] = useState({
    mcc: '',
    mnc: '',
    carrier: '',
  });
  const [location, setLocation] = useState<LocationData | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'error' | 'warning' | 'success';
  } | null>(null);

  const accuracyInfo = useRef<string>('');

  const handleLocationUpdate = (locationData: LocationData) => {
    if (locationData.provider !== currentProviderRef.current) {
      console.log(
        `[Location Update] Ignoring update from ${locationData.provider} as current provider is ${currentProviderRef.current}`,
        { locationData },
      );
      return;
    }

    console.log(`[Location Update] Provider: ${locationData.provider}`, {
      location: locationData,
      timestamp: new Date().toISOString(),
    });

    setLoading(false);
    setError(null);
    setLocation(locationData);
    accuracyInfo.current = `Location accuracy: ${Math.round(locationData.accuracy)} meters`;
  };

  const handleError = (error: any) => {
    let message = '';
    let details = '';
    let errorType = 'UNKNOWN';
    let toastMessage = '';

    if (error.userMessage && error.userDetails) {
      message = error.userMessage;
      details = error.userDetails;
      errorType = error.name || 'PROVIDER_ERROR';
      toastMessage = error.userMessage;
    } else if (error.code) {
      switch (error.code) {
        case 1:
          errorType = 'PERMISSION_DENIED';
          message = 'Location access denied';
          details = `Please enable location services in your browser settings and try again.
            \nFor Chrome: Settings > Privacy and Security > Site Settings > Location
            \nFor Firefox: Settings > Privacy & Security > Permissions > Location
            \nFor Safari: Settings > Websites > Location Services`;
          toastMessage = 'Location access denied. Please enable location services in your browser settings.';
          break;
        case 2:
          errorType = 'POSITION_UNAVAILABLE';
          message = 'Location unavailable';
          details = `Unable to determine your location. This could be due to:
            \n- GPS signal is blocked (are you indoors?)
            \n- Device location hardware issues
            \n- No GPS fix available
            \nPlease try again or use a different provider.`;
          toastMessage = 'Unable to determine your location. Try moving to a location with better GPS signal.';
          break;
        case 3:
          errorType = 'TIMEOUT';
          message = 'Location request timeout';
          details = `Request timed out after ${gpsTimeout} seconds. This could be due to:
            \n- Poor GPS signal
            \n- Slow network connection
            \nTry increasing the timeout or use a different provider.`;
          toastMessage = `Location request timed out after ${gpsTimeout} seconds. Try increasing the timeout.`;
          break;
        default:
          errorType = 'GEOLOCATION_ERROR';
          message = error.message || 'Unknown geolocation error occurred';
          details = 'Please try again or use a different provider';
          toastMessage = 'Location error occurred. Try a different provider.';
      }
    } else {
      errorType = 'UNKNOWN_ERROR';
      message = error.message || 'Unknown error occurred';
      details = 'Please try again or use a different provider';
      toastMessage = 'An error occurred while getting your location.';
    }

    console.error(`[Location Error] Type: ${errorType}`, {
      error,
      provider: currentProviderRef.current,
      timestamp: new Date().toISOString(),
      message,
      details,
    });

    setError({ message, details });
    setLoading(false);
    setToast({ message: toastMessage, type: 'error' });
  };

  const navigatorProvider = useNavigatorProvider({
    gpsTimeout,
    liveTracking,
    onLocationUpdate: handleLocationUpdate,
    onError: handleError,
  });

  const googleProvider = useGoogleProvider({
    useWifi,
    useCellular,
    useIp,
    networkInfo,
    onLocationUpdate: handleLocationUpdate,
    onError: handleError,
  });

  const ipProvider = useIpProvider({
    onLocationUpdate: handleLocationUpdate,
    onError: handleError,
  });

  const providers: Record<string, LocationProvider> = {
    navigator: navigatorProvider,
    google: googleProvider,
    ip: ipProvider,
  };

  // Derived states
  const isLiveActive = currentProviderRef.current === 'navigator' && liveTracking && !error && !loading;
  const statusMessage = error
    ? 'Tracking inactive'
    : loading
      ? 'Getting location...'
      : isLiveActive
        ? 'Live tracking active'
        : `Using ${providers[currentProviderRef.current].name}`;

  const startLocationWatch = () => {
    console.log(`[Location Request] Starting location watch`, {
      provider: currentProviderRef.current,
      timestamp: new Date().toISOString(),
      settings: {
        liveTracking,
        gpsTimeout,
        useWifi,
        useCellular,
        useIp,
        networkInfo,
      },
    });

    setLoading(true);
    setError(null);
    providers[currentProviderRef.current].getLocation().catch(handleError);
  };

  const cleanupProviders = () => {
    console.log('[App] Cleaning up all providers');
    Object.values(providers).forEach((p) => {
      try {
        p.cleanup();
      } catch (error) {
        console.error('[App] Error cleaning up provider:', error);
      }
    });
  };

  const handleProviderChange = (provider: string) => {
    console.log(`[Provider Change] Switching from ${currentProviderRef.current} to ${provider}`);

    // First cleanup existing providers
    cleanupProviders();

    // Reset state
    setLocation(null);
    setError(null);
    setLoading(true);
    accuracyInfo.current = '';

    // Update both state and ref
    setCurrentProvider(provider);
    currentProviderRef.current = provider;

    // Use ref for immediate provider access
    providers[provider].getLocation().catch(handleError);
  };

  const refreshLocation = () => {
    console.log(`[Location Refresh] Refreshing location`, {
      provider: currentProviderRef.current,
      timestamp: new Date().toISOString(),
    });

    cleanupProviders();
    setLocation(null);
    setError(null);
    setLoading(true);
    accuracyInfo.current = '';
    startLocationWatch();
  };

  // Update the ref when state changes (for consistency)
  useEffect(() => {
    currentProviderRef.current = currentProvider;
  }, [currentProvider]);

  // Initial setup
  useEffect(() => {
    console.log('[App] Initializing with provider:', currentProviderRef.current);
    providers[currentProviderRef.current].getLocation().catch(handleError);

    return () => {
      console.log('[App] Component unmounting, cleaning up providers');
      cleanupProviders();
    };
  }, []); // Empty dependency array for mount only

  // Update provider option changes effect
  useEffect(() => {
    if (currentProviderRef.current === 'google' && !loading) {
      console.log('[App] Google provider options changed, refreshing location');
      providers[currentProviderRef.current].getLocation().catch(handleError);
    }
  }, [useWifi, useCellular, useIp, networkInfo]);

  // Update GPS settings changes effect
  useEffect(() => {
    if (currentProviderRef.current === 'navigator' && !loading) {
      console.log('[App] Navigator settings changed, refreshing location');
      providers[currentProviderRef.current].getLocation().catch(handleError);
    }
  }, [liveTracking, gpsTimeout]);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] min-h-screen">
        <div className="flex flex-col gap-5 p-8 bg-white border-r border-gray-200 h-auto lg:h-screen lg:sticky lg:top-0 overflow-y-auto">
          <h1 className="text-2xl font-semibold text-gray-800">My Current Location</h1>

          <div className="flex flex-col gap-4">
            <select
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={currentProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              <option value="navigator">Device GPS/Location (Live)</option>
              <option value="google">Google Geolocation API</option>
              <option value="ip">IP-based Location</option>
            </select>

            <div className="text-sm text-gray-600">{providers[currentProviderRef.current].description}</div>

            {currentProviderRef.current !== 'ip' && (
              <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                {currentProviderRef.current === 'navigator' ? (
                  <>
                    <div>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={liveTracking}
                          onChange={(e) => setLiveTracking(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Live Location
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">GPS Timeout (seconds):</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="5"
                          max="30"
                          value={gpsTimeout}
                          onChange={(e) => setGpsTimeout(parseInt(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-sm">{gpsTimeout}s</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="block text-sm text-gray-700">Location Methods:</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={useWifi}
                            onChange={(e) => setUseWifi(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          WiFi
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={useCellular}
                            onChange={(e) => setUseCellular(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          Cellular
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={useIp}
                            onChange={(e) => setUseIp(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          IP Address
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm text-gray-700">Mobile Network Info (Optional):</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Mobile Country Code"
                          value={networkInfo.mcc}
                          onChange={(e) =>
                            setNetworkInfo((prev) => ({
                              ...prev,
                              mcc: e.target.value,
                            }))
                          }
                          className="p-2 text-sm border border-gray-300 rounded-md"
                        />
                        <input
                          type="text"
                          placeholder="Mobile Network Code"
                          value={networkInfo.mnc}
                          onChange={(e) =>
                            setNetworkInfo((prev) => ({
                              ...prev,
                              mnc: e.target.value,
                            }))
                          }
                          className="p-2 text-sm border border-gray-300 rounded-md"
                        />
                        <input
                          type="text"
                          placeholder="Carrier Name"
                          value={networkInfo.carrier}
                          onChange={(e) =>
                            setNetworkInfo((prev) => ({
                              ...prev,
                              carrier: e.target.value,
                            }))
                          }
                          className="p-2 text-sm border border-gray-300 rounded-md col-span-2"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <StatusIndicator
              isLiveActive={isLiveActive}
              loading={loading}
              error={error}
              statusMessage={statusMessage}
              accuracyInfo={accuracyInfo.current}
            />

            <button
              onClick={refreshLocation}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Location
            </button>
          </div>
        </div>

        <Map loading={loading} error={error} location={location} />
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}

export default App;
