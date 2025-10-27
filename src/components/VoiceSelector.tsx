"use client";

import { useState } from "react";
import { FaPlay, FaPause, FaVolumeUp } from "react-icons/fa";
import { Button } from "@/components/ui/button";

export interface Voice {
  id: string;
  name: string;
  description: string;
  gender: string;
  accent: string;
  personality: string;
  color: string;
}

const AVAILABLE_VOICES: Voice[] = [
  {
    id: "alloy",
    name: "Alloy",
    description: "Neutral and versatile voice, great for any content",
    gender: "Neutral",
    accent: "American",
    personality: "Professional, Clear",
    color: "bg-blue-500"
  },
  {
    id: "echo",
    name: "Echo",
    description: "Clear male voice, perfect for professional content",
    gender: "Male",
    accent: "American", 
    personality: "Authoritative, Confident",
    color: "bg-green-500"
  },
  {
    id: "fable",
    name: "Fable",
    description: "British narrator voice, excellent for storytelling",
    gender: "Male",
    accent: "British",
    personality: "Sophisticated, Engaging",
    color: "bg-purple-500"
  },
  {
    id: "onyx",
    name: "Onyx",
    description: "Deep, warm male voice, ideal for audiobooks",
    gender: "Male",
    accent: "American",
    personality: "Deep, Warm, Emotional",
    color: "bg-gray-800"
  },
  {
    id: "nova",
    name: "Nova",
    description: "Young adult female voice, friendly and approachable",
    gender: "Female",
    accent: "American",
    personality: "Friendly, Energetic",
    color: "bg-pink-500"
  },
  {
    id: "shimmer",
    name: "Shimmer",
    description: "Soft, whispery female voice, calming and gentle",
    gender: "Female",
    accent: "American",
    personality: "Soft, Gentle, Calming",
    color: "bg-indigo-500"
  }
];

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
}

export default function VoiceSelector({ selectedVoice, onVoiceChange }: VoiceSelectorProps) {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  const playVoicePreview = async (voiceId: string) => {
    if (playingVoice === voiceId) {
      setPlayingVoice(null);
      return;
    }

    setPlayingVoice(voiceId);
    
    try {
      // Create a sample text for voice preview
      const sampleText = "Hello! This is how I sound. I'm perfect for converting your PDFs into natural, engaging audio.";
      
      const response = await fetch('/api/voice-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sampleText,
          voice: voiceId
        }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setPlayingVoice(null);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.onerror = () => {
          setPlayingVoice(null);
          URL.revokeObjectURL(audioUrl);
        };
        
        await audio.play();
      } else {
        console.error('Failed to generate voice preview');
        setPlayingVoice(null);
      }
    } catch (error) {
      console.error('Error playing voice preview:', error);
      setPlayingVoice(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <FaVolumeUp className="text-primary" />
            Choose Your AI Voice
          </h3>
          <p className="text-muted-foreground">
            Select the perfect voice for your audiobook. Click the play button to hear a preview.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AVAILABLE_VOICES.map((voice) => (
            <div
              key={voice.id}
              className={`
                relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                ${selectedVoice === voice.id 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-muted hover:border-primary/50'
                }
              `}
              onClick={() => onVoiceChange(voice.id)}
            >
              {/* Voice Color Indicator */}
              <div className={`w-3 h-3 rounded-full ${voice.color} absolute top-3 right-3`}></div>
              
              {/* Voice Info */}
              <div className="mb-3">
                <h4 className="font-semibold text-lg">{voice.name}</h4>
                <p className="text-sm text-muted-foreground mb-2">{voice.description}</p>
                
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gender:</span>
                    <span className="font-medium">{voice.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accent:</span>
                    <span className="font-medium">{voice.accent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Style:</span>
                    <span className="font-medium">{voice.personality}</span>
                  </div>
                </div>
              </div>

              {/* Preview Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  playVoicePreview(voice.id);
                }}
                disabled={playingVoice !== null && playingVoice !== voice.id}
              >
                {playingVoice === voice.id ? (
                  <>
                    <FaPause className="mr-2 w-3 h-3" />
                    Playing...
                  </>
                ) : (
                  <>
                    <FaPlay className="mr-2 w-3 h-3" />
                    Preview
                  </>
                )}
              </Button>

              {/* Selected Indicator */}
              {selectedVoice === voice.id && (
                <div className="absolute inset-0 rounded-lg border-2 border-primary pointer-events-none">
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                    Selected
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Current Selection Summary */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">
                Selected Voice: {AVAILABLE_VOICES.find(v => v.id === selectedVoice)?.name}
              </h4>
              <p className="text-sm text-muted-foreground">
                {AVAILABLE_VOICES.find(v => v.id === selectedVoice)?.description}
              </p>
            </div>
            <div className={`w-8 h-8 rounded-full ${AVAILABLE_VOICES.find(v => v.id === selectedVoice)?.color}`}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
