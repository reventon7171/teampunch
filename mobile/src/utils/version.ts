// Plain "major.minor.patch" compare — no pre-release/build-metadata support, since
// app.json's "version" field and MIN_APP_VERSION are always kept in that plain form.
// Missing/non-numeric segments count as 0, so "1.2" vs "1.2.0" compares equal.
export const isVersionBelow = (current: string, minimum: string): boolean => {
  const toParts = (v: string) =>
    v
      .split(".")
      .slice(0, 3)
      .map((p) => parseInt(p, 10) || 0);
  const [c1, c2, c3] = toParts(current);
  const [m1, m2, m3] = toParts(minimum);
  if (c1 !== m1) return c1 < m1;
  if (c2 !== m2) return c2 < m2;
  return c3 < m3;
};
