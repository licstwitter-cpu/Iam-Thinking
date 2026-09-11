/* ============ MAYKOOL & GABRIELA — el rincón de los dos ============ */
(function () {
  "use strict";

  var reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NOMBRES_VALIDOS = { maykool: "Maykool", gabriela: "Gabriela" };
  var EMOJIS = ["💖", "❤️", "😘", "💋", "😍", "🥰", "😊", "🥺",
                "🌹", "💘", "🎀", "🌸", "💕", "😻", "✨", "🤍"];
  var CLAVE_USUARIO = "mg-usuario";
  var TITULO = "Maykool 💘 Gabriela";

  /* ---------- referencias al DOM ---------- */
  var loginEl = document.getElementById("login");
  var chatEl = document.getElementById("chat");
  var formEl = document.getElementById("login-form");
  var inputNombre = document.getElementById("login-nombre");
  var errorEl = document.getElementById("login-error");
  var notaEl = document.getElementById("login-nota");
  var fondoEl = document.getElementById("fondo");
  var mensajesEl = document.getElementById("mensajes");
  var estadoEl = document.getElementById("estado");
  var inputTexto = document.getElementById("input-texto");
  var btnEnviar = document.getElementById("btn-enviar");
  var btnEmoji = document.getElementById("btn-emoji");
  var pickerEl = document.getElementById("emoji-picker");
  var btnSalir = document.getElementById("btn-salir");

  var yo = localStorage.getItem(CLAVE_USUARIO);
  var escuchando = false;
  var typingTimer = null;
  var tituloParpadeo = false;
  var db = null;
  var refMensajes = null;
  var refEscribiendo = null;
  var barraMensajes = null;

  /* ================= fondo de corazones flotantes ================= */
  function crearFondo(cantidad) {
    if (reducir || fondoEl.childElementCount) return;
    var simbolos = ["💗", "💕", "💖", "🤍", "🌸", "✨", "💞"];
    for (var i = 0; i < cantidad; i++) {
      var c = document.createElement("span");
      c.className = "corazon-fondo";
      c.textContent = simbolos[i % simbolos.length];
      c.style.left = Math.random() * 96 + "vw";
      c.style.fontSize = 12 + Math.random() * 24 + "px";
      c.style.animationDuration = 9 + Math.random() * 12 + "s";
      c.style.animationDelay = -Math.random() * 16 + "s";
      c.style.setProperty("--va", (Math.random() * 60 - 30).toFixed(0) + "px");
      c.style.setProperty("--op", (0.2 + Math.random() * 0.35).toFixed(2));
      fondoEl.appendChild(c);
    }
  }
  crearFondo(window.innerWidth < 500 ? 14 : 20);

  /* ================= sonidos (Web Audio API) ================= */
  var audioCtx = null;

  function asegurarAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function tono(frec, duracion, volumen, retraso) {
    if (!audioCtx) return;
    setTimeout(function () {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = frec;
      gain.gain.setValueAtTime(volumen, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duracion);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duracion);
    }, retraso || 0);
  }

  function sonidoEnviar() {
    asegurarAudio();
    tono(620, 0.16, 0.18);
    tono(420, 0.18, 0.12, 0.08);
  }

  function sonidoRecibir() {
    asegurarAudio();
    tono(880, 0.18, 0.14);
    tono(1318, 0.22, 0.12, 0.12);
  }

  /* ================= utilidades ================= */
  function horaBonita(ms) {
    try {
      return new Date(ms).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  }

  function esSoloEmoji(texto) {
    var t = texto.trim().replace(/\s+/g, "");
    if (!t) return false;
    return /^\p{Extended_Pictographic}(\uFE0F|\u200D)*$/u.test(t);
  }

  function estaConfigurado() {
    var cfg = window.FIREBASE_CONFIG;
    return cfg && cfg.apiKey && cfg.databaseURL && window.SECRET_CODE;
  }

  function canonicalizar(nombre) {
    return NOMBRES_VALIDOS[nombre.trim().toLowerCase()] || null;
  }

  function elOtro() {
    return yo === "Maykool" ? "Gabriela" : "Maykool";
  }

  function mostrarLogin() {
    loginEl.hidden = false;
    loginEl.classList.remove("hidden");
    chatEl.hidden = true;
    chatEl.classList.add("hidden");
    chatEl.setAttribute("aria-hidden", "true");
    inputNombre.focus();
  }

  function mostrarChat() {
    loginEl.hidden = true;
    loginEl.classList.add("hidden");
    chatEl.hidden = false;
    chatEl.classList.remove("hidden");
    chatEl.removeAttribute("aria-hidden");
    setTimeout(function () { inputTexto.focus(); }, 80);
  }

  /* ================= corazón que vuela al enviar ================= */
  function corazonVuela(desdeEl) {
    if (reducir) return;
    var r = desdeEl.getBoundingClientRect();
    var c = document.createElement("span");
    c.className = "corazon-enviado";
    c.textContent = ["💖", "💕", "💘", "✨"][Math.floor(Math.random() * 4)];
    c.style.setProperty("--x", r.left + r.width / 2 + "px");
    c.style.setProperty("--y", r.top + "px");
    c.style.setProperty("--dx", (Math.random() * 80 - 40).toFixed(0) + "px");
    document.body.appendChild(c);
    setTimeout(function () { c.remove(); }, 1300);
  }

  /* ================= estado: escribiendo ================= */
  function estadoEscribiendo(quien) {
    estadoEl.innerHTML = quien + " está escribiendo <span class='estado-punto'></span>";
  }

  function estadoConectados() {
    estadoEl.innerHTML = "Conectad@s <span class='estado-punto'></span>";
  }

  /* ================= Firebase: arranque ================= */
  function arrancarFirebase(despues) {
    if (!estaConfigurado()) { if (despues) despues(false); return; }
    if (db) { if (despues) despues(true); return; }

    firebase.initializeApp(window.FIREBASE_CONFIG);
    db = firebase.database();
    var raiz = db.ref("c/" + window.SECRET_CODE);
    refMensajes = raiz.child("messages");
    refEscribiendo = raiz.child("typing");

    firebase.auth().signInAnonymously()
      .then(function () { if (despues) despues(true); })
      .catch(function () { if (despues) despues(false); });
  }

  /* ================= dibujo de mensajes ================= */
  function hacerBurbuja(key, m) {
    var mia = m.user === yo;
    var burbuja = document.createElement("div");
    burbuja.className = "burbuja " + (mia ? "mia" : "suya");
    burbuja.dataset.key = key;
    if (esSoloEmoji(m.texto)) burbuja.classList.add("emoji-mensaje");

    var texto = document.createElement("div");
    texto.className = "burbuja-texto";
    texto.textContent = m.texto;

    var hora = document.createElement("time");
    hora.className = "burbuja-hora";
    hora.dateTime = new Date(m.tiempo || Date.now()).toISOString();
    hora.textContent = (mia ? "Yo · " : m.user + " · ") + horaBonita(m.tiempo || Date.now());

    burbuja.appendChild(texto);
    burbuja.appendChild(hora);
    return burbuja;
  }

  function crearBarraMensajes() {
    barraMensajes = document.createElement("div");
    barraMensajes.className = "barra";
    mensajesEl.innerHTML = "";
    mensajesEl.appendChild(barraMensajes);

    var vacio = document.createElement("div");
    vacio.className = "vacio";
    vacio.innerHTML = "<span class='vacio-emoji'>💌</span>Empieza el chat<br>envíale algo bonito a " +
      elOtro() + " 💕";
    barraMensajes.appendChild(vacio);
  }

  function agregarMensaje(key, m) {
    if (!m || !m.user || !m.texto) return;
    if (document.querySelector('[data-key="' + key + '"]')) return;
    if (!barraMensajes) crearBarraMensajes();

    var vacio = barraMensajes.querySelector(".vacio");
    if (vacio) vacio.remove();

    barraMensajes.appendChild(hacerBurbuja(key, m));
    abajoSiCerca();
  }

  function abajoSiCerca() {
    var cerca = mensajesEl.scrollHeight - mensajesEl.scrollTop - mensajesEl.clientHeight < 160;
    if (cerca) mensajesEl.scrollTop = mensajesEl.scrollHeight;
  }

  /* ================= escuchar mensajes nuevos ================= */
  function encenderListener() {
    if (escuchando || !refMensajes) return;
    escuchando = true;

    refMensajes.on("child_added", function (snap) {
      var m = snap.val();
      agregarMensaje(snap.key, m);
      if (m && m.user !== yo) {
        sonidoRecibir();
        if (document.hidden) titular("💌 Nuevo mensaje");
      }
    });

    refEscribiendo.on("value", function (snap) {
      var quien = snap.val();
      if (quien && quien !== yo) estadoEscribiendo(quien);
      else estadoConectados();
    });
  }

  /* ================= título que parpadea ================= */
  function titular(texto) {
    tituloParpadeo = true;
    document.title = texto;
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) { tituloParpadeo = false; document.title = TITULO; }
  });

  setInterval(function () {
    if (tituloParpadeo && document.hidden) {
      document.title = document.title === "💌 Nuevo mensaje" ? TITULO : "💌 Nuevo mensaje";
    }
  }, 1200);

  /* ================= enviar mensaje ================= */
  function enviar() {
    var texto = inputTexto.value.trim();
    if (!texto || !yo || !refMensajes) return;
    asegurarAudio();

    refMensajes.push({ user: yo, texto: texto, tiempo: Date.now() }).then(function () {
      inputTexto.value = "";
      estadoConectados();
    });

    sonidoEnviar();
    corazonVuela(btnEnviar);
    abajoSiCerca();
  }

  /* ---------- indicador de escritura ---------- */
  inputTexto.addEventListener("input", function () {
    if (!yo || !refEscribiendo) return;
    clearTimeout(typingTimer);
    refEscribiendo.set(yo);
    typingTimer = setTimeout(function () { refEscribiendo.remove(); }, 1500);
  });

  btnEnviar.addEventListener("click", enviar);
  inputTexto.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  });

  /* ================= selector de emojis ================= */
  EMOJIS.forEach(function (em) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = em;
    b.setAttribute("aria-label", "Añadir " + em);
    b.addEventListener("click", function () {
      inputTexto.value += em;
      inputTexto.focus();
      pickerEl.classList.add("hidden");
    });
    pickerEl.appendChild(b);
  });

  btnEmoji.addEventListener("click", function () {
    pickerEl.classList.toggle("hidden");
    if (!pickerEl.classList.contains("hidden") && !audioCtx) asegurarAudio();
  });

  document.addEventListener("click", function (e) {
    if (!pickerEl.classList.contains("hidden") &&
        !pickerEl.contains(e.target) && e.target !== btnEmoji) {
      pickerEl.classList.add("hidden");
    }
  });

  /* ================= entrar al chat ================= */
  function entrar(nombre) {
    yo = canonicalizar(nombre);
    localStorage.setItem(CLAVE_USUARIO, yo);
    estadoConectados();
    mostrarChat();

    arrancarFirebase(function (ok) {
      if (!ok) return;
      crearBarraMensajes();
      encenderListener();
      abajoSiCerca();
    });
  }

  /* ================= formulario de login ================= */
  formEl.addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = inputNombre.value.trim();
    if (!nombre) return;

    var canon = canonicalizar(nombre);
    if (!canon) {
      errorEl.hidden = false;
      errorEl.textContent = "Hmm... este rincón es solo para Maykool y Gabriela 💔";
      var tarjeta = document.querySelector(".login-tarjeta");
      tarjeta.style.animation = "none";
      void tarjeta.offsetWidth;
      tarjeta.style.animation = "sacudida .45s ease";
      return;
    }

    if (!estaConfigurado()) {
      errorEl.hidden = true;
      notaEl.hidden = false;
      notaEl.textContent = "💡 Hola " + canon + "!\n" +
        "Falta conectar Firebase: sigue los pasos de DESIGN.md\n" +
        "y pega tus claves en js/config.js 💕";
      return;
    }

    errorEl.hidden = true;
    notaEl.hidden = true;
    entrar(canon);
  });

  /* ================= cerrar sesión ================= */
  btnSalir.addEventListener("click", function () {
    if (escuchando && refMensajes) {
      refMensajes.off();
      refEscribiendo.off();
      escuchando = false;
    }
    yo = null;
    barraMensajes = null;
    mensajesEl.innerHTML = "";
    estadoConectados();
    document.title = TITULO;
    tituloParpadeo = false;
    localStorage.removeItem(CLAVE_USUARIO);
    inputNombre.value = "";
    mostrarLogin();
  });

  window.addEventListener("focus", function () {
    tituloParpadeo = false;
    document.title = TITULO;
  });

  /* ================= arranque: sesión guardada ================= */
  if (yo && canonicalizar(yo)) {
    entrar(yo);
  } else {
    yo = null;
    mostrarLogin();
  }
})();