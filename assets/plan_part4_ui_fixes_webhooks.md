# IndiaCivic – Implementation Plan: Part 4
# UI Fixes, Dead Buttons & Webhook Security

> **Resolves:** #6 · #8 · #20 · #21 · #23  
> **Priority:** P1  
> **Goal:** Fix every broken/dead UI element with real computed data. Secure the WhatsApp webhook. Remove developer sandbox controls from production UI.

---

## Step 1 — Compute Home Screen Stats Dynamically

### File changed: `src/components/HomeView.tsx`

Replace all hardcoded placeholder values with computed ones from live `issues` prop:

```typescript
// Compute all stats from real issue data
const wardIssues = issues.filter(i =>
  i.ward === currentWardName || i.ward?.includes("Ward 88")
);
const openWardIssues = wardIssues.filter(i => i.status !== "RESOLVED");
const resolvedWardIssues = wardIssues.filter(i => i.status === "RESOLVED");

// Locality Life Score: weighted from resolution rate, avg severity, issue count
const resolutionRate = wardIssues.length > 0
  ? resolvedWardIssues.length / wardIssues.length : 1;
const avgSeverity = wardIssues.length > 0
  ? wardIssues.reduce((s, i) => s + i.severity, 0) / wardIssues.length : 0;
const severityPenalty = Math.max(0, (avgSeverity - 2) * 10);
const rawScore = Math.round(resolutionRate * 100 - severityPenalty - openWardIssues.length * 2);
const localityScore = Math.max(0, Math.min(100, rawScore));

const getLetterGrade = (score: number) =>
  score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B+"
  : score >= 60 ? "B" : score >= 50 ? "C+" : "C";

// Relative timestamp
const timeAgo = (timestamp: string) => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};
```

Replace hardcoded JSX with computed values:
```tsx
// Before: <span>B+</span>
<span className="text-4xl font-extrabold">{getLetterGrade(localityScore)}</span>

// Before: <p>Based on 92% resolution speed...</p>
<p>Based on {Math.round(resolutionRate * 100)}% resolution rate and {openWardIssues.length} open issues.</p>

// Before: <div>3 Ward Reports</div>
<div>{openWardIssues.length} Open in {currentWardName || "Your Ward"}</div>

// Before: <div>w-[72%]</div>
<div style={{ width: `${localityScore}%` }} className="h-full bg-gradient-to-r ..." />

// Issue card timestamps — replace toLocaleTimeString with relative:
<span>{timeAgo(issue.timestamp)}</span>
```

### Commit
```
fix(ui): replace hardcoded home screen stats with computed real-time values

Locality Life Score is now computed from actual ward issue resolution rates
and severity averages. Active Issues count pulls from live issues filtered
by current ward. Progress bar width reflects the real computed score. Issue
card timestamps now show relative time ("2h ago") instead of bare clock time.
All calculations update automatically when the Firestore onSnapshot listener
pushes new data.

Closes #20
```

---

## Step 2 — Fix All Dead Buttons

### Files changed: `src/components/ProfileView.tsx`, `src/components/HomeView.tsx`

#### 2a — "VIEW ALL" button in HomeView.tsx

```tsx
// Before: no onClick
<button className="...">VIEW ALL</button>

// After: navigates to maps with no filter
<button onClick={() => onNavigateToTab("maps")} className="...">
  VIEW ALL <ChevronRight className="h-3.5 w-3.5" />
</button>
```

#### 2b — Advanced Filter drawer for SlidersHorizontal

