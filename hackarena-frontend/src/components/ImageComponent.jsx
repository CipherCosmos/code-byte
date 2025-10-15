import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';

const ImageComponent = ({ question, answer, setAnswer, submitted }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showControls, setShowControls] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoaded(false);
    setImageError(true);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const resetView = () => {
    setZoom(1);
    setRotation(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-lg">🖼️</span>
        <span className={`px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800`}>
          Image-based Question
        </span>
        <span className="text-sm text-gray-600">
          Analyze the image and provide your answer
        </span>
      </div>

      {/* Image Display */}
      {question.image_url && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-base font-medium text-gray-700">
              Question Image:
            </label>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowControls(!showControls)}
                className="btn btn-secondary text-sm flex items-center px-3 py-1"
                aria-label={showControls ? "Hide image controls" : "Show image controls"}
              >
                {showControls ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                {showControls ? 'Hide' : 'Show'} Controls
              </button>
            </div>
          </div>

          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4">
            <div className="relative overflow-hidden rounded-lg bg-white shadow-lg">
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Loading image...</p>
                  </div>
                </div>
              )}

              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                  <div className="text-center">
                    <ImageIcon className="h-12 w-12 text-red-400 mx-auto mb-2" />
                    <p className="text-sm text-red-600">Failed to load image</p>
                    <p className="text-xs text-red-500 mt-1">Please check your connection</p>
                  </div>
                </div>
              )}

              <img
                src={`http://localhost:3001${question.image_url}`}
                alt="Question"
                className={`max-w-full h-auto transition-all duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  maxHeight: '500px',
                  objectFit: 'contain'
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />

              {/* Image Controls Overlay */}
              {showControls && imageLoaded && (
                <div className="absolute top-4 right-4 bg-black/75 text-white rounded-lg p-2 space-y-2">
                  <button
                    onClick={handleZoomIn}
                    className="block w-full text-left hover:bg-white/20 rounded px-2 py-1 text-sm"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4 inline mr-1" />
                    Zoom In
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="block w-full text-left hover:bg-white/20 rounded px-2 py-1 text-sm"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4 inline mr-1" />
                    Zoom Out
                  </button>
                  <button
                    onClick={handleRotate}
                    className="block w-full text-left hover:bg-white/20 rounded px-2 py-1 text-sm"
                    aria-label="Rotate image"
                  >
                    <RotateCw className="h-4 w-4 inline mr-1" />
                    Rotate
                  </button>
                  <button
                    onClick={resetView}
                    className="block w-full text-left hover:bg-white/20 rounded px-2 py-1 text-sm"
                    aria-label="Reset view"
                  >
                    Reset
                  </button>
                </div>
              )}

              {/* Zoom/Rotation Info */}
              {showControls && (zoom !== 1 || rotation !== 0) && (
                <div className="absolute bottom-4 left-4 bg-black/75 text-white rounded-lg px-3 py-1 text-sm">
                  {zoom !== 1 && <span>Zoom: {Math.round(zoom * 100)}%</span>}
                  {rotation !== 0 && <span className={zoom !== 1 ? ' ml-2' : ''}>Rotation: {rotation}°</span>}
                </div>
              )}
            </div>
          </div>

          {/* Image Analysis Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center">
              <Eye className="h-4 w-4 mr-2" />
              Image Analysis Tips:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use zoom controls to examine details closely</li>
              <li>• Rotate the image if needed for better viewing</li>
              <li>• Look for patterns, text, shapes, or relationships</li>
              <li>• Consider the context and any visual clues</li>
            </ul>
          </div>
        </div>
      )}

      {/* Answer Input */}
      <div>
        <label className="block text-base font-medium text-gray-700 mb-3">
          Your Answer:
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={submitted}
          className="input w-full h-32 resize-none text-base py-3 px-4 min-h-[120px]"
          placeholder="Describe what you see in the image or provide your analysis..."
          aria-label="Image analysis answer"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Provide a detailed description or analysis of the image
          </p>
          <span className="text-xs text-gray-500">
            {answer.length} characters
          </span>
        </div>
      </div>
    </div>
  );
};

export default ImageComponent;