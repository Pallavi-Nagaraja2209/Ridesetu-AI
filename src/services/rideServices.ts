export type Locale = "te" | "ta" | "kn" | "en" | "hi" | "ml" | "mr";
export type Coordinates = { latitude: number; longitude: number };
export type GeocodedPlace = Coordinates & {
  address: string;
  name?: string;
  locality?: string;
  city?: string;
  placeType?: string;
};
export type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
export type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechResult> };
export type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
export type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: Record<string, string>;
  class?: string;
  type?: string;
};

export type PreparedUberHandoff = {
  url: string;
  pickup: GeocodedPlace;
  destination: GeocodedPlace;
};

export const languages: { code: Locale; label: string; english: string }[] = [
  { code: "te", label: "తెలుగు", english: "Telugu" },
  { code: "ta", label: "தமிழ்", english: "Tamil" },
  { code: "kn", label: "ಕನ್ನಡ", english: "Kannada" },
  { code: "en", label: "English", english: "English" },
  { code: "hi", label: "हिन्दी", english: "Hindi" },
  { code: "ml", label: "മലയാളം", english: "Malayalam" },
  { code: "mr", label: "मराठी", english: "Marathi" },
];

export const speechLocales: Record<Locale, string> = {
  te: "te-IN", ta: "ta-IN", kn: "kn-IN", en: "en-IN", hi: "hi-IN", ml: "ml-IN", mr: "mr-IN",
};

export function destinationFromSpeech(text: string) {
  const destination = text.match(/\b(?:to|at|near)\s+(.+)$/i)?.[1] ?? text;
  return destination.replace(/[?.!]+$/, "").trim();
}

export function routeFromSpeech(text: string) {
  const route = text.match(/\bfrom\s+(.+?)\s+to(?:\s+(.+))?$/i);
  const spokenPickup = route?.[1]?.trim();
  const pickup = spokenPickup && !/^(my current location|current location|here)$/i.test(spokenPickup)
    ? spokenPickup
    : null;
  return {
    pickup,
    destination: (route ? route[2] ?? "" : destinationFromSpeech(text)).replace(/[?.!]+$/, "").trim(),
  };
}

export function getCurrentCoordinates(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser cannot access device location."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) => reject(new Error(
        error.code === 1
          ? "Location permission was denied. Allow location access or enter a pickup address."
          : error.code === 3
            ? "Location lookup timed out. Check location services and try again."
            : "Could not get your device location. Check location services and try again.",
      )),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

export async function geocodePlace(
  query: string,
  around?: Coordinates,
  destinationSearch = false,
): Promise<GeocodedPlace> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) throw new Error("Enter a pickup or destination before searching.");
  if (normalizedQuery.length > 120 || /[\u0000-\u001f\u007f]/.test(normalizedQuery)) {
    throw new Error("Place names must be 120 characters or fewer and cannot contain control characters.");
  }

  const searchQueries = destinationSearch
    ? getDestinationSearchQueries(normalizedQuery)
    : [getGeocodingQuery(normalizedQuery)];
  const params = new URLSearchParams({
    format: "jsonv2",
    limit: "10",
    countrycodes: "in",
    addressdetails: "1",
    namedetails: "1",
    q: searchQueries[0],
  });
  if (around) {
    const searchRadiusKm = 50;
    const boxDegrees = searchRadiusKm / 111.32;
    params.set("viewbox", `${around.longitude - boxDegrees},${around.latitude + boxDegrees},${around.longitude + boxDegrees},${around.latitude - boxDegrees}`);
  }

  let results: NominatimResult[] = [];
  for (let queryIndex = 0; queryIndex < searchQueries.length; queryIndex += 1) {
    if (queryIndex > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
    params.set("q", searchQueries[queryIndex]);

    let response: Response;
    try {
      response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new Error("Address lookup timed out. Check your connection and try again.");
      }
      throw new Error("Address lookup failed. Check your connection and try again.");
    }

    if (!response.ok) throw new Error("Address lookup is unavailable. Check your internet connection and try again.");

    try {
      const payload: unknown = await response.json();
      if (!Array.isArray(payload) || !payload.every((result) =>
        result !== null
        && typeof result === "object"
        && "lat" in result
        && "lon" in result
        && "display_name" in result
        && typeof result.lat === "string"
        && typeof result.lon === "string"
        && typeof result.display_name === "string"
        && (!("name" in result) || typeof result.name === "string")
        && (!("class" in result) || typeof result.class === "string")
        && (!("type" in result) || typeof result.type === "string")
        && (!("address" in result) || (
          result.address !== null
          && typeof result.address === "object"
          && Object.values(result.address).every((value) => typeof value === "string")
        )))) {
        throw new Error("Invalid address lookup response.");
      }
      results.push(...payload as NominatimResult[]);
      if (destinationSearch && results.some((result) => {
        const searchableAddress = [
          result.name ?? "",
          result.display_name,
          ...Object.values(result.address ?? {}),
        ].join(" ");
        return scoreDestinationAddressMatch(
          getMeaningfulAddressTokens(normalizedQuery),
          searchableAddress,
        ) >= 40;
      })) {
        break;
      }
    } catch {
      throw new Error("Address lookup returned an invalid response. Please try again.");
    }
  }

  if (!results.length) {
    if (around && !destinationSearch) {
      const fallback = await reverseGeocodePlace(around);
      if (fallback) return fallback;
    }
    throw new Error(`Could not find “${normalizedQuery}”. Add a nearby area or city and try again.`);
  }
  const candidates = results.map((match) => {
    const latitude = Number(match.lat);
    const longitude = Number(match.lon);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new Error(`Could not resolve a map location for “${normalizedQuery}”.`);
    }
    return {
      latitude,
      longitude,
      address: match.display_name,
      name: match.name ?? "",
      locality: match.address?.neighbourhood
        ?? match.address?.suburb
        ?? match.address?.quarter
        ?? match.address?.village
        ?? match.address?.town
        ?? "",
      city: match.address?.city
        ?? match.address?.municipality
        ?? match.address?.town
        ?? match.address?.village
        ?? "",
      placeType: match.type ?? match.class ?? "",
      searchableAddress: [
        match.name ?? "",
        match.display_name,
        ...Object.values(match.address ?? {}),
      ].join(" "),
    };
  });

  const queryTokens = getMeaningfulAddressTokens(normalizedQuery);
  const rankedCandidates = candidates.map((candidate) => ({
    candidate,
    score: (destinationSearch
      ? scoreDestinationAddressMatch(queryTokens, candidate.searchableAddress)
      : scoreAddressMatch(queryTokens, candidate.searchableAddress))
      - scoreNameSpecificity(queryTokens, candidate.name)
      + (destinationSearch && isPointOfInterestType(candidate.placeType) ? 15 : 0)
      - (around ? Math.min(distanceBetween(candidate, around) / 10, 10) : 0),
  }));
  rankedCandidates.sort((first, second) => second.score - first.score);
  const { name: _name, searchableAddress: _searchableAddress, ...bestMatch } = rankedCandidates[0].candidate;
  return {
    ...bestMatch,
    name: bestMatch.name || bestMatch.address.split(",")[0].trim(),
    locality: bestMatch.locality || undefined,
    city: bestMatch.city || undefined,
    placeType: bestMatch.placeType || undefined,
  };
}

