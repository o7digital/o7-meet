# Architecture O7 Meet

## Principes

- L’UI ne dépend pas directement d’un fournisseur vidéo.
- Les intégrations externes passent par `src/services`.
- Les domaines fonctionnels sont isolés dans `src/features`.
- Les pages composent ces modules sans contenir les contrats backend.
- Les données de démonstration sont identifiées comme telles dans l’interface.

## Structure

```text
src/
  components/       UI partagée et shell
  features/
    meetings/       données et composants de réunion
    olivia/          Meeting Copilot
    participants/    participants et invitations
    video/           contrat fournisseur + adaptateur mock
  hooks/             navigation, contrôles meeting et feedback
  lib/               i18n
  pages/             écrans navigables
  services/          frontières Auth, Calendar, Olivia et Pulse CRM
  types/             modèle de domaine documenté
```

## Navigation

La première version utilise l’API History du navigateur afin d’éviter une dépendance de routage. Les routes sont découpées par lazy loading. Un routeur complet pourra être introduit lorsque les loaders serveur, gardes d’authentification et erreurs de route le justifieront.

## Vidéo

`VideoProvider` définit le contrat minimal : connexion, déconnexion, microphone, caméra, partage d’écran et périphériques. `MockVideoProvider` fait fonctionner l’interface aujourd’hui. Un futur `LiveKitVideoProvider` implémentera le même contrat, ce qui limite le couplage du produit à LiveKit.

## États UX

Le frontend prévoit les états loading, connexion, erreur de périphérique, participant déconnecté, résultats vides et fin de réunion. Les états réseau `reconnecting` et `permission-denied` devront être alimentés par le futur adaptateur WebRTC.
