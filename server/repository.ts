import type { AppConfig } from "./config.js";
import type { KinshipRepository } from "./domain.js";
import { HydraDbRepository } from "./repositories/hydradb.js";
import { MemoryRepository } from "./repositories/memory.js";

export function createRepository(config: AppConfig): KinshipRepository {
  return config.DATA_PROVIDER === "hydradb" ? new HydraDbRepository(config) : new MemoryRepository();
}
