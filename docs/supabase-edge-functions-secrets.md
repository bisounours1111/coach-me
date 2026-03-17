# Secrets Supabase – Edge Functions (emails & app)

À configurer dans **Supabase** → **Project Settings** → **Edge Functions** → **Secrets**.

## Envoi d’emails (élève + coach)

| Secret | Description | Exemple |
|--------|-------------|--------|
| `EMAIL_FROM` | Expéditeur des emails (domaine vérifié sur Resend) | `Coach-me <noreply@inventoryrp.space>` |
| `CLIENT_URL` ou `PUBLIC_APP_URL` | URL de l’app (liens dans les mails : politique de confidentialité, tableau de bord) | `https://coach-me-nine.vercel.app` (prod) ou `http://localhost:3000` (local) |
| `RESEND_API_KEY` | Clé API Resend | Clé depuis resend.com |
| `EMAIL_WEBHOOK_SECRET` | Secret pour autoriser les appels du trigger DB vers `send-session-emails` | Même valeur que dans `private.edge_config.email_webhook_secret` |

Sans `EMAIL_FROM`, les mails partent depuis `onboarding@resend.dev` (limité à ton email).  
**Important** : en production, mets `CLIENT_URL` ou `PUBLIC_APP_URL` à l’URL de ton app (ex. `https://coach-me-nine.vercel.app`). Si tu laisses `localhost`, le lien « Politique de confidentialité » dans les mails sera en localhost → Resend avertit et les FAI (ex. Outlook) peuvent classer le mail en spam ou le bloquer ; le coach peut ne pas recevoir le mail malgré un 200.

## Reset password

Utilise aussi `EMAIL_FROM`, `CLIENT_URL` (ou `PUBLIC_APP_URL`) et `RESEND_API_KEY`.  
Le lien de reset redirige vers `{CLIENT_URL}/auth/reset`.

## Session confirm/cancel (liens dans le mail coach)

Les liens « Confirmer » / « Annuler » appellent l’Edge Function `session-action`.  
La page de remerciement redirige vers `{CLIENT_URL}/dashboard/coach`.
