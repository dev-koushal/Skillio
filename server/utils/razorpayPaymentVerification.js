import crypto from "crypto";

const safeSignatureMatch = (expected, received) => {
  if (typeof received !== "string") return false;
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

export const verifyRazorpayCoursePayment = async ({
  instance,
  orderId,
  paymentId,
  signature,
  secret,
  userId,
  tenantId,
  courseId,
  amountPaise,
}) => {
  if (!instance || !orderId || !paymentId || !signature || !secret) {
    return { valid: false, reason: "Payment verification details are incomplete." };
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  if (!safeSignatureMatch(expectedSignature, signature)) {
    return { valid: false, reason: "Payment signature verification failed." };
  }

  const [order, payment] = await Promise.all([
    instance.orders.fetch(orderId),
    instance.payments.fetch(paymentId),
  ]);
  const notes = order?.notes || {};
  const amount = Number(amountPaise);
  const expectedId = (value) => value?.toString();

  if (
    order?.id !== orderId ||
    order.status !== "paid" ||
    Number(order.amount) !== amount ||
    Number(order.amount_paid) !== amount ||
    order.currency !== "INR" ||
    expectedId(notes.userId) !== expectedId(userId) ||
    expectedId(notes.tenantId) !== expectedId(tenantId) ||
    expectedId(notes.courseId) !== expectedId(courseId)
  ) {
    return { valid: false, reason: "This payment does not match the selected course and institution." };
  }

  if (
    payment?.id !== paymentId ||
    payment.order_id !== orderId ||
    payment.status !== "captured" ||
    Number(payment.amount) !== amount ||
    payment.currency !== "INR"
  ) {
    return { valid: false, reason: "Payment has not been captured for the selected course." };
  }

  return { valid: true, order, payment };
};
