/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { Issue, Campaign, UserProfile, Donation, Comment } from "./src/types";

// Firebase Imports
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";

dotenv.config();

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), "data.json");

app.use(express.json({ limit: "50mb" }));

// Initialize Firebase SDK with provisioned credentials
const firebaseConfig = {
  apiKey: "AIzaSyAIWlQukqBMlAFrl2iTOhitGgN7knW3SR8",
  authDomain: "gen-lang-client-0565114419.firebaseapp.com",
  projectId: "gen-lang-client-0565114419",
  storageBucket: "gen-lang-client-0565114419.firebasestorage.app",
  messagingSenderId: "811492221296",
  appId: "1:811492221296:web:a37636d87820368ec06fb5"
};

const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp, "ai-studio-84612a05-8b9c-463f-8c53-e514de638c29");


// --------------------------------------------------------
// Initialize Database and Seed Data
// --------------------------------------------------------
const DEFAULT_USER: UserProfile = {
  id: "user-rahul-sharma",
  name: "Rahul Sharma",
  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
  location: "Indiranagar, Bengaluru",
  role: "CITIZEN",
  civicScore: 740,
  totalPoints: 1850,
  personalActiveScore: 85,
  contributionCount: 42,
  citizensHelped: 1240,
  totalDonations: 6500,
  pointsBreakdown: {
    reporting: 850,
    verifying: 600,
    donating: 400,
  },
  badges: ["First Responder", "Verified Eye", "Streak Champion", "Safety Auditor", "Top Donor"],
  streakDays: 14,
  availableFunds: 2500, // Pre-seeded reinvestable wallet balance (e.g. from a past refunded campaign or manual top-up)
};

const DEFAULT_ORG: UserProfile = {
  id: "org-green-ward",
  name: "Green Ward Foundation",
  avatar: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=150&q=80",
  location: "North Bengaluru, Ward 42",
  role: "ORGANIZATION",
  civicScore: 920,
  totalPoints: 8500,
  personalActiveScore: 95,
  contributionCount: 156,
  citizensHelped: 12450,
  totalDonations: 45000,
  pointsBreakdown: {
    reporting: 3500,
    verifying: 2000,
    donating: 3000,
  },
  badges: ["Eco Guardian", "Ward Adoptive Leader", "Gold ESG Rating", "CSR Platinum Partner"],
  streakDays: 28,
  adoptedWards: ["Ward 42, North Zone", "Ward 18, Central", "Ward 05, East Zone"],
  carbonCredits: 12450,
  availableFunds: 15000,
};

