import { createElement, useEffect, useMemo, useState } from "react";
import type React from "react";
import {
  getCurrentCoordinates,
  languages,
  prepareUberHandoffUrl,
  speechLocales,
} from "./services/rideServices";
import type { Coordinates, Locale } from "./services/rideServices";
import { clearSavedPreferences, getSavedDarkMode, getSavedDisplayName, getSavedLocale, getSavedVoiceSpeed, sanitizeDisplayName, saveDarkMode, saveDisplayName, saveLocale, saveVoiceSpeed } from "./services/preferences";
import { useVoiceInput } from "./hooks/useVoiceInput";
import { getPersonalizedGreeting } from "./services/greeting";

type Screen =
  | "splash"
  | "language"
  | "permissions"
  | "home"
  | "review"
  | "location"
  | "recommendation"
  | "confirm"
  | "handoff"
  | "summary"
  | "settings"
  | "states"
  | "spec"
  | "privacy";
type IconName =
  | "arrow"
  | "auto"
  | "bike"
  | "cab"
  | "check"
  | "chevron"
  | "close"
  | "gear"
  | "globe"
  | "keyboard"
  | "location"
  | "mic"
  | "moon"
  | "pin"
  | "route"
  | "shield"
  | "spark"
  | "speaker"
  | "sun"
  | "users"
  | "xl";

function speak(text: string, locale: Locale, rate = 1) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = speechLocales[locale];
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}

const copy: Record<Locale, Record<string, string>> = {
  en: {
    prompt: "Where do you want to go?",
    hint: "Tap and speak",
    yes: "Yes, that's right",
    change: "Change",
    best: "Best for you",
    confirm: "Confirm ride",
    heard: "Here’s what I heard",
    again: "Speak again",
    pickup: "Pickup",
    destination: "Destination",
    compare: "Compare rides",
    choose: "Choose this",
    other: "See other options",
  },
  te: {
    prompt: "మీరు ఎక్కడికి వెళ్లాలి?",
    hint: "మాట్లాడటానికి నొక్కండి",
    yes: "అవును, సరైనది",
    change: "మార్చండి",
    best: "మీకు ఉత్తమం",
    confirm: "రైడ్ నిర్ధారించండి",
    heard: "నేను విన్నది ఇదే",
    again: "మళ్లీ చెప్పండి",
    pickup: "ఎక్కే స్థలం",
    destination: "గమ్యస్థానం",
    compare: "రైడ్‌లను పోల్చండి",
    choose: "దీన్ని ఎంచుకోండి",
    other: "ఇతర ఎంపికలు చూడండి",
  },
  ta: {
    prompt: "நீங்கள் எங்கே செல்ல வேண்டும்?",
    hint: "பேச தட்டவும்",
    yes: "ஆம், சரிதான்",
    change: "மாற்று",
    best: "உங்களுக்கு சிறந்தது",
    confirm: "பயணத்தை உறுதிப்படுத்தவும்",
    heard: "நான் கேட்டது இதுதான்",
    again: "மீண்டும் பேசவும்",
    pickup: "புறப்படும் இடம்",
    destination: "சேருமிடம்",
    compare: "பயணங்களை ஒப்பிடுக",
    choose: "இதைத் தேர்ந்தெடு",
    other: "மற்ற விருப்பங்களைப் பார்",
  },
  kn: {
    prompt: "ನೀವು ಎಲ್ಲಿಗೆ ಹೋಗಬೇಕು?",
    hint: "ಮಾತನಾಡಲು ಒತ್ತಿ",
    yes: "ಹೌದು, ಸರಿಯಾಗಿದೆ",
    change: "ಬದಲಿಸಿ",
    best: "ನಿಮಗೆ ಉತ್ತಮ",
    confirm: "ರೈಡ್ ಖಚಿತಪಡಿಸಿ",
    heard: "ನಾನು ಕೇಳಿದ್ದು ಇದು",
    again: "ಮತ್ತೆ ಮಾತನಾಡಿ",
    pickup: "ಪಿಕಪ್",
    destination: "ತಲುಪುವ ಸ್ಥಳ",
    compare: "ರೈಡ್‌ಗಳನ್ನು ಹೋಲಿಸಿ",
    choose: "ಇದನ್ನು ಆರಿಸಿ",
    other: "ಇತರ ಆಯ್ಕೆಗಳನ್ನು ನೋಡಿ",
  },
  hi: {
    prompt: "आप कहाँ जाना चाहते हैं?",
    hint: "बोलने के लिए दबाएँ",
    yes: "हाँ, सही है",
    change: "बदलें",
    best: "आपके लिए सबसे अच्छा",
    confirm: "राइड कन्फर्म करें",
    heard: "मैंने यह सुना",
    again: "फिर से बोलें",
    pickup: "पिकअप",
    destination: "मंज़िल",
    compare: "राइड की तुलना करें",
    choose: "इसे चुनें",
    other: "अन्य विकल्प देखें",
  },
  ml: {
    prompt: "നിങ്ങൾക്ക് എവിടേക്ക് പോകണം?",
    hint: "സംസാരിക്കാൻ അമർത്തുക",
    yes: "അതെ, ശരിയാണ്",
    change: "മാറ്റുക",
    best: "നിങ്ങൾക്ക് ഏറ്റവും നല്ലത്",
    confirm: "റൈഡ് സ്ഥിരീകരിക്കുക",
    heard: "ഞാൻ കേട്ടത് ഇതാണ്",
    again: "വീണ്ടും സംസാരിക്കുക",
    pickup: "പിക്കപ്പ്",
    destination: "ലക്ഷ്യസ്ഥാനം",
    compare: "റൈഡുകൾ താരതമ്യം ചെയ്യുക",
    choose: "ഇത് തിരഞ്ഞെടുക്കുക",
    other: "മറ്റ് ഓപ്ഷനുകൾ കാണുക",
  },
  mr: {
    prompt: "तुम्हाला कुठे जायचे आहे?",
    hint: "बोलण्यासाठी दाबा",
    yes: "होय, बरोबर",
    change: "बदला",
    best: "तुमच्यासाठी सर्वोत्तम",
    confirm: "राइड निश्चित करा",
    heard: "मी हे ऐकले",
    again: "पुन्हा बोला",
    pickup: "पिकअप",
    destination: "गंतव्य",
    compare: "राइडची तुलना करा",
    choose: "हे निवडा",
    other: "इतर पर्याय पहा",
  },
};

const routeConfirmationCopy: Record<Locale, {
  voiceCaptured: string;
  textCaptured: string;
  reviewVoiceTitle: string;
  reviewTextTitle: string;
  confirmDetails: string;
  voiceConfirmed: string;
  textConfirmed: string;
  bookingNotConfirmed: string;
  nameLabel: string;
  nameHelp: string;
}> = {
  en: {
    voiceCaptured: "Destination captured from speech.",
    textCaptured: "Destination entered with text.",
    reviewVoiceTitle: "Here’s what I heard",
    reviewTextTitle: "Review your destination",
    confirmDetails: "Confirm trip details",
    voiceConfirmed: "Trip details confirmed from speech.",
    textConfirmed: "Trip details confirmed from text.",
    bookingNotConfirmed: "This confirms only your trip details. No ride has been booked yet.",
    nameLabel: "Your name",
    nameHelp: "Used in your greeting and saved only in this browser.",
  },
  te: {
    voiceCaptured: "మాటల ద్వారా గమ్యస్థానం గుర్తించబడింది.",
    textCaptured: "టెక్స్ట్ ద్వారా గమ్యస్థానం నమోదు చేయబడింది.",
    reviewVoiceTitle: "నేను విన్నది ఇదే",
    reviewTextTitle: "మీ గమ్యస్థానాన్ని సమీక్షించండి",
    confirmDetails: "ప్రయాణ వివరాలను నిర్ధారించండి",
    voiceConfirmed: "మాటల ద్వారా ప్రయాణ వివరాలు నిర్ధారించబడ్డాయి.",
    textConfirmed: "టెక్స్ట్ ద్వారా ప్రయాణ వివరాలు నిర్ధారించబడ్డాయి.",
    bookingNotConfirmed: "ఇవి మీ ప్రయాణ వివరాలు మాత్రమే. ఇంకా రైడ్ బుక్ కాలేదు.",
    nameLabel: "మీ పేరు",
    nameHelp: "శుభాకాంక్షలో ఉపయోగిస్తాం. ఈ బ్రౌజర్‌లో మాత్రమే సేవ్ అవుతుంది.",
  },
  ta: {
    voiceCaptured: "குரல் மூலம் செல்லுமிடம் பெறப்பட்டது.",
    textCaptured: "உரை மூலம் செல்லுமிடம் உள்ளிடப்பட்டது.",
    reviewVoiceTitle: "நான் கேட்டது இதுதான்",
    reviewTextTitle: "உங்கள் செல்லுமிடத்தைச் சரிபார்க்கவும்",
    confirmDetails: "பயண விவரங்களை உறுதிப்படுத்தவும்",
    voiceConfirmed: "குரல் மூலம் பயண விவரங்கள் உறுதிப்படுத்தப்பட்டன.",
    textConfirmed: "உரை மூலம் பயண விவரங்கள் உறுதிப்படுத்தப்பட்டன.",
    bookingNotConfirmed: "இது பயண விவரங்களை மட்டும் உறுதிப்படுத்துகிறது. இன்னும் பயணம் முன்பதிவு செய்யப்படவில்லை.",
    nameLabel: "உங்கள் பெயர்",
    nameHelp: "வாழ்த்தில் பயன்படுத்தப்படும்; இந்த உலாவியில் மட்டும் சேமிக்கப்படும்.",
  },
  kn: {
    voiceCaptured: "ಮಾತಿನ ಮೂಲಕ ಗಮ್ಯಸ್ಥಾನ ಪಡೆಯಲಾಗಿದೆ.",
    textCaptured: "ಪಠ್ಯದ ಮೂಲಕ ಗಮ್ಯಸ್ಥಾನ ನಮೂದಿಸಲಾಗಿದೆ.",
    reviewVoiceTitle: "ನಾನು ಕೇಳಿದ್ದು ಇದು",
    reviewTextTitle: "ನಿಮ್ಮ ಗಮ್ಯಸ್ಥಾನ ಪರಿಶೀಲಿಸಿ",
    confirmDetails: "ಪ್ರಯಾಣದ ವಿವರಗಳನ್ನು ಖಚಿತಪಡಿಸಿ",
    voiceConfirmed: "ಮಾತಿನ ಮೂಲಕ ಪ್ರಯಾಣದ ವಿವರಗಳನ್ನು ಖಚಿತಪಡಿಸಲಾಗಿದೆ.",
    textConfirmed: "ಪಠ್ಯದ ಮೂಲಕ ಪ್ರಯಾಣದ ವಿವರಗಳನ್ನು ಖಚಿತಪಡಿಸಲಾಗಿದೆ.",
    bookingNotConfirmed: "ಇದು ಪ್ರಯಾಣದ ವಿವರಗಳನ್ನು ಮಾತ್ರ ಖಚಿತಪಡಿಸುತ್ತದೆ. ಇನ್ನೂ ರೈಡ್ ಬುಕ್ ಆಗಿಲ್ಲ.",
    nameLabel: "ನಿಮ್ಮ ಹೆಸರು",
    nameHelp: "ಶುಭಾಶಯದಲ್ಲಿ ಬಳಸಲಾಗುತ್ತದೆ; ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಮಾತ್ರ ಉಳಿಸಲಾಗುತ್ತದೆ.",
  },
  hi: {
    voiceCaptured: "आवाज़ से मंज़िल दर्ज की गई।",
    textCaptured: "टेक्स्ट से मंज़िल दर्ज की गई।",
    reviewVoiceTitle: "मैंने यह सुना",
    reviewTextTitle: "अपनी मंज़िल की समीक्षा करें",
    confirmDetails: "यात्रा विवरण की पुष्टि करें",
    voiceConfirmed: "आवाज़ से यात्रा विवरण की पुष्टि हुई।",
    textConfirmed: "टेक्स्ट से यात्रा विवरण की पुष्टि हुई।",
    bookingNotConfirmed: "यह केवल यात्रा विवरण की पुष्टि है। अभी कोई सवारी बुक नहीं हुई है।",
    nameLabel: "आपका नाम",
    nameHelp: "अभिवादन में उपयोग होगा और केवल इसी ब्राउज़र में सेव रहेगा।",
  },
  ml: {
    voiceCaptured: "ശബ്ദത്തിലൂടെ ലക്ഷ്യസ്ഥാനം ലഭിച്ചു.",
    textCaptured: "ടെക്സ്റ്റിലൂടെ ലക്ഷ്യസ്ഥാനം നൽകി.",
    reviewVoiceTitle: "ഞാൻ കേട്ടത് ഇതാണ്",
    reviewTextTitle: "നിങ്ങളുടെ ലക്ഷ്യസ്ഥാനം പരിശോധിക്കുക",
    confirmDetails: "യാത്രാ വിവരങ്ങൾ സ്ഥിരീകരിക്കുക",
    voiceConfirmed: "ശബ്ദത്തിലൂടെ യാത്രാ വിവരങ്ങൾ സ്ഥിരീകരിച്ചു.",
    textConfirmed: "ടെക്സ്റ്റിലൂടെ യാത്രാ വിവരങ്ങൾ സ്ഥിരീകരിച്ചു.",
    bookingNotConfirmed: "ഇത് യാത്രാ വിവരങ്ങൾ മാത്രം സ്ഥിരീകരിക്കുന്നു. ഇതുവരെ യാത്ര ബുക്ക് ചെയ്തിട്ടില്ല.",
    nameLabel: "നിങ്ങളുടെ പേര്",
    nameHelp: "അഭിവാദ്യത്തിൽ ഉപയോഗിക്കും; ഈ ബ്രൗസറിൽ മാത്രം സൂക്ഷിക്കും.",
  },
  mr: {
    voiceCaptured: "आवाजेतून ठिकाण नोंदवले.",
    textCaptured: "मजकुरातून ठिकाण नोंदवले.",
    reviewVoiceTitle: "मी हे ऐकले",
    reviewTextTitle: "तुमच्या ठिकाणाचा आढावा घ्या",
    confirmDetails: "प्रवासाच्या तपशीलांची पुष्टी करा",
    voiceConfirmed: "आवाजेतून प्रवासाच्या तपशीलांची पुष्टी झाली.",
    textConfirmed: "मजकुरातून प्रवासाच्या तपशीलांची पुष्टी झाली.",
    bookingNotConfirmed: "यामुळे फक्त प्रवासाच्या तपशीलांची पुष्टी होते. अजून राइड बुक झालेली नाही.",
    nameLabel: "तुमचे नाव",
    nameHelp: "अभिवादनात वापरले जाईल आणि फक्त या ब्राउझरमध्ये जतन होईल.",
  },
};

