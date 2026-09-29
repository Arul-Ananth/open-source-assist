# PR checklist

### Copy / replace

Copy every file from the ZIP to the same path in `Aaqil-version-` and replace existing files when the path already exists.

### Delete

Delete the file listed in `_DELETE_FILES.txt`.

### Migration

```powershell
uv run alembic upgrade head
```

Set the first admin directly in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';
```

### Verify

```powershell
uv run pytest
cd frontend
npm run build
```

Then sign in as the manually-promoted admin and open `/admin`.

### Expected result

- Users page reads/writes the PostgreSQL `users` table.
- A new signup is stored as `role='user'`.
- Only `role='admin'` can use administrator endpoints.
- Forum threads, replies, and bans persist in PostgreSQL.
- Events persist in PostgreSQL.
- Public Events reads backend data and cannot create events.
- No event/forum demo data is stored in browser localStorage.
