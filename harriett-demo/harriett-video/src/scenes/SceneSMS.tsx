import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { interFont } from '../fonts';
import { CREAM, CRIMSON, INK_MID, SUCCESS } from '../constants';
import { Callout } from '../components/Callout';

const MESSAGES = [
  { from: 'harriett', text: "Jerrod — got the 604 2nd St contract. Starting your checklist now. Lead paint forms are required on that one, 1975 build. I'll flag Alyssa.", time: '8:22 AM' },
  { from: 'agent', text: "Good catch. What's the inspection deadline?", time: '8:24 AM' },
  { from: 'harriett', text: 'June 15. That\'s 10 days from the April 30 contract date. Lender appraisal is June 10 — you\'ll want that wrapped first.', time: '8:24 AM' },
  { from: 'agent', text: 'Can you draft the Just Listed post?', time: '8:26 AM' },
  { from: 'harriett', text: "On it. Give me two minutes.", time: '8:26 AM' },
];

const PHONE_W = 480;
const PHONE_H = 900;

// Screen insets from the outer frame edge
const FRAME_INSET = 8;
const SCREEN_W = PHONE_W - FRAME_INSET * 2;
const SCREEN_H = PHONE_H - FRAME_INSET * 2;
const SCREEN_BORDER_RADIUS = 46;

