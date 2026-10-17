import argparse
from pathlib import Path

from ultralytics import YOLO


def main():
    parser = argparse.ArgumentParser(
        description="Detect food items in an image with a YOLO model."
    )
    parser.add_argument("image", help="Path to an image to analyze.")
    parser.add_argument(
        "--model",
        default="yolo11s.pt",
        help="Model weights (default: pretrained yolo11s.pt).",
    )
    parser.add_argument("--imgsz", type=int, default=768)
    parser.add_argument("--conf", type=float, default=0.25)
    parser.add_argument("--output", default="detected.jpg")
    args = parser.parse_args()

    image_path = Path(args.image)
    if not image_path.is_file():
        parser.error(f"Image file not found: {image_path}")
    if args.imgsz < 1:
        parser.error("--imgsz must be a positive integer.")
    if not 0 <= args.conf <= 1:
        parser.error("--conf must be between 0 and 1.")

    model = YOLO(args.model)
    results = model.predict(
        source=str(image_path),
        imgsz=args.imgsz,
        conf=args.conf,
        verbose=False,
    )
    result = results[0]
    result.save(filename=args.output)

    if result.boxes is None or len(result.boxes) == 0:
        print("No objects detected.")
    else:
        for box in result.boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            print(f"Detected: {result.names[class_id]} ({confidence:.2%})")
    print(f"Saved annotated image to {args.output}")


if __name__ == "__main__":
    main()
