import requests
import json

warehouse = {}

def test_create_warehouse():
    global warehouse
    response = requests.get("http://localhost:8000/api/init")
    assert response.status_code == 200
    warehouse = response.json()["warehouse"]
    print(json.dumps(warehouse, indent=4))

def test_add_robot():
    global warehouse
    response = requests.post("http://localhost:8000/api/robot", json={
        "warehouse": warehouse,
        "robots_params": [{ "robot_id": "robot1", "robot_type": "fragile", "shift": "day", "current_position": [0, 0] }],
    })
    print(json.dumps(response.json(), indent=4))
    assert response.status_code == 200
    warehouse = response.json()["warehouse"]
    print(json.dumps(warehouse, indent=4))

def test_set_cell():
    global warehouse
    response = requests.post("http://localhost:8000/api/cell", json={
        "warehouse": warehouse,
        "cell_params": { "position": [0, 0], "cell_type": "obstacle" }
    })
    assert response.status_code == 200
    warehouse = response.json()["warehouse"]
    print(json.dumps(warehouse, indent=4))

def test_run_warehouse():
    global warehouse

    warehouse["tasks"] = [
        {
            "task_id": "1",
            "type": "fragile",
            "shift": "day",
            "pickup_location": [1, 1],
            "dropoff_location": [3, 3]
        }
    ]

    response = requests.post("http://localhost:8000/api/run", json={
        "warehouse": warehouse,
    })
    assert response.status_code == 200
    print(json.dumps(response.json(), indent=4))

if __name__ == "__main__":
    test_create_warehouse()
    test_add_robot()
    test_run_warehouse()