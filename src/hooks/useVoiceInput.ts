import { useCallback, useEffect, useRef, useState } from "react";
import { routeFromSpeech, speechLocales } from "../services/rideServices";
import type { BrowserSpeechRecognition, Locale, SpeechRecognitionConstructor } from "../services/rideServices";

type Messages = {
  noSpeech: string;
  voiceUnsupported: string;
  microphoneStartError: string;
};

export function useVoiceInput(locale: Locale, messages: Messages, enabled: boolean, onTrip: (pickup: string | null, destination: string, transcript: string) => void) {
  const [micState, setMicState] = useState<"idle" | "listening" | "processing">("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const shouldKeepListeningRef = useRef(false);
  const capturedTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const recognitionErrorRef = useRef("");
  const messagesRef = useRef(messages);
  const onTripRef = useRef(onTrip);
  messagesRef.current = messages;
  onTripRef.current = onTrip;

  const finishListening = useCallback(() => {
    const capturedText = [capturedTranscriptRef.current, interimTranscriptRef.current].filter(Boolean).join(" ").trim();
    recognitionRef.current = null;
    shouldKeepListeningRef.current = false;
    setMicState("idle");
    setLiveTranscript("");
    interimTranscriptRef.current = "";
    if (capturedText) {
      const route = routeFromSpeech(capturedText);
      if (route.destination) {
        setVoiceError("");
        onTripRef.current(route.pickup, route.destination, capturedText);
      } else {
        setVoiceError(messagesRef.current.noSpeech);
      }
    } else {
      setVoiceError(recognitionErrorRef.current || messagesRef.current.noSpeech);
    }
  }, []);

  const startOrStopListening = useCallback(() => {
    if (micState === "listening") {
      shouldKeepListeningRef.current = false;
      try {
        recognitionRef.current?.stop();
        setMicState("processing");
      } catch {
        recognitionRef.current = null;
        setMicState("idle");
        setVoiceError(messagesRef.current.microphoneStartError);
      }
      return;
    }
    if (micState === "processing") return;

    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError(messagesRef.current.voiceUnsupported);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = speechLocales[locale];
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const finalParts: string[] = [];
      const interimParts: string[] = [];
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const part = result[0]?.transcript.trim();
        if (!part) continue;
        if (result.isFinal) finalParts.push(part);
        else interimParts.push(part);
      }
      if (finalParts.length) {
        capturedTranscriptRef.current = [capturedTranscriptRef.current, ...finalParts].filter(Boolean).join(" ");
      }
      interimTranscriptRef.current = interimParts.join(" ");
      setLiveTranscript([capturedTranscriptRef.current, interimTranscriptRef.current].filter(Boolean).join(" "));
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech") return;
      if (event.error === "aborted" && !shouldKeepListeningRef.current) return;
      recognitionErrorRef.current = event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Microphone permission was denied. Allow microphone access or type your destination."
        : event.error === "audio-capture"
          ? "No microphone was found. Connect one or type your destination."
          : messagesRef.current.microphoneStartError;
      shouldKeepListeningRef.current = false;
      setVoiceError(recognitionErrorRef.current);
      setMicState("idle");
    };
    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        window.setTimeout(() => {
          if (!shouldKeepListeningRef.current) return;
          try {
            recognition.start();
          } catch {
            recognitionErrorRef.current = "Voice recognition stopped unexpectedly. Tap the mic and try again.";
            shouldKeepListeningRef.current = false;
            finishListening();
          }
        }, 250);
        return;
      }
      finishListening();
    };

    try {
      setVoiceError("");
      setLiveTranscript("");
      capturedTranscriptRef.current = "";
      interimTranscriptRef.current = "";
      recognitionErrorRef.current = "";
      shouldKeepListeningRef.current = true;
      recognitionRef.current = recognition;
      setMicState("listening");
      recognition.start();
    } catch {
      recognitionRef.current = null;
      shouldKeepListeningRef.current = false;
      setMicState("idle");
      setVoiceError(messagesRef.current.microphoneStartError);
    }
  }, [finishListening, locale, micState]);

  useEffect(() => {
    if (enabled) return;
    shouldKeepListeningRef.current = false;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    }
    setMicState("idle");
    setLiveTranscript("");
  }, [enabled]);

  useEffect(() => () => {
    shouldKeepListeningRef.current = false;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    }
    window.speechSynthesis?.cancel();
  }, []);

  return { micState, liveTranscript, voiceError, setVoiceError, startOrStopListening };
}
