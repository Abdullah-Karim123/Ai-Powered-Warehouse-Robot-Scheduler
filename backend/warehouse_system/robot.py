from warehouse_system.enums import RobotType, Shift

class Robot:
    def __init__(self, robot_id: str, robot_type: RobotType, shift: Shift, battery_level: int = 100, current_position: tuple = (0, 0)):
        self.robot_id = robot_id
        self.robot_type = robot_type
        self.shift = shift
        self.battery_level = battery_level
        self.is_carrying_box = False
        self.current_position = current_position

    def charge(self):
        self.battery_level = 100
        
    def serialize(self):
        return {
            "robot_id": self.robot_id,
            "robot_type": self.robot_type.value,
            "shift": self.shift.value,
            "battery_level": self.battery_level,
            "is_carrying_box": self.is_carrying_box,
            "current_position": list(self.current_position)
        }
    
    @classmethod
    def deserialize(cls, data: dict):
        if not RobotType.is_valid(data["robot_type"]):
            raise ValueError(f"Invalid robot type: {data['robot_type']}")
        if not Shift.is_valid(data["shift"]):
            raise ValueError(f"Invalid shift: {data['shift']}")
        return cls(
            data["robot_id"],
            RobotType(data["robot_type"]),
            Shift(data["shift"]),
            data["battery_level"] if "battery_level" in data else 100,
            tuple(data["current_position"]) if "current_position" in data else (0, 0)
        )

    def __str__(self):
        return f"Robot(id={self.robot_id}, type={self.robot_type}, shift={self.shift}, battery_level={self.battery_level}, current_position={self.current_position})"
    
    def __repr__(self):
        return self.__str__()
