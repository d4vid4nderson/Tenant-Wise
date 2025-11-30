export interface MaintenanceResponseData {
  landlordName: string;
  tenantName: string;
  propertyAddress: string;
  city: string;
  state: string;
  zip: string;
  requestDate: string;
  responseDate: string;
  issueDescription: string;
  issueCategory: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'pest' | 'other';
  urgencyLevel: 'emergency' | 'urgent' | 'routine';
  scheduledDate?: string;
  scheduledTime?: string;
  contractorName?: string;
  contractorPhone?: string;
  estimatedCost?: number;
  tenantResponsibility: boolean;
  accessInstructions?: string;
  landlordPhone?: string;
  landlordEmail?: string;
}

export function generateMaintenanceResponsePrompt(data: MaintenanceResponseData): string {
  const urgencyText = {
    emergency: 'EMERGENCY - Immediate attention required',
    urgent: 'URGENT - Priority scheduling',
    routine: 'Routine maintenance request'
  }[data.urgencyLevel];

  const categoryText = {
    plumbing: 'Plumbing',
    electrical: 'Electrical',
    hvac: 'HVAC/Climate Control',
    appliance: 'Appliance',
    structural: 'Structural',
    pest: 'Pest Control',
    other: 'General Maintenance'
  }[data.issueCategory];

  const schedulingInfo = data.scheduledDate
    ? `- Scheduled Date: ${data.scheduledDate}${data.scheduledTime ? ` at ${data.scheduledTime}` : ''}`
    : '- Scheduling: To be determined';

  const contractorInfo = data.contractorName
    ? `- Service Provider: ${data.contractorName}${data.contractorPhone ? ` (${data.contractorPhone})` : ''}`
    : '- Service Provider: Landlord/Property Management';

  const costInfo = data.estimatedCost !== undefined
    ? `- Estimated Cost: $${data.estimatedCost.toFixed(2)}`
    : '';

  const responsibilityText = data.tenantResponsibility
    ? 'This repair has been determined to be tenant responsibility per the lease agreement.'
    : 'This repair will be covered by the landlord as part of property maintenance obligations.';

  const accessText = data.accessInstructions
    ? `\nAccess Instructions: ${data.accessInstructions}`
    : '';

  const contactInfo = [
    data.landlordPhone ? `Phone: ${data.landlordPhone}` : '',
    data.landlordEmail ? `Email: ${data.landlordEmail}` : ''
  ].filter(Boolean).join(' | ');

  return `Generate a professional maintenance response letter for a Texas rental property.

Texas Property Code § 92.052 Requirements:
- Landlord must make diligent effort to repair conditions that materially affect health or safety
- Tenant must give landlord reasonable time to repair (7 days for most repairs)
- Emergency repairs affecting health/safety require immediate attention
- Landlord must provide written notice of entry for non-emergency repairs

Document Information:
- Landlord Name: ${data.landlordName}
- Tenant Name: ${data.tenantName}
- Property Address: ${data.propertyAddress}, ${data.city}, ${data.state} ${data.zip}
- Original Request Date: ${data.requestDate}
- Response Date: ${data.responseDate}
- Issue Category: ${categoryText}
- Priority: ${urgencyText}
- Issue Description: ${data.issueDescription}
${schedulingInfo}
${contractorInfo}
${costInfo}
${accessText}

Responsibility: ${responsibilityText}

Landlord Contact: ${contactInfo || 'See letter signature'}

Generate a professional maintenance response letter with:
1. Clear title: "MAINTENANCE REQUEST RESPONSE"
2. Reference to original request date and description
3. Acknowledgment of the reported issue
4. Priority classification (${data.urgencyLevel})
5. Scheduled repair date/time or timeline for scheduling
6. Service provider information (if applicable)
7. Instructions for tenant regarding access to property
8. Clear statement of who is responsible for cost
9. Expected timeline for completion
10. Contact information for questions or updates
11. Note about Texas landlord repair obligations under Property Code § 92.052
12. Request for tenant confirmation of scheduling
13. Professional closing with landlord signature line

The tone should be professional, responsive, and reassuring to the tenant.`;
}
