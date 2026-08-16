// Turns an organization name into a URL/login-safe slug, e.g. "ร้านสมชาย คาเฟ่" or
// "Somchai's Café!" -> "somchais-cafe". Falls back to a random suffix if nothing
// alphanumeric survives (fully non-Latin names), since slugs must stay ASCII for typing
// at login on any keyboard.
export const slugify = (input: string): string => {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `org-${Math.random().toString(36).slice(2, 8)}`;
};
