import assert from "node:assert/strict";
import crypto from "node:crypto";
import { verifyRazorpayCoursePayment } from "../utils/razorpayPaymentVerification.js";

const secret = "test_secret";
const orderId = "order_123";
const paymentId = "pay_123";
const signature = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
const order = {
  id: orderId,
  status: "paid",
  amount: 12500,
  amount_paid: 12500,
  currency: "INR",
  notes: { userId: "student_1", tenantId: "tenant_1", courseId: "course_1" },
};
const payment = { id: paymentId, order_id: orderId, status: "captured", amount: 12500, currency: "INR" };
const makeInstance = (orderValue = order, paymentValue = payment, calls = { order: 0, payment: 0 }) => ({
  orders: { fetch: async () => { calls.order += 1; return orderValue; } },
  payments: { fetch: async () => { calls.payment += 1; return paymentValue; } },
});
const request = { instance: makeInstance(), orderId, paymentId, signature, secret, userId: "student_1", tenantId: "tenant_1", courseId: "course_1", amountPaise: 12500 };

const valid = await verifyRazorpayCoursePayment(request);
assert.equal(valid.valid, true, "a valid signed, paid, captured, matching order grants access");

const wrongCourse = await verifyRazorpayCoursePayment({
  ...request,
  instance: makeInstance({ ...order, notes: { ...order.notes, courseId: "course_2" } }),
});
assert.equal(wrongCourse.valid, false, "an order for another course is rejected");

const authorizedOnly = await verifyRazorpayCoursePayment({
  ...request,
  instance: makeInstance({ ...order, status: "created", amount_paid: 0 }, { ...payment, status: "authorized" }),
});
assert.equal(authorizedOnly.valid, false, "authorized but uncaptured payments are rejected");

const wrongAmount = await verifyRazorpayCoursePayment({
  ...request,
  instance: makeInstance(order, { ...payment, amount: 100 }),
});
assert.equal(wrongAmount.valid, false, "payment amount mismatches are rejected");

const calls = { order: 0, payment: 0 };
const invalidSignature = await verifyRazorpayCoursePayment({
  ...request,
  signature: "0".repeat(64),
  instance: makeInstance(order, payment, calls),
});
assert.equal(invalidSignature.valid, false);
assert.deepEqual(calls, { order: 0, payment: 0 }, "invalid signatures do not trigger provider fetches");

console.log("[PASS] Razorpay verification requires a valid signature and matching captured order/payment");
