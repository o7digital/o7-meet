# Prochaines étapes

## Backend

1. Définir les ressources API `meetings`, `participants`, `recordings`, `transcripts` et `summaries`.
2. Ajouter la persistance multi-tenant et les gardes de rôles.
3. Générer des liens de salle aléatoires, non prédictibles et révocables.
4. Ajouter notifications, invitations et récurrences côté serveur.

## LiveKit / WebRTC

1. Créer `LiveKitVideoProvider` derrière le contrat existant.
2. Émettre les jetons de salle uniquement depuis le backend.
3. Brancher les événements de connexion, reconnexion, permissions et déconnexion.
4. Ajouter le rendu des pistes média, la sélection réelle des périphériques et les tests multi-navigateurs.

## Olivia

1. Connecter la transcription temps réel avec consentement visible.
2. Faire transiter les segments vers un pipeline IA serveur.
3. Persister les versions de résumé, décisions, tâches et engagements.
4. Relier Ask Olivia uniquement aux données autorisées du tenant.

## Pulse CRM

1. Remplacer le mock par un client backend authentifié.
2. Ajouter un écran de mapping client/deal et une confirmation avant envoi.
3. Rendre les écritures idempotentes et afficher les erreurs/réessais.

## Qualité et exploitation

1. Ajouter tests unitaires, tests composants et tests end-to-end.
2. Compléter le catalogue i18n ES/EN/FR au-delà des éléments de navigation.
3. Configurer observabilité, politiques de rétention et audit.
4. Lier un projet d’hébergement avec fallback SPA, puis valider `meet.o7digital.com` avant mise en production.
