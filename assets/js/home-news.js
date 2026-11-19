(() => {
  const container = document.querySelector("[data-home-news-list]");
  const emptyState = document.querySelector("[data-home-news-empty]");
  if (!container || !emptyState || !window.AVOPEDEV_CONTENT) return;

  const initialize = async () => {
    try {
      const items = await window.AVOPEDEV_CONTENT.loadPublishedNews();
      const latestItems = items.slice(0, 3);
      if (!latestItems.length) {
        emptyState.hidden = false;
        return;
      }
      container.replaceChildren(...latestItems.map((item) => (
        window.AVOPEDEV_CONTENT.createNewsCard(item, { headingLevel: "h3" })
      )));
    } catch (error) {
      emptyState.hidden = false;
      emptyState.querySelector("p").textContent = "Les actualités sont temporairement indisponibles.";
      console.error("Impossible de charger les dernières actualités.", error);
    }
  };

  initialize();
})();
