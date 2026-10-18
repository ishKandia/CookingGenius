"""Small HTTP API for analyzing uploaded photos with Florence-2."""

import io
import os
import threading

import transformers
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from transformers import AutoModelForCausalLM, AutoProcessor


if int(transformers.__version__.split(".", 1)[0]) >= 5:
    raise RuntimeError(
        "Florence-2 requires Transformers 4.x. Install compatible dependencies "
        "with: py -3.12 -m pip install -r requirements-florence.txt"
    )

MODEL_ID = "microsoft/Florence-2-base"
TASK = "<OD>"
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 40_000_000
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

app = FastAPI(title="Florence-2 Food Scanner")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("FLORENCE_ALLOWED_ORIGINS", "*").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

_detector = None
_detector_lock = threading.RLock()


def _get_detector():
    """Load Florence once per process, retrying if an initial load fails."""
    global _detector
    if _detector is None:
        with _detector_lock:
            if _detector is None:
                try:
                    model = AutoModelForCausalLM.from_pretrained(
                        MODEL_ID,
                        trust_remote_code=True,
                        attn_implementation="eager",
                    )
                    processor = AutoProcessor.from_pretrained(
                        MODEL_ID,
                        trust_remote_code=True,
                    )
                    model.eval()
                    _detector = (model, processor)
                except Exception as error:
                    raise HTTPException(
                        status_code=503,
                        detail=(
                            "Florence-2 could not be loaded. Check the model "
                            "dependencies and Hugging Face access, then retry. "
                            f"({type(error).__name__})"
                        ),
                    ) from error
    return _detector


def _decode_image(contents: bytes) -> Image.Image:
    if not contents:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")
    try:
        with Image.open(io.BytesIO(contents)) as source:
            if source.format not in ALLOWED_FORMATS:
                raise HTTPException(
                    status_code=415,
                    detail="Use a JPEG, PNG, or WebP image.",
                )
            if source.width * source.height > MAX_IMAGE_PIXELS:
                raise HTTPException(
                    status_code=413,
                    detail="The photo dimensions are too large. Choose an image under 40 megapixels.",
                )
            source.verify()
        with Image.open(io.BytesIO(contents)) as source:
            return source.convert("RGB")
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid image.",
        ) from error


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
def analyze_image(file: UploadFile = File(...)):
    contents = file.file.read(MAX_IMAGE_BYTES + 1)
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="The photo is too large. Upload an image under 10 MB.",
        )
    image = _decode_image(contents)

    # Serialize inference as well as initialization to avoid concurrent model
    # generation exhausting memory on CPU-only development machines.
    with _detector_lock:
        model, processor = _get_detector()
        try:
            inputs = processor(text=TASK, images=image, return_tensors="pt")
            generated_ids = model.generate(
                input_ids=inputs["input_ids"],
                pixel_values=inputs["pixel_values"],
                max_new_tokens=256,
            )
            generated_text = processor.batch_decode(
                generated_ids,
                skip_special_tokens=False,
            )[0]
            result = processor.post_process_generation(
                generated_text,
                task=TASK,
                image_size=image.size,
            )[TASK]
        except HTTPException:
            raise
        except Exception as error:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Florence-2 could not analyze this photo. Try another image "
                    f"or restart the scanner. ({type(error).__name__})"
                ),
            ) from error

    detections = [
        {
            "label": str(label),
            "bbox": [float(coordinate) for coordinate in box],
        }
        for box, label in zip(result["bboxes"], result["labels"])
    ]
    return {
        "detections": detections,
        "image_size": {"width": image.width, "height": image.height},
    }
