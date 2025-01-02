export interface LocationData {
  lat: number;
  lon: number;
  accuracy: number;
  provider: string;
  isLive: boolean;
}

export interface LocationProvider {
  name: string;
  description: string;
  apiKey?: string;
  getLocation: () => Promise<LocationData>;
  cleanup: () => void;
}

export class LocationError extends Error {
  userMessage: string;
  userDetails: string;
  status?: number;

  constructor(message: string, userMessage: string, userDetails: string) {
    super(message);
    this.name = "LocationError";
    this.userMessage = userMessage;
    this.userDetails = userDetails;
  }
}
