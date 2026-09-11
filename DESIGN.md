# DESIGN — Nuestro Rincón (Maykool 💘 Gabriela)

Red social privada para dos. Login con nombres (solo `Maykool` y `Gabriela`),
chat sincronizado en tiempo real y estética rosa pastel animada.

## Identidad visual

- **Paleta rosa pastel**: fondo `#FFF7FA → #FFEFF4 → #F3EDF7` (degradado y lavanda),
  rosa suave `#FFC0D2`, rosa protagonista `#F47FA8` / `#E85D90`, lavanda `#E4D7EE`.
- **Tinta**: `#58334B` (marrón-rosa cálido), texto suave `#9A7A8C`.
- **Superficies**: tarjetas blancas translúcidas con blur, bordes rosa suave,
  sombras rosadas difuminadas (`0 8px 24px rgba(232,93,144,.18)`).

## Tipografía

- **Quicksand** (títulos, botones y avatares) con degradado de texto en el logotipo.
- **Nunito** (cuerpo y mensajes), pesos 600/700/800, redondeada y tierna.

## Composición

- **Login**: tarjeta central con corazón latiendo, título degradado, campo de nombre
  en píldora y botón degradado. Fondo = corazones flotantes generados por JS.
- **Chat**: cabecera fija con avatares `M`/`G` latiendo + estado "Conectad@s";
  burbujas propias a la derecha (degradado rosa) y de la otra persona a la
  izquierda (blanco); mensajes solo-emoji se dibujan grandes sin burbuja de texto.
- **Entrada**: input en píldora + botón circular 💌, selector de emojis animado
  y gesto de escribir ("está escribiendo...").

## Estados e interacción

- Login erróneo: mensaje tierno + sacudida de la tarjeta.
- Enviar: sonido "pop" (Web Audio) + corazón que vuela desde el botón.
- Recibir: sonido "ding" y, si la pestaña está oculta, el título parpadea "💌 Nuevo mensaje".
- Focus: contorno discontinuo rosa. `prefers-reduced-motion`: se apagan todas las animaciones.
- Responsive desde móvil (390) hasta escritorio (1440).

## Persistencia y privacidad

- **localStorage**: guarda quién eres y la sesión.
- **Firebase Realtime Database**: sincroniza los mensajes entre los dos dispositivos.
- **Privacidad**: la habitación vive en `c/<SECRET_CODE>` (código secreto en
  `js/config.js`, solo lo conocéis vosotros) y solo escriben/leen usuarios
  autenticados (reglas `auth != null`).

---

# PASO 2 · Conectar Firebase (gratis, una sola vez)

1. Entra en https://console.firebase.google.com con tu cuenta de Google →
   **Crear proyecto** (nombre cualquiera, ej. `maykool-gabriela`). Puedes saltarte
   Google Analytics → **Crear proyecto**.
2. Dentro del proyecto, toca el icono **`</>` (App web)** → ponle un nombre
   (ej. `web`) → marca "Configuración del SDK" → **Registrar app**.
   Se mostrará un recuadro `firebaseConfig`. Cópialo.
3. Menú lateral → **Authentication** → **Sign-in method** → activa **Anonymous** → guarda.
4. Menú lateral → **Build → Realtime Database** → **Create database** → elige una
   región (ej. `us-central1`) → modo **Start in locked mode** → **Enable**.
5. Copia la **URL** de tu base de datos (botón ⚙️ junto al nombre → Database settings).
6. Abre `js/config.js` y pega tus datos:
   - Cada valor del `firebaseConfig` (apiKey, authDomain, **databaseURL**, projectId, etc.).
   - Podes dejar o cambiar `SECRET_CODE` (código de la habitación privada).
7. En **Realtime Database → Rules**, pega estas reglas y pulsa **Publish**:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

Listo. Abre `index.html` y entra como `Maykool` o `Gabriela` 💘

# PASO 3 · Subir a GitHub Pages

1. Crea un repositorio nuevo en https://github.com/new (ej. `maykool-gabriela`).
2. Sube el contenido de esta carpeta (los 4 archivos/carpetas: `index.html`, `css/`, `js/`).
3. En el repositorio → **Settings → Pages** → en **Source** elige
   `Deploy from a branch` → rama `main` / carpeta `/ (root)` → **Save**.
4. Espera ~1 minuto. Tu web estará en `https://TU_USUARIO.github.io/maykool-gabriela/`.
5. Comparte ese enlace con Gabriela: desde cualquier teléfono o PC, entrad los dos
   con vuestro nombre y veréis el mismo chat sincronizado.