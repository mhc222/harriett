import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import { interFont, playfairFont } from '../fonts';
import { BG, CREAM, CRIMSON, INK_MID } from '../constants';

export const Scene6CTA: React.FC = () => {
  const frame = useCurrentFrame();

  const contentOpacity = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const logoScale = 1 + 0.025 * Math.sin(frame * 0.15);

  const urlOpacity = interpolate(frame, [12, 26], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fadeToBlack = interpolate(frame, [44, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', opacity: contentOpacity }}>
        <div
          style={{
            transform: `scale(${logoScale})`,
            display: 'inline-block',
          }}
        >
          <div
            style={{
              fontFamily: playfairFont.fontFamily,
              fontSize: 128,
              fontWeight: 700,
              color: CREAM,
              letterSpacing: -3,
            }}
          >
            Harriett<span style={{ color: CRIMSON }}>.</span>
          </div>
        </div>

        <div
          style={{
            fontFamily: interFont.fontFamily,
            fontSize: 32,
            color: INK_MID,
            fontStyle: 'italic',
            marginTop: 20,
          }}
        >
          Pritchett-Moore Real Estate, Tuscaloosa AL
        </div>

        <div
          style={{
            fontFamily: interFont.fontFamily,
            fontSize: 36,
            color: CRIMSON,
            letterSpacing: 1,
            marginTop: 80,
            opacity: urlOpacity,
          }}
        >
          harriett-demo.vercel.app
        </div>
      </div>

      {/* Fade to black */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#000',
          opacity: fadeToBlack,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
