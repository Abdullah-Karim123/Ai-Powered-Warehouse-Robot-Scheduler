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
import { RobotType, Shift } from './robottype-menu.d';

interface RobotTypeMenuProps {
  previousRobotType: RobotType | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onHandleChange: (robotId: string, robotType: RobotType, shift: Shift) => void;
}

const ROBOT_TYPES: { value: RobotType; label: string }[] = [
  { value: "general", label: "General Purpose" },
  { value: "standard", label: "Standard" },
  { value: "fragile", label: "Fragile" },
];

const SHIFTS: { value: Shift; label: string }[] = [
  { value: "day", label: "Day Shift" },
  { value: "night", label: "Night Shift" },
  { value: "24/7", label: "24/7 Operation" },
];

export function RobotTypeMenu({ previousRobotType, isOpen, setIsOpen, onHandleChange }: RobotTypeMenuProps) {
  const [robotId, setRobotId] = useState("");
  const [robotType, setRobotType] = useState<RobotType>(previousRobotType || "standard");
  const [shift, setShift] = useState<Shift>("day");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!robotId.trim()) {
      return; // Don't submit if robot ID is empty
    }
    onHandleChange(robotId, robotType, shift);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Robot</DialogTitle>
          <DialogDescription>
            Configure the robot's properties.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="robotId">Robot ID</Label>
            <Input
              id="robotId"
              value={robotId}
              onChange={(e) => setRobotId(e.target.value)}
              placeholder="Enter robot ID"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="robotType">Robot Type</Label>
            <Select value={robotType} onValueChange={(value: RobotType) => setRobotType(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select robot type" />
              </SelectTrigger>
              <SelectContent>
                {ROBOT_TYPES.map((type) => (
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Robot
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
