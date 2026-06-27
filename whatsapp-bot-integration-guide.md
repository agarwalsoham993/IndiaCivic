# IndiaCivic WhatsApp Bot Integration Guide

This guide contains the exact **AI Parsing Prompt** and **Node.js Integration Webhook Script** to build an automated WhatsApp bot for IndiaCivic. 

The bot will automatically capture citizen messages, extract the issue details, select the appropriate category, resolve geolocation, attach media (images and videos), and save the records directly into your live Firestore Database.

---

## 1. Opal / LLM Agent Parsing Prompt
Configure your WhatsApp bot (using Opal, Make.com, or any webhook agent) to pass incoming message text to an LLM block using the following system prompt:

```text
You are the AI Parser for IndiaCivic, a decentralized municipal grievance tracking platform.
Your task is to take a raw WhatsApp message, media attachments, and optional location coordinates, and parse them into a structured JSON payload conforming to the database schema.

### Core Categorization Schema
You MUST map the issue to one of these exact categories:
- "Drainage & Waterlogging"
- "Waste Management"
- "Roads & Potholes"
- "Safety & Streetlights"
- "Broken Public Assets"

### Input Data Available:
1. Sender's Name: {{sender_name}}
2. Sender's WhatsApp Phone Number / UID: {{sender_phone}}
3. Message Text: {{message_text}}
4. Location Coordinates (if shared as pin): {{latitude}}, {{longitude}}
5. Media URLs (Images/Videos): {{media_urls}}

### Parsing Rules:
- Title: Extract a highly descriptive, concise 5-8 word title. (e.g., "Sewer overflow on 12th Main Road")
- Description: Keep all details from the citizen's message. Rephrase politely if needed, keeping it actionable.
- Category: Pick the single best category from the Core Categorization Schema list.
- Geolocation: If coordinates are not provided but a landmark is mentioned, search/approximate Bengaluru coordinates (default center: lat 12.9716, lng 77.6412) or set suitable lat/lng.
- Severity: Rate from 1 (Low) to 5 (Critical) based on severity. (e.g. Waterlogging/Sewage = 4 or 5; broken streetlight = 2 or 3).
- Ward mapping: Map "Indiranagar" or "Sector 42" or defaults based on proximity or mentions.
- Tracking ID: Generate a random tracking ID formatted as `CIVIC-[6 RANDOM DIGITS]`.
- Department: Map automatically:
  - "Drainage & Waterlogging" -> "BWSSB (Sewage & Water Board)"
  - "Waste Management" -> "BBMP Solid Waste Management"
  - "Roads & Potholes" -> "BBMP Major Roads"
  - "Safety & Streetlights" -> "BESCOM Electricity & Safety"
  - "Broken Public Assets" -> "BBMP Ward Works"

### Output Format:
Return ONLY a valid JSON object matching this structure:
{
  "trackingId": "CIVIC-129482",
  "category": "Drainage & Waterlogging",
  "title": "...",
  "description": "...",
  "locationName": "...",
  "latitude": 12.9716,
  "longitude": 77.6412,
  "status": "PENDING",
  "severity": 4,
  "imageUrl": "...", // First image URL from media if available, or empty string
  "evidenceLinks": [...], // Array of all media URLs (images + videos)
  "ward": "Indiranagar Ward 88",
  "department": "BWSSB (Sewage & Water Board)",
  "representative": "Ward Corporator",
  "isAnonymous": false
}
```

---

## 2. Webhook Integration Script (Node.js)

Deploy this lightweight Node.js Express server or serverless cloud function (e.g., GCP Cloud Functions) to listen to Opal's parsed webhooks and write them to your active Firestore database `ai-studio-84612a05-8b9c-463f-8c53-e514de638c29`.

