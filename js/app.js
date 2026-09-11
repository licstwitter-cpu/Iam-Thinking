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

  /* ---------- fondo de burbujas ---------- */
  function fondoBurbujas() {
    var f = IT.$("#fondo");
    if (!f) return;
    var colores = ["rgba(124,141,166,.30)", "rgba(95,123,166,.22)", "rgba(160,175,195,.28)", "rgba(106,165,160,.18)", "rgba(224,190,150,.22)"];
    var html = "";
    for (var i = 0; i < 12; i++) {
      var izq = (Math.random() * 100).toFixed(1);
      var tam = (70 + Math.random() * 140).toFixed(0);
      var dur = (10 + Math.random() * 14).toFixed(1);
      var ret = (Math.random() * -22).toFixed(1);
      var va = ((Math.random() * 60) - 30).toFixed(0);
      var op = (0.16 + Math.random() * 0.2).toFixed(2);
      html += "<span class='burbuja-fondo' style='left:" + izq + "%;width:" + tam + "px;height:" + tam + "px;background:" + colores[i % colores.length] +
        ";animation-duration:" + dur + "s;animation-delay:" + ret + "s;--va:" + va + "px;--op:" + op + "'></span>";
    }
    f.innerHTML = html;
  }

  /* ---------- login ---------- */
  var EMOJIS_PERFIL = ["😊", "🥰", "😎", "🔥", "🌙", "🌟", "🎉", "🐱", "🐶", "🌸", "🍀", "🌈"];
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
    IT.$("#setup-clave").value = "";
    rellenarFila(IT.$("#setup-emoji"), "emoji", emojiSel);
    rellenarFila(IT.$("#setup-color"), "color", colorSel);
    IT.$("#setup").classList.remove("hidden");
    IT.$("#login").classList.add("hidden");
  }

  function desbloquear() {
    var clave = IT.$("#login-clave").value;
    if (!pendienteUid) { instruirLogin(); return; }
    if (!clave) { errores("Escribe la contraseña 🔒"); return; }
    D.leerUsuario(pendienteUid, function (p) {
      if (!p) { errores("Ese perfil ya no existe 😕"); return; }
      if (!p.clave) { errores("Ese perfil no tiene contraseña 🙈"); return; }
      D.claveValida(clave, p.clave).then(function (ok) {
        if (ok) {
          IT.$("#login-clave-wrap").classList.add("hidden");
          IT.$("#login-clave").value = "";
          entrarUid(pendienteUid);
        } else {
          errores("Contraseña incorrecta 🔒");
        }
      });
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
        pendienteUid = uid;
        IT.$("#login-clave-wrap").classList.remove("hidden");
        IT.$("#login-clave").value = "";
        setTimeout(function () { IT.$("#login-clave").focus(); }, 60);
      });
    });
  }

  function crearPerfil() {
    var nombre = D.nombreBonito(IT.$("#setup-nombre").textContent);
    var clave = IT.$("#setup-clave").value;
    if (clave.length < 4) { errores("Crea una contraseña (mínimo 4 caracteres) 🔒"); return; }
    D.crearPerfil({ name: nombre, emoji: emojiSel, color: colorSel, clave: clave }, function (uid, perfil) {
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
    fondoBurbujas();

    IT.$("#btn-continuar").addEventListener("click", function () {
      var s = D.leerSesion();
      if (s && s.uid) entrarUid(s.uid);
    });

    IT.$("#login-form").addEventListener("submit", enviarLogin);
    IT.$("#btn-desbloquear").addEventListener("click", desbloquear);
    IT.$("#login-clave").addEventListener("keydown", function (e) { if (e.key === "Enter") desbloquear(); });
    IT.$("#btn-crear-perfil").addEventListener("click", crearPerfil);

    IT.chat.preparar();
    IT.home.preparar();

    D.iniciar(function (ok) {
      if (!ok) { IT.toast("No pude conectar con el servidor 😢 Revisa tu internet.", true); }
      instruirLogin();
    });
  });
})();