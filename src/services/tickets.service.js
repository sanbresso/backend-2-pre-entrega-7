import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

import {
  lockEventForReservation,
  findEventById
} from "../repositories/events.repository.js";

import User from "../models/User.js";
import { sendTicketConfirmation } from "./email.service.js";

import {
  findActiveTicket,
  countOccupiedSlots,
  insertTicket,
  findTicketsByUser,
  findTicketById,
  cancelActiveTicket,
  findTicketsByEvent
} from "../repositories/tickets.repository.js";

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const validateQuantity = (quantity) => {
  if (
    !Number.isSafeInteger(quantity) ||
    quantity <= 0
  ) {
    throw createHttpError(
      400,
      "La cantidad debe ser un número entero mayor a 0"
    );
  }

  return quantity;
};

const validateEvent = (event) => {
  if (!event) {
    throw createHttpError(404, "Evento no encontrado");
  }

  if (event.status !== "published") {
    throw createHttpError(
      409,
      "El evento no está disponible para inscripciones"
    );
  }

  if (
    !event.date ||
    Number.isNaN(event.date.getTime()) ||
    event.date <= new Date()
  ) {
    throw createHttpError(
      409,
      "El evento ya comenzó o finalizó"
    );
  }
};

export async function createTicket({
  userId,
  eventId,
  quantity
}) {
  if (!mongoose.isObjectIdOrHexString(userId)) {
    throw createHttpError(401, "Usuario inválido");
  }

  if (!mongoose.isObjectIdOrHexString(eventId)) {
    throw createHttpError(400, "ID de evento inválido");
  }

  const validQuantity = validateQuantity(quantity);

  const { ticket, eventTitle } =
    await mongoose.connection.transaction(async (session) => {

      const event = await lockEventForReservation(
        eventId,
        { session }
      );

      validateEvent(event);

      const existingTicket = await findActiveTicket(
        userId,
        eventId,
        { session }
      );

      if (existingTicket) {
        throw createHttpError(
          409,
          "El usuario ya tiene una inscripción activa"
        );
      }

      const occupiedSlots = await countOccupiedSlots(
        eventId,
        { session }
      );

      const availableSlots = event.capacity - occupiedSlots;

      if (availableSlots < validQuantity) {
        throw createHttpError(
          409,
          `Cupos insuficientes. Disponibles: ${availableSlots}`
        );
      }

      const ticketData = {
        user: userId,
        event: eventId,
        status: "confirmed",
        quantity: validQuantity,
        reservationCode: `TCK-${randomUUID()}`
      };

      const ticket = await insertTicket(
        ticketData,
        { session }
      );

      return {
        ticket,
        eventTitle: event.title
      };
    });

  void (async () => {
    const user = await User.findById(userId)
      .select("email")
      .lean();

    if (!user?.email) {
      throw new Error(
        "Usuario sin email para notificaciones"
      );
    }

    await sendTicketConfirmation({
      to: user.email,
      eventTitle,
      reservationCode: ticket.reservationCode,
      quantity: ticket.quantity
    });

    console.log(
      "Email de confirmación enviado correctamente"
    );
  })().catch((error) => {
    console.error(
      "No se pudo enviar el email de confirmación:",
      error.message
    );
  });

  return ticket;
}

export async function getMyTickets(userId) {
  if (!mongoose.isObjectIdOrHexString(userId)) {
    throw createHttpError(
      401,
      "Usuario inválido"
    );
  }

  return findTicketsByUser(userId);
}

export async function cancelTicket({
  ticketId,
  userId,
  role
}) {
  if (!mongoose.isObjectIdOrHexString(ticketId)) {
    throw createHttpError(400, "ID de ticket inválido");
  }

  if (!mongoose.isObjectIdOrHexString(userId)) {
    throw createHttpError(401, "Usuario inválido");
  }

  return mongoose.connection.transaction(async (session) => {

    const ticket = await findTicketById(
      ticketId,
      { session }
    );

    if (!ticket) {
      throw createHttpError(404, "Ticket no encontrado");
    }

    const isOwner = ticket.user.toString() === userId;
    const isAdmin = role === "admin";

    if (!isOwner && !isAdmin) {
      throw createHttpError(
        403,
        "No tenés permisos para cancelar este ticket"
      );
    }

    if (ticket.status === "cancelled") {
      throw createHttpError(
        409,
        "El ticket ya está cancelado"
      );
    }

    if (!["confirmed", "pending"].includes(ticket.status)) {
      throw createHttpError(
        409,
        "El ticket no se encuentra activo"
      );
    }

    const event = await lockEventForReservation(
      ticket.event,
      { session }
    );

    if (!event) {
      throw createHttpError(
        409,
        "El evento asociado ya no está disponible"
      );
    }

    const cancelledTicket = await cancelActiveTicket(
      ticketId,
      { session }
    );

    if (!cancelledTicket) {
      throw createHttpError(
        409,
        "No se pudo cancelar el ticket"
      );
    }

    return cancelledTicket;
  });
}

export async function getEventTickets({
  eventId,
  userId,
  role
}) {
  if (!mongoose.isObjectIdOrHexString(eventId)) {
    throw createHttpError(
      400,
      "ID de evento inválido"
    );
  }

  const event = await findEventById(eventId);

  if (!event) {
    throw createHttpError(
      404,
      "Evento no encontrado"
    );
  }

  const isAdmin = role === "admin";

  const isOwner =
    role === "organizer" &&
    event.organizer?.toString() === userId;

  if (!isAdmin && !isOwner) {
    throw createHttpError(
      403,
      "No tenés permisos para consultar los tickets de este evento"
    );
  }

  return findTicketsByEvent(eventId);
}