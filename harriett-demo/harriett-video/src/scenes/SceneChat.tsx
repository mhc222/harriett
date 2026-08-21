import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { interFont, playfairFont } from '../fonts';
import { BG, BL, BT, BW, CH_B, CREAM, CREAM_BORDER, CRIMSON, CW_B, INK_LIGHT, INK_MID, WHITE } from '../constants';
import { AppNav, BrowserChrome } from '../components/Browser';

const RESPONSE = "Inspection window closes June 15 — that's 10 days from the April 30 contract date, which is the FHA window. First Federal's appraisal is set for June 10. You'll want to confirm that wraps up before the window closes.";
const RESPONSE2 = "Also: the loan type switched from USDA to FHA on May 14. That triggered the FHA Amendatory Clause, so make sure Jerrod has that form signed.";

export const SceneChat: React.FC = () => {
  const frame = useCurrentFrame();

  const sceneOp = interpolate(frame, [0, 10, 140, 150], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const headerOp = interpolate(frame, [6, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const userOp = interpolate(frame, [14, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const harriettNameOp = interpolate(frame, [30, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const charCount1 = Math.min(Math.floor(Math.max(0, frame - 38) * 4), RESPONSE.length);
  const displayText1 = RESPONSE.slice(0, charCount1);
  const done1 = charCount1 >= RESPONSE.length;

  const harriett2Op = interpolate(frame, [95, 105], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const charCount2 = Math.min(Math.floor(Math.max(0, frame - 103) * 4), RESPONSE2.length);
  const displayText2 = RESPONSE2.slice(0, charCount2);

  const blinkOn = Math.floor(frame / 8) % 2 === 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#141210', opacity: sceneOp }}>
      <div style={{ position: 'absolute', left: BL, top: BT, width: BW, borderRadius: 12, overflow: 'hidden', boxShadow: '0 32px 96px rgba(0,0,0,0.7)' }}>
        <BrowserChrome page="/agent" />
        <div style={{ display: 'flex', height: CH_B }}>
          <AppNav active="/agent" />
          <div style={{ width: CW_B, height: CH_B, backgroundColor: CREAM, display: 'flex', flexDirection: 'column' }}>

            {/* Header bar */}
            <div style={{ backgroundColor: WHITE, borderBottom: `1px solid ${CREAM_BORDER}`, padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0, opacity: headerOp }}>
              <div style={{ fontFamily: playfairFont.fontFamily, fontSize: 20, fontWeight: 700, color: BG }}>Ask Harriett</div>
              <div style={{ fontFamily: interFont.fontFamily, fontSize: 13, color: INK_MID }}>604 2nd St NW</div>
              <div style={{ marginLeft: 'auto', fontFamily: interFont.fontFamily, fontSize: 13, color: INK_LIGHT }}>Jerrod Hastings</div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* User message */}
              <div style={{ opacity: userOp, display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ backgroundColor: CRIMSON, borderRadius: '14px 14px 2px 14px', padding: '12px 20px', maxWidth: 500 }}>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 17, color: WHITE }}>
                    When does the inspection window close?
                  </div>
                </div>
              </div>

              {/* Harriett response 1 */}
              <div style={{ opacity: harriettNameOp, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 12, color: INK_MID, paddingLeft: 4 }}>Harriett</div>
                <div style={{ backgroundColor: WHITE, borderRadius: '2px 14px 14px 14px', padding: '14px 20px', maxWidth: 760, border: `1px solid ${CREAM_BORDER}` }}>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 17, color: BG, lineHeight: 1.7 }}>
                    {displayText1}
                    {!done1 && <span style={{ opacity: blinkOn ? 1 : 0, color: CRIMSON }}>|</span>}
                  </div>
                </div>
              </div>

              {/* Harriett response 2 */}
              <div style={{ opacity: harriett2Op, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ backgroundColor: WHITE, borderRadius: '2px 14px 14px 14px', padding: '14px 20px', maxWidth: 760, border: `1px solid ${CREAM_BORDER}` }}>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 17, color: BG, lineHeight: 1.7 }}>
                    {displayText2}
                    {charCount2 < RESPONSE2.length && <span style={{ opacity: blinkOn ? 1 : 0, color: CRIMSON }}>|</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
