"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Provider } from 'react-redux';
import store from '@/store/store';

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
    <Provider store={store}>
    <div style={{ height: '100vh' }}>
      {!preload && <GraphiQLPlayground />}
    </div>
    </Provider>
  );
};


export default Home;