const INITIAL_ISSUES: Issue[] = [
  {
    id: "issue-8492",
    trackingId: "#IC-8492",
    category: "Drainage & Waterlogging",
    title: "Broken Water Pipeline Leakage",
    description: "Main water pipeline has ruptured near the intersection, causing extensive waterlogging. Thousands of liters of drinking water are being wasted hourly, flooding the sidewalk.",
    locationName: "Main St. & 4th Ave, Indiranagar, Bengaluru",
    latitude: 12.9719,
    longitude: 77.6412,
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
    status: "PENDING",
    severity: 4,
    imageUrl: "https://images.unsplash.com/photo-1542060748-10c28b629f6f?auto=format&fit=crop&w=600&q=80",
    isAnonymous: true,
    reporterName: "Anonymous Citizen",
    virtualAssetId: "V-ASSET-0927",
    upvotes: 42,
    agreeVotes: 38,
    disagreeVotes: 2,
    votedUserIds: [],
    evidenceLinks: ["https://instagram.com/reel/C8_pothole_leak_sample"],
    corroborations: [
      {
        id: "corr-1",
        author: "Citizen_X",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        text: "Walked past this an hour ago. It's getting worse, flooding the entire sidewalk.",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80"
      },
      {
        id: "corr-2",
        author: "LocalShop",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        text: "Water pressure in our building dropped because of this. BBMP needs to fix it ASAP.",
        avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=80&q=80"
      }
    ],
    ward: "Ward 88 - Indiranagar",
    department: "Bangalore Water Supply and Sewerage Board (BWSSB)",
    representative: "Corporator Suresh Kumar",
  },
  {
    id: "issue-8491",
    trackingId: "#IC-8491",
    category: "Waste Management",
    title: "Overflowing Garbage Bin & Littering",
    description: "Large municipal green trash bin is completely overflowing on 100ft Road. Street dogs and cows are scattering garbage across the roadway, generating a severe stench and blocking pedestrian passage.",
    locationName: "100ft Road, near Metro Station, Indiranagar, Bengaluru",
    latitude: 12.9756,
    longitude: 77.6411,
    timestamp: new Date(Date.now() - 4 * 3600000).toISOString(), // 4 hours ago
    status: "PENDING",
    severity: 5,
    imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80",
    isAnonymous: false,
    reporterName: "Rahul Sharma",
    virtualAssetId: "V-ASSET-0442",
    upvotes: 78,
    agreeVotes: 72,
    disagreeVotes: 1,
    votedUserIds: ["user-rahul-sharma"],
    evidenceLinks: [],
    corroborations: [
      {
        id: "corr-3",
        author: "Kiran_K",
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
        text: "The smell is unbearable. Shops next to it are struggling to operate.",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80"
      }
    ],
    ward: "Ward 88 - Indiranagar",
    department: "Bruhat Bengaluru Mahanagara Palike (BBMP) - Solid Waste Management",
    representative: "Corporator Suresh Kumar",
  },
  {
    id: "issue-8490",
    trackingId: "#IC-8490",
    category: "Broken Public Assets",
    title: "Broken Streetlight on 12th Main",
    description: "Entire pole's LED light is dead. This stretch becomes pitch dark after 6:30 PM, creating safety concerns for women and pedestrians returning from work.",
    locationName: "12th Main Road, Corner, Indiranagar, Bengaluru",
    latitude: 12.9732,
    longitude: 77.6398,
    timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), // yesterday
    status: "IN_PROGRESS",
    severity: 3,
    imageUrl: "https://images.unsplash.com/photo-1509024644558-2f56ce76c490?auto=format&fit=crop&w=600&q=80",
    isAnonymous: false,
    reporterName: "Ananya Iyer",
    virtualAssetId: "V-ASSET-0238",
    upvotes: 15,
    agreeVotes: 14,
    disagreeVotes: 0,
    votedUserIds: [],
    evidenceLinks: [],
    corroborations: [],
    ward: "Ward 88 - Indiranagar",
    department: "Bangalore Electricity Supply Company (BESCOM)",
    representative: "Engineer Anjali Hegde",
  },
  {
    id: "issue-mumbai-1",
    trackingId: "#IC-M101",
    category: "Waste Management",
    title: "Plastic litter pile on Carter Road beach",
    description: "Tons of non-biodegradable plastic wrappers, bottles, and general household trash washed ashore on Carter Road Promenade beach near the public viewing area.",
    locationName: "Carter Road Promenade, Bandra West, Mumbai",
    latitude: 19.0680,
    longitude: 72.8220,
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
    status: "PENDING",
    severity: 4,
    imageUrl: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=600&q=80",
    isAnonymous: false,
    reporterName: "Priya Salve",
    virtualAssetId: "V-ASSET-M101",
    upvotes: 45,
    agreeVotes: 41,
    disagreeVotes: 1,
    votedUserIds: [],
    evidenceLinks: [],
    corroborations: [],
    ward: "Ward H-West - Bandra",
    department: "Municipal Corporation of Greater Mumbai (MCGM) - Solid Waste Management",
    representative: "Assistant Commissioner Vinayak Vispute"
  },
  {
    id: "issue-mumbai-2",
    trackingId: "#IC-M102",
    category: "Broken Public Assets",
    title: "Dangerous potholes sequence on Linking Road",
    description: "Series of deep potholes right at the center of the road, causing severe bike accidents and massive traffic bottlenecks during peak hours.",
    locationName: "Linking Road, near National College, Bandra West, Mumbai",
    latitude: 19.0720,
    longitude: 72.8350,
    timestamp: new Date(Date.now() - 10 * 3600000).toISOString(),
    status: "IN_PROGRESS",
    severity: 5,
    imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80",
    isAnonymous: true,
    reporterName: "Anonymous Citizen",
    virtualAssetId: "V-ASSET-M102",
    upvotes: 82,
    agreeVotes: 79,
    disagreeVotes: 0,
    votedUserIds: [],
    evidenceLinks: [],
    corroborations: [],
    ward: "Ward H-West - Bandra",
    department: "MCGM - Roads & Traffic Department",
    representative: "Engineer Anil Shinde"
  },
  {
    id: "issue-delhi-1",
    trackingId: "#IC-D201",
    category: "Waste Management",
    title: "Litter piling in Connaught Place outer circle",
    description: "Garbage and promotional flyers piling up extensively near the heritage columns and main pedestrian crossings. Stench is unbearable for shoppers.",
    locationName: "Connaught Place Outer Circle, New Delhi",
    latitude: 28.6350,
    longitude: 77.2150,
    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
    status: "PENDING",
    severity: 4,
    imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80",
    isAnonymous: false,
    reporterName: "Amit Mishra",
    virtualAssetId: "V-ASSET-D201",
    upvotes: 33,
    agreeVotes: 30,
    disagreeVotes: 0,
    votedUserIds: [],
    evidenceLinks: [],
    corroborations: [],
    ward: "NDMC - Ward 1 (Connaught Place)",
    department: "New Delhi Municipal Council (NDMC) - Sanitation Dept",
    representative: "Officer Satish Sharma"
  },
  {
    id: "issue-delhi-2",
    trackingId: "#IC-D202",
    category: "Broken Public Assets",
    title: "Dark streetlights sequence on Janpath Road",
    description: "A series of 5 heritage streetlight poles are completely out near the market entrance. The area becomes unsafe for women and tourists at night.",
    locationName: "Janpath Road, near Market Gate 2, Connaught Place, New Delhi",
    latitude: 28.6380,
    longitude: 77.2280,
    timestamp: new Date(Date.now() - 15 * 3600000).toISOString(),
    status: "PENDING",
    severity: 3,
    imageUrl: "https://images.unsplash.com/photo-1509024644558-2f56ce76c490?auto=format&fit=crop&w=600&q=80",
    isAnonymous: false,
    reporterName: "Neha Aggarwal",
    virtualAssetId: "V-ASSET-D202",
    upvotes: 56,
    agreeVotes: 52,
    disagreeVotes: 1,
    votedUserIds: [],
    evidenceLinks: [],
    corroborations: [],
    ward: "NDMC - Ward 1 (Connaught Place)",
    department: "NDMC - Electricity Department",
    representative: "Assistant Engineer V.K. Singh"
  }
];

