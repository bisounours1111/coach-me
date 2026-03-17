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

**Depuis la migration 025** : les tokens sont **one-time** et stockés en base (`session_action_tokens`). Ils ne dépendent plus du secret partagé. `send-session-emails` génère un token aléatoire, stocke son hash en DB, et met le token dans l’URL ; `session-action` vérifie d’abord en DB (hash + non utilisé + non expiré), puis en secours l’ancienne vérification HMAC pour les mails déjà envoyés.

| Secret | Description |
|--------|-------------|
| `SESSION_ACTION_SECRET` ou `EMAIL_WEBHOOK_SECRET` | Utilisé en **secours** (anciens liens HMAC). Pour les **nouveaux** mails, la table `session_action_tokens` suffit. |
| `STRIPE_SECRET_KEY` | Requis dans `session-action` pour le remboursement Stripe quand le coach annule. |

Après confirmation ou annulation, le trigger DB appelle `send-session-emails` → l’apprenti reçoit l’email « Session confirmée » ou « Session annulée / non confirmée » ; en cas d’annulation, le remboursement Stripe est créé par `session-action`.
