# Crypto Simulator

Full-stack MERN crypto learning platform scaffolded for a production-oriented workflow.

## Stack

- Frontend: React, Vite, Tailwind CSS, Redux Toolkit, React Router DOM, Axios, Framer Motion, Chart.js, Socket.io client
- Backend: Node.js, Express, MongoDB Atlas, JWT, bcryptjs, Mongoose, Socket.io

## Project Structure

- `frontend/` contains the React application
- `backend/` contains the Express API and Socket.io server

## Setup

1. Install dependencies from the root:

   ```bash
   npm install
   ```

2. Copy the example environment files and fill in your values:

   - `frontend/.env.example` to `frontend/.env`
   - `backend/.env.example` to `backend/.env`

3. Start both apps in development:

   ```bash
   npm run dev
   ```

## Environment Variables

Frontend:

- `VITE_API_URL`
- `VITE_SOCKET_URL`

Backend:

- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_URL`

## Notes

- The scaffold includes protected routing, centralized error handling, reusable components, and service layers.
- Replace the sample data and placeholder AI logic with your real recommendation model or LLM integration.