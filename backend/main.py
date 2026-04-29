from typing import Dict, List, Any, Optional
from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from warehouse_system.warehouse import Warehouse
from warehouse_system.grid import Grid, CellType
from warehouse_system.robot import Robot
from warehouse_system.enums import RobotType, Shift
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Cell_Params(BaseModel):
    position: list[int]
    cell_type: str

class Robot_Params(BaseModel):
    robot_id: str
    robot_type: str
    shift: str
    current_position: list[int]

class Task_Params(BaseModel):
    task_id: str
    task_type: str
    task_shift: str
    task_pickup_location: list[int]
    task_dropoff_location: list[int]

class WarehouseBody(BaseModel):
    grid: Dict[str, Any]
    robots: List[Dict[str, Any]] = []
    tasks: List[Dict[str, Any]] = []

class WarehouseRequest(BaseModel):
    warehouse: WarehouseBody
    robots_params: Optional[List[Robot_Params]] = None
    cell_params: Optional[Cell_Params] = None

@app.get("/api/init")
def init_grid(w: int = 5, h: int = 5):
    warehouse = Warehouse(Grid(w, h))
    return { "warehouse": warehouse.serialize() }

@app.post("/api/robot")
def add_robot(request: WarehouseRequest):
    try:
        warehouse = Warehouse.deserialize(request.warehouse.model_dump())
    except Exception as e:
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"error": str(e)})
    
    if not request.robots_params:
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"error": "No robots to add"})

    for robot_params in request.robots_params:
        x, y = robot_params.current_position
        if x < 0 or x >= warehouse.grid.width or y < 0 or y >= warehouse.grid.height:
            return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"error": f"Invalid position: {robot_params.current_position}"})
        if not RobotType.is_valid(robot_params.robot_type):
            return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"error": f"Invalid robot type: {robot_params.robot_type}"})
        if not Shift.is_valid(robot_params.shift):
            return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"error": f"Invalid shift: {robot_params.shift}"})
        if warehouse.grid.get_cell(x, y) != CellType.EMPTY:
            return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"cell_error": f"Robot already exists at position {robot_params.current_position}"})
        
        warehouse.remove_robot_by_id(robot_params.robot_id)
        robot = Robot(
            robot_params.robot_id,
            RobotType(robot_params.robot_type),
            Shift(robot_params.shift),
            current_position=tuple(robot_params.current_position)
        )
        warehouse.add_robot(robot)
    
    return { "warehouse": warehouse.serialize() }

@app.post("/api/cell")
def set_cell(request: WarehouseRequest):
    try:
        warehouse = Warehouse.deserialize(request.warehouse.model_dump())
    except Exception as e:
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"error": str(e)})
    
    if not request.cell_params:
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"error": "No cell to set"})
    
    if request.cell_params.cell_type == "robot":
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"error": "Cannot set robot cell type"})
    
    x, y = request.cell_params.position
    if x < 0 or x >= warehouse.grid.width or y < 0 or y >= warehouse.grid.height:
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"error": f"Invalid position: {request.cell_params.position}"})
    
    if warehouse.grid.get_cell(x, y) == CellType.ROBOT:
        warehouse.remove_robot_at(x, y)
    warehouse.grid.set_cell(x, y, CellType(request.cell_params.cell_type))
    
    return { "warehouse": warehouse.serialize() }

@app.post("/api/run")
def run_scheduler(request: WarehouseRequest):
    try:
        warehouse = Warehouse.deserialize(request.warehouse.model_dump())
    except Exception as e:
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"error": str(e)})

    return {
        "warehouse": warehouse.serialize(),
        "scheduler": warehouse.get_scheduler().serialize()
    }
