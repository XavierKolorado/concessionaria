import { featured, formatKm, formatPrice, gallery, inventory, site, whatsappLink } from "./config.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const escape = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

function bindWhatsapp(root = document) {
  $$("[data-wa]", root).forEach((a) => (a.href = whatsappLink(a.dataset.wa)));
}

function initHeader() {
  const header = $(".hdr-header");
  const toggle = $(".hdr-toggle");
  const panel = $("#menu-mobile");
  const label = $(".sr-only", toggle);

  const onScroll = () => (header.dataset.scrolled = window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const setOpen = (open) => {
    header.dataset.open = open;
    toggle.setAttribute("aria-expanded", open);
    label.textContent = open ? "Fechar menu" : "Abrir menu";
    panel.hidden = !open;
    document.body.style.overflow = open ? "hidden" : "";
    if (open) $("a", panel)?.focus();
  };

  toggle.addEventListener("click", () => setOpen(panel.hidden));
  $$("a", panel).forEach((a) => a.addEventListener("click", () => setOpen(false)));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });
  matchMedia("(min-width: 961px)").addEventListener("change", (e) => e.matches && setOpen(false));
}

function initReveal() {
  const items = $$(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => (el.dataset.shown = "true"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.dataset.shown = "true";
          io.unobserve(entry.target);
        }
      }),
    { threshold: 0.18 }
  );
  items.forEach((el) => io.observe(el));
}

function detectTier() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return "none";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    return "none";
  }
  const memory = navigator.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  if (navigator.connection?.saveData || memory <= 2 || cores <= 2) return "lite";
  if (matchMedia("(max-width: 760px)").matches || memory <= 4 || cores <= 4) return "low";
  return "high";
}

function initHero() {
  const hero = $(".hero-hero");
  const poster = $(".hero-poster", hero);
  const canvasBox = $(".hero-canvas", hero);
  const loading = $(".hero-loading", hero);
  const loadingBar = $(".hero-loadingBar", hero);
  const loadingText = $(".hero-loadingText", hero);
  const notice = $(".hero-notice", hero);
  const load3d = $(".hero-load3d", hero);
  const paints = $(".hero-paints", hero);
  const paintName = $(".hero-paintName", hero);
  const zoom = $(".hero-zoom", hero);
  const hint = $(".hero-hint", hero);
  const consult = $(".hero-consult", hero);
  const compact = matchMedia("(max-width: 760px)").matches;

  let paint = featured.paints[0];
  let scene = null;

  const updateConsult = () => {
    consult.href = whatsappLink(
      `Olá! Vi o ${featured.name} na cor ${paint.label} no site da Vértice Motors e gostaria de falar com um consultor.`
    );
  };
  updateConsult();

  const posterImg = $("img", poster);
  const hidePoster = () => {
    poster.innerHTML = '<div class="hero-posterEmpty" aria-hidden="true"></div>';
  };
  posterImg.addEventListener("error", hidePoster);
  if (posterImg.complete && posterImg.naturalWidth === 0) hidePoster();

  featured.paints.forEach((p, i) => {
    const label = document.createElement("label");
    label.className = "hero-swatch";
    label.style.setProperty("--swatch", p.swatch);
    label.innerHTML = `<input type="radio" name="paint" value="${escape(p.variant)}" ${i === 0 ? "checked" : ""} disabled /><span class="sr-only">${escape(p.label)}</span>`;
    $("input", label).addEventListener("change", () => {
      paint = p;
      paintName.textContent = p.label;
      updateConsult();
      scene?.setVariant(p.variant);
    });
    paints.append(label);
  });

  zoom.addEventListener("click", () => {
    const pressed = zoom.getAttribute("aria-pressed") !== "true";
    zoom.setAttribute("aria-pressed", pressed);
    zoom.textContent = pressed ? "Afastar" : "Aproximar";
    scene?.setZoom(pressed);
  });

  const fail = () => {
    loading.hidden = true;
    paints.hidden = true;
    notice.hidden = false;
    canvasBox.innerHTML = "";
    hero.dataset.ready = "true";
  };

  const start = async () => {
    load3d.hidden = true;
    loading.hidden = false;
    paints.hidden = false;
    hero.dataset.ready = "false";
    try {
      const { createHeroScene } = await import("./hero3d.js");
      scene = await createHeroScene(canvasBox, {
        src: featured.model.src,
        hiddenMeshes: featured.model.hiddenMeshes,
        variant: paint.variant,
        quality: tier === "high" ? "high" : "low",
        compact,
        reducedMotion: reducedMotion.matches,
        onProgress: (p) => {
          loadingBar.style.transform = `scaleX(${p / 100})`;
          loadingText.textContent = `Preparando o estúdio ${Math.round(p)}%`;
        },
      });
    } catch {
      fail();
      return;
    }
    loading.hidden = true;
    canvasBox.dataset.visible = "true";
    poster.dataset.faded = "true";
    poster.setAttribute("aria-hidden", "true");
    $$("input", paints).forEach((i) => (i.disabled = false));
    zoom.hidden = false;
    hint.hidden = false;
    hint.textContent = compact ? "Deslize para os lados para girar" : "Arraste para girar";
    hero.dataset.ready = "true";
  };

  const tier = detectTier();
  if (tier === "high" || tier === "low") start();
  else {
    hero.dataset.ready = "true";
    if (tier === "lite") {
      load3d.hidden = false;
      load3d.addEventListener("click", start, { once: true });
    }
  }
}

function initGallery() {
  const track = $(".gal-track");
  const prevBtn = $(".gal-prevBtn");
  const nextBtn = $(".gal-nextBtn");
  const dialog = $(".gal-lightbox");
  const full = $(".gal-full", dialog);
  const caption = $(".gal-caption", dialog);
  const counter = $(".gal-counter", dialog);
  let index = 0;
  let opener = null;
  let touchX = null;

  track.innerHTML = gallery
    .map(
      (img, i) => `<li class="gal-item" data-shape="${i % 3}">
        <button type="button" class="gal-thumb" data-index="${i}">
          <img src="${img.src}" width="${img.width}" height="${img.height}" alt="${escape(img.alt)}" loading="lazy" decoding="async" />
          <span class="gal-zoomHint">Ampliar</span>
        </button>
      </li>`
    )
    .join("");

  const updateEdges = () => {
    prevBtn.disabled = track.scrollLeft <= 4;
    nextBtn.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  };
  updateEdges();
  track.addEventListener("scroll", updateEdges, { passive: true });
  window.addEventListener("resize", updateEdges);

  const scrollByCard = (dir) => {
    const card = $("li", track);
    track.scrollBy({ left: dir * (card.getBoundingClientRect().width + 16), behavior: "smooth" });
  };
  prevBtn.addEventListener("click", () => scrollByCard(-1));
  nextBtn.addEventListener("click", () => scrollByCard(1));

  const show = (i) => {
    index = (i + gallery.length) % gallery.length;
    const img = gallery[index];
    full.src = img.src;
    full.width = img.width;
    full.height = img.height;
    full.alt = img.alt;
    caption.textContent = img.alt;
    counter.textContent = `${index + 1} de ${gallery.length}`;
    full.style.animation = "none";
    void full.offsetWidth;
    full.style.animation = "";
  };

  track.addEventListener("click", (e) => {
    const btn = e.target.closest(".gal-thumb");
    if (!btn) return;
    opener = btn;
    show(Number(btn.dataset.index));
    dialog.showModal();
  });

  dialog.addEventListener("close", () => opener?.focus());
  dialog.addEventListener("click", (e) => e.target === dialog && dialog.close());
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") show(index + 1);
    if (e.key === "ArrowLeft") show(index - 1);
  });
  dialog.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
  dialog.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });
  $(".gal-close", dialog).addEventListener("click", () => dialog.close());
  $(".gal-prev", dialog).addEventListener("click", () => show(index - 1));
  $(".gal-next", dialog).addEventListener("click", () => show(index + 1));
}

function initSpecs() {
  $(".sp-grid").innerHTML = featured.specs
    .map(
      (s) => `<div class="sp-cell${/^[\d.,]+$/.test(s.value) ? "" : " sp-lead"}">
        <dt>${escape(s.label)}</dt>
        <dd class="sp-value">${escape(s.value)}${s.unit ? `<span class="sp-unit">${escape(s.unit)}</span>` : ""}</dd>
        <dd class="sp-detail">${escape(s.detail)}</dd>
      </div>`
    )
    .join("");
}

const carLabel = (car) => `${car.brand} ${car.model}`;
const availabilityMessage = (car) =>
  `Olá! O ${carLabel(car)} ${car.year}, com ${formatKm(car.km)}, ainda está disponível na Vértice Motors?`;

function selectInterest(vehicle, intent) {
  document.dispatchEvent(new CustomEvent("vertice:interest", { detail: { vehicle, intent } }));
  $("#contato").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
}

function initInventory() {
  const grid = $(".inv-grid");
  const dialog = $(".inv-dialog");
  let opener = null;
  let active = null;

  grid.innerHTML = inventory
    .map(
      (car, i) => `<li class="reveal inv-card" style="transition-delay: ${(i % 2) * 120}ms">
        <div class="inv-media">
          <img src="${car.image.src}" width="${car.image.width}" height="${car.image.height}" alt="${escape(car.image.alt)}" loading="lazy" decoding="async" />
        </div>
        <div class="inv-body">
          <div class="inv-title">
            <p class="inv-brand">${escape(car.brand)}</p>
            <h3>${escape(car.model)}</h3>
          </div>
          <dl class="inv-facts">
            <div><dt>Ano</dt><dd>${car.year}</dd></div>
            <div><dt>Quilometragem</dt><dd>${formatKm(car.km)}</dd></div>
            <div><dt>Potência</dt><dd>${escape(car.power)}</dd></div>
          </dl>
          <p class="inv-price">${formatPrice(car.price)}<span>preço demonstrativo</span></p>
          <div class="inv-actions">
            <button type="button" class="btn btn-primary" data-open="${car.id}">Conhecer o veículo</button>
            <a class="btn btn-ghost" href="${whatsappLink(availabilityMessage(car))}" target="_blank" rel="noopener noreferrer">Consultar disponibilidade</a>
          </div>
        </div>
      </li>`
    )
    .join("");

  const open = (car) => {
    active = car;
    const img = $(".inv-sheetMedia img", dialog);
    img.src = car.image.src;
    img.width = car.image.width;
    img.height = car.image.height;
    img.alt = car.image.alt;
    $(".inv-credit", dialog).innerHTML = `Foto: ${escape(car.image.credit)}, <a class="link" href="${car.image.source}" target="_blank" rel="noopener noreferrer">${car.image.license}</a>`;
    $(".inv-brand", dialog).textContent = `${car.brand}, ${car.generation.toLowerCase()}`;
    $(".inv-sheetTitle", dialog).textContent = car.model;
    $(".inv-price", dialog).innerHTML = `${formatPrice(car.price)}<span>preço demonstrativo</span>`;
    $(".inv-specList", dialog).innerHTML = [
      ["Ano", car.year],
      ["Quilometragem", formatKm(car.km)],
      ["Motor", car.engine],
      ["Potência", car.power],
      ["Aceleração", car.acceleration],
      ["Transmissão", car.transmission],
    ]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${escape(v)}</dd></div>`)
      .join("");
    $(".inv-note", dialog).textContent = car.note;
    $(".inv-wa", dialog).href = whatsappLink(availabilityMessage(car));
    dialog.showModal();
  };

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open]");
    if (!btn) return;
    opener = btn;
    open(inventory.find((c) => c.id === btn.dataset.open));
  });

  dialog.addEventListener("close", () => opener?.focus());
  dialog.addEventListener("click", (e) => e.target === dialog && dialog.close());
  $(".inv-close", dialog).addEventListener("click", () => dialog.close());
  $(".inv-schedule", dialog).addEventListener("click", () => {
    opener = null;
    dialog.close();
    selectInterest(carLabel(active), "visita");
  });

  $(".ft-credits ul").insertAdjacentHTML(
    "beforeend",
    inventory
      .map(
        (car) => `<li>${escape(carLabel(car))}: foto de ${escape(car.image.credit)},
          <a class="link" href="${car.image.source}" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>,
          <a class="link" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">${car.image.license}</a>.
          Exibida com ajuste de cor e recorte.</li>`
      )
      .join("")
  );
}

const digits = (v) => v.replace(/\D/g, "").slice(0, 11);

function maskPhone(value) {
  const d = digits(value);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function validate(values) {
  const errors = {};
  const name = values.name.trim();
  if (name.length < 3) errors.name = "Informe seu nome com pelo menos 3 letras.";
  else if (!/^[\p{L}\s'.-]+$/u.test(name)) errors.name = "Use apenas letras no nome.";
  const phone = digits(values.phone);
  if (phone.length < 10) errors.phone = "Informe o telefone com DDD, por exemplo (11) 91234-5678.";
  else if (phone.length === 11 && phone[2] !== "9")
    errors.phone = "Celular com 11 dígitos deve começar com 9 depois do DDD.";
  if (!values.vehicle) errors.vehicle = "Escolha um veículo ou a opção “Ainda não decidi”.";
  return errors;
}

function initContact() {
  const form = $(".ct-form");
  const done = $(".ct-done");
  const submit = $(".ct-submit", form);
  const select = $("#f-vehicle");
  const vehicles = [`Vértice ${featured.name}`, ...inventory.map(carLabel), "Ainda não decidi"];
  const intents = { visita: "Agendar visita", informacoes: "Receber mais informações" };
  const touched = new Set();
  const field = (n) => form.elements.namedItem(n);

  select.insertAdjacentHTML("beforeend", vehicles.map((v) => `<option value="${escape(v)}">${escape(v)}</option>`).join(""));

  const values = () => ({
    name: field("name").value,
    phone: field("phone").value,
    vehicle: field("vehicle").value,
    intent: field("intent").value,
  });

  const render = (errors) => {
    ["name", "phone", "vehicle"].forEach((key) => {
      const input = field(key);
      const msg = $(`#e-${key}`);
      const show = touched.has(key) && errors[key];
      input.setAttribute("aria-invalid", Boolean(show));
      if (show) {
        msg.textContent = errors[key];
        msg.hidden = false;
        input.setAttribute("aria-describedby", msg.id);
      } else {
        msg.hidden = true;
        input.removeAttribute("aria-describedby");
      }
    });
  };

  const updateSubmit = () => {
    submit.textContent = field("intent").value === "visita" ? "Agendar visita" : "Solicitar informações";
  };

  field("phone").addEventListener("input", () => {
    field("phone").value = maskPhone(field("phone").value);
  });
  ["name", "phone", "vehicle"].forEach((key) => {
    field(key).addEventListener("blur", () => {
      touched.add(key);
      render(validate(values()));
    });
    field(key).addEventListener(key === "vehicle" ? "change" : "input", () => {
      if (touched.has(key)) render(validate(values()));
    });
  });
  $$("input[name=intent]", form).forEach((r) => r.addEventListener("change", updateSubmit));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = values();
    const errors = validate(v);
    ["name", "phone", "vehicle"].forEach((f) => touched.add(f));
    render(errors);
    const first = Object.keys(errors)[0];
    if (first) {
      field(first).focus();
      return;
    }
    submit.disabled = true;
    submit.textContent = "Registrando…";
    setTimeout(() => {
      submit.disabled = false;
      updateSubmit();
      $(".ct-recap", done).innerHTML = [
        ["Nome", v.name.trim()],
        ["Telefone", v.phone],
        ["Veículo", v.vehicle],
        ["Pedido", intents[v.intent]],
      ]
        .map(([k, val]) => `<div><dt>${k}</dt><dd>${escape(val)}</dd></div>`)
        .join("");
      $(".ct-continue", done).href = whatsappLink(
        `Olá! Sou ${v.name.trim()}, telefone ${v.phone}. Quero ${
          v.intent === "visita" ? "agendar uma visita" : "receber mais informações"
        } sobre: ${v.vehicle}.`
      );
      form.hidden = true;
      done.hidden = false;
      done.focus();
    }, 700);
  });

  $(".ct-reset", done).addEventListener("click", () => {
    form.reset();
    touched.clear();
    render({});
    updateSubmit();
    done.hidden = true;
    form.hidden = false;
    field("name").focus();
  });

  document.addEventListener("vertice:interest", (e) => {
    const { vehicle, intent } = e.detail;
    done.hidden = true;
    form.hidden = false;
    if (vehicle && vehicles.includes(vehicle)) field("vehicle").value = vehicle;
    if (intent) field("intent").value = intent;
    updateSubmit();
  });

  $$("[data-interest]").forEach((btn) =>
    btn.addEventListener("click", () => selectInterest("", btn.dataset.interest))
  );
}

bindWhatsapp();
if (!site.whatsappIsPlaceholder) $$(".wa-placeholder").forEach((el) => el.remove());
$(".ft-year").textContent = new Date().getFullYear();
initHeader();
initHero();
initGallery();
initSpecs();
initInventory();
initContact();
initReveal();
