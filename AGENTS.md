# Cognitive Platform Integration Guide (v1.0)

This document describes the technical architecture and integration process for the "Cognitika" platform, intended for other AI agents and developers.

## 1. Tech Stack
- **Frontend**: React (Vite) + Tailwind CSS + Framer Motion.
- **Backend (Real-time)**: Express + Socket.io.
- **Backend (Storage)**: Firebase Firestore + Firebase Auth.
- **Database Architecture**: NoSQL (Document-based).

## 2. Firebase Integration Process
To synchronize with the existing database, follow these steps:

### Configuration
The project uses `firebase-applet-config.json` for client-side configuration.
- **SDK Initialization**: See `src/lib/firebase.ts`.
- **Database Region**: `us-west1` (default for current environment).

### Data Schema (Firestore)
The source of truth for schemas is `firebase-blueprint.json`.
- **`feedback` collection**:
  - `userId`: String (Auth UID)
  - `userName`: String
  - `content`: String (Max 5000 chars)
  - `type`: Enum (idea, bug, improvement, other)
  - `status`: Enum (new, reviewed, resolved)
  - `createdAt`: serverTimestamp()

### Security Rules
Rules are defined in `firestore.rules`.
- **RBAC**: Admin check is performed via `request.auth.token.email`.
- **Validation**: All writes MUST pass through `isValid[Entity]` helper functions.
- **Immutability**: `userId` and `createdAt` are immutable after document creation.

## 3. Server Configuration (Full-Stack)
- **Port**: 3000 (Hardcoded infrastructure requirement).
- **Socket.io**: Used for the "Cognitive Flow" real-time chat.
- **Production-ready**: The `server.ts` handles both API routes and static serving of the Vite build.

## 4. Development Workflow
1. Declare new environment variables in `.env.example`.
2. Update `firebase-blueprint.json` BEFORE modifying Firestore logic.
3. Deploy rules using `deploy_firebase` tool after structural changes.
4. Use `handleFirestoreError` (standard pattern) to decorate errors for easier debugging.

---
*Created by Gemini AI for Sergei Borisovich Bogorad.*
