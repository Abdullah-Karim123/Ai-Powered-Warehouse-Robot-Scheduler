import { useEffect, useState } from 'react'
import { CellType } from './warehouse-grid.d'

interface WarehouseGridProps {
  grid: {
    width: number
    height: number
    grid: CellType[][]
  }
  robots: any[]
  scheduleData: {
    [taskId: string]: {
      robot_id: string;
      estimated_battery_cost: number;
      path_to_pickup: [number, number][];
      path_to_dropoff: [number, number][];
      path_to_charge: [number, number][] | null;
    }
  } | null
  handleCellChange: (x: number, y: number, cellType: CellType) => void
  robotAnimations?: { [robotId: string]: [number, number] } | null
}

const CELL_SIZE_CAP = 100;

const CELL_TYPES = [
  { value: 'empty', label: 'Empty', color: 'bg-[var(--warehouse-empty)]' },
  { value: 'obstacle', label: 'Obstacle', color: 'bg-[var(--warehouse-obstacle)]' },
  { value: 'box', label: 'Box', color: 'bg-[var(--warehouse-box)]' },
  { value: 'charging_station', label: 'Station', color: 'bg-[var(--warehouse-station)]' },
  { value: 'ramp', label: 'Ramp', color: 'bg-[var(--warehouse-ramp)]' },
  { value: 'slope', label: 'Slope', color: 'bg-[var(--warehouse-slope)]' },
]

const ROBOT_TYPES = [
  { value: 'general', label: 'General', color: 'bg-yellow-500' },
  { value: 'standard', label: 'Standard', color: 'bg-blue-500' },
  { value: 'fragile', label: 'Fragile', color: 'bg-red-500' },
]

export function WarehouseGrid({
  grid,
  robots,
  handleCellChange,
  robotAnimations
}: WarehouseGridProps) {
  const [cellSize, setCellSize] = useState(CELL_SIZE_CAP)

  const width = grid.width
  const height = grid.height

  useEffect(() => {
    const updateCellSize = () => {
      const containerWidth = window.innerWidth * 0.9
      const containerHeight = window.innerHeight * 0.9
      const maxCellWidth = containerWidth / width
      const maxCellHeight = containerHeight / height
      setCellSize(Math.min(maxCellWidth, maxCellHeight, CELL_SIZE_CAP))
    }

    updateCellSize()
    window.addEventListener('resize', updateCellSize)
    return () => window.removeEventListener('resize', updateCellSize)
  }, [width, height])

  const getCellColor = (cellType: CellType) => {
    return CELL_TYPES.find(type => type.value === cellType)?.color || 'bg-muted'
  }

  const getRobotColor = (robotType: string) => {
    return ROBOT_TYPES.find(type => type.value === robotType)?.color || 'bg-muted-foreground'
  }

  const getCellLabel = (cellType: CellType) => {
    return CELL_TYPES.find(type => type.value === cellType)?.label || '';
  }

  const getRobotLabel = (robotType: string) => {
    return ROBOT_TYPES.find(type => type.value === robotType)?.label || '';
  }

  return (
    <div className="w-full h-screen flex items-center justify-center bg-background">
      <div className="relative">
        {/* No more column/row scale */}
        <div 
          className="relative"
          style={{
            width: width * cellSize,
            height: height * cellSize,
          }}
        >
          {grid.grid.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                className={`absolute border border-border ${getCellColor(cell)} cursor-pointer transition-colors flex flex-col items-center justify-center`}
                style={{
                  left: x * cellSize,
                  top: y * cellSize,
                  width: cellSize,
                  height: cellSize,
                  fontSize: `${Math.max(cellSize * 0.2, 10)}px`,
                }}
                onClick={() => handleCellChange(x, y, cell)}
              >
                {cell !== 'empty' && (
                  <span className="text-foreground/80 font-medium select-none">
                    {getCellLabel(cell)}
                  </span>
                )}
                <span className="text-xs text-muted-foreground select-none mt-0.5">
                  ({y}, {x})
                </span>
              </div>
            ))
          )}

          {robots.map((robot) => {
            const animPos = robotAnimations?.[robot.robot_id];
            const y = animPos ? animPos[0] : robot.current_position[0];
            const x = animPos ? animPos[1] : robot.current_position[1];
            return (
              <div
                key={robot.robot_id}
                className={`absolute rounded-full border-2 border-border ${getRobotColor(robot.robot_type)}`}
                style={{
                  left: (x + 0.1) * cellSize,
                  top: (y + 0.1) * cellSize,
                  width: cellSize * 0.8,
                  height: cellSize * 0.8,
                  fontSize: `${Math.min(cellSize * 0.15, 20)}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'left 0.18s linear, top 0.18s linear',
                }}
              >
                <span className="text-foreground/80 font-medium select-none">
                  {getRobotLabel(robot.robot_type)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  )
} 