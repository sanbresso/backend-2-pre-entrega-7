# Plataforma de Eventos e Inscripciones

## Pre-entrega 7 — Tickets, inscripciones y control de cupos

Proyecto de **PBE II — Diseño y Arquitectura Backend (Coderhouse)** desarrollado con Node.js, Express, MongoDB Atlas y Mongoose.

Esta entrega continúa el proyecto iniciado en la Pre-entrega 1 y conserva el CRUD de eventos, sus reglas de negocio, autenticación y autorización. La Pre-entrega 7 incorpora el **modelo Ticket**, inscripciones autenticadas, prevención de duplicados, control transaccional de cupos, cancelación lógica, consultas por usuario o evento y notificaciones de confirmación con **Nodemailer (Gmail SMTP)**.

## 1. Evolución del proyecto

- **Pre-entrega 1:** arquitectura modular con Express, modelos y rutas iniciales.
- **Pre-entrega 2:** registro de usuarios, bcrypt, validaciones y persistencia en MongoDB.
- **Pre-entrega 3:** autenticación JWT, cookies HttpOnly, sesión actual y logout.
- **Pre-entrega 4:** estrategias Passport.js `register`, `login` y `current`.
- **Pre-entrega 5:** autorización por roles (RBAC), control de propiedad de eventos y rutas administrativas.
- **Pre-entrega 6:** modelo Event completo, reglas de negocio, endpoints de gestión, filtros, paginación, ordenamiento y control de estados.
- **Pre-entrega 7:** modelo Ticket relacionado con User y Event, inscripciones, cupos, historial de cancelaciones, permisos y confirmación por email.

## 2. Tecnologías utilizadas

- Node.js y JavaScript ES Modules.
- Express 5.
- MongoDB Atlas y Mongoose.
- Passport.js, passport-local y passport-jwt.
- JSON Web Tokens (JWT).
- bcrypt.
- cookie-parser.
- dotenv.
- Nodemailer y SMTP (Gmail con contraseña de aplicación).
- Postman para pruebas manuales y un script de concurrencia.
- Git y GitHub.

## 3. Instalación y ejecución

### Clonar el repositorio

```bash
# Reemplazar por el enlace del repositorio de Pre-entrega 7 cuando esté publicado
git clone URL_DEL_REPOSITORIO_PRE_ENTREGA_7
cd backend-2-pre-entrega-7
```

### Instalar dependencias

```bash
npm install
```

### Configurar variables de entorno

Crear un archivo `.env` a partir de `.env.example` y configurar los valores correspondientes:

```dotenv
PORT=8080
NODE_ENV=development
MONGO_URL=mongodb+srv://USUARIO:CONTRASENA@TU_CLUSTER.mongodb.net/plataforma_eventos
JWT_SECRET=REEMPLAZAR_POR_CLAVE_SECRETA_SEGURA
JWT_EXPIRES_IN=1h
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=tu_correo@gmail.com
MAIL_PASS=CONTRASENA_DE_APLICACION_DE_GMAIL
MAIL_FROM="Plataforma de Eventos <tu_correo@gmail.com>"
```

Las variables deben adaptarse al entorno y a la conexión MongoDB correspondiente. Para Gmail se utiliza una **contraseña de aplicación**; no la contraseña habitual de la cuenta. La verificación en dos pasos debe estar habilitada para generar esa contraseña.

El archivo `.env.example` contiene valores de ejemplo y puede publicarse. El archivo `.env`, las cookies, tokens y credenciales reales **nunca** deben subirse a GitHub.

### Iniciar el servidor

Modo desarrollo:

```bash
npm run dev
```

Modo normal:

```bash
npm start
```

El script de desarrollo utiliza `node --watch src/server.js`. Revisar el script efectivo en `package.json` si se modifica la configuración.

URL base utilizada en las pruebas:

`http://localhost:8080`

**Seguridad:** nunca publicar `.env`, contraseñas, tokens JWT, credenciales de MongoDB ni `node_modules`.

## 4. Arquitectura

