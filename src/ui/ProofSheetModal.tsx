/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Project } from '../data/schema.ts';
import { extractProofItems } from '../text/proofSheet.ts';
import { CheckCircle2, AlertCircle, Check, X, ShieldCheck } from 'lucide-react';

interface ProofSheetModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onToggleApproval: (stringId: string) => void;
  onApproveAll: () => void;
}

export const ProofSheetModal: React.FC<ProofSheetModalProps> = ({
  project,
  isOpen,
  onClose,
  onToggleApproval,
  onApproveAll,
}) => {
  if (!isOpen) return null;

  const proofItems = extractProofItems(project);
  const unverifiedCount = proofItems.filter((i) => i.status === 'unverified').length;
  const isFullyVerified = unverifiedCount === 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#240e17] border border-[#c9a24b] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#c9a24b]/30 flex items-center justify-between bg-[#1a0910]">
          <div>
            <h3 className="text-xl font-bold font-serif text-[#e8d08a] flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#c9a24b]" />
              <span>प्रूफ़ शीट एवं वर्तनी सत्यापन (Proof Sheet & Verification)</span>
            </h3>
            <p className="text-xs text-[#fbf3dc]/70 mt-1">
              वीडियो में दिखने वाले प्रत्येक शब्द व मात्रा का सत्यापन करें। संयुक्ताक्षर (क्ष, त्र, ज्ञ, श्री, प्रीतिभोज) एवं तिथियों की शुद्धता सुनिश्चित करें।
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#fbf3dc]/60 hover:text-[#fbf3dc] rounded-lg hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verification Status Banner */}
        <div className="px-5 py-3 bg-[#16060c] border-b border-[#c9a24b]/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isFullyVerified ? (
              <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                सभी {proofItems.length} पंक्तियाँ सत्यापित हैं (All strings verified)
              </span>
            ) : (
              <span className="text-amber-400 text-xs font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                {unverifiedCount} पंक्तियों का सत्यापन शेष है
              </span>
            )}
          </div>
          <button
            onClick={onApproveAll}
            className="px-3 py-1.5 bg-[#6e1f34] hover:bg-[#852740] text-[#e8d08a] border border-[#c9a24b]/50 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            सभी को सत्यापित चिह्नित करें (Verify All)
          </button>
        </div>

        {/* List of Strings */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {proofItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onToggleApproval(item.id)}
              className={`p-3.5 rounded-xl border flex items-start justify-between gap-4 cursor-pointer transition-all ${
                item.status === 'verified'
                  ? 'bg-[#1a0910] border-emerald-500/40 hover:border-emerald-500'
                  : 'bg-[#2a101c] border-amber-500/40 hover:border-amber-500'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#c9a24b] font-serif">
                    {item.categoryHi}
                  </span>
                  <span className="text-[11px] text-[#fbf3dc]/50">({item.category})</span>
                  <span className="text-[11px] font-mono text-[#e8d08a]/80 bg-[#14060c] px-2 py-0.5 rounded border border-[#c9a24b]/20">
                    {item.timeRange}
                  </span>
                  {item.hasConjuncts && (
                    <span className="text-[10px] text-emerald-400/80 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      संयुक्ताक्षर शुद्धता जाँची गई
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#ffffff] font-medium leading-relaxed font-serif">
                  {item.cleanText}
                </p>
              </div>

              {/* Checkbox button */}
              <div className="pt-1">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                    item.status === 'verified'
                      ? 'bg-emerald-600 text-white'
                      : 'border-2 border-amber-500/60 text-transparent'
                  }`}
                >
                  <Check className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#c9a24b]/30 bg-[#1a0910] flex items-center justify-between">
          <p className="text-xs text-[#fbf3dc]/60">
            सत्यापन के बिना भी आप चाहें तो सीधे एक्सपोर्ट कर सकते हैं।
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#6e1f34] hover:bg-[#852740] text-[#e8d08a] border border-[#c9a24b] rounded-lg text-xs font-bold shadow cursor-pointer transition-colors"
          >
            स्वीकृत एवं बंद करें
          </button>
        </div>
      </div>
    </div>
  );
};
