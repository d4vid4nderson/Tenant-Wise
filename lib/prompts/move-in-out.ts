export interface RoomCondition {
  room: string;
  walls: ConditionRating;
  floors: ConditionRating;
  windows: ConditionRating;
  fixtures: ConditionRating;
  notes?: string;
}

export type ConditionRating = 'excellent' | 'good' | 'fair' | 'poor' | 'n/a';

export interface MoveInOutChecklistData {
  landlordName: string;
  tenantName: string;
  propertyAddress: string;
  city: string;
  state: string;
  zip: string;
  unitNumber?: string;
  checklistType: 'move_in' | 'move_out';
  inspectionDate: string;
  rooms: RoomCondition[];
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor';
  meterReadings?: {
    electric?: string;
    gas?: string;
    water?: string;
  };
  keysProvided?: string[];
  additionalNotes?: string;
}

export function generateMoveInOutChecklistPrompt(data: MoveInOutChecklistData): string {
  const checklistTypeText = data.checklistType === 'move_in'
    ? 'MOVE-IN INSPECTION CHECKLIST'
    : 'MOVE-OUT INSPECTION CHECKLIST';

  const purposeText = data.checklistType === 'move_in'
    ? 'This document records the condition of the property at the start of tenancy to establish a baseline for comparison at move-out.'
    : 'This document records the condition of the property at the end of tenancy to assess any damages beyond normal wear and tear.';

  const conditionRatingText = (rating: ConditionRating): string => {
    const ratings: Record<ConditionRating, string> = {
      excellent: 'Excellent - Like new condition',
      good: 'Good - Minor signs of use, no damage',
      fair: 'Fair - Normal wear, minor issues',
      poor: 'Poor - Significant wear or damage',
      'n/a': 'N/A - Not applicable'
    };
    return ratings[rating];
  };

  const roomsDetail = data.rooms.map(room => `
Room: ${room.room}
  - Walls: ${conditionRatingText(room.walls)}
  - Floors: ${conditionRatingText(room.floors)}
  - Windows: ${conditionRatingText(room.windows)}
  - Fixtures: ${conditionRatingText(room.fixtures)}
  ${room.notes ? `- Notes: ${room.notes}` : ''}`
  ).join('\n');

  const meterReadingsText = data.meterReadings
    ? `
Utility Meter Readings:
- Electric: ${data.meterReadings.electric || 'Not recorded'}
- Gas: ${data.meterReadings.gas || 'Not recorded'}
- Water: ${data.meterReadings.water || 'Not recorded'}`
    : '';

  const keysText = data.keysProvided && data.keysProvided.length > 0
    ? `Keys ${data.checklistType === 'move_in' ? 'Provided' : 'Returned'}: ${data.keysProvided.join(', ')}`
    : '';

  const overallConditionText = {
    excellent: 'Excellent - Property in pristine condition',
    good: 'Good - Property well-maintained with minor wear',
    fair: 'Fair - Property shows normal wear and tear',
    poor: 'Poor - Property requires attention/repairs'
  }[data.overallCondition];

  const unitText = data.unitNumber ? `, Unit ${data.unitNumber}` : '';

  return `Generate a comprehensive ${data.checklistType === 'move_in' ? 'Move-In' : 'Move-Out'} Inspection Checklist for a Texas rental property.

Texas Property Code Requirements:
- § 92.104: Landlord must provide written description of property condition at move-in
- § 92.103: Security deposit deductions must be itemized and documented
- § 92.109: Tenant has right to be present at move-out inspection
- Documentation of property condition protects both landlord and tenant

Document Information:
- Landlord Name: ${data.landlordName}
- Tenant Name: ${data.tenantName}
- Property Address: ${data.propertyAddress}${unitText}, ${data.city}, ${data.state} ${data.zip}
- Inspection Type: ${data.checklistType === 'move_in' ? 'Move-In' : 'Move-Out'}
- Inspection Date: ${data.inspectionDate}
- Overall Condition: ${overallConditionText}
${meterReadingsText}
${keysText}

Room-by-Room Condition Assessment:
${roomsDetail}

${data.additionalNotes ? `Additional Notes: ${data.additionalNotes}` : ''}

Generate a formal inspection checklist document with:
1. Clear title: "${checklistTypeText}"
2. Property address and unit number prominently displayed
3. Inspection date and type clearly stated
4. Purpose statement: ${purposeText}
5. Detailed room-by-room condition assessment table format
6. Condition rating legend/key
7. Utility meter readings section
8. Keys/access devices checklist
9. Overall property condition summary
10. Space for photographs reference (if attached)
11. ${data.checklistType === 'move_in' ? 'Acknowledgment that tenant accepts property in documented condition' : 'Acknowledgment that inspection was completed in tenant presence'}
12. Signature lines for both landlord and tenant with dates
13. Note about tenant's right to dispute findings within 3 days
14. Reference to Texas Property Code sections for legal compliance
15. Statement about document being part of lease records

The document should be comprehensive, legally defensible, and serve as clear evidence of property condition at ${data.checklistType === 'move_in' ? 'the start of' : 'the end of'} tenancy.`;
}
