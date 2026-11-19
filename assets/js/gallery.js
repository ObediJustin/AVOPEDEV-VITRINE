(() => {
  const gallery = document.querySelector("[data-gallery]");
  const filters = document.querySelector("[data-gallery-filters]");
  const galleryStatus = document.querySelector("[data-gallery-status]");
  const errorState = document.querySelector("[data-gallery-error]");
  const lightbox = document.querySelector("[data-lightbox]");
  if (!gallery || !filters || !lightbox || !window.AVOPEDEV_CONTENT) return;

  const image = lightbox.querySelector("[data-lightbox-image]");
  const caption = lightbox.querySelector("[data-lightbox-caption]");
  const status = lightbox.querySelector("[data-lightbox-status]");
  const closeButton = lightbox.querySelector("[data-lightbox-close]");
  const previousButton = lightbox.querySelector("[data-lightbox-prev]");
  const nextButton = lightbox.querySelector("[data-lightbox-next]");
  let items = [];
  let visibleItems = [];
  let activeFilter = "all";
  let currentIndex = 0;
  let previousFocus = null;
  let touchStartX = null;

  const createFigure = (item) => {
    const figure = document.createElement("figure");
    figure.dataset.id = item.id;
    figure.dataset.category = item.category;
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `Agrandir : ${item.title}`);
    const media = document.createElement("img");
    media.src = item.src;
    if (item.srcset) {
      media.srcset = item.srcset;
      media.sizes = "(max-width: 760px) calc(100vw - 2rem), (max-width: 1100px) 50vw, 380px";
    }
    media.alt = item.alt;
    media.width = item.width;
    media.height = item.height;
    media.loading = "lazy";
    media.decoding = "async";
    const figureCaption = document.createElement("figcaption");
    figureCaption.textContent = item.title;
    button.append(media);
    figure.append(button, figureCaption);
    return figure;
  };

  const renderGallery = () => {
    visibleItems = activeFilter === "all"
      ? items
      : items.filter((item) => item.category === activeFilter);
    gallery.replaceChildren(...visibleItems.map(createFigure));
    galleryStatus.textContent = `${visibleItems.length} photographie${visibleItems.length > 1 ? "s" : ""} affichée${visibleItems.length > 1 ? "s" : ""}`;
  };

  const showImage = (index) => {
    if (!visibleItems.length) return;
    currentIndex = (index + visibleItems.length) % visibleItems.length;
    const item = visibleItems[currentIndex];
    image.src = item.src;
    image.srcset = item.srcset;
    image.sizes = "90vw";
    image.alt = item.alt;
    caption.textContent = item.description ? `${item.title} — ${item.description}` : item.title;
    status.textContent = `${currentIndex + 1} sur ${visibleItems.length}`;
  };

  const openLightbox = (itemId) => {
    previousFocus = document.activeElement;
    showImage(visibleItems.findIndex((item) => item.id === itemId));
    lightbox.hidden = false;
    document.body.classList.add("menu-open");
    closeButton.focus();
  };

  const closeLightbox = () => {
    lightbox.hidden = true;
    image.src = "";
    image.srcset = "";
    document.body.classList.remove("menu-open");
    previousFocus?.focus();
  };

  gallery.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button) openLightbox(button.closest("figure").dataset.id);
  });

  filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    activeFilter = button.dataset.filter;
    filters.querySelectorAll("[data-filter]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    renderGallery();
  });

  const initialize = async () => {
    try {
      items = await window.AVOPEDEV_CONTENT.loadGallery();
      const categories = [...new Set(items.map((item) => item.category))]
        .sort((first, second) => window.AVOPEDEV_CONTENT.getGalleryCategoryLabel(first).localeCompare(
          window.AVOPEDEV_CONTENT.getGalleryCategoryLabel(second),
          "fr"
        ));
      categories.forEach((category) => {
        const button = document.createElement("button");
        button.className = "filter-button";
        button.type = "button";
        button.dataset.filter = category;
        button.setAttribute("aria-pressed", "false");
        button.textContent = window.AVOPEDEV_CONTENT.getGalleryCategoryLabel(category);
        filters.append(button);
      });
      renderGallery();
    } catch (error) {
      galleryStatus.textContent = "Erreur de chargement";
      errorState.hidden = false;
      console.error("Impossible de charger la galerie.", error);
    }
  };

  closeButton.addEventListener("click", closeLightbox);
  previousButton.addEventListener("click", () => showImage(currentIndex - 1));
  nextButton.addEventListener("click", () => showImage(currentIndex + 1));

  image.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0]?.clientX ?? null;
  }, { passive: true });

  image.addEventListener("touchend", (event) => {
    if (touchStartX === null) return;
    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
    const distance = touchEndX - touchStartX;
    touchStartX = null;
    if (Math.abs(distance) < 45) return;
    showImage(currentIndex + (distance < 0 ? 1 : -1));
  }, { passive: true });

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (event) => {
    if (lightbox.hidden) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") showImage(currentIndex - 1);
    if (event.key === "ArrowRight") showImage(currentIndex + 1);
    if (event.key === "Tab") {
      const controls = [closeButton, previousButton, nextButton];
      const current = controls.indexOf(document.activeElement);
      if (event.shiftKey && current === 0) {
        event.preventDefault();
        controls.at(-1).focus();
      } else if (!event.shiftKey && current === controls.length - 1) {
        event.preventDefault();
        controls[0].focus();
      }
    }
  });

  initialize();
})();
