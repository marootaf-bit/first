const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");

function closeMenu() {
  if (!menuToggle || !mainNav) return;
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "باز کردن فهرست");
  mainNav.classList.remove("is-open");
}

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "باز کردن فهرست" : "بستن فهرست");
    mainNav.classList.toggle("is-open", !isOpen);
  });

  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("click", (event) => {
    if (!mainNav.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

const revealElements = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -28px 0px" }
  );
  revealElements.forEach((element) => revealObserver.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

const form = document.querySelector("#inquiry-form");
const formStatus = document.querySelector("#form-status");
if (form && formStatus) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    formStatus.textContent = "سپاس از پیام شما. این فرم در حال حاضر نمایشی است؛ برای دریافت واقعی درخواست‌ها، باید ایمیل یا سامانهٔ فرم شرکت به آن متصل شود.";
    formStatus.classList.add("is-visible");
  });
}

const year = document.querySelector("#current-year");
if (year) year.textContent = new Date().getFullYear();
