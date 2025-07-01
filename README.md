# ChessMaster - Plateforme d'Échecs Multijoueur

Une plateforme d'échecs moderne et interactive développée avec Next.js 14, TypeScript et Supabase, offrant des parties multijoueur en temps réel avec un système de classement ELO.

## 🚀 Fonctionnalités Principales

### 🎮 Jeu d'Échecs
- **Plateau interactif** avec validation des mouvements légaux
- **Moteur d'échecs intégré** (Chess.js)
- **Détection automatique** des échecs, mats et parties nulles
- **Historique des coups** avec notation PGN

### 👥 Multijoueur Temps Réel
- **Salles de jeu** publiques et privées avec codes d'accès
- **Synchronisation en temps réel** via Supabase Realtime
- **Mode spectateur** avec compteur de spectateurs en live
- **Chat intégré** pour joueurs et spectateurs

### 🏆 Système de Classement
- **Rating ELO** avec calcul automatique après chaque partie
- **Classement mondial** avec top 100 des joueurs
- **Catégories de niveau** : Débutant, Intermédiaire, Avancé, Expert, Maître
- **Statistiques détaillées** : victoires, défaites, taux de réussite

### 🔐 Authentification & Profils
- **Inscription/Connexion** sécurisée avec Supabase Auth
- **Profils utilisateur** personnalisés avec pseudos uniques
- **Gestion de session** avec middleware de protection des routes
- **Dashboard personnel** avec historique et statistiques

## 🛠️ Technologies Utilisées

### Frontend
- **Next.js 14** - Framework React avec App Router
- **TypeScript** - Typage statique pour une meilleure robustesse
- **Tailwind CSS** - Framework CSS utility-first
- **Shadcn/ui** - Composants UI modernes et accessibles
- **Lucide React** - Icônes SVG optimisées

### Backend & Base de Données
- **Supabase** - Backend-as-a-Service avec PostgreSQL
- **Supabase Auth** - Authentification et gestion des utilisateurs
- **Supabase Realtime** - Synchronisation temps réel
- **Row Level Security** - Sécurité au niveau des données

### Jeu d'Échecs
- **Chess.js** - Moteur d'échecs avec validation des règles
- **React-Chessboard** - Composant d'échiquier interactif

## 📁 Structure du Projet

```
online_chess/
├── app/                      # Pages et layouts (App Router)
│   ├── auth/                 # Pages d'authentification
│   │   ├── login/           # Connexion
│   │   └── register/        # Inscription
│   ├── chat/                # Chat de test en temps réel
│   ├── create-room/         # Création de salles
│   ├── dashboard/           # Tableau de bord utilisateur
│   ├── leaderboard/         # Classement mondial
│   ├── profile/             # Profil utilisateur
│   ├── room/[id]/          # Interface de jeu
│   ├── layout.tsx          # Layout principal
│   └── page.tsx            # Page d'accueil
├── components/              # Composants réutilisables
│   ├── ui/                 # Composants UI (Shadcn)
│   └── header.tsx          # En-tête de navigation
├── hooks/                   # Hooks personnalisés
│   ├── useAuth.ts          # Gestion de l'authentification
│   ├── useChessEngine.ts   # Logique du jeu d'échecs
│   └── useUserRanking.ts   # Gestion du classement
├── lib/                     # Utilitaires et configuration
│   └── supabase/           # Configuration Supabase
├── types/                   # Types TypeScript
├── middleware.ts           # Middleware de protection des routes
└── tailwind.config.ts      # Configuration Tailwind
```

## 🗄️ Schéma de Base de Données

### Tables Principales

**user_public**
- Profils utilisateur avec pseudos et informations publiques
- Relation avec Supabase Auth pour la sécurité

**user_ranking**
- Statistiques de jeu et rating ELO
- Mise à jour automatique après chaque partie

**rooms**
- Salles de jeu avec configuration (publique/privée, spectateurs max)
- États : waiting, playing, finished

**games**
- Parties d'échecs avec joueurs et résultats
- Historique des coups et état du plateau

**chat_messages**
- Messages de chat liés aux parties
- Support joueurs et spectateurs

**spectators**
- Gestion des spectateurs par salle
- Comptage en temps réel

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 18+ et npm/yarn
- Compte Supabase
- Variables d'environnement configurées

### Installation
```bash
# Cloner le projet
git clone <repository-url>
cd online_chess

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Remplir avec vos clés Supabase
```

### Variables d'Environnement
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Démarrage
```bash
# Mode développement
npm run dev

# Build de production
npm run build
npm start
```

## 🎯 Fonctionnalités Avancées

### Chat Temps Réel
- **Messages instantanés** entre joueurs et spectateurs
- **Badges de rôle** (Blanc, Noir, Spectateur)
- **Interface moderne** avec avatars et horodatage
- **Modération automatique** (limite de caractères)

### Système de Salles
- **Salles privées** avec codes d'accès partageables
- **Configuration flexible** : spectateurs max, contrôle du temps
- **État temps réel** : liste des joueurs, spectateurs connectés
- **Partage facile** avec liens directs

### Classement ELO
- **Calcul automatique** du rating après chaque partie
- **Historique complet** des performances
- **Catégories dynamiques** basées sur le niveau
- **Rang mondial** mis à jour en temps réel

## 🔒 Sécurité

### Protection des Routes
- **Middleware Next.js** pour la protection des pages
- **Routes publiques** : accueil, connexion, classement
- **Routes protégées** : dashboard, profil, salles, chat

### Sécurité des Données
- **Row Level Security** sur toutes les tables Supabase
- **Validation côté serveur** des mouvements d'échecs
- **Authentification sécurisée** avec tokens JWT

## 🎨 Design et UX

### Interface Moderne
- **Design dark** avec effets de verre et gradients
- **Animations fluides** avec Tailwind CSS
- **Responsive design** pour tous les appareils
- **Accessibilité** avec Shadcn/ui

### Expérience Utilisateur
- **Notifications toast** pour les actions importantes
- **États de chargement** avec spinners animés
- **Feedback visuel** pour toutes les interactions
- **Navigation intuitive** avec breadcrumbs

## 🔄 Temps Réel

### Synchronisation Live
- **Mouvements d'échecs** synchronisés instantanément
- **Chat** avec messages en temps réel
- **Compteurs de spectateurs** mis à jour automatiquement
- **États de salle** (attente, en cours, terminée)

### Gestion des Événements
- **Supabase Realtime** pour tous les événements
- **Reconnexion automatique** en cas de perte de connexion
- **État de synchronisation** visible pour l'utilisateur

## 📱 Fonctionnalités en Développement

- **Mode tournoi** avec brackets automatiques
- **Analyse de parties** avec suggestions d'amélioration
- **Chat vocal** pour les parties importantes
- **Système d'amis** et de défis privés
- **Mobile app** avec React Native

## 🤝 Contribution

Ce projet est en développement actif. Les contributions sont les bienvenues !

### Développement Local
1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -m 'Ajouter nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

**ChessMaster** - Développé avec ❤️ par l'équipe de développement pour offrir la meilleure expérience d'échecs en ligne.