const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: "camp-1",
    title: "Fixing the Pot-holes on MG Road Junction",
    description: "The main MG Road crossing has developed multiple deep, hazardous potholes. After two vehicle accidents last week, we are crowdfunding material and hiring local contractors to resolve this immediately, with certified before/after proof.",
    targetAmount: 50000,
    currentAmount: 32450,
    escrowBalance: 32450,
    status: "FUNDRAISING",
    createdAt: new Date(Date.now() - 15 * 24 * 3600000).toISOString(), // 15 days ago
    daysLeft: 75, // 90 days - 15 days
    linkedIssueIds: ["issue-8492"],
    verificationStep: 1,
    donations: [
      {
        id: "don-1",
        campaignId: "camp-1",
        campaignName: "Fixing the Pot-holes on MG Road Junction",
        donorName: "Amit Patel",
        donorId: "user-dummy-amit",
        amount: 5000,
        timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
        receiptNumber: "GST-2026-00104",
        gstin: "29AAAAA0000A1Z1",
      },
      {
        id: "don-2",
        campaignId: "camp-1",
        campaignName: "Fixing the Pot-holes on MG Road Junction",
        donorName: "Siddharth Sen",
        donorId: "user-dummy-sid",
        amount: 1000,
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
        receiptNumber: "GST-2026-00105",
        gstin: "29AAAAA0000A1Z1",
      },
      {
        id: "don-3",
        campaignId: "camp-1",
        campaignName: "Fixing the Pot-holes on MG Road Junction",
        donorName: "Meera Nair",
        donorId: "user-dummy-meera",
        amount: 500,
        timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
        receiptNumber: "GST-2026-00103",
        gstin: "29AAAAA0000A1Z1",
      }
    ],
    votesAgree: 0,
    votesDisagree: 0,
    voters: []
  },
  {
    id: "camp-2",
    title: "Restore Indiranagar Local Park Lighting",
    description: "The local children's park has had completely dead electrical systems for weeks, rendering it unusable and hazardous at night. Crowdfunding to buy 6 commercial solar LED light assemblies.",
    targetAmount: 20000,
    currentAmount: 20000,
    escrowBalance: 20000,
    status: "EXECUTION",
    createdAt: new Date(Date.now() - 85 * 24 * 3600000).toISOString(), // 85 days ago (timer close to 90 days for testing refunds!)
    daysLeft: 5,
    linkedIssueIds: ["issue-8490"],
    verificationStep: 2,
    donations: [
      {
        id: "don-4",
        campaignId: "camp-2",
        campaignName: "Restore Indiranagar Local Park Lighting",
        donorName: "Rahul Sharma",
        donorId: "user-rahul-sharma",
        amount: 2500,
        timestamp: new Date(Date.now() - 80 * 24 * 3600000).toISOString(),
        receiptNumber: "GST-2026-00084",
        gstin: "29AAAAA0000A1Z1",
      }
    ],
    votesAgree: 0,
    votesDisagree: 0,
    voters: []
  }
];

interface DbSchema {
  issues: Issue[];
  campaigns: Campaign[];
  activeUserProfile: UserProfile;
  citizenProfile: UserProfile;
  orgProfile: UserProfile;
}

function loadDatabase(): DbSchema {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error loading database, resetting...", err);
  }

  // Write default seed database
  const db: DbSchema = {
    issues: INITIAL_ISSUES,
    campaigns: INITIAL_CAMPAIGNS,
    activeUserProfile: DEFAULT_USER,
    citizenProfile: DEFAULT_USER,
    orgProfile: DEFAULT_ORG,
  };
  saveDatabase(db);
  return db;
}

async function syncFromFirestore() {
  try {
    console.log("Connecting to Firestore actual database...");
    
    // Check if issues collection exists and has documents
    const issuesRef = collection(firestore, "issues");
    const issuesSnap = await getDocs(issuesRef);
    
    const campaignsRef = collection(firestore, "campaigns");
    const campaignsSnap = await getDocs(campaignsRef);
    
    const profilesRef = collection(firestore, "profiles");
    const activeUserDoc = await getDoc(doc(profilesRef, "activeUserProfile"));
    const citizenDoc = await getDoc(doc(profilesRef, "citizenProfile"));
    const orgDoc = await getDoc(doc(profilesRef, "orgProfile"));

    if (!issuesSnap.empty || !campaignsSnap.empty || activeUserDoc.exists()) {
      console.log("Found existing data in Firestore. Loading into local cache...");
      const issuesList: Issue[] = [];
      issuesSnap.forEach((d) => {
        issuesList.push(d.data() as Issue);
      });

      // If we don't have Mumbai or Delhi issues in the loaded list, let's insert them to enrich the database!
      const hasMumbaiOrDelhi = issuesList.some(i => i.id.startsWith("issue-mumbai-") || i.id.startsWith("issue-delhi-"));
      if (!hasMumbaiOrDelhi) {
        console.log("Enriching Firestore with Mumbai and Delhi seed issues...");
        const extraIssues = INITIAL_ISSUES.filter(i => i.id.startsWith("issue-mumbai-") || i.id.startsWith("issue-delhi-"));
        for (const iss of extraIssues) {
          await setDoc(doc(firestore, "issues", iss.id), iss);
          issuesList.push(iss);
        }
      }

      issuesList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const campaignsList: Campaign[] = [];
      campaignsSnap.forEach((d) => {
        campaignsList.push(d.data() as Campaign);
      });
      campaignsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const activeUserProfile = activeUserDoc.exists() ? (activeUserDoc.data() as UserProfile) : DEFAULT_USER;
      const citizenProfile = citizenDoc.exists() ? (citizenDoc.data() as UserProfile) : DEFAULT_USER;
      const orgProfile = orgDoc.exists() ? (orgDoc.data() as UserProfile) : DEFAULT_ORG;

      const loadedDb: DbSchema = {
        issues: issuesList,
        campaigns: campaignsList,
        activeUserProfile,
        citizenProfile,
        orgProfile,
      };

      fs.writeFileSync(DATA_FILE, JSON.stringify(loadedDb, null, 2), "utf-8");
      db = loadedDb;
      console.log("Local cache synchronized with Firestore successfully!");
    } else {
      console.log("Firestore database is empty. Seeding initial data to Firestore...");
      const initialDb: DbSchema = {
        issues: INITIAL_ISSUES,
        campaigns: INITIAL_CAMPAIGNS,
        activeUserProfile: DEFAULT_USER,
        citizenProfile: DEFAULT_USER,
        orgProfile: DEFAULT_ORG,
      };
      await syncToFirestore(initialDb);
    }
  } catch (err) {
    console.error("Error during Firestore syncFromFirestore:", err);
  }
}

