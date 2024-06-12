"use client";

import React, { useEffect, useState } from 'react';
// import GraphiQLPlayground from './components/GraphiQLPlayground';
import dynamic from 'next/dynamic';

const GraphiQLPlayground = dynamic(() => import('../components/GraphiQLPlayground'), {
  ssr: false
});
// console.log("ISbro",GraphiQLPlayground);


const Home: React.FC = () => {
  const isBrowser = typeof window !== 'undefined';
  // console.log("ISbro",isBrowser, GraphiQLPlayground);
  const [preload, setPreload] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setPreload(false);
    }, 1000);
  }, []);

  return (
    <div style={{ height: '100vh' }}>
      {!preload && <GraphiQLPlayground />}
      {/* <GraphiQLPlayground /> */}
    </div>
  );
};


export default Home;