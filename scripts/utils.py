import json
import random

def calculate_iou(boxA, boxB):
    # Determine the (x, y)-coordinates of the intersection rectangle
    xA = max(boxA[1], boxB[1])
    yA = max(boxA[0], boxB[0])
    xB = min(boxA[3], boxB[3])
    yB = min(boxA[2], boxB[2])

    # Compute the area of intersection rectangle
    interArea = max(0, xB - xA + 1) * max(0, yB - yA + 1)

    # Compute the area of both the prediction and ground-truth rectangles
    boxAArea = (boxA[3] - boxA[1] + 1) * (boxA[2] - boxA[0] + 1)
    boxBArea = (boxB[3] - boxB[1] + 1) * (boxB[2] - boxB[0] + 1)

    # Compute the intersection over union
    iou = interArea / float(boxAArea + boxBArea - interArea)
    return iou

def load_ground_truth(filename):
    # Mock function to simulate loading annotation XML/JSON
    # In a real scenario, this parses PASCAL VOC or COCO format
    return [
        {"name": "banana", "box_2d": [100, 100, 200, 200]},
        {"name": "apple", "box_2d": [300, 300, 400, 400]}
    ]