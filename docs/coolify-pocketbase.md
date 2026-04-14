# Deploying Pocketbase on Coolify

## Service Configuration

| Setting | Value |
|---------|-------|
| Service type | Docker image |
| Image | `ghcr.io/muchobien/pocketbase:latest` |
| Internal port | `8090` |
| Domain | `pb.drops.gallery` *(replace with your domain)* |

## Persistent Volume

Mount a persistent volume so data survives container restarts and redeployments:

| Container path | Recommended size |
|----------------|-----------------|
| `/pb/pb_data` | 250 GB |

Configure this under **Storages** in the Coolify service settings before the first deploy.

## Environment Variables

No environment variables are required for a standard Pocketbase deployment.

## Health Check

```
GET /api/health
```

Coolify will poll this endpoint to determine when the service is ready. Expected response: `200 OK` with `{"code":200,"message":"API is healthy."}`.

## Admin UI

The Pocketbase admin dashboard is available at:

```
https://pb.yourdomain/_/
```

**Security note:** The `/_/` path is publicly reachable by default. If you want to restrict access:

- Use Coolify's **Basic Auth** middleware on the `/_/` path, or
- Add an **IP allowlist** rule in Coolify's Traefik configuration.

## First Run

On the very first deployment, visit `https://pb.yourdomain/_/` to create your admin account. Pocketbase will prompt you to set an email and password before allowing any access to the admin panel.
