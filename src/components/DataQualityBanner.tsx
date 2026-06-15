'use client';

import { useState } from 'react';
import { DataQualityResult } from '@/lib/forecastUtils';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from '@/lib/icons';

interface Props {
  quality: DataQualityResult;
}

export default function DataQualityBanner({ quality }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (quality.level === 'High' && quality.issues.length === 0) return null;

  const borderColor =
    quality.level === 'High'   ? '#3b82f6' :
    quality.level === 'Medium' ? '#fde047' : '#f87171';

  const textColor =
    quality.level === 'High'   ? 'text-gain' :
    quality.level === 'Medium' ? 'text-warning' : 'text-loss';

  const bgColor =
    quality.level === 'High'   ? 'bg-gain/5' :
    quality.level === 'Medium' ? 'bg-warning/5' : 'bg-loss/5';

  const StatusIcon =
    quality.level === 'High'   ? CheckCircle2 :
    quality.level === 'Medium' ? AlertTriangle : XCircle;

  return (
    <div className={`rounded-xl border p-3 ${bgColor}`} style={{ borderColor }}>

      {/* Summary row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusIcon size={14} className={`flex-shrink-0 ${textColor}`} />
          <div>
            <span className={`text-xs font-bold ${textColor}`}>
              Data Quality: {quality.level}
            </span>
            <span className="text-[11px] text-muted ml-2 font-mono">
              {quality.score}/100
            </span>
            {quality.revenueUnitSuspect && (
              <span className="ml-2 text-[10px] font-bold text-loss bg-loss/10 border border-loss/20 px-1.5 py-0.5 rounded">
                UNIT ERROR
              </span>
            )}
          </div>
        </div>
        {quality.issues.length > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-[11px] text-muted hover:text-primary transition-colors flex-shrink-0"
          >
            <span>{quality.issues.length} issue{quality.issues.length > 1 ? 's' : ''}</span>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {/* Unit suspect warning */}
      {quality.revenueUnitSuspect && (
        <p className="text-[11px] text-loss mt-2 leading-relaxed">
          Revenue appears to be in the wrong unit — valuation numbers may be wildly incorrect.
          Cross-check on <span className="font-semibold">screener.in</span> before trusting this output.
        </p>
      )}

      {/* Issue list (expandable) */}
      {expanded && quality.issues.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-border/50 pt-2">
          {quality.issues.map((issue, i) => (
            <div key={i} className="flex gap-2">
              {issue.severity === 'error'
                ? <XCircle size={12} className="text-loss flex-shrink-0 mt-0.5" />
                : <AlertTriangle size={12} className="text-warning flex-shrink-0 mt-0.5" />}
              <div>
                <p className="text-[11px] text-primary font-medium leading-tight">{issue.message}</p>
                <p className="text-[10px] text-muted leading-relaxed mt-0.5">{issue.detail}</p>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-muted/60 border-t border-border/30 pt-2 mt-1">
            Outlier years have been winsorised (capped at ±80%) and excluded from CAGR calculations.
            The model still runs — but verify numbers on <strong className="text-muted">screener.in</strong> for any error flags above.
          </p>
        </div>
      )}
    </div>
  );
}
