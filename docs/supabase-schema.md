# Schéma de Base de Données Supabase - CoachMe

Ce document décrit le schéma de base de données pour la plateforme CoachMe, implémenté dans Supabase (PostgreSQL).

## Vue d'ensemble

Le schéma est composé de 3 tables principales :
- `profiles` : Profils utilisateurs étendus
- `sessions` : Réservations de sessions de coaching
- `reviews` : Avis des élèves sur les sessions

## Diagramme des relations

```
auth.users (Supabase Auth)
    │
    └─── profiles (1:1)
            │
            ├─── sessions (1:N) [coach_id]
            │       │
            │       └─── reviews (1:1)
            │
            └─── sessions (1:N) [student_id]
                    │
                    └─── reviews (1:1)
```

## Tables détaillées

### Table `profiles`

Table pour stocker les profils utilisateurs étendus au-delà de `auth.users`.

#### Colonnes

| Nom | Type | Description | Contraintes |
|-----|------|-------------|-------------|
| `id` | UUID | Identifiant unique (référence `auth.users.id`) | PRIMARY KEY, NOT NULL |
| `email` | TEXT | Email de l'utilisateur | |
| `full_name` | TEXT | Nom complet | |
| `avatar_url` | TEXT | URL de l'avatar | |
| `role` | TEXT | Rôle de l'utilisateur | DEFAULT 'student', CHECK IN ('student', 'coach', 'both') |
| `is_coach` | BOOLEAN | Indique si l'utilisateur est coach | DEFAULT FALSE |
| `coach_bio` | TEXT | Biographie du coach | |
| `coach_games` | TEXT[] | Liste des jeux enseignés | |
| `coach_ranks` | JSONB | Rangs par jeu (ex: `{"valorant": "Immortal"}`) | |
| `coach_achievements` | TEXT[] | Liste des accomplissements | |
| `coach_social_links` | JSONB | Liens réseaux sociaux (ex: `{"youtube": "url"}`) | |
| `coach_video_urls` | TEXT[] | URLs vers vidéos de démonstration | |
| `created_at` | TIMESTAMPTZ | Date de création | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | Date de mise à jour | DEFAULT NOW() |

#### Index

- `idx_profiles_is_coach` sur `is_coach`
- `idx_profiles_role` sur `role`

#### Politiques RLS

- **SELECT** : Tous les utilisateurs peuvent lire tous les profils (pour découvrir les coachs)
- **UPDATE** : Les utilisateurs peuvent mettre à jour leur propre profil
- **INSERT** : Les utilisateurs peuvent insérer leur propre profil

#### Triggers

- `on_auth_user_created` : Crée automatiquement un profil lors de l'inscription
- `set_updated_at_profiles` : Met à jour `updated_at` automatiquement

---

### Table `sessions`

Table pour gérer les réservations de sessions de coaching.

#### Colonnes

| Nom | Type | Description | Contraintes |
|-----|------|-------------|-------------|
| `id` | UUID | Identifiant unique | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `coach_id` | UUID | Référence au profil du coach | NOT NULL, FOREIGN KEY → profiles(id) |
| `student_id` | UUID | Référence au profil de l'élève | NOT NULL, FOREIGN KEY → profiles(id) |
| `start_at` | TIMESTAMPTZ | Date et heure de début de la session | NOT NULL |
| `end_at` | TIMESTAMPTZ | Date et heure de fin (optionnel) | |
| `duration_minutes` | INTEGER | Durée en minutes | DEFAULT 60, CHECK > 0 |
| `status` | TEXT | Statut de la session | DEFAULT 'pending', CHECK IN ('pending', 'paid', 'upcoming', 'done', 'canceled') |
| `price` | NUMERIC(10,2) | Prix en unité de currency | NOT NULL, CHECK > 0 |
| `currency` | TEXT | Devise | DEFAULT 'EUR' |
| `stripe_session_id` | TEXT | ID de la session Stripe Checkout | UNIQUE |
| `stripe_payment_intent_id` | TEXT | ID du paiement Stripe (pour suivi) | |
| `stripe_payment_status` | TEXT | Statut du paiement Stripe | |
| `student_notes` | TEXT | Notes de l'élève avant la session | |
| `coach_notes` | TEXT | Notes du coach après la session | |
| `game` | TEXT | Jeu concerné par la session | |
| `created_at` | TIMESTAMPTZ | Date de création | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | Date de mise à jour | DEFAULT NOW() |
| `completed_at` | TIMESTAMPTZ | Date de complétion | |

#### Index

- `idx_sessions_coach_id` sur `coach_id`
- `idx_sessions_student_id` sur `student_id`
- `idx_sessions_status` sur `status`
- `idx_sessions_start_at` sur `start_at`
- `idx_sessions_stripe_payment_intent_id` sur `stripe_payment_intent_id`

#### Contraintes

- `check_coach_student_different` : Un élève ne peut pas réserver une session avec lui-même

#### Triggers de validation

- `check_coach_is_coach_trigger` : Vérifie que le coach a `is_coach = TRUE` (via la fonction `check_coach_is_coach()`)

#### Politiques RLS

- **SELECT** : Les coachs et élèves peuvent voir leurs propres sessions
- **INSERT** : Les élèves peuvent créer des sessions (réserver)
- **UPDATE** : Les coachs et élèves peuvent mettre à jour leurs propres sessions

