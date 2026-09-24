# O7 Meet

Frontend React/Vite autonome pour O7 Meet. Cette première passe transforme le mockup validé en une base modulaire, responsive et navigable, prête à accueillir un fournisseur WebRTC, Olivia, Pulse CRM et le SSO Olivia One.

## Démarrer

```bash
npm install
npm run dev
```

Puis ouvrir l’URL Vite affichée. La langue par défaut est l’espagnol ; le sélecteur ES/EN/FR conserve le choix localement.

## Scripts

- `npm run dev` : serveur local avec hot reload
- `npm run build` : build de production dans `dist/`
- `npm run preview` : prévisualisation locale du build

## Parcours disponibles

- `/` — dashboard, recherche, réunions à venir et récentes
- `/new` — création et programmation de réunion
- `/join` — accès par code/lien, y compris en mode invité
- `/m/:id` — salle de réunion interactive avec dispositions, contrôles et panneaux
- `/summary/:id` — compte-rendu Olivia, transcription, tâches et actions
- `/meetings` — historique filtrable

Toutes les interactions vidéo, Olivia, Calendar et Pulse CRM sont explicitement simulées. L’interface ne prétend pas communiquer avec un backend tant que celui-ci n’est pas configuré.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Contrats d’intégration](docs/INTEGRATIONS.md)
- [Prochaines étapes](docs/NEXT_STEPS.md)

## Déploiement

Le projet produit un site statique Vite. L’hébergeur devra rediriger les routes applicatives (`/m/*`, `/summary/*`, etc.) vers `index.html`. Aucun environnement de production n’est lié à ce dépôt pour le moment.
