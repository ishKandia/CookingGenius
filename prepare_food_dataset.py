import argparse
from pathlib import Path

import yaml


TARGET_CLASSES = {
    "tomato": "tomato",
    "broccoli": "broccoli",
    "carrot": "carrot",
    "bell pepper": "bell_pepper",
    "cucumber": "cucumber",
}


def read_class_names(dataset_yaml):
    with dataset_yaml.open(encoding="utf-8") as dataset_file:
        dataset = yaml.safe_load(dataset_file)
    names = dataset["names"]
    if isinstance(names, list):
        return names
    return [names[index] for index in range(len(names))]


def main():
    parser = argparse.ArgumentParser(
        description="Build a YOLO dataset for the selected vegetable classes."
    )
    parser.add_argument(
        "--source",
        default="Combined Vegetables - Fruits.v1i.yolov8",
        help="Roboflow export directory containing data.yaml and split lists.",
    )
    parser.add_argument("--output", default="target-vegetables")
    args = parser.parse_args()

    source = Path(args.source).resolve()
    output = Path(args.output).resolve()
    if not (source / "data.yaml").is_file():
        parser.error(f"Roboflow dataset YAML not found under {source}.")
    if output.exists():
        parser.error(f"Output already exists; refusing to overwrite: {output}")

    source_names = [name.strip().lower() for name in read_class_names(source / "data.yaml")]
    source_to_target = {
        source_names.index(source_name): target_name
        for source_name, target_name in TARGET_CLASSES.items()
        if source_name in source_names
    }
    missing_classes = set(TARGET_CLASSES) - set(source_names)
    if missing_classes:
        parser.error(
            "Source dataset is missing requested classes: "
            + ", ".join(sorted(missing_classes))
        )
    target_ids = {
        class_id: list(TARGET_CLASSES.values()).index(target_name)
        for class_id, target_name in source_to_target.items()
    }

    counts = {}
    for split in ("train", "val"):
        manifest = source / f"{split}.txt"
        if not manifest.is_file():
            parser.error(f"Expected split manifest not found: {manifest}")
        split_images = output / "images" / split
        split_labels = output / "labels" / split
        split_images.mkdir(parents=True)
        split_labels.mkdir(parents=True)
        selected = 0
        instances = 0

        for entry in manifest.read_text(encoding="utf-8").splitlines():
            entry = entry.strip()
            if not entry:
                continue
            relative_image = Path(entry[2:] if entry.startswith("./") else entry)
            image = source / relative_image
            if not image.is_file():
                parser.error(f"Image listed in {manifest} does not exist: {image}")
            source_label = (
                image.parent.parent / "labels" / f"{image.stem}.txt"
            )
            if not source_label.is_file():
                parser.error(f"Annotation file not found for image: {source_label}")

            target_rows = []
            for line_number, line in enumerate(
                source_label.read_text(encoding="utf-8").splitlines(), 1
            ):
                fields = line.split()
                if len(fields) != 5:
                    parser.error(
                        f"Invalid YOLO annotation at {source_label}:{line_number}."
                    )
                try:
                    class_id = int(fields[0])
                    coordinates = [float(value) for value in fields[1:]]
                except ValueError:
                    parser.error(
                        f"Non-numeric YOLO annotation at "
                        f"{source_label}:{line_number}."
                    )
                if class_id not in range(len(source_names)) or not all(
                    0 <= value <= 1 for value in coordinates
                ) or coordinates[2] <= 0 or coordinates[3] <= 0:
                    parser.error(
                        f"Invalid class ID or box at {source_label}:{line_number}."
                    )
                if class_id in target_ids:
                    target_rows.append(
                        f"{target_ids[class_id]} "
                        + " ".join(f"{value:.8f}" for value in coordinates)
                    )

            if not target_rows:
                continue

            destination_image = split_images / image.name
            try:
                destination_image.hardlink_to(image)
            except OSError as error:
                parser.error(
                    f"Could not hard-link {image} to {destination_image}: {error}"
                )
            (split_labels / f"{image.stem}.txt").write_text(
                "\n".join(target_rows) + "\n", encoding="utf-8"
            )
            selected += 1
            instances += len(target_rows)

        if not selected:
            parser.error(f"No target-class images found for the {split} split.")
        counts[split] = (selected, instances)

    print(
        f"Prepared target-only dataset at {output}: "
        f"{counts['train'][0]} training images, {counts['train'][1]} boxes; "
        f"{counts['val'][0]} validation images, {counts['val'][1]} boxes."
    )
    print(
        "The five classes are tomato, broccoli, carrot, bell_pepper, cucumber. "
        "Spinach is not present in the source data."
    )


if __name__ == "__main__":
    main()
