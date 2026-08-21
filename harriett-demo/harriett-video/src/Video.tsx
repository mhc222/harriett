import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { BG } from './constants';
import { Scene1Hook } from './scenes/Scene1Hook';
import { Scene2Intro } from './scenes/Scene2Intro';
import { SceneUpload } from './scenes/SceneUpload';
import { SceneDashboard } from './scenes/SceneDashboard';
import { SceneChat } from './scenes/SceneChat';
import { SceneEmail } from './scenes/SceneEmail';
import { SceneCMA } from './scenes/SceneCMA';
import { SceneFacebook } from './scenes/SceneFacebook';
import { SceneSMS } from './scenes/SceneSMS';
import { SceneMarketing } from './scenes/SceneMarketing';
import { Scene5Features } from './scenes/Scene5Features';
import { Scene6CTA } from './scenes/Scene6CTA';

// VO clip durations (frames @ 30fps):
// 01: 77  02: 148  03: 242  04: 183  05: 166  06: 245
// 07: 170  08: 155  09: 269  10: 170  11: 173  12: 26
// Total: 2044 frames ≈ 68s

// Audio starts at cumulative VO frames.
// Visuals start 20f before their VO (overlap with previous VO tail).
// Visual duration = VO duration + 40f (20f lead-in + 20f tail).

export const HarriettVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {/* Audio — each clip fires exactly at its scene's cumulative start */}
      <Sequence from={0}><Audio src={staticFile('vo_01.mp3')} /></Sequence>
      <Sequence from={77}><Audio src={staticFile('vo_02.mp3')} /></Sequence>
      <Sequence from={225}><Audio src={staticFile('vo_03.mp3')} /></Sequence>
      <Sequence from={467}><Audio src={staticFile('vo_04.mp3')} /></Sequence>
      <Sequence from={650}><Audio src={staticFile('vo_05.mp3')} /></Sequence>
      <Sequence from={816}><Audio src={staticFile('vo_06.mp3')} /></Sequence>
      <Sequence from={1061}><Audio src={staticFile('vo_07.mp3')} /></Sequence>
      <Sequence from={1231}><Audio src={staticFile('vo_08.mp3')} /></Sequence>
      <Sequence from={1386}><Audio src={staticFile('vo_09.mp3')} /></Sequence>
      <Sequence from={1655}><Audio src={staticFile('vo_10.mp3')} /></Sequence>
      <Sequence from={1825}><Audio src={staticFile('vo_11.mp3')} /></Sequence>
      <Sequence from={1998}><Audio src={staticFile('vo_12.mp3')} /></Sequence>

      {/* Visuals — start 20f before VO, run VO duration + 40f */}
      <Sequence from={0}   durationInFrames={97}><Scene1Hook /></Sequence>
      <Sequence from={57}  durationInFrames={188}><Scene2Intro /></Sequence>
      <Sequence from={205} durationInFrames={282}><SceneUpload /></Sequence>
      <Sequence from={447} durationInFrames={223}><SceneDashboard /></Sequence>
      <Sequence from={630} durationInFrames={206}><SceneChat /></Sequence>
      <Sequence from={796} durationInFrames={285}><SceneEmail /></Sequence>
      <Sequence from={1041} durationInFrames={210}><SceneCMA /></Sequence>
      <Sequence from={1211} durationInFrames={195}><SceneFacebook /></Sequence>
      <Sequence from={1366} durationInFrames={309}><SceneSMS /></Sequence>
      <Sequence from={1635} durationInFrames={210}><SceneMarketing /></Sequence>
      <Sequence from={1805} durationInFrames={213}><Scene5Features /></Sequence>
      <Sequence from={1978} durationInFrames={66}><Scene6CTA /></Sequence>
    </AbsoluteFill>
  );
};