async function syncToFirestore(targetDb: DbSchema) {
  try {
    for (const issue of targetDb.issues) {
      await setDoc(doc(firestore, "issues", issue.id), issue);
    }
    for (const campaign of targetDb.campaigns) {
      await setDoc(doc(firestore, "campaigns", campaign.id), campaign);
    }
    await setDoc(doc(firestore, "profiles", "activeUserProfile"), targetDb.activeUserProfile);
    await setDoc(doc(firestore, "profiles", "citizenProfile"), targetDb.citizenProfile);
    await setDoc(doc(firestore, "profiles", "orgProfile"), targetDb.orgProfile);
    console.log("Firestore actual database updated successfully.");
  } catch (err) {
    console.error("Error during Firestore syncToFirestore:", err);
  }
}

function saveDatabase(targetDb: DbSchema) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(targetDb, null, 2), "utf-8");
    // Sync with Firestore actual database in background
    syncToFirestore(targetDb).catch(err => {
      console.error("Background Firestore sync failed:", err);
    });
  } catch (err) {
    console.error("Error writing to database:", err);
  }
}

// Ensure database is bootstrapped
let db = loadDatabase();

// Sync from Firestore actual database
syncFromFirestore();

// --------------------------------------------------------
// Express Router API Endpoints
// --------------------------------------------------------

// Fetch all reported issues
app.get("/api/issues", (req, res) => {
  db = loadDatabase();
  res.json(db.issues);
});

// Create a new issue (with geo-clustering and optional Gemini AI analysis)
app.post("/api/issues", (req, res) => {
  db = loadDatabase();
  const {
    category,
    title,
    description,
    locationName,
    latitude,
    longitude,
    imageUrl,
    videoUrl,
    isAnonymous,
    evidenceLinks,
    aiAnalyzed, // Client can pass pre-analyzed metadata if they did it via client trigger
  } = req.body;

  const user = db.activeUserProfile;
  const isGuest = !user || user.id === "guest";

  const issueId = "issue-" + Math.floor(Math.random() * 90000 + 10000);
  const trackingId = "#IC-" + Math.floor(Math.random() * 9000 + 1000);

  // Geo-clustering & Deduplication logic:
  // Find nearby issues in the same category within ~20 meters (~0.0002 decimal degrees)
  const proximityThreshold = 0.0002;
  const matchingNearbyIssue = db.issues.find(
    (existing) =>
      existing.category.toLowerCase() === category.toLowerCase() &&
      Math.abs(existing.latitude - latitude) < proximityThreshold &&
      Math.abs(existing.longitude - longitude) < proximityThreshold
  );

  let virtualAssetId = "V-ASSET-" + Math.floor(Math.random() * 9000 + 1000);
  if (matchingNearbyIssue) {
    virtualAssetId = matchingNearbyIssue.virtualAssetId;
    console.log(`Deduplication: Merged into existing Virtual Asset ID ${virtualAssetId}`);
  }

  // Predefined departments/reps for robust fallback
  const fallbackRoutingMap: Record<string, { dept: string; rep: string }> = {
    "Waste Management": {
      dept: "Bruhat Bengaluru Mahanagara Palike (BBMP) - Solid Waste Department",
      rep: "Corporator Suresh Kumar (Ward 88)",
    },
    "Drainage & Waterlogging": {
      dept: "Bangalore Water Supply and Sewerage Board (BWSSB)",
      rep: "Assistant Engineer Anand Rao",
    },
    "Mosquito Infestation & Waterlogging": {
      dept: "BBMP - Health & Sanitation Wing",
      rep: "Dr. Sandeep Murthy (Zonal Officer)",
    },
    "Broken Public Assets": {
      dept: "Bangalore Electricity Supply Company (BESCOM)",
      rep: "Engineer Anjali Hegde",
    },
    "Night Lighting & Women's Safety": {
      dept: "Indiranagar Ward Police Division / BESCOM Streetlights",
      rep: "Inspector Patil",
    },
    "AQI & Pollution": {
      dept: "Karnataka State Pollution Control Board (KSPCB)",
      rep: "Officer H.S. Swamy",
    },
    "Traffic Signal Violations & Accident Reporting": {
      dept: "Bengaluru Traffic Police (BTP) - Indiranagar Station",
      rep: "SI Raghavendra",
    },
    "Theft & Safety Incidents": {
      dept: "Indiranagar Police Station (Law & Order)",
      rep: "Inspector Patil",
    },
    "Threats & Anti-social Threats": {
      dept: "Indiranagar Police Station - Cyber & Crime Cells",
      rep: "Inspector Patil",
    }
  };

  const routeInfo = fallbackRoutingMap[category] || {
    dept: "Municipal Administration Division",
    rep: "Ward Nodal Officer",
  };

  const newIssue: Issue = {
    id: issueId,
    trackingId,
    category,
    title: title || `${category} issue near ${locationName}`,
    description: description || `Reported ${category} issue.`,
    locationName: locationName || "Indiranagar, Bengaluru",
    latitude: latitude || 12.9719,
    longitude: longitude || 77.6412,
    timestamp: new Date().toISOString(),
    status: "PENDING",
    severity: aiAnalyzed?.severity || 3,
    imageUrl: imageUrl || undefined,
    videoUrl: videoUrl || undefined,
    isAnonymous: !!isAnonymous,
    reporterName: isAnonymous ? "Anonymous Citizen" : (isGuest ? "Guest Citizen" : user.name),
    virtualAssetId,
    upvotes: 1,
    agreeVotes: 1,
    disagreeVotes: 0,
    votedUserIds: isGuest ? [] : [user.id],
    evidenceLinks: evidenceLinks || [],
    corroborations: [],
    ward: aiAnalyzed?.ward || "Ward 88 - Indiranagar",
    department: aiAnalyzed?.department || routeInfo.dept,
    representative: aiAnalyzed?.representative || routeInfo.rep,
  };

  db.issues.unshift(newIssue);

  // Gamification: Add points only if reporter is a registered user and logged in, and NOT anonymous
  if (!isGuest && !isAnonymous) {
    const activeProfile = db.activeUserProfile.role === "CITIZEN" ? db.citizenProfile : db.orgProfile;
    activeProfile.totalPoints += 50; // 50 points for filing verified report
    activeProfile.pointsBreakdown.reporting += 50;
    activeProfile.contributionCount += 1;
    activeProfile.personalActiveScore = Math.min(100, activeProfile.personalActiveScore + 5);
    activeProfile.civicScore = Math.min(990, activeProfile.civicScore + 8);
    
    // Save profile changes
    if (db.activeUserProfile.role === "CITIZEN") {
      db.citizenProfile = activeProfile;
      db.activeUserProfile = activeProfile;
    } else {
      db.orgProfile = activeProfile;
      db.activeUserProfile = activeProfile;
    }
  }

  saveDatabase(db);
  res.json({ success: true, issue: newIssue, pointsAwarded: (!isGuest && !isAnonymous) ? 50 : 0 });
});

