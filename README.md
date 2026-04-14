# Drops Gallery

Astro + PocketBase project for hosting content creator galleries.

## Stack

- **Frontend**: Astro 5 (Node.js adapter)
- **Backend**: PocketBase (embedded database)
- **Database**: SQLite (included)

## Quick Start

```bash
# Install dependencies
pnpm install

# Start PocketBase
./pocketbase serve

# In another terminal, start Astro dev
pnpm dev
```

## Development

```bash
# Dev server (port 4321)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Environment

Create `.env`:

```
POCKETBASE_URL=http://127.0.0.1:8090
```

## Deployment

### Docker

```bash
docker build -t drops-gallery .
docker run -p 4321:4321 drops-gallery
```

### Coolify

See `docs/coolify-astro.md` and `docs/coolify-pocketbase.md` for detailed deployment guides.