
import React from 'react';

interface DashboardWidgetProps {
  title: string;
  children: React.ReactNode;
  isVisible: boolean;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({ title, children, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="font-bold text-slate-800 tracking-tight">{title}</h3>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-200"></div>
          <div className="w-2 h-2 rounded-full bg-slate-200"></div>
          <div className="w-2 h-2 rounded-full bg-slate-200"></div>
        </div>
      </div>
      <div className="p-6 flex-grow">
        {children}
      </div>
    </div>
  );
};

export default DashboardWidget;