Wire the filter button to open a filter drawer:
```tsx
<button onClick={() => setShowFilterDrawer(true)} className="absolute right-3 ...">
  <SlidersHorizontal className="h-4 w-4" />
</button>

{showFilterDrawer && (
  <div className="absolute top-12 right-0 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 z-20 space-y-4">
    <div>
      <label className="text-[10px] font-black uppercase text-slate-400">Status</label>
      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="...">
        <option value="all">All Statuses</option>
        <option value="PENDING">Pending</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="RESOLVED">Resolved</option>
      </select>
    </div>
    <div>
      <label className="text-[10px] font-black uppercase text-slate-400">Severity</label>
      <input type="range" min={1} max={5} value={severityMin}
        onChange={e => setSeverityMin(+e.target.value)} />
      <span>{severityMin}+ severity</span>
    </div>
    <button onClick={() => setShowFilterDrawer(false)} className="w-full ...">Apply Filters</button>
  </div>
)}
```

Apply these filters to `filteredIssues`:
```typescript
const filteredIssues = issues.filter(issue => {
  const matchesSearch = ...;
  const matchesCategory = selectedCategory === "All" || issue.category === selectedCategory;
  const matchesStatus = statusFilter === "all" || issue.status === statusFilter;
  const matchesSeverity = issue.severity >= severityMin;
  return matchesSearch && matchesCategory && matchesStatus && matchesSeverity;
});
```

#### 2c — ESG Certificate Download (ProfileView.tsx)

Generate a real downloadable PDF certificate using `jspdf`:
```typescript
import jsPDF from "jspdf";

const handleDownloadESGCertificate = () => {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, 297, 210, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.text("ESG IMPACT CERTIFICATE", 148, 50, { align: "center" });
  pdf.setFontSize(14);
  pdf.text(`Issued to: ${user.name}`, 148, 80, { align: "center" });
  pdf.text(`Carbon Credits: ${user.carbonCredits?.toLocaleString()} C`, 148, 100, { align: "center" });
  pdf.text(`Campaigns Resolved: ${user.contributionCount}`, 148, 115, { align: "center" });
  pdf.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, 148, 130, { align: "center" });
  pdf.text("Verified by IndiaCivic Platform — CIN: U74999KA2026OPC000001", 148, 160, { align: "center" });
  pdf.save(`IndiaCivic_ESG_Certificate_${user.name}.pdf`);
};

// Wire the button:
<button onClick={handleDownloadESGCertificate} className="... cursor-pointer ...">
  <Download className="h-4 w-4" />
  <span>Download Verified ESG Audit Certificate</span>
</button>
```

#### 2d — WhatsApp Share (ProfileView.tsx)

Use the Web Share API to actually share the impact card:
```typescript
const handleShareImpactCard = async () => {
  const shareText = `🏆 I'm making Indiranagar better!\n\n` +
    `📍 ${user.location || "My Ward"}\n` +
    `⚡ ${user.totalPoints.toLocaleString()} Civic XP\n` +
    `🤝 ${user.citizensHelped.toLocaleString()} neighbors helped\n` +
    `🔥 ${user.streakDays} day streak\n\n` +
    `Join me on IndiaCivic: https://indiacivic.app`;

  if (navigator.share) {
    await navigator.share({ title: "My IndiaCivic Impact", text: shareText });
  } else {
    // Fallback: copy to clipboard + open WhatsApp web
    await navigator.clipboard.writeText(shareText);
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  }
  setShowShareModal(false);
};

// Wire the button:
<button onClick={handleShareImpactCard} className="...">
  Download & Share on WhatsApp
</button>
```

#### 2e — Compute "Top X% Ward Rank" from real leaderboard data

```typescript
// In ProfileView.tsx, after leaderboard is built:
const userRankInWard = finalLeaderboards.ward.findIndex(e => e.isUser) + 1;
const totalWardPlayers = finalLeaderboards.ward.length;
const percentile = totalWardPlayers > 0
  ? Math.round((1 - userRankInWard / totalWardPlayers) * 100) : 0;

// Replace hardcoded badge:
<span>Top {percentile}% Ward Rank</span>
```

### Commit
```
fix(ui): wire all dead buttons with real functionality

