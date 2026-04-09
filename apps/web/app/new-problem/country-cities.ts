import { MALAYSIA_BOUNDS, MALAYSIA_CITIES, MALAYSIA_OUTLINES, type MalaysiaCity } from "@/app/new-problem/malaysia-cities";

export interface CountryBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface CountryCity {
  id: string;
  label: string;
  lat: number;
  lon: number;
}

export interface CountryDefinition {
  code: string;
  name: string;
  enabled: boolean;
  bounds: CountryBounds;
  outlines: string[];
  cities: CountryCity[];
}

function fromMalaysiaCity(city: MalaysiaCity): CountryCity {
  return { id: city.id, label: city.label, lat: city.lat, lon: city.lon };
}

export const COUNTRIES: CountryDefinition[] = [
  {
    code: "MY",
    name: "Malaysia",
    enabled: true,
    bounds: MALAYSIA_BOUNDS,
    outlines: MALAYSIA_OUTLINES,
    cities: MALAYSIA_CITIES.map(fromMalaysiaCity),
  },
  {
    code: "ID",
    name: "Indonesia",
    enabled: true,
    bounds: { minLat: -11.2, maxLat: 6.2, minLon: 95.0, maxLon: 141.2 },
    outlines: [],
    cities: [
      { id: "Jakarta", label: "Jakarta", lat: -6.2088, lon: 106.8456 },
      { id: "Bandung", label: "Bandung", lat: -6.9175, lon: 107.6191 },
      { id: "Surabaya", label: "Surabaya", lat: -7.2575, lon: 112.7521 },
      { id: "Medan", label: "Medan", lat: 3.5952, lon: 98.6722 },
      { id: "Denpasar", label: "Denpasar (Bali)", lat: -8.65, lon: 115.2167 },
      { id: "Makassar", label: "Makassar", lat: -5.1477, lon: 119.4327 },
      { id: "Balikpapan", label: "Balikpapan", lat: -1.2654, lon: 116.8312 },
      { id: "Jayapura", label: "Jayapura", lat: -2.533, lon: 140.717 },
    ],
  },
  {
    code: "SG",
    name: "Singapore",
    enabled: true,
    bounds: { minLat: 1.16, maxLat: 1.48, minLon: 103.6, maxLon: 104.1 },
    outlines: [],
    cities: [
      { id: "Singapore", label: "Singapore (Central)", lat: 1.3521, lon: 103.8198 },
      { id: "Jurong East", label: "Jurong East", lat: 1.3331, lon: 103.7436 },
      { id: "Woodlands", label: "Woodlands", lat: 1.4382, lon: 103.789 },
      { id: "Tampines", label: "Tampines", lat: 1.3496, lon: 103.9568 },
      { id: "Changi", label: "Changi", lat: 1.3644, lon: 103.9915 },
      { id: "Sentosa", label: "Sentosa", lat: 1.2494, lon: 103.8303 },
    ],
  },
  {
    code: "TH",
    name: "Thailand",
    enabled: true,
    bounds: { minLat: 5.6, maxLat: 20.5, minLon: 97.3, maxLon: 105.8 },
    outlines: [],
    cities: [
      { id: "Bangkok", label: "Bangkok", lat: 13.7563, lon: 100.5018 },
      { id: "Chiang Mai", label: "Chiang Mai", lat: 18.7883, lon: 98.9853 },
      { id: "Phuket", label: "Phuket", lat: 7.8804, lon: 98.3923 },
      { id: "Hat Yai", label: "Hat Yai", lat: 7.0084, lon: 100.4747 },
      { id: "Khon Kaen", label: "Khon Kaen", lat: 16.4419, lon: 102.835 },
    ],
  },
];

export const DEFAULT_COUNTRY_CODE = "MY";
