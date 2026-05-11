import { AlertTriangle, MessageCircle } from 'lucide-react';

export default function AccountSuspended({ suspendedReason, suspendedAt }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-background flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white border border-red-200 rounded-2xl shadow-lg p-8 text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <AlertTriangle className="w-16 h-16 text-red-600" />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Konto vorübergehend gesperrt
            </h1>
            <p className="text-slate-600">
              Der Zugriff auf diese Organisation wurde vorübergehend gesperrt.
            </p>
          </div>

          {/* Details */}
          <div className="space-y-3 text-left bg-red-50 rounded-lg p-4">
            {suspendedReason && (
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase">Grund</p>
                <p className="text-sm text-slate-900 mt-1">{suspendedReason}</p>
              </div>
            )}
            {suspendedAt && (
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase">Gesperrt am</p>
                <p className="text-sm text-slate-900 mt-1">
                  {new Date(suspendedAt).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Support */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="font-semibold text-blue-900 text-sm mb-1">Support kontaktieren</p>
              <p className="text-xs text-blue-700">
                Bitte wenden Sie sich an den Vertriebo Support, um Ihr Konto zu reaktivieren.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}