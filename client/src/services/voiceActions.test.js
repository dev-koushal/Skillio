import assert from "node:assert/strict";
import { parseVoiceCommand, normalizeVoiceTranscript } from "./voiceActions.js";

const educator = { role: "educator" };
const student = { role: "student" };

const localNavigationCases = [
  ["courses kholo", "COURSES"],
  ["course page pe le chalo", "COURSES"],
  ["students dikhao", "STUDENTS"],
  ["analytics khol", "ANALYTICS"],
  ["profile kholo", "PROFILE"],
  ["dashboard pe jao", "DASHBOARD"],
  ["institution settings kholo", "INSTITUTION"],
  ["live classes dikhao", "LIVE_CLASSES"],
  ["back jao", "BACK"],
  ["home pe jao", "HOME"],
];
for (const [phrase, target] of localNavigationCases) {
  const command = parseVoiceCommand(phrase, educator);
  assert.equal(command?.type, target === "BACK" ? "BACK" : "NAVIGATE", phrase);
  if (target !== "BACK") assert.equal(command.target, target, phrase);
}

assert.deepEqual(parseVoiceCommand("mere courses kholo", educator), { type: "NAVIGATE", target: "COURSES" });
assert.deepEqual(parseVoiceCommand("my courses open karo", student), { type: "NAVIGATE", target: "MY_COURSES" });
assert.deepEqual(parseVoiceCommand("show my progress", student), { type: "NAVIGATE", target: "MY_COURSES" });
assert.deepEqual(parseVoiceCommand("open my current institution", student), { type: "NAVIGATE", target: "INSTITUTION" });
assert.deepEqual(parseVoiceCommand("change institution", student), { type: "NAVIGATE", target: "INSTITUTIONS" });
assert.deepEqual(parseVoiceCommand("open my current lecture", student), { type: "OPEN_CURRENT_LECTURE" });
assert.equal(parseVoiceCommand("open my current lecture", educator), null);

const createDraftCases = [
  ["Instagram naam ka course banao", "Instagram"],
  ["ek course banao jiska naam Instagram rakho", "Instagram"],
  ["Instagram naam se course bana do", "Instagram"],
  ["course create kro naam Instagram", "Instagram"],
  ["Ek course bnao introduction to chemistry", "introduction to chemistry"],
  ["Create a course called React Mastery", "React Mastery"],
  ["Create new course named Advanced React", "Advanced React"],
];
for (const [phrase, title] of createDraftCases) {
  assert.deepEqual(parseVoiceCommand(phrase, educator), { type: "CREATE_COURSE", title }, phrase);
}

assert.deepEqual(parseVoiceCommand("Open the JavaScript course", educator), {
  type: "OPEN_COURSE", query: "JavaScript", current: false,
});
assert.equal(parseVoiceCommand("Open this course", educator)?.current, true);
assert.equal(parseVoiceCommand("Open course builder", educator)?.target, "CREATE_COURSE");
assert.equal(parseVoiceCommand("Publish current course", educator), null, "mutations must reach the existing AI action layer");
assert.equal(parseVoiceCommand("Edit the React course", educator), null, "edits must reach the existing AI action layer");
assert.equal(parseVoiceCommand("Create course and add five lectures", educator), null, "compound requests must not be flattened into a title");
assert.equal(parseVoiceCommand("Instagram naam ka course banao", student)?.type, "DENIED");

const typoCases = [
  ["cours kholo", "COURSES"],
  ["coursess kholo", "COURSES"],
  ["studnts dikhao", "STUDENTS"],
  ["analytcs kholo", "ANALYTICS"],
  ["dashbord kholo", "DASHBOARD"],
  ["profle kholo", "PROFILE"],
];
for (const [phrase, target] of typoCases) {
  assert.equal(parseVoiceCommand(phrase, educator)?.target, target, phrase);
}

assert.equal(normalizeVoiceTranscript("  OPEN   My Courses  ").normalized, "open my courses");
console.log("[PASS] Voice intent, role, typo, compound-command, and entity regression cases");
