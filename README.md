# Olivia One Meet

Meet existant sur VPS2 : https://meet-staging.o7digitalgroup.com/import

Import privé de transcriptions VTT/SRT/TXT, audio et vidéos avec piste audio ; transcription réelle avec le fournisseur Olivia existant, traduction, compte rendu avec citations et résumé court. Exports Word et texte séparés ou complets. Le connecteur Microsoft Graph après réunion est implémenté ; son utilisation attend la configuration Entra et le consentement administrateur.

**[Utilisation, configuration, limitations, tests et retour arrière](docs/OLIVIA_MEET.md)**

## Développement

```sh
npm ci
npm run build
npm test
```

Copier `.env.example` dans un fichier local, renseigner les identités vérifiées et les fournisseurs côté serveur, puis lancer :

```sh
node --env-file=.env.local server/index.mjs
```

La configuration `.env.example` utilise l’origine de production. Pour un serveur local, adapter `APP_ORIGIN` à son URL réelle et `MEET_DATA_DIR` à un chemin accessible. Le serveur sert le build Vite et les API privées. `npm run dev` seul sert l’interface sans ces API ; ne pas le présenter comme un traitement opérationnel.

## Routes

- `/`, `/import`, `/meetings` : connexion, import et documents autorisés.
- `/summary/:id` : document privé, état des traitements, exports et destinataires.
- `/new` : création d’un lien de salle LiveKit sur le domaine courant ; aucun événement calendrier ni enregistrement automatique n’est annoncé.
- `/join`, `/m/:id` : visioconférence existante ; les documents Olivia sont produits après import.
- `/api/olivia/*` : sessions, import, traitement, exports, partage et connexion Microsoft.
- `/healthz` : état et SHA de la version déployée.

## Hébergement

Le domaine existant est servi par Docker Compose dans `/srv/o7-meet-staging` sur VPS2, avec Caddy, LiveKit et Coturn. Les sources et résultats privés résident dans le volume `meet-data`. Le déploiement doit utiliser le serveur Node, pas seulement les fichiers statiques : le fichier Vercel historique ne correspond pas à cet hébergement.

Préserver le Caddyfile distant, qui contient également une route CMS. Sauvegarder l’image précédente et le code avant `docker compose ... build meet` puis `up -d --no-deps --no-build meet`. La procédure détaillée et les contrôles figurent dans la documentation de livraison.

Les anciens documents [architecture](docs/ARCHITECTURE.md), [intégrations](docs/INTEGRATIONS.md) et [étapes initiales](docs/NEXT_STEPS.md) décrivent la base de maquette ; la documentation de livraison ci-dessus décrit le fonctionnement actuel.
