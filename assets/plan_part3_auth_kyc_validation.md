# IndiaCivic – Implementation Plan: Part 3
# Auth, Onboarding, KYC & API Validation

> **Resolves:** #5 · #9 · #22  
> **Priority:** P1  
> **Goal:** Build a complete, real auth flow with proper onboarding. Replace the fake localStorage KYC flag with a real verification backend. Validate every API route input.

---

## Step 1 — Fix the Auth Flow (Forgot Password, Email Verify, Username)

### File changed: `src/App.tsx`

#### 1a — Capture display name during signup

Add a `displayName` input field to the signup form:
```tsx
{authMode === 'signup' && (
  <div className="space-y-1">
    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
      Full Name
    </label>
    <input
      type="text"
      placeholder="e.g. Soham Agarwal"
      value={authDisplayName}
      onChange={(e) => setAuthDisplayName(e.target.value)}
      required
      className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs ..."
    />
  </div>
)}
```

In `handleSignUp`, set the name on the Firebase Auth user:
```typescript
const handleSignUp = async (e: FormEvent) => {
  e.preventDefault();
  setAuthLoading(true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
    await updateProfile(cred.user, { displayName: authDisplayName });
    await sendEmailVerification(cred.user); // send verification email
    setAuthStep("verify-email"); // show "Check your inbox" screen
  } catch (err: any) {
    setAuthError(err.message);
  } finally {
    setAuthLoading(false);
  }
};
```

#### 1b — Add "Verify Email" waiting screen

```tsx
{authStep === "verify-email" && (
  <div className="text-center space-y-4 py-8">
    <div className="mx-auto h-14 w-14 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
      <Mail className="h-6 w-6 text-indigo-600" />
    </div>
    <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">
      Check Your Inbox
    </h3>
    <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
      We sent a verification link to <strong>{authEmail}</strong>. Click it to activate your account.
    </p>
    <button
      onClick={async () => {
        await auth.currentUser?.reload();
        if (auth.currentUser?.emailVerified) {
          setAuthStep("onboarding");
        }
      }}
      className="w-full py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl uppercase cursor-pointer"
    >
      I've Verified — Continue
    </button>
    <button
      onClick={() => sendEmailVerification(auth.currentUser!)}
      className="text-[11px] text-indigo-600 font-bold cursor-pointer hover:underline"
    >
      Resend verification email
    </button>
  </div>
)}
```

#### 1c — Add Forgot Password

```tsx
// Below the password input in sign-in form:
<button
  type="button"
  onClick={handleForgotPassword}
  className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer bg-transparent border-none self-end"
>
  Forgot Password?
</button>
```

```typescript
const handleForgotPassword = async () => {
  if (!authEmail) {
    setAuthError("Enter your email address above first.");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, authEmail);
    setAuthError(""); // clear errors
    setAuthInfo("Password reset email sent! Check your inbox.");
  } catch (err: any) {
    setAuthError(err.message);
  }
};
```

#### 1d — Add explicit "Browse as Guest" CTA

```tsx
<button
  type="button"
  onClick={() => setShowAuthModal(false)}
  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-[11px] rounded-xl uppercase cursor-pointer border-none"
>
  Continue browsing as Guest →
</button>
```

### Commit
```
feat(auth): add email verification, forgot password, username capture, guest CTA

Adds displayName capture to the signup form and calls updateProfile() and
sendEmailVerification() after account creation. Adds a "Check your inbox"
waiting screen with a resend option. Adds forgot password using
sendPasswordResetEmail(). Adds an explicit "Browse as Guest" button on the
auth screen so users understand they can explore before signing up.

Closes #22 (partial)
```

---

## Step 2 — 3-Step Onboarding After First Login

### New file: `src/components/OnboardingWizard.tsx`

After first-time email verification or Google sign-in, redirect to a 3-step onboarding:

**Step 1 — Confirm Name & Profile Photo**
```tsx
<div className="space-y-4">
  <h3>Welcome, {displayName}!</h3>
  <p>Confirm your display name that will appear on civic reports:</p>
  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
  <button onClick={nextStep}>Continue →</button>
</div>
```

