import { api } from "./client";
import { bytesToBase64 } from "../utils/base64";

// Photo endpoints require the same Bearer auth as everything else (photos are private per
// organization/employee, not public URLs), so a plain <Image source={{uri}}> can't load them
// directly — fetch through the authenticated axios client instead and inline as a data URI.
export const fetchPhotoDataUri = async (path: string): Promise<string> => {
  const { data, headers } = await api.get<ArrayBuffer>(path, { responseType: "arraybuffer" });
  const base64 = bytesToBase64(new Uint8Array(data));
  const contentType = headers["content-type"] || "image/jpeg";
  return `data:${contentType};base64,${base64}`;
};
