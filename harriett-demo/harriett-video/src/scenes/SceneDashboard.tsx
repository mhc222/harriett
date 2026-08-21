import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { interFont, playfairFont } from '../fonts';
import { BG, BL, BT, BW, CH_B, CREAM, CREAM_BORDER, CRIMSON, CW_B, BLUE, SUCCESS, WHITE } from '../constants';
import { AppNav, BrowserChrome } from '../components/Browser';
import { Callout } from '../components/Callout';

const CHECKLIST = [
  { text: 'Send Just Listed postcard', done: true },
  { text: 'Upload photos to MLS', done: true },
  { text: 'Verify lead-based paint disclosure', done: false, flagged: true },
  { text: 'Schedule inspection window', done: false },
  { text: 'Log in Listings Master', done: false },
  { text: 'Email MLS link to agent', done: false },
  { text: 'Make blue label for folder', done: false },
];

const DEADLINES = [
  { date: 'Jun 10', label: 'FHA appraisal', color: BLUE },
  { date: 'Jun 15', label: 'Inspection window closes', color: CRIMSON },
  { date: 'Jun 25', label: 'Appraisal deadline', color: '#7E22CE' },
  { date: 'Jul 5', label: 'Closing — First Federal', color: SUCCESS },
];

export const SceneDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneOp = interpolate(frame, [0, 12, 170, 180], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const headerOp = interpolate(frame, [8, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const statsOp = interpolate(frame, [18, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const alertOp = interpolate(frame, [28, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const checkItems = CHECKLIST.map((_, i) => ({
    op: interpolate(frame, [42 + i * 9, 52 + i * 9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    x: interpolate(
      spring({ frame: frame - (42 + i * 9), fps, config: { damping: 18, stiffness: 140 }, durationInFrames: 12 }),
      [0, 1], [60, 0],
    ),
  }));

  const deadlineItems = DEADLINES.map((_, i) => ({
    op: interpolate(frame, [50 + i * 10, 60 + i * 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    x: interpolate(
      spring({ frame: frame - (50 + i * 10), fps, config: { damping: 18, stiffness: 140 }, durationInFrames: 12 }),
      [0, 1], [50, 0],
    ),
  }));

  return (
    <AbsoluteFill style={{ backgroundColor: '#141210', opacity: sceneOp }}>
      <div style={{ position: 'absolute', left: BL, top: BT, width: BW, borderRadius: 12, overflow: 'hidden', boxShadow: '0 32px 96px rgba(0,0,0,0.7)' }}>
        <BrowserChrome page="/dashboard" />
        <div style={{ display: 'flex', height: CH_B }}>
          <AppNav active="/dashboard" />
          <div style={{ width: CW_B, height: CH_B, backgroundColor: CREAM, padding: '28px 32px', boxSizing: 'border-box', overflowY: 'hidden' }}>

            {/* Header */}
            <div style={{ opacity: headerOp, marginBottom: 20 }}>
              <div style={{ fontFamily: interFont.fontFamily, fontSize: 11, color: CRIMSON, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
                Active Transaction
              </div>
              <div style={{ fontFamily: playfairFont.fontFamily, fontSize: 32, fontWeight: 700, color: BG }}>
                604 2nd St NW, Gordo, AL
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 18, opacity: statsOp }}>
              {[
                { label: 'Sale Price', value: '$208,000', color: CRIMSON },
                { label: 'Closing', value: 'June 5, 2026', color: SUCCESS },
                { label: 'Agent', value: 'Jerrod Hastings', color: BLUE },
              ].map((stat) => (
                <div key={stat.label} style={{ backgroundColor: WHITE, borderRadius: 8, padding: '10px 16px', borderLeft: `4px solid ${stat.color}` }}>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 10, color: '#9C9189', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{stat.label}</div>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 19, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
              <div style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: '10px 16px', borderLeft: `4px solid ${CRIMSON}`, opacity: alertOp }}>
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 10, color: CRIMSON, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Alert</div>
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 16, fontWeight: 600, color: CRIMSON }}>Pre-1978 — Lead Paint Required</div>
              </div>
            </div>

            {/* Two columns */}
            <div style={{ display: 'flex', gap: 32 }}>
              {/* Checklist */}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 11, color: CRIMSON, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
                  Coordinator Checklist
                </div>
                {CHECKLIST.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${CREAM_BORDER}`, opacity: checkItems[i].op, transform: `translateX(${checkItems[i].x}px)` }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: item.done ? CRIMSON : 'transparent', border: `2px solid ${item.done ? CRIMSON : CREAM_BORDER}`, flexShrink: 0 }} />
                    <div style={{ fontFamily: interFont.fontFamily, fontSize: 17, color: item.flagged ? CRIMSON : BG, textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.55 : 1, fontWeight: item.flagged ? 600 : 400 }}>
                      {item.text}
                      {item.flagged && <span style={{ marginLeft: 8, fontSize: 12, color: CRIMSON }}> REQUIRED</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Deadlines */}
              <div style={{ width: 440 }}>
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 11, color: CRIMSON, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
                  Upcoming Deadlines
                </div>
                {DEADLINES.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', marginBottom: 10, backgroundColor: WHITE, borderRadius: 8, borderLeft: `4px solid ${d.color}`, opacity: deadlineItems[i].op, transform: `translateX(${deadlineItems[i].x}px)` }}>
                    <div style={{ fontFamily: interFont.fontFamily, fontSize: 16, fontWeight: 700, color: d.color, width: 56, flexShrink: 0 }}>{d.date}</div>
                    <div style={{ fontFamily: interFont.fontFamily, fontSize: 17, color: BG }}>{d.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Callouts */}
      <Callout
        text="Pre-1978 lead paint flagged"
        subtext="Required disclosure — auto-detected"
        appearFrame={50}
        disappearFrame={82}
        x={1430}
        y={296}
        color={CRIMSON}
        arrowSide="right"
      />
      <Callout
        text="10 days to inspection close"
        subtext="June 15 deadline"
        appearFrame={90}
        x={1430}
        y={490}
        color="#7E22CE"
        arrowSide="right"
      />
    </AbsoluteFill>
  );
};
