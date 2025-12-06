# Codebase Context & Documentation

This document provides a comprehensive overview of the `articlebuildertophealth` software. It details the architecture, core functionalities, database schema, and key workflows to ensure any developer or stakeholder can understand the system's context.

## 1. Project Overview

**Name:** Article Builder Top Health
**Purpose:** A specialized Content Management System (CMS) and Funnel Builder designed for high-conversion health & wellness advertorials and quizzes. It leverages AI to generate structured articles from raw text and includes a robust quiz builder for lead qualification.

**Tech Stack:**
-   **Framework:** Next.js 16.0.3 (App Router)
-   **Language:** TypeScript
-   **Styling:** Tailwind CSS v4, Framer Motion (animations), Lucide React (icons)
-   **Database & Auth:** Supabase (PostgreSQL + Auth)
-   **AI Engine:** Google Gemini (`gemini-flash-latest`)
-   **Content Editor:** Tiptap (Headless WYSIWYG editor)
-   **UI Primitives:** Radix UI (via `components/ui/`)

## 2. Directory Structure

```text
/app
  /admin        # Protected admin interface (Login, Dashboard, Editors)
    /articles   # Article management (Create, Edit, Delete)
    /create     # AI Article Generation page
    /quizzes    # Quiz management (Builder, Analytics)
  /api          # Next.js API Routes (Backend logic)
    /auth       # Login/Logout handlers
    /generate-article # AI generation endpoint
    /upload     # File upload handlers
  /articles     # Public-facing article pages (Dynamic routing [slug])
  /quiz         # Public-facing quiz pages (Dynamic routing [slug])
  /disclaimer   # Static legal/disclaimer page
  /components   # React components
    /admin      # Admin-specific components (Editors, Sidebars)
    /homepage   # Landing page specific components (Charts, Visuals)
    /ui         # Reusable UI primitives (Buttons, Inputs, Modals)
  /lib, /utils  # Helper functions and Supabase clients
  /supabase     # Database migrations and SQL setup
```

## 3. Core Workflows

### A. Authentication
-   **Mechanism:** Supabase Auth (Email/Password).
-   **Flow:**
    -   Login page at `/admin/login`.
    -   API Route `/api/auth/login` handles credentials using `supabase.auth.signInWithPassword`.
    -   Middleware (`middleware.ts` - implied) or Layout checks protect `/admin` routes.

### B. AI Article Generation
This is a key feature allowing rapid content creation.
1.  **Input:** Admin enters "Raw Text" (e.g., a rough draft or copy), optionally selects a Facebook Pixel ID and CTA URL.
2.  **Process (`/api/generate-article`):**
    -   The system constructs a prompt for Google Gemini AI.
    -   **Strict Rules:** The AI is instructed *not* to rewrite content but to format it into semantic HTML, extract a Title/Subtitle, generate "Key Takeaways," and simulate realistic "Facebook Comments."
3.  **Output:** A JSON object containing the structured article data is returned and saved to the `articles` table in Supabase.
4.  **Result:** The user is redirected to the editor to refine the generated content.

### C. Article Editing & Viewing
-   **Editor:** Custom Tiptap implementation (`components/admin/ArticleEditor.tsx` & `LiveArticleEditor.tsx`).
    -   **Live Preview:** Toggle between "Desktop" and "Mobile" views to ensure responsiveness.
    -   **Bubble Menu:** Quick formatting (Bold, Italic, Headings).
    -   **Floating Menu:** Insert images or new blocks.
-   **Public View (`/articles/[slug]`):**
    -   Renders the article with a "Cinematic Hero" section.
    -   Injects Marketing Scripts: Facebook Pixel (`PixelTracker`) and URL Parameter preservation (`UrlPreserver`) for ad tracking.
    -   **Social Proof Elements:**
        -   `FBComments`: Simulates a Facebook comment thread for credibility.
        -   `TrustBadge` / `AuthorityBadge`: Visual cues for medical review.

