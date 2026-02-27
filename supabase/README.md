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
│   └── 007_create_coach_videos_bucket.sql
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

## Vérification

Après avoir appliqué les migrations, vérifiez que :

- ✅ Les 3 tables existent : `profiles`, `sessions`, `reviews`
- ✅ Les politiques RLS sont activées sur toutes les tables
- ✅ Les triggers fonctionnent (création automatique de profil)
- ✅ Les contraintes sont en place
- ✅ Le bucket `coach-videos` est créé avec les politiques RLS appropriées

## Documentation complète

Pour plus de détails sur le schéma, consultez [`../docs/supabase-schema.md`](../docs/supabase-schema.md).
