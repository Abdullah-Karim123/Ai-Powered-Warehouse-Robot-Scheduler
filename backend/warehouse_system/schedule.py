from ortools.sat.python import cp_model
from warehouse_system.grid import Grid
from warehouse_system.path_finder import PathFinder
from warehouse_system.task import Task
from warehouse_system.robot import Robot
from warehouse_system.enums import RobotType, TaskType, Shift, CellType

class Scheduler:
    def __init__(self, grid: Grid, tasks: list[Task], robots: list[Robot]):
        self.grid = grid
        self.tasks = tasks
        self.robots = robots
        self.task_locations = {task.task_id: {"pickup": task.pickup_location, "dropoff": task.dropoff_location} for task in tasks}

    @staticmethod
    def is_type_compatible(robot_type: RobotType, task_type: TaskType):
        if robot_type == RobotType.GENERAL:
            return task_type in [TaskType.FRAGILE, TaskType.HEAVY, TaskType.STANDARD]
        elif robot_type == RobotType.STANDARD:
            return task_type in [TaskType.STANDARD]
        elif robot_type == RobotType.FRAGILE:
            return task_type in [TaskType.FRAGILE]

    @staticmethod
    def is_shift_compatible(robot_shift: Shift, task_shift: Shift):
        return robot_shift == Shift.TWENTY_FOUR_SEVEN or robot_shift == task_shift

    def compute_global_optimal_schedule(self):
        model = cp_model.CpModel()

        pathfinder = PathFinder(self.grid)

        num_tasks = len(self.tasks)
        num_robots = len(self.robots)

        # decision vars: assignment[i][j] = 1 if task i assigned to robot j
        assignment = [
            [
                model.NewBoolVar(f"task_{i}_robot_{j}") if self.is_type_compatible(self.robots[j].robot_type, self.tasks[i].type) and
                self.is_shift_compatible(self.robots[j].shift, self.tasks[i].shift) else model.NewConstant(0)
                for j in range(num_robots)
            ] for i in range(num_tasks)
        ]

        # Constraint: Each task assigned to exactly one robot
        for i in range(num_tasks):
            model.Add(sum(assignment[i]) <= 1)

        # Constraint: Each robot assigned at most one task
        for j in range(num_robots):
            model.Add(sum(assignment[i][j] for i in range(num_tasks)) <= 1)

        # Precompute all path costs and paths
        cost_matrix = [[float('inf')] * num_robots for _ in range(num_tasks)]
        path_matrix = [[None] * num_robots for _ in range(num_tasks)]
        drop_matrix = [[None] * num_robots for _ in range(num_tasks)]
        charge_matrix = [[None] * num_robots for _ in range(num_tasks)]
        valid_pairs = set()
        
        charging_stations = self.grid.find_charging_stations()

        for i, task in enumerate(self.tasks):
            pickup = self.task_locations[task.task_id]['pickup']
            dropoff = self.task_locations[task.task_id]['dropoff']

            for j, robot in enumerate(self.robots):
                if not (self.is_type_compatible(robot.robot_type, task.type) and self.is_shift_compatible(robot.shift, task.shift)):
                    continue

                original_pos = robot.current_position
                original_battery_level = robot.battery_level

                self.grid.set_cell(original_pos[0], original_pos[1], CellType.EMPTY)
                robot.is_carrying_box = False
                path1 = pathfinder.find_path(robot, pickup)
                cost1 = pathfinder.compute_battery_cost(path1, False)

                robot.current_position = pickup
                robot.is_carrying_box = True
                path2 = pathfinder.find_path(robot, dropoff)
                cost2 = pathfinder.compute_battery_cost(path2, True)
                self.grid.set_cell(original_pos[0], original_pos[1], CellType.ROBOT)

                total_cost = cost1 + cost2
                print(robot.robot_id, task.task_id, total_cost, robot.battery_level)
                if total_cost <= robot.battery_level:
                    cost_matrix[i][j] = total_cost
                    path_matrix[i][j] = path1
                    drop_matrix[i][j] = path2
                    charge_matrix[i][j] = None
                    valid_pairs.add((i, j))
                else:
                    for station in charging_stations:
                        robot.is_carrying_box = False
                        robot.current_position = original_pos
                        path_to_charge = pathfinder.find_path(robot, station)
                        charge_cost = pathfinder.compute_battery_cost(path_to_charge, False)

                        if charge_cost <= original_battery_level:
                            robot.charge()
                            robot.current_position = station

                            robot.is_carrying_box = False
                            path1 = pathfinder.find_path(robot, pickup)
                            cost1 = pathfinder.compute_battery_cost(path1, False)

                            robot.current_position = pickup
                            robot.is_carrying_box = True
                            path2 = pathfinder.find_path(robot, dropoff)
                            cost2 = pathfinder.compute_battery_cost(path2, True)

                            total_cost = cost1 + cost2
                            if total_cost <= robot.battery_level:
                                cost_matrix[i][j] = total_cost
                                path_matrix[i][j] = path1
                                drop_matrix[i][j] = path2
                                charge_matrix[i][j] = path_to_charge
                                valid_pairs.add((i, j))
                            break

                robot.current_position = original_pos
                robot.battery_level = original_battery_level

        # Objective: minimize total battery cost
        total_cost_expr = []
        for i in range(num_tasks):
            for j in range(num_robots):
                if (i, j) in valid_pairs:
                    total_cost_expr.append(cost_matrix[i][j] * assignment[i][j])

        assigned = [
            assignment[i][j]
            for i in range(num_tasks)
            for j in range(num_robots)
            if (i, j) in valid_pairs
        ]

        battery_cost_expr = sum(total_cost_expr)

        # Prefer assigning tasks (weight = 10000), then minimize battery usage
        model.Maximize(sum(assigned) * 10000 - battery_cost_expr)

        # Solve
        solver = cp_model.CpSolver()
        status = solver.Solve(model)

        result = {}
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            for i, task in enumerate(self.tasks):
                for j, robot in enumerate(self.robots):
                    if (i, j) in valid_pairs and solver.Value(assignment[i][j]) == 1:
                        result[task.task_id] = {
                            'robot_id': robot.robot_id,
                            'estimated_battery_cost': cost_matrix[i][j],
                            'path_to_pickup': path_matrix[i][j],
                            'path_to_dropoff': drop_matrix[i][j],
                            'path_to_charge': charge_matrix[i][j]
                        }
        return result

    def serialize(self):
        return self.compute_global_optimal_schedule()

    @staticmethod
    def print_schedule(schedule):
        for task_id, info in schedule.items():
            print(f"\nTask {task_id} assigned to {info['robot_id']}")
            print(f"  Estimated Battery Cost: {info['estimated_battery_cost']}")
            print(f"  Path to Pickup: {info['path_to_pickup']}")
            print(f"  Path to Dropoff: {info['path_to_dropoff']}")
            if info['path_to_charge']:
                print(f"  Path to Charge: {info['path_to_charge']}")