#### Triggers

- `set_updated_at_sessions` : Met à jour `updated_at` automatiquement

---

### Table `reviews`

Table pour stocker les avis des élèves sur les sessions de coaching.

#### Colonnes

| Nom | Type | Description | Contraintes |
|-----|------|-------------|-------------|
| `id` | UUID | Identifiant unique | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `session_id` | UUID | Référence à la session | NOT NULL, UNIQUE, FOREIGN KEY → sessions(id) |
| `coach_id` | UUID | Référence au profil du coach | NOT NULL, FOREIGN KEY → profiles(id) |
| `student_id` | UUID | Référence au profil de l'élève | NOT NULL, FOREIGN KEY → profiles(id) |
| `rating` | INTEGER | Note de 1 à 5 | NOT NULL, CHECK >= 1 AND <= 5 |
| `comment` | TEXT | Commentaire de l'avis | |
| `created_at` | TIMESTAMPTZ | Date de création | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | Date de mise à jour | DEFAULT NOW() |

#### Index

- `idx_reviews_coach_id` sur `coach_id`
- `idx_reviews_student_id` sur `student_id`
- `idx_reviews_session_id` sur `session_id`
- `idx_reviews_rating` sur `rating`

#### Contraintes

- `check_student_coach_different` : Un élève ne peut pas s'auto-évaluer

#### Triggers de validation

- `check_session_completed_trigger` : Vérifie qu'une session est complétée avant de créer un avis (via la fonction `check_session_completed()`)

#### Politiques RLS

- **SELECT** : Tous les utilisateurs peuvent lire les avis (pour voir la réputation des coachs)
- **INSERT** : Les élèves peuvent créer des avis pour leurs propres sessions complétées
- **UPDATE** : Les élèves peuvent mettre à jour leurs propres avis
- **DELETE** : Les élèves peuvent supprimer leurs propres avis

#### Triggers

- `set_updated_at_reviews` : Met à jour `updated_at` automatiquement

#### Fonctions utilitaires

- `get_coach_average_rating(coach_uuid UUID)` : Calcule la note moyenne d'un coach
- `get_coach_review_count(coach_uuid UUID)` : Compte le nombre d'avis d'un coach

---

## Fonctions globales

### `handle_updated_at()`

Fonction trigger pour mettre à jour automatiquement le champ `updated_at` lors des modifications.

### `handle_new_user()`

Fonction trigger pour créer automatiquement un profil dans `profiles` lors de l'inscription d'un nouvel utilisateur dans `auth.users`.

---

## Sécurité (RLS)

Toutes les tables ont Row Level Security (RLS) activé avec des politiques spécifiques :

1. **Profiles** : Lecture publique, modification uniquement de son propre profil
2. **Sessions** : Accès limité au coach et à l'élève concernés
3. **Reviews** : Lecture publique, création/modification uniquement par l'élève concerné

---

## Migrations

Les migrations sont stockées dans le dossier `supabase/migrations/` :

1. `001_create_profiles_table.sql` : Création de la table profiles
2. `002_create_sessions_table.sql` : Création de la table sessions
3. `003_create_reviews_table.sql` : Création de la table reviews

Pour appliquer les migrations, utilisez l'interface Supabase ou la CLI Supabase :

```bash
# Avec Supabase CLI
supabase db push

# Ou via l'interface Supabase Dashboard
# SQL Editor > Coller le contenu de chaque migration
```

---

## Notes importantes

- Les profils sont créés automatiquement lors de l'inscription via le trigger `on_auth_user_created`
- Un utilisateur peut être à la fois élève et coach (`role = 'both'`)
- Les sessions nécessitent que le coach ait `is_coach = TRUE`
- Les avis ne peuvent être créés que pour des sessions avec le statut `done`
- Les prix sont stockés en NUMERIC(10,2) pour une précision décimale correcte

---

## Storage Bucket

### Bucket `coach-videos`

Bucket Supabase Storage pour stocker les vidéos de démonstration des coachs.

#### Configuration

- **Nom** : `coach-videos`
- **Public** : Oui (lecture publique pour permettre l'accès aux vidéos)
- **Limite de taille par fichier** : 100 MB (104857600 bytes)
- **Types MIME autorisés** :
  - `video/mp4`
  - `video/webm`
  - `video/quicktime`
  - `video/x-msvideo` (.avi)

#### Politiques RLS

- **SELECT** : Tout le monde peut lire les vidéos (bucket public)
- **INSERT** : Seuls les coachs authentifiés peuvent uploader leurs vidéos
- **UPDATE** : Seuls les coachs peuvent mettre à jour leurs propres vidéos
- **DELETE** : Seuls les coachs peuvent supprimer leurs propres vidéos

#### Note importante

Comme mentionné dans le README, le bucket a une limitation de stockage. Pour les vidéos plus volumineuses, il est recommandé d'utiliser des liens externes (YouTube, Vimeo, etc.) stockés dans le champ `coach_video_urls` de la table `profiles`.

#### Utilisation

Les vidéos doivent être organisées par `user_id` dans le path. Exemple :
- `{user_id}/video1.mp4`
- `{user_id}/video2.webm`

---
