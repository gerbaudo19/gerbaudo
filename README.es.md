# Gerbaudo

[![npm version](https://img.shields.io/npm/v/@gerbaudo/cli?color=blue)](https://www.npmjs.com/package/@gerbaudo/cli)
[![CI](https://github.com/gerbaudo19/gerbaudo/actions/workflows/ci.yml/badge.svg)](https://github.com/gerbaudo19/gerbaudo/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@gerbaudo/cli)](LICENSE)
[![Node](https://img.shields.io/node/v/@gerbaudo/cli)](https://nodejs.org)

**Instrumentación de APIs para backends Express desde la terminal** — descubre rutas, intercepta tráfico y ejecuta endpoints, todo desde tu terminal.

---

## Inicio rápido

```sh
# Instalar en tu proyecto Express
npx @gerbaudo/cli init

# Iniciar el daemon
npx @gerbaudo/cli daemon

# Ejecutar cualquier endpoint
npx @gerbaudo/cli run GET /api/users
npx @gerbaudo/cli run POST /api/users --data '{"name":"John"}'
```

---

## Funcionalidades

- **Auto-descubrimiento** — detecta rutas Express al iniciar via el middleware SDK
- **Ejecución desde CLI** — invoca cualquier endpoint registrado con parámetros, cuerpo y cabeceras
- **Grabación de tráfico** — todas las solicitudes que pasan por tu backend son interceptadas y almacenadas
- **Persistencia SQLite** — sin base de datos externa; solicitudes, respuestas, códigos de estado y tiempos almacenados localmente
- **Historial de consultas** — inspecciona logs con filtros por método, estado, ruta y rango de fechas
- **Coincidencia de parámetros de ruta** — `/api/users/:id` coincide automáticamente con `/api/users/123`
- **Procesamiento por lotes** — el SDK acumula interceptaciones (cada 2s o 50 registros) con protección de concurrencia
- **No intrusivo** — nunca interrumpe tu backend (try/catch en toda la instrumentación)

---

## Comandos CLI

| Comando            | Descripción                                          |
| ------------------ | ---------------------------------------------------- |
| `daemon`           | Inicia el servidor daemon                            |
| `init` / `install` | Instala Gerbaudo en el proyecto actual               |
| `endpoints`        | Lista los endpoints descubiertos                     |
| `run <ruta>`       | Ejecuta un endpoint                                  |
| `log [endpoint]`   | Consulta el historial de solicitudes                 |
| `stats`            | Muestra estadísticas de uso de la API                |
| `export`           | Exporta el esquema de la API (OpenAPI) a YAML o JSON |

Ejecuta `npx @gerbaudo/cli <comando> --help` para la referencia completa de opciones.

---

## SDK

```ts
import { gerbaudo } from '@gerbaudo/sdk-node'
import express from 'express'

const app = express()
app.use(gerbaudo({ app }))
```

El SDK:

- Descubre todas las rutas Express via `app._router.stack`
- Las registra en el catálogo del daemon
- Intercepta cada solicitud/respuesta (método, ruta, estado, cabeceras, cuerpo, duración)
- Acumula y envía por lotes los registros al daemon

### Opciones

```ts
app.use(
  gerbaudo({
    app, // App Express (para descubrimiento de rutas)
    daemonUrl: 'http://127.0.0.1:9876', // por defecto
    batchInterval: 2000, // intervalo de envío en ms (por defecto: 2000)
    batchSize: 50, // tamaño máximo del lote (por defecto: 50)
  }),
)
```

---

## API del Daemon

El daemon escucha en `http://127.0.0.1:9876` y sirve estas rutas:

| Método | Ruta                    | Descripción                                     |
| ------ | ----------------------- | ----------------------------------------------- |
| `GET`  | `/api/catalog`          | Lista todos los endpoints registrados           |
| `POST` | `/api/catalog/register` | Registra o actualiza un endpoint                |
| `POST` | `/api/intercept/record` | Registra una solicitud interceptada             |
| `GET`  | `/api/records`          | Consulta registros de interceptación            |
| `GET`  | `/api/records/:id`      | Obtiene un registro individual                  |
| `GET`  | `/api/stats`            | Obtiene estadísticas de uso                     |
| `GET`  | `/api/agent/endpoints`  | Obtiene endpoints en formato agente             |
| `POST` | `/api/agent/exec`       | Obtiene instrucción de reenvío para un endpoint |

---

## Configuración

`gerbaudo.json` (creado automáticamente por `gerbaudo init`):

```json
{
  "daemonPort": 9876,
  "dbPath": ".gerbaudo/data.db",
  "backendUrl": "http://127.0.0.1:3000"
}
```

La búsqueda de configuración asciende desde el directorio actual (hasta 10 niveles).

---

## Desarrollo

### Requisitos previos

- Node.js 18+
- npm

### Instalación

```sh
cd cli
npm install
npm run build

cd ../sdk/node
npm install
npm run build
```

### Ejecutar en modo desarrollo

```sh
cd cli
npm run dev daemon            # inicia daemon con tsx (sin compilar)
npm run dev endpoints         # lista endpoints
npm run dev run /api/users    # ejecuta endpoint
```

### Pruebas

```sh
cd cli && npm test             # 49 pruebas unitarias (vitest)
cd sdk/node && npm test        # 7 pruebas unitarias
npx tsx test-integration.ts    # prueba de integración (desde la raíz)
```

---

## Notas de arquitectura

- **Solo ESM** — ambos paquetes usan `"type": "module"`; todos los imports usan extensión `.js`
- **SQLite** via `better-sqlite3` (síncrono), modo WAL, migración automática
- **UUID v4** para claves primarias; `snake_case` en la BD ↔ `camelCase` en TypeScript
- **Daemon** se vincula solo a `127.0.0.1`; sirve rutas `/api/*` via Express
- **SDK** no tiene dependencias en tiempo de ejecución (`@types/express` es solo desarrollo); usa `fetch` nativo
- **API de agente** existen stubs (`/api/agent/*`) pero el enrutamiento AI aún no está implementado

---

## Licencia

MIT
