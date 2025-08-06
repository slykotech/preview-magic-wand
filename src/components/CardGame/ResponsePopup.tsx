import React from 'react';

interface ResponsePopupProps {
  isOpen: boolean;
  response: string;
  authorName: string;
  timestamp: string;
  onDismiss: () => void;
}

export const ResponsePopup: React.FC<ResponsePopupProps> = ({ 
  isOpen, 
  response, 
  authorName, 
  timestamp, 
  onDismiss 
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - blocks all interaction */}
      <div className="fixed inset-0 bg-black/60 z-40" />
      
      {/* Popup */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-scale-in">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-2xl">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <span className="text-2xl">💬</span>
              {authorName}'s Response
            </h3>
          </div>
          
          {/* Content */}
          <div className="p-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-lg text-gray-800 leading-relaxed italic">
                "{response}"
              </p>
            </div>
            
            {/* Timestamp */}
            <p className="text-sm text-gray-500 text-center">
              {new Date(timestamp).toLocaleTimeString()}
            </p>
          </div>
          
          {/* Dismiss Button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={onDismiss}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 transition"
            >
              Got it! Let me play my turn
            </button>
          </div>
        </div>
      </div>
    </>
  );
};