import { useState, useRef } from 'react';
import { VideoCreateParams } from '../types';

interface VideoCreationFormProps {
  onSubmit: (params: VideoCreateParams) => void;
  disabled?: boolean;
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

export function VideoCreationForm({ onSubmit, disabled = false }: VideoCreationFormProps) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<'sora-2' | 'sora-2-pro'>('sora-2');
  const [seconds, setSeconds] = useState('8');
  const [size, setSize] = useState('1280x720');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">Create New Video</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your video... e.g., 'A cat riding a motorcycle through a neon-lit city at night'"
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
          required
        />
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reference Image (Optional)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        />
        {referenceImage && (
          <p className="text-sm text-gray-600 mt-2">
            Selected: {referenceImage.name}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={disabled || !prompt.trim()}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Generate Video
      </button>
    </form>
  );
}
