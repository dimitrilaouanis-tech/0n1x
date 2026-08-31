// pages/api/earn-admission.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';

// Initialize Supabase client (replace with actual environment variables)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// x402 API configuration
const X402_API_URL = 'https://api.x402.com/v1';
const X402_API_KEY = process.env.X402_API_KEY || '';

// Bounty configuration
const BOUNTY_AMOUNT = 5; // USDC
const BOUNTY_ID = 'GH_mega_sweep_2026-08-31';

interface ClaimRequest {
  userAddress: string;
  signature: string;
  x402Token: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userAddress, signature, x402Token }: ClaimRequest = req.body;

    // Validate required fields
    if (!userAddress || !signature || !x402Token) {
      return res.status(400).json({ 
        error: 'Missing required fields: userAddress, signature, and x402Token are required' 
      });
    }

    // Verify x402 token (paid API authentication)
    const x402Response = await fetch(`${X402_API_URL}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${x402Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address: userAddress }),
    });

    if (!x402Response.ok) {
      const errorData = await x402Response.json().catch(() => ({}));
      return res.status(401).json({ 
        error: 'Invalid x402 token or user not eligible', 
        details: errorData.message || 'Failed to verify x402 token' 
      });
    }

    const x402Data = await x402Response.json();
    if (!x402Data.paid) {
      return res.status(403).json({ 
        error: 'User has not paid the required admission fee' 
      });
    }

    // Check if user has already claimed the bounty (防重入 protection)
    const { data: existingClaim, error: fetchError } = await supabase
      .from('bounty_claims')
      .select('*')
      .eq('user_address', userAddress)
      .eq('bounty_id', BOUNTY_ID)
      .maybeSingle();

    if (existingClaim) {
      return res.status(409).json({ 
        error: 'Bounty already claimed for this address' 
      });
    }

    // Attempt to insert claim with atomic upsert (防重入)
    const { error: insertError } = await supabase
      .from('bounty_claims')
      .upsert({
        user_address: userAddress,
        bounty_id: BOUNTY_ID,
        claimed_at: new Date().toISOString(),
        amount: BOUNTY_AMOUNT,
        signature: signature,
        x402_token_hash: ethers.utils.sha256(Buffer.from(x402Token, 'utf8')),
      }, {
        onConflict: ['user_address', 'bounty_id'],
      });

    if (insertError) {
      // If conflict error, check if it's a race condition
      if (insertError.code === '23505') { // PostgreSQL unique violation
        return res.status(409).json({ 
          error: 'Bounty already claimed (race condition detected)' 
        });
      }
      throw insertError;
    }

    // Record the claim in analytics (optional)
    console.log(`Bounty claimed: ${userAddress} for ${BOUNTY_ID}`);

    return res.status(200).json({
      success: true,
      message: 'Bounty claimed successfully',
      bounty: {
        amount: BOUNTY_AMOUNT,
        currency: 'USDC',
        claimedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error processing bounty claim:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}