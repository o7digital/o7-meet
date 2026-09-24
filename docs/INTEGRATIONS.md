# Contrats d’intégration

## Olivia One SSO

O7 Meet reste autonome. Olivia One pourra l’ouvrir sur une URL signée contenant un code à usage unique. Ce code doit être échangé côté serveur, jamais interprété comme une session fiable uniquement dans le navigateur.

Payload de session cible :

```json
{
  "userId": "user-id",
  "tenantId": "tenant-id",
  "session": "one-time-exchange-code",
  "organization": { "id": "tenant-id", "name": "Organization" },
  "role": "member",
  "permissions": ["meeting:create", "meeting:join"]
}
```

Le contrat frontend provisoire se trouve dans `src/services/auth.js`. Les rôles prévus sont `admin`, `host`, `member` et `guest`.

## Pulse CRM

`src/services/pulseCRM.js` expose les actions futures :

- envoyer un résumé ;
- créer une activité, tâche, note client ou opportunité ;
- associer une réunion à un client ou un deal.

Le service actuel retourne toujours `simulated: true`. Le futur client réel devra utiliser une API serveur authentifiée et idempotente, avec `tenantId` obligatoire.

## Olivia

`src/services/olivia.js` fournit le résumé et Ask Olivia à partir de données mockées. Le backend réel devra recevoir les segments de transcription, conserver les consentements, produire des événements versionnés et distinguer clairement les sorties partielles des résultats finaux.

## Calendar / Mail

`src/services/calendar.js` simule la création d’une réunion. Le backend devra générer le lien permanent, envoyer les invitations, gérer les récurrences et publier les mises à jour via O7 Calendar/Mail.

## Sécurité attendue

- tokens courts et échange serveur pour le SSO ;
- isolation stricte par tenant ;
- permissions vérifiées côté serveur ;
- liens invités révocables et mots de passe hashés ;
- consentement explicite avant enregistrement/transcription ;
- audit des exports Olivia et Pulse CRM.
