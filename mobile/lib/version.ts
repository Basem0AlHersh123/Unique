export function isVersionOutdated(current: string, minimum: string): boolean {
  try {
    const parse = (v: string) => v.split(".").map((n) => parseInt(n, 10));
    const [cMaj, cMin, cPat] = parse(current);
    const [mMaj, mMin, mPat] = parse(minimum);
    if (cMaj !== mMaj) return cMaj < mMaj;
    if (cMin !== mMin) return cMin < mMin;
    return cPat < mPat;
  } catch {
    return false;
  }
}
