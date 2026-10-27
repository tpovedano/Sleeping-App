# LetSleep · Diario de sueño

Aplicación web para registrar **siestas** y **sueño nocturno** y analizar tendencias para encontrar los horarios que mejor sientan.

- **Landing con contraseña** (`/`): acceso privado con una única contraseña (`APP_PASSWORD`) y cookie de sesión firmada de 1 año que se renueva sola con el uso.
- **Registro** (`/registro`):
  - Siesta o noche; inicio de la rutina (o «No hubo rutina»), hora de dormirse y de despertar (vacía = aún duerme; «Aún duerme» borra un despertar puesto por error).
  - Humor antes y después (1‒5), **acompañamiento** (varias opciones) y **dónde durmió** (Cama, Colecho, Cochecito, Carro, Casa abuelos u otro lugar). Las opciones personalizadas que se usan quedan disponibles para siguientes registros.
  - **Despertares** en noches y siestas: hora, duración aproximada y cómo se volvió a dormir (sola/o o con qué ayuda). El tiempo despierto se descuenta del sueño.
  - Noche: el último despertar se puede marcar como **«No volvió a dormirse»**; entonces dura hasta la hora de despertar, que pasa a ser la hora en que **salió del cuarto**. Campo opcional de **despertar dramático** (se abren las cortinas y empieza el día).
  - Siesta: igual que la noche, el último despertar puede ser «No volvió a dormirse», y hay un 4.º punto opcional **Fin de la siesta** (ya despierta/o) desde el que se calcula la siguiente siesta.
  - **Siesta fallida**: si no llegó a dormirse se registra el intento (inicio y fin) y se puede registrar otro intento a continuación.
  - Una siesta solo se puede registrar si la noche anterior está completa (con hora de despertar).
  - Muestra la **próxima siesta recomendada** según las ventanas de vigilia de referencia.
- **Referencias** (`/referencias`): parámetros objetivo contra los que se comparan las estadísticas (en esta PoC son fijos, definidos en `lib/references.ts`): siestas de 2–3 h al día; ventanas de vigilia de 2 h, 2 h 30, 2 h 30 y 2 h (despertar → 1ª siesta → … → 4ª); ninguna siesta después de las 17:00; no levantarse antes de las 06:00.
- **Estadísticas** (`/estadisticas`): dashboard con selector de 1, 2, 3 o 4 semanas:
  - KPIs de hoy (sueño total, última noche, siestas, humor) comparados con la media del periodo.
  - Medias del periodo: hora de dormirse/despertarse, sueño/día, siestas/día, rutina, humor antes → después.
  - **Mejores horarios y hallazgos** generados automáticamente (mejor franja para la noche y la siesta, ventana de vigilia ideal, duración de rutina más eficaz, acompañamiento con el que se duerme antes, tendencia semanal y regularidad del horario).
  - Horas de sueño por día (noche + siestas, con línea de media y vista de tabla).
  - Patrón de sueño: mapa de 24 h por día.
  - Comparativa semana a semana (6 métricas).
  - Humor al despertar según hora de dormir, hora de siesta, tiempo despierto previo y duración de la rutina.
  - Tabla de acompañamiento.
  - **Comparación con las referencias**: ventanas de vigilia reales frente al objetivo, tiempo de siesta por día frente a la franja de 2–3 h, siestas tardías y despertares tempranos.
  - Despertares nocturnos: media por noche, tiempo despierto y huecos en el patrón de sueño.
  - ¿Cómo fueron las siestas?: de corrido, con despertares sin ayuda, con ayuda o fallidas.
  - Tabla de «Dónde durmió».

> Cómo se cuenta un día: **siestas del día + la noche que empieza ese día** (una noche que empieza pasada la medianoche, p. ej. a las 00:30, sigue contando para el día anterior).

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · Tailwind CSS 4 · Recharts · Neon Postgres (`@neondatabase/serverless`) · Lucide icons.
Diseño basado en el design system que genera [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) para una app de sueño/bienestar: estilo *Dark Mode (OLED)*, índigo nocturno + violeta, tipografías Lora / Raleway. Los colores de las gráficas están validados para daltonismo y contraste.

## Desplegar en Vercel con Neon

1. Importa este repositorio en Vercel (framework: Next.js, sin configuración extra).
2. En el proyecto de Vercel → **Storage** → **Create Database** → **Neon (Postgres)** y conéctala al proyecto. Esto crea automáticamente `DATABASE_URL`.
3. En **Settings → Environment Variables** añade:
   - `APP_PASSWORD` – la contraseña de acceso.
   - `AUTH_SECRET` – una cadena larga aleatoria (p. ej. `openssl rand -base64 32`).
   - `APP_TIMEZONE` – opcional, por defecto `America/Costa_Rica` (hora de Centroamérica, UTC−6).
4. Redeploy. La tabla `sleep_sessions` se crea sola en la primera petición (también puedes ejecutar `npm run db:migrate` con `DATABASE_URL` definida; el esquema está en `db/schema.sql`).

Cambiar `APP_PASSWORD` invalida todas las sesiones abiertas.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # rellena DATABASE_URL para usar Neon
npm run dev
```

Sin `DATABASE_URL`, en desarrollo la app usa un **modo demo** en memoria con 4 semanas de datos de ejemplo y la contraseña `dormir`. En producción `APP_PASSWORD` y `DATABASE_URL` son obligatorias.

```bash
npm test        # tests de la lógica de estadísticas
npm run lint    # comprobación de tipos
npm run build
```
