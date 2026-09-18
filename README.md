# Tabsy Frontend

Progressive Web App (PWA) client for **Tabsy** (Expense Manager) built with React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, and TanStack React Query.

## Repositories

- **Backend**: https://github.com/dhairya9925/tabsy-backend
- **Frontend**: https://github.com/dhairya9925/tabsy-frontend (This repo)
- **Mobile**: https://github.com/dhairya9925/tabsy-mobile

## Features

- **Dashboard & Spending Pace**: Visual breakdown of personal spending, monthly pace, and quick actions.
- **Expense Management**: Multi-currency expense entry, personal expense logs, category filtering, and itemization.
- **Groups & Shared Living**: 5 group archetypes with support for monthly household ledgers, automated clearing calculations, and disbursements.
- **Friends & Settlements**: 1-on-1 expense tracking, friend requests, and balance settling.
- **Modern UI/UX**: Crafted with Tailwind CSS and Radix UI / shadcn/ui, featuring dark/light themes and responsive design.
- **PWA Ready**: Offline caching, installable web application, and mobile-optimized interactions.

## Getting Started

### Prerequisites

- Node.js 18+
- npm (or bun / pnpm)

### Local Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/dhairya9925/tabsy-frontend.git
   cd tabsy-frontend
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   # Ensure VITE_API_URL points to your backend instance (e.g. http://localhost:8000)
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser at `http://localhost:8080` (or the port indicated in your console).

### Building for Production

```bash
npm run build
npm run preview
```

### Running Tests

```bash
npm test
```
