from warehouse_system.grid import Grid
from warehouse_system.robot import Robot
from warehouse_system.task import Task
from warehouse_system.schedule import Scheduler
from warehouse_system.enums import CellType

class Warehouse:
  def __init__(self, grid: Grid, robots: list[Robot] = [], tasks: list[Task] = []):
    self.grid = grid
    self.__robots = robots
    self.__tasks = tasks

  @classmethod
  def deserialize(cls, data: dict):
    if "grid" not in data:
      raise KeyError("'grid' not in data")
    if "robots" not in data:
      raise KeyError("'robots' not in data")
    if "tasks" not in data:
      raise KeyError("'tasks' not in data")
    return cls(
      Grid.deserialize(data["grid"]),
      list(map(Robot.deserialize, data["robots"])),
      list(map(Task.deserialize, data["tasks"]))
    )

  def add_robot(self, robot: Robot):
    self.__robots.append(robot)
    self.grid.set_cell(robot.current_position[0], robot.current_position[1], CellType.ROBOT)

  def add_task(self, task: Task):
    self.__tasks.append(task)
    self.grid.set_cell(task.pickup_location[0], task.pickup_location[1], CellType.BOX)

  def remove_robot_by_id(self, robot_id: str):
    for i, r in enumerate(self.__robots):
      if r.robot_id == robot_id:
        self.__robots.pop(i)
        self.grid.set_cell(r.current_position[0], r.current_position[1], CellType.EMPTY)
        break
    
  def remove_robot_at(self, row: int, col: int):
    for i, r in enumerate(self.__robots):
      if r.current_position[0] == row and r.current_position[1] == col:
        self.__robots.pop(i)
        self.grid.set_cell(row, col, CellType.EMPTY)
        break

  def serialize(self):
    return {
      "grid": self.grid.serialize(),
      "robots": list(map(Robot.serialize, self.__robots)),
      "tasks": list(map(Task.serialize, self.__tasks))
    }
  
  def get_scheduler(self):
    return Scheduler(self.grid, self.__tasks, self.__robots)
