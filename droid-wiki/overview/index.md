# Kognitika overview

Kognitika is a private React/Express platform for cognitive training. It provides interactive brain trainers grouped into three domains: Base (attention and memory), Engineering (systems thinking), and Mind-Guard (critical thinking). The platform uses Brain ID as the primary identity system and keeps all user data in PostgreSQL via Prisma.

## Training domains

- **Base** -- core cognitive skills: attention, memory, speed, and reaction. Includes Schulte tables, N-Back, Stroop test, mental math, spatial memory, and typing speed.
- **Engineering** -- systems thinking and analytical reasoning: logical sequences, numerical analysis, topology memory, collision detection, and async task management.
- **Mind-Guard** -- critical thinking and information hygiene: language scanning, decryption, reality checking, and noise reduction. Trains users to detect manipulation, separate facts from emotions, and verify information authenticity.

## Architecture overview

The system follows an event-driven architecture (EDA). The frontend is a React single-page application built with Vite and TypeScript. The backend is an Express server with Socket.io for real-time features. Data is stored in PostgreSQL and accessed through Prisma.

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser / Capacitor)             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              React App (Vite + TypeScript)            │   │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐  │   │
│  │  │  Auth   │ │ Trainers │ │Analytics │ │  Duel   │  │   │
│  │  │ (Brain  │ │ (useXxx  │ │ (Profile,│ │ (Socket │  │   │
│  │  │   ID)   │ │  Engine) │ │  Export) │ │  .io)   │  │   │
│  │  └─────────┘ └──────────┘ └──────────┘ └─────────┘  │   │
│  └──────────────────┬───────────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────────┘
                      │ HTTP / WebSocket
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Express + Socket.io Server                  │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │  Auth    │ │  Routes  │ │  Socket  │ │  Middleware   │   │
│  │ (JWT)    │ │ (API)    │ │ (Duels)  │ │ (CORS, Rate  │   │
│  │          │ │          │ │          │ │  Limit,      │   │
│  │          │ │          │ │          │ │  Privacy)    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│                        │                                     │
│                        ▼                                     │
│                  ┌──────────┐                                │
│                  │  Prisma  │                                │
│                  │   ORM    │                                │
│                  └────┬─────┘                                │
└───────────────────────┼───────────────────────────────────────┘
                        │ SQL
                        ▼
              ┌──────────────────┐
              │   PostgreSQL 15  │
              │  (User data,     │
              │   sessions,      │
              │   leaderboard)   │
              └──────────────────┘
```

The client (browser or Capacitor mobile app) communicates with the Express server over HTTP for API calls and over Socket.io for real-time duel sessions. The server handles authentication via JWT-signed Brain ID tokens, validates requests through middleware, and persists data to PostgreSQL through the Prisma ORM.

## Identity

Brain ID is the sole public authentication method. Users receive a brainId on registration, and the platform does not expose raw Brain IDs, email addresses, or tokens in API responses. Email and password fields exist only for legacy administrative access and are gated behind explicit configuration flags.

## Privacy

All analytics data exports strip personally identifiable information before they leave the server. The export endpoint at `src/server/routes/analytics.ts` is verified by `src/tests/analytics-export-privacy.test.ts` to ensure no Brain ID, email, token, or password data leaks. The security boundary tests are documented in SECURITY.md and enforced in CI.

## Mobile

The platform runs in browsers and as a native Android app via Capacitor 8. A debug APK is published on every push to main as a rolling release. Signed App Bundles for Play Console are built manually through the Android Native Build workflow.

## Key numbers

- 30+ trainer modules across 3 domains
- 357 tests across 84 files (Vitest)
- 12 Prisma models for user data, sessions, analytics, and social features
- Single monorepo with pnpm workspace
- 3 CI/CD workflows: CI, Deploy, Android
