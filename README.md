# SISEC CC 2026 / 2027 — Frontend SPA

### Instituto Electoral de la Ciudad de México (IECM)
* **Dirección:** Dirección Ejecutiva de Educación Cívica y Construcción de Ciudadanía (DEECyCC) / Unidad Técnica de Servicios Informáticos (UTSI)
* **Stack:** Vue 3 (Composition API `<script setup>`) + Vite `^8.0.12` + Pinia `^3.0.3` + Vue Router `^4.6.2` + Tailwind CSS `^3.4.17` + GSAP `^3.15.0` + Lucide Icons `^1.17.0`

---

## 🎨 Identidad Visual y Filosofía de Diseño

El cliente web de **SISEC CC** implementa una estética de nivel institucional llamada **Liquid Crystal Glassmorphism** (anti-slop, moderna, accesible y de alta densidad funcional):
* **Paleta Oficial del IECM:** Morado institucional (`#6B2D8B`), Morado Profundo (`#3E1857`), Verde Operativo (`#059669`) y Dorado de Acento (`#D97706`).
* **Soporte Dual Nativo (Light & Dark Mode):** Ajuste cromático completo con variables CSS y tokens de Tailwind.
* **Componentes Cristalinos:** Tarjetas y modales con efectos de desenfoque de fondo (`backdrop-blur-md`), biselados de luz superior e iluminación sutil.
* **Arquitectura de Scroll Único:** Modales estandarizados con cabecera y pie de página fijos, y cuerpo con desplazamiento único (`scrollbar-thin`) sin colisión de barras dobles.

---

## 📂 Estructura del Proyecto Frontend

```
frontend/
├── public/                       # Activos estáticos públicos (logos e imágenes)
├── src/
│   ├── assets/
│   │   ├── logos/                # Logotipos vectoriales y PNGs oficiales del IECM
│   │   └── base.css              # Reset y configuración tipográfica Inter
│   ├── components/
│   │   ├── AppModal.vue          # Modal cristalino maestro con scroll único y footer fijo
│   │   ├── AppNavbar.vue         # Barra superior institucional, perfil y toggle dark mode
│   │   ├── AppSidebar.vue        # Menú lateral reactivo con permisos modulares dinámicos
│   │   ├── auth/
│   │   │   └── LoginCard.vue     # Tarjeta de autenticación con feedback de errores
│   │   ├── modals/
│   │   │   ├── ModalCaptura2027.vue    # Captura de matriz 5x6 y subida de 4 evidencias
│   │   │   ├── ModalEncuesta2027.vue   # Cuestionario Likert de 5 puntos y folios consecutivos
│   │   │   ├── ModalHabilitarFechas.vue # Asignación de excepciones distritales
│   │   │   └── ModalPermisosUsuario.vue # Asignación granular de módulos por usuario
│   │   └── ui/
│   │       ├── AppButton.vue     # Botones con variantes de color, iconos y loaders
│   │       ├── AppCard.vue       # Contenedor estándar con bordes redondeados y sombra suave
│   │       ├── AppInput.vue      # Campos de texto con validación y estados de foco
│   │       ├── AppSelect.vue     # Selectores desplegables personalizados
│   │       ├── AppTable.vue      # Tablas responsivas con cabeceras fijas y paginación
│   │       └── AppRadialExcepcion.vue # Widget radial de días restantes de habilitación
│   ├── composables/
│   │   ├── useToast.js           # Notificaciones tipo toast no intrusivas
│   │   └── useGsapAnimations.js  # Transiciones de página y animaciones fluidas
│   ├── router/
│   │   └── index.js              # Ruteo SPA, lazy loading y guardias de autenticación por rol
│   ├── services/
│   │   └── api.js                # Instancia de Axios con interceptores JWT y manejo de 401
│   ├── stores/
│   │   └── authStore.js          # Estado global de sesión, usuario, JWT y socket en tiempo real
│   ├── views/
│   │   ├── LoginView.vue         # Pantalla de acceso con alerta flotante y selector de modo
│   │   ├── DashboardView.vue     # Tablero ejecutivo con indicadores KPI y gráficas Chart.js
│   │   ├── ProgramacionView.vue  # Formulario institucional de programación de acciones
│   │   ├── CapturaView.vue       # Bandeja distrital de avance físico y carga de formatos
│   │   ├── EncuestaView.vue      # Consulta y análisis de respuestas de satisfacción
│   │   ├── NotificacionesView.vue # Centro de mensajería distrital y chat institucional
│   │   └── admin/
│   │       ├── UsuariosView.vue          # Control de cuentas y presencia en vivo
│   │       ├── RestriccionesView.vue     # Configuración de calendarios y excepciones
│   │       ├── ArchivosView.vue          # Explorador interactivo de almacenamiento de evidencias
│   │       ├── FormatosView.vue          # Gestión de plantillas oficiales .docx
│   │       ├── CursosView.vue            # Catálogo de acciones educativas y vertientes
│   │       └── MensajesPredeterminadosView.vue # Catálogo de plantillas rápidas de mensaje
│   ├── App.vue                   # Componente raíz con layout dinámico
│   ├── main.js                   # Punto de entrada de la aplicación Vue
│   └── style.css                 # Estilos globales, clases de utilidad y tema IECM
├── tailwind.config.js
├── vite.config.js                # Configuración de Vite, plugins y proxies
└── package.json
```