El proyecto utiliza una arquitectura modular que separa responsabilidades:

```text
src/
├── app.js
├── server.js
├── config/
│   ├── db.js
│   ├── passport.config.js
│   └── mail.config.js
├── models/
│   ├── User.js
│   ├── Event.js
│   └── Ticket.js
├── routes/
│   ├── health.router.js
│   ├── sessions.router.js
│   ├── events.router.js
│   ├── tickets.router.js
│   └── admin.router.js
├── controllers/
│   ├── health.controller.js
│   ├── sessions.controller.js
│   ├── events.controller.js
│   ├── tickets.controller.js
│   └── admin.controller.js
├── services/
│   ├── sessions.service.js
│   ├── events.service.js
│   ├── tickets.service.js
│   └── email.service.js
├── repositories/
│   ├── users.repository.js
│   ├── events.repository.js
│   └── tickets.repository.js
├── dao/
│   └── users.dao.js
├── middlewares/
│   ├── auth.middleware.js
│   ├── authorize.middleware.js
│   ├── eventOwnership.middleware.js
│   ├── optionalAuth.middleware.js
│   └── error.middleware.js
└── utils/
    ├── hash.js
    └── jwt.js

scripts/
└── test-concurrencia.mjs
```

### Responsabilidades

- **Models:** esquemas de datos y validaciones de Mongoose.
- **Repositories/DAO:** operaciones de persistencia y consulta a MongoDB.
- **Services:** reglas de negocio, validaciones, visibilidad, cupos, transiciones de estado y notificaciones.
- **Controllers:** manejo de solicitudes y respuestas HTTP.
- **Routes:** definición de endpoints y aplicación de middlewares.
- **Middlewares:** autenticación, autorización, propiedad y manejo de errores.

## 5. Modelo Event

El modelo Event contiene los siguientes campos:

| Campo | Tipo | Validación |
|---|---|---|
| title | String | Obligatorio |
| description | String | Obligatorio |
| category | String | Obligatorio |
| date | Date | Obligatorio |
| location | String | Obligatorio |
| capacity | Number | Entero mayor que 0 |
| price | Number | Mayor o igual a 0 |
| status | String | Enum de estados permitidos |
| organizer | ObjectId | Referencia obligatoria a User |
| reservationRevision | Number | Contador técnico usado para coordinar reservas concurrentes |

El campo `organizer` utiliza una referencia de Mongoose:

```javascript
organizer: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: true,
  immutable: true
}
```

No se almacena el objeto completo del usuario dentro del evento.

Todos los eventos se crean inicialmente con estado `draft`.

Estados permitidos:

- `draft`: borrador.
- `published`: publicado.
- `cancelled`: cancelado.
- `finished`: finalizado.

El esquema también incorpora `timestamps` para registrar las fechas de creación y actualización.

## 6. Usuarios, autenticación y roles

El modelo User contiene nombre, apellido, email, contraseña protegida y rol.

Los roles disponibles son:

- `user`
- `organizer`
- `admin`

El registro público asigna automáticamente el rol `user`, sin permitir que el cliente se otorgue permisos superiores.

Las contraseñas se almacenan mediante hash bcrypt.

La autenticación utiliza JWT guardado en la cookie HttpOnly `currentUser`.

### Endpoints de sesiones

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/sessions` | Público |
| POST | `/api/sessions/register` | Público |
| POST | `/api/sessions/login` | Público |
| GET | `/api/sessions/current` | Autenticado |
| POST | `/api/sessions/logout` | Público |

### Registro

`POST /api/sessions/register`

```json
{
  "first_name": "Usuario",
  "last_name": "Ejemplo",
  "email": "usuario@example.com",
  "password": "ClaveDePrueba123!"
}
```

La contraseña debe tener al menos ocho caracteres.

### Inicio de sesión

`POST /api/sessions/login`

```json
{
  "email": "usuario@example.com",
  "password": "ClaveDePrueba123!"
}
```

Respuesta exitosa:

```json
{
  "status": "success",
  "message": "Login correcto"
}
```

El backend establece la cookie `currentUser`, que posteriormente se utiliza para autenticar solicitudes protegidas.

## 7. Endpoints de eventos

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/events` | organizer o admin |
| GET | `/api/events` | Público |
| GET | `/api/events/:id` | Público, con visibilidad controlada |
| PUT | `/api/events/:id` | Organizador propietario o admin |
| PATCH | `/api/events/:id/status` | Organizador propietario o admin |

