# Steam Game Monitor

A robust, engineering-grade web application to monitor Steam game updates and player counts.

## Features

- **Real-time Monitoring**: Tracks game updates and current online player counts.
- **Automated Checks**: Automatically refreshes every 5 minutes.
- **Notifications**: Supports both in-page popups and system-level desktop notifications (via Service Worker).
- **Data Persistence**: Automatically saves your monitored game list to local storage.
- **Batch Operations**: Support for adding single games or batch importing via App IDs.
- **Export**: Export your monitored list to CSV.
- **Modern Tech Stack**: Built with React, TypeScript, Vite, Tailwind CSS, and Zustand.

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)

### Installation

1. Open a terminal in this directory.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally (Development)

To run the application with the development server (includes API proxy):

```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

### Building for Production

To create a production build:

```bash
npm run build
```

### Note on CORS

This application uses Steam APIs which do not support Cross-Origin Resource Sharing (CORS) for browser-based applications.

- **Development**: The included Vite server is configured to proxy requests to Steam, bypassing CORS issues transparently.
- **Production/Preview**: If you deploy this as a static site, you may need to use a CORS proxy (like `cors-anywhere`) or configure a backend proxy. The application includes fallback logic to attempt using a public demo proxy if direct requests fail.

## Project Structure

- `src/store`: State management (Zustand).
- `src/services`: API interactions and Notification logic.
- `src/components`: UI components.
- `public/sw.js`: Service Worker for system notifications.
