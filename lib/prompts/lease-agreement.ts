export interface LeaseAgreementData {
  landlordName: string;
  landlordAddress: string;
  landlordCity: string;
  landlordState: string;
  landlordZip: string;
  landlordPhone?: string;
  landlordEmail?: string;
  tenantName: string;
  tenantPhone?: string;
  tenantEmail?: string;
  propertyAddress: string;
  city: string;
  state: string;
  zip: string;
  unitNumber?: string;
  leaseStartDate: string;
  leaseEndDate: string;
  monthlyRent: number;
  securityDeposit: number;
  rentDueDay: number;
  lateFeeAmount: number;
  lateFeeGracePeriod: number;
  petsAllowed: boolean;
  petDeposit?: number;
  petRent?: number;
  maxOccupants: number;
  utilitiesIncluded: string[];
  parkingSpaces: number;
  additionalTerms?: string;
}

export function generateLeaseAgreementPrompt(data: LeaseAgreementData): string {
  const utilitiesText = data.utilitiesIncluded.length > 0
    ? `Included utilities: ${data.utilitiesIncluded.join(', ')}`
    : 'No utilities included - tenant responsible for all utilities';

  const petText = data.petsAllowed
    ? `Pets are allowed with a pet deposit of $${(data.petDeposit || 0).toFixed(2)} and monthly pet rent of $${(data.petRent || 0).toFixed(2)}.`
    : 'No pets allowed on the premises.';

  return `Generate a comprehensive Texas Residential Lease Agreement.

Texas Property Code Requirements:
- Chapter 92: Residential Tenancies
- § 92.103: Security deposit must be returned within 30 days
- § 92.052: Landlord's duty to repair
- § 92.056: Landlord's liability for failure to repair
- Fair Housing Act compliance required

PARTIES TO THIS AGREEMENT:

LANDLORD:
- Name: ${data.landlordName}
- Address: ${data.landlordAddress}, ${data.landlordCity}, ${data.landlordState} ${data.landlordZip}
${data.landlordPhone ? `- Phone: ${data.landlordPhone}` : ''}
${data.landlordEmail ? `- Email: ${data.landlordEmail}` : ''}

TENANT:
- Name: ${data.tenantName}
${data.tenantPhone ? `- Phone: ${data.tenantPhone}` : ''}
${data.tenantEmail ? `- Email: ${data.tenantEmail}` : ''}

PROPERTY:
- Address: ${data.propertyAddress}${data.unitNumber ? `, Unit ${data.unitNumber}` : ''}, ${data.city}, ${data.state} ${data.zip}

LEASE TERMS:
- Lease Start Date: ${data.leaseStartDate}
- Lease End Date: ${data.leaseEndDate}
- Monthly Rent: $${data.monthlyRent.toFixed(2)}
- Security Deposit: $${data.securityDeposit.toFixed(2)}
- Rent Due Day: ${data.rentDueDay}${getOrdinalSuffix(data.rentDueDay)} of each month
- Late Fee: $${data.lateFeeAmount.toFixed(2)} after ${data.lateFeeGracePeriod} day grace period
- Maximum Occupants: ${data.maxOccupants}
- Parking Spaces: ${data.parkingSpaces}

UTILITIES:
${utilitiesText}

PET POLICY:
${petText}

${data.additionalTerms ? `ADDITIONAL TERMS:\n${data.additionalTerms}` : ''}

Generate a complete residential lease agreement with the following sections:

1. PARTIES - Identify landlord and tenant(s)
2. PROPERTY DESCRIPTION - Full address and any included items/appliances
3. LEASE TERM - Start date, end date, and renewal terms
4. RENT - Amount, due date, payment methods, and late fees
5. SECURITY DEPOSIT - Amount, conditions for return, Texas 30-day requirement
6. UTILITIES - Which party is responsible for each utility
7. OCCUPANCY - Maximum occupants, guest policies
8. PETS - Pet policy as specified above
9. MAINTENANCE AND REPAIRS - Landlord and tenant responsibilities per Texas law
10. ENTRY BY LANDLORD - Notice requirements (reasonable notice under Texas law)
11. ALTERATIONS - Tenant modifications to property
12. PARKING - Number of spaces, vehicle requirements
13. NOISE AND CONDUCT - Quiet enjoyment provisions
14. INSURANCE - Renter's insurance recommendation
15. DEFAULT AND TERMINATION - Breach conditions, notice requirements
16. MOVE-OUT PROCEDURES - Notice requirements, inspection process
17. DISCLOSURES - Lead-based paint (if applicable), known hazards
18. SIGNATURES - Landlord and tenant signature lines with dates

Include standard legal language and Texas-specific provisions. The document should be comprehensive and professionally formatted.

Add a disclaimer at the end: "This lease agreement is provided as a template and may not address all situations. Landlords and tenants are encouraged to consult with a licensed attorney for legal advice specific to their situation."`;
}

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