const pageCopy: Record<Locale, Record<string, string>> = {
  en: {
    splashEyebrow: "YOUR VOICE. YOUR WAY.", splashLead: "A ride is just a", splashEmphasis: "conversation", splashTail: "away.", splashSubtitle: "Book safely in the language you know best.", splashTrust: "Voice-first • Your choice • Easy", getStarted: "Get started", back: "Go back", settingsLabel: "Settings", hearLanguage: "Hear",
    languageStep: "STEP 1 OF 2", languageTitle: "Choose your language", languageSubtitle: "Choose the language you are most comfortable with.", continueIn: "Continue in", progressStep: "Step", progressOf: "of",
    microphoneLabel: "MICROPHONE", locationLabel: "LOCATION", speakTitle: "Speak, don't type", speakDescription: "RideSetu listens only when you tap the mic. Your voice helps us understand where you want to go.", locationTitle: "Find you and your ride", locationDescription: "Location helps confirm your pickup and show nearby rides. You can always change it.", privacyTitle: "You're in control", privacyDescription: "You can clear local RideSetu preferences here. Data handled by external providers follows their privacy terms.", allowMicrophone: "Allow microphone", allowLocation: "Allow location", notNow: "Not now",
    listening: "I'm listening…", processing: "Understanding your trip…", trySaying: "Try saying", exampleTrip: "Take me to City Care Hospital", tapWhenDone: "Tap when you're done", replayPrompt: "Replay prompt", typeInstead: "Type instead", typeDestination: "Type your destination", submitDestination: "Submit destination",
    voiceCheck: "VOICE CHECK", clearMatch: "Trip details extracted", from: "FROM", to: "TO", currentLocation: "My current location", routeTitle: "Check your route", yourTrip: "YOUR TRIP", deviceLocationReady: "Device location ready", locationWillUse: "Your device location will be used", addressWillMatch: "Address will be matched before booking", useCurrentLocation: "Use my current location", uberIntro: "Continue to Uber to review live rides and confirm your booking.", seeLiveUber: "See live rides in Uber", preparingUber: "Preparing Uber…",
    noSpeech: "I couldn't hear a destination. Check your microphone, try speaking closer, or type your destination.", voiceUnsupported: "Voice input is not supported in this browser. Type your destination instead.", microphoneStartError: "Microphone could not start. Check browser permissions or type your destination.",
    settingsTitle: "Settings", yourPreferences: "YOUR PREFERENCES", languageSetting: "Language", changeLanguage: "Change language", voiceSpeed: "Voice speed", slower: "Slower", normal: "Normal", faster: "Faster", darkMode: "Dark mode", darkModeDescription: "Gentler on your eyes at night", helpPrivacy: "HELP & PRIVACY", helpSystemStates: "Help & system states", offlinePermissions: "Offline, permissions and more", designSystemSpecs: "Design system specs", tokensHandoff: "Tokens and developer handoff", privacyPolicy: "Privacy policy", privacyDescriptionShort: "How your information is used", deleteMyData: "Delete my data", deleteDataDescription: "Remove voice and trip history", demoVersion: "Demo version 1.0",
  },
  te: {
    splashEyebrow: "మీ స్వరం. మీ ఎంపిక.", splashLead: "ప్రయాణం కేవలం ఒక", splashEmphasis: "సంభాషణ", splashTail: "దూరంలో ఉంది.", splashSubtitle: "మీకు బాగా తెలిసిన భాషలో సురక్షితంగా ప్రయాణాన్ని బుక్ చేయండి.", splashTrust: "వాయిస్‌తో • మీ ఎంపిక • సులభం", getStarted: "ప్రారంభించండి", back: "వెనక్కి", settingsLabel: "సెట్టింగ్‌లు", hearLanguage: "వినండి",
    languageStep: "దశ 1 / 2", languageTitle: "మీ భాషను ఎంచుకోండి", languageSubtitle: "మీకు సౌకర్యంగా ఉండే భాషను ఎంచుకోండి.", continueIn: "ఈ భాషలో కొనసాగండి:", progressStep: "దశ", progressOf: "లో",
    microphoneLabel: "మైక్రోఫోన్", locationLabel: "స్థానం", speakTitle: "టైప్ చేయకుండా మాట్లాడండి", speakDescription: "మీరు మైక్‌ను నొక్కినప్పుడు మాత్రమే RideSetu వింటుంది. మీరు ఎక్కడికి వెళ్లాలనుకుంటున్నారో మీ మాటల ద్వారా తెలుసుకుంటుంది.", locationTitle: "మీరు మరియు మీ ప్రయాణం", locationDescription: "పికప్‌ను నిర్ధారించడానికి, సమీపంలోని ప్రయాణాలను చూపడానికి స్థానం ఉపయోగపడుతుంది. దీన్ని ఎప్పుడైనా మార్చవచ్చు.", privacyTitle: "మీ నియంత్రణలోనే", privacyDescription: "మీ స్థానిక RideSetu ప్రాధాన్యతలను ఇక్కడ తొలగించవచ్చు. ఇతర సేవల డేటా వాటి గోప్యతా నిబంధనలకు లోబడి ఉంటుంది.", allowMicrophone: "మైక్రోఫోన్‌కు అనుమతి ఇవ్వండి", allowLocation: "స్థానానికి అనుమతి ఇవ్వండి", notNow: "ఇప్పుడు వద్దు",
    listening: "వింటున్నాను…", processing: "మీ ప్రయాణాన్ని అర్థం చేసుకుంటున్నాం…", trySaying: "ఇలా చెప్పండి", exampleTrip: "నన్ను సిటీ కేర్ ఆసుపత్రికి తీసుకెళ్లండి", tapWhenDone: "పూర్తయ్యాక నొక్కండి", replayPrompt: "సూచనను మళ్లీ వినండి", typeInstead: "టైప్ చేయండి", typeDestination: "మీ గమ్యస్థానాన్ని టైప్ చేయండి", submitDestination: "గమ్యస్థానాన్ని పంపండి",
    voiceCheck: "వాయిస్‌ను తనిఖీ చేయండి", clearMatch: "ప్రయాణ వివరాలు గుర్తించబడ్డాయి", from: "నుండి", to: "వరకు", currentLocation: "నా ప్రస్తుత స్థానం", routeTitle: "మీ మార్గాన్ని తనిఖీ చేయండి", yourTrip: "మీ ప్రయాణం", deviceLocationReady: "పరికర స్థానం సిద్ధంగా ఉంది", locationWillUse: "మీ పరికర స్థానాన్ని ఉపయోగిస్తాం", addressWillMatch: "బుకింగ్‌కు ముందు చిరునామాను సరిపోలుస్తాం", useCurrentLocation: "నా ప్రస్తుత స్థానాన్ని ఉపయోగించండి", uberIntro: "ప్రత్యక్ష రైడ్‌లను చూసి బుకింగ్‌ను నిర్ధారించడానికి Uberకు వెళ్లండి.", seeLiveUber: "Uberలో ప్రత్యక్ష రైడ్‌లను చూడండి", preparingUber: "Uberను సిద్ధం చేస్తున్నాం…",
    noSpeech: "గమ్యస్థానం వినిపించలేదు. మైక్రోఫోన్‌ను తనిఖీ చేసి, దగ్గరగా మాట్లాడండి లేదా టైప్ చేయండి.", voiceUnsupported: "ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్‌కు మద్దతు లేదు. గమ్యస్థానాన్ని టైప్ చేయండి.", microphoneStartError: "మైక్రోఫోన్ ప్రారంభం కాలేదు. బ్రౌజర్ అనుమతులను తనిఖీ చేయండి లేదా టైప్ చేయండి.",
    settingsTitle: "సెట్టింగ్‌లు", yourPreferences: "మీ ప్రాధాన్యతలు", languageSetting: "భాష", changeLanguage: "భాష మార్చండి", voiceSpeed: "వాయిస్ వేగం", slower: "నెమ్మదిగా", normal: "సాధారణం", faster: "వేగంగా", darkMode: "డార్క్ మోడ్", darkModeDescription: "రాత్రివేళ కళ్లకు సౌకర్యంగా ఉంటుంది", helpPrivacy: "సహాయం మరియు గోప్యత", helpSystemStates: "సహాయం మరియు సిస్టమ్ స్థితులు", offlinePermissions: "ఆఫ్‌లైన్, అనుమతులు మరియు మరిన్ని", designSystemSpecs: "డిజైన్ సిస్టమ్ వివరాలు", tokensHandoff: "టోకెన్లు మరియు డెవలపర్ సమాచారం", privacyPolicy: "గోప్యతా విధానం", privacyDescriptionShort: "మీ సమాచారం ఎలా ఉపయోగించబడుతుంది", deleteMyData: "నా డేటాను తొలగించండి", deleteDataDescription: "వాయిస్ మరియు ప్రయాణ చరిత్రను తొలగించండి", demoVersion: "డెమో వెర్షన్ 1.0",
  },
  ta: {
    splashEyebrow: "உங்கள் குரல். உங்கள் வழி.", splashLead: "ஒரு பயணம் ஒரு", splashEmphasis: "உரையாடல்", splashTail: "தொலைவில்தான்.", splashSubtitle: "உங்களுக்கு நன்கு தெரிந்த மொழியில் பாதுகாப்பாகப் பயணத்தை முன்பதிவு செய்யுங்கள்.", splashTrust: "குரல் வழி • உங்கள் தேர்வு • எளிது", getStarted: "தொடங்குங்கள்", back: "பின்னால்", settingsLabel: "அமைப்புகள்", hearLanguage: "கேளுங்கள்",
    languageStep: "படி 1 / 2", languageTitle: "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்", languageSubtitle: "உங்களுக்கு வசதியான மொழியைத் தேர்ந்தெடுக்கவும்.", continueIn: "இந்த மொழியில் தொடரவும்:", progressStep: "படி", progressOf: "இல்",
    microphoneLabel: "ஒலிவாங்கி", locationLabel: "இருப்பிடம்", speakTitle: "தட்டச்சு செய்யாமல் பேசுங்கள்", speakDescription: "ஒலிவாங்கியைத் தட்டும்போது மட்டுமே RideSetu கேட்கும். நீங்கள் செல்ல விரும்பும் இடத்தை உங்கள் குரல் தெரிவிக்கும்.", locationTitle: "உங்களையும் பயணத்தையும் கண்டறியுங்கள்", locationDescription: "பிக்கப்பை உறுதிப்படுத்தவும் அருகிலுள்ள பயணங்களைக் காட்டவும் இருப்பிடம் உதவும். எப்போது வேண்டுமானாலும் மாற்றலாம்.", privacyTitle: "கட்டுப்பாடு உங்களிடம்", privacyDescription: "RideSetu உள்ளூர் விருப்பங்களை இங்கே அழிக்கலாம். பிற சேவைகளின் தரவு அவற்றின் தனியுரிமை விதிகளுக்கு உட்பட்டது.", allowMicrophone: "ஒலிவாங்கியை அனுமதி", allowLocation: "இருப்பிடத்தை அனுமதி", notNow: "இப்போது வேண்டாம்",
    listening: "கேட்கிறேன்…", processing: "உங்கள் பயணத்தைப் புரிந்துகொள்கிறோம்…", trySaying: "இப்படிச் சொல்லுங்கள்", exampleTrip: "சிட்டி கேர் மருத்துவமனைக்கு அழைத்துச் செல்லுங்கள்", tapWhenDone: "முடிந்ததும் தட்டவும்", replayPrompt: "வழிமுறையை மீண்டும் கேள்", typeInstead: "தட்டச்சு செய்", typeDestination: "செல்லும் இடத்தைத் தட்டச்சு செய்யவும்", submitDestination: "இடத்தைச் சமர்ப்பி",
    voiceCheck: "குரல் சரிபார்ப்பு", clearMatch: "பயண விவரங்கள் பிரித்தெடுக்கப்பட்டன", from: "இருந்து", to: "வரை", currentLocation: "எனது தற்போதைய இருப்பிடம்", routeTitle: "பாதையைச் சரிபார்க்கவும்", yourTrip: "உங்கள் பயணம்", deviceLocationReady: "சாதன இருப்பிடம் தயார்", locationWillUse: "உங்கள் சாதன இருப்பிடம் பயன்படுத்தப்படும்", addressWillMatch: "முன்பதிவுக்கு முன் முகவரி சரிபார்க்கப்படும்", useCurrentLocation: "எனது தற்போதைய இருப்பிடத்தைப் பயன்படுத்து", uberIntro: "நேரடி பயணங்களைப் பார்த்து முன்பதிவை உறுதிசெய்ய Uber-க்கு செல்லுங்கள்.", seeLiveUber: "Uber-ல் நேரடி பயணங்களைப் பார்", preparingUber: "Uber-ஐத் தயாரிக்கிறது…",
    noSpeech: "செல்லும் இடம் கேட்கவில்லை. ஒலிவாங்கியைச் சரிபார்த்து அருகில் பேசவும் அல்லது தட்டச்சு செய்யவும்.", voiceUnsupported: "இந்த உலாவியில் குரல் உள்ளீடு ஆதரிக்கப்படவில்லை. செல்லும் இடத்தைத் தட்டச்சு செய்யவும்.", microphoneStartError: "ஒலிவாங்கியைத் தொடங்க முடியவில்லை. உலாவி அனுமதிகளைச் சரிபார்க்கவும் அல்லது தட்டச்சு செய்யவும்.",
    settingsTitle: "அமைப்புகள்", yourPreferences: "உங்கள் விருப்பங்கள்", languageSetting: "மொழி", changeLanguage: "மொழியை மாற்று", voiceSpeed: "குரல் வேகம்", slower: "மெதுவாக", normal: "இயல்பு", faster: "வேகமாக", darkMode: "இருண்ட பயன்முறை", darkModeDescription: "இரவில் கண்களுக்கு இதமாக இருக்கும்", helpPrivacy: "உதவி மற்றும் தனியுரிமை", helpSystemStates: "உதவி மற்றும் கணினி நிலைகள்", offlinePermissions: "இணையமின்மை, அனுமதிகள் மற்றும் பல", designSystemSpecs: "வடிவமைப்பு அமைப்பு விவரங்கள்", tokensHandoff: "டோக்கன்கள் மற்றும் டெவலப்பர் தகவல்", privacyPolicy: "தனியுரிமைக் கொள்கை", privacyDescriptionShort: "உங்கள் தகவல் எவ்வாறு பயன்படுத்தப்படுகிறது", deleteMyData: "எனது தரவை நீக்கு", deleteDataDescription: "குரல் மற்றும் பயண வரலாற்றை நீக்கு", demoVersion: "டெமோ பதிப்பு 1.0",
  },
  kn: {
    splashEyebrow: "ನಿಮ್ಮ ಧ್ವನಿ. ನಿಮ್ಮ ಆಯ್ಕೆ.", splashLead: "ಪ್ರಯಾಣ ಕೇವಲ ಒಂದು", splashEmphasis: "ಸಂಭಾಷಣೆ", splashTail: "ದೂರದಲ್ಲಿದೆ.", splashSubtitle: "ನಿಮಗೆ ತಿಳಿದಿರುವ ಭಾಷೆಯಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿ ಪ್ರಯಾಣವನ್ನು ಬುಕ್ ಮಾಡಿ.", splashTrust: "ಧ್ವನಿ ಮೊದಲು • ನಿಮ್ಮ ಆಯ್ಕೆ • ಸುಲಭ", getStarted: "ಪ್ರಾರಂಭಿಸಿ", back: "ಹಿಂದೆ", settingsLabel: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು", hearLanguage: "ಕೇಳಿ",
    languageStep: "ಹಂತ 1 / 2", languageTitle: "ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ", languageSubtitle: "ನಿಮಗೆ ಅನುಕೂಲವಾದ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.", continueIn: "ಈ ಭಾಷೆಯಲ್ಲಿ ಮುಂದುವರಿಯಿರಿ:", progressStep: "ಹಂತ", progressOf: "ರಲ್ಲಿ",
    microphoneLabel: "ಮೈಕ್ರೊಫೋನ್", locationLabel: "ಸ್ಥಳ", speakTitle: "ಟೈಪ್ ಮಾಡದೆ ಮಾತನಾಡಿ", speakDescription: "ನೀವು ಮೈಕ್ ಒತ್ತಿದಾಗ ಮಾತ್ರ RideSetu ಕೇಳುತ್ತದೆ. ನೀವು ಎಲ್ಲಿಗೆ ಹೋಗಲು ಬಯಸುತ್ತೀರಿ ಎಂಬುದನ್ನು ನಿಮ್ಮ ಧ್ವನಿ ತಿಳಿಸುತ್ತದೆ.", locationTitle: "ನಿಮ್ಮನ್ನು ಮತ್ತು ಪ್ರಯಾಣವನ್ನು ಹುಡುಕಿ", locationDescription: "ಪಿಕಪ್ ದೃಢೀಕರಿಸಲು ಮತ್ತು ಹತ್ತಿರದ ಪ್ರಯಾಣಗಳನ್ನು ತೋರಿಸಲು ಸ್ಥಳ ಸಹಾಯ ಮಾಡುತ್ತದೆ. ಯಾವಾಗ ಬೇಕಾದರೂ ಬದಲಾಯಿಸಬಹುದು.", privacyTitle: "ನಿಯಂತ್ರಣ ನಿಮ್ಮ ಕೈಯಲ್ಲಿ", privacyDescription: "RideSetu ಸ್ಥಳೀಯ ಆದ್ಯತೆಗಳನ್ನು ಇಲ್ಲಿ ಅಳಿಸಬಹುದು. ಇತರ ಸೇವೆಗಳ ಡೇಟಾ ಅವುಗಳ ಗೌಪ್ಯತಾ ನಿಯಮಗಳಿಗೆ ಒಳಪಟ್ಟಿರುತ್ತದೆ.", allowMicrophone: "ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿಸಿ", allowLocation: "ಸ್ಥಳ ಅನುಮತಿಸಿ", notNow: "ಈಗ ಬೇಡ",
    listening: "ಕೇಳುತ್ತಿದ್ದೇನೆ…", processing: "ನಿಮ್ಮ ಪ್ರಯಾಣವನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳುತ್ತಿದ್ದೇವೆ…", trySaying: "ಹೀಗೆ ಹೇಳಿ", exampleTrip: "ನನ್ನನ್ನು ಸಿಟಿ ಕೇರ್ ಆಸ್ಪತ್ರೆಗೆ ಕರೆದುಕೊಂಡು ಹೋಗಿ", tapWhenDone: "ಮುಗಿದಾಗ ಒತ್ತಿ", replayPrompt: "ಸೂಚನೆಯನ್ನು ಮತ್ತೆ ಕೇಳಿ", typeInstead: "ಟೈಪ್ ಮಾಡಿ", typeDestination: "ನಿಮ್ಮ ಗಮ್ಯಸ್ಥಾನ ಟೈಪ್ ಮಾಡಿ", submitDestination: "ಗಮ್ಯಸ್ಥಾನ ಸಲ್ಲಿಸಿ",
    voiceCheck: "ಧ್ವನಿ ಪರಿಶೀಲನೆ", clearMatch: "ಪ್ರಯಾಣದ ವಿವರಗಳನ್ನು ಗುರುತಿಸಲಾಗಿದೆ", from: "ಇಂದ", to: "ಗೆ", currentLocation: "ನನ್ನ ಪ್ರಸ್ತುತ ಸ್ಥಳ", routeTitle: "ನಿಮ್ಮ ಮಾರ್ಗ ಪರಿಶೀಲಿಸಿ", yourTrip: "ನಿಮ್ಮ ಪ್ರಯಾಣ", deviceLocationReady: "ಸಾಧನದ ಸ್ಥಳ ಸಿದ್ಧವಾಗಿದೆ", locationWillUse: "ನಿಮ್ಮ ಸಾಧನದ ಸ್ಥಳ ಬಳಸಲಾಗುತ್ತದೆ", addressWillMatch: "ಬುಕಿಂಗ್‌ಗೂ ಮೊದಲು ವಿಳಾಸ ಹೊಂದಿಸಲಾಗುತ್ತದೆ", useCurrentLocation: "ನನ್ನ ಪ್ರಸ್ತುತ ಸ್ಥಳ ಬಳಸಿ", uberIntro: "ಲೈವ್ ರೈಡ್‌ಗಳನ್ನು ನೋಡಿ ಬುಕಿಂಗ್ ಖಚಿತಪಡಿಸಲು Uberಗೆ ಮುಂದುವರಿಯಿರಿ.", seeLiveUber: "Uberನಲ್ಲಿ ಲೈವ್ ರೈಡ್‌ಗಳನ್ನು ನೋಡಿ", preparingUber: "Uber ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ…",
    noSpeech: "ಗಮ್ಯಸ್ಥಾನ ಕೇಳಿಸಲಿಲ್ಲ. ಮೈಕ್ರೊಫೋನ್ ಪರಿಶೀಲಿಸಿ, ಹತ್ತಿರದಿಂದ ಮಾತನಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ.", voiceUnsupported: "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಇನ್‌ಪುಟ್ ಬೆಂಬಲಿತವಲ್ಲ. ಗಮ್ಯಸ್ಥಾನವನ್ನು ಟೈಪ್ ಮಾಡಿ.", microphoneStartError: "ಮೈಕ್ರೊಫೋನ್ ಪ್ರಾರಂಭವಾಗಲಿಲ್ಲ. ಬ್ರೌಸರ್ ಅನುಮತಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ.",
    settingsTitle: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು", yourPreferences: "ನಿಮ್ಮ ಆದ್ಯತೆಗಳು", languageSetting: "ಭಾಷೆ", changeLanguage: "ಭಾಷೆ ಬದಲಿಸಿ", voiceSpeed: "ಧ್ವನಿ ವೇಗ", slower: "ನಿಧಾನ", normal: "ಸಾಮಾನ್ಯ", faster: "ವೇಗ", darkMode: "ಡಾರ್ಕ್ ಮೋಡ್", darkModeDescription: "ರಾತ್ರಿ ಕಣ್ಣುಗಳಿಗೆ ಆರಾಮ", helpPrivacy: "ಸಹಾಯ ಮತ್ತು ಗೌಪ್ಯತೆ", helpSystemStates: "ಸಹಾಯ ಮತ್ತು ಸಿಸ್ಟಮ್ ಸ್ಥಿತಿಗಳು", offlinePermissions: "ಆಫ್‌ಲೈನ್, ಅನುಮತಿಗಳು ಮತ್ತು ಇನ್ನಷ್ಟು", designSystemSpecs: "ವಿನ್ಯಾಸ ವ್ಯವಸ್ಥೆಯ ವಿವರಗಳು", tokensHandoff: "ಟೋಕನ್‌ಗಳು ಮತ್ತು ಡೆವಲಪರ್ ಮಾಹಿತಿ", privacyPolicy: "ಗೌಪ್ಯತಾ ನೀತಿ", privacyDescriptionShort: "ನಿಮ್ಮ ಮಾಹಿತಿಯನ್ನು ಹೇಗೆ ಬಳಸಲಾಗುತ್ತದೆ", deleteMyData: "ನನ್ನ ಡೇಟಾ ಅಳಿಸಿ", deleteDataDescription: "ಧ್ವನಿ ಮತ್ತು ಪ್ರಯಾಣದ ಇತಿಹಾಸ ತೆಗೆದುಹಾಕಿ", demoVersion: "ಡೆಮೋ ಆವೃತ್ತಿ 1.0",
  },
  hi: {
    splashEyebrow: "आपकी आवाज़। आपका तरीका।", splashLead: "एक सवारी बस एक", splashEmphasis: "बातचीत", splashTail: "दूर है।", splashSubtitle: "अपनी जानी-पहचानी भाषा में सुरक्षित सवारी बुक करें।", splashTrust: "आवाज़ से • आपकी पसंद • आसान", getStarted: "शुरू करें", back: "पीछे जाएँ", settingsLabel: "सेटिंग", hearLanguage: "सुनें",
    languageStep: "चरण 1 / 2", languageTitle: "अपनी भाषा चुनें", languageSubtitle: "वह भाषा चुनें जिसमें आप सहज हैं।", continueIn: "इस भाषा में जारी रखें:", progressStep: "चरण", progressOf: "में",
    microphoneLabel: "माइक्रोफ़ोन", locationLabel: "लोकेशन", speakTitle: "टाइप नहीं, बोलें", speakDescription: "RideSetu केवल माइक दबाने पर सुनता है। आपकी आवाज़ से हमें पता चलता है कि आप कहाँ जाना चाहते हैं।", locationTitle: "आपको और आपकी सवारी को खोजें", locationDescription: "पिकअप की पुष्टि और पास की सवारियाँ दिखाने के लिए लोकेशन उपयोग होती है। आप इसे कभी भी बदल सकते हैं।", privacyTitle: "नियंत्रण आपके हाथ में", privacyDescription: "आप स्थानीय RideSetu प्राथमिकताएँ यहाँ मिटा सकते हैं। अन्य सेवाओं का डेटा उनकी गोपनीयता शर्तों के अधीन है।", allowMicrophone: "माइक्रोफ़ोन की अनुमति दें", allowLocation: "लोकेशन की अनुमति दें", notNow: "अभी नहीं",
    listening: "सुन रहा हूँ…", processing: "आपकी यात्रा समझ रहे हैं…", trySaying: "ऐसा बोलकर देखें", exampleTrip: "मुझे सिटी केयर अस्पताल ले चलें", tapWhenDone: "बोलने के बाद दबाएँ", replayPrompt: "निर्देश फिर सुनें", typeInstead: "टाइप करें", typeDestination: "अपनी मंज़िल लिखें", submitDestination: "मंज़िल भेजें",
    voiceCheck: "आवाज़ की जाँच", clearMatch: "यात्रा विवरण निकाले गए", from: "कहाँ से", to: "कहाँ तक", currentLocation: "मेरा वर्तमान स्थान", routeTitle: "अपना रास्ता जाँचें", yourTrip: "आपकी यात्रा", deviceLocationReady: "डिवाइस लोकेशन तैयार", locationWillUse: "आपके डिवाइस की लोकेशन उपयोग होगी", addressWillMatch: "बुकिंग से पहले पता मिलाया जाएगा", useCurrentLocation: "मेरी वर्तमान लोकेशन उपयोग करें", uberIntro: "लाइव सवारी देखने और बुकिंग की पुष्टि करने के लिए Uber पर जाएँ।", seeLiveUber: "Uber में लाइव सवारी देखें", preparingUber: "Uber तैयार हो रहा है…",
    noSpeech: "मंज़िल सुनाई नहीं दी। माइक्रोफ़ोन जाँचें, पास से बोलें या मंज़िल टाइप करें।", voiceUnsupported: "इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है। अपनी मंज़िल टाइप करें।", microphoneStartError: "माइक्रोफ़ोन शुरू नहीं हो सका। ब्राउज़र अनुमति जाँचें या मंज़िल टाइप करें।",
    settingsTitle: "सेटिंग", yourPreferences: "आपकी प्राथमिकताएँ", languageSetting: "भाषा", changeLanguage: "भाषा बदलें", voiceSpeed: "आवाज़ की गति", slower: "धीमी", normal: "सामान्य", faster: "तेज़", darkMode: "डार्क मोड", darkModeDescription: "रात में आँखों को आराम", helpPrivacy: "सहायता और गोपनीयता", helpSystemStates: "सहायता और सिस्टम स्थितियाँ", offlinePermissions: "ऑफ़लाइन, अनुमतियाँ और अन्य", designSystemSpecs: "डिज़ाइन सिस्टम विवरण", tokensHandoff: "टोकन और डेवलपर जानकारी", privacyPolicy: "गोपनीयता नीति", privacyDescriptionShort: "आपकी जानकारी का उपयोग कैसे होता है", deleteMyData: "मेरा डेटा मिटाएँ", deleteDataDescription: "आवाज़ और यात्रा इतिहास हटाएँ", demoVersion: "डेमो संस्करण 1.0",
  },
  ml: {
    splashEyebrow: "നിങ്ങളുടെ ശബ്ദം. നിങ്ങളുടെ വഴി.", splashLead: "ഒരു യാത്ര ഒരു", splashEmphasis: "സംഭാഷണം", splashTail: "മാത്രം അകലെയാണ്.", splashSubtitle: "നിങ്ങൾക്ക് പരിചിതമായ ഭാഷയിൽ സുരക്ഷിതമായി യാത്ര ബുക്ക് ചെയ്യൂ.", splashTrust: "ശബ്ദം ആദ്യം • നിങ്ങളുടെ തിരഞ്ഞെടുപ്പ് • എളുപ്പം", getStarted: "തുടങ്ങുക", back: "തിരികെ", settingsLabel: "ക്രമീകരണങ്ങൾ", hearLanguage: "കേൾക്കുക",
    languageStep: "ഘട്ടം 1 / 2", languageTitle: "നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക", languageSubtitle: "നിങ്ങൾക്ക് സൗകര്യമുള്ള ഭാഷ തിരഞ്ഞെടുക്കുക.", continueIn: "ഈ ഭാഷയിൽ തുടരുക:", progressStep: "ഘട്ടം", progressOf: "ൽ",
    microphoneLabel: "മൈക്രോഫോൺ", locationLabel: "സ്ഥലം", speakTitle: "ടൈപ്പ് ചെയ്യാതെ സംസാരിക്കൂ", speakDescription: "മൈക്ക് അമർത്തുമ്പോൾ മാത്രമാണ് RideSetu കേൾക്കുന്നത്. നിങ്ങൾ എവിടേക്ക് പോകണമെന്ന് നിങ്ങളുടെ ശബ്ദം ഞങ്ങളെ അറിയിക്കും.", locationTitle: "നിങ്ങളെയും യാത്രയെയും കണ്ടെത്താം", locationDescription: "പിക്കപ്പ് ഉറപ്പാക്കാനും സമീപ യാത്രകൾ കാണിക്കാനും സ്ഥലം സഹായിക്കും. എപ്പോൾ വേണമെങ്കിലും മാറ്റാം.", privacyTitle: "നിയന്ത്രണം നിങ്ങളുടെ കൈയിൽ", privacyDescription: "RideSetu പ്രാദേശിക മുൻഗണനകൾ ഇവിടെ മായ്ക്കാം. മറ്റ് സേവനങ്ങളിലെ ഡാറ്റ അവയുടെ സ്വകാര്യതാ നിബന്ധനകൾക്ക് വിധേയമാണ്.", allowMicrophone: "മൈക്രോഫോൺ അനുവദിക്കുക", allowLocation: "സ്ഥലം അനുവദിക്കുക", notNow: "ഇപ്പോൾ വേണ്ട",
    listening: "കേൾക്കുന്നു…", processing: "നിങ്ങളുടെ യാത്ര മനസ്സിലാക്കുന്നു…", trySaying: "ഇങ്ങനെ പറയൂ", exampleTrip: "എന്നെ സിറ്റി കെയർ ആശുപത്രിയിലേക്ക് കൊണ്ടുപോകൂ", tapWhenDone: "പൂർത്തിയായാൽ അമർത്തുക", replayPrompt: "നിർദേശം വീണ്ടും കേൾക്കുക", typeInstead: "ടൈപ്പ് ചെയ്യുക", typeDestination: "ലക്ഷ്യസ്ഥാനം ടൈപ്പ് ചെയ്യുക", submitDestination: "ലക്ഷ്യസ്ഥാനം സമർപ്പിക്കുക",
    voiceCheck: "ശബ്ദ പരിശോധന", clearMatch: "യാത്രാ വിവരങ്ങൾ വേർതിരിച്ചെടുത്തു", from: "ഇവിടെ നിന്ന്", to: "ഇവിടേക്ക്", currentLocation: "എന്റെ നിലവിലെ സ്ഥലം", routeTitle: "യാത്രാമാർഗം പരിശോധിക്കുക", yourTrip: "നിങ്ങളുടെ യാത്ര", deviceLocationReady: "ഉപകരണത്തിന്റെ സ്ഥലം തയ്യാറാണ്", locationWillUse: "നിങ്ങളുടെ ഉപകരണ സ്ഥലം ഉപയോഗിക്കും", addressWillMatch: "ബുക്കിംഗിന് മുമ്പ് വിലാസം പരിശോധിക്കും", useCurrentLocation: "എന്റെ നിലവിലെ സ്ഥലം ഉപയോഗിക്കുക", uberIntro: "തത്സമയ യാത്രകൾ കണ്ട് ബുക്കിംഗ് ഉറപ്പാക്കാൻ Uber-ലേക്ക് പോകുക.", seeLiveUber: "Uber-ൽ തത്സമയ യാത്രകൾ കാണുക", preparingUber: "Uber തയ്യാറാക്കുന്നു…",
    noSpeech: "ലക്ഷ്യസ്ഥാനം കേൾക്കാനായില്ല. മൈക്രോഫോൺ പരിശോധിച്ച് അടുത്ത് നിന്ന് സംസാരിക്കൂ അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യൂ.", voiceUnsupported: "ഈ ബ്രൗസറിൽ ശബ്ദ ഇൻപുട്ട് ലഭ്യമല്ല. ലക്ഷ്യസ്ഥാനം ടൈപ്പ് ചെയ്യൂ.", microphoneStartError: "മൈക്രോഫോൺ ആരംഭിക്കാനായില്ല. ബ്രൗസർ അനുമതി പരിശോധിക്കൂ അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യൂ.",
    settingsTitle: "ക്രമീകരണങ്ങൾ", yourPreferences: "നിങ്ങളുടെ മുൻഗണനകൾ", languageSetting: "ഭാഷ", changeLanguage: "ഭാഷ മാറ്റുക", voiceSpeed: "ശബ്ദ വേഗം", slower: "മന്ദം", normal: "സാധാരണം", faster: "വേഗം", darkMode: "ഡാർക്ക് മോഡ്", darkModeDescription: "രാത്രിയിൽ കണ്ണുകൾക്ക് ആശ്വാസം", helpPrivacy: "സഹായവും സ്വകാര്യതയും", helpSystemStates: "സഹായവും സിസ്റ്റം നിലകളും", offlinePermissions: "ഓഫ്‌ലൈൻ, അനുമതികൾ, മറ്റുള്ളവ", designSystemSpecs: "ഡിസൈൻ സിസ്റ്റം വിശദാംശങ്ങൾ", tokensHandoff: "ടോക്കണുകളും ഡെവലപ്പർ വിവരങ്ങളും", privacyPolicy: "സ്വകാര്യതാ നയം", privacyDescriptionShort: "നിങ്ങളുടെ വിവരങ്ങൾ എങ്ങനെ ഉപയോഗിക്കുന്നു", deleteMyData: "എന്റെ ഡാറ്റ ഇല്ലാതാക്കുക", deleteDataDescription: "ശബ്ദവും യാത്രാ ചരിത്രവും നീക്കുക", demoVersion: "ഡെമോ പതിപ്പ് 1.0",
  },
  mr: {
    splashEyebrow: "तुमचा आवाज. तुमची पद्धत.", splashLead: "प्रवास फक्त एका", splashEmphasis: "संभाषण", splashTail: "इतकाच दूर.", splashSubtitle: "तुम्हाला परिचित असलेल्या भाषेत सुरक्षितपणे राइड बुक करा.", splashTrust: "आवाज प्रथम • तुमची निवड • सोपे", getStarted: "सुरू करा", back: "मागे", settingsLabel: "सेटिंग्ज", hearLanguage: "ऐका",
    languageStep: "टप्पा 1 / 2", languageTitle: "तुमची भाषा निवडा", languageSubtitle: "तुम्हाला सोयीची वाटणारी भाषा निवडा.", continueIn: "या भाषेत पुढे जा:", progressStep: "टप्पा", progressOf: "पैकी",
    microphoneLabel: "मायक्रोफोन", locationLabel: "स्थान", speakTitle: "टाइप न करता बोला", speakDescription: "तुम्ही माइक दाबल्यावरच RideSetu ऐकते. तुम्हाला कुठे जायचे आहे हे तुमच्या आवाजातून समजते.", locationTitle: "तुम्हाला आणि राइडला शोधा", locationDescription: "पिकअपची पुष्टी आणि जवळच्या राइड दाखवण्यासाठी स्थान उपयोगी आहे. तुम्ही ते कधीही बदलू शकता.", privacyTitle: "नियंत्रण तुमच्या हातात", privacyDescription: "RideSetu स्थानिक पसंती येथे हटवू शकता. इतर सेवांमधील डेटा त्यांच्या गोपनीयता अटींनुसार हाताळला जातो.", allowMicrophone: "मायक्रोफोनला परवानगी द्या", allowLocation: "स्थानाला परवानगी द्या", notNow: "आत्ता नको",
    listening: "ऐकत आहे…", processing: "तुमचा प्रवास समजून घेत आहोत…", trySaying: "असे बोलून पाहा", exampleTrip: "मला सिटी केअर हॉस्पिटलला घेऊन चला", tapWhenDone: "झाल्यावर टॅप करा", replayPrompt: "सूचना पुन्हा ऐका", typeInstead: "टाइप करा", typeDestination: "तुमचे ठिकाण टाइप करा", submitDestination: "ठिकाण सबमिट करा",
    voiceCheck: "आवाज तपासणी", clearMatch: "प्रवासाचे तपशील ओळखले", from: "पासून", to: "पर्यंत", currentLocation: "माझे सध्याचे स्थान", routeTitle: "तुमचा मार्ग तपासा", yourTrip: "तुमचा प्रवास", deviceLocationReady: "डिव्हाइसचे स्थान तयार", locationWillUse: "तुमचे डिव्हाइसचे स्थान वापरले जाईल", addressWillMatch: "बुकिंगपूर्वी पत्ता जुळवला जाईल", useCurrentLocation: "माझे सध्याचे स्थान वापरा", uberIntro: "थेट राइड पाहण्यासाठी आणि बुकिंग निश्चित करण्यासाठी Uber वर जा.", seeLiveUber: "Uber वर थेट राइड पहा", preparingUber: "Uber तयार करत आहे…",
    noSpeech: "ठिकाण ऐकू आले नाही. मायक्रोफोन तपासा, जवळून बोला किंवा ठिकाण टाइप करा.", voiceUnsupported: "या ब्राउझरमध्ये आवाज इनपुट उपलब्ध नाही. ठिकाण टाइप करा.", microphoneStartError: "मायक्रोफोन सुरू झाला नाही. ब्राउझर परवानगी तपासा किंवा ठिकाण टाइप करा.",
    settingsTitle: "सेटिंग्ज", yourPreferences: "तुमच्या पसंती", languageSetting: "भाषा", changeLanguage: "भाषा बदला", voiceSpeed: "आवाजाचा वेग", slower: "हळू", normal: "सामान्य", faster: "जलद", darkMode: "डार्क मोड", darkModeDescription: "रात्री डोळ्यांना आराम", helpPrivacy: "मदत आणि गोपनीयता", helpSystemStates: "मदत आणि सिस्टम स्थिती", offlinePermissions: "ऑफलाइन, परवानग्या आणि अधिक", designSystemSpecs: "डिझाइन सिस्टम तपशील", tokensHandoff: "टोकन आणि डेव्हलपर माहिती", privacyPolicy: "गोपनीयता धोरण", privacyDescriptionShort: "तुमची माहिती कशी वापरली जाते", deleteMyData: "माझा डेटा हटवा", deleteDataDescription: "आवाज आणि प्रवासाचा इतिहास काढा", demoVersion: "डेमो आवृत्ती 1.0",
  },
};

