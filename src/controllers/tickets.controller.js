import {
  createTicket as createTicketService,
  getMyTickets as getMyTicketsService,
  cancelTicket as cancelTicketService,
  getEventTickets as getEventTicketsService
} from "../services/tickets.service.js";

export async function createTicket(req, res, next) {
  try {
    const ticket = await createTicketService({
      userId: req.user.id,
      eventId: req.params.eid,
      quantity: req.body?.quantity
    });

    return res.status(201).json({
      status: "success",
      message: "Inscripción confirmada",
      payload: ticket
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMyTickets(req, res, next) {
  try {
    const tickets = await getMyTicketsService(
      req.user.id
    );

    return res.status(200).json({
      status: "success",
      message: "Tickets obtenidos correctamente",
      payload: tickets
    });
  } catch (error) {
    return next(error);
  }
}

export async function cancelTicket(req, res, next) {
  try {
    const ticket = await cancelTicketService({
      ticketId: req.params.tid,
      userId: req.user.id,
      role: req.user.role
    });

    return res.status(200).json({
      status: "success",
      message: "Inscripción cancelada correctamente",
      payload: ticket
    });
  } catch (error) {
    return next(error);
  }
}

export async function getEventTickets(req, res, next) {
  try {
    const tickets = await getEventTicketsService({
      eventId: req.params.eid,
      userId: req.user.id,
      role: req.user.role
    });

    return res.status(200).json({
      status: "success",
      message: "Tickets del evento obtenidos correctamente",
      payload: tickets
    });
  } catch (error) {
    return next(error);
  }
}