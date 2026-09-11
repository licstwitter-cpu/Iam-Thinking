/* ============ I'M THINKING — arranque, login y utilidades globales ============ */
(function () {
  "use strict";

  var D = IT.data;

  /* ---------- helpers globales ---------- */
  IT.toast = function (msg, err) {
    var cont = IT.$("#toasts");
    if (!cont) return;
    var t = document.createElement("div");
    t.className = "toast" + (err ? " err" : "");
    t.textContent = msg;
    cont.appendChild(t);
    setTimeout(function () { t.style.opacity = "0"; t.style.transition = "opacity .3s"; }, 2200);
    setTimeout(function () { t.remove(); }, 2600);
  };

  window.abrirModal = function (id) {
    var m = IT.$("#" + id);
    if (m) { m.classList.remove("hidden"); if (m.classList.contains("modal")) document.body.classList.add("sin-scroll"); }
  };
  window.cerrarModal = function (id) {
    var m = IT.$("#" + id);
    if (m) m.classList.add("hidden");
    if (!IT.$$(".modal:not(.hidden)").length) document.body.classList.remove("sin-scroll");
  };

  /* ---------- fondo de corazones ---------- */
  function fondoCorazones() {
    var f = IT.$("#fondo");
    if (!f) return;
    var simbolos = ["💭", "❤", "💖", "💕", "💗", "💙", "💚", "💜", "✨", "♡"];
    var html = "";
    for (var i = 0; i < 14; i++) {
      var izq = (Math.random() * 100).toFixed(1);
      var tam = (14 + Math.random() * 30).toFixed(0);
      var dur = (9 + Math.random() * 12).toFixed(1);
      var ret = (Math.random() * -18).toFixed(1);
      var va = ((Math.random() * 60) - 30).toFixed(0);
      var op = (0.25 + Math.random() * 0.35).toFixed(2);
      html += "<span class='corazon-fondo' style='left:" + izq + "%;font-size:" + tam + "px;" +
        "animation-duration:" + dur + "s;animation-delay:" + ret + "s;--va:" + va + "px;--op:" + op + "'>" +
        (simbolos[i % simbolos.length]) + "</span>";
    }
    f.innerHTML = html;
  }

  /* ---------- login ---------- */
  var EMOJIS_PERFIL = ["😊", "🥰", "😎", "🔥", "💖", "🌟", "🎉", "🐱", "🐶", "🌸", "🍀", "🌈"];
  var COLORES = ["#E85D90", "#9A6FD8", "#5AA6E8", "#4BB87D", "#EFA63F", "#E0578B", "#7D8FE0", "#B33951"];
  var emojiSel = "😊", colorSel = "#E85D90", pendienteUid = null;

  function rellenarFila(cont, tipo, sel) {
    cont.innerHTML = "";
    (tipo === "emoji" ? EMOJIS_PERFIL : COLORES).forEach(function (v) {
      var b = document.createElement("button");
      if (tipo === "color") b.style.background = v;
      else b.textContent = v;
      if (v === sel) b.classList.add("sel");
      b.addEventListener("click", function () {
        if (tipo === "emoji") emojiSel = v; else colorSel = v;
        cont.querySelectorAll("button").forEach(function (x) { x.classList.remove("sel"); });
        b.classList.add("sel");
      });
      cont.appendChild(b);
    });
  }

  function errores(msg) {
    var e = IT.$("#login-error");
    e.textContent = msg;
    e.hidden = false;
    var nn = e.cloneNode(true);
    e.parentNode.replaceChild(nn, e);
    return IT.$("#login-error");
  }

  function entrarUid(uid) {
    D.leerUsuario(uid, function (p) {
      if (!p) { errores("No encontré ese perfil 😕"); return; }
      D.guardarSesion(uid, p.name);
      D.setSesion({ uid: uid, name: p.name });
      D.entrarA(uid);
      IT.$("#login").classList.add("hidden");
      IT.$("#setup").classList.add("hidden");
      abrirModal("home");
      setTimeout(function () { IT.toast("¡Hola, " + p.name + "! 👋"); }, 200);
    });
  }

  function instruirLogin() {
    var sesion = D.leerSesion();
    if (sesion && sesion.uid) {
      IT.$("#sesion-nombre").textContent = sesion.name || "tú";
      IT.$("#login-rapido").classList.remove("hidden");
    }
  }

  function mostrarSetup(nombre) {
    IT.$("#setup-nombre").textContent = nombre;
    pendienteUid = null;
    emojiSel = "😊"; colorSel = "#E85D90";
    IT.$("#setup-pin").value = "";
    rellenarFila(IT.$("#setup-emoji"), "emoji", emojiSel);
    rellenarFila(IT.$("#setup-color"), "color", colorSel);
    IT.$("#setup").classList.remove("hidden");
    IT.$("#login").classList.add("hidden");
  }

  function desbloquear() {
    var pin = IT.$("#login-pin").value.trim();
    if (!pendienteUid) { instruirLogin(); return; }
    D.leerUsuario(pendienteUid, function (p) {
      if (!p) { errores("Ese perfil ya no existe 😕"); return; }
      if (p.pin && p.pin === pin) {
        IT.$("#login-pin-wrap").classList.add("hidden");
        IT.$("#login-pin").value = "";
        entrarUid(pendienteUid);
      } else {
        errores("PIN incorrecto 🔒");
      }
    });
  }

  function enviarLogin(e) {
    if (e) e.preventDefault();
    var nombre = D.nombreBonito(IT.$("#login-nombre").value);
    var er = IT.$("#login-error");
    er.hidden = true;
    if (!nombre) { errores("Escribe tu nombre para continuar 🙂"); return; }
    D.buscarPorNombre(nombre, function (uid) {
      if (!uid) { mostrarSetup(nombre); return; }
      D.leerUsuario(uid, function (p) {
        if (!p) { mostrarSetup(nombre); return; }
        if (p.pin && p.pin.length) {
          pendienteUid = uid;
          IT.$("#login-pin-wrap").classList.remove("hidden");
          IT.$("#login-pin").value = "";
          setTimeout(function () { IT.$("#login-pin").focus(); }, 60);
        } else {
          entrarUid(uid);
        }
      });
    });
  }

  function crearPerfil() {
    var nombre = D.nombreBonito(IT.$("#setup-nombre").textContent);
    var pin = IT.$("#setup-pin").value.trim();
    D.crearPerfil({ name: nombre, emoji: emojiSel, color: colorSel, pin: pin }, function (uid, perfil) {
      D.guardarSesion(uid, perfil.name);
      D.setSesion({ uid: uid, name: perfil.name });
      D.entrarA(uid);
      IT.$("#login").classList.add("hidden");
      IT.$("#setup").classList.add("hidden");
      abrirModal("home");
      setTimeout(function () { IT.toast("¡Bienvenid@ " + perfil.name + "! 🎉"); }, 200);
    });
  }

  /* ---------- notificación de título ---------- */
  var tituloBase = document.title;
  IT.on("chat:notif", function () {
    if (document.hidden) {
      document.title = "💭 Nuevo mensaje…";
      setTimeout(function () { document.title = tituloBase; }, 4000);
    }
  });

  /* ---------- arranque ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    fondoCorazones();

    IT.$("#btn-continuar").addEventListener("click", function () {
      var s = D.leerSesion();
      if (s && s.uid) entrarUid(s.uid);
    });

    IT.$("#login-form").addEventListener("submit", enviarLogin);
    IT.$("#btn-desbloquear").addEventListener("click", desbloquear);
    IT.$("#login-pin").addEventListener("keydown", function (e) { if (e.key === "Enter") desbloquear(); });
    IT.$("#btn-crear-perfil").addEventListener("click", crearPerfil);

    IT.chat.preparar();
    IT.home.preparar();

    D.iniciar(function (ok) {
      if (!ok) { IT.toast("No pude conectar con el servidor 😢 Revisa tu internet.", true); }
      instruirLogin();
    });
  });
})();