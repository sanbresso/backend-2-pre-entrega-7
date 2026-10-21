import mongoose from "mongoose";
import Ticket from "../models/Ticket.js";

const ACTIVE_STATUSES = ["confirmed", "pending"];

export async function findActiveTicket(
  userId,
  eventId,
  { session } = {}
) {
  return Ticket.findOne({
    user: userId,
    event: eventId,
    status: { $in: ACTIVE_STATUSES }
  }).session(session);
}

export async function countOccupiedSlots(
  eventId,
  { session } = {}
) {
  const result = await Ticket.aggregate([
    {
      $match: {
        event: new mongoose.Types.ObjectId(eventId),
        status: { $in: ACTIVE_STATUSES }
      }
    },
    {
      $group: {
        _id: null,
        occupied: { $sum: "$quantity" }
      }
    }
  ]).session(session);

  return result[0]?.occupied ?? 0;
}

export async function insertTicket(
  ticketData,
  { session } = {}
) {
  const [ticket] = await Ticket.create(
    [ticketData],
    { session }
  );

  return ticket;
}

export async function findTicketsByUser(userId) {
  return Ticket.find({ user: userId })
    .populate("event", "title date location")
    .sort({ createdAt: -1 })
    .lean();
}

export async function findTicketsByEvent(eventId) {
  return Ticket.find({ event: eventId })
    .sort({ createdAt: -1 })
    .lean();
}

export async function findTicketById(
  ticketId,
  { session } = {}
) {
  return Ticket.findById(ticketId).session(session);
}

export async function cancelActiveTicket(
  ticketId,
  { session } = {}
) {
  return Ticket.findOneAndUpdate(
    {
      _id: ticketId,
      status: { $in: ACTIVE_STATUSES }
    },
    {
      $set: {
        status: "cancelled",
        cancelledAt: new Date()
      }
    },
    {
  returnDocument: "after",
  runValidators: true,
  session
}
  );
}