VIEW ALL navigates to maps tab. SlidersHorizontal opens a real filter drawer
with status and severity range inputs that apply to the issue feed. ESG
Certificate Download generates a real jsPDF certificate with user data.
WhatsApp Share uses the Web Share API with a real formatted impact text,
falling back to clipboard + wa.me on unsupported browsers. Ward Rank badge
computes actual percentile from the real leaderboard data.

Closes #21
```

---

## Step 3 — Fix Broken Map Filters

### File changed: `src/components/MapsView.tsx`

#### 3a — Apply filters to real Google Maps markers

```typescript
// After creating each AdvancedMarker, apply visibility filter:
const markerVisible = (issue: Issue) => {
  const matchesSeverity =
    severityFilter === "all" ||
    (severityFilter === "high" && issue.severity >= 4) ||
    (severityFilter === "med" && issue.severity === 3) ||
    (severityFilter === "low" && issue.severity <= 2);

  const matchesStatus = statusFilter === "all" || issue.status === statusFilter;

  const matchesCategory =
    categoryFilter === "all" ||
    (categoryFilter === "garbage" && issue.category.includes("Waste")) ||
    (categoryFilter === "water" && issue.category.includes("Drainage")) ||
    (categoryFilter === "streetlight" && issue.category.includes("Lighting")) ||
    (categoryFilter === "assets" && issue.category.includes("Assets"));

  const matchesCity = getIssueState(issue) === activeCity.charAt(0).toUpperCase() + activeCity.slice(1)
    || activeCity === "bengaluru" && getIssueState(issue) === "Karnataka";

  return matchesSeverity && matchesStatus && matchesCategory && matchesCity;
};

// In the AdvancedMarker rendering loop:
{displayMode === "reports" && filteredClusters.map(cluster =>
  <AdvancedMarker
    key={cluster.id}
    position={{ lat: cluster.lat, lng: cluster.lng }}
    style={{ display: markerVisible(cluster) ? "block" : "none" }}
  />
)}
```

#### 3b — Sync city switcher to filter the issue list panel

```typescript
// The right-hand issue list panel currently shows ALL issues regardless of city
// Filter by detected state:
const cityFilteredIssues = useMemo(() =>
  issues.filter(i => {
    const state = getIssueState(i);
    if (activeCity === "bengaluru") return state === "Karnataka";
    if (activeCity === "mumbai") return state === "Maharashtra";
    if (activeCity === "delhi") return state === "Delhi";
    return true;
  }), [issues, activeCity]);
```

#### 3c — Default state filter to user's own state

```typescript
// Instead of selecting all 32 states, derive from userProfile location:
const getUserState = () => {
  const loc = (userProfile?.location || "").toLowerCase();
  if (loc.includes("bengaluru") || loc.includes("karnataka")) return "Karnataka";
  if (loc.includes("mumbai") || loc.includes("maharashtra")) return "Maharashtra";
  if (loc.includes("delhi")) return "Delhi";
  return "Karnataka"; // default
};

const [selectedStates, setSelectedStates] = useState<string[]>([getUserState()]);
```

#### 3d — Compute sector prediction scores from real issue data

```typescript
// Build sector scores dynamically from issues array:
const computeSectorScores = useMemo(() => {
  const sectorMap: Record<string, { total: number; resolved: number; severitySum: number }> = {};

  issues.forEach(issue => {
    const sector = issue.virtualAssetId || "sector-unknown";
    if (!sectorMap[sector]) sectorMap[sector] = { total: 0, resolved: 0, severitySum: 0 };
    sectorMap[sector].total += 1;
    if (issue.status === "RESOLVED") sectorMap[sector].resolved += 1;
    sectorMap[sector].severitySum += issue.severity;
  });

  return Object.fromEntries(
    Object.entries(sectorMap).map(([k, v]) => {
      const resRate = v.total > 0 ? v.resolved / v.total : 1;
      const avgSev = v.total > 0 ? v.severitySum / v.total : 0;
      const score = Math.round(resRate * 100 - (avgSev - 2) * 5);
      return [k, {
        score: Math.max(0, Math.min(100, score)),
        status: score >= 75 ? "Excellent" : score >= 50 ? "Average" : "Struggling",
        activeIssues: v.total - v.resolved,
      }];
    })
  );
}, [issues]);
```

### Commit
```
fix(map): apply filters to Google Maps markers, sync city switcher, compute sector scores from real data

