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


def get_images(split_path):
    if split_path.is_dir():
        return [
            image
            for image in split_path.rglob("*")
            if image.is_file() and image.suffix.lower() in IMAGE_SUFFIXES
        ]
    if split_path.is_file() and split_path.suffix.lower() == ".txt":
        images = []
        for entry in split_path.read_text(encoding="utf-8").splitlines():
            entry = entry.strip()
            if not entry:
                continue
            image = Path(entry)
            if entry.startswith("./"):
                image = split_path.parent / entry[2:]
            elif not image.is_absolute():
                image = split_path.parent / image
            if image.is_file() and image.suffix.lower() in IMAGE_SUFFIXES:
                images.append(image)
        return images
    return []


def get_label_path(image_path):
    parts = list(image_path.parts)
    for index, part in enumerate(parts):
        if part.lower() == "images":
            parts[index] = "labels"
            return Path(*parts).with_suffix(".txt")
    raise ValueError(f"Image path does not contain an 'images' directory: {image_path}")


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
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument("--fraction", type=float, default=1.0)
    parser.add_argument("--name", default="food")
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Validate dataset files and labels without starting training.",
    )
    args = parser.parse_args()

    data_path = Path(args.data).resolve()
    if not data_path.is_file():
        parser.error(f"Dataset YAML file not found: {data_path}")
    if args.epochs < 1 or args.imgsz < 1 or args.batch < 1:
        parser.error("--epochs, --imgsz, and --batch must be positive integers.")
    if not 0 < args.fraction <= 1:
        parser.error("--fraction must be greater than 0 and at most 1.")

    with data_path.open(encoding="utf-8") as dataset_file:
        dataset = yaml.safe_load(dataset_file)
    dataset_root = Path(dataset.get("path", data_path.parent))
    if not dataset_root.is_absolute():
        dataset_root = data_path.parent / dataset_root
    dataset_root = dataset_root.resolve()
    for split in ("train", "val"):
        split_path = Path(dataset[split])
        if not split_path.is_absolute():
            split_path = dataset_root / split_path
        split_path = split_path.resolve()
        images = get_images(split_path)
        if not images:
            parser.error(
                f"No images found for the {split} split in {split_path}. "
                "Add separately annotated images to this split before training."
            )
        missing_labels = [image for image in images if not get_label_path(image).is_file()]
        if missing_labels:
            parser.error(
                f"{len(missing_labels)} {split} image(s) have no matching YOLO "
                f"label file; first image missing a label: {missing_labels[0]}. "
                "Use an empty label file for images "
                "that contain none of the target foods."
            )
        label_count = 0
        for image in images:
            label_path = get_label_path(image)
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
                label_count += 1
        print(f"Validated {split}: {len(images)} images and {label_count} boxes.")

    if args.check_only:
        print("Dataset validation passed; training was not started.")
        return

    model = YOLO(args.model)
    model.train(
        data=str(data_path),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        fraction=args.fraction,
        project=str(Path(__file__).resolve().parent / "runs" / "detect"),
        name=args.name,
        exist_ok=True,
    )


if __name__ == "__main__":
    main()
