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
      setUseAIImage(false);
      setShowImageGenerator(false);
      onReferenceImageUsed?.(); // Clear the initial reference image after using it
    }
  }, [initialReferenceImage, onReferenceImageUsed]);

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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setReferenceImage(file);
      setUseAIImage(false);
      setShowImageGenerator(false);
    }
  };

  const handleImageGenerated = (imageFile: File) => {
    setReferenceImage(imageFile);
    setUseAIImage(true);
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
              disabled={disabled || useAIImage}
            />
            {referenceImage && !useAIImage && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-gray-700">
                  {referenceImage.name}
                </p>
              </div>
            )}
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
