import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import { captureRef } from "react-native-view-shot";
import { getMapTileInfo } from "../utils/staticMap";
import { colors, fontSize, radius } from "../theme";
import { PunchPhoto } from "../api/attendance";

const CANVAS_ASPECT = 320 / 340; // width / height
const MAP_SIZE = 78;

export interface StampedCaptureHandle {
  // renders the current photo+geo with a fresh "now" timestamp burned in, and returns the
  // composited image as a file ready to upload in place of the raw camera photo
  capture: () => Promise<PunchPhoto>;
}

interface Props {
  photoUri: string | null;
  geo: { lat: number; lng: number } | null;
}

const formatStamp = (d: Date): string => {
  const datePart = d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
  const timePart = d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  });
  return `${datePart} · ${timePart} น.`;
};

// Rendered inline and visible (not off-screen) — this is deliberate: on-screen is the only
// way the employee can actually see the timestamp+map stamp before submitting, and it also
// makes react-native-view-shot's captureRef() far more reliable than capturing an
// off-screen/negatively-positioned view, which some snapshot implementations handle poorly.
export const StampedCapture = forwardRef<StampedCaptureHandle, Props>(({ photoUri, geo }, ref) => {
  const viewRef = useRef<View>(null);
  const [stampTime, setStampTime] = useState<Date | null>(null);

  // show a live preview timestamp as soon as both inputs are ready, refreshed every second
  // so what's on screen never looks stale while the employee finishes the other step
  useEffect(() => {
    if (!photoUri || !geo) {
      setStampTime(null);
      return;
    }
    setStampTime(new Date());
    const t = setInterval(() => setStampTime(new Date()), 1000);
    return () => clearInterval(t);
  }, [photoUri, geo]);

  useImperativeHandle(ref, () => ({
    capture: async () => {
      if (!photoUri || !geo) throw new Error("ไม่มีรูปถ่ายหรือตำแหน่งให้ประทับตรา");
      setStampTime(new Date());
      // wait for the state update above to actually commit + paint before we snapshot the view
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const uri = await captureRef(viewRef, { format: "jpg", quality: 0.85 });
      return { uri, fileName: "punch-stamped.jpg", mimeType: "image/jpeg" };
    },
  }));

  if (!photoUri || !geo) return null;

  const tile = getMapTileInfo(geo.lat, geo.lng);

  return (
    <View ref={viewRef} collapsable={false} style={styles.canvas}>
      <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />

      {stampTime && (
        <View style={styles.timestampBar}>
          <Text style={styles.timestampText}>{formatStamp(stampTime)}</Text>
        </View>
      )}

      <View style={styles.mapWrap}>
        <Image source={{ uri: tile.tileUrl }} style={styles.mapImage} />
        <View
          style={[
            styles.pin,
            { left: tile.pinXFraction * MAP_SIZE - 5, top: tile.pinYFraction * MAP_SIZE - 5 },
          ]}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  canvas: { width: "100%", aspectRatio: CANVAS_ASPECT, backgroundColor: "#000", borderRadius: radius.md * 2, overflow: "hidden" },
  timestampBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  timestampText: { color: "#fff", fontSize: fontSize.sm, fontWeight: "700" },
  mapWrap: {
    position: "absolute",
    right: 8,
    bottom: 40,
    width: MAP_SIZE,
    height: MAP_SIZE,
    borderRadius: radius.sm,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff",
  },
  mapImage: { width: MAP_SIZE, height: MAP_SIZE },
  pin: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.red,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
});
