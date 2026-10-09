# FAIR Analytics — Stryker New England (Phase 1)

A deployable static GitHub Pages site with Supabase email/password login, invitation/password setup, password reset, and an access-checked dashboard shell. **No reporting data is connected yet.**

## 1. Create the GitHub repository

1. In GitHub create a public or private repo named `fairanalytics-stryker` (GitHub Pages availability depends on your plan).
2. Upload the **contents** of this folder to the repository root: `index.html`, `setup-password.html`, `dashboard.html`, `app.js`, `styles.css`, `config.js`, `.nojekyll`.
3. Go to **Settings > Pages**; set Source to **Deploy from a branch**, branch **main**, folder **/(root)**, and save.
4. When published, verify you can load `https://fairlogistic.github.io/fairanalytics-stryker/` (use *your* GitHub username/repository URL if different). Do not click an invitation link until the page is live.

## 2. Edit config.js

In Supabase **Project Settings > API Keys** get your `sb_publishable_...` key and **Connect** / Data API get the project URL. Replace the two placeholders in `config.js`. These are public browser values. **Never put a Supabase secret/service_role key or an Onfleet API key here.** Commit this edit.

## 3. Supabase authentication redirect settings

Supabase > **Authentication > URL Configuration**:
- **Site URL**: `https://fairlogistic.github.io/fairanalytics-stryker/setup-password.html` (the exact deployed setup page). This makes default Dashboard-generated invitation links land at the setup page.
- **Redirect URLs**: add these exact URLs:
  - `https://fairlogistic.github.io/fairanalytics-stryker/setup-password.html`
  - `https://fairlogistic.github.io/fairanalytics-stryker/index.html`
  - `https://fairlogistic.github.io/fairanalytics-stryker/dashboard.html`

Replace username/repo when different. Exact HTTPS URLs recommended. Keep the **Invite user** email template's default `{{ .ConfirmationURL }}` unless you have intentionally built a custom token verification flow.

## 4. Enable private invites

Supabase **Authentication > Sign In / Providers > Email**: enable Email. Turn off public signups if access should be invitation-only. **Authentication > Users > Add user > Send invitation** for a new email address.

**If your first invite already created the user**: Do not assume Supabase lets you re-invite a confirmed account. Use the login page's **Forgot your password?** with the account email after publishing and configuring redirects. The recovery email points to `setup-password.html`.

## 5. Grant territory access

Run the database creation + RLS SQL from the conversation first. Under Authentication > Users copy the user's UUID and run in SQL Editor (replace the UUID):

```sql
insert into public.territory_access (user_id, territory_id, access_role)
select 'REPLACE_WITH_REAL_UUID'::uuid, id, 'admin'
from public.territories
where customer_name='Stryker' and territory_name='New England'
on conflict (user_id, territory_id)
do update set access_role=excluded.access_role;
```

The dashboard checks territory access on the server via Supabase RLS, not just browser visibility. This project intentionally has no administrative write controls.

## 6. Test the flow

1. Open new email invite link. It should land at `/setup-password.html#access_token=...` (or use PKCE parameters depending on flow), **not** at `localhost:3000`.
2. Choose a password of 12+ characters. Expect a redirect to the dashboard.
3. Sign out and sign back in at `/index.html`.
4. Click **Forgot your password?**, inspect recovery email redirect and set a new password.
5. Test in an incognito window with no session (dashboard should redirect to login).
6. Test a valid login without a territory_access row (dashboard should deny access).

## Security and operations notes

- Never post invite/recovery URLs or screenshots that reveal `access_token`, `refresh_token`, `code` or secrets. If shared, revoke sessions and replace exposed credentials.
- Do not use `localhost:3000` as the Site URL for a GitHub Pages-only project.
- Supabase Auth's email-link scanner behavior and single-use expirations may affect testing. Use a fresh link when a link has already been consumed.
- This setup is a foundation, not a production security review. Before adding sensitive data, validate Row Level Security under multiple authenticated users, configure recovery redirects and email delivery, and consider MFA and stronger security policies.
- If using a different GitHub Pages URL, update *all* exact URL Configuration entries to match.
