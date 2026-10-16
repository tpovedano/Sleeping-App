# Luna · Diario de sueño

Aplicación web para registrar **siestas** y **sueño nocturno** y analizar tendencias para encontrar los horarios que mejor sientan.

- **Landing con contraseña** (`/`): acceso privado con una única contraseña (`APP_PASSWORD`) y cookie de sesión firmada (30 días).
- **Registro** (`/registro`): tipo (siesta/noche), inicio de la rutina, hora de dormirse, hora de despertar (vacía = aún duerme), humor antes y después (1‒5), acompañamiento (varias opciones + texto libre) y notas. Se puede editar, borrar y marcar «Despertó» en un sueño en curso.
- **Estadísticas** (`/estadisticas`): dashboard con selector de 1, 2, 3 o 4 semanas:
  - KPIs de hoy (sueño total, última noche, siestas, humor) comparados con la media del periodo.
  - Medias del periodo: hora de dormirse/despertarse, sueño/día, siestas/día, rutina, humor antes → después.
  - **Mejores horarios y hallazgos** generados automáticamente (mejor franja para la noche y la siesta, ventana de vigilia ideal, duración de rutina más eficaz, acompañamiento con el que se duerme antes, tendencia semanal y regularidad del horario).
  - Horas de sueño por día (noche + siestas, con línea de media y vista de tabla).
  - Patrón de sueño: mapa de 24 h por día.
  - Comparativa semana a semana (6 métricas).
  - Humor al despertar según hora de dormir, hora de siesta, tiempo despierto previo y duración de la rutina.
  - Tabla de acompañamiento.

> Cómo se cuenta un día: **noche anterior + siestas del día** (la noche se atribuye al día en que termina).

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · Tailwind CSS 4 · Recharts · Neon Postgres (`@neondatabase/serverless`) · Lucide icons.
Diseño basado en el design system que genera [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) para una app de sueño/bienestar: estilo *Dark Mode (OLED)*, índigo nocturno + violeta, tipografías Lora / Raleway. Los colores de las gráficas están validados para daltonismo y contraste.

## Desplegar en Vercel con Neon

1. Importa este repositorio en Vercel (framework: Next.js, sin configuración extra).
2. En el proyecto de Vercel → **Storage** → **Create Database** → **Neon (Postgres)** y conéctala al proyecto. Esto crea automáticamente `DATABASE_URL`.
3. En **Settings → Environment Variables** añade:
   - `APP_PASSWORD` – la contraseña de acceso.
   - `AUTH_SECRET` – una cadena larga aleatoria (p. ej. `openssl rand -base64 32`).
   - `APP_TIMEZONE` – opcional, por defecto `Europe/Madrid`.
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