```javascript
/**
 * IndiaCivic Automated WhatsApp Bot Webhook
 * Dependencies: npm install express firebase-admin
 */

const express = require('express');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());

// Initialize Firebase Admin using Service Account Credentials
// (Make sure to set GOOGLE_APPLICATION_CREDENTIALS or configure via env)
admin.initializeApp({
  projectId: "gen-lang-client-0565114419"
});

// Access the specific Firestore database used by IndiaCivic
const db = admin.firestore().databaseId === "ai-studio-84612a05-8b9c-463f-8c53-e514de638c29" 
  ? admin.firestore() 
  : admin.firestore("ai-studio-84612a05-8b9c-463f-8c53-e514de638c29");

/**
 * Endpoint to receive WhatsApp message payload from Opal
 */
app.post('/webhook/whatsapp-trigger', async (req, res) => {
  try {
    const { 
      reporterUid,     // The User UID (e.g. from Firebase Auth) of the main account logging in
      reporterName,    // Name of the reporting citizen
      parsedPayload    // The structured JSON payload parsed by the LLM Prompt above
    } = req.body;

    if (!parsedPayload || !parsedPayload.title) {
      return res.status(400).json({ error: "Missing parsed payload or title" });
    }

    const issueId = "issue_" + Date.now();
    
    // Create the fully-formed Issue object matching the IndiaCivic schema
    const newIssue = {
      id: issueId,
      trackingId: parsedPayload.trackingId || `CIVIC-${Math.floor(100000 + Math.random() * 900000)}`,
      category: parsedPayload.category || "Waste Management",
      title: parsedPayload.title,
      description: parsedPayload.description || "",
      locationName: parsedPayload.locationName || "Indiranagar, Bengaluru",
      latitude: Number(parsedPayload.latitude) || 12.9716,
      longitude: Number(parsedPayload.longitude) || 77.6412,
      timestamp: new Date().toISOString(),
      status: "PENDING",
      severity: Number(parsedPayload.severity) || 3,
      imageUrl: parsedPayload.imageUrl || "",
      isAnonymous: parsedPayload.isAnonymous || false,
      reporterName: reporterName || "WhatsApp Citizen",
      virtualAssetId: "sector-2", // Default proximity-based geo-cluster ID
      upvotes: 0,
      agreeVotes: 0,
      disagreeVotes: 0,
      votedUserIds: [],
      evidenceLinks: parsedPayload.evidenceLinks || [],
      corroborations: [],
      ward: parsedPayload.ward || "Indiranagar Ward 88",
      department: parsedPayload.department || "BBMP Solid Waste Management",
      representative: parsedPayload.representative || "Ward Corporator",
      reporterId: reporterUid || "guest"
    };

    // 1. Save the new issue record to the actual Firestore database
    await db.collection('issues').doc(issueId).set(newIssue);
    console.log(`Successfully added issue ${issueId} to Firestore.`);

    // 2. Award gamification points to the logged-in citizen's profile
    if (reporterUid && reporterUid !== "guest") {
      const profileRef = db.collection('profiles').doc(reporterUid);
      const profileSnap = await profileRef.get();

      if (profileSnap.exists) {
        const profileData = profileSnap.data();
        const currentPoints = profileData.totalPoints || 0;
        const currentReporting = (profileData.pointsBreakdown && profileData.pointsBreakdown.reporting) || 0;
        const currentContributions = profileData.contributionCount || 0;

        await profileRef.update({
          totalPoints: currentPoints + 50, // 50 points rewarded for WhatsApp filing
          contributionCount: currentContributions + 1,
          "pointsBreakdown.reporting": currentReporting + 50
        });
        console.log(`Updated points for citizen ${reporterUid}.`);
      }
    }

    res.status(200).json({ 
      success: true, 
      message: "Issue logged successfully via WhatsApp bot", 
      issueId,
      trackingId: newIssue.trackingId 
    });

  } catch (error) {
    console.error("Error processing WhatsApp trigger:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`WhatsApp integration receiver listening on port ${PORT}`);
});
```

---

## 3. Step-by-Step Integration Guide

### Step 1: Connect WhatsApp Gateway to Opal
Configure your WhatsApp Business API provider (like Twilio, Gupshup, or MessageBird) to post incoming messages to your Opal trigger node.

### Step 2: Use the LLM Node to Format Input
Pass the raw WhatsApp text, media links, and coordinates into an LLM parsing step in Opal using the system prompt provided in **Section 1**. This returns a perfectly structured JSON object with categories correctly mapped.

### Step 3: Link Account
To link complaints to the main registered account:
1. When a citizen first messages the bot, have the bot request their registered email address.
2. Verify the email against the Firestore `profiles` collection to find their matching **UID (`reporterUid`)**.
3. Cache this `reporterUid` in the session so all subsequent reports are automatically credited to their profile.

### Step 4: Post to Webhook
Send the structured JSON together with the citizen's cached account credentials to the Webhook script endpoint. The script automatically handles writing to Firestore and triggers live notification updates on the web app interface!