No se implementa eliminación física de eventos. Las cancelaciones se realizan mediante cambio de estado.

### Crear evento

`POST /api/events`

Requiere autenticación y rol `organizer` o `admin`.

Ejemplo:

```json
{
  "title": "Workshop de Backend",
  "description": "Taller práctico de Node.js y Express",
  "category": "workshop",
  "date": "2030-12-15T18:00:00.000Z",
  "location": "Montevideo",
  "capacity": 30,
  "price": 500
}
```

Respuesta: `201 Created`.

El organizador se obtiene automáticamente de `req.user.id`.

No se permite enviar manualmente `organizer` ni `status` en el body de creación.

### Listar eventos

`GET /api/events`

El listado utiliza filtros dinámicos, paginación y ordenamiento.

#### Parámetros disponibles

| Parámetro | Descripción |
|---|---|
| status | Filtrar por estado |
| category | Filtrar por categoría |
| location | Buscar por ubicación, de forma parcial |
| dateFrom | Fecha mínima |
| dateTo | Fecha máxima |
| page | Número de página, predeterminado 1 |
| limit | Resultados por página, predeterminado 10 |
| sort | Campo y dirección de ordenamiento |

El límite máximo por página es 100.

Campos permitidos para ordenar:

- `date`
- `price`
- `title`
- `createdAt`

Se utiliza el prefijo `-` para el orden descendente.

Ejemplo:

```http
GET /api/events?status=published&category=workshop&page=1&limit=5&sort=-date
```

Respuesta ilustrativa:

```json
{
  "data": [],
  "page": 1,
  "limit": 5,
  "total": 0,
  "totalPages": 0
}
```

El contenido de `data` y los totales dependen de los eventos existentes.

### Visibilidad de eventos

Las consultas están condicionadas por los permisos:

| Usuario | Visibilidad |
|---|---|
| Visitante | Eventos publicados |
| user | Eventos publicados |
| organizer | Eventos publicados y sus propios eventos |
| admin | Todos los eventos |

El listado utiliza autenticación opcional.

Un visitante puede consultar eventos publicados sin iniciar sesión, pero no puede acceder a borradores, cancelados o finalizados mediante el filtro por estado.

### Consultar evento por ID

`GET /api/events/:id`

La respuesta exitosa utiliza:

```json
{
  "status": "success",
  "payload": {
    "_id": "ID_DEL_EVENTO",
    "title": "Workshop de Backend",
    "status": "published"
  }
}
```

El ejemplo muestra los campos principales.

Los organizadores pueden consultar sus propios borradores y los administradores pueden consultar eventos de cualquier estado.

Cuando un visitante intenta consultar un evento privado, el servicio responde `404 Not Found`, evitando revelar su existencia.

### Actualizar evento

`PUT /api/events/:id`

Requiere autenticación.

Solo pueden actualizarlo:

- El organizador propietario.
- Un administrador.

Ejemplo:

```json
{
  "title": "Workshop de Backend Avanzado",
  "capacity": 50,
  "price": 750
}
```

La implementación admite actualizaciones parciales de campos permitidos mediante PUT.

Campos modificables:

- title
- description
- category
- location
- date
- capacity
- price

No pueden modificarse `organizer` ni `status` mediante este endpoint.

Los eventos cancelados o finalizados no admiten modificaciones.

### Cambiar estado

`PATCH /api/events/:id/status`

Requiere autenticación y autorización sobre el evento.

Ejemplo:

```json
{
  "status": "published"
}
```

La transición debe respetar las reglas de negocio.

## 8. Reglas de negocio

### Validaciones de creación

