<div align="center">
  <img src="./assets/images/icon.png" alt="Dun App Icon" width="120" height="120" style="border-radius: 24px; margin-bottom: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.2)">
  
  # ✨ Dun ✨
  
  <p align="center">
    <strong>Restez productif, jour après jour</strong>
  </p>
  
  <div align="center">
    <img alt="Expo" src="https://img.shields.io/badge/Expo-54.0-000.svg?style=flat-square&logo=expo">
    <img alt="React Native" src="https://img.shields.io/badge/React%20Native-0.81-61dafb.svg?style=flat-square&logo=react">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178c6.svg?style=flat-square&logo=typescript">
    <img alt="License" src="https://img.shields.io/badge/License-Proprietary-red.svg?style=flat-square">
  </div>

  <p align="center">
    Une application minimaliste et moderne pour gérer vos tâches quotidiennes avec style. Suivez vos progrès avec un système intuitif et une expérience utilisateur fluide.
  </p>

  [✨ Features](#-features-principales) • [🚀 Démarrage](#-démarrage-rapide) • [📱 Architecture](#-architecture) • [🎨 Design](#-design-system)

</div>

---

## 🚀 Démarrage rapide

### Prérequis
- [Node.js](https://nodejs.org/) (v18+) — Environnement JavaScript
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — Framework React Native
- iOS Simulator ou Android Emulator (optionnel)

### Installation en 3 étapes

```bash
# 1️⃣ Installez les dépendances
npm install

# 2️⃣ Lancez l'application
npm start

# 3️⃣ Choisissez votre plateforme
# → Appuyez sur 'i' pour iOS
# → Appuyez sur 'a' pour Android  
# → Appuyez sur 'w' pour Web
# → Scannez QR pour Expo Go
```

### Configuration produit

Le modele d'acces premium obligatoire peut etre active rapidement avec une variable publique Expo:

```bash
EXPO_PUBLIC_REQUIRE_PREMIUM_ACCESS=true
```

Par defaut, si la variable est absente ou differente de `true`, `1`, `yes` ou `on`, l'application laisse les comptes gratuits acceder au produit avec les limites definies dans `lib/plan.ts`.

---

## 📱 Architecture

### Stack Technologique

| Catégorie | Technologie | Rôle |
|-----------|-------------|------|
| **Framework** | Expo v54 + React Native 0.81 | Mobile cross-platform |
| **Routage** | Expo Router (file-based) | Navigation déclarative |
| **Language** | TypeScript v5.9 | Typage strict |
| **Auth** | Supabase | Authentification & sessions |
| **DB** | PostgreSQL (Supabase) | Données persistantes |
| **State** | Zustand + React Query | Gestion d'état global & serveur |
| **Animations** | Reanimated v4 + Lottie | Animations fluides 60fps |
| **UI** | React Navigation + Gesture Handler | Navigation native & gestes |
| **Fonts** | Satoshi Variable | Typographie premium |

### Arborescence du Projet

```
📦 dun/
├── 📂 app/                          # Routes (Expo Router)
│   ├── 📄 _layout.tsx               # Layout principal + ThemeProvider
│   ├── 📄 index.tsx                 # 🏠 Écran principal (tâches)
│   ├── 📄 create-task.tsx           # ➕ Créer une tâche
│   ├── 📄 edit-task.tsx             # ✏️ Modifier une tâche
│   ├── 📄 details.tsx               # 📊 Détails d'une journée
│   ├── 📄 settings.tsx              # ⚙️ Paramètres
│   ├── 📂 auth/
│   │   └── 📄 callback.tsx          # 🔐 Callback OAuth/Email
│   ├── 📂 onboarding/               # 🎯 Flow d'inscription
│   │   ├── 📄 start.tsx
│   │   ├── 📄 login.tsx
│   │   ├── 📄 register.tsx
│   │   └── ...
│   └── 📂 stats/                    # 📈 Dashboard statistiques
├── 📂 components/                   # Composants réutilisables
│   ├── 📄 TaskItem.tsx              # Item liste de tâche
│   ├── 📄 calendar.tsx              # Sélecteur de date
│   ├── 📄 progressBar.tsx           # Barre de progression
│   ├── 📄 navbar.tsx                # Navigation inférieure
│   └── ...
├── 📂 lib/                          # Logique partagée
│   ├── 📄 ThemeContext.tsx          # 🎨 Gestion thème
│   ├── 📄 FontContext.tsx           # 🔤 Gestion polices
│   ├── 📄 supabase.ts               # 🔗 Client Supabase
│   └── 📄 imageHelper.ts            # 🖼️ Utils images
├── 📂 store/                        # État global (Zustand)
│   └── 📄 store.ts
└── 📂 assets/                       # Ressources statiques
    ├── 📂 fonts/                    # Polices Satoshi
    ├── 📂 images/                   # Images & icônes
    ├── 📂 animations/               # Animations Lottie
    └── 📂 icon.icon/                # App icon
```

---

## 🎨 Design System

### 🌓 Thème et Couleurs

L'application supporte **3 modes** de thème avec une palette cohérente:

<table>
<tr>
<td align="center"><b>Light Mode</b></td>
<td align="center"><b>Dark Mode</b></td>
<td align="center"><b>System</b></td>
</tr>
<tr>
<td>
  ☀️ Interface claire<br/>
  Minimaliste & aérée<br/>
  Idéale le jour
</td>
<td>
  🌙 Interface sombre<br/>
  Dégradés subtils<br/>
  Confortable la nuit
</td>
<td>
  🔄 Suit le système<br/>
  Adaptation auto<br/>
  Sans friction
</td>
</tr>
</table>

**Configuration**: `lib/ThemeContext.tsx`
```tsx
const { colors, theme, actualTheme, toggleTheme } = useTheme();
```

### 🔤 Typographie

Utilisation exclusive de **Satoshi Variable** (5 poids):

| Poids | Type | Utilisation |
|-------|------|-------------|
| **400** | Regular | Corps de texte courant |
| **500** | Medium | Interactions, sous-titres |
| **700** | Bold | Titres secondaires |
| **900** | Black | Titres principaux |
| **Variable** | Multi-poids | Animations sans rerender |

---

## 🔐 Authentification

Intégration **Supabase Auth** complète avec plusieurs flux:

```
┌─────────────┐
│  Onboarding │
└──────┬──────┘
       ↓
   ┌───────────────────────────┐
   │  Inscription / Connexion  │
   └──────┬────────────────────┘
          ↓
   ┌──────────────────────────┐
   │  Vérification Email OTP  │
   └──────┬───────────────────┘
          ↓
   ┌──────────────────────────┐
   │  Dashboard Principal     │
   └──────────────────────────┘
```

### Fonctionnalités supportées
- ✅ **Email/Password** — Authentification basique
- ✅ **OTP Email** — Vérification par code
- ✅ **Password Reset** — Récupération de compte
- ✅ **OAuth** — Support futur (Google, GitHub, etc.)
- ✅ **Session Persistence** — AsyncStorage + Supabase sync

---

## ✨ Features Principales

<div align="flex-start">

### 📝 Gestion des Tâches
Créez, modifiez et complétez vos tâches avec une UX premium
- ✅ Créer des tâches quotidiennes
- ✅ Marquer comme complétées
- ✅ Drag & drop pour réorganiser
- ✅ Modifier/Supprimer en temps réel
- ✅ Sync Supabase instantanée

### 📅 Calendrier Interactif  
Naviguez les jours avec fluidité
- 📅 Sélection de date fluide
- 📊 Historique des jours
- 📈 Statistiques de completion
- 🏆 Vue par semaine/mois

### ⚙️ Paramètres Avancés
Personnalisez votre expérience
- 🌓 Thème (Light/Dark/System)
- 📧 Gestion du compte
- 🔔 Préférences notifications
- 🎨 Personnalisation UI

### 📈 Statistiques Détaillées
Suivez votre productivité
- 📉 Graphiques de progression
- 🔥 Système de "streak"
- 📋 Analyse de completion
- 📊 Tendances hebdomadaires

</div>

---

## 🔄 Gestion des Données

### ⚡ React Query - Server State Management

```tsx
// Pattern: Requête avec cache automatique
const taskQuery = useQuery({
  queryKey: ['tasks', dateKey],      // Cache key
  queryFn: getTasks,                 // Fonction fetch
});

// Optimistic updates → UX sans latence
queryClient.setQueryData(['tasks', dateKey], newData);
```

**Avantages**:
- 🚀 Caching automatique
- 🔁 Refetch intelligent  
- 🧠 Deduplication des requêtes
- 📱 Gestion hors ligne

### 🛠️ Zustand - Client State Management

```tsx
// État global léger et performant
const selectedDate = useStore((state) => state.selectedDate);
const setSelectedDate = useStore((state) => state.setSelectedDate);
```

**Avantages**:
- ⚡ Minimaliste (~200 bytes)
- 🎯 Sélecteurs optimisés
- 💾 Persistance AsyncStorage
- 🔌 Devtools intégrés

---

## 🎬 Performance & Animations

<table>
<tr><th>Aspect</th><th>Technologie</th><th>Bénéfice</th></tr>
<tr><td>🎥 Animations</td><td>Reanimated v4</td><td>60fps sur thread natif</td></tr>
<tr><td>👆 Gestes</td><td>Gesture Handler</td><td>Drag & drop ultra-fluide</td></tr>
<tr><td>📦 Cache</td><td>React Query</td><td>Sync intelligente serveur</td></tr>
<tr><td>⏱️ UX</td><td>Optimistic Updates</td><td>Pas de latence perceptible</td></tr>
<tr><td>🎞️ Lottie</td><td>Animations JSON</td><td>Petites, vectorielles</td></tr>
</table>

---

## 📦 Scripts NPM

```bash
# 🚀 Développement
npm start              # Lance Expo avec menu interactif
npm run ios           # Compile & lance sur iOS Simulator
npm run android       # Compile & lance sur Android Emulator
npm run web           # Démarre la version web

# 🔍 Qualité de code
npm run lint          # ESLint + check TypeScript
npm run reset-project # Réinitialise le projet (backup recommandé)
```

---

## 🗄️ Base de Données (Supabase PostgreSQL)

### 📋 Tables Principales

| Table | Purpose | Clé Étrangère |
|-------|---------|---------------|
| **Profiles** | Profils utilisateurs (thème, langue, preferences) | `id` = user_id |
| **Tasks** | Tâches quotidiennes avec ordre & status | `user_id`, `date` |
| **Days** | Historique journalier + statistiques | `user_id`, `date` |

### 🔒 Sécurité avec RLS

Row Level Security (RLS) est activé sur **toutes les tables** pour:
- ✅ Isolation complète par utilisateur
- ✅ Requêtes multiples en sécurité
- ✅ Zéro risque de data leak
- ✅ Validation côté DB

```sql
-- Exemple: Chaque utilisateur ne voit que ses tâches
CREATE POLICY user_tasks ON Tasks
  USING (auth.uid() = user_id);
```

---

### 🚀 Prêt à vous lancer ?

```bash
npm install && npm start
```

**Made with ❤️ using Expo + React Native**

[⬆ back to top](#-dun)

</div>

**Made with ❤️ by Nay**
