"use client";

import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

const StatusPlaceholder = () => {
    const message = useSelector((state: RootState) => state.status.status);

    return (<>
        {message && <div className="error-message">{message}</div>}
    </>);
};

export default StatusPlaceholder;