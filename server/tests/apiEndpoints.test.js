process.env.NODE_ENV = "test";

import assert from "assert";
import http from "http";
import app from "../index.js";

console.log("==================================================");
console.log(" HTTP API & ENDPOINTS INTEGRATION TEST SUITE");
console.log("==================================================");

let server;
const PORT = 3999;
const BASE_URL = `http://127.0.0.1:${PORT}`;

let passedTests = 0;
let totalTests = 0;

const test = async (description, fn) => {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] ${description}`);
    passedTests++;
  } catch (error) {
    console.error(`[FAIL] ${description}`);
    console.error(error);
  }
};

const makeRequest = (path, options = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = http.request(url, reqOptions, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch (e) {
          json = body;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });

    req.on("error", reject);

    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
};

// Start test server
server = app.listen(PORT, "127.0.0.1", async () => {
  try {
    // Test 1: Health check
    await test("GET /api/health returns 200 and healthy status", async () => {
      const res = await makeRequest("/api/health");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, "healthy");
    });

    // Test 2: Current tenant resolution (default)
    await test("GET /api/tenant/current returns active tenant config", async () => {
      const res = await makeRequest("/api/tenant/current");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(res.data.tenant.name);
      assert.ok(res.data.tenant.primaryColor);
    });

    // Test 3: Tenant resolution with x-tenant-slug header
    await test("GET /api/tenant/current with x-tenant-slug: physics", async () => {
      const res = await makeRequest("/api/tenant/current", {
        headers: { "x-tenant-slug": "physics" },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.tenant.slug, "physics");
      assert.strictEqual(res.data.tenant.name, "Physics Academy");
    });

    // Test 4: Tenant resolution with x-tenant-slug header (coding)
    await test("GET /api/tenant/current with x-tenant-slug: coding", async () => {
      const res = await makeRequest("/api/tenant/current", {
        headers: { "x-tenant-slug": "coding" },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.tenant.slug, "coding");
      assert.strictEqual(res.data.tenant.name, "Coding Academy");
    });

    // Test 5: Tenant lookup by slug endpoint
    await test("GET /api/tenant/by-slug/physics returns public tenant info", async () => {
      const res = await makeRequest("/api/tenant/by-slug/physics");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.tenant.slug, "physics");
    });

    // Test 6: Security: Unauthenticated payment order is rejected
    await test("Security: POST /api/order/razorpay-order rejected with 401 without auth", async () => {
      const res = await makeRequest("/api/order/razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { courseId: "64f1a2b3c4d5e6f7a8b9c0d1" },
      });
      assert.strictEqual(res.status, 401);
    });

    // Test 7: Security: Unauthenticated lecture creation is rejected
    await test("Security: POST /api/course/createlecture/:id rejected with 401 without auth", async () => {
      const res = await makeRequest("/api/course/createlecture/64f1a2b3c4d5e6f7a8b9c0d1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { lectureTitle: "Hacked Lecture" },
      });
      assert.strictEqual(res.status, 401);
    });

    // Test 8: Public course list returns 200
    await test("GET /api/course/getpublished returns 200 array", async () => {
      const res = await makeRequest("/api/course/getpublished");
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });

    console.log("--------------------------------------------------");
    console.log(` RESULTS: ${passedTests}/${totalTests} integration tests passed`);
    console.log("--------------------------------------------------");
  } finally {
    server.close();
    process.exit(passedTests === totalTests ? 0 : 1);
  }
});
