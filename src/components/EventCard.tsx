import React from 'react';
import { type InsertEvent } from '@shared/schema';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Clock, AlignLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: Partial<InsertEvent>;
  isSelected: boolean;
  onToggle: (checked: boolean) => void;
  onChange: (updates: Partial<InsertEvent>) => void;
}

export function EventCard({ event, isSelected, onToggle, onChange }: EventCardProps) {
  // Helper to format date for datetime-local input (YYYY-MM-DDThh:mm)
  const toInputFormat = (date: Date | string | null | undefined) => {
    if (!date) return "";
    return format(new Date(date), "yyyy-MM-dd'T'HH:mm");
  };

  return (
    <div 
      className={cn(
        "group relative rounded-xl border bg-card p-5 transition-all duration-300 hover:shadow-lg",
        isSelected 
          ? "border-primary/50 bg-primary/5 shadow-md shadow-primary/10" 
          : "border-border shadow-sm hover:border-primary/20"
      )}
    >
      {/* Selection Checkbox */}
      <div className="absolute left-4 top-4 z-10">
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={(c) => onToggle(!!c)}
          className="h-5 w-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </div>

      <div className="ml-8 space-y-4">
        {/* Header: Summary & Location */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            value={event.summary || ""}
            onChange={(e) => onChange({ summary: e.target.value })}
            className="border-transparent bg-transparent text-lg font-semibold placeholder:text-muted-foreground/50 hover:bg-background/50 focus:bg-background focus:ring-1 focus:ring-primary/20"
            placeholder="Event Summary"
          />
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
            <Input
              value={event.location || ""}
              onChange={(e) => onChange({ location: e.target.value })}
              className="h-8 border-transparent bg-transparent text-sm hover:bg-background/50 focus:bg-background focus:ring-1 focus:ring-primary/20"
              placeholder="Location"
            />
          </div>
        </div>

        {/* Time Inputs */}
        <div className="flex flex-col gap-3 rounded-lg bg-muted/30 p-3 sm:flex-row sm:items-center">
          <Clock className="hidden h-4 w-4 text-muted-foreground sm:block" />
          
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Start</label>
            <Input
              type="datetime-local"
              value={toInputFormat(event.start)}
              onChange={(e) => onChange({ start: new Date(e.target.value) })}
              className="h-8 bg-background text-sm font-medium"
            />
          </div>
          
          <div className="hidden text-muted-foreground/30 sm:block">→</div>
          
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">End</label>
            <Input
              type="datetime-local"
              value={toInputFormat(event.end)}
              onChange={(e) => onChange({ end: new Date(e.target.value) })}
              className="h-8 bg-background text-sm font-medium"
            />
          </div>
        </div>

        {/* Description */}
        <div className="relative">
          <div className="absolute left-3 top-3">
            <AlignLeft className="h-4 w-4 text-muted-foreground/50" />
          </div>
          <Textarea
            value={event.description || ""}
            onChange={(e) => onChange({ description: e.target.value })}
            className="min-h-[60px] resize-y bg-background/50 pl-10 text-sm focus:bg-background"
            placeholder="Description..."
          />
        </div>
      </div>
    </div>
  );
}
