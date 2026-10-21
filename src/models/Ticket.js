import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El usuario es obligatorio"],
      immutable: true
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "El evento es obligatorio"],
      immutable: true
    },

    status: {
      type: String,
      enum: {
        values: ["confirmed", "pending", "cancelled"],
        message: "Estado de ticket no válido"
      },
      required: [true, "El estado es obligatorio"]
    },

    quantity: {
      type: Number,
      required: [true, "La cantidad es obligatoria"],
      min: [1, "La cantidad debe ser mayor a 0"],
      validate: {
        validator: Number.isInteger,
        message: "La cantidad debe ser un número entero"
      }
    },

    reservationCode: {
      type: String,
      required: [true, "El código de reserva es obligatorio"],
      unique: true,
      trim: true,
      immutable: true
    },

    cancelledAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

ticketSchema.index(
  { user: 1, event: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["confirmed", "pending"] }
    }
  }
);

const Ticket = mongoose.model("Ticket", ticketSchema);

export default Ticket;