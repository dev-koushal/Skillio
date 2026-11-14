import { canUseEducatorWorkspace } from "../auth/permissions.js";

// Canonical voice destinations. Resolvers use the current tenant context and
// route through the same guarded React routes as the visible navigation.
export const VOICE_NAVIGATION = {
  HOME: { label: "Home", roles: ["student", "educator", "platform_admin"], resolve: ({ user, tenantSlug }) => user?.role === "student" && tenantSlug ? `/institution/${encodeURIComponent(tenantSlug)}` : canUseEducatorWorkspace(user) ? "/educator/home" : "/" },
  COURSES: { label: "Courses", roles: ["student", "educator", "platform_admin"], resolve: ({ user, tenantSlug }) => user?.role === "student" && tenantSlug ? `/institution/${encodeURIComponent(tenantSlug)}/courses` : "/courses" },
  MY_COURSES: { label: "My Courses", roles: ["student"], resolve: ({ tenantSlug }) => tenantSlug ? `/institution/${encodeURIComponent(tenantSlug)}/my-courses` : "/mycourses" },
  STUDENTS: { label: "Students", roles: ["educator", "platform_admin"], resolve: () => "/students" },
  ANALYTICS: { label: "Analytics", roles: ["educator", "platform_admin"], resolve: () => "/dashboard" },
  DASHBOARD: { label: "Dashboard", roles: ["educator", "platform_admin"], resolve: () => "/dashboard" },
  INSTITUTION: { label: "Institution", roles: ["student", "educator", "platform_admin"], resolve: ({ user, tenantSlug }) => user?.role === "student" && tenantSlug ? `/institution/${encodeURIComponent(tenantSlug)}` : "/create-institution" },
  PROFILE: { label: "Profile", roles: ["student", "educator", "platform_admin"], resolve: ({ user, tenantSlug }) => user?.role === "student" && tenantSlug ? `/institution/${encodeURIComponent(tenantSlug)}/profile` : "/profile" },
  CREATE_COURSE: { label: "Course Builder", roles: ["educator", "platform_admin"], resolve: () => "/builder" },
  LIVE_CLASSES: { label: "Live Classes", roles: ["student", "educator", "platform_admin"], resolve: ({ user, tenantSlug }) => user?.role === "student" && tenantSlug ? `/institution/${encodeURIComponent(tenantSlug)}/live` : "/educator/home" },
  INSTITUTIONS: { label: "Institutions", roles: ["student"], resolve: () => "/institutions" },
};

const patterns = [
  ["MY_COURSES", /\b(my courses|enrolled courses|continue learning|my progress|show progress)\b/],
  ["STUDENTS", /\b(students?|student management|learners?)\b/],
  ["ANALYTICS", /\b(analytics|performance|reports?)\b/],
  ["DASHBOARD", /\b(dashboard)\b/],
  ["INSTITUTION", /\b(institution settings|manage (my |current )?institution|current institution|institution)\b/],
  ["PROFILE", /\b(profile|account)\b/],
  ["CREATE_COURSE", /\b(create|new) (a )?(course|class)\b|\bcourse builder\b/],
  ["LIVE_CLASSES", /\b(live classes|live class)\b/],
  ["INSTITUTIONS", /\b(change institution|switch institution|institutions)\b/],
  ["COURSES", /\b(courses?|course (?:page|section|management|list))\b/],
  ["HOME", /\b(home|go back|back)\b/],
];

const commandWords = new Set([
  "course", "courses", "student", "students", "analytics", "profile", "dashboard",
  "institution", "live", "classes", "home", "back", "create", "new", "open", "show",
]);
const wordAliases = new Map([
  ["kholo", "open"], ["khol", "open"], ["kholna", "open"], ["kholkar", "open"],
  ["dikhao", "show"], ["dikhana", "show"], ["dikha", "show"], ["banao", "create"],
  ["bnao", "create"], ["bana", "create"], ["banao", "create"], ["banana", "create"],
  ["bana do", "create"], ["banaado", "create"], ["karo", ""], ["kro", ""],
  ["kar do", ""], ["pe", ""], ["par", ""], ["mujhe", ""], ["mere", "my"],
  ["mera", "my"], ["meri", "my"], ["jao", "go"], ["le chalo", "open"],
  ["naam ka", "named"], ["naam se", "named"], ["jiska naam", "named"],
]);

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

