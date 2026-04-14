# First-Time Setup Guide

Follow these steps in order when setting up drops-gallery for the first time.

## Step-by-Step

### 1. Deploy Pocketbase on Coolify

Follow `docs/coolify-pocketbase.md`. Wait until the service status turns **healthy** before continuing.

### 2. Create the admin account

Open `https://pb.yourdomain/_/` in your browser. Pocketbase will prompt you to create the first admin account (email + password). Complete this before any other step — the admin panel is locked until an account exists.

### 3. Import the collections schema

1. In the admin panel, go to **Settings → Import collections**.
2. Open `docs/pocketbase-schema.json` from this repository and copy its entire contents.
3. Paste into the import dialog and confirm.

### 4. Verify collections were created

Navigate to **Collections** in the left sidebar. You should see two collections:

- `creators`
- `images`

If either is missing, re-import the schema from step 3.

### 5. Verify the unique index on `creators.slug`

1. Click on the **creators** collection.
2. Open the **Indexes** tab.
3. Confirm `idx_creators_slug` is listed as a unique index on the `slug` field.

If the index is absent, you can add it manually: `CREATE UNIQUE INDEX idx_creators_slug ON creators (slug)`.

### 6. Create a test creator

Using the admin UI:

1. Open the **creators** collection → click **New record**.
2. Fill in `name`, `slug`, `bio`.
3. **Explicitly set `active` to `true`** — Pocketbase `bool` fields default to `false` and the frontend filters by `active = true`.
4. Save the record.

### 7. Deploy the Astro frontend on Coolify

Follow `docs/coolify-astro.md`. Set the `POCKETBASE_URL` environment variable to the internal Coolify DNS name of your Pocketbase service (e.g. `http://pocketbase:8090`). Make sure both services share the same Coolify private network.

### 8. Verify the frontend

Open `https://drops.yourdomain` in your browser. The creator card you created in step 6 should appear. If the page is blank, check:

- `POCKETBASE_URL` is correct and resolves internally.
- The creator record has `active = true`.
- Both services are on the same Coolify private network.

### 9. (Optional) Create a bot admin account

If you plan to use the Telegram bot to manage content, create a dedicated admin account in Pocketbase for the bot:

1. Admin panel → **Settings → Admins** → **New admin**.
2. Use a separate email (e.g. `bot@drops.gallery`) and a strong generated password.
3. Store the credentials in your bot's environment secrets.

---

## Important Notes

### The `active` field defaults to `false`

Pocketbase stores `bool` fields as `false` when not explicitly set. Always toggle `active` to `true` when creating records via the admin UI or the bot API, otherwise records will be invisible to the frontend.

### Startup race condition

If the Astro container starts before Pocketbase has finished initializing, the frontend will return `503 Service Unavailable` on that first request. This is expected behavior. Astro will respond normally (`200 OK`) on subsequent requests once Pocketbase is healthy. To avoid this, deploy Pocketbase first and wait for it to be healthy before deploying or restarting Astro.
