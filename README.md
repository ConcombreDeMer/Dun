# Dun

Application d'organisation quotidienne pour iPhone, en reprise de développement.

## Références

- [ROADMAP_PRODUCTION.md](ROADMAP_PRODUCTION.md) : suivi principal, preuves E01–E20 et décisions Q/L.
- [Spécification V1](docs/product-v1.md) : gratuit local sans compte, Dun+, journée à **minuit**.
- [Contrat de données](docs/data-contract-v1.md) : cible avant SQLite et bascule des écrans.
- [Contrôles et résultats](docs/quality.md) : installation, tests, défauts préexistants et limites.
- [ROADMAP.md](ROADMAP.md) : traçabilité des anciens identifiants DUN, subordonnée à la référence consolidée.

Le code actuel dépend encore de Supabase pour les données métier. La V1 locale/hors ligne, le cloud autorisé côté serveur et les nouvelles règles produit ne sont pas encore livrés. React Query/Zustand ne constituent pas une sauvegarde persistante. La présence de RLS n'est pas une preuve d'isolation complète : voir E03/E20.

## Stack et outillage

Versions verrouillées au début de la reprise : Expo 56.0.5, React Native 0.85.3, React 19.2.3, Expo Router 56.2.7, TypeScript 6.0.3. `package.json` et `package-lock.json` font foi. Aucun changement de SDK dans ces lots.

Contrôles : Node **24.21.0** (`.nvmrc`), npm **11.6.2** ; Deno **2.9.6** et Jest fournis comme dépendances de développement. Si nécessaire, sélectionner Node avec son gestionnaire habituel puis installer cette version de npm. Les tests ne nécessitent aucune clé Supabase, RevenueCat, Apple ou Sentry.

```sh
npm ci
npm run quality
npm run i18n:generate
git diff --exit-code -- lib/i18n/resources.ts
```

`quality` lance les typechecks app/Node/tests/Deno, le lint de tout le code et Jest. Les imports publics Deno sont téléchargés au premier contrôle et vérifiés contre `supabase/functions/deno.lock`. Le `postinstall` maintient le lien macros existant sous `node_modules`, sans générer `ios/`.

`npm run test:regressions` exécute volontairement les trois attentes V1 encore non respectées : son échec est documenté, pas un contrôle vert de conformité. Voir [quality.md](docs/quality.md).

## Développement et traductions

```sh
npm start
npm run ios
```

L'app emploie des modules natifs ; le parcours de référence utilise un build de développement iOS. Ne pas supposer qu'Expo Go suffit. `npm run ios` peut modifier le projet natif généré ; il ne fait pas partie des contrôles sans build.

Modifier les YAML dans `locales/`, puis lancer `npm run i18n:generate` et inclure `lib/i18n/resources.ts`. `npm run lint` n'est pas un typecheck : les commandes sont distinctes.

`reset-project` est un script historique dont la cible est absente ; ne pas l'utiliser comme procédure de reprise. Aucun nettoyage/reset de données implicite.

## Environnements et livraison

E20 relève **app locale sur Dun, CLI Supabase liée à Dun Prod**. Ne pas lancer de migration distante depuis ce dépôt sans procédure de cible explicite et autorisation dédiée. Les secrets restent hors Git ; ne jamais recopier `.env` dans un rapport ou une fixture.

Livraison retenue : workspace et scheme Xcode à documenter dans PROD-025, configuration Release → Archive → validation/envoi via Organizer → traitement et installation TestFlight → App Store Connect. EAS est facultatif ; `eas.json` n'atteste pas la configuration Xcode. `ios/` et `android/` sont ignorés et non suivis ; préserver tout projet local. Aucune archive reproductible/signée n'est certifiée par les contrôles JS.

Lancement France, app et présentation FR/EN. Matériel disponible : iPhone 15 Pro Max ; autres tailles/versions au simulateur et second appareil/bêta-testeur à organiser. Achats, notifications et convergence physique restent à tester dans les lots prévus.
