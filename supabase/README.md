# Migrations Supabase - CoachMe

Ce dossier contient les migrations SQL pour configurer la base de données Supabase du projet CoachMe.

## Structure

```
supabase/
├── migrations/
│   ├── 001_create_profiles_table.sql
│   ├── 002_create_sessions_table.sql
│   ├── 003_create_reviews_table.sql
│   ├── 004_fix_function_search_path_security.sql
│   ├── 005_fix_sessions_table_issue_24.sql
│   ├── 006_fix_reviews_status_check.sql
│   ├── 007_create_coach_videos_bucket.sql
│   ├── 008_create_game_ranks_table.sql
│   ├── 014_allow_maintainers_manage_games.sql
│   └── 015_add_rank_icons_storage.sql
└── README.md
```

## Application des migrations

### Option 1 : Via l'interface Supabase Dashboard

1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor**
3. Exécutez chaque fichier de migration dans l'ordre (001, 002, 003)
4. Vérifiez que les tables sont créées dans **Table Editor**

### Option 2 : Via Supabase CLI

```bash
# Installer Supabase CLI si nécessaire
npm install -g supabase

# Se connecter à votre projet
supabase link --project-ref your-project-ref

# Appliquer les migrations
supabase db push
```

### Option 3 : Via MCP Supabase

Si vous utilisez MCP Supabase, vous pouvez appliquer les migrations via l'outil `apply_migration`.

## Ordre d'exécution

Les migrations doivent être appliquées dans l'ordre suivant :

1. **001_create_profiles_table.sql** : Crée la table `profiles` et les fonctions associées
2. **002_create_sessions_table.sql** : Crée la table `sessions` (dépend de `profiles`)
3. **003_create_reviews_table.sql** : Crée la table `reviews` (dépend de `sessions` et `profiles`)
4. **004_fix_function_search_path_security.sql** : Corrige les fonctions pour la sécurité
5. **005_fix_sessions_table_issue_24.sql** : Aligne la table sessions avec l'issue #24
6. **006_fix_reviews_status_check.sql** : Corrige le statut pour les reviews
7. **007_create_coach_videos_bucket.sql** : Crée le bucket Storage pour les vidéos des coachs
8. **008_create_game_ranks_table.sql** : Crée la table `game_ranks` pour gérer les rangs par jeu
9. **014_allow_maintainers_manage_games.sql** : Autorise les maintainers à gérer `games` via RLS
10. **015_add_rank_icons_storage.sql** : Ajoute `icon_url` sur `game_ranks` et le bucket `rank`

## Vérification

Après avoir appliqué les migrations, vérifiez que :

- ✅ Les 3 tables existent : `profiles`, `sessions`, `reviews`
- ✅ Les politiques RLS sont activées sur toutes les tables
- ✅ Les triggers fonctionnent (création automatique de profil)
- ✅ Les contraintes sont en place
- ✅ Le bucket `coach-videos` est créé avec les politiques RLS appropriées

## Issue #68 – Système d’emails (Resend)

La migration **024_create_email_events_and_session_emails_trigger.sql** ajoute :

- La table **`email_events`** (idempotence et audit des envois)
- Le trigger sur **`sessions`** qui appelle l’Edge Function `send-session-emails` quand le statut passe à `paid`, `upcoming` ou `canceled`
- La table **`private.edge_config`** pour l’URL de l’Edge et le secret webhook

### Variables d’environnement (Edge Functions – Supabase Dashboard)

À configurer dans **Project Settings → Edge Functions → Secrets** (ou équivalent) :

| Variable                    | Obligatoire | Description                                                                                                |
| --------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`            | Oui         | Clé API Resend                                                                                             |
| `SUPABASE_SERVICE_ROLE_KEY` | Oui         | Pour `generateLink` (reset password) et accès DB                                                           |
| `EMAIL_WEBHOOK_SECRET`      | Recommandé  | Secret partagé pour sécuriser l’appel trigger → Edge (header `x-webhook-secret`). Même valeur que `SESSION_ACTION_SECRET` pour les boutons Confirmer/Annuler                           |
| `EMAIL_FROM`                | Optionnel   | Expéditeur (ex. `Coach-me <no-reply@votredomaine.com>`)                                                    |
| `CLIENT_URL`                | Recommandé  | URL de l’app (ex. `https://votredomaine.com`) pour les liens dans les emails et le redirect reset password |
| `PUBLIC_APP_URL`            | Optionnel   | Ancien nom (fallback) si `CLIENT_URL` non défini                                                           |
| `SESSION_ACTION_SECRET`     | Optionnel   | Doit être **identique** à `EMAIL_WEBHOOK_SECRET` pour que les liens confirmer/annuler du mail coach fonctionnent. |
| `STRIPE_SECRET_KEY`         | Oui (annulation) | Requis par `session-action` pour le remboursement Stripe quand le coach annule. |

### Config base de données après migration

1. **Activer l’extension pg_net**  
   La migration fait `CREATE EXTENSION IF NOT EXISTS pg_net;`. Si besoin, l’activer depuis le Dashboard (Database → Extensions).

2. **Renseigner le secret et l’URL pour le trigger**  
   Exécuter dans le SQL Editor (remplacer les valeurs) :

   ```sql
   UPDATE private.edge_config SET value = 'TON_SECRET_ICI' WHERE key = 'email_webhook_secret';
   UPDATE private.edge_config SET value = 'https://TON_PROJECT_REF.supabase.co' WHERE key = 'edge_base_url';
   ```

   Sans `email_webhook_secret`, laisser vide ou mettre la même valeur que la variable d’env `EMAIL_WEBHOOK_SECRET` de l’Edge Function.

### Auth – Redirect URL pour reset password (obligatoire en prod)

Supabase Auth utilise la **Site URL** et la liste **Redirect URLs**. Si la prod n’est pas configurée, le lien du mail de reset redirige vers **localhost** au lieu de ton domaine.

1. **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. **Site URL** : en prod, mets `https://coach-me-nine.vercel.app` (pas `http://localhost:3000`).
3. **Redirect URLs** : ajoute au moins :
   - `https://coach-me-nine.vercel.app/auth/reset`
   - En dev : `http://localhost:3000/auth/reset`

Sans ça, même si l’Edge Function envoie `redirectTo: "https://coach-me-nine.vercel.app/auth/reset"`, Supabase peut ignorer et utiliser la Site URL (localhost).

## Documentation complète

Pour plus de détails sur le schéma, consultez [`../docs/supabase-schema.md`](../docs/supabase-schema.md).
