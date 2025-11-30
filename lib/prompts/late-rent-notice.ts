export interface LateRentNoticeData {
  landlordName: string;
  tenantName: string;
  propertyAddress: string;
  city: string;
  state: string;
  zip: string;
  rentAmount: number;
  lateFee: number;
  totalOwed: number;
  rentDueDate: string;
  noticeDate: string;
}

export function generateLateRentNoticePrompt(data: LateRentNoticeData): string {
  return `Generate a Texas-compliant Three-Day Notice to Pay Rent or Vacate.

Texas Property Code § 24.005 Requirements:
- Tenant must be given at least 3 days to pay rent or vacate
- Notice must be in writing
- Must specify the amount owed
- Must provide deadline for payment

Document Information:
- Landlord Name: ${data.landlordName}
- Tenant Name: ${data.tenantName}
- Property Address: ${data.propertyAddress}, ${data.city}, ${data.state} ${data.zip}
- Monthly Rent Amount: $${data.rentAmount.toFixed(2)}
- Late Fee: $${data.lateFee.toFixed(2)}
- Total Amount Owed: $${data.totalOwed.toFixed(2)}
- Rent Due Date: ${data.rentDueDate}
- Notice Date: ${data.noticeDate}

Generate a formal notice document with:
1. Clear title: "THREE-DAY NOTICE TO PAY RENT OR VACATE"
2. Property address prominently displayed
3. Itemized breakdown of amounts owed
4. Clear deadline (3 days from notice date)
5. Payment instructions section
6. Consequences of non-payment
7. Landlord signature line with date
8. Certificate of service section (how notice was delivered)

The document should be professional, clear, and suitable for legal proceedings if necessary.`;
}
