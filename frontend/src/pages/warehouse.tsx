import { useEffect, useState, useRef } from 'react'
import { WarehouseGrid } from '../components/warehouse-grid'
import api from '@/lib/axios'
import { CellType } from '../components/warehouse-grid.d'
import { CellTypeMenu } from '@/components/celltype-menu'
import { RobotTypeMenu } from '@/components/robottype-menu'
import { TaskTypeMenu, TaskType } from '@/components/tasktype-menu'
import { RobotType, Shift } from '@/components/robottype-menu.d'
import { Toaster } from "@/components/ui/sonner"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { toast } from 'sonner'
import { AxiosError } from 'axios'

interface ScheduleData {
  [taskId: string]: {
    robot_id: string;
    estimated_battery_cost: number;
    path_to_pickup: [number, number][];
    path_to_dropoff: [number, number][];
    path_to_charge: [number, number][] | null;
  }
}

interface WarehouseData {
  grid: {
    width: number
    height: number
    grid: CellType[][]
  }
  robots: any[]
  tasks: any[]
}

export function WarehouseVisualization() {
  const [cellTypeMenu, setCellTypeMenu] = useState({
    isOpen: false,
    position: [0, 0] as [number, number],
    cellType: 'empty' as CellType
  })
  const [robotTypeMenu, setRobotTypeMenu] = useState({
    isOpen: false,
    position: [0, 0] as [number, number],
    robotType: null as RobotType | null
  })
  const [taskTypeMenu, setTaskTypeMenu] = useState({
    isOpen: false,
    taskId: "",
    taskType: "standard" as TaskType,
    shift: "day" as Shift
  })
  const [warehouseData, setWarehouseData] = useState<WarehouseData | null>(null)
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRunningSchedule, setIsRunningSchedule] = useState(false)
  const [robotAnimations, setRobotAnimations] = useState<{ [robotId: string]: [number, number] } | null>(null);
  const animationTimeouts = useRef<NodeJS.Timeout[]>([]);
  const [gridWidth, setGridWidth] = useState<number>(warehouseData?.grid.width || 10);
  const [gridHeight, setGridHeight] = useState<number>(warehouseData?.grid.height || 10);

  const fetchWarehouseData = async () => {
    try {
      const { data } = await api.get('/api/init')
      setWarehouseData(data.warehouse)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred')
    }
  }

  const postCellType = async (x: number, y: number, cellType: CellType) => {
    try {
      setWarehouseData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          grid: {
            ...prev.grid,
            grid: prev.grid.grid.map((row, i) => 
              i === y ? row.map((cell, j) => j === x ? cellType : cell) : row
            )
          },
          robots: prev.robots.map(r => 
            r.current_position[0] === y && r.current_position[1] === x ? { ...r, robot_type: cellType } : r
          )
        };
      });
      const { data } = await api.post('/api/cell', {
        warehouse: warehouseData,
        cell_params: { position: [y, x], cell_type: cellType }
      })
      setWarehouseData(data.warehouse)
      toast.success("Cell updated successfully", {
        description: `Changed cell at [${y}, ${x}] to ${cellType}`
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred')
      toast.error("Failed to update cell", {
        description: e instanceof Error ? e.message : 'An error occurred'
      });
    }
  }

  const postRobotType = async (x: number, y: number, robotId: string, robotType: RobotType, shift: Shift) => {
    const originalWarehouseData = warehouseData;

    try {
      const existingRobot = warehouseData?.robots.find(r => r.robot_id === robotId);
      if (existingRobot) {
        toast.info("Robot updated", {
          description: `Replaced existing robot ${robotId} with new configuration`
        });
      }

      setWarehouseData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          grid: {
            ...prev.grid,
            grid: prev.grid.grid.map((row, i) => 
              i === y ? row.map((cell, j) => j === x ? 'robot' : cell) : row
            )
          },
          robots: [...prev.robots.filter(r => r.robot_id !== robotId), {
            robot_id: robotId,
            robot_type: robotType,
            shift: shift,
            current_position: [y, x]
          }]
        }
      });

      const { data } = await api.post('/api/robot', {
        warehouse: warehouseData,
        robots_params: [{
          robot_id: robotId,
          robot_type: robotType,
          shift: shift,
          current_position: [y, x]
        }]
      });
      setWarehouseData(data.warehouse);
      toast.success("Robot added successfully", {
        description: `Added ${robotType} robot ${robotId} for ${shift} shift at [${y}, ${x}]`
      });
    } catch (e) {
      if (e instanceof AxiosError && e.response?.status === 409) {
        setWarehouseData(originalWarehouseData);
        toast.error("Failed to add robot", {
          description: "The selected location is not empty. Please choose a different location."
        });
        return;
      }

      setError(e instanceof Error ? e.message : 'An error occurred');
      toast.error("Failed to add robot", {
        description: e instanceof Error ? e.message : 'An error occurred'
      });
    }
  }

  const postTask = (taskId: string, taskType: TaskType, shift: Shift, pickupLocation: [number, number], dropoffLocation: [number, number]) => {
    if (!warehouseData) return;

    const existingTask = warehouseData?.tasks.find(t => t.task_id === taskId);
    if (existingTask) {
      toast.info("Task updated", {
        description: `Replaced existing task ${taskId} with new configuration`
      });
    }

    const [pickupY, pickupX] = pickupLocation;
    const [dropoffY, dropoffX] = dropoffLocation;

    const INVALID_CELL_TYPES: CellType[] = ['obstacle', 'robot', 'charging_station', 'ramp', 'slope'];
    const invalidLocation = pickupX < 0 || pickupY < 0 || dropoffX < 0 || dropoffY < 0 || pickupX >= warehouseData.grid.width || pickupY >= warehouseData.grid.height || dropoffX >= warehouseData.grid.width || dropoffY >= warehouseData.grid.height;
    const sameLocation = pickupX === dropoffX && pickupY === dropoffY;
    
    if (sameLocation || invalidLocation) {
      toast.error("Invalid location", {
        description: "Please choose a valid location for pickup and dropoff."
      });
      return;
    }

    if (INVALID_CELL_TYPES.includes(warehouseData.grid.grid[pickupY][pickupX]) || INVALID_CELL_TYPES.includes(warehouseData.grid.grid[dropoffY][dropoffX])) {
      toast.error("Invalid location", {
        description: "Please choose a valid location for pickup and dropoff."
      });
      return;
    }

    for (const task of warehouseData.tasks) {
      if (task.pickup_location[0] === pickupY && task.pickup_location[1] === pickupX) {
        toast.error("Pickup location already occupied", {
          description: `Task ${task.task_id} is already at [${pickupY}, ${pickupX}]`
        });
        return;
      }
      if (task.dropoff_location[0] === dropoffY && task.dropoff_location[1] === dropoffX) {
        toast.error("Dropoff location already occupied", {
          description: `Task ${task.task_id} is already at [${dropoffY}, ${dropoffX}]`
        });
        return;
      }
    }
    
    setWarehouseData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        grid: {
          ...prev.grid,
          grid: prev.grid.grid.map((row, i) => 
            i === pickupY ? row.map((cell, j) => j === pickupX ? 'box' : cell) : row
          )
        },
        tasks: [...prev.tasks.filter(t => t.task_id !== taskId), {
          task_id: taskId,
          type: taskType,
          shift: shift,
          pickup_location: pickupLocation,
          dropoff_location: dropoffLocation
        }]
      };
    });

    toast.success("Task added successfully", {
      description: `Added ${taskType} task ${taskId} for ${shift} shift from [${pickupLocation[0]}, ${pickupLocation[1]}] to [${dropoffLocation[0]}, ${dropoffLocation[1]}]`
    });
  };

  const removeTask = (taskId: string) => {
    setWarehouseData(prev => {
      if (!prev) return null;
      const taskToRemove = prev.tasks.find(t => t.task_id === taskId);
      toast.success(`Task ${taskId} removed successfully`, {
        description: `Removed ${taskToRemove?.type} task from ${taskToRemove?.shift} shift`
      });
      return {
        ...prev,
        tasks: prev.tasks.filter(t => t.task_id !== taskId)
      };
    });
  };

  const fetchSchedule = async () => {
    if (!warehouseData) return;
    try {
      const { data } = await api.post('/api/run', {
        warehouse: warehouseData
      });
      setScheduleData(data.scheduler);
    } catch (e) {
      toast.error("Failed to generate schedule", {
        description: e instanceof Error ? e.message : 'An error occurred'
      });
    }
  };

  const handleRunSchedule = async () => {
    if (!scheduleData || !warehouseData) return;

    const dropoffSet = new Set<string>();
    for (const task of warehouseData.tasks) {
      const dropoff = task.dropoff_location;
      const key = `${dropoff[0]},${dropoff[1]}`;
      if (dropoffSet.has(key)) {
        toast.error("Two or more tasks have the same dropoff location.", {
          description: `Conflict at dropoff [${dropoff[0]}, ${dropoff[1]}]`,
        });
        return;
      }
      dropoffSet.add(key);
    }

    setIsRunningSchedule(true);
    setRobotAnimations({});

    const robotsWithTasks = warehouseData.robots.filter(robot => {
      return Object.values(scheduleData).some(s => s.robot_id === robot.robot_id);
    });

    for (const robot of robotsWithTasks) {
      const schedule = Object.values(scheduleData).find(s => s.robot_id === robot.robot_id);
      if (!schedule) continue;
      const pickupPath = (schedule.path_to_charge ?? []).concat(schedule.path_to_pickup) || [];
      const dropoffPath = schedule.path_to_dropoff || [];
      const pickup = pickupPath.at(-1);
      const dropoff = dropoffPath.at(-1);
      if (!pickup || !dropoff) continue;
      const batteryCost = schedule.estimated_battery_cost ?? 0;

      if (warehouseData.grid.grid[dropoff[0]][dropoff[1]] === 'box') {
        toast.error("Box at dropoff", {
          description: `Robot ${robot.robot_id} has a box at dropoff [${dropoff[0]}, ${dropoff[1]}]`
        });
        continue;
      }

      let passedChargingStation = false;
      const fullPath = [...pickupPath, ...dropoffPath];
      for (const [y, x] of fullPath) {
        if (warehouseData.grid.grid[y][x] === 'charging_station') {
          passedChargingStation = true;
          break;
        }
      }

      const boxAtPickup = warehouseData.grid.grid[pickup[0]][pickup[1]] === 'box';

      if (boxAtPickup) {
        for (let i = 0; i < pickupPath.length; i++) {
          setRobotAnimations(prev => ({ ...prev, [robot.robot_id]: pickupPath[i] }));
          if (pickupPath[i][0] === pickup[0] && pickupPath[i][1] === pickup[1]) {
            setWarehouseData(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                grid: {
                  ...prev.grid,
                  grid: prev.grid.grid.map((row, y) =>
                    row.map((cell, x) =>
                      (y === pickup[0] && x === pickup[1] && cell === 'box') ? 'empty' : cell
                    )
                  )
                }
              };
            });
          }
          await new Promise(res => {
            const t = setTimeout(res, 200);
            animationTimeouts.current.push(t);
          });
        }
        for (let i = 0; i < dropoffPath.length - 1; i++) {
          setRobotAnimations(prev => ({ ...prev, [robot.robot_id]: dropoffPath[i] }));
          await new Promise(res => {
            const t = setTimeout(res, 200);
            animationTimeouts.current.push(t);
          });
        }
        setWarehouseData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            grid: {
              ...prev.grid,
              grid: prev.grid.grid.map((row, i) =>
                row.map((cell, j) =>
                  (i === dropoff[0] && j === dropoff[1]) ? 'box' : cell
                )
              )
            },
            tasks: prev.tasks.filter(t => {
              return !(t.pickup_location[0] === pickup[0] && t.pickup_location[1] === pickup[1] && t.dropoff_location[0] === dropoff[0] && t.dropoff_location[1] === dropoff[1]);
            })
          };
        });
        await new Promise(res => {
          const t = setTimeout(res, 500);
          animationTimeouts.current.push(t);
        });
        const stopCell = dropoffPath.length > 1 ? dropoffPath[dropoffPath.length - 2] : pickup;
        setWarehouseData(prev => {
          if (!prev) return prev;
          const oldPos = prev.robots.find(r => r.robot_id === robot.robot_id)?.current_position;
          return {
            ...prev,
            grid: {
              ...prev.grid,
              grid: prev.grid.grid.map((row, i) =>
                row.map((cell, j) => {
                  if (i === dropoff[0] && j === dropoff[1] && cell === 'box') return 'box';
                  if (oldPos && i === oldPos[0] && j === oldPos[1]) return 'empty';
                  if (stopCell && i === stopCell[0] && j === stopCell[1]) return 'robot';
                  return cell;
                })
              )
            },
            robots: prev.robots.map(r => {
              if (r.robot_id !== robot.robot_id) return r;
              let newBattery = r.battery_level ?? 100;
              if (passedChargingStation) newBattery = 100;
              newBattery = Math.max(0, newBattery - batteryCost);
              return {
                ...r,
                current_position: stopCell,
                battery_level: newBattery
              };
            })
          };
        });
        setRobotAnimations(prev => {
          const copy = { ...prev };
          delete copy[robot.robot_id];
          return copy;
        });
        await new Promise(res => {
          const t = setTimeout(res, 500);
          animationTimeouts.current.push(t);
        });
      } else {
        const initialPos = pickupPath.at(0);
        for (let i = 0; i < pickupPath.length; i++) {
          setRobotAnimations(prev => ({ ...prev, [robot.robot_id]: pickupPath[i] }));
          await new Promise(res => {
            const t = setTimeout(res, 200);
            animationTimeouts.current.push(t);
          });
        }
        for (let i = 0; i < dropoffPath.length; i++) {
          setRobotAnimations(prev => ({ ...prev, [robot.robot_id]: dropoffPath[i] }));
          await new Promise(res => {
            const t = setTimeout(res, 200);
            animationTimeouts.current.push(t);
          });
        }
        setWarehouseData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            grid: {
              ...prev.grid,
              grid: prev.grid.grid.map((row, i) =>
                row.map((cell, j) => {
                  if (dropoff && i === dropoff[0] && j === dropoff[1]) return 'robot';
                  if (initialPos && i === initialPos[0] && j === initialPos[1]) return 'empty';
                  return cell;
                })
              )
            },
            robots: prev.robots.map(r => {
              if (r.robot_id !== robot.robot_id) return r;
              let newBattery = r.battery_level ?? 100;
              if (passedChargingStation) newBattery = 100;
              newBattery = Math.max(0, newBattery - batteryCost);
              return {
                ...r,
                current_position: dropoff,
                battery_level: newBattery
              };
            }),
            tasks: prev.tasks.filter(t => {
              return !(t.pickup_location[0] === pickup[0] && t.pickup_location[1] === pickup[1] && t.dropoff_location[0] === dropoff[0] && t.dropoff_location[1] === dropoff[1]);
            })
          };
        });
        setRobotAnimations(prev => {
          const copy = { ...prev };
          delete copy[robot.robot_id];
          return copy;
        });
        await new Promise(res => {
          const t = setTimeout(res, 500);
          animationTimeouts.current.push(t);
        });
      }
    }
    setIsRunningSchedule(false);
  };

  const handleRemoveRobot = (robotId: string, y: number, x: number) => {
    setWarehouseData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        robots: prev.robots.filter(r => r.robot_id !== robotId),
        grid: {
          ...prev.grid,
          grid: prev.grid.grid.map((row, i) =>
            row.map((cell, j) => (i === y && j === x ? 'empty' : cell))
          )
        }
      };
    });
  };

  useEffect(() => {
    fetchWarehouseData()
  }, [])

  useEffect(() => {
    if (warehouseData) {
      fetchSchedule();
    }
  }, [warehouseData]);

  const handleCellChange = async (x: number, y: number, cellType: CellType) => {
    if (!warehouseData) return;

    setCellTypeMenu({
      isOpen: true,
      position: [y, x],
      cellType: cellType
    });
  }

  const getRobotTypeColor = (type: RobotType) => {
    switch (type) {
      case 'general':
        return 'bg-yellow-500';
      case 'standard':
        return 'bg-blue-500';
      case 'fragile':
        return 'bg-red-500';
      default:
        return 'bg-muted';
    }
  };

  const getShiftColor = (shift: Shift) => {
    switch (shift) {
      case 'day':
        return 'bg-green-500';
      case 'night':
        return 'bg-purple-500';
      case '24/7':
        return 'bg-orange-500';
      default:
        return 'bg-muted';
    }
  };

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case 'standard':
        return 'bg-blue-500';
      case 'heavy':
        return 'bg-orange-500';
      case 'fragile':
        return 'bg-red-500';
      default:
        return 'bg-muted';
    }
  };

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      animationTimeouts.current.forEach(clearTimeout);
    };
  }, []);

  // Update grid size handler
  const handleApplyGridSize = () => {
    setWarehouseData(prev => {
      if (!prev) return prev;
      const newWidth = gridWidth;
      const newHeight = gridHeight;
      // Resize grid
      let newGrid = prev.grid.grid.map(row => row.slice(0, newWidth));
      if (newGrid.length > newHeight) newGrid = newGrid.slice(0, newHeight);
      while (newGrid.length < newHeight) newGrid.push(Array(newWidth).fill('empty'));
      newGrid = newGrid.map(row => {
        while (row.length < newWidth) row.push('empty');
        return row;
      });
      // Remove robots/tasks outside new grid
      const robots = prev.robots.filter(r => r.current_position[0] < newHeight && r.current_position[1] < newWidth);
      const tasks = prev.tasks.filter(t =>
        t.pickup_location[0] < newHeight && t.pickup_location[1] < newWidth &&
        t.dropoff_location[0] < newHeight && t.dropoff_location[1] < newWidth
      );
      return {
        ...prev,
        grid: {
          ...prev.grid,
          width: newWidth,
          height: newHeight,
          grid: newGrid
        },
        robots,
        tasks
      };
    });
  };

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }

  if (!warehouseData) {
    return <div className="p-4">Loading...</div>
  }

  return (
    <div className="flex h-screen">
      {/* Robot List Panel */}
      <div className="w-80 h-full border-r border-border p-2 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Robots</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchSchedule}
          >
            Refresh Schedule
          </Button>
        </div>
        <div className="space-y-4">
          {warehouseData?.robots.map((robot) => {
            const assignedTask = scheduleData ? Object.entries(scheduleData).find(([_, info]) => info.robot_id === robot.robot_id)?.[0] : null;
            return (
              <Card key={robot.robot_id}>
                <CardContent className="space-y-2">
                  <CardTitle className="text-base flex items-center justify-between group">
                    <span>{robot.robot_id}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getRobotTypeColor(robot.robot_type)}>
                        {robot.robot_type}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveRobot(robot.robot_id, robot.current_position[0], robot.current_position[1])}
                        title="Remove robot"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardTitle>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Position</span>
                      <span>[{robot.current_position[0]}, {robot.current_position[1]}]</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Shift</span>
                      <Badge variant="outline" className={getShiftColor(robot.shift)}>
                        {robot.shift}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Battery</span>
                      <span>{robot.battery_level}%</span>
                    </div>
                    {assignedTask && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Assigned Task</span>
                        <Badge variant="secondary">{assignedTask}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Grid size controls */}
        <div className="flex items-center gap-2 p-2 border-b border-border bg-muted">
          <label className="text-sm">Width:</label>
          <input
            type="number"
            min={1}
            max={50}
            value={gridWidth}
            onChange={e => setGridWidth(Number(e.target.value))}
            className="w-16 px-2 py-1 border rounded"
          />
          <label className="text-sm">Height:</label>
          <input
            type="number"
            min={1}
            max={50}
            value={gridHeight}
            onChange={e => setGridHeight(Number(e.target.value))}
            className="w-16 px-2 py-1 border rounded"
          />
          <Button size="sm" onClick={handleApplyGridSize}>
            Apply
          </Button>
        </div>
        <WarehouseGrid
          grid={warehouseData.grid}
          robots={warehouseData.robots}
          scheduleData={scheduleData}
          handleCellChange={handleCellChange}
          robotAnimations={robotAnimations}
        />
        <CellTypeMenu
          previousCellType={cellTypeMenu.cellType}
          isOpen={cellTypeMenu.isOpen}
          setIsOpen={(isOpen) => setCellTypeMenu({ ...cellTypeMenu, isOpen })}
          onHandleChange={(cellType) => {
            if (cellType === 'robot') {
              setRobotTypeMenu({
                isOpen: true,
                position: cellTypeMenu.position,
                robotType: null
              })
            } else {
              postCellType(cellTypeMenu.position[1], cellTypeMenu.position[0], cellType)
            }
          }}
        />
        <RobotTypeMenu
          previousRobotType={robotTypeMenu.robotType}
          isOpen={robotTypeMenu.isOpen}
          setIsOpen={(isOpen) => setRobotTypeMenu({ ...robotTypeMenu, isOpen })}
          onHandleChange={(robotId, robotType, shift) => {
            postRobotType(robotTypeMenu.position[1], robotTypeMenu.position[0], robotId, robotType, shift);
          }}
        />
        <TaskTypeMenu
          isOpen={taskTypeMenu.isOpen}
          setIsOpen={(isOpen) => {
            if (!isOpen) {
              setTaskTypeMenu({
                isOpen: false,
                taskId: "",
                taskType: "standard",
                shift: "day"
              });
            } else {
              setTaskTypeMenu(prev => ({ ...prev, isOpen }));
            }
          }}
          onHandleChange={postTask}
        />
        <Toaster position="top-left" />
      </div>

      {/* Tasks Panel */}
      <div className="w-80 h-full border-l border-border p-2 overflow-y-auto flex flex-col">
        <h2 className="text-lg font-semibold mb-2 text-center">Tasks</h2>
        <div className="flex-1 space-y-4 overflow-y-auto">
          {warehouseData?.tasks.map((task) => {
            const schedule = scheduleData?.[task.task_id];
            return (
              <Card key={task.task_id}>
                <CardContent className="space-y-2">
                  <CardTitle className="text-base flex items-center justify-between group">
                    <span>{task.task_id}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getTaskTypeColor(task.type)}>
                        {task.type}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeTask(task.task_id)}
                        title="Remove task"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardTitle>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Shift</span>
                      <Badge variant="outline" className={getShiftColor(task.shift)}>
                        {task.shift}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Pickup</span>
                      <span>[{task.pickup_location[0]}, {task.pickup_location[1]}]</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Dropoff</span>
                      <span>[{task.dropoff_location[0]}, {task.dropoff_location[1]}]</span>
                    </div>
                    {schedule && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Assigned Robot</span>
                          <Badge variant="secondary">{schedule.robot_id}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Battery Cost</span>
                          <span>{schedule.estimated_battery_cost}</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="space-y-4 pt-4">
          <Button 
            className="w-full" 
            onClick={() => setTaskTypeMenu({
              isOpen: true,
              taskId: "",
              taskType: "standard",
              shift: "day"
            })}
          >
            Add Task
          </Button>
          <Button 
            variant="default" 
            className="w-full"
            onClick={handleRunSchedule}
            disabled={isRunningSchedule || !scheduleData}
          >
            {isRunningSchedule ? "Running Schedule..." : "Run Schedule"}
          </Button>
        </div>
      </div>
    </div>
  )
} 