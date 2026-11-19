(() => {
  const container = document.querySelector("[data-news-list]");
  const searchInput = document.querySelector("[data-news-search]");
  const categorySelect = document.querySelector("[data-news-category]");
  const status = document.querySelector("[data-news-status]");
  const emptyState = document.querySelector("[data-news-empty]");
  const emptyTitle = document.querySelector("[data-news-empty-title]");
  const emptyMessage = document.querySelector("[data-news-empty-message]");
  const errorState = document.querySelector("[data-news-error]");
  if (!container || !window.AVOPEDEV_CONTENT) return;

  let publishedItems = [];

  const createNewsCard = (item) => {
    const article = document.createElement("article");
    article.className = "news-card";

    if (item.image) {
      const media = document.createElement("img");
      media.src = item.image;
      media.alt = item.alt;
      media.loading = "lazy";
      media.decoding = "async";
      article.append(media);
    }

    const body = document.createElement("div");
    body.className = "news-card-body";
    const meta = document.createElement("div");
    meta.className = "news-card-meta";
    const category = document.createElement("span");
    category.className = "category-badge";
    category.textContent = item.category;
    const time = document.createElement("time");
    time.dateTime = item.date;
    time.textContent = window.AVOPEDEV_CONTENT.formatNewsDate(item.date);
    meta.append(category, time);

    const heading = document.createElement("h2");
    heading.textContent = item.title;
    const summary = document.createElement("p");
    summary.textContent = item.summary;
    const link = document.createElement("a");
    link.className = "button button--ghost";
    link.href = window.AVOPEDEV_CONTENT.getArticleUrl(item.id);
    link.textContent = "Lire la suite";
    body.append(meta, heading, summary, link);
    article.append(body);
    return article;
  };

  const showEmptyState = (hasPublishedItems) => {
    emptyTitle.textContent = hasPublishedItems ? "Aucun résultat" : "Aucune actualité publiée pour le moment";
    emptyMessage.textContent = hasPublishedItems
      ? "Modifiez votre recherche ou choisissez une autre catégorie."
      : "Les prochaines nouvelles officielles d’AVOPEDEV seront ajoutées ici après validation.";
    emptyState.hidden = false;
  };

  const render = () => {
    const query = searchInput.value.trim().toLocaleLowerCase("fr");
    const selectedCategory = categorySelect.value;
    const filteredItems = publishedItems.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const searchableText = `${item.title} ${item.summary} ${item.content}`.toLocaleLowerCase("fr");
      return matchesCategory && (!query || searchableText.includes(query));
    });

    container.replaceChildren(...filteredItems.map(createNewsCard));
    emptyState.hidden = filteredItems.length > 0;
    if (!filteredItems.length) showEmptyState(publishedItems.length > 0);
    status.textContent = publishedItems.length
      ? `${filteredItems.length} actualité${filteredItems.length > 1 ? "s" : ""} affichée${filteredItems.length > 1 ? "s" : ""}`
      : "Aucune actualité publiée";
  };

  const initialize = async () => {
    try {
      publishedItems = await window.AVOPEDEV_CONTENT.loadPublishedNews();
      const categories = [...new Set(publishedItems.map((item) => item.category))].sort((a, b) => a.localeCompare(b, "fr"));
      categories.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        categorySelect.append(option);
      });
      searchInput.disabled = publishedItems.length === 0;
      categorySelect.disabled = publishedItems.length === 0;
      render();
    } catch (error) {
      container.replaceChildren();
      emptyState.hidden = true;
      errorState.hidden = false;
      status.textContent = "Erreur de chargement";
      console.error("Impossible de charger les actualités.", error);
    }
  };

  searchInput.addEventListener("input", render);
  categorySelect.addEventListener("change", render);
  initialize();
})();
