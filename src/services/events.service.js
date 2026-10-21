import mongoose from "mongoose";

import {
  findEvents,
  countEvents,
  findEventById,
  insertEvent,
  saveEvent,
  lockEventForReservation
} from "../repositories/events.repository.js";

import {
  countOccupiedSlots
} from "../repositories/tickets.repository.js";

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const validateText = (value, field) => {
  if (typeof value !== "string" || !value.trim()) {
    throw createHttpError(
      400,
      `El campo ${field} es obligatorio`
    );
  }

  return value.trim();
};

const validateDate = (value) => {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw createHttpError(400, "La fecha es inválida");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createHttpError(400, "La fecha es inválida");
  }

  if (date.getTime() <= Date.now()) {
    throw createHttpError(
      400,
      "No se pueden crear o establecer eventos con fecha pasada"
    );
  }

  return date;
};

const validateCapacity = (capacity) => {
  if (
    !Number.isInteger(capacity) ||
    capacity <= 0
  ) {
    throw createHttpError(
      400,
      "La capacidad debe ser un número entero mayor a 0"
    );
  }

  return capacity;
};

const validatePrice = (price) => {
  if (
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    throw createHttpError(
      400,
      "El precio debe ser un número mayor o igual a 0"
    );
  }

  return price;
};

const validStatuses = [
  "draft",
  "published",
  "cancelled",
  "finished"
];

export async function listEvents(query = {}, user = null) {
  const {
    status,
    category,
    location,
    dateFrom,
    dateTo,
    page = 1,
    limit = 10,
    sort = "date"
  } = query;

  const currentPage = Number(page);
  const pageSize = Number(limit);

  if (
    !Number.isInteger(currentPage) ||
    currentPage < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  ) {
    throw createHttpError(
      400,
      "Los parámetros page y limit deben ser enteros positivos; limit no puede superar 100"
    );
  }

  if (
    status !== undefined &&
    (
      typeof status !== "string" ||
      !validStatuses.includes(status)
    )
  ) {
    throw createHttpError(400, "Estado de evento inválido");
  }

  const isAdmin = user?.role === "admin";
  const isOrganizer = user?.role === "organizer";

  let filters;

  if (isAdmin) {
    filters = status ? { status } : {};
  } else if (isOrganizer) {
    if (!mongoose.isObjectIdOrHexString(user.id)) {
      throw createHttpError(401, "Usuario inválido");
    }

    const visibility = {
      $or: [
        { status: "published" },
        { organizer: user.id }
      ]
    };

    filters = status
      ? { $and: [visibility, { status }] }
      : visibility;
  } else {
    if (status && status !== "published") {
      throw createHttpError(
        403,
        "No tenés permisos para consultar ese estado"
      );
    }

    filters = { status: "published" };
  }

  if (category !== undefined) {
    filters.category = validateText(category, "category");
  }

  if (location !== undefined) {
    const locationText = validateText(
      location,
      "location"
    );

    const escapedLocation = locationText.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    filters.location = {
      $regex: escapedLocation,
      $options: "i"
    };
  }

  if (dateFrom !== undefined || dateTo !== undefined) {
    filters.date = {};

    if (dateFrom !== undefined) {
      if (
        typeof dateFrom !== "string" ||
        !dateFrom.trim()
      ) {
        throw createHttpError(400, "dateFrom es inválida");
      }

      const from = new Date(dateFrom);

      if (Number.isNaN(from.getTime())) {
        throw createHttpError(400, "dateFrom es inválida");
      }

      filters.date.$gte = from;
    }

    if (dateTo !== undefined) {
      if (
        typeof dateTo !== "string" ||
        !dateTo.trim()
      ) {
        throw createHttpError(400, "dateTo es inválida");
      }

      const to = new Date(dateTo);

      if (Number.isNaN(to.getTime())) {
        throw createHttpError(400, "dateTo es inválida");
      }

      filters.date.$lte = to;
    }

    if (
      filters.date.$gte &&
      filters.date.$lte &&
      filters.date.$gte > filters.date.$lte
    ) {
      throw createHttpError(
        400,
        "dateFrom no puede ser posterior a dateTo"
      );
    }
  }

  const allowedSortFields = [
    "date",
    "price",
    "title",
    "createdAt"
  ];

  if (typeof sort !== "string") {
    throw createHttpError(
      400,
      "Campo de ordenamiento inválido"
    );
  }

  const descending = sort.startsWith("-");
  const sortField = descending ? sort.slice(1) : sort;

  if (!allowedSortFields.includes(sortField)) {
    throw createHttpError(
      400,
      "Campo de ordenamiento inválido"
    );
  }

  const sortOptions = {
    [sortField]: descending ? -1 : 1,
    _id: 1
  };

  const skip = (currentPage - 1) * pageSize;

  const [events, total] = await Promise.all([
    findEvents(filters, {
      skip,
      limit: pageSize,
      sort: sortOptions
    }),
    countEvents(filters)
  ]);

  return {
    data: events,
    page: currentPage,
    limit: pageSize,
    total,
    totalPages: Math.ceil(total / pageSize)
  };
}

