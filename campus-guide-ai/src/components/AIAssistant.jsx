import { useEffect, useRef, useState } from "react";
import campusData from "../data/campusData";

function AIAssistant() {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hi! I'm Campus AI. I can help you find verified information about Mangalayatan University.",
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
  // FIND CAMPUS INFORMATION
  // =========================================================

  const findCampusInformation = (question) => {
  const query = question.toLowerCase().trim();

  // Remove common question words
  const stopWords = [
    "where",
    "is",
    "the",
    "a",
    "an",
    "i",
    "need",
    "want",
    "can",
    "you",
    "tell",
    "me",
    "about",
    "please",
    "find",
    "show",
    "located",
    "location",
    "of",
    "for",
    "on",
    "in",
    "at",
  ];

  // Break question into useful words
  const words = query
    .replace(/[?.,!]/g, "")
    .split(/\s+/)
    .filter((word) => word && !stopWords.includes(word));

  // Score every campus location
  const scoredResults = campusData.map((location) => {
    const searchableText = [
      location.name,
      location.type,
      location.zone,
      location.description,
      ...(location.keywords || []),
    ]
      .join(" ")
      .toLowerCase();

    let score = 0;

    // Exact full phrase match
    if (searchableText.includes(query)) {
      score += 10;
    }

    // Match individual useful words
    words.forEach((word) => {
      if (searchableText.includes(word)) {
        score += 2;
      }
    });

    // Strong match for location name
    const nameWords = location.name.toLowerCase().split(/\s+/);

    words.forEach((word) => {
      if (nameWords.includes(word)) {
        score += 5;
      }
    });

    // Strong match for keywords
    (location.keywords || []).forEach((keyword) => {
      const keywordLower = keyword.toLowerCase();

      if (query.includes(keywordLower)) {
        score += 8;
      }

      words.forEach((word) => {
        if (keywordLower.includes(word)) {
          score += 3;
        }
      });
    });

    return {
      location,
      score,
    };
  });

  return scoredResults
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((result) => result.location);
};


  // =========================================================
  // GENERATE VERIFIED ANSWER
  // =========================================================

  const generateAnswer = (question) => {
    const results = findCampusInformation(question);

    if (results.length > 0) {
      const location = results[0];

      return {
        text: `${location.name} is listed as a ${location.type}. ${location.description}`,
        verified: true,
      };
    }

    return {
      text:
        "I don't have verified information about that yet. I don't want to guess and give you the wrong campus information.",
      verified: false,
    };
  };


  // =========================================================
  // SEND MESSAGE
  // =========================================================

  const sendMessage = (customMessage = null) => {
    const question = (
      customMessage !== null
        ? customMessage
        : message
    ).trim();

    if (!question || isTyping) return;

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: question,
      },
    ]);

    setMessage("");
    setIsTyping(true);

    // Simulate response delay
    setTimeout(() => {
      const answer = generateAnswer(question);

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: answer.text,
          verified: answer.verified,
        },
      ]);

      setIsTyping(false);
    }, 500);
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
              <strong>Campus AI</strong>

              <span>
                Verified campus assistant
              </span>
            </div>

          </div>


          <div className="chat-online">
            <span></span>
            Online
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
              }`}
            >

              {/* AI AVATAR */}

              {msg.role === "ai" && (
                <div className="ai-avatar">
                  ✦
                </div>
              )}


              <div className="message-wrapper">

                <div className="message-content">
                  {msg.text}
                </div>


                {/* VERIFIED LABEL */}

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
          Campus AI only answers using available
          verified campus information. It will not
          guess when information is unavailable.
        </p>

      </div>

    </main>
  );
}

export default AIAssistant;