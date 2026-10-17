from ultralytics import YOLO

# Load a pretrained YOLO model
model = YOLO("yolo11n.pt")

print("YOLO loaded successfully!")

# Analyze image
results = model("vegetables.jpg")

# Print detections
for result in results:
    for box in result.boxes:
        class_id = int(box.cls[0])
        confidence = float(box.conf[0])

        print(
            f"Detected: {model.names[class_id]}"
            f" ({confidence:.2%})"
        )

# Save image with bounding boxes
results[0].save(filename="detected.jpg")

print("Finished!")