- El título, descripción, categoría y ubicación son obligatorios.
- No se permiten campos de texto obligatorios vacíos.
- La fecha debe ser válida y futura.
- La capacidad debe ser un entero mayor que cero.
- El precio debe ser un número mayor o igual que cero.
- El organizador se asigna automáticamente.
- El estado inicial siempre es `draft`.

### Validaciones de actualización

- No se permite modificar eventos cancelados.
- No se permite modificar eventos finalizados.
- No se permite cambiar manualmente el organizador.
- El estado se modifica exclusivamente mediante su endpoint específico.
- Se validan nuevamente los campos modificados.

### Transiciones de estado

| Estado actual | Transiciones permitidas |
|---|---|
| draft | published, cancelled |
| published | finished, cancelled |
| cancelled | Ninguna |
| finished | Ninguna |

No se puede publicar un evento cuya fecha ya haya pasado.

No se puede finalizar un evento que todavía no haya comenzado.

Los estados `cancelled` y `finished` se consideran terminales.

### Cancelación lógica

Para cancelar un evento se utiliza:

```http
PATCH /api/events/:id/status
```

```json
{
  "status": "cancelled"
}
```

El documento permanece almacenado en MongoDB.

No se utilizan operaciones de eliminación física para cancelar eventos.

## 9. Autorización y propiedad

Se utilizan tres mecanismos:

1. `authMiddleware`: valida la autenticación mediante JWT.
2. `authorizeRoles`: restringe las operaciones por rol.
3. `eventOwnership`: comprueba que el usuario sea propietario del evento o administrador.

El middleware `optionalAuth` permite identificar sesiones válidas en endpoints públicos sin exigir autenticación obligatoria.

El rol y el identificador del usuario se obtienen del token validado, no del body.

**Consideración de seguridad:** los cambios de rol en MongoDB requieren emitir un nuevo JWT mediante login. Como mejora para producción, sería conveniente consultar el estado y rol vigente del usuario en la base de datos.

## 10. Manejo de errores

La API utiliza códigos HTTP adecuados según el caso.

| Código | Significado |
|---|---|
| 400 | Datos inválidos |
| 401 | Usuario no autenticado |
| 403 | Usuario sin permisos |
| 404 | Recurso inexistente o no visible |
| 409 | Conflicto o transición de estado inválida |
| 500 | Error interno del servidor |

Ejemplo de validación:

```json
{
  "status": "error",
  "message": "La capacidad debe ser un número entero mayor a 0"
}
```

El middleware global contempla errores controlados, errores de validación de Mongoose, errores de conversión de tipos y conflictos por índices únicos.

## 11. Pruebas manuales con Postman

Se realizaron pruebas funcionales durante el desarrollo.

| Prueba | Resultado esperado |
|---|---|
| Crear evento con rol user | 403 |
| Crear evento con organizer | 201 |
| Crear evento con fecha pasada | 400 |
| Crear evento con capacidad 0 | 400 |
| Organizador modifica evento propio | 200 |
| Organizador modifica evento ajeno | 403 |
| Administrador modifica evento ajeno | 200 |
| Cancelar evento | 200 |
| Intentar publicar evento cancelado | 409 |
| Intentar modificar evento cancelado | 409 |
| Listar eventos publicados | 200 |
| Consultar borrador propio | 200 |
| Consultar borrador sin autorización | 404 |
| Consultar evento inexistente | 404 |
| Filtrar por categoría y estado | 200 |
| Filtrar por ubicación y rango de fechas | 200 |
| Paginar resultados | 200 |
| Ordenar por fecha ascendente y descendente | 200 |

También se verificaron operaciones de registro, login y consulta de sesión en entregas anteriores.

Las pruebas de eventos se realizaron manualmente con Postman. Además se incluye `scripts/test-concurrencia.mjs` para la Pre-entrega 7; no constituye una suite completa de tests automatizados. El script `npm test` no se utiliza aquí como evidencia de pruebas.

Para reproducir las pruebas de roles:

