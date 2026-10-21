import mongoose from "mongoose";

import Event from "../src/models/Event.js";
import Ticket from "../src/models/Ticket.js";

import {
  createTicket
} from "../src/services/tickets.service.js";

const eventId = "6ad8b11838d57382a07eb66f";

const userA = "6ad8303657f21fe0c23d54be";
const userB = "6ad8910ce3eadcd6ec41e40e";

try {
  await mongoose.connect(process.env.MONGO_URL);

  const event = await Event.findById(eventId);

  if (!event) {
    throw new Error("Evento de prueba no encontrado");
  }

  const occupiedBefore = await Ticket.aggregate([
    {
      $match: {
        event: new mongoose.Types.ObjectId(eventId),
        status: { $in: ["confirmed", "pending"] }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$quantity" }
      }
    }
  ]);

  const available =
    event.capacity - (occupiedBefore[0]?.total ?? 0);

  if (event.status !== "published" || available !== 1) {
    throw new Error(
      "La prueba requiere un evento publicado con un cupo libre"
    );
  }

  console.log("Iniciando inscripciones simultáneas...");

  const results = await Promise.allSettled([
    createTicket({
      userId: userA,
      eventId,
      quantity: 1
    }),
    createTicket({
      userId: userB,
      eventId,
      quantity: 1
    })
  ]);

  results.forEach((result, index) => {
    const usuario = index === 0 ? "A" : "B";

    if (result.status === "fulfilled") {
      console.log(
        `Usuario ${usuario}: CONFIRMADO`
      );
    } else {
      console.log(
        `Usuario ${usuario}: RECHAZADO -`,
        result.reason.message
      );
    }
  });

  const activeTickets = await Ticket.find({
    event: eventId,
    status: { $in: ["confirmed", "pending"] }
  });

  const occupied = activeTickets.reduce(
    (total, ticket) => total + ticket.quantity,
    0
  );

  console.log("Tickets activos:", activeTickets.length);
  console.log("Cupos ocupados:", occupied);
  console.log("Cupos disponibles:", event.capacity - occupied);

  const successful = results.filter(
    (result) => result.status === "fulfilled"
  ).length;

  if (successful === 1 && occupied === 1) {
    console.log("PRUEBA SUPERADA: no hubo sobreventa");
  } else {
    console.error("PRUEBA FALLIDA: revisar concurrencia");
    process.exitCode = 1;
  }
} catch (error) {
  console.error("Error de prueba:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}