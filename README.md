# Make Me A Wizard - Cloudflare Workers App

A minimal Cloudflare Workers application built with TypeScript.

## Features

- **Static Webpage**: Serves a beautiful "Hello, World!" page at the root route (`/`)
- **API Endpoint**: Returns JSON response at `/api/demo` with the message "Hello, World!"

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Cloudflare account

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Deploy to Cloudflare Workers:
```bash
npm run deploy
```

## Routes

- `GET /` - Serves a static HTML page with "Hello, World!"
- `GET /api/demo` - Returns JSON: `{"message": "Hello, World!"}`
- Any other route returns a 404 Not Found

## Development

The application uses:
- **TypeScript** for type safety
- **Wrangler** for Cloudflare Workers development and deployment
- **Cloudflare Workers** runtime for edge computing

## Project Structure

```
├── src/
│   └── index.ts          # Main worker code
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── wrangler.toml         # Cloudflare Workers configuration
└── README.md            # This file
```
