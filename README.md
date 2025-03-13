# Location-Based Attendance System

A Node.js application for managing student attendance with location verification.

## Features

- Admin and Student roles
- Location-based attendance verification
- Real-time location tracking
- Geofencing for classroom boundaries
- Attendance history and reports

## Prerequisites

- Node.js >= 14.0.0
- MongoDB Atlas account
- Environment variables setup

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
SMTP_HOST=your_smtp_host
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment on Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Add environment variables in Vercel dashboard:
   - MONGODB_URI
   - SESSION_SECRET
   - SMTP_HOST
   - SMTP_USER
   - SMTP_PASS

## Project Structure

```
Attendence-/
├── controllers/     # Route controllers
├── middleware/      # Express middleware
├── models/         # Database models
├── public/         # Static files
├── routes/         # Express routes
├── utils/          # Utility functions
├── views/          # EJS templates
├── app.js          # Application entry
└── vercel.json     # Vercel configuration
```

## License

ISC 