---

## 🛠️ Módulos Principales de la Aplicación

### 1. Programación de Acciones Educativas 2027
* Validación en tiempo real de periodos habilitados y restricciones institucionales.
* Formulario estructurado: acción institucional, vertiente, tipo de institución, domicilio territorial, contacto y personal asignado.
* **AppRadialExcepcion:** Widget visual flotante que informa al operador los días y horas restantes de su periodo ordinario o habilitación extemporánea, sincronizado vía WebSocket.

### 2. Captura y Evidencias Digitales 2027
* **Matriz Demográfica 5x6:** Registro cuantitativo cruzando 5 géneros (*Mujer*, *Hombre*, *No binario*, *Otro*, *Prefiero no decirlo*) con 6 grupos de edad (*0 a 14*, *15 a 17*, *18 a 29*, *30 a 49*, *50 a 64*, *65 o más*).
* **Gestor de 4 Evidencias Digitales:**
  1. *Formato 1:* Registro de la Acción Educativa (PDF).
  2. *Formato 2:* Lista de Asistencia (PDF).
  3. *Evidencia Fotográfica:* Testimonio visual del evento (JPG/PNG).
  4. *Documentación Adicional:* Convenio o anexo complementario (Opcional).
* Visor de documentos integrado con vista previa instantánea en el navegador.

### 3. Encuestas de Satisfacción 2027
* Cuestionario de 8 reactivos con escala **Likert de 5 puntos** (*Totalmente en desacuerdo* a *Totalmente de acuerdo*).
* Generación de folio institucional estandarizado: `ENC-AE-DDXX-2027-XXXX-X`.
* Modal optimizado con **arquitectura de scroll único** sin barras duplicadas.

### 4. Notificaciones y Comunicación en Tiempo Real
* Integración fluida con **Socket.IO** en `authStore.js`.
* Notificaciones inmediatas al autorizarse un periodo extemporáneo.
* Indicador de presencia en tiempo real que distingue usuarios conectados y desconectados.

---

## ⚙️ Configuración y Variables de Entorno

### Archivo `frontend/.env.development`
```ini
# En desarrollo local
VITE_API_URL=http://localhost:3013/api
VITE_BASE_URL=/

# O apuntando al servidor de QA
# VITE_API_URL=https://aplicaciones2qa.iecm.mx/sisec_2026/api
```

### Archivo `frontend/.env.production`
```ini
VITE_API_URL=https://aplicaciones2qa.iecm.mx/sisec_2026/api
VITE_BASE_URL=/sisec_2026/
```

---

## 🚀 Compilación y Despliegue

```bash
# Instalar dependencias
pnpm install

# Servidor de desarrollo local (Vite HMR en puerto 5173)
pnpm run dev

# Compilación para entorno de Desarrollo / QA
pnpm run build:desarrollo

# Compilación para Producción (Minificación y empaquetado final)
pnpm run build:produccion
```

Los artefactos compilados se generan automáticamente en la carpeta `backend/public/` para que el servidor Express los sirva directamente como Single Page Application bajo cualquier ruta configurada.
