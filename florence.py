import argparse
from pathlib import Path

from PIL import Image, ImageDraw
import transformers
from transformers import AutoProcessor, AutoModelForCausalLM

if int(transformers.__version__.split(".", 1)[0]) >= 5:
    raise RuntimeError(
        "Florence-2 requires Transformers 4.x. Install the compatible "
        "dependencies with: py -3.12 -m pip install -r requirements-florence.txt"
    )

model_id = "microsoft/Florence-2-base"


def main():
    parser = argparse.ArgumentParser(
        description="Detect and label objects in an image with Florence-2."
    )
    parser.add_argument(
        "image",
        nargs="?",
        default="vegetables.jpg",
        help="Image to analyze (default: vegetables.jpg).",
    )
    parser.add_argument(
        "--output",
        default="florence-detected.jpg",
        help="Path for the annotated image (default: florence-detected.jpg).",
    )
    args = parser.parse_args()

    image_path = Path(args.image)
    if not image_path.is_file():
        parser.error(f"Image file not found: {image_path}")

    print("Loading model...")
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        trust_remote_code=True,
        attn_implementation="eager",
    )
    processor = AutoProcessor.from_pretrained(
        model_id,
        trust_remote_code=True,
    )
    print("Model loaded!")

    with Image.open(image_path) as source:
        image = source.convert("RGB")

    task = "<OD>"
    inputs = processor(text=task, images=image, return_tensors="pt")
    generated_ids = model.generate(
        input_ids=inputs["input_ids"],
        pixel_values=inputs["pixel_values"],
        max_new_tokens=256,
    )
    generated_text = processor.batch_decode(
        generated_ids,
        skip_special_tokens=False,
    )[0]
    detections = processor.post_process_generation(
        generated_text,
        task=task,
        image_size=image.size,
    )[task]

    boxes = detections["bboxes"]
    labels = detections["labels"]
    draw = ImageDraw.Draw(image)
    for box, label in zip(boxes, labels):
        x1, y1, x2, y2 = (int(coordinate) for coordinate in box)
        label = str(label)
        draw.rectangle((x1, y1, x2, y2), outline="lime", width=3)
        text_bounds = draw.textbbox((x1, y1), label)
        draw.rectangle(text_bounds, fill="lime")
        draw.text((x1, y1), label, fill="black")
        print(f"Detected: {label} [{x1}, {y1}, {x2}, {y2}]")

    if not labels:
        print("No objects detected.")

    output_path = Path(args.output)
    image.save(output_path)
    print(f"Saved annotated image to {output_path}")


if __name__ == "__main__":
    main()