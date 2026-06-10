# 🌐 Community Nexus — Professional User Flow & Architecture Blueprint

This document outlines the detailed system workflows, interactive lifecycles, database entities, and technical architecture of **Community Nexus**. It is structured to serve as an academic and professional guide for presentations, technical reviews, and project appraisals.

---

## 🏛️ 1. ARCHITECTURAL OVERVIEW
Community Nexus is engineered on a modern **Decoupled Full-Stack Architecture** utilizing a React SPA client powered by Vite on the frontend, and an Express.js server on the backend with a MongoDB datastore.

```
       +---------------------------------------------+
       |             CLIENT-SIDE (React SPA)          |
       |  - UI Dashboards (Visitor/Member/Admin)      |
       |  - Haversine Geolocation Distance Engine    |
       |  - State Storage & JWT Client Interceptors  |
       +----------------------+----------------------+
                              |
                     HTTPS (REST API Calls)
                     with JWT Authorization
                              |
                              v
       +---------------------------------------------+
       |            SERVER-SIDE (Express.js)         |
       |  - API Endpoints Core Router                |
       |  - JWT Authentication Middleware             |
       |  - Custom Alphanumeric ID Generator Logic   |
       +----------------------+----------------------+
                              |
                       Mongoose ORM Queries
                              |
                              v
       +---------------------------------------------+
       |             DATABASE (MongoDB)              |
       |  - Schemas (Users, Communities, Events)    |
       |  - Request Registries (Joins, Volunteers)  |
       +---------------------------------------------+
```

---

## 🗃️ 2. DATABASE SCHEMAS & ENTITY RELATIONSHIPS

The database architecture is designed with high integrity and custom prefixed identifier nodes:
- `U-` / `M-` / `A-` / `V-` for **Users**
- `COMM-` for **Communities**
- `EVT-` for **Events**
- `JR-` for **Join Requests**
- `VOL-` for **Volunteer Submissions**
- `N-` for **Notifications**
- `ACH-` for **Achievements/Gamification Badges**

```
+------------------+         1 : N         +--------------------+
|     USER (U)     | +-------------------> | JOIN REQUEST (JR)  |
| - id (PK)        |                       | - id (PK)          |
| - name           |                       | - userId (FK)      |
| - email (Unique) |                       | - communityId (FK) |
| - passwordHash   |                       | - status           |
| - role           |                       +--------------------+
| - location       |
| - interests      |         1 : N         +--------------------+
| - createdAt      | +-------------------> | VOLUNTEER REQ (VOL)|
+--------+---------+                       | - id (PK)          |
         |                                 | - userId (FK)      |
         | 1 : N                           | - eventId (FK)     |
         v                                 | - motivation       |
+--------+---------+                       | - skills           |
| COMMUNITY (COMM) |                       | - status           |
| - id (PK)        |                       +--------------------+
| - name           |
| - description    |         1 : N         +--------------------+
| - category       | +-------------------> |     EVENT (EVT)    |
| - lats/longs     |                       | - id (PK)          |
| - adminId (FK)   |                       | - title            |
| - members (List) |                       | - eventDate        |
+------------------+                       | - communityId (FK) |
                                           | - attendees (List) |
                                           +--------------------+
```

---

## 🚦 3. DETAILED ROLE-BASED USER FLOWS

### FLOW A: THE VISITOR (Discoverer Node)
*Goal: Dynamically search, register, explore regional hubs, and verify spatial proximity mappings without permanent commitment.*

1. **Simulated/Live GPS Capture**:
   - The system queries browser `navigator.geolocation` coordinates.
   - If blocked or running in sandboxed environments, it applies **Safe Geolocation Preset nodes** (e.g., Hyderabad, SF, Warangal) to render matching interactive map cards.
2. **Community Discovery Filtering**:
   - The Visitor interacts with filter panels (Search queries, Category types like 'Tech', 'NGO', 'Sports', or City regions).
   - Real-time **Haversine Formulas** are executed either on-the-fly or through the discovery ledger to output immediate spatial distances (e.g., *"3.4 km away"*).
3. **Onboarding & Gateway**:
   - To interact further, the Visitor clicks "Join Community" or "RSVP".
   - This launches the unified **AuthModal/Register** portal.
   - Once signed up, the Visitor transitions into a **Registered Member**.

---

