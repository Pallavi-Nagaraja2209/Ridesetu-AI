# RideSetu AI

RideSetu AI is a voice-first ride-planning prototype designed to help people plan a trip in a language they are comfortable using. It guides a rider through choosing a language, entering a destination, reviewing trip details, and continuing to Uber to see live ride options.

> **Prototype notice:** RideSetu does not retrieve live ride availability or fares and does not book rides. Live options and booking are handled by Uber after you leave the prototype.

## Features

- Interface available in Telugu, Tamil, Kannada, English, Hindi, Malayalam, and Marathi.
- Voice destination and route entry where the browser supports speech recognition, with keyboard input as an alternative.
- Spoken prompts using the browser's speech synthesis.
- Pickup selection using device location or an address, and destination address lookup.
- Trip detail review before generating an Uber handoff link.
- Local preferences for language, display name, voice speed, and dark mode.
- Help and privacy information, plus loading, error, and permission states.

## Requirements

- Node.js 22 (see [.mise.toml](./.mise.toml))
- pnpm 10 (or a compatible pnpm release)
- A modern browser; microphone and location features require user permission. Speech recognition availability varies by browser.

## Getting started

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite (usually <http://localhost:5173>).

## Available commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite development server |
| `pnpm build` | Build the production app |
| `pnpm preview` | Preview the production build locally |
| `pnpm test` | Run the Vitest test suite |
| `pnpm format` | Format files with Oxfmt |

## How it works

1. Choose one of the supported interface languages.
2. Enter a destination by speaking or typing. Voice input may include a pickup and destination.
3. Review and confirm the trip details.
4. Choose a pickup location and continue to Uber for live options and booking.

RideSetu uses the browser Geolocation API for device location, OpenStreetMap's Nominatim service for address lookup, and an Uber URL handoff to pass trip locations to Uber. An internet connection is required for address lookup and the handoff.

## Privacy and permissions

- Microphone and location access are requested by the browser and are optional; typing a destination is available when speech input is unavailable.
- RideSetu stores saved preferences in the current browser's local storage. The settings screen provides an option to clear those preferences.
- Address lookup sends the entered place text and, when available, nearby coordinates to Nominatim. Review the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/).
- Continuing to Uber opens an external service. Any data handled there is subject to Uber's terms and privacy policy.

## Tech stack

- React 19 and TypeScript
- Vite 8
- Tailwind CSS 4
- Vitest
