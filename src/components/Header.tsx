import React from 'react';
import { Zap, BookOpen, Smartphone, Bell, Mail } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-slate-900 border-b-[3px] border-red-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <Zap className="w-5 h-5 text-red-600" />
        <h1 className="text-lg font-extrabold tracking-tight">
          <span className="text-red-600">CSPod</span>
          <span className="text-slate-500 mx-2">&middot;</span>
          Journey Builder
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <a
          href="/public/best-practices.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Best Practices
        </a>
        <a
          href="/public/inapp-design-guide.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
        >
          <Smartphone className="w-3.5 h-3.5" />
          In-App Design
        </a>
        <a
          href="/public/push-design-guide.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
        >
          <Bell className="w-3.5 h-3.5" />
          Push Design
        </a>
        <a
          href="/public/email-design-guide.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
        >
          <Mail className="w-3.5 h-3.5" />
          Email Design
        </a>
        <span className="bg-emerald-950 text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded uppercase tracking-wider">
          Design Only — No API Access
        </span>
      </div>
    </header>
  );
}
