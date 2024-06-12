import React from 'react';
// import GraphiQLPlayground from './components/GraphiQLPlayground';
import dynamic from 'next/dynamic';

const GraphiQLPlayground = dynamic(() => import('./components/GraphiQLPlayground'), {
  ssr: false
});

const Home: React.FC = () => {
  const isBrowser = typeof window !== 'undefined';
  return (
    <div style={{ height: '100vh' }}>
      {isBrowser && <GraphiQLPlayground />}
    </div>
  );
};

export default Home;