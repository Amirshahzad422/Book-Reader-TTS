"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FaUpload, FaFilePdf } from "react-icons/fa";
import { Button } from "@/components/ui/button";

interface PDFUploaderProps {
  onFileUpload: (file: File) => void;
}

export default function PDFUploader({ onFileUpload }: PDFUploaderProps) {

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type === 'application/pdf') {
        onFileUpload(file);
      } else {
        alert('Please upload a PDF file only.');
      }
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 30 * 1024 * 1024, // 30MB
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-primary bg-primary/5 scale-105' 
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <FaUpload className="w-8 h-8 text-primary" />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-2">
              {isDragActive ? 'Drop your PDF here' : 'Upload Your PDF Document'}
            </h3>
            <p className="text-muted-foreground mb-4">
              Drag and drop your PDF file here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              Maximum file size: 30MB • Supported format: PDF
            </p>
          </div>

          <Button variant="outline" className="mt-4">
            <FaFilePdf className="mr-2" />
            Choose PDF File
          </Button>
        </div>
      </div>

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-2">What happens next?</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Your PDF will be processed and text extracted</li>
          <li>• AI will convert the text to natural, human-like speech</li>
          <li>• You&apos;ll get high-quality audio with emotional expression</li>
          <li>• Play, pause, and download your generated audiobook</li>
        </ul>
      </div>
    </div>
  );
}
