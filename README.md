# AI Warehouse Robot Scheduler & Simulator

A full-stack warehouse simulation that assigns pickup-and-delivery tasks to robots, plans grid routes, and visualizes the resulting schedules. The backend uses **Google OR-Tools CP-SAT** for task assignment and **A\*** search for pathfinding; the React frontend lets you build and run a warehouse scenario.

> This is an algorithmic planning and simulation project. It does not train a machine-learning model or connect to physical robots.

## Features

- Create and resize a warehouse grid.
- Mark cells as empty, obstacles, boxes, charging stations, ramps, or slopes.
- Add robots with an ID, robot type, shift, and starting position.
- Create pickup-and-delivery tasks with a type, shift, pickup, and drop-off location.
- Assign compatible tasks to robots while considering routes and estimated battery use.
- Show each assignment, planned paths, and estimated battery cost.
- Animate scheduled robot movement in the grid.

## Technology

- **Backend:** Python, FastAPI, Pydantic, Uvicorn, Google OR-Tools
- **Frontend:** React, TypeScript, Vite, Axios, Tailwind CSS

## Project structure

```text
.
├── backend/
│   ├── main.py                 # FastAPI endpoints
│   ├── simulate.py             # Command-line planning scenarios
│   ├── requirements.txt
│   └── warehouse_system/
│       ├── enums.py            # Robot, task, shift, and cell types
│       ├── grid.py             # Warehouse grid and serialization
│       ├── path_finder.py      # A* route planning
│       ├── robot.py
│       ├── schedule.py         # OR-Tools task assignment
│       ├── task.py
│       └── warehouse.py
└── frontend/
    ├── package.json
    └── src/
        ├── components/
        └── pages/warehouse.tsx
```

## Requirements

- Python 3.10 or newer recommended
- Node.js 18 or newer and npm

## Run locally

### 1. Start the backend

From the repository root:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment, then install the Python dependencies and start the API:

```bash
# macOS / Linux
source .venv/bin/activate

# Windows PowerShell
# .venv\Scripts\Activate.ps1

pip install -r requirements.txt
uvicorn main:app --reload
```

The API is available at `http://localhost:8000`. Interactive API documentation is at `http://localhost:8000/docs`.

### 2. Start the frontend

Open a second terminal from the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. The frontend currently sends API requests to `http://localhost:8000`, as configured in `frontend/src/lib/axios.ts`.

### Optional: run the command-line scenarios

With the backend virtual environment active:

```bash
cd backend
python simulate.py
```

## Using the simulator

1. Set the grid width and height, then select **Apply**. The backend's initial grid is 5 × 5; the interface supports resizing it from 1 to 50 cells in each direction.
2. Click a grid cell and choose a cell type. Choose **Robot** to enter a robot ID, type, and shift.
3. Select **Add Task**, then enter a task ID, type, shift, pickup, and drop-off coordinates.
4. Review the assignment and estimated battery cost in the task and robot panels. Use **Refresh Schedule** to recalculate, or **Run Schedule** to animate the planned routes.

Coordinates start at zero. Grid and backend positions are stored as `[row, column]` and displayed in that order. The task dialog labels its coordinate fields `X` and `Y`; check the displayed grid coordinates when entering locations.

## Robot and task compatibility

| Robot type | Tasks it can perform |
| --- | --- |
| General | Standard, heavy, and fragile |
| Standard | Standard |
| Fragile | Fragile |

A robot assigned to the `24/7` shift can take tasks from any shift. Day and night robots can take tasks with the matching shift.

## How scheduling works

1. **Route planning:** A\* searches the four neighboring cells (up, down, left, right). Obstacles are blocked. Empty cells and charging stations have a movement cost of 1, ramps cost 2, and slopes cost 3; movement costs are doubled while carrying a box.
2. **Assignment:** The scheduler builds feasible robot-and-task pairs based on type, shift, route availability, and battery constraints. OR-Tools selects assignments using an objective that rewards completed assignments and penalizes estimated battery use.
3. **Visualization:** The frontend displays the chosen robot, routes to pickup and drop-off, optional charging route, and estimated battery cost, then animates the route when run.

Each task can be assigned to at most one robot, and each robot can receive at most one task per schedule. A task can remain unassigned when no feasible compatible robot is available.

## API overview

The API uses `http://localhost:8000` as its base URL. The main endpoints are:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/init?w=5&h=5` | Create an empty warehouse grid; `w` and `h` are optional. |
| `POST` | `/api/cell` | Update a cell in the submitted warehouse state. |
| `POST` | `/api/robot` | Add or replace a robot in the submitted warehouse state. |
| `POST` | `/api/run` | Calculate and return a schedule for the submitted warehouse state. |

See `/docs` while the backend is running for request and response schemas.

## Current limitations

- Warehouse data is held in frontend memory; there is no database or save/load feature. Reloading the page starts a fresh scenario.
- The planner schedules at most one task per robot per run. It does not model time windows, traffic conflicts between moving robots, or real-world robot dynamics.
- Battery use is an estimate based on route length (one unit per path cell without a box and two units per path cell while carrying). It is separate from the ramp and slope movement costs. Charging behavior is simplified and should not be treated as an operational battery model.
- The backend is configured for local development, has no authentication, and allows requests from any origin through CORS. Add appropriate security and deployment configuration before exposing it publicly.

## License

No license file is included in the project yet.
