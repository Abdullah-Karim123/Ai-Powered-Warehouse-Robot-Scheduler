from warehouse_system.enums import TaskType, Shift

class Task:
  def __init__(self, task_id: str, type: TaskType, shift: Shift, pickup_location: tuple, dropoff_location: tuple):
    self.task_id = task_id
    self.type = type
    self.shift = shift
    self.pickup_location = pickup_location
    self.dropoff_location = dropoff_location

  def serialize(self):
    return {
      "task_id": self.task_id,
      "type": self.type.value,
      "shift": self.shift.value,
      "pickup_location": list(self.pickup_location),
      "dropoff_location": list(self.dropoff_location)
    }

  @classmethod
  def deserialize(cls, data: dict):
    if not TaskType.is_valid(data["type"]):
      raise ValueError(f"Invalid task type: {data['type']}")
    if not Shift.is_valid(data["shift"]):
      raise ValueError(f"Invalid shift: {data['shift']}")
    return cls(
      data["task_id"],
      TaskType(data["type"]),
      Shift(data["shift"]),
      tuple(data["pickup_location"]),
      tuple(data["dropoff_location"])
    )
  
  def __str__(self):
    return f"Task(id={self.task_id}, type={self.type}, shift={self.shift}, pickup_location={self.pickup_location}, dropoff_location={self.dropoff_location})"
  
  def __repr__(self):
    return self.__str__()
