import React from 'react';

interface ResponsePopupProps {
  isOpen: boolean;
  response: string;
  authorName: string;
  timestamp: string;
  isMyResponse: boolean;
  onDismiss: () => void;
}

export const ResponsePopup: React.FC<ResponsePopupProps> = ({ 
  isOpen, 
  response, 
  authorName, 
  timestamp, 
  isMyResponse, 
  onDismiss 
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40 animate-fade-in" />
      
      {/* Popup */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-scale-in">
          {/* Header */}
          <div className={`p-4 rounded-t-2xl ${
            isMyResponse 
              ? 'bg-gradient-to-r from-primary to-purple-500' 
              : 'bg-gradient-to-r from-pink-500 to-rose-500'
          }`}>
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <span className="text-2xl">💬</span>
              {isMyResponse ? 'Your Response' : `${authorName}'s Response`}
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
              Submitted at {new Date(timestamp).toLocaleTimeString()}
            </p>
          </div>
          
          {/* Actions */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={onDismiss}
              className="w-full px-6 py-3 bg-gradient-to-r from-primary to-purple-500 text-white rounded-lg font-semibold hover:opacity-90 transition"
            >
              {isMyResponse ? 'Continue' : 'Got it!'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};