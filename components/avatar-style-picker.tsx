'use client';

import { AVATAR_STYLES, AVATAR_STYLE_IDS, generateAvatarUrl } from '@/lib/avatar-styles';
import type { AvatarStyleId } from '@/lib/types';
import { Avatar } from '@heroui/react';

type AvatarStylePickerProps = {
  seed: string;
  selectedStyle: AvatarStyleId;
  onStyleChange: (style: AvatarStyleId) => void;
};

export function AvatarStylePicker({ seed, selectedStyle, onStyleChange }: AvatarStylePickerProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {AVATAR_STYLE_IDS.map((styleId) => {
        const style = AVATAR_STYLES[styleId];
        const isSelected = selectedStyle === styleId;

        return (
          <button
            key={styleId}
            type="button"
            onClick={() => onStyleChange(styleId)}
            className={`
              flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all
              ${isSelected
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-emerald-200 bg-white hover:border-emerald-300'
              }
            `}
          >
            <Avatar
              src={generateAvatarUrl(seed, styleId)}
              alt={style.name}
              className={`w-12 h-12 ${isSelected ? 'ring-2 ring-emerald-400' : ''}`}
              imgProps={{
                referrerPolicy: 'no-referrer',
              }}
            />
            <span className={`text-xs font-medium ${isSelected ? 'text-emerald-700' : 'text-emerald-600/70'}`}>
              {style.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
