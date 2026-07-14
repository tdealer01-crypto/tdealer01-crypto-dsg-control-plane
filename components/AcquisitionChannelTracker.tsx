'use client';

import { useEffect } from 'react';
import { captureAcquisitionChannel } from '@/lib/acquisition/track-channel';

/** Mounted once in the root layout — captures the first-touch acquisition channel. */
export default function AcquisitionChannelTracker() {
  useEffect(() => {
    captureAcquisitionChannel();
  }, []);

  return null;
}
