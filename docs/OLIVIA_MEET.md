# Olivia One Meet — livraison du 18 novembre 2026

## Utilisation le 19 novembre

URL existante : https://meet-staging.o7digitalgroup.com/import

1. Se connecter avec le compte de messagerie Olivia One autorisé et son mot de passe habituel. L’identité Olivier Steineur / info@o7digitalgroup.com a été vérifiée dans Mailcow. Aucun mot de passe de messagerie n’est conservé par Meet.
2. Choisir un fichier VTT, SRT ou TXT, ou un audio (MP3/WAV/M4A/WebM/OGG/FLAC/AAC/Opus) ou une vidéo avec piste audio (MP4/MOV/MKV/WebM).
3. Renseigner le titre, éventuellement la date réelle de réunion, la langue originale ou sa détection, puis la langue cible. Cliquer **Importer et traiter**.
4. Consulter séparément l’original, sa traduction, le compte rendu et le résumé. Chaque document terminé peut être téléchargé en Word ou texte. Le dossier complet nécessite les quatre étapes.
5. Si une étape échoue, utiliser **Reprendre les étapes restantes**. Les transcriptions audio par tranche de dix minutes et traductions par lot déjà terminées sont conservées. Le traitement ne repart pas de zéro.
6. Le propriétaire choisit les destinataires dans l’annuaire des identités vérifiées puis enregistre les accès. Le lien copié exige une connexion et une autorisation serveur. Aucun lien public ni notification automatique n’est créé.

Les fichiers sont privés par défaut. Le propriétaire peut supprimer la source et les documents Olivia. Les utilisateurs partagés ont la lecture et le téléchargement seulement. Révoquer un accès bloque les lectures suivantes. Les droits Microsoft sur les fichiers originaux restent indépendants.

Laetitia : aucune identité correspondante n’a été trouvée dans Mailcow lors de la vérification ciblée. Son adresse/compte doit être confirmé puis vérifié avant ajout à `MEET_IDENTITIES_JSON`. Ne pas utiliser une adresse déduite de son nom. Tant qu’elle n’est pas configurée, le partage avec elle n’est pas livré.

## Traitements et limites

- API authentifiée `/api/olivia`, sessions opaques de huit heures, cookies HttpOnly/Secure/SameSite, CSRF et contrôle d’origine pour les écritures ; aucun identifiant du navigateur ne suffit à ouvrir un document.
- Réutilisation du fournisseur OpenAI déjà opérationnel dans Olivia One sur VPS1 : `whisper-1` pour l’audio avec horodatages ; `gpt-4o` pour la traduction, le compte rendu et le résumé. La clé reste côté serveur. Aucun service de réunion supplémentaire.
- FFmpeg extrait la première piste audio et la découpe en tranches ; voix sans noms fiables : **Intervenant non identifié**. Aucun algorithme d’attribution d’identité ni de diarisation n’est annoncé.
- Les décisions/actions doivent comporter une citation retrouvée dans la transcription originale ; sinon l’étape échoue. Un responsable ou une échéance doit figurer littéralement dans cette citation. Les dates relatives restent relatives. Une validation humaine des documents générés reste possible dans les citations affichées.
- VTT Teams : balises voix, noms disponibles, horodatages à la milliseconde et lignes multiples conservés. TXT/SRT en UTF-8 ou UTF-16. L’original importé est également téléchargeable sans modification.
- 250 Mo et quatre heures maximum par audio/vidéo ; texte limité à 1 Mo et 220 000 caractères. Pas de troncature silencieuse. Les longues réunions peuvent être importées en plusieurs parties.
- Déduplication par propriétaire, empreinte du contenu, langues et identité d’artefact Microsoft. L’importer à nouveau avec une autre langue crée un document distinct, privé.
- Le volume Docker `meet-data` conserve sources, documents et état des étapes. Les jetons Microsoft sont chiffrés AES-256-GCM avec une clé propre au volume. Les sources/documents sont protégés par les permissions du volume et de l’API ; aucune affirmation de chiffrement de disque n’est faite.
- Au redémarrage pendant un traitement, l’interface propose une reprise ; pas de tâche déclarée terminée sans résultats persistés.
- La passerelle principale Olivia One de VPS1 était arrêtée au contrôle (`Exited (1)`). L’envoi de notifications n’a donc pas été raccordé. Aucun véritable message n’a été envoyé pendant les tests.
- Les notes IA, réunions d’exemple, portraits fictifs et messages de chat de démonstration ont été retirés du parcours utilisé. La création produit un vrai lien de salle sur le domaine actuel, sans prétendre créer un événement de calendrier. Le panneau dans la salle indique explicitement que la transcription en direct n’est pas activée. La sortie d’une salle mène à l’import et ne crée aucun faux compte rendu.

## Connecteur Microsoft après réunion

Implémentation : OAuth professionnel dans une organisation configurée, code d’autorisation avec PKCE, état/nonce liés à la session, validation cryptographique du jeton d’identité, renouvellement des jetons côté serveur. Sélection du calendrier puis résolution de la réunion via Graph, liste des transcriptions/enregistrements, récupération dans le même pipeline privé et déduplication. Aucune récupération n’est accordée sur la seule possession d’un lien Teams.

Configuration non trouvée au 18 novembre :

- `MICROSOFT_TENANT_ID` : UUID du tenant Microsoft 365 organisateur.
- `MICROSOFT_CLIENT_ID` : inscription d’application Entra de cette organisation.
- `MICROSOFT_CLIENT_SECRET` : secret de l’application web, jamais exposé au navigateur.
- URI de redirection **Web**, à enregistrer exactement : `https://meet-staging.o7digitalgroup.com/api/olivia/teams/callback`.
- Permissions **déléguées** : `openid`, `profile`, `offline_access`, `Calendars.ReadBasic`, `OnlineMeetings.Read`, `OnlineMeetingTranscript.Read.All`. Consentement administrateur pour la lecture des transcriptions et règles du tenant compatibles.
- Option enregistrements : ajouter/consentir `OnlineMeetingRecording.Read.All` uniquement si souhaité ; la connexion de base ne la demande pas.

