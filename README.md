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

## Florence-2 object detection

Florence-2's custom model code is compatible with Transformers 4.45.2; newer
releases can break Florence-2 generation. The repository pins Python 3.12.10
in `.python-version`; keep Render's service root set to the repository root so
it uses this version instead of its Python 3.14 default.
Create a **Read** access token at
<https://huggingface.co/settings/tokens>, then authenticate locally. This
interactive prompt stores the token in your Hugging Face user cache; do not put
the token in source files or share it:

```powershell
py -3.12 -c "from huggingface_hub import login; login()"
```

Install Florence-2's dependencies and run the detector from the repository
root:

```powershell
py -3.12 -m pip install -r requirements-florence.txt
py -3.12 florence.py vegetables.jpg
```

The annotated image is saved as `florence-detected.jpg`; pass another image
path or use `--output` to choose a different file. Florence-2 detects general
objects and reports their labels and bounding boxes, but does not provide the
confidence scores or the five-class restriction of the trained YOLO model.

### Run the website's photo scanner

The React app uploads captured or selected JPEG, PNG, or WebP photos to a
Florence-2 API. In one terminal from the repository root, install the
dependencies above and start the API:

```powershell
py -3.12 -m pip install -r requirements-florence.txt
py -3.12 -m uvicorn florence_api:app --host 0.0.0.0 --port 8000
```

Start the website from `Cooking Collaboration App` in another terminal using
`pnpm dev`. In development the app connects to `http://localhost:8000`.

For a static website deployment, the Florence API must also be hosted at a
public HTTPS address; it cannot be included in the frontend `dist` bundle.
Before or after uploading `dist`, edit `florence-config.js` and set
`florenceApiUrl` to the API's base URL (for example,
`https://api.example.com`). Configure the API's `FLORENCE_ALLOWED_ORIGINS`
environment variable to include the website's exact origin, then rebuild if
you edited the source copy before building. The website reports a setup message
if a production build has no API URL configured. The first photo scan downloads
and loads the model, and later scans reuse it. Photos are limited to 10 MB and
40 megapixels.

The saved token is picked up automatically by Hugging Face Hub. Authentication
can help with unauthenticated-request limits, but it does not guarantee faster
downloads; a stalled transfer may also be caused by network or cache issues.

### Cooking score and meal benefits

The website does not currently require an account. The cooking score is based
on completed recipe steps and is shown with ingredient-based meal benefits.
The time comparison uses an illustrative 40-minute fast-food pickup estimate;
actual pickup and cooking times vary. Benefit descriptions are general
ingredient information, not a nutritional analysis or medical advice.
