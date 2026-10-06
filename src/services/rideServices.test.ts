import { afterEach, describe, expect, it, vi } from "vitest";
import {
  geocodePlace,
  getCurrentCoordinates,
  prepareUberHandoffUrl,
  routeFromSpeech,
} from "./rideServices";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("routeFromSpeech", () => {
  it("extracts a destination from a simple voice request", () => {
    expect(routeFromSpeech("Take me to City Care Hospital")).toEqual({
      pickup: null,
      destination: "City Care Hospital",
    });
  });

  it("extracts pickup and destination from a complete route", () => {
    expect(routeFromSpeech("Book a ride from Jubilee Hills to the airport.")).toEqual({
      pickup: "Jubilee Hills",
      destination: "the airport",
    });
  });

  it("does not mistake the current location for a named pickup", () => {
    expect(routeFromSpeech("Take me from my current location to the station")).toEqual({
      pickup: null,
      destination: "the station",
    });
  });

  it("returns an empty destination when the spoken route is incomplete", () => {
    expect(routeFromSpeech("Take me from Jubilee Hills to").destination).toBe("");
  });
});

describe("prepareUberHandoffUrl", () => {
  it("builds a handoff using live device coordinates and a resolved destination", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { lat: "17.2403", lon: "78.4294", display_name: "Airport Road, Hyderabad" },
    ]), { status: 200, headers: { "Content-Type": "application/json" } })));
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (success: (position: { coords: { latitude: number; longitude: number } }) => void) => {
          success({ coords: { latitude: 17.385, longitude: 78.4867 } });
        },
      },
    });

    const prepared = await prepareUberHandoffUrl("My current location", null, "Airport");
    const url = new URL(prepared.url);
    const pickup = JSON.parse(url.searchParams.get("pickup") ?? "null");
    const destination = JSON.parse(url.searchParams.get("drop[0]") ?? "null");

    expect(url.origin).toBe("https://m.uber.com");
    expect(url.pathname).toBe("/looking");
    expect(pickup).toMatchObject({ latitude: 17.385, longitude: 78.4867 });
    expect(destination).toMatchObject({
      latitude: 17.2403,
      longitude: 78.4294,
      addressLine1: "Airport",
      addressLine2: "Airport Road, Hyderabad",
    });
  });

  it("resolves typed pickup and destination separately", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { lat: "17.4", lon: "78.4", display_name: "Pickup, Hyderabad" },
      ]), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { lat: "17.2", lon: "78.5", display_name: "Destination, Hyderabad" },
      ]), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const handoff = await prepareUberHandoffUrl("  Jubilee Hills  ", null, "Airport");

    expect(handoff.url).toContain("m.uber.com/looking");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain("q=Jubilee");
    expect(String(fetchMock.mock.calls[1][0])).toContain("viewbox=");
    expect(String(fetchMock.mock.calls[1][0])).toContain("addressdetails=1");
    expect(String(fetchMock.mock.calls[1][0])).toContain("namedetails=1");
    expect(String(fetchMock.mock.calls[1][0])).not.toContain("bounded=1");
  });

  it("chooses the Bagaluru village over Bengaluru roads when searching for Bagalur, Bengaluru", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      {
        lat: "13.0180",
        lon: "77.6400",
        name: "New Bagalur Layout",
        display_name: "New Bagalur Layout, Richards Town, Bengaluru Urban, Karnataka, India",
        address: { neighbourhood: "New Bagalur Layout", city: "Bengaluru", state: "Karnataka" },
      },
      {
        lat: "13.0520",
        lon: "77.6400",
        name: "Hennur Bagalur Road",
        display_name: "Hennur Bagalur Road, Bengaluru Urban, Karnataka, India",
        address: { road: "Hennur Bagalur Road", city: "Bengaluru", state: "Karnataka" },
      },
      {
        lat: "12.8310442",
        lon: "77.8658420",
        name: "Bagalur",
        display_name: "Bagalur, Hosur, Krishnagiri, Tamil Nadu, India",
        address: { town: "Bagalur", county: "Hosur", state: "Tamil Nadu" },
      },
      {
        lat: "13.1331868",
        lon: "77.6687093",
        name: "Bagaluru",
        display_name: "Bagaluru, Yelahanka taluku, Bengaluru Urban, Karnataka, India",
        address: { village: "Bagaluru", city: "Bengaluru Urban", state: "Karnataka" },
      },
    ]), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (success: (position: { coords: { latitude: number; longitude: number } }) => void) => {
          success({ coords: { latitude: 13.018, longitude: 77.64 } });
        },
      },
    });

    const prepared = await prepareUberHandoffUrl("My current location", null, "Bagalur, Bengaluru");
    const destination = JSON.parse(new URL(prepared.url).searchParams.get("drop[0]") ?? "null");
    const searchUrl = new URL(String(fetchMock.mock.calls[0][0]));

    expect(searchUrl.searchParams.get("q")).toBe("Bagaluru Bengaluru");
    expect(searchUrl.searchParams.get("limit")).toBe("10");
    expect(prepared.destination.address).toContain("Bagaluru, Yelahanka taluku, Bengaluru Urban");
    expect(prepared.destination.latitude).toBeCloseTo(13.133, 2);
    expect(destination).toMatchObject({
      latitude: 13.1331868,
      longitude: 77.6687093,
      addressLine1: "Bagalur, Bengaluru",
      addressLine2: "Bagaluru, Yelahanka taluku, Bengaluru Urban, Karnataka, India",
    });
  });

  it("does not rewrite an explicit Bengaluru road address", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      {
        lat: "13.0520",
        lon: "77.6400",
        name: "Bagalur Road",
        display_name: "Bagalur Road, Bengaluru Urban, Karnataka, India",
        address: { road: "Bagalur Road", city: "Bengaluru", state: "Karnataka" },
      },
    ]), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await geocodePlace("Bagalur Road, Bengaluru");

    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("q"))
      .toBe("Bagalur Road Bengaluru");
  });

  it("finds a named POI when a locality suffix prevents the full query from matching", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        lat: "13.0827",
        lon: "77.5870",
        name: "Phoenix Mall of Asia",
        display_name: "Phoenix Mall of Asia, GKVK, Bengaluru, Karnataka, India",
        class: "shop",
        type: "mall",
        address: { neighbourhood: "GKVK", city: "Bengaluru", state: "Karnataka" },
      }]), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const place = await geocodePlace("mall of asia, gkvk", { latitude: 13.08, longitude: 77.58 }, true);

    expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.get("q")).toBe("mall of asia");
    expect(place).toMatchObject({
      latitude: 13.0827,
      longitude: 77.587,
      name: "Phoenix Mall of Asia",
      locality: "GKVK",
      city: "Bengaluru",
      placeType: "mall",
    });
  });

  it("uses a broad POI search and tolerates a transposed speech-recognition typo", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        lat: "13.0827",
        lon: "77.5870",
        name: "Phoenix Mall of Asia",
        display_name: "Phoenix Mall of Asia, Bengaluru, Karnataka, India",
        class: "shop",
        type: "mall",
        address: { city: "Bengaluru", state: "Karnataka" },
      }]), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const place = await geocodePlace("mall of aisa gkvk", { latitude: 13.08, longitude: 77.58 }, true);

    expect(new URL(String(fetchMock.mock.calls[2][0])).searchParams.get("q")).toBe("mall");
    expect(place.name).toBe("Phoenix Mall of Asia");
    expect(place.latitude).toBe(13.0827);
  });

  it("falls back to a nearby place when an exact search is not found within 50 km", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        lat: "13.0827",
        lon: "77.5870",
        display_name: "Bengaluru, Karnataka, India",
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const prepared = await geocodePlace("barthiya mall thani sandra", { latitude: 13.0827, longitude: 77.587 });

    expect(prepared).toMatchObject({
      latitude: 13.0827,
      longitude: 77.587,
      address: "Bengaluru, Karnataka, India",
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain("viewbox=");
    expect(String(fetchMock.mock.calls[1][0])).toContain("https://nominatim.openstreetmap.org/reverse");
  });

  it("rejects an empty destination before making network requests", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(prepareUberHandoffUrl("My current location", null, "  "))
      .rejects.toThrow("Enter a destination");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("explains a denied device location permission", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (_success: unknown, error: (failure: { code: number }) => void) => error({ code: 1 }),
      },
    });

    await expect(getCurrentCoordinates()).rejects.toThrow("Location permission was denied");
  });
});
