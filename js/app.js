(function () {
  "use strict";

  var DB_KEY = "rogaservice_db_v1";
  var SESSION_KEY = "rogaservice_session_v1";
  var COMMISSION_RATE = 0.15;

  var CATEGORIES = [
    { id: "jardineria", name: "Jardinería", icon: "🌿", group: "Hogar", price: 180000 },
    { id: "plomeria", name: "Plomería", icon: "🔧", group: "Hogar", price: 150000 },
    { id: "electricidad", name: "Electricidad", icon: "💡", group: "Hogar", price: 170000 },
    { id: "ninera", name: "Cuidado de niños", icon: "🧸", group: "Cuidados", price: 120000 },
    { id: "carpinteria_pintura", name: "Carpintería y pintura", icon: "🎨", group: "Hogar", price: 220000 },
    { id: "mascotas", name: "Cuidado de mascotas", icon: "🐾", group: "Cuidados", price: 100000 },
    { id: "choferes", name: "Choferes", icon: "🚘", group: "Movilidad y educación", price: 200000 },
    { id: "docentes", name: "Docentes suplentes", icon: "📚", group: "Movilidad y educación", price: 180000 },
    { id: "enfermeria", name: "Enfermería y cuidado geriátrico", icon: "🩺", group: "Cuidados", price: 250000 },
    { id: "limpieza", name: "Limpieza de hogar", icon: "🏠", group: "Hogar", price: 160000 },
    { id: "limpieza_empresas", name: "Limpieza de empresas", icon: "🏢", group: "Hogar", price: 350000 }
  ];

  var SERVICE_PROVIDERS = [
    ["jardineria", "Diego Benítez", "Diez años cuidando jardines y patios.", 4.9, 84, "men/11"],
    ["jardineria", "Lourdes Giménez", "Jardinería, poda y mantenimiento integral.", 4.8, 61, "women/47"],
    ["plomeria", "Carlos Servín", "Plomería residencial y atención de urgencias.", 4.9, 126, "men/32"],
    ["plomeria", "Miguel Acosta", "Reparaciones sanitarias y detección de fugas.", 4.7, 89, "men/51"],
    ["electricidad", "Bruno Ferreira", "Electricista certificado para hogares y oficinas.", 4.9, 103, "men/45"],
    ["electricidad", "Patricia Sosa", "Instalaciones y reparaciones eléctricas seguras.", 4.8, 76, "women/44"],
    ["ninera", "Ana Duarte", "Cuidado infantil y primeros auxilios pediátricos.", 4.9, 118, "women/32"],
    ["ninera", "Sofía Gómez", "Acompañamiento responsable y actividades educativas.", 4.8, 92, "women/65"],
    ["carpinteria_pintura", "Ramón López", "Carpintería, muebles y terminaciones de pintura.", 4.8, 71, "men/53"],
    ["carpinteria_pintura", "Marta Vera", "Pintura interior y restauración de muebles.", 4.9, 64, "women/56"],
    ["mascotas", "Lucía Rojas", "Paseos y cuidado amoroso de perros y gatos.", 4.9, 137, "women/26"],
    ["mascotas", "Matías Villalba", "Cuidador de mascotas con experiencia veterinaria.", 4.7, 83, "men/22"],
    ["choferes", "Jorge Caballero", "Traslados puntuales, seguros y profesionales.", 4.9, 152, "men/36"],
    ["choferes", "Elena Torres", "Chofer profesional para traslados y diligencias.", 4.8, 110, "women/49"],
    ["docentes", "Laura Martínez", "Docente suplente de nivel inicial y escolar básica.", 4.9, 86, "women/68"],
    ["docentes", "Andrés Benítez", "Apoyo escolar y suplencias en ciencias y matemática.", 4.8, 73, "men/62"],
    ["enfermeria", "Elena Duarte", "Enfermera con experiencia en cuidado domiciliario.", 4.9, 121, "women/43"],
    ["enfermeria", "Rosa Centurión", "Acompañamiento geriátrico con trato humano.", 4.8, 97, "women/52"],
    ["limpieza", "Rosa Benítez", "Limpieza profunda y mantenimiento del hogar.", 4.9, 143, "women/60"],
    ["limpieza", "Mónica Ayala", "Orden, limpieza y atención a los detalles.", 4.8, 105, "women/55"],
    ["limpieza_empresas", "Gustavo Núñez", "Limpieza profesional para oficinas y comercios.", 4.8, 94, "men/54"],
    ["limpieza_empresas", "Silvia Franco", "Equipos de limpieza para empresas y eventos.", 4.9, 112, "women/58"]
  ];

  var state = {
    view: "auth",
    params: {},
    authTab: "login",
    registerRole: "client",
    chatDraft: "",
    selectedRating: null,
    selectedProviderId: null,
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

  function ensureServiceProviders(d) {
    SERVICE_PROVIDERS.forEach(function (data, index) {
      var category = categoryById(data[0]);
      var demoEmail = data[1] === "Carlos Servín" ? "plomero@demo.com" :
        (data[1] === "Ana Duarte" ? "ninera@demo.com" :
          (data[1] === "Rosa Benítez" ? "limpieza@demo.com" : "profesional" + (index + 1) + "@demo.com"));
      var provider = d.users.find(function (u) { return u.email === demoEmail; });
      var values = {
        role: "professional", fullName: data[1], email: demoEmail, password: "1234",
        phone: "0981 " + String(110000 + index).slice(0, 3) + " " + String(110000 + index).slice(3),
        bio: data[2], categories: [data[0]], baseRate: category.price,
        isAvailable: true, isVerified: true, ratingSum: Math.round(data[3] * data[4]),
        ratingCount: data[4], avatarUrl: "https://randomuser.me/api/portraits/" + data[5] + ".jpg"
      };
      if (provider) {
        Object.keys(values).forEach(function (key) { provider[key] = values[key]; });
      } else {
        values.id = "provider_" + (index + 1);
        d.users.push(values);
      }
    });
  }

  function seedIfNeeded() {
    var d = loadDB();
    if (d && d.seeded) { d.categories = CATEGORIES; ensureServiceProviders(d); saveDB(d); return d; }
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
    ensureServiceProviders(d);
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
        (r.priceEstimate ? '<span class="price">' + formatGs(r.priceEstimate) + "</span>" : "")) +
      "</div></div>";
  }

  // ---------------- auth screens ----------------
  function renderAuth() {
    var tab = state.authTab;
    var html = '<section class="auth-intro"><div class="auth-image" role="img" aria-label="Profesional de confianza llegando a un hogar"></div>' +
      '<div class="auth-copy"><span class="eyebrow">SERVICIOS CERCA TUYO</span><h1>Soluciones confiables, cuando las necesitás.</h1>' +
      '<p>Encontrá profesionales verificados para tu hogar, familia o empresa.</p>' +
      '<div class="trust-row"><span>✓ Perfiles verificados</span><span>★ Calificaciones reales</span></div></div></section>';
    html += '<div class="auth-panel">';
    html += '<div class="tabs-switch">' +
      '<button class="' + (tab === "login" ? "active" : "") + '" onclick="App.setAuthTab(\'login\')">Iniciar sesión</button>' +
      '<button class="' + (tab === "register" ? "active" : "") + '" onclick="App.setAuthTab(\'register\')">Registrarme</button>' +
      "</div>";
    html += tab === "login" ? formLoginHtml() : formRegisterHtml();
    html += '</div>';
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
      '<p class="pricing-note">Rogaservice define y muestra la tarifa de cada servicio.</p>' +
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
    return '<details class="demo-box"><summary>Probar la aplicación con cuentas demo</summary><div class="demo-list">' + items + "</div></details>";
  }

  // ---------------- client screens ----------------
  function renderClientHome(user) {
    var groups = ["Hogar", "Cuidados", "Movilidad y educación"];
    var catsHtml = groups.map(function (group) {
      var cards = CATEGORIES.filter(function (c) { return c.group === group; }).map(function (c) {
        return '<button class="cat-card" data-search="' + escapeHtml(c.name.toLowerCase()) + '" onclick="App.startNewRequest(' + sq(c.id) + ')">' +
          '<span class="cat-icon">' + c.icon + '</span><span class="cat-name">' + c.name + '</span><span class="cat-arrow">›</span></button>';
      }).join("");
      return '<section class="service-group"><div class="section-heading"><h2>' + group + '</h2><span>' + (CATEGORIES.filter(function (c) { return c.group === group; }).length) + ' servicios</span></div><div class="service-grid">' + cards + '</div></section>';
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

    return '<div class="home-heading"><div><span class="eyebrow">HOLA, ' + escapeHtml(firstName(user.fullName).toUpperCase()) + '</span><h1>¿Qué necesitás hoy?</h1></div><span class="profile-mini">' + initials(user.fullName) + '</span></div>' +
      '<label class="service-search"><span>⌕</span><input type="search" placeholder="Buscar un servicio" aria-label="Buscar un servicio" oninput="App.filterServices(this.value)"></label>' +
      '<section class="service-hero"><div class="hero-content"><span class="hero-pill">Profesionales verificados</span><h2>Ayuda confiable para cada momento.</h2><p>Pedí un servicio en pocos pasos.</p></div><div class="hero-art" role="img" aria-label="Profesional de servicios para el hogar"></div></section>' +
      activeHtml + '<div id="servicesList">' + catsHtml + '</div><div id="noServiceResults" class="empty-state hidden"><span class="emoji">⌕</span>No encontramos ese servicio.</div>';
  }

  function renderClientNewRequest() {
    var cat = categoryById(state.params.categoryId);
    var providers = db().users.filter(function (u) {
      return u.role === "professional" && u.isAvailable && (u.categories || []).indexOf(cat.id) >= 0;
    }).sort(function (a, b) { return (proRatingAvg(b) || 0) - (proRatingAvg(a) || 0); }).slice(0, 2);
    var providerHtml = providers.map(function (pro, index) {
      var avg = proRatingAvg(pro);
      return '<button type="button" class="provider-card" data-provider-id="' + pro.id + '" onclick="App.selectProvider(this,' + sq(pro.id) + ')">' +
        '<span class="provider-photo"><span>' + initials(pro.fullName) + '</span><img src="' + escapeHtml(pro.avatarUrl || "") + '" alt="Foto de ' + escapeHtml(pro.fullName) + '" onerror="this.style.display=\'none\'"></span>' +
        '<span class="provider-info"><span class="provider-top"><strong>' + escapeHtml(pro.fullName) + '</strong>' + (index === 0 ? '<em>Más elegido</em>' : '') + '</span>' +
        '<span class="provider-stats"><span class="provider-rating"><b>★</b> ' + (avg ? avg.toFixed(1) : "Nuevo") + '</span><small>' + (pro.ratingCount || 0) + ' trabajos realizados</small></span>' +
        '<span class="provider-bio">' + escapeHtml(pro.bio || "Profesional disponible") + '</span><span class="verified">✓ Identidad verificada</span></span>' +
        '<span class="provider-select">✓</span></button>';
    }).join("");
    return backLink("client-home") +
      '<div class="request-heading"><span class="cat-icon">' + cat.icon + '</span><div><span class="eyebrow">NUEVA SOLICITUD</span><h1>' + cat.name + '</h1></div></div>' +
      '<div class="fixed-price"><span><small>Tarifa definida por Rogaservice</small><strong>' + formatGs(cat.price) + '</strong></span><span class="price-check">✓ Precio claro</span></div>' +
      '<div class="form-step"><span>1</span><div><strong>Elegí un profesional</strong><small>Ambos están disponibles para este servicio</small></div></div>' +
      '<div class="provider-list">' + providerHtml + '</div>' +
      '<div class="form-step"><span>2</span><div><strong>Contanos dónde y cuándo</strong><small>Completá los datos para enviar tu solicitud</small></div></div>' +
      '<div class="field"><label>Dirección</label><input id="reqAddress" placeholder="Calle, número, barrio"></div>' +
      '<div class="field"><label>¿Qué necesitás?</label><textarea id="reqDescription" placeholder="Contanos el problema con detalle"></textarea></div>' +
      '<div class="field"><label>¿Cuándo?</label><input id="reqSchedule" type="datetime-local"></div>' +
      '<button id="submitRequestBtn" class="btn btn-primary" onclick="App.submitNewRequest()" disabled>Confirmar solicitud · ' + formatGs(cat.price) + '</button>';
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
      html += '<div class="card"><p class="muted">' + (pro ? 'Tu solicitud fue enviada a <strong>' + escapeHtml(pro.fullName) + '</strong>. Te avisaremos cuando la acepte.' : 'Buscando un profesional disponible para tu categoría. Te avisaremos apenas alguien lo acepte.') + '</p>' +
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
      (r.priceEstimate ? '<p class="service-price-line">Tarifa Rogaservice: <strong>' + formatGs(r.priceEstimate) + "</strong></p>" : "") +
      '<button class="btn btn-primary" style="margin-top:8px;" onclick="App.acceptRequest(' + sq(r.id) + ')">Aceptar solicitud</button></div>';
  }

  function renderProAvailable(user) {
    var d = db();
    var myCats = user.categories || [];
    var pending = d.requests.filter(function (r) {
      return r.status === "pending" && (r.professionalId ? r.professionalId === user.id : myCats.indexOf(r.categoryId) >= 0);
    })
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
        '<div class="summary-line"><span>Tarifa definida por Rogaservice</span><strong>' + formatGs(r.priceEstimate || 0) + '</strong></div>' +
        '<button class="btn btn-primary" style="margin-top:12px;" onclick="App.finishJob(' + sq(r.id) + ')">Marcar como completado</button></div>';
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
      '<p class="pricing-note">Las tarifas son administradas por Rogaservice.</p>' +
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
        newUser.baseRate = 0;
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
      state.selectedProviderId = null;
      App.navigate("client-new-request", { categoryId: catId });
    },
    selectProvider: function (el, providerId) {
      state.selectedProviderId = providerId;
      document.querySelectorAll(".provider-card").forEach(function (card) {
        card.classList.toggle("selected", card === el);
      });
      var submit = document.getElementById("submitRequestBtn");
      if (submit) submit.disabled = false;
    },
    filterServices: function (query) {
      var term = (query || "").trim().toLowerCase();
      var groups = document.querySelectorAll(".service-group");
      var visibleCount = 0;
      groups.forEach(function (group) {
        var groupCount = 0;
        group.querySelectorAll(".cat-card").forEach(function (card) {
          var matches = !term || (card.getAttribute("data-search") || "").indexOf(term) >= 0;
          card.classList.toggle("hidden", !matches);
          if (matches) { groupCount += 1; visibleCount += 1; }
        });
        group.classList.toggle("hidden", groupCount === 0);
      });
      var empty = document.getElementById("noServiceResults");
      if (empty) empty.classList.toggle("hidden", visibleCount > 0);
    },
    submitNewRequest: function () {
      var address = (document.getElementById("reqAddress").value || "").trim();
      var description = (document.getElementById("reqDescription").value || "").trim();
      var schedule = document.getElementById("reqSchedule").value || null;
      var cat = categoryById(state.params.categoryId);
      if (!state.selectedProviderId) { toast("Elegí un profesional para continuar"); return; }
      if (!address || !description) { toast("Completá la dirección y el detalle del servicio"); return; }

      var user = currentUser();
      var newReq = {
        id: uid("req"), clientId: user.id, professionalId: state.selectedProviderId, categoryId: state.params.categoryId,
        status: "pending", addressText: address, description: description,
        scheduledAt: schedule, priceEstimate: cat.price, priceFinal: null,
        paymentStatus: "unpaid", commissionAmount: null,
        createdAt: nowIso(), updatedAt: nowIso(), messages: [], review: null,
      };
      mutate(function (d) { d.requests.push(newReq); });
      state.view = "client-orders";
      state.params = {};
      state.selectedProviderId = null;
      render();
      toast("Solicitud enviada al profesional seleccionado");
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
      mutate(function (d) {
        var r = d.requests.find(function (x) { return x.id === id; });
        if (r) { r.priceFinal = r.priceEstimate || (categoryById(r.categoryId) || {}).price || 0; r.status = "completed"; r.updatedAt = nowIso(); }
      });
      toast("Servicio marcado como completado");
    },
    saveProProfile: function () {
      var user = currentUser();
      var phone = document.getElementById("proPhone").value || "";
      var bio = document.getElementById("proBio").value || "";
      var cats = Array.prototype.slice.call(document.querySelectorAll(".checkbox-grid .chip-check.selected")).map(function (el) { return el.getAttribute("data-cat"); });
      if (!cats.length) { toast("Elegí al menos un servicio"); return; }
      mutate(function (d) {
        var u = d.users.find(function (x) { return x.id === user.id; });
        u.phone = phone; u.bio = bio; u.categories = cats;
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
