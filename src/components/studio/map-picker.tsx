"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { MapPickerProps } from "./map-picker.client";

/** Leaflet touches `window` at import time, so the map is client-only. */
export const MapPicker = dynamic<MapPickerProps>(
  () => import("./map-picker.client").then((m) => m.MapPickerClient),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> },
);