// Community upvoting or corroboration agreement/disagreement
app.post("/api/issues/:id/vote", (req, res) => {
  db = loadDatabase();
  const { id } = req.params;
  const { voteType, userId } = req.body; // voteType: 'UPVOTE', 'AGREE', 'DISAGREE'

  const issue = db.issues.find((i) => i.id === id);
  if (!issue) {
    return res.status(404).json({ error: "Issue not found" });
  }

  // Prevent multiple votes from same user if userId is provided
  if (userId && userId !== "guest") {
    if (issue.votedUserIds.includes(userId)) {
      return res.status(400).json({ error: "User has already voted/verified this issue" });
    }
    issue.votedUserIds.push(userId);
  }

  if (voteType === "UPVOTE") {
    issue.upvotes += 1;
  } else if (voteType === "AGREE") {
    issue.agreeVotes += 1;
    // Award corroboration points if registered user
    if (userId && userId !== "guest") {
      const activeUser = db.activeUserProfile;
      if (activeUser && activeUser.id === userId) {
        activeUser.totalPoints += 15;
        activeUser.pointsBreakdown.verifying += 15;
        activeUser.personalActiveScore = Math.min(100, activeUser.personalActiveScore + 2);
        activeUser.civicScore = Math.min(990, activeUser.civicScore + 2);
        
        if (activeUser.role === "CITIZEN") {
          db.citizenProfile = activeUser;
          db.activeUserProfile = activeUser;
        } else {
          db.orgProfile = activeUser;
          db.activeUserProfile = activeUser;
        }
      }
    }
  } else if (voteType === "DISAGREE") {
    issue.disagreeVotes += 1;
  }

  // Auto-status resolution trigger simulation based on consensus
  if (issue.agreeVotes >= 15 && issue.status === "PENDING") {
    issue.status = "IN_PROGRESS"; // Escalates automatically to in progress when 15 neighbors agree
  }

  saveDatabase(db);
  res.json({ success: true, issue });
});

// Add corroboration comment/evidence text to issue
app.post("/api/issues/:id/corroborate", (req, res) => {
  db = loadDatabase();
  const { id } = req.params;
  const { author, text, avatar } = req.body;

  const issue = db.issues.find((i) => i.id === id);
  if (!issue) {
    return res.status(404).json({ error: "Issue not found" });
  }

  const newComment: Comment = {
    id: "corr-" + Date.now(),
    author: author || "Concerned Citizen",
    timestamp: new Date().toISOString(),
    text,
    avatar: avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80",
  };

  issue.corroborations.push(newComment);
  issue.upvotes += 2; // Each corroborating testimony slightly boosts upvotes weight

  saveDatabase(db);
  res.json({ success: true, comment: newComment, issue });
});

// Get crowdfunding campaigns (Abhiyans)
app.get("/api/campaigns", (req, res) => {
  db = loadDatabase();
  res.json(db.campaigns);
});

// Launch a new crowdfunding campaign (Abhiyan)
app.post("/api/campaigns", (req, res) => {
  db = loadDatabase();
  const { title, description, targetAmount, linkedIssueIds } = req.body;

  const campId = "camp-" + Math.floor(Math.random() * 90000 + 10000);
  const newCampaign: Campaign = {
    id: campId,
    title,
    description,
    targetAmount: Number(targetAmount),
    currentAmount: 0,
    escrowBalance: 0,
    status: "FUNDRAISING",
    createdAt: new Date().toISOString(),
    daysLeft: 90, // 90 days fundraising timer start
    linkedIssueIds: linkedIssueIds || [],
    donations: [],
    verificationStep: 1,
    votesAgree: 0,
    votesDisagree: 0,
    voters: [],
  };

  db.campaigns.unshift(newCampaign);
  saveDatabase(db);
  res.json({ success: true, campaign: newCampaign });
});

