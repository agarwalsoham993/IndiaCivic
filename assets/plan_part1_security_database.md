# IndiaCivic – Implementation Plan: Part 1
# Security & Database Foundation

> **Resolves:** #1 · #2 · #3 · #26  
> **Priority:** P0 — Must complete before any other work  
> **Goal:** Replace all mock persistence and open security holes with real, production-safe infrastructure.

---

## Overview

Every other feature in the app is built on top of a broken foundation:
- The database is a local JSON file read synchronously on every request
- Firestore rules allow anyone to delete the entire database unauthenticated
- Payments can be forged by crafting a URL
- Firebase credentials sit in plaintext source code

This plan fixes the ground floor before anything else is touched.

---

## Step 1 — Provision a Dedicated Firebase Project

> Do this manually in the Firebase Console before writing any code.

1. Create a new Firebase project: **`indiacivic-production`** (separate from any AI Studio sandbox project)
2. Enable **Authentication** (Email/Password + Google Sign-In providers)
3. Create a **Firestore** database in `asia-south1` (Mumbai) region in **production mode**
4. Enable **Firebase App Check** with the reCAPTCHA v3 provider for your domain
5. Copy the new `firebaseConfig` object — it will replace the current hardcoded one

---

## Step 2 — Secure Firebase Credentials via Environment Variables

### Files changed: `src/lib/firebase.ts`, `.env.local`, `.env.example`, `.gitignore`

**`src/lib/firebase.ts`** — Remove all hardcoded values:
```typescript
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};
```

**`.env.example`** — Create this file and commit it:
```env
VITE_FIREBASE_API_KEY=your_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GOOGLE_MAPS_PLATFORM_KEY=your_maps_key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
GEMINI_API_KEY=your_gemini_key
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_NUMBER=+14155238886
```

**`.gitignore`** — Ensure `.env.local` and `.env` are listed (they should never be committed).

### Commit
```
fix(security): move firebase credentials to env vars, add .env.example

Removes hardcoded Firebase API keys and project IDs from src/lib/firebase.ts.
All credentials are now read from VITE_* environment variables injected at
build time. Adds .env.example as the canonical reference for all required
secrets. The old AI Studio sandbox project ID is fully removed.

Closes #26
```

---

## Step 3 — Lock Down Firestore Security Rules

### File changed: `firestore.rules`

Replace the current wide-open rules with role-enforced, ownership-checked rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── ISSUES ──────────────────────────────────────────────────────────────
    match /issues/{issueId} {
      // Anyone can read issues (public civic data)
      allow read: if true;

      // Only authenticated users can create
      allow create: if request.auth != null
        && request.resource.data.reporterId == request.auth.uid;

      // Only the original reporter or a verified officer can update status
      allow update: if request.auth != null && (
        resource.data.reporterId == request.auth.uid ||
        get(/databases/$(database)/documents/profiles/$(request.auth.uid)).data.role == 'OFFICER'
      );

      // Hard delete is forbidden — use status: "ARCHIVED" instead
      allow delete: if false;
    }

    // ── CAMPAIGNS ───────────────────────────────────────────────────────────
    match /campaigns/{campaignId} {
      allow read: if true;
      allow create: if request.auth != null;
      // Financial fields (currentAmount, escrowBalance) can ONLY be modified
      // via server-side Admin SDK — block all client writes to them
      allow update: if request.auth != null
        && !('currentAmount' in request.resource.data.diff(resource.data).affectedKeys())
        && !('escrowBalance' in request.resource.data.diff(resource.data).affectedKeys());
      allow delete: if false;
    }

    // ── PROFILES ────────────────────────────────────────────────────────────
    match /profiles/{userId} {
      // Only the owning user can read their own profile
      allow read: if request.auth != null && request.auth.uid == userId;
      // Public leaderboard reads — only allow non-sensitive fields
      allow read: if request.auth != null;
      // Users can only write their own profile (not totalPoints — that's server-side only)
      allow write: if request.auth != null && request.auth.uid == userId
        && !('totalPoints' in request.resource.data.diff(resource.data).affectedKeys())
        && !('civicScore' in request.resource.data.diff(resource.data).affectedKeys());
      allow delete: if false;
    }

    // ── NOTIFICATIONS ────────────────────────────────────────────────────────
    match /notifications/{userId}/items/{notifId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Only Admin SDK writes notifications
    }
  }
}
```

### Commit
```
fix(security): enforce role-based Firestore security rules

