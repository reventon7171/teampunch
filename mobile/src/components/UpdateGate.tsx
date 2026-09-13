import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { getAppVersionInfo } from "../api/appVersion";
import { isVersionBelow } from "../utils/version";
import { ForceUpdateScreen } from "../screens/ForceUpdateScreen";

// Renders children immediately (no startup delay/flicker) and only swaps to the blocking
// ForceUpdateScreen if the background check comes back showing this install is below the
// server's MIN_APP_VERSION. Any failure (offline, server down) fails open — never traps
// someone out of the app just because the version check itself couldn't run.
export function UpdateGate({ children }: { children: React.ReactNode }) {
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAppVersionInfo()
      .then((info) => {
        if (cancelled) return;
        const current = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "0.0.0";
        if (isVersionBelow(current, info.minVersion)) {
          setBlockedUrl(Platform.OS === "ios" ? info.iosUrl : info.androidUrl);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (blockedUrl) return <ForceUpdateScreen storeUrl={blockedUrl} />;
  return <>{children}</>;
}
