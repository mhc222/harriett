import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { interFont, playfairFont } from '../fonts';
import { BG, BL, BT, BW, CH_B, CREAM, CREAM_BORDER, CRIMSON, CW_B, FB_BLUE, INK_LIGHT, INK_MID, WHITE } from '../constants';
import { AppNav, BrowserChrome } from '../components/Browser';

const POST_TEXT = "Just Listed — 604 2nd St NW, Gordo, AL 35466. This charming 3-bedroom, 2-bath home sits on a quiet street in Gordo's established west-side neighborhood. Recent updates include a newer roof, fresh paint throughout, and a renovated kitchen with granite counters. Motivated seller. MLS #12094. Call Jerrod Hastings at Pritchett-Moore Real Estate.";

export const SceneFacebook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneOp = interpolate(frame, [0, 10, 170, 180], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const labelOp = interpolate(frame, [4, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const headerOp = interpolate(frame, [10, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const cardS = spring({ frame: frame - 18, fps, config: { damping: 16, stiffness: 110 }, durationInFrames: 20 });
  const cardY = interpolate(cardS, [0, 1], [40, 0]);
  const cardOp = interpolate(frame, [18, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const charCount = Math.min(Math.floor(Math.max(0, frame - 42) * 3.8), POST_TEXT.length);
  const displayText = POST_TEXT.slice(0, charCount);
  const done = charCount >= POST_TEXT.length;
  const blinkOn = Math.floor(frame / 8) % 2 === 0;

  const scheduleOp = interpolate(frame, [148, 162], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const schedulePulse = done ? interpolate(Math.sin(frame * 0.2), [-1, 1], [0.88, 1]) : 1;

  const hashtagsOp = interpolate(frame, [155, 168], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#141210', opacity: sceneOp }}>
      <div style={{ position: 'absolute', top: 80, left: BL, fontFamily: interFont.fontFamily, fontSize: 14, color: INK_MID, textTransform: 'uppercase', letterSpacing: 2, opacity: labelOp }}>
        Marketing
      </div>

      <div style={{ position: 'absolute', left: BL, top: BT, width: BW, borderRadius: 12, overflow: 'hidden', boxShadow: '0 32px 96px rgba(0,0,0,0.7)' }}>
        <BrowserChrome page="/marketing" />
        <div style={{ display: 'flex', height: CH_B }}>
          <AppNav active="/marketing" />
          <div style={{ width: CW_B, height: CH_B, backgroundColor: '#F0F2F5', padding: '28px 48px', boxSizing: 'border-box', overflowY: 'hidden' }}>

            {/* Page header */}
            <div style={{ opacity: headerOp, marginBottom: 24 }}>
              <div style={{ fontFamily: interFont.fontFamily, fontSize: 11, color: CRIMSON, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
                Marketing — Social Post
              </div>
              <div style={{ fontFamily: playfairFont.fontFamily, fontSize: 28, fontWeight: 700, color: BG }}>
                604 2nd St NW — Just Listed Draft
              </div>
            </div>

            {/* Two-column layout */}
            <div style={{ display: 'flex', gap: 28 }}>

              {/* Left: FB post card */}
              <div style={{ flex: 1, opacity: cardOp, transform: `translateY(${cardY}px)` }}>
                <div style={{ backgroundColor: WHITE, borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>

                  {/* Post header — white background, FB-style */}
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Page avatar: FB blue circle with white PM */}
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      backgroundColor: FB_BLUE,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <div style={{ fontFamily: interFont.fontFamily, fontSize: 13, fontWeight: 700, color: WHITE }}>PM</div>
                    </div>
                    {/* Page name + subtitle */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: interFont.fontFamily, fontSize: 14, fontWeight: 700, color: '#050505', lineHeight: 1.2 }}>
                        Pritchett-Moore Real Estate
                      </div>
                      <div style={{ fontFamily: interFont.fontFamily, fontSize: 12, color: '#65676B', lineHeight: 1.3 }}>
                        Real Estate &middot; Tuscaloosa, AL
                      </div>
                    </div>
                    {/* Three-dot menu */}
                    <div style={{ fontFamily: interFont.fontFamily, fontSize: 20, fontWeight: 700, color: '#65676B', letterSpacing: 1.5, cursor: 'default', userSelect: 'none', paddingBottom: 6 }}>
                      ...
                    </div>
                  </div>

                  {/* Post text above photo */}
                  <div style={{ padding: '0 16px 10px' }}>
                    <div style={{ fontFamily: interFont.fontFamily, fontSize: 14, color: '#1C1E21', lineHeight: 1.65 }}>
                      {displayText}
                      {!done && <span style={{ opacity: blinkOn ? 1 : 0, color: FB_BLUE }}>|</span>}
                    </div>
                    <div style={{ marginTop: 6, opacity: hashtagsOp }}>
                      <span style={{ fontFamily: interFont.fontFamily, fontSize: 13, color: FB_BLUE }}>
                        #JustListed #TuscaloosaRealEstate #Gordo #PritchettMoore
                      </span>
                    </div>
                  </div>

                  {/* House photo with Just Listed badge */}
                  <div style={{ position: 'relative', width: '100%' }}>
                    <Img
                      src={staticFile('house.jpg')}
                      style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{
                      position: 'absolute', top: 12, left: 12,
                      backgroundColor: CRIMSON,
                      color: WHITE,
                      fontFamily: interFont.fontFamily,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 1.5,
                      padding: '4px 10px',
                      borderRadius: 4,
                    }}>
                      Just Listed
                    </div>
                  </div>

                  {/* Address caption below photo */}
                  <div style={{ padding: '6px 16px 10px', borderBottom: '1px solid #E4E6EA' }}>
                    <div style={{ fontFamily: interFont.fontFamily, fontSize: 12, color: '#65676B' }}>
                      604 2nd St NW, Gordo, AL &middot; $208,000
                    </div>
                  </div>

                  {/* Reaction / engagement count bar */}
                  <div style={{ padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E4E6EA' }}>
                    <div style={{ fontFamily: interFont.fontFamily, fontSize: 13, color: '#65676B', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>&#128077;</span><span>&#10084;&#65039;</span>
                      <span style={{ marginLeft: 2 }}>12 people reacted</span>
                    </div>
                    <div style={{ fontFamily: interFont.fontFamily, fontSize: 13, color: '#65676B' }}>
                      3 Comments &middot; 2 Shares
                    </div>
                  </div>

                  {/* Like / Comment / Share action row */}
                  <div style={{ padding: '4px 0', display: 'flex', alignItems: 'center' }}>
                    {(['Like', 'Comment', 'Share'] as const).map((label, i) => (
                      <React.Fragment key={label}>
                        {i > 0 && (
                          <div style={{ width: 1, height: 20, backgroundColor: '#E4E6EA', flexShrink: 0 }} />
                        )}
                        <div style={{
                          flex: 1,
                          textAlign: 'center',
                          fontFamily: interFont.fontFamily,
                          fontSize: 14,
                          fontWeight: 600,
                          color: FB_BLUE,
                          padding: '6px 0',
                          cursor: 'default',
                          userSelect: 'none',
                        }}>
                          {label}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>

                </div>
              </div>

              {/* Right: controls */}
              <div style={{ width: 340, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ backgroundColor: WHITE, borderRadius: 10, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 11, color: INK_MID, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Schedule</div>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 14, color: BG, marginBottom: 6 }}>Friday, June 13 at 10:00 AM</div>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 12, color: INK_LIGHT }}>Peak engagement window · Harriett selected</div>
                </div>

                <div style={{ backgroundColor: WHITE, borderRadius: 10, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 11, color: INK_MID, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Characters</div>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 20, fontWeight: 700, color: BG }}>{charCount}</div>
                </div>

                <div
                  style={{
                    backgroundColor: FB_BLUE,
                    borderRadius: 10,
                    padding: '16px 22px',
                    textAlign: 'center',
                    opacity: scheduleOp * schedulePulse,
                    boxShadow: `0 4px 20px ${FB_BLUE}66`,
                  }}
                >
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 16, fontWeight: 700, color: WHITE }}>Schedule Post</div>
                </div>

                <div
                  style={{
                    backgroundColor: CREAM,
                    borderRadius: 10,
                    padding: '14px 22px',
                    textAlign: 'center',
                    border: `1px solid ${CREAM_BORDER}`,
                    opacity: scheduleOp,
                  }}
                >
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 14, color: INK_MID }}>Also drafting Instagram + MLS</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
