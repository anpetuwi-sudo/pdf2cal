import React, { useState } from "react";
import { UploadZone } from "@/components/UploadZone";
import { EventCard } from "@/components/EventCard";
import { extractEventsFromPdf } from "@/lib/pdf-parser";
import { generateICS } from "@/lib/ics-generator";
import { type InsertEvent } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { saveAs } from "file-saver";
import { Download, Calendar, RefreshCcw, CheckSquare, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [events, setEvents] = useState<Partial<InsertEvent>[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleProcess = async (file: File, year: number) => {
    setIsProcessing(true);
    try {
      const extracted = await extractEventsFromPdf(file, year);

      if (extracted.length === 0) {
        toast({
          variant: "destructive",
          title: "Keine Termine gefunden",
          description:
            "Es konnten keine Termine erkannt werden. Prüfe bitte, ob das PDF dem erwarteten Format entspricht.",
        });
      } else {
        setEvents(extracted);
        // standardmäßig alles auswählen
        setSelectedIndices(new Set(extracted.map((_, i) => i)));

        toast({
          title: "Import erfolgreich",
          description: `Es wurden ${extracted.length} Termine aus dem PDF erkannt.`,
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Fehler beim Einlesen",
        description: "Das PDF konnte nicht verarbeitet werden.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    const selectedEvents = events.filter((_, i) => selectedIndices.has(i));

    if (selectedEvents.length === 0) {
      toast({
        variant: "destructive",
        title: "Keine Auswahl",
        description: "Bitte wähle mindestens einen Termin aus.",
      });
      return;
    }

    try {
      const icsContent = generateICS(selectedEvents);
      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
      saveAs(blob, "gottesdienst-kalender.ics");

      toast({
        title: "Export abgeschlossen",
        description: `Kalenderdatei mit ${selectedEvents.length} Terminen wurde heruntergeladen.`,
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Export fehlgeschlagen",
        description: "Die ICS-Datei konnte nicht erstellt werden.",
      });
    }
  };

  const updateEvent = (index: number, updates: Partial<InsertEvent>) => {
    const newEvents = [...events];
    newEvents[index] = { ...newEvents[index], ...updates };
    setEvents(newEvents);
  };

  const toggleSelection = (index: number, checked: boolean) => {
    const newSet = new Set(selectedIndices);
    if (checked) newSet.add(index);
    else newSet.delete(index);
    setSelectedIndices(newSet);
  };

  const toggleAll = () => {
    if (selectedIndices.size === events.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(events.map((_, i) => i)));
    }
  };

  const reset = () => {
    if (confirm("Alles zurücksetzen? Dadurch werden alle erkannten Termine entfernt.")) {
      setEvents([]);
      setSelectedIndices(new Set());
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight hidden sm:inline-block">
              PDF2Cal
            </span>
          </div>

          {events.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                className="text-muted-foreground hover:text-destructive"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Zurücksetzen
              </Button>

              <Button
                onClick={handleExport}
                className="shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
              >
                <Download className="mr-2 h-4 w-4" />
                ICS exportieren ({selectedIndices.size})
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="container py-8 px-4 md:px-8 max-w-5xl mx-auto">
        {events.length === 0 ? (
          <div className="mt-12 flex min-h-[50vh] flex-col items-center justify-center">
            <UploadZone onFileProcess={handleProcess} isProcessing={isProcessing} />
          </div>
        ) : (
          <div className="space-y-6 animate-in">
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">Termine prüfen</h2>
                <p className="text-muted-foreground">
                  Es wurden {events.length} Termine gefunden. Du kannst Details vor dem Export bearbeiten.
                </p>
              </div>

              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selectedIndices.size === events.length ? (
                  <>
                    <Square className="mr-2 h-4 w-4" />
                    Auswahl aufheben
                  </>
                ) : (
                  <>
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Alle auswählen
                  </>
                )}
              </Button>
            </div>

            <div className="grid gap-6">
              {events.map((event, idx) => (
                <div key={idx} className="animate-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <EventCard
                    event={event}
                    isSelected={selectedIndices.has(idx)}
                    onToggle={(checked) => toggleSelection(idx, checked)}
                    onChange={(updates) => updateEvent(idx, updates)}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-8 pb-20">
              <Button
                size="lg"
                onClick={handleExport}
                className="px-8 shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <Download className="mr-2 h-5 w-5" />
                Kalenderdatei herunterladen
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
