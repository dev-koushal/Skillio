import crypto from "crypto";
import Razorpay from "razorpay";
import Resource from "../models/resourceModel.js";
import Course from "../models/coursesModel.js";
import ResourceEntitlement from "../models/resourceEntitlementModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import User from "../models/userModel.js";
import PaymentWebhookEvent from "../models/paymentWebhookEventModel.js";
import { verifyRazorpayCoursePayment } from "../utils/razorpayPaymentVerification.js";

const getRazorpay = () => {
  const key_id = process.env.RAZORPAY_KEY_ID?.trim();
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  return key_id && key_secret ? new Razorpay({ key_id, key_secret }) : null;
};

export const createResourceOrder = async (req, res) => {
  try {
    const resource = await Resource.findOne({ _id: req.params.resourceId, tenantId: req.tenantId, accessType: "paid", isDisabled: false, processingStatus: "ready" });
    if (!resource) return res.status(404).json({ success: false, message: "Paid notes not found." });
    const course = await Course.findOne({ _id: resource.courseId, tenantId: req.tenantId, isPublished: true });
    if (!course) return res.status(404).json({ success: false, message: "Course not found." });
    const user = await User.findById(req.userId).select("role");
    if (user?.role !== "student") return res.status(403).json({ success: false, message: "Only students can purchase notes." });
    const membership = await InstitutionMembership.exists({ userId: req.userId, tenantId: req.tenantId, role: "student", status: { $in: ["active", "enrolled", "ACTIVE", "ENROLLED"] } });
    if (!membership) return res.status(403).json({ success: false, code: "INSTITUTION_MEMBERSHIP_REQUIRED", message: "Join this institution before purchasing its notes." });
    const alreadyOwned = await ResourceEntitlement.exists({ userId: req.userId, resourceId: resource._id, tenantId: req.tenantId, status: "active" });
    if (alreadyOwned) return res.status(409).json({ success: false, code: "RESOURCE_ALREADY_UNLOCKED" });
    const razorpay = getRazorpay();
    if (!razorpay) return res.status(503).json({ success: false, message: "Notes payments are temporarily unavailable." });
    const order = await razorpay.orders.create({
      amount: resource.pricePaise,
      currency: "INR",
      receipt: `note_${resource._id.toString().slice(-12)}_${Date.now().toString().slice(-8)}`,
      notes: { tenantId: req.tenantId.toString(), resourceId: resource._id.toString(), courseId: course._id.toString(), userId: req.userId.toString(), purpose: "paid_resource" },
    });
    return res.json({ ...order, key: process.env.RAZORPAY_KEY_ID?.trim(), title: resource.title });
  } catch (error) {
    console.error("[Paid resource order]", error);
    return res.status(500).json({ success: false, message: "Could not start the notes purchase." });
  }
};

export const verifyResourcePayment = async (req, res) => {
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
    if (typeof orderId !== "string" || typeof paymentId !== "string" || typeof signature !== "string") return res.status(400).json({ success: false, message: "Payment verification details are incomplete." });
    const razorpay = getRazorpay();
    if (!razorpay) return res.status(503).json({ success: false, message: "Notes payments are temporarily unavailable." });
    // Fetch the order to resolve the resource from server-created signed payment metadata.
    const order = await razorpay.orders.fetch(orderId);
    const notes = order?.notes || {};
    if (notes.purpose !== "paid_resource" || notes.userId !== req.userId.toString() || notes.tenantId !== req.tenantId.toString()) return res.status(403).json({ success: false, message: "This payment does not match your account and institution." });
    const resource = await Resource.findOne({ _id: notes.resourceId, tenantId: req.tenantId, courseId: notes.courseId, accessType: "paid", isDisabled: false, processingStatus: "ready" });
    if (!resource || Number(order.amount) !== resource.pricePaise) return res.status(409).json({ success: false, message: "The notes price or availability changed. Please try again." });
    const verification = await verifyRazorpayCoursePayment({ instance: razorpay, orderId, paymentId, signature, secret: process.env.RAZORPAY_KEY_SECRET?.trim(), userId: req.userId, tenantId: req.tenantId, courseId: resource.courseId, amountPaise: resource.pricePaise });
    if (!verification.valid) return res.status(400).json({ success: false, message: verification.reason });
    const membership = await InstitutionMembership.exists({ userId: req.userId, tenantId: req.tenantId, role: "student", status: { $in: ["active", "enrolled", "ACTIVE", "ENROLLED"] } });
    if (!membership) return res.status(403).json({ success: false, code: "INSTITUTION_MEMBERSHIP_REQUIRED" });
    let entitlement = await ResourceEntitlement.findOne({ userId: req.userId, resourceId: resource._id, tenantId: req.tenantId });
    if (entitlement?.status === "active") {
      if (entitlement.paymentId !== paymentId) return res.status(409).json({ success: false, message: "Notes are already unlocked for this account." });
    } else if (entitlement) {
      entitlement.paymentId = paymentId;
      entitlement.status = "active";
      entitlement.grantedAt = new Date();
      entitlement.expiresAt = null;
      await entitlement.save();
    } else {
      entitlement = await ResourceEntitlement.create({ userId: req.userId, resourceId: resource._id, tenantId: req.tenantId, courseId: resource.courseId, paymentId, status: "active", grantedAt: new Date() });
    }
    return res.json({ success: true, message: "Notes unlocked.", resourceId: resource._id, entitlementStatus: entitlement.status });
  } catch (error) {
    if (error.code === 11000) return res.json({ success: true, message: "Notes already unlocked.", idempotent: true });
    console.error("[Paid resource verification]", error);
    return res.status(500).json({ success: false, message: "Could not verify this notes payment." });
  }
};

