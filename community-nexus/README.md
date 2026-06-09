# 🌐 Community Nexus - Connecting, Engaging, and Making an Impact

Welcome to **Community Nexus**, a modern, startup-grade, hyper-local community discovery, management, and event organization platform. Engineered with a full-stack, decoupled architecture, Community Nexus enables members to explore regional chapters, calculated nearby events using geolocation, and support local networks through structured volunteering rosters under strict administrative coordination.

---

## 📂 System Folder Structure

```
community-nexus/
│
├── frontend/                     # React Single Page App (Client)
│   ├── src/
│   │   ├── components/           # Navbar, dashboards, modals, stats charts
│   │   ├── lib/                  # Axios services (api.js) config
│   │   ├── index.css             # Tailwind setup and styles
│   │   └── main.jsx              # Main mounting
│   ├── public/                   # Vector branding images and mock mock assets
│   ├── package.json              # Client runtime scripts
│   └── vite.config.js            # Vite configuration engine
│
├── backend/                      # Node.js & Express REST Web API (Server)
│   ├── src/
│   │   ├── middleware/           # JWT & Role validation
│   │   ├── models/               # MongoDB Mongoose collection declarations
│   │   └── server.js             # Main server setup and endpoints mapping
│   ├── package.json              # Server dependencies listing
│   └── .env.example              # Environments template
│
└── README.md                     # Deployment and configuration guide (This file)
```

---

## 🛠️ Technological Blueprints

### Frontend Stack:
- **React.js** (v18) and **Vite** as a hyper-fast compiler
- **Tailwind CSS** for responsive layout and startup visual aesthetics
- **Recharts** for administrative expansion graphs and event analytics
- **Lucide React** for modern UI icons pairing
- **Axios** for state-synchronized requests flow to the API
- **Framer Motion** for polished, glassmorphic micro-animations

### Backend Stack:
- **Node.js** with **Express.js** API framework
- **MongoDB Atlas** via **Mongoose ORM** schemas
- **JSON Web Tokens (JWT)** for robust user verification
- **Bcrypt.js** hash cryptography for password safety
- **CORS** middleware configuration for API safety

---

## 🚦 End-to-End Core Features

1. **Role Selection Hub**: Swaps user perspectives dynamically between **V-Visitor**, **M-Member**, and **A-Admin**.
2. **Visitor Portal**: Browse active communities, search categories, check physical distances dynamically, and trace events.
3. **Member Actions**: Register and cancel RSVPs, submit structured volunteer skills rosters, unlock achievements, and browse geographic meetups.
4. **Admin Panel**: Brand and create chapters, manage membership join request approval lists, approve/reject event volunteers, schedule meetups, and verify analytics curves.
5. **Distance Calculations Node**: Integrates live browser GPS and safe Haversine backbacks to calculate distance to meetups.

---

## 🚀 Independent Local Installation

First, clone or extract project and enter directory:
```bash
cd community-nexus
```

### 1. Launch Backend API
```bash
cd backend
npm install
```
Configure environment secrets: Create a `.env` file copying `.env.example`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/community_nexus?retryWrites=true&w=majority
JWT_SECRET=super_secret_cryptographic_nexus_key_987654321
FRONTEND_URL=http://localhost:3000
```
Run development server:
```bash
npm run dev
```

### 2. Launch Frontend Client
In a new shell terminal tab:
```bash
cd ../frontend
npm install
```
Configure environment variables: Create a `.env` file containing:
```env
VITE_API_URL=http://localhost:5000/api
```
Run development client:
```bash
npm run dev
```
Open `http://localhost:3000` inside your preferred browser.

---

## 🌐 Deploying Standalone to Render

Deploying **Community Nexus** on Render is smooth and takes only a few clicks!

### Step A: Push to GitHub
1. Create a raw GitHub repository named `community-nexus`.
2. Push your code:
```bash
git init
git add .
git commit -m "feat: complete startup-grade Community Nexus MVP"
git remote add origin https://github.com/your-username/community-nexus.git
git branch -M main
git push -u origin main
```

### Step B: Deploy Backend API on Render
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your `community-nexus` GitHub repository.
3. Configure settings:
   - **Name**: `community-nexus-backend`
   - **Language/Runtime**: `Node`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Expand **Advanced** -> **Environment Variables** and add:
   - `PORT`: `10000` (Render configures default port)
   - `MONGODB_URI`: *Your secure MongoDB Atlas connections URI*
   - `JWT_SECRET`: *Any secure cryptographic key*
   - `FRONTEND_URL`: *Will be updated to client's hostname after client is deployed*
5. Click **Deploy Web Service** and copy the resulting Service Address (e.g., `https://community-nexus-backend.onrender.com`).

### Step C: Deploy Frontend on Render
1. Click **New +** -> **Static Site**.
2. Select your `community-nexus` GitHub repository.
3. Configure settings:
   - **Name**: `community-nexus-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. Expand **Environment Variables** and define:
   - `VITE_API_URL`: `https://community-nexus-backend.onrender.com/api` (The backend service address you copied)
5. Click **Deploy Static Site**! Once active, copy the URL and update the `FRONTEND_URL` environment variable on your backend dashboard.
