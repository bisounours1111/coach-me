# Schema Supabase Coach

Ce document decrit le schema **actuel en production** de CoachMe, tel qu'observe sur Supabase (PostgreSQL + Auth + Storage + Edge Functions).

## Vue d'ensemble

Le schema public contient 15 tables:

- `profiles`
- `games`
- `game_ranks`
- `profile_game_roles`
- `coachings`
- `coach_availabilities`
- `sessions`
- `reviews`
- `conversations`
- `messages`
- `wallets`
- `transactions`
- `email_events`
- `session_action_tokens`
- `sessions_delete_audit`

## Diagramme des relations (simplifie)

```text
auth.users
   |
   +--> public.profiles (1:1)
            |
            +--> profile_game_roles --> games
            |          |
            |          +--> coachings
            |                    |
            |                    +--> sessions <-- profiles (student_id)
            |                               |
            |                               +--> reviews
            |
            +--> coach_availabilities
            |
            +--> conversations --> messages
            |
            +--> wallets --> transactions
```

## Tables (resume technique)

### `profiles`

Profil et role applicatif (`user` ou `maintainer`).

Champs importants:
- `id` (PK, FK vers `auth.users.id`)
- `email`, `full_name`, `avatar_url`
- `role` (CHECK: `user|maintainer`)
- `bio`, `achievements`, `social_links`
- `stripe_connect_id` (index unique partiel)
- `created_at`, `updated_at`

RLS:
- lecture publique
- insert/update uniquement sur son propre profil

Triggers:
- `on_auth_user_created`
- `set_updated_at_profiles`

---

### `games` / `game_ranks`

Catalogue des jeux + rangs configurables par jeu.

`games`:
- `id`, `slug` (unique), `name`, `icon_url`, timestamps

`game_ranks`:
- `id`, `game_id` (FK), `label`, `sort_order`, `icon_url`, timestamps
- contrainte d'unicite `(game_id, label)`

RLS:
- lecture publique
- gestion maintainer

---

### `profile_game_roles`

Association profil <-> jeu avec role coach.

Champs:
- `id`
- `profile_id` (FK `profiles`)
- `game_id` (FK `games`)
- `is_coach` (bool)
- `player_rank_id` (FK compose vers `game_ranks(id, game_id)`)
- timestamps

Contraintes:
- unique `(profile_id, game_id)`

RLS:
- lecture publique
- gestion de ses propres lignes

---

### `coachings`

Offres de coaching publiees par jeu/rang.

Champs:
- `id`
- `profile_game_role_id` (FK)
- `description`, `video_urls`, `hourly_rate`, `is_active`
- timestamps

RLS:
- lecture publique
- gestion de ses propres coachings

Trigger:
- `set_updated_at_coachings`
- `protect_coachings_from_delete_trigger` (interdit suppression si sessions liees)

---

### `coach_availabilities`

Creneaux de disponibilite des coachs.

Champs:
- `id`
- `coach_id` (FK `profiles`)
- `start_at`, `end_at`
- `status` (`available|upcoming|booked|confirmed|canceled|pending|blocked`)
- `is_active`
- timestamps

RLS:
- lecture publique
- insert/update/delete pour le coach proprietaire

Triggers:
- `set_updated_at_availabilities`
- `protect_booked_availabilities_trigger` (protege les slots `booked`)
- `trg_propagate_slot_status_to_session` (sync vers `sessions`)

---

### `sessions`

Reservations et flux transactionnel.

Champs:
- `id`
- `coach_id` (FK `coachings`)
- `student_id` (FK `profiles`)
- `slot_id` (FK `coach_availabilities`, nullable)
- `start_at`, `end_at`, `duration_minutes`
- `status` (`pending|negotiating|accepted|rejected|paid|upcoming|done|canceled`)
- `price`, `negotiated_price`, `currency`
- `stripe_session_id` (unique)
- `stripe_payment_intent_id` (unique)
- `stripe_payment_status`
- `student_notes`, `coach_notes`, `game`
- `completed_at`, timestamps

