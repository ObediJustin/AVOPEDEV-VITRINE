# Site vitrine AVOPEDEV

Site institutionnel statique et indépendant de l’application PHP existante.

## Technologies

- HTML5
- CSS3
- JavaScript vanilla
- Aucune base de données, aucun framework, aucune dépendance d’exécution
- Node.js utilisé uniquement pour préparer le dossier statique `dist`

## Pages

- `index.html` — accueil
- `about.html` — histoire, mission, vision, valeurs et objectifs
- `domains.html` — domaines d’intervention
- `achievements.html` — réalisations documentées
- `gallery.html` — galerie filtrable et visionneuse accessible
- `news.html` — actualités alimentées localement
- `article.html` — page de compatibilité pour les anciens liens dynamiques
- `articles/<id>.html` — pages SEO générées pour les actualités publiées
- `contact.html` — coordonnées et préparation d’un e-mail

## Tester localement

Construire d’abord le site public, y compris les articles et le sitemap :

```powershell
npm run build
npx serve dist
```

Le dossier `dist` est recréé à chaque build. Il contient uniquement les ressources destinées à la publication ; les brouillons, tests, scripts et guides n’y sont pas copiés.

## Vérification automatique

Le test de fumée utilise directement Chrome et Node.js, sans dépendance npm :

```powershell
npm test
```

Il reconstruit `dist` puis contrôle notamment les largeurs 320, 375, 390, 667×375, 768, 1024 et 1440 px, l’absence de débordement horizontal, le chargement des images, le menu mobile, les filtres, la visionneuse, les articles générés, l’exclusion des brouillons, les en-têtes de sécurité et le formulaire de contact.

## Gérer les contenus

Les actualités sont stockées dans `data/news.json` et les métadonnées de la galerie dans `data/gallery.json`. Le guide [CONTENT_GUIDE.md](CONTENT_GUIDE.md) décrit comment ajouter, modifier, masquer et publier ces contenus sans inventer d’information.

Ces fichiers JSON constituent une gestion de contenu statique : ils ne remplacent pas une interface d’administration ou un CMS.

## Avant publication

1. Valider tous les contenus, coordonnées et légendes avec AVOPEDEV.
2. Créer le projet Vercel avec la racine de ce dépôt et vérifier l’URL réellement attribuée.
3. Renseigner cette URL HTTPS dans `productionUrl` de `site.config.json`.
4. Relancer `npm run build` et vérifier les canoniques, Open Graph, `sitemap.xml` et `robots.txt` dans `dist`.
5. Lancer `npm test`.
6. Ajouter uniquement des liens de réseaux sociaux officiellement confirmés.
7. Choisir un service externe uniquement si le formulaire doit un jour envoyer les messages sans ouvrir la messagerie du visiteur.

Le sous-domaine `avopedev.vercel.app` est envisagé, mais il ne doit être inscrit dans `site.config.json` qu’après confirmation de son attribution dans Vercel.

## Déploiement Vercel

Le fichier `vercel.json` demande à Vercel d’exécuter `npm run build` et de publier uniquement `dist`. Aucun backend, aucune fonction et aucune réécriture de route ne sont nécessaires. Les en-têtes de sécurité sont également déclarés dans ce fichier.

Une connexion du dépôt GitHub au projet Vercel permet ensuite à chaque push sur la branche de production de déclencher un build. Aucun déploiement n’est effectué automatiquement par les scripts locaux.

## Accessibilité et interactions

- Navigation clavier et lien d’évitement
- Menu mobile accessible
- Visionneuse avec navigation par flèches, fermeture par `Échap` et boucle de focus
- Respect de `prefers-reduced-motion`
- Textes alternatifs sur les images
- Bouton de retour en haut
