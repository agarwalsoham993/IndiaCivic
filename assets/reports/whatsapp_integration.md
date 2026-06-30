Viewed ProfileView.tsx:71-110

Here is the end-to-end architectural flow of the WhatsApp integration, explaining both user interactions on the UI and the underlying backend APIs that connect to external WhatsApp Business providers (e.g., Twilio, Gupshup, or Meta Cloud API).

---

### Flow A: Guest / First-Time Reporting & Auto-Merging
This flow handles users who interact with the system via WhatsApp first, without having an account on the web application.

```mermaid
sequenceDiagram
    autonumber
    actor Guest as Guest User (WhatsApp)
    participant WA as WhatsApp Gateway (Twilio/Meta)
    participant Webhook as Express Webhook (/webhook/whatsapp-trigger)
    participant DB as Local Database (data.json)
    participant UI as Web App Frontend (React)

    Guest->>WA: Sends message: "pothole on road" + Location Pin
    WA->>Webhook: POST /webhook/whatsapp-trigger
    Note over Webhook: Runs NLP classification, Severity Math, &<br/>Proximity De-duplication (100m)
    alt New Unique Issue
        Webhook->>DB: Logs issue under reporterId: "guest"
        Webhook->>Webhook: Generates signup token (valid 24h)
        Webhook-->>Guest: Sends Tracking ID + Signed Link (/?whatsappToken=X&whatsappPhone=Y)
    else Duplicate Issue Found
        Webhook->>DB: Upvotes existing ticket, logs guest phone in votedUserIds
        Webhook-->>Guest: Sends "We found a matching ticket. Added your vote!"
    end

    Guest->>UI: Clicks Signed Link
    Note over UI: Detects URL query params.<br/>Triggers Sign Up / Log In promotion modal.
    Guest->>UI: Logs in / Signs up as Soham (user_1)
    UI->>Webhook: POST /api/whatsapp/merge-guest-reports
    Webhook->>DB: Merges reports: changes reporterId from "guest" to user_1<br/>Replaces votedUserIds with user_1<br/>Awards +50 XP (reports) & +15 XP (upvotes)
    Webhook-->>UI: Returns success + updated user profile
    Note over UI: Displays success notification & refreshes dashboard with +65 XP
```

---

### Flow B: Profile-to-WhatsApp Handshake Connection
This flow handles active web application users linking their pre-existing profiles to their WhatsApp numbers.

```mermaid
sequenceDiagram
    autonumber
    actor User as Authentited User (Soham)
    participant UI as Web App Frontend (React)
    participant API as Express API (/api/whatsapp/*)
    participant DB as Local Database (data.json)
    participant WA as WhatsApp Gateway (Twilio/Meta)

    User->>UI: Clicks "Connect WhatsApp Bot" on profile page
    UI->>API: POST /api/whatsapp/request-handshake
    API->>API: Generates 6-digit code (WA-XXXXXX) expiring in 5 mins
    API->>DB: Stores code on User Profile object
    API-->>UI: Returns code: WA-497813
    Note over UI: Displays code + instructions:<br/>"Send Verify WA-497813 to +91 90123 45678"
    Note over UI: Initiates polling every 3 seconds to check status

    User->>WA: Sends: "Verify WA-497813" from phone +919999999999
    WA->>API: POST /webhook/whatsapp-trigger
    Note over API: Matches code & updates User Profile
    API->>DB: Sets whatsappNumber: "+919999999999", whatsappVerified: true
    API-->>User: Replies on WhatsApp: "Linked Successfully!"
    
    Note over UI: Next poll detects whatsappVerified: true
    UI-->>User: Visual success card shown. Stops polling.
```

---

### API Endpoint Specifications (For Service Providers)

#### 1. Webhook Ingestion Hook
* **Endpoint:** `POST /webhook/whatsapp-trigger`
* **Purpose:** This is the URL configured as the webhook callback in the Twilio/Meta dashboard. It handles incoming text, media, and location payloads.
* **Request Payload Structure:**
  ```json
  {
    "from": "+919999999999",
    "body": "pothole on 100ft road",
    "latitude": 12.9719,
    "longitude": 77.6412,
    "imageUrl": "https://media.url/path.jpg"
  }
  ```
* **Internal De-duplication Logic:**
  * Checks existing database tickets.
  * Calculates distance between coordinate points. If **$\le 100$ meters**, checks if the category matches.
  * If category matches, runs a Jaccard word-similarity comparison on the descriptions.
  * If **$> 50\%$ similar**, rejects duplicate report creation and increments the existing ticket's upvotes count (tagging the voter as `"wa_" + phone`).

#### 2. Request Handshake Code
* **Endpoint:** `POST /api/whatsapp/request-handshake`
* **Purpose:** Generates a short-lived verification code for active users.
* **Payload:** `{"userId": "user_id_here"}`
* **Response:** `{"success": true, "code": "WA-497813"}`

#### 3. Verify Token Validity
* **Endpoint:** `GET /api/whatsapp/verify-token`
* **Purpose:** The web client calls this on page load when detecting `whatsappToken` in the query parameters to verify if the redirect is valid.
* **Parameters:** `?token=tok_xxxx&phone=+91xxxx`
* **Response:** `{"valid": true}`

#### 4. Guest Reports Merge
* **Endpoint:** `POST /api/whatsapp/merge-guest-reports`
* **Purpose:** Called by the client React app immediately after the guest logs in. Links their guest activities to their real account profile.
* **Payload:**
  ```json
  {
    "token": "tok_xxxx",
    "phone": "+919999999999",
    "userId": "9CPEpFcK1fWcRxlwaQoYD323y5u1"
  }
  ```
* **Response:**
  ```json
  {
    "success": true,
    "mergedIssuesCount": 1,
    "pointsAwarded": 65,
    "profile": { ... }
  }
  ```