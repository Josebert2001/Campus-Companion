# Campus Companion

Campus Companion is a comprehensive, AI-powered productivity platform designed to empower students in managing their academic and campus life. The application integrates assignment tracking, collaborative study rooms, AI-driven study assistance, and productivity tools into a seamless, user-friendly experience.

---

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Assignment Tracker:** Organize, track, and manage assignments with deadlines, progress indicators, and completion status.
- **AI Study Companion:** Receive instant, AI-generated answers, explanations, and study support tailored to your coursework.
- **Quick Stats & Dashboard:** Visualize academic progress, upcoming deadlines, and daily schedules in a unified dashboard.
- **Study Rooms:** Create or join virtual study rooms for real-time, collaborative learning and group study sessions.
- **Vision Tools:** Upload images (e.g., handwritten notes, textbook pages) for AI-powered analysis and study assistance.
- **Voice Tools:** Convert speech to text, interact with the platform using voice commands, and utilize text-to-speech for accessibility.
- **Secure Authentication:** Modern sign-up and sign-in flows to ensure data privacy and personalized experiences.
- **Responsive & Accessible UI:** Built with accessibility and mobile-first design in mind, using shadcn-ui and Tailwind CSS.

## Technology Stack

- **Frontend:** React, TypeScript, Vite
- **UI Framework:** shadcn-ui, Tailwind CSS
- **Backend & Data:** Supabase (authentication, database, edge functions)
- **AI Integrations:** Supabase Edge Functions for AI chat, vision, and voice features
- **Build Tools:** Vite, PostCSS

## Getting Started

To set up Campus Companion locally:

1. **Clone the repository:**
	```sh
	git clone https://github.com/Josebert2001/Campus-Companion.git
	cd Campus-Companion
	```
2. **Install dependencies:**
	```sh
	npm install
	```
3. **Start the development server:**
	```sh
	npm run dev
	```
4. **Configuration:**
	- Set up your Supabase project and update environment variables as needed for authentication and edge functions.

## Project Structure

- `src/` — Main source code
  - `components/` — Reusable UI and feature components
  - `pages/` — Main application pages (Dashboard, Auth, Study Rooms, etc.)
  - `hooks/` — Custom React hooks
  - `integrations/supabase/` — Supabase client and helpers
- `supabase/functions/` — Edge functions for AI, vision, and voice
- `public/` — Static assets

## Deployment

Campus Companion can be deployed to any modern hosting platform (e.g., Vercel, Netlify). Ensure your environment variables and Supabase configuration are set up for production.

## Contributing

We welcome contributions from the community! To contribute:

1. Fork the repository
2. Create a new branch for your feature or bugfix
3. Commit your changes with clear messages
4. Open a pull request describing your changes

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
