import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { interFont, playfairFont } from '../fonts';
import { BG, CREAM, CRIMSON, INK_LIGHT } from '../constants';

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  angle: (i / 20) * Math.PI * 2,
  speed: 220 + (i % 5) * 80,
  size: 6 + (i % 4) * 4,
}));

export const Scene2Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoS = spring({ frame, fps, config: { damping: 14, stiffness: 100 }, durationInFrames: 25 });
  const logoScale = interpolate(logoS, [0, 1], [2.5, 1]);

  const imgOp = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

  const taglineOpacity = interpolate(frame, [18, 36], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const taglineY = interpolate(frame, [18, 36], [24, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

  const subtitleOpacity = interpolate(frame, [42, 62], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fadeOut = interpolate(frame, [102, 120], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BG, justifyContent: 'center', alignItems: 'center', opacity: fadeOut }}>
      {PARTICLES.map((p, i) => {
        const dist = interpolate(frame, [0, 60], [0, p.speed], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });
        const pOpacity = interpolate(frame, [20, 60], [0.9, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: CRIMSON,
              left: 960 + Math.cos(p.angle) * dist - p.size / 2,
              top: 480 + Math.sin(p.angle) * dist - p.size / 2,
              opacity: pOpacity,
            }}
          />
        );
      })}

      <div style={{ transform: `scale(${logoScale})`, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Logo image */}
        <div style={{ marginBottom: 24, opacity: imgOp }}>
          <Img
            src={staticFile('harriett-logo.png')}
            style={{
              width: 140,
              height: 140,
              borderRadius: '50%',
              objectFit: 'cover',
              border: `3px solid ${CRIMSON}`,
              boxShadow: `0 0 32px ${CRIMSON}66`,
            }}
          />
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontFamily: playfairFont.fontFamily,
            fontSize: 112,
            fontWeight: 700,
            color: CREAM,
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          Harriett<span style={{ color: CRIMSON }}>.</span>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 680,
          left: 0,
          right: 0,
          textAlign: 'center',
          paddingLeft: 200,
          paddingRight: 200,
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
        }}
      >
        <div
          style={{
            fontFamily: interFont.fontFamily,
            fontSize: 36,
            color: INK_LIGHT,
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}
        >
          The transaction coordinator your agents didn't know they wanted.
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 90,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: subtitleOpacity,
        }}
      >
        <div
          style={{
            fontFamily: interFont.fontFamily,
            fontSize: 24,
            color: CRIMSON,
            letterSpacing: 3,
            textTransform: 'uppercase',
          }}
        >
          Pritchett-Moore Real Estate — Tuscaloosa, Alabama
        </div>
      </div>
    </AbsoluteFill>
  );
};
