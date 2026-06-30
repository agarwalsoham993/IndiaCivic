# IndiaCivic – Implementation Plan: Part 2
# Real-Time Data Sync & Notifications

> **Resolves:** #17  
> **Depends on:** Part 1 (Firestore must be the data source before listeners can work)  
> **Priority:** P0 — Core stated requirement of the problem  
> **Goal:** Replace full-page polling (`loadAllData()`) with Firestore real-time listeners. Wire the Bell icon to a live notification feed.

---

## Overview

The problem statement explicitly requires **real-time issue tracking**. Currently `loadAllData()` does a single REST fetch on mount and after each mutation — there are no live updates. If two users vote simultaneously, each sees stale counts. If an issue changes status, the reporter never knows.

This plan makes the app genuinely real-time.

---

## Step 1 — Replace `loadAllData()` with Firestore `onSnapshot` Listeners

### File changed: `src/App.tsx`

#### Remove the polling pattern

Delete the `loadAllData` function and every call to it. Replace with a single `useEffect` that opens persistent Firestore listeners.

```typescript
import { collection, doc, onSnapshot, query, orderBy, limit, where } from "firebase/firestore";
import { db as firestoreDb } from "./lib/firebase";

// Inside the App component:
useEffect(() => {
  if (!userProfile || userProfile.id === "guest") return;

  // ── Live Issues Feed ─────────────────────────────────────────────────────
  const issuesQuery = query(
    collection(firestoreDb, "issues"),
    orderBy("timestamp", "desc"),
    limit(150)
  );
  const unsubIssues = onSnapshot(issuesQuery, (snap) => {
    const issues = snap.docs.map(d => ({ id: d.id, ...d.data() } as Issue));
    setIssues(issues);
  }, (err) => console.error("Issues listener error:", err));

  // ── Live Campaigns Feed ──────────────────────────────────────────────────
  const unsubCampaigns = onSnapshot(
    collection(firestoreDb, "campaigns"),
    (snap) => {
      const campaigns = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCampaigns(campaigns);
    }
  );

  // ── Live User Profile ────────────────────────────────────────────────────
  const unsubProfile = onSnapshot(
    doc(firestoreDb, "profiles", userProfile.id),
    (snap) => {
      if (snap.exists()) setUserProfile({ id: snap.id, ...snap.data() } as UserProfile);
    }
  );

  // ── Live Notifications ───────────────────────────────────────────────────
  const notifQuery = query(
    collection(firestoreDb, "notifications", userProfile.id, "items"),
    orderBy("timestamp", "desc"),
    limit(20)
  );
  const unsubNotifs = onSnapshot(notifQuery, (snap) => {
    const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setNotifications(notifs);
    setUnreadCount(notifs.filter(n => !n.read).length);
  });

  // Clean up all listeners when user logs out or component unmounts
  return () => {
    unsubIssues();
    unsubCampaigns();
    unsubProfile();
    unsubNotifs();
  };
}, [userProfile?.id]);
```

### Commit
```
feat(realtime): replace loadAllData polling with Firestore onSnapshot listeners

Removes the loadAllData() function and all manual fetch-after-mutation calls.
Replaces with four persistent Firestore onSnapshot listeners for issues,
campaigns, the user's own profile, and their notification feed. State is now
updated automatically whenever any other user or the server modifies data —
no page refresh required. Listeners are cleaned up on logout via the useEffect
return function.

Closes #17 (partial — Bell UI wired in next commit)
```

---

## Step 2 — Server-Side Notification Dispatch via Admin SDK

### File changed: `server.ts`

Add a `sendNotification()` helper that writes to Firestore's `/notifications/{userId}/items/` collection. Call this helper from every status-change endpoint.

