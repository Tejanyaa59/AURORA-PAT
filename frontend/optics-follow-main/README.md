# FSOC Vision

You are a senior frontend engineer specializing in React, TypeScript,

real-time dashboards, scientific simulations, computer vision interfaces,

and engineering visualization.

Build the complete frontend for the project:

"AI-Based Virtual Camera Tracking System for Coarse Alignment of Mobile

Free Space Optical Communication (FSOC) Terminals"

IMPORTANT:

This frontend will connect to a separate Python FastAPI backend.

DO NOT implement the core simulation, computer vision, Kalman filter,

PID controller, target detection, or tracking algorithms in the frontend.

The backend will be responsible for all simulation and tracking logic.

The frontend is responsible for visualization, configuration, controls,

real-time data display, graphs, video display, and user interaction.

========================================================

1. TECHNOLOGY

========================================================

Use:

- React

- TypeScript

- Tailwind CSS

- Modern component architecture

- Responsive web design

- Recharts or another lightweight charting library

- WebSocket API

- REST API using fetch or Axios

Keep the code modular and production-quality.

Do NOT add unnecessary dependencies.

========================================================

2. BACKEND CONNECTION

========================================================

The backend will be:

Python FastAPI

Development API:

http://localhost:8000

REST API base URL:

http://localhost:8000/api

WebSocket:

ws://localhost:8000/ws/tracking

DO NOT hardcode these URLs throughout the application.

Create a central API configuration.

Use:

VITE_API_BASE_URL

Example:

VITE_API_BASE_URL=http://localhost:8000

WebSocket URL should be derived from the API URL where possible.

Make it easy to change the backend URL later.

========================================================

3. IMPORTANT BACKEND API CONTRACT

========================================================

The frontend must support these REST endpoints:

GET

/api/health

POST

/api/simulation/configure

POST

/api/simulation/start

POST

/api/simulation/pause

POST

/api/simulation/resume

POST

/api/simulation/stop

POST

/api/simulation/reset

GET

/api/simulation/status

GET

/api/metrics

GET

/api/report

POST

/api/video/upload

GET

/api/video/status

WebSocket:

/ws/tracking

Do not invent different endpoint names.

========================================================

4. APPLICATION STRUCTURE

========================================================

Create the application with these major sections:

1. Dashboard

2. Simulation

3. Target Configuration

4. Environment & Disturbances

5. Camera / Pan-Tilt

6. Real-Time Tracking

7. Performance Analytics

8. Video Benchmarking

9. Reports

10. Settings

Use a clean sidebar navigation.

The main dashboard should provide a quick overview of the current

simulation.

========================================================

5. VISUAL DESIGN

========================================================

Design should look like a professional aerospace / optical

communication engineering simulator.

Avoid:

- childish graphics

- excessive gradients

- excessive animations

- gaming-style UI

- unnecessary decorative elements

- generic AI-looking dashboards

Use a professional technical interface.

Preferred style:

- dark engineering dashboard

- high readability

- clear cards

- thin borders

- subtle shadows

- clean charts

- technical labels

- compact controls

- clear status indicators

The interface should look appropriate for an SIH judge demonstration.

========================================================

6. MAIN DASHBOARD

========================================================

Create a main dashboard containing:

---

TOP BAR

---

Project name:

FSOC Virtual Camera Tracking System

Display:

Backend Status

Simulation Status

WebSocket Status

FPS

Backend status:

CONNECTED

DISCONNECTED

ERROR

Simulation status:

IDLE

INITIALIZING

SEARCHING

ACQUIRING

TRACKING

TARGET LOST

RE-ACQUIRING

TRACKING LOCKED

PAUSED

STOPPED

---

MAIN CAMERA VIEW

---

Create a large virtual camera viewport.

Display:

- simulated camera frame

- target/beacon

- camera center crosshair

- target position

- predicted target position

- tracking error

- FOV boundaries

- optional field of uncertainty visualization

The camera viewport should update in real time.

If the backend sends JPEG/base64 frame data,

display it appropriately.

If no frame is available yet, show:

"Waiting for camera stream..."

Do not generate fake tracking data.

========================================================

7. TARGET VISUALIZATION

========================================================

When target information is received:

Display:

Target X

Target Y

Predicted X

Predicted Y

Target ID

Detection confidence

Target detected status

Visually show:

Target:

●

Camera center:

-

Predicted target:

◇

Use a legend.

If multiple targets are supported, display each target distinctly.

The designated target should be visually highlighted.

========================================================

8. TRACKING STATUS

========================================================