### D. Quiz/Funnel Builder
A sophisticated module for creating interactive quizzes to qualify leads before they see an offer.
-   **Structure:**
    -   **Quizzes:** Main configuration (Colors, logic, settings).
    -   **Slides:** Individual steps (Text Choice, Image Choice, Multi-select, Info, Loading, Results).
    -   **Logic:** Conditional branching based on user answers.
-   **Preview:** The builder (`/admin/quizzes/[id]`) includes a real-time mobile preview to test flow and logic.
-   **Public Interface:** Steps through slides, collects answers, and submits to `quiz_responses`.

## 4. Database Schema (Supabase/PostgreSQL)

### `articles` Table
Stores the content for the advertorials.
-   `id`: UUID (Primary Key)
-   `slug`: Text (Unique URL identifier)
-   `title`, `subtitle`: Text
-   `content`: Text (HTML Body)
-   `key_takeaways`: JSONB (Array of summary points)
-   `comments`: JSONB (Array of simulated comments)
-   `pixel_id`: Text (Facebook Pixel ID for this specific article)
-   `cta_url`: Text (Where the main button links to)
-   `author`, `reviewer`, `date`: Metadata for credibility.

### `quizzes` Table
Configuration for quiz flows.
-   `slug`: URL identifier.
-   `settings`: JSONB (Theme colors, progress bar options).
-   `status`: 'draft', 'published', 'archived'.

### `quiz_slides` Table
The building blocks of a quiz.
-   `type`: 'text-choice', 'image-choice', 'results', etc.
-   `content`: JSONB (Question text, options, image URLs).
-   `conditional_logic`: JSONB (Rules for when to show this slide).
-   `slide_order`: Integer.

### `quiz_responses` Table
User submissions.
-   `session_id`: specific session tracker.
-   `answers`: JSONB (The user's selections).

## 5. Key UI/UX Components

### Interactive & Educational Components (Homepage/Landing)
These components are designed to engage users and explain complex health topics simply.
-   **`VoicesCarousel.tsx`**: A testimonial slider featuring "Real women. Real stories." Includes hover effects to pause and read quotes.
-   **`MythBuster.tsx`**: A set of interactive flip cards that contrast a "Common Myth" with "Medical Reality."
-   **`ScienceExplainer.tsx`**: An accordion-style component that expands to show definitions and animated diagrams (e.g., gut bacteria moving, visual comparisons).
-   **`BodyMap.tsx`, `EstrogenCliff.tsx`**: Data visualizations likely used to illustrate health concepts like hormone decline.
-   **`EditorialFooter.tsx`**: A specialized footer different from the main one, emphasizing "Editorial Standards," "Medical Review Board," and including HIPAA/SSL trust badges.

### Marketing & Social Proof
-   **`CinematicHero.tsx`**: A visually striking header component with background images and overlay text.
-   **`FBComments.tsx`**: Mimics the design of a Facebook comment thread to increase trust (Social Proof).
-   **`AuthorityBadge.tsx`, `TrustBadge.tsx`**: Visual indicators of medical review ("Medically Reviewed by Dr. X").

### Admin Tools
-   **`GenerationOverlay.tsx`**: A loading screen with progress steps (Analyzing -> Structuring -> Finalizing) used during AI generation.
-   **`LiveArticleEditor.tsx`**: The core content editing interface with real-time preview toggles.

## 6. Configuration & Environment

The application relies on the following environment variables:
-   `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
-   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase public API key.
-   `GEMINI_API_KEY`: Google AI Studio key for generation.
-   `NEXT_PUBLIC_SITE_URL`: Base URL for the production site.

## 7. Setup & Run

1.  **Install Dependencies:** `npm install`
2.  **Database Setup:** Run SQL migrations in `supabase/migrations` via Supabase dashboard.
3.  **Environment:** Configure `.env.local` with keys.
4.  **Dev Server:** `npm run dev`
