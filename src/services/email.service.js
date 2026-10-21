import transporter from "../config/mail.config.js";

export async function sendTicketConfirmation({
  to,
  eventTitle,
  reservationCode,
  quantity
}) {
  if (!to || typeof to !== "string") {
    throw new Error("El email del destinatario es obligatorio");
  }

  if (!process.env.MAIL_FROM) {
    throw new Error("MAIL_FROM no está configurado");
  }

  const mailOptions = {
    from: process.env.MAIL_FROM,
    to,
    subject: `Confirmación de inscripción - ${eventTitle}`,
    text: `
¡Tu inscripción fue confirmada!

Evento: ${eventTitle}
Código de reserva: ${reservationCode}
Cantidad de entradas: ${quantity}
Estado: Confirmada

Guardá este código para futuras consultas.

Gracias por utilizar nuestra Plataforma de Eventos e Inscripciones.
    `.trim()
  };

  const info = await transporter.sendMail(mailOptions);

  return {
    messageId: info.messageId
  };
}