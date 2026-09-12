/* ============ I'M THINKING — chat (mensajes y temas) ============ */
IT.chat = (function () {
  "use strict";

  var D = IT.data;
  var M = IT.media;

  var chatIdActivo = null;
  var metaActivo = null;
  var cbMensajes = null;
  var typingTimer = null;
  var adjuntoPendiente = null;
  var refRM = null;
  var rmActivo = {};

  var TEMAS = [
    { k: "claro", n: "Claro ☁️", m: "linear-gradient(135deg,#8CA0BC,#5F7BA6)" },
    { k: "lavanda", n: "Lavanda 💜", m: "linear-gradient(135deg,#B19AD4,#8A6FB4)" },
    { k: "cielo", n: "Cielo 💙", m: "linear-gradient(135deg,#8DBAE0,#5C96C2)" },
    { k: "menta", n: "Menta 🌿", m: "linear-gradient(135deg,#87C6A6,#56A87E)" },
    { k: "sol", n: "Sol ☀️", m: "linear-gradient(135deg,#E9C26E,#D2A848)" },
    { k: "noche", n: "Noche 🌙", m: "linear-gradient(135deg,#798CAE,#5A6E94)" },
    { k: "rosa", n: "Rosa 🌸", m: "linear-gradient(135deg,#D79BB0,#B97D92)" }
  ];

  var refsUI = {
    tema: IT.$("#chat-view-tema"), titulo: IT.$("#chat-titulo"), estado: IT.$("#chat-estado"),
    avatar: IT.$("#chat-avatar"), mensajes: IT.$("#mensajes"), input: IT.$("#input-texto"),
    btnEnviar: IT.$("#btn-enviar"), btnEmoji: IT.$("#btn-emoji"), btnStickers: IT.$("#btn-stickers"),
    btnFoto: IT.$("#btn-foto"), btnVideo: IT.$("#btn-video"), btnAudio: IT.$("#btn-audio"),
    inputFoto: IT.$("#input-foto"), inputVideo: IT.$("#input-video"),
    panelEmoji: IT.$("#panel-emoji"), panelStickers: IT.$("#panel-stickers"), gridStickers: IT.$("#grid-stickers"),
    adjuntos: IT.$("#adjuntos"), adjuntoNombre: IT.$("#adjunto-nombre"),
    btnEnviarAdjunto: IT.$("#btn-enviar-adjunto"), adjuntoX: IT.$("#adjunto-x"),
    audioRec: IT.$("#audio-rec-box"), audioRecTiempo: IT.$("#audio-rec-tiempo"),
    btnVaciar: IT.$("#btn-vaciar")
  };

  var barra = null;

  function miUid() { return D.miUidGet(); }

  /* ---------- abrir / cerrar ---------- */
  function abrir(chatId, meta) {
    if (chatIdActivo && chatId !== chatIdActivo) cerrar();
    chatIdActivo = chatId;
    metaActivo = meta;
    IT.emit("chat:abierto", { chatId: chatId, meta: meta });

    if (meta.type === "group") {
      refsUI.titulo.textContent = meta.name || "Grupo";
      refsUI.avatar.textContent = "👥";
    } else {
      var peer = otrouid(meta);
      if (peer) {
        D.leerUsuario(peer, function (p) {
          if (p) { refsUI.titulo.textContent = p.name; D.pintarAvatar(refsUI.avatar, p); }
        });
      }
    }
    refsUI.estado.textContent = meta.type === "group" ? (meta.members ? Object.keys(meta.members).length + " miembros · " : "") + "En línea 💬" : "En línea 💬";

    D.ref("chats/" + miUid() + "/" + chatId + "/theme").once("value").then(function (s) {
      aplicarTema(s.val() || "rosa");
    });

    barra = document.createElement("div");
    barra.className = "barra-mensajes";
    refsUI.mensajes.innerHTML = "";
    refsUI.mensajes.appendChild(barra);

    var vacio = document.createElement("div");
    vacio.className = "vacio-chat";
    vacio.innerHTML = "<span class='v-emoji'>💬</span>Comienza la conversación";
    barra.appendChild(vacio);

    D.ref("chats/" + miUid() + "/" + chatId).update({ unread: 0 });

    cbMensajes = function (s) { recibido(chatId, s.key, s.val()); };
    D.abrirMensajes(chatId, cbMensajes);
    rmActivo = {};
    refRM = D.observarBorrados(chatId, function (map) { rmActivo = map || {}; aplicarBorrados(); });
    abajo();
  }

  function cerrar() {
    if (chatIdActivo && cbMensajes) D.cerrarMensajes(chatIdActivo, cbMensajes);
    if (refRM) { D.cerrarBorrados(refRM); refRM = null; }
    rmActivo = {};
    if (typingTimer) { clearTimeout(typingTimer); typingTimer = null; quitarEscribiendo(); }
    adjuntoPendiente = null; ocultarAdjuntos();
    chatIdActivo = null; metaActivo = null; cbMensajes = null; barra = null;
    refsUI.msg = undefined;
  }

  function activoId() { return chatIdActivo; }

  function otrouid(meta) {
    if (meta.type !== "dm") return null;
    var otros = (meta.users || []).filter(function (u) { return u !== miUid(); });
    return otros[0] || null;
  }

  /* ---------- recibir y dibujar ---------- */
  function recibido(chatId, key, m) {
    if (!m || !m.uid) return;
    if (borradoParaMi(key, m)) return;
    if (barra && barra.querySelector('[data-k="' + key + '"]')) return;
    if (barra) {
      var v = barra.querySelector(".vacio-chat"); if (v) v.remove();
      barra.appendChild(crearNodo(key, m));
    }
    if (m.uid !== miUid()) {
      M.sonidoRecibir();
      if (chatId === chatIdActivo) {
        if (!document.hidden) { IT.emit("leido:activo", chatId); }
        D.ref("chats/" + miUid() + "/" + chatId).update({ unread: 0 });
      } else if (!document.hidden) {
        IT.emit("chat:notif", { chatId: chatId, m: m });
      }
    }
    abajo();
  }

  function crearNodo(key, m) {
    var mia = m.uid === miUid();
    var nodo = document.createElement("div");
    nodo.dataset.k = key;
    nodo.dataset.t = m.tiempo || 0;
    nodo.className = "burbuja " + (mia ? "mia" : "suya");

    if (m.type === "emoji") {
      nodo.classList.add("emoji-mensaje");
      var eTxt = document.createElement("div");
      eTxt.className = "burbuja-texto";
      eTxt.textContent = m.text || "😊";
      nodo.appendChild(eTxt);
    } else if (m.type === "sticker") {
      nodo.classList.add("sticker-mensaje");
      nodo.innerHTML = autoRee(m) + etiquetaReenviado(m) + D.esc(m.emoji || "😊");
    } else if (m.type === "image") {
      if (!mia) nodo.innerHTML = autoRee(m);
      nodo.insertAdjacentHTML("beforeend", etiquetaReenviado(m));
      var img = document.createElement("img");
      img.className = "burbuja-img";
      img.src = M.urlDeBase64(m.data);
      img.alt = "foto";
      img.addEventListener("click", function () {
        var lb = IT.$("#lightbox"), li = IT.$("#lightbox-img");
        li.src = img.src; lb.classList.remove("hidden");
      });
      nodo.appendChild(img);
    } else if (m.type === "video") {
      if (!mia) nodo.innerHTML = autoRee(m);
      nodo.insertAdjacentHTML("beforeend", etiquetaReenviado(m));
      var vid = document.createElement("video");
      vid.className = "burbuja-video";
      vid.controls = true;
      vid.preload = "metadata";
      vid.src = M.urlDeBase64(m.data);
      nodo.appendChild(vid);
    } else if (m.type === "audio") {
      if (!mia) nodo.innerHTML = autoRee(m);
      nodo.insertAdjacentHTML("beforeend", etiquetaReenviado(m));
      var aud = document.createElement("audio");
      aud.className = "burbuja-audio";
      aud.controls = true;
      aud.preload = "metadata";
      aud.src = M.urlDeBase64(m.data);
      nodo.appendChild(aud);
    } else {
      nodo.innerHTML = autoRee(m);
      var t = document.createElement("div");
      t.className = "burbuja-texto";
      t.innerHTML = etiquetaReenviado(m) + linkificar(m.text || "");
      nodo.appendChild(t);
    }

    var h = document.createElement("time");
    h.className = "burbuja-hora";
    h.dateTime = new Date(m.tiempo || Date.now()).toISOString();
    h.textContent = D.hora(m.tiempo || Date.now());
    nodo.appendChild(h);
    nodo.appendChild(acciones(key, m));
    return nodo;
  }

  function autoRee(m) {
    if (metaActivo && metaActivo.type === "group" && m.uid !== miUid()) {
      var p = D.obtenerCache(m.uid);
      return "<span class='autor-mini' style='color:" + D.esc((p && p.color) || "#888") + "'>" + D.esc(p ? p.name : "…") + "</span>";
    }
    return "";
  }

  function etiquetaReenviado(m) {
    return m.reenviadoDe ? "<span class='reenviado'>" + D.esc(m.reenviadoDe) + "</span>" : "";
  }

  function acciones(key, m) {
    var wrap = document.createElement("span");
    wrap.className = "acciones";
    if (m.uid === miUid()) {
      var bDel = document.createElement("button");
      bDel.type = "button";
      bDel.className = "del";
      bDel.title = "Borrar (solo para ti)";
      bDel.textContent = "🗑";
      bDel.addEventListener("click", function (e) {
        e.stopPropagation();
        if (!confirm("¿Borrar este mensaje solo para ti? Los demás lo seguirán viendo.")) return;
        D.borrarMensaje(chatIdActivo, key);
        var n = barra && barra.querySelector('[data-k="' + key + '"]');
        if (n) n.remove();
        contarVacio();
      });
      wrap.appendChild(bDel);
    }
    var bFw = document.createElement("button");
    bFw.type = "button";
    bFw.title = "Reenviar a otro chat";
    bFw.textContent = "📤";
    bFw.addEventListener("click", function (e) {
      e.stopPropagation();
      abrirReenviar(key, m);
    });
    wrap.appendChild(bFw);
    return wrap;
  }

  function contarVacio() {
    if (!barra || barra.querySelector("[data-k]")) return;
    if (!barra.querySelector(".vacio-chat")) {
      var v = document.createElement("div");
      v.className = "vacio-chat";
      v.innerHTML = "<span class='v-emoji'>💬</span>Comienza la conversación";
      barra.appendChild(v);
    }
  }

  /* ---------- links ---------- */
  function linkificar(t) {
    var s = String(t || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
    s = s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    s = s.replace(/(^|\s)(www\.[^\s<]+)/g, '$1<a href="https://$2" target="_blank" rel="noopener noreferrer">$2</a>');
    return s;
  }

  /* ---------- borrado para mí ---------- */
  function borradoParaMi(key, m) {
    var me = rmActivo[miUid()] || {};
    if (me.__all && (m.tiempo || 0) <= +me.__all) return true;
    if (me[key]) return true;
    return false;
  }
  function aplicarBorrados() {
    if (!barra) return;
    barra.querySelectorAll("[data-k]").forEach(function (n) {
      var k = n.getAttribute("data-k");
      var me = rmActivo[miUid()] || {};
      if (me.__all && +n.dataset.t <= +me.__all) n.remove();
      else if (me[k]) n.remove();
    });
    contarVacio();
  }

  function abajo() {
    var el = refsUI.mensajes;
    var cerca = el.scrollHeight - el.scrollTop - el.clientHeight < 180;
    if (cerca) el.scrollTop = el.scrollHeight;
  }

  /* ---------- enviar ---------- */
  function enviarTexto() {
    var txt = refsUI.input.value.trim();
    if (!txt) return;
    if (txt.length > 1 && /^[\p{Extended_Pictographic}]+$/u.test(txt.trim())) {
      enviar(txt.length <= 6 ? { type: "emoji", text: txt } : { type: "text", text: txt });
    } else {
      enviar({ type: "text", text: txt });
    }
    refsUI.input.value = "";
    refsUI.input.focus();
  }

  function enviarAdjunto() {
    if (!adjuntoPendiente) return;
    enviar(adjuntoPendiente);
    adjuntoPendiente = null;
    ocultarAdjuntos();
  }

  function enviar(m) {
    if (!chatIdActivo || !metaActivo) return;
    enviarA(chatIdActivo, metaActivo, m);
  }

  function enviarA(destinoId, destinoMeta, m) {
    if (!destinoId || !destinoMeta) return;
    m.uid = miUid();
    m.tiempo = Date.now();
    M.asegurarAudio();
    D.enviarMensaje(destinoId, m, function () {
      D.tocarChat(destinoId, destinoMeta, { tipo: m.type, texto: previo(m), tiempo: m.tiempo }, true);
      if (typingTimer) { clearTimeout(typingTimer); quitarEscribiendo(); }
    });
    M.sonidoEnviar();
  }

  function previo(m) {
    if (m.type === "sticker") return "Sticker";
    if (m.type === "emoji") return m.text;
    if (m.type === "image") return "📷 Foto";
    if (m.type === "video") return "🎬 Video";
    if (m.type === "audio") return "🎙️ Audio";
    return m.text;
  }

  /* ---------- escribiendo ---------- */
  function marcarEscribiendo() {
    if (!chatIdActivo) return;
    clearTimeout(typingTimer);
    D.ref("typing/" + chatIdActivo + "/" + miUid()).set(Date.now());
    typingTimer = setTimeout(function () { quitarEscribiendo(); }, 1600);
  }
  function quitarEscribiendo() {
    if (!chatIdActivo) return;
    D.ref("typing/" + chatIdActivo + "/" + miUid()).remove();
  }
  function observarEscribiendo() {
    if (!chatIdActivo) return;
    D.ref("typing/" + chatIdActivo).on("value", function (s) {
      var v = s.val();
      var quien = null;
      if (v) Object.keys(v).forEach(function (u) { if (u !== miUid() && v[u]) quien = u; });
      if (quien) {
        D.leerUsuario(quien, function (p) {
          refsUI.estado.textContent = (p ? p.name : "Alguien") + " está escribiendo";
          if (!IT.$(".escribiendo")) {
            var e = document.createElement("div");
            e.className = "escribiendo";
            e.innerHTML = "<i></i><i></i><i></i>";
            e.dataset.escrib = "1";
            if (barra) { barra.querySelector(".vacio-chat") && barra.querySelector(".vacio-chat").remove(); barra.appendChild(e); }
          }
        });
      } else {
        refsUI.estado.textContent = metaActivo && metaActivo.type === "group" ? "En línea 💬" : "En línea 💬";
        var e = barra && barra.querySelector(".escribiendo");
        if (e) e.remove();
      }
    });
  }

  /* ---------- temas ---------- */
  function aplicarTema(k) {
    if (!TEMAS.some(function (t) { return t.k === k; })) k = "claro";
    refsUI.tema.dataset.tema = k;
  }
  function temaActual() { return (refsUI.tema.dataset.tema || "claro"); }
  function guardarTema(k) {
    if (!chatIdActivo) return;
    aplicarTema(k);
    D.ref("chats/" + miUid() + "/" + chatIdActivo + "/theme").set(k);
  }

  function rellenarTemas() {
    var cont = IT.$("#lista-temas");
    cont.innerHTML = "";
    TEMAS.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tema-opcion" + (t.k === temaActual() ? " sel" : "");
      b.dataset.k = t.k;
      b.innerHTML = "<div class='tema-muestra' style='background:" + t.m + "'>💬</div><div class='tema-nombre'>" + t.n + "</div>";
      b.addEventListener("click", function () {
        guardarTema(t.k);
        IT.$$(".tema-opcion").forEach(function (x) { x.classList.remove("sel"); });
        b.classList.add("sel");
        cerrarModal("modal-tema");
      });
      cont.appendChild(b);
    });
  }

  /* ---------- paneles ---------- */
  function alternarPanel(sel) {
    var targets = { emoji: refsUI.panelEmoji, stickers: refsUI.panelStickers };
    Object.keys(targets).forEach(function (k) {
      var on = (k === sel) && targets[k].classList.contains("hidden");
      targets[k].classList.toggle("hidden", !on);
    });
    M.asegurarAudio();
  }

  function mostrarAdjuntos(nombre) {
    refsUI.adjuntoNombre.textContent = nombre;
    refsUI.adjuntos.classList.add("on");
  }
  function ocultarAdjuntos() {
    refsUI.adjuntos.classList.remove("on");
  }

  /* ---------- grabación de voz ---------- */
  var grabando = false;
  function alternarAudio() {
    if (grabando) {
      M.recParar(function (blob) {
        grabando = false;
        refsUI.audioRec.classList.add("hidden");
        if (blob) {
          M.audioAUrl(blob, function (a) {
            adjuntoPendiente = { type: "audio", data: a.data, mime: a.mime, size: a.size };
            mostrarAdjuntos("Nota de voz 🎙️");
          });
        } else if (M.recError) { IT.toast(M.recError, true); }
      });
    } else {
      grabando = true;
      M.recIniciar(function (s) {
        refsUI.audioRec.classList.remove("hidden");
        refsUI.audioRecTiempo.textContent = s + "s";
      }, function (e) { IT.toast(e, true); grabando = false; });
    }
  }

  /* ---------- preparar (paneles y eventos) ---------- */
  function preparar() {
    refsUI.panelEmoji.innerHTML = "";
    M.emojis.forEach(function (e) {
      var b = document.createElement("button");
      b.textContent = e;
      b.addEventListener("click", function () { enviar({ type: "emoji", text: e }); alternarPanel(null); });
      refsUI.panelEmoji.appendChild(b);
    });
    refsUI.gridStickers.innerHTML = "";
    M.stickers.forEach(function (e) {
      var b = document.createElement("button");
      b.textContent = e;
      b.addEventListener("click", function () { enviar({ type: "sticker", emoji: e }); alternarPanel(null); });
      refsUI.gridStickers.appendChild(b);
    });

    refsUI.btnEmoji.addEventListener("click", function () { alternarPanel("emoji"); });
    refsUI.btnStickers.addEventListener("click", function () { alternarPanel("stickers"); });
    refsUI.btnEnviar.addEventListener("click", enviarTexto);
    refsUI.input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarTexto(); } });
    refsUI.input.addEventListener("input", marcarEscribiendo);

    refsUI.btnFoto.addEventListener("click", function () { refsUI.inputFoto.click(); });
    refsUI.btnVideo.addEventListener("click", function () { refsUI.inputVideo.click(); });
    refsUI.btnAudio.addEventListener("click", alternarAudio);

    refsUI.inputFoto.addEventListener("change", function () {
      var f = refsUI.inputFoto.files[0];
      refsUI.inputFoto.value = "";
      if (!f) return;
      M.archivoAUrl(f, 1400, .85, function (img) {
        adjuntoPendiente = { type: "image", data: img.data, mime: img.mime, size: img.size };
        mostrarAdjuntos(f.name + " 📷");
      }, function (e) { IT.toast(e, true); });
    });

    refsUI.inputVideo.addEventListener("change", function () {
      var f = refsUI.inputVideo.files[0];
      refsUI.inputVideo.value = "";
      if (!f) return;
      M.videoAUrl(f, function (vid) {
        adjuntoPendiente = { type: "video", data: vid.data, mime: vid.mime, size: vid.size };
        mostrarAdjuntos(f.name + " 🎬");
      }, function (e) { IT.toast(e, true); });
    });

    refsUI.btnEnviarAdjunto.addEventListener("click", enviarAdjunto);
    refsUI.adjuntoX.addEventListener("click", function () { adjuntoPendiente = null; ocultarAdjuntos(); });

    refsUI.panelEmoji.addEventListener("click", function (e) { if (e.target === refsUI.panelEmoji) alternarPanel(null); });

    refsUI.btnVaciar.addEventListener("click", function () {
      if (!chatIdActivo) return;
      if (!confirm("¿Vaciar este chat? Dejarás de ver el historial (solo para ti). Los demás lo seguirán viendo.")) return;
      D.vaciarChat(chatIdActivo);
      var me = rmActivo[miUid()] = rmActivo[miUid()] || {};
      me.__all = Date.now();
      aplicarBorrados();
      IT.toast("Chat vaciado 🧹");
    });

    document.addEventListener("click", function (e) {
      if (!refsUI.panelEmoji.classList.contains("hidden") &&
          !refsUI.panelEmoji.contains(e.target) && e.target !== refsUI.btnEmoji) { refsUI.panelEmoji.classList.add("hidden"); }
      if (!refsUI.panelStickers.classList.contains("hidden") &&
          !refsUI.panelStickers.contains(e.target) && e.target !== refsUI.btnStickers) { refsUI.panelStickers.classList.add("hidden"); }
    });
  }

  function limpiarVista() {
    refsUI.mensajes.innerHTML = "";
    barra = null;
  }

  /* ---------- reenviar a otro chat ---------- */
  function autorDe(m) {
    if (m.uid === miUid()) {
      var a = IT.$("#mi-nombre");
      return a ? a.textContent : "tú";
    }
    var p = D.obtenerCache(m.uid);
    return p ? p.name : (metaActivo && metaActivo.type !== "group" ? metaActivo.peerName : "…");
  }

  function abrirReenviar(key, m) {
    if (!chatIdActivo) return;
    var chats = D.clonarChats();
    var ids = Object.keys(chats).filter(function (id) { return id !== chatIdActivo; })
      .sort(function (a, b) { return (chats[b].time || 0) - (chats[a].time || 0); });
    var cont = IT.$("#reenviar-lista");
    cont.innerHTML = "";
    if (!ids.length) {
      var v = document.createElement("div");
      v.className = "vacio-lista";
      v.innerHTML = "<span class='v-emoji'>📤</span><p>No tienes otros chats para reenviar.</p>";
      cont.appendChild(v);
    } else {
      ids.forEach(function (id) {
        var c = chats[id];
        var ficha = document.createElement("button");
        ficha.type = "button";
        ficha.className = "chat-ficha";
        ficha.dataset.id = id;
        var av = document.createElement("span");
        av.className = "avatar avatar-dinamico";
        var info = document.createElement("span");
        info.className = "chat-ficha-info";
        var nombre = document.createElement("span");
        nombre.className = "chat-ficha-nombre";
        if (c.type === "group") {
          av.textContent = "👥"; av.style.background = "#9A6FD8";
          nombre.textContent = c.name || "Grupo";
        } else if (c.peerUid && D.obtenerCache(c.peerUid)) {
          var p = D.obtenerCache(c.peerUid);
          nombre.textContent = p.name;
          D.pintarAvatar(av, p);
        } else {
          nombre.textContent = c.peerName || "…";
          av.textContent = "🙂"; av.style.background = "#B48FC0";
        }
        info.appendChild(nombre);
        ficha.appendChild(av); ficha.appendChild(info);
        ficha.addEventListener("click", function () {
          D.leerMeta(id, function (met) {
            if (met) {
              var copia = { type: m.type };
              if (m.type === "sticker") { copia.emoji = m.emoji || "😊"; }
              else if (m.type === "emoji") { copia.text = m.text || "😊"; }
              else if ("data" in m) { copia.data = m.data; copia.mime = m.mime; copia.size = m.size; }
              else { copia.text = m.text || ""; }
              copia.reenviadoDe = autorDe(m);
              enviarA(id, met, copia);
              cerrarReenviarModal();
              IT.toast("Reenviado ✨");
            } else IT.toast("No pude abrir ese chat 😅", true);
          });
        });
        cont.appendChild(ficha);
      });
    }
    IT.$("#modal-reenviar").classList.remove("hidden");
  }

  function cerrarReenviarModal() { IT.$("#modal-reenviar").classList.add("hidden"); }

  return {
    TEMAS: TEMAS, preparar: preparar, abrir: abrir, cerrar: cerrar,
    activoId: activoId, aplicarTema: aplicarTema, guardarTema: guardarTema,
    rellenarTemas: rellenarTemas, temaActual: temaActual, limpiarVista: limpiarVista,
    marcarEscribiendo: marcarEscribiendo, observarEscribiendo: observarEscribiendo,
    abrirReenviar: abrirReenviar
  };
})();