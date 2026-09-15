import { normalizePhone } from "./patients";

export type CsvContact = { name: string; phone: string };

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function pickIndex(headers: string[], candidates: string[]) {
  const normalized = headers.map((h) =>
    h
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim(),
  );

  for (const candidate of candidates) {
    const idx = normalized.findIndex(
      (h) => h === candidate || h.includes(candidate),
    );
    if (idx >= 0) return idx;
  }
  return -1;
}

/** Soporta CSV simple (nombre,telefono) y export de Google Contacts. */
export function parseContactsCsv(raw: string): CsvContact[] {
  const text = raw.replace(/^\uFEFF/, "").trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headerCells = parseCsvLine(lines[0]);
  const looksLikeHeader = headerCells.some((c) =>
    /name|nombre|phone|telefono|mobile|first name|given name/i.test(c),
  );

  let nameIdx = 0;
  let phoneIdx = 1;
  let start = 0;

  if (looksLikeHeader) {
    start = 1;
    const firstNameIdx = pickIndex(headerCells, [
      "first name",
      "given name",
      "nombre",
      "first name",
    ]);
    const lastNameIdx = pickIndex(headerCells, [
      "last name",
      "family name",
      "apellido",
    ]);
    const fullNameIdx = pickIndex(headerCells, [
      "name",
      "nombre completo",
      "full name",
    ]);
    phoneIdx = pickIndex(headerCells, [
      "phone 1 - value",
      "phone 1 value",
      "mobile phone",
      "phone",
      "telefono",
      "teléfono",
      "mobile",
      "celular",
    ]);

    if (fullNameIdx >= 0) {
      nameIdx = fullNameIdx;
    } else if (firstNameIdx >= 0) {
      nameIdx = firstNameIdx;
    }

    if (phoneIdx < 0) phoneIdx = 1;

    const contacts: CsvContact[] = [];
    for (let i = start; i < lines.length; i += 1) {
      const cols = parseCsvLine(lines[i]);
      let name = (cols[nameIdx] ?? "").trim();
      if (firstNameIdx >= 0 && lastNameIdx >= 0 && fullNameIdx < 0) {
        name = `${cols[firstNameIdx] ?? ""} ${cols[lastNameIdx] ?? ""}`.trim();
      }
      const phoneRaw = (cols[phoneIdx] ?? "").split(":::")[0].trim();
      const phone = normalizePhone(phoneRaw);
      if (!name || phone.length < 7) continue;
      contacts.push({ name, phone: phoneRaw || phone });
    }
    return dedupeContacts(contacts);
  }

  const contacts: CsvContact[] = [];
  for (const line of lines) {
    const cols = parseCsvLine(line);
    const name = (cols[0] ?? "").trim();
    const phoneRaw = (cols[1] ?? "").trim();
    const phone = normalizePhone(phoneRaw);
    if (!name || phone.length < 7) continue;
    contacts.push({ name, phone: phoneRaw || phone });
  }
  return dedupeContacts(contacts);
}

function dedupeContacts(contacts: CsvContact[]) {
  const map = new Map<string, CsvContact>();
  for (const c of contacts) {
    const key = normalizePhone(c.phone);
    if (!map.has(key)) map.set(key, c);
  }
  return Array.from(map.values());
}
