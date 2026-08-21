import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { interFont, playfairFont } from '../fonts';
import { BG, BL, BT, BW, CH_B, CREAM, CREAM_BORDER, CRIMSON, CW_B, INK_LIGHT, INK_MID, SUCCESS, WHITE } from '../constants';
import { AppNav, BrowserChrome } from '../components/Browser';

const MLS_COPY = "Charming 3-bedroom, 2-bath home tucked into Gordo's established west-side neighborhood. Recent updates include a newer roof, fresh paint throughout, and a renovated kitchen with granite counters and stainless appliances. The spacious backyard is fully fenced — great for kids and dogs. Quiet street, easy commute to Tuscaloosa. Pre-1978 build; lead-based paint disclosure provided. Seller motivated. Don't miss this one.";

const CHAR_LIMIT = 800;

export const SceneMarketing: React.FC = () => {
  const frame = useCurrentFrame();

  const sceneOp = interpolate(frame, [0, 10, 140, 150], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const labelOp = interpolate(frame, [4, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const headerOp = interpolate(frame, [8, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const editorOp = interpolate(frame, [16, 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const charCount = Math.min(Math.floor(Math.max(0, frame - 28) * 5.5), MLS_COPY.length);
  const displayText = MLS_COPY.slice(0, charCount);
  const done = charCount >= MLS_COPY.length;
  const blinkOn = Math.floor(frame / 8) % 2 === 0;

  const ctaOp = interpolate(frame, [done ? 5 : 130, done ? 15 : 142], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const charCountActual = charCount;
  const charColor = charCountActual > CHAR_LIMIT ? CRIMSON : charCountActual > CHAR_LIMIT * 0.9 ? '#D97706' : SUCCESS;

  const agentTagOp = interpolate(frame, [100, 112], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#141210', opacity: sceneOp }}>
      <div style={{ position: 'absolute', top: 80, left: BL, fontFamily: interFont.fontFamily, fontSize: 14, color: INK_MID, textTransform: 'uppercase', letterSpacing: 2, opacity: labelOp }}>
        MLS Description
      </div>

      <div style={{ position: 'absolute', left: BL, top: BT, width: BW, borderRadius: 12, overflow: 'hidden', boxShadow: '0 32px 96px rgba(0,0,0,0.7)' }}>
        <BrowserChrome page="/pre-listing" />
        <div style={{ display: 'flex', height: CH_B }}>
          <AppNav active="/pre-listing" />
          <div style={{ width: CW_B, height: CH_B, backgroundColor: CREAM, padding: '28px 36px', boxSizing: 'border-box' }}>

            {/* Header */}
            <div style={{ opacity: headerOp, marginBottom: 24 }}>
              <div style={{ fontFamily: interFont.fontFamily, fontSize: 11, color: CRIMSON, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
                Pre-Listing — MLS Description
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ fontFamily: playfairFont.fontFamily, fontSize: 28, fontWeight: 700, color: BG }}>
                  604 2nd St NW, Gordo, AL
                </div>
                <div style={{ opacity: agentTagOp, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: CRIMSON }} />
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 13, color: INK_MID }}>Written in Jerrod's voice</div>
                </div>
              </div>
            </div>

            {/* Editor */}
            <div style={{ opacity: editorOp }}>
              <div style={{ backgroundColor: WHITE, borderRadius: 10, border: `1px solid ${CREAM_BORDER}`, overflow: 'hidden' }}>
                {/* Toolbar */}
                <div style={{ padding: '10px 16px', borderBottom: `1px solid ${CREAM_BORDER}`, display: 'flex', alignItems: 'center', gap: 12, backgroundColor: '#FAFAF8' }}>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 11, color: INK_MID }}>MLS Remarks</div>
                  <div style={{ marginLeft: 'auto', fontFamily: interFont.fontFamily, fontSize: 12, fontWeight: 600, color: charColor }}>
                    {charCountActual} / {CHAR_LIMIT}
                  </div>
                </div>

                {/* Text area */}
                <div style={{ padding: '20px 22px', minHeight: 220 }}>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 16, color: BG, lineHeight: 1.8 }}>
                    {displayText}
                    {!done && <span style={{ opacity: blinkOn ? 1 : 0, color: CRIMSON }}>|</span>}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 14, marginTop: 18, opacity: ctaOp }}>
                <div style={{ backgroundColor: CRIMSON, borderRadius: 8, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 15, fontWeight: 600, color: WHITE }}>Copy to MLS</div>
                </div>
                <div style={{ backgroundColor: WHITE, borderRadius: 8, padding: '12px 24px', border: `1px solid ${CREAM_BORDER}` }}>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 15, color: INK_MID }}>Regenerate</div>
                </div>
                <div style={{ backgroundColor: WHITE, borderRadius: 8, padding: '12px 24px', border: `1px solid ${CREAM_BORDER}` }}>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 15, color: INK_MID }}>Send to Jerrod</div>
                </div>
              </div>

              {/* Info strip */}
              <div style={{ marginTop: 14, display: 'flex', gap: 20, opacity: ctaOp }}>
                {[
                  { color: SUCCESS, text: 'Under 800 character MLS limit' },
                  { color: SUCCESS, text: 'Lead paint disclosure noted' },
                  { color: '#2563EB', text: 'Agent voice matched' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: item.color }} />
                    <div style={{ fontFamily: interFont.fontFamily, fontSize: 12, color: INK_LIGHT }}>{item.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