1. Registrar cuentas de prueba.
2. Asignar roles de prueba mediante un procedimiento administrativo controlado en MongoDB.
3. Volver a iniciar sesión para obtener un JWT actualizado.
4. Realizar las solicitudes desde Postman.
5. Verificar los códigos HTTP y las respuestas JSON.

No compartir contraseñas, tokens o cookies reales en las evidencias.

## 12. Seguridad y mejoras futuras

Medidas implementadas:

- Hash de contraseñas mediante bcrypt.
- JWT en cookie HttpOnly.
- Autenticación mediante Passport.js.
- Autorización por roles.
- Verificación de propiedad de eventos.
- Restricción de campos modificables.
- Validaciones de datos y reglas de negocio.
- Protección de eventos privados.
- Cancelación lógica de eventos y tickets.
- Índice único parcial para evitar tickets activos duplicados.
- Transacciones y coordinación de reservas para control concurrente de cupos.
- Credenciales de correo en variables de entorno.
- Exclusión de secretos mediante `.gitignore`.

Posibles mejoras futuras:

- Pruebas automatizadas.
- Protección CSRF y limitación de intentos de autenticación.
- Verificación de roles vigentes en MongoDB.
- Pruebas automatizadas unitarias e integrales adicionales, incluyendo varios procesos concurrentes.
- Validación de reducciones de `capacity` frente a reservas activas en las actualizaciones de eventos.
- Reintentos persistentes de correo mediante cola de trabajos o patrón *Transactional Outbox*.
- Índices adicionales y observabilidad de consultas.
- Eventos de dominio y notificaciones más completas.
- Documentación interactiva con OpenAPI/Swagger.

## 13. Modelo Ticket y relaciones (Pre-entrega 7)

`Ticket` representa una inscripción y se vincula con los modelos `User` y `Event` mediante **referencias `ObjectId`**, sin guardar objetos de usuario o evento embebidos.

| Campo | Tipo | Uso |
|---|---|---|
| `user` | ObjectId (`ref: "User"`) | Usuario inscripto |
| `event` | ObjectId (`ref: "Event"`) | Evento al que se inscribe |
| `status` | String (enum) | `confirmed`, `pending` o `cancelled` |
| `quantity` | Number | Entero mayor que cero |
| `reservationCode` | String | Código único de reserva |
| `createdAt` | Date | Fecha de creación, generada por `timestamps` |
| `cancelledAt` | Date o `null` | Fecha de cancelación, cuando corresponda |
| `updatedAt` | Date | Fecha de última modificación, generada por `timestamps` |

`reservationCode` tiene índice único. El índice **único parcial** `{ user: 1, event: 1 }` aplica a los tickets con estado `confirmed` o `pending`: impide tener más de un ticket activo del mismo usuario para el mismo evento, pero permite conservar múltiples registros históricos `cancelled`.

### Estados de Ticket

- `confirmed`: reserva creada y confirmada; **ocupa** `quantity` cupos.
- `pending`: estado previsto por el modelo; se considera **activo y ocupa** `quantity` cupos en el cálculo actual.
- `cancelled`: cancelación lógica; **no ocupa** cupos y mantiene el historial.

El flujo de alta implementado en esta pre-entrega genera tickets con estado `confirmed`. No se implementó una lista de espera automática; `pending` está definido en el esquema y contemplado en la regla de capacidad.

