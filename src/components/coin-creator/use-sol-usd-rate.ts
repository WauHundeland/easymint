'use client';

import { useState, useEffect } from 'react';

export function useSolUsdRate() {
  const [solUsdRate, setSolUsdRate] = useState<number | null>(null);

  const fetchSolUsdRate = async () => {
    try {
      // Using Jupiter Price API to get SOL price in USDC
      const response = await fetch('https://lite-api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112');
      const data = await response.json() as { data?: { So11111111111111111111111111111111111111112?: { price?: string } } };
      const solPrice = parseFloat(data.data?.So11111111111111111111111111111111111111112?.price ?? '0');
      setSolUsdRate(solPrice);
    } catch (error) {
      console.error('Error fetching SOL/USD rate:', error);
      setSolUsdRate(null);
    }
  };

  useEffect(() => {
    void fetchSolUsdRate();
  }, []);

  return { solUsdRate, refetchSolUsdRate: fetchSolUsdRate };
} 