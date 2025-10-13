# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sora API Playground is a full-stack web application for experimenting with OpenAI's Sora video generation API. It consists of a FastAPI backend (Python) that proxies requests to the Sora API and a React/TypeScript frontend with Vite.

## Development Commands

### Backend (Python/FastAPI)

```bash
# Setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt  # Includes opencv-python and pillow for frame extraction

# Run development server
python main.py  # Starts on http://localhost:8000

# View API docs (when running)
# http://localhost:8000/docs
```

### Frontend (React/TypeScript/Vite)

```bash
# Setup
cd frontend
npm install

# Run development server
npm run dev  # Starts on http://localhost:5173

# Build for production
npm run build  # Output to dist/

# Preview production build
npm run preview
```

### Docker/Production

```bash
# Build and run with Docker (multi-stage build)
docker build -t sora-playground .
docker run -p 8000:8000 sora-playground

# The Dockerfile builds the frontend and serves it from the backend
```

## Architecture

### Backend Architecture (backend/main.py)

- **FastAPI application** with CORS middleware for cross-origin requests
- **API key management**: Supports both user-provided OpenAI keys and custom "gift codes" via environment variables
  - `get_openai_client()` function (lines 49-68) handles API key resolution
  - If `CUSTOM_API_KEY_NAME` matches the provided key, uses `CUSTOM_API_KEY_VALUE` instead
  - API keys passed as `Bearer` tokens in `Authorization` header
- **No server-side storage**: Video IDs are tracked client-side in localStorage
- **Static file serving**: In production mode, serves built frontend from `static/` directory (lines 327-344)
- **Video endpoints**:
  - `POST /api/videos`: Create video (supports multipart form data for image uploads)
  - `GET /api/videos/{video_id}`: Get video status/progress
  - `GET /api/videos/{video_id}/content?variant=video|thumbnail|spritesheet`: Download video content
  - `GET /api/videos/{video_id}/frame?position=first|last`: Extract first or last frame from video as PNG image
  - `GET /api/videos?video_ids=id1,id2,id3`: List videos by comma-separated IDs
  - `DELETE /api/videos/{video_id}`: Delete video
  - `POST /api/videos/{video_id}/remix`: Create remix with new prompt
  - `POST /api/prompts/improve`: AI-powered prompt enhancement using o3-mini and Sora prompting guide
  - `POST /api/images/generate`: Generate reference images using gpt-image-1 (size matched to video dimensions)

### Frontend Architecture

#### State Management (React Context)

Two main contexts handle application state:

1. **ApiKeyContext** (frontend/src/hooks/useApiKey.tsx)
   - Manages OpenAI API key in localStorage (`openai_api_key`)
   - Automatically syncs key with `apiService` on changes
   - Provides: `apiKey`, `setApiKey()`, `clearApiKey()`, `hasApiKey`

2. **VideoIdsContext** (frontend/src/hooks/useVideoIds.tsx)
   - Manages list of video IDs in localStorage (`sora_video_ids`)
   - Videos are tracked client-side only (no backend storage)
   - Provides: `videoIds`, `addVideoId()`, `removeVideoId()`, `clearVideoIds()`

#### API Service Layer (frontend/src/services/api.ts)

- **Singleton service** (`apiService`) that handles all backend communication
- Uses axios with request interceptor to automatically inject `Authorization` header
- Base URL is `/api` (proxied to backend via Vite config)
- **Integrated with cache service**: Automatically checks IndexedDB cache before downloading
- Key methods:
  - `setApiKey(key)`: Update authorization header
  - `createVideo(params)`: Submit video generation job
  - `getVideoStatus(videoId)`: Poll for status updates
  - `listVideos(videoIds[])`: Batch fetch video statuses
  - `remixVideo(videoId, prompt)`: Create remix
  - `downloadVideo(videoId, variant)`: Download with automatic caching
  - `deleteVideo(videoId)`: Delete video and clear associated cache
  - `getVideoUrl(videoId, variant)`: Get streaming URL for playback
  - `improvePrompt(prompt)`: Enhance prompt using AI
  - `extractVideoFrame(videoId, position)`: Extract first/last frame as PNG blob
  - `generateImage(prompt, size)`: Generate reference image using gpt-image-1

#### Media Cache Service (frontend/src/services/cache.ts)

- **IndexedDB-based caching** for videos, thumbnails, and spritesheets
- Prevents issues when OpenAI download links expire
- Stores binary blobs with metadata (variant type, timestamp)
- Automatic cache-first strategy: checks cache before downloading
- Key methods:
  - `get(videoId, variant)`: Retrieve cached media blob
  - `set(videoId, variant, blob)`: Store media in cache
  - `delete(videoId, variant?)`: Remove specific or all variants
  - `clear()`: Clear entire cache
  - `getStats()`: Get cache statistics (count, total size)
