"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { createSession, deleteSession, requireAdmin } from "@/lib/auth";
import {
  buildConfirmationMessage,
  buildPatientGoogleCalendarUrl,
  buildPatientToEdwinConfirmMessage,
  formatAppointmentDate,
  formatAppointmentTime,
  formatMoney,
  whatsappLink,
} from "@/lib/format";
import { PAYMENT, PRACTICE, STATUS } from "@/lib/constants";
import { upsertCalendarEvent } from "@/lib/calendar";
import { normalizePhone, upsertPatient } from "@/lib/patients";
import { parseContactsCsv } from "@/lib/csv";
import { bogotaDateTime } from "@/lib/time";
import { isWhatsAppConfigured } from "@/lib/whatsapp";
import { getAppUrl } from "@/lib/app-url";
import {
  appointmentPublicPath,
  createAppointmentToken,
  createPaymentRef,
} from "@/lib/appointment-token";

async function notifyEdwin(input: {
  title: string;
  body: string;
  appointmentId?: string;
}) {
  await prisma.notification.create({
    data: {
      title: input.title,
      body: input.body,
      appointmentId: input.appointmentId,
    },
  });
}

async function syncCalendar(appt: {
  id: string;
  patientName: string;
  patientPhone: string;
  scheduledAt: Date;
  price: number;
  status: string;
  googleEventId?: string | null;
  service: { name: string };
  location: { address: string; neighborhood: string };
}) {
  try {
    const eventId = await upsertCalendarEvent({
      id: appt.id,
      patientName: appt.patientName,
      patientPhone: appt.patientPhone,
      scheduledAt: appt.scheduledAt,
      price: appt.price,
      status: appt.status,
      serviceName: appt.service.name,
      address: appt.location.address,
      neighborhood: appt.location.neighborhood,
      googleEventId: appt.googleEventId,
    });
    if (eventId && eventId !== appt.googleEventId) {
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { googleEventId: eventId },
      });
    }
  } catch (err) {
    console.error("Google Calendar error:", err);
  }
}

function rebuildMessage(input: {
  token: string;
  scheduledAt: Date;
  address: string;
  neighborhood: string;
  serviceName: string;
  price: number;
  patientName?: string;
}) {
  const appUrl = getAppUrl();
  return buildConfirmationMessage({
    ...input,
    confirmUrl: `${appUrl}${appointmentPublicPath(input.token)}`,
  });
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return { error: "Correo o contraseña incorrectos" };
  }

  await createSession({
    adminId: admin.id,
    email: admin.email,
    name: admin.name,
  });

  redirect("/admin");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/admin/login");
}

const appointmentSchema = z.object({
  patientName: z.string().min(2),
  patientPhone: z.string().min(7),
  serviceId: z.string().min(1),
  locationId: z.string().min(1),
  price: z.coerce.number().int().positive(),
  date: z.string().min(1),
  time: z.string().min(1),
  notes: z.string().optional(),
});

