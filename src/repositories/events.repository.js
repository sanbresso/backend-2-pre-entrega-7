import Event from "../models/Event.js";

export async function findEvents(
  filters = {},
  { skip = 0, limit = 10, sort = { date: 1 } } = {}
) {
  return Event.find(filters)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
}

export async function countEvents(filters = {}) {
  return Event.countDocuments(filters);
}

export async function findEventById(id) {
  return Event.findById(id);
}

export async function insertEvent(eventData) {
  return Event.create(eventData);
}

export async function saveEvent(event) {
  return event.save();
}

export async function lockEventForReservation(
  eventId,
  { session } = {}
) {
  return Event.findOneAndUpdate(
    { _id: eventId },
    {
      $inc: { reservationRevision: 1 }
    },
    {
  returnDocument: "after",
  session,
  runValidators: true
}
  );
}