const addressStopWords = new Set([
  "a", "an", "at", "and", "district", "from", "in", "india", "near", "of", "the", "to",
]);

function getMeaningfulAddressTokens(value: string) {
  return value.toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !addressStopWords.has(token));
}

function getGeocodingQuery(query: string) {
  const normalizedQuery = query.replace(/[,;]+/g, " ").replace(/\s+/g, " ").trim();
  const hasBengaluruContext = /\bbengaluru\b/i.test(query);
  const hasStreetOrLayout = /\b(?:road|rd|street|st|layout|colony|sector)\b/i.test(query);
  if (!hasBengaluruContext || hasStreetOrLayout) return normalizedQuery;
  return normalizedQuery.replace(/\bbagalur\b/i, "Bagaluru");
}

function getDestinationSearchQueries(query: string) {
  const cleanedQuery = query
    .replace(/^(?:take me to|take us to|go to|navigate to|find)\s+/i, "")
    .trim();
  const variants = [getGeocodingQuery(cleanedQuery)];
  const localitySplit = cleanedQuery.split(/\s+(?:near|in|at)\s+/i)[0].trim();
  const commaSplit = cleanedQuery.split(/[,;]+/).map((part) => part.trim()).filter(Boolean);
  const words = cleanedQuery.replace(/[,;]+/g, " ").split(/\s+/).filter(Boolean);
  if (localitySplit.toLowerCase() !== cleanedQuery.toLowerCase()) {
    variants.push(getGeocodingQuery(localitySplit));
  } else if (commaSplit.length > 1) {
    variants.push(getGeocodingQuery(commaSplit[0]));
  } else if (words.length > 2) {
    variants.push(getGeocodingQuery(words.slice(0, -1).join(" ")));
  }
  const broadSearchToken = getMeaningfulAddressTokens(cleanedQuery)[0] ?? words[0];
  if (broadSearchToken) variants.push(getGeocodingQuery(broadSearchToken));
  return variants.filter((variant, index) =>
    variants.findIndex((candidate) => candidate.toLocaleLowerCase() === variant.toLocaleLowerCase()) === index,
  ).slice(0, 3);
}

function scoreDestinationAddressMatch(queryTokens: string[], address: string) {
  const addressTokens = getMeaningfulAddressTokens(address);
  return queryTokens.reduce((score, queryToken) => {
    if (addressTokens.includes(queryToken)) return score + 20;
    if (addressTokens.some((addressToken) => (
      queryToken.length >= 4
      && addressToken.length >= 4
      && (tokenSimilarity(queryToken, addressToken) >= 0.75
        || areSingleTranspositionMatches(queryToken, addressToken))
    ))) {
      return score + 19;
    }
    return score;
  }, 0);
}

