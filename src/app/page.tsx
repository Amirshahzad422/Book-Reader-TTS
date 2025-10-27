"use client";

import { useState } from "react";
import PDFUploader from "@/components/PDFUploader";
import ConversionLoader from "@/components/ConversionLoader";
import AudioPlayer from "@/components/AudioPlayer";
import VoiceSelector from "@/components/VoiceSelector";

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState("fable"); // Default to British narrator

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    setAudioUrl(null);
  };

  const handleStartOver = () => {
    setUploadedFile(null);
    setAudioUrl(null);
    setIsConverting(false);
    setConversionProgress(0);
  };

  const handleConvertToAudio = async () => {
    if (!uploadedFile) return;
    
    setIsConverting(true);
    setConversionProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setConversionProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const formData = new FormData();
      formData.append('pdf', uploadedFile);
      formData.append('voice', selectedVoice);

      const response = await fetch('/api/convert-to-audio', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setConversionProgress(100);

      if (response.ok) {
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        setAudioUrl(audioUrl);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Conversion failed');
      }
    } catch (error) {
      console.error('Error converting PDF to audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('API key')) {
        alert('❌ OpenAI API Key Missing\n\nPlease add your OPENAI_API_KEY to the .env.local file and restart the server.');
      } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('All OpenAI API keys')) {
        alert(`🚨 All API Keys Quota Exceeded\n\n` +
              `All your OpenAI API keys have hit their usage limits.\n\n` +
              `Quick Solutions:\n` +
              `• Add billing to your OpenAI accounts at platform.openai.com/account/billing\n` +
              `• Add $5-10 to each account (very affordable)\n` +
              `• Wait 1 hour if on free tier\n` +
              `• Try with a smaller PDF (1-2 pages)\n\n` +
              `Your app supports multiple API keys - just add billing and you're back online!\n\n` +
              `Cost: ~$0.25 per PDF conversion (very cheap!)`);
      } else if (errorMessage.includes('billing')) {
        alert('💳 OpenAI Billing Issue\n\nPlease check your payment method at platform.openai.com/account/billing');
      } else {
        alert(`❌ Conversion Failed\n\n${errorMessage}\n\nPlease try again or check your internet connection.`);
      }
    } finally {
      setIsConverting(false);
      setTimeout(() => setConversionProgress(0), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            AI PDF-to-Audio Platform
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your PDFs into natural, human-like audio with advanced AI voice technology
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {!uploadedFile && !isConverting && !audioUrl && (
            <PDFUploader onFileUpload={handleFileUpload} />
          )}

          {uploadedFile && !isConverting && !audioUrl && (
            <div className="space-y-6">
              {/* File Info */}
              <div className="text-center">
                <div className="bg-card p-6 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-2">File Ready</h3>
                  <p className="text-muted-foreground mb-4">
                    {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                </div>
              </div>

              {/* Voice Selection */}
              <VoiceSelector 
                selectedVoice={selectedVoice}
                onVoiceChange={setSelectedVoice}
              />

              {/* Convert Button */}
              <div className="text-center">
                <button
                  onClick={handleConvertToAudio}
                  className="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-medium hover:bg-primary/90 transition-colors text-lg"
                >
                  Convert to Audio with {selectedVoice.charAt(0).toUpperCase() + selectedVoice.slice(1)} Voice
                </button>
              </div>
            </div>
          )}

          {isConverting && (
            <ConversionLoader progress={conversionProgress} />
          )}

          {audioUrl && (
            <div className="space-y-6">
              <AudioPlayer audioUrl={audioUrl} fileName={uploadedFile?.name || "Converted Audio"} />
              
              {/* Start Over Button */}
              <div className="text-center">
                <button
                  onClick={handleStartOver}
                  className="bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-medium hover:bg-secondary/90 transition-colors"
                >
                  Convert Another PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