// Crowdfunding: Donate/Fund a campaign (Milestone 1, Escrow wallet deposit, GST bill generation)
app.post("/api/campaigns/:id/donate", (req, res) => {
  db = loadDatabase();
  const { id } = req.params;
  const { amount, donorName, donorId, useWallet } = req.body;

  const campaign = db.campaigns.find((c) => c.id === id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found" });
  }

  const donationAmount = Number(amount);
  const user = db.activeUserProfile;

  // Deduct from wallet if "useWallet" is requested
  if (useWallet && user) {
    if (user.availableFunds < donationAmount) {
      return res.status(400).json({ error: "Insufficient balance in in-app wallet" });
    }
    user.availableFunds -= donationAmount;
  }

  // Generate GST-compliant receipt number
  const receiptNumber = "GST-2026-" + Math.floor(Math.random() * 90000 + 10000);
  const gstin = "29AAAAA0000A1Z1"; // Platform's NGO Section-8 partner GSTIN

  const newDonation: Donation = {
    id: "don-" + Date.now(),
    campaignId: id,
    campaignName: campaign.title,
    donorName: donorName || "Anonymous Supporter",
    donorId: donorId || "guest",
    amount: donationAmount,
    timestamp: new Date().toISOString(),
    receiptNumber,
    gstin,
  };

  campaign.currentAmount += donationAmount;
  campaign.escrowBalance += donationAmount; // Funds sit in secure named escrow wallet
  campaign.donations.push(newDonation);

  // Transition to execution mode once target reached
  if (campaign.currentAmount >= campaign.targetAmount) {
    campaign.status = "EXECUTION";
    campaign.verificationStep = 2; // Proceeds to contractor work proof upload step
  }

  // Update donor rewards
  if (user && donorId === user.id) {
    user.totalDonations += donationAmount;
    user.totalPoints += Math.floor(donationAmount / 10); // 1 point per ₹10 donated
    user.pointsBreakdown.donating += Math.floor(donationAmount / 10);
    user.personalActiveScore = Math.min(100, user.personalActiveScore + 10);
    user.civicScore = Math.min(990, user.civicScore + 15);

    if (user.role === "CITIZEN") {
      db.citizenProfile = user;
      db.activeUserProfile = user;
    } else {
      db.orgProfile = user;
      db.activeUserProfile = user;
    }
  }

  saveDatabase(db);
  res.json({ success: true, campaign, receipt: newDonation });
});

// Progress campaign verification/milestone release step
app.post("/api/campaigns/:id/verify-step", (req, res) => {
  db = loadDatabase();
  const { id } = req.params;
  const { step, videoUrl, photoBefore, photoAfter, vote, userId } = req.body;

  const campaign = db.campaigns.find((c) => c.id === id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found" });
  }

  if (step === 2) {
    // Contractor / Resolver uploads video/photo proof
    campaign.executionProof = {
      videoUrl: videoUrl || "https://assets.mixkit.co/videos/preview/mixkit-pothole-road-repair-42849-large.mp4",
      photoBefore: photoBefore || "https://images.unsplash.com/photo-1542060748-10c28b629f6f?auto=format&fit=crop&w=600&q=80",
      photoAfter: photoAfter || "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80",
      timestamp: new Date().toISOString(),
    };
    campaign.status = "VERIFICATION";
    campaign.verificationStep = 3; // Moves to step 3: Public verification voting
  } else if (step === 3) {
    // Public community voting to release escrow funds
    if (campaign.voters.includes(userId)) {
      return res.status(400).json({ error: "You have already voted on this campaign's completion." });
    }
    
    campaign.voters.push(userId);
    if (vote === "AGREE") {
      campaign.votesAgree += 1;
    } else {
      campaign.votesDisagree += 1;
    }

    // If we have at least 10 votes and > 51% are AGREE, we can complete and release escrow!
    const totalVotes = campaign.votesAgree + campaign.votesDisagree;
    if (totalVotes >= 5 && (campaign.votesAgree / totalVotes) >= 0.51) {
      campaign.status = "RESOLVED";
      campaign.escrowBalance = 0; // Escrow is successfully released to executing agency

      // Resolve the linked issues automatically!
      campaign.linkedIssueIds.forEach((issueId) => {
        const linkedIssue = db.issues.find((i) => i.id === issueId);
        if (linkedIssue) {
          linkedIssue.status = "RESOLVED";
          
          // Also reward the original reporter who initiated this
          if (linkedIssue.reporterName !== "Anonymous Citizen" && linkedIssue.reporterName !== "Guest Citizen") {
            const originalReporter = db.citizenProfile.name === linkedIssue.reporterName ? db.citizenProfile : null;
            if (originalReporter) {
              originalReporter.totalPoints += 200; // Large 200 points completion award!
              originalReporter.citizensHelped += Math.floor(linkedIssue.upvotes * 2.5 + 400); // estimated helped metric
              db.citizenProfile = originalReporter;
              if (db.activeUserProfile.id === originalReporter.id) {
                db.activeUserProfile = originalReporter;
              }
            }
          }
        }
      });
    }
  }

  saveDatabase(db);
  res.json({ success: true, campaign });
});

// Refund / simulation of 90-day timer expiration with auto-return logic
app.post("/api/campaigns/:id/simulate-90-days", (req, res) => {
  db = loadDatabase();
  const { id } = req.params;

  const campaign = db.campaigns.find((c) => c.id === id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found" });
  }

  // Auto-refund only applicable if fundraising wasn't finalized or resolution failed within 90 days
  if (campaign.status === "FUNDRAISING" || campaign.status === "EXECUTION" || campaign.status === "VERIFICATION") {
    const originalStatus = campaign.status;
    campaign.status = "REFUNDED";
    
    // Distribute funds back to donors' in-app availableFunds wallet
    let refundedCount = 0;
    campaign.donations.forEach((donation) => {
      // Find donor in system if possible, otherwise credit active user or simulate
      if (donation.donorId === db.citizenProfile.id) {
        db.citizenProfile.availableFunds += donation.amount;
        if (db.activeUserProfile.id === db.citizenProfile.id) {
          db.activeUserProfile.availableFunds = db.citizenProfile.availableFunds;
        }
        refundedCount++;
      } else if (donation.donorId === db.orgProfile.id) {
        db.orgProfile.availableFunds += donation.amount;
        if (db.activeUserProfile.id === db.orgProfile.id) {
          db.activeUserProfile.availableFunds = db.orgProfile.availableFunds;
        }
        refundedCount++;
      } else {
        // Mock success for other donors: refunded in background
        refundedCount++;
      }
    });

    campaign.escrowBalance = 0; // Escrow is emptied back to donors
    saveDatabase(db);
    return res.json({
      success: true,
      message: `Simulated 90 days. Refunded ${campaign.donations.length} contributions totalling ₹${campaign.currentAmount} successfully back to donor wallets.`,
      campaign
    });
  } else {
    return res.status(400).json({ error: "Campaign is already completed or refunded" });
  }
});