// Correct only known command vocabulary; arbitrary entity text is preserved.
export function normalizeVoiceTranscript(transcript) {
  const original = String(transcript || "").normalize("NFKC").replace(/\s+/g, " ").trim();
  let normalized = original.toLocaleLowerCase("en-IN");
  for (const [phrase, replacement] of [...wordAliases.entries()].sort((a, b) => b[0].length - a[0].length)) {
    normalized = normalized.replace(new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), replacement);
  }
  normalized = normalized.replace(/\b[a-z]+\b/g, (word) => {
    if (commandWords.has(word) || word.length < 4) return word;
    const match = [...commandWords].find((candidate) => candidate.length >= 4 && Math.abs(candidate.length - word.length) <= 2 && editDistance(word, candidate) <= (word.length >= 5 ? 2 : 1));
    return match || word;
  }).replace(/\s+/g, " ").trim();
  return { original, normalized };
}

function authorized(target, user) {
  const entry = VOICE_NAVIGATION[target];
  return Boolean(entry && (entry.roles.includes(user?.role) || (user && canUseEducatorWorkspace(user) && entry.roles.includes("educator"))));
}

export function parseVoiceCommand(transcript, user) {
  const { original, normalized } = normalizeVoiceTranscript(transcript);
  if (!normalized) return null;

  if (/\bcourse builder\b/.test(normalized)) {
    return authorized("CREATE_COURSE", user) ? { type: "NAVIGATE", target: "CREATE_COURSE" } : { type: "DENIED" };
  }

  const startsCourseCreation = /\b(create|new|make|start|banao|bnao|bana|banana)\b/.test(normalized) && /\bcourse\b/.test(normalized);
  const compoundCourseCommand = startsCourseCreation && /\b(lectures?|sections?|description|subtitle|category|price|level)\b|\bwith\s+\d+\b|\bjismein\b/.test(normalized);
  // Multi-part plans belong to the existing AI action service; don't flatten
  // their whole utterance into the new-course title input.
  if (compoundCourseCommand) return null;

  // Parse title from a simple course draft request; preserve user content.
  if (startsCourseCreation) {
    let title = "";
    // Hindi-transliterated title constructions are extracted from the original utterance.
    {
      const rawPatterns = [
        /\bcourse\s+(?:create\s+)?(?:called|named)\s+(.+?)\s*$/i,
        /\bcreate\s+(?:a\s+)?course\s+(?:called|named)\s+(.+?)\s*$/i,
        /\b(?:create|make|start)\s+(?:a\s+|an\s+|new\s+)?course\s+(?:(?:called|named|titled)\s+)?(.+?)\s*$/i,
        /(.+?)\s+naam\s+ka\s+course\s+(?:banao|bnao|bana|create|karo|kro)/i,
        /course\s+(?:banao|bnao|bana|create)\s+(?:ek\s+)?jiska\s+naam\s+(.+?)\s+rakho/i,
        /ek\s+course\s+(?:banao|bnao|bana)\s+jiska\s+naam\s+(.+?)\s+rakho/i,
        /(.+?)\s+naam\s+se\s+course\s+(?:banao|bnao|bana|create)/i,
        /(.+?)\s+naam\s+se\s+course\s+bana\s+do/i,
        /course\s+(?:banao|bnao|bana)\s+ek\s+jiska\s+naam\s+(.+?)\s+rakho/i,
        /course\s+(?:banana|banao|bnao|bana)\s+hai\s+naam\s+(.+?)\s+rakho/i,
        /course\s+(?:create|banao|bnao|bana)\s+(?:karo|kro)?\s*naam\s+(.+)$/i,
        /jiska\s+naam\s+(.+?)\s+rakho/i,
        /\bcourse\s+(?:banao|bnao|bana|banana)\s+(.+?)\s*$/i,
        /\b(?:ek|a|an|new)?\s*course\s+(?:banao|bnao|bana|banana)\s+(.+?)\s*$/i,
      ];
      for (const pattern of rawPatterns) {
        const match = original.match(pattern);
        if (match?.[1]) { title = match[1].replace(/^(?:ek|a|the)\s+/i, "").trim(); break; }
      }
    }
    if (!title) {
      const titlePatterns = [
        /^(.+?)\s+named\s+course\s+create$/i,
        /\bcourse\s+(?:create\s+)?(?:called|named)\s+(.+?)\s*$/i,
        /\b(?:named)\s+(.+?)\s+(?:course\s+)?(?:create|open|show)\b/i,
        /\b(.+?)\s+(?:naam\s+)?(?:named)\s+(?:course\s+)?(?:create)\b/i,
        /\bcourse\s+create\s+(?:ek\s+)?jiska\s+naam\s+(.+?)\s+rakho\b/i,
      ];
      for (const pattern of titlePatterns) {
        const match = normalized.match(pattern);
        if (match?.[1]) { title = match[1].trim(); break; }
      }
    }
    title = title.replace(/[.,!?]+$/, "").trim();
    if (!authorized("CREATE_COURSE", user)) return { type: "DENIED" };
    return { type: "CREATE_COURSE", title: title.slice(0, 120) };
  }

  const text = normalized;
  if (/\b(current|this|my)\s+lecture\b/.test(text)) {
    return user?.role === "student" ? { type: "OPEN_CURRENT_LECTURE" } : null;
  }
  const managementVerb = /\b(publish|unpublish|delete|remove|edit|update|add|create|change|set|grant|revoke|invite|cancel)\b/;

  if (/\b(open|show|find|search|kholo|khol|dikhao)\b/.test(text) && /\bcourse\b/.test(text)) {
    const onlyNavigationWords = text.replace(/\b(open|show|find|search|the|my|current|course|courses|please|now|page|section|management|list|kholo|khol|dikhao|wala|waala|ko)\b/g, " ").replace(/\s+/g, " ").trim();
    const currentCourseRequest = !onlyNavigationWords && /\b(current|this)\b/.test(text);
    if (onlyNavigationWords || currentCourseRequest) {
      if (!user || !["student", "educator", "platform_admin"].includes(user.role) && !canUseEducatorWorkspace(user)) return { type: "DENIED" };
      const query = original
        .replace(/^.*?\b(?:open|show|find|search|kholo|khol|dikhao)\b/i, "")
        .replace(/\b(?:the|my|current|course|courses|page|section|management|list|wala|waala|ko|please|now|kholo|khol|dikhao)\b/gi, " ")
        .replace(/\s+/g, " ").trim();
      return { type: "OPEN_COURSE", query: query || onlyNavigationWords, current: currentCourseRequest || /\b(current|this)\b/.test(text) };
    }
  }

  for (const [target, pattern] of patterns) {
    // A resource noun inside a management instruction is not a navigation intent.
    if (managementVerb.test(text) && !(target === "INSTITUTIONS" && /\b(change|switch)\b/.test(text))) continue;
    if (!pattern.test(text)) continue;
    const resolvedTarget = target === "MY_COURSES" && canUseEducatorWorkspace(user) ? "COURSES" : target;
    if (target === "HOME" && /\b(back|go back)\b/.test(text)) return { type: "BACK" };
    if (!authorized(resolvedTarget, user)) return { type: "DENIED" };
    return { type: "NAVIGATE", target: resolvedTarget };
  }
  return null;
}

export function parseVoiceNavigation(transcript, user) {
  const command = parseVoiceCommand(transcript, user);
  return command?.type === "CREATE_COURSE" ? { type: "NAVIGATE", target: "CREATE_COURSE", title: command.title } : command;
}

export function resolveVoiceNavigation(action, context) {
  const entry = VOICE_NAVIGATION[action?.target];
  if (!entry || !context?.user || (!entry.roles.includes(context.user.role) && !(canUseEducatorWorkspace(context.user) && entry.roles.includes("educator")))) return null;
  return entry.resolve(context);
}
