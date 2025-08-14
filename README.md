# FitVenture

**FitVenture** is a social fitness challenge platform that allows users to create, join, and track fitness challenges with real-time progress updates.  
It integrates with **Strava** to automatically sync user activities (running, walking, hiking, cycling, etc.) and calculate challenge progress.

---

## Features

- **User authentication & profiles** (JWT-based auth)
- **Create & join challenges** with different activity metrics (steps, distance, time, elevation, calories)
- **Live leaderboard** for each challenge
- **Strava integration** for automatic activity syncing
- **Manual activity sync** via Strava API
- **Responsive UI** built with React & TailwindCSS
- **RESTful API** built with Node.js, Express, and MongoDB

---

## Architecture

FitVenture is a **full-stack JavaScript application** consisting of:

**Frontend:**
- React + Vite + TailwindCSS
- Axios for API requests
- React Router for navigation

**Backend:**
- Node.js + Express.js
- MongoDB + Mongoose
- JWT authentication
- RESTful API design

**Integration Services:**
- Strava API for activity tracking
- Secure token storage & refresh handling
- Activity normalization for multiple challenge types

---

## Security & Privacy

- **Access tokens** from Strava are stored encrypted in the database.
- **Refresh tokens** are automatically used to obtain new access tokens when expired.
- **User data** is protected by authentication middleware and role-based access control.
- **Only authenticated users** can connect their Strava accounts and sync activities.
- All environment-specific values (API keys, secrets) are stored in `.env` files and **never committed to version control**.

---

## Installation & Setup

### 1️ Clone the Repository
```bash
git clone https://github.com/lagandrama/fitventure.git
cd fitventure
```

### 2️ Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```
Edit `.env` with your environment-specific values:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/fitventure
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173

STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_REDIRECT_URI=http://localhost:5000/api/strava/callback
```
Run backend server:
```bash
npm run dev
```

### 3️ Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env
```
Edit `.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```
Run frontend dev server:
```bash
npm run dev
```

---

## Strava Integration Workflow

1. **User connects Strava**  
   - Frontend sends the JWT to backend `/strava/connect`
   - Backend redirects to Strava OAuth page with a signed `state` token.

2. **OAuth callback**  
   - Strava redirects to `/strava/callback` with an authorization code.
   - Backend exchanges the code for access & refresh tokens and stores them securely.

3. **Activity Sync**  
   - Triggered manually (`/integrations/strava/sync`) or automatically.
   - Fetches activities between challenge start & end dates.
   - Filters by challenge type and updates `ChallengeProgress`.

---

## API Endpoints (Strava-related)

| Method | Endpoint                                | Description |
|--------|-----------------------------------------|-------------|
| GET    | `/api/strava/connect`                   | Initiate Strava OAuth flow |
| GET    | `/api/strava/callback`                  | OAuth callback handler |
| GET    | `/api/strava/status`                    | Check if Strava is connected |
| POST   | `/api/integrations/strava/sync`         | Sync activities for a specific challenge |
| POST   | `/api/strava/disconnect`                | Disconnect Strava account |

---

## Testing

- Backend routes tested using **Insomnia** / **Postman**
- Frontend tested in **Chrome** and **Firefox**
- MongoDB tested locally with **Compass**
- Strava API tested in both sandbox and live modes

---

## Deployment

### Backend:
- Deploy to services like **Heroku**, **Render**, or **Vercel** (Node backend).
- Set all environment variables securely in the hosting platform.

### Frontend:
- Build and deploy using **Vercel**, **Netlify**, or **Cloudflare Pages**.
```bash
npm run build
```

---

## License

This project is licensed under the **MIT License** — you are free to use, modify, and distribute it with attribution.

---

## Contact

susacsrecko@gmail.com  
