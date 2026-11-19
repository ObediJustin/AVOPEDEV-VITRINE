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

    container.replaceChildren(...filteredItems.map((item) => window.AVOPEDEV_CONTENT.createNewsCard(item)));
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
