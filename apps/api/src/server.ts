import { createApp } from './app.ts';

const port = Number(process.env.API_PORT ?? 4100);
createApp().listen(port, () => console.log(`PerRound API on http://localhost:${port}`));
