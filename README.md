# OpenSource Assist — backend-integrated admin panel PR patch

This patch is prepared for the existing `Aaqilmm/Aaqil-version-` repository structure. Copy each file into the same path in your repository and delete the file listed in `_DELETE_FILES.txt`.

## What this replaces

The admin ZIP you reviewed used browser-local storage for forum threads, forum bans, and events. This patch removes that dependency completely.

- Users → PostgreSQL/FastAPI admin API.
- Roles → persistent `users.role`; new signups are explicitly `role="user"`.
- Admin access → database role checked by FastAPI on every admin request.
- Forum → PostgreSQL tables and FastAPI routes.
- Forum bans → PostgreSQL-backed moderation records.
- Events → PostgreSQL tables and FastAPI routes.
- Public Events → read-only backend data.
- Public dashboard → no Add Event action.

## Files to copy

Use the exact repository paths from the patch. Do not copy `node_modules` or `dist`; they are intentionally absent from this patch.

## Database migration

Run:

```powershell
uv run alembic upgrade head
```

Then assign the first administrator directly in PostgreSQL:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

No environment-variable admin override is used.

## Frontend

From `frontend/`:

```powershell
npm install
npm run build
```

Then log in with the database-backed admin account and open:

```text
/admin
```

## Important

The patch intentionally keeps the repository's existing authentication, dashboard, theme, learning, roadmap, explore, chatbot, and other modules intact. Only the files listed in this patch are intended to change for the admin-panel work.
