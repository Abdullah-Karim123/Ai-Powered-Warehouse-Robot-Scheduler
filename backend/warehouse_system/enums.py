from enum import Enum

class EnumType(Enum):
  @classmethod
  def is_valid(cls, type: int):
    return type in cls._value2member_map_

class TaskType(EnumType):
  STANDARD = "standard"
  HEAVY = "heavy"
  FRAGILE = "fragile"

class RobotType(EnumType):
  GENERAL = "general"
  STANDARD = "standard"
  FRAGILE = "fragile"

class Shift(EnumType):
  DAY = "day"
  NIGHT = "night"
  TWENTY_FOUR_SEVEN = "24/7"

class CellType(EnumType):
  EMPTY = "empty"
  RAMP = "ramp"
  SLOPE = "slope"
  OBSTACLE = "obstacle"
  ROBOT = "robot"
  BOX = "box"
  CHARGING_STATION = "charging_station"
