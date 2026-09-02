import { app } from "./app";
import { env } from "./core/env";
import { logInfo } from "./core/logging";

logInfo("server", "Starting Tunnix control plane", { port: env.PORT });

export default {
  port: env.PORT,
  fetch: app.fetch,
};
