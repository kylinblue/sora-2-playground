# Sora API Playground

A full-stack web application for experimenting with OpenAI's Sora video generation API. Generate, monitor, remix, and manage videos with an intuitive interface.

![Sora Playground](https://img.shields.io/badge/OpenAI-Sora%20API-412991?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-0.118.0-009688?style=flat-square)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square)

## Features

- **Video Generation**: Create videos from text prompts using Sora 2 or Sora 2 Pro models
- **Real-time Progress**: Monitor video generation with live progress bars and status updates
- **Reference Images**: Use input images to guide video generation
- **Remix Videos**: Create variations of existing videos with new prompts
- **Video Management**: View, download, and delete videos from your library
- **Secure API Key Storage**: Store your OpenAI API key locally in browser storage
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **OpenAI Python SDK** - Official SDK for Sora API
- **Uvicorn** - ASGI server

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Axios** - HTTP client

## Prerequisites

- Python 3.8 or higher
- Node.js 18 or higher
- npm or yarn
- OpenAI API key with Sora API access

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd sora-2-playground
```

### 2. Backend Setup

```bash
cd backend

# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

## Running the Application

### Start the Backend

```bash
cd backend
python main.py
```

The backend will start on `http://localhost:8000`

### Start the Frontend

In a new terminal:

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

## Usage

### 1. Configure API Key

1. Open the application in your browser at `http://localhost:5173`
2. Enter your OpenAI API key in the input field
3. Click "Save Key" - the key will be stored in your browser's local storage

### 2. Create a Video

1. Enter a detailed prompt describing your video
2. Select the model:
   - **Sora 2**: Faster, good for prototyping and social media
   - **Sora 2 Pro**: Higher quality, best for production
3. Choose duration (4-20 seconds)
4. Select resolution (portrait, landscape, or square)
5. Optionally upload a reference image
6. Click "Generate Video"

### 3. Monitor Progress

- Videos appear in the gallery immediately with their status
- Watch the progress bar update in real-time
- The card will automatically update when generation completes

### 4. View Videos

- Click on a completed video thumbnail to open the player
- Use the built-in video controls to play/pause
- Download the video using the download button

### 5. Remix Videos

1. Click the "Remix" button on any completed video
2. Enter a prompt describing the changes you want
3. Click "Create Remix"
4. The remix will appear as a new video in your gallery

### 6. Manage Videos

- **Refresh**: Click the refresh button to reload your video library
- **Delete**: Click the delete button to remove a video from storage
- **Download**: Download videos to your local machine

## API Endpoints

The backend provides the following endpoints:

- `POST /api/videos` - Create a new video
- `GET /api/videos/{video_id}` - Get video status
- `GET /api/videos/{video_id}/content` - Download video content
- `GET /api/videos` - List all videos
- `DELETE /api/videos/{video_id}` - Delete a video
- `POST /api/videos/{video_id}/remix` - Remix a video

## Configuration

### Backend CORS

The backend is configured to accept requests from:
- `http://localhost:5173` (Vite default)
- `http://localhost:3000` (React default)

To add more origins, edit `backend/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://your-domain.com"],
    # ...
)
```

### Frontend Proxy

The frontend proxies API requests to the backend. This is configured in `frontend/vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true
    }
  }
}
```

### Custom API Key (Gift Code)

You can configure a custom "gift code" that users can enter instead of their own OpenAI API key. This is useful for sharing access with friends or creating demo accounts without exposing your actual API key.

**Setup:**

1. Create a `.env` file in the `backend/` directory:

```bash
cd backend
cp .env.example .env
```

2. Edit the `.env` file and set your custom key:

```bash
CUSTOM_API_KEY_NAME=SORA-GIFT-2024
CUSTOM_API_KEY_VALUE=sk-your-actual-openai-api-key-here
```

3. Restart the backend server

**Usage:**

- Users can now enter `SORA-GIFT-2024` instead of an actual OpenAI API key
- The backend will automatically use your configured OpenAI API key
- Multiple users can share the same gift code
- Each user's video history is still kept separate in their browser's local storage

**Security Notes:**

- The gift code can be any string (doesn't need to start with `sk-`)
- Choose a hard-to-guess gift code to prevent unauthorized use
- Your actual API key is only stored in the backend `.env` file
- Users never see your actual OpenAI API key

## Project Structure

```
sora-2-playground/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variables example
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── ApiKeyInput.tsx
│   │   │   ├── VideoCreationForm.tsx
│   │   │   ├── VideoGallery.tsx
│   │   │   └── VideoPlayer.tsx
│   │   ├── hooks/           # Custom React hooks
│   │   │   └── useApiKey.tsx
│   │   ├── services/        # API service layer
│   │   │   └── api.ts
│   │   ├── types/           # TypeScript types
│   │   │   └── index.ts
│   │   ├── App.tsx          # Main app component
│   │   ├── main.tsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.js
├── docs.md                  # Sora API documentation
└── README.md
```

## Security Notes

- **API Key Storage**: Your API key is stored in browser's local storage and never sent to any third-party servers
- **Backend Proxy**: The backend acts as a proxy to protect CORS and add additional security if needed
- **No Server-Side Storage**: API keys are not stored on the backend server

## Troubleshooting

### Backend Issues

**Port already in use**:
```bash
# Change the port in backend/main.py
uvicorn.run(app, host="0.0.0.0", port=8001)
```

**Package installation fails**:
```bash
# Try upgrading pip
pip install --upgrade pip
pip install -r requirements.txt
```

### Frontend Issues

**Port already in use**:
```bash
# Specify a different port
npm run dev -- --port 3000
```

**Build fails**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### API Issues

**Authentication errors**:
- Verify your API key is correct and has Sora API access
- Check that the key starts with `sk-`
- Clear the stored key and re-enter it

**Rate limiting**:
- The Sora API has rate limits per model and tier
- Wait a few moments before retrying
- Check your usage dashboard on platform.openai.com

## Development

### Backend Development

```bash
cd backend
python main.py
```

The API documentation is available at `http://localhost:8000/docs`

### Frontend Development

```bash
cd frontend
npm run dev
```

Hot reload is enabled by default with Vite.

### Building for Production

**Backend**:
```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Frontend**:
```bash
npm run build
npm run preview
```

## Deployment

### Deploy to Railway

This project is configured for easy deployment to Railway.

**Quick Deploy:**

1. Push your code to GitHub
2. Go to [Railway](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will automatically detect the `Dockerfile` and deploy

**Environment Variables:**

Set these in Railway's environment variables:

```bash
# Optional: Configure gift code
CUSTOM_API_KEY_NAME=SORA-GIFT-2024
CUSTOM_API_KEY_VALUE=sk-your-actual-openai-api-key
```

**Important Notes:**

- Railway automatically sets the `PORT` environment variable
- The Dockerfile builds the frontend and serves it from the backend
- CORS is configured to allow all origins in production
- Static files are served from the `/static` directory
- The app will be available at your Railway-provided URL

**Manual Deployment:**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up
```

### Deploy to Other Platforms

The Dockerfile works with any platform that supports Docker:

- **Render**: Connect your repo and select "Docker" as runtime
- **Fly.io**: Use `fly launch` to deploy
- **Google Cloud Run**: Push to GCR and deploy
- **AWS ECS**: Build and push to ECR, then create an ECS service

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Resources

- [OpenAI Sora API Documentation](https://platform.openai.com/docs/api-reference/videos)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)

## Support

For issues, questions, or contributions, please open an issue on the GitHub repository.