- Database: `sora-media-cache` with `media` object store
- Cache keys: `{videoId}-{variant}` format

#### Component Structure

- **App.tsx**: Main app component with context providers and video management logic
  - Handles frame extraction workflow: extracts frame → creates File object → passes to form
- **ApiKeyInput.tsx**: API key input form (saved to localStorage)
- **VideoCreationForm.tsx**: Form for creating new videos (prompt, model, duration, size, optional reference image)
  - Includes "Enhance with AI" button that uses o3-mini to optimize prompts
  - Integrated ImageGenerator component for AI-powered reference image creation
  - Supports manual file upload or AI generation (mutually exclusive)
  - Accepts extracted frames from parent via initialReferenceImage prop
- **ImageGenerator.tsx**: AI-powered reference image generator using gpt-image-1
  - Automatically matches image size to selected video dimensions
  - Displays generated image with prompt details
- **PromptSuggestionModal.tsx**: Modal for displaying AI-enhanced prompt suggestions
- **VideoGallery.tsx**: Grid display of videos with status, progress bars, and actions
  - Includes cache clear button with stats shown on hover
- **VideoPlayer.tsx**: Modal video player with download/remix options
  - "Use First Frame" and "Use Last Frame" buttons for frame extraction workflow
- **CacheStatus.tsx**: Exports useCacheStats hook for cache management

#### Data Flow

1. User enters API key → stored in `ApiKeyContext` → synced to localStorage
2. User creates video → `apiService.createVideo()` → video ID added to `VideoIdsContext`
3. Gallery polls `apiService.listVideos()` with all stored video IDs
4. Each video card shows real-time status (queued, in_progress, completed, failed)
5. Completed videos can be played, downloaded, or remixed

### Key Architectural Decisions

- **Client-side video tracking**: Each user's video list is stored in their browser's localStorage, not on the server. This allows multiple users to share the same API key (gift code) while maintaining separate video libraries.
- **API key proxying**: The backend acts as a proxy to the Sora API. This allows for the "gift code" feature where users can enter a custom key that maps to a real OpenAI API key server-side.
- **No authentication**: The app relies on API key validation by OpenAI. There's no user authentication system.
- **Stateless backend**: The backend doesn't store any user data or video metadata. All state is managed client-side.
- **IndexedDB caching**: Videos and thumbnails are cached in the browser's IndexedDB to persist after OpenAI download links expire. This provides offline access to previously downloaded content and improves performance.
- **AI-powered prompt enhancement**: Uses o3-mini with the official Sora 2 Prompting Guide to transform basic prompts into production-ready, detailed prompts optimized for video generation. The enhancement adds camera framing, lighting details, color palettes, timed actions, and proper structure.
- **AI-powered reference image generation**: Uses gpt-image-1 to generate reference images from text prompts, automatically matching the image size to the selected video dimensions. This allows users to create custom first-frame references for their videos without needing external image tools.
- **Video frame extraction**: Allows users to extract the first or last frame from completed videos and use them as reference images for new video generation. This enables continuation and variation workflows (e.g., "continue the action from the last frame" or "remix the opening scene").

## Configuration

### Backend Environment Variables (backend/.env)

```bash
# Optional: Custom "gift code" API key
CUSTOM_API_KEY_NAME=SORA-GIFT-2024
CUSTOM_API_KEY_VALUE=sk-your-actual-openai-api-key
```

### Frontend Proxy Configuration (frontend/vite.config.ts)

Vite proxies `/api` requests to `http://localhost:8000` during development.

### CORS Configuration (backend/main.py lines 22-35)

Allows requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (alternative React port)
- `https://{RAILWAY_STATIC_URL}` (if Railway deployment)
- All origins (`*`) in production

## Deployment

Configured for Railway deployment with `railway.json` and multi-stage `Dockerfile`:
1. Stage 1: Builds frontend with Node
2. Stage 2: Sets up Python backend and copies built frontend to `static/`
3. Runs with `gunicorn` + `uvicorn` workers for production performance

The backend automatically serves the frontend in production mode when `static/` directory exists (lines 327-344).

## TypeScript Types (frontend/src/types/index.ts)

- **Video**: Main video object with status, progress, metadata
- **VideoCreateParams**: Parameters for creating new videos
- **VideoListResponse**: Response from list endpoint

Video status values: `queued`, `in_progress`, `completed`, `failed`