```typescript
// server.ts — Notification helper
async function sendNotification(
  userId: string,
  type: "STATUS_CHANGE" | "VOTE_MILESTONE" | "CAMPAIGN_UPDATE" | "RESOLUTION",
  payload: { title: string; body: string; issueId?: string; campaignId?: string }
) {
  if (!userId || userId === "guest") return;
  await firestore.collection("notifications").doc(userId).collection("items").add({
    type,
    ...payload,
    read: false,
    timestamp: new Date().toISOString(),
  });
}

// Example usage — in the vote route, when issue crosses escalation threshold:
if (newAgreeVotes >= 15 && prevStatus === "PENDING") {
  await firestore.doc(`issues/${id}`).update({ status: "IN_PROGRESS" });
  // Notify the original reporter
  await sendNotification(issue.reporterId, "STATUS_CHANGE", {
    title: "Your issue is being actioned! 🎉",
    body: `"${issue.title}" has received 15 community verifications and is now IN PROGRESS.`,
    issueId: id,
  });
}

// In the campaign verify-step route, when a campaign completes:
if (campaign.status === "RESOLVED") {
  // Notify all donors
  for (const donation of campaign.donations) {
    await sendNotification(donation.donorId, "CAMPAIGN_UPDATE", {
      title: "Campaign resolved! Escrow released ✅",
      body: `"${campaign.title}" has been verified by the community and funds have been released.`,
      campaignId: campaign.id,
    });
  }
}
```

### Commit
```
feat(notifications): add server-side notification dispatch to Firestore

Adds sendNotification() Admin SDK helper that writes structured notification
documents to /notifications/{userId}/items/. Calls this from the issue vote
route (status escalation), the campaign verify-step route (resolution), and
the issue resolve route. Notifications are written only for authenticated
users — guest reporters are skipped.

Closes #17 (partial — server side)
```

---

## Step 3 — Wire the Bell Icon to a Real Notification Drawer

### Files changed: `src/components/HomeView.tsx`, `src/App.tsx`

#### 3a — Add notification state to App.tsx

```typescript
const [notifications, setNotifications] = useState<Notification[]>([]);
const [unreadCount, setUnreadCount] = useState(0);
const [showNotifDrawer, setShowNotifDrawer] = useState(false);
```

Pass these down to `HomeView`:
```typescript
<HomeView
  notifications={notifications}
  unreadCount={unreadCount}
  onOpenNotifications={() => setShowNotifDrawer(true)}
  onMarkAllRead={handleMarkAllRead}
  ...
/>
```

#### 3b — Replace the dead Bell button in HomeView.tsx

```tsx
// Before (line 118 HomeView.tsx) — static, no onClick
<button className="...">
  <Bell className="h-4 w-4" />
  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
</button>

// After — live count, opens drawer
<button
  onClick={onOpenNotifications}
  className="relative p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
>
  <Bell className="h-4 w-4 text-slate-600 dark:text-slate-300" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  )}
</button>
```

#### 3c — Add a Notification Drawer component

```tsx
// src/components/NotificationDrawer.tsx
export default function NotificationDrawer({ notifications, onClose, onMarkAllRead, onNavigate }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 z-50 flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
          Notifications
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={onMarkAllRead} className="text-[10px] text-indigo-600 font-bold uppercase">
            Mark all read
          </button>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm font-medium">
            No notifications yet
          </div>
        ) : notifications.map(n => (
          <div
            key={n.id}
            onClick={() => { onNavigate(n); onClose(); }}
            className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${!n.read ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}
          >
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{n.title}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{n.body}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              {formatDistanceToNow(new Date(n.timestamp))} ago
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
```

#### 3d — Mark notifications as read on open

```typescript
// App.tsx
const handleMarkAllRead = async () => {
  if (!userProfile) return;
  const batch = writeBatch(firestoreDb);
  notifications
    .filter(n => !n.read)
    .forEach(n => {
      batch.update(doc(firestoreDb, "notifications", userProfile.id, "items", n.id), { read: true });
    });
  await batch.commit();
};
```

### Commit
```
feat(ui): wire Bell icon to live Firestore notification drawer

Replaces the static Bell decoration with a live unread counter badge driven
by the Firestore onSnapshot notifications listener. Adds NotificationDrawer
component that slides in from the right, shows all notifications with
relative timestamps, and marks them as read on open via a Firestore batch
write. Navigating to a notification's linked issue or campaign closes the
drawer and scrolls to the relevant item.

Closes #17
```

---

## Milestone Checklist

- [ ] `loadAllData()` removed from `App.tsx`
- [ ] Four `onSnapshot` listeners active: issues, campaigns, profile, notifications
- [ ] `sendNotification()` helper added to `server.ts`
- [ ] Notifications fired on: issue status change, campaign resolution, vote milestone
- [ ] `notifications/{userId}/items` Firestore subcollection rule deployed
- [ ] Bell icon shows live `unreadCount` badge
- [ ] `NotificationDrawer` component created and rendered in `App.tsx`
- [ ] "Mark all read" batch write implemented
- [ ] Drawer navigates to linked issue/campaign on tap
