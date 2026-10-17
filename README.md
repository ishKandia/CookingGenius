# CookingGenius
DubHacks 2026 project.

## Food object detection

The detector is configured for five classes present in the Roboflow
`Combined Vegetables - Fruits` dataset: tomato, broccoli, carrot, bell pepper,
and cucumber. The export has no spinach annotations, so this model does not
detect spinach. `food.yaml` maps the selected labels into these five classes.
The generated `target-vegetables` dataset hard-links the source images,
filters and remaps only these classes, and keeps the existing held-out
validation split separate.

The source export is licensed CC BY 4.0. Preserve the license and attribution
information in `Combined Vegetables - Fruits.v1i.yolov8/README.roboflow.txt`
when redistributing the dataset or derived weights.

### Validate data and train

Run these commands from the repository root in PowerShell:

```powershell
.\.venv\Scripts\python.exe prepare_food_dataset.py
.\.venv\Scripts\python.exe train.py --data food.yaml --check-only
.\.venv\Scripts\python.exe train.py --data food.yaml --model yolo11n.pt --epochs 5 --imgsz 416 --batch 8 --fraction 0.1 --name vegetables
```

The second command is a CPU-friendly first fine-tune using 10% of the selected
training images per epoch. It is an experiment, not a guarantee of production
accuracy; evaluate the model on real photos before relying on it. This machine
has CPU-only PyTorch, so training all images or many more epochs can take a
long time.

The best weights are saved to
`runs\detect\vegetables\weights\best.pt`.

### Run detection

After training, use the fine-tuned five-class model:

```powershell
.\.venv\Scripts\python.exe detect.py vegetables.jpg
```

The annotated result is saved as `detected.jpg`. Adjust the confidence
threshold with `--conf`. The model detects only the five classes in
`food.yaml`; spinach requires labeled spinach examples and a new training run.
