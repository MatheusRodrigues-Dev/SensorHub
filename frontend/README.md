# SensorHub React SPA

The React app provides registration, login, session restoration, Device and
Sensor management (including archived history), credential management,
paginated Measurement history, a current-page chart, and logout. The optional
Docker simulator is in `simulator/`.

Run through Docker from the repository root:

```bash
docker compose up -d
docker compose exec frontend npm test
docker compose exec frontend npm run build
docker compose exec frontend npm run lint
```

Open `http://localhost` through Nginx. The root `.env` supplies
`VITE_API_URL=/api/v1` by default so API and SPA requests share an origin.
See `docs/development.md` for the Sanctum cookie/CSRF flow and application
structure. TanStack Query owns domain server state while Auth Context owns
the browser session. Recharts is loaded only on Measurement history screens.
