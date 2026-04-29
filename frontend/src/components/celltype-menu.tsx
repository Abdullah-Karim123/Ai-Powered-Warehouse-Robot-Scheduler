import { Button } from './ui/button';
import { CellType } from './warehouse-grid.d';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  
} from "@/components/ui/dialog";

interface CellTypeMenuProps {
  previousCellType: CellType;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onHandleChange: (cellType: CellType) => void;
}

export const CellTypeMenu = ({ previousCellType, isOpen, setIsOpen, onHandleChange }: CellTypeMenuProps) => {

  const handleCellTypeChange = (cellType: CellType) => {
    onHandleChange(cellType);
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cell Type</DialogTitle>
          <DialogDescription>
            Select the type of cell you want to add.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-2">
          <Button variant={previousCellType === 'empty' ? 'default' : 'outline'} onClick={() => handleCellTypeChange('empty')}>Empty</Button>
          <Button variant={previousCellType === 'obstacle' ? 'default' : 'outline'} onClick={() => handleCellTypeChange('obstacle')}>Obstacle</Button>
          <Button variant={previousCellType === 'box' ? 'default' : 'outline'} onClick={() => handleCellTypeChange('box')}>Box</Button>
          <Button variant={previousCellType === 'charging_station' ? 'default' : 'outline'} onClick={() => handleCellTypeChange('charging_station')}>Charging Station</Button>
          <Button variant={previousCellType === 'ramp' ? 'default' : 'outline'} onClick={() => handleCellTypeChange('ramp')}>Ramp</Button>
          <Button variant={previousCellType === 'slope' ? 'default' : 'outline'} onClick={() => handleCellTypeChange('slope')}>Slope</Button>
          <Button variant={previousCellType === 'robot' ? 'default' : 'secondary'} onClick={() => handleCellTypeChange('robot')}>Robot</Button>
        </div>

        <DialogFooter>
          <Button onClick={() => setIsOpen(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
