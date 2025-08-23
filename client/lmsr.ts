const SHARES_SCALE = 1e6;

export function calculateCost(
    liquidityParameter: number,
    shares: [number, number]
) {
    let x1 = (shares[0] / SHARES_SCALE) / liquidityParameter;
    let x2 = (shares[1] / SHARES_SCALE) / liquidityParameter;
    let e1 = Math.exp(x1);
    let e2 = Math.exp(x2);
    const cost = liquidityParameter * Math.log(e1 + e2);
    return cost;
}

export function calculateSharesForAmount(
    liquidityParameter: number,
    amount: number
) {
    
}