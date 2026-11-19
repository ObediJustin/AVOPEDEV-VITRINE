(() => {
  const NEWS_URL = "data/news.json";

  const fetchJson = async (url) => {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Chargement impossible (${response.status})`);
    return response.json();
  };

  const normalizeNewsItem = (item) => ({
    id: String(item.id || "").trim(),
    title: String(item.title || "").trim(),
    date: String(item.date || "").trim(),
    category: String(item.category || "Actualité").trim(),
    summary: String(item.summary || "").trim(),
    content: String(item.content || "").trim(),
    image: String(item.image || "").trim(),
    alt: String(item.alt || "").trim(),
    status: String(item.status || "draft").trim().toLowerCase()
  });

  const isValidNewsItem = (item) => (
    item.id.length > 0
    && item.title.length > 0
    && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
  );

  const loadNews = async () => {
    const data = await fetchJson(NEWS_URL);
    if (!Array.isArray(data)) throw new Error("Le fichier des actualités doit contenir une liste.");
    return data
      .map(normalizeNewsItem)
      .filter(isValidNewsItem);
  };

  const loadPublishedNews = async () => {
    const items = await loadNews();
    return items
      .filter((item) => item.status === "published")
      .sort((first, second) => new Date(second.date) - new Date(first.date));
  };

  const formatNewsDate = (date) => new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00`));

  const getArticleUrl = (id) => `article.html?id=${encodeURIComponent(id)}`;

  window.AVOPEDEV_CONTENT = Object.freeze({
    loadNews,
    loadPublishedNews,
    formatNewsDate,
    getArticleUrl
  });
})();
