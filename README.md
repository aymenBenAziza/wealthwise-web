# WealthWise Web

WealthWise Web is the web version of the WealthWise personal finance application. It is built with React, Node.js, Express, and MySQL, and it is designed to work against the same database schema used by the Java desktop version.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MySQL
- Authentication: JWT
- Password hashing compatibility: MD5 (to match the desktop app)
- AI integration: Groq

## Modules

### Module 1 - User Management
- Register and login
- JWT-based protected routes
- User profile page
- Edit name, monthly income, currency, language, avatar URL, and bio

### Module 2 - Transaction Management
- Create, edit, delete transactions
- Income and expense support
- Custom categories
- Filter and search transactions

### Module 3 - Budget Management
- Create, edit, delete monthly budgets
- Monthly usage tracking
- Remaining amount and usage percentage

### Module 4 - Savings Goals
- Create, edit, delete savings goals
- Add goal contributions
- Progress and remaining amount tracking
- Goal history display

### Module 5 - Analytics and AI
- Monthly analytics report
- Income vs expense trend chart
- Expense category breakdown
- AI assistant
- Coach notes
- What-if simulation
- Report generation and print support
- Groq-backed AI responses with fallback behavior

### Module 6 - Notifications and Announcements
- Notification inbox
- Mark one or all notifications as read
- Budget alert notifications
- Savings goal achievement notifications
- Admin announcements
- Header unread badge

## Project Structure

```text
wealthwise-web/
  client/   React application
  server/   Express API
```

## Shared Database

This web app is intended to use the same MySQL database as the desktop application.

Important compatibility note:
- the web backend uses MD5 hashing because the desktop app already uses MD5
- this keeps login compatibility across desktop and web
- MD5 is not suitable for production-grade security, but it is used here to preserve compatibility with the existing project

## Prerequisites

- Node.js 18+
- npm
- MySQL running locally
- existing `wealthwise` database schema

## Environment Variables

### Server

Create `server/.env`:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d
DB_HOST=localhost
DB_PORT=3306
DB_NAME=wealthwise
DB_USER=root
DB_PASSWORD=
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

### Client

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Install and Run

### Backend

```bash
cd server
npm install
npm run dev
```

### Frontend

```bash
cd client
npm install
npm run dev
```

## Default URLs

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:5000/api](http://localhost:5000/api)

## Main Pages

- `/login`
- `/register`
- `/dashboard`
- `/transactions`
- `/budgets`
- `/savings-goals`
- `/analytics`
- `/notifications`
- `/profile`

## Notes

- The web app is designed around the same MySQL schema as the desktop version.
- Analytics and notification behavior depend on real data in the shared database.
- Groq AI features require a valid API key in `server/.env`.
- Report printing uses the browser print flow.

## Suggested Manual QA

- Register and login
- Edit profile fields and confirm persistence
- Create categories and transactions
- Create budgets and verify usage updates
- Create savings goals and add contributions
- Generate analytics report and test the AI assistant
- Print the analytics report
- Trigger notifications from budgets and savings goals
- Send an admin announcement

## Future Improvements

- Replace MD5 with a stronger shared password migration strategy
- Add file upload for profile avatars
- Add automated tests for critical flows
- Improve mobile UX for dense data tables
- Add PDF export for reports
