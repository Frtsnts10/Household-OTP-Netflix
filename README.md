# Household OTP Center

A centralized, real-time synchronization center for Netflix access codes and verification links. This project is built using Node.js (Express + SQLite) for backend services and Next.js (HeroUI + Tailwind CSS) for the frontend app.

## Key Features
- **Multi-Email Support**: Read OTPs from multiple email accounts simultaneously.
- **Custom IMAP Domain**: Support for various email providers with custom ports (e.g., `mail.alflix.id`).
- **Responsive & Modern UI**: Layout optimized beautifully for Desktop, Tablet, and Mobile screens.
- **Auto-Parsing**: Seamlessly reads both plain text formats and complex verification links.

## Project Structure

- **/app**: A Next.js frontend application featuring a modern and responsive design.
- **/services**: An Express.js backend service that automatically polls emails via IMAP to fetch the latest OTPs.

## Prerequisites
- Node.js (v18+)
- NPM

## Installation

Install all dependencies (for both `app` and `services`) at once from the root directory:
```bash
npm run install:all
```

## Environment Variables Configuration (.env)

1. Open the `services` folder.
2. Copy the `.env.example` file and rename it to `.env`.
3. Fill in your IMAP email credentials. Make sure to use an *App Password* if you are using Gmail or custom domain providers.

## Running the Application

Run the following two commands in two separate terminal tabs from the project root:

**Terminal 1 (Backend Services):**
```bash
npm run dev:services
```

**Terminal 2 (Frontend App):**
```bash
npm run dev:app
```

Open `http://localhost:3000` in your browser to view the running application.
