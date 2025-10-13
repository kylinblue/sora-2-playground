import { useState } from 'react';

interface PromptSuggestionModalProps {
  originalPrompt: string;
  improvedPrompt: string;
  onAccept: (prompt: string) => void;
  onReject: () => void;
}

export function PromptSuggestionModal({
  originalPrompt,
  improvedPrompt,
  onAccept,
  onReject,
}: PromptSuggestionModalProps) {
  const [showComparison, setShowComparison] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-purple-600 to-blue-600">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <h2 className="text-xl font-bold text-white">AI-Enhanced Prompt</h2>
          </div>
          <button
            onClick={onReject}
            className="text-white hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Enhanced Prompt
              </label>
              <button
                onClick={() => setShowComparison(!showComparison)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {showComparison ? 'Hide' : 'Show'} Original
              </button>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4">
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                {improvedPrompt}
              </p>
            </div>
          </div>

          {showComparison && (
            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <label className="text-xs font-medium text-gray-600 mb-2 block">
                Your Original Prompt
              </label>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                {originalPrompt}
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex gap-2">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">AI Enhancement Applied</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Added specific camera framing and angles</li>
                  <li>• Included detailed lighting and color palette</li>
                  <li>• Structured actions with clear timing</li>
                  <li>• Optimized for Sora's best practices</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onAccept(improvedPrompt)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium shadow-lg hover:shadow-xl transition-all"
            >
              Use Enhanced Prompt
            </button>
            <button
              onClick={onReject}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 font-medium"
            >
              Keep Original
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
