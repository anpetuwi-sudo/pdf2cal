import * as pdfjsLib from 'pdfjs-dist';
import { type InsertEvent } from '@shared/schema';
import { addHours, parse, setYear, isDate, format } from 'date-fns';
import { de } from 'date-fns/locale';

// Configure PDF.js worker
// Use local worker for offline support
pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

interface RawLine {
  text: string;
  y: number; // Vertical position, useful for detecting layout
}

export async function extractEventsFromPdf(
  file: File, 
  year: number
): Promise<Partial<InsertEvent>[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let allLines: string[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Sort items by vertical position (top to bottom)
    const items = textContent.items as any[];
    items.sort((a, b) => {
      if (Math.abs(a.transform[5] - b.transform[5]) < 5) {
        return a.transform[4] - b.transform[4];
      }
      return b.transform[5] - a.transform[5];
    });

    let currentLine = "";
    let lastY = items[0]?.transform[5];

    for (const item of items) {
      if (Math.abs(item.transform[5] - lastY) > 5) {
        if (currentLine.trim()) allLines.push(currentLine.trim());
        currentLine = item.str;
        lastY = item.transform[5];
      } else {
        currentLine += " " + item.str;
      }
    }
    if (currentLine.trim()) allLines.push(currentLine.trim());
  }

  console.log("Extracted lines:", allLines);
  return parseLinesToEvents(allLines, year);
}

function parseLinesToEvents(lines: string[], year: number): Partial<InsertEvent>[] {
  const events: Partial<InsertEvent>[] = [];
  let currentDate: Date | null = null;
  let currentEvent: Partial<InsertEvent> | null = null;

  // Regex patterns based on requirements
  // Date pattern: "Donnerstag 01.01." or similar
  const datePattern = /(?:Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)\s+(\d{1,2}\.\d{1,2}\.)/i;
  
  // Event start pattern: "Steinfeld 18:00 Messfeier..."
  const knownLocations = ["Steinfeld", "Hausen", "Waldzell"];
  const eventStartPattern = new RegExp(`^(${knownLocations.join("|")})\\s+(\\d{1,2}[:.]\\d{2})\\s*(.*)`, "i");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    console.log("Processing line:", line);

    // Check for Date Line
    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      const dateStr = dateMatch[1] + year;
      const parsedDate = parse(dateStr, 'dd.MM.yyyy', new Date(), { locale: de });
      
      if (isDate(parsedDate)) {
        console.log("Found date:", format(parsedDate, 'yyyy-MM-dd'));
        currentDate = parsedDate;
        if (currentEvent) {
          events.push(currentEvent);
          currentEvent = null;
        }
        continue;
      }
    }

    // Check for Event Start Line
    if (currentDate) {
      const eventMatch = line.match(eventStartPattern);
      
      if (eventMatch) {
        console.log("Found event start:", line);
        if (currentEvent) {
          events.push(currentEvent);
        }

        const location = eventMatch[1];
        const timeStr = eventMatch[2].replace('.', ':');
        let summary = eventMatch[3].trim();
        
        const isCancelled = summary.toLowerCase().includes("entfällt") || 
                           summary.toLowerCase().includes("entfallt");

        // Remove "f." or "f " or "für" and everything after it from summary
        summary = summary.split(/\s+f[.\s]/i)[0].split(/\s+für\s+/i)[0].trim();
        
        const fullSummary = summary ? `${summary} (${location})` : `Church Event (${location})`;

        const [hours, minutes] = timeStr.split(':').map(Number);
        const start = new Date(currentDate);
        
        let end: Date;
        let isAllDay = false;

        if (isCancelled) {
          start.setHours(0, 0, 0, 0);
          end = new Date(start);
          end.setDate(end.getDate() + 1);
          isAllDay = true;
        } else {
          start.setHours(hours, minutes, 0, 0);
          end = addHours(start, 1);
        }

        currentEvent = {
          summary: fullSummary,
          location: location.trim(),
          start: start,
          end: end,
          isAllDay: isAllDay,
          description: ""
        };
      } else if (currentEvent) {
        // Ignored blocks check
        const isHeader = line.includes("S t e i n f e l d") || 
                         line.includes("Mariä Himmelfahrt") || 
                         line.includes("St. Cyriakus") ||
                         line.includes("-") && line.length > 20; // Heuristic for long divider lines
        
        if (!isHeader && !line.match(/^\d+$/)) {
          // If the line starts with "f." or "für", we skip it entirely as requested
          if (line.match(/^f[.\s]/i) || line.match(/^für\s+/i)) {
            // Skip this line
          } else if (currentEvent.summary?.startsWith("Church Event")) {
            let cleanLine = line.split(/\s+f[.\s]/i)[0].split(/\s+für\s+/i)[0].trim();
            currentEvent.summary = `${cleanLine} (${currentEvent.location})`;
          } else {
            // Also clean continuation lines from "f." parts
            let cleanLine = line.split(/\s+f[.\s]/i)[0].split(/\s+für\s+/i)[0].trim();
            if (cleanLine) {
              currentEvent.description = (currentEvent.description + " " + cleanLine).trim();
            }
          }
        }
      }
    }
  }

  if (currentEvent) {
    events.push(currentEvent);
  }

  // Adjust overlapping events: if an event ends after the next one starts, shorten it
  for (let i = 0; i < events.length - 1; i++) {
    const current = events[i];
    const next = events[i + 1];
    
    // If they are on the same day and location (or just same day), and current ends after next starts
    if (current.start && next.start && current.end && current.end > next.start) {
      console.log(`Adjusting overlap: ${current.summary} ends at ${format(current.end, 'HH:mm')}, next starts at ${format(next.start, 'HH:mm')}`);
      current.end = new Date(next.start);
    }
  }

  console.log("Total events found:", events.length);
  return events;
}
