import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { interFont, playfairFont } from '../fonts';
import {
  BCH,
  BG,
  BL,
  BT,
  BW,
  CH_B,
  CREAM,
  CREAM_BORDER,
  CRIMSON,
  CW_B,
  INK_LIGHT,
  INK_MID,
  NW,
  SURFACE_DARK,
  WHITE,
} from '../constants';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Transaction', path: '/demo' },
  { label: 'Ask Harriett', path: '/agent' },
  { label: 'Calendar', path: '/calendar' },
];

const CHECKLIST_ITEMS = [
  { text: 'Send Just Listed postcard', done: true },
  { text: 'Upload photos to MLS', done: false },
  { text: 'Verify lead-based paint disclosure', done: false, flagged: true },
  { text: 'Schedule inspection window', done: false },
];

const ITEM_START_FRAMES = [40, 52, 64, 76]; // relative to Phase C start (frame 120)

const STATUS_LINES = [
  { text: 'Reading listing agreement...', appearFrame: 70, doneFrame: 96 },
  { text: 'Extracting deal fields...', appearFrame: 80, doneFrame: 103 },
  { text: 'Building checklist...', appearFrame: 90, doneFrame: 110 },
];

const CHAT_RESPONSE =
  "Inspection window closes June 15. That's the 10-day FHA window from the April 30 contract date. First Federal's appraisal is set for June 10 — confirm that wraps up first.";

const BrowserChrome: React.FC<{ page: string }> = ({ page }) => (
  <div
    style={{
      height: BCH,
      backgroundColor: '#2A2420',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: 16,
      gap: 8,
      flexShrink: 0,
    }}
  >
    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FF5F57' }} />
    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#28C840' }} />
    <div
      style={{
        marginLeft: 24,
        backgroundColor: '#1C1814',
        borderRadius: 6,
        padding: '5px 20px',
        fontFamily: interFont.fontFamily,
        color: INK_LIGHT,
        fontSize: 13,
      }}
    >
      harriett-demo.vercel.app{page}
    </div>
  </div>
);

const AppNav: React.FC<{ active: string }> = ({ active }) => (
  <div
    style={{
      width: NW,
      height: CH_B,
      backgroundColor: BG,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 0',
      borderRight: `1px solid ${SURFACE_DARK}`,
    }}
  >
    <div
      style={{
        padding: '0 14px 20px',
        fontFamily: playfairFont.fontFamily,
        fontSize: 20,
        fontWeight: 700,
        color: CREAM,
      }}
    >
      Harriett<span style={{ color: CRIMSON }}>.</span>
    </div>
    {NAV_ITEMS.map((item) => (
      <div
        key={item.path}
        style={{
          padding: '10px 14px',
          fontFamily: interFont.fontFamily,
          fontSize: 13,
          color: active === item.path ? CREAM : INK_MID,
          backgroundColor: active === item.path ? `${CRIMSON}28` : 'transparent',
          borderLeft: `3px solid ${active === item.path ? CRIMSON : 'transparent'}`,
        }}
      >
        {item.label}
      </div>
    ))}
  </div>
);