Replaces `allow read, write: if true` on all collections with
ownership and role-checked rules. Financial fields (currentAmount,
escrowBalance) can no longer be modified from the client — only
via the server-side Firebase Admin SDK. Hard deletes are disabled
on all civic data collections. Adds a /notifications subcollection
with user-scoped read-only rules.

Closes #1
```

---

## Step 4 — Replace `db.json` with Firestore as the Sole Data Source

### Files changed: `server.ts` (major refactor)

#### 4a — Remove `loadDatabase()` / `saveDatabase()` entirely

Delete all of:
- `const DATA_FILE = ...`
- `function loadDatabase(): DbSchema { ... }`
- `function saveDatabase(db: DbSchema) { ... }`
- All calls to `db = loadDatabase()` at the top of every route

#### 4b — Initialize Firebase Admin SDK at server startup

```typescript
import * as admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.applicationDefault(), // uses GOOGLE_APPLICATION_CREDENTIALS
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const firestore = admin.firestore();
firestore.settings({ ignoreUndefinedProperties: true });
```

#### 4c — Convert every route to async Firestore reads/writes

**Before (every route):**
```typescript
app.get("/api/issues", (req, res) => {
  db = loadDatabase();          // synchronous file read — blocks event loop
  res.json(db.issues);
});
```

**After:**
```typescript
app.get("/api/issues", async (req, res) => {
  try {
    const snapshot = await firestore.collection("issues")
      .orderBy("timestamp", "desc")
      .limit(100)
      .get();
    const issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(issues);
  } catch (err: any) {
    logger.error("Failed to fetch issues", { error: err.message });
    res.status(500).json({ error: "Database read failed" });
  }
});
```

#### 4d — Use Firestore transactions for all vote/financial operations

```typescript
// /api/issues/:id/vote
app.post("/api/issues/:id/vote", async (req, res) => {
  const { id } = req.params;
  const { userId, voteType } = req.body;

  const issueRef = firestore.doc(`issues/${id}`);

  await firestore.runTransaction(async (tx) => {
    const issueDoc = await tx.get(issueRef);
    if (!issueDoc.exists) throw new Error("Issue not found");

    const issue = issueDoc.data()!;
    if (issue.votedUserIds?.includes(userId)) {
      throw new Error("Already voted");
    }

    const updates: any = {
      votedUserIds: admin.firestore.FieldValue.arrayUnion(userId),
      upvotes: admin.firestore.FieldValue.increment(1),
    };

    if (voteType === "AGREE") {
      updates.agreeVotes = admin.firestore.FieldValue.increment(1);
    } else {
      updates.disagreeVotes = admin.firestore.FieldValue.increment(1);
    }

    tx.update(issueRef, updates);
  });

  const updated = await issueRef.get();
  res.json({ success: true, issue: { id: updated.id, ...updated.data() } });
});
```

### Commit
```
refactor(database): replace synchronous db.json with Firestore Admin SDK

Removes all fs.readFileSync / fs.writeFileSync calls and the loadDatabase /
saveDatabase pattern. Every route is now async and reads/writes Firestore
directly. Vote counts and campaign balances use Firestore transactions to
prevent race conditions under concurrent load. The server no longer maintains
any local state — it is now stateless and safe to run on multiple instances.

Closes #3
```

---

## Step 5 — Fix Stripe Payment Verification

### Files changed: `server.ts`

#### 5a — Add a proper Stripe webhook endpoint

```typescript
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });

