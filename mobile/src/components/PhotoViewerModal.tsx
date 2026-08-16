import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { fetchPhotoDataUri } from "../api/photo";
import { colors, fontSize, spacing } from "../theme";

// path is the API path (e.g. "/api/attendance/:id/photo/in") — null means closed.
export function PhotoViewerModal({
  path,
  title,
  onClose,
}: {
  path: string | null;
  title?: string;
  onClose: () => void;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!path) {
      setUri(null);
      setError("");
      return;
    }
    let cancelled = false;
    fetchPhotoDataUri(path)
      .then((dataUri) => {
        if (!cancelled) setUri(dataUri);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "โหลดรูปไม่สำเร็จ");
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <Modal visible={!!path} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.content}>
          {title && <Text style={styles.title}>{title}</Text>}
          {!uri && !error && <ActivityIndicator color={colors.white} size="large" />}
          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            uri && <Image source={{ uri }} style={styles.image} resizeMode="contain" />
          )}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>ปิด</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  content: { width: "100%", alignItems: "center" },
  title: { color: colors.white, fontSize: fontSize.md, fontWeight: "700", marginBottom: spacing.md },
  image: { width: "100%", height: 420, borderRadius: 8 },
  error: { color: colors.white, fontSize: fontSize.base, padding: spacing.xl, textAlign: "center" },
  closeButton: { marginTop: spacing.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl },
  closeButtonText: { color: colors.white, fontSize: fontSize.base, fontWeight: "700" },
});
