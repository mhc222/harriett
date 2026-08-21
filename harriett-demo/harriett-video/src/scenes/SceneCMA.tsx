import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { interFont, playfairFont } from '../fonts';
import { BG, BL, BT, BW, CH_B, CREAM, CREAM_BORDER, CRIMSON, CW_B, BLUE, INK_MID, SUCCESS, WHITE } from '../constants';
import { AppNav, BrowserChrome } from '../components/Browser';

const COMPS = [
  { address: '612 2nd St NW, Gordo', sqft: '1,420', sold: '$185,000', ppsf: '$130', days: '22' },
  { address: '8 Vine St, Gordo', sqft: '1,380', sold: '$179,000', ppsf: '$130', days: '31' },
  { address: '301 Plum St, Gordo', sqft: '1,550', sold: '$192,000', ppsf: '$124', days: '18' },
  { address: '204 Oak Ave, Gordo', sqft: '1,480', sold: '$188,500', ppsf: '$127', days: '44' },
];

export const SceneCMA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneOp = interpolate(frame, [0, 10, 170, 180], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const labelOp = interpolate(frame, [4, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const headerOp = interpolate(frame, [10, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tableHeaderOp = interpolate(frame, [22, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const compRows = COMPS.map((_, i) => ({
    op: interpolate(frame, [38 + i * 14, 50 + i * 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    y: interpolate(
      spring({ frame: frame - (38 + i * 14), fps, config: { damping: 18, stiffness: 130 }, durationInFrames: 14 }),
      [0, 1], [30, 0],
    ),
  }));

  const summaryOp = interpolate(frame, [110, 124], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ctaOp = interpolate(frame, [130, 144], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ctaPulse = interpolate(Math.sin(frame * 0.18), [-1, 1], [0.85, 1]);

  const COLS = ['Address', 'Sq Ft', 'Sale Price', '$/Sq Ft', 'Days on Market'];
  const COL_WIDTHS = [340, 110, 140, 110, 160];

  return (
    <AbsoluteFill style={{ backgroundColor: '#141210', opacity: sceneOp }}>
      <div style={{ position: 'absolute', top: 80, left: BL, fontFamily: interFont.fontFamily, fontSize: 14, color: INK_MID, textTransform: 'uppercase', letterSpacing: 2, opacity: labelOp }}>
        CMA Prep
      </div>

      <div style={{ position: 'absolute', left: BL, top: BT, width: BW, borderRadius: 12, overflow: 'hidden', boxShadow: '0 32px 96px rgba(0,0,0,0.7)' }}>
        <BrowserChrome page="/pre-listing" />
        <div style={{ display: 'flex', height: CH_B }}>
          <AppNav active="/pre-listing" />
          <div style={{ width: CW_B, height: CH_B, backgroundColor: CREAM, padding: '30px 36px', boxSizing: 'border-box' }}>

            {/* Header */}
            <div style={{ opacity: headerOp, marginBottom: 28 }}>
              <div style={{ fontFamily: interFont.fontFamily, fontSize: 11, color: CRIMSON, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
                Pre-Listing — CMA Draft
              </div>
              <div style={{ fontFamily: playfairFont.fontFamily, fontSize: 30, fontWeight: 700, color: BG }}>
                Academy Drive — Tuscaloosa, AL
              </div>
              <div style={{ fontFamily: interFont.fontFamily, fontSize: 15, color: INK_MID, marginTop: 6 }}>
                Jerrod Hastings · 4 comparable sales · Gordo submarket
              </div>
            </div>

            {/* Table */}
            <div style={{ backgroundColor: WHITE, borderRadius: 10, overflow: 'hidden', border: `1px solid ${CREAM_BORDER}` }}>
              {/* Header row */}
              <div style={{ display: 'flex', backgroundColor: BG, padding: '12px 0', opacity: tableHeaderOp }}>
                {COLS.map((col, i) => (
                  <div key={i} style={{ width: COL_WIDTHS[i], padding: '0 14px', fontFamily: interFont.fontFamily, fontSize: 11, color: '#9C9189', textTransform: 'uppercase', letterSpacing: 1.5, flexShrink: 0 }}>
                    {col}
                  </div>
                ))}
              </div>

              {/* Data rows */}
              {COMPS.map((comp, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    padding: '14px 0',
                    borderBottom: i < COMPS.length - 1 ? `1px solid ${CREAM_BORDER}` : 'none',
                    opacity: compRows[i].op,
                    transform: `translateY(${compRows[i].y}px)`,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ width: COL_WIDTHS[0], padding: '0 14px', fontFamily: interFont.fontFamily, fontSize: 15, color: BG, flexShrink: 0 }}>{comp.address}</div>
                  <div style={{ width: COL_WIDTHS[1], padding: '0 14px', fontFamily: interFont.fontFamily, fontSize: 15, color: INK_MID, flexShrink: 0 }}>{comp.sqft}</div>
                  <div style={{ width: COL_WIDTHS[2], padding: '0 14px', fontFamily: interFont.fontFamily, fontSize: 15, fontWeight: 600, color: SUCCESS, flexShrink: 0 }}>{comp.sold}</div>
                  <div style={{ width: COL_WIDTHS[3], padding: '0 14px', fontFamily: interFont.fontFamily, fontSize: 15, color: BLUE, flexShrink: 0 }}>{comp.ppsf}</div>
                  <div style={{ width: COL_WIDTHS[4], padding: '0 14px', fontFamily: interFont.fontFamily, fontSize: 15, color: INK_MID, flexShrink: 0 }}>{comp.days} days</div>
                </div>
              ))}
            </div>

            {/* Summary + CTA */}
            <div style={{ display: 'flex', gap: 20, marginTop: 22, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, backgroundColor: WHITE, borderRadius: 10, padding: '18px 22px', border: `1px solid ${CREAM_BORDER}`, borderLeft: `4px solid ${SUCCESS}`, opacity: summaryOp }}>
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 11, color: SUCCESS, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Harriett's Analysis</div>
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 18, fontWeight: 700, color: BG, marginBottom: 6 }}>Suggested range: $183k – $196k</div>
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 14, color: INK_MID, lineHeight: 1.6 }}>
                  Based on 4 comps averaging $128/sqft. Adjusted for lot, condition, and DOM. Subject property estimated 1,490 sqft.
                </div>
              </div>
              <div
                style={{
                  backgroundColor: CRIMSON,
                  borderRadius: 10,
                  padding: '18px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  opacity: ctaOp * ctaPulse,
                  flexShrink: 0,
                }}
              >
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 16, fontWeight: 600, color: WHITE }}>Send draft to Jerrod</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
