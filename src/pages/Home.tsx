import React, { useState } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { EventCard } from '@/components/EventCard';
import { extractEventsFromPdf } from '@/lib/pdf-parser';
import { generateICS } from '@/lib/ics-generator';
import { type InsertEvent } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { saveAs } from 'file-saver';
import { Download, Trash2, Calendar, RefreshCcw, CheckSquare, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
          title: "No events found",
          description: "Could not identify any events matching the expected format.",
        });
      } else {
        setEvents(extracted);
        // Select all by default
        setSelectedIndices(new Set(extracted.map((_, i) => i)));
        toast({
          title: "Success!",
          description: `Found ${extracted.length} events from the PDF.`,
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Parsing Error",
        description: "Failed to read the PDF file.",
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
        title: "Nothing to export",
        description: "Please select at least one event.",
      });
      return;
    }

    try {
      const icsContent = generateICS(selectedEvents);
      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
      saveAs(blob, "church-calendar.ics");
      
      toast({
        title: "Export Complete",
        description: `Downloaded calendar with ${selectedEvents.length} events.`,
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Could not generate the ICS file.",
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
    if (checked) {
      newSet.add(index);
    } else {
      newSet.delete(index);
    }
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
    if (confirm("Are you sure? This will clear all parsed events.")) {
      setEvents([]);
      setSelectedIndices(new Set());
    }
  };

  // Render
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
              <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground hover:text-destructive">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button onClick={handleExport} className="shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                <Download className="mr-2 h-4 w-4" />
                Export ICS ({selectedIndices.size})
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
                <h2 className="text-2xl font-bold tracking-tight">Review Events</h2>
                <p className="text-muted-foreground">
                  Found {events.length} events. Edit details before exporting.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selectedIndices.size === events.length ? (
                  <><Square className="mr-2 h-4 w-4" /> Deselect All</>
                ) : (
                  <><CheckSquare className="mr-2 h-4 w-4" /> Select All</>
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
              <Button size="lg" onClick={handleExport} className="px-8 shadow-xl hover:-translate-y-1 transition-all duration-300">
                <Download className="mr-2 h-5 w-5" />
                Download Calendar File
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
