# Email Confirmation — Dev Workaround (No SMTP)

## The Problem

Supabase requires email confirmation before a user can sign in. Without an SMTP provider configured, new signups receive no confirmation email and are permanently locked out — `signInWithPassword` returns `"Email not confirmed"` and the session is null.

This breaks the registration flow because the `bootstrap_organisation` RPC needs an authenticated session (`auth.uid()`) to create the organisation, user profile, and assign the System Admin role.

## The Workaround

A database trigger on `auth.users` automatically sets `email_confirmed_at = now()` on every new INSERT, bypassing the confirmation step entirely.

**Migration file:** `supabase/migrations/20260605000065_auto_confirm_emails_no_smtp.sql`

```sql
CREATE OR REPLACE FUNCTION auth.auto_confirm_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_confirm_email
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.auto_confirm_email();

-- Backfill any users created before this trigger existed
UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;
```

## When to Remove This

Once a real SMTP provider is configured:

1. **Set up SMTP** in Supabase dashboard → Authentication → SMTP Settings (e.g. Resend, SendGrid, Postmark)

2. **Re-enable email confirmation** in Supabase dashboard → Authentication → Providers → Email → check "Confirm email" → Save

3. **Drop the trigger and function** by applying a new migration:

```sql
DROP TRIGGER IF EXISTS trg_auto_confirm_email ON auth.users;
DROP FUNCTION IF EXISTS auth.auto_confirm_email();
```

4. **Delete** `supabase/migrations/20260605000065_auto_confirm_emails_no_smtp.sql` (or replace its content with the drop statements above so the migration history stays clean).

## Recommended SMTP Providers

| Provider | Free tier | Notes |
|---|---|---|
| [Resend](https://resend.com) | 3,000 emails/month | Best DX, simple API |
| [SendGrid](https://sendgrid.com) | 100 emails/day | Widely used |
| [Postmark](https://postmarkapp.com) | Paid only | Best deliverability |
| [Brevo](https://brevo.com) | 300 emails/day | Good free tier |

## Security Note

This workaround is **safe for development** — it only skips the confirmation email, it does not weaken passwords or bypass any other auth check. Do not ship to production with this trigger in place.
