import { useState, useRef, useEffect } from 'react';
import { VideoCreateParams } from '../types';
import { apiService } from '../services/api';
import { PromptSuggestionModal } from './PromptSuggestionModal';
import { ImageGenerator } from './ImageGenerator';

interface VideoCreationFormProps {
  onSubmit: (params: VideoCreateParams) => void;
  disabled?: boolean;
  initialPrompt?: string | null;
  onPromptUsed?: () => void;
  initialReferenceImage?: { file: File; name: string } | null;
  onReferenceImageUsed?: () => void;
}

const SIZE_OPTIONS = [
  { value: '720x1280', label: '720x1280 (Portrait)' },
  { value: '1280x720', label: '1280x720 (Landscape)' },
  { value: '1024x1024', label: '1024x1024 (Square)' },
  { value: '1280x1280', label: '1280x1280 (Square HD)' },
];

const DURATION_OPTIONS = [
  { value: '4', label: '4 seconds' },
  { value: '8', label: '8 seconds' },
  { value: '12', label: '12 seconds' },
  { value: '16', label: '16 seconds' },
  { value: '20', label: '20 seconds' },
];

export function VideoCreationForm({ onSubmit, disabled = false, initialPrompt, onPromptUsed, initialReferenceImage, onReferenceImageUsed }: VideoCreationFormProps) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<'sora-2' | 'sora-2-pro'>('sora-2');
  const [seconds, setSeconds] = useState('8');
  const [size, setSize] = useState('1280x720');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [referenceImageSource, setReferenceImageSource] = useState<'upload' | 'ai' | 'frame' | null>(null);
  const [imageResizeNotice, setImageResizeNotice] = useState<string | null>(null);
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const [improvedPrompt, setImprovedPrompt] = useState<string | null>(null);
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [useAIImage, setUseAIImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle initial prompt from parent (reuse prompt feature)
  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
      onPromptUsed?.(); // Clear the initial prompt after using it
    }
  }, [initialPrompt, onPromptUsed]);

  // Handle initial reference image from parent (frame extraction feature)
  useEffect(() => {
    if (initialReferenceImage) {
      setReferenceImage(initialReferenceImage.file);
      setReferenceImageSource('frame');
      setUseAIImage(false);
      setShowImageGenerator(false);

      // Create preview URL
      const url = URL.createObjectURL(initialReferenceImage.file);
      setReferenceImagePreview(url);

      onReferenceImageUsed?.(); // Clear the initial reference image after using it
    }
  }, [initialReferenceImage, onReferenceImageUsed]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (referenceImagePreview) {
        URL.revokeObjectURL(referenceImagePreview);
      }
    };
  }, [referenceImagePreview]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const params: VideoCreateParams = {
      prompt: prompt.trim(),
      model,
      seconds,
      size,
    };

    if (referenceImage) {
      params.input_reference = referenceImage;
    }

    onSubmit(params);

    // Reset form
    setPrompt('');
    setReferenceImage(null);
    setReferenceImagePreview(null);
    setReferenceImageSource(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resizeAndCropImage = async (file: File, targetWidth: number, targetHeight: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        const targetAspect = targetWidth / targetHeight;
        const imgAspect = img.width / img.height;

        // Calculate dimensions for cover (fill entire area, crop excess)
        let sourceWidth, sourceHeight, sourceX, sourceY;

        if (imgAspect > targetAspect) {
          // Image is wider than target - fit to height, crop width
          sourceHeight = img.height;
          sourceWidth = img.height * targetAspect;
          sourceX = (img.width - sourceWidth) / 2;
          sourceY = 0;
        } else {
          // Image is taller than target - fit to width, crop height
          sourceWidth = img.width;
          sourceHeight = img.width / targetAspect;
          sourceX = 0;
          sourceY = (img.height - sourceHeight) / 2;
        }

        // Create canvas with target dimensions
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw cropped and resized image
        ctx.drawImage(
          img,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, targetWidth, targetHeight
        );

        // Convert to blob and then to File
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }

          const processedFile = new File([blob], file.name, {
            type: 'image/png',
            lastModified: Date.now()
          });

          resolve(processedFile);
        }, 'image/png');
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    setUseAIImage(false);
    setShowImageGenerator(false);

    // Parse target dimensions from size
    const [targetWidth, targetHeight] = size.split('x').map(Number);

    // Load image to check dimensions
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(url);

      const needsResize = img.width !== targetWidth || img.height !== targetHeight;

      if (needsResize) {
        setImageResizeNotice(
          `Image resized from ${img.width}×${img.height} to ${targetWidth}×${targetHeight} (aspect ratio preserved with center crop)`
        );

        try {
          // Resize and crop the image
          const processedFile = await resizeAndCropImage(file, targetWidth, targetHeight);
          setReferenceImage(processedFile);
          setReferenceImageSource('upload');

          // Create preview URL
          if (referenceImagePreview) {
            URL.revokeObjectURL(referenceImagePreview);
          }
          const previewUrl = URL.createObjectURL(processedFile);
          setReferenceImagePreview(previewUrl);
        } catch (error) {
          console.error('Failed to resize image:', error);
          alert('Failed to process image. Please try a different file.');
        }
      } else {
        setImageResizeNotice(null);
        setReferenceImage(file);
        setReferenceImageSource('upload');

        // Create preview URL
        if (referenceImagePreview) {
          URL.revokeObjectURL(referenceImagePreview);
        }
        const previewUrl = URL.createObjectURL(file);
        setReferenceImagePreview(previewUrl);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert('Failed to load image. Please try a different file.');
    };

    img.src = url;
  };

  const handleImageGenerated = (imageFile: File) => {
    setReferenceImage(imageFile);
    setReferenceImageSource('ai');
    setUseAIImage(true);
    setShowImageGenerator(false); // Hide the generator after successful generation

    // Create preview URL
    if (referenceImagePreview) {
      URL.revokeObjectURL(referenceImagePreview);
    }
    const url = URL.createObjectURL(imageFile);
    setReferenceImagePreview(url);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearReferenceImage = () => {
    if (referenceImagePreview) {
      URL.revokeObjectURL(referenceImagePreview);
    }
    setReferenceImage(null);
    setReferenceImagePreview(null);
    setReferenceImageSource(null);
    setImageResizeNotice(null);
    setUseAIImage(false);
    setShowImageGenerator(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImprovePrompt = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt first');
      return;
    }

    setIsImprovingPrompt(true);
    try {
      const result = await apiService.improvePrompt(prompt.trim());
      setImprovedPrompt(result.improved);
    } catch (error: any) {
      console.error('Failed to improve prompt:', error);
      alert(`Failed to improve prompt: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsImprovingPrompt(false);
    }
  };

  const handleAcceptImprovedPrompt = (newPrompt: string) => {
    setPrompt(newPrompt);
    setImprovedPrompt(null);
  };

  const handleRejectImprovedPrompt = () => {
    setImprovedPrompt(null);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">Create New Video</h2>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Prompt
          </label>
          <button
            type="button"
            onClick={handleImprovePrompt}
            disabled={disabled || isImprovingPrompt || !prompt.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
          >
            {isImprovingPrompt ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                <span>Enhancing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span>Enhance with AI</span>
              </>
            )}
          </button>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your video... e.g., 'A cat riding a motorcycle through a neon-lit city at night'"
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
          required
        />
        <p className="text-xs text-gray-500 mt-1.5">
          Tip: Click "Enhance with AI" to optimize your prompt using Sora best practices
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as 'sora-2' | 'sora-2-pro')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={disabled}
          >
            <option value="sora-2">Sora 2 (Fast)</option>
            <option value="sora-2-pro">Sora 2 Pro (High Quality)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration
          </label>
          <select
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={disabled}
          >
            {DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Size (Resolution)
        </label>
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        >
          {SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Reference Image (Optional)
        </label>

        <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
          {referenceImagePreview ? (
            /* Show preview when reference image is set */
            <div className="space-y-3">
              <div className="relative">
                <img
                  src={referenceImagePreview}
                  alt="Reference"
                  className="w-full rounded-lg border-2 border-green-300"
                />
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Applied</span>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3 border border-green-200 space-y-2">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Source:</span>{' '}
                  {referenceImageSource === 'ai' && 'AI Generated'}
                  {referenceImageSource === 'frame' && 'Extracted Frame'}
                  {referenceImageSource === 'upload' && `Uploaded (${referenceImage?.name})`}
                </p>
                {imageResizeNotice && (
                  <p className="text-xs text-blue-600 flex items-start gap-1.5">
                    <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>{imageResizeNotice}</span>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleClearReferenceImage}
                disabled={disabled}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 font-medium disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
              >
                Clear Reference Image
              </button>
            </div>
          ) : (
            /* Show upload/generate options when no reference image */
            <>
              {/* Upload from file */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Upload Image
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  disabled={disabled}
                />
              </div>

              {/* OR divider */}
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="text-xs font-medium text-gray-500 uppercase">or</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>

              {/* AI Generate section */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Generate with AI
                </label>
                <button
                  type="button"
                  onClick={() => setShowImageGenerator(!showImageGenerator)}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 rounded-lg hover:from-purple-200 hover:to-blue-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium transition-all flex items-center justify-center gap-2 border border-purple-200"
                  disabled={disabled}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <span>{showImageGenerator ? 'Hide' : 'Generate'} AI Reference Image</span>
                </button>

                {/* Image Generator component */}
                {showImageGenerator && (
                  <div className="mt-3">
                    <ImageGenerator
                      videoSize={size}
                      onImageGenerated={handleImageGenerated}
                      disabled={disabled}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled || !prompt.trim()}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Generate Video
      </button>

      {improvedPrompt && (
        <PromptSuggestionModal
          originalPrompt={prompt}
          improvedPrompt={improvedPrompt}
          onAccept={handleAcceptImprovedPrompt}
          onReject={handleRejectImprovedPrompt}
        />
      )}
    </form>
  );
}
