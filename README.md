# Socratic IDE

An AI-powered code mentoring platform utilizing Gemini 2.5 Flash.

## Tech Stack

### Languages

This project is written fully using **TypeScript**, as the ultimate main goal of this project is for me to be more comfortable working with **TypeScript**.

### Backend (API Server)

- **Node.js with Hono**: Natively supports TypeScript for backend development.
- **Drizzle ORM**: Type-safe database querying and schema migrations.
- **Better Auth**: Comprehensive Identity and Access Management (IAM) with identity consolidation.
- **Zod**: Cyptographically strict runtime type validation for API payloads.

### Infrastructure & AI

- **MySQL 8.0**: Relational, persistent state storage (Dockerized). Database schema is in **OLTP 3NF form**.
- **Google GenAI SDK**: Streaming the `gemini-2.5-flash` model for high-speed mentoring.

### Frontend (Web Client)

- **React 19 & Vite**
- **Tailwind CSS v4**
- **Monaco Editor**: The core engine powering VS Code, embedded for the IDE experience.
- **Zustand & Immer**: Global state management.
- **React Markdown**: AST-based markdown parsing for structured, aesthetic AI outputs for better UX.

## System Requirements

- Node.js (v18+)
- Docker & Docker Compose (For MySQL container)
- A Gemini API Key
- A GCP OAuth Client
- A Github OAuth Application (for Better Auth)

## Quick Start

### 1. Provision the Infrastructure

- In the root directory, spin up the isolated **MySQL database** using **Docker**. This will map to port 3306 and persist data in a local volume.

```bash
docker-compose up -d
```

---

### 2. Configure the Environment

- We must first configure the `.env` file in both the `/backend` and `/frontend` directory.

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

> Open both new .env files and populate GEMINI_API_KEY, BETTER_AUTH_SECRET, GitHub OAuth credentials, and Google OAuth credentials.

> Notice that since we ran `docker-compose up -d`, you can just leave the database URL as it is.

### Getting the credentials

#### Gemini API Key

- Go to [Google AI Studio](https://aistudio.google.com) -> Press the **"Get API Key"** at the bottom left corner.

#### Better Auth Secret

- To generate a secure secret, run this in your terminal: `npx @better-auth/cli secret` or `openssl rand -base64 32`

#### Github OAuth Client ID & Secret

- Open [Github](https://github.com)
- Press **Profile** on the Top Right Corner, then **"Settings"** -> **"Developer Settings"** -> **OAuth Apps** -> **New OAuth App**

#### Google OAuth Client ID & Secret

- Open the [Google Developer Console](https://console.developers.google.com)
- Create a new project if you haven't already.
- Open the **navigation menu** (top left corner) -> **APIs & Services** -> **Credentials**
- **Setup** the **OAuth Consent Screen** if you haven't already -> Lastly, in **"credentials"** -> **Create credentials** -> **OAuth client ID**

---

### 3. Install Dependencies

We need to install the required packages for both the `/frontend` and `/backend` workspaces. In your root directory:

```bash
npm install
```

---

### 4. Database Migration

Push the Drizzle schema to your newly created MySQL container to provision the tables. First, you need to work on the `/backend` directory:

```bash
cd backend
npx drizzle-kit generate
npx drizzle-kit migrate
cd ..
```

---

### 5. Ignite the Web App

Boot the frontend Vite server and the backend Node/Hono server **concurrently** in the root directory:

```bash
npm run dev
```

Boom! the site is now live at `http://localhost:5173`
