import { app } from './app';
import { env } from './config/env';

if (!process.env.VERCEL) {
  app.listen(env.port, () => {
    console.info(`Club Lanús API listening on port ${env.port}`);
  });
}

export default app;
