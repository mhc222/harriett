import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { interFont, playfairFont } from '../fonts';
import { BG, BL, BT, BW, CH_B, CREAM, CREAM_BORDER, CRIMSON, CW_B, INK_LIGHT, INK_MID, SUCCESS, WHITE } from '../constants';
import { AppNav, BrowserChrome } from '../components/Browser';
import { Callout } from '../components/Callout';

const EMAILS = [
  { from: 'Brittany Newton', subject: 'Title Commitment — 604 2nd St NW', time: '9:42 AM', read: true },
  { from: 'Jerrod Hastings', subject: 'Fwd: Executed Contract — 604 2nd St NW', time: '8:17 AM', read: false, highlight: true },
  { from: 'First Federal Bank', subject: 'Loan Approval — Shaina & Kevin Fields', time: 'Yesterday', read: true },
  { from: 'Wilson Moore', subject: 'Monday Master List — week of Jun 9', time: 'Yesterday', read: true },
];

const PREVIEW_LINES = [
  'From: Jerrod Hastings <jerrod@pritchettmoore.com>',
  'To: harriett@pritchettmoore.com',
  'Subject: Fwd: Executed Contract — 604 2nd St NW',
  '',
  'Harriett — contract just executed on Gordo. See attached.',
  'Shaina and Kevin Fields, buyers. Damon Gann handling',
  'buyer side. Closing target July 5. FHA loan.',
  '',
  '— Jerrod',
];

const SIDEBAR_W = 380;

export const SceneEmail: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneOp = interpolate(frame, [0, 10, 170, 180], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const labelOp = interpolate(frame, [4, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const emailListOp = interpolate(frame, [8, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const emailItems = EMAILS.map((_, i) => ({
    op: interpolate(frame, [14 + i * 8, 24 + i * 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  }));

  const highlightPulse = Math.sin(frame * 0.15) * 0.15 + 0.85;
  const previewOp = interpolate(frame, [52, 66], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const previewLines = PREVIEW_LINES.map((_, i) => ({
    op: interpolate(frame, [58 + i * 6, 68 + i * 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  }));

  // Detection banner
  const bannerS = spring({ frame: frame - 100, fps, config: { damping: 16, stiffness: 120 }, durationInFrames: 20 });
  const bannerY = interpolate(bannerS, [0, 1], [80, 0]);
  const bannerOp = interpolate(frame, [100, 114], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const bannerTextCount = Math.min(Math.floor(Math.max(0, frame - 118) * 3.5), 52);
  const bannerText = 'Contract detected — building coordination checklist now'.slice(0, bannerTextCount);

  return (
    <AbsoluteFill style={{ backgroundColor: '#141210', opacity: sceneOp }}>
      <div style={{ position: 'absolute', top: 80, left: BL, fontFamily: interFont.fontFamily, fontSize: 14, color: INK_MID, textTransform: 'uppercase', letterSpacing: 2, opacity: labelOp }}>
        Email Monitoring
      </div>

      <div style={{ position: 'absolute', left: BL, top: BT, width: BW, borderRadius: 12, overflow: 'hidden', boxShadow: '0 32px 96px rgba(0,0,0,0.7)' }}>
        <BrowserChrome page="/inbox" />
        <div style={{ display: 'flex', height: CH_B }}>
          <AppNav active="/inbox" />

          {/* Email client */}
          <div style={{ width: CW_B, height: CH_B, backgroundColor: CREAM, display: 'flex' }}>

            {/* Email list sidebar */}
            <div style={{ width: SIDEBAR_W, height: CH_B, backgroundColor: WHITE, borderRight: `1px solid ${CREAM_BORDER}`, opacity: emailListOp }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${CREAM_BORDER}` }}>
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 13, fontWeight: 600, color: BG }}>Inbox</div>
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 11, color: INK_MID, marginTop: 2 }}>Microsoft 365 — jerrod@pritchettmoore.com</div>
              </div>
              {EMAILS.map((email, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 18px',
                    borderBottom: `1px solid ${CREAM_BORDER}`,
                    backgroundColor: email.highlight ? `${CRIMSON}12` : 'transparent',
                    borderLeft: `3px solid ${email.highlight ? CRIMSON : 'transparent'}`,
                    opacity: emailItems[i].op * (email.highlight ? highlightPulse : 1),
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <div style={{ fontFamily: interFont.fontFamily, fontSize: 13, fontWeight: email.read ? 400 : 700, color: email.highlight ? CRIMSON : BG }}>
                      {email.from}
                    </div>
                    <div style={{ fontFamily: interFont.fontFamily, fontSize: 11, color: INK_LIGHT }}>{email.time}</div>
                  </div>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 12, color: email.highlight ? CRIMSON : INK_MID, fontWeight: email.read ? 400 : 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {email.subject}
                  </div>
                </div>
              ))}
            </div>

            {/* Preview pane */}
            <div style={{ flex: 1, padding: '24px 28px', opacity: previewOp, position: 'relative' }}>
              <div style={{ fontFamily: playfairFont.fontFamily, fontSize: 22, fontWeight: 700, color: BG, marginBottom: 20 }}>
                Fwd: Executed Contract
              </div>
              {PREVIEW_LINES.map((line, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: interFont.fontFamily,
                    fontSize: line.startsWith('From:') || line.startsWith('To:') || line.startsWith('Subject:') ? 12 : 15,
                    color: line.startsWith('From:') || line.startsWith('To:') || line.startsWith('Subject:') ? INK_MID : BG,
                    lineHeight: 1.9,
                    opacity: previewLines[i]?.op ?? 0,
                  }}
                >
                  {line || ' '}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detection banner */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: BG,
            borderTop: `2px solid ${CRIMSON}`,
            padding: '16px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            opacity: bannerOp,
            transform: `translateY(${bannerY}px)`,
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: CRIMSON, flexShrink: 0 }} />
          <div style={{ fontFamily: interFont.fontFamily, fontSize: 16, color: CREAM }}>
            {bannerText}
            {bannerTextCount < 53 && <span style={{ color: CRIMSON }}>|</span>}
          </div>
          {bannerTextCount >= 53 && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: SUCCESS }} />
              <div style={{ fontFamily: interFont.fontFamily, fontSize: 13, color: SUCCESS }}>8 items generated</div>
            </div>
          )}
        </div>
      </div>

      {/* Callout */}
      <Callout
        text="Contract detected automatically"
        subtext="Microsoft 365 inbox monitoring"
        appearFrame={105}
        x={148}
        y={820}
        color={SUCCESS}
        arrowSide="left"
      />
    </AbsoluteFill>
  );
};
