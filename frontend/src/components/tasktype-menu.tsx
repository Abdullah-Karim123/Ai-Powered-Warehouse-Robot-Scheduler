import { Button } from './ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

export type TaskType = "standard" | "heavy" | "fragile";
export type Shift = "day" | "night" | "24/7";

interface TaskTypeMenuProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onHandleChange: (taskId: string, taskType: TaskType, shift: Shift, pickupLocation: [number, number], dropoffLocation: [number, number]) => void;
}

const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "heavy", label: "Heavy" },
  { value: "fragile", label: "Fragile" },
];

const SHIFTS: { value: Shift; label: string }[] = [
  { value: "day", label: "Day Shift" },
  { value: "night", label: "Night Shift" },
  { value: "24/7", label: "24/7 Operation" },
];

export function TaskTypeMenu({ 
  isOpen, 
  setIsOpen, 
  onHandleChange,
}: TaskTypeMenuProps) {
  const [taskId, setTaskId] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("standard");
  const [shift, setShift] = useState<Shift>("day");
  const [pickupX, setPickupX] = useState("");
  const [pickupY, setPickupY] = useState("");
  const [dropoffX, setDropoffX] = useState("");
  const [dropoffY, setDropoffY] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId.trim()) {
      toast.error("Please enter a task ID");
      return;
    }

    const pickupXNum = parseInt(pickupX);
    const pickupYNum = parseInt(pickupY);
    const dropoffXNum = parseInt(dropoffX);
    const dropoffYNum = parseInt(dropoffY);

    if (isNaN(pickupXNum) || isNaN(pickupYNum) || isNaN(dropoffXNum) || isNaN(dropoffYNum)) {
      toast.error("Please enter valid coordinates for pickup and dropoff locations");
      return;
    }

    onHandleChange(
      taskId,
      taskType,
      shift,
      [pickupXNum, pickupYNum],
      [dropoffXNum, dropoffYNum]
    );
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
          <DialogDescription>
            Configure the task's properties.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="taskId">Task ID</Label>
            <Input
              id="taskId"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              placeholder="Enter task ID"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taskType">Task Type</Label>
            <Select value={taskType} onValueChange={(value: TaskType) => setTaskType(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select task type" />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shift">Shift</Label>
            <Select value={shift} onValueChange={(value: Shift) => setShift(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                {SHIFTS.map((shift) => (
                  <SelectItem key={shift.value} value={shift.value}>
                    {shift.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pickup Location</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={pickupX}
                  onChange={(e) => setPickupX(e.target.value)}
                  placeholder="X"
                  required
                />
                <Input
                  type="number"
                  value={pickupY}
                  onChange={(e) => setPickupY(e.target.value)}
                  placeholder="Y"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dropoff Location</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={dropoffX}
                  onChange={(e) => setDropoffX(e.target.value)}
                  placeholder="X"
                  required
                />
                <Input
                  type="number"
                  value={dropoffY}
                  onChange={(e) => setDropoffY(e.target.value)}
                  placeholder="Y"
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 