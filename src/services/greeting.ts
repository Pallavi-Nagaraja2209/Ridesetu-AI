import type { Locale } from "./rideServices";

type GreetingPeriod = "morning" | "afternoon" | "evening" | "night";

const greetings: Record<Locale, Record<GreetingPeriod, string>> = {
  en: { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening", night: "Hello" },
  te: { morning: "శుభోదయం", afternoon: "శుభ మధ్యాహ్నం", evening: "శుభ సాయంత్రం", night: "నమస్కారం" },
  ta: { morning: "காலை வணக்கம்", afternoon: "மதிய வணக்கம்", evening: "மாலை வணக்கம்", night: "வணக்கம்" },
  kn: { morning: "ಶುಭೋದಯ", afternoon: "ಶುಭ ಮಧ್ಯಾಹ್ನ", evening: "ಶುಭ ಸಂಜೆ", night: "ನಮಸ್ಕಾರ" },
  hi: { morning: "सुप्रभात", afternoon: "नमस्कार", evening: "शुभ संध्या", night: "नमस्कार" },
  ml: { morning: "സുപ്രഭാതം", afternoon: "ശുഭ ഉച്ച", evening: "ശുഭ സായാഹ്നം", night: "നമസ്കാരം" },
  mr: { morning: "शुभ सकाळ", afternoon: "शुभ दुपार", evening: "शुभ संध्याकाळ", night: "नमस्कार" },
};

export function getGreetingPeriod(date: Date): GreetingPeriod {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export function getPersonalizedGreeting(locale: Locale, name: string, date: Date) {
  const greeting = greetings[locale][getGreetingPeriod(date)];
  return name.trim() ? `${greeting}, ${name.trim()}` : greeting;
}
