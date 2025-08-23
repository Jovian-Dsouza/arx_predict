const SHARES_SCALE = 1e6;
const MAX_ITERATIONS = 20;
const COST_TOLERANCE = 0.01 * 1e6;
const UPPER_BOUND = 1000.0 * 1e6;


export function calculateCost(
    liquidityParameter: number,
    shares: number[]
) {
    let x1 = (shares[0] / SHARES_SCALE) / liquidityParameter;
    let x2 = (shares[1] / SHARES_SCALE) / liquidityParameter;   
    let x_max = Math.max(x1, x2);
    let e1 = Math.exp(x1-x_max);
    let e2 = Math.exp(x2-x_max);
    const cost = liquidityParameter * (x_max + Math.log(e1 + e2));
    return Math.round(cost * 1e6);
}

export function calculateSharesForAmount(
    liquidityParameter: number,
    shares: number[],
    vote: number,
    amount: number
) {
    if(amount <= 0) {
        return 0;
    }
    let currentCost = calculateCost(liquidityParameter, shares);

    // Use binary search to find the quantity that costs approximately costAmount
    let low = 0.0;
    let high = UPPER_BOUND;
    let bestQuantity = 0.0;
    let bestCostDiff = Infinity;
    
    // Binary search for the optimal quantity
    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const mid = (low + high) / 2.0;

        let finalshares = vote === 0 ? [shares[1] + mid, shares[0]] : [shares[0], shares[1] + mid];
        const cost = Math.abs(calculateCost(liquidityParameter, finalshares) - currentCost);
        const costDiff = Math.abs(amount - cost);
        
        if (costDiff < bestCostDiff) {
            bestCostDiff = costDiff;
            bestQuantity = mid;
        }
        
        if (cost < amount) {
            low = mid;
        } else {
            high = mid;
        }
        
        if (costDiff < COST_TOLERANCE) { // Within tolerance
            break;
        }
    }

    return bestQuantity;
}

