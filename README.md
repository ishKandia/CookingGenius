# CookingGenius
DubHacks 2026 project.

## Food object detection

The demo detector uses a general-purpose pretrained YOLO model. Fine-tuning it
on labeled images of the foods you want to recognize is necessary for a
food-specific detector.

### Prepare a dataset

The Roboflow export contains seven annotated images, with one example each of
asparagus, bell pepper, broccoli, cabbage, carrot, squash, and tomato. Their
labels are prepared for detection under `datasets/food/`; polygon annotations
were converted to bounding boxes, and duplicate box/polygon annotations were
deduplicated. The original unlabeled photos are preserved under
`datasets/food/unlabeled/images/` and are not included in training.

`food.yaml` maps the current classes in this order:

`0 asparagus`, `1 bell_pepper`, `2 broccoli`, `3 cabbage`, `4 carrot`,
`5 squash`, `6 tomato`.

There is no spinach example in the supplied annotation export, so spinach is
not included in the active class list. Add labeled spinach images and a class
entry if you want to train for spinach.

### Complete the dataset

The supplied export has no validation images. Add separate, annotated photos
to the validation folders before training:

```text
datasets/food/
  images/
    train/
    val/
  labels/
    train/
    val/
```

For each image, add a same-named `.txt` label file to the matching labels
folder. Each line is
`class_id x_center y_center width height`, with coordinates normalized to
the range 0–1. Images with no target food should have an empty label file.
Keep images of the same scene or capture session in only one split to avoid
near-duplicate leakage.
The current export has only one training image per class, so it is a format
example rather than enough data for a reliable model. Add many varied training
photos and separate validation photos for each class before training.

### Train and run

With the project virtual environment active, fine-tune a pretrained model:

```powershell
python train.py --data food.yaml --epochs 100 --imgsz 768
```

Training automatically evaluates against the validation split. The best
weights are saved to `runs/detect/food/weights/best.pt`. Run detection with
those weights:

```powershell
python detect.py vegetables.jpg --model runs/detect/food/weights/best.pt --imgsz 768
```

For a pretrained baseline before training, omit `--model` (it defaults to
`yolo11s.pt`). `--conf` adjusts the detection confidence threshold; it changes
the false-positive/missed-detection tradeoff, not the model's underlying
accuracy. Compare models using validation results and images representative
of the app's real camera, lighting, and food presentations.