Severity, status, and category filters now control AdvancedMarker visibility
on the real Google Maps layer (not just the SVG fallback). City switcher
filters the right-panel issue list using getIssueState(). State dropdown
defaults to the user's detected state instead of selecting all 32. Sector
prediction scores are computed from actual Firestore issue data instead of
static preset objects.

Closes #23
```

---

## Step 4 — Remove "Simulate 90 Days" from Production UI + Secure Webhook

### Files changed: `src/components/CampaignsView.tsx`, `server.ts`

#### 4a — Gate simulate button behind dev environment flag

```tsx
// CampaignsView.tsx — only show in development
{import.meta.env.DEV && (
  <div className="border-2 border-dashed border-amber-400 rounded-xl p-3 bg-amber-50 dark:bg-amber-950/20">
    <p className="text-[10px] font-black text-amber-700 uppercase mb-2">
      ⚠️ DEV ONLY — Not visible in production
    </p>
    <button onClick={() => handleSimulateRefund(selectedCampaign.id)}>
      Simulate 90 Days Elapsing
    </button>
  </div>
)}
```

#### 4b — Secure the WhatsApp webhook with HMAC signature

```typescript
// server.ts
import crypto from "crypto";

const WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET!;

function verifyWebhookSignature(req: Request): boolean {
  const sig = req.headers["x-webhook-signature"] as string;
  if (!sig) return false;
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(`sha256=${expected}`));
}

app.post("/webhook/whatsapp-trigger", express.json(), (req, res) => {
  if (!verifyWebhookSignature(req)) {
    logger.warn("Rejected webhook — invalid signature", { ip: req.ip });
    return res.status(401).json({ error: "Unauthorized" });
  }
  // ... rest of handler
});
```

Also add express-rate-limit:
```typescript
import rateLimit from "express-rate-limit";
const webhookLimiter = rateLimit({ windowMs: 60 * 1000, max: 100 });
app.use("/webhook/whatsapp-trigger", webhookLimiter);
```

### Commit
```
fix(security,ui): gate simulate button behind DEV flag, add HMAC webhook auth

The "Simulate 90 Days Elapsing" button is now hidden in production builds
using import.meta.env.DEV and wrapped in an amber dashed dev-only warning
box in development. The /webhook/whatsapp-trigger endpoint now validates
an X-Webhook-Signature HMAC header against WHATSAPP_WEBHOOK_SECRET before
processing any payload. Adds express-rate-limit (100 req/min) on the webhook
route.

Closes #6
Closes #8
```

---

## Milestone Checklist

- [ ] `getLetterGrade()` + `localityScore` computed from real issues
- [ ] All ward stats in `HomeView.tsx` compute from `issues` prop
- [ ] Relative timestamps ("2h ago") on issue cards
- [ ] "VIEW ALL" button navigates to Maps tab
- [ ] Filter drawer opens from SlidersHorizontal button
- [ ] `jspdf` installed, ESG certificate generates real PDF
- [ ] WhatsApp Share uses `navigator.share()` API
- [ ] Ward rank percentile computed from leaderboard data
- [ ] Map severity/status/category filters applied to `AdvancedMarker` visibility
- [ ] City switcher filters the issue list panel
- [ ] Sector scores computed from real issue data
- [ ] `import.meta.env.DEV` guard on Simulate button
- [ ] HMAC signature check on WhatsApp webhook
- [ ] `express-rate-limit` installed and applied
