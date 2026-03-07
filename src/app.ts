import express from "express";
import { matchRoutes } from "./interfaces/http/match.routes";
import { deckRoutes } from "./interfaces/http/deck.routes";
import { errorMiddleware } from "./interfaces/http/error.middleware";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use("/api", matchRoutes);
  app.use("/api", deckRoutes);
  app.use(errorMiddleware);

  return app;
}
