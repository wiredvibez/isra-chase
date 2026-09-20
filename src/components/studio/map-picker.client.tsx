"use client";

import "leaflet/dist/leaflet.css";
import * as React from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

export interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  /** Draws the accept-radius ring for GPS missions. */
  radiusM?: number | null;
  onPick: (lat: number, lng: number) => void;
  height?: number;
  ariaLabel?: string;
}

const FALLBACK: [number, number] = [31.7683, 35.2137];

function ClickCatcher({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

/** Follows programmatic changes (address search, cleared pin) without fighting
 *  the user's own panning. */
function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (lat === null || lng === null) return;
    map.setView([lat, lng], map.getZoom() < 13 ? 15 : map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export function MapPickerClient({
  lat,
  lng,
  radiusM,
  onPick,
  height = 280,
  ariaLabel = "מפה. לוחצים כדי למקם את הסימון.",
}: MapPickerProps) {
  const center: [number, number] =
    lat !== null && lng !== null ? [lat, lng] : FALLBACK;

  return (
    <div
      className="overflow-hidden rounded-md border border-border"
      style={{ height }}
      role="application"
      aria-label={ariaLabel}
    >
      <MapContainer
        center={center}
        zoom={lat !== null ? 15 : 11}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickCatcher onPick={onPick} />
        <Recenter lat={lat} lng={lng} />
        {lat !== null && lng !== null && (
          <>
            {radiusM ? (
              <Circle
                center={[lat, lng]}
                radius={radiusM}
                pathOptions={{ color: "#109b86", fillOpacity: 0.15 }}
              />
            ) : null}
            {/* A CircleMarker avoids Leaflet's bundler-hostile default icon assets. */}
            <CircleMarker
              center={[lat, lng]}
              radius={8}
              pathOptions={{
                color: "#ffffff",
                weight: 3,
                fillColor: "#f96a3f",
                fillOpacity: 1,
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
