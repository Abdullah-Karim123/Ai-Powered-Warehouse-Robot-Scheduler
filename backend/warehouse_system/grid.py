from warehouse_system.enums import CellType
from typing import List, Tuple

class Grid:
    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height
        self.grid = [[CellType.EMPTY for _ in range(width)] for _ in range(height)]
        self.adjacency_list = {}
        self.directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]

    def get_neighbors(self, row: int, col: int) -> List[Tuple[int, int, CellType]]:
        neighbors: List[Tuple[int, int, CellType]] = []
        for dr, dc in self.directions:
            nr, nc = row + dr, col + dc
            if 0 <= nr < self.height and 0 <= nc < self.width:
                neighbors.append((nr, nc, self.grid[nr][nc]))
        return neighbors
    
    def convert_to_adjacency_list(self):
        self.adjacency_list = {}
        for r in range(self.height):
            for c in range(self.width):
                if self.grid[r][c] not in [CellType.OBSTACLE]:
                    node = (r, c)
                    self.adjacency_list[node] = []
                    for dr, dc in self.directions:
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < self.height and 0 <= nc < self.width:
                            neighbor_type = self.grid[nr][nc]
                            if neighbor_type in [
                                CellType.EMPTY,
                                CellType.RAMP,
                                CellType.SLOPE,
                                CellType.CHARGING_STATION,
                                CellType.BOX
                            ]:
                                self.adjacency_list[node].append((nr, nc))
    
    def set_cell(self, row: int, col: int, cell_type: CellType):
        self.grid[row][col] = cell_type
    
    def get_cell(self, row: int, col: int) -> CellType:
        return self.grid[row][col]  
    
    def get_adjacency_list(self):
        return self.adjacency_list
    
    def find_charging_stations(self):
        charging_stations = []
        for r in range(self.height):
            for c in range(self.width):
                if self.grid[r][c] == CellType.CHARGING_STATION:
                    charging_stations.append((r, c))
        return charging_stations

    def serialize(self):
        return {
            "width": self.width,
            "height": self.height,
            "grid": [[cell.value for cell in row] for row in self.grid]
        }
    
    @classmethod
    def deserialize(cls, data: dict):
        gridobj = cls(
            data["width"] or 5,
            data["height"] or 5
        )
        if data["grid"] is not None:
            for i in range(gridobj.height):
                for j in range(gridobj.width):
                    if not CellType.is_valid(data["grid"][i][j]):
                        raise ValueError(f"Invalid cell type: {data['grid'][i][j]}")
                    gridobj.grid[i][j] = CellType(data["grid"][i][j])
        return gridobj
