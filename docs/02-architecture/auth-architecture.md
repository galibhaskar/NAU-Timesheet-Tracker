# NAU TA Timesheet Tracker — Security & Authentication Architecture

Derived from the [Design Spec](superpowers/specs/2026-03-17-nau-timesheet-tracker-design.md).

---

## Table of Contents

1. [Web Authentication (NextAuth.js)](#1-web-authentication-nextauthjs)
2. [Desktop App Authentication (Electron)](#2-desktop-app-authentication-electron)
3. [Invite Flow](#3-invite-flow)
4. [Password Policy](#4-password-policy)
5. [RBAC Middleware Design](#5-rbac-middleware-design)
6. [Route Protection Matrix](#6-route-protection-matrix)
7. [Screenshot & Photo Access Control](#7-screenshot--photo-access-control)
8. [Security Considerations](#8-security-considerations)

---

## 1. Web Authentication (NextAuth.js)

The web dashboard uses [NextAuth.js](https://next-auth.js.org/) with a **Credentials provider** for email/password authentication.

### Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| Provider | Credentials (email + password) | University users authenticate with system-managed credentials created via invite flow |
| Password hashing | bcrypt, cost factor 12 | Balances security against brute-force with acceptable login latency (~250ms per hash) |
| Session strategy | JWT | Stateless sessions avoid DB lookups on every request; tokens are signed with `NEXTAUTH_SECRET` |
| Session duration | 24 hours | Aligns with a full work day; instructors and admins reviewing timesheets should not need to re-authenticate more than once per day |
| CSRF protection | Built-in (NextAuth double-submit cookie) | NextAuth automatically generates and validates a CSRF token on all form submissions |

### Cookie Configuration

```typescript
cookies: {
  sessionToken: {
    name: '__Secure-next-auth.session-token',
    options: {
      httpOnly: true,    // Not accessible via JavaScript — mitigates XSS token theft
      secure: true,      // Transmitted only over HTTPS
      sameSite: 'lax',   // Allows navigation from external links while blocking cross-origin POST
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
    },
  },
}
```

### JWT Payload (Web Sessions)

The JWT issued by NextAuth for web sessions contains:

```typescript
{
  sub: string;       // User ID (UUID)
  email: string;     // User email
  name: string;      // Display name
  role: 'ADMIN' | 'INSTRUCTOR' | 'TA';
  iat: number;       // Issued at (Unix timestamp)
  exp: number;       // Expiry (iat + 24 hours)
}
```

### Login Flow (Web)

```
Browser                    Next.js API                   Database
  │                            │                            │
  ├─ POST /api/auth/signin ───►│                            │
  │  { email, password }       │                            │
  │  (+ CSRF token)            │                            │
  │                            ├─ SELECT user by email ────►│
  │                            │◄─ User record ─────────────┤
  │                            │                            │
  │                            ├─ bcrypt.compare(password,  │
  │                            │     user.password)         │
  │                            │                            │
  │                            │  if match:                 │
  │                            │  ├─ Sign JWT               │
  │                            │  ├─ Set httpOnly cookie    │
  │◄─ 200 + Set-Cookie ───────┤                            │
  │                            │                            │
  │                            │  if no match:              │
  │◄─ 401 Unauthorized ───────┤                            │
```

---

## 2. Desktop App Authentication (Electron)

The Electron desktop app cannot use browser cookies. It uses a dedicated token-based authentication flow with short-lived access tokens and long-lived refresh tokens.

### Token Summary

| Token | Format | Lifetime | Storage | Contains |
|-------|--------|----------|---------|----------|
| Access token | Signed JWT | 1 hour | In-memory (Electron main process) | userId, email, role |
| Refresh token | Opaque string (`crypto.randomUUID()`) | 30 days | Electron `safeStorage` (OS-encrypted) | N/A (resolved via DB lookup) |

### Access Token Payload

```typescript
{
  sub: string;        // User ID (UUID)
  email: string;      // User email
  role: 'ADMIN' | 'INSTRUCTOR' | 'TA';
  type: 'access';     // Distinguishes from web session JWTs
  iat: number;        // Issued at
  exp: number;        // iat + 3600 (1 hour)
}
```

### Refresh Token (Database Record)

```typescript
// RefreshToken table
{
  id: UUID;
  token: string;          // crypto.randomUUID(), hashed with SHA-256 before storage
  userId: UUID;           // FK → User
  expiresAt: DateTime;    // created_at + 30 days
  revoked: boolean;       // Set to true on rotation or logout
  createdAt: DateTime;
}
```

The raw refresh token value is hashed with SHA-256 before storage in the database. This ensures that even if the database is compromised, refresh tokens cannot be used directly.

### Token Storage: Electron safeStorage

Tokens are stored using Electron's `safeStorage` API, which provides OS-level encryption:

| Platform | Backend | Protection |
|----------|---------|------------|
| macOS | Keychain Services | Encrypted with user's login keychain; accessible only to the app's signed bundle |
| Windows | DPAPI (Data Protection API) | Encrypted with user's Windows login credentials; scoped to the current user account |
| Linux | libsecret (GNOME Keyring / KWallet) | Encrypted with the user's session keyring |

```typescript
import { safeStorage } from 'electron';

function storeRefreshToken(token: string): void {
  const encrypted = safeStorage.encryptString(token);
  // Store `encrypted` (Buffer) to a local file
  fs.writeFileSync(tokenPath, encrypted);
}

function retrieveRefreshToken(): string | null {
  if (!fs.existsSync(tokenPath)) return null;
  const encrypted = fs.readFileSync(tokenPath);
  return safeStorage.decryptString(encrypted);
}
```

### Login Flow (Desktop)

```
Electron App               Next.js API                   Database
  │                            │                            │
  ├─ POST /api/auth/token ────►│                            │
  │  { email, password }       │                            │
  │                            ├─ SELECT user by email ────►│
  │                            │◄─ User record ─────────────┤
  │                            │                            │
  │                            ├─ bcrypt.compare()          │
  │                            │                            │
  │                            │  if match:                 │
  │                            │  ├─ Sign access JWT        │
  │                            │  ├─ Generate refresh token │
  │                            │  ├─ Hash & store refresh ─►│
  │                            │                            │
  │◄─ 200 ────────────────────┤                            │
  │  { accessToken, refreshToken, expiresAt }               │
  │                            │                            │
  ├─ Store accessToken         │                            │
  │  in memory                 │                            │
  ├─ Store refreshToken        │                            │
  │  in safeStorage            │                            │
```

### Token Refresh Flow

```
Electron App               Next.js API                   Database
  │                            │                            │
  │  (access token expired     │                            │
  │   or about to expire)      │                            │
  │                            │                            │
  ├─ POST /api/auth/refresh ──►│                            │
  │  { refreshToken }          │                            │
  │                            ├─ Hash incoming token       │
  │                            ├─ SELECT by hashed token ──►│
  │                            │◄─ RefreshToken record ─────┤
  │                            │                            │
  │                            │  Validate:                 │
  │                            │  ├─ Not revoked            │
  │                            │  ├─ Not expired            │
  │                            │                            │
  │                            │  if valid:                 │
  │                            │  ├─ Revoke old refresh ───►│
  │                            │  ├─ Generate new refresh   │
  │                            │  ├─ Hash & store new ─────►│
  │                            │  ├─ Sign new access JWT    │
  │                            │                            │
  │◄─ 200 ────────────────────┤                            │
  │  { accessToken, refreshToken, expiresAt }               │
  │                            │                            │
  │  if invalid or expired:    │                            │
  │◄─ 401 ────────────────────┤                            │
  │  (user must re-login)      │                            │
```

### Refresh Token Rotation Security

Refresh tokens rotate on every use. The old token is **immediately revoked** in the database before the new token is issued. This provides:

1. **Theft detection**: If an attacker steals and uses a refresh token, the legitimate user's next refresh attempt will fail (their token was already rotated by the attacker). This signals a compromise.
2. **Limited blast radius**: A stolen refresh token can be used at most once before it is invalidated.
3. **Automatic expiry**: Even if a token is stolen and never used, it expires after 30 days.

### Proactive Token Refresh

The Electron app refreshes the access token proactively, **5 minutes before expiry**, to avoid failed API calls during active work sessions. A background timer checks the access token's `exp` claim and triggers a refresh when `exp - now < 300 seconds`.

### Logout

On logout, the Electron app:

1. Sends `POST /api/auth/revoke` with the current refresh token to revoke it server-side.
2. Clears the access token from memory.
3. Deletes the encrypted refresh token file from disk.

---

## 3. Invite Flow

Users cannot self-register. All accounts are created through an admin-initiated invite flow.

### Invite Sequence

```
Admin                      Next.js API                   Database              Email Service
  │                            │                            │                      │
  ├─ POST /api/admin/invite ──►│                            │                      │
  │  { email, role, course_id }│                            │                      │
  │                            ├─ Validate no existing     │                      │
  │                            │  user with this email ────►│                      │
  │                            │                            │                      │
  │                            ├─ Generate invite token     │                      │
  │                            │  (crypto.randomUUID())     │                      │
  │                            │                            │                      │
  │                            ├─ Store InviteToken ───────►│                      │
  │                            │  { token, email, role,     │                      │
  │                            │    courseId, expiresAt      │                      │
  │                            │    (now + 7 days) }        │                      │
  │                            │                            │                      │
  │                            ├─ Send invite email ───────────────────────────────►│
  │                            │  Link: {BASE_URL}/invite/{token}                  │
  │                            │                            │                      │
  │◄─ 201 Created ────────────┤                            │                      │
```

### Account Activation

```
Invited User               Next.js                       Database
  │                            │                            │
  ├─ GET /invite/{token} ─────►│                            │
  │                            ├─ Lookup InviteToken ──────►│
  │                            │◄─ Token record ────────────┤
  │                            │                            │
  │                            │  Validate:                 │
  │                            │  ├─ Token exists           │
  │                            │  ├─ Not expired            │
  │                            │  ├─ Not already used       │
  │                            │                            │
  │◄─ Render set-password form ┤                            │
  │                            │                            │
  ├─ POST /invite/{token} ────►│                            │
  │  { name, password }        │                            │
  │                            ├─ Validate password policy  │
  │                            ├─ bcrypt.hash(password, 12) │
  │                            │                            │
  │                            ├─ BEGIN TRANSACTION ───────►│
  │                            │  ├─ Create User            │
  │                            │  ├─ Create CourseAssignment │
  │                            │  ├─ Delete InviteToken     │
  │                            │  ├─ Log AUDIT: USER_INVITED│
  │                            │  COMMIT ──────────────────►│
  │                            │                            │
  │◄─ 302 Redirect to login ──┤                            │
```

### Invite Token Properties

| Property | Value |
|----------|-------|
| Format | `crypto.randomUUID()` — 128-bit random, URL-safe |
| Expiry | 7 days from creation |
| Usage | Single-use; deleted from database after password is set |
| Storage | Stored as plaintext in DB (low-risk: tokens are short-lived, single-use, and do not grant access to existing accounts) |

---

## 4. Password Policy

| Rule | Value | Rationale |
|------|-------|-----------|
| Minimum length | 8 characters | NIST SP 800-63B minimum recommendation |
| Maximum length | 128 characters | Prevents bcrypt input truncation (72-byte limit) from causing silent policy violations |
| Hashing algorithm | bcrypt | Industry standard for password hashing; resistant to GPU-based brute-force |
| Cost factor | 12 | ~250ms per hash; slows brute-force while keeping login responsive |
| Password history | Not enforced (v1) | Planned for future iteration |
| Character requirements | None | Per NIST SP 800-63B; length matters more than complexity rules |

### Login Rate Limiting

| Parameter | Value |
|-----------|-------|
| Window | 15 minutes |
| Max attempts | 5 per email address |
| Scope | Per email (not per IP) — prevents account-targeted brute-force |
| Response on limit | HTTP 429 with `Retry-After` header |
| Lockout | Temporary (15-minute window resets); no permanent lockout |

When rate-limited, the API returns:

```json
{
  "error": "Too many login attempts. Please try again in {minutes} minutes.",
  "retryAfter": 900
}
```

Both `POST /api/auth/signin` (web) and `POST /api/auth/token` (desktop) share the same rate-limit counter per email address.

---

## 5. RBAC Middleware Design

Authorization is enforced through composable middleware functions that wrap API route handlers. Each middleware validates one aspect of access control and can be stacked.

### Middleware Functions

#### `withAuth(handler)`

Verifies that the request has a valid, non-expired JWT (from cookie or `Authorization: Bearer` header). Attaches the decoded user to the request context.

```typescript
// Pseudocode
function withAuth(handler) {
  return async (req, res) => {
    const token = extractToken(req); // cookie or Authorization header
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const decoded = verifyJWT(token);
    if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' });

    req.user = decoded; // { sub, email, role }
    return handler(req, res);
  };
}
```

#### `withRole(...roles)`

Checks that the authenticated user's role is in the allowed set.

```typescript
function withRole(...roles: Role[]) {
  return (handler) => {
    return withAuth(async (req, res) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return handler(req, res);
    });
  };
}
```

#### `withCourseAccess(courseIdExtractor)`

Verifies the user has a CourseAssignment for the given course. Admins bypass this check.

```typescript
function withCourseAccess(courseIdExtractor: (req) => string) {
  return (handler) => {
    return withAuth(async (req, res) => {
      if (req.user.role === 'ADMIN') return handler(req, res);

      const courseId = courseIdExtractor(req);
      const assignment = await prisma.courseAssignment.findFirst({
        where: { userId: req.user.sub, courseId },
      });

      if (!assignment) {
        return res.status(403).json({ error: 'No access to this course' });
      }

      req.courseAssignment = assignment;
      return handler(req, res);
    });
  };
}
```

#### `withSessionOwner(sessionIdExtractor)`

Verifies the authenticated user owns the work session (via CourseAssignment). Admins bypass this check.

```typescript
function withSessionOwner(sessionIdExtractor: (req) => string) {
  return (handler) => {
    return withAuth(async (req, res) => {
      const sessionId = sessionIdExtractor(req);
      const session = await prisma.workSession.findUnique({
        where: { id: sessionId },
        include: { assignment: true },
      });

      if (!session) return res.status(404).json({ error: 'Session not found' });

      if (req.user.role !== 'ADMIN' && session.assignment.userId !== req.user.sub) {
        return res.status(403).json({ error: 'Not your session' });
      }

      req.workSession = session;
      return handler(req, res);
    });
  };
}
```

#### `withProofAccess(sessionIdExtractor)`

Verifies the user can view screenshots/photos for a session. Only INSTRUCTOR (for the session's course) and ADMIN are allowed. TAs are always denied.

```typescript
function withProofAccess(sessionIdExtractor: (req) => string) {
  return (handler) => {
    return withAuth(async (req, res) => {
      // TAs can never view proof
      if (req.user.role === 'TA') {
        return res.status(403).json({ error: 'TAs cannot access proof files' });
      }

      // Admins can view all proof
      if (req.user.role === 'ADMIN') return handler(req, res);

      // Instructors: verify course assignment
      const sessionId = sessionIdExtractor(req);
      const session = await prisma.workSession.findUnique({
        where: { id: sessionId },
        include: { assignment: { include: { course: true } } },
      });

      if (!session) return res.status(404).json({ error: 'Session not found' });

      const instructorAssignment = await prisma.courseAssignment.findFirst({
        where: {
          userId: req.user.sub,
          courseId: session.assignment.courseId,
          role: 'INSTRUCTOR',
        },
      });

      if (!instructorAssignment) {
        return res.status(403).json({ error: 'No instructor access to this course' });
      }

      req.workSession = session;
      return handler(req, res);
    });
  };
}
```

### Middleware Composition Example

```typescript
// Only ADMIN can access system settings
export const PUT = withRole('ADMIN')(updateSettingsHandler);

// TA can start sessions; middleware verifies ownership of the assignment
export const POST = withAuth(startSessionHandler);
// Inside startSessionHandler: verify req.user.sub === assignment.userId

// Instructor reviews — needs course access
export const POST = withRole('INSTRUCTOR', 'ADMIN')(
  withCourseAccess((req) => req.body.courseId)(approveHandler)
);
```

---

## 6. Route Protection Matrix

Every API endpoint, its required authentication, authorized roles, and additional access checks:

### Session Management

| Endpoint | Method | Auth | Roles | Access Check | Notes |
|----------|--------|------|-------|--------------|-------|
| `/api/sessions/start` | POST | JWT | TA | `withAuth` + verify assignment ownership | Enforces single active session constraint |
| `/api/sessions/:id/pause` | POST | JWT | TA | `withSessionOwner` | Session must be ACTIVE |
| `/api/sessions/:id/resume` | POST | JWT | TA | `withSessionOwner` | Session must be PAUSED |
| `/api/sessions/:id/stop` | POST | JWT | TA | `withSessionOwner` | Session must be ACTIVE or PAUSED |
| `/api/sessions/:id/screenshots` | POST | JWT | TA | `withSessionOwner` | Upload only; TA cannot GET screenshots |
| `/api/sessions/:id/photos` | POST | JWT | TA | `withSessionOwner` | Mode must be IN_PERSON |

### Proof Access (Read)

| Endpoint | Method | Auth | Roles | Access Check | Notes |
|----------|--------|------|-------|--------------|-------|
| `/api/sessions/:id/screenshots` | GET | JWT | INSTRUCTOR, ADMIN | `withProofAccess` | Returns pre-signed URLs (15-min expiry) |
| `/api/sessions/:id/photos` | GET | JWT | INSTRUCTOR, ADMIN | `withProofAccess` | Returns pre-signed URLs (15-min expiry) |

### Submissions

| Endpoint | Method | Auth | Roles | Access Check | Notes |
|----------|--------|------|-------|--------------|-------|
| `/api/submissions/submit` | POST | JWT | TA | `withAuth` + verify assignment ownership | All sessions must be COMPLETED |
| `/api/submissions/:id/approve` | POST | JWT | INSTRUCTOR, ADMIN | `withRole` + `withCourseAccess` | Submission must be SUBMITTED |
| `/api/submissions/:id/reject` | POST | JWT | INSTRUCTOR, ADMIN | `withRole` + `withCourseAccess` | Rejection reason required |
| `/api/export/:submissionId` | GET | JWT | TA, INSTRUCTOR, ADMIN | Scoped: TA (own), INSTRUCTOR (their courses), ADMIN (all) | Submission must be APPROVED |

### Dashboard

| Endpoint | Method | Auth | Roles | Access Check | Notes |
|----------|--------|------|-------|--------------|-------|
| `/api/dashboard/ta` | GET | JWT | TA | `withRole('TA')` | Returns only own data |
| `/api/dashboard/instructor` | GET | JWT | INSTRUCTOR | `withRole('INSTRUCTOR')` | Returns only assigned courses |
| `/api/dashboard/admin` | GET | JWT | ADMIN | `withRole('ADMIN')` | Returns all courses and system stats |
| `/api/ta/:userId/cross-course-hours` | GET | JWT | INSTRUCTOR, ADMIN | `withRole` + verify shared course (INSTRUCTOR) | Instructors see TAs in their courses only |

### Admin

| Endpoint | Method | Auth | Roles | Access Check | Notes |
|----------|--------|------|-------|--------------|-------|
| `/api/admin/settings` | GET | JWT | ADMIN | `withRole('ADMIN')` | |
| `/api/admin/settings` | PUT | JWT | ADMIN | `withRole('ADMIN')` | Audit-logged |
| `/api/admin/courses/:id/budget` | PUT | JWT | ADMIN | `withRole('ADMIN')` | Audit-logged |
| `/api/admin/audit-log` | GET | JWT | ADMIN | `withRole('ADMIN')` | |
| `/api/admin/invite` | POST | JWT | ADMIN | `withRole('ADMIN')` | Creates InviteToken + sends email |
| `/api/admin/purge-expired` | POST | JWT | ADMIN | `withRole('ADMIN')` | Triggers proof cleanup job |

### Authentication

| Endpoint | Method | Auth | Roles | Access Check | Notes |
|----------|--------|------|-------|--------------|-------|
| `/api/auth/signin` | POST | None | Any | Rate limited (5/15min per email) | Web login (NextAuth) |
| `/api/auth/token` | POST | None | Any | Rate limited (5/15min per email) | Desktop login |
| `/api/auth/refresh` | POST | None | Any | Valid refresh token required | Desktop token refresh |
| `/api/auth/revoke` | POST | JWT | Any | `withAuth` | Desktop logout — revokes refresh token |
| `/invite/:token` | GET/POST | None | Any | Valid invite token required | Account activation |

---

## 7. Screenshot & Photo Access Control

### Access Verification Chain

Screenshots and photos are never directly accessible via public URLs. Access requires walking a chain of ownership:

```
Screenshot/PhotoProof
    └─► session_id → WorkSession
                        └─► assignment_id → CourseAssignment
                                                ├─► course_id → Course
                                                └─► user_id → User (the TA)
```

**For an INSTRUCTOR to view proof:**
1. The instructor must be authenticated (valid JWT).
2. The instructor must have a `CourseAssignment` with `role = INSTRUCTOR` for the **same** `course_id` as the session's course assignment.
3. Only then does the API generate a pre-signed URL.

**For an ADMIN to view proof:**
1. The admin must be authenticated (valid JWT).
2. No further ownership check — admins can view all proof.

**For a TA attempting to view proof:**
1. The TA is authenticated.
2. The middleware immediately returns HTTP 403 — TAs are categorically denied access to proof files, even their own.

### Pre-Signed URL Generation

The API never exposes raw S3/R2 paths. Instead, it generates short-lived pre-signed URLs:

```typescript
async function generatePreSignedUrl(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: fileKey,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: 900, // 15 minutes
  });
}
```

| Property | Value | Rationale |
|----------|-------|-----------|
| Expiry | 15 minutes | Long enough for viewing/downloading during a review session; short enough to limit link sharing |
| Scope | Single object | Each URL grants access to exactly one file |
| On-demand | Generated per request | URLs are not stored; a new one is generated each time |
| Caching | None (no CDN caching of signed URLs) | Prevents cached URLs from outliving their intended expiry |

### Why TAs Get 403

The design intentionally prevents TAs from viewing proof files for the following reasons:

1. **Behavioral integrity**: If TAs could see when screenshots are captured, they could game the system by only working during capture moments.
2. **Simplicity**: TAs have no legitimate need to view their own screenshots — their workflow is start/stop/describe/submit.
3. **Privacy boundary**: Screenshots may capture sensitive content. Limiting access reduces the attack surface.

---

## 8. Security Considerations

### 8.1 Rate Limiting Strategy

| Endpoint Group | Limit | Scope | Backend |
|---------------|-------|-------|---------|
| Login (`/api/auth/signin`, `/api/auth/token`) | 5 requests / 15 min | Per email address | In-memory store (or Redis in production) |
| Token refresh (`/api/auth/refresh`) | 10 requests / min | Per IP | In-memory store |
| Screenshot upload (`/api/sessions/:id/screenshots`) | 20 requests / min | Per authenticated user | In-memory store |
| Photo upload (`/api/sessions/:id/photos`) | 10 requests / min | Per authenticated user | In-memory store |
| All other API endpoints | 60 requests / min | Per authenticated user | In-memory store |

Rate limiting is implemented at the API route level. In production, a Redis-backed store ensures limits persist across server restarts and are shared across multiple instances.

### 8.2 Input Validation (Zod Schemas)

Every API endpoint validates its input using [Zod](https://zod.dev/) schemas **before** any business logic executes. This provides:

- **Type safety**: Runtime validation matches TypeScript types.
- **Fail-fast**: Invalid requests are rejected at the boundary with descriptive 422 errors.
- **Injection prevention**: Validated and typed inputs are passed to Prisma, not raw strings.

```typescript
// Example: Start session input validation
const StartSessionSchema = z.object({
  assignment_id: z.string().uuid('Invalid UUID format'),
  category: z.enum(['GRADING', 'OFFICE_HOURS', 'LAB_PREP', 'TUTORING', 'MEETINGS', 'OTHER']),
  mode: z.enum(['SCREEN', 'IN_PERSON']),
  client_timestamp: z.string().datetime().optional(),
});

// Applied in route handler
export async function POST(req: Request) {
  const body = await req.json();
  const result = StartSessionSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ errors: result.error.flatten() }, { status: 422 });
  }
  // Proceed with validated data: result.data
}
```

See [Validation Rules](validation-rules.md) for the complete validation specification per endpoint.

### 8.3 CORS Configuration

```typescript
// next.config.js
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS, // e.g., 'https://timesheet.nau.edu'
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400', // 24 hours preflight cache
};
```

| Environment | Allowed Origins |
|-------------|----------------|
| Production | `https://timesheet.nau.edu` (exact domain, no wildcards) |
| Development | `http://localhost:3000`, `http://localhost:5173` |
| Electron app | Requests from the desktop app include an `Authorization: Bearer` header and do not rely on cookies, so CORS does not apply to them. The Electron app is treated as an API client, not a browser origin. |

### 8.4 Content Security Policy (CSP)

Applied via Next.js middleware headers:

```typescript
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://*.s3.amazonaws.com https://*.r2.cloudflarestorage.com;
  font-src 'self';
  connect-src 'self' https://*.s3.amazonaws.com https://*.r2.cloudflarestorage.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;
```

Key directives:

| Directive | Value | Purpose |
|-----------|-------|---------|
| `script-src` | `'self' 'nonce-{random}'` | Only same-origin scripts and those with a valid nonce; blocks inline script injection |
| `img-src` | `'self' blob: data: https://*.s3...` | Allows loading pre-signed screenshot URLs from S3/R2 |
| `frame-src` | `'none'` | Prevents clickjacking via iframe embedding |
| `frame-ancestors` | `'none'` | Additional clickjacking protection |
| `object-src` | `'none'` | Blocks Flash/Java plugin embeds |

### 8.5 Electron Security Configuration

The Electron app follows the [Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security):

#### BrowserWindow Configuration

```typescript
const mainWindow = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,       // Renderer cannot access Node.js APIs directly
    nodeIntegration: false,       // No require() in renderer process
    sandbox: true,                // Full Chromium sandboxing
    webSecurity: true,            // Same-origin policy enforced
    allowRunningInsecureContent: false,
    enableRemoteModule: false,    // Remote module disabled (deprecated)
  },
});
```

| Setting | Value | Purpose |
|---------|-------|---------|
| `contextIsolation` | `true` | Separates preload script context from renderer page context; prevents prototype pollution attacks |
| `nodeIntegration` | `false` | Renderer process cannot call `require()` or access Node.js APIs; reduces attack surface |
| `sandbox` | `true` | Runs renderer in a Chromium sandbox; limits access to OS resources even if the renderer is compromised |
| `webSecurity` | `true` | Enforces same-origin policy; prevents the renderer from loading arbitrary remote content |

#### IPC Channel Security

Communication between the Electron main process and the renderer process uses a carefully scoped preload script:

```typescript
// preload.ts — exposed to renderer via contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
  // Session management
  startSession: (data: StartSessionData) => ipcRenderer.invoke('session:start', data),
  pauseSession: (sessionId: string) => ipcRenderer.invoke('session:pause', sessionId),
  resumeSession: (sessionId: string) => ipcRenderer.invoke('session:resume', sessionId),
  stopSession: (data: StopSessionData) => ipcRenderer.invoke('session:stop', data),

  // Screenshots (main process captures, sends to API)
  onScreenshotCaptured: (callback: () => void) =>
    ipcRenderer.on('screenshot:captured', callback),

  // Auth
  login: (credentials: LoginData) => ipcRenderer.invoke('auth:login', credentials),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getAuthState: () => ipcRenderer.invoke('auth:getState'),

  // System
  getIdleTime: () => ipcRenderer.invoke('system:getIdleTime'),
  onIdleStateChanged: (callback: (isIdle: boolean) => void) =>
    ipcRenderer.on('idle:stateChanged', (_event, isIdle) => callback(isIdle)),
});
```

**IPC security rules:**
1. **Allowlist pattern**: Only explicitly listed channels are exposed. The renderer cannot invoke arbitrary IPC channels.
2. **No direct `ipcRenderer` exposure**: The renderer receives a typed API object via `contextBridge`, not the raw `ipcRenderer` module.
3. **Input validation in main process**: Every `ipcMain.handle()` handler validates its arguments before processing. The main process never trusts data from the renderer.
4. **No shell commands**: The IPC API does not expose `shell.exec`, file system access, or any OS-level operations to the renderer.

#### Navigation Restrictions

```typescript
// Prevent the renderer from navigating to arbitrary URLs
mainWindow.webContents.on('will-navigate', (event, url) => {
  const allowedOrigins = [process.env.WEB_APP_URL, 'file://'];
  const parsedUrl = new URL(url);
  if (!allowedOrigins.some(origin => url.startsWith(origin))) {
    event.preventDefault();
  }
});

// Block new window creation
mainWindow.webContents.setWindowOpenHandler(() => {
  return { action: 'deny' };
});
```

### 8.6 SQL Injection Prevention

All database queries go through [Prisma ORM](https://www.prisma.io/), which uses **parameterized queries** by default. No raw SQL is used anywhere in the codebase.

```typescript
// Prisma generates parameterized queries — inputs are never interpolated into SQL
const session = await prisma.workSession.findUnique({
  where: { id: sessionId }, // sessionId is a parameter, not interpolated
});
```

If raw queries are ever needed (e.g., for complex aggregations), Prisma's `$queryRaw` uses tagged template literals that automatically parameterize:

```typescript
// Safe: tagged template literal — values are parameterized
const result = await prisma.$queryRaw`
  SELECT * FROM "WorkSession" WHERE "id" = ${sessionId}
`;

// NEVER: string concatenation (would be caught in code review)
// const result = await prisma.$queryRawUnsafe(`SELECT * FROM ... WHERE id = '${sessionId}'`);
```

### 8.7 XSS Prevention

Multiple layers of XSS protection:

| Layer | Mechanism | Coverage |
|-------|-----------|----------|
| React auto-escaping | JSX expressions (`{variable}`) are escaped by default | All rendered content |
| No `dangerouslySetInnerHTML` | Prohibited by code convention; flagged in code review | All components |
| Content Security Policy | `script-src 'self' 'nonce-{random}'` blocks inline scripts | All pages |
| Input validation (Zod) | Rejects unexpected input shapes at the API boundary | All API endpoints |
| httpOnly cookies | Session tokens are not accessible via `document.cookie` | Authentication |

### 8.8 Additional Security Headers

Applied via Next.js middleware on all responses:

```typescript
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '0' },  // Disabled; CSP is the modern replacement
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];
```

### 8.9 Secrets Management

| Secret | Storage | Access |
|--------|---------|--------|
| `NEXTAUTH_SECRET` | Environment variable (`.env.local`, Vercel env vars) | Next.js runtime only |
| `DATABASE_URL` | Environment variable | Next.js runtime only |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Environment variable | Next.js runtime only |
| User refresh tokens | Hashed (SHA-256) in database | API auth endpoints only |
| User passwords | Hashed (bcrypt, cost 12) in database | API auth endpoints only |
| Electron refresh token | Encrypted via `safeStorage` on disk | Electron main process only |

**`.env` files are in `.gitignore`.** The repository never contains secrets.

---

## Appendix A: Threat Model Summary

| Threat | Mitigation |
|--------|------------|
| Brute-force login | Rate limiting: 5 attempts / 15 min per email; bcrypt cost factor 12 |
| Stolen access token (JWT) | Short lifetime (1 hour); no sensitive data in payload |
| Stolen refresh token | SHA-256 hashed in DB; rotation on use; 30-day expiry; OS-encrypted at rest |
| Replay attack on refresh token | Immediate revocation on rotation; reuse of revoked token fails |
| XSS | React auto-escaping; CSP with nonce; httpOnly cookies; no `dangerouslySetInnerHTML` |
| CSRF | NextAuth double-submit cookie; SameSite=Lax cookies |
| SQL injection | Prisma parameterized queries; no raw SQL |
| Clickjacking | `X-Frame-Options: DENY`; CSP `frame-ancestors 'none'` |
| Screenshot URL leaking | Pre-signed URLs with 15-min expiry; no CDN caching; access verified per request |
| TA viewing screenshots | Categorical 403 in `withProofAccess` middleware; no client-side routes for proof |
| Privilege escalation | Role verified from JWT on every request; middleware composition enforces layered checks |
| Electron renderer compromise | `contextIsolation`, `sandbox`, `nodeIntegration: false`; scoped IPC allowlist |
| Token theft from disk (Electron) | `safeStorage` API — OS-level encryption tied to user account |

---

## Appendix B: Auth Decision Log

| Decision | Alternative Considered | Reason for Choice |
|----------|----------------------|-------------------|
| bcrypt over Argon2 | Argon2id (memory-hard) | bcrypt is well-supported in Node.js (`bcryptjs`); Argon2 requires native bindings that complicate Electron builds |
| JWT sessions over database sessions | Server-side session store | Stateless JWTs reduce DB load on every request; acceptable for this scale |
| Refresh token rotation over long-lived tokens | Single non-rotating refresh token | Rotation limits the window of token theft; aligns with OAuth 2.0 best practices |
| `safeStorage` over `electron-store` | Plain JSON file, `electron-store` with encryption | `safeStorage` delegates to OS-native credential storage, which is audited and hardened by OS vendors |
| Invite-only over self-registration | Open registration with email verification | University context: all users are known in advance; prevents unauthorized access |
| Pre-signed URLs over proxy streaming | API-proxied file serving | Pre-signed URLs offload bandwidth to S3/R2; reduces server load for large screenshot galleries |
