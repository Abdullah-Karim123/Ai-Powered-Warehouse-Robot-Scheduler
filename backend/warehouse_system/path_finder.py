from warehouse_system.grid import Grid, CellType
from warehouse_system.robot import Robot
import heapq

base_costs = {
    CellType.EMPTY: 1,
    CellType.RAMP: 2,
    CellType.SLOPE: 3,
    CellType.CHARGING_STATION: 1,
}

class PathFinder:
    def __init__(self, grid: Grid):
        self.grid = grid
    
    def heuristic(self, a: tuple, b: tuple) -> float:
        """Manhattan distance heuristic"""
        return abs(a[0] - b[0]) + abs(a[1] - b[1])
    
    def get_tile_cost(self, tile_type: CellType, carrying_box: bool) -> float:
        cost = base_costs.get(tile_type, float('inf'))
        if carrying_box:
            cost *= 2
        return cost

    def find_path(self, robot: Robot, goal: tuple) -> list:
        """A* search algorithm to find the shortest path considering movement rules."""
        pq = []
        heapq.heappush(pq, (self.heuristic(robot.current_position, goal), robot.current_position))

        g_score = {robot.current_position: 0}
        parent = {robot.current_position: None}

        while pq:
            _, node = heapq.heappop(pq)

            if node == goal:
                path = []
                while node is not None:
                    path.append(node)
                    node = parent[node]
                return list(reversed(path))

            for r, c, tile_type in self.grid.get_neighbors(node[0], node[1]):
                if tile_type == CellType.OBSTACLE:
                    continue
                if tile_type in [CellType.BOX] and (r, c) != goal:
                    continue

                new_g = g_score[node] + self.get_tile_cost(tile_type, robot.is_carrying_box)

                if (r, c) not in g_score or new_g < g_score[(r, c)]:
                    g_score[(r, c)] = new_g
                    f_score = new_g + self.heuristic((r, c), goal)
                    heapq.heappush(pq, (f_score, (r, c)))
                    parent[(r, c)] = node

        return None

    def compute_battery_cost(self, path: list, carrying: bool) -> int:
        if not path:
            return float('inf')
        return int(len(path) * (2 if carrying else 1))