// Profile & Leaderboard routing
app.get("/api/profile", (req, res) => {
  db = loadDatabase();
  res.json({
    activeUser: db.activeUserProfile,
    citizen: db.citizenProfile,
    org: db.orgProfile,
  });
});

// Switch role (Citizen vs Org account type)
app.post("/api/profile/toggle", (req, res) => {
  db = loadDatabase();
  const { targetRole } = req.body;

  if (targetRole === "CITIZEN") {
    db.activeUserProfile = db.citizenProfile;
  } else if (targetRole === "ORGANIZATION") {
    db.activeUserProfile = db.orgProfile;
  }

  saveDatabase(db);
  res.json({ success: true, activeUser: db.activeUserProfile });
});

// Sync Firebase authenticated user profile to Firestore database
app.post("/api/profile/login", async (req, res) => {
  db = loadDatabase();
  const { uid, email, name, role } = req.body;
  
  if (!uid) {
    return res.status(400).json({ error: "UID is required" });
  }

  try {
    const profileRef = doc(firestore, "profiles", uid);
    const profileSnap = await getDoc(profileRef);
    
    let userProfile: UserProfile;
    if (profileSnap.exists()) {
      userProfile = profileSnap.data() as UserProfile;
    } else {
      userProfile = {
        id: uid,
        name: name || email.split("@")[0],
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
        location: "Indiranagar, Bengaluru",
        role: role || "CITIZEN",
        civicScore: 700,
        totalPoints: 100,
        personalActiveScore: 50,
        contributionCount: 0,
        citizensHelped: 0,
        totalDonations: 0,
        pointsBreakdown: {
          reporting: 0,
          verifying: 0,
          donating: 0,
        },
        badges: ["New Citizen"],
        streakDays: 1,
        availableFunds: 5000, // Seeding wallet for testing out features
      };
      await setDoc(profileRef, userProfile);
    }

    db.activeUserProfile = userProfile;
    if (userProfile.role === "CITIZEN") {
      db.citizenProfile = userProfile;
    } else {
      db.orgProfile = userProfile;
    }
    saveDatabase(db);
    
    res.json({ 
      success: true, 
      activeUser: userProfile, 
      citizen: db.citizenProfile, 
      org: db.orgProfile 
    });
  } catch (err) {
    console.error("Error logging in / syncing profile in backend:", err);
    res.status(500).json({ error: "Failed to login/sync profile" });
  }
});

// Log out user profile and clear active user back to a guest or standard fallback
app.post("/api/profile/logout", (req, res) => {
  db = loadDatabase();
  db.activeUserProfile = {
    id: "guest",
    name: "Guest Neighbour",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=guest",
    location: "Indiranagar, Bengaluru",
    role: "CITIZEN",
    civicScore: 0,
    totalPoints: 0,
    personalActiveScore: 0,
    contributionCount: 0,
    citizensHelped: 0,
    totalDonations: 0,
    pointsBreakdown: {
      reporting: 0,
      verifying: 0,
      donating: 0,
    },
    badges: [],
    streakDays: 0,
    availableFunds: 0,
  };
  saveDatabase(db);
  res.json({ success: true, activeUser: db.activeUserProfile });
});

