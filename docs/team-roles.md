# Team Roles

## App Team (Server + WebXR Client)

**Owns:** All code — the web server, the Babylon.js WebXR viewer, and deployment.

**Responsibilities:**
- Build the Babylon.js client that loads tour YAML and renders 360° scenes
- Implement the in-VR location picker menu
- Set up and maintain the web server that serves the app and media
- Define and document the YAML schema (in collaboration with Tour Design)
- Ensure the app works on Meta Quest browser, desktop, and mobile

**Key deliverables:** Working web app, deployed server, YAML schema spec.

---

## Tour Design Team (UX/UI + YAML Authoring)

**Owns:** The user experience — what it feels like to take a tour — and all tour definition files.

**Responsibilities:**
- Define UX requirements: how tours flow, what info appears at each stop, navigation feel
- Translate UX decisions into UI requirements for the App Team
- Author and maintain tour YAML files
- Test tours end-to-end and file issues when the experience doesn't match intent
- Coordinate with Media Team on what assets are needed per tour stop

**Key deliverables:** UX requirements doc, tour YAML files, QA feedback.

---

## Media Team (Content Capture + Production)

**Owns:** All 360° photos, videos, audio narration, and visual assets (thumbnails, overlays).

**Responsibilities:**
- Plan and execute 360° photo/video shoots on campus
- Process and optimize media for web delivery (resolution, file size, format)
- Follow the agreed asset naming convention and folder structure
- Provide thumbnails and any overlay images needed by tour definitions
- Maintain a shot list coordinated with Tour Design's tour plans

**Key deliverables:** Production-ready 360° media assets, asset inventory.

---

## Shared Contract

All three teams depend on two agreements made before parallel work begins:

1. **YAML schema** — the structure of tour definition files (jointly owned by App + Tour Design)
2. **Asset naming convention** — how media files are named and organized (jointly owned by Media + Tour Design)

These are documented in `schema/` and serve as the API between teams.
