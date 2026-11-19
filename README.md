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
- `contact.html` — coordonnées et préparation d’un e-mail

## Tester localement

Le site fonctionne par simple ouverture de `index.html`. Pour reproduire au mieux un hébergement web :

```powershell
npx serve .
```

Puis ouvrir l’adresse indiquée par le serveur.

## Ajouter une actualité

Modifier `data/news.js` et ajouter un objet dans `window.AVOPEDEV_NEWS` :

```js
{
  title: "Titre vérifié",
  date: "2026-11-19",
  summary: "Résumé validé par AVOPEDEV.",
  image: "assets/images/nom-image.jpg",
  url: ""
}
```

La liste est vide par défaut afin de ne pas inventer de nouvelles.

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
