"use client";

import { useState, useRef, useEffect } from "react";
import { FaPlay, FaPause, FaDownload, FaVolumeUp, FaRedo } from "react-icons/fa";
import { Button } from "@/components/ui/button";

interface AudioPlayerProps {
  audioUrl: string;
  fileName: string;
}

export default function AudioPlayer({ audioUrl, fileName }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const newVolume = parseFloat(e.target.value);

    if (audio) {
      audio.volume = newVolume;
    }
    setVolume(newVolume);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `${fileName.replace('.pdf', '')}_audio.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const restartAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setCurrentTime(0);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-card p-6 rounded-lg border shadow-lg">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaVolumeUp className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2">Audio Ready!</h2>
          <p className="text-muted-foreground">
            Your PDF has been converted to natural, human-like audio
          </p>
        </div>

        <audio ref={audioRef} src={audioUrl} preload="metadata" />

        {/* File Info */}
        <div className="bg-muted/50 p-4 rounded-lg mb-6">
          <h3 className="font-medium mb-1">{fileName.replace('.pdf', '')} - Audio Version</h3>
          <p className="text-sm text-muted-foreground">
            Duration: {formatTime(duration)} • High-quality AI voice with emotional expression
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 rounded-lg cursor-pointer appearance-none bg-gray-300 accent-black"
          />
        </div>


        {/* Controls */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={restartAudio}
            className="w-12 h-12"
          >
            <FaRedo className="w-4 h-4" />
          </Button>

          <Button
            onClick={togglePlayPause}
            className="w-16 h-16 rounded-full"
            size="lg"
          >
            {isPlaying ? (
              <FaPause className="w-6 h-6" />
            ) : (
              <FaPlay className="w-6 h-6 ml-1" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleDownload}
            className="w-12 h-12"
          >
            <FaDownload className="w-4 h-4" />
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-3">
          <FaVolumeUp className="w-4 h-4 text-muted-foreground" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full h-2 rounded-lg cursor-pointer appearance-none bg-gray-300 accent-black"
          />
          <span className="text-sm text-muted-foreground w-8">
            {Math.round(volume * 100)}%
          </span>
        </div>

        {/* AI Voice Info */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border">
          <h4 className="font-medium mb-2">🎭 AI Voice Features</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Natural male voice with emotional expression</li>
            <li>• Human-like intonation and pacing</li>
            <li>• Advanced AI speech synthesis</li>
            <li>• Professional audiobook quality</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
