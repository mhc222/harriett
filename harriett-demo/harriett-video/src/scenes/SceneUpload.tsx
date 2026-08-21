import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { interFont } from '../fonts';
import { BG, BL, BT, BW, CH_B, CREAM, CRIMSON, CW_B, INK_LIGHT, INK_MID, SUCCESS, WHITE } from '../constants';
import { AppNav, BrowserChrome } from '../components/Browser';

const STATUS_LINES = [
  { text: 'Reading listing agreement...', appearFrame: 60, doneFrame: 82 },
  { text: 'Extracting deal fields...', appearFrame: 72, doneFrame: 94 },
  { text: 'Detecting compliance flags...', appearFrame: 84, doneFrame: 106 },
  { text: 'Building coordinator checklist...', appearFrame: 96, doneFrame: 118 },
  { text: 'Writing calendar events...', appearFrame: 108, doneFrame: 130 },
];

export const SceneUpload: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneOp = interpolate(frame, [0, 10, 170, 180], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const labelOp = interpolate(frame, [4, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Phase A: Drop zone
  const dropZoneOp = interpolate(frame, [8, 16, 48, 58], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const borderHighlight = frame >= 40 && frame < 58;

  const cursorX = interpolate(frame, [10, 38], [1560, 1050], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
  });
  const cursorY = interpolate(frame, [10, 38], [980, 558], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
  });
  const cursorOp = interpolate(frame, [10, 16, 52, 60], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const pdfOp = interpolate(frame, [22, 28, 46, 56], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pdfX = frame < 38 ? cursorX + 14 : interpolate(frame, [38, 50], [cursorX + 14, 1022], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pdfY = frame < 38 ? cursorY - 36 : interpolate(frame, [38, 50], [cursorY - 36, 566], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });

  const rippleRaw = spring({ frame: frame - 40, fps, config: { damping: 20, stiffness: 300 }, durationInFrames: 18 });
  const rippleSize = interpolate(rippleRaw, [0, 1], [0, 100]);
  const rippleOp = interpolate(frame, [40, 62], [0.7, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Phase B: Parsing
  const progressOp = interpolate(frame, [60, 70, 158, 168], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const progressWidth = interpolate(frame, [68, 132], [0, CW_B - 56], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const readyOp = interpolate(frame, [136, 150], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const CONTENT_H = CH_B;

  return (
    <AbsoluteFill style={{ backgroundColor: '#141210', opacity: sceneOp }}>
      <div style={{ position: 'absolute', top: 80, left: BL, fontFamily: interFont.fontFamily, fontSize: 14, color: INK_MID, textTransform: 'uppercase', letterSpacing: 2, opacity: labelOp }}>
        Upload Contract
      </div>

      <div style={{ position: 'absolute', left: BL, top: BT, width: BW, borderRadius: 12, overflow: 'hidden', boxShadow: '0 32px 96px rgba(0,0,0,0.7)' }}>
        <BrowserChrome page="/demo" />
        <div style={{ display: 'flex', height: CONTENT_H }}>
          <AppNav active="/demo" />
          <div style={{ position: 'relative', width: CW_B, height: CONTENT_H, overflow: 'hidden', backgroundColor: BG }}>

            {/* Drop zone */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: dropZoneOp }}>
              <div style={{ width: 640, height: 220, border: `2px dashed ${borderHighlight ? CRIMSON : '#3A3028'}`, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: borderHighlight ? `${CRIMSON}18` : 'transparent' }}>
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 22, color: INK_MID }}>Drop listing agreement here</div>
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 15, color: INK_LIGHT, marginTop: 10 }}>604-2nd-st-listing-agreement.pdf</div>
              </div>
              {rippleOp > 0 && (
                <div style={{ position: 'absolute', width: rippleSize, height: rippleSize, borderRadius: '50%', border: `2px solid ${CRIMSON}`, left: CW_B / 2 - rippleSize / 2, top: CONTENT_H / 2 - rippleSize / 2, opacity: rippleOp }} />
              )}
            </div>

            {/* Parse progress */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 56px', boxSizing: 'border-box', opacity: progressOp }}>
              <div style={{ width: '100%', height: 6, backgroundColor: '#2A2420', borderRadius: 3, marginBottom: 44 }}>
                <div style={{ width: progressWidth, height: 6, backgroundColor: CRIMSON, borderRadius: 3 }} />
              </div>
              {STATUS_LINES.map((line, i) => {
                const lineOp = interpolate(frame, [line.appearFrame, line.appearFrame + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                const isDone = frame >= line.doneFrame;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 30, opacity: lineOp }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: isDone ? CRIMSON : 'transparent', border: `2px solid ${isDone ? CRIMSON : INK_MID}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isDone && <div style={{ width: 8, height: 5, borderLeft: `2px solid ${WHITE}`, borderBottom: `2px solid ${WHITE}`, transform: 'rotate(-45deg) translateY(-1px)' }} />}
                    </div>
                    <div style={{ fontFamily: interFont.fontFamily, fontSize: 20, color: isDone ? CREAM : INK_MID }}>{line.text}</div>
                  </div>
                );
              })}
              <div style={{ marginTop: 16, opacity: readyOp }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, backgroundColor: `${SUCCESS}22`, border: `1px solid ${SUCCESS}66`, borderRadius: 8, padding: '10px 20px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: SUCCESS }} />
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 18, color: SUCCESS, fontWeight: 600 }}>Checklist ready — 8 items generated</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cursor */}
      <div style={{ position: 'absolute', left: cursorX - 6, top: cursorY - 6, opacity: cursorOp, pointerEvents: 'none' }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: WHITE, boxShadow: '0 0 10px rgba(255,255,255,0.6)' }} />
      </div>

      {/* PDF icon */}
      <div style={{ position: 'absolute', left: pdfX, top: pdfY, opacity: pdfOp, width: 44, height: 54, backgroundColor: CRIMSON, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: interFont.fontFamily, fontSize: 13, fontWeight: 700, color: WHITE }}>PDF</div>
      </div>
    </AbsoluteFill>
  );
};