export const Scene3Demo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Active page by phase
  const activePage =
    frame < 120 ? '/demo' : frame < 210 ? '/dashboard' : '/agent';

  // Phase A: Upload (0-60)
  const dropZoneOpacity = interpolate(frame, [0, 8, 55, 65], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const borderHighlight = frame >= 42 && frame < 62;

  // Cursor: starts at (1560, 980), moves to drop zone center
  // Drop zone center on canvas: BL + NW + CW_B/2 = 140+180+730 = 1050, BT+BCH+CH_B/2 = 148+40+370 = 558
  const cursorX = interpolate(frame, [8, 38], [1560, 1050], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
  });
  const cursorY = interpolate(frame, [8, 38], [980, 558], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
  });
  const cursorOpacity = interpolate(frame, [8, 14, 55, 65], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // PDF icon
  const pdfOpacity = interpolate(frame, [20, 26, 46, 54], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pdfX =
    frame < 38
      ? cursorX + 14
      : interpolate(frame, [38, 50], [cursorX + 14, 1022], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
  const pdfY =
    frame < 38
      ? cursorY - 36
      : interpolate(frame, [38, 50], [cursorY - 36, 566], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.in(Easing.cubic),
        });

  // Ripple at drop zone center
  const rippleRaw = spring({
    frame: frame - 40,
    fps,
    config: { damping: 20, stiffness: 300 },
    durationInFrames: 18,
  });
  const rippleSize = interpolate(rippleRaw, [0, 1], [0, 100]);
  const rippleOpacity = interpolate(frame, [40, 60], [0.7, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Phase B: Parsing (60-120)
  const progressOpacity = interpolate(frame, [62, 70, 118, 126], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const progressWidth = interpolate(frame, [66, 105], [0, CW_B - 56], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

  // Upload panel fades out at phase boundary
  const uploadPanelOp = interpolate(frame, [116, 128], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Phase C: Dashboard (120-210)
  const dashOpacity = interpolate(frame, [124, 136, 205, 215], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const localC = frame - 120;
  const addrOp = interpolate(localC, [10, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const statsOp = interpolate(localC, [20, 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const checkHeaderOp = interpolate(localC, [30, 38], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Phase D: Chat (210-300)
  const chatOpacity = interpolate(frame, [210, 222], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const localD = frame - 210;
  const userMsgOp = interpolate(localD, [5, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const harriettNameOp = interpolate(localD, [24, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const chatTypingStart = 30;
  const chatCharCount = Math.min(
    Math.floor(Math.max(0, localD - chatTypingStart) * 3),
    CHAT_RESPONSE.length,
  );
  const chatDisplayText = CHAT_RESPONSE.slice(0, chatCharCount);
  const blinkOn = Math.floor(frame / 8) % 2 === 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#141210' }}>
      {/* Small label */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: BL,
          fontFamily: interFont.fontFamily,
          fontSize: 14,
          color: INK_MID,
          textTransform: 'uppercase',
          letterSpacing: 2,
          opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        Live Demo
      </div>

      {/* Browser window */}
      <div
        style={{
          position: 'absolute',
          left: BL,
          top: BT,
          width: BW,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 32px 96px rgba(0,0,0,0.7)',
        }}
      >
        <BrowserChrome page={activePage} />
        <div style={{ display: 'flex', height: CH_B }}>
          <AppNav active={activePage} />

          {/* Content panels stacked */}
          <div style={{ position: 'relative', width: CW_B, height: CH_B, overflow: 'hidden' }}>

            {/* Upload + parsing panel (Phase A & B) */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: CW_B,
                height: CH_B,
                backgroundColor: BG,
                opacity: uploadPanelOp,
              }}
            >
              {/* Drop zone */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: CW_B,
                  height: CH_B,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: dropZoneOpacity,
                }}
              >
                <div
                  style={{
                    width: 640,
                    height: 200,
                    border: `2px dashed ${borderHighlight ? CRIMSON : '#3A3028'}`,
                    borderRadius: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: borderHighlight ? `${CRIMSON}18` : 'transparent',
                  }}
                >
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 22, color: INK_MID }}>
                    Drop listing agreement here
                  </div>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 15, color: INK_LIGHT, marginTop: 8 }}>
                    604-2nd-st-listing-agreement.pdf
                  </div>
                </div>
                {/* Ripple */}
                {rippleOpacity > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      width: rippleSize,
                      height: rippleSize,
                      borderRadius: '50%',
                      border: `2px solid ${CRIMSON}`,
                      left: CW_B / 2 - rippleSize / 2,
                      top: CH_B / 2 - rippleSize / 2,
                      opacity: rippleOpacity,
                    }}
                  />
                )}
              </div>

              {/* Parsing progress (Phase B) */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: CW_B,
                  height: CH_B,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: '0 56px',
                  boxSizing: 'border-box',
                  opacity: progressOpacity,
                }}
              >
                <div style={{ width: '100%', height: 6, backgroundColor: '#2A2420', borderRadius: 3 }}>
                  <div
                    style={{ width: progressWidth, height: 6, backgroundColor: CRIMSON, borderRadius: 3 }}
                  />
                </div>
                {STATUS_LINES.map((line, i) => {
                  const lineOp = interpolate(frame, [line.appearFrame, line.appearFrame + 7], [0, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  });
                  const isDone = frame >= line.doneFrame;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 20 + i * 52, opacity: lineOp }}>
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          backgroundColor: isDone ? CRIMSON : 'transparent',
                          border: `2px solid ${isDone ? CRIMSON : INK_MID}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isDone && (
                          <div
                            style={{
                              width: 8,
                              height: 5,
                              borderLeft: `2px solid ${WHITE}`,
                              borderBottom: `2px solid ${WHITE}`,
                              transform: 'rotate(-45deg) translateY(-1px)',
                            }}
                          />
                        )}
                      </div>
                      <div style={{ fontFamily: interFont.fontFamily, fontSize: 20, color: isDone ? CREAM : INK_MID }}>
                        {line.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dashboard panel (Phase C) */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: CW_B,
                height: CH_B,
                backgroundColor: CREAM,
                opacity: dashOpacity,
                padding: '24px 28px',
                boxSizing: 'border-box',
                overflowY: 'hidden',
              }}
            >
              <div style={{ opacity: addrOp }}>
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 11, color: CRIMSON, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
                  Active Transaction
                </div>
                <div style={{ fontFamily: playfairFont.fontFamily, fontSize: 30, fontWeight: 700, color: BG, marginBottom: 18 }}>
                  604 2nd St NW, Gordo, AL
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 22, opacity: statsOp }}>
                {[
                  { label: 'Sale Price', value: '$208,000', color: CRIMSON },
                  { label: 'Closing', value: 'June 5, 2026', color: '#166534' },
                  { label: 'Agent', value: 'Jerrod Hastings', color: '#2563EB' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      backgroundColor: WHITE,
                      borderRadius: 10,
                      padding: '12px 18px',
                      borderLeft: `4px solid ${stat.color}`,
                    }}
                  >
                    <div style={{ fontFamily: interFont.fontFamily, fontSize: 11, color: INK_MID, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {stat.label}
                    </div>
                    <div style={{ fontFamily: interFont.fontFamily, fontSize: 22, fontWeight: 700, color: stat.color }}>
                      {stat.value}
                    </div>
                  </div>
                ))}
                <div style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: '12px 18px', borderLeft: `4px solid ${CRIMSON}` }}>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 11, color: CRIMSON, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Alert</div>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 18, fontWeight: 600, color: CRIMSON }}>Pre-1978 — Lead Paint</div>
                </div>
              </div>

              <div style={{ opacity: checkHeaderOp }}>
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 11, color: CRIMSON, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
                  Coordinator Checklist
                </div>
                {CHECKLIST_ITEMS.map((item, i) => {
                  const startF = 120 + ITEM_START_FRAMES[i];
                  const iS = spring({ frame: frame - startF, fps, config: { damping: 18, stiffness: 150 }, durationInFrames: 12 });
                  const iX = interpolate(iS, [0, 1], [80, 0]);
                  const iOp = interpolate(frame, [startF, startF + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '11px 0',
                        borderBottom: `1px solid ${CREAM_BORDER}`,
                        transform: `translateX(${iX}px)`,
                        opacity: iOp,
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          backgroundColor: item.done ? CRIMSON : 'transparent',
                          border: `2px solid ${item.done ? CRIMSON : CREAM_BORDER}`,
                          flexShrink: 0,
                        }}
                      />
                      <div
                        style={{
                          fontFamily: interFont.fontFamily,
                          fontSize: 18,
                          color: item.flagged ? CRIMSON : BG,
                          textDecoration: item.done ? 'line-through' : 'none',
                          opacity: item.done ? 0.6 : 1,
                          fontWeight: item.flagged ? 600 : 400,
                        }}
                      >
                        {item.text}
                        {item.flagged && (
                          <span style={{ marginLeft: 8, fontSize: 13, color: CRIMSON }}> REQUIRED</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat panel (Phase D) */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: CW_B,
                height: CH_B,
                backgroundColor: CREAM,
                opacity: chatOpacity,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Context bar */}
              <div
                style={{
                  backgroundColor: WHITE,
                  borderBottom: `1px solid ${CREAM_BORDER}`,
                  padding: '14px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  flexShrink: 0,
                }}
              >
                <div style={{ fontFamily: playfairFont.fontFamily, fontSize: 18, fontWeight: 700, color: BG }}>
                  Ask Harriett
                </div>
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 13, color: INK_MID }}>
                  604 2nd St NW
                </div>
                <div style={{ marginLeft: 'auto', fontFamily: interFont.fontFamily, fontSize: 13, color: INK_LIGHT }}>
                  Jerrod Hastings
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* User bubble */}
                <div style={{ opacity: userMsgOp, display: 'flex', justifyContent: 'flex-end' }}>
                  <div
                    style={{
                      backgroundColor: CRIMSON,
                      borderRadius: '14px 14px 2px 14px',
                      padding: '12px 18px',
                      maxWidth: 480,
                    }}
                  >
                    <div style={{ fontFamily: interFont.fontFamily, fontSize: 16, color: WHITE }}>
                      When does the inspection window close?
                    </div>
                  </div>
                </div>

                {/* Harriett response */}
                <div style={{ opacity: harriettNameOp, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 12, color: INK_MID, paddingLeft: 4 }}>
                    Harriett
                  </div>
                  <div
                    style={{
                      backgroundColor: WHITE,
                      borderRadius: '2px 14px 14px 14px',
                      padding: '14px 18px',
                      maxWidth: 680,
                      border: `1px solid ${CREAM_BORDER}`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: interFont.fontFamily,
                        fontSize: 16,
                        color: BG,
                        lineHeight: 1.7,
                      }}
                    >
                      {chatDisplayText}
                      {chatCharCount < CHAT_RESPONSE.length && (
                        <span style={{ opacity: blinkOn ? 1 : 0, color: CRIMSON }}>|</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Cursor (canvas-level, overlays browser) */}
      <div
        style={{
          position: 'absolute',
          left: cursorX - 6,
          top: cursorY - 6,
          opacity: cursorOpacity,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: WHITE,
            boxShadow: '0 0 10px rgba(255,255,255,0.6)',
          }}
        />
      </div>

      {/* PDF icon (canvas-level) */}
      <div
        style={{
          position: 'absolute',
          left: pdfX,
          top: pdfY,
          opacity: pdfOpacity,
          width: 44,
          height: 54,
          backgroundColor: CRIMSON,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontFamily: interFont.fontFamily, fontSize: 13, fontWeight: 700, color: WHITE }}>
          PDF
        </div>
      </div>
    </AbsoluteFill>
  );
};