// --------------------------------------------------------
// Real Gemini AI Report Analysis Integration
// --------------------------------------------------------
app.post("/api/ai/analyze-report", async (req, res) => {
  const { description, imageBase64, filename } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.log("Gemini API key is not set. Executing rule-based NLP fallback analysis.");
    return executeFallbackAnalysis(description, res);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    let prompt = `You are IndiaCivic's expert computer-vision civic engineer. Analyze the civic issue description below. Your goal is to map this report to the perfect municipal division, representative, and estimate details.
    
    Description provided by citizen: "${description || 'No description provided.'}"
    
    Analyze and output a clean JSON response.
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: "One of: 'Waste Management', 'Drainage & Waterlogging', 'Mosquito Infestation & Waterlogging', 'Broken Public Assets', 'Night Lighting & Women\\'s Safety', 'AQI & Pollution', 'Traffic Signal Violations & Accident Reporting', 'Theft & Safety Incidents', 'Threats & Anti-social Threats'"
        },
        title: {
          type: Type.STRING,
          description: "A short, professional title summarizing the issue (maximum 5 words)"
        },
        refinedDescription: {
          type: Type.STRING,
          description: "A professional rewrite of the description clarifying the exact municipal action required"
        },
        severity: {
          type: Type.INTEGER,
          description: "Severity rating from 1 (minor) to 5 (extremely urgent, endangering life or health)"
        },
        department: {
          type: Type.STRING,
          description: "The official Indian public municipal agency responsible (e.g. BBMP Solid Waste Management, BWSSB, BESCOM, Police Division, KSPCB)"
        },
        representative: {
          type: Type.STRING,
          description: "Name and title of the typical officer (e.g., Corporator, SI Police, Assistant Engineer, Ward Inspector)"
        },
        ward: {
          type: Type.STRING,
          description: "The sub-regional ward name (e.g. 'Ward 88 - Indiranagar')"
        },
        fraudScore: {
          type: Type.STRING,
          description: "Low, Medium, or High (based on if the report sounds fake or repetitive)"
        }
      },
      required: ["category", "title", "refinedDescription", "severity", "department", "representative", "ward", "fraudScore"]
    };

    let contents: any = prompt;

    if (imageBase64) {
      console.log("Analyzing image + text with gemini-3.5-flash");
      // Clean base64 header if present
      const base64Clean = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      contents = {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Clean,
            }
          },
          { text: prompt }
        ]
      };
    } else {
      console.log("Analyzing text-only with gemini-3.5-flash");
    }

    const aiRes = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: "You are the primary automated civic report verification routing engine for IndiaCivic. Analyze images and descriptions of municipal problems (waste, water, lights, safety). Identify duplicates, categorize, assign department, score severity (1-5), and detect fraud or internet stock images.",
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const resultText = aiRes.text;
    console.log("Gemini response parsed successfully:", resultText);
    const parsed = JSON.parse(resultText);
    return res.json({ success: true, analysis: parsed });

  } catch (error: any) {
    console.error("Gemini AI API execution failed. Reverting to rule-based parser.", error);
    return executeFallbackAnalysis(description, res);
  }
});

// Helper: Rule-based NLP fallback analysis
function executeFallbackAnalysis(description: string = "", res: any) {
  const descLower = description.toLowerCase();
  
  let category = "Broken Public Assets";
  let title = "Broken Asset Reported";
  let severity = 3;
  let department = "Bruhat Bengaluru Mahanagara Palike (BBMP)";
  let representative = "Nodal Ward Officer";
  let ward = "Ward 88 - Indiranagar";

  if (descLower.includes("garbage") || descLower.includes("waste") || descLower.includes("trash") || descLower.includes("litter") || descLower.includes("dump")) {
    category = "Waste Management";
    title = "Overflowing Garbage Pile";
    severity = 4;
    department = "BBMP - Solid Waste Management Division";
    representative = "Corporator Suresh Kumar (Ward 88)";
  } else if (descLower.includes("drain") || descLower.includes("leak") || descLower.includes("water") || descLower.includes("overflow") || descLower.includes("sewage")) {
    category = "Drainage & Waterlogging";
    title = "Water Pipeline Leak / Clogged Drain";
    severity = 4;
    department = "Bangalore Water Supply and Sewerage Board (BWSSB)";
    representative = "Assistant Engineer Anand Rao";
  } else if (descLower.includes("mosquito") || descLower.includes("insect") || descLower.includes("stagnant") || descLower.includes("dengue") || descLower.includes("malaria")) {
    category = "Mosquito Infestation & Waterlogging";
    title = "Stagnant Water / Mosquito Breeding Area";
    severity = 4;
    department = "BBMP - Health & Family Welfare Department";
    representative = "Dr. Sandeep Murthy (Zonal Medical Officer)";
  } else if (descLower.includes("dark") || descLower.includes("light") || descLower.includes("street") || descLower.includes("lamp") || descLower.includes("women") || descLower.includes("night")) {
    if (descLower.includes("women") || descLower.includes("safety") || descLower.includes("night")) {
      category = "Night Lighting & Women's Safety";
      title = "Dark & Unsafe Street Segment";
      severity = 5;
      department = "Indiranagar Ward Police & Streetlight Division";
      representative = "Inspector Patil (Indiranagar Division)";
    } else {
      category = "Broken Public Assets";
      title = "Dead Streetlight LED";
      severity = 3;
      department = "Bangalore Electricity Supply Company (BESCOM)";
      representative = "Engineer Anjali Hegde";
    }
  } else if (descLower.includes("smoke") || descLower.includes("burn") || descLower.includes("dust") || descLower.includes("pollution") || descLower.includes("aqi")) {
    category = "AQI & Pollution";
    title = "Open Trash Burning / Pollution Alert";
    severity = 3;
    department = "Karnataka State Pollution Control Board (KSPCB)";
    representative = "Officer H.S. Swamy";
  } else if (descLower.includes("accident") || descLower.includes("signal") || descLower.includes("traffic") || descLower.includes("violation") || descLower.includes("speed")) {
    category = "Traffic Signal Violations & Accident Reporting";
    title = "Traffic Malfunction / Accident Spot";
    severity = 4;
    department = "Bengaluru Traffic Police (BTP)";
    representative = "SI Raghavendra (Traffic Control)";
  } else if (descLower.includes("theft") || descLower.includes("steal") || descLower.includes("chain") || descLower.includes("rob") || descLower.includes("pocket")) {
    category = "Theft & Safety Incidents";
    title = "Active Robbery / Theft Hotspot";
    severity = 5;
    department = "Indiranagar Police Station (Law & Order)";
    representative = "Inspector Patil (Indiranagar Division)";
  } else if (descLower.includes("threat") || descLower.includes("goon") || descLower.includes("hooligan") || descLower.includes("threaten") || descLower.includes("fight")) {
    category = "Threats & Anti-social Threats";
    title = "Anti-Social Rowdyism Threat";
    severity = 5;
    department = "Indiranagar Police Station - Special Crime Unit";
    representative = "Inspector Patil (Indiranagar Division)";
  }

  return res.json({
    success: true,
    analysis: {
      category,
      title,
      refinedDescription: description ? `Refined citizen report detailing: ${description}. Auto-routed for investigation.` : "Automated routing details processed.",
      severity,
      department,
      representative,
      ward,
      fraudScore: "Low"
    }
  });
}

// --------------------------------------------------------
// Vite Development Middleware Integration
// --------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Support modern index.html route fallback for SPA
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[IndiaCivic Server] Live and running on http://localhost:${PORT}`);
  });
}

startServer();
