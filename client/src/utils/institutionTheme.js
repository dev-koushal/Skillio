const INSTITUTION_THEMES = [
  { match: /midnight|physics|science|engineering|navy/i, colors: ["#183153", "#15263d"], primary: "#183153", secondary: "#385775", accent: "#c49a4a", background: "#f4f6f8", surface: "#ffffff", text: "#182638", muted: "#657181", border: "#e1e6eb", mood: "modern" },
  { match: /emerald|medical|health|care|teal/i, colors: ["#176b57", "#087f78", "#164e63"], primary: "#176b57", secondary: "#367c6d", accent: "#b78a3e", background: "#f5f8f6", surface: "#ffffff", text: "#1d2c28", muted: "#68766f", border: "#e2e9e4", mood: "modern" },
  { match: /academic|english|language|blue/i, colors: ["#315d8a", "#2857a4", "#1e3a8a"], primary: "#315d8a", secondary: "#4f6e8e", accent: "#b58538", background: "#f5f7f9", surface: "#ffffff", text: "#202a35", muted: "#66717d", border: "#e2e7ec", mood: "modern" },
  { match: /warm|sharma|coaching|orange/i, colors: ["#9f4d32", "#b85422"], primary: "#9f4d32", secondary: "#62534c", accent: "#b8843c", background: "#f8f5f1", surface: "#ffffff", text: "#2c2521", muted: "#71665f", border: "#ebe4dd", mood: "modern" },
  { match: /minimal|black|mono/i, colors: ["#202020"], primary: "#202020", secondary: "#5c5c5c", accent: "#8b7653", background: "#f6f6f4", surface: "#ffffff", text: "#202020", muted: "#666761", border: "#e5e5e1", mood: "modern" },
  { match: /violet|hello|purple|academy/i, colors: ["#5439a7", "#5b3cc4"], primary: "#5439a7", secondary: "#615b70", accent: "#b69a62", background: "#f7f6f9", surface: "#ffffff", text: "#27242d", muted: "#706d76", border: "#e7e4eb", mood: "modern" },
];

const isValidHex = (value) => /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value || "");

export function getInstitutionTheme(institution) {
  const identity = `${institution?.name || ""} ${institution?.institutionType || ""}`;
  const namedPreset = INSTITUTION_THEMES.find(({ match }) => match.test(identity));
  const colorPreset = INSTITUTION_THEMES.find(({ colors = [] }) => colors.includes(institution?.primaryColor?.toLowerCase()));
  const preset = namedPreset || colorPreset || INSTITUTION_THEMES[5];
  const primaryIsDefault = ["#164e63", "#1e3a8a"].includes(institution?.primaryColor?.toLowerCase());
  const secondaryIsDefault = institution?.secondaryColor?.toLowerCase() === "#0f172a";
  return {
    ...preset,
    primary: isValidHex(institution?.primaryColor) && !primaryIsDefault ? institution.primaryColor : preset.primary,
    secondary: isValidHex(institution?.secondaryColor) && !secondaryIsDefault ? institution.secondaryColor : preset.secondary,
    accent: isValidHex(institution?.accentColor) ? institution.accentColor : preset.accent,
    background: isValidHex(institution?.surfaceColor) ? institution.surfaceColor : preset.background,
    text: isValidHex(institution?.textColor) ? institution.textColor : preset.text,
    fontMood: preset.mood,
  };
}

export function getAccessibleTextColor(color) {
  const hex = color.replace("#", "");
  const normalized = hex.length === 3 ? [...hex].map((digit) => digit + digit).join("") : hex;
  const channels = normalized.match(/.{2}/g)?.map((channel) => parseInt(channel, 16) / 255) || [];
  if (channels.length !== 3) return "#ffffff";
  const luminance = channels
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  return ((luminance + 0.05) / 0.062) > (1.05 / (luminance + 0.05)) ? "#17211d" : "#ffffff";
}
