(() => {
  const container = document.querySelector("[data-news-list]");
  const emptyState = document.querySelector("[data-news-empty]");
  if (!container) return;

  const items = Array.isArray(window.AVOPEDEV_NEWS) ? window.AVOPEDEV_NEWS : [];
  if (!items.length) {
    emptyState.hidden = false;
    return;
  }

  const formatter = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  items
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((item) => {
      const article = document.createElement("article");
      article.className = "news-card";

      if (item.image) {
        const media = document.createElement("img");
        media.src = item.image;
        media.alt = "";
        media.loading = "lazy";
        article.append(media);
      }

      const body = document.createElement("div");
      body.className = "news-card-body";
      const time = document.createElement("time");
      time.dateTime = item.date;
      time.textContent = formatter.format(new Date(`${item.date}T12:00:00`));
      const heading = document.createElement("h2");
      heading.textContent = item.title;
      const summary = document.createElement("p");
      summary.textContent = item.summary;
      body.append(time, heading, summary);

      if (item.url) {
        const link = document.createElement("a");
        link.className = "button button--ghost";
        link.href = item.url;
        link.textContent = "Lire l’actualité";
        body.append(link);
      }

      article.append(body);
      container.append(article);
    });
})();
