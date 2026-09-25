# OpenTrack Chatbot PR Files

These files are intended to be copied into the existing repository after forking.

## Files included

- `frontend/src/App.tsx` — existing app with the chatbot mounted.
- `frontend/src/components/OpenTrackChatbot.tsx` — frontend-only chatbot component.
- `frontend/src/components/OpenTrackChatbot.css` — chatbot styling.
- `frontend/public/chatbot-logo.png` — chatbot logo asset.

## No dependency changes required

The component uses React and inline SVG icons, so no new npm package is required.

## Copy

Extract this ZIP at the repository root and replace/add the files at the same paths.
Do not copy `node_modules` or replace the repository's `package.json`.

## Feature

The chatbot has an Online/Offline status toggle represented by a green dot for Online and a yellow dot for Offline. The chatbot remains frontend-only.
