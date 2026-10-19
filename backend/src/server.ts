import { app } from './app';
import { env } from './config/env';

app.listen(env.port, () => {
  console.info(`Club Lanús API listening on port ${env.port}`);
});