export const SceneSMS: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneOp = interpolate(frame, [0, 10, 170, 180], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const labelOp = interpolate(frame, [4, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const phoneS = spring({ frame: frame - 6, fps, config: { damping: 16, stiffness: 110 }, durationInFrames: 22 });
  const phoneY = interpolate(phoneS, [0, 1], [60, 0]);
  const phoneOp = interpolate(frame, [6, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const msgStartFrames = [20, 52, 70, 120, 148];
  const msgItems = MESSAGES.map((msg, i) => {
    const start = msgStartFrames[i];
    const charCount = Math.min(Math.floor(Math.max(0, frame - (start + 8)) * 4.5), msg.text.length);
    return {
      op: interpolate(frame, [start, start + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      charCount,
      displayText: msg.text.slice(0, charCount),
      done: charCount >= msg.text.length,
    };
  });

  const blinkOn = Math.floor(frame / 8) % 2 === 0;

  const labelTag = interpolate(frame, [20, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const phoneLeft = (1920 - PHONE_W) / 2;
  const phoneTop = (1080 - PHONE_H) / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: '#141210', opacity: sceneOp }}>
      {/* Background glow */}
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${CRIMSON}22 0%, transparent 70%)`, top: '50%', left: '50%', marginTop: -300, marginLeft: -300 }} />

      {/* Scene label */}
      <div style={{ position: 'absolute', top: 80, left: 160, fontFamily: interFont.fontFamily, fontSize: 14, color: INK_MID, textTransform: 'uppercase', letterSpacing: 2, opacity: labelOp }}>
        SMS — Direct to Agent
      </div>

      {/* ── Outer iPhone frame ── */}
      <div
        style={{
          position: 'absolute',
          left: phoneLeft,
          top: phoneTop,
          width: PHONE_W,
          height: PHONE_H,
          backgroundColor: '#1A1A1A',
          borderRadius: 52,
          boxShadow: '0 40px 100px rgba(0,0,0,0.85), inset 0 0 0 1px #555, inset 0 0 0 3px #222',
          opacity: phoneOp,
          transform: `translateY(${phoneY}px)`,
        }}
      >
        {/* Left side — silent toggle */}
        <div style={{ position: 'absolute', left: -4, top: 96, width: 4, height: 24, backgroundColor: '#2A2A2A', borderRadius: '2px 0 0 2px' }} />
        {/* Left side — volume up */}
        <div style={{ position: 'absolute', left: -4, top: 132, width: 4, height: 36, backgroundColor: '#2A2A2A', borderRadius: '2px 0 0 2px' }} />
        {/* Left side — volume down */}
        <div style={{ position: 'absolute', left: -4, top: 184, width: 4, height: 36, backgroundColor: '#2A2A2A', borderRadius: '2px 0 0 2px' }} />
        {/* Right side — power */}
        <div style={{ position: 'absolute', right: -4, top: 152, width: 4, height: 60, backgroundColor: '#2A2A2A', borderRadius: '0 2px 2px 0' }} />

        {/* ── Inner screen ── */}
        <div
          style={{
            position: 'absolute',
            left: FRAME_INSET,
            top: FRAME_INSET,
            width: SCREEN_W,
            height: SCREEN_H,
            backgroundColor: '#FFFFFF',
            borderRadius: SCREEN_BORDER_RADIUS,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Dynamic Island */}
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: '50%',
              marginLeft: -63,
              width: 126,
              height: 37,
              borderRadius: 20,
              backgroundColor: '#000000',
              zIndex: 20,
            }}
          />

          {/* ── iOS Status Bar ── */}
          <div
            style={{
              paddingTop: 16,
              paddingLeft: 20,
              paddingRight: 20,
              paddingBottom: 4,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
              zIndex: 10,
            }}
          >
            {/* Time */}
            <div style={{ fontFamily: interFont.fontFamily, fontSize: 15, fontWeight: 600, color: '#000000' }}>9:41</div>

            {/* Signal + wifi + battery */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Signal bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                {[8, 11, 14, 17].map((h, idx) => (
                  <div key={idx} style={{ width: 3, height: h, backgroundColor: '#000000', borderRadius: 1 }} />
                ))}
              </div>
              {/* Wifi arc */}
              <div style={{ width: 14, height: 9, borderTop: '2.5px solid #000000', borderLeft: '2.5px solid transparent', borderRight: '2.5px solid transparent', borderRadius: '50% 50% 0 0 / 100% 100% 0 0' }} />
              {/* Battery */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <div style={{ width: 22, height: 11, border: '1.5px solid #000000', borderRadius: 3, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 2, top: 1.5, width: 16, height: 6, backgroundColor: '#000000', borderRadius: 1 }} />
                </div>
                <div style={{ width: 2, height: 5, backgroundColor: '#000000', borderRadius: '0 1px 1px 0' }} />
              </div>
            </div>
          </div>

          {/* ── iMessage Header ── */}
          <div
            style={{
              paddingLeft: 16,
              paddingRight: 16,
              paddingTop: 6,
              paddingBottom: 10,
              borderBottom: '1px solid #E5E5EA',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Back arrow */}
            <div style={{ fontFamily: interFont.fontFamily, fontSize: 26, color: '#007AFF', lineHeight: 1, paddingBottom: 2 }}>&#8249;</div>

            {/* Center: avatar + name + subtitle */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  backgroundColor: CRIMSON,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>H</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 13, fontWeight: 600, color: '#000000', lineHeight: 1.2 }}>Harriett</div>
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 11, color: '#8E8E93', lineHeight: 1.2 }}>Text Message</div>
              </div>
            </div>

            {/* Right icons: video + info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Video call icon */}
              <div style={{ position: 'relative', width: 22, height: 16 }}>
                <div style={{ position: 'absolute', left: 0, top: 0, width: 14, height: 16, backgroundColor: '#007AFF', borderRadius: 3 }} />
                <div style={{ position: 'absolute', left: 14, top: 3, width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '8px solid #007AFF' }} />
              </div>
              {/* Info circle */}
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: interFont.fontFamily, fontSize: 12, fontWeight: 700, color: '#007AFF', lineHeight: 1 }}>i</div>
              </div>
            </div>
          </div>

          {/* ── Messages ── */}
          <div
            style={{
              flex: 1,
              padding: '12px 12px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              overflowY: 'hidden',
              backgroundColor: '#FFFFFF',
            }}
          >
            {MESSAGES.map((msg, i) => {
              const item = msgItems[i];
              const isHarriett = msg.from === 'harriett';
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isHarriett ? 'flex-start' : 'flex-end',
                    opacity: item.op,
                  }}
                >
                  <div
                    style={{
                      maxWidth: '80%',
                      backgroundColor: isHarriett ? '#E9E9EB' : '#007AFF',
                      borderRadius: isHarriett ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
                      padding: '10px 14px',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: interFont.fontFamily,
                        fontSize: 13,
                        color: isHarriett ? '#000000' : '#FFFFFF',
                        lineHeight: 1.55,
                      }}
                    >
                      {item.displayText}
                      {!item.done && (
                        <span style={{ opacity: blinkOn ? 1 : 0, color: isHarriett ? '#555555' : 'rgba(255,255,255,0.7)' }}>|</span>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: interFont.fontFamily,
                      fontSize: 11,
                      color: '#8E8E93',
                      marginTop: 3,
                      paddingLeft: isHarriett ? 4 : 0,
                      paddingRight: isHarriett ? 0 : 4,
                    }}
                  >
                    {msg.time}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Input bar ── */}
          <div
            style={{
              padding: '8px 12px 20px',
              backgroundColor: '#FFFFFF',
              borderTop: '1px solid #E5E5EA',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {/* Mic icon */}
            <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: '#E9E9EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 8, height: 13, border: '2px solid #8E8E93', borderRadius: 4 }} />
            </div>

            {/* Input field */}
            <div
              style={{
                flex: 1,
                backgroundColor: '#F2F2F7',
                borderRadius: 20,
                padding: '8px 14px',
                fontFamily: interFont.fontFamily,
                fontSize: 13,
                color: '#C7C7CC',
              }}
            >
              iMessage
            </div>

            {/* Send button */}
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                backgroundColor: '#007AFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '9px solid #FFFFFF', marginTop: -2 }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Callout labels (right of phone) ── */}
      <div
        style={{
          position: 'absolute',
          left: phoneLeft + PHONE_W + 48,
          top: phoneTop + 100,
          opacity: labelTag,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {[
          { color: CRIMSON, text: 'Knows every deal detail' },
          { color: '#22C55E', text: 'Alabama-specific compliance' },
          { color: '#2563EB', text: 'No app required — just text' },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              opacity: interpolate(frame, [22 + i * 14, 34 + i * 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color }} />
            <div style={{ fontFamily: interFont.fontFamily, fontSize: 16, color: CREAM }}>{item.text}</div>
          </div>
        ))}
      </div>

      {/* Callout */}
      <Callout
        text="Works over regular SMS"
        subtext="No app install required"
        appearFrame={60}
        x={148}
        y={460}
        color={SUCCESS}
        arrowSide="left"
      />
    </AbsoluteFill>
  );
};
