(() => {
  const title = document.querySelector("[data-article-title]");
  const summary = document.querySelector("[data-article-summary]");
  const category = document.querySelector("[data-article-category]");
  const categoryBadge = document.querySelector("[data-article-category-badge]");
  const date = document.querySelector("[data-article-date]");
  const image = document.querySelector("[data-article-image]");
  const body = document.querySelector("[data-article-body]");
  const content = document.querySelector("[data-article-content]");
  const missingState = document.querySelector("[data-article-missing]");
  const stateTitle = document.querySelector("[data-article-state-title]");
  const stateMessage = document.querySelector("[data-article-state-message]");
  if (!title || !window.AVOPEDEV_CONTENT) return;

  const showMissingState = (loadError = false) => {
    title.textContent = loadError ? "Actualité indisponible" : "Actualité introuvable";
    summary.textContent = loadError
      ? "Le contenu n’a pas pu être chargé pour le moment."
      : "Cette actualité n’existe pas ou n’est pas publiée.";
    stateTitle.textContent = title.textContent;
    stateMessage.textContent = summary.textContent;
    missingState.hidden = false;
    content.hidden = true;
    document.title = `${title.textContent} — AVOPEDEV`;
  };

  const updateMetadata = (item) => {
    document.title = `${item.title} — AVOPEDEV`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", item.summary);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", item.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", item.summary);
    if (item.image) document.querySelector('meta[property="og:image"]')?.setAttribute("content", item.image);
  };

  const renderArticle = (item) => {
    title.textContent = item.title;
    summary.textContent = item.summary;
    category.textContent = item.category;
    categoryBadge.textContent = item.category;
    date.dateTime = item.date;
    date.textContent = window.AVOPEDEV_CONTENT.formatNewsDate(item.date);

    if (item.image) {
      image.src = item.image;
      image.alt = item.alt;
      image.decoding = "async";
      image.hidden = false;
    }

    const paragraphs = (item.content || item.summary)
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => {
        const element = document.createElement("p");
        element.textContent = paragraph;
        return element;
      });
    body.replaceChildren(...paragraphs);
    content.hidden = false;
    missingState.hidden = true;
    updateMetadata(item);
  };

  const initialize = async () => {
    const id = new URLSearchParams(window.location.search).get("id")?.trim();
    if (!id) {
      showMissingState();
      return;
    }

    try {
      const items = await window.AVOPEDEV_CONTENT.loadPublishedNews();
      const item = items.find((entry) => entry.id === id);
      if (!item) showMissingState();
      else renderArticle(item);
    } catch (error) {
      showMissingState(true);
      console.error("Impossible de charger cette actualité.", error);
    }
  };

  initialize();
})();
