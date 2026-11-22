import { useEffect, useRef, useState } from "react";

function AIAssistant({
  apiBaseUrl,
  onViewOnMap,
  canViewOnMap,
  selectedBuildingId,
  selectedBuildingName,
  onClearBuildingContext,
}) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const requestInFlightRef = useRef(false);

  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hi! I'm the Campus Assistant. I can help you find verified information from the Mangalayatan University directory.",
    },
  ]);

  // =========================================================
  // AUTO SCROLL
  // =========================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isTyping]);


  // =========================================================
  // SEND MESSAGE
  // =========================================================

  const sendMessage = async (customMessage = null, isRetry = false) => {
    const question = (
      customMessage !== null
        ? customMessage
        : message
    ).trim();

    if (!question || requestInFlightRef.current || isTyping) return;

    requestInFlightRef.current = true;

    if (!isRetry) {
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          text: question,
        },
      ]);
      setMessage("");
    }
    setIsTyping(true);

    try {
      const requestBody = { message: question };
      if (selectedBuildingId) requestBody.buildingId = selectedBuildingId;

      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      let result = null;
      try {
        result = await response.json();
      } catch {
        // Handle non-JSON responses below with a friendly message.
      }

      if (!response.ok) {
        const serverMessage = typeof result?.message === "string"
          ? result.message.trim()
          : "";
        throw new Error(
          serverMessage ||
            `Campus AI couldn't answer right now (HTTP ${response.status}). Please try again.`
        );
      }

      if (
        result?.success !== true ||
        typeof result.answer !== "string" ||
        !result.answer.trim()
      ) {
        throw new Error("Campus AI returned an unexpected response. Please try again.");
      }

      if (selectedBuildingId && result.contextBuilding?.id !== selectedBuildingId) {
        throw new Error("The selected campus building could not be verified. Please try again.");
      }

      setMessages((prev) => [
        ...prev.map((item) =>
          item.retryQuestion === question
            ? { ...item, retryQuestion: undefined }
            : item
        ),
        {
          role: "ai",
          text: result.answer.trim(),
          verified: result.verified === true,
          buildings: Array.isArray(result.buildings)
            ? result.buildings.filter((building) =>
                building?.is_verified === true &&
                typeof building.name === "string" &&
                typeof building.type === "string"
              )
            : [],
        },
      ]);
    } catch (error) {
      console.error("Campus chat request failed:", error);

      const errorMessage = error instanceof TypeError
        ? "I couldn't connect to Campus AI. Check your connection and try again."
        : error instanceof Error
          ? error.message
          : "Campus AI couldn't answer right now. Please try again.";

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: errorMessage,
          retryQuestion: question,
        },
      ]);
    } finally {
      requestInFlightRef.current = false;
      setIsTyping(false);
    }
  };


  // =========================================================
  // ENTER KEY
  // =========================================================

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };


  // =========================================================
  // SUGGESTIONS
  // =========================================================

  const suggestions = [
    "Where is the Central Library?",
    "Where is the cafeteria?",
    "What facilities are available?",
  ];


  return (
    <main className="ai-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <section className="ai-header">

        <div className="ai-heading">

          <div className="ai-eyebrow">
            <span className="ai-eyebrow-dot"></span>
            CAMPUS ASSISTANT
          </div>

          <h1>
            Ask Campus <em>AI.</em>
          </h1>

          <p>
            Get answers using verified information
            from your campus directory.
          </p>

        </div>


        {/* VERIFIED STATUS */}

        <div className="ai-status">

          <span className="ai-status-dot"></span>

          <div>
            <strong>Verified data</strong>
            <small>Campus directory</small>
          </div>

        </div>

      </section>


      {/* =====================================================
          CHAT
          ===================================================== */}

      <section className="chat-container">

        {/* CHAT HEADER */}

        <div className="chat-topbar">

          <div className="chat-agent">

            <div className="chat-agent-icon">
              ✦
            </div>

            <div>
              <strong>Campus Assistant</strong>

              <span>
                Database-backed campus directory
              </span>
            </div>

          </div>

          {selectedBuildingId && (
            <div className="assistant-building-context" aria-live="polite">
              <div>
                <span>ASKING ABOUT</span>
                <strong>{selectedBuildingName || "Verified campus building"}</strong>
              </div>
              <button
                type="button"
                onClick={onClearBuildingContext}
                disabled={isTyping}
              >
                Clear
              </button>
            </div>
          )}


          <div className="chat-online">
            <span></span>
            Database mode
          </div>

        </div>


        {/* ===================================================
            MESSAGES
            =================================================== */}

        <div className="chat-messages">

          {messages.map((msg, index) => (

            <div
              key={index}
              className={`chat-message ${
                msg.role === "user"
                  ? "user-message"
                  : "ai-message"
              } ${msg.buildings?.length ? "has-building-results" : ""}`}
            >

              {/* AI AVATAR */}

              {msg.role === "ai" && (
                <div className="ai-avatar">
                  ✦
                </div>
              )}


              <div className="message-wrapper">

                {(!msg.buildings || msg.buildings.length === 0) && (
                  <div className="message-content">
                    {msg.text}
                  </div>
                )}

                {msg.buildings?.length > 0 && (
                  <div className="building-result-list">
                    {msg.buildings.map((building) => {
                      const hasCoordinates =
                        Number.isFinite(building.latitude) &&
                        building.latitude >= -90 &&
                        building.latitude <= 90 &&
                        Number.isFinite(building.longitude) &&
                        building.longitude >= -180 &&
                        building.longitude <= 180;

                      return (
                        <article className="building-result-card" key={building.id}>
                          <div className="building-result-heading">
                            <div>
                              <span className="building-result-type">{building.type}</span>
                              <h3>{building.name}</h3>
                            </div>
                            <span className="building-result-verified">Verified</span>
                          </div>

                          <dl className="building-result-details">
                            <div>
                              <dt>Description</dt>
                              <dd>{building.description || "Unavailable in verified records."}</dd>
                            </div>
                            <div>
                              <dt>Zone</dt>
                              <dd>{building.zone || "Unavailable in verified records."}</dd>
                            </div>
                            <div>
                              <dt>Coordinates</dt>
                              <dd>
                                {hasCoordinates
                                  ? `${building.latitude}, ${building.longitude}`
                                  : "Coordinates unavailable"}
                              </dd>
                            </div>
                          </dl>

                          {building.is_verified === true && building.id && (
                            <div className="building-map-action">
                            <button
                              type="button"
                              className="building-map-button"
                              disabled={!canViewOnMap?.(building)}
                              onClick={() => onViewOnMap?.(building)}
                            >
                              View on Map
                              <span aria-hidden="true">→</span>
                            </button>
                            {!canViewOnMap?.(building) && (
                              <small className="building-map-unavailable">
                                Map selection is unavailable because this record is not in the loaded verified location list.
                              </small>
                            )}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}


                {/* VERIFIED LABEL */}

                {msg.role === "ai" && msg.retryQuestion && (
                  <button
                    type="button"
                    className="suggestion-button"
                    onClick={() => sendMessage(msg.retryQuestion, true)}
                    disabled={isTyping}
                  >
                    Retry
                    <span className="suggestion-arrow">↻</span>
                  </button>
                )}

                {msg.role === "ai" && msg.verified && (
                  <span className="verified-label">
                    ✓ Verified campus information
                  </span>
                )}

              </div>

            </div>

          ))}


          {/* =================================================
              TYPING INDICATOR
              ================================================= */}

          {isTyping && (

            <div className="chat-message ai-message">

              <div className="ai-avatar">
                ✦
              </div>

              <div className="typing-bubble">

                <span></span>
                <span></span>
                <span></span>

              </div>

            </div>

          )}

          <div ref={messagesEndRef}></div>

        </div>


        {/* ===================================================
            INPUT
            =================================================== */}

        <div className="chat-input-area">

          <div className="chat-input-wrapper">

            <input
              type="text"
              placeholder="Ask about your campus..."
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              onKeyDown={handleKeyDown}
              disabled={isTyping}
            />


            <button
              className="send-button"
              onClick={() => sendMessage()}
              disabled={
                !message.trim() || isTyping
              }
              aria-label="Send message"
            >
              ↑
            </button>

          </div>

          <small className="input-hint">
            Press Enter to send
          </small>

        </div>

      </section>


      {/* =====================================================
          SUGGESTIONS
          ===================================================== */}

      <section className="ai-suggestions">

        <div className="suggestion-heading">

          <span className="suggestion-label">
            TRY ASKING
          </span>

          <span className="suggestion-line"></span>

        </div>


        <div className="suggestion-list">

          {suggestions.map((suggestion) => (

            <button
              key={suggestion}
              className="suggestion-button"
              onClick={() =>
                sendMessage(suggestion)
              }
              disabled={isTyping}
            >
              <span>{suggestion}</span>
              <span className="suggestion-arrow">
                →
              </span>
            </button>

          ))}

        </div>

      </section>


      {/* =====================================================
          TRUST NOTE
          ===================================================== */}

      <div className="ai-trust-note">

        <span>✦</span>

        <p>
          The Campus Assistant only answers using available
          verified campus information. It will not
          guess when information is unavailable.
        </p>

      </div>

    </main>
  );
}

export default AIAssistant;
