# Guide de gestion des contenus AVOPEDEV

Ce site est entièrement statique. Les actualités et la galerie sont gérées dans des fichiers JSON versionnés avec le code :

- `data/news.json` pour les actualités ;
- `data/gallery.json` pour les photos et leurs métadonnées.

Il ne s’agit pas d’une interface d’administration ni d’un CMS. Toute modification doit être relue, testée puis publiée dans le dépôt GitHub avant d’apparaître sur Vercel. N’ajoutez que des informations, dates, coordonnées et légendes validées par AVOPEDEV.

## 1. Ajouter une actualité

Ouvrir `data/news.json` et ajouter un objet dans la liste. Cet exemple sert uniquement de modèle et ne décrit pas une activité réelle :

```json
{
  "id": "identifiant-stable",
  "title": "Titre validé",
  "date": "2026-01-31",
  "category": "Catégorie validée",
  "summary": "Résumé validé.",
  "content": "Premier paragraphe.\n\nDeuxième paragraphe.",
  "image": "assets/images/nom-fichier.jpg",
  "alt": "Description factuelle de l’image",
  "status": "draft"
}
```

Règles à respecter :

- choisir un `id` court, unique et durable, en minuscules et sans espace ;
- saisir la date au format `AAAA-MM-JJ` ;
- copier au préalable l’image validée dans `assets/images/` ;
- décrire l’image avec un texte alternatif factuel ;
- séparer les paragraphes du contenu avec `\n\n` ;
- commencer avec `"status": "draft"`, puis passer à `"published"` après validation éditoriale ;
- placer une virgule entre deux objets JSON, mais pas après le dernier objet.

Une actualité publiée apparaît automatiquement sur la page Actualités. Les trois plus récentes apparaissent sur l’accueil. Son adresse est construite sous la forme `article.html?id=identifiant-stable`.

## 2. Modifier une actualité

Retrouver l’objet grâce à son `id`, modifier uniquement les champs validés, puis enregistrer le fichier. Éviter de changer l’identifiant après publication : les liens déjà partagés ne fonctionneraient plus.

Pour préparer une correction sans l’afficher publiquement, repasser temporairement son statut à `draft`, effectuer la modification, la vérifier, puis remettre le statut à `published`.

## 3. Masquer ou retirer une actualité

La méthode recommandée pour masquer une actualité est de remplacer :

```json
"status": "published"
```

par :

```json
"status": "draft"
```

Elle disparaît alors de l’accueil, de la liste et de la page article publique, tout en restant dans l’historique éditorial. Pour la retirer définitivement du fichier, supprimer l’objet complet en veillant à conserver un JSON valide et les virgules entre les objets.

## 4. Ajouter une photo à la galerie

Copier l’image autorisée dans `assets/images/`, relever ses dimensions réelles, puis ajouter un objet à `data/gallery.json`. L’exemple ci-dessous est un modèle :

```json
{
  "id": "photo-identifiant-stable",
  "src": "assets/images/nom-fichier.jpg",
  "title": "Titre validé",
  "description": "Description factuelle validée.",
  "category": "sensibilisation",
  "alt": "Description précise de ce qui est visible",
  "width": 1600,
  "height": 1067
}
```

Les catégories actuelles sont `environnement`, `agriculture`, `sensibilisation`, `communautes` et `elevage`. Utiliser uniquement des photos dont les droits de diffusion et, lorsqu’il y a lieu, le consentement des personnes représentées ont été confirmés.

## 5. Modifier une photo ou sa catégorie

Retrouver l’entrée grâce à son `id`, puis corriger le titre, la description, le texte alternatif ou la catégorie. Si l’image est remplacée, mettre également à jour `src`, `width` et `height`.

Une nouvelle valeur de catégorie crée automatiquement un filtre supplémentaire. Employer un libellé cohérent, en minuscules et sans accent, évite les doublons visuels.

## 6. Mettre à jour les coordonnées

Les coordonnées visibles se trouvent dans `contact.html` et dans les pieds de page des fichiers HTML. Rechercher l’ancienne adresse, le numéro ou l’e-mail dans tout le projet, puis remplacer chaque occurrence confirmée.

Le formulaire ne transmet rien à un serveur : après validation, il ouvre l’application de messagerie du visiteur avec un e-mail prérempli. L’adresse destinataire se trouve également dans `assets/js/main.js`. Si une réception directe des messages est nécessaire, un service de formulaire ou un backend devra être choisi séparément.

Ne publier aucun réseau social, téléphone, adresse ou horaire qui n’a pas été officiellement confirmé.

## 7. Vérifier localement

Une ouverture directe en `file://` ne permet pas toujours de charger les fichiers JSON. Depuis le dossier du site, démarrer un serveur :

```powershell
npx serve .
```

Ouvrir ensuite l’adresse locale affichée et contrôler au minimum :

- l’accueil et ses dernières actualités ;
- la recherche et les catégories de la page Actualités ;
- l’ouverture de chaque nouvel article ;
- les filtres et la visionneuse de la galerie ;
- le formulaire de contact sur mobile et ordinateur.

Lancer aussi le contrôle automatisé :

```powershell
node tests/site-smoke.mjs
```

Un fichier JSON invalide empêche le chargement de toute la collection concernée. En cas d’erreur, vérifier d’abord les guillemets, accolades, crochets et virgules.

## 8. Publier via GitHub et Vercel

Après validation locale :

```powershell
git status
git add data/news.json data/gallery.json assets/images
git commit -m "content: update official site content"
git push origin main
```

Adapter la commande `git add` aux fichiers réellement modifiés, notamment les pages HTML si les coordonnées ont changé. Ne pas inclure de fichiers personnels ou non validés.

Lorsque le dépôt GitHub est connecté à un projet Vercel, le `push` sur la branche de production déclenche normalement un nouveau déploiement. Ce site n’exige ni commande de build ni backend : Vercel doit servir la racine du projet comme site statique. Contrôler le déploiement dans le tableau de bord Vercel, puis vérifier l’URL publique. Le domaine officiel et les variables de projet se configurent dans Vercel, pas dans les fichiers JSON.

## Limite SEO des articles dynamiques

La page `article.html` charge son contenu dans le navigateur en fonction du paramètre `id`. Le titre et la description sont mis à jour en JavaScript, mais certains robots, aperçus de réseaux sociaux et outils de partage peuvent ne voir que les métadonnées génériques du fichier HTML.

Si le référencement individuel ou les aperçus sociaux de chaque actualité deviennent prioritaires, il faudra générer une page HTML statique par article au moment du déploiement, ou adopter un générateur de site/CMS capable de pré-rendre ces pages.
