/* ============ I'M THINKING — home (lista, búsqueda, grupos, perfil) ============ */
IT.home = (function () {
  "use strict";

  var D = IT.data;

  var refs = {
    lista: IT.$("#lista-chats"), homeSub: IT.$("#home-sub"),
    miAvatar: IT.$("#mi-avatar"), miNombre: IT.$("#mi-nombre"),
    btnBuscar: IT.$("#btn-buscar"), btnNuevoGrupo: IT.$("#btn-nuevo-grupo"),
    btnPerfil: IT.$("#btn-perfil"), btnSalir: IT.$("#btn-salir"),
    btnVolver: IT.$("#btn-volver"), btnTema: IT.$("#btn-tema"),
    buscarInput: IT.$("#buscar-input"), buscarResultados: IT.$("#buscar-resultados"),
    grupoNombre: IT.$("#grupo-nombre"), grupoBuscar: IT.$("#grupo-buscar"),
    grupoResultados: IT.$("#grupo-resultados"), grupoMiembros: IT.$("#grupo-miembros"),
    btnCrearGrupo: IT.$("#btn-crear-grupo"),
    perfilAvatar: IT.$("#perfil-avatar"), perfilNombreV: IT.$("#perfil-nombre-v"),
    perfilNombre: IT.$("#perfil-nombre"), perfilEmoji: IT.$("#perfil-emoji"),
    perfilColor: IT.$("#perfil-color"), perfilBio: IT.$("#perfil-bio"), perfilClave: IT.$("#perfil-clave"),
    btnGuardarPerfil: IT.$("#btn-guardar-perfil")
  };

  var EMOJIS_PERFIL = ["😊", "🥰", "😎", "🔥", "🌙", "🌟", "🎉", "🐱", "🐶", "🌸", "🍀", "🌈"];
  var COLORES = ["#E85D90", "#9A6FD8", "#5AA6E8", "#4BB87D", "#EFA63F", "#E0578B", "#7D8FE0", "#B33951"];
  var emojiSel = "😊";
  var colorSel = "#E85D90";
  var miembrosGrupo = {};

  function miUid() { return D.miUidGet(); }
  function dir() { return D.dirCache(); }

  /* ---------- lista de chats ---------- */
  function renderLista() {
    var chats = D.clonarChats();
    var ids = Object.keys(chats).sort(function (a, b) {
      return (chats[b].time || 0) - (chats[a].time || 0);
    });
    var cont = refs.lista;
    cont.innerHTML = "";

    if (!ids.length) {
      var v = document.createElement("div");
      v.className = "vacio-lista";
      v.innerHTML = "<span class='v-emoji'>💬</span><p>Todavía no tienes conversaciones.</p><div style='opacity:.8'>Presiona <b>🔍</b> para buscar a tus personas favoritas ✨</div>";
      cont.appendChild(v);
      return;
    }

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
      var ultimo = document.createElement("span");
      ultimo.className = "chat-ficha-ultimo";
      ultimo.textContent = previewDe(c);

      var meta = document.createElement("span");
      meta.className = "chat-ficha-time";
      var hs = document.createElement("span");
      hs.textContent = D.hace(c.time) || "";

      if (c.type === "group") {
        av.textContent = "👥"; av.style.background = "#9A6FD8";
        nombre.textContent = c.name || "Grupo";
        var tg = document.createElement("small");
        tg.className = "etiqueta-grupo";
        tg.textContent = "Grupo";
        nombre.appendChild(tg);
      } else if (c.peerUid && D.obtenerCache(c.peerUid)) {
        var p = D.obtenerCache(c.peerUid);
        nombre.textContent = p.name;
        av.textContent = p.emoji || "🙂";
        av.style.background = p.color || D.colorDe(c.peerUid);
      } else if (c.peerUid) {
        nombre.textContent = c.peerName || "…";
        av.textContent = "🙂";
        av.style.background = "#B48FC0";
        D.leerUsuario(c.peerUid, function (pp) { if (pp) { nombre.textContent = pp.name; av.textContent = pp.emoji || "🙂"; av.style.background = pp.color || D.colorDe(c.peerUid); } });
      }

      meta.appendChild(hs);
      if (c.unread) {
        var bd = document.createElement("span");
        bd.className = "badge";
        bd.textContent = c.unread;
        meta.appendChild(bd);
      }

      info.appendChild(nombre); info.appendChild(ultimo);
      ficha.appendChild(av); ficha.appendChild(info); ficha.appendChild(meta);

      ficha.addEventListener("click", function () {
        D.leerMeta(id, function (m) {
          if (m) abrirChat(id, m);
          else IT.toast("No pude abrir esa conversación 😅", true);
        });
      });
      cont.appendChild(ficha);
    });
  }

  function previewDe(c) {
    var l = c.last;
    if (!l || !l.tipo) return "Habla con tus personas 💬";
    if (l.tipo === "emoji") return l.texto || "😊";
    if (l.tipo === "sticker") return "Sticker";
    if (l.tipo === "image") return "📷 Foto";
    if (l.tipo === "video") return "🎬 Video";
    if (l.tipo === "audio") return "🎙️ Audio";
    return l.texto || "";
  }

  /* ---------- abrir un chat ---------- */
  function abrirChat(id, meta) {
    abrirModal("chat-view");
    cerrarModal("home");
    IT.chat.abrir(id, meta);
    IT.chat.observarEscribiendo();
  }

  function abrirOcrear(peer) {
    var id = D.chatIdDM(miUid(), peer);
    D.leerMeta(id, function (m) {
      if (!m) {
        var meta = { type: "dm", users: [miUid(), peer] };
        D.escribirMeta(id, meta);
        var l = { texto: "Iniciaron conversación ✨", tiempo: Date.now() };
        [miUid(), peer].forEach(function (u) {
          D.actualizarEntrada(u, id, meta, l, u === miUid() ? 0 : 1);
          D.ref("chats/" + u + "/" + id + "/peerUid").set(u === miUid() ? peer : miUid());
        });
        cerrarModal("modal-buscar");
        abrirChat(id, meta);
      } else {
        cerrarModal("modal-buscar");
        abrirChat(id, m);
      }
    });
  }

  function volver() {
    IT.chat.cerrar();
    abrirModal("home");
    cerrarModal("chat-view");
  }

  /* ---------- búsqueda ---------- */
  function filtrar(q) {
    var term = D.canon(q);
    var cont = refs.buscarResultados;
    cont.innerHTML = "";
    if (!term) { return; }
    var keys = Object.keys(dir()).filter(function (u) {
      return u !== miUid();
    });
    var matches = keys.filter(function (u) {
      var p = D.obtenerCache(u);
      return p && (p.nameLower || "").indexOf(term) !== -1;
    }).slice(0, 8);

    if (!matches.length) {
      var v = document.createElement("button");
      v.type = "button";
      v.className = "resultado";
      v.style.justifyContent = "center";
      v.textContent = "No encontré a nadie con ese nombre 😕";
      v.disabled = true;
      cont.appendChild(v);
      return;
    }

    matches.forEach(function (u) {
      var p = D.obtenerCache(u);
      cont.appendChild(resultadoFila(p, u, "Mensaje", function () { abrirOcrear(u); }));
    });
  }

  function resultadoFila(p, u, chipTxt, accion) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "resultado";
    var av = document.createElement("span");
    av.className = "avatar avatar-dinamico";
    av.textContent = p.emoji || "🙂";
    av.style.background = p.color || D.colorDe(u);
    var inf = document.createElement("span");
    inf.className = "resultado-info";
    inf.innerHTML = "<strong>" + D.esc(p.name) + "</strong><small>" + D.esc(p.bio || "En línea 💬") + "</small>";
    var chip = document.createElement("span");
    chip.className = "resultado-chip";
    chip.textContent = chipTxt;
    b.appendChild(av); b.appendChild(inf);
    if (chipTxt) b.appendChild(chip);
    b.addEventListener("click", accion);
    return b;
  }

  /* ---------- grupos ---------- */
  function rellenarGrupo(q) {
    var term = D.canon(q);
    var cont = refs.grupoResultados;
    cont.innerHTML = "";
    var keys = Object.keys(dir()).filter(function (u) {
      return u !== miUid();
    });
    var lista = Object.keys(dir()).filter(function (u) { return u !== miUid(); })
      .map(function (u) { return { u: u, p: D.obtenerCache(u) }; })
      .filter(function (o) { return o.p && (!term || (o.p.nameLower || "").indexOf(term) !== -1); })
      .sort(function (a, b) { return (a.p.nameLower < b.p.nameLower) ? -1 : (a.p.nameLower > b.p.nameLower) ? 1 : 0; })
      .slice(0, 10)
      .map(function (o) { return o.u; });

    if (!lista.length) {
      var v = document.createElement("button");
      v.type = "button"; v.className = "resultado"; v.disabled = true;
      v.style.justifyContent = "center";
      v.textContent = "Nadie con ese nombre por ahora 🤷";
      cont.appendChild(v);
      return;
    }

    lista.forEach(function (u) {
      var p = D.obtenerCache(u);
      var ya = !!miembrosGrupo[u];
      var b = resultadoFila(p, u, ya ? "Quitar" : "Agregar", function () {
        if (ya) delete miembrosGrupo[u];
        else miembrosGrupo[u] = p;
        rellenarGrupo(refs.grupoBuscar.value);
        pintarMiembros();
      });
      if (ya) b.style.borderColor = "#4BB87D";
      cont.appendChild(b);
    });
  }

  function pintarMiembros() {
    var c = refs.grupoMiembros;
    c.innerHTML = "";
    Object.keys(miembrosGrupo).forEach(function (u) {
      var p = miembrosGrupo[u];
      var chip = document.createElement("span");
      chip.className = "miembro-sel";
      chip.innerHTML = (p.emoji || "🙂") + " " + D.esc(p.name) +
        " <button type='button' title='Quitar'>&times;</button>";
      chip.querySelector("button").addEventListener("click", function () {
        delete miembrosGrupo[u];
        pintarMiembros();
        rellenarGrupo(refs.grupoBuscar.value);
      });
      c.appendChild(chip);
    });
  }

  function crearGrupo() {
    var nombre = refs.grupoNombre.value.trim();
    if (!nombre) { IT.toast("Ponle un nombre al grupo 🙂", true); return; }
    var ids = Object.keys(miembrosGrupo);
    if (!ids.length && !refs.grupoBuscar.value.trim()) {
      ids = Object.keys(dir()).filter(function (u) { return u !== miUid(); }).slice(0, 3);
    }
    if (!ids.length) { IT.toast("Agrega al menos a una persona 🙂", true); return; }

    var id = "g" + D.pushId();
    var todos = ids.concat([miUid()]);
    var meta = { type: "group", name: nombre, members: {}, createdBy: miUid(), created: Date.now() };
    todos.forEach(function (u) { meta.members[u] = true; });
    D.escribirMeta(id, meta);
    var l = { texto: "Grupo creado ✨", tiempo: Date.now() };
    todos.forEach(function (u) { D.actualizarEntrada(u, id, meta, l, u === miUid() ? 0 : 1); });

    miembrosGrupo = {};
    refs.grupoNombre.value = ""; refs.grupoBuscar.value = ""; refs.grupoResultados.innerHTML = ""; refs.grupoMiembros.innerHTML = "";
    cerrarModal("modal-grupo");
    IT.toast("¡Grupo creado! 🎉");
    abrirChat(id, meta);
  }

  /* ---------- perfil ---------- */
  function rellenarEmojis(cont, sel) {
    cont.innerHTML = "";
    EMOJIS_PERFIL.forEach(function (e) {
      var b = document.createElement("button");
      b.textContent = e;
      if (e === sel) b.classList.add("sel");
      b.addEventListener("click", function () {
        emojiSel = e;
        IT.$$(cont.tagName === "DIV" ? "#" + cont.id + " button" : cont.tagName + " button").forEach(function (x) { x.classList.remove("sel"); });
        b.classList.add("sel");
        previewPerfil();
      });
      cont.appendChild(b);
    });
  }

  function rellenarColores(cont, sel) {
    cont.innerHTML = "";
    COLORES.forEach(function (c) {
      var b = document.createElement("button");
      b.style.background = c;
      if (c === sel) b.classList.add("sel");
      b.addEventListener("click", function () {
        colorSel = c;
        cont.querySelectorAll("button").forEach(function (x) { x.classList.remove("sel"); });
        b.classList.add("sel");
        previewPerfil();
      });
      cont.appendChild(b);
    });
  }

  function previewPerfil() {
    refs.perfilAvatar.textContent = emojiSel;
    refs.perfilAvatar.style.background = colorSel;
    refs.perfilNombreV.textContent = D.nombreBonito(refs.perfilNombre.value) || "—";
  }

  function abrirPerfil() {
    var p = D.obtenerCache(miUid());
    if (!p) return;
    refs.perfilNombre.value = p.name || "";
    refs.perfilBio.value = p.bio || "";
    refs.perfilClave.value = "";
    emojiSel = (p.emoji || "😊").slice(0, 4);
    colorSel = p.color || D.colorDe(miUid());
    rellenarEmojis(refs.perfilEmoji, emojiSel);
    rellenarColores(refs.perfilColor, colorSel);
    previewPerfil();
    abrirModal("modal-perfil");
  }

  function guardarPerfil() {
    var u = miUid();
    var p = D.obtenerCache(u);
    if (!p) return;
    var nombre = D.nombreBonito(refs.perfilNombre.value);
    if (!nombre) { IT.toast("Escribe tu nombre 🙂", true); return; }

    var antes = (p.nameLower || "").replace(/[.#$[\]]/g, "_");
    var despues = D.canon(nombre).replace(/[.#$[\]]/g, "_");
    var nuevaClave = refs.perfilClave.value.trim();
    var base = {
      name: nombre, nameLower: D.canon(nombre),
      emoji: emojiSel, bio: refs.perfilBio.value.trim().slice(0, 60), color: colorSel,
      created: p.created || Date.now()
    };

    var aplicar = function (claveHash) {
      base.clave = claveHash;
      D.ref("users/" + u).set(base);
      if (antes && antes !== despues) { D.ref("index/" + antes).remove(); D.ref("index/" + despues).set(u); }
      else if (!antes) { D.ref("index/" + despues).set(u); }
      p.clave = claveHash;
      D.setSesion({ uid: u, name: nombre });
      D.guardarSesion(u, nombre);
      pintarMi();
      cerrarModal("modal-perfil");
      IT.toast("Perfil actualizado ✅");
    };

    if (nuevaClave.length && nuevaClave.length < 4) { IT.toast("Contraseña mínima 4 caracteres 🔒", true); return; }
    if (nuevaClave.length) {
      D.hash(nuevaClave).then(aplicar);
    } else {
      aplicar(p.clave || "");
    }
  }

  function pintarMi() {
    var p = D.obtenerCache(miUid());
    if (!p) return;
    refs.miNombre.textContent = p.name;
    refs.miAvatar.textContent = p.emoji || "🙂";
    refs.miAvatar.style.background = p.color || D.colorDe(miUid());
    refs.homeSub.textContent = "Hola, " + p.name + " 💭";
  }

  /* ---------- preparar ---------- */
  function preparar() {
    IT.on("yo:listo", pintarMi);
    IT.on("chats:lista", renderLista);
    IT.on("dir:input", function (uid) {
      if (uid === miUid()) pintarMi();
      if (!refs.buscarInput.value.trim()) return;
      var b = IT.$("#modal-buscar");
      if (b && !b.classList.contains("hidden")) filtrar(refs.buscarInput.value.trim());
      if (refs.grupoResultados.childElementCount) rellenarGrupo(refs.grupoBuscar.value.trim());
    });

    refs.btnBuscar.addEventListener("click", function () {
      refs.buscarInput.value = ""; refs.buscarResultados.innerHTML = "";
      abrirModal("modal-buscar");
      setTimeout(function () { refs.buscarInput.focus(); }, 80);
    });
    refs.buscarInput.addEventListener("input", function () { filtrar(this.value); });

    refs.btnNuevoGrupo.addEventListener("click", function () {
      miembrosGrupo = {};
      refs.grupoNombre.value = ""; refs.grupoBuscar.value = "";
      refs.grupoMiembros.innerHTML = "";
      rellenarGrupo("");
      abrirModal("modal-grupo");
      setTimeout(function () { refs.grupoNombre.focus(); }, 80);
    });
    refs.grupoBuscar.addEventListener("input", function () { rellenarGrupo(this.value); });
    refs.btnCrearGrupo.addEventListener("click", crearGrupo);

    refs.btnPerfil.addEventListener("click", abrirPerfil);
    refs.btnGuardarPerfil.addEventListener("click", guardarPerfil);
    refs.btnSalir.addEventListener("click", function () { D.borrarSesion(); location.reload(); });
    refs.perfilNombre.addEventListener("input", previewPerfil);

    refs.btnVolver.addEventListener("click", volver);
    refs.btnTema.addEventListener("click", function () {
      IT.chat.rellenarTemas();
      abrirModal("modal-tema");
    });

    IT.$$(".modal").forEach(function (m) {
      m.addEventListener("mousedown", function (e) { if (e.target === m) cerrarModal(m.id); });
    });
    document.addEventListener("click", function (e) {
      var c = e.target.closest("[data-cerrar]");
      if (c) { var t = c.getAttribute("data-cerrar"); if (t === "lightbox") cerrarModal("lightbox"); else cerrarModal(t); }
      else if (e.target.closest("#lightbox")) cerrarModal("lightbox");
    });
  }

  return {
    preparar: preparar, renderLista: renderLista, volver: volver, abrirChat: abrirChat,
    pintarMi: pintarMi
  };
})();