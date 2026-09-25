import { useState } from 'react'
import './OpenTrackChatbot.css'

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22 2 11 13" />
      <path d="m22 2-7 20-4-9-9-4Z" />
    </svg>
  )
}

export default function OpenTrackChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [isOnline, setIsOnline] = useState(true)

  const sendMessage = () => {
    if (!message.trim()) return
    setMessage('')
  }

  return (
    <>
      {isOpen && (
        <div className="op-chatbot-window">
          <div className="op-chatbot-header">
            <div className="op-chatbot-identity">
              <div className="op-chatbot-avatar">
                <img src="/chatbot-logo.png" alt="OpenTrack Bot" />
              </div>

              <div>
                <h2>OpenTrack Bot</h2>
                <button
                  type="button"
                  className="op-chatbot-status"
                  onClick={() => setIsOnline((online) => !online)}
                  aria-label={`Set chatbot ${isOnline ? 'offline' : 'online'}`}
                  title="Click to toggle status"
                >
                  <span
                    className={`op-status-dot ${isOnline ? 'online' : 'offline'}`}
                  />
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              className="op-chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chatbot"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="op-chatbot-messages">
            <div className="op-chatbot-welcome">
              <p>👋 Hey! I'm the OpenTrack assistant.</p>
              <p>
                Ask me about the project, GitHub, contributions, or technical
                questions.
              </p>
            </div>
          </div>

          <div className="op-chatbot-input-area">
            <div className="op-chatbot-input-row">
              <input
                type="text"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') sendMessage()
                }}
                placeholder="Ask something..."
                aria-label="Chat message"
              />
              <button
                type="button"
                onClick={sendMessage}
                className="op-chatbot-send"
                aria-label="Send message"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        className="op-chatbot-fab"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? 'Close OpenTrack chatbot' : 'Open OpenTrack chatbot'}
      >
        <img src="/chatbot-logo.png" alt="OpenTrack Chatbot" />
      </button>
    </>
  )
}
