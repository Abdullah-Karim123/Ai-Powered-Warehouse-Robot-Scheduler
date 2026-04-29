from warehouse_system.schedule import Scheduler
from warehouse_system.grid import Grid, CellType
from warehouse_system.robot import Robot
from warehouse_system.task import Task
from warehouse_system.enums import RobotType, Shift, TaskType

def simulate_basic_direct():
    grid = Grid(5, 5)
    tasks = [Task(1, TaskType.STANDARD, Shift.DAY, (1, 1), (3, 3))]
    robots = [Robot('R1', RobotType.STANDARD, Shift.DAY, current_position=(0, 0))]
    grid.set_cell(0, 0, CellType.ROBOT)
    grid.set_cell(1, 1, CellType.BOX)

    scheduler = Scheduler(grid, tasks, robots)

    assignments = scheduler.compute_global_optimal_schedule()
    scheduler.print_schedule(assignments)

def simulate_low_battery_charge_needed():
    grid = Grid(6, 6)
    grid.set_cell(0, 0, CellType.CHARGING_STATION)

    tasks = [Task('1', TaskType.FRAGILE, Shift.DAY, (2, 2), (3, 3))]
    robots = [Robot('R1', RobotType.FRAGILE, Shift.DAY, battery_level=3, current_position=(1, 1))]

    scheduler = Scheduler(grid, tasks, robots)
    assignments = scheduler.compute_global_optimal_schedule()
    scheduler.print_schedule(assignments)

def simulate_path_blocked():
    grid = Grid(5, 5)
    for i in range(5):
        grid.set_cell(2, i, CellType.OBSTACLE)  # vertical wall
    grid.set_cell(2, 2, CellType.EMPTY)

    tasks = [Task('1', TaskType.STANDARD, Shift.DAY, (3, 3), (6, 6))]
    robots = [Robot('R1', RobotType.STANDARD, Shift.DAY, current_position=(0, 0))]

    scheduler = Scheduler(grid, tasks, robots)
    assignments = scheduler.compute_global_optimal_schedule()
    scheduler.print_schedule(assignments)

def simulate_robot_competition():
    grid = Grid(7, 7)
    tasks = [Task('1', TaskType.STANDARD, Shift.DAY, (1, 1), (6, 6))]

    robots = [
        Robot('R1', RobotType.STANDARD, Shift.DAY, battery_level=100, current_position=(6, 6)),
        Robot('R2', RobotType.STANDARD, Shift.DAY, battery_level=100, current_position=(0, 0)),
    ]

    scheduler = Scheduler(grid, tasks, robots)
    assignments = scheduler.compute_global_optimal_schedule()
    scheduler.print_schedule(assignments)

def simulate_task_overload():
    grid = Grid(6, 6)

    tasks = [
        Task('1', TaskType.FRAGILE, Shift.DAY, (1, 1), (2, 2)),
        Task('2', TaskType.FRAGILE, Shift.DAY, (3, 3), (4, 4)),
        Task('3', TaskType.FRAGILE, Shift.DAY, (0, 5), (5, 0))
    ]

    robots = [
        Robot('R1', RobotType.FRAGILE, Shift.DAY, current_position=(0, 0)),
        Robot('R2', RobotType.FRAGILE, Shift.DAY, current_position=(5, 5))
    ]

    scheduler = Scheduler(grid, tasks, robots)
    assignments = scheduler.compute_global_optimal_schedule()
    scheduler.print_schedule(assignments)

def simulate_type_or_shift_mismatch():
    grid = Grid(5, 5)

    tasks = [Task('1', TaskType.HEAVY, Shift.NIGHT, (0, 0), (1, 1))]
    robots = [Robot('R1', RobotType.STANDARD, Shift.DAY, current_position=(0, 0))]

    scheduler = Scheduler(grid, tasks, robots)
    assignments = scheduler.compute_global_optimal_schedule()
    scheduler.print_schedule(assignments)

def test_deserialize():
    grid = Grid(5, 5)
    grid.set_cell(0, 0, CellType.OBSTACLE)
    serialized = grid.serialize()
    new_grid = Grid.deserialize(serialized)
    assert new_grid.get_cell(0, 0) == CellType.OBSTACLE

def run_all_tests():
    print("\n========== TEST: Basic Direct Assignment ==========")
    simulate_basic_direct()

    print("\n========== TEST: Low Battery Needs Charging ==========")
    simulate_low_battery_charge_needed()

    print("\n========== TEST: Path Blocked by Obstacles ==========")
    simulate_path_blocked()

    print("\n========== TEST: Robot Competition for Task ==========")
    simulate_robot_competition()

    print("\n========== TEST: Too Many Tasks for Robots ==========")
    simulate_task_overload()

    print("\n========== TEST: Type/Shift Incompatibility ==========")
    simulate_type_or_shift_mismatch()

    print("\n========== TEST: Serialization/Deserialization ==========")
    test_deserialize()

if __name__ == "__main__":
    run_all_tests()
