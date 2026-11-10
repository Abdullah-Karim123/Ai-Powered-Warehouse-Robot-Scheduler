# 🤖 Warehouse Robot Scheduler

An AI-powered warehouse simulation that assigns pickup-and-delivery tasks to a fleet of robots in an optimal way. Design a warehouse grid, place robots and tasks, and let the solver decide **which robot does which task**, **which route it takes**, and **whether it needs to recharge first**, then watch the robots animate through their routes.

Built as an AI Lab project using **A\* pathfinding** and **constraint programming (Google OR-Tools CP-SAT)**, with a **FastAPI** backend and a **React + TypeScript** frontend.

---

## ✨ Features

- **Interactive warehouse editor**: build a grid of any size and click a cell to change its type.
- **Multiple terrain types**: empty floor, obstacles, ramps, slopes, boxes and charging stations.
- **Heterogeneous robot fleet**: *General*, *Standard* and *Fragile* robots, each with its own shift (day / night / 24/7) and battery level.
- **Typed tasks**: *Standard*, *Heavy* and *Fragile* pickup → dropoff tasks with shift requirements.
- **Optimal task assignment**: a CP-SAT model maximizes the number of tasks completed, then minimizes total battery use.
- **Battery-aware planning**: if a robot can't finish a task on its current charge, the planner routes it through a charging station first.
- **Animated execution**: robots move along the computed paths, pick up boxes, drop them off, and recharge.
- **Light / dark theme** and toast notifications for validation errors.

---

## 🧠 How It Works

### 1. Grid and terrain
The warehouse is a 2D grid. Each cell is one of:

| Cell | Traversable | Move cost |
|---|---|---|
| `empty` | ✅ | 1 |
| `ramp` | ✅ | 2 |
| `slope` | ✅ | 3 |
| `charging_station` | ✅ | 1 |
| `box` | Only as a pickup goal | n/a |
| `obstacle` | ❌ | n/a |
| `robot` | Marks a robot's position | n/a |

Movement is 4-directional (up, down, left, right).

### 2. Pathfinding: A\*
`path_finder.py` implements **A\*** with a **Manhattan-distance heuristic**. Tile cost depends on terrain and **doubles while the robot is carrying a box**. Boxes act as walls unless they are the goal.

### 3. Scheduling: OR-Tools CP-SAT
`schedule.py` formulates assignment as a constraint-satisfaction / optimization problem:

- **Decision variable:** `assignment[task][robot]` is 1 if the task goes to that robot.
- **Compatibility constraints**
  - *General* robots can do any task type; *Standard* robots only standard tasks; *Fragile* robots only fragile tasks.
  - A robot can take a task if it is on a `24/7` shift or its shift matches the task's shift.
- **Capacity constraints:** each task goes to at most one robot, and each robot takes at most one task per run.
- **Battery feasibility:** for every compatible robot/task pair, A\* computes the path *robot → pickup* and *pickup → dropoff*. If the total battery cost exceeds the charge, the planner tries a detour via a charging station (recharge to 100%, then continue). Pairs that are still infeasible are excluded.
- **Objective:** `maximize (tasks assigned × 10000) − total battery cost`. Assigning as many tasks as possible always comes first, and battery use is the tie-breaker.

The result for each task includes the chosen robot, estimated battery cost, and the paths to charge (optional), pickup and dropoff.

---

## 🏗️ Architecture

```
┌──────────────────────┐   REST / JSON   ┌───────────────────────────┐
│  React + TypeScript  │ ◄─────────────► │  FastAPI backend          │
│  (Vite, Tailwind,    │                 │  ├─ Warehouse / Grid      │
│   shadcn/ui)         │                 │  ├─ A* PathFinder         │
│  grid editor + anim. │                 │  └─ CP-SAT Scheduler      │
└──────────────────────┘                 └───────────────────────────┘
```

The backend is **stateless**: the frontend sends the full warehouse state with every request and receives the updated state back.

