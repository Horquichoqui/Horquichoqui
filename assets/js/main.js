/* Tema, idioma e navegação. Sem dependências. */
(function () {
  "use strict";

  var STORE_THEME = "gj.theme";
  var STORE_LANG = "gj.lang";
  var root = document.documentElement;

  /* localStorage pode lançar (modo privado, cookies bloqueados) — nunca quebrar a página. */
  function read(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function write(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* ignora */ }
  }

  /* ---------- Tema ---------- */
  function applyTheme(theme) {
    var next = theme === "light" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next === "light" ? "#f7f9fc" : "#0b1117");
    write(STORE_THEME, next);
  }

  function initTheme() {
    var saved = read(STORE_THEME);
    if (saved === "light" || saved === "dark") {
      applyTheme(saved);
      return;
    }
    var prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(prefersLight ? "light" : "dark");
  }

  /* ---------- Idioma ---------- */
  function translate(lang) {
    var dict = (window.I18N && window.I18N[lang]) || null;
    if (!dict) return;

    // Texto: sempre textContent, nunca innerHTML.
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var value = dict[el.getAttribute("data-i18n")];
      if (typeof value === "string") el.textContent = value;
    });

    // Atributos: formato "attr:chave", separados por vírgula.
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(",").forEach(function (pair) {
        var parts = pair.split(":");
        if (parts.length !== 2) return;
        var value = dict[parts[1].trim()];
        if (typeof value === "string") el.setAttribute(parts[0].trim(), value);
      });
    });

    if (dict["doc.title"]) document.title = dict["doc.title"];
    var desc = document.querySelector('meta[name="description"]');
    if (desc && dict["doc.desc"]) desc.setAttribute("content", dict["doc.desc"]);

    root.setAttribute("lang", lang === "en" ? "en" : "pt-BR");

    document.querySelectorAll(".lang-switch button").forEach(function (btn) {
      var active = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });

    write(STORE_LANG, lang);
  }

  function initLang() {
    var saved = read(STORE_LANG);
    if (saved === "pt" || saved === "en") {
      translate(saved);
      return;
    }
    var nav = (navigator.language || "pt").toLowerCase();
    translate(nav.indexOf("pt") === 0 ? "pt" : "en");
  }

  /* ---------- Ligações ---------- */
  function bind() {
    var themeBtn = document.getElementById("themeToggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        applyTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light");
      });
    }

    document.querySelectorAll(".lang-switch button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        translate(btn.getAttribute("data-lang"));
      });
    });

    var navToggle = document.getElementById("navToggle");
    var navMenu = document.getElementById("navMenu");
    if (navToggle && navMenu) {
      navToggle.addEventListener("click", function () {
        var open = navMenu.classList.toggle("is-open");
        navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      navMenu.addEventListener("click", function (event) {
        if (event.target.tagName === "A") {
          navMenu.classList.remove("is-open");
          navToggle.setAttribute("aria-expanded", "false");
        }
      });
    }

    var printBtn = document.getElementById("printBtn");
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  initTheme();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { initLang(); bind(); });
  } else {
    initLang();
    bind();
  }
})();