export async function createAppointmentAction(formData: FormData) {
  const auth = await requireAdmin();
  if (!auth) redirect("/admin/login");

  const parsed = appointmentSchema.safeParse({
    patientName: formData.get("patientName"),
    patientPhone: formData.get("patientPhone"),
    serviceId: formData.get("serviceId"),
    locationId: formData.get("locationId"),
    price: formData.get("price"),
    date: formData.get("date"),
    time: formData.get("time"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) return { error: "Revisa los datos del formulario" };

  const data = parsed.data;
  const scheduledAt = bogotaDateTime(data.date, data.time);
  if (Number.isNaN(scheduledAt.getTime())) return { error: "Fecha u hora inválida" };
  if (scheduledAt.getTime() < Date.now() - 60_000) {
    return { error: "La fecha y hora deben ser posteriores a ahora" };
  }

  const [service, location] = await Promise.all([
    prisma.service.findUnique({ where: { id: data.serviceId } }),
    prisma.location.findUnique({ where: { id: data.locationId } }),
  ]);
  if (!service || !location) return { error: "Servicio o sede no encontrados" };

  const token = await createAppointmentToken(
    data.patientName,
    service.name,
    scheduledAt,
  );
  const paymentRef = await createPaymentRef();
  const whatsappMessage = rebuildMessage({
    token,
    scheduledAt,
    address: location.address,
    neighborhood: location.neighborhood,
    serviceName: service.name,
    price: data.price,
    patientName: data.patientName,
  });

  const patient = await upsertPatient(data.patientName, data.patientPhone);

  const appointment = await prisma.appointment.create({
    data: {
      token,
      paymentRef,
      patientName: data.patientName.trim(),
      patientPhone: data.patientPhone.trim(),
      scheduledAt,
      price: data.price,
      notes: data.notes?.trim() || null,
      status: STATUS.PENDING_PATIENT,
      whatsappMessage,
      serviceId: service.id,
      locationId: location.id,
      patientId: patient.id,
    },
    include: { service: true, location: true },
  });

  await syncCalendar(appointment);

  revalidatePath("/admin");
  redirect(`/admin/citas/${appointment.id}`);
}

export async function updateAppointmentAction(formData: FormData) {
  const auth = await requireAdmin();
  if (!auth) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Cita no encontrada" };

  const existing = await prisma.appointment.findUnique({
    where: { id },
    include: { service: true, location: true },
  });
  if (!existing) return { error: "Cita no encontrada" };

  const serviceId = String(formData.get("serviceId") ?? existing.serviceId);
  const locationId = String(formData.get("locationId") ?? existing.locationId);
  const price = Number(formData.get("price") ?? existing.price);
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const patientName = String(formData.get("patientName") ?? existing.patientName).trim();
  const patientPhone = String(formData.get("patientPhone") ?? existing.patientPhone).trim();

  if (!date || !time || !price) return { error: "Revisa fecha, hora y precio" };

  const scheduledAt = bogotaDateTime(date, time);
  if (Number.isNaN(scheduledAt.getTime())) return { error: "Fecha u hora inválida" };
  if (scheduledAt.getTime() < Date.now() - 60_000) {
    return { error: "La fecha y hora deben ser posteriores a ahora" };
  }
  const [service, location] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    prisma.location.findUnique({ where: { id: locationId } }),
  ]);
  if (!service || !location) return { error: "Servicio o sede no encontrados" };

  const patient = await upsertPatient(patientName, patientPhone);
  const whatsappMessage = rebuildMessage({
    token: existing.token,
    scheduledAt,
    address: location.address,
    neighborhood: location.neighborhood,
    serviceName: service.name,
    price,
    patientName,
  });

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      patientName,
      patientPhone,
      scheduledAt,
      price,
      notes,
      serviceId,
      locationId,
      patientId: patient.id,
      whatsappMessage,
      status:
        existing.status === STATUS.CANCELLED ? STATUS.PENDING_PATIENT : existing.status,
    },
    include: { service: true, location: true },
  });

  await syncCalendar(updated);

  revalidatePath("/admin");
  revalidatePath(`/admin/citas/${id}`);
  revalidatePath(appointmentPublicPath(existing.token));
  redirect(`/admin/citas/${id}?updated=1`);
}