const paths: Record<IconName, React.ReactNode> = {
  arrow: <><path d="m15 18-6-6 6-6" /><path d="M9 12h10" /></>,
  auto: <><path d="M5 16V9l3-3h7l4 5v5" /><path d="M3 16h18" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /><path d="M8 10h8" /></>,
  bike: <><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="m6 17 4-7 3 7 3-6h-4" /><path d="m8 7 3 1" /></>,
  cab: <><path d="m5 11 2-5h10l2 5" /><path d="M4 11h16v7H4z" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /><path d="M8 14h8" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  close: <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a2 2 0 0 0 .4 2.2l.1.1-2.6 2.6-.1-.1A2 2 0 0 0 15 19.4a2 2 0 0 0-1.2 1.8V21h-3.6v-.2A2 2 0 0 0 9 19.4a2 2 0 0 0-2.2.4l-.1.1-2.6-2.6.1-.1A2 2 0 0 0 4.6 15a2 2 0 0 0-1.8-1.2H3v-3.6h.2A2 2 0 0 0 4.6 9a2 2 0 0 0-.4-2.2l-.1-.1 2.6-2.6.1.1A2 2 0 0 0 9 4.6a2 2 0 0 0 1.2-1.8V3h3.6v.2A2 2 0 0 0 15 4.6a2 2 0 0 0 2.2-.4l.1-.1 2.6 2.6-.1.1a2 2 0 0 0-.4 2.2 2 2 0 0 0 1.8 1.2h.2v3.6h-.2A2 2 0 0 0 19.4 15Z" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  keyboard: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h.01M11 10h.01M15 10h.01M18 10h.01M7 14h.01M11 14h6" /></>,
  location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2" /></>,
  mic: <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></>,
  moon: <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />,
  pin: <><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></>,
  route: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3" /></>,
  shield: <path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z" />,
  spark: <path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3ZM19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16Z" />,
  speaker: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a8 8 0 0 1 0 11" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4.6" /></>,
  xl: <><path d="m4 11 3-5h10l3 5v7H4v-7Z" /><path d="M4 12h16M8 6l2 6M16 6l-2 6" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
};

