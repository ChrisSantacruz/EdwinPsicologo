import Image from "next/image";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { PatientPaymentChooser } from "@/components/patient-payment";
import {
  IconBuilding,
  IconCalendar,
  IconClock,
  IconPin,
  IconWallet,
  IconWhatsApp,
} from "@/components/icons";
import {
  formatAppointmentDate,
  formatAppointmentTime,
  formatMoney,
  formatPhoneDisplay,
  whatsappLink,
} from "@/lib/format";
import { PRACTICE } from "@/lib/constants";
import { BRAND } from "@/lib/brand";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const appointment = await prisma.appointment.findUnique({ where: { token } });
  return {
    title: appointment
      ? `Confirmar cita — ${appointment.patientName}`
      : "Confirmar cita",
    description: BRAND.priority,
  };
}

export default async function PatientConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const appointment = await prisma.appointment.findUnique({
    where: { token },
    include: { service: true, location: true },
  });

  if (!appointment) notFound();

  const waDirect = whatsappLink(
    PRACTICE.phone,
    `Hola Edwin, escribo por mi cita del ${formatAppointmentDate(appointment.scheduledAt)}.`,
  );

  return (
    <main className="patient-shell mx-auto flex min-h-full w-full max-w-xl flex-1 flex-col">
      <header className="patient-banner-top fade-up">
        <Image
          src="/banner-top.png"
          alt="Atención psicológica especializada — Edwin Mideros"
          width={1536}
          height={640}
          className="h-auto w-full object-cover object-center"
          priority
          sizes="(max-width: 576px) 100vw, 576px"
        />
      </header>

      <div className="relative z-10 -mt-3 flex flex-1 flex-col gap-4 px-4 pb-6">
        <section className="ios-card patient-card fade-up px-5 py-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-burgundy">
            Confirmación de cita
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink sm:text-[1.7rem]">
            Hola, {appointment.patientName.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Revisa los datos y confirma tu asistencia
          </p>
          <div className="mx-auto mt-3 h-px w-16 bg-gradient-to-r from-transparent via-gold to-transparent" />
        </section>

        <section className="ios-card patient-card fade-up overflow-hidden">
          <div className="border-b border-line bg-gradient-to-r from-burgundy/[0.06] via-gold/10 to-transparent px-5 py-3">
            <p className="text-sm font-semibold text-burgundy">{appointment.service.name}</p>
            <p className="text-xs text-muted">{PRACTICE.professionalName} · Psicólogo</p>
          </div>
          <div className="space-y-0 px-2 py-1">
            <DetailRow
              icon={<IconCalendar className="h-[18px] w-[18px]" />}
              label="Día"
              value={formatAppointmentDate(appointment.scheduledAt)}
            />
            <DetailRow
              icon={<IconClock className="h-[18px] w-[18px]" />}
              label="Hora"
              value={formatAppointmentTime(appointment.scheduledAt)}
            />
            <DetailRow
              icon={<IconWallet className="h-[18px] w-[18px]" />}
              label="Inversión"
              value={formatMoney(appointment.price)}
            />
            <DetailRow
              icon={<IconPin className="h-[18px] w-[18px]" />}
              label="Dirección"
              value={appointment.location.address}
            />
            <DetailRow
              icon={<IconBuilding className="h-[18px] w-[18px]" />}
              label="Barrio"
              value={appointment.location.neighborhood}
            />
          </div>
        </section>

        <PatientPaymentChooser
          token={appointment.token}
          initialStatus={appointment.status}
          practicePhone={PRACTICE.phone}
          nequiNumber={PRACTICE.nequi}
        />

        <a
          href={waDirect}
          target="_blank"
          rel="noreferrer"
          className="cta-bar fade-up transition hover:brightness-110"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white">
              <IconWhatsApp className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-white/70">¿Dudas?</p>
              <p className="font-semibold">WhatsApp {formatPhoneDisplay(PRACTICE.phone)}</p>
            </div>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            Escribir
          </span>
        </a>

        <p className="px-2 text-center text-[11px] leading-relaxed text-muted">
          {BRAND.closing}
        </p>
      </div>

      <footer className="patient-banner-bottom mt-auto fade-up">
        <Image
          src="/banner-bottom.png"
          alt="Tu bienestar es una prioridad"
          width={1536}
          height={640}
          className="h-auto w-full object-cover object-center"
          sizes="(max-width: 576px) 100vw, 576px"
        />
      </footer>
    </main>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-line/80 px-3 py-3 last:border-0">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-burgundy/[0.07] text-burgundy">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-0.5 text-sm font-semibold leading-snug text-ink">{value}</p>
      </div>
    </div>
  );
}
