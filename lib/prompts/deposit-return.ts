export interface SecurityDepositReturnData {
  landlordName: string;
  tenantName: string;
  propertyAddress: string;
  city: string;
  state: string;
  zip: string;
  moveOutDate: string;
  depositAmount: number;
  deductions: Array<{
    description: string;
    amount: number;
  }>;
  forwardingAddress: string;
}

export function generateSecurityDepositReturnPrompt(data: SecurityDepositReturnData): string {
  const totalDeductions = data.deductions.reduce((sum, d) => sum + d.amount, 0);
  const refundAmount = data.depositAmount - totalDeductions;

  const deductionsList = data.deductions.length > 0
    ? data.deductions.map(d => `- ${d.description}: $${d.amount.toFixed(2)}`).join('\n')
    : 'None';

  return `Generate a Texas-compliant Security Deposit Return Letter.

Texas Property Code § 92.103 Requirements:
- Landlord has 30 days after move-out to return deposit
- Must provide itemized list of deductions
- Normal wear and tear cannot be deducted
- If not returned within 30 days, landlord may owe 3x deposit + $100

Document Information:
- Landlord Name: ${data.landlordName}
- Tenant Name: ${data.tenantName}
- Property Address: ${data.propertyAddress}, ${data.city}, ${data.state} ${data.zip}
- Move-Out Date: ${data.moveOutDate}
- Original Security Deposit: $${data.depositAmount.toFixed(2)}
- Total Deductions: $${totalDeductions.toFixed(2)}
- Refund Amount: $${refundAmount.toFixed(2)}
- Tenant Forwarding Address: ${data.forwardingAddress}

Itemized Deductions:
${deductionsList}

Generate a formal letter with:
1. Clear title: "SECURITY DEPOSIT ACCOUNTING STATEMENT"
2. Reference to Texas Property Code § 92.103
3. Original deposit amount
4. Itemized list of all deductions with descriptions
5. Calculation showing refund amount
6. Statement about enclosed check (if refund due)
7. Explanation of any deductions
8. Note distinguishing repairs from normal wear and tear
9. Contact information for disputes
10. Landlord signature line with date

The document must comply with Texas 30-day requirement and be detailed enough to withstand legal scrutiny.`;
}
