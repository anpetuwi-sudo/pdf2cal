import React, { useCallback, useState } from 'react';
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface UploadZoneProps {
  onFileProcess: (file: File, year: number) => Promise<void>;
  isProcessing: boolean;
}

export function UploadZone({ onFileProcess, isProcessing }: UploadZoneProps) {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError("Please upload a PDF file.");
      return;
    }
    
    setError(null);
    try {
      await onFileProcess(file, year);
    } catch (err) {
      console.error(err);
      setError("Failed to process file. Is it a valid PDF?");
    }
  }, [onFileProcess, year]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    disabled: isProcessing
  });

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 animate-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
          Upload Church Schedule
        </h2>
        <p className="text-muted-foreground">
          Select the year and drag & drop your PDF to convert it to a digital calendar.
        </p>
      </div>

      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="year-input" className="text-sm font-medium">Calendar Year:</label>
          <Input 
            id="year-input"
            type="number" 
            value={year} 
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-24 text-center font-bold text-lg"
            min={2000}
            max={2100}
          />
        </div>
      </div>

      <div 
        {...getRootProps()} 
        className={cn(
          "relative group cursor-pointer flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 p-12 text-center transition-all duration-300 hover:border-primary/50 hover:bg-primary/5",
          isDragActive && "border-primary bg-primary/10 scale-[1.02]",
          isProcessing && "opacity-50 cursor-not-allowed",
          error && "border-destructive/50 bg-destructive/5"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="rounded-full bg-background p-4 shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
          {isProcessing ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : error ? (
            <AlertCircle className="h-8 w-8 text-destructive" />
          ) : (
            <Upload className="h-8 w-8 text-primary group-hover:text-purple-600 transition-colors" />
          )}
        </div>

        <div className="mt-6 space-y-1">
          <p className="font-semibold text-lg">
            {isProcessing ? "Processing PDF..." : "Drop your PDF here"}
          </p>
          <p className="text-sm text-muted-foreground">
            {isProcessing ? "Extracting events, please wait." : "or click to browse files"}
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive font-medium">
            {error}
          </div>
        )}
      </div>
      
      <div className="text-center text-xs text-muted-foreground/60">
        Supported formats: PDF with "Wochentag dd.mm." date structure
      </div>
    </div>
  );
}