function areSingleTranspositionMatches(first: string, second: string) {
  if (first.length !== second.length) return false;
  const mismatches: number[] = [];
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) mismatches.push(index);
  }
  return mismatches.length === 2
    && mismatches[1] === mismatches[0] + 1
    && first[mismatches[0]] === second[mismatches[1]]
    && first[mismatches[1]] === second[mismatches[0]];
}

function isPointOfInterestType(type: string) {
  return /^(?:amenity|shop|tourism|leisure|railway|aeroway|office|building|healthcare|historic|mall|hospital|clinic|college|university|school|restaurant|hotel|supermarket|place_of_worship|station|bus_station|airport|park|bank|atm|fuel|cinema|theatre|attraction)$/i.test(type);
}

function scoreAddressMatch(queryTokens: string[], address: string) {
  const addressTokens = getMeaningfulAddressTokens(address);
  return queryTokens.reduce((score, queryToken) => {
    if (addressTokens.includes(queryToken)) return score + 20;
    if (queryToken.length >= 5 && addressTokens.some((addressToken) =>
      addressToken.length >= 5 && tokenSimilarity(queryToken, addressToken) >= 0.75)) {
      return score + 19;
    }
    return score;
  }, 0);
}

function scoreNameSpecificity(queryTokens: string[], name: string) {
  const nameTokens = getMeaningfulAddressTokens(name);
  const unrelatedNameTokens = nameTokens.filter((nameToken) =>
    !queryTokens.some((queryToken) =>
      queryToken === nameToken
      || (queryToken.length >= 5 && nameToken.length >= 5 && tokenSimilarity(queryToken, nameToken) >= 0.75)));
  return unrelatedNameTokens.length * 5;
}

function tokenSimilarity(first: string, second: string) {
  const previousRow = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    let diagonal = previousRow[0];
    previousRow[0] = firstIndex;
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      const previous = previousRow[secondIndex];
      previousRow[secondIndex] = Math.min(
        previousRow[secondIndex] + 1,
        previousRow[secondIndex - 1] + 1,
        diagonal + (first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1),
      );
      diagonal = previous;
    }
  }
  return 1 - previousRow[second.length] / Math.max(first.length, second.length);
}

async function reverseGeocodePlace(around: Coordinates): Promise<GeocodedPlace | null> {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(around.latitude),
    lon: String(around.longitude),
    zoom: "10",
    addressdetails: "1",
    namedetails: "1",
  });

  let response: Response;
  try {
    response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return null;
    }
    return null;
  }

  if (!response.ok) return null;

  try {
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return null;
    const candidate = payload as Record<string, unknown>;
    const latitudeString = candidate.lat;
    const longitudeString = candidate.lon;
    const address = candidate.display_name;
    if (typeof latitudeString !== "string" || typeof longitudeString !== "string" || typeof address !== "string") {
      return null;
    }
    const latitude = Number(latitudeString);
    const longitude = Number(longitudeString);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return null;
    }
    return { latitude, longitude, address };
  } catch {
    return null;
  }
}

function distanceBetween(first: Coordinates, second: Coordinates) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude))
    * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function createUberHandoffUrl(pickup: GeocodedPlace, pickupLabel: string, destination: GeocodedPlace, destinationLabel: string) {
  const params = new URLSearchParams();
  params.set("pickup", JSON.stringify({
    latitude: pickup.latitude,
    longitude: pickup.longitude,
    addressLine1: pickupLabel,
    addressLine2: pickup.address,
  }));
  params.set("drop[0]", JSON.stringify({
    latitude: destination.latitude,
    longitude: destination.longitude,
    addressLine1: destinationLabel,
    addressLine2: destination.address,
  }));
  return `https://m.uber.com/looking?${params.toString()}`;
}

export async function prepareUberHandoffUrl(
  pickupLabel: string,
  pickupCoordinates: Coordinates | null,
  destinationLabel: string,
): Promise<PreparedUberHandoff> {
  const destinationQuery = destinationLabel.trim();
  const normalizedPickup = pickupLabel.trim();
  if (!destinationQuery) throw new Error("Enter a destination before continuing to Uber.");
  if (!normalizedPickup) throw new Error("Choose a pickup point before continuing to Uber.");

  let pickup: GeocodedPlace;
  if (normalizedPickup === "My current location") {
    const coordinates = pickupCoordinates ?? await getCurrentCoordinates();
    pickup = { ...coordinates, address: "Current device location" };
  } else {
    pickup = await geocodePlace(normalizedPickup);
  }

  const destination = await geocodePlace(destinationQuery, pickup, true);
  return {
    url: createUberHandoffUrl(pickup, normalizedPickup, destination, destinationQuery),
    pickup,
    destination,
  };
}
