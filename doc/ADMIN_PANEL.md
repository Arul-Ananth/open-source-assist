# Admin Panel Architecture

## Role model

The `users.role` column is the source of truth for administrator access.

- `user`: normal contributor account.
- `admin`: administrator account.

Every new signup is explicitly stored as `role="user"`.

The first administrator is assigned manually in the database. Administrators can promote or demote other accounts from the Users page. The last administrator cannot be demoted or deleted, and administrators cannot modify or delete their own account through the admin UI.

## Account moderation

`users.account_status` is separate from `role`:

- `active`
- `suspended`
- `banned`

Inactive statuses also set `is_active=false`, which prevents authentication through the existing auth dependency.

## Forum

Forum data is persisted in PostgreSQL:

- `forum_threads`
- `forum_posts`
- `forum_bans`

Forum actions use authenticated user IDs, not hard-coded usernames. Administrators can create/reply to threads, delete threads, and ban/unban non-admin users.

## Events

Event data is persisted in PostgreSQL and keeps the existing public event shape:

`id`, `name`, `type`, `date`, `time`, `mode`, `location`, `organizer`.

Only administrator endpoints can create, edit, or delete events. The public Events section only reads the API.
