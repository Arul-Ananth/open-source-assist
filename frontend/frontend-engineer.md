# Project Specification: Open Source Project Finder

## 1. Tech Stack Requirements
*   **Framework:** React (v18+) with TypeScript.
*   **Build Tool:** Vite.
*   **Styling:** Tailwind CSS.
*   **UI Components:** shadcn/ui (configured for flat design, no glassmorphism).
*   **State Management:** Zustand or React Context (must include a global variable/store for Light/Dark mode toggling).
*   **Data Fetching:** React Query (for GitHub API interactions).
*   **Icons:** Lucide React.

## 2. Global Styling & Design System
**Crucial Rule:** NO glassmorphism. NO translucency. NO blurred backgrounds. NO dot-matrix patterns. Use only flat, opaque components with solid borders and strong drop shadows.

### Typography
*   **Primary (UI Text):** `Inter` or `Roboto` (sans-serif).
*   **Secondary (Code, Tags, Repo Names):** `JetBrains Mono` or `Fira Code` (monospace).

### Theme: Dark Mode (Default)
Must be triggered by a `.dark` class on the `<html>` or `<body>` element.
*   **Background:** `#0D1117` (Deep, syntax-theme style).
*   **Surface/Card Background:** `#161B22` (Solid, opaque).
*   **Primary Text:** `#E6EDF3` (High readability).
*   **Secondary Text:** `#8B949E`.
*   **Borders:** `#30363D` (Crisp 1px solid borders).
*   **Accent Color (Primary):** `#FF8C00` (Vibrant GSSOC Orange).
*   **Accent Color (Secondary):** `#FFD700` (Warm Yellow).
*   **Shadows:** Solid offset shadows (e.g., `shadow-[4px_4px_0px_0px_rgba(255,140,0,0.5)]`).

### Theme: Light Mode
*   **Background:** `#F6F8FA` (Crisp off-white).
*   **Surface/Card Background:** `#FFFFFF` (Solid white).
*   **Primary Text:** `#1F2328`.
*   **Secondary Text:** `#656D76`.
*   **Borders:** `#D0D7DE` (Crisp 1px solid borders).
*   **Accent Color (Primary):** `#E36209` (Deep Orange).
*   **Shadows:** Hard, stark shadows (e.g., `shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]`).

## 3. Component Architecture & shadcn/ui Customization
*   **Buttons & Badges:** Modify shadcn/ui default radii to be slightly sharper (`rounded-sm` or `rounded-md`). Ensure active/hover states use solid color fills, not opacity changes.
*   **Project Cards:** Must display high information density. Include monospace tags for languages/frameworks, star/fork counts, and a prominent "Contribute" button using the primary accent color.
.

## 4. Technical Integration & Logic
*   **GitHub API:** All project cards must map data from the GitHub REST API (Stars, Forks, Open Issues, Tech Stack/Languages).
*   **Theme Toggle:** Implement a global state toggle that switches the `dark` class on the root element. Ensure this persists in `localStorage`.
*   **Filtering:** The UI must include dropdowns/selects for Language, Tech Stack, and Issue Type (e.g., `good-first-issue`).