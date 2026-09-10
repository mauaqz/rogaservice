(function () {
  "use strict";

  var DB_KEY = "rogaservice_db_v1";
  var SESSION_KEY = "rogaservice_session_v1";
  var COMMISSION_RATE = 0.15;

  var CATEGORIES = [
  {
    "id": "jardineria",
    "name": "Jardinería",
    "icon": "🌿"
  },
  {
    "id": "plomeria",
    "name": "Plomería",
    "icon": "🔧"
  },
  {
    "id": "electricidad",
    "name": "Electricidad",
    "icon": "💡"
  },
  {
    "id": "ninera",
    "name": "Cuidado de niños",
    "icon": "🧸"
  },
  {
    "id": "carpinteria_pintura",
    "name": "Carpintería y pintura",
    "icon": "🎨"
  },
  {
    "id": "mascotas",
    "name": "Cuidado de mascotas",
    "icon": "🐾"
  },
  {
    "id": "choferes",
    "name": "Choferes",
    "icon": "🚘"
  },
  {
    "id": "docentes",
    "name": "Docentes suplentes",
    "icon": "📚"
  },
  {
    "id": "enfermeria",
    "name": "Enfermería y cuidado geriátrico",
    "icon": "🩺"
  },
  {
    "id": "limpieza",
    "name": "Limpieza de hogar",
    "icon": "🏠"
  },
  {
    "id": "limpieza_empresas",
    "name": "Limpieza de empresas",
    "icon": "🏢"
  }
];

  var state = {
    view: "auth",
    params: {},
    authTab: "login",
    registerRole: "client",
    chatDraft: "",
    selectedRating: null,
  };

  // ---------------- storage helpers ----------------
  function loadDB() {
    var raw = localStorage.getItem(DB_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function saveDB(d) {
    localStorage.setItem(DB_KEY, JSON.stringify(d));
  }

  function getSession() {
    var raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function setSession(userId) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: userId }));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function seedIfNeeded() {
    var d = loadDB();
    if (d && d.seeded) { d.categories = CATEGORIES; saveDB(d); return d; }
    d = { seeded: true, categories: CATEGORIES, users: [], requests: [] };

    var demoClient = {
      id: uid("user"), role: "client", fullName: "Cliente Demo",
      email: "cliente@demo.com", password: "1234", phone: "0981 000 001",
    };
    var pro1 = {
      id: uid("user"), role: "professional", fullName: "Carlos Servín",
      email: "plomero@demo.com", password: "1234", phone: "0981 000 002",
      bio: "Plomero y electricista con 10 años de experiencia.",
      categories: ["plomeria", "electricidad"], baseRate: 150000,
      isAvailable: true, isVerified: true, ratingSum: 45, ratingCount: 10,
    };
    var pro2 = {
      id: uid("user"), role: "professional", fullName: "Ana Duarte",
      email: "ninera@demo.com", password: "1234", phone: "0981 000 003",
      bio: "Niñera certificada, especializada en primeros auxilios pediátricos.",
      categories: ["ninera", "enfermeria"], baseRate: 100000,
      isAvailable: true, isVerified: true, ratingSum: 48, ratingCount: 10,
    };
    var pro3 = {
      id: uid("user"), role: "professional", fullName: "Rosa Benítez",
      email: "limpieza@demo.com", password: "1234", phone: "0981 000 004",
      bio: "Limpieza profunda de hogares y mantenimiento de jardines.",
      categories: ["limpieza", "jardineria"], baseRate: 120000,
      isAvailable: true, isVerified: true, ratingSum: 40, ratingCount: 9,
    };

    d.users.push(demoClient, pro1, pro2, pro3);
    saveDB(d);
    return d;
  }

  function db() {
    return loadDB() || seedIfNeeded();
  }

  function mutate(fn) {
    var d = db();
    fn(d);
    saveDB(d);
    render();
  }

  function currentUser() {
    var s = getSession();
    if (!s) return null;
    return db().users.find(function (u) { return u.id === s.userId; }) || null;
  }

  // ---------------- utils ----------------
  function uid(prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function formatGs(n) {
    n = Number(n) || 0;
    return "Gs. " + Math.round(n).toLocaleString("es-PY");
  }

  function timeAgo(iso) {
    var diff = Date.now() - new Date(iso).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return "hace " + mins + " min";
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return "hace " + hrs + " h";
    return "hace " + Math.floor(hrs / 24) + " d";
  }

  // single-quoted, escaped JS string literal — safe to embed inside a double-quoted onclick="" HTML attribute
  function sq(str) {
    return "'" + String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function initials(name) {
    if (!name) return "?";
    var parts = name.trim().split(/\s+/);
    var s = (parts[0][0] || "");
    if (parts.length > 1) s += parts[1][0];
    return s.toUpperCase();
  }

  function firstName(name) {
    return (name || "").split(" ")[0];
  }

  function categoryById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i];
    }
    return null;
  }

  function proRatingAvg(u) {
    if (!u || !u.ratingCount) return null;
    return u.ratingSum / u.ratingCount;
  }

  function statusLabel(status) {
    var map = { pending: "Pendiente", accepted: "Aceptado", in_progress: "En curso", completed: "Completado", cancelled: "Cancelado" };
    return map[status] || status;
  }

  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.add("hidden"); }, 2200);
  }

  // ---------------- small HTML helpers ----------------
  function backLink(view) {
    return '<button class="back-link" onclick="App.navigate(' + sq(view) + ')">← Volver</button>';
  }

  function backLinkToOrder(view, orderId) {
    return '<button class="back-link" onclick="App.navigate(' + sq(view) + ", {orderId:" + sq(orderId) + '})">← Volver</button>';
  }

  function emptyState(emoji, text) {
    return '<div class="empty-state"><span class="emoji">' + emoji + "</span>" + escapeHtml(text) + "</div>";
  }

  function tabButton(view, icon, label, active) {
    return '<button class="tab-btn ' + (active ? "active" : "") + '" onclick="App.navigate(' + sq(view) + ')">' +
      '<span class="tab-icon">' + icon + "</span><span>" + label + "</span></button>";
  }

  function orderCardHtml(r, viewerRole) {
    var d = db();
    var cat = categoryById(r.categoryId);
    var otherName;
    var navFn;
    if (viewerRole === "client") {
      otherName = r.professionalId
        ? ((d.users.find(function (u) { return u.id === r.professionalId; })) || {}).fullName
        : "Buscando profesional...";
      navFn = "App.openClientOrder";
    } else {
      otherName = ((d.users.find(function (u) { return u.id === r.clientId; })) || {}).fullName || "Cliente";
      navFn = "App.openProJob";
    }
    return '<div class="card clickable" onclick="' + navFn + "(" + sq(r.id) + ')">' +
      '<div class="row"><div class="row-title">' + (cat ? cat.icon + " " + cat.name : "Servicio") + "</div>" +
      '<span class="badge badge-' + r.status + '">' + statusLabel(r.status) + "</span></div>" +
      '<p class="muted" style="margin:6px 0 2px;">' + escapeHtml(otherName) + "</p>" +
      '<div class="row" style="margin-top:8px;">' +
      '<span class="muted">' + timeAgo(r.createdAt) + "</span>" +
      (r.priceFinal ? '<span class="price">' + formatGs(r.priceFinal) + "</span>" :
        (r.priceEstimate ? '<span class="muted">~' + formatGs(r.priceEstimate) + "</span>" : "")) +
      "</div></div>";
  }

  // ---------------- auth screens ----------------
  function renderAuth() {
    var tab = state.authTab;
    var html = '<h1 class="page-title">Bienvenido a Rogaservice</h1>';
    html += '<p class="muted" style="margin-top:-8px;margin-bottom:16px;">Profesionales de confianza para tu hogar, a un pedido de distancia.</p>';
    html += '<div class="tabs-switch">' +
      '<button class="' + (tab === "login" ? "active" : "") + '" onclick="App.setAuthTab(\'login\')">Iniciar sesión</button>' +
      '<button class="' + (tab === "register" ? "active" : "") + '" onclick="App.setAuthTab(\'register\')">Registrarme</button>' +
      "</div>";
    html += tab === "login" ? formLoginHtml() : formRegisterHtml();
    html += renderDemoAccounts();
    html += '<p class="footnote">Proyecto educativo. Los datos se guardan solo en este navegador (localStorage), no en un servidor real.</p>';
    return html;
  }

  function formLoginHtml() {
    return '<div class="field"><label>Correo</label><input id="loginEmail" type="email" placeholder="tu@correo.com"></div>' +
      '<div class="field"><label>Contraseña</label><input id="loginPassword" type="password" placeholder="••••"></div>' +
      '<button class="btn btn-primary" onclick="App.login()">Entrar</button>';
  }

  function formRegisterHtml() {
    var role = state.registerRole || "client";
    var catsHtml = CATEGORIES.map(function (c) {
      return '<div class="chip-check" data-cat="' + c.id + '" onclick="App.toggleChip(this)">' + c.icon + " " + c.name + "</div>";
    }).join("");

    return '<div class="field"><label>Nombre completo</label><input id="regName" placeholder="Tu nombre"></div>' +
      '<div class="field"><label>Correo</label><input id="regEmail" type="email" placeholder="tu@correo.com"></div>' +
      '<div class="field"><label>Teléfono</label><input id="regPhone" placeholder="0981 123 456"></div>' +
      '<div class="field"><label>Contraseña</label><input id="regPassword" type="password" placeholder="••••"></div>' +
      '<div class="field"><label>¿Qué querés hacer en Rogaservice?</label>' +
      '<div class="tabs-switch">' +
      '<button type="button" id="roleClientBtn" class="' + (role === "client" ? "active" : "") + '" onclick="App.setRegisterRole(\'client\')">Pedir servicios</button>' +
      '<button type="button" id="roleProBtn" class="' + (role === "professional" ? "active" : "") + '" onclick="App.setRegisterRole(\'professional\')">Ofrecer servicios</button>' +
      "</div></div>" +
      '<div id="proFields" class="' + (role === "professional" ? "" : "hidden") + '">' +
      '<div class="field"><label>Sobre vos (se lo mostramos al cliente)</label><textarea id="regBio" placeholder="Ej: Electricista matriculado, 8 años de experiencia"></textarea></div>' +
      '<div class="field"><label>Servicios que ofrecés</label><div class="checkbox-grid">' + catsHtml + "</div></div>" +
      '<div class="field"><label>Tarifa base (Gs.)</label><input id="regRate" type="number" placeholder="100000"></div>' +
      "</div>" +
      '<button class="btn btn-primary" onclick="App.register()">Crear cuenta</button>';
  }

  function renderDemoAccounts() {
    var d = db();
    var emails = ["cliente@demo.com", "plomero@demo.com", "ninera@demo.com", "limpieza@demo.com"];
    var items = emails.map(function (email) {
      var u = d.users.find(function (x) { return x.email === email; });
      if (!u) return "";
      var label;
      if (u.role === "client") {
        label = "👤 " + u.fullName + " (cliente)";
      } else {
        var catNames = CATEGORIES.filter(function (c) { return (u.categories || []).indexOf(c.id) >= 0; }).map(function (c) { return c.name; }).join(", ");
        label = "🛠️ " + u.fullName + " (" + catNames + ")";
      }
      return '<button class="btn btn-outline btn-sm" style="margin:4px 4px 0 0;" onclick="App.quickLogin(' + sq(email) + ')">' + escapeHtml(label) + "</button>";
    }).join("");
    return '<h2 class="section-title">Probar con cuentas demo</h2><div>' + items + "</div>";
  }

  // ---------------- client screens ----------------
  function renderClientHome(user) {
    var catsHtml = CATEGORIES.map(function (c) {
      return '<div class="cat-card" onclick="App.startNewRequest(' + sq(c.id) + ')">' +
        '<span class="cat-icon">' + c.icon + '</span><span class="cat-name">' + c.name + "</span></div>";
    }).join("");

    var d = db();
    var myActive = d.requests.filter(function (r) {
      return r.clientId === user.id && ["pending", "accepted", "in_progress"].indexOf(r.status) >= 0;
    }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

    var activeHtml = "";
    if (myActive.length) {
      activeHtml += '<h2 class="section-title">Tus pedidos activos</h2>';
      activeHtml += myActive.map(function (r) { return orderCardHtml(r, "client"); }).join("");
    }

    return '<h1 class="page-title">Hola, ' + escapeHtml(firstName(user.fullName)) + " 👋</h1>" +
      '<p class="muted" style="margin-top:-10px;">¿Qué necesitás resolver hoy?</p>' +
      '<section class="service-hero"><small>ROGASERVICE · A TU LADO</small><h2>Tu día, más fácil.</h2><p>Encontrá ayuda para tu hogar, tu familia y tu empresa.</p></section><div class="grid-2" style="margin-top:14px;">' + catsHtml + "</div>" + activeHtml;
  }

  function renderClientNewRequest() {
    var cat = categoryById(state.params.categoryId);
    return backLink("client-home") +
      '<h1 class="page-title">' + (cat ? cat.icon + " " + cat.name : "Nueva solicitud") + "</h1>" +
      '<div class="field"><label>Dirección</label><input id="reqAddress" placeholder="Calle, número, barrio"></div>' +
      '<div class="field"><label>¿Qué necesitás?</label><textarea id="reqDescription" placeholder="Contanos el problema con detalle"></textarea></div>' +
      '<div class="field"><label>¿Cuándo?</label><input id="reqSchedule" type="datetime-local"></div>' +
      '<div class="field"><label>Presupuesto aproximado (Gs., opcional)</label><input id="reqBudget" type="number" placeholder="Ej: 150000"></div>' +
      '<button class="btn btn-primary" onclick="App.submitNewRequest()">Enviar solicitud</button>';
  }

  function renderClientOrders(user) {
    var d = db();
    var mine = d.requests.filter(function (r) { return r.clientId === user.id; })
      .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    var html = '<h1 class="page-title">Mis pedidos</h1>';
    html += mine.length ? mine.map(function (r) { return orderCardHtml(r, "client"); }).join("") : emptyState("📭", "Todavía no pediste ningún servicio.");
    return html;
  }

  function renderPaymentAndReview(r) {
    var html = "";
    if (r.paymentStatus !== "paid") {
      var price = r.priceFinal || r.priceEstimate || 0;
      var commission = Math.round(price * COMMISSION_RATE);
      var net = price - commission;
      html += '<div class="card"><h2 class="section-title" style="margin-top:0;">Resumen y pago</h2>' +
        '<div class="summary-line"><span>Servicio</span><span>' + formatGs(price) + "</span></div>" +
        '<div class="summary-line"><span>Comisión Rogaservice (' + Math.round(COMMISSION_RATE * 100) + '%)</span><span>-' + formatGs(commission) + "</span></div>" +
        '<div class="summary-line"><span>Recibe el profesional</span><span>' + formatGs(net) + "</span></div>" +
        '<div class="summary-line summary-total"><span>Total a pagar</span><span>' + formatGs(price) + "</span></div>" +
        '<button class="btn btn-accent" style="margin-top:12px;" onclick="App.payRequest(' + sq(r.id) + ')">💳 Pagar (simulado)</button>' +
        '<p class="footnote">Pago simulado para fines de la demo. En producción se integraría Bancard o Pagopar.</p></div>';
    } else if (!r.review) {
      html += '<div class="card"><h2 class="section-title" style="margin-top:0;">Calificá el servicio</h2>' +
        '<div class="rating-input" id="ratingStars">' +
        [1, 2, 3, 4, 5].map(function (n) { return '<span data-n="' + n + '" onclick="App.setRatingStar(' + n + ')">★</span>'; }).join("") +
        "</div>" +
        '<div class="field"><textarea id="reviewComment" placeholder="¿Cómo fue tu experiencia? (opcional)"></textarea></div>' +
        '<button class="btn btn-primary" onclick="App.submitReview(' + sq(r.id) + ')">Enviar calificación</button></div>';
    } else {
      html += '<div class="card"><h2 class="section-title" style="margin-top:0;">Tu calificación</h2>' +
        '<div class="stars" style="font-size:20px;">' + "★".repeat(r.review.rating) + "☆".repeat(5 - r.review.rating) + "</div>" +
        (r.review.comment ? '<p class="muted" style="margin-top:8px;">"' + escapeHtml(r.review.comment) + '"</p>' : "") + "</div>";
    }
    return html;
  }

  function renderClientOrderDetail() {
    var d = db();
    var r = d.requests.find(function (x) { return x.id === state.params.orderId; });
    if (!r) return backLink("client-orders") + emptyState("❓", "No se encontró el pedido.");
    var cat = categoryById(r.categoryId);
    var pro = r.professionalId ? d.users.find(function (u) { return u.id === r.professionalId; }) : null;

    var html = backLink("client-orders");
    html += '<h1 class="page-title">' + (cat ? cat.icon + " " + cat.name : "Pedido") + "</h1>";
    html += '<div class="card"><div class="row"><span class="badge badge-' + r.status + '">' + statusLabel(r.status) + '</span><span class="muted">' + timeAgo(r.createdAt) + "</span></div>";
    html += '<p style="margin:10px 0 4px;"><strong>Dirección:</strong> ' + escapeHtml(r.addressText) + "</p>";
    html += '<p style="margin:4px 0;"><strong>Detalle:</strong> ' + escapeHtml(r.description) + "</p>";
    if (r.scheduledAt) html += '<p style="margin:4px 0;"><strong>Horario:</strong> ' + new Date(r.scheduledAt).toLocaleString("es-PY") + "</p>";
    html += "</div>";

    if (r.status === "pending") {
      html += '<div class="card"><p class="muted">Buscando un profesional disponible para tu categoría. Te avisaremos apenas alguien lo acepte.</p>' +
        '<button class="btn btn-danger" style="margin-top:10px;" onclick="App.cancelRequest(' + sq(r.id) + ')">Cancelar solicitud</button></div>';
    }

    if (pro) {
      var avg = proRatingAvg(pro);
      html += '<div class="card"><div class="row" style="gap:10px;justify-content:flex-start;"><span class="avatar">' + initials(pro.fullName) + '</span>' +
        '<div><div class="row-title">' + escapeHtml(pro.fullName) + '</div>' +
        '<span class="stars">' + (avg ? "★ " + avg.toFixed(1) + " (" + pro.ratingCount + ")" : "Sin calificaciones aún") + "</span></div></div>" +
        (r.status === "accepted" || r.status === "in_progress"
          ? '<button class="btn btn-outline" style="margin-top:10px;" onclick="App.openChat(\'client\',' + sq(r.id) + ')">💬 Abrir chat</button>'
          : "") + "</div>";
    }

    if (r.status === "completed") html += renderPaymentAndReview(r);

    return html;
  }

  function renderClientProfile(user) {
    return '<h1 class="page-title">Mi perfil</h1>' +
      '<div class="card"><div class="row" style="gap:10px;justify-content:flex-start;"><span class="avatar" style="width:52px;height:52px;font-size:18px;">' + initials(user.fullName) + '</span>' +
      '<div><div class="row-title">' + escapeHtml(user.fullName) + '</div><span class="muted">' + escapeHtml(user.email) + "</span></div></div></div>" +
      '<div class="field"><label>Teléfono</label><input id="clientPhone" value="' + escapeHtml(user.phone || "") + '"></div>' +
      '<button class="btn btn-primary" onclick="App.saveClientProfile()">Guardar cambios</button>' +
      '<button class="btn btn-outline" style="margin-top:10px;" onclick="App.logout()">Cerrar sesión</button>';
  }

  // ---------------- professional screens ----------------
  function availableRequestCardHtml(r) {
    var d = db();
    var cat = categoryById(r.categoryId);
    return '<div class="card">' +
      '<div class="row"><div class="row-title">' + (cat ? cat.icon + " " + cat.name : "Servicio") + '</div><span class="muted">' + timeAgo(r.createdAt) + "</span></div>" +
      '<p class="muted" style="margin:6px 0 2px;">📍 ' + escapeHtml(r.addressText) + "</p>" +
      '<p style="margin:4px 0;">' + escapeHtml(r.description) + "</p>" +
      (r.priceEstimate ? '<p class="muted">Presupuesto sugerido: ' + formatGs(r.priceEstimate) + "</p>" : "") +
      '<button class="btn btn-primary" style="margin-top:8px;" onclick="App.acceptRequest(' + sq(r.id) + ')">Aceptar solicitud</button></div>';
  }

  function renderProAvailable(user) {
    var d = db();
    var myCats = user.categories || [];
    var pending = d.requests.filter(function (r) { return r.status === "pending" && myCats.indexOf(r.categoryId) >= 0; })
      .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

    var html = '<h1 class="page-title">Solicitudes disponibles</h1>';
    html += '<div class="card"><div class="row"><span class="avail-toggle">Disponible para recibir pedidos</span>' +
      '<div class="switch ' + (user.isAvailable ? "on" : "") + '" onclick="App.toggleAvailability()"></div></div></div>';

    if (!user.isAvailable) return html + emptyState("💤", "Estás desconectado. Activá tu disponibilidad para ver solicitudes.");
    if (!myCats.length) return html + emptyState("🛠️", "Todavía no configuraste tus servicios. Andá a tu perfil.");
    if (!pending.length) return html + emptyState("📭", "No hay solicitudes nuevas en tus categorías por ahora.");

    return html + pending.map(availableRequestCardHtml).join("");
  }

  function renderProJobs(user) {
    var d = db();
    var mine = d.requests.filter(function (r) { return r.professionalId === user.id; })
      .sort(function (a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); });
    var html = '<h1 class="page-title">Mis trabajos</h1>';
    html += mine.length ? mine.map(function (r) { return orderCardHtml(r, "professional"); }).join("") : emptyState("🧰", "Todavía no aceptaste ningún trabajo.");
    return html;
  }

  function renderProJobDetail() {
    var d = db();
    var r = d.requests.find(function (x) { return x.id === state.params.orderId; });
    if (!r) return backLink("pro-jobs") + emptyState("❓", "No se encontró el trabajo.");
    var cat = categoryById(r.categoryId);
    var client = d.users.find(function (u) { return u.id === r.clientId; });

    var html = backLink("pro-jobs");
    html += '<h1 class="page-title">' + (cat ? cat.icon + " " + cat.name : "Trabajo") + "</h1>";
    html += '<div class="card"><div class="row"><span class="badge badge-' + r.status + '">' + statusLabel(r.status) + '</span><span class="muted">' + timeAgo(r.createdAt) + "</span></div>";
    html += '<div class="row" style="margin-top:10px;gap:10px;justify-content:flex-start;"><span class="avatar">' + initials(client ? client.fullName : "?") + '</span>' +
      '<div><div class="row-title">' + escapeHtml(client ? client.fullName : "Cliente") + '</div><span class="muted">' + escapeHtml(client ? client.phone : "") + "</span></div></div>";
    html += '<p style="margin:10px 0 4px;"><strong>Dirección:</strong> ' + escapeHtml(r.addressText) + "</p>";
    html += '<p style="margin:4px 0;"><strong>Detalle:</strong> ' + escapeHtml(r.description) + "</p>";
    if (r.scheduledAt) html += '<p style="margin:4px 0;"><strong>Horario:</strong> ' + new Date(r.scheduledAt).toLocaleString("es-PY") + "</p>";
    html += "</div>";

    html += '<button class="btn btn-outline" style="margin-bottom:10px;" onclick="App.openChat(\'professional\',' + sq(r.id) + ')">💬 Abrir chat</button>';

    if (r.status === "accepted") {
      html += '<button class="btn btn-primary" onclick="App.startJob(' + sq(r.id) + ')">Iniciar servicio</button>';
    } else if (r.status === "in_progress") {
      html += '<div class="card"><h2 class="section-title" style="margin-top:0;">Finalizar servicio</h2>' +
        '<div class="field"><label>Precio final (Gs.)</label><input id="finalPrice" type="number" placeholder="' + (r.priceEstimate || 150000) + '"></div>' +
        '<button class="btn btn-primary" onclick="App.finishJob(' + sq(r.id) + ')">Marcar como completado</button></div>';
    } else if (r.status === "completed") {
      html += '<div class="card">' +
        '<div class="summary-line"><span>Precio del servicio</span><span class="price">' + formatGs(r.priceFinal) + "</span></div>" +
        '<div class="summary-line"><span>Estado de pago</span><span class="badge ' + (r.paymentStatus === "paid" ? "badge-completed" : "badge-pending") + '">' + (r.paymentStatus === "paid" ? "Pagado" : "Pendiente de pago") + "</span></div>" +
        (r.review
          ? '<div class="summary-line"><span>Calificación del cliente</span><span class="stars">' + "★".repeat(r.review.rating) + "☆".repeat(5 - r.review.rating) + "</span></div>" +
            (r.review.comment ? '<p class="muted" style="margin-top:6px;">"' + escapeHtml(r.review.comment) + '"</p>' : "")
          : '<p class="muted" style="margin-top:6px;">El cliente todavía no calificó este trabajo.</p>') +
        "</div>";
    }
    return html;
  }

  function renderProProfile(user) {
    var avg = proRatingAvg(user);
    var catsHtml = CATEGORIES.map(function (c) {
      var sel = (user.categories || []).indexOf(c.id) >= 0;
      return '<div class="chip-check ' + (sel ? "selected" : "") + '" data-cat="' + c.id + '" onclick="App.toggleChip(this)">' + c.icon + " " + c.name + "</div>";
    }).join("");

    return '<h1 class="page-title">Mi perfil</h1>' +
      '<div class="card"><div class="row" style="gap:10px;justify-content:flex-start;"><span class="avatar" style="width:52px;height:52px;font-size:18px;">' + initials(user.fullName) + '</span>' +
      '<div><div class="row-title">' + escapeHtml(user.fullName) + '</div>' +
      '<span class="stars">' + (avg ? "★ " + avg.toFixed(1) + " (" + user.ratingCount + " reseñas)" : "Sin calificaciones aún") + "</span></div></div></div>" +
      '<div class="field"><label>Correo</label><input value="' + escapeHtml(user.email) + '" disabled></div>' +
      '<div class="field"><label>Teléfono</label><input id="proPhone" value="' + escapeHtml(user.phone || "") + '"></div>' +
      '<div class="field"><label>Sobre vos</label><textarea id="proBio">' + escapeHtml(user.bio || "") + "</textarea></div>" +
      '<div class="field"><label>Servicios que ofrecés</label><div class="checkbox-grid">' + catsHtml + "</div></div>" +
      '<div class="field"><label>Tarifa base (Gs.)</label><input id="proRate" type="number" value="' + (user.baseRate || "") + '"></div>' +
      '<button class="btn btn-primary" onclick="App.saveProProfile()">Guardar cambios</button>' +
      '<button class="btn btn-outline" style="margin-top:10px;" onclick="App.logout()">Cerrar sesión</button>';
  }

  // ---------------- chat (shared) ----------------
  function renderChat(user) {
    var d = db();
    var r = d.requests.find(function (x) { return x.id === state.params.orderId; });
    if (!r) return emptyState("❓", "No se encontró la conversación.");
    var otherId = user.role === "client" ? r.professionalId : r.clientId;
    var other = d.users.find(function (u) { return u.id === otherId; });
    var backView = user.role === "client" ? "client-order-detail" : "pro-job-detail";

    var msgsHtml = (r.messages || []).map(function (m) {
      var mine = m.senderId === user.id;
      return '<div class="msg ' + (mine ? "msg-mine" : "msg-theirs") + '">' + escapeHtml(m.content) +
        '<span class="msg-time">' + new Date(m.createdAt).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" }) + "</span></div>";
    }).join("");

    return backLinkToOrder(backView, r.id) +
      '<h1 class="page-title">💬 ' + (other ? escapeHtml(other.fullName) : "Chat") + "</h1>" +
      '<div class="chat-wrap"><div class="chat-messages" id="chatMessages">' +
      (msgsHtml || '<p class="muted" style="text-align:center;margin-top:20px;">Todavía no hay mensajes. ¡Escribí el primero!</p>') +
      '</div><div class="chat-input-row">' +
      '<input id="chatInput" placeholder="Escribí un mensaje..." value="' + escapeHtml(state.chatDraft || "") + '" oninput="App.setChatDraft(this.value)" onkeydown="App.handleChatKey(event)">' +
      '<button class="btn btn-primary" onclick="App.sendMessage(' + sq(r.id) + ')">Enviar</button></div></div>';
  }

  function scrollChatToBottom() {
    var el = document.getElementById("chatMessages");
    if (el) el.scrollTop = el.scrollHeight;
    var input = document.getElementById("chatInput");
    if (input) {
      input.focus();
      var v = input.value;
      input.value = "";
      input.value = v;
    }
  }

  // ---------------- shells / router ----------------
  function initialRoute() {
    var user = currentUser();
    state.view = !user ? "auth" : (user.role === "client" ? "client-home" : "pro-available");
  }

  function renderClientShell(user) {
    var tabbar = document.getElementById("tabbar");
    var subViews = ["client-new-request", "client-order-detail", "client-chat"];
    if (subViews.indexOf(state.view) === -1) {
      tabbar.classList.remove("hidden");
      tabbar.innerHTML = tabButton("client-home", "🏠", "Inicio", state.view === "client-home") +
        tabButton("client-orders", "📋", "Pedidos", state.view === "client-orders") +
        tabButton("client-profile", "👤", "Perfil", state.view === "client-profile");
    } else {
      tabbar.classList.add("hidden");
    }

    var app = document.getElementById("app");
    var view = state.view;
    if (view === "client-new-request") app.innerHTML = renderClientNewRequest();
    else if (view === "client-orders") app.innerHTML = renderClientOrders(user);
    else if (view === "client-order-detail") app.innerHTML = renderClientOrderDetail();
    else if (view === "client-chat") app.innerHTML = renderChat(user);
    else if (view === "client-profile") app.innerHTML = renderClientProfile(user);
    else app.innerHTML = renderClientHome(user);

    if (view === "client-chat") scrollChatToBottom();
  }

  function renderProShell(user) {
    var tabbar = document.getElementById("tabbar");
    var subViews = ["pro-job-detail", "pro-chat"];
    if (subViews.indexOf(state.view) === -1) {
      tabbar.classList.remove("hidden");
      tabbar.innerHTML = tabButton("pro-available", "📥", "Solicitudes", state.view === "pro-available") +
        tabButton("pro-jobs", "🧰", "Mis trabajos", state.view === "pro-jobs") +
        tabButton("pro-profile", "👤", "Perfil", state.view === "pro-profile");
    } else {
      tabbar.classList.add("hidden");
    }

    var app = document.getElementById("app");
    var view = state.view;
    if (view === "pro-jobs") app.innerHTML = renderProJobs(user);
    else if (view === "pro-job-detail") app.innerHTML = renderProJobDetail();
    else if (view === "pro-chat") app.innerHTML = renderChat(user);
    else if (view === "pro-profile") app.innerHTML = renderProProfile(user);
    else app.innerHTML = renderProAvailable(user);

    if (view === "pro-chat") scrollChatToBottom();
  }

  function render() {
    var app = document.getElementById("app");
    var tabbar = document.getElementById("tabbar");
    var topActions = document.getElementById("topbarActions");
    var user = currentUser();

    if (!user) {
      tabbar.classList.add("hidden");
      topActions.innerHTML = "";
      app.innerHTML = renderAuth();
      return;
    }

    topActions.innerHTML = '<span style="font-size:11px;opacity:0.85;">' + (user.role === "client" ? "Cliente" : "Profesional") + '</span><button onclick="App.logout()">Salir</button>';

    if (user.role === "client") renderClientShell(user);
    else renderProShell(user);
  }

  // ---------------- public API ----------------
  var App = {
    navigate: function (view, params) {
      state.view = view;
      state.params = params || {};
      render();
    },
    setAuthTab: function (tab) {
      state.authTab = tab;
      render();
    },
    setRegisterRole: function (role) {
      state.registerRole = role;
      document.getElementById("proFields").classList.toggle("hidden", role !== "professional");
      document.getElementById("roleClientBtn").classList.toggle("active", role === "client");
      document.getElementById("roleProBtn").classList.toggle("active", role === "professional");
    },
    toggleChip: function (el) {
      el.classList.toggle("selected");
    },
    login: function () {
      var email = (document.getElementById("loginEmail").value || "").trim().toLowerCase();
      var pass = document.getElementById("loginPassword").value || "";
      var user = db().users.find(function (u) { return u.email.toLowerCase() === email && u.password === pass; });
      if (!user) { toast("Correo o contraseña incorrectos"); return; }
      setSession(user.id);
      state.view = user.role === "client" ? "client-home" : "pro-available";
      render();
    },
    quickLogin: function (email) {
      var user = db().users.find(function (u) { return u.email === email; });
      if (!user) return;
      setSession(user.id);
      state.view = user.role === "client" ? "client-home" : "pro-available";
      render();
    },
    register: function () {
      var name = (document.getElementById("regName").value || "").trim();
      var email = (document.getElementById("regEmail").value || "").trim().toLowerCase();
      var phone = (document.getElementById("regPhone").value || "").trim();
      var pass = document.getElementById("regPassword").value || "";
      var role = state.registerRole || "client";

      if (!name || !email || !phone || !pass) { toast("Completá todos los campos"); return; }
      if (db().users.some(function (u) { return u.email.toLowerCase() === email; })) { toast("Ya existe una cuenta con ese correo"); return; }

      var newUser = { id: uid("user"), role: role, fullName: name, email: email, password: pass, phone: phone };

      if (role === "professional") {
        var selectedCats = Array.prototype.slice.call(document.querySelectorAll("#proFields .chip-check.selected")).map(function (el) { return el.getAttribute("data-cat"); });
        if (!selectedCats.length) { toast("Elegí al menos un servicio que ofrecés"); return; }
        newUser.bio = (document.getElementById("regBio").value || "").trim();
        newUser.categories = selectedCats;
        newUser.baseRate = Number(document.getElementById("regRate").value) || 0;
        newUser.isAvailable = true;
        newUser.isVerified = false;
        newUser.ratingSum = 0;
        newUser.ratingCount = 0;
      }

      mutate(function (d) { d.users.push(newUser); });
      setSession(newUser.id);
      state.view = role === "client" ? "client-home" : "pro-available";
      render();
      toast("¡Cuenta creada! Bienvenido/a a Rogaservice.");
    },
    logout: function () {
      clearSession();
      state.view = "auth";
      state.params = {};
      render();
    },
    startNewRequest: function (catId) {
      App.navigate("client-new-request", { categoryId: catId });
    },
    submitNewRequest: function () {
      var address = (document.getElementById("reqAddress").value || "").trim();
      var description = (document.getElementById("reqDescription").value || "").trim();
      var schedule = document.getElementById("reqSchedule").value || null;
      var budget = Number(document.getElementById("reqBudget").value) || null;
      if (!address || !description) { toast("Completá la dirección y el detalle del servicio"); return; }

      var user = currentUser();
      var newReq = {
        id: uid("req"), clientId: user.id, professionalId: null, categoryId: state.params.categoryId,
        status: "pending", addressText: address, description: description,
        scheduledAt: schedule, priceEstimate: budget, priceFinal: null,
        paymentStatus: "unpaid", commissionAmount: null,
        createdAt: nowIso(), updatedAt: nowIso(), messages: [], review: null,
      };
      mutate(function (d) { d.requests.push(newReq); });
      state.view = "client-orders";
      state.params = {};
      render();
      toast("Solicitud enviada. ¡Buscando un profesional!");
    },
    openClientOrder: function (id) {
      App.navigate("client-order-detail", { orderId: id });
    },
    cancelRequest: function (id) {
      mutate(function (d) {
        var r = d.requests.find(function (x) { return x.id === id; });
        if (r && r.status === "pending") { r.status = "cancelled"; r.updatedAt = nowIso(); }
      });
      toast("Solicitud cancelada");
    },
    payRequest: function (id) {
      mutate(function (d) {
        var r = d.requests.find(function (x) { return x.id === id; });
        if (!r) return;
        var price = r.priceFinal || r.priceEstimate || 0;
        r.commissionAmount = Math.round(price * COMMISSION_RATE);
        r.paymentStatus = "paid";
        r.paidAt = nowIso();
      });
      toast("Pago simulado realizado ✅");
    },
    setRatingStar: function (n) {
      state.selectedRating = n;
      var stars = document.querySelectorAll("#ratingStars span");
      stars.forEach(function (s) { s.classList.toggle("active", Number(s.getAttribute("data-n")) <= n); });
    },
    submitReview: function (id) {
      if (!state.selectedRating) { toast("Elegí una calificación de 1 a 5 estrellas"); return; }
      var comment = (document.getElementById("reviewComment").value || "").trim();
      var rating = state.selectedRating;
      mutate(function (d) {
        var r = d.requests.find(function (x) { return x.id === id; });
        if (!r) return;
        r.review = { rating: rating, comment: comment, createdAt: nowIso() };
        var pro = d.users.find(function (u) { return u.id === r.professionalId; });
        if (pro) { pro.ratingSum = (pro.ratingSum || 0) + rating; pro.ratingCount = (pro.ratingCount || 0) + 1; }
      });
      state.selectedRating = null;
      toast("¡Gracias por tu calificación!");
    },
    openChat: function (role, orderId) {
      state.chatDraft = "";
      App.navigate(role === "client" ? "client-chat" : "pro-chat", { orderId: orderId });
    },
    setChatDraft: function (v) {
      state.chatDraft = v;
    },
    handleChatKey: function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        App.sendMessage(state.params.orderId);
      }
    },
    sendMessage: function (orderId) {
      var text = (state.chatDraft || "").trim();
      if (!text) return;
      var user = currentUser();
      state.chatDraft = "";
      mutate(function (d) {
        var r = d.requests.find(function (x) { return x.id === orderId; });
        if (!r) return;
        r.messages = r.messages || [];
        r.messages.push({ id: uid("msg"), senderId: user.id, content: text, createdAt: nowIso() });
        r.updatedAt = nowIso();
      });
    },
    toggleAvailability: function () {
      var user = currentUser();
      mutate(function (d) {
        var u = d.users.find(function (x) { return x.id === user.id; });
        u.isAvailable = !u.isAvailable;
      });
    },
    acceptRequest: function (id) {
      var user = currentUser();
      mutate(function (d) {
        var r = d.requests.find(function (x) { return x.id === id; });
        if (!r || r.status !== "pending") return;
        r.professionalId = user.id;
        r.status = "accepted";
        r.updatedAt = nowIso();
      });
      App.navigate("pro-job-detail", { orderId: id });
      toast("¡Solicitud aceptada!");
    },
    openProJob: function (id) {
      App.navigate("pro-job-detail", { orderId: id });
    },
    startJob: function (id) {
      mutate(function (d) {
        var r = d.requests.find(function (x) { return x.id === id; });
        if (r) { r.status = "in_progress"; r.updatedAt = nowIso(); }
      });
    },
    finishJob: function (id) {
      var priceInput = document.getElementById("finalPrice");
      var price = Number(priceInput.value) || 0;
      if (!price) {
        var r0 = db().requests.find(function (x) { return x.id === id; });
        price = (r0 && r0.priceEstimate) || 0;
      }
      if (!price) { toast("Ingresá el precio final del servicio"); return; }
      mutate(function (d) {
        var r = d.requests.find(function (x) { return x.id === id; });
        if (r) { r.priceFinal = price; r.status = "completed"; r.updatedAt = nowIso(); }
      });
      toast("Servicio marcado como completado");
    },
    saveProProfile: function () {
      var user = currentUser();
      var phone = document.getElementById("proPhone").value || "";
      var bio = document.getElementById("proBio").value || "";
      var rate = Number(document.getElementById("proRate").value) || 0;
      var cats = Array.prototype.slice.call(document.querySelectorAll(".checkbox-grid .chip-check.selected")).map(function (el) { return el.getAttribute("data-cat"); });
      if (!cats.length) { toast("Elegí al menos un servicio"); return; }
      mutate(function (d) {
        var u = d.users.find(function (x) { return x.id === user.id; });
        u.phone = phone; u.bio = bio; u.baseRate = rate; u.categories = cats;
      });
      toast("Perfil actualizado");
    },
    saveClientProfile: function () {
      var user = currentUser();
      var phone = document.getElementById("clientPhone").value || "";
      mutate(function (d) {
        var u = d.users.find(function (x) { return x.id === user.id; });
        u.phone = phone;
      });
      toast("Perfil actualizado");
    },
  };

  window.App = App;

  document.addEventListener("DOMContentLoaded", function () {
    seedIfNeeded();
    initialRoute();
    render();

    window.addEventListener("storage", function (e) {
      if (e.key === DB_KEY) render();
    });

    setInterval(function () {
      if (!currentUser()) return;
      var active = document.activeElement;
      var tag = active && active.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      render();
    }, 2500);
  });
})();