Les permissions d’application à l’échelle du tenant, l’accès aux fichiers générique et les droits d’écriture calendrier ne sont pas demandés. Le flux délégué n’exige pas d’installer une application Teams ; aucun manifeste artificiel avec des identifiants inventés n’est fourni.

Les réunions doivent avoir une transcription/un enregistrement produit puis publié par Teams et être encore accessibles. La présence dans le calendrier ne garantit pas l’accès aux artefacts ; l’organisateur et les règles Teams restent déterminants. Les refus 403, contenus non encore publiés/expirés et jetons révoqués ont des erreurs dédiées. Si l’attribution des intervenants est interdite par le tenant, un nouvel essai au format sans noms conserve les horodatages. Si Graph est désactivé pour les transcriptions, aucune tentative de contournement.

Documentation Microsoft vérifiée le 18 novembre 2026 :

- [Calendrier, permission minimale Calendars.ReadBasic](https://learn.microsoft.com/en-us/graph/api/user-list-calendarview?view=graph-rest-1.0)
- [Résolution d’une réunion, organisateur/invité et lien](https://learn.microsoft.com/en-us/graph/api/onlinemeeting-get?view=graph-rest-1.0)
- [Liste des transcriptions et restrictions](https://learn.microsoft.com/en-us/graph/api/onlinemeeting-list-transcripts?view=graph-rest-1.0)
- [Contenu, formats et contrôles administrateur](https://learn.microsoft.com/en-us/graph/api/calltranscript-get?view=graph-rest-1.0)
- [Enregistrements et permissions](https://learn.microsoft.com/en-us/graph/api/onlinemeeting-list-recordings?view=graph-rest-1.0)

Le connecteur est testé par réponses Graph contrôlées : erreurs de consentement, jeton expiré/renouvellement, politique des noms, pagination et accès optionnel aux enregistrements. Aucun accès à une vraie réunion Microsoft n’est annoncé tant que la configuration Entra et le consentement ne sont pas fournis.

## Bot audio en direct : étape distincte

Un bot recevant les flux audio requiert un enregistrement Bot/Entra, les autorisations d’appel/médias appropriées avec consentement administrateur, un webhook et les règles d’admission, puis une infrastructure adaptée au SDK média Microsoft. Le parcours officiel application-hosted media utilise C#/.NET, `Microsoft.Graph.Communications.Calls.Media`, Windows Server dans Azure, une IP publique et des ports média. Le simple manifeste d’une application Teams ne fournit aucun accès à l’audio. Cette infrastructure n’est ni souscrite ni créée et n’est pas requise pour l’import ou Graph après réunion. [Prérequis officiels](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/calls-and-meetings/requirements-considerations-application-hosted-media-bots).

## Validation et hébergement

Base : branche distante et checkout propre `staging/o7-meet-webrtc`, commit `5c7c1392a43d164624b51695199075967b0bdeb7`. Le serveur déployé avait la même empreinte SHA-256 (`b1317ff...`) que `server/index.mjs` de cette base. Le déploiement était un bundle sans `.git`, dans `/srv/o7-meet-staging`. Les branches distantes ont été relues ; `main` reste à `893430a`. Les modifications locales des autres dépôts Olivia n’ont pas été touchées.

Meet est réellement servi par Docker Compose sur VPS2, avec Caddy, LiveKit et Coturn existants. Le fichier Vercel historique ne correspond pas à l’hébergement de ce domaine. Le déploiement utilise donc la CLI Docker Compose. Le Caddyfile distant contient aussi le CMS éditorial : il est préservé, sans remplacement par le fichier local.

Contrôles reproductibles : `npm test`, `npm run build`, `git diff --check`, `npm audit --omit=dev`. Le test volontaire `tests/live-smoke.mjs` accepte ses secrets par stdin et effectue de vrais appels au fournisseur ; il ne s’exécute pas dans la suite unitaire.

Les tests couvrent import/encodage, citations vérifiables, compte rendu sans propriétaire/date inventés, exports DOCX inspectés comme ZIP/XML et TXT UTF-8 avec BOM, absence d’IA configurée sans simulation, déduplication, reprise après erreur, pages/API/sources/exports inaccessibles à un autre compte, partage et révocation, CSRF et erreurs Graph. Le fichier de validation audio est une voix synthétique créée pour le test ; aucune conversation privée ni aucun courriel réel ne sont utilisés.

### Retour arrière

Avant déploiement, conserver l’ID de l’image courante et une archive privée du code/configuration dans `/srv/o7-meet-backups/<release>/`. Étiqueter cette image `o7-meet:rollback-<release>`. Le volume `meet-data` ne doit jamais être supprimé par le retour arrière.

Pour revenir à l’image sauvegardée, créer un fichier `rollback.yml` avec :

```yaml
services:
  meet:
    image: o7-meet:rollback-<release>
```

Puis depuis `/srv/o7-meet-staging` :

```sh
docker compose --env-file .env.staging -p o7-meet-staging -f docker-compose.staging.yml -f rollback.yml up -d --no-deps --no-build meet
```

Ne pas recréer Caddy, LiveKit ou Coturn ; vérifier `/healthz` et le domaine existant. L’ancienne version réaffiche l’ancienne interface de démonstration ; les données privées restent dans le volume, absentes de cette ancienne interface.
