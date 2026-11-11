# Multi-Tenant White-Label LMS SaaS — Operations & Architecture Guide

## 1. Overview
The Skillio platform has been transformed into a production-grade, multi-tenant, white-label SaaS LMS using a shared application and shared database model scoped by `tenantId`.

```
                         INTERNET
                            │
                            ▼
                    *.mylms.com / *.lvh.me
                            │
                            ▼
                    Render Deployment / Reverse Proxy
                            │
             ┌──────────────┴──────────────┐
             ▼                             ▼
       React Frontend               Node / Express API
             │                             │
             │                      Tenant Resolution (Host/Subdomain)
             │                             │
             │                      Authentication & RBAC
             │                             │
             └──────────────┬──────────────┘
                            │
                            ▼
                      MongoDB Atlas
                            │
                            ▼
                   Tenant-isolated data
           (Users, Courses, Lectures, Reviews)
```

---

## 2. Local Development Testing (Zero Configuration)
Local testing requires **zero paid domains**. Using `lvh.me` (which automatically resolves any subdomain to `127.0.0.1` via public DNS):

- **Default Tenant (Skillio Academy)**:
  `http://localhost:5173` or `http://lvh.me:5173`
- **Physics Academy Tenant**:
  `http://physics.lvh.me:5173`
- **Coding Academy Tenant**:
  `http://coding.lvh.me:5173`
- **ABC Academy Tenant**:
  `http://abcacademy.lvh.me:5173`

You can also switch tenants instantaneously in development using the **Tenant Switcher** badge at the bottom-left corner of the UI or via URL query parameter:
`http://localhost:5173/?tenant=physics`

---

## 3. Render Production Deployment

### Step 1: Wildcard Custom Domain on Render
1. Open your Web Service in the **Render Dashboard**.
2. Navigate to **Settings** > **Custom Domains**.
3. Add the wildcard domain: `*.mylms.com` and root domain `mylms.com`.
4. Render automatically requests and provisions a wildcard Let's Encrypt SSL certificate for all subdomains.

### Step 2: DNS Configuration (Cloudflare, Namecheap, Route 53, etc.)
Configure the following DNS records with your registrar:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `*` | `skillio-saas-api.onrender.com` | Auto / 300 |
| CNAME | `@` / `www` | `skillio-saas-api.onrender.com` | Auto / 300 |

### Step 3: Production Environment Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Application environment | `production` |
| `PORT` | Listening port (Render default) | `10000` |
| `MONGO_URI` | MongoDB Atlas Connection String | `mongodb+srv://...` |
| `JWT_SECRET` | 256-bit secret for signing auth tokens | `your_long_random_secret` |
| `COOKIE_DOMAIN` | Shared cookie scope across all subdomains | `.mylms.com` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://mylms.com,https://*.mylms.com` |
| `CLOUDINARY_NAME` | Cloudinary Cloud Name | `dauvqhykv` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `487695551954759` |
| `CLOUDINARY_API_SECRET`| Cloudinary API Secret | `tPX6raiFFVZl7Ps...` |
| `RAZORPAY_KEY_ID` | Razorpay Key ID | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret | `...` |

---

## 4. Multi-Tenant Security & Isolation Matrix

| Layer | Implementation | Security Guarantee |
|-------|----------------|--------------------|
| **Tenant Resolution** | `tenantResolver` middleware reads hostname/subdomain with in-memory caching | Guaranteed tenant context on every request |
| **Authentication** | `isAuth` validates JWT + checks `token.tenantId === req.tenantId` | Cross-tenant token replay blocked |
| **User Scoping** | Compound index `{ email: 1, tenantId: 1 }` unique per tenant | Different organizations can have identical emails without collision |
| **Course Isolation** | Every query scopes by `{ _id, tenantId: req.tenantId }` | Tenant A cannot view or manipulate Tenant B courses |
| **Lecture Access** | Lectures linked to `tenantId` & `courseId` | Direct IDOR attacks against lecture URLs blocked |
| **Payments** | Server extracts `req.userId` from session; verifies course belongs to tenant | Forgery of user ID or course ID in payment payloads blocked |
| **RBAC** | `requirePermission(...)` backed by `server/utils/permissions.js` | Institution ownership is stored on the institution; teachers keep the educator role |

Existing deployments should run `npm run migrate:educator-roles` once with the application `MONGO_URI` before deploying the role schema that no longer accepts the retired `tenant_admin` value. The migration changes those account and membership records to `educator`; institution ownership remains attached to `Tenant.ownerId`.

---

## 5. Database Migration & Rollback

### Idempotent Migration
To associate any legacy non-tenanted documents with the default organization and create seed organizations:
```bash
npm run migrate:tenants
```

### Dry Run (Verify without writing)
```bash
node server/scripts/migrateMultiTenant.js --dry-run
```

### Rollback (Removes multi-tenant associations)
```bash
node server/scripts/migrateMultiTenant.js --rollback
```

