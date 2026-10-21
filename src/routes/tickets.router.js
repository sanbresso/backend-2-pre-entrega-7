import { Router } from "express";

import {
  getMyTickets,
  cancelTicket
} from "../controllers/tickets.controller.js";

import {
  authMiddleware
} from "../middlewares/auth.middleware.js";

const router = Router();

router.get(
  "/my-tickets",
  authMiddleware,
  getMyTickets
);

router.patch(
  "/:tid/cancel",
  authMiddleware,
  cancelTicket
);

export default router;