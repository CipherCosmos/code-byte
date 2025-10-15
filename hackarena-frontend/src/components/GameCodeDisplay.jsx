import { useState } from 'react'
import { Copy, Check, QrCode } from 'lucide-react'
import toast from 'react-hot-toast'

const GameCodeDisplay = ({ gameCode, qrCode, joinUrl, showQR = true }) => {
  const [copied, setCopied] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="bg-white rounded-lg border p-6 space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Game Code</h3>
        <div className="flex items-center justify-center space-x-2">
          <code className="text-3xl font-bold text-primary-600 bg-primary-50 px-4 py-2 rounded-lg">
            {gameCode}
          </code>
          <button
            onClick={() => copyToClipboard(gameCode)}
            className="btn btn-secondary p-2"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {showQR && (
        <div className="text-center">
          <button
            onClick={() => setShowQRModal(true)}
            className="btn btn-primary"
          >
            <QrCode className="h-4 w-4 mr-2" />
            Show QR Code
          </button>
        </div>
      )}

      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">Share join link:</p>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={joinUrl}
            readOnly
            className="input flex-1 text-sm"
          />
          <button
            onClick={() => copyToClipboard(joinUrl)}
            className="btn btn-secondary p-2 shrink-0"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Scan to Join Game</h3>
              <img src={qrCode} alt="QR Code" className="mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">Game Code: {gameCode}</p>
              <button
                onClick={() => setShowQRModal(false)}
                className="btn btn-primary w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GameCodeDisplay