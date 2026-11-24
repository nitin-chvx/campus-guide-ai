import { useEffect, useRef, useState } from "react";
import "./App.css";
import AIAssistant from "./components/AIAssistant";
import Schedule from "./components/Schedule";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const MIN_MAP_SCALE = 1;
const MAX_MAP_SCALE = 3.2;

/* =========================================================
   MAP PAGE
   ========================================================= */

function MapPage({ campusLocations, selectedLocationId, onClearSelection, onAskAssistant }) {
  const [search, setSearch] = useState("");
  const [listSelectedLocation, setListSelectedLocation] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [isMapInteracting, setIsMapInteracting] = useState(false);
  const [mapLayerSize, setMapLayerSize] = useState(null);
  const mapViewRef = useRef(null);
  const mapImageWrapperRef = useRef(null);
  const mapImageRef = useRef(null);
  const pointerPositionsRef = useRef(new Map());
  const pointerCaptureTargetsRef = useRef(new Map());
  const gestureRef = useRef(null);
  const mapTransformRef = useRef({ x: 0, y: 0, scale: 1 });
  const mapWheelHandlerRef = useRef(null);
  const mapMovedRef = useRef(false);
  const suppressMapClickUntilRef = useRef(0);
  const zoomSyncTimerRef = useRef(null);
  const selectedListItemRef = useRef(null);

  const verifiedCampusLocations = campusLocations.filter((location) =>
    location.is_verified === true
  );

  const selectedLocation = verifiedCampusLocations.find((location) =>
    location.id === selectedLocationId && location.is_verified === true
  ) || listSelectedLocation;

  useEffect(() => {
    selectedListItemRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedLocation?.id, search]);

  useEffect(() => {
    const viewport = mapViewRef.current;
    if (!viewport) return undefined;

    const measureLayer = () => {
      const image = mapImageRef.current;
      if (!image) return;
      const { width, height } = viewport.getBoundingClientRect();
      if (!width || !height) return;

      const naturalWidth = image.naturalWidth || width;
      const naturalHeight = image.naturalHeight || height;
      const coverScale = Math.max(width / naturalWidth, height / naturalHeight);
      const layerWidth = naturalWidth * coverScale;
      const layerHeight = naturalHeight * coverScale;
      setMapLayerSize({ width: layerWidth, height: layerHeight });

      const current = mapTransformRef.current;
      const maxX = Math.max(0, (layerWidth * current.scale - width) / 2);
      const maxY = Math.max(0, (layerHeight * current.scale - height) / 2);
      mapTransformRef.current = {
        ...current,
        x: Math.min(maxX, Math.max(-maxX, current.x)),
        y: Math.min(maxY, Math.max(-maxY, current.y)),
      };
    };

    const observer = new ResizeObserver(measureLayer);
    observer.observe(viewport);
    mapImageRef.current?.addEventListener("load", measureLayer);
    measureLayer();

    return () => {
      observer.disconnect();
      mapImageRef.current?.removeEventListener("load", measureLayer);
    };
  }, []);

  const getLocationIcon = (type) => {
    if (type === "Library") return "L";
    if (type === "Lab") return "⌘";
    if (type === "Food") return "F";
    if (type === "Facility") return "W";
    return "•";
  };

  const filteredLocations = verifiedCampusLocations.filter((location) => {
    const query = search.toLowerCase().trim();

    if (!query) return true;
    return location.name.toLowerCase().includes(query);
  });

  const hasValidCoordinates = Boolean(
    selectedLocation?.is_verified === true &&
    Number.isFinite(selectedLocation.latitude) &&
    selectedLocation.latitude >= -90 &&
    selectedLocation.latitude <= 90 &&
    Number.isFinite(selectedLocation.longitude) &&
    selectedLocation.longitude >= -180 &&
    selectedLocation.longitude <= 180
  );

  const clampMapTransform = (transform) => {
    const viewport = mapViewRef.current;
    if (!viewport) return transform;

    const { width, height } = viewport.getBoundingClientRect();
    const image = mapImageRef.current;
    const naturalWidth = image?.naturalWidth || width;
    const naturalHeight = image?.naturalHeight || height;
    const fitScale = Math.max(width / naturalWidth, height / naturalHeight);
    const imageWidth = naturalWidth * fitScale;
    const imageHeight = naturalHeight * fitScale;
    const maxX = Math.max(0, (imageWidth * transform.scale - width) / 2);
    const maxY = Math.max(0, (imageHeight * transform.scale - height) / 2);

    return {
      scale: Math.min(MAX_MAP_SCALE, Math.max(MIN_MAP_SCALE, transform.scale)),
      x: Math.min(maxX, Math.max(-maxX, transform.x)),
      y: Math.min(maxY, Math.max(-maxY, transform.y)),
    };
  };

  const applyMapTransform = (transform, syncZoom = false) => {
    const next = clampMapTransform(transform);
    mapTransformRef.current = next;
    if (mapImageWrapperRef.current) {
      mapImageWrapperRef.current.style.transform =
        `translate3d(${next.x}px, ${next.y}px, 0) scale(${next.scale})`;
    }
    if (syncZoom) setZoom(next.scale);
    return next;
  };

  const zoomAtPoint = (requestedScale, clientX, clientY, syncZoom = true) => {
    const viewport = mapViewRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const pointX = clientX - rect.left - rect.width / 2;
    const pointY = clientY - rect.top - rect.height / 2;
    const current = mapTransformRef.current;
    const nextScale = Math.min(MAX_MAP_SCALE, Math.max(MIN_MAP_SCALE, requestedScale));
    const mapPointX = (pointX - current.x) / current.scale;
    const mapPointY = (pointY - current.y) / current.scale;

    applyMapTransform({
      scale: nextScale,
      x: pointX - mapPointX * nextScale,
      y: pointY - mapPointY * nextScale,
    }, syncZoom);
  };

  const zoomIn = () => {
    const viewport = mapViewRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    zoomAtPoint(mapTransformRef.current.scale * 1.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const zoomOut = () => {
    const viewport = mapViewRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    zoomAtPoint(mapTransformRef.current.scale / 1.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const resetZoom = () => {
    applyMapTransform({ x: 0, y: 0, scale: 1 }, true);
  };

  const handleMapPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target.closest(".map-controls, .map-selected-card")) return;

    const pointers = pointerPositionsRef.current;
    if (pointers.size >= 2) return;
    if (pointers.size === 0) {
      mapMovedRef.current = false;
      suppressMapClickUntilRef.current = 0;
    }

    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const captureTarget = event.target;
    if (captureTarget.setPointerCapture) {
      captureTarget.setPointerCapture(event.pointerId);
      pointerCaptureTargetsRef.current.set(event.pointerId, captureTarget);
    }

    if (pointers.size === 1) {
      gestureRef.current = {
        type: "pan",
        startX: event.clientX,
        startY: event.clientY,
        origin: mapTransformRef.current,
      };
    } else {
      const [first, second] = [...pointers.values()];
      gestureRef.current = {
        type: "pinch",
        startDistance: Math.hypot(second.x - first.x, second.y - first.y),
        startScale: mapTransformRef.current.scale,
        origin: mapTransformRef.current,
      };
    }

    setIsMapInteracting(true);
  };

  const handleMapPointerMove = (event) => {
    const pointers = pointerPositionsRef.current;
    if (!pointers.has(event.pointerId)) return;

    const previous = pointers.get(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const gesture = gestureRef.current;
    if (!gesture) return;

    if (pointers.size >= 2) {
      const [first, second] = [...pointers.values()];
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const centerX = (first.x + second.x) / 2;
      const centerY = (first.y + second.y) / 2;
      const viewport = mapViewRef.current;
      if (!viewport || !gesture.startDistance) return;

      const rect = viewport.getBoundingClientRect();
      const pointX = centerX - rect.left - rect.width / 2;
      const pointY = centerY - rect.top - rect.height / 2;
      const scale = Math.min(MAX_MAP_SCALE, Math.max(
        MIN_MAP_SCALE,
        gesture.startScale * (distance / gesture.startDistance)
      ));
      const mapPointX = (pointX - gesture.origin.x) / gesture.startScale;
      const mapPointY = (pointY - gesture.origin.y) / gesture.startScale;

      if (Math.abs(scale - gesture.startScale) > 0.01 || Math.abs(centerX - previous.x) > 3) {
        mapMovedRef.current = true;
      }
      applyMapTransform({
        scale,
        x: pointX - mapPointX * scale,
        y: pointY - mapPointY * scale,
      });
      event.preventDefault();
      return;
    }

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (Math.hypot(deltaX, deltaY) > 4) mapMovedRef.current = true;
    if (mapMovedRef.current) {
      applyMapTransform({
        ...gesture.origin,
        x: gesture.origin.x + deltaX,
        y: gesture.origin.y + deltaY,
      });
      event.preventDefault();
    }
  };

  const finishMapPointer = (event) => {
    const pointers = pointerPositionsRef.current;
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);

    const captureTarget = pointerCaptureTargetsRef.current.get(event.pointerId);
    if (captureTarget?.hasPointerCapture?.(event.pointerId)) {
      captureTarget.releasePointerCapture(event.pointerId);
    }
    pointerCaptureTargetsRef.current.delete(event.pointerId);

    if (pointers.size === 1) {
      const [remainingId, point] = [...pointers.entries()][0];
      gestureRef.current = {
        type: "pan",
        pointerId: remainingId,
        startX: point.x,
        startY: point.y,
        origin: mapTransformRef.current,
      };
      return;
    }

    gestureRef.current = null;
    setIsMapInteracting(false);
    setZoom(mapTransformRef.current.scale);
    if (mapMovedRef.current) {
      suppressMapClickUntilRef.current = Date.now() + 200;
    }
  };

  const handleMapWheel = (event) => {
    if (event.target.closest(".map-controls, .map-selected-card")) return;
    event.preventDefault();
    const viewport = mapViewRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const delta = event.deltaMode === 1
      ? event.deltaY * 16
      : event.deltaMode === 2
        ? event.deltaY * rect.height
        : event.deltaY;
    const current = mapTransformRef.current;
    zoomAtPoint(current.scale * Math.exp(-delta * 0.0012), event.clientX, event.clientY, false);
    window.clearTimeout(zoomSyncTimerRef.current);
    zoomSyncTimerRef.current = window.setTimeout(() => {
      setZoom(mapTransformRef.current.scale);
    }, 120);
  };

  mapWheelHandlerRef.current = handleMapWheel;

  useEffect(() => {
    const viewport = mapViewRef.current;
    if (!viewport) return undefined;

    const wheelListener = (event) => mapWheelHandlerRef.current?.(event);
    viewport.addEventListener("wheel", wheelListener, { passive: false });
    return () => viewport.removeEventListener("wheel", wheelListener);
  }, []);

  const handleMapClickCapture = (event) => {
    if (Date.now() < suppressMapClickUntilRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressMapClickUntilRef.current = 0;
    }
  };

  const selectLocation = (location) => {
    setListSelectedLocation(location);
    onClearSelection?.();
  };

  const clearSelection = () => {
    setListSelectedLocation(null);
    onClearSelection?.();
  };

  const updateSearch = (value) => {
    setSearch(value);
    const query = value.trim().toLowerCase();
    if (query && selectedLocation && !selectedLocation.name.toLowerCase().includes(query)) {
      clearSelection();
    }
  };

  return (
    <main className="map-page">
      {/* ================= MAP HEADER ================= */}

      <div className="map-page-header">
        <div>
          <span className="section-label">CAMPUS MAP</span>

          <h1>Find your way.</h1>

          <p>
            Explore buildings and campus locations using
            verified campus information.
          </p>
        </div>

        <div className="map-status">
          <span></span>
          Verified campus data
        </div>
      </div>

      {/* ================= MAP LAYOUT ================= */}

      <section className="map-layout">

        {/* ================= MAP CARD ================= */}

        <div className="map-card">

          <div className="map-card-header">
            <div>
              <span className="map-card-label">
                MANGALAYATAN UNIVERSITY
              </span>

              <h2>Campus map</h2>
            </div>

            <div className="map-card-verified">
              <span></span>
              Verified
            </div>
          </div>

          {/* ================= MAP VIEW ================= */}

          <div
            ref={mapViewRef}
            className={`map-view ${isMapInteracting ? "is-interacting" : ""}`}
            onPointerDown={handleMapPointerDown}
            onPointerMove={handleMapPointerMove}
            onPointerUp={finishMapPointer}
            onPointerCancel={finishMapPointer}
            onClickCapture={handleMapClickCapture}
          >

            <div
              ref={mapImageWrapperRef}
              className="map-image-wrapper"
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: mapLayerSize ? `${mapLayerSize.width}px` : "100%",
                height: mapLayerSize ? `${mapLayerSize.height}px` : "100%",
                marginLeft: mapLayerSize ? `${-mapLayerSize.width / 2}px` : "-50%",
                marginTop: mapLayerSize ? `${-mapLayerSize.height / 2}px` : "-50%",
                transform: `translate3d(${mapTransformRef.current.x}px, ${mapTransformRef.current.y}px, 0) scale(${mapTransformRef.current.scale})`,
              }}
            >
              <img
                ref={mapImageRef}
                src="/mangalayatan-campus-map.jpg"
                alt="Mangalayatan University campus map"
                className="campus-map-image"
                draggable={false}
              />
            </div>

            {/* MAP CONTROLS */}

            <div className="map-controls">

              <button
                type="button"
                onClick={zoomIn}
                disabled={zoom >= MAX_MAP_SCALE}
                aria-label="Zoom in"
                title="Zoom in"
              >
                +
              </button>

              <button
                type="button"
                onClick={zoomOut}
                disabled={zoom <= MIN_MAP_SCALE}
                aria-label="Zoom out"
                title="Zoom out"
              >
                −
              </button>

              <button
                type="button"
                onClick={resetZoom}
                aria-label="Reset map view"
                title="Reset map view"
              >
                ↺
              </button>

            </div>


          </div>

          {/* Selected building details are kept below the image canvas. */}
            {/* SELECTED LOCATION INFORMATION */}

            {selectedLocation && (
              <div className="map-selected-card">

                <div className="map-selected-icon">
                  {getLocationIcon(selectedLocation.type)}
                </div>

                <div className="map-selected-content">
                  <span>{selectedLocation.type || "Campus location"}</span>
                  <strong>{selectedLocation.name}</strong>
                  <dl className="map-selected-details">
                    <div>
                      <dt>Description</dt>
                      <dd>{selectedLocation.description || "Unavailable in verified records."}</dd>
                    </div>
                    <div>
                      <dt>Zone</dt>
                      <dd>{selectedLocation.zone || "Unavailable in verified records."}</dd>
                    </div>
                    <div>
                      <dt>Coordinates</dt>
                      <dd>
                        {hasValidCoordinates
                          ? `${selectedLocation.latitude}, ${selectedLocation.longitude}`
                          : "Coordinates unavailable"}
                      </dd>
                    </div>
                  </dl>
                  {selectedLocation.is_verified === true && selectedLocation.id && (
                    <button
                      type="button"
                      className="map-selected-assistant"
                      onClick={() => onAskAssistant?.(selectedLocation.id)}
                    >
                      Ask Campus Assistant
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={clearSelection}
                  aria-label="Close selected location"
                >
                  ×
                </button>

              </div>
            )}
        </div>

        {/* ================= LOCATIONS PANEL ================= */}

        <aside className="locations-card">

          <div className="locations-header">

            <div>
              <span className="section-label">
                VERIFIED LOCATIONS
              </span>

              <h2>Explore campus</h2>
            </div>

            <div className="locations-header-actions">
              {selectedLocation && (
                <button
                  type="button"
                  className="clear-map-selection"
                  onClick={clearSelection}
                >
                  Clear selection
                </button>
              )}
              <span className="location-count" aria-label={`${filteredLocations.length} search results`}>
                {filteredLocations.length}
              </span>
            </div>

          </div>

          {/* SEARCH */}

          <div className="location-search">

            <span>⌕</span>

            <input
              type="text"
              value={search}
              aria-label="Search verified campus buildings by name"
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Search locations..."
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear location search"
              >
                ×
              </button>
            )}

          </div>

          {/* LOCATION LIST */}

          <div className="location-list" aria-live="polite">

            {search && filteredLocations.length === 0 && (
              <div className="location-search-empty">
                No locations match “{search}”.
              </div>
            )}

            {filteredLocations.length > 0 ? (
              filteredLocations.map((location) => (
                <button
                  type="button"
                  ref={location.id === selectedLocation?.id ? selectedListItemRef : null}
                  className={`location-item ${
                    selectedLocation?.id === location.id
                      ? "selected"
                      : ""
                  }`}
                  aria-pressed={selectedLocation?.id === location.id}
                  key={location.id}
                  onClick={() => selectLocation(location)}
                >

                  <div className="location-icon">
                    {getLocationIcon(location.type)}
                  </div>

                  <div className="location-info">

                    <strong>
                      {location.name}
                    </strong>

                    <span>
                      {location.type}
                      {location.zone
                        ? ` · ${location.zone}`
                        : ""}
                    </span>

                  </div>

                  {selectedLocation?.id === location.id && (
                    <span className="location-selected-label">Selected</span>
                  )}

                  <span className="location-arrow">
                    →
                  </span>

                </button>
              ))
            ) : (
              <div className="no-results">

                <strong>
                  No location found
                </strong>

                <span>
                  Try another building or facility.
                </span>

              </div>
            )}

          </div>

          {/* TRUST NOTE */}

          <div className="map-trust-note">

            <span>✓</span>

            <p>
              Locations shown here come from
              verified campus data. No location
              is guessed.
            </p>

          </div>

        </aside>

      </section>
    </main>
  );
}


