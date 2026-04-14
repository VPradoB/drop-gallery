# Deploying the Astro Frontend on Coolify

## Service Configuration

| Setting | Value |
|---------|-------|
| Service type | Dockerfile (build from repo) |
| Build pack | Dockerfile *(located in the project root)* |
| Internal port | `4321` |
| Domain | `drops.gallery` *(replace with your domain)* |

## Required Environment Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `POCKETBASE_URL` | `http://[pocketbase-service-name]:8090` | Replace `[pocketbase-service-name]` with the exact internal service name Coolify assigned to your Pocketbase service |

### How to find the internal service name

In Coolify, open your Pocketbase service → **General** tab → look for the **Service Name** or **Internal DNS** field. Use that value as the hostname in `POCKETBASE_URL`.

## Private Network Requirement

Both the Astro frontend and the Pocketbase service **must be attached to the same Coolify private network** for the internal DNS hostname to resolve.

Steps:
1. In Coolify, go to **Networks** (or **Private Networks**).
2. Create a private network (e.g. `drops-internal`) if one does not exist.
3. Attach both services to that network before deploying.

Without a shared network, `POCKETBASE_URL` will fail to resolve and the frontend will return errors.

## Health Check

```
GET /
```

Expected response: `200 OK`. Coolify uses this to confirm the Astro server is up.

## SSL

Coolify handles SSL automatically via **Let's Encrypt** through its built-in Traefik reverse proxy. No manual certificate management is needed — just point your DNS records to the Coolify server IP and deploy.

## Startup Order

Deploy Pocketbase first and wait for it to report healthy before deploying or restarting the Astro frontend. If Astro starts before Pocketbase is ready it will return `503` on the first request — this resolves automatically once Pocketbase is healthy.
