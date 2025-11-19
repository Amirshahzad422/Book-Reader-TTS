"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import PDFUploader from "@/components/PDFUploader";
import ConversionLoader from "@/components/ConversionLoader";
import AudioPlayer from "@/components/AudioPlayer";
import VoiceSelector from "@/components/VoiceSelector";
import VoiceSettings from "@/components/VoiceSettings";
import AuthModal from "@/components/auth/AuthModal";
import ConversationsHistory from "@/components/ConversationsHistory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AVAILABLE_VOICES } from "@/lib/voiceDefinitions";
import { FaHistory, FaTimes, FaFilePdf, FaKeyboard, FaCrown } from "react-icons/fa";
import { MessageCircleQuestion } from "lucide-react";
import Link from "next/link";

type InputType = 'pdf' | 'text';

export default function Home() {
  const { data: session, status } = useSession();
  const [inputType, setInputType] = useState<InputType>('pdf');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [inputText, setInputText] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isConverting, setIsConverting] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [conversionProgress, setConversionProgress] = useState(0);
  // Initialize selectedVoice from localStorage if available, otherwise default
  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selectedVoice");
      return saved || "fable";
    }
    return "fable";
  });
  const [voiceSettings, setVoiceSettings] = useState<{
    instructions?: string;
    speed: number;
    emotionalRange?: string;
    tone?: string;
    intonation?: string;
    accent?: string;
    age?: string;
    pacing?: string;
    emphasis?: string;
    context?: string;
    whispering?: boolean;
    customInstructions?: string;
  }>({ speed: 1.0 });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [expiredLinkError, setExpiredLinkError] = useState<{ email?: string } | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | undefined>();
  const [textLength, setTextLength] = useState<number | undefined>();
  const [showConversationsHistory, setShowConversationsHistory] = useState(false);
  const [fileRestored, setFileRestored] = useState(false);
  // Restore file and settings from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined" || fileRestored) return;

    try {
      // First, check if we have converted audio state (user was at converted page)
      const convertedAudioUrl = localStorage.getItem("convertedAudioUrl");
      if (convertedAudioUrl) {
        // Restore converted state
        try {
          let base64Data = convertedAudioUrl;
          if (convertedAudioUrl.includes(',')) {
            base64Data = convertedAudioUrl.split(',')[1];
          }
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(blob);
          setAudioUrl(audioUrl);

          // Restore metadata
          const savedLang = localStorage.getItem("convertedDetectedLanguage");
          const savedLength = localStorage.getItem("convertedTextLength");
          if (savedLang) setDetectedLanguage(savedLang);
          if (savedLength) setTextLength(parseInt(savedLength));

          // Restore file
          const savedFileData = localStorage.getItem("convertedFileData");
          const savedFileName = localStorage.getItem("convertedFileName");
          if (savedFileData && savedFileName) {
            let fileBase64Data = savedFileData;
            if (savedFileData.includes(',')) {
              fileBase64Data = savedFileData.split(',')[1];
            }
            const fileByteCharacters = atob(fileBase64Data);
            const fileByteNumbers = new Array(fileByteCharacters.length);
            for (let i = 0; i < fileByteCharacters.length; i++) {
              fileByteNumbers[i] = fileByteCharacters.charCodeAt(i);
            }
            const fileByteArray = new Uint8Array(fileByteNumbers);
            const fileBlob = new Blob([fileByteArray], { type: 'application/pdf' });
            const file = new File([fileBlob], savedFileName, { type: 'application/pdf' });
            setUploadedFile(file);
          }
        } catch (error) {
          console.error("Error restoring converted audio:", error);
          // Clear invalid converted data
          localStorage.removeItem("convertedAudioUrl");
          localStorage.removeItem("convertedDetectedLanguage");
          localStorage.removeItem("convertedTextLength");
          localStorage.removeItem("convertedFileData");
          localStorage.removeItem("convertedFileName");
        }
        setFileRestored(true);
        return; // Don't restore file/settings if we're restoring converted state
      }

      // Otherwise, restore file and settings (before conversion)
      let restoredAny = false;

      // Restore voice settings
      const savedSettings = localStorage.getItem("voiceSettings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setVoiceSettings(parsed);
        restoredAny = true;
      }

      // Restore selected voice (only if different from current to avoid unnecessary updates)
      const savedVoice = localStorage.getItem("selectedVoice");
      if (savedVoice && savedVoice !== selectedVoice) {
        setSelectedVoice(savedVoice);
        restoredAny = true;
      } else if (savedVoice) {
        restoredAny = true; // Still mark as restored if voice exists
      }

      // Restore file
      const savedFileData = localStorage.getItem("uploadedFileData");
      const savedFileName = localStorage.getItem("uploadedFileName");
      if (savedFileData && savedFileName) {
        try {
          // Handle both base64 string and data URL format
          let base64Data = savedFileData;
          if (savedFileData.includes(',')) {
            base64Data = savedFileData.split(',')[1];
          }

          // Convert base64 back to File
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const file = new File([blob], savedFileName, { type: 'application/pdf' });
          setUploadedFile(file);
          restoredAny = true;
        } catch (error) {
          console.error("Error restoring file:", error);
          // Clear invalid file data
          localStorage.removeItem("uploadedFileData");
          localStorage.removeItem("uploadedFileName");
        }
      }

      // DO NOT clear localStorage after restoration
      // Keep it saved until user converts to audio or exits converted state
      // This allows user to reload page and preserve file + settings

      setFileRestored(true);
    } catch (error) {
      console.error("Error restoring file/settings:", error);
      setFileRestored(true);
    }
  }, [fileRestored]);

  // Persist voice settings to localStorage
  useEffect(() => {
    if (typeof window === "undefined" || !fileRestored) return;
    try {
      localStorage.setItem("voiceSettings", JSON.stringify(voiceSettings));
    } catch (error) {
      console.error("Error saving voice settings:", error);
    }
  }, [voiceSettings, fileRestored]);

  // Persist selected voice to localStorage (only after restoration is complete)
  useEffect(() => {
    if (typeof window === "undefined" || !fileRestored) return;
    try {
      // Only save if it's different from what was in localStorage (to avoid saving immediately after clearing)
      const currentSaved = localStorage.getItem("selectedVoice");
      if (selectedVoice !== currentSaved) {
        localStorage.setItem("selectedVoice", selectedVoice);
      }
    } catch (error) {
      console.error("Error saving selected voice:", error);
    }
  }, [selectedVoice, fileRestored]);

  // Check for expired email link error in URL hash
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash || "";
    if (!hash) return;

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const error = params.get("error");
    const errorCode = params.get("error_code");

    if (error === "access_denied" && errorCode === "otp_expired") {
      // Get email from localStorage (stored during signup)
      const storedEmail = localStorage.getItem("pendingVerificationEmail");
      setExpiredLinkError({ email: storedEmail || undefined });

      // Clean URL
      window.history.replaceState(null, document.title, window.location.pathname);
    }
  }, []);

  // Clear temporary localStorage data after successful login
  useEffect(() => {
    if (session && typeof window !== "undefined") {
      // Clear any temporary data stored during signup/login process
      localStorage.removeItem("pendingVerificationEmail");
      // Note: We keep uploadedFileData, voiceSettings, and selectedVoice
      // so the user's work is preserved after login
    }
  }, [session]);

  const handleResendVerification = async (email?: string) => {
    try {
      // Priority: provided email > localStorage email > prompt user
      const storedEmail = localStorage.getItem("pendingVerificationEmail");
      const emailToUse = email || storedEmail || prompt("Please enter your email address:");
      if (!emailToUse) return;

      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("✅ Verification email sent! Please check your inbox.");
        setExpiredLinkError(null);
        // Keep email in localStorage for future resends
      } else {
        alert(`❌ ${data.error || 'Failed to resend email'}`);
      }
    } catch (error) {
      alert("❌ Failed to resend verification email. Please try again.");
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setInputText(''); // Clear text when file is uploaded
    setAudioUrl(null);
    setDetectedLanguage(undefined);
    setTextLength(undefined);

    // Persist file to localStorage
    if (typeof window !== "undefined") {
      try {
        // Convert file to base64 for storage
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            const base64 = (e.target.result as string).split(',')[1] || e.target.result as string;
            localStorage.setItem("uploadedFileData", base64);
            localStorage.setItem("uploadedFileName", file.name);
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("Error saving file to localStorage:", error);
      }
    }
  };

  const handleTextChange = (text: string) => {
    if (text.length <= 1000) {
      setInputText(text);
      setUploadedFile(null); // Clear file when text is entered
      setAudioUrl(null);
      setDetectedLanguage(undefined);
      setTextLength(undefined);
      // Hide settings if text is cleared or becomes too short
      if (text.trim().length < 10) {
        setShowSettings(false);
      }
    }
  };

  const handleStartOver = () => {
    setUploadedFile(null);
    setInputText('');
    setShowSettings(false);
    setAudioUrl(null);
    setIsConverting(false);
    setConversionProgress(0);
    setDetectedLanguage(undefined);
    setTextLength(undefined);

    // Clear ALL localStorage when user exits converted state
    if (typeof window !== "undefined") {
      localStorage.removeItem("uploadedFileData");
      localStorage.removeItem("uploadedFileName");
      localStorage.removeItem("inputText");
      localStorage.removeItem("voiceSettings");
      localStorage.removeItem("selectedVoice");
      localStorage.removeItem("convertedAudioUrl");
      localStorage.removeItem("convertedDetectedLanguage");
      localStorage.removeItem("convertedTextLength");
      localStorage.removeItem("convertedFileData");
      localStorage.removeItem("convertedFileName");
    }
  };

  const minimumTextReady = inputText.trim().length >= 10;

  const handleContinueToSettings = () => {
    if (!minimumTextReady) return;
    setShowSettings(true);
    setTimeout(() => {
      const settingsSection = document.getElementById('voice-settings-section');
      if (settingsSection) {
        settingsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleConvertToAudio = async () => {
    const hasFile = uploadedFile !== null;
    const hasText = inputText.trim().length > 0;

    if (!hasFile && !hasText) {
      alert('Please upload a PDF file or enter text to convert.');
      return;
    }

    // Clear localStorage when user starts conversion
    // This clears file and settings as conversion begins
    if (typeof window !== "undefined") {
      localStorage.removeItem("voiceSettings");
      localStorage.removeItem("selectedVoice");
      localStorage.removeItem("uploadedFileData");
      localStorage.removeItem("uploadedFileName");
      localStorage.removeItem("convertedAudioUrl");
      localStorage.removeItem("convertedDetectedLanguage");
      localStorage.removeItem("convertedTextLength");
    }

    setIsConverting(true);
    const inputTypeText = hasFile ? "PDF" : "text";
    alert(
      `⚠️ Converting your ${inputTypeText} to audio...\n\nPlease don't close this window until conversion is complete.`
    );
    setConversionProgress(0);

    // Decrement conversion count immediately - MUST succeed before conversion
    if (session?.user?.id) {
      try {
        const response = await fetch('/api/decrement-conversion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id }),
        });

        if (!response.ok) {
          throw new Error('Failed to update conversion count');
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error('Conversion count update failed');
        }
      } catch (error) {
        console.error('Failed to update conversion count:', error);
        alert('❌ Failed to update conversion count. Please try again.');
        setIsConverting(false);
        return; // Stop execution - don't proceed with conversion
      }
    }

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setConversionProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const formData = new FormData();

      // Add PDF or text based on input type
      if (hasFile && uploadedFile) {
        formData.append("pdf", uploadedFile);
      } else if (hasText) {
        formData.append("text", inputText.trim());
      }

      formData.append("voice", selectedVoice);

      // Add voice settings if provided
      if (voiceSettings.instructions) {
        formData.append("instructions", voiceSettings.instructions);
      }
      formData.append("speed", voiceSettings.speed.toString());

      // Add individual settings for detailed logging
      if (voiceSettings.emotionalRange) {
        formData.append("emotionalRange", voiceSettings.emotionalRange);
      }
      if (voiceSettings.tone) {
        formData.append("tone", voiceSettings.tone);
      }
      if (voiceSettings.intonation) {
        formData.append("intonation", voiceSettings.intonation);
      }
      if (voiceSettings.accent) {
        formData.append("accent", voiceSettings.accent);
      }
      if (voiceSettings.age) {
        formData.append("age", voiceSettings.age);
      }
      if (voiceSettings.pacing) {
        formData.append("pacing", voiceSettings.pacing);
      }
      if (voiceSettings.emphasis) {
        formData.append("emphasis", voiceSettings.emphasis);
      }
      if (voiceSettings.context) {
        formData.append("context", voiceSettings.context);
      }
      if (voiceSettings.whispering) {
        formData.append("whispering", voiceSettings.whispering.toString());
      }
      if (voiceSettings.customInstructions) {
        formData.append("customInstructions", voiceSettings.customInstructions);
      }

      // LOG WHAT'S BEING SENT - DETAILED BREAKDOWN
      console.log("═══════════════════════════════════════════════════");
      console.log("📤 SENDING TO API - DETAILED BREAKDOWN:");
      console.log("═══════════════════════════════════════════════════");
      console.log("🎤 Voice:", selectedVoice);
      console.log("⚡ Speed:", voiceSettings.speed);
      console.log(
        "🎭 Combined Instructions:",
        voiceSettings.instructions || "(none)"
      );
      console.log("");
      console.log("📋 Individual Settings:");
      console.log(
        "   - Emotional Range:",
        voiceSettings.emotionalRange || "Natural (default)"
      );
      console.log("   - Tone:", voiceSettings.tone || "Natural (default)");
      console.log(
        "   - Intonation:",
        voiceSettings.intonation || "Natural (default)"
      );
      console.log("   - Accent:", voiceSettings.accent || "None");
      console.log("   - Age:", voiceSettings.age || "Default");
      console.log("   - Pacing:", voiceSettings.pacing || "Default");
      console.log("   - Emphasis:", voiceSettings.emphasis || "Default");
      console.log("   - Context:", voiceSettings.context || "None");
      console.log("   - Whispering:", voiceSettings.whispering ? "Yes" : "No");
      console.log(
        "   - Custom Instructions:",
        voiceSettings.customInstructions || "(none)"
      );
      if (hasFile && uploadedFile) {
        console.log("📄 File:", uploadedFile.name);
      } else if (hasText) {
        console.log("📝 Text Input:", inputText.length, "characters");
      }
      console.log("═══════════════════════════════════════════════════");

      const response = await fetch("/api/convert-to-audio", {
        method: "POST",
        body: formData,
      });

      console.log('API Response Status:', response.status, response.statusText);
      console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));

      clearInterval(progressInterval);
      setConversionProgress(100);

      if (response.ok) {
        // Get metadata from response headers if available
        const langHeader = response.headers.get("x-detected-language");
        const lenHeader = response.headers.get("x-text-length");
        if (langHeader) setDetectedLanguage(langHeader);
        if (lenHeader) setTextLength(parseInt(lenHeader));

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        setAudioUrl(audioUrl);

        // Save converted audio state to localStorage
        // Convert blob to base64 for storage
        if (typeof window !== "undefined") {
          try {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result) {
                const base64 =
                  (e.target.result as string).split(",")[1] ||
                  (e.target.result as string);
                localStorage.setItem("convertedAudioUrl", base64);
                if (langHeader)
                  localStorage.setItem("convertedDetectedLanguage", langHeader);
                if (lenHeader)
                  localStorage.setItem("convertedTextLength", lenHeader);
                // Also save file info for restoration
                if (uploadedFile) {
                  const fileReader = new FileReader();
                  fileReader.onload = (fe) => {
                    if (fe.target?.result) {
                      const fileBase64 =
                        (fe.target.result as string).split(",")[1] ||
                        (fe.target.result as string);
                      localStorage.setItem("convertedFileData", fileBase64);
                      localStorage.setItem(
                        "convertedFileName",
                        uploadedFile.name
                      );
                    }
                  };
                  fileReader.readAsDataURL(uploadedFile);
                }
              }
            };
            reader.readAsDataURL(blob);
          } catch (error) {
            console.error("Error saving converted audio:", error);
          }
        }
      } else {
        // Get detailed error from response
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          // If response is not JSON, get text
          const textError = await response.text();
          throw new Error(textError || `HTTP ${response.status}: ${response.statusText}`);
        }

        const errorMessage = errorData?.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          fullResponse: errorData
        });
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Error converting PDF to audio:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      if (errorMessage.includes("API key")) {
        alert(
          "❌ OpenAI API Key Missing\n\nPlease add your OPENAI_API_KEY to the .env.local file and restart the server."
        );
      } else if (
        errorMessage.includes("quota") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("All OpenAI API keys")
      ) {
        alert(
          `🚨 All API Keys Quota Exceeded\n\n` +
          `All your OpenAI API keys have hit their usage limits.\n\n` +
          `Quick Solutions:\n` +
          `• Add billing to your OpenAI accounts at platform.openai.com/account/billing\n` +
          `• Add $5-10 to each account (very affordable)\n` +
          `• Wait 1 hour if on free tier\n` +
          `• Try with a smaller PDF (1-2 pages)\n\n` +
          `Your app supports multiple API keys - just add billing and you're back online!\n\n` +
          `Cost: ~$0.25 per PDF conversion (very cheap!)`
        );
      } else if (errorMessage.includes("billing")) {
        alert(
          "💳 OpenAI Billing Issue\n\nPlease check your payment method at platform.openai.com/account/billing"
        );
      } else {
        alert(
          `❌ Conversion Failed\n\n${errorMessage}\n\nPlease try again or check your internet connection.`
        );
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
          <div className="flex justify-between items-center mb-8">
            <div></div>
            {session ? (
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowConversationsHistory(true)}
                  className="flex items-center gap-2"
                >
                  <FaHistory />
                  View Past Conversations
                </Button>
                <Link href="/support">
                  <Button variant="outline" className="flex items-center gap-2">
                    <MessageCircleQuestion className="w-4 h-4" />
                  </Button>
                </Link>
                <span className="text-sm text-muted-foreground">
                  Welcome, {session.user?.name || session.user?.email}
                </span>
                <Button variant="outline" onClick={() => signOut()}>
                  Sign Out
                </Button>
              </div>
            ) : null}
          </div>

          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            AI PDF-to-Audio Platform
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Transform your PDFs into natural, human-like audio with advanced AI
            voice technology
          </p>

          {/* Expired Link Error Banner */}
          {expiredLinkError && (
            <div className="max-w-2xl mx-auto mb-8">
              <div className="bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-500 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">⏰</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-orange-700 dark:text-orange-400 mb-2">
                      Email Link Expired
                    </h3>
                    <p className="text-sm text-orange-600 dark:text-orange-300 mb-4">
                      The verification link in your email has expired. Please
                      request a new verification email.
                      {expiredLinkError.email && (
                        <span className="block mt-2 font-medium">
                          Resending to:{" "}
                          <span className="text-orange-800 dark:text-orange-200">
                            {expiredLinkError.email}
                          </span>
                        </span>
                      )}
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={() =>
                          handleResendVerification(expiredLinkError.email)
                        }
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        Resend Verification Email
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setExpiredLinkError(null)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Input Type Selector */}
          {!uploadedFile && !isConverting && !audioUrl && (
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Subscription Info Banner */}
              {session && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <FaCrown
                      className={
                        session.user?.subscriptionPlan === "paid"
                          ? "text-yellow-500"
                          : "text-muted-foreground"
                      }
                    />
                    <span className="font-medium capitalize">
                      {session.user?.subscriptionPlan || "free"} Plan
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      Conversions:{" "}
                      <strong
                        className={
                          (session.user?.conversions ?? 0) <= 2 ? "text-red-500" : "text-foreground"
                        }
                      >
                        {session.user?.conversions ?? 0}
                      </strong>
                    </span>
                    <span className="text-muted-foreground">
                      Max File Size: <strong>{session.user?.subscriptionPlan === "paid" ? "30MB" : "5MB"}</strong>
                    </span>
                    {session.user?.subscriptionPlan && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => (window.location.href = "/pricing")}
                        className="text-xs"
                      >
                        {session.user?.subscriptionPlan === "free" ? "Upgrade" : "Degrade"}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-card p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4 text-center">Choose Input Type</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setInputType('pdf')}
                    className={`p-4 rounded-lg border-2 transition-all ${inputType === 'pdf'
                        ? 'border-primary bg-primary/5 scale-105'
                        : 'border-border hover:border-primary/50'
                      }`}
                  >
                    <FaFilePdf className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="font-semibold text-sm">Upload PDF</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Extract text from PDF file
                    </div>
                  </button>
                  <button
                    onClick={() => setInputType('text')}
                    className={`p-4 rounded-lg border-2 transition-all ${inputType === 'text'
                        ? 'border-primary bg-primary/5 scale-105'
                        : 'border-border hover:border-primary/50'
                      }`}
                  >
                    <FaKeyboard className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="font-semibold text-sm">Enter Text</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Type or paste text directly
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PDF Uploader */}
          {inputType === 'pdf' && !uploadedFile && !inputText && !isConverting && !audioUrl && (
            <PDFUploader
              onFileUpload={handleFileUpload}
              onLoginRequired={() => setShowAuthModal(true)}
            />
          )}

          {/* Text Input */}
          {inputType === 'text' && !uploadedFile && !showSettings && !isConverting && !audioUrl && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-card p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Enter Your Text</h3>
                <textarea
                  value={inputText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Type or paste your text here (max 1000 characters)..."
                  className="w-full min-h-[200px] p-4 border border-input rounded-lg resize-y bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  maxLength={1000}
                />
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-muted-foreground w-full">
                    <span>{inputText.length} / 1000 characters</span>
                  </div>
                  <div className="flex gap-3 justify-end w-full">
                    <div className="relative group inline-block">
                      <Button
                        onClick={handleContinueToSettings}
                        disabled={!minimumTextReady}
                        className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue to Conversion
                      </Button>

                      {!minimumTextReady && (
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block 
                     bg-black text-white text-xs px-2 py-1 rounded shadow whitespace-nowrap">
                          Enter at least 10 characters
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}

          {((uploadedFile || (inputText && inputText.trim().length >= 10 && showSettings))) && !isConverting && !audioUrl && (
            <div className="space-y-6" id="voice-settings-section">
              {/* File/Text Info */}
              <div className="text-center">
                <div className="bg-card p-6 rounded-lg border relative group">
                  <button
                    onClick={() => {
                      setUploadedFile(null);
                      setInputText('');
                      if (typeof window !== "undefined") {
                        localStorage.removeItem("uploadedFileData");
                        localStorage.removeItem("uploadedFileName");
                        localStorage.removeItem("inputText");
                      }
                    }}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2"
                    aria-label="Remove"
                  >
                    <FaTimes className="w-3 h-3" />
                    Clear
                  </button>
                  <h3 className="text-lg font-semibold mb-2">
                    {uploadedFile ? 'File Ready' : 'Text Ready'}
                  </h3>
                  {uploadedFile ? (
                    <p className="text-muted-foreground mb-4">
                      {uploadedFile.name} (
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  ) : (
                    <div className="text-muted-foreground mb-4">
                      <p className="mb-2">{inputText.length} characters ready to convert</p>
                      <div className="max-w-2xl mx-auto mt-4 p-4 bg-muted/50 rounded-lg text-left">
                        <p className="text-sm font-medium mb-2">Text Preview:</p>
                        <p className="text-sm line-clamp-3">{inputText}</p>
                      </div>
                      <button
                        onClick={() => setShowSettings(false)}
                        className="mt-3 text-sm text-primary hover:underline"
                      >
                        Edit Text
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Convert Button */}
              <div className="text-center">
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={handleConvertToAudio}
                    className="bg-primary text-primary-foreground px-10 py-4 rounded-lg font-semibold hover:bg-primary/90 transition-all text-lg shadow-md hover:shadow-lg min-w-[240px]"
                  >
                    🎵 Convert to Audio
                  </button>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Using{" "}
                  <strong>
                    {AVAILABLE_VOICES.find((v) => v.id === selectedVoice)?.name}
                  </strong>{" "}
                  (
                  {AVAILABLE_VOICES.find((v) => v.id === selectedVoice)?.gender}
                  ) • {voiceSettings.speed.toFixed(1)}x speed
                  {voiceSettings.instructions && " • Custom settings"}
                </div>
              </div>

              {/* Advanced Voice Settings */}
              <VoiceSettings
                onSettingsChange={setVoiceSettings}
                initialSettings={{
                  speed: voiceSettings.speed,
                  emotionalRange: voiceSettings.emotionalRange,
                  tone: voiceSettings.tone,
                  intonation: voiceSettings.intonation,
                  customInstructions: voiceSettings.customInstructions,
                }}
              />

              {/* Voice Selection */}
              <VoiceSelector
                selectedVoice={selectedVoice}
                onVoiceChange={setSelectedVoice}
              />
            </div>
          )}

          {isConverting && <ConversionLoader progress={conversionProgress} />}

          {audioUrl && (
            <div className="space-y-6">
              <AudioPlayer
                audioUrl={audioUrl}
                fileName={uploadedFile?.name || "Converted Audio"}
                pdfFile={uploadedFile}
                voiceSettings={{
                  ...voiceSettings,
                  voice: selectedVoice,
                }}
                detectedLanguage={detectedLanguage}
                textLength={textLength}
              />

              {/* Start Over Button */}
              <div className="text-center">
                <button
                  onClick={handleStartOver}
                  className="bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-medium hover:bg-secondary/90 transition-colors"
                >
                  Convert Another {uploadedFile ? 'PDF' : 'Text'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />

      <ConversationsHistory
        isOpen={showConversationsHistory}
        onClose={() => setShowConversationsHistory(false)}
      />
    </div>
  );
}
