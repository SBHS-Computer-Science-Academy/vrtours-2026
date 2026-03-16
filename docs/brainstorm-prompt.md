# SBHS WebXR Campus Tour — Brainstorming Prompt

Build a WebXR 360° campus tour app for Santa Barbara High School.

**Stack:** Babylon.js WebXR client + lightweight web server for media hosting.

**Core experience:**
- User picks a tour, then navigates between 360° photo/video locations via a simple in-VR menu
- Tours are defined in YAML files (human-editable, no GUI editor needed)
- Works on Meta Quest browser and desktop/mobile fallback

**Tour YAML should define:**
- Tour metadata (name, description, thumbnail)
- Ordered list of locations, each with: name, media file reference (360 photo or video), optional hotspots/text overlays, and connections to other locations

**Server requirements:**
- Serve the web app and 360° media assets
- Minimal infrastructure — static file server is fine if it meets the need
- School-sustainable: low cost, no vendor lock-in, students can maintain it

**Phase 1 scope (this spec):** 360° still images with scene transitions and a location-picker menu. Video, AR, maps, and multiplayer are future phases.

**Team structure:** Three teams working in parallel, connected by a shared YAML schema and asset naming convention agreed on upfront:
- **App Team** — builds the server and Babylon.js WebXR client
- **Tour Design Team** — owns UX/UI requirements and authors tour definitions in YAML
- **Media Team** — captures and produces 360° photos, audio, and video assets

**Constraints:** This is a student-led CS academy project. Code should be clean, well-documented, and approachable for high school developers.