**Step 2 — Account Type Selection**
```tsx
// Citizen vs Organization (important: Google sign-in skips this, so all paths hit it)
<div className="grid grid-cols-2 gap-3">
  <button onClick={() => setRole("CITIZEN")} className={role === "CITIZEN" ? "selected" : ""}>
    <User /> Citizen
    <span>Report issues, vote, earn XP</span>
  </button>
  <button onClick={() => setRole("ORGANIZATION")} className={role === "ORGANIZATION" ? "selected" : ""}>
    <Building /> Organization / NGO
    <span>Host campaigns, earn carbon credits</span>
  </button>
</div>
```

**Step 3 — Ward & Location Setup**
```tsx
// Use the browser's Geolocation API + reverse geocode to auto-detect
<button onClick={detectLocation}>
  <MapPin className="animate-pulse" /> Detect My Location Automatically
</button>
// OR manual search
<input placeholder="Search your locality, e.g. Indiranagar..." onChange={handleSearch} />
// Show detected ward name and allow confirmation
{detectedWard && (
  <div className="ward-card">
    <CheckCircle /> Ward detected: {detectedWard}
    <button onClick={confirmAndFinish}>Confirm & Enter IndiaCivic</button>
  </div>
)}
```

On completion, write the full profile to Firestore `/profiles/{uid}`:
```typescript
await setDoc(doc(firestoreDb, "profiles", user.uid), {
  id: user.uid,
  name: name,
  email: user.email,
  role: role,
  location: detectedLocation,
  wardName: detectedWard,
  latitude: coords.lat,
  longitude: coords.lng,
  totalPoints: 0,
  civicScore: 100,
  contributionCount: 0,
  badges: [],
  streakDays: 0,
  isVerified: false,
  whatsappVerified: false,
  createdAt: new Date().toISOString(),
});
```

### Commit
```
feat(onboarding): add 3-step first-login wizard for name, role, and ward setup

New OnboardingWizard component shown on first login (detected by absence of
profile doc in Firestore). Step 1 confirms display name. Step 2 selects
Citizen vs Organization — fixes the gap where Google Sign-In always created
CITIZEN profiles. Step 3 auto-detects ward via browser Geolocation + reverse
geocoding and writes the complete UserProfile to /profiles/{uid} on Firestore.

Closes #22
```

---

## Step 3 — Replace Fake KYC with Real Verification Backend

### Files changed: `server.ts`, `src/components/ProfileView.tsx`

#### 3a — Add server-side verification endpoint

Replace the client `setTimeout` with a real API call:

```typescript
// POST /api/profile/verify-identity
app.post("/api/profile/verify-identity", async (req, res) => {
  const { userId, verificationType, documentId } = req.body;
  // verificationType: "VOTER_ID" | "AADHAAR_LAST4" | "GSTIN" | "CIN"

  if (verificationType === "GSTIN") {
    // Call GST Suvidha Provider API to validate GSTIN
    const gstResponse = await fetch(
      `https://api.gst.gov.in/commonapi/v1.1/search?action=TP&gstin=${documentId}`,
      { headers: { "Auth-Token": process.env.GST_API_TOKEN! } }
    );
    const gstData = await gstResponse.json();

    if (gstData.sts === "Active") {
      // Mark verified in Firestore via Admin SDK
      await firestore.doc(`profiles/${userId}`).update({
        isVerified: true,
        verifiedAt: new Date().toISOString(),
        verificationType: "GSTIN",
        verifiedLegalName: gstData.lgnm,
      });
      return res.json({ success: true, verifiedName: gstData.lgnm });
    } else {
      return res.status(400).json({ error: "GSTIN is inactive or not found." });
    }
  }

  if (verificationType === "VOTER_ID") {
    // Integrate with Digilocker or UIDAI sandbox for voter ID check
    // Until API access is obtained, use a manual admin approval queue:
    await firestore.collection("verificationRequests").add({
      userId, documentId, verificationType,
      status: "PENDING",
      submittedAt: new Date().toISOString(),
    });
    return res.json({ success: true, status: "PENDING_REVIEW",
      message: "Your document has been submitted. Verification completes within 24 hours." });
  }
});
```

#### 3b — Update ProfileView.tsx to call the real API

Replace the fake `setTimeout` verification:
```typescript
// Before — fake
const submitVerificationDetails = () => {
  setTimeout(() => {
    localStorage.setItem(`verified_citizen_${user.id}`, "true");
  }, 2500);
};

