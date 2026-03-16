-- 1. Création du bucket 'avatars' s'il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Suppression des anciennes politiques pour repartir sur une base propre
DROP POLICY IF EXISTS "Avatars sont publics" ON storage.objects;
DROP POLICY IF EXISTS "Les utilisateurs peuvent uploader leur propre avatar" ON storage.objects;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre avatar" ON storage.objects;
DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer leur propre avatar" ON storage.objects;

-- 3. Politique : Lecture publique
CREATE POLICY "Avatars sont publics"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 4. Politique : Insertion (Upload)
-- Simplification maximale pour éviter les erreurs de parsing du chemin
CREATE POLICY "Les utilisateurs peuvent uploader leur propre avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND 
  (name LIKE 'pp/' || auth.uid()::text || '%')
);

-- 5. Politique : Mise à jour (Update)
CREATE POLICY "Les utilisateurs peuvent modifier leur propre avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  (name LIKE 'pp/' || auth.uid()::text || '%')
);

-- 6. Politique : Suppression (Delete)
CREATE POLICY "Les utilisateurs peuvent supprimer leur propre avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  (name LIKE 'pp/' || auth.uid()::text || '%')
);