// STRIPE WEBHOOK — This is the ONLY way payments should be recorded
app.post("/api/stripe/webhook",
  express.raw({ type: "application/json" }), // must be raw body for signature
  async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
      logger.warn("Invalid Stripe webhook signature", { error: err.message });
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { campaignId, donorId, donorName } = session.metadata!;
      const amount = (session.amount_total ?? 0) / 100; // paise → rupees

      // Record donation using Admin SDK (bypasses client Firestore rules)
      const campaignRef = firestore.doc(`campaigns/${campaignId}`);
      await firestore.runTransaction(async (tx) => {
        const campDoc = await tx.get(campaignRef);
        if (!campDoc.exists) throw new Error("Campaign not found");
        const camp = campDoc.data()!;

        const newDonation = {
          id: `don-${Date.now()}`,
          donorId, donorName, amount,
          timestamp: new Date().toISOString(),
          stripeSessionId: session.id,
          receiptNumber: `GST-${Date.now()}`,
        };

        const newCurrentAmount = (camp.currentAmount || 0) + amount;
        const updates: any = {
          currentAmount: newCurrentAmount,
          escrowBalance: admin.firestore.FieldValue.increment(amount),
          donations: admin.firestore.FieldValue.arrayUnion(newDonation),
        };

        if (newCurrentAmount >= camp.targetAmount) {
          updates.status = "EXECUTION";
          updates.verificationStep = 2;
        }

        tx.update(campaignRef, updates);
      });

      // Award XP to donor via Admin SDK (bypasses client write restrictions)
      await firestore.doc(`profiles/${donorId}`).update({
        totalPoints: admin.firestore.FieldValue.increment(Math.floor(amount / 10)),
        totalDonations: admin.firestore.FieldValue.increment(amount),
        "pointsBreakdown.donating": admin.firestore.FieldValue.increment(Math.floor(amount / 10)),
      });
    }

    res.json({ received: true });
  }
);
```

#### 5b — Delete the old `/api/stripe-callback` GET route entirely

The old route that trusted URL query parameters for `amount` and `donorId` must be removed. Replace the Stripe Checkout session creation to include `metadata`:

```typescript
app.post("/api/campaigns/:id/donate", async (req, res) => {
  const { campaignId, amount, donorId, donorName } = req.body;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price_data: {
      currency: "inr",
      product_data: { name: `IndiaCivic Campaign Contribution` },
      unit_amount: amount * 100, // rupees to paise
    }, quantity: 1 }],
    mode: "payment",
    metadata: { campaignId, donorId, donorName }, // stored server-side only
    success_url: `${process.env.APP_URL}/campaigns?status=success`,
    cancel_url: `${process.env.APP_URL}/campaigns?status=cancelled`,
  });

  res.json({ redirectUrl: session.url });
});
```

### Commit
```
fix(payments): replace URL-param donation trust with Stripe webhook verification

Removes the /api/stripe-callback GET endpoint that trusted client-supplied
amount and donorId query parameters. Adds a POST /api/stripe/webhook endpoint
that verifies the Stripe-Signature header using stripe.webhooks.constructEvent()
before recording any donation or awarding XP. Campaign balance updates now run
inside Firestore transactions via the Admin SDK so they cannot be tampered with
from the client side.

Closes #2
```

---

## Milestone Checklist

- [ ] New Firebase project `indiacivic-production` provisioned
- [ ] `.env.example` committed, `.env.local` gitignored
- [ ] `src/lib/firebase.ts` reads from `VITE_*` env vars
- [ ] `firestore.rules` deployed with ownership + role checks
- [ ] Firebase App Check enabled on production domain
- [ ] `loadDatabase()` / `saveDatabase()` deleted from `server.ts`
- [ ] All routes converted to `async` Firestore reads
- [ ] Vote/balance routes use Firestore transactions
- [ ] `/api/stripe-callback` GET route deleted
- [ ] `/api/stripe/webhook` POST route with signature verification added
- [ ] `STRIPE_WEBHOOK_SECRET` registered in Stripe dashboard
- [ ] Deploy and verify with `stripe listen --forward-to localhost:3000/api/stripe/webhook`
