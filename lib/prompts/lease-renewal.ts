export interface LeaseRenewalData {
  landlordName: string;
  tenantName: string;
  propertyAddress: string;
  city: string;
  state: string;
  zip: string;
  currentLeaseEnd: string;
  newLeaseStart: string;
  newLeaseEnd: string;
  currentRent: number;
  newRent: number;
  responseDeadline: string;
}

export function generateLeaseRenewalPrompt(data: LeaseRenewalData): string {
  const rentChange = data.newRent - data.currentRent;
  const rentChangeText = rentChange > 0 
    ? `an increase of $${rentChange.toFixed(2)}` 
    : rentChange < 0 
    ? `a decrease of $${Math.abs(rentChange).toFixed(2)}` 
    : 'no change';

  return `Generate a professional lease renewal letter for a Texas rental property.

Document Information:
- Landlord Name: ${data.landlordName}
- Tenant Name: ${data.tenantName}
- Property Address: ${data.propertyAddress}, ${data.city}, ${data.state} ${data.zip}
- Current Lease Ends: ${data.currentLeaseEnd}
- Proposed New Lease Period: ${data.newLeaseStart} to ${data.newLeaseEnd}
- Current Monthly Rent: $${data.currentRent.toFixed(2)}
- Proposed New Monthly Rent: $${data.newRent.toFixed(2)} (${rentChangeText})
- Response Deadline: ${data.responseDeadline}

Generate a professional letter with:
1. Warm opening thanking tenant for their tenancy
2. Clear statement of lease renewal offer
3. New lease terms (dates, rent amount)
4. Any changes from current lease highlighted
5. Instructions for accepting the renewal
6. Response deadline clearly stated
7. Contact information for questions
8. Professional closing
9. Landlord signature line

The tone should be professional yet friendly, encouraging the tenant to renew.`;
}