function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Button({ children, onClick, variant = "primary", icon, label, disabled = false, busy = false }: {
  children?: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "icon" | "danger";
  icon?: IconName; label?: string; disabled?: boolean; busy?: boolean;
}) {
  return createElement("button", {
    type: "button", className: `btn btn-${variant}`, onClick, disabled, "aria-busy": busy || undefined, "aria-label": label ?? (typeof children === "string" ? children : undefined),
  }, icon && <Icon name={icon} />, children);
}

function TopBar({ title, back, settings, backLabel = "Go back", settingsLabel = "Settings" }: { title?: string; back?: () => void; settings?: () => void; backLabel?: string; settingsLabel?: string }) {
  return <div className="topbar">
    <div>{back ? <Button variant="icon" icon="arrow" onClick={back} label={backLabel} /> : <Brand compact />}</div>
    {title && <div className="top-title" role="heading" aria-level={1}>{title}</div>}
    <div className="top-actions">
      {settings && <Button variant="icon" icon="gear" onClick={settings} label={settingsLabel} />}
    </div>
  </div>;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? "brand-compact" : ""}`}>
    <div className="logo-mark"><Icon name="route" size={compact ? 22 : 38} /></div>
    <div className="brand-name">RideSetu <strong>AI</strong></div>
  </div>;
}

function Speaker({ label = "Play this message aloud", text, locale, rate }: { label?: string; text: string; locale: Locale; rate: number }) {
  return <Button variant="icon" icon="speaker" label={label} onClick={() => speak(text, locale, rate)} />;
}

function Progress({ screen, locale }: { screen: Screen; locale: Locale }) {
  const steps: Screen[] = ["home", "review", "location"];
  const index = steps.indexOf(screen);
  if (index < 0) return null;
  const labels = pageCopy[locale] ?? pageCopy.en;
  return <div className="progress" aria-label={`${labels.progressStep} ${index + 1} ${labels.progressOf} ${steps.length}`}>
    {steps.map((step, i) => <span key={step} className={i <= index ? "active" : ""} />)}
  </div>;
}

const rides = [
  { id: "bike", name: "Bike", icon: "bike" as IconName, fare: "₹86", eta: "3 min", seats: "1 seat", note: "No luggage", reason: "" },
  { id: "auto", name: "Auto", icon: "auto" as IconName, fare: "₹142", eta: "5 min", seats: "3 seats", note: "1 small bag", reason: "Easy pickup and a comfortable price" },
  { id: "cab", name: "Cab", icon: "cab" as IconName, fare: "₹218", eta: "4 min", seats: "4 seats", note: "2 bags", reason: "" },
  { id: "xl", name: "XL", icon: "xl" as IconName, fare: "₹326", eta: "7 min", seats: "6 seats", note: "4 bags", reason: "" },
];

function RideCard({ ride, selected, onClick, bestText }: { ride: typeof rides[number]; selected: boolean; onClick: () => void; bestText: string }) {
  return <button type="button" className={`ride-card ${selected ? "selected" : ""}`} onClick={onClick} aria-pressed={selected} aria-label={`${ride.name}, sample fare ${ride.fare}, sample arrival ${ride.eta}`}>
    <div className="ride-icon"><Icon name={ride.icon} size={32} /></div>
    <div className="ride-main">
      <div className="ride-name">{ride.name}{ride.id === "auto" && <span className="badge"><Icon name="spark" size={14} />{bestText}</span>}</div>
      <div className="ride-meta"><span><Icon name="users" size={16} />{ride.seats}</span><span>{ride.note}</span></div>
      {ride.reason && <div className="ride-reason">{ride.reason}</div>}
    </div>
    <div className="ride-price"><strong>{ride.fare}</strong><span>{ride.eta}</span><small>Sample · not live</small></div>
  </button>;
}

function LocationCard({ type, title, address, icon, pickupLabel, destinationLabel, changeLabel, onChange, disabled = false }: { type: string; title: string; address: string; icon: IconName; pickupLabel: string; destinationLabel: string; changeLabel: string; onChange?: () => void; disabled?: boolean }) {
  const placeLabel = type === "pickup" ? pickupLabel : destinationLabel;
  return <div className="location-card">
    <div className={`location-dot ${type}`}><Icon name={icon} size={20} /></div>
    <div><span>{placeLabel}</span><strong>{title}</strong><p>{address}</p></div>
    <Button variant="icon" icon="chevron" label={`${changeLabel} ${placeLabel.toLowerCase()}`} onClick={onChange} disabled={disabled} />
  </div>;
}

function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [locale, setLocale] = useState<Locale>(getSavedLocale);
  const [dark, setDark] = useState(getSavedDarkMode);
  const [displayName, setDisplayName] = useState(getSavedDisplayName);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [selectedRide, setSelectedRide] = useState("auto");
  const [permissionStep, setPermissionStep] = useState(0);
  const [textMode, setTextMode] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState(getSavedVoiceSpeed);
  const [transcript, setTranscript] = useState("");
  const [inputMethod, setInputMethod] = useState<"voice" | "text">("voice");
  const [tripDetailsConfirmed, setTripDetailsConfirmed] = useState(false);
  const [pickupPlace, setPickupPlace] = useState("My current location");
  const [pickupCoordinates, setPickupCoordinates] = useState<Coordinates | null>(null);
  const [tripDestination, setTripDestination] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [dataCleared, setDataCleared] = useState(false);
  const [dataClearError, setDataClearError] = useState("");
  const t = { ...copy[locale], ...pageCopy[locale] };
  const routeCopy = routeConfirmationCopy[locale];
  const ride = useMemo(() => rides.find((item) => item.id === selectedRide) ?? rides[1], [selectedRide]);
  const lang = languages.find((item) => item.code === locale)!;
  const displayPickupPlace = pickupPlace === "My current location" ? t.currentLocation : pickupPlace;
  const handleRecognizedTrip = (pickup: string | null, destination: string, recognizedTranscript: string) => {
    setTranscript(recognizedTranscript);
    setInputMethod("voice");
    setTripDetailsConfirmed(false);
    setPickupPlace(pickup ?? "My current location");
    setPickupCoordinates(null);
    setTripDestination(destination);
    setScreen("review");
  };
  const { micState, liveTranscript, voiceError, setVoiceError, startOrStopListening } = useVoiceInput(
    locale,
    { noSpeech: t.noSpeech, voiceUnsupported: t.voiceUnsupported, microphoneStartError: t.microphoneStartError },
    screen === "home",
    handleRecognizedTrip,
  );
  const chooseLanguage = (code: Locale) => {
    setLocale(code);
    saveLocale(code);
  };

  useEffect(() => {
    if (voiceError) setTextMode(true);
  }, [voiceError]);

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const backMap: Partial<Record<Screen, Screen>> = {
    language: "splash", permissions: "language", home: "permissions", review: "home", location: "review",
    recommendation: "location", confirm: "recommendation", handoff: "confirm",
    summary: "handoff", settings: "home", states: "settings", spec: "settings", privacy: "settings",
  };
  const top = (title?: string) => <TopBar title={title} back={backMap[screen] ? () => setScreen(backMap[screen]!) : undefined} settings={screen === "home" ? () => setScreen("settings") : undefined} backLabel={t.back} settingsLabel={t.settingsLabel} />;

  const requestMicrophoneAccess = async () => {
    setPermissionError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionError(t.voiceUnsupported);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermissionStep(1);
    } catch (error) {
      setPermissionError(error instanceof DOMException && error.name === "NotAllowedError"
        ? "Microphone permission was denied. Allow access in browser settings or continue without voice."
        : error instanceof DOMException && error.name === "NotFoundError"
          ? "No microphone was found. Connect one or continue without voice."
          : t.microphoneStartError);
    }
  };

  const requestLocationPermission = async () => {
    setPermissionError("");
    setLocationLoading(true);
    try {
      const coordinates = await getCurrentCoordinates();
      setPickupCoordinates(coordinates);
      setPickupPlace("My current location");
      setScreen("home");
    } catch (error) {
      setPermissionError(error instanceof Error ? error.message : "Could not get your device location.");
    } finally {
      setLocationLoading(false);
    }
  };

  const selectCurrentLocation = async () => {
    if (locationLoading) return;
    setLocationLoading(true);
    try {
      setBookingError("");
      const coordinates = await getCurrentCoordinates();
      setPickupPlace("My current location");
      setPickupCoordinates(coordinates);
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "Could not get your device location.");
    } finally {
      setLocationLoading(false);
    }
  };

  const submitTextDestination = () => {
    const destination = tripDestination.trim();
    if (!destination) {
      setVoiceError(t.noSpeech);
      return;
    }
    setTripDestination(destination);
    setTranscript(`${t.currentLocation} ${t.to.toLowerCase()} ${destination}`);
    setInputMethod("text");
    setTripDetailsConfirmed(false);
    setVoiceError("");
    setScreen("review");
  };

  const openLiveBooking = async () => {
    if (bookingLoading || locationLoading) return;
    setBookingLoading(true);
    setBookingError("");
    try {
      const handoff = await prepareUberHandoffUrl(pickupPlace, pickupCoordinates, tripDestination);
      window.location.assign(handoff.url);
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "Could not prepare this ride for Uber.");
    } finally {
      setBookingLoading(false);
    }
  };

  const clearLocalData = () => {
    if (!window.confirm("Clear saved RideSetu preferences and this session's trip details? This cannot remove data already processed by your browser, the map provider, or Uber.")) return;
    const preferencesRemoved = clearSavedPreferences();
    setLocale("en");
    setDark(false);
    setVoiceSpeed(1);
    setTranscript("");
    setPickupPlace("My current location");
    setPickupCoordinates(null);
    setTripDestination("");
    setDisplayName("Maya");
    setTripDetailsConfirmed(false);
    setVoiceError("");
    setBookingError("");
    setDataCleared(preferencesRemoved);
    setDataClearError(preferencesRemoved ? "" : "Trip details were cleared from this page, but browser preferences could not be removed. Clear this site's storage in browser settings.");
    setScreen("settings");
  };

  const renderScreen = () => {
    if (screen === "splash") return <div className="screen splash-screen">
      <div className="splash-orbit"><span /><span /><span /><Brand /></div>
      <div className="splash-copy">
        <div className="eyebrow">{t.splashEyebrow}</div>
        <div className="display" role="heading" aria-level={1}>{t.splashLead}<br /><em>{t.splashEmphasis}</em> {t.splashTail}</div>
        <p>{t.splashSubtitle}</p>
      </div>
      <div className="bottom-action">
        <Button onClick={() => setScreen("language")}>{t.getStarted} <Icon name="chevron" /></Button>
        <div className="trust"><Icon name="shield" size={16} /> {t.splashTrust}</div>
      </div>
    </div>;

    if (screen === "language") return <div className="screen">
      {top()}
      <div className="page-intro">
        <div className="eyebrow">{t.languageStep}</div>
        <div className="title" role="heading" aria-level={1}>{t.languageTitle}</div>
        <p>{t.languageSubtitle}</p>
      </div>
      <div className="language-grid">
        {languages.map((item) => <div key={item.code} className={`language-tile ${locale === item.code ? "selected" : ""}`}>
          {createElement("button", { onClick: () => chooseLanguage(item.code), "aria-label": `${t.languageTitle}: ${item.english}` },
            <><strong>{item.label}</strong><span>{item.english}</span>{locale === item.code && <i><Icon name="check" size={14} /></i>}</>
          )}
          <Speaker label={`${t.hearLanguage} ${item.english}`} text={item.label} locale={item.code} rate={voiceSpeed} />
        </div>)}
      </div>
      <div className="bottom-action fade-top"><Button onClick={() => setScreen("permissions")}>{t.continueIn} {lang.label}<Icon name="chevron" /></Button></div>
    </div>;

    if (screen === "permissions") {
      const isMic = permissionStep === 0;
      return <div className="screen permission-screen">
        {top()}
        <div className="permission-visual">
          <div className="permission-ring"><div><Icon name={isMic ? "mic" : "location"} size={44} /></div></div>
          <span>{isMic ? t.microphoneLabel : t.locationLabel}</span>
        </div>
        <div className="permission-copy">
          <div className="title" role="heading" aria-level={1}>{isMic ? t.speakTitle : t.locationTitle}</div>
          <p>{isMic ? t.speakDescription : t.locationDescription}</p>
          <div className="privacy-note"><Icon name="shield" /><span><strong>{t.privacyTitle}</strong>{t.privacyDescription}</span></div>
          {permissionError && <p className="permission-error" role="alert">{permissionError}</p>}
        </div>
        <div className="bottom-action two-actions">
          <Button disabled={locationLoading} onClick={() => isMic ? void requestMicrophoneAccess() : void requestLocationPermission()}>{isMic ? t.allowMicrophone : locationLoading ? "Finding your location…" : t.allowLocation}</Button>
          <Button variant="ghost" onClick={() => isMic ? (setPermissionError(""), setPermissionStep(1)) : setScreen("home")}>{t.notNow}</Button>
        </div>
      </div>;
    }

    if (screen === "home") return <div className="screen home-screen">
      {top()}
      <Progress screen={screen} locale={locale} />
      <div className="home-greeting"><p>{getPersonalizedGreeting(locale, displayName, currentTime)}</p><div className="title" role="heading" aria-level={1} aria-live="polite" aria-atomic="true">{micState === "listening" ? liveTranscript || t.listening : micState === "processing" ? t.processing : t.prompt}</div></div>
      <div className={`voice-stage ${micState}`}>
        {micState === "listening" && <div className="waveform" aria-hidden="true">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => <span key={i} />)}</div>}
        {micState === "processing" && <div className="processing-dots"><span /><span /><span /></div>}
        {micState === "idle" && <div className="voice-example"><Icon name="spark" /><p>{t.trySaying}</p><strong>“{t.exampleTrip}”</strong><Speaker label={t.hearLanguage} text={`${t.trySaying}: ${t.exampleTrip}`} locale={locale} rate={voiceSpeed} /></div>}
      </div>
      {textMode && <div className="text-fallback">
        {createElement("input", { autoFocus: true, value: tripDestination, maxLength: 120, autoComplete: "street-address", onChange: (event: React.ChangeEvent<HTMLInputElement>) => { setTripDestination(event.target.value); setVoiceError(""); }, onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter") submitTextDestination(); }, "aria-label": t.typeDestination, placeholder: t.typeDestination })}
        <Button variant="icon" icon="chevron" onClick={submitTextDestination} label={t.submitDestination} />
      </div>}
      <div className="voice-controls" aria-busy={micState !== "idle"}>
        <Button variant="icon" icon="speaker" label={t.replayPrompt} onClick={() => speak(t.prompt, locale, voiceSpeed)} />
        {createElement("button", {
          className: `mic-button ${micState}`, "aria-label": micState === "listening" ? t.tapWhenDone : t.hint, disabled: micState === "processing",
          onClick: startOrStopListening,
        }, <Icon name={micState === "processing" ? "spark" : "mic"} size={34} />)}
        <Button variant="icon" icon="keyboard" onClick={() => setTextMode(!textMode)} label={t.typeInstead} />
      </div>
      <div className="mic-hint" role="status" aria-live="polite">{voiceError || (micState === "listening" ? t.tapWhenDone : micState === "processing" ? t.processing : t.hint)}</div>
    </div>;

    if (screen === "review") return <div className="screen">
      {top()}
      <Progress screen={screen} locale={locale} />
      <div className="page-intro compact">
        <div className="eyebrow">{inputMethod === "voice" ? t.voiceCheck : routeCopy.textCaptured}</div>
        <div className="title" role="heading" aria-level={1}>{inputMethod === "voice" ? routeCopy.reviewVoiceTitle : routeCopy.reviewTextTitle}</div>
      </div>
      <div className="heard-card">
        <div className="quote">“</div><p>{inputMethod === "voice" ? transcript : tripDestination}</p><Speaker label={t.hearLanguage} text={inputMethod === "voice" ? transcript : tripDestination} locale={locale} rate={voiceSpeed} />
      </div>
      <div className="route-readiness" role="status" aria-live="polite">
        <span><Icon name="check" size={16} />{inputMethod === "voice" ? routeCopy.voiceCaptured : routeCopy.textCaptured}</span>
        <p>{routeCopy.bookingNotConfirmed}</p>
      </div>
      <div className="route-preview">
        <div className="route-line"><span /><i /><span /></div>
        <div><p><small>{t.from}</small>{displayPickupPlace}</p><p><small>{t.to}</small>{tripDestination}</p></div>
      </div>
      <div className="bottom-action two-actions">
        <Button onClick={() => { setTripDetailsConfirmed(true); setScreen("location"); }}><Icon name="check" />{routeCopy.confirmDetails}</Button>
        <Button variant="secondary" onClick={() => setScreen("home")}><Icon name="mic" />{t.again}</Button>
      </div>
    </div>;

    if (screen === "location") return <div className="screen">
      {top(t.routeTitle)}
      <Progress screen={screen} locale={locale} />
      <div className="route-chip"><Icon name="route" /><span><small>{t.yourTrip}</small>{displayPickupPlace} {t.to.toLowerCase()} {tripDestination}</span></div>
      {tripDetailsConfirmed && <div className="trip-confirmation" role="status" aria-live="polite">
        <strong>{inputMethod === "voice" ? routeCopy.voiceConfirmed : routeCopy.textConfirmed}</strong>
        <span>{routeCopy.bookingNotConfirmed}</span>
      </div>}
      <div className="location-sheet">
        <LocationCard type="pickup" title={displayPickupPlace} address={locationLoading ? "Finding your location…" : pickupCoordinates ? t.deviceLocationReady : pickupPlace === "My current location" ? t.locationWillUse : t.addressWillMatch} icon="pin" pickupLabel={t.pickup} destinationLabel={t.destination} changeLabel={t.change} onChange={selectCurrentLocation} disabled={locationLoading} />
        <LocationCard type="destination" title={tripDestination || "Destination not entered"} address={t.addressWillMatch} icon="location" pickupLabel={t.pickup} destinationLabel={t.destination} changeLabel={t.change} onChange={() => { setTextMode(true); setScreen("home"); }} />
        <Button variant="secondary" icon="pin" disabled={locationLoading} onClick={selectCurrentLocation}>{locationLoading ? "Finding your location…" : t.useCurrentLocation}</Button>
      </div>
      {bookingError && <div className="location-error" role="alert" aria-live="assertive"><p>{bookingError}</p><Button variant="secondary" disabled={bookingLoading} onClick={openLiveBooking}>Retry</Button></div>}
      <div className="bottom-action fade-top">
        <p className="center muted">{t.uberIntro}</p>
        <Button disabled={bookingLoading || locationLoading} busy={bookingLoading} onClick={openLiveBooking}>{bookingLoading ? t.preparingUber : t.seeLiveUber}<Icon name={bookingLoading ? "spark" : "chevron"} /></Button>
      </div>
    </div>;

    if (screen === "recommendation") return <div className="screen recommendation-screen">
      {top()}
      <Progress screen={screen} locale={locale} />
      <div className="ai-orb"><Icon name="spark" size={38} /></div>
      <div className="eyebrow center">RIDESETU RECOMMENDS</div>
      <div className="title center" role="heading" aria-level={1}>The {ride.name} looks right for you</div>
      <div className="ai-message">
        <p>{ride.id === "auto" ? "It balances comfort and price, and can pick you up in about 5 minutes. There's room for your small bag." : `The ${ride.name} is a good match for this trip and arrives in ${ride.eta}.`}</p>
        <Speaker label={t.hearLanguage} text={ride.id === "auto" ? "It balances comfort and price, and can pick you up in about 5 minutes. There's room for your small bag." : `The ${ride.name} is a good match for this trip and arrives in ${ride.eta}.`} locale={locale} rate={voiceSpeed} />
      </div>
      <div className="recommended-card"><div className="ride-icon"><Icon name={ride.icon} size={34} /></div><div><span>{ride.name} · sample option</span><small>{ride.seats} • {ride.note}</small></div><strong>{ride.fare}*</strong></div>
      <p className="sample-disclaimer">*Sample estimate only. Live ride types, availability, and fares are shown by Uber.</p>
      <div className="bottom-action two-actions">
        <Button onClick={() => setScreen("confirm")}>{t.choose}<Icon name="check" /></Button>
        <Button variant="ghost" onClick={() => setScreen("location")}>Change route</Button>
      </div>
    </div>;

    if (screen === "confirm") return <div className="screen">
      {top("Review your ride")}
      <Progress screen={screen} locale={locale} />
      <div className="confirm-hero"><div><Icon name={ride.icon} size={42} /></div><span><small>YOUR SAMPLE OPTION</small><strong>{ride.name}</strong><p>{ride.seats} • {ride.note}</p></span><span className="fare"><strong>{ride.fare}</strong><small>Not a live fare</small></span></div>
      <div className="trip-card">
        <div className="trip-row"><i className="start" /><span><small>{t.pickup.toUpperCase()}</small><strong>My current location</strong><p>12 Lake View Road</p></span></div>
        <div className="trip-divider" />
        <div className="trip-row"><i className="end" /><span><small>{t.destination.toUpperCase()}</small><strong>{tripDestination}</strong><p>Confirm the exact address in Uber</p></span></div>
      </div>
      <div className="summary-list"><div><span>Pickup in</span><strong>{ride.eta} <small>Demo data</small></strong></div><div><span>Estimated trip</span><strong>18 min <small>Demo data</small></strong></div><div><span>Payment</span><strong>Cash</strong></div></div>
      <div className="safety-message"><Icon name="shield" /><p><strong>Live prices and booking in Uber</strong>Review the final fare and confirm there. Nothing is booked in RideSetu.</p></div>
      <div className="bottom-action"><Button onClick={() => setScreen("handoff")}>Continue to live booking<Icon name="chevron" /></Button></div>
    </div>;

    if (screen === "handoff") return <div className="screen success-screen">
      <Progress screen={screen} locale={locale} />
      <div className="success-mark"><Icon name="route" size={42} /></div>
      <div className="title center" role="heading" aria-level={1}>Check live rides in Uber</div>
      <p className="center muted">Your destination, {tripDestination}, will be passed to Uber. Review live availability and the final fare there before confirming.</p>
      <div className="driver-card">
        <div className="setting-icon"><Icon name="location" /></div><div><small>DESTINATION</small><strong>{tripDestination}</strong><span>Pickup set to your current location</span></div>
      </div>
      <div className="demo-notice"><Icon name="shield" /><span><strong>You stay in control</strong>RideSetu does not place or charge for a booking.</span></div>
      <div className="bottom-action two-actions">
        <Button onClick={openLiveBooking}>Open Uber to book<Icon name="chevron" /></Button>
        <Button variant="ghost" onClick={() => setScreen("home")}>Back to RideSetu</Button>
      </div>
    </div>;

    if (screen === "summary") return <div className="screen">
      {top("Trip summary")}
      <Progress screen={screen} locale={locale} />
      <div className="receipt">
        <Brand />
        <div className="receipt-status"><Icon name="check" />Demo trip complete</div>
        <div className="receipt-route"><strong>My current location</strong><span>to</span><strong>City Care Hospital</strong></div>
        <div className="receipt-dash" />
        <div className="receipt-line"><span>Ride</span><strong>{ride.name}</strong></div>
        <div className="receipt-line"><span>Distance</span><strong>6.4 km</strong></div>
        <div className="receipt-line"><span>Travel time</span><strong>18 min</strong></div>
        <div className="receipt-line total"><span>Demo total</span><strong>{ride.fare}</strong></div>
        <small>This receipt is for prototype demonstration only.</small>
      </div>
      <div className="bottom-action"><Button onClick={() => setScreen("home")}>Book another ride<Icon name="mic" /></Button></div>
    </div>;

    if (screen === "settings") return <div className="screen">
      {top(t.settingsTitle)}
      <div className="settings-list">
        {dataCleared && <p className="privacy-feedback" role="status">Saved RideSetu preferences and session trip details were cleared. Data already processed by third parties is not affected.</p>}
        {dataClearError && <p className="location-error" role="alert">{dataClearError}</p>}
        <div className="settings-group"><span>{t.yourPreferences}</span>
          <label className="name-setting">
            <span>{routeCopy.nameLabel}</span>
            <input
              type="text"
              value={displayName}
              maxLength={32}
              autoComplete="nickname"
              aria-label="Your name for greetings"
              onChange={(event) => setDisplayName(event.target.value.slice(0, 32))}
              onBlur={() => {
                const safeName = sanitizeDisplayName(displayName) || "Maya";
                setDisplayName(safeName);
                saveDisplayName(safeName);
              }}
            />
            <small>{routeCopy.nameHelp}</small>
          </label>
          <div className="setting-row"><div className="setting-icon"><Icon name="globe" /></div><div><strong>{t.languageSetting}</strong><small>{lang.label} • {lang.english}</small></div><Button variant="icon" icon="chevron" onClick={() => setScreen("language")} label={t.changeLanguage} /></div>
          <div className="setting-row voice-setting"><div className="setting-icon"><Icon name="speaker" /></div><div><strong>{t.voiceSpeed}</strong><small>{voiceSpeed === 0.8 ? t.slower : voiceSpeed === 1 ? t.normal : t.faster}</small></div>
            {createElement("input", { type: "range", min: .8, max: 1.2, step: .2, value: voiceSpeed, onChange: (e: React.ChangeEvent<HTMLInputElement>) => { const speed = Number(e.target.value); setVoiceSpeed(speed); saveVoiceSpeed(speed); }, "aria-label": t.voiceSpeed })}
          </div>
          <div className="setting-row"><div className="setting-icon"><Icon name={dark ? "moon" : "sun"} /></div><div><strong>{t.darkMode}</strong><small>{t.darkModeDescription}</small></div>
            {createElement("button", { className: `switch ${dark ? "on" : ""}`, onClick: () => { const enabled = !dark; setDark(enabled); saveDarkMode(enabled); }, role: "switch", "aria-checked": dark, "aria-label": t.darkMode }, <span />)}
          </div>
        </div>
        <div className="settings-group"><span>{t.helpPrivacy}</span>
          <button type="button" className="setting-row clickable" aria-label={`${t.helpSystemStates}. ${t.offlinePermissions}`} onClick={() => setScreen("states")}><span className="setting-icon"><Icon name="shield" /></span><span><strong>{t.helpSystemStates}</strong><small>{t.offlinePermissions}</small></span><Icon name="chevron" /></button>
          <button type="button" className="setting-row clickable" aria-label={`${t.designSystemSpecs}. ${t.tokensHandoff}`} onClick={() => setScreen("spec")}><span className="setting-icon"><Icon name="spark" /></span><span><strong>{t.designSystemSpecs}</strong><small>{t.tokensHandoff}</small></span><Icon name="chevron" /></button>
          <button type="button" className="setting-row clickable" aria-label={`${t.privacyPolicy}. ${t.privacyDescriptionShort}`} onClick={() => setScreen("privacy")}><span><strong>{t.privacyPolicy}</strong><small>{t.privacyDescriptionShort}</small></span><Icon name="chevron" /></button>
          <button type="button" className="setting-row danger clickable" aria-label="Clear saved RideSetu data. Remove browser preferences and this session's trip details" onClick={clearLocalData}><span><strong>Clear saved RideSetu data</strong><small>Remove browser preferences and this session's trip details</small></span><Icon name="chevron" /></button>
        </div>
      </div>
      <div className="version">RideSetu AI • {t.demoVersion}</div>
    </div>;

    if (screen === "privacy") return <div className="screen">
      {top("Privacy & data")}
      <div className="privacy-page">
        <div className="eyebrow">PROTOTYPE PRIVACY NOTICE</div>
        <h2 className="title">What RideSetu handles</h2>
        <p>This prototype has no RideSetu account or server-side trip-history database. Do not use it for sensitive journeys.</p>
        <h2>Microphone and voice</h2>
        <p>Voice recognition starts only after you tap the microphone. The browser or device speech-recognition provider may process the audio and transcript under its own terms. RideSetu does not save recordings or transcripts to its own server. Voice typing remains available if you deny microphone permission.</p>
        <h2>Location and address search</h2>
        <p>Device location is requested only after you choose to allow it or select a current-location pickup. Address text is sent to OpenStreetMap's Nominatim search service to resolve map coordinates; when using device pickup, an approximate pickup-area viewbox is also sent, and RideSetu selects the closest of up to five matches. See the <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noreferrer">OpenStreetMap Foundation privacy policy</a>.</p>
        <p>Address data attribution: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>.</p>
        <h2>Uber handoff</h2>
        <p>When you continue, RideSetu opens Uber with pickup and destination details in the handoff URL. Uber handles live availability, final pricing, and any booking. Nothing is booked or charged by RideSetu. See <a href="https://www.uber.com/legal/privacy/" target="_blank" rel="noreferrer">Uber's privacy notice</a>.</p>
        <h2>Saved data and deletion</h2>
        <p>Your name, language, theme, and voice speed are stored in this browser's local storage. Trip details and voice transcripts are held in page memory for the current session. Use “Clear saved RideSetu data” in Settings to clear those preferences and the current trip. This cannot delete information already processed by your browser, Nominatim, or Uber.</p>
        <p className="privacy-legal-note">This is a prototype privacy notice, not legal advice. Replace it with a reviewed policy and verified provider terms before public launch.</p>
      </div>
    </div>;

    if (screen === "states") return <div className="screen">
      {top("Help & system states")}
      <p className="states-intro">Examples of loading, offline, permission, empty, and retry states. RideSetu does not retrieve live fares; Uber provides live availability after handoff.</p>
      <div className="state-list">
        <div className="state-card"><div className="state-icon loading" aria-hidden="true"><span /><span /><span /></div><div><strong>Address lookup in progress</strong><p>Resolving pickup and destination before opening Uber.</p></div></div>
        <div className="state-card"><div className="state-icon"><Icon name="close" /></div><div><strong>Connection unavailable</strong><p>Address search needs an internet connection. Try again when you are back online.</p><Button variant="secondary" onClick={() => { setScreen("location"); if (navigator.onLine) void openLiveBooking(); else setBookingError("You are offline. Reconnect and retry address lookup."); }}>Retry address search</Button></div></div>
        <div className="state-card"><div className="state-icon error"><Icon name="mic" /></div><div><strong>Microphone permission denied</strong><p>Voice is optional. Allow access in your browser settings or use text input.</p><Button variant="secondary" onClick={() => { setPermissionStep(0); setPermissionError(""); setScreen("permissions"); }}>Review permission</Button></div></div>
        <div className="state-card"><div className="state-icon"><Icon name="speaker" /></div><div><strong>We didn't catch that</strong><p>Try speaking again, or enter your destination with the keyboard.</p><Button variant="secondary" onClick={() => { setTextMode(true); setVoiceError(""); setScreen("home"); }}>Type destination</Button></div></div>
        <div className="state-card"><div className="state-icon error"><Icon name="location" /></div><div><strong>Address could not be resolved</strong><p>Check the spelling or add a nearby area to the destination.</p><Button variant="secondary" onClick={() => { setTextMode(true); setScreen("home"); }}>Edit destination</Button></div></div>
        <div className="state-card"><div className="state-icon"><Icon name="cab" /></div><div><strong>No live ride results in RideSetu</strong><p>Live ride availability and prices are shown by Uber, not this prototype.</p><Button variant="secondary" onClick={() => setScreen("location")}>Continue to Uber</Button></div></div>
      </div>
    </div>;

    return <div className="screen">
      {top("Design system specs")}
      <div className="spec-page">
        <div className="spec-intro"><div className="eyebrow">RIDESETU AI • MOBILE</div><div className="title" role="heading" aria-level={1}>Calm, clear and made for every voice.</div><p>Android-first foundations for accessible, multilingual ride booking.</p></div>
        <div className="spec-section"><strong>Color tokens</strong><div className="swatches"><span className="teal">Primary<small>#0F766E</small></span><span className="indigo">Secondary<small>#4338CA</small></span><span className="amber">Highlight<small>#F59E0B</small></span><span className="red">Error<small>#DC2626</small></span></div></div>
        <div className="spec-section"><strong>Type scale</strong><div className="type-spec"><span className="type-display">Display 34 / 40</span><span className="type-title">Heading 26 / 35</span><span className="type-body">Body 18 / 27</span><span className="type-label">LABEL 12 / 16</span></div></div>
        <div className="spec-section"><strong>Spacing & shape</strong><div className="token-chips"><span>4</span><span>8</span><span>12</span><span>16</span><span>24</span><span>32</span></div><p>8pt base grid • 16pt page margin • 16–20pt card radius • 48pt minimum touch target</p></div>
        <div className="spec-section"><strong>Icon sizes</strong><div className="icon-spec"><span><Icon name="mic" size={16} />16</span><span><Icon name="speaker" size={20} />20</span><span><Icon name="location" size={24} />24</span><span><Icon name="cab" size={32} />32</span></div></div>
        <div className="spec-section"><strong>Core components</strong><div className="component-tags"><span>Mic button • 4 states</span><span>Ride card • 3 states</span><span>Location card</span><span>Language tile</span><span>Toast</span><span>Bottom sheet</span><span>Empty state</span><span>Skeleton</span></div></div>
      </div>
    </div>;
  };

  return <main className={dark ? "app dark" : "app"} lang={locale}>
    <div className="phone-shell">
      {renderScreen()}
      <div className="gesture-bar"><span /></div>
    </div>
  </main>;
}

export default App;
