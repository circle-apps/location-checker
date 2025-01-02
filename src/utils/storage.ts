const GOOGLE_API_KEY = 'google_geolocation_api_key';

export const getStoredApiKey = (): string | null => {
  return localStorage.getItem(GOOGLE_API_KEY);
};

export const setStoredApiKey = (apiKey: string): void => {
  localStorage.setItem(GOOGLE_API_KEY, apiKey);
};

export const removeStoredApiKey = (): void => {
  localStorage.removeItem(GOOGLE_API_KEY);
};