export const getResourceEntitlement = async (req, res) => {
  const entitlement = await ResourceEntitlement.findOne({ userId: req.userId, resourceId: req.params.resourceId, tenantId: req.tenantId, status: "active", $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }).select("_id status").lean();
  return res.json({ success: true, unlocked: Boolean(entitlement) });
};

export const handleResourcePaymentWebhook = async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  const signature = req.headers["x-razorpay-signature"];
  const eventId = req.headers["x-razorpay-event-id"];
  if (!webhookSecret || !Buffer.isBuffer(req.body) || typeof signature !== "string" || typeof eventId !== "string") return res.status(400).json({ success: false });
  const expected = crypto.createHmac("sha256", webhookSecret).update(req.body).digest();
  const received = Buffer.from(signature, "hex");
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return res.status(401).json({ success: false });
  let event;
  try { event = JSON.parse(req.body.toString("utf8")); } catch { return res.status(400).json({ success: false }); }
  let record;
  try {
    record = await PaymentWebhookEvent.create({ eventId, eventType: String(event.event || "unknown") });
  } catch (error) {
    if (error.code === 11000) {
      record = await PaymentWebhookEvent.findOneAndUpdate({ eventId, status: "failed" }, { $set: { status: "received" } }, { new: true });
      if (!record) return res.status(200).json({ success: true, duplicate: true });
    } else {
    return res.status(500).json({ success: false });
    }
  }
  try {
    const payment = event.payload?.payment?.entity;
    if (payment?.order_id && ["payment.captured", "order.paid"].includes(event.event)) {
      const razorpay = getRazorpay();
      const order = await razorpay?.orders.fetch(payment.order_id);
      const notes = order?.notes || {};
      if (notes.purpose === "paid_resource" && order.status === "paid" && payment.status === "captured" && Number(order.amount) === Number(payment.amount) && order.currency === "INR") {
        const resource = await Resource.findOne({ _id: notes.resourceId, courseId: notes.courseId, tenantId: notes.tenantId, accessType: "paid", isDisabled: false, processingStatus: "ready" });
        if (resource && Number(order.amount) === resource.pricePaise && notes.userId) {
          const entitlement = await ResourceEntitlement.findOne({ userId: notes.userId, resourceId: resource._id, tenantId: notes.tenantId });
          if (!entitlement) await ResourceEntitlement.create({ userId: notes.userId, resourceId: resource._id, tenantId: notes.tenantId, courseId: resource.courseId, paymentId: payment.id, status: "active", grantedAt: new Date() });
          else if (entitlement.status !== "active") await ResourceEntitlement.updateOne({ _id: entitlement._id, status: { $ne: "active" } }, { $set: { paymentId: payment.id, status: "active", grantedAt: new Date(), expiresAt: null } });
        }
      }
    } else if (["payment.refunded", "refund.processed"].includes(event.event)) {
      const refund = event.payload?.refund?.entity;
      const paymentId = refund?.payment_id || payment?.id;
      if (paymentId) await ResourceEntitlement.updateOne({ paymentId, status: "active" }, { $set: { status: "refunded" } });
    }
    record.status = ["payment.captured", "order.paid", "payment.refunded", "refund.processed"].includes(event.event) ? "processed" : "ignored";
    record.processedAt = new Date();
    await record.save();
    return res.status(200).json({ success: true });
  } catch (error) {
    record.status = "failed";
    await record.save().catch(() => {});
    console.error("[Paid resource webhook]", error);
    return res.status(500).json({ success: false });
  }
};
