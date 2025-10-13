import { useState, useRef } from 'react';
import { apiService } from '../services/api';

interface ImageGeneratorProps {
  videoSize: string;
  onImageGenerated: (imageFile: File) => void;
  disabled?: boolean;
}

export function ImageGenerator({ videoSize, onImageGenerated, disabled = false }: ImageGeneratorProps) {
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setReferenceImages(prev => [...prev, ...imageFiles]);
  };

  const handleRemoveReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      alert('Please enter a description for the reference image');
      return;
    }

    setIsGenerating(true);
    try {
      const blob = await apiService.generateImage(
        imagePrompt.trim(),
        videoSize,
        referenceImages.length > 0 ? referenceImages : undefined
      );
      const url = URL.createObjectURL(blob);
      setGeneratedImage(url);

      // Convert blob to File object
      const file = new File([blob], 'generated-reference.png', { type: 'image/png' });
      onImageGenerated(file);
    } catch (error: any) {
      console.error('Failed to generate image:', error);
      alert(`Failed to generate image: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearImage = () => {
    if (generatedImage) {
      URL.revokeObjectURL(generatedImage);
    }
    setGeneratedImage(null);
    setImagePrompt('');
    setReferenceImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 className="font-semibold text-gray-800">AI-Powered Reference Image</h3>
      </div>

      {!generatedImage ? (
        <>
          {/* Reference Images Upload (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reference Images (Optional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileChange}
              className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              disabled={disabled || isGenerating}
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Upload images to merge or use as inspiration (supports multiple images)
            </p>

            {/* Display selected reference images */}
            {referenceImages.length > 0 && (
              <div className="mt-3 space-y-2">
                {referenceImages.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-gray-700">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveReferenceImage(index)}
                      className="text-red-600 hover:text-red-700"
                      disabled={disabled || isGenerating}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe your reference image
            </label>
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder={referenceImages.length > 0
                ? "e.g., 'Merge these images with a beach sunset background'"
                : "e.g., 'A serene beach at sunset with palm trees'"}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={disabled || isGenerating}
            />
            <p className="text-xs text-gray-500 mt-1.5">
              {referenceImages.length > 0
                ? `AI will use ${referenceImages.length} reference image${referenceImages.length > 1 ? 's' : ''} with high fidelity. Image will be sized to ${videoSize}.`
                : `Image will be automatically sized to match your video dimensions (${videoSize})`}
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateImage}
            disabled={disabled || isGenerating || !imagePrompt.trim()}
            className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Generating Image...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span>Generate Reference Image</span>
              </>
            )}
          </button>
        </>
      ) : (
        <>
          <div className="relative">
            <img
              src={generatedImage}
              alt="Generated reference"
              className="w-full rounded-lg border-2 border-purple-300"
            />
            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Applied</span>
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 border border-purple-200">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Prompt:</span> {imagePrompt}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClearImage}
            disabled={disabled}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 font-medium disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
          >
            Clear and Generate New Image
          </button>
        </>
      )}
    </div>
  );
}
