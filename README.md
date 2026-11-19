# Site vitrine AVOPEDEV

Site institutionnel statique et indépendant de l’application PHP existante.

## Technologies

- HTML5
- CSS3
- JavaScript vanilla
- Aucune base de données, aucun framework, aucune dépendance d’exécution

## Pages

- `index.html` — accueil
- `about.html` — histoire, mission, vision, valeurs et objectifs
- `domains.html` — domaines d’intervention
- `achievements.html` — réalisations documentées
- `gallery.html` — galerie filtrable et visionneuse accessible
- `news.html` — actualités alimentées localement
- `article.html` — modèle réutilisable pour lire une actualité publiée
- `contact.html` — coordonnées et préparation d’un e-mail

## Tester localement

Le site charge ses contenus depuis des fichiers JSON. Il doit donc être ouvert avec un petit serveur local :

```powershell
npx serve .
```

Puis ouvrir l’adresse indiquée par le serveur.

## Vérification automatique

Le test de fumée utilise directement Chrome et Node.js, sans dépendance npm :

```powershell
node tests/site-smoke.mjs
```

Il contrôle notamment les largeurs 320, 375, 390, 768, 1024 et 1440 px, l’absence de débordement horizontal, le chargement des images, le menu mobile, les filtres et la visionneuse de la galerie, les parcours d’actualités, les articles et la validation du formulaire de contact.

## Gérer les contenus

Les actualités sont stockées dans `data/news.json` et les métadonnées de la galerie dans `data/gallery.json`. Le guide [CONTENT_GUIDE.md](CONTENT_GUIDE.md) décrit comment ajouter, modifier, masquer et publier ces contenus sans inventer d’information.

Ces fichiers JSON constituent une gestion de contenu statique : ils ne remplacent pas une interface d’administration ou un CMS.

## Avant publication

1. Valider tous les contenus, coordonnées et légendes avec AVOPEDEV.
2. Fournir le nom de domaine officiel.
3. Remplacer `https://example.invalid` dans `sitemap.xml`.
4. Ajouter l’URL du sitemap dans `robots.txt`.
5. Remplacer les chemins Open Graph relatifs par des URL absolues si la plateforme l’exige.
6. Compresser les images PNG les plus lourdes pour la production.
7. Ajouter uniquement des liens de réseaux sociaux officiellement confirmés.
8. Choisir un service externe si le formulaire doit envoyer les messages sans ouvrir la messagerie du visiteur.

## Accessibilité et interactions

- Navigation clavier et lien d’évitement
- Menu mobile accessible
- Visionneuse avec navigation par flèches, fermeture par `Échap` et boucle de focus
- Respect de `prefers-reduced-motion`
- Textes alternatifs sur les images
- Bouton de retour en haut
