import { AlertTriangle } from "lucide-react";

export default function CriticalAlertsBanner({ alerts = [] }) {
  if (!alerts.length) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emergency to-red-700 p-4 text-white shadow-lg">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <h3 className="font-bold text-sm uppercase tracking-wider">Critical Medical Alerts</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {alerts.map((alert, i) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-sm font-semibold"
            >
              {alert}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}