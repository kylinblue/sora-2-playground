from fastapi import FastAPI, HTTPException, Header, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional
from openai import OpenAI, AsyncOpenAI
import httpx
from pydantic import BaseModel
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Optional custom API key configuration
CUSTOM_API_KEY_NAME = os.getenv("CUSTOM_API_KEY_NAME")  # e.g., "GIFT-2024-SPECIAL"
CUSTOM_API_KEY_VALUE = os.getenv("CUSTOM_API_KEY_VALUE")  # e.g., "sk-..."

app = FastAPI(title="Sora API Playground")

# CORS middleware for local development and production
# In production, Railway will handle the domain
allowed_origins = ["http://localhost:5173", "http://localhost:3000"]
# Allow Railway domain if RAILWAY_STATIC_URL is set
if railway_url := os.getenv("RAILWAY_STATIC_URL"):
    allowed_origins.append(f"https://{railway_url}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins + ["*"],  # Allow all in production for Railway
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VideoCreateRequest(BaseModel):
    prompt: str
    model: str = "sora-2"
    seconds: Optional[str] = "4"
    size: Optional[str] = "720x1280"


class RemixRequest(BaseModel):
    prompt: str


class PromptImproveRequest(BaseModel):
    prompt: str


def get_openai_client(api_key: str) -> OpenAI:
    """
    Create OpenAI client with user's API key

    Supports custom gift codes via environment variables:
    - If CUSTOM_API_KEY_NAME is set and matches the provided key,
      uses CUSTOM_API_KEY_VALUE as the actual OpenAI API key
    """
    if not api_key or not api_key.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid API key format. Use 'Bearer sk-...'")

    key = api_key.replace("Bearer ", "")

    # Check if this is a custom gift code
    if CUSTOM_API_KEY_NAME and CUSTOM_API_KEY_VALUE:
        if key == CUSTOM_API_KEY_NAME:
            print(f"Using custom API key for gift code: {CUSTOM_API_KEY_NAME}")
            key = CUSTOM_API_KEY_VALUE

    return OpenAI(api_key=key)


@app.post("/api/videos")
async def create_video(
    prompt: str = Form(...),
    model: str = Form("sora-2"),
    seconds: str = Form("4"),
    size: str = Form("720x1280"),
    input_reference: Optional[UploadFile] = File(None),
    authorization: str = Header(...)
):
    """
    Create a new video generation job

    Parameters:
    - prompt: Text description of the video to generate
    - model: sora-2 or sora-2-pro
    - seconds: Duration in seconds (4-20)
    - size: Resolution (e.g., 720x1280, 1280x720, 1024x1024)
    - input_reference: Optional image file to use as first frame
    """
    try:
        client = get_openai_client(authorization)

        # Prepare request parameters
        params = {
            "model": model,
            "prompt": prompt,
            "seconds": seconds,
            "size": size
        }

        # Handle file upload if provided
        if input_reference:
            file_content = await input_reference.read()
            file_tuple = (input_reference.filename, file_content, input_reference.content_type)
            params["input_reference"] = file_tuple

        # Create video job
        video = client.videos.create(**params)

        return {
            "id": video.id,
            "object": video.object,
            "model": video.model,
            "status": video.status,
            "progress": getattr(video, "progress", 0),
            "created_at": video.created_at,
            "size": video.size,
            "seconds": video.seconds
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/videos/{video_id}")
async def get_video_status(
    video_id: str,
    authorization: str = Header(...)
):
    """
    Get the status and progress of a video generation job

    Returns job details including status (queued, in_progress, completed, failed)
    and progress percentage if available.
    """
    try:
        client = get_openai_client(authorization)
        video = client.videos.retrieve(video_id)

        response = {
            "id": video.id,
            "object": video.object,
            "model": video.model,
            "status": video.status,
            "progress": getattr(video, "progress", 0),
            "created_at": video.created_at,
            "size": video.size,
            "seconds": video.seconds
        }

        # Add optional fields if present
        if hasattr(video, "completed_at"):
            response["completed_at"] = video.completed_at
        if hasattr(video, "expires_at"):
            response["expires_at"] = video.expires_at
        if hasattr(video, "error"):
            response["error"] = video.error
        if hasattr(video, "remixed_from_video_id"):
            response["remixed_from_video_id"] = video.remixed_from_video_id

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/videos/{video_id}/content")
async def download_video_content(
    video_id: str,
    variant: str = Query("video", description="video, thumbnail, or spritesheet"),
    authorization: str = Header(...)
):
    """
    Download the video content (MP4), thumbnail (WebP), or spritesheet (JPG)

    Parameters:
    - variant: Type of content to download (video, thumbnail, spritesheet)
    """
    try:
        client = get_openai_client(authorization)

        # Use the download_content method with variant
        content = client.videos.download_content(video_id, variant=variant)

        # Determine content type based on variant
        content_type_map = {
            "video": "video/mp4",
            "thumbnail": "image/webp",
            "spritesheet": "image/jpeg"
        }
        content_type = content_type_map.get(variant, "application/octet-stream")

        # Return as streaming response
        return StreamingResponse(
            iter([content.read()]),
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{video_id}.{variant}.{"mp4" if variant == "video" else "webp" if variant == "thumbnail" else "jpg"}"'
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/videos")
async def list_videos(
    video_ids: Optional[str] = Query(None, description="Comma-separated list of video IDs"),
    authorization: str = Header(...)
):
    """
    Get status for specific videos by ID

    Parameters:
    - video_ids: Comma-separated list of video IDs (e.g., "id1,id2,id3")

    Returns video status for each provided ID. Videos are fetched individually
    to support multi-user scenarios with shared API keys.
    """
    try:
        client = get_openai_client(authorization)

        if not video_ids:
            # Return empty list if no IDs provided
            return {
                "object": "list",
                "data": []
            }

        # Split comma-separated IDs
        ids = [vid.strip() for vid in video_ids.split(",") if vid.strip()]

        videos_data = []
        for video_id in ids:
            try:
                video = client.videos.retrieve(video_id)
                videos_data.append({
                    "id": video.id,
                    "object": video.object,
                    "model": video.model,
                    "status": video.status,
                    "progress": getattr(video, "progress", 0),
                    "created_at": video.created_at,
                    "size": getattr(video, "size", None),
                    "seconds": getattr(video, "seconds", None),
                    "completed_at": getattr(video, "completed_at", None),
                    "error": getattr(video, "error", None),
                    "remixed_from_video_id": getattr(video, "remixed_from_video_id", None)
                })
            except Exception as e:
                # Skip videos that can't be retrieved (deleted, etc.)
                print(f"Failed to retrieve video {video_id}: {e}")
                continue

        return {
            "object": "list",
            "data": videos_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/videos/{video_id}")
async def delete_video(
    video_id: str,
    authorization: str = Header(...)
):
    """Delete a video from OpenAI storage"""
    try:
        client = get_openai_client(authorization)
        result = client.videos.delete(video_id)

        return {
            "id": video_id,
            "deleted": True
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/videos/{video_id}/remix")
async def remix_video(
    video_id: str,
    request: RemixRequest,
    authorization: str = Header(...)
):
    """
    Create a remix of an existing completed video

    Parameters:
    - video_id: ID of the source video to remix
    - prompt: New prompt describing the changes to make
    """
    try:
        client = get_openai_client(authorization)

        video = client.videos.remix(
            video_id=video_id,
            prompt=request.prompt
        )

        return {
            "id": video.id,
            "object": video.object,
            "model": video.model,
            "status": video.status,
            "progress": getattr(video, "progress", 0),
            "created_at": video.created_at,
            "size": video.size,
            "seconds": video.seconds,
            "remixed_from_video_id": getattr(video, "remixed_from_video_id", video_id)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/prompts/improve")
async def improve_prompt(
    request: PromptImproveRequest,
    authorization: str = Header(...)
):
    """
    Use AI to improve a Sora video prompt based on best practices

    Parameters:
    - prompt: The original prompt to improve

    Returns an improved version of the prompt optimized for Sora video generation
    """
    try:
        client = get_openai_client(authorization)

        system_prompt = """You are an expert at crafting prompts for OpenAI's Sora video generation model. Your job is to take a user's basic prompt and enhance it following the official Sora 2 Prompting Guide.

CORE PRINCIPLES:

1. CLARITY OVER VAGUENESS
Transform vague descriptions into concrete, filmable details:
- "beautiful street" → "wet asphalt, zebra crosswalk, neon signs reflecting in puddles"
- "person moves" → "cyclist pedals three times, brakes at crosswalk"
- "cinematic look" → "anamorphic 2.0x lens, shallow DOF, volumetric light"

2. CAMERA & FRAMING
Be specific about camera work:
- Framing: wide establishing shot, medium close-up, aerial shot, etc.
- Angle: eye level, low angle, slight downward angle, over-shoulder
- Movement: slowly tilting camera, handheld ENG camera, slow dolly left, tracking shot
- Depth of field: shallow (sharp subject, blurred background) or deep focus

3. LIGHTING & COLOR
Describe lighting with precision:
- Quality: soft window light, hard single source, diffuse overhead
- Direction: warm backlight, cool rim from hallway, key from camera left
- Palette: Include 3-5 color anchors (amber, cream, walnut brown, slate blue, etc.)

4. VISUAL STYLE & ERA
Set a clear aesthetic tone:
- Film types: "1970s film on 35mm," "16mm black-and-white documentary," "90s documentary-style"
- Look: "hand-painted 2D/3D hybrid," "IMAX-scale," "vintage commercial"
- Technical: "180° shutter," "slight gate weave," "natural flares," "soft focus"

5. ACTION & TIMING
Keep motion simple and break actions into clear beats:
- One camera move + one subject action per shot
- Use specific counts: "takes four steps to window, pauses, pulls curtain in final second"
- Describe gestures precisely: "taps bulb; sparks crackle; flinches; drops bulb; catches it"

6. MOTION CONTROL
The model follows instructions more reliably in shorter clips. Keep shots concise with single, clear actions.

7. DIALOGUE & SOUND
- Format dialogue in a separate section below the prose
- Keep lines brief and natural
- Label speakers consistently in multi-character scenes
- Background sound: suggest ambient audio (rain, traffic hiss, espresso machine hum)

RECOMMENDED STRUCTURE:

[Optional: Style note - film era, aesthetic, technical specs]

[Prose scene description with specific visual details - characters, setting, weather, costumes]

Cinematography:
Camera shot: [specific framing and angle]
Lens: [if relevant - 35mm, 50mm, etc.]
Lighting: [quality, direction, and source]
Mood: [overall tone]

Actions:
- [Action 1: specific beat with timing]
- [Action 2: another clear gesture]
- [Action 3: final movement or pause]

Dialogue: [if applicable]
- [Character name]: "[Brief, natural line]"
- [Character name]: "[Response]"

Background Sound: [if applicable]
[Ambient audio cues - keep minimal and diegetic]

IMPORTANT NOTES:
- Shorter, lighter prompts give the model creative freedom (expect surprising results)
- Longer, detailed prompts provide control but may not always be followed perfectly
- Avoid describing multiple shots unless needed - focus on one clear shot
- Characters: Keep descriptions consistent to maintain identity
- Leave some details open for creative interpretation unless control is critical

Return ONLY the improved prompt following this structure. No meta-commentary or explanations."""

        response = client.chat.completions.create(
            model="o3-mini",
            reasoning_effort="medium",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Improve this Sora video prompt following the official Sora 2 Prompting Guide:\n\n{request.prompt}"}
            ]
        )

        improved_prompt = response.choices[0].message.content.strip()

        return {
            "original": request.prompt,
            "improved": improved_prompt
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Health check endpoint for development mode
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "Sora API Playground Backend"}


# Serve static files in production (when static directory exists)
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    # Mount static files
    app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")

    # Serve index.html for all other routes (SPA support)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the SPA for all non-API routes"""
        # Don't serve index.html for API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")

        index_file = static_dir / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Not found")
else:
    # In development mode, return health check at root
    @app.get("/")
    async def root():
        """Health check endpoint for development"""
        return {"status": "ok", "message": "Sora API Playground Backend (Development Mode)"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
