"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { roofPricing } from "@/lib/contractors";
import type { RoofEstimate } from "@/lib";

// Default to Menasha, WI
const DEFAULT_CENTER = { lat: 44.2022, lng: -88.4465 };
const DEFAULT_ZOOM = 18;

let mapsInitialized = false;
async function initMaps(): Promise<void> {
  if (mapsInitialized) return;
  setOptions({
    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    v: "beta",
    libraries: ["geometry"],
  });
  await importLibrary("core");
  mapsInitialized = true;
}

export default function RoofEstimatorPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [estimate, setEstimate] = useState<RoofEstimate | null>(null);
  const [areaSqMeters, setAreaSqMeters] = useState<number | null>(null);
  const [roofPitch, setRoofPitch] = useState<string>("medium");
  const [isDrawing, setIsDrawing] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [geocoderError, setGeocoderError] = useState<string | null>(null);

  // Refs that need to persist across renders without triggering re-renders
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const verticesRef = useRef<google.maps.LatLng[]>([]);
  const drawingLineRef = useRef<google.maps.Polyline | null>(null);

  // Load map
  useEffect(() => {
    if (!mapRef.current || mapLoaded) return;

    initMaps().then(() => {
      if (!mapRef.current) return;

      const m = new google.maps.Map(mapRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        mapTypeId: "satellite",
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });
      setMap(m);
      setMapLoaded(true);
    }).catch(err => {
      console.error("Failed to load Google Maps:", err);
      setMapError("Could not load Google Maps. Please check your API key or try again later.");
    });

    return () => {
      // Clean up click listener on unmount
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Recalculate estimate when area or pitch changes
  useEffect(() => {
    if (areaSqMeters === null) {
      setEstimate(null);
      return;
    }

    const areaSqFt = areaSqMeters * 10.7639;
    const pitchFactors: Record<string, number> = {
      low: 1.1,
      medium: 1.25,
      high: 1.5,
      steep: 1.7,
    };
    const pf = pitchFactors[roofPitch] || 1.25;
    const adjustedArea = areaSqFt * pf;
    const squares = adjustedArea / 100;

    const p = roofPricing;

    setEstimate({
      areaSqFt: Math.round(adjustedArea),
      squares: Math.round(squares * 10) / 10,
      materialCostLow: Math.round(adjustedArea * p.materialPerSqFt.low),
      materialCostHigh: Math.round(adjustedArea * p.materialPerSqFt.high),
      laborCostLow: Math.round(adjustedArea * p.laborPerSqFt.low),
      laborCostHigh: Math.round(adjustedArea * p.laborPerSqFt.high),
      removalCostLow: Math.round(adjustedArea * p.removalPerSqFt.low),
      removalCostHigh: Math.round(adjustedArea * p.removalPerSqFt.high),
      totalLow: Math.round(adjustedArea * (p.materialPerSqFt.low + p.laborPerSqFt.low + p.removalPerSqFt.low)),
      totalHigh: Math.round(adjustedArea * (p.materialPerSqFt.high + p.laborPerSqFt.high + p.removalPerSqFt.high)),
      pitchFactor: pf,
    });
  }, [areaSqMeters, roofPitch]);

  const updateArea = useCallback((vertices: google.maps.LatLng[]) => {
    if (vertices.length >= 3) {
      const area = google.maps.geometry.spherical.computeArea(vertices);
      setAreaSqMeters(area);
    } else {
      setAreaSqMeters(null);
    }
  }, []);

  // Build/rebuild polygon from vertices
  const buildPolygon = useCallback((vertices: google.maps.LatLng[], m: google.maps.Map) => {
    // Clear old
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
    }
    if (drawingLineRef.current) {
      drawingLineRef.current.setMap(null);
    }
    markersRef.current.forEach(mk => mk.setMap(null));
    markersRef.current = [];

    if (vertices.length < 2) return;

    // Live preview line
    drawingLineRef.current = new google.maps.Polyline({
      path: vertices,
      strokeColor: "#1e40af",
      strokeWeight: 2,
      strokeOpacity: 0.8,
      map: m,
    });

    // Vertex markers
    vertices.forEach((v, i) => {
      const marker = new google.maps.Marker({
        position: v,
        map: m,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: i === 0 ? "#16a34a" : "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        draggable: true,
        title: i === 0 ? "Start point" : `Point ${i + 1}`,
      });

      google.maps.event.addListener(marker, "dragend", () => {
        vertices[i] = marker.getPosition()!;
        buildPolygon(vertices, m);
        updateArea(vertices);
      });

      markersRef.current.push(marker);
    });

    // If we have 3+ vertices, build the polygon
    if (vertices.length >= 3) {
      const polygon = new google.maps.Polygon({
        paths: vertices,
        fillColor: "#3b82f6",
        fillOpacity: 0.3,
        strokeColor: "#1e40af",
        strokeWeight: 2,
        editable: false,
        map: m,
      });
      polygonRef.current = polygon;
      updateArea(vertices);
    }
  }, [updateArea]);

  const handleStartDrawing = useCallback(() => {
    if (!map) return;

    // Clear existing
    handleClearMeasurement();
    verticesRef.current = [];
    setIsDrawing(true);

    // Change cursor
    map.setOptions({ draggableCursor: "crosshair" });

    // Remove old listener if exists
    if (clickListenerRef.current) {
      google.maps.event.removeListener(clickListenerRef.current);
    }

    clickListenerRef.current = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      verticesRef.current.push(e.latLng);
      buildPolygon(verticesRef.current, map);

      // Auto-close if clicked near first point (within ~10 pixels)
      if (verticesRef.current.length >= 4) {
        const first = verticesRef.current[0];
        const dist = google.maps.geometry.spherical.computeDistanceBetween(first, e.latLng);
        if (dist < 2) {
          // Close the polygon
          finishDrawing();
        }
      }
    });
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  const finishDrawing = useCallback(() => {
    if (!map) return;
    setIsDrawing(false);
    map.setOptions({ draggableCursor: "" });

    if (clickListenerRef.current) {
      google.maps.event.removeListener(clickListenerRef.current);
      clickListenerRef.current = null;
    }

    // Remove the preview line, keep the polygon
    if (drawingLineRef.current) {
      drawingLineRef.current.setMap(null);
      drawingLineRef.current = null;
    }
  }, [map]);

  const handleCancelDrawing = useCallback(() => {
    finishDrawing();
    handleClearMeasurement();
  }, [finishDrawing]);

  const handleClearMeasurement = useCallback(() => {
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }
    if (drawingLineRef.current) {
      drawingLineRef.current.setMap(null);
      drawingLineRef.current = null;
    }
    markersRef.current.forEach(mk => mk.setMap(null));
    markersRef.current = [];
    verticesRef.current = [];
    setAreaSqMeters(null);
    setEstimate(null);
  }, []);

  const handleSearchAddress = useCallback(() => {
    if (!map || !address.trim()) return;
    setGeocoderError(null);

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: address.trim() }, (results, status) => {
      if (status === "OK" && results && results[0]?.geometry?.location) {
        map.setCenter(results[0].geometry.location);
        map.setZoom(20);
      } else {
        setGeocoderError("Address not found. Try a simpler search like '123 Main St, Menasha, WI'.");
      }
    });
  }, [map, address]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">Roof Cost Estimator</h1>
        <p className="text-gray-600">
          Trace your roof on satellite imagery to get an instant Wisconsin-specific cost estimate.
          Estimates use local 2026 pricing for materials and labor.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Toolbar */}
            <div className="p-3 bg-gray-50 border-b flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[200px] flex gap-2">
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearchAddress()}
                  placeholder="Enter your address..."
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  style={{ fontSize: '16px' }}
                />
                <button
                  onClick={handleSearchAddress}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Search
                </button>
              </div>

              <div className="flex gap-2">
                {!isDrawing ? (
                  <button onClick={handleStartDrawing} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors whitespace-nowrap">
                    ✏️ Trace Roof
                  </button>
                ) : (
                  <>
                    <button onClick={finishDrawing} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap">
                      ✓ Finish
                    </button>
                    <button onClick={handleCancelDrawing} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors whitespace-nowrap">
                      Cancel
                    </button>
                  </>
                )}
                {(verticesRef.current.length > 0 || polygonRef.current) && (
                  <button onClick={handleClearMeasurement} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors whitespace-nowrap">
                    Clear
                  </button>
                )}
              </div>
            </div>

            {geocoderError && (
              <div className="px-4 py-2 bg-red-50 text-red-700 text-sm">{geocoderError}</div>
            )}

            {mapError ? (
              <div className="flex items-center justify-center h-[500px] bg-gray-100 text-center px-8">
                <div>
                  <div className="text-4xl mb-4">🗺️</div>
                  <p className="text-red-600 font-medium">{mapError}</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Add your Google Maps API key to <code className="bg-gray-200 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your <code className="bg-gray-200 px-1 rounded">.env.local</code> file.
                  </p>
                </div>
              </div>
            ) : (
              <div ref={mapRef} className="h-[500px] w-full" />
            )}
          </div>

          {isDrawing && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">✏️</span>
                <strong>Drawing Mode</strong>
              </div>
              <p>Click points around your roof outline. Click <strong>&quot;Finish&quot;</strong> when done, or click near your first point to auto-close.</p>
            </div>
          )}
          {verticesRef.current.length > 0 && !isDrawing && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              <div className="flex items-center gap-2">
                <span>✓</span>
                <span><strong>{verticesRef.current.length} points</strong> placed. Drag the blue dots to adjust.</span>
              </div>
            </div>
          )}
        </div>

        {/* Estimate Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <label className="block text-sm font-bold mb-2">Roof Pitch</label>
            <select
              value={roofPitch}
              onChange={e => setRoofPitch(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="low">Low (flat or 2-4/12)</option>
              <option value="medium">Medium (5-7/12 — most common)</option>
              <option value="high">High (8-10/12)</option>
              <option value="steep">Steep (11+/12)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Steeper roofs cost more due to safety &amp; labor</p>
          </div>

          {estimate ? (
            <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
              <h3 className="font-bold text-lg">Your Estimate</h3>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-gray-500 text-xs">Roof Area</div>
                  <div className="font-bold text-lg">{estimate.areaSqFt.toLocaleString()} sq ft</div>
                  <div className="text-xs text-gray-400">{estimate.squares} squares</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-gray-500 text-xs">Pitch Factor</div>
                  <div className="font-bold text-lg">{estimate.pitchFactor}x</div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Materials</span>
                  <span className="font-medium">{formatCurrency(estimate.materialCostLow)} – {formatCurrency(estimate.materialCostHigh)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Labor</span>
                  <span className="font-medium">{formatCurrency(estimate.laborCostLow)} – {formatCurrency(estimate.laborCostHigh)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Old Roof Removal</span>
                  <span className="font-medium">{formatCurrency(estimate.removalCostLow)} – {formatCurrency(estimate.removalCostHigh)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-bold text-base">
                  <span>Estimated Total</span>
                  <span className="text-blue-700">{formatCurrency(estimate.totalLow)} – {formatCurrency(estimate.totalHigh)}</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                Based on Wisconsin 2026 asphalt shingle pricing. Actual costs vary. Get at least 3 quotes.
              </p>

              <a
                href="/contractors?category=roofing"
                className="block w-full text-center btn-primary text-sm"
              >
                🔨 Find Local Roofers
              </a>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-5 text-center text-gray-400">
              <div className="text-4xl mb-3">📐</div>
              <p className="text-sm font-medium">Trace your roof to see your estimate</p>
              <p className="text-xs mt-2">Click &quot;Trace Roof&quot; and click points around your roof on the satellite view.</p>
            </div>
          )}

          {/* Ad slot */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border-2 border-dashed border-amber-300 p-5 text-center">
            <p className="text-xs text-amber-700 font-bold mb-2">ADVERTISEMENT</p>
            <p className="text-sm text-gray-600 mb-3">Get your roofing company in front of homeowners actively estimating costs.</p>
            <a href="mailto:ads@foxcitiesrecovery.com" className="text-xs text-amber-700 font-bold hover:underline">
              Advertise →
            </a>
          </div>
        </div>
      </div>

      {/* How to use */}
      <div className="mt-12 bg-white rounded-xl shadow-sm border p-6 sm:p-8">
        <h2 className="font-bold text-xl mb-4">How to Use the Roof Estimator</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { step: "1", title: "Find Your Home", desc: "Search your address or navigate on the satellite map to find your property." },
            { step: "2", title: "Trace Your Roof", desc: "Click 'Trace Roof' and click points around your roof outline. Click Finish when done." },
            { step: "3", title: "Get Your Estimate", desc: "Adjust the roof pitch and see your instant cost estimate with Wisconsin pricing." },
          ].map(item => (
            <div key={item.step} className="text-center">
              <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold mx-auto mb-3">{item.step}</div>
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 p-4 bg-amber-50 rounded-lg text-sm text-amber-800">
          <strong>⚠️ Important:</strong> This is an estimate only. For an accurate quote, contact a verified local roofer.
          Roof pitch, complexity, number of layers, and hidden damage all affect the final price. Always get multiple quotes.
        </div>
      </div>
    </div>
  );
}
