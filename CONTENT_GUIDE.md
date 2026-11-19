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
  "image": "assets/images/nom-fichier.webp",
  "alt": "Description factuelle de l’image",
  "imageWidth": 1600,
  "imageHeight": 1067,
  "status": "draft"
}
```

Règles à respecter :

- choisir un `id` court, unique et durable, en minuscules et sans espace ;
- saisir la date au format `AAAA-MM-JJ` ;
- copier au préalable l’image validée dans `assets/images/` ;
- décrire l’image avec un texte alternatif factuel ;
- indiquer les dimensions réelles avec `imageWidth` et `imageHeight` pour éviter les décalages de mise en page ;
- séparer les paragraphes du contenu avec `\n\n` ;
- commencer avec `"status": "draft"`, puis passer à `"published"` après validation éditoriale ;
- placer une virgule entre deux objets JSON, mais pas après le dernier objet.

Une actualité publiée apparaît automatiquement sur la page Actualités. Les trois plus récentes apparaissent sur l’accueil. Après le build, sa page statique est créée sous la forme `articles/identifiant-stable.html`. Les anciens liens `article.html?id=identifiant-stable` restent compatibles, mais ne sont pas indexés.

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
  "src": "assets/images/nom-fichier.webp",
  "srcset": "assets/images/nom-fichier-720.webp 720w, assets/images/nom-fichier.webp 1600w",
  "title": "Titre validé",
  "description": "Description factuelle validée.",
  "category": "sensibilisation",
  "alt": "Description précise de ce qui est visible",
  "width": 1600,
  "height": 1067
}
```

Les catégories actuelles sont `environnement`, `agriculture`, `sensibilisation`, `communautes` et `elevage`. Utiliser uniquement des photos dont les droits de diffusion et, lorsqu’il y a lieu, le consentement des personnes représentées ont été confirmés.

Conserver l’original JPEG et générer les variantes WebP avec :

```powershell
node scripts/optimize-images.mjs
```

Ce script local utilise Chrome, conserve l’original et n’écrit un WebP complet que s’il est au moins 5 % plus léger. Pour les images de plus de 1 000 px de large, il crée aussi une variante 720 px. Reporter ensuite les chemins réellement produits dans `gallery.json`.

## 5. Modifier une photo ou sa catégorie

Retrouver l’entrée grâce à son `id`, puis corriger le titre, la description, le texte alternatif ou la catégorie. Si l’image est remplacée, mettre également à jour `src`, `width` et `height`.

Une nouvelle valeur de catégorie crée automatiquement un filtre supplémentaire. Employer un libellé cohérent, en minuscules et sans accent, évite les doublons visuels.

## 6. Mettre à jour les coordonnées

Les coordonnées visibles se trouvent dans `contact.html` et dans les pieds de page des fichiers HTML. Rechercher l’ancienne adresse, le numéro ou l’e-mail dans tout le projet, puis remplacer chaque occurrence confirmée.

Le formulaire ne transmet rien à un serveur : après validation, il ouvre l’application de messagerie du visiteur avec un e-mail prérempli. L’adresse destinataire se trouve également dans `assets/js/main.js`. Si une réception directe des messages est nécessaire, un service de formulaire ou un backend devra être choisi séparément.

Ne publier aucun réseau social, téléphone, adresse ou horaire qui n’a pas été officiellement confirmé.

## 7. Vérifier localement

Construire le dossier public puis le servir localement :

```powershell
npm run build
npx serve dist
```

Ouvrir ensuite l’adresse locale affichée et contrôler au minimum :

- l’accueil et ses dernières actualités ;
- la recherche et les catégories de la page Actualités ;
- l’ouverture de chaque nouvel article ;
- les filtres et la visionneuse de la galerie ;
- le formulaire de contact sur mobile et ordinateur.

Lancer aussi le contrôle automatisé :

```powershell
npm test
```

Le test reconstruit également `dist`, vérifie les articles générés et confirme qu’aucun brouillon ni fichier de développement n’est publié. Un fichier JSON invalide empêche le chargement de toute la collection concernée : vérifier d’abord les guillemets, accolades, crochets et virgules.

## 8. Publier via GitHub et Vercel

Après validation locale :

```powershell
git status
git add data/news.json data/gallery.json assets/images
git commit -m "content: update official site content"
git push origin main
```

Adapter la commande `git add` aux fichiers réellement modifiés, notamment les pages HTML si les coordonnées ont changé. Ne pas inclure de fichiers personnels ou non validés.

Lorsque le dépôt GitHub est connecté à un projet Vercel, le `push` sur la branche de production déclenche normalement un nouveau déploiement. `vercel.json` demande à Vercel d’exécuter `npm run build` et de servir uniquement le dossier `dist`. Aucun backend n’est créé.

Contrôler le résultat du build et l’URL publique dans le tableau de bord Vercel. L’adresse `avopedev.vercel.app` est seulement envisagée : ne pas la considérer disponible tant que Vercel ne l’a pas réellement attribuée au projet.

Après confirmation de l’URL HTTPS, remplacer uniquement la chaîne vide du champ `productionUrl` dans `site.config.json` par l’adresse exacte attribuée. Le build utilisera cette valeur pour les liens canoniques, les URL Open Graph, `sitemap.xml` et `robots.txt`. Relancer ensuite `npm run build` et `npm test` avant le push.

## SEO des articles

`scripts/generate-articles.mjs` lit uniquement les actualités publiées et produit une page HTML complète avec titre, description, Open Graph, date et contenu. `npm run build` lance automatiquement cette génération dans `dist/articles/`.

La page dynamique `article.html?id=…` reste disponible pour les anciens liens mais porte une directive `noindex`. Tant que `productionUrl` n’est pas configurée, les pages générées ne reçoivent volontairement ni URL canonique ni `og:url` absolue.
