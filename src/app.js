import express from "express";
import cookieParser from "cookie-parser";
import passport from "./config/passport.config.js";

import healthRouter from "./routes/health.router.js";
import eventsRouter from "./routes/events.router.js";
import sessionsRouter from "./routes/sessions.router.js";
import adminRouter from "./routes/admin.router.js";
import errorHandler from "./middlewares/error.middleware.js";
import ticketsRouter from "./routes/tickets.router.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(passport.initialize());

app.use("/api/health", healthRouter);
app.use("/api/events", eventsRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/tickets", ticketsRouter);

app.use(errorHandler);

export default app;