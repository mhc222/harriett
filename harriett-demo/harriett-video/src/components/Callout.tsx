import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { interFont } from '../fonts';
import { CRIMSON, WHITE } from '../constants';

interface CalloutProps {
  text: string;
  subtext?: string;
  appearFrame: number;
  disappearFrame?: number;
  x: number;
  y: number;
  color?: string;
  /** 'left' | 'right' — which side the arrow tail points toward */
  arrowSide?: 'left' | 'right';
}

export const Callout: React.FC<CalloutProps> = ({
  text,
  subtext,
  appearFrame,
  disappearFrame,
  x,
  y,
  color = CRIMSON,
  arrowSide = 'left',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({
    frame: frame - appearFrame,
    fps,
    config: { damping: 16, stiffness: 120 },
    durationInFrames: 20,
  });

  const fadeIn = interpolate(frame, [appearFrame, appearFrame + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fadeOut = disappearFrame
    ? interpolate(frame, [disappearFrame, disappearFrame + 10], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;
  const op = Math.min(fadeIn, fadeOut);
  const scale = interpolate(s, [0, 1], [0.85, 1]);

  if (frame < appearFrame) return null;
  if (disappearFrame && frame > disappearFrame + 10) return null;

  const ARROW_SIZE = 10;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity: op,
        transform: `scale(${scale})`,
        transformOrigin: arrowSide === 'left' ? 'left center' : 'right center',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      {/* Arrow on left */}
      {arrowSide === 'left' && (
        <div
          style={{
            width: 0,
            height: 0,
            borderTop: `${ARROW_SIZE}px solid transparent`,
            borderBottom: `${ARROW_SIZE}px solid transparent`,
            borderRight: `${ARROW_SIZE}px solid ${color}`,
            flexShrink: 0,
          }}
        />
      )}

      {/* Card */}
      <div
        style={{
          backgroundColor: color,
          borderRadius: 8,
          padding: subtext ? '10px 16px' : '8px 14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          minWidth: 180,
        }}
      >
        <div
          style={{
            fontFamily: interFont.fontFamily,
            fontSize: 15,
            fontWeight: 700,
            color: WHITE,
            lineHeight: 1.3,
          }}
        >
          {text}
        </div>
        {subtext && (
          <div
            style={{
              fontFamily: interFont.fontFamily,
              fontSize: 12,
              color: 'rgba(255,255,255,0.75)',
              marginTop: 3,
              lineHeight: 1.4,
            }}
          >
            {subtext}
          </div>
        )}
      </div>

      {/* Arrow on right */}
      {arrowSide === 'right' && (
        <div
          style={{
            width: 0,
            height: 0,
            borderTop: `${ARROW_SIZE}px solid transparent`,
            borderBottom: `${ARROW_SIZE}px solid transparent`,
            borderLeft: `${ARROW_SIZE}px solid ${color}`,
            flexShrink: 0,
          }}
        />
      )}
    </div>
  );
};