Create a large tracking-status component.

Possible states:

INITIALIZING

SEARCHING

ACQUIRING

TRACKING

TARGET LOST

RE-ACQUIRING

TRACKING LOCKED

Each state must have a clear visual indicator.

Example:

TRACKING LOCKED

Target acquired and tracking within limits.

TARGET LOST

Prediction and reacquisition active.

Do not create fake status transitions.

Only display status received from the backend.

========================================================

9. PAN / TILT DISPLAY

========================================================

Create a professional pan/tilt visualization.

Show:

PAN

Current pan angle

TILT

Current tilt angle

Also display:

Pan speed

Tilt speed

Create a simple graphical indicator showing camera orientation.

For example:

             TILT

               ↑

               │

       ← PAN ─ ● ─ PAN →

               │

               ↓

Do not implement pan/tilt mathematics here.

Display the values provided by FastAPI.

========================================================

10. TRACKING ERROR

========================================================

Display:

Error X

Error Y

Error Magnitude

Example:

Error X: +2 px

Error Y: -2 px

Magnitude: 2.82 px

Create a live tracking-error graph.

Graph:

X axis:

Time / Frame

Y axis:

Error in pixels

Show:

- X error

- Y error

- magnitude if useful

Use data received from the backend.

========================================================

11. PERFORMANCE METRICS

========================================================

Display real-time:

FPS

Acquisition Time

Average Error

Maximum Error

RMS Error

Target Loss %

Reacquisition Time

Tracking Success %

Detection Confidence

Use metric cards.

Example:

FPS

29.4

AVG ERROR

5.2 px

TARGET LOSS

2.1%

ACQUISITION

1.2 sec

REACQUISITION

0.7 sec

========================================================

12. SIMULATION CONFIGURATION

========================================================

Create a Simulation Configuration panel.

Controls:

Screen Width

Screen Height

Camera Width

Camera Height

Horizontal FOV

Vertical FOV

Beacon Size

Target Speed

Trajectory

Trajectory options:

Straight

Circular

Figure-8

Random

Use sliders/number inputs where appropriate.

Provide sensible limits.

Do not perform simulation calculations in the frontend.

When user clicks:

"Apply Configuration"

send:

POST /api/simulation/configure

========================================================

13. SIMULATION CONTROLS

========================================================

Create:

START

PAUSE

RESUME

STOP

RESET

buttons.

Connect them to:

POST /api/simulation/start

POST /api/simulation/pause

POST /api/simulation/resume

POST /api/simulation/stop

POST /api/simulation/reset

Show loading states.

Prevent invalid actions.

Example:

Do not allow RESUME when simulation is not paused.

Do not invent state locally if backend status is available.

Backend is the source of truth.

========================================================

14. DISTURBANCE CONFIGURATION

========================================================

Create a disturbance configuration panel.

Controls:

Gaussian Noise

Salt & Pepper Noise

Motion Blur

Brightness Variation

Contrast Variation

Low Light

Haze / Fog

Rain

Camera Jitter

Platform Motion

Each should have:

Enable / Disable

and where appropriate:

Intensity slider

Do not implement the disturbance algorithms in the frontend.

Send configuration values to FastAPI.

========================================================

15. CAMERA CONFIGURATION

========================================================

Create controls for:

Camera Resolution

Horizontal FOV

Vertical FOV

Maximum Pan Speed

Maximum Tilt Speed

Camera Jitter X

Camera Jitter Y

Show current values.

========================================================

16. PID CONFIGURATION

========================================================

Create a technical PID configuration panel.

Fields:

Kp

Ki

Kd

Separate sections:

PAN CONTROLLER

Kp

Ki

Kd

TILT CONTROLLER

Kp

Ki

Kd

Provide:

Apply PID Configuration

The frontend should only send values.

The PID calculation happens in FastAPI.

========================================================

17. MULTIPLE TARGETS

========================================================

Create an optional multiple-target configuration.

Allow:

Number of targets

Designated target ID

Display:

Target 1

Target 2

Target 3

etc.

The frontend must not decide which target is tracked.

The backend determines the designated target.

========================================================

18. REAL-TIME WEBSOCKET

========================================================

Connect to:

ws://localhost:8000/ws/tracking

Create a reusable WebSocket service.

Handle:

CONNECTING

CONNECTED

DISCONNECTED

RECONNECTING

ERROR

Automatically attempt reconnection when appropriate.

Do not create infinite aggressive reconnect loops.

The backend sends data similar to:

{

    "frame_id": 125,

    "timestamp": 1234567890,

    "status": "TRACKING",

    "target_detected": true,

    "target": {

        "id": 1,

        "x": 322,

        "y": 238,

        "predicted_x": 323,

        "predicted_y": 237

    },

    "camera_center": {

        "x": 320,

        "y": 240

    },

    "error": {

        "x": 2,

        "y": -2,

        "magnitude": 2.82

    },

    "camera": {

        "pan": 1.2,

        "tilt": -0.3

    },

    "performance": {

        "fps": 28.5,

        "average_error": 5.2,

        "maximum_error": 9.1,

        "target_loss_percentage": 2.1,

        "acquisition_time": 1.2,

        "reacquisition_time": 0.7

    }

}

Create TypeScript interfaces for this data.

Do not use "any" unless absolutely necessary.

========================================================

19. API SERVICE ARCHITECTURE

========================================================

Create a dedicated API layer.

Example:

src/

├── api/

│ ├── client.ts

│ ├── simulationApi.ts

│ ├── videoApi.ts

│ ├── metricsApi.ts

│ └── websocket.ts

│

├── components/

├── pages/

├── hooks/

├── types/

└── utils/

Do not put API calls directly into random UI components.

========================================================

20. TYPESCRIPT TYPES

========================================================

Create proper types/interfaces for:

SimulationConfig

SimulationStatus

TrackingState

Target

CameraState

TrackingError

PerformanceMetrics

TrackingUpdate

PIDConfig

DisturbanceConfig

VideoStatus

Report

Keep the types synchronized with the FastAPI API contract.

========================================================

21. VIDEO BENCHMARKING

========================================================

Create a Video Benchmarking page.

Allow user to:

1. Select MP4 file

2. Upload it

3. Start processing

4. View processing status

5. View tracking results

6. View performance metrics

Use:

POST /api/video/upload

Then:

GET /api/video/status

Show:

Video Name

FPS

Frames Processed

Processing Status

Detection Rate

Tracking Success

Average Error

Target Loss

Reacquisition Time

Do not process the video in the browser.

The FastAPI backend processes the video.

========================================================

22. ANALYTICS PAGE

========================================================

Create charts for:

Tracking Error vs Time

FPS vs Time

Pan Angle vs Time

Tilt Angle vs Time

Detection Confidence vs Time

Target Loss Events

Acquisition/Reacquisition Time

Charts must update from backend data.

Do not fabricate data.

If no data exists:

"No data available yet."

========================================================

23. REPORT PAGE

========================================================

Create a professional experiment report page.

Display:

Experiment ID

Date/Time

Simulation Configuration

Target Configuration

Disturbances

PID Parameters

Tracking Algorithm

Results:

Acquisition Time

Average Error

Maximum Error

RMS Error

Target Loss %

Reacquisition Time

FPS

Tracking Success %

Add:

Refresh Report

using:

GET /api/report

Provide a clean report-style layout suitable for demonstration.

========================================================

24. CONNECTION STATUS

========================================================

Always clearly show whether backend is connected.

Use:

GET /api/health

Example:

● BACKEND CONNECTED

or

● BACKEND OFFLINE

WebSocket:

● LIVE STREAM CONNECTED

or

● STREAM DISCONNECTED

Never show "Connected" unless the backend actually responds.

========================================================

25. ERROR HANDLING

========================================================

Handle:

Backend unavailable

Network timeout

REST request failure

WebSocket failure

Invalid configuration

Video upload failure

Simulation failure

Show useful human-readable messages.

Example:

"Backend unavailable. Start the FastAPI server on port 8000."

Do not show raw JavaScript errors to the user.

========================================================

26. LOADING STATES

========================================================

Add proper loading states for:

Starting simulation

Stopping simulation

Applying configuration

Uploading video

Loading report

Connecting WebSocket

Do not freeze the interface.

========================================================

27. RESPONSIVE DESIGN

========================================================

The dashboard should work on:

Desktop

Laptop

Tablet

Primary target:

Desktop / laptop demonstration.

The camera visualization should remain large and readable.

========================================================

28. NO FAKE DATA

========================================================

IMPORTANT:

Do NOT create fake tracking data to make the dashboard appear functional.

If FastAPI is disconnected:

Show:

"Backend disconnected"

If the simulation is stopped:

Show:

"Simulation stopped"

If no target is detected:

Show:

"Target not detected"

The frontend must reflect actual backend state.

========================================================

29. FRONTEND FILE STRUCTURE

========================================================

Create a clean structure similar to:

src/

│

├── api/

│ ├── client.ts

