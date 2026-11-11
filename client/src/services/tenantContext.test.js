import assert from "node:assert/strict";
import { resolveActiveTenantSlug } from "./tenantContext.js";
import { clearStoredTenantSlug, getStoredTenantSlug, setStoredTenantSlug } from "./tenantStorage.js";
import { getSafeInternalReturnUrl } from "./safeReturnUrl.js";

assert.equal(resolveActiveTenantSlug({
  pathname: "/login",
  hostname: "skillio.com",
  storedTenant: "previous-academy",
}), null, "global login must ignore a previously selected academy");

assert.equal(resolveActiveTenantSlug({
  pathname: "/login",
  hostname: "academy-a.skillio.com",
  storedTenant: "academy-b",
}), "academy-a", "institution subdomain must override stale stored selection");

assert.equal(resolveActiveTenantSlug({
  pathname: "/signup",
  search: "?tenant=academy-c",
  hostname: "skillio.com",
  storedTenant: "academy-b",
}), "academy-c", "explicit auth tenant parameter must be honored");

assert.equal(resolveActiveTenantSlug({
  pathname: "/institution/academy-a/courses",
  hostname: "skillio.com",
  storedTenant: "academy-b",
}), "academy-a", "institution route must control API tenant context");

assert.equal(resolveActiveTenantSlug({
  pathname: "/allcourses",
  hostname: "skillio.com",
  storedTenant: "academy-b",
}), "academy-b", "stored selection must persist on normal app routes");

const originalWindow = globalThis.window;
globalThis.window = {
  localStorage: {
    getItem() { throw new Error("storage blocked"); },
    setItem() { throw new Error("storage blocked"); },
    removeItem() { throw new Error("storage blocked"); },
  },
};
assert.equal(getStoredTenantSlug(), null, "blocked browser storage must not crash tenant reads");
assert.equal(setStoredTenantSlug("academy-a"), false, "failed storage writes must report safe fallback");
assert.doesNotThrow(clearStoredTenantSlug, "blocked browser storage must not crash tenant clearing");
if (originalWindow === undefined) delete globalThis.window;
else globalThis.window = originalWindow;

assert.equal(getSafeInternalReturnUrl("/accept-invite?token=invite_token"), "/accept-invite?token=invite_token");
assert.equal(getSafeInternalReturnUrl("https://attacker.example/steal", "https://skillio.example"), null);
assert.equal(getSafeInternalReturnUrl("//attacker.example/steal", "https://skillio.example"), null);
assert.equal(getSafeInternalReturnUrl("/login", "https://skillio.example"), null, "auth return loops are rejected");

console.log("[PASS] API tenant context, unavailable browser storage, and safe auth return URLs are handled");