### FLOW B: THE REGISTERED MEMBER (Engagement Node)
*Goal: Join circular communities, register meetup RSVPs, enlist on active volunteer rosters, and earn gamification badges.*

```
   [ Registered Member Dashboard ]
                 |
        +--------+--------+
        |                 |
        v                 v
[ Explore Map ]    [ Managed Circles ]
        |                 |
        | - Check Distance| - Join New (Creates Pending JR-Record)
        | - Choose Meetup | - Receive Approval Notification
        |                 | - Enter Approved Community Feed
        v                 |
  [ RSVP / Cancel ] <-----+
        |
        | - RSVP (Cap check 50 max) -> Live Attendee List
        | - Optional: Submit Volunteer Application (Enters VOL-Record)
        v
  [ Earn Achievements ] -> Badges awarded on approval of JR & VOL
```

1. **Circular Group Application (Membership Request)**:
   - Member clicks "Apply to Join" on a regional Circle.
   - The backend records a `JoinRequest` (Status: `Pending`).
   - The Circle’s Admin receives a real-time Dispatch Notification.
2. **Volunteering & Roster Submission**:
   - For any active event, a Member can submit custom **Volunteer Credentials** (enlisting their dynamic skills, level of dedication, and motivation letters).
   - This records a `VolunteerRequest` pending approval.
3. **Gamification & Accomplishments Engine**:
   - As Join Requests or Volunteer rosters are approved by administrators, backend hooks evaluate conditions.
   - **Unlockable Badges** (like *Foundational Circular Builder* or *Leadership Altruism Emblem*) are unlocked, saving an `Achievement` record and showing push alerts.

---

### FLOW C: THE COMMUNITY ADMIN (Orchestration Node)
*Goal: Establish community blueprints, manage incoming requests, host regional events, and analyze growth metrics.*

```
   [ Admin Administrative Console ]
                 |
   +-------------+-------------+
   |                           |
   v                           v
[ Circle Creator ]       [ Request Inbox ]
   |                        |
   | - Branding Metadata    | - Review Members (Approve / Reject)
   | - Lat/Long Coordinates | - Review Volunteers (Approve / Reject)
   v                        v
[ Create Meetups ] ----> [ Live Updates & Growth Analytics ]
```

1. **Circle Launching**:
   - Admins specify community name, category, spatial coordinates (lat/longs), custom branding banners, and description.
   - Creating a circle instantly marks the Admin as Member #1 and unlocks their administrative terminal.
2. **Member & Volunteer Vetting**:
   - The Admin views the **Approval Ledger**:
     - *Membership request matching*: Inspect details and approve/reject with a single cursor gesture.
     - *Volunteer requests*: Direct reviews of skills/motivation to assign event organizers.
3. **Meetup Mobilization**:
   - Admins schedule new event items (Meetups, Workshops, Seminars).
   - Creating a meetup alerts all circle members via backend notification hooks.

---

## 🔄 4. CORE INTERACTIVE TRANSACTION LOOPS

### A. Community Join Request Sequence
```
Member Client               Express API Backend                Admin Client
    |                               |                               |
    |--- POST /api/comm/:id/join -->|                               |
    |    (Stores `JR` with Pending) |                               |
    |<-- 200 OK (Pending logged) ---|                               |
    |                               |--- Create Notification ------>|
    |                               |    (Show Badge/Request alert) |
    |                               |                               |
    |                               |                               |<-- Click APPROVED --|
    |                               |<-- POST /requests/:id/resolve |
    |                               |    (Swaps status/Moves ID)    |
    |                               |                               |
    |<-- Receive pushing alert -----|                               |
    |    ("Join Approved! 🎉")      |                               |
```

### B. Spatial Distance Computation (Haversine Implementation)
```
1. Capture User Coordinates (U_Lat, U_Lng)
2. Retrieve Community Node Coordinates (C_Lat, C_Lng)
3. Apply Haversine Calculation:
   - dLat = (C_Lat - U_Lat) * PI / 180
   - dLng = (C_Lng - U_Lng) * PI / 180
   - a = sin²(dLat/2) + cos(U_Lat * PI/180) * cos(C_Lat * PI/180) * sin²(dLng/2)
   - c = 2 * atan2(√a, √(1-a))
   - Distance = R (6371) * c  // Result in Kilometers
4. Output responsive localized layout cards matching proximity thresholds.
```
