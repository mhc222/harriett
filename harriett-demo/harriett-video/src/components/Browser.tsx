import React from 'react';
import { BCH, BG, CH_B, CREAM, CRIMSON, INK_LIGHT, INK_MID, NW, SURFACE_DARK } from '../constants';
import { interFont, playfairFont } from '../fonts';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Transaction', path: '/demo' },
  { label: 'Ask Harriett', path: '/agent' },
  { label: 'Marketing', path: '/marketing' },
  { label: 'Pre-Listing', path: '/pre-listing' },
  { label: 'Inbox', path: '/inbox' },
];

export const BrowserChrome: React.FC<{ page: string }> = ({ page }) => (
  <div style={{ height: BCH, backgroundColor: '#2A2420', display: 'flex', alignItems: 'center', paddingLeft: 16, gap: 8, flexShrink: 0 }}>
    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FF5F57' }} />
    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#28C840' }} />
    <div style={{ marginLeft: 24, backgroundColor: BG, borderRadius: 6, padding: '5px 20px', fontFamily: interFont.fontFamily, color: INK_LIGHT, fontSize: 13 }}>
      harriett-demo.vercel.app{page}
    </div>
  </div>
);

export const AppNav: React.FC<{ active: string }> = ({ active }) => (
  <div style={{ width: NW, height: CH_B, backgroundColor: BG, flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '16px 0', borderRight: `1px solid ${SURFACE_DARK}` }}>
    <div style={{ padding: '0 14px 20px', fontFamily: playfairFont.fontFamily, fontSize: 20, fontWeight: 700, color: CREAM }}>
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
