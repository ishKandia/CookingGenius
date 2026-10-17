import argparse
from pathlib import Path

import yaml
from ultralytics import YOLO


IMAGE_SUFFIXES = {
    ".avif",
    ".bmp",
    ".dng",
    ".heic",
    ".heif",
    ".jp2",
    ".jpeg",
    ".jpg",
    ".mpo",
    ".png",
    ".tif",
    ".tiff",
    ".webp",
}


def main():
    parser = argparse.ArgumentParser(
        description="Fine-tune a YOLO detector on a labeled food dataset."
    )
    parser.add_argument(
        "--data",
        required=True,
        help="Path to a Ultralytics dataset YAML file.",
    )
    parser.add_argument(
        "--model",
        default="yolo11s.pt",
        help="Pretrained model or weights path (default: yolo11s.pt).",
    )
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--imgsz", type=int, default=768)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument("--name", default="food")
    args = parser.parse_args()

    data_path = Path(args.data).resolve()
    if not data_path.is_file():
        parser.error(f"Dataset YAML file not found: {data_path}")
    if args.epochs < 1 or args.imgsz < 1 or args.batch < 1:
        parser.error("--epochs, --imgsz, and --batch must be positive integers.")

    with data_path.open(encoding="utf-8") as dataset_file:
        dataset = yaml.safe_load(dataset_file)
    dataset_root = Path(dataset.get("path", data_path.parent))
    if not dataset_root.is_absolute():
            dataset_root = data_path.parent / dataset_root
    for split in ("train", "val"):
        split_path = Path(dataset[split])
        if not split_path.is_absolute():
            split_path = dataset_root / split_path
        images = (
            [
                image
                for image in split_path.rglob("*")
                if image.is_file() and image.suffix.lower() in IMAGE_SUFFIXES
            ]
            if split_path.is_dir()
            else []
        )
        if not images:
            parser.error(
                f"No images found for the {split} split in {split_path}. "
                "Add separately annotated images to this split before training."
            )
        label_root = dataset_root / "labels" / split
        missing_labels = [
            image.relative_to(split_path).with_suffix(".txt")
            for image in images
            if not (label_root / image.relative_to(split_path).with_suffix(".txt")).is_file()
        ]
        if missing_labels:
            parser.error(
                f"{len(missing_labels)} {split} image(s) have no matching YOLO "
                f"label file under {label_root}; first missing label: "
                f"{missing_labels[0]}. Use an empty label file for images "
                "that contain none of the target foods."
            )
        for image in images:
            label_path = label_root / image.relative_to(split_path).with_suffix(".txt")
            for line_no, line in enumerate(label_path.read_text(encoding="utf-8").splitlines(), 1):
                fields = line.split()
                if not fields:
                    continue
                if len(fields) != 5:
                    parser.error(
                        f"Invalid detection label in {label_path}:{line_no}; "
                        "each line must contain class_id and four box values."
                    )
                try:
                    class_id = int(fields[0])
                    coords = [float(value) for value in fields[1:]]
                except ValueError:
                    parser.error(f"Non-numeric YOLO label in {label_path}:{line_no}.")
                if not 0 <= class_id < len(dataset["names"]) or not all(
                    0 <= value <= 1 for value in coords
                ) or coords[2] <= 0 or coords[3] <= 0:
                    parser.error(
                        f"Out-of-range class or box value in {label_path}:{line_no}."
                    )

    model = YOLO(args.model)
    model.train(
        data=str(data_path),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        project="runs",
        name=args.name,
        exist_ok=True,
    )


if __name__ == "__main__":
    main()
