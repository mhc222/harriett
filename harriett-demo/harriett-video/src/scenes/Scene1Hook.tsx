import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { playfairFont } from '../fonts';
import { BG, CREAM, CRIMSON } from '../constants';

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, config: { damping: 14, stiffness: 120 }, durationInFrames: 22 });
  const scale = interpolate(s, [0, 1], [2, 1]);
  const opacity = interpolate(frame, [58, 75], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          position: 'absolute',
          width: 1000,
          height: 1000,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${CRIMSON}44 0%, transparent 70%)`,
          top: '50%',
          left: '50%',
          marginTop: -500,
          marginLeft: -500,
        }}
      />
      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
          textAlign: 'center',
          padding: '0 200px',
        }}
      >
        <div
          style={{
            fontFamily: playfairFont.fontFamily,
            fontSize: 96,
            fontWeight: 700,
            color: CREAM,
            lineHeight: 1.2,
            fontStyle: 'italic',
          }}
        >
          Still tracking 15 deals in a spreadsheet?
        </div>
      </div>
    </AbsoluteFill>
  );
};
