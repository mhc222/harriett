import './index.css';
import { Composition } from 'remotion';
import { HarriettVideo } from './Video';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HarriettVideo"
        component={HarriettVideo}
        durationInFrames={2044}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
