# Secure paid notes

Paid notes extend the existing `Resource` model and Razorpay integration. New secure PDFs are stored as authenticated Cloudinary image assets. The source PDF has an authenticated delivery type, its public delivery URL is discarded, and the client receives only JPEG page responses proxied by Skillio.

Before upload, the API checks the filename extension, detected file type, PDF signature and EOF marker, rejects JavaScript actions and embedded files, and asks PDF.js to parse the document with JavaScript evaluation disabled. The page count is limited to 120. Cloudinary eagerly generates an authenticated JPEG derivative for each page; on-demand transformations are not used because Cloudinary does not permit them for authenticated assets. On Render, the service uses Cloudinary's signed asynchronous eager notification and marks a resource ready only after all page derivatives are present. If `RENDER_EXTERNAL_URL` is unavailable, processing falls back to synchronous eager generation.

Every page request requires the existing authenticated session, current tenant membership, a published tenant-scoped course, an active course grant for free/standard resources, or a resource entitlement for paid notes. Page responses use `private, no-store` headers, user/resource and IP/resource request limits, and contain only a JPEG page. The React viewer keeps page blobs in memory and overlays the signed-in student's email and institution name. The service worker bypasses all API endpoints, including protected resource paths.

Razorpay orders are created on the server from the current resource price. Browser verification fetches and validates the paid order and captured payment before creating a unique entitlement. The webhook at `/api/order/razorpay-webhook` validates the raw-body HMAC, persists provider event IDs for duplicate handling, grants captured payments, and revokes entitlements on refund events.

Set `RAZORPAY_WEBHOOK_SECRET` in the Render service and configure the Razorpay webhook URL `https://<service-host>/api/order/razorpay-webhook` for `payment.captured` and `payment.refunded` events. Configure valid Cloudinary credentials and confirm authenticated PDF page delivery is enabled for the Cloudinary product environment.

Legacy resources are not migrated or deleted. This feature does not retroactively protect public links already stored in old `Resource.fileUrl` values. New free and paid secure notes use the protected path.

Web applications cannot guarantee prevention of screenshots or capture of content after it has been rendered on a user's screen. The controls here protect the source PDF and authorize page delivery; they are a deterrent to casual sharing, not cryptographic DRM.

The Render upload path uses Cloudinary's asynchronous transformation queue and signed completion notification. The repository has no separate durable job queue or antivirus scanning service configured. Add malware scanning before accepting high-volume note publishing or relaxing the file/page limits.
