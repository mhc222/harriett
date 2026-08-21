import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { interFont, playfairFont } from '../fonts';
import { BG, CREAM, CREAM_BORDER, CRIMSON, INK_MID, WHITE } from '../constants';

const NAV_W = 240;
const CONTENT_W = 1920 - NAV_W;

const CHECKLIST = [
  { text: 'Send Just Listed postcard', done: true },
  { text: 'Upload photos to MLS', done: true },
  { text: 'Verify lead-based paint disclosure', done: false, flagged: true },
  { text: 'Schedule inspection window', done: false },
  { text: 'Log in Listings Master', done: false },
  { text: 'Email MLS link to agent', done: false },
];

const DEADLINES = [
  { date: 'Jun 18', label: 'Inspection window closes', color: CRIMSON },
  { date: 'Jun 10', label: 'FHA appraisal', color: '#2563EB' },
  { date: 'Jun 25', label: 'Appraisal deadline', color: '#7E22CE' },
  { date: 'Jul 5', label: 'Closing', color: '#166534' },
];

const FullNav: React.FC = () => (
  <div
    style={{
      width: NAV_W,
      height: 1080,
      backgroundColor: BG,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '32px 0',
      borderRight: `1px solid #2A2420`,
    }}
  >
    <div style={{ padding: '0 24px 32px', fontFamily: playfairFont.fontFamily, fontSize: 28, fontWeight: 700, color: CREAM }}>
      Harriett<span style={{ color: CRIMSON }}>.</span>
    </div>
    {[
      { label: 'Dashboard', active: true },
      { label: 'Transaction', active: false },
      { label: 'Ask Harriett', active: false },
      { label: 'Calendar', active: false },
      { label: 'Pre-Listing', active: false },
    ].map((item) => (
      <div
        key={item.label}
        style={{
          padding: '12px 24px',
          fontFamily: interFont.fontFamily,
          fontSize: 15,
          color: item.active ? CREAM : INK_MID,
          backgroundColor: item.active ? `${CRIMSON}28` : 'transparent',
          borderLeft: `3px solid ${item.active ? CRIMSON : 'transparent'}`,
        }}
      >
        {item.label}
      </div>
    ))}
  </div>
);

export const Scene4Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const screenS = spring({ frame, fps, config: { damping: 16, stiffness: 110 }, durationInFrames: 20 });
  const screenScale = interpolate(screenS, [0, 1], [0.97, 1]);
  const screenOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const headlineOp = interpolate(frame, [8, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Checklist items animate in
  const checkItems = CHECKLIST.map((_, i) => ({
    op: interpolate(frame, [14 + i * 8, 22 + i * 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    x: interpolate(
      spring({ frame: frame - (14 + i * 8), fps, config: { damping: 18, stiffness: 140 }, durationInFrames: 12 }),
      [0, 1],
      [60, 0],
    ),
  }));

  // Deadlines animate in from right
  const deadlineItems = DEADLINES.map((_, i) => ({
    op: interpolate(frame, [20 + i * 8, 28 + i * 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    x: interpolate(
      spring({ frame: frame - (20 + i * 8), fps, config: { damping: 18, stiffness: 140 }, durationInFrames: 12 }),
      [0, 1],
      [60, 0],
    ),
  }));

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        transform: `scale(${screenScale})`,
        opacity: screenOpacity,
        transformOrigin: 'center center',
      }}
    >
      <div style={{ display: 'flex', width: 1920, height: 1080 }}>
        <FullNav />

        {/* Content */}
        <div
          style={{
            width: CONTENT_W,
            height: 1080,
            backgroundColor: CREAM,
            padding: '40px 48px',
            boxSizing: 'border-box',
            overflowY: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ opacity: headlineOp, marginBottom: 32 }}>
            <div style={{ fontFamily: interFont.fontFamily, fontSize: 13, color: CRIMSON, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
              Active Transaction
            </div>
            <div style={{ fontFamily: playfairFont.fontFamily, fontSize: 40, fontWeight: 700, color: BG }}>
              604 2nd St NW, Gordo, AL
            </div>
          </div>

          {/* Two columns */}
          <div style={{ display: 'flex', gap: 40 }}>
            {/* Left: Checklist */}
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: interFont.fontFamily, fontSize: 12, color: CRIMSON, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
                Coordinator Checklist
              </div>
              {CHECKLIST.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '13px 0',
                    borderBottom: `1px solid ${CREAM_BORDER}`,
                    opacity: checkItems[i].op,
                    transform: `translateX(${checkItems[i].x}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      backgroundColor: item.done ? CRIMSON : 'transparent',
                      border: `2px solid ${item.done ? CRIMSON : CREAM_BORDER}`,
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      fontFamily: interFont.fontFamily,
                      fontSize: 20,
                      color: item.flagged ? CRIMSON : BG,
                      textDecoration: item.done ? 'line-through' : 'none',
                      opacity: item.done ? 0.55 : 1,
                      fontWeight: item.flagged ? 600 : 400,
                    }}
                  >
                    {item.text}
                    {item.flagged && (
                      <span style={{ marginLeft: 8, fontSize: 14, color: CRIMSON }}> REQUIRED</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Deadlines */}
            <div style={{ width: 480 }}>
              <div style={{ fontFamily: interFont.fontFamily, fontSize: 12, color: CRIMSON, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
                Upcoming Deadlines
              </div>
              {DEADLINES.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '14px 18px',
                    marginBottom: 12,
                    backgroundColor: WHITE,
                    borderRadius: 10,
                    borderLeft: `4px solid ${d.color}`,
                    opacity: deadlineItems[i].op,
                    transform: `translateX(${deadlineItems[i].x}px)`,
                  }}
                >
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 18, fontWeight: 700, color: d.color, width: 60, flexShrink: 0 }}>
                    {d.date}
                  </div>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 20, color: BG }}>
                    {d.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
