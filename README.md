# TrendPulse Basic Auth App

A very basic project with signup/login pages and MongoDB connectivity.

## Features
- User signup page
- User login page
- MongoDB user storage
- JWT-based protected dashboard page

## Tech Stack
- Node.js
- Express
- MongoDB with Mongoose
- Vanilla HTML/CSS/JS frontend

## Setup
1. Install dependencies:
   npm install
2. Create environment file:
   Copy `.env.example` to `.env`
3. Update `.env` values, especially `MONGO_URI` and `JWT_SECRET`
4. Run server:
   npm start

Server runs at:
- http://localhost:5000

Pages:
- Signup: http://localhost:5000/signup.html
- Login: http://localhost:5000/login.html
- Dashboard: http://localhost:5000/dashboard.html

## API Endpoints
- POST `/api/auth/signup`
- POST `/api/auth/login`
- GET `/api/auth/me` (Protected, Bearer token required)
- GET `/api/health`