export async function getEventById(id, user = null) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw createHttpError(400, "ID de evento inválido");
  }

  const event = await findEventById(id);

  if (!event) {
    throw createHttpError(404, "Evento no encontrado");
  }

  const isPublished = event.status === "published";
  const isAdmin = user?.role === "admin";

  const isOwner =
    user?.role === "organizer" &&
    event.organizer.toString() === user.id;

  if (!isPublished && !isAdmin && !isOwner) {
    throw createHttpError(404, "Evento no encontrado");
  }

  return event;
}

export async function createEvent(eventData = {}, userId) {
  if (
    !eventData ||
    typeof eventData !== "object" ||
    Array.isArray(eventData)
  ) {
    throw createHttpError(400, "Datos de evento inválidos");
  }

  if (Object.hasOwn(eventData, "organizer")) {
    throw createHttpError(
      400,
      "El organizador se asigna automáticamente"
    );
  }

  if (Object.hasOwn(eventData, "status")) {
    throw createHttpError(
      400,
      "El estado inicial se asigna automáticamente"
    );
  }

  if (!mongoose.isObjectIdOrHexString(userId)) {
    throw createHttpError(
      400,
      "Identificador de organizador inválido"
    );
  }

  const newEventData = {
    title: validateText(eventData.title, "title"),
    description: validateText(
      eventData.description,
      "description"
    ),
    category: validateText(
      eventData.category,
      "category"
    ),
    location: validateText(
      eventData.location,
      "location"
    ),
    date: validateDate(eventData.date),
    capacity: validateCapacity(eventData.capacity),
    price: validatePrice(eventData.price),
    organizer: userId,
    status: "draft"
  };

  return insertEvent(newEventData);
}

export async function updateEvent(event, updateData = {}) {
  if (event.status === "cancelled") {
    throw createHttpError(
      409,
      "No se pueden modificar eventos cancelados"
    );
  }

  if (event.status === "finished") {
    throw createHttpError(
      409,
      "No se pueden modificar eventos finalizados"
    );
  }

  if (
    !updateData ||
    typeof updateData !== "object" ||
    Array.isArray(updateData)
  ) {
    throw createHttpError(
      400,
      "Datos de actualización inválidos"
    );
  }

  const allowedFields = [
    "title",
    "description",
    "category",
    "location",
    "date",
    "capacity",
    "price"
  ];

  const fields = Object.keys(updateData);

  if (fields.length === 0) {
    throw createHttpError(
      400,
      "No se proporcionaron campos para actualizar"
    );
  }

  for (const field of fields) {
    if (!allowedFields.includes(field)) {
      throw createHttpError(
        400,
        `No está permitido modificar el campo ${field}`
      );
    }
  }

  const updates = {};

  for (const field of fields) {
    const value = updateData[field];

    if (
      ["title", "description", "category", "location"]
        .includes(field)
    ) {
      updates[field] = validateText(value, field);
    }

    if (field === "date") {
      updates.date = validateDate(value);
    }

    if (field === "capacity") {
      updates.capacity = validateCapacity(value);
    }

    if (field === "price") {
      updates.price = validatePrice(value);
    }
  }

  if (Object.hasOwn(updates, "capacity")) {
    return mongoose.connection.transaction(async (session) => {
      const currentEvent = await lockEventForReservation(
        event._id,
        { session }
      );

      if (!currentEvent) {
        throw createHttpError(404, "Evento no encontrado");
      }

      if (
        currentEvent.status === "cancelled" ||
        currentEvent.status === "finished"
      ) {
        throw createHttpError(
          409,
          "No se puede modificar un evento cancelado o finalizado"
        );
      }

      const occupied = await countOccupiedSlots(
        currentEvent._id,
        { session }
      );

      if (updates.capacity < occupied) {
        throw createHttpError(
          409,
          `No se puede reducir la capacidad a ${updates.capacity}. Hay ${occupied} cupos reservados`
        );
      }

      currentEvent.set(updates);

      return currentEvent.save({ session });
    });
  }

  event.set(updates);

  return saveEvent(event);

}

const allowedTransitions = {
  draft: ["published", "cancelled"],
  published: ["finished", "cancelled"],
  cancelled: [],
  finished: []
};

export async function changeEventStatus(event, newStatus) {
  if (typeof newStatus !== "string") {
    throw createHttpError(400, "El estado es obligatorio");
  }

  const status = newStatus.trim().toLowerCase();

  if (!validStatuses.includes(status)) {
    throw createHttpError(400, "Estado de evento inválido");
  }

  if (
    event.status === "cancelled" ||
    event.status === "finished"
  ) {
    throw createHttpError(
      409,
      "No se puede cambiar el estado de un evento cancelado o finalizado"
    );
  }

  if (!allowedTransitions[event.status]?.includes(status)) {
    throw createHttpError(
      409,
      `No se permite cambiar de ${event.status} a ${status}`
    );
  }

  if (status === "published" && event.date <= new Date()) {
    throw createHttpError(
      409,
      "No se puede publicar un evento cuya fecha ya pasó"
    );
  }

  if (status === "finished" && event.date > new Date()) {
    throw createHttpError(
      409,
      "No se puede finalizar un evento que todavía no comenzó"
    );
  }

  event.status = status;

  return saveEvent(event);
}