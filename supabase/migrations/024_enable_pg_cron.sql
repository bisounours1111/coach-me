-- Issue: purge automatique des messages après 180 jours
-- Étape 1: activer l'extension pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
