(() => {
  const body = document.body;
  const menuButton = document.querySelector("[data-menu-toggle]");
  const navigation = document.querySelector("[data-navigation]");
  const backToTop = document.querySelector("[data-back-to-top]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const closeMenu = (restoreFocus = false) => {
    if (!menuButton || !navigation) return;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Ouvrir le menu");
    navigation.classList.remove("is-open");
    body.classList.remove("menu-open");
    if (restoreFocus) menuButton.focus();
  };

  const openMenu = () => {
    if (!menuButton || !navigation) return;
    menuButton.setAttribute("aria-expanded", "true");
    menuButton.setAttribute("aria-label", "Fermer le menu");
    navigation.classList.add("is-open");
    body.classList.add("menu-open");
    navigation.querySelector("a")?.focus();
  };

  if (menuButton && navigation) {
    menuButton.addEventListener("click", () => {
      const open = menuButton.getAttribute("aria-expanded") === "true";
      if (open) closeMenu();
      else openMenu();
    });

    navigation.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      const open = menuButton.getAttribute("aria-expanded") === "true";
      if (!open) return;

      if (event.key === "Escape") {
        closeMenu(true);
        return;
      }

      if (event.key === "Tab") {
        const focusableItems = [menuButton, ...navigation.querySelectorAll("a")];
        const firstItem = focusableItems[0];
        const lastItem = focusableItems.at(-1);

        if (event.shiftKey && document.activeElement === firstItem) {
          event.preventDefault();
          lastItem.focus();
        } else if (!event.shiftKey && document.activeElement === lastItem) {
          event.preventDefault();
          firstItem.focus();
        }
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 820) closeMenu();
    });
  }

  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = new Date().getFullYear();
  });

  if (backToTop) {
    const updateButton = () => {
      backToTop.classList.toggle("is-visible", window.scrollY > 500);
    };
    window.addEventListener("scroll", updateButton, { passive: true });
    updateButton();
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  const revealItems = document.querySelectorAll("[data-reveal]");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );
    revealItems.forEach((item, index) => {
      item.style.setProperty("--reveal-delay", `${(index % 3) * 70}ms`);
      observer.observe(item);
    });
    document.documentElement.classList.add("reveal-ready");
  }

  const contactForm = document.querySelector("[data-mail-form]");
  if (contactForm) {
    const fields = [...contactForm.querySelectorAll("input, textarea")];
    const formStatus = contactForm.querySelector("[data-form-status]");

    const getErrorMessage = (field) => {
      if (field.required && !field.value.trim()) return "Ce champ est obligatoire.";
      if (field.validity.typeMismatch) return "Saisissez une adresse e-mail valide.";
      if (field.validity.tooShort) return `Saisissez au moins ${field.minLength} caractères.`;
      if (!field.validity.valid) return "Vérifiez la valeur saisie.";
      return "";
    };

    const validateField = (field) => {
      const message = getErrorMessage(field);
      const error = contactForm.querySelector(`[data-error-for="${field.id}"]`);
      field.setAttribute("aria-invalid", String(Boolean(message)));
      if (error) error.textContent = message;
      return !message;
    };

    fields.forEach((field) => {
      field.addEventListener("blur", () => validateField(field));
      field.addEventListener("input", () => {
        if (field.getAttribute("aria-invalid") === "true") validateField(field);
        formStatus.textContent = "";
      });
    });

    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const invalidFields = fields.filter((field) => !validateField(field));
      if (invalidFields.length) {
        formStatus.textContent = "Vérifiez les champs signalés avant de continuer.";
        invalidFields[0].focus();
        return;
      }

      const data = new FormData(contactForm);
      const subject = encodeURIComponent(data.get("subject") || "Message depuis le site AVOPEDEV");
      const sender = data.get("name") ? `Nom : ${data.get("name")}\n` : "";
      const email = data.get("email") ? `E-mail : ${data.get("email")}\n\n` : "";
      const message = encodeURIComponent(`${sender}${email}${data.get("message") || ""}`);
      formStatus.textContent = "Ouverture de votre application de messagerie…";
      window.location.href = `mailto:avopebenidev@gmail.com?subject=${subject}&body=${message}`;
    });
  }
})();