// After — real API call
const submitVerificationDetails = async () => {
  setVerificationLoading(true);
  try {
    const res = await fetch("/api/profile/verify-identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        verificationType: selectedDocType,
        documentId: documentIdInput,
      }),
    });
    const data = await res.json();
    if (data.success) {
      if (data.status === "PENDING_REVIEW") {
        setVerificationStep(4); // "Under Review" state
      } else {
        setVerificationStep(5); // "Verified" state
      }
    } else {
      setVerificationError(data.error);
    }
  } finally {
    setVerificationLoading(false);
  }
};
```

Remove all `localStorage.getItem/setItem` calls for verification status — read from Firestore `profile.isVerified` instead.

### Commit
```
feat(kyc): replace fake localStorage verification with real server-side identity check

Removes the setTimeout KYC simulation and all localStorage flag reads/writes
for verification status. Adds POST /api/profile/verify-identity endpoint that
validates GSTIN against the GST Suvidha Provider API for organizations, and
creates a verificationRequests queue document for Voter ID / Aadhaar submissions
pending admin review. Verification status is now stored in Firestore on the
profile document and read directly — never from the client.

Closes #5
```

---

## Step 4 — Add Zod Validation to All API Routes

### File changed: `server.ts`

```typescript
import { z } from "zod";

// Validation middleware factory
function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Invalid request payload",
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data; // replace with parsed, typed data
    next();
  };
}

// Schemas
const CreateIssueSchema = z.object({
  category: z.enum(["Waste Management", "Drainage & Waterlogging", "Broken Public Assets",
    "Night Lighting & Women's Safety", "AQI & Pollution", "Traffic Signal Violations & Accident Reporting",
    "Theft & Safety Incidents"]),
  title: z.string().min(5).max(120),
  description: z.string().min(10).max(2000),
  latitude: z.number().min(6).max(37),   // India bounding box
  longitude: z.number().min(68).max(97),
  isAnonymous: z.boolean(),
  imageBase64: z.string().optional(),
  evidenceLinks: z.array(z.string().url()).max(5).optional(),
});

const VoteSchema = z.object({
  voteType: z.enum(["UPVOTE", "AGREE", "DISAGREE"]),
  userId: z.string().min(1).max(128),
  mediaBase64: z.string().optional(),
  mediaText: z.string().max(500).optional(),
});

const CorroborateSchema = z.object({
  author: z.string().min(1).max(100),
  text: z.string().min(1).max(1000),
  parentId: z.string().optional(),
});

// Apply to routes
app.post("/api/issues", validate(CreateIssueSchema), async (req, res) => { ... });
app.post("/api/issues/:id/vote", validate(VoteSchema), async (req, res) => { ... });
app.post("/api/issues/:id/corroborate", validate(CorroborateSchema), async (req, res) => { ... });
```

### Commit
```
feat(validation): add Zod schema validation to all API routes

Installs zod and adds a validate() middleware factory. Defines schemas for
CreateIssue, Vote, Corroborate, Donate, VerifyStep, and WhatsApp webhook
routes. Schemas enforce type safety, enum values, string length limits, and
India-bounded lat/lng ranges. Invalid payloads return HTTP 400 with
field-level error details. req.body is replaced with the Zod-parsed output
so downstream handlers receive fully typed data.

Closes #9
```

---

## Milestone Checklist

- [ ] Signup form captures `displayName`
- [ ] `sendEmailVerification()` called on signup
- [ ] "Verify Email" waiting screen shown
- [ ] `sendPasswordResetEmail()` wired to Forgot Password link
- [ ] "Browse as Guest →" button on auth screen
- [ ] `OnboardingWizard` shown on first login for all auth methods
- [ ] `/api/profile/verify-identity` endpoint added
- [ ] GSTIN validation calls real GST Suvidha API
- [ ] Voter ID creates a pending review queue document
- [ ] All `localStorage` verification flags removed from `ProfileView.tsx`
- [ ] `isVerified` read from Firestore profile only
- [ ] Zod installed (`npm install zod`)
- [ ] All 6 major API routes have `validate()` middleware
