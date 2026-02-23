# CoachMe

**CoachMe** est une plateforme SaaS de mise en relation entre joueurs passionnés et coachs. L'application permet aux utilisateurs de progresser sur leurs jeux favoris grâce à un accompagnement personnalisé, tout en offrant aux coachs une infrastructure pour monétiser leur expertise.

---

## Le Concept

- **Problème identifié :** L'écart de niveau croissant dans les jeux compétitifs et le manque de structures fiables pour trouver des mentors dont le niveau est vérifié.
- **Solution :** Une plateforme "tout-en-un" où les coachs créent un portfolio détaillé (résultats, vidéos, spécialités) et où les élèves peuvent réserver et payer leurs sessions en toute sécurité.
- **Audience cible :** Joueurs compétitifs (Amateurs à Semi-Pro) et créateurs de contenu souhaitant monétiser leur savoir-faire.
- **Modèle de monétisation :** Système de commission sur les sessions payantes gérées via **Stripe**.

---

## Contraintes Techniques

- **Frontend :** **Nuxt** pour une interface fluide, optimisée pour le SEO et le rendu hybride (SSR/SPA).
- **Backend & Base de données :** **Supabase** (PostgreSQL) pour la gestion des données en temps réel et l'authentification sécurisée.
- **API Externe (Paiement) :** **Stripe API** pour la facturation et le versement des gains aux coachs.

---

## Fonctionnalités Clés

### 👤 Gestion des Utilisateurs

- **Espace Utilisateur complet :** Inscription et connexion sécurisées via Supabase Auth.
- **Rôles hybrides :** Possibilité d'être à la fois élève et coach avec un basculement de profil fluide.

### 👔 Portfolio du Coach

- **Présentation libre :** Le coach renseigne ses jeux, ses rangs, ses accomplissements et ajoute des liens vers ses vidéos ou ses réseaux sociaux (Ajout d'upload de vidéo pour simplifier, mais bucket sûrement trop faible en stockage).
- **Système de Feedback :** Les avis des élèves après chaque session garantissent la réputation du coach.

### 📅 Sessions & Paiement

- **Réservation :** Calendrier de disponibilités pour planifier les sessions de coaching.
- **Paiement sécurisé :** Intégration de Stripe pour garantir la rémunération et la protection des données financières.

---

## 📂 Livrables Techniques

- **Application fonctionnelle :** Déployée et accessible en ligne.
- **Documentation complète :**
- **Guide d'installation :** Procédure de lancement local (disponible dans `/docs/INSTALL.md`).
- **Application Architecture Diagram :** Flux de données entre Nuxt, Supabase et les APIs externes.
- **Modèle de données :** Schéma UML des tables SQL (Profiles, Sessions, Payments).
- **Infrastructure Architecture Diagram :** Schéma du déploiement cloud.

---

## 🔧 Installation rapide

```bash
# 1. Cloner le repository
git clone https://github.com/votre-compte/coach-me.git

# 2. Installer les dépendances
npm install

# 3. Configurer le .env (Supabase URL/Key, Stripe Key)
cp .env.example .env

# 4. Lancer le projet en développement
npm run dev

# 5. Build pour la production
npm run build
```

### Commandes disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le serveur de développement |
| `npm run build` | Compile l'application pour la production |
| `npm run generate` | Génère une version statique du site |
| `npm run preview` | Prévisualise le build de production |

