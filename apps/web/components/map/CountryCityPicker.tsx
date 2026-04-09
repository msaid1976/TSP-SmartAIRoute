"use client";

import { useMemo, useState } from "react";

import { COUNTRIES, DEFAULT_COUNTRY_CODE, type CountryCity, type CountryDefinition } from "@/app/new-problem/country-cities";
import { Badge } from "@/components/ui/badge";

interface CountryCityPickerValue {
  countryCode: string;
  selectedCityIds: string[];
  startCityId: string | null;
}

interface CountryCityPickerProps {
  value: CountryCityPickerValue;
  onChange: (next: CountryCityPickerValue) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function projectToMapPoint(country: CountryDefinition, city: CountryCity): { x: number; y: number } {
  const x = ((city.lon - country.bounds.minLon) / (country.bounds.maxLon - country.bounds.minLon)) * 100;
  const y = ((country.bounds.maxLat - city.lat) / (country.bounds.maxLat - country.bounds.minLat)) * 100;

  return {
    x: clamp(x, 2, 98),
    y: clamp(y, 2, 98),
  };
}

export function CountryCityPicker({ value, onChange }: CountryCityPickerProps): JSX.Element {
  const [query, setQuery] = useState("");

  const country = useMemo(
    () => COUNTRIES.find((item) => item.code === value.countryCode) ?? COUNTRIES[0]!,
    [value.countryCode],
  );
  const selected = useMemo(() => new Set(value.selectedCityIds), [value.selectedCityIds]);

  const filteredCities = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return country.cities;
    }
    return country.cities.filter((city) => city.label.toLowerCase().includes(needle));
  }, [country.cities, query]);

  const selectedCities = useMemo(
    () => country.cities.filter((city) => selected.has(city.id)),
    [country.cities, selected],
  );

  function setCountry(code: string): void {
    onChange({
      countryCode: code,
      selectedCityIds: [],
      startCityId: null,
    });
    setQuery("");
  }

  function toggleCity(cityId: string): void {
    const next = new Set(value.selectedCityIds);
    if (next.has(cityId)) {
      next.delete(cityId);
    } else {
      next.add(cityId);
    }

    const nextList = Array.from(next);
    const nextStart =
      value.startCityId && next.has(value.startCityId) ? value.startCityId : nextList[0] ?? null;

    onChange({
      ...value,
      selectedCityIds: nextList,
      startCityId: nextStart,
    });
  }

  function clearSelection(): void {
    onChange({ ...value, selectedCityIds: [], startCityId: null });
  }

  function loadMalaysiaMajorDemo(): void {
    if (value.countryCode !== "MY") {
      setCountry("MY");
    }
    const major = [
      "Kuala Lumpur (KL)",
      "Penang",
      "Johor Bahru",
      "Kota Kinabalu",
      "Kuching",
      "Malacca City",
    ];
    onChange({ countryCode: "MY", selectedCityIds: major, startCityId: "Kuala Lumpur (KL)" });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="space-y-4">
        <div className="rounded-3xl border border-border bg-slate-950/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Country
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <select
              value={value.countryCode}
              onChange={(event) => setCountry(event.target.value || DEFAULT_COUNTRY_CODE)}
              className="w-full max-w-sm rounded-2xl border border-border bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
            >
              {COUNTRIES.map((item) => (
                <option key={item.code} value={item.code} disabled={!item.enabled}>
                  {item.name}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              <Badge className="text-[10px]">Selected: {value.selectedCityIds.length}</Badge>
              {value.countryCode === "MY" ? (
                <button
                  type="button"
                  onClick={loadMalaysiaMajorDemo}
                  className="rounded-full border border-border bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-400 hover:text-white"
                >
                  Load major cities demo
                </button>
              ) : null}
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-full border border-border bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-400 hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-300">
            Pick cities to generate nodes. Coordinates are stored as latitude/longitude and the backend computes haversine distances.
          </p>

          {selectedCities.length > 0 ? (
            <label className="mt-4 block space-y-2">
              <span className="text-sm font-medium text-slate-200">Start city</span>
              <select
                value={value.startCityId ?? ""}
                onChange={(event) => onChange({ ...value, startCityId: event.target.value || null })}
                className="w-full rounded-2xl border border-border bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
              >
                {selectedCities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="rounded-3xl border border-border bg-slate-950/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Cities
            </p>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search city…"
              disabled={!country.enabled}
              className="w-full max-w-xs rounded-2xl border border-border bg-slate-950/80 px-4 py-2 text-sm text-white outline-none transition focus:border-blue-400 disabled:opacity-60"
            />
          </div>

          {!country.enabled ? (
            <div className="mt-4 rounded-3xl border border-dashed border-border bg-slate-900/40 p-4 text-sm text-slate-400">
              This country is not enabled yet. Malaysia is the first map dataset.
            </div>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {filteredCities.map((city) => {
                const isChecked = selected.has(city.id);
                return (
                  <label
                    key={city.id}
                    className={[
                      "flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition",
                      isChecked
                        ? "border-blue-400/70 bg-blue-500/10 text-blue-100"
                        : "border-border bg-slate-900/50 text-slate-200 hover:border-blue-400/50",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCity(city.id)}
                      className="h-4 w-4 accent-blue-500"
                    />
                    <span className="flex-1">{city.label}</span>
                    <span className="font-mono text-xs text-slate-400">
                      {city.lat.toFixed(2)},{city.lon.toFixed(2)}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border bg-slate-950/70 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Map
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Click a marker to toggle that city. Selected cities show labels.
        </p>

        <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_46%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))]">
          <svg viewBox="0 0 100 100" className="h-[520px] w-full">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path
                  d="M 10 0 L 0 0 0 10"
                  fill="none"
                  stroke="rgba(148,163,184,0.18)"
                  strokeWidth="0.6"
                />
              </pattern>
              <filter id="glow">
                <feGaussianBlur stdDeviation="1.6" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect x="0" y="0" width="100" height="100" fill="url(#grid)" />

            {country.outlines.map((path) => (
              <path
                key={path}
                d={path}
                fill="rgba(15,23,42,0.65)"
                stroke="rgba(148,163,184,0.28)"
                strokeWidth="0.8"
              />
            ))}

            {country.cities.map((city) => {
              const point = projectToMapPoint(country, city);
              const isSelected = selected.has(city.id);
              const radius = isSelected ? 2.4 : 1.8;
              return (
                <g
                  key={city.id}
                  onClick={() => (country.enabled ? toggleCity(city.id) : undefined)}
                  style={{ cursor: country.enabled ? "pointer" : "not-allowed" }}
                >
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={radius + 1.2}
                    fill="rgba(59,130,246,0.12)"
                    opacity={isSelected ? 0.95 : 0.0}
                    filter="url(#glow)"
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={radius}
                    fill={isSelected ? "#E6F1FB" : "rgba(148,163,184,0.75)"}
                    stroke={isSelected ? "#3B82F6" : "rgba(148,163,184,0.4)"}
                    strokeWidth={isSelected ? 0.9 : 0.6}
                    opacity={country.enabled ? 1.0 : 0.55}
                  />
                  {isSelected ? (
                    <text
                      x={point.x + 2.8}
                      y={point.y - 2.2}
                      fontSize="3"
                      fill="rgba(226,232,240,0.95)"
                      fontFamily="ui-sans-serif, system-ui"
                    >
                      {city.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      </section>
    </div>
  );
}
