import { NextResponse } from 'next/server';

// actions.json — tells Blink clients which URLs on this domain are Blink providers
// Required by the Dialect/Monad Blinks spec
// See: https://docs.dialect.to/documentation/actions/specification/actions.json

const ACTIONS_CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-blockchain-ids, x-action-version',
    'Content-Type': 'application/json',
};

export const GET = async () => {
    const payload = {
        rules: [
            // Map all /api/blink/monad/* routes as Blink providers
            {
                pathPattern: '/api/blink/monad/**',
                apiPath: '/api/blink/monad/**',
            },
        ],
    };

    return NextResponse.json(payload, { headers: ACTIONS_CORS_HEADERS });
};

export const OPTIONS = GET;