---

## 📁 Project Structure

```
Ai-Lab-Project/
├── backend/
│   ├── main.py                  # FastAPI app and API routes
│   ├── simulate.py              # Scenario scripts for the scheduler
│   ├── api_test.py              # End-to-end API test script
│   ├── requirements.txt
│   └── warehouse_system/
│       ├── enums.py             # TaskType, RobotType, Shift, CellType
│       ├── grid.py              # Grid model and serialization
│       ├── robot.py             # Robot model (battery, position, type)
│       ├── task.py              # Task model (pickup, dropoff, type, shift)
│       ├── warehouse.py         # Warehouse = grid + robots + tasks
│       ├── path_finder.py       # A* pathfinding and battery cost
│       └── schedule.py          # CP-SAT optimal scheduler
└── frontend/
    ├── src/
    │   ├── pages/warehouse.tsx          # Main page: state, scheduling, animation
    │   ├── components/                  # Grid, menus, theme, shadcn/ui components
    │   └── lib/axios.ts                 # API client (http://localhost:8000)
    ├── package.json
    └── vite.config.ts
```

---

## 🛠️ Tech Stack

**Backend:** Python, FastAPI, Uvicorn, Pydantic, Google OR-Tools (CP-SAT)
**Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui (Radix UI), Framer Motion, Axios, Sonner

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/Ai-Lab-Project.git
cd Ai-Lab-Project
```

### 2. Run the backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
The API is now at `http://localhost:8000` (interactive docs at `/docs`).

### 3. Run the frontend
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open the URL Vite prints (usually `http://localhost:5173`).

> The frontend expects the backend at `http://localhost:8000` (set in `frontend/src/lib/axios.ts`).

---

## 🎮 Usage

1. **Set the grid size** (width / height) and apply it.
2. **Edit cells**: click a cell to make it an obstacle, box, ramp, slope, charging station or empty.
3. **Add robots**: pick a type, shift and position. Robots appear in the left panel with their battery level.
4. **Add tasks**: choose a type, shift, pickup and dropoff location.
5. Click **Refresh Schedule** to compute the optimal assignment.
6. Click **Run Schedule** to animate the robots executing their tasks.

---

## 🔌 API Reference

All endpoints exchange the full warehouse state (`grid`, `robots`, `tasks`).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/init?w=5&h=5` | Create an empty warehouse of the given size |
| `POST` | `/api/robot` | Add one or more robots (`robots_params`) |
| `POST` | `/api/cell` | Change a cell's type (`cell_params`) |
| `POST` | `/api/run` | Run the scheduler and return assignments and paths |

**Example: run the scheduler**
```json
POST /api/run
{
  "warehouse": {
    "grid":   { "width": 5, "height": 5, "grid": [["empty", "..."]] },
    "robots": [{ "robot_id": "R1", "robot_type": "fragile", "shift": "day", "current_position": [0, 0] }],
    "tasks":  [{ "task_id": "1", "type": "fragile", "shift": "day",
                 "pickup_location": [1, 1], "dropoff_location": [3, 3] }]
  }
}
```

**Response**
```json
{
  "warehouse": { "...": "..." },
  "scheduler": {
    "1": {
      "robot_id": "R1",
      "estimated_battery_cost": 12,
      "path_to_pickup": [[0,0],[0,1],[1,1]],
      "path_to_dropoff": [[1,1],[2,1],[3,1],[3,2],[3,3]],
      "path_to_charge": null
    }
  }
}
```

---

## 🧪 Testing and Simulation

Scenario scripts live in `backend/simulate.py` and cover:

- Basic direct assignment
- Low battery requiring a charging-station detour
- Blocked paths
- Two robots competing for one task
- More tasks than robots
- Task type / shift incompatibility
- Grid serialization round-trip

```bash
cd backend
python simulate.py
```

With the server running, the end-to-end API check is:
```bash
python api_test.py
```

---

## 👤 Author

**Abdullah Karim**