Contraintes:
- `check_coach_student_different`

RLS:
- select/update cote coach et eleve concernes
- insert cote eleve

Triggers:
- `set_updated_at_sessions`
- `on_session_status_send_emails`
- `trg_sync_session_status_from_slot`
- `audit_sessions_delete_trigger`

---

### `reviews`

Avis eleve sur session terminee.

Champs:
- `id`
- `session_id` (FK unique vers `sessions`)
- `coach_id` (FK `coachings`)
- `student_id` (FK `profiles`)
- `rating`, `comment`, timestamps

RLS:
- lecture publique
- create/update/delete par l'eleve proprietaire

Triggers/Fonctions:
- `check_session_completed_trigger`
- `set_updated_at_reviews`
- `get_coach_average_rating`
- `get_coach_review_count`

---

### `conversations` / `messages`

Messagerie eleve-coach.

`conversations`:
- `student_id`, `coach_id`
- colonnes generees: `user_low_id`, `user_high_id`
- unicite de paire (quel que soit l'ordre)

`messages`:
- `conversation_id`, `sender_id`, `content`, `read_at`, `created_at`

RLS:
- participants uniquement

Triggers:
- `set_updated_at_conversations`
- `on_message_created_update_conversation`

Realtime:
- `public.messages` ajoutee a la publication `supabase_realtime`

---

### `wallets` / `transactions`

Suivi financier interne (Stripe Connect).

`wallets`:
- 1 wallet par profil (`profile_id` unique)
- `currency`, timestamps

`transactions`:
- `wallet_id`, `profile_id`, `session_id`
- `type` (`credit|payout`)
- `status` (`pending|succeeded|failed`)
- `amount`, `fee`, `currency`, `stripe_id`, `created_at`

RLS:
- lecture utilisateur sur ses donnees
- ecriture transactionnelle reservee backend/service role

---

### `email_events` / `session_action_tokens`

Infra email (Resend + actions one-time).

`email_events`:
- audit/idempotence d'envoi
- `session_id`, `event_type`, `to_email`, `payload`, `provider`, `provider_id`, `sent_at`, `error`

`session_action_tokens`:
- PK composee `(session_id, action)`
- hash token one-time avec expiration/consommation

RLS:
- actives, sans policies publiques (acces backend/service role)

---

### `sessions_delete_audit`

Journal d'audit des suppressions de sessions.

Champs:
- `id`, `deleted_at`, `deleted_by`, `db_user`, `old_row`

RLS:
- policy de lecture pour les mainteneurs uniquement

Fonction/Trigger:
- `audit_sessions_delete()`
- `audit_sessions_delete_trigger` (`BEFORE DELETE ON sessions`)

## Fonctions publiques presentes en prod

- `handle_updated_at`
- `handle_new_user`
- `check_session_completed`
- `set_conversation_updated_at_on_message`
- `trigger_send_session_emails`
- `purge_old_messages`
- `confirm_past_bookings`
- `map_slot_status_to_session_status`
- `sync_session_status_from_slot`
- `propagate_slot_status_to_session`
- `prevent_booked_availability_mutations`
- `prevent_coaching_delete_when_sessions_exist`
- `audit_sessions_delete`
- `get_coach_average_rating`
- `get_coach_review_count`

## Extensions actives (prod)

- `pg_cron`
- `pg_net`
- `pgcrypto`
- `pg_graphql`
- `pg_stat_statements`
- `supabase_vault`
- `uuid-ossp`
- `plpgsql`

## Storage buckets utilises

- `coach-videos` (videos coach)
- `avatars` (photos de profil)
- `rank` (icones de rangs)
- `game-icons` (icones jeux)

Politiques storage notables:
- lecture publique des assets
- ecriture conditionnee (coach owner, utilisateur owner, maintainer)

## Migration de reference

Le schema est rejouable via:

- `supabase/migrations/000_full_schema.sql`

Ce fichier est maintenu pour reproduire l'etat de production au plus proche.
