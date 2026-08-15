export interface Location {
  id: string;
  city: string;
  country: string;
  timeZone: string;
  lat: number;
  lon: number;
}

export const LOCATIONS: Location[] = [
  { id: "los-angeles", city: "Los Angeles", country: "USA", timeZone: "America/Los_Angeles", lat: 34.0522, lon: -118.2437 },
  { id: "new-york", city: "New York", country: "USA", timeZone: "America/New_York", lat: 40.7128, lon: -74.006 },
  { id: "chicago", city: "Chicago", country: "USA", timeZone: "America/Chicago", lat: 41.8781, lon: -87.6298 },
  { id: "london", city: "London", country: "UK", timeZone: "Europe/London", lat: 51.5072, lon: -0.1276 },
  { id: "birmingham", city: "Birmingham", country: "UK", timeZone: "Europe/London", lat: 52.4862, lon: -1.8904 },
  { id: "london-ca", city: "London", country: "Canada", timeZone: "America/Toronto", lat: 42.9849, lon: -81.2453 },
  { id: "paris", city: "Paris", country: "France", timeZone: "Europe/Paris", lat: 48.8566, lon: 2.3522 },
  { id: "berlin", city: "Berlin", country: "Germany", timeZone: "Europe/Berlin", lat: 52.52, lon: 13.405 },
  { id: "dubai", city: "Dubai", country: "UAE", timeZone: "Asia/Dubai", lat: 25.2048, lon: 55.2708 },
  { id: "mumbai", city: "Mumbai", country: "India", timeZone: "Asia/Kolkata", lat: 19.076, lon: 72.8777 },
  { id: "singapore", city: "Singapore", country: "Singapore", timeZone: "Asia/Singapore", lat: 1.3521, lon: 103.8198 },
  { id: "tokyo", city: "Tokyo", country: "Japan", timeZone: "Asia/Tokyo", lat: 35.6762, lon: 139.6503 },
  { id: "sydney", city: "Sydney", country: "Australia", timeZone: "Australia/Sydney", lat: -33.8688, lon: 151.2093 },
];

export const DEFAULT_USER_LOCATION_ID = "los-angeles";
export const DEFAULT_PARTNER_LOCATION_ID = "birmingham";

export function getLocation(id: string): Location {
  return LOCATIONS.find((location) => location.id === id) ?? LOCATIONS[0];
}