export async function confirmNequiAction(appointmentId: string, paymentNote?: string) {
  const auth = await requireAdmin();
  if (!auth) redirect("/admin/login");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { service: true, location: true },
  });
  if (!appointment) return { error: "Cita no encontrada" };

  if (appointment.status === STATUS.CONFIRMED) {
    return { error: "Esta cita ya estaba confirmada" };
  }
  if (appointment.status !== STATUS.AWAITING_PROOF) {
    return { error: "Solo puedes confirmar cuando el paciente eligió Nequi y envió el pantallazo" };
  }
  if (appointment.paymentMethod !== PAYMENT.NEQUI) {
    return { error: "Esta cita no está marcada como Nequi" };
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: STATUS.CONFIRMED,
      adminConfirmedAt: new Date(),
      paymentMethod: PAYMENT.NEQUI,
      paymentNote: paymentNote?.trim() || null,
    },
    include: { service: true, location: true },
  });

  await syncCalendar(updated);

  await notifyEdwin({
    title: `Pago verificado · ${updated.patientName}`,
    body: `${formatMoney(updated.price)} · ref ${updated.paymentRef ?? "—"} · ${formatAppointmentDate(updated.scheduledAt)} ${formatAppointmentTime(updated.scheduledAt)}`,
    appointmentId: updated.id,
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/citas/${appointmentId}`);
  revalidatePath(appointmentPublicPath(appointment.token));
  return { ok: true };
}

export async function cancelAppointmentAction(appointmentId: string) {
  const auth = await requireAdmin();
  if (!auth) redirect("/admin/login");

  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: STATUS.CANCELLED },
    include: { service: true, location: true },
  });

  await syncCalendar(appointment);

  revalidatePath("/admin");
  revalidatePath(`/admin/citas/${appointmentId}`);
  return { ok: true };
}

export async function patientChoosePaymentAction(
  token: string,
  method: "EFECTIVO" | "NEQUI",
) {
  const appointment = await prisma.appointment.findUnique({
    where: { token },
    include: { service: true, location: true },
  });

  if (!appointment) return { error: "Cita no encontrada" };
  if (appointment.status === STATUS.CANCELLED) {
    return { error: "Esta cita fue cancelada" };
  }
  if (appointment.status === STATUS.CONFIRMED) {
    return { error: "Esta cita ya está confirmada" };
  }
  if (appointment.status !== STATUS.PENDING_PATIENT) {
    return { error: "Ya elegiste forma de pago. Si necesitas cambiar, escribe a Edwin." };
  }

  let paymentRef = appointment.paymentRef;
  if (!paymentRef) {
    paymentRef = await createPaymentRef();
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { paymentRef },
    });
  }

  async function buildAlerts(updated: {
    id: string;
    patientName: string;
    patientPhone: string;
    scheduledAt: Date;
    price: number;
    paymentMethod: string | null;
    paymentRef?: string | null;
    service: { name: string };
    location: { address: string; neighborhood: string };
  }) {
    const calendarUrl = buildPatientGoogleCalendarUrl({
      patientName: updated.patientName,
      scheduledAt: updated.scheduledAt,
      serviceName: updated.service.name,
      address: updated.location.address,
      neighborhood: updated.location.neighborhood,
    });

    const patientMessage = buildPatientToEdwinConfirmMessage({
      patientName: updated.patientName,
      paymentMethod: updated.paymentMethod ?? method,
      scheduledAt: updated.scheduledAt,
      serviceName: updated.service.name,
      address: updated.location.address,
    });

    return {
      calendarUrl,
      paymentRef: updated.paymentRef ?? paymentRef,
      amount: updated.price,
      nequi: PRACTICE.nequi,
      patientConfirmWaUrl: whatsappLink(PRACTICE.phone, patientMessage),
    };
  }

  if (method === PAYMENT.EFECTIVO) {
    const updated = await prisma.appointment.update({
      where: { token },
      data: {
        paymentMethod: PAYMENT.EFECTIVO,
        paymentRef,
        status: STATUS.CONFIRMED,
        patientConfirmedAt: new Date(),
        adminConfirmedAt: new Date(),
      },
      include: { service: true, location: true },
    });

    await syncCalendar(updated);
    const alerts = await buildAlerts(updated);

    await notifyEdwin({
      title: `${updated.patientName} confirmó · efectivo`,
      body: `${updated.service.name} · ${formatMoney(updated.price)} · ${formatAppointmentDate(updated.scheduledAt)} · ${formatAppointmentTime(updated.scheduledAt)}`,
      appointmentId: updated.id,
    });

    revalidatePath(appointmentPublicPath(token));
    revalidatePath("/admin");
    return {
      ok: true,
      status: STATUS.CONFIRMED,
      ...alerts,
    };
  }

  const updated = await prisma.appointment.update({
    where: { token },
    data: {
      paymentMethod: PAYMENT.NEQUI,
      paymentRef,
      status: STATUS.AWAITING_PROOF,
      patientConfirmedAt: new Date(),
    },
    include: { service: true, location: true },
  });

  const alerts = await buildAlerts(updated);

  await notifyEdwin({
    title: `${updated.patientName} · Nequi por verificar`,
    body: `${formatMoney(updated.price)} · ref ${paymentRef} · ${formatAppointmentDate(updated.scheduledAt)} · ${formatAppointmentTime(updated.scheduledAt)}`,
    appointmentId: updated.id,
  });

  revalidatePath(appointmentPublicPath(token));
  revalidatePath("/admin");
  return {
    ok: true,
    status: STATUS.AWAITING_PROOF,
    ...alerts,
  };
}

export async function saveLocationAction(formData: FormData) {
  const auth = await requireAdmin();
  if (!auth) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const data = {
    name: String(formData.get("name") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    neighborhood: String(formData.get("neighborhood") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  if (!data.name || !data.address || !data.neighborhood) {
    redirect("/admin/sedes?error=1");
  }

  if (id) await prisma.location.update({ where: { id }, data });
  else await prisma.location.create({ data });

  revalidatePath("/admin/sedes");
  redirect("/admin/sedes");
}

export async function toggleLocationAction(id: string) {
  const auth = await requireAdmin();
  if (!auth) redirect("/admin/login");
  const loc = await prisma.location.findUnique({ where: { id } });
  if (!loc) return { error: "No encontrada" };
  await prisma.location.update({ where: { id }, data: { active: !loc.active } });
  revalidatePath("/admin/sedes");
  return { ok: true };
}

export async function saveServiceAction(formData: FormData) {
  const auth = await requireAdmin();
  if (!auth) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const data = {
    name: String(formData.get("name") ?? "").trim(),
    defaultPrice: Number(formData.get("defaultPrice")),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  if (!data.name || !data.defaultPrice) redirect("/admin/servicios?error=1");

  if (id) await prisma.service.update({ where: { id }, data });
  else await prisma.service.create({ data });

  revalidatePath("/admin/servicios");
  redirect("/admin/servicios");
}

export async function toggleServiceAction(id: string) {
  const auth = await requireAdmin();
  if (!auth) redirect("/admin/login");
  const svc = await prisma.service.findUnique({ where: { id } });
  if (!svc) return { error: "No encontrado" };
  await prisma.service.update({ where: { id }, data: { active: !svc.active } });
  revalidatePath("/admin/servicios");
  return { ok: true };
}

export async function savePatientAction(formData: FormData) {
  const auth = await requireAdmin();
  if (!auth) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name || !phone) redirect("/admin/contactos?error=1");

  try {
    if (id) {
      await prisma.patient.update({
        where: { id },
        data: {
          name,
          phone,
          phoneKey: normalizePhone(phone),
          notes,
        },
      });
      revalidatePath("/admin/contactos");
      revalidatePath(`/admin/contactos/${id}`);
      redirect(`/admin/contactos/${id}`);
    }
    await upsertPatient(name, phone, notes);
  } catch {
    redirect("/admin/contactos?error=1");
  }

  revalidatePath("/admin/contactos");
  redirect("/admin/contactos");
}

export async function deletePatientAction(id: string) {
  const auth = await requireAdmin();
  if (!auth) redirect("/admin/login");

  await prisma.appointment.updateMany({
    where: { patientId: id },
    data: { patientId: null },
  });
  await prisma.patient.delete({ where: { id } });

  revalidatePath("/admin/contactos");
  redirect("/admin/contactos");
}

export async function importContactsCsvAction(formData: FormData) {
  const auth = await requireAdmin();
  if (!auth) redirect("/admin/login");

  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/admin/contactos?error=csv");
  }

  const contacts = parseContactsCsv(await file.text());
  if (contacts.length === 0) redirect("/admin/contactos?error=csv");

  let imported = 0;
  for (const contact of contacts) {
    await upsertPatient(contact.name, contact.phone);
    imported += 1;
  }

  revalidatePath("/admin/contactos");
  redirect(`/admin/contactos?imported=${imported}`);
}

export async function sendAppointmentWhatsAppAction(appointmentId: string) {
  const auth = await requireAdmin();
  if (!auth) redirect("/admin/login");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { service: true, location: true },
  });
  if (!appointment) return { error: "Cita no encontrada" };

  const appUrl = getAppUrl();
  const confirmUrl = `${appUrl}${appointmentPublicPath(appointment.token)}`;
  const message =
    appointment.whatsappMessage ??
    rebuildMessage({
      token: appointment.token,
      scheduledAt: appointment.scheduledAt,
      address: appointment.location.address,
      neighborhood: appointment.location.neighborhood,
      serviceName: appointment.service.name,
      price: appointment.price,
    });

  const { sendAppointmentWhatsApp } = await import("@/lib/whatsapp");
  const result = await sendAppointmentWhatsApp({
    toPhone: appointment.patientPhone,
    fullMessage: message,
    templateParams: {
      patientName: appointment.patientName,
      dateLabel: formatAppointmentDate(appointment.scheduledAt),
      timeLabel: formatAppointmentTime(appointment.scheduledAt),
      serviceName: appointment.service.name,
      confirmUrl,
    },
  });

  if (!result.ok) return { error: result.error };

  await notifyEdwin({
    title: `Mensaje enviado a ${appointment.patientName}`,
    body: `${appointment.service.name} · ${formatAppointmentDate(appointment.scheduledAt)}`,
    appointmentId: appointment.id,
  });

  revalidatePath(`/admin/citas/${appointmentId}`);
  return { ok: true, mode: result.mode };
}

export async function markNotificationsReadAction() {
  const auth = await requireAdmin();
  if (!auth) redirect("/admin/login");

  await prisma.notification.updateMany({
    where: { read: false },
    data: { read: true },
  });

  revalidatePath("/admin");
  return { ok: true };
}

export async function markNotificationReadAction(id: string) {
  const auth = await requireAdmin();
  if (!auth) redirect("/admin/login");

  await prisma.notification.update({
    where: { id },
    data: { read: true },
  });

  revalidatePath("/admin");
  return { ok: true };
}
