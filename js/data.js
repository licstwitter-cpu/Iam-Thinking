/* ============ I'M THINKING — capa de datos (Firebase) ============ */
window.IT = window.IT || {};

IT.$ = function (s) { return document.querySelector(s); };
IT.$$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

IT.data = (function () {
  "use strict";

  var DB = null;
  var RAIZ = null;
  var listo = false;
  var listoP = null;
  var cacheUsers = {};
  var cacheIndex = {};
  var cacheChats = {};
  var miUid = null;
  var miPerfil = null;
  var sesion = null;

  IT.on = function (evt, fn) { (this._e = this._e || {})[evt] = (this._e[evt] || []).concat([fn]); };
  IT.emit = function (evt, dato) { (this._e && this._e[evt] || []).forEach(function (f) { try { f(dato); } catch (e) { console.error(e); } }); };

  function ref(ruta) { return RAIZ.child(ruta); }

  /* ---- utilidades generales ---- */
  function canon(nombre) { return (nombre || "").trim().replace(/\s+/g, " ").toLowerCase(); }
  function klave(c) { return String(c || "").replace(/[.#$[\]]/g, "_"); }
  function nombreBonito(nombre) { return (nombre || "").trim().replace(/\s+/g, " "); }
  function uidCorto(u) { return String(u || "").slice(-4); }
  function hora(ms) {
    try { return new Date(ms).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return ""; }
  }
  function hace(ms) {
    if (!ms) return "";
    var d = Date.now() - ms;
    var min = 60000, hor = 3600000, dia = 86400000;
    if (d < min) return "ahora";
    if (d < hor) return Math.floor(d / min) + "m";
    if (d < dia) return Math.floor(d / hor) + "h";
    if (d < dia * 7) return Math.floor(d / dia) + "d";
    try { return new Date(ms).toLocaleDateString("es-MX", { day: "numeric", month: "short" }); }
    catch (e) { return ""; }
  }
  function colorDe(u) {
    var pal = ["#E85D90", "#9A6FD8", "#5AA6E8", "#4BB87D", "#EFA63F", "#E0578B", "#7D8FE0"];
    var n = 0;
    String(u || "").split("").forEach(function (c) { n += c.charCodeAt(0); });
    return pal[n % pal.length];
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pushId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  /* ---- autenticación y arranque ---- */
  function iniciar(despues) {
    if (!listoP) {
      listoP = new Promise(function (res, rej) {
        if (!window.FIREBASE_CONFIG || !window.FIREBASE_CONFIG.apiKey) { rej(new Error("sin config")); return; }
        try { firebase.initializeApp(window.FIREBASE_CONFIG); } catch (e) {}
        DB = firebase.database();
        RAIZ = DB.ref("im");
        firebase.auth().signInAnonymously().then(res).catch(rej);
      });
      listoP.then(function () { listo = true; }, function () {});
    }
    if (despues) listoP.then(function () { despues(true); }, function () { despues(false); });
  }

  function cuandoListo(cb) {
    return listoP ? listoP.then(function () { cb(); }) : cb;
  }

  /* ---- perfil ---- */
  function buscarPorNombre(nombre, cb) {
    var c = canon(nombre);
    if (!c) return cb(null);
    var k = klave(c);
    cuandoListo(function () {
      if (cacheIndex[c] !== undefined) { cb(cacheIndex[c]); return; }
      ref("index/" + k).once("value").then(function (s) {
        cacheIndex[c] = s.val() || null;
        cb(cacheIndex[c]);
      });
    });
  }

  function leerUsuario(uid, cb) {
    cuandoListo(function () {
      if (cacheUsers[uid]) { cb(cacheUsers[uid]); return; }
      ref("users/" + uid).once("value").then(function (s) {
        var v = s.val();
        if (v) cacheUsers[uid] = v;
        cb(v || null);
      });
    });
  }

  function obtenerCache(uid) { return cacheUsers[uid] || null; }

  function observarUsuarios() {
    cuandoListo(function () {
      ref("users").on("child_added", function (s) { cacheUsers[s.key] = s.val(); IT.emit("dir:input", s.key); });
      ref("users").on("child_changed", function (s) { cacheUsers[s.key] = s.val(); IT.emit("dir:input", s.key); });
    });
  }

  function crearPerfil(datos, cb) {
    cuandoListo(function () {
      var uid = "u" + pushId();
      var perfil = {
        name: datos.name,
        nameLower: canon(datos.name),
        emoji: datos.emoji || "😊",
        color: datos.color || "#E85D90",
        bio: datos.bio || "",
        pin: datos.pin || "",
        created: Date.now()
      };
      ref("users/" + uid).set(perfil);
      ref("index/" + klave(perfil.nameLower)).set(uid);
      cacheUsers[uid] = perfil;
      cacheIndex[perfil.nameLower] = uid;
      if (cb) cb(uid, perfil);
    });
  }

  function guardarSesion(u, n) {
    sesion = { uid: u, name: n };
    localStorage.setItem("it-sesion", JSON.stringify(sesion));
  }
  function leerSesion() {
    try { return JSON.parse(localStorage.getItem("it-sesion") || "null"); }
    catch (e) { return null; }
  }
  function borrarSesion() { localStorage.removeItem("it-sesion"); sesion = null; }

  function entrarA(u, cb) {
    miUid = u;
    IT.emit("yo:listo", u);
    observarUsuarios();
    observarMisChats();
    if (cb) cb();
  }
  function miUidGet() { return miUid; }
  function sesionGet() { return sesion; }
  function setSesion(s) { sesion = s; }

  /* ---- chats index del usuario ---- */
  function observarMisChats() {
    cuandoListo(function () {
      if (!miUid) return;
      var r = ref("chats/" + miUid);
      r.on("child_added", function (s) { cacheChats[s.key] = s.val(); IT.emit("chats:lista", clonarChats()); });
      r.on("child_changed", function (s) { cacheChats[s.key] = s.val(); IT.emit("chats:lista", clonarChats()); });
      r.on("child_removed", function (s) { delete cacheChats[s.key]; IT.emit("chats:lista", clonarChats()); });
    });
  }
  function clonarChats() {
    var o = {};
    Object.keys(cacheChats).forEach(function (k) { o[k] = cacheChats[k]; });
    return o;
  }
  function dirCache() {
    var o = {};
    Object.keys(cacheUsers).forEach(function (k) { o[k] = cacheUsers[k]; });
    return o;
  }

  /* ---- mensajes ---- */
  function abrirMensajes(chatId, cb) { RAIZ.child("msg/" + chatId).on("child_added", cb); return RAIZ.child("msg/" + chatId); }
  function cerrarMensajes(chatId, cb) { RAIZ.child("msg/" + chatId).off("child_added", cb); }
  function enviarMensaje(chatId, msg, cb) { RAIZ.child("msg/" + chatId).push(msg).then(cb || function () {}); }

  function chatIdDM(a, b) { return "dm:" + [a, b].sort().join(":"); }

  /* ---- tipos de chat ---- */
  function leerMeta(chatId, cb) { ref("meta/" + chatId).once("value").then(function (s) { cb(s.val()); }); }
  function escribirMeta(chatId, meta) { ref("meta/" + chatId).set(meta); }
  function tocarChat(chatId, meta, ultimo, activo) {
    var partes = null;
    if (meta.type === "dm") partes = meta.users ? meta.users : (meta.members ? Object.keys(meta.members) : []);
    else if (meta.members) partes = Object.keys(meta.members);
    if (!partes) partes = [miUid];
    partes.forEach(function (u) {
      if (u === miUid) { IT.data.actualizarEntrada(u, chatId, meta, ultimo, 0); }
      else {
        ref("chats/" + u + "/" + chatId).transaction(function (entry) {
          entry = entry || {};
          entry.unread = (entry.unread || 0) + 1;
          entry.time = ultimo.tiempo || Date.now();
          entry.last = ultimo;
          return entry;
        });
      }
    });
  }

  function actualizarEntrada(u, chatId, meta, ultimo, unread) {
    var row = {};
    row.type = meta.type;
    row.time = ultimo.tiempo || Date.now();
    row.last = ultimo;
    row.unread = unread;
    if (meta.peerUid && u === miUid) row.peerUid = meta.peerUid;
    if (meta.name) row.name = meta.name;
    ref("chats/" + u + "/" + chatId).update(row);
  }

  return {
    iniciar: iniciar,
    ref: ref,
    canon: canon,
    nombreBonito: nombreBonito,
    uidCorto: uidCorto,
    hora: hora,
    hace: hace,
    colorDe: colorDe,
    esc: esc,
    pushId: pushId,
    buscarPorNombre: buscarPorNombre,
    leerUsuario: leerUsuario,
    obtenerCache: obtenerCache,
    observarUsuarios: observarUsuarios,
    crearPerfil: crearPerfil,
    guardarSesion: guardarSesion,
    leerSesion: leerSesion,
    borrarSesion: borrarSesion,
    entrarA: entrarA,
    miUidGet: miUidGet,
    sesionGet: sesionGet,
    setSesion: setSesion,
    observarMisChats: observarMisChats,
    clonarChats: clonarChats,
    dirCache: dirCache,
    abrirMensajes: abrirMensajes,
    cerrarMensajes: cerrarMensajes,
    enviarMensaje: enviarMensaje,
    chatIdDM: chatIdDM,
    leerMeta: leerMeta,
    escribirMeta: escribirMeta,
    tocarChat: tocarChat,
    actualizarEntrada: actualizarEntrada
  };
})();