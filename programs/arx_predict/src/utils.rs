use anchor_lang::prelude::*;
use crate::errors::ErrorCode;

pub fn convert_f64_to_token_amount(amount_f64: f64, decimals: u8) -> Result<u64> {
    if amount_f64 < 0.0 {
        return Err(ErrorCode::InvalidAmount.into());
    }
    
    let multiplier = 10u64.pow(decimals as u32);
    let rounded_amount = (amount_f64 * multiplier as f64).round();
    if rounded_amount > u64::MAX as f64 {
        return Err(ErrorCode::AmountTooLarge.into());
    }
    
    Ok(rounded_amount as u64)
}