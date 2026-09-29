# SensorHub React SPA

The React app provides registration, login, session restoration, account
identity, and logout. Device and Sensor screens are planned for Phase 9.

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
structure.
