import { useState } from "react";
import campusData from "../data/campusData";

function CampusMap() {
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(1);

  const filteredLocations = campusData.filter((location) =>
    location.name.toLowerCase().includes(search.toLowerCase())
  );

  const zoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 2));
  };

  const zoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 0.6));
  };

  const resetZoom = () => {
    setZoom(1);
  };

  return (
    <main className="map-page">
      {/* PAGE HEADER */}
      <section className="map-hero">
        <div>
          <span className="map-eyebrow">CAMPUS MAP</span>

          <h1>
            Find your <span>way.</span>
          </h1>

          <p>
            Explore Mangalayatan University using verified campus
            information.
          </p>
        </div>

        <div className="map-verified">
          <span></span>
          Verified campus data
        </div>
      </section>

      {/* MAP + LOCATIONS */}
      <section className="map-layout">

        {/* MAP CARD */}
        <div className="map-card">

          <div className="map-card-header">
            <div>
              <span>MANGALAYATAN UNIVERSITY</span>
              <h2>Campus Map</h2>
            </div>

            <div className="map-badge">
              VERIFIED
            </div>
          </div>

          {/* MAP */}
          <div className="map-view">

            <img
              src="/mangalayatan-campus-map.jpg"
              alt="Mangalayatan University campus map"
              className="campus-map-image"
              style={{
                transform: `scale(${zoom})`,
              }}
            />

            {/* MAP CONTROLS */}
            <div className="map-controls">

              <button onClick={zoomIn} aria-label="Zoom in">
                +
              </button>

              <button onClick={zoomOut} aria-label="Zoom out">
                −
              </button>

              <button onClick={resetZoom} aria-label="Reset map">
                ⟳
              </button>

            </div>

          </div>
        </div>

        {/* LOCATIONS CARD */}
        <aside className="locations-card">

          <div className="locations-header">

            <span>LOCATIONS</span>

            <h2>Verified places</h2>

          </div>

          {/* SEARCH */}
          <div className="location-search">

            <span>⌕</span>

            <input
              type="text"
              placeholder="Search campus..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

          </div>

          {/* LOCATION LIST */}
          <div className="location-list">

            {filteredLocations.length > 0 ? (
              filteredLocations.map((location) => (

                <button
                  className="location-item"
                  key={location.id || location.name}
                >

                  <div className="location-icon">
                    {location.name.charAt(0)}
                  </div>

                  <div className="location-info">

                    <strong>{location.name}</strong>

                    <small>
                      {location.type || "Campus facility"}
                    </small>

                  </div>

                </button>

              ))
            ) : (
              <div className="no-results">
                No verified location found.
              </div>
            )}

          </div>

        </aside>

      </section>
    </main>
  );
}

export default CampusMap;