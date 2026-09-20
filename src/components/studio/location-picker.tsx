"use client";

import * as React from "react";
import { Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toastError } from "./studio-utils";
import { MapPicker } from "./map-picker";

export interface PickedLocation {
  label: string;
  lat: number;
  lng: number;
}

interface NominatimHit {
  lat: string;
  lon: string;
  display_name: string;
}

/**
 * Address search + map click + manual coordinates. Geocoding goes to
 * Nominatim, which needs no key; failures degrade to "drop the pin yourself".
 */
export function LocationPicker({
  value,
  onChange,
  radiusM,
  clearable = true,
}: {
  value: PickedLocation | null;
  onChange: (next: PickedLocation | null) => void;
  radiusM?: number | null;
  clearable?: boolean;
}) {
  const [term, setTerm] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [hits, setHits] = React.useState<NominatimHit[]>([]);
  const statusId = React.useId();

  async function search() {
    if (!term.trim()) return;
    setSearching(true);
    setHits([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(term.trim())}`,
        { headers: { accept: "application/json" } },
      );
      if (!res.ok) throw new Error("Address lookup failed.");
      const data = (await res.json()) as NominatimHit[];
      setHits(data);
      if (!data.length) toastError(new Error("No matching places found."));
    } catch (error) {
      toastError(error, "Address lookup failed. Drop the pin on the map instead.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={term}
          placeholder="Search an address or place"
          aria-label="Search for an address"
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => void search()}
          loading={searching}
        >
          <Search className="size-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">Search</span>
        </Button>
      </div>

      {hits.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {hits.map((hit) => (
            <li key={`${hit.lat},${hit.lon}`}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface-muted"
                onClick={() => {
                  onChange({
                    label: hit.display_name,
                    lat: Number(hit.lat),
                    lng: Number(hit.lon),
                  });
                  setHits([]);
                }}
              >
                {hit.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <MapPicker
        lat={value?.lat ?? null}
        lng={value?.lng ?? null}
        radiusM={radiusM ?? null}
        onPick={(lat, lng) =>
          onChange({
            label: value?.label ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            lat,
            lng,
          })
        }
      />

      <p id={statusId} aria-live="polite" className="text-xs text-muted-foreground">
        {value
          ? `Pin at ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
          : "No pin yet — search above or click the map."}
      </p>

      {value && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={value.label}
            aria-label="Location label"
            onChange={(e) => onChange({ ...value, label: e.target.value })}
            className="max-w-sm"
          />
          {clearable && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
            >
              <Trash2 className="size-4" aria-hidden />
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
