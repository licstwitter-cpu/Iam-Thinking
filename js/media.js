/* ============ I'M THINKING — sonidos, stickers y multimedia ============ */
IT.media = (function () {
  "use strict";

  var C = {};
  var audioCtx = null;
  var EMOJIS = ["😊", "❤️", "😂", "😍", "👍", "🥰", "😢", "😘", "🙏", "🤔",
                "✨", "😎", "💪", "🥳", "😴", "🤯", "😇", "🥺", "🎉", "🔥",
                "💤", "🤗", "😉", "👏", "💔", "💯", "🌟", "🐱", "🐶", "🌸"];
  var STICKERS = ["😍", "😂", "🥰", "😭", "😎", "🤯", "💖", "🎉", "🙄", "😴",
                  "🤗", "😇", "😘", "💪", "👍", "🥺", "😅", "🔥", "✨", "💔"];
  var LIMITE = { image: 5 * 1024 * 1024, video: 10 * 1024 * 1024, audio: 3 * 1024 * 1024 };

  /* ================= sonidos ================= */
  function asegurarAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }
  function tono(frec, dur, vol, ret) {
    if (!audioCtx) return;
    setTimeout(function () {
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = "sine"; o.frequency.value = frec;
      g.gain.setValueAtTime(vol, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + dur);
    }, ret || 0);
  }
  C.sonidoEnviar = function () { asegurarAudio(); tono(620, .16, .18); tono(420, .18, .12, .08); };
  C.sonidoRecibir = function () { asegurarAudio(); tono(880, .18, .14); tono(1318, .22, .12, .12); };
  C.asegurarAudio = asegurarAudio;

  /* ================= emojis y stickers ================= */
  C.emojis = EMOJIS;
  C.stickers = STICKERS;

  /* ================= archivos: leer y optimizar ================= */
  function archivoAUrl(file, maxPx, calidad, cb, err) {
    if (file.size > LIMITE.image) { if (err) return err("Esa foto pesa demasiado (máx 5 MB). Elige otra 🥺"); }
    var lector = new FileReader();
    lector.onload = function () {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height;
        if (w > maxPx || h > maxPx) {
          var k = Math.min(maxPx / w, maxPx / h);
          w = Math.round(w * k); h = Math.round(h * k);
        }
        var cnv = document.createElement("canvas");
        cnv.width = w; cnv.height = h;
        cnv.getContext("2d").drawImage(img, 0, 0, w, h);
        cb({ data: cnv.toDataURL("image/jpeg", calidad), mime: "image/jpeg", size: file.size });
      };
      img.onerror = function () { cb({ data: lector.result, mime: file.type, size: file.size }); };
      img.src = lector.result;
    };
    lector.readAsDataURL(file);
  }

  function videoAUrl(file, cb, err) {
    if (file.size > LIMITE.video) { if (err) return err("El video es muy grande (máx 10 MB). Graba uno más corto 🎬"); }
    var lector = new FileReader();
    lector.onload = function () { cb({ data: lector.result, mime: file.type, size: file.size }); };
    lector.readAsDataURL(file);
  }

  function audioAUrl(blob, cb) {
    var lector = new FileReader();
    lector.onload = function () { cb({ data: lector.result, mime: blob.type || "audio/webm", size: blob.size }); };
    lector.readAsDataURL(blob);
  }

  /* ================= grabadora de voz ================= */
  var recorder = null, stream = null, chunks = [], tIni = 0;
  var onTIempo = null, intT = null;

  C.recEstaGrabando = function () { return !!recorder; };

  C.recIniciar = function (onTick, err) {
    if (recorder) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { if (err) err("Tu navegador no permite grabar audios 🎙️"); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (st) {
      stream = st;
      chunks = [];
      var mime = null;
      if (window.MediaRecorder && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported("audio/webm")) mime = "audio/webm";
        else if (MediaRecorder.isTypeSupported("audio/mp4")) mime = "audio/mp4";
      }
      recorder = mime ? new MediaRecorder(st, { mimeType: mime }) : new MediaRecorder(st);
      recorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onstop = function () { if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); } stream = null; };
      recorder.start();
      tIni = Date.now();
      if (onTick) {
        onTIempo = onTick;
        intT = setInterval(function () { onTick(Math.round((Date.now() - tIni) / 1000)); }, 200);
      }
      C.emitTiempo(0);
    }).catch(function () { if (err) err("No pude acceder al micrófono 🎙️"); });
  };

  C.emitTiempo = function (s) { if (onTIempo) onTIempo(s); };

  C.recParar = function (cb) {
    if (!recorder) { if (cb) cb(null); return; }
    clearInterval(intT); intT = null; onTIempo = null;
    var rec = recorder;
    recorder.onstop = function () {
      if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); } stream = null;
      var blob = new Blob(chunks, { type: (rec.mimeType || "audio/webm") });
      chunks = [];
      recorder = null;
      if (blob.size > LIMITE.audio) { C.recError = "El audio supera 3 MB, graba uno más corto 🎙️"; if (cb) cb(null); return; }
      if (cb) cb(blob);
    };
    rec.stop();
  };
  C.recCancelar = function () { clearInterval(intT); intT = null; onTIempo = null; if (recorder) { recorder.onstop = null; try { recorder.stop(); } catch (e) {} } recorder = null; if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); } stream = null; chunks = []; };

  function urlDeBase64(data) {
    var i = data.indexOf(",");
    var meta = data.slice(0, i);
    var mime = (meta.split(";")[0] || "image/jpeg").replace("data:", "");
    var b64 = data.slice(i + 1);
    var bin = atob(b64);
    var arr = new Uint8Array(bin.length);
    for (var k = 0; k < bin.length; k++) arr[k] = bin.charCodeAt(k);
    return URL.createObjectURL(new Blob([arr], { type: mime }));
  }
  C.urlDeBase64 = urlDeBase64;
  C.archivoAUrl = archivoAUrl;
  C.videoAUrl = videoAUrl;
  C.audioAUrl = audioAUrl;

  return C;
})();