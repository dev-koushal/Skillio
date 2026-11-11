export const getSafeInternalReturnUrl = (candidate, origin = "http://localhost") => {
  if (typeof candidate !== "string" || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return null;
  }

  try {
    const base = new URL(origin);
    const target = new URL(candidate, base);
    if (target.origin !== base.origin || /^\/(login|signup)(\/|$)/i.test(target.pathname)) return null;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
};
