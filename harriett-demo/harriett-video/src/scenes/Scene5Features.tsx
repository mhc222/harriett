import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { interFont, playfairFont } from '../fonts';
import { BG, CREAM, CRIMSON, FB_BLUE, SUCCESS, SURFACE_DARK } from '../constants';

const FEATURES = [
  { color: CRIMSON, headline: 'Reads any Alabama contract', body: 'Upload a listing agreement, purchase contract, or addendum. Harriett extracts every key date, flag, and field in seconds.' },
  { color: '#2563EB', headline: 'Watches the inbox', body: 'Connects to Microsoft 365. Detects new contracts in email and starts coordination automatically.' },
  { color: SUCCESS, headline: 'CMA drafts in seconds', body: 'Pull comps, build the analysis, send a draft for agent review. All before the listing appointment.' },
  { color: FB_BLUE, headline: 'Social posts auto-drafted', body: 'Just Listed and Just Sold posts drafted in the agent\'s voice, scheduled for peak engagement.' },
  { color: '#7E22CE', headline: 'Stays in your pocket', body: 'Agents work over text. Harriett replies with the right information — inspection deadlines, lender contacts, form status.' },
  { color: '#D97706', headline: 'Built-in compliance checks', body: 'Lead paint, RECAD, FHA Amendatory Clause, Alabama agency disclosures — flagged automatically on every deal.' },
];

export const Scene5Features: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneOp = interpolate(frame, [0, 12, 108, 120], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const headlineOp = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const headlineY = interpolate(frame, [0, 12], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BG, justifyContent: 'center', alignItems: 'center', opacity: sceneOp }}>
      <div style={{ width: 1760, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 48 }}>
        <div style={{ opacity: headlineOp, transform: `translateY(${headlineY}px)`, textAlign: 'center' }}>
          <div style={{ fontFamily: playfairFont.fontFamily, fontSize: 60, fontWeight: 700, color: CREAM, fontStyle: 'italic' }}>
            Built for Alabama real estate.
          </div>
          <div style={{ fontFamily: interFont.fontFamily, fontSize: 22, color: '#9C9189', marginTop: 12 }}>
            Every feature purpose-built for Pritchett-Moore's workflows.
          </div>
        </div>

        {/* 2 rows of 3 */}
        {[FEATURES.slice(0, 3), FEATURES.slice(3, 6)].map((row, rowIdx) => (
          <div key={rowIdx} style={{ display: 'flex', gap: 28, width: '100%' }}>
            {row.map((f, i) => {
              const globalIdx = rowIdx * 3 + i;
              const startFrame = 12 + globalIdx * 8;
              const s = spring({ frame: frame - startFrame, fps, config: { damping: 18, stiffness: 130 }, durationInFrames: 18 });
              const fY = interpolate(s, [0, 1], [36, 0]);
              const fOp = interpolate(frame, [startFrame, startFrame + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    backgroundColor: SURFACE_DARK,
                    borderRadius: 14,
                    padding: '26px 24px',
                    borderTop: `3px solid ${f.color}`,
                    transform: `translateY(${fY}px)`,
                    opacity: fOp,
                  }}
                >
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: f.color, marginBottom: 14 }} />
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 21, fontWeight: 700, color: CREAM, marginBottom: 12, lineHeight: 1.3 }}>
                    {f.headline}
                  </div>
                  <div style={{ fontFamily: interFont.fontFamily, fontSize: 16, color: '#9C9189', lineHeight: 1.7 }}>
                    {f.body}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
