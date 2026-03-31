 # StudyGroupFinder 📚

StudyGroupFinder is a modern web application designed to help students discover, create, and manage study groups. It provides a platform for collaborative learning through group chats, meeting schedules, and easy-to-use invitation codes.

## 🚀 Deployment

The project is hosted and accessible on Vercel.

## ✨ Features

-   User Authentication: Secure registration and login for both regular users and administrators.
-   Group Management:
    -   Create study groups for specific subjects with descriptions.
    -   Join groups easily using a unique 6-character Invitation Code.
    -   List of available public groups to discover new learning communities.
-   Collaboration Tools:
    -   Real-time Chat: Message system within each group for seamless communication.
    -   Meeting Scheduler: Organize and track upcoming study sessions and meetings.
-   User Profiles: Track created and joined groups.
-   Admin Dashboard: Monitor user activity, active sessions, and group statistics.

## 🛠️ Tech Stack

### Frontend
-   Framework: [React.js](https://reactjs.org/) (Vite)
-   Routing: [React Router DOM](https://reactrouter.com/)
-   Styling: Vanilla CSS with modern "Glassmorphism" design.
-   API Communication: Fetch API with centralized service management.

### Backend
-   Primary: [Flask](https://flask.palletsprojects.com/) (Python)
    -   ORM: SQLAlchemy
    -   Database: PostgreSQL
    -   Auth: JWT-based authentication
-   Secondary/Development: [Express.js](https://expressjs.com/) (Node.js)
    -   Database: JSON-based flat file storage (data.json)
    -   Auth: JWT & Bcryptjs

## 📂 Project Structure

StudyGroupFinder/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Page-level components (Login, Dashboard, etc.)
│   │   ├── services/   # API abstraction layer
│   │   └── App.jsx     # Main routing and auth logic
├── backend/            # Backend server implementations
│   ├── routes/         # Flask blueprints for Auth and Groups
│   ├── models.py       # SQLAlchemy database models
│   ├── app.py          # Flask entry point
│   ├── server.js       # Node.js Express entry point
│   └── data.json       # JSON database (for Node.js version)
└── README.md           # Project documentation
## ⚙️ Local Setup

### Frontend Setup
1. Navigate to the frontend directory:
  
   cd frontend
   
2. Install dependencies:
  
   npm install
   
3. Start the development server:
  
   npm run dev
   
### Backend Setup (Python/Flask - Preferred)
1. Navigate to the backend directory:
  
   cd backend
   
2. Install Python dependencies:
  
   pip install -r requirements.txt
   
3. Ensure PostgreSQL is running and update .env with your DATABASE_URL.
4. Run the application:
  
   python app.py
   
### Backend Setup (Node.js/Express)
1. Navigate to the backend directory:
  
   cd backend
   
2. Install dependencies:
  
   npm install
   
3. Run the server:
  
   node server.js
   
---
*Developed for collaborative student success.*