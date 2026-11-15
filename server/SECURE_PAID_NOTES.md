# Protected Notes and course resources

The institution-owned Notes catalog is separate from course pricing and from the existing course `Resource` feature. A Note belongs to a tenant, may optionally reference a course, and has its own topic, publication state, price, purchase entitlement, and student catalog. Existing course resources remain attached to their courses and retain their existing access rules.

## Standalone Notes

New Note PDFs are stored as authenticated Cloudinary image assets. Their public delivery URL is discarded, and the client receives only JPEG page responses proxied by Skillio. Before upload, the API checks the filename extension, detected file type, PDF signature and EOF marker, rejects JavaScript actions and embedded files, and asks PDF.js to parse the document with JavaScript evaluation disabled. The page count is limited to 120.

Cloudinary eagerly generates an authenticated JPEG derivative for each page; on-demand transformations are not used because Cloudinary does not permit them for authenticated assets. On Render, the service uses Cloudinary's signed asynchronous eager notification and marks a Note ready only after all page derivatives are present. If `RENDER_EXTERNAL_URL` is unavailable, processing falls back to synchronous eager generation. When replacing a PDF, the old document remains active until the replacement has finished processing.

Student catalog, purchase, viewer-session, and page endpoints require authentication and current membership in the Note's institution. Paid Notes require a verified payment entitlement; free Notes require a claimed entitlement. Each viewer session is short-lived, bound to the authenticated login session, and stored as a token hash. Each page request rechecks tenant membership, the entitlement, and viewer session. Responses are `private, no-store` and contain only a JPEG page. The React viewer keeps page blobs and its short-lived token in memory and overlays the signed-in student's email and institution name. The service worker bypasses API endpoints, including protected Note paths.

Note orders use the server's current price. Verification checks the provider order and captured payment before creating an entitlement. The shared webhook at `/api/order/razorpay-webhook` validates raw-body HMACs, persists provider event IDs for duplicate handling, grants captured-payment entitlements, and revokes entitlements on refunds. Configure `RAZORPAY_WEBHOOK_SECRET` and the webhook URL `https://<service-host>/api/order/razorpay-webhook` for `payment.captured` and `payment.refunded` events.

## Existing course Resources

Course resources continue to use their existing course association and access rules: a published tenant-scoped course and an active course grant for free/standard resources, or a resource entitlement for paid resources. Protected PDF page delivery uses the same authenticated Cloudinary strategy and proxy response protections described above.

Configure valid Cloudinary credentials and confirm authenticated PDF page delivery is enabled for the Cloudinary product environment. Legacy PDFs stored at public URLs are not migrated or retroactively protected.

Web applications cannot guarantee prevention of screenshots or capture after content has been rendered on a user's screen. These controls protect the source PDF and authorize page delivery; they deter casual sharing but are not cryptographic DRM. The repository has no separate durable job queue or antivirus scanning service configured. Add malware scanning before accepting high-volume publishing or relaxing the file/page limits.