│ ├── simulationApi.ts

│ ├── videoApi.ts

│ ├── metricsApi.ts

│ └── websocket.ts

│

├── components/

│ ├── layout/

│ ├── dashboard/

│ ├── camera/

│ ├── tracking/

│ ├── simulation/

│ ├── controls/

│ ├── metrics/

│ ├── charts/

│ └── video/

│

├── pages/

│ ├── Dashboard.tsx

│ ├── Simulation.tsx

│ ├── Analytics.tsx

│ ├── VideoBenchmark.tsx

│ ├── Reports.tsx

│ └── Settings.tsx

│

├── hooks/

│ ├── useSimulation.ts

│ ├── useTrackingWebSocket.ts

│ └── useBackendStatus.ts

│

├── types/

│ ├── simulation.ts

│ ├── tracking.ts

│ ├── metrics.ts

│ └── video.ts

│

├── utils/

│ └── apiConfig.ts

│

└── App.tsx

Use the project's existing Lovable structure where appropriate.

Do not unnecessarily rewrite working code.

========================================================

30. ENVIRONMENT VARIABLE

========================================================

Create:

.env.example

with:

VITE_API_BASE_URL=http://localhost:8000

Do not put secret keys into frontend code.

========================================================

31. BACKEND INTEGRATION TESTING

========================================================

The frontend should be designed to work with this FastAPI backend:

http://localhost:8000

Swagger:

http://localhost:8000/docs

WebSocket:

ws://localhost:8000/ws/tracking

When backend is available, test:

1. Health check

2. Configure simulation

3. Start

4. Pause

5. Resume

6. Stop

7. Reset

8. WebSocket connection

9. Metrics

10. Report

========================================================

32. IMPORTANT ARCHITECTURE RULE

========================================================

The backend is the source of truth.

Frontend:

USER

↓

Lovable UI

↓

REST API

↓

FastAPI

↓

FSOC ENGINE

↓

WebSocket

↓

Lovable UI

Do not duplicate backend logic in React.

========================================================

33. USER EXPERIENCE

========================================================

The main demonstration flow should be:

1. Open Dashboard

2. Check backend connection

3. Configure simulation

4. Select trajectory

5. Configure disturbances

6. Configure PID

7. Start simulation

8. Camera begins searching

9. Beacon detected

10. Acquisition

11. Tracking

12. Pan/Tilt follows target

13. Disturbance introduced

14. Target temporarily lost

15. Kalman prediction activates

16. Reacquisition

17. Tracking resumes

18. Metrics update

19. Stop simulation

20. View report

The UI should make this sequence visually obvious.

========================================================

34. SIH PRESENTATION QUALITY

========================================================

The interface must look like a real engineering prototype.

Important visual elements:

- Large camera viewport

- Target marker

- Camera center

- Tracking error

- Pan/tilt indicator

- Live FPS

- Tracking state

- Acquisition time

- Target loss

- Reacquisition

- Performance charts

A judge should understand the system within 10 seconds.

========================================================

35. CODE QUALITY

========================================================

Requirements:

- TypeScript

- Proper component separation

- Reusable components

- No unnecessary duplication

- No hardcoded API URLs

- No fake backend data

- No secret keys

- Clear error handling

- Good responsive design

- Clean naming

- Maintainable architecture

========================================================

36. FINAL DELIVERABLE

========================================================

Build the complete frontend.

Ensure:

npm install

and:

npm run dev

work correctly.

Also ensure:

npm run build

completes successfully.

Create:

.env.example

with the backend configuration.

The final frontend must be ready to connect to the separate FastAPI backend.

========================================================

37. VERY IMPORTANT

========================================================

Do NOT implement the Python backend inside Lovable.

Do NOT replace FastAPI with Supabase.

Do NOT move OpenCV, Kalman, PID or simulation logic into the frontend.

Do NOT create fake tracking data.

The backend is being developed separately using Python + FastAPI.

Your job is to build a professional React/TypeScript frontend that

connects to that backend using the API contract specified above.

Before finishing:

1. Check all pages.

2. Check all API calls.

3. Check WebSocket connection.

4. Check TypeScript errors.

5. Check responsive layout.

6. Run production build.

7. Fix any errors.

8. Verify that the frontend can work when FastAPI is running on localhost:8000.

Finally, provide:

- Complete file structure

- API integration summary

- Environment variable instructions

- Commands to run frontend

- Backend connection instructions

- Any remaining limitations

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://optics-follow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a54fdf38-06dc-42de-b530-38abff60dcb9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
