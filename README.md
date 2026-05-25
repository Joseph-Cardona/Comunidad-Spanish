# Comunidad
By Joseph Cardona and Luke Winterlin for the Synthesis Hacks Hackathon

**"Learn Spanish with a Community of Learners"**

## Project Overview

Comunidad is a modern, collaborative language-learning platform designed to help users master Spanish while building connections with their online community. It combines a structured learning path with social features like a group chat and a collaborative "Board" for sharing notes and tips.

The application is built with a sleek, rounded aesthetic inspired by modern educational tools, featuring custom branding, themed scrollbars, and a responsive interface.

## Key Features

- **Learning Path:** Progress through units and levels with interactive lessons, practice sessions, and quizzes.
- **The Board:** A collaborative space where learners can post "pegs" (notes) with titles and content, and comment on each other's posts to share knowledge.
- **Chat Feed:** A global group chat for learners to share their daily progress and interact.
- **Leaderboard:** Compete with others in your community based on XP earned through lessons.
- **Dual Portal System:** Separate portals for **Learners** and **Administrators**, including a secret-gate security feature for admin account creation.

## Technology Stack

### Frontend
- **Framework:** [Svelte](https://svelte.dev/) - For building a fast, reactive, and component-based UI.
- **Build Tool:** [Vite](https://vitejs.dev/) - For lightning-fast development and optimized production builds.
- **HTTP Client:** [Axios](https://axios-http.com/) - For handling API requests to the backend.
- **Icons/Graphics:** Custom SVG branding and themed assets.

### Backend
- **Runtime:** [Node.js](https://nodejs.org/)
- **Web Framework:** [Express](https://expressjs.com/) - For building a robust RESTful API.
- **Authentication:** [JSON Web Tokens (JWT)](https://jwt.io/) - For secure user sessions.
- **Security:** [bcryptjs](https://www.npmjs.com/package/bcryptjs) - For industry-standard password hashing.
- **Middleware:** [CORS](https://www.npmjs.com/package/cors) and [dotenv](https://www.npmjs.com/package/dotenv).

### Database & Hosting
- **Database:** [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - Used during initial local development.

## Credits & Tools

This project was built using the following tools and resources:

- **Styling:** Custom Vanilla CSS for a lightweight and highly tailored design.
- **Fonts:** "Din Round" aesthetic for an approachable, educational feel.
- **Development Environment:** [Gemini CLI](https://github.com/google-gemini/gemini-cli) - An interactive AI agent specializing in software engineering.
- **Database Management:** [SQLite](https://sqlite.org/)

---
