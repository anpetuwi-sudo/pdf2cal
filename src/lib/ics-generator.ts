import { type InsertEvent } from "@shared/schema";
import { format } from "date-fns";

export function generateICS(events: Partial<InsertEvent>[]): string {
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PDF Calendar Converter//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];

  const footer = ["END:VCALENDAR"];

  const eventBlocks = events.map(event => {
    if (!event.start || !event.end) return "";

    // Format: YYYYMMDDTHHMMSS (Local time, no Z)
    const dtStart = format(new Date(event.start), "yyyyMMdd'T'HHmmss");
    const dtEnd = format(new Date(event.end), "yyyyMMdd'T'HHmmss");
    const now = format(new Date(), "yyyyMMdd'T'HHmmss'Z'"); // DTSTAMP should be UTC

    // Escape special characters in text fields
    const escape = (str: string | null | undefined) => {
      if (!str) return "";
      return str
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\n/g, "\\n");
    };

    return [
      "BEGIN:VEVENT",
      `DTSTAMP:${now}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escape(event.summary)}`,
      `LOCATION:${escape(event.location)}`,
      `DESCRIPTION:${escape(event.description)}`,
      "STATUS:CONFIRMED",
      "END:VEVENT"
    ].join("\r\n");
  });

  return [...header, ...eventBlocks, ...footer].join("\r\n");
}
