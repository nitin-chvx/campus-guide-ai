import { useState } from "react";
import "./App.css";
import campusData from "./data/campusData";
import AIAssistant from "./components/AIAssistant";

/* =========================================================
   MAP PAGE
   ========================================================= */

function MapPage() {
  const [search, setSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [zoom, setZoom] = useState(1);

  const getLocationIcon = (type) => {
    if (type === "Library") return "L";
    if (type === "Lab") return "⌘";
    if (type === "Food") return "F";
    if (type === "Facility") return "W";
    return "•";
  };

  const filteredLocations = campusData.filter((location) => {
    const query = search.toLowerCase().trim();

    if (!query) return true;

    const searchableText = [
      location.name,
      location.type,
      location.zone,
      location.description,
      ...(location.keywords || []),
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(query);
  });

  const zoomIn = () => {
    setZoom((previous) => Math.min(previous + 0.2, 2));
  };

  const zoomOut = () => {
    setZoom((previous) => Math.max(previous - 0.2, 0.7));
  };

  const resetZoom = () => {
    setZoom(1);
  };

  const selectLocation = (location) => {
    setSelectedLocation(location);
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

          <div className="map-view">

            <div className="map-image-wrapper">
              <img
                src="/mangalayatan-campus-map.jpg"
                alt="Mangalayatan University campus map"
                className="campus-map-image"
                style={{
                  transform: `scale(${zoom})`,
                }}
              />
            </div>

            {/* MAP CONTROLS */}

            <div className="map-controls">

              <button
                type="button"
                onClick={zoomIn}
                aria-label="Zoom in"
              >
                +
              </button>

              <button
                type="button"
                onClick={zoomOut}
                aria-label="Zoom out"
              >
                −
              </button>

              <button
                type="button"
                onClick={resetZoom}
                aria-label="Reset map zoom"
              >
                ↺
              </button>

            </div>

            {/* SELECTED LOCATION INFORMATION */}

            {selectedLocation && (
              <div className="map-selected-card">

                <div className="map-selected-icon">
                  {getLocationIcon(selectedLocation.type)}
                </div>

                <div className="map-selected-content">

                  <span>
                    {selectedLocation.type}
                  </span>

                  <strong>
                    {selectedLocation.name}
                  </strong>

                  <p>
                    {selectedLocation.description}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() => setSelectedLocation(null)}
                  aria-label="Close selected location"
                >
                  ×
                </button>

              </div>
            )}

          </div>
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

            <span className="location-count">
              {filteredLocations.length}
            </span>

          </div>

          {/* SEARCH */}

          <div className="location-search">

            <span>⌕</span>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
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

          <div className="location-list">

            {filteredLocations.length > 0 ? (
              filteredLocations.map((location) => (
                <button
                  type="button"
                  className={`location-item ${
                    selectedLocation?.id === location.id
                      ? "selected"
                      : ""
                  }`}
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

  const searchResults = campusData.filter((location) => {
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

  const goHome = () => {
    setActivePage("home");
    setSearch("");
    setSelectedLocation(null);
  };

  const goMap = () => {
    setActivePage("map");
    setSearch("");
    setSelectedLocation(null);
  };

  const goAI = () => {
    setActivePage("ai");
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
            className="nav-link"
            type="button"
            onClick={() => {
              alert(
                "Schedule will be connected after the map and AI systems are complete."
              );
            }}
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

        <AIAssistant />

      ) : activePage === "map" ? (

        <MapPage />

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
                    onClick={() => {
                      alert(
                        "Schedule will be connected in the next development phase."
                      );
                    }}
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
          className="mobile-nav-item"
          type="button"
          onClick={() => {
            alert(
              "Schedule will be connected in the next development phase."
            );
          }}
        >
          <span>▣</span>
          <small>Schedule</small>
        </button>

      </nav>

    </div>
  );
}

export default App;