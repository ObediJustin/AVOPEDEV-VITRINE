(() => {
  const gallery = document.querySelector("[data-gallery]");
  const lightbox = document.querySelector("[data-lightbox]");
  if (!gallery || !lightbox) return;

  const filterButtons = document.querySelectorAll("[data-filter]");
  const figures = Array.from(gallery.querySelectorAll("figure"));
  const image = lightbox.querySelector("[data-lightbox-image]");
  const caption = lightbox.querySelector("[data-lightbox-caption]");
  const closeButton = lightbox.querySelector("[data-lightbox-close]");
  const previousButton = lightbox.querySelector("[data-lightbox-prev]");
  const nextButton = lightbox.querySelector("[data-lightbox-next]");
  let visibleFigures = figures;
  let currentIndex = 0;
  let previousFocus = null;

  const updateVisibleFigures = () => {
    visibleFigures = figures.filter((figure) => !figure.hidden);
  };

  const showImage = (index) => {
    if (!visibleFigures.length) return;
    currentIndex = (index + visibleFigures.length) % visibleFigures.length;
    const figure = visibleFigures[currentIndex];
    const source = figure.querySelector("img");
    image.src = source.src;
    image.alt = source.alt;
    caption.textContent = figure.querySelector("figcaption")?.textContent || source.alt;
  };

  const openLightbox = (figure) => {
    updateVisibleFigures();
    previousFocus = document.activeElement;
    showImage(visibleFigures.indexOf(figure));
    lightbox.hidden = false;
    document.body.classList.add("menu-open");
    closeButton.focus();
  };

  const closeLightbox = () => {
    lightbox.hidden = true;
    image.src = "";
    document.body.classList.remove("menu-open");
    previousFocus?.focus();
  };

  gallery.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button) openLightbox(button.closest("figure"));
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      filterButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      figures.forEach((figure) => {
        figure.hidden = filter !== "all" && figure.dataset.category !== filter;
      });
      updateVisibleFigures();
    });
  });

  closeButton.addEventListener("click", closeLightbox);
  previousButton.addEventListener("click", () => showImage(currentIndex - 1));
  nextButton.addEventListener("click", () => showImage(currentIndex + 1));

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
})();