## 14. Endpoints de tickets y autorización

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/api/events/:eid/tickets` | Usuario autenticado | Crear inscripción para el usuario del JWT |
| `GET` | `/api/tickets/my-tickets` | Usuario autenticado | Consultar solo los tickets propios |
| `GET` | `/api/events/:eid/tickets` | `organizer` dueño del evento o `admin` | Consultar tickets del evento |
| `PATCH` | `/api/tickets/:tid/cancel` | Dueño del ticket o `admin` | Cancelar sin borrar el documento |

La identidad se obtiene de `req.user.id`, suministrada por el middleware de autenticación; el cliente **no** elige el usuario de la inscripción mediante el body.

### Crear una inscripción

```http
POST /api/events/ID_EVENTO/tickets
Content-Type: application/json
```

```json
{
  "quantity": 1
}
```

La sesión debe estar iniciada mediante `/api/sessions/login`, que establece la cookie HttpOnly `currentUser`.

Ejemplo abreviado de éxito (`201 Created`):

```json
{
  "status": "success",
  "message": "Inscripción confirmada",
  "payload": {
    "user": "ID_USUARIO",
    "event": "ID_EVENTO",
    "status": "confirmed",
    "quantity": 1,
    "reservationCode": "TCK-UUID",
    "cancelledAt": null
  }
}
```

### Consultar mis tickets

```http
GET /api/tickets/my-tickets
```

Devuelve solo registros cuyo `user` corresponde al usuario autenticado. El campo `event` se obtiene por `populate()` con selección de `title`, `date` y `location`, sin exponer información sensible de terceros.

### Consultar inscripciones de un evento

```http
GET /api/events/ID_EVENTO/tickets
```

Un usuario común recibe `403`. Un `organizer` solo puede acceder si `event.organizer` coincide con su ID; `admin` puede consultar cualquier evento.

### Cancelar un ticket

```http
PATCH /api/tickets/ID_TICKET/cancel
```

No requiere body. Valida existencia, propiedad o rol `admin` y estado activo. La operación cambia `status` a `cancelled`, asigna `cancelledAt` y conserva el documento; la segunda cancelación devuelve `409 Conflict`.

## 15. Inscripciones, control de cupos y concurrencia

Las reglas de negocio se implementan en `src/services/tickets.service.js`, no en los controladores HTTP.

Para confirmar una inscripción se comprueba que:

1. El usuario está autenticado y el ID del evento es válido.
2. `quantity` es un entero positivo.
3. El evento existe y está en estado `published`.
4. Su fecha de inicio es futura.
5. El usuario no tiene ya un ticket activo para ese evento.
6. La cantidad solicitada no supera los cupos disponibles.

**Regla de capacidad:**

```text
cuposOcupados = SUM(quantity de tickets con status confirmed o pending)
cuposDisponibles = Event.capacity - cuposOcupados
```

Los tickets `cancelled` no se incluyen en la suma. **`Event.capacity` representa la capacidad total y no se reduce con cada inscripción.** Cuando una inscripción se cancela, los cupos se liberan automáticamente al excluirla de la consulta de tickets activos.

### Consistencia transaccional

La creación y la cancelación utilizan transacciones de MongoDB a través de Mongoose. El servicio efectúa una escritura de coordinación sobre `Event.reservationRevision`, comprueba duplicados y disponibilidad y persiste el Ticket dentro de la transacción. Las escrituras concurrentes sobre el mismo evento provocan conflictos transaccionales, permitiendo revalidar la disponibilidad durante los reintentos correspondientes.

El índice único parcial agrega una segunda protección frente a duplicados activos. Esta solución fue probada con dos solicitudes simultáneas sobre un evento de un único cupo.

**Alcance pendiente de revisión:** al modificar la capacidad total mediante la actualización de eventos, conviene impedir que se reduzca por debajo de los cupos activos ya reservados. Esta validación es distinta de la reserva de nuevos cupos.

## 16. Emails de confirmación con Nodemailer

El proyecto utiliza `src/config/mail.config.js` para definir el transporte SMTP y `src/services/email.service.js` para construir y enviar el mensaje.

Variables requeridas (ver `.env.example`):

| Variable | Uso |
|---|---|
| `MAIL_HOST` | Servidor SMTP; para Gmail: `smtp.gmail.com` |
| `MAIL_PORT` | Puerto SMTP; para Gmail: `587` |
| `MAIL_USER` | Dirección de Gmail remitente |
| `MAIL_PASS` | Contraseña de aplicación de Google |
| `MAIL_FROM` | Remitente visible del correo |

La cuenta Gmail debe tener habilitada la verificación en dos pasos para crear una contraseña de aplicación cuando esta opción esté disponible.

La notificación incluye título del evento, `reservationCode`, `quantity` y estado confirmado. Se inicia **después de que la transacción se confirma**. El proceso de correo es asíncrono: si el SMTP falla, el Ticket permanece creado y la solicitud HTTP no espera el envío. El error se registra en la consola del servidor.

**Límite de esta implementación:** el envío es de tipo *best effort*; no existe todavía una cola persistente de reintentos. Si el servidor se interrumpe inmediatamente después de guardar el ticket, el email podría no enviarse.

Para verificar la conexión SMTP sin enviar un email:

```bash
node --env-file=.env --input-type=module -e 'import transporter from "./src/config/mail.config.js"; await transporter.verify(); console.log("SMTP OK")'
```

Para comprobar la recepción real se debe inscribir un usuario con una dirección de correo accesible y revisar la bandeja de entrada. Las direcciones `@example.com` usadas en otras pruebas no son buzones reales de recepción.

## 17. Pruebas de tickets (Pre-entrega 7)

Se realizaron las siguientes comprobaciones con Postman y MongoDB Atlas:

| Escenario | Respuesta o efecto esperado |
|---|---|
| Crear ticket en evento publicado y futuro | `201 Created` y ticket `confirmed` |
| Solicitud sin sesión | `401 Unauthorized` |
| Evento inexistente | `404 Not Found` |
| Evento cancelado (`cancelled`) | `409 Conflict` |
| Evento finalizado (`finished`) | `409 Conflict` |
| Evento publicado cuya fecha ya pasó | `409 Conflict` |
| `quantity` mayor que los cupos disponibles | `409 Conflict` |
| Usuario con inscripción activa duplicada | `409 Conflict` |
| Consultar tickets propios | `200 OK` con `populate` de evento |
| Cancelar ticket propio | `200 OK`, estado `cancelled`, `cancelledAt` |
| Segunda cancelación | `409 Conflict` |
| Usuario intenta cancelar ticket ajeno | `403 Forbidden` |
| `user` consulta tickets de un evento | `403 Forbidden` |
| `organizer` consulta tickets de evento ajeno | `403 Forbidden` |
| `organizer` consulta tickets de evento propio | `200 OK` |
| `admin` consulta tickets de cualquier evento | `200 OK` |
| Reinscripción después de cancelar | Nuevo ticket `confirmed`; se mantiene el anterior `cancelled` |
| Envío de confirmación con Gmail SMTP | Email enviado tras confirmación del ticket |

### Prueba de concurrencia

El script `scripts/test-concurrencia.mjs` inicia **dos inscripciones simultáneas** para un evento de prueba `published` con **un cupo disponible**. Verifica la cantidad de tickets activos y los cupos ocupados al finalizar.

```bash
node --env-file=.env scripts/test-concurrencia.mjs
```

**Resultado observado:** un usuario obtuvo la inscripción; el otro recibió el error `Cupos insuficientes. Disponibles: 0`; quedó un ticket activo, un cupo ocupado y cero disponibles. El script informó `PRUEBA SUPERADA: no hubo sobreventa`.

**Precaución:** el script contiene IDs de prueba y **crea inscripciones reales en la base de datos configurada**. Requiere un evento preparado con exactamente un cupo libre y usuarios de prueba válidos; no debe ejecutarse repetidamente sobre el mismo evento sin restaurar los datos. También intenta enviar el correo de confirmación correspondiente.

## 18. Entrega

La Pre-entrega 7 se publicará en un repositorio público e independiente de GitHub, conservando el historial de pre-entregas anteriores.

Archivos requeridos:

- `package.json`
- `package-lock.json`
- `.gitignore`
- `.env.example`
- `README.md`
- Código fuente dentro de `src/`
- Script de concurrencia en `scripts/`

No se incluyen `.env`, `node_modules`, credenciales ni datos privados.

**Repositorio de Pre-entrega 7:** pendiente de crear y verificar en GitHub. Actualizar esta línea con el enlace público definitivo antes de entregar.

---

Proyecto desarrollado como parte de **PBE II — Diseño y Arquitectura Backend, Coderhouse**.