"""Small HTTP API for analyzing uploaded photos with Florence-2."""

import io
import os
import threading

import transformers
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field
from transformers import AutoModelForCausalLM, AutoProcessor

from profile_store import profile_store


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
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["*"],
)

_detector = None
_detector_lock = threading.RLock()
_bearer = HTTPBearer(auto_error=False)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=10, max_length=256)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=256)


class UpdateProfileRequest(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    email: str = Field(min_length=3, max_length=254)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=10, max_length=256)


class RecordCookRequest(BaseModel):
    recipe_name: str = Field(min_length=1, max_length=120)
    completed_steps: int = Field(ge=0, le=100)
    total_steps: int = Field(ge=1, le=100)


def _store_error(error: ValueError) -> HTTPException:
    return HTTPException(status_code=400, detail=str(error))


def _current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Sign in to access your profile.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    profile = profile_store.profile_for_token(credentials.credentials)
    if profile is None:
        raise HTTPException(
            status_code=401,
            detail="Your session has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return profile


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


@app.post("/auth/register")
def register_account(request: RegisterRequest):
    try:
        token, profile = profile_store.register(request.name, request.email, request.password)
    except ValueError as error:
        raise _store_error(error) from error
    return {"token": token, "profile": profile}


@app.post("/auth/login")
def login_account(request: LoginRequest):
    try:
        token, profile = profile_store.login(request.email, request.password)
    except ValueError as error:
        raise _store_error(error) from error
    return {"token": token, "profile": profile}


@app.post("/auth/logout")
def logout_account(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    _user: dict = Depends(_current_user),
):
    profile_store.logout(credentials.credentials)
    return {"status": "signed_out"}


@app.get("/profile")
def get_profile(user: dict = Depends(_current_user)):
    return {"profile": user, "history": profile_store.history_for_user(user["id"])}


@app.patch("/profile")
def update_profile(request: UpdateProfileRequest, user: dict = Depends(_current_user)):
    try:
        profile = profile_store.update_profile(user["id"], request.name, request.email)
    except ValueError as error:
        raise _store_error(error) from error
    return {"profile": profile}


@app.post("/profile/password")
def change_password(
    request: ChangePasswordRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    user: dict = Depends(_current_user),
):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Sign in to update your password.")
    try:
        profile_store.change_password(
            user["id"],
            request.current_password,
            request.new_password,
            credentials.credentials,
        )
    except ValueError as error:
        raise _store_error(error) from error
    return {"status": "password_updated"}


@app.post("/profile/cook")
def record_cook(request: RecordCookRequest, user: dict = Depends(_current_user)):
    try:
        return profile_store.record_cook(
            user["id"],
            request.recipe_name,
            request.completed_steps,
            request.total_steps,
        )
    except ValueError as error:
        raise _store_error(error) from error


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
