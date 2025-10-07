import { useState } from 'react';
import { useApiKey } from '../hooks/useApiKey';

export function ApiKeyInput() {
  const { apiKey, setApiKey, clearApiKey, hasApiKey } = useApiKey();
  const [inputValue, setInputValue] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setApiKey(inputValue.trim());
      setInputValue('');
    }
  };

  if (hasApiKey) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-800 font-medium">API Key Configured</span>
          </div>
          <button
            onClick={clearApiKey}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Clear Key
          </button>
        </div>
        <p className="text-sm text-green-700 mt-2">
          Key: {showKey ? apiKey : '••••••••••••••••'}
          <button
            onClick={() => setShowKey(!showKey)}
            className="ml-2 text-green-600 hover:text-green-700 underline"
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold text-blue-900 mb-2">OpenAI API Key Required</h2>
      <p className="text-sm text-blue-700 mb-4">
        Enter your OpenAI API key to start generating videos. Your key will be stored locally in your browser.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="password"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="sk-..."
          className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        >
          Save Key
        </button>
      </form>
    </div>
  );
}
