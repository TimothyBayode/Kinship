import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createRepository } from "./repository.js";

async function main() {
  const config = loadConfig();
  const repository = createRepository(config);
  const app = await buildApp(config, repository);

  try {
    await app.listen({ host: config.API_HOST, port: config.API_PORT });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