/* =========================================================
   MAIN APP
   ========================================================= */

function App() {
  const [search, setSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activePage, setActivePage] = useState("home");
  const [mapSelectionId, setMapSelectionId] = useState(null);
  const [assistantBuildingId, setAssistantBuildingId] = useState(null);
  const [campusLocations, setCampusLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadCampusLocations = async () => {
      try {
        setLocationsLoading(true);
        setLocationsError("");

        const response = await fetch(`${API_BASE_URL}/api/buildings`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load verified campus data.");
        }

        const result = await response.json();

        if (!result.success || !Array.isArray(result.data)) {
          throw new Error("Campus API returned an invalid response.");
        }

        if (!cancelled) {
          setCampusLocations(result.data);
        }
      } catch (error) {
        console.error("Campus locations error:", error);

        if (!cancelled) {
          setLocationsError(
            "Verified campus data could not be loaded. Please make sure the backend is running."
          );
        }
      } finally {
        if (!cancelled) {
          setLocationsLoading(false);
        }
      }
    };

    loadCampusLocations();

    return () => {
      cancelled = true;
    };
  }, []);

  const searchResults = campusLocations.filter((location) => {
    const query = search.toLowerCase().trim();

    if (!query) return false;

    const searchableText = [
      location.name,
      location.type,
      location.description,
      location.zone,
      ...(location.keywords || []),
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(query);
  });

  const quickPlaces = [
    {
      name: "Library",
      type: "Library",
      icon: "L",
    },
    {
      name: "Canteen",
      type: "Food",
      icon: "F",
    },
    {
      name: "Labs",
      type: "Lab",
      icon: "⌘",
    },
    {
      name: "Washrooms",
      type: "Facility",
      icon: "W",
    },
  ];

  const getLocationIcon = (type) => {
    if (type === "Library") return "L";
    if (type === "Lab") return "⌘";
    if (type === "Food") return "F";
    if (type === "Facility") return "W";

    return "•";
  };

  const handleQuickPlace = (place) => {
    setSelectedLocation(null);
    setSearch(place.name);
  };

  const handleResultClick = (location) => {
    setSelectedLocation(location);
  };

  const clearSearch = () => {
    setSearch("");
    setSelectedLocation(null);
  };

  const scrollToPageTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goHome = () => {
    scrollToPageTop();
    setActivePage("home");
    setSearch("");
    setSelectedLocation(null);
  };

  const goMap = () => {
    scrollToPageTop();
    setActivePage("map");
    setSearch("");
    setSelectedLocation(null);
    setMapSelectionId(null);
  };

  const handleViewBuildingOnMap = (building) => {
    if (building?.is_verified !== true || !building.id) return;

    const campusBuilding = campusLocations.find((location) =>
      location.id === building.id &&
      location.is_verified === true
    );
    if (!campusBuilding) return;

    setMapSelectionId(campusBuilding.id);
    setSearch("");
    setSelectedLocation(null);
    scrollToPageTop();
    setActivePage("map");
  };

  const canSelectBuildingOnMap = (building) =>
    building?.is_verified === true &&
    Boolean(building.id) &&
    campusLocations.some((location) =>
      location.id === building.id && location.is_verified === true
    );

  const openAssistantForBuilding = (buildingId) => {
    const building = campusLocations.find((location) =>
      location.id === buildingId && location.is_verified === true
    );
    if (!building) return;

    setAssistantBuildingId(building.id);
    scrollToPageTop();
    setActivePage("ai");
  };

  const goAI = () => {
    scrollToPageTop();
    setAssistantBuildingId(null);
    setActivePage("ai");
    setSearch("");
    setSelectedLocation(null);
  };

  const goSchedule = () => {
    scrollToPageTop();
    setActivePage("schedule");
    setSearch("");
    setSelectedLocation(null);
  };

  return (
    <div className="app">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="topbar">

        <button
          className="brand"
          type="button"
          onClick={goHome}
          aria-label="Go to Campus Guide AI home"
        >

          <div className="brand-icon">
            C
          </div>

          <div className="brand-name">
            Campus Guide <span>AI</span>
          </div>

        </button>

        <nav className="desktop-nav">

          <button
            className={`nav-link ${
              activePage === "home" ? "active" : ""
            }`}
            onClick={goHome}
          >
            Home
          </button>

          <button
            className={`nav-link ${
              activePage === "map" ? "active" : ""
            }`}
            onClick={goMap}
          >
            Map
          </button>

          <button
            className={`nav-link ${
              activePage === "ai" ? "active" : ""
            }`}
            onClick={goAI}
          >
            AI Assistant
          </button>

          <button
            className={`nav-link ${activePage === "schedule" ? "active" : ""}`}
            type="button"
            onClick={goSchedule}
          >
            Schedule
          </button>

        </nav>

        <button
          className="profile-button"
          aria-label="Profile"
          type="button"
        >
          •
        </button>

      </header>


      {/* =====================================================
          PAGE CONTENT
          ===================================================== */}

      {activePage === "ai" ? (

        <AIAssistant
          apiBaseUrl={API_BASE_URL}
          onViewOnMap={handleViewBuildingOnMap}
          canViewOnMap={canSelectBuildingOnMap}
          selectedBuildingId={assistantBuildingId}
          selectedBuildingName={campusLocations.find((location) =>
            location.id === assistantBuildingId && location.is_verified === true
          )?.name || ""}
          onClearBuildingContext={() => setAssistantBuildingId(null)}
        />

      ) : activePage === "schedule" ? (

        <Schedule
          campusLocations={campusLocations}
          locationsLoading={locationsLoading}
          locationsError={locationsError}
          onViewOnMap={handleViewBuildingOnMap}
        />

      ) : activePage === "map" ? (

        <MapPage
          campusLocations={campusLocations}
          selectedLocationId={mapSelectionId}
          onClearSelection={() => setMapSelectionId(null)}
          onAskAssistant={openAssistantForBuilding}
        />

      ) : (

        <main className="container">

          {/* ================= CAMPUS LABEL ================= */}

          <div className="campus-label">

            <span>
              MANGALAYATAN UNIVERSITY
            </span>

            <div className="verified-badge">
              <i></i>
              Verified campus data
            </div>

          </div>

          {locationsLoading && (
            <div className="map-trust-note" style={{ marginTop: "18px" }}>
              <span>•</span>
              <p>Loading verified campus data…</p>
            </div>
          )}

          {locationsError && (
            <div className="map-trust-note" style={{ marginTop: "18px" }}>
              <span>!</span>
              <p>{locationsError}</p>
            </div>
          )}


          {/* ================= HERO ================= */}

          <section className="hero">

            <h1>
              Find where you
              <br />
              <span>need to go.</span>
            </h1>

            <p>
              Find classrooms, buildings and campus facilities
              without wasting time.
            </p>

          </section>


          {/* ================= SEARCH ================= */}

          <section className="search-section">

            <div className="search-box">

              <span className="search-symbol">
                ⌕
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSelectedLocation(null);
                }}
                placeholder="Search a building, classroom, lab..."
              />

              {search && (
                <button
                  className="clear-button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  type="button"
                >
                  ×
                </button>
              )}

              <button
                className="explore-button"
                onClick={() => {
                  if (searchResults.length > 0) {
                    setSelectedLocation(
                      searchResults[0]
                    );
                  }
                }}
                type="button"
              >
                Explore
                <span>→</span>
              </button>

            </div>


            {/* ================= SEARCH RESULTS ================= */}

            {search && !selectedLocation && (

              <div className="search-results">

                <div className="results-top">

                  <span>
                    SEARCH RESULTS
                  </span>

                  <strong>
                    {searchResults.length}
                  </strong>

                </div>

                {searchResults.length > 0 ? (

                  searchResults.map((location) => (

                    <button
                      className="search-result"
                      key={location.id}
                      onClick={() =>
                        handleResultClick(location)
                      }
                      type="button"
                    >

                      <div className="result-icon">
                        {getLocationIcon(
                          location.type
                        )}
                      </div>

                      <div className="result-info">

                        <strong>
                          {location.name}
                        </strong>

                        <span>
                          {location.type} ·{" "}
                          {location.description}
                        </span>

                      </div>

                      <span className="result-arrow">
                        →
                      </span>

                    </button>

                  ))

                ) : (

                  <div className="no-results">

                    <strong>
                      No location found
                    </strong>

                    <span>
                      Try another building, room or facility.
                    </span>

                  </div>

                )}

              </div>

            )}


            {/* ================= LOCATION DETAILS ================= */}

            {selectedLocation && (

              <div className="location-details">

                <div className="location-details-header">

                  <div className="location-big-icon">
                    {getLocationIcon(
                      selectedLocation.type
                    )}
                  </div>

                  <button
                    className="location-close"
                    onClick={() =>
                      setSelectedLocation(null)
                    }
                    aria-label="Close location"
                    type="button"
                  >
                    ×
                  </button>

                </div>

                <div className="location-details-content">

                  <span className="location-type">
                    {selectedLocation.type}
                  </span>

                  <h2>
                    {selectedLocation.name}
                  </h2>

                  <p>
                    {selectedLocation.description}
                  </p>

                  {selectedLocation.keywords?.length > 0 && (

                    <div className="location-keywords">

                      {selectedLocation.keywords.map(
                        (keyword) => (
                          <span key={keyword}>
                            {keyword}
                          </span>
                        )
                      )}

                    </div>

                  )}

                  <div className="location-status">

                    <i></i>

                    Information from verified campus data

                  </div>

                  <button
                    className="location-map-button"
                    onClick={goMap}
                    type="button"
                  >
                    View on campus map
                    <span>→</span>
                  </button>

                </div>

              </div>

            )}

          </section>


          {/* ================= HOME CONTENT ================= */}

          {!search && (

            <>

              {/* QUICK DESTINATIONS */}

              <section className="quick-section">

                <div className="section-label">
                  FIND IT FAST
                </div>

                <div className="quick-grid">

                  {quickPlaces.map((place) => (

                    <button
                      className="quick-card"
                      key={place.name}
                      onClick={() =>
                        handleQuickPlace(place)
                      }
                      type="button"
                    >

                      <div className="quick-left">

                        <span className="quick-icon">
                          {place.icon}
                        </span>

                        <strong>
                          {place.name}
                        </strong>

                      </div>

                      <span className="quick-arrow">
                        →
                      </span>

                    </button>

                  ))}

                </div>

              </section>


              {/* NEXT CLASS */}

              <section className="next-class-section">

                <div className="section-heading">

                  <div>

                    <span className="section-label">
                      UP NEXT
                    </span>

                    <h2>
                      Your next class
                    </h2>

                  </div>

                  <button
                    className="schedule-link"
                    type="button"
                    onClick={goSchedule}
                  >
                    View schedule →
                  </button>

                </div>


                <div className="class-card">

                  <div className="class-time">

                    <strong>
                      10:00
                    </strong>

                    <span>
                      AM
                    </span>

                  </div>

                  <div className="class-line"></div>

                  <div className="class-details">

                    <span className="upcoming-label">
                      UPCOMING
                    </span>

                    <h3>
                      Data Structures
                    </h3>

                    <p>
                      CSE Block
                      <b>•</b>
                      Room 204
                    </p>

                  </div>

                  <button
                    className="navigate-button"
                    type="button"
                    onClick={goMap}
                  >
                    Navigate
                    <span>→</span>
                  </button>

                </div>

              </section>


              {/* AI ASSISTANT */}

              <section className="ai-section">

                <div className="ai-content">

                  <span className="section-label">
                    CAMPUS ASSISTANT
                  </span>

                  <h2>
                    Can't find something?
                  </h2>

                  <p>
                    Ask Campus AI using verified campus
                    information.
                  </p>

                  <button
                    className="ai-button"
                    onClick={goAI}
                    type="button"
                  >
                    Ask Campus AI
                    <span>→</span>
                  </button>

                </div>

                <div className="ai-symbol">
                  ✦
                </div>

              </section>

            </>

          )}

        </main>

      )}


      {/* =====================================================
          MOBILE NAV
          ===================================================== */}

      <nav className="mobile-nav">

        <button
          className={`mobile-nav-item ${
            activePage === "home" ? "active" : ""
          }`}
          onClick={goHome}
          type="button"
        >
          <span>⌂</span>
          <small>Home</small>
        </button>

        <button
          className={`mobile-nav-item ${
            activePage === "map" ? "active" : ""
          }`}
          onClick={goMap}
          type="button"
        >
          <span>⌖</span>
          <small>Map</small>
        </button>

        <button
          className={`mobile-nav-item ${
            activePage === "ai" ? "active" : ""
          }`}
          onClick={goAI}
          type="button"
        >
          <span>✦</span>
          <small>AI</small>
        </button>

        <button
          className={`mobile-nav-item ${activePage === "schedule" ? "active" : ""}`}
          type="button"
          onClick={goSchedule}
        >
          <span>▣</span>
          <small>Schedule</small>
        </button>

      </nav>

    </div>
  );
}

export default App;
