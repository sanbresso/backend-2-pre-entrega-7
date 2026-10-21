import { Router } from "express";

import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  changeEventStatus
} from "../controllers/events.controller.js";

import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorize.middleware.js";
import { eventOwnership } from "../middlewares/eventOwnership.middleware.js";
import { optionalAuth } from "../middlewares/optionalAuth.middleware.js";
import {
  createTicket,
  getEventTickets
} from "../controllers/tickets.controller.js";

const router = Router();

router.get("/", optionalAuth, getEvents);

router.get("/:id", optionalAuth, getEventById);

router.post(
  "/",
  authMiddleware,
  authorizeRoles("organizer", "admin"),
  createEvent
);

router.put(
  "/:id",
  authMiddleware,
  eventOwnership,
  updateEvent
);

router.patch(
  "/:id/status",
  authMiddleware,
  eventOwnership,
  changeEventStatus
);

router.post(
  "/:eid/tickets",
  authMiddleware,
  createTicket
);

router.get(
  "/:eid/tickets",
  authMiddleware,
  authorizeRoles("organizer", "admin"),
  getEventTickets
);


export default router;