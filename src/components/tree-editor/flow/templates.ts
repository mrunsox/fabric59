import { IndustryTemplate, IndustryCategory, FlowNode, FlowEdge } from './types';

// Helper to create nodes with proper typing
const createNode = (
  id: string,
  label: string,
  type: string,
  content: string,
  x: number,
  y: number,
  options?: { id: string; label: string }[]
): FlowNode => ({
  id,
  type: 'custom',
  position: { x, y },
  data: {
    label,
    type: type as any,
    content,
    options,
  },
});

const createEdge = (source: string, target: string): FlowEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  type: 'smoothstep',
});

// ============================================
// CONTACT CENTER TEMPLATES (3 flows)
// ============================================

const basicIntakeFlow: IndustryTemplate = {
  id: 'cc-basic-intake',
  name: 'Basic Intake',
  description: 'Greeting > Caller ID Lookup > Reason for Call > Data Capture > Transfer/VM',
  category: 'contact-center',
  nodes: [
    createNode('1', 'Greeting', 'content', 'Thank you for calling! My name is [Agent Name]. How may I assist you today?', 100, 0),
    createNode('2', 'Caller ID Lookup', 'crm-lookup', 'Looking up your information in our system...', 100, 140),
    createNode('3', 'Reason for Call', 'question', 'What is the reason for your call today?', 100, 280, [
      { id: 'opt1', label: 'New Inquiry' },
      { id: 'opt2', label: 'Existing Issue' },
      { id: 'opt3', label: 'General Question' },
    ]),
    createNode('4', 'Data Capture', 'data', 'Let me collect some information to assist you better.', 100, 420),
    createNode('5', 'Transfer or VM', 'transfer', 'I\'ll connect you with the appropriate department now.', 100, 560),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
  ],
};

const multiDepartmentFlow: IndustryTemplate = {
  id: 'cc-multi-department',
  name: 'Multi-Department Routing',
  description: 'Greeting > Triage (Sales/Support/Billing) > Branch > Warm Transfer > Log',
  category: 'contact-center',
  nodes: [
    createNode('1', 'Greeting', 'content', 'Welcome! I\'m here to direct you to the right team.', 100, 0),
    createNode('2', 'Triage', 'question', 'Which department can I connect you with?', 100, 140, [
      { id: 'opt1', label: 'Sales' },
      { id: 'opt2', label: 'Support' },
      { id: 'opt3', label: 'Billing' },
    ]),
    createNode('3', 'Sales Branch', 'content', 'Great! Let me gather some details before connecting you to Sales.', 0, 280),
    createNode('4', 'Support Branch', 'content', 'I\'ll help you get to our technical support team.', 200, 280),
    createNode('5', 'Billing Branch', 'content', 'Connecting you to our billing department.', 400, 280),
    createNode('6', 'Warm Transfer', 'transfer', 'Transferring with context to the agent...', 200, 420),
    createNode('7', 'Log Interaction', 'api-webhook', 'Logging call details to CRM...', 200, 560),
    createNode('8', 'End', 'end', 'Thank you for calling! Have a great day.', 200, 700),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('2', '4'),
    createEdge('2', '5'),
    createEdge('3', '6'),
    createEdge('4', '6'),
    createEdge('5', '6'),
    createEdge('6', '7'),
    createEdge('7', '8'),
  ],
};

const overflowQueueFlow: IndustryTemplate = {
  id: 'cc-overflow-queue',
  name: 'Overflow Queue',
  description: 'Greeting > Wait Time ETA > Hold Music > Agent Available > Session Handoff',
  category: 'contact-center',
  nodes: [
    createNode('1', 'Greeting', 'content', 'Thank you for your patience. All agents are currently assisting other customers.', 100, 0),
    createNode('2', 'Wait Time ETA', 'content', 'Your estimated wait time is approximately 5 minutes.', 100, 140),
    createNode('3', 'Callback Option', 'question', 'Would you like to continue holding or receive a callback?', 100, 280, [
      { id: 'opt1', label: 'Continue Holding' },
      { id: 'opt2', label: 'Request Callback' },
    ]),
    createNode('4', 'Hold Music', 'audio-prompt', 'Playing hold music while you wait...', 0, 420),
    createNode('5', 'Callback Data', 'data', 'Please provide your callback number.', 250, 420),
    createNode('6', 'Agent Available', 'content', 'An agent is now available. Connecting you...', 0, 560),
    createNode('7', 'Session Handoff', 'transfer', 'Transferring your call with full context.', 0, 700),
    createNode('8', 'Callback Confirm', 'end', 'We\'ll call you back within 30 minutes. Thank you!', 250, 560),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('3', '5'),
    createEdge('4', '6'),
    createEdge('6', '7'),
    createEdge('5', '8'),
  ],
};

// ============================================
// INSURANCE TEMPLATES (3 flows)
// ============================================

const claimsProcessingFlow: IndustryTemplate = {
  id: 'ins-claims-processing',
  name: 'Claims Processing',
  description: 'Greeting > Policy Number > Incident Details > Coverage Check > Adjuster Transfer',
  category: 'insurance',
  nodes: [
    createNode('1', 'Greeting', 'content', 'Thank you for calling Claims. I\'m here to help you file or check on a claim.', 100, 0),
    createNode('2', 'Policy Number', 'data', 'Please provide your policy number for verification.', 100, 140),
    createNode('3', 'Verify Policy', 'crm-lookup', 'Verifying your policy information...', 100, 280),
    createNode('4', 'Incident Details', 'data', 'Please describe the incident. Include date, time, and what happened.', 100, 420),
    createNode('5', 'Coverage Check', 'ai-assist', 'Checking your coverage for this type of claim...', 100, 560),
    createNode('6', 'Coverage Result', 'question', 'Based on your policy:', 100, 700, [
      { id: 'opt1', label: 'Covered - Proceed' },
      { id: 'opt2', label: 'Needs Review' },
      { id: 'opt3', label: 'Not Covered' },
    ]),
    createNode('7', 'Adjuster Transfer', 'transfer', 'Connecting you with a claims adjuster...', 0, 840),
    createNode('8', 'Claim Submitted', 'end', 'Your claim has been submitted. An adjuster will contact you within 24 hours.', 200, 840),
    createNode('9', 'Denial Info', 'content', 'Unfortunately, this type of incident is not covered under your current policy. Here are your options...', 400, 840),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('6', '7'),
    createEdge('6', '8'),
    createEdge('6', '9'),
  ],
};

const quoteRequestFlow: IndustryTemplate = {
  id: 'ins-quote-request',
  name: 'Quote Request',
  description: 'Greeting > Coverage Type > Needs Assessment > Quote Generation > Follow-up Email',
  category: 'insurance',
  nodes: [
    createNode('1', 'Greeting', 'content', 'Hello! I can help you get a personalized insurance quote today.', 100, 0),
    createNode('2', 'Coverage Type', 'question', 'What type of coverage are you interested in?', 100, 140, [
      { id: 'opt1', label: 'Auto Insurance' },
      { id: 'opt2', label: 'Home Insurance' },
      { id: 'opt3', label: 'Life Insurance' },
      { id: 'opt4', label: 'Bundle (Auto+Home)' },
    ]),
    createNode('3', 'Needs Assessment', 'data', 'Let me gather some information to provide an accurate quote.', 100, 280),
    createNode('4', 'Quote Generation', 'ai-assist', 'Generating your personalized quote based on your needs...', 100, 420),
    createNode('5', 'Present Quote', 'content', 'Based on your information, here is your quote: [Quote Details]', 100, 560),
    createNode('6', 'Next Steps', 'question', 'Would you like to proceed with this quote?', 100, 700, [
      { id: 'opt1', label: 'Purchase Now' },
      { id: 'opt2', label: 'Speak to Agent' },
      { id: 'opt3', label: 'Email Quote' },
    ]),
    createNode('7', 'Purchase Flow', 'data', 'Great! Let\'s complete your application.', 0, 840),
    createNode('8', 'Agent Transfer', 'transfer', 'Connecting you with a licensed agent...', 200, 840),
    createNode('9', 'Email Quote', 'api-webhook', 'Sending quote details to your email...', 400, 840),
    createNode('10', 'Confirmation', 'end', 'Thank you! Check your email for the quote details.', 400, 980),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('6', '7'),
    createEdge('6', '8'),
    createEdge('6', '9'),
    createEdge('9', '10'),
  ],
};

const policyChangeFlow: IndustryTemplate = {
  id: 'ins-policy-change',
  name: 'Policy Change',
  description: 'Greeting > Verification > Change Type > Documentation > Confirmation SMS',
  category: 'insurance',
  nodes: [
    createNode('1', 'Greeting', 'content', 'I can help you make changes to your policy today.', 100, 0),
    createNode('2', 'Verification', 'data', 'For security, please verify your identity.', 100, 140),
    createNode('3', 'Verify Account', 'crm-lookup', 'Verifying your account...', 100, 280),
    createNode('4', 'Change Type', 'question', 'What type of change would you like to make?', 100, 420, [
      { id: 'opt1', label: 'Add Vehicle/Property' },
      { id: 'opt2', label: 'Update Address' },
      { id: 'opt3', label: 'Change Coverage' },
      { id: 'opt4', label: 'Update Beneficiary' },
    ]),
    createNode('5', 'Collect Details', 'data', 'Please provide the details for this change.', 100, 560),
    createNode('6', 'Documentation', 'content', 'I\'ve documented the requested changes. Here\'s a summary...', 100, 700),
    createNode('7', 'Submit Change', 'api-webhook', 'Submitting your policy change request...', 100, 840),
    createNode('8', 'SMS Confirmation', 'api-webhook', 'Sending confirmation via SMS...', 100, 980),
    createNode('9', 'Complete', 'end', 'Your policy change has been processed. You\'ll receive confirmation shortly.', 100, 1120),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('6', '7'),
    createEdge('7', '8'),
    createEdge('8', '9'),
  ],
};

// ============================================
// HOME SERVICES TEMPLATES (3 flows)
// ============================================

const emergencyDispatchFlow: IndustryTemplate = {
  id: 'hs-emergency-dispatch',
  name: 'Emergency Dispatch',
  description: 'Greeting > Service Type > Urgency Check > Address Verify > Dispatcher Transfer',
  category: 'home-services',
  nodes: [
    createNode('1', 'Greeting', 'content', 'Thank you for calling. Do you have an emergency situation?', 100, 0),
    createNode('2', 'Service Type', 'question', 'What type of emergency are you experiencing?', 100, 140, [
      { id: 'opt1', label: 'Gas Leak' },
      { id: 'opt2', label: 'Flooding/Water' },
      { id: 'opt3', label: 'No Heat/AC' },
      { id: 'opt4', label: 'Electrical Issue' },
    ]),
    createNode('3', 'Gas Safety', 'content', '⚠️ For gas leaks: Evacuate immediately, don\'t use switches. Call 911 if needed.', 0, 280),
    createNode('4', 'Urgency Check', 'question', 'Is this an immediate emergency requiring dispatch now?', 200, 280, [
      { id: 'opt1', label: 'Yes - Dispatch Now' },
      { id: 'opt2', label: 'No - Can Schedule' },
    ]),
    createNode('5', 'Address Verify', 'data', 'Please confirm your service address.', 100, 420),
    createNode('6', 'Dispatcher Transfer', 'transfer', 'Connecting you with our emergency dispatcher...', 0, 560),
    createNode('7', 'Schedule Service', 'api-webhook', 'Checking next available appointment...', 250, 560),
    createNode('8', 'ETA Confirm', 'end', 'Emergency technician dispatched. ETA: 30-45 minutes.', 0, 700),
    createNode('9', 'Appointment Set', 'end', 'Your appointment has been scheduled. We\'ll send a reminder.', 250, 700),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('2', '4'),
    createEdge('3', '5'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('5', '7'),
    createEdge('6', '8'),
    createEdge('7', '9'),
  ],
};

const appointmentBookFlow: IndustryTemplate = {
  id: 'hs-appointment-book',
  name: 'Appointment Booking',
  description: 'Greeting > Service Needed > Availability Check > Calendar Link > Confirmation',
  category: 'home-services',
  nodes: [
    createNode('1', 'Greeting', 'content', 'Thank you for calling! I can help you schedule a service appointment.', 100, 0),
    createNode('2', 'Service Needed', 'question', 'What service do you need?', 100, 140, [
      { id: 'opt1', label: 'HVAC Maintenance' },
      { id: 'opt2', label: 'Plumbing Repair' },
      { id: 'opt3', label: 'Electrical Work' },
      { id: 'opt4', label: 'General Inspection' },
    ]),
    createNode('3', 'Customer Info', 'data', 'Let me get your contact information and address.', 100, 280),
    createNode('4', 'Availability Check', 'api-webhook', 'Checking technician availability in your area...', 100, 420),
    createNode('5', 'Select Time', 'question', 'Please select your preferred time slot:', 100, 560, [
      { id: 'opt1', label: 'Morning (8am-12pm)' },
      { id: 'opt2', label: 'Afternoon (12pm-5pm)' },
      { id: 'opt3', label: 'Next Available' },
    ]),
    createNode('6', 'Calendar Confirm', 'content', 'Your appointment is set for [Date] at [Time].', 100, 700),
    createNode('7', 'Send Confirmation', 'api-webhook', 'Sending calendar invite and SMS reminder...', 100, 840),
    createNode('8', 'Complete', 'end', 'You\'re all set! Our technician will arrive during your selected window.', 100, 980),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('6', '7'),
    createEdge('7', '8'),
  ],
};

const followUpCallFlow: IndustryTemplate = {
  id: 'hs-followup-call',
  name: 'Follow-up Call',
  description: 'Greeting > Job Feedback > Upsell Maintenance > Review Request',
  category: 'home-services',
  nodes: [
    createNode('1', 'Greeting', 'content', 'Hi! I\'m calling to follow up on your recent service visit.', 100, 0),
    createNode('2', 'Job Feedback', 'question', 'How was your experience with our technician?', 100, 140, [
      { id: 'opt1', label: 'Excellent' },
      { id: 'opt2', label: 'Good' },
      { id: 'opt3', label: 'Issues to Address' },
    ]),
    createNode('3', 'Positive Path', 'content', 'Wonderful! We\'re glad you had a great experience.', 0, 280),
    createNode('4', 'Issue Resolution', 'data', 'I\'m sorry to hear that. Can you tell me what went wrong?', 300, 280),
    createNode('5', 'Upsell Maintenance', 'question', 'Would you be interested in our annual maintenance plan?', 100, 420, [
      { id: 'opt1', label: 'Yes, tell me more' },
      { id: 'opt2', label: 'Maybe later' },
      { id: 'opt3', label: 'Not interested' },
    ]),
    createNode('6', 'Maintenance Info', 'content', 'Our maintenance plan includes... [Benefits]', 0, 560),
    createNode('7', 'Review Request', 'question', 'Would you mind leaving us a review?', 100, 700, [
      { id: 'opt1', label: 'Sure!' },
      { id: 'opt2', label: 'Not now' },
    ]),
    createNode('8', 'Send Review Link', 'api-webhook', 'Sending review link via text...', 0, 840),
    createNode('9', 'Thank You', 'end', 'Thank you for your time! Have a great day.', 100, 840),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('2', '4'),
    createEdge('3', '5'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('5', '7'),
    createEdge('6', '7'),
    createEdge('7', '8'),
    createEdge('7', '9'),
    createEdge('8', '9'),
  ],
};

// ============================================
// HEALTHCARE TEMPLATES (3 flows)
// ============================================

const appointmentSchedulingFlow: IndustryTemplate = {
  id: 'hc-appointment-scheduling',
  name: 'Appointment Scheduling',
  description: 'Greeting > Patient Lookup > Reason for Visit > Slot Finder > Reminder Set',
  category: 'healthcare',
  nodes: [
    createNode('1', 'Greeting', 'content', 'Thank you for calling. I can help you schedule an appointment.', 100, 0),
    createNode('2', 'Patient Lookup', 'data', 'May I have your name and date of birth for verification?', 100, 140),
    createNode('3', 'Verify Patient', 'crm-lookup', 'Looking up your patient record...', 100, 280),
    createNode('4', 'Reason for Visit', 'question', 'What is the reason for your visit?', 100, 420, [
      { id: 'opt1', label: 'Annual Physical' },
      { id: 'opt2', label: 'Follow-up Visit' },
      { id: 'opt3', label: 'New Concern' },
      { id: 'opt4', label: 'Urgent Care' },
    ]),
    createNode('5', 'Provider Selection', 'question', 'Would you like to see your regular provider?', 100, 560, [
      { id: 'opt1', label: 'Yes, Dr. [Name]' },
      { id: 'opt2', label: 'Any Available' },
    ]),
    createNode('6', 'Slot Finder', 'api-webhook', 'Searching for available appointments...', 100, 700),
    createNode('7', 'Select Slot', 'question', 'Here are the available times:', 100, 840, [
      { id: 'opt1', label: 'Tomorrow 9am' },
      { id: 'opt2', label: 'Thursday 2pm' },
      { id: 'opt3', label: 'Friday 11am' },
    ]),
    createNode('8', 'Reminder Set', 'api-webhook', 'Setting up your appointment reminder...', 100, 980),
    createNode('9', 'Confirmation', 'end', 'Your appointment is confirmed. You\'ll receive a reminder 24 hours before.', 100, 1120),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('6', '7'),
    createEdge('7', '8'),
    createEdge('8', '9'),
  ],
};

const refillRequestFlow: IndustryTemplate = {
  id: 'hc-refill-request',
  name: 'Prescription Refill',
  description: 'Greeting > Prescription Verify > Quantity Check > Pharmacy Relay > Status Update',
  category: 'healthcare',
  nodes: [
    createNode('1', 'Greeting', 'content', 'I can help you request a prescription refill.', 100, 0),
    createNode('2', 'Patient Verify', 'data', 'Please provide your date of birth and last name.', 100, 140),
    createNode('3', 'Lookup Records', 'crm-lookup', 'Accessing your prescription records...', 100, 280),
    createNode('4', 'Prescription Verify', 'question', 'Which medication do you need refilled?', 100, 420, [
      { id: 'opt1', label: 'Medication A - 30 day' },
      { id: 'opt2', label: 'Medication B - 90 day' },
      { id: 'opt3', label: 'All current medications' },
    ]),
    createNode('5', 'Quantity Check', 'content', 'Checking remaining refills on this prescription...', 100, 560),
    createNode('6', 'Pharmacy Confirm', 'question', 'Send to your pharmacy on file?', 100, 700, [
      { id: 'opt1', label: 'Yes, same pharmacy' },
      { id: 'opt2', label: 'Different pharmacy' },
    ]),
    createNode('7', 'Pharmacy Relay', 'api-webhook', 'Sending refill request to pharmacy...', 100, 840),
    createNode('8', 'Status Update', 'content', 'Your refill has been submitted. Ready in 2-4 hours.', 100, 980),
    createNode('9', 'Complete', 'end', 'You\'ll receive a text when it\'s ready for pickup.', 100, 1120),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('6', '7'),
    createEdge('7', '8'),
    createEdge('8', '9'),
  ],
};

const triageSymptomsFlow: IndustryTemplate = {
  id: 'hc-triage-symptoms',
  name: 'Symptom Triage',
  description: 'Greeting > Chief Complaint > Urgency Assessment > Provider Transfer',
  category: 'healthcare',
  nodes: [
    createNode('1', 'Greeting', 'content', 'I can help assess your symptoms and connect you with the right care.', 100, 0),
    createNode('2', 'Chief Complaint', 'data', 'Please describe your main symptom or concern.', 100, 140),
    createNode('3', 'Symptom Details', 'question', 'How long have you been experiencing this?', 100, 280, [
      { id: 'opt1', label: 'Just started today' },
      { id: 'opt2', label: 'Few days' },
      { id: 'opt3', label: 'Week or more' },
    ]),
    createNode('4', 'Urgency Assessment', 'ai-assist', 'Assessing symptom severity...', 100, 420),
    createNode('5', 'Severity Result', 'question', 'Based on your symptoms:', 100, 560, [
      { id: 'opt1', label: 'Emergency - 911' },
      { id: 'opt2', label: 'Urgent - Same Day' },
      { id: 'opt3', label: 'Routine - Schedule' },
    ]),
    createNode('6', 'Emergency Transfer', 'content', '⚠️ Please call 911 immediately or go to the nearest ER.', 0, 700),
    createNode('7', 'Urgent Transfer', 'transfer', 'Connecting you with our urgent care nurse...', 200, 700),
    createNode('8', 'Schedule Routine', 'api-webhook', 'Let me find you an appointment...', 400, 700),
    createNode('9', 'Complete', 'end', 'Please seek care as directed. Take care!', 200, 840),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('5', '7'),
    createEdge('5', '8'),
    createEdge('6', '9'),
    createEdge('7', '9'),
    createEdge('8', '9'),
  ],
};

// ============================================
// CONSUMER PRODUCTS TEMPLATES (3 flows)
// ============================================

const productSupportFlow: IndustryTemplate = {
  id: 'cp-product-support',
  name: 'Product Support',
  description: 'Greeting > Model Number > Issue Type > Troubleshooting > Replace/Refund',
  category: 'consumer-products',
  nodes: [
    createNode('1', 'Greeting', 'content', 'Thank you for calling product support. I\'m here to help!', 100, 0),
    createNode('2', 'Model Number', 'data', 'Can you provide the model number? It\'s usually on the back or bottom.', 100, 140),
    createNode('3', 'Lookup Product', 'crm-lookup', 'Looking up your product information...', 100, 280),
    createNode('4', 'Issue Type', 'question', 'What issue are you experiencing?', 100, 420, [
      { id: 'opt1', label: 'Not Turning On' },
      { id: 'opt2', label: 'Error Message' },
      { id: 'opt3', label: 'Physical Damage' },
      { id: 'opt4', label: 'Other Issue' },
    ]),
    createNode('5', 'Troubleshooting', 'content', 'Let\'s try some troubleshooting steps...', 100, 560),
    createNode('6', 'Issue Resolved', 'question', 'Did that resolve your issue?', 100, 700, [
      { id: 'opt1', label: 'Yes, fixed!' },
      { id: 'opt2', label: 'No, still broken' },
    ]),
    createNode('7', 'Happy End', 'end', 'Great! Glad I could help. Enjoy your product!', 0, 840),
    createNode('8', 'Resolution Options', 'question', 'Would you prefer a replacement or refund?', 250, 840, [
      { id: 'opt1', label: 'Replacement' },
      { id: 'opt2', label: 'Refund' },
    ]),
    createNode('9', 'Process Request', 'api-webhook', 'Processing your request...', 250, 980),
    createNode('10', 'Complete', 'end', 'Your request is being processed. Check email for details.', 250, 1120),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('6', '7'),
    createEdge('6', '8'),
    createEdge('8', '9'),
    createEdge('9', '10'),
  ],
};

const warrantyClaimFlow: IndustryTemplate = {
  id: 'cp-warranty-claim',
  name: 'Warranty Claim',
  description: 'Greeting > Purchase Date > Coverage Verify > Shipping Instructions > RMA Generate',
  category: 'consumer-products',
  nodes: [
    createNode('1', 'Greeting', 'content', 'I can help you with a warranty claim today.', 100, 0),
    createNode('2', 'Product Info', 'data', 'Please provide the product model and serial number.', 100, 140),
    createNode('3', 'Purchase Date', 'data', 'When did you purchase this product?', 100, 280),
    createNode('4', 'Coverage Verify', 'crm-lookup', 'Checking warranty status...', 100, 420),
    createNode('5', 'Coverage Status', 'question', 'Warranty status:', 100, 560, [
      { id: 'opt1', label: 'Active Warranty' },
      { id: 'opt2', label: 'Extended Warranty' },
      { id: 'opt3', label: 'Expired' },
    ]),
    createNode('6', 'Shipping Instructions', 'content', 'You\'ll need to ship the product to our service center.', 0, 700),
    createNode('7', 'Paid Repair Option', 'question', 'Would you like a paid repair quote?', 350, 700, [
      { id: 'opt1', label: 'Yes, get quote' },
      { id: 'opt2', label: 'No thanks' },
    ]),
    createNode('8', 'RMA Generate', 'api-webhook', 'Generating your RMA number...', 0, 840),
    createNode('9', 'Email Label', 'api-webhook', 'Emailing prepaid shipping label...', 0, 980),
    createNode('10', 'Complete', 'end', 'Your RMA has been created. Check your email for the shipping label.', 0, 1120),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('5', '7'),
    createEdge('6', '8'),
    createEdge('8', '9'),
    createEdge('9', '10'),
  ],
};

const usageGuidanceFlow: IndustryTemplate = {
  id: 'cp-usage-guidance',
  name: 'Usage Guidance',
  description: 'Greeting > Product Demo > FAQ Lookup > Escalation Path',
  category: 'consumer-products',
  nodes: [
    createNode('1', 'Greeting', 'content', 'I can help you learn how to use your product better.', 100, 0),
    createNode('2', 'Product Select', 'data', 'Which product do you need help with?', 100, 140),
    createNode('3', 'Topic Selection', 'question', 'What would you like to learn about?', 100, 280, [
      { id: 'opt1', label: 'Initial Setup' },
      { id: 'opt2', label: 'Features' },
      { id: 'opt3', label: 'Maintenance' },
      { id: 'opt4', label: 'Accessories' },
    ]),
    createNode('4', 'Product Demo', 'content', 'Let me walk you through this feature...', 100, 420),
    createNode('5', 'More Help', 'question', 'Did that answer your question?', 100, 560, [
      { id: 'opt1', label: 'Yes, thank you!' },
      { id: 'opt2', label: 'Have more questions' },
      { id: 'opt3', label: 'Need more help' },
    ]),
    createNode('6', 'FAQ Lookup', 'ai-assist', 'Searching our knowledge base for more info...', 200, 700),
    createNode('7', 'Escalation Path', 'transfer', 'Let me connect you with a product specialist.', 350, 700),
    createNode('8', 'Complete', 'end', 'Thanks for calling! Enjoy your product.', 0, 700),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('5', '7'),
    createEdge('5', '8'),
    createEdge('6', '5'),
  ],
};

// ============================================
// FINANCE TEMPLATES (3 flows)
// ============================================

const loanInquiryFlow: IndustryTemplate = {
  id: 'fin-loan-inquiry',
  name: 'Loan Inquiry',
  description: 'Greeting > Verify Caller > Loan Type > Qualification Questions > Application Link',
  category: 'finance',
  nodes: [
    createNode('1', 'Greeting', 'content', 'Thank you for your interest in our loan products.', 100, 0),
    createNode('2', 'Verify Caller', 'data', 'For your security, please provide your name and last 4 of SSN.', 100, 140),
    createNode('3', 'Loan Type', 'question', 'What type of loan are you interested in?', 100, 280, [
      { id: 'opt1', label: 'Personal Loan' },
      { id: 'opt2', label: 'Auto Loan' },
      { id: 'opt3', label: 'Home Loan' },
      { id: 'opt4', label: 'Business Loan' },
    ]),
    createNode('4', 'Qualification Questions', 'data', 'Let me ask a few questions to check your eligibility.', 100, 420),
    createNode('5', 'Pre-Qualification', 'ai-assist', 'Checking pre-qualification status...', 100, 560),
    createNode('6', 'Result', 'question', 'Based on your information:', 100, 700, [
      { id: 'opt1', label: 'Pre-Qualified!' },
      { id: 'opt2', label: 'Needs Review' },
    ]),
    createNode('7', 'Application Link', 'api-webhook', 'Sending application link to your phone...', 0, 840),
    createNode('8', 'Transfer to Officer', 'transfer', 'Connecting you with a loan officer...', 250, 840),
    createNode('9', 'Complete', 'end', 'Check your phone for the application link. Good luck!', 0, 980),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('6', '7'),
    createEdge('6', '8'),
    createEdge('7', '9'),
  ],
};

const accountIssueFlow: IndustryTemplate = {
  id: 'fin-account-issue',
  name: 'Account Issue',
  description: 'Greeting > Account Number > Problem Type > Resolution Steps > Escalation',
  category: 'finance',
  nodes: [
    createNode('1', 'Greeting', 'content', 'I can help you with your account concern today.', 100, 0),
    createNode('2', 'Account Number', 'data', 'Please provide your account number or registered phone.', 100, 140),
    createNode('3', 'Verify Account', 'crm-lookup', 'Verifying your account...', 100, 280),
    createNode('4', 'Problem Type', 'question', 'What issue are you experiencing?', 100, 420, [
      { id: 'opt1', label: 'Unauthorized Transaction' },
      { id: 'opt2', label: 'Statement Error' },
      { id: 'opt3', label: 'Fee Dispute' },
      { id: 'opt4', label: 'Access Issues' },
    ]),
    createNode('5', 'Resolution Steps', 'content', 'Let me help you resolve this issue...', 100, 560),
    createNode('6', 'Issue Resolved', 'question', 'Is your issue resolved?', 100, 700, [
      { id: 'opt1', label: 'Yes, resolved' },
      { id: 'opt2', label: 'Need escalation' },
    ]),
    createNode('7', 'Log Resolution', 'api-webhook', 'Logging resolution to your account...', 0, 840),
    createNode('8', 'Escalation', 'transfer', 'Escalating to our specialist team...', 250, 840),
    createNode('9', 'Complete', 'end', 'Thank you for banking with us!', 100, 980),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('6', '7'),
    createEdge('6', '8'),
    createEdge('7', '9'),
    createEdge('8', '9'),
  ],
};

const cardActivationFlow: IndustryTemplate = {
  id: 'fin-card-activation',
  name: 'Card Activation',
  description: 'Greeting > Card Details > Security PIN > Activation Complete > Usage Tips',
  category: 'finance',
  nodes: [
    createNode('1', 'Greeting', 'content', 'I can help you activate your new card today.', 100, 0),
    createNode('2', 'Card Details', 'data', 'Please enter the 16-digit card number.', 100, 140),
    createNode('3', 'Verify Card', 'crm-lookup', 'Verifying card information...', 100, 280),
    createNode('4', 'Security Questions', 'data', 'Please answer these security questions.', 100, 420),
    createNode('5', 'Set PIN', 'data', 'Please set your 4-digit security PIN.', 100, 560),
    createNode('6', 'Activate Card', 'api-webhook', 'Activating your card...', 100, 700),
    createNode('7', 'Activation Complete', 'content', '✓ Your card is now active and ready to use!', 100, 840),
    createNode('8', 'Usage Tips', 'content', 'Here are some tips: Sign the back, set up alerts, download our app.', 100, 980),
    createNode('9', 'Complete', 'end', 'Thank you! Your card is ready. Call us if you need anything.', 100, 1120),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('6', '7'),
    createEdge('7', '8'),
    createEdge('8', '9'),
  ],
};

// ============================================
// FINAL MILE TEMPLATES (3 flows)
// ============================================

const deliveryStatusFlow: IndustryTemplate = {
  id: 'fm-delivery-status',
  name: 'Delivery Status',
  description: 'Greeting > Order Number > Location Update > ETA Confirm > Exception Handle',
  category: 'final-mile',
  nodes: [
    createNode('1', 'Greeting', 'content', 'I can help you track your delivery.', 100, 0),
    createNode('2', 'Order Number', 'data', 'Please provide your order or tracking number.', 100, 140),
    createNode('3', 'Lookup Order', 'crm-lookup', 'Looking up your delivery status...', 100, 280),
    createNode('4', 'Location Update', 'content', 'Your package is currently: [Status] at [Location]', 100, 420),
    createNode('5', 'ETA Confirm', 'content', 'Estimated delivery: [Date/Time Window]', 100, 560),
    createNode('6', 'Any Issues', 'question', 'Is there anything else about your delivery?', 100, 700, [
      { id: 'opt1', label: 'All good, thanks!' },
      { id: 'opt2', label: 'Change delivery' },
      { id: 'opt3', label: 'Report issue' },
    ]),
    createNode('7', 'Exception Handle', 'data', 'Please describe the issue with your delivery.', 250, 840),
    createNode('8', 'Reschedule', 'api-webhook', 'Processing your delivery change...', 100, 840),
    createNode('9', 'Complete', 'end', 'Thank you! Your delivery is on the way.', 100, 980),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('6', '7'),
    createEdge('6', '8'),
    createEdge('6', '9'),
    createEdge('7', '9'),
    createEdge('8', '9'),
  ],
};

const failedAttemptFlow: IndustryTemplate = {
  id: 'fm-failed-attempt',
  name: 'Failed Delivery Attempt',
  description: 'Greeting > Address Confirm > Reschedule Options > Notification SMS',
  category: 'final-mile',
  nodes: [
    createNode('1', 'Greeting', 'content', 'I see we couldn\'t complete your delivery. Let me help.', 100, 0),
    createNode('2', 'Tracking Number', 'data', 'Please provide your tracking number.', 100, 140),
    createNode('3', 'Lookup', 'crm-lookup', 'Looking up delivery attempt details...', 100, 280),
    createNode('4', 'Address Confirm', 'question', 'Is this address correct? [Address on file]', 100, 420, [
      { id: 'opt1', label: 'Yes, correct' },
      { id: 'opt2', label: 'No, update it' },
    ]),
    createNode('5', 'Update Address', 'data', 'Please provide the correct delivery address.', 250, 560),
    createNode('6', 'Reschedule Options', 'question', 'When would you like redelivery?', 100, 560, [
      { id: 'opt1', label: 'Tomorrow' },
      { id: 'opt2', label: 'Pick specific date' },
      { id: 'opt3', label: 'Hold at location' },
    ]),
    createNode('7', 'Schedule Delivery', 'api-webhook', 'Scheduling your new delivery...', 100, 700),
    createNode('8', 'Notification SMS', 'api-webhook', 'Sending confirmation via SMS...', 100, 840),
    createNode('9', 'Complete', 'end', 'Your redelivery is scheduled. You\'ll receive a text confirmation.', 100, 980),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('4', '6'),
    createEdge('5', '6'),
    createEdge('6', '7'),
    createEdge('7', '8'),
    createEdge('8', '9'),
  ],
};

const proofDisputeFlow: IndustryTemplate = {
  id: 'fm-proof-dispute',
  name: 'Proof of Delivery Dispute',
  description: 'Greeting > POD Review > Evidence Request > Refund Path',
  category: 'final-mile',
  nodes: [
    createNode('1', 'Greeting', 'content', 'I can help you with a delivery dispute.', 100, 0),
    createNode('2', 'Order Info', 'data', 'Please provide your order number.', 100, 140),
    createNode('3', 'Lookup Delivery', 'crm-lookup', 'Looking up proof of delivery...', 100, 280),
    createNode('4', 'POD Review', 'content', 'Our records show delivery on [Date] at [Time]. Photo: [Link]', 100, 420),
    createNode('5', 'Dispute Type', 'question', 'What is your concern?', 100, 560, [
      { id: 'opt1', label: 'Never received' },
      { id: 'opt2', label: 'Wrong location' },
      { id: 'opt3', label: 'Damaged' },
    ]),
    createNode('6', 'Evidence Request', 'data', 'Please describe what happened and provide any photos.', 100, 700),
    createNode('7', 'Review Case', 'ai-assist', 'Reviewing your dispute claim...', 100, 840),
    createNode('8', 'Resolution', 'question', 'Based on our review:', 100, 980, [
      { id: 'opt1', label: 'Refund approved' },
      { id: 'opt2', label: 'Reship item' },
      { id: 'opt3', label: 'Investigation needed' },
    ]),
    createNode('9', 'Process Refund', 'api-webhook', 'Processing your refund...', 0, 1120),
    createNode('10', 'Reship Order', 'api-webhook', 'Creating reship order...', 200, 1120),
    createNode('11', 'Escalate', 'transfer', 'Connecting you with our investigations team.', 400, 1120),
    createNode('12', 'Complete', 'end', 'Your dispute has been resolved. Thank you for your patience.', 200, 1260),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('6', '7'),
    createEdge('7', '8'),
    createEdge('8', '9'),
    createEdge('8', '10'),
    createEdge('8', '11'),
    createEdge('9', '12'),
    createEdge('10', '12'),
    createEdge('11', '12'),
  ],
};

// ============================================
// REVERSE LOGISTICS TEMPLATES (3 flows)
// ============================================

const returnInitiationFlow: IndustryTemplate = {
  id: 'rl-return-initiation',
  name: 'Return Initiation',
  description: 'Greeting > Order Lookup > Eligibility Check > RMA Issue > Label Email',
  category: 'reverse-logistics',
  nodes: [
    createNode('1', 'Greeting', 'content', 'I can help you start a return today.', 100, 0),
    createNode('2', 'Order Lookup', 'data', 'Please provide your order number.', 100, 140),
    createNode('3', 'Find Order', 'crm-lookup', 'Looking up your order...', 100, 280),
    createNode('4', 'Return Reason', 'question', 'What is the reason for your return?', 100, 420, [
      { id: 'opt1', label: 'Changed mind' },
      { id: 'opt2', label: 'Wrong item' },
      { id: 'opt3', label: 'Defective' },
      { id: 'opt4', label: 'Not as described' },
    ]),
    createNode('5', 'Eligibility Check', 'content', 'Checking return eligibility within our 30-day policy...', 100, 560),
    createNode('6', 'Eligibility Result', 'question', 'Return status:', 100, 700, [
      { id: 'opt1', label: 'Eligible' },
      { id: 'opt2', label: 'Past window' },
    ]),
    createNode('7', 'RMA Issue', 'api-webhook', 'Generating your return authorization...', 0, 840),
    createNode('8', 'Exception Review', 'transfer', 'Let me connect you with a supervisor for review.', 300, 840),
    createNode('9', 'Label Email', 'api-webhook', 'Emailing your prepaid return label...', 0, 980),
    createNode('10', 'Complete', 'end', 'Your RMA is ready. Check email for return label and instructions.', 0, 1120),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('6', '7'),
    createEdge('6', '8'),
    createEdge('7', '9'),
    createEdge('9', '10'),
  ],
};

const refundTrackFlow: IndustryTemplate = {
  id: 'rl-refund-track',
  name: 'Refund Tracking',
  description: 'Greeting > RMA Number > Processing Status > ETA Timeline > Feedback',
  category: 'reverse-logistics',
  nodes: [
    createNode('1', 'Greeting', 'content', 'I can check on your refund status.', 100, 0),
    createNode('2', 'RMA Number', 'data', 'Please provide your RMA or return tracking number.', 100, 140),
    createNode('3', 'Lookup Return', 'crm-lookup', 'Looking up your return status...', 100, 280),
    createNode('4', 'Processing Status', 'content', 'Return Status: [Received/Processing/Complete]', 100, 420),
    createNode('5', 'ETA Timeline', 'content', 'Your refund will be processed within [X] business days.', 100, 560),
    createNode('6', 'Questions', 'question', 'Do you have any questions about your refund?', 100, 700, [
      { id: 'opt1', label: 'No, all good' },
      { id: 'opt2', label: 'When exactly?' },
      { id: 'opt3', label: 'Need to escalate' },
    ]),
    createNode('7', 'Feedback', 'question', 'How was your return experience?', 100, 840, [
      { id: 'opt1', label: 'Easy' },
      { id: 'opt2', label: 'Okay' },
      { id: 'opt3', label: 'Difficult' },
    ]),
    createNode('8', 'Log Feedback', 'api-webhook', 'Recording your feedback...', 100, 980),
    createNode('9', 'Complete', 'end', 'Thank you! Your refund is on its way.', 100, 1120),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('6', '7'),
    createEdge('7', '8'),
    createEdge('8', '9'),
  ],
};

const exchangeFlow: IndustryTemplate = {
  id: 'rl-exchange-flow',
  name: 'Exchange Flow',
  description: 'Greeting > Stock Check > New Item Select > Old Disposal Instructions',
  category: 'reverse-logistics',
  nodes: [
    createNode('1', 'Greeting', 'content', 'I can help you exchange your item for a different one.', 100, 0),
    createNode('2', 'Order Info', 'data', 'Please provide your original order number.', 100, 140),
    createNode('3', 'Lookup Order', 'crm-lookup', 'Looking up your order...', 100, 280),
    createNode('4', 'Exchange Reason', 'question', 'Why would you like to exchange?', 100, 420, [
      { id: 'opt1', label: 'Wrong size' },
      { id: 'opt2', label: 'Wrong color' },
      { id: 'opt3', label: 'Different model' },
    ]),
    createNode('5', 'New Item Select', 'data', 'Which item would you like instead?', 100, 560),
    createNode('6', 'Stock Check', 'api-webhook', 'Checking availability...', 100, 700),
    createNode('7', 'Stock Result', 'question', 'Item availability:', 100, 840, [
      { id: 'opt1', label: 'In stock' },
      { id: 'opt2', label: 'Out of stock' },
    ]),
    createNode('8', 'Process Exchange', 'api-webhook', 'Creating your exchange order...', 0, 980),
    createNode('9', 'Alternatives', 'content', 'That item is out of stock. Here are alternatives...', 250, 980),
    createNode('10', 'Old Disposal', 'content', 'Return the original item using the prepaid label we\'ll email.', 0, 1120),
    createNode('11', 'Complete', 'end', 'Your exchange is processing! New item ships when we receive the return.', 0, 1260),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('6', '7'),
    createEdge('7', '8'),
    createEdge('7', '9'),
    createEdge('8', '10'),
    createEdge('10', '11'),
  ],
};

// ============================================
// ECOMMERCE TEMPLATES (3 flows)
// ============================================

const orderTrackFlow: IndustryTemplate = {
  id: 'ec-order-track',
  name: 'Order Tracking',
  description: 'Greeting > Order ID > Status Report > Issue Triage > Resolution',
  category: 'ecommerce',
  nodes: [
    createNode('1', 'Greeting', 'content', 'I can help you track your order!', 100, 0),
    createNode('2', 'Order ID', 'data', 'Please provide your order number or email address.', 100, 140),
    createNode('3', 'Fetch Order', 'crm-lookup', 'Looking up your order...', 100, 280),
    createNode('4', 'Status Report', 'content', 'Order Status: [Status] | Tracking: [Number] | ETA: [Date]', 100, 420),
    createNode('5', 'Issue Triage', 'question', 'Is there an issue with your order?', 100, 560, [
      { id: 'opt1', label: 'No, looks good!' },
      { id: 'opt2', label: 'Where is it?' },
      { id: 'opt3', label: 'Wrong item' },
      { id: 'opt4', label: 'Damaged' },
    ]),
    createNode('6', 'Happy Path', 'end', 'Great! Your order is on its way. Thanks for shopping with us!', 0, 700),
    createNode('7', 'Detailed Track', 'content', 'Let me get detailed tracking information...', 150, 700),
    createNode('8', 'Issue Resolution', 'data', 'Please describe the issue so we can help.', 300, 700),
    createNode('9', 'Resolution', 'api-webhook', 'Processing your resolution request...', 300, 840),
    createNode('10', 'Complete', 'end', 'We\'ve submitted your request. Check email for updates.', 300, 980),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('5', '7'),
    createEdge('5', '8'),
    createEdge('7', '6'),
    createEdge('8', '9'),
    createEdge('9', '10'),
  ],
};

const refundRequestFlow: IndustryTemplate = {
  id: 'ec-refund-request',
  name: 'Refund Request',
  description: 'Greeting > Reason Capture > Policy Apply > Approval Workflow',
  category: 'ecommerce',
  nodes: [
    createNode('1', 'Greeting', 'content', 'I can help you with a refund request.', 100, 0),
    createNode('2', 'Order Info', 'data', 'Please provide your order number.', 100, 140),
    createNode('3', 'Lookup Order', 'crm-lookup', 'Looking up your order details...', 100, 280),
    createNode('4', 'Reason Capture', 'question', 'What is the reason for your refund request?', 100, 420, [
      { id: 'opt1', label: 'Order not received' },
      { id: 'opt2', label: 'Item not as described' },
      { id: 'opt3', label: 'Changed my mind' },
      { id: 'opt4', label: 'Quality issue' },
    ]),
    createNode('5', 'Policy Apply', 'content', 'Checking refund eligibility based on our policy...', 100, 560),
    createNode('6', 'Approval Status', 'question', 'Refund status:', 100, 700, [
      { id: 'opt1', label: 'Auto-approved' },
      { id: 'opt2', label: 'Needs review' },
      { id: 'opt3', label: 'Return required' },
    ]),
    createNode('7', 'Process Refund', 'api-webhook', 'Processing your refund...', 0, 840),
    createNode('8', 'Manual Review', 'transfer', 'Connecting you with our refund team...', 200, 840),
    createNode('9', 'Return Instructions', 'content', 'You\'ll need to return the item. We\'ll email a label.', 400, 840),
    createNode('10', 'Complete', 'end', 'Refund processed! Allow 5-7 business days.', 100, 980),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('6', '7'),
    createEdge('6', '8'),
    createEdge('6', '9'),
    createEdge('7', '10'),
    createEdge('9', '10'),
  ],
};

const stockInquiryFlow: IndustryTemplate = {
  id: 'ec-stock-inquiry',
  name: 'Stock Inquiry',
  description: 'Greeting > Item Search > Alternatives Offer > Cart Assist',
  category: 'ecommerce',
  nodes: [
    createNode('1', 'Greeting', 'content', 'I can help you check product availability!', 100, 0),
    createNode('2', 'Item Search', 'data', 'What product are you looking for?', 100, 140),
    createNode('3', 'Check Inventory', 'api-webhook', 'Checking current inventory...', 100, 280),
    createNode('4', 'Stock Status', 'question', 'Availability status:', 100, 420, [
      { id: 'opt1', label: 'In Stock' },
      { id: 'opt2', label: 'Low Stock' },
      { id: 'opt3', label: 'Out of Stock' },
    ]),
    createNode('5', 'Add to Cart', 'question', 'Would you like to add this to your cart?', 0, 560, [
      { id: 'opt1', label: 'Yes, add it' },
      { id: 'opt2', label: 'No thanks' },
    ]),
    createNode('6', 'Low Stock Alert', 'content', 'Only [X] left! Order soon to secure yours.', 200, 560),
    createNode('7', 'Alternatives Offer', 'content', 'That item is out of stock. Here are similar items...', 400, 560),
    createNode('8', 'Cart Assist', 'api-webhook', 'Adding to your cart...', 0, 700),
    createNode('9', 'Back Order Option', 'question', 'Would you like to backorder or be notified when in stock?', 400, 700, [
      { id: 'opt1', label: 'Backorder' },
      { id: 'opt2', label: 'Notify me' },
    ]),
    createNode('10', 'Complete', 'end', 'Done! Check your cart or email for updates.', 200, 840),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('4', '6'),
    createEdge('4', '7'),
    createEdge('5', '8'),
    createEdge('6', '5'),
    createEdge('7', '9'),
    createEdge('8', '10'),
    createEdge('9', '10'),
  ],
};

// ============================================
// TECH SUPPORT TEMPLATES (3 flows)
// ============================================

const loginFailureFlow: IndustryTemplate = {
  id: 'ts-login-failure',
  name: 'Login Failure',
  description: 'Greeting > Account Email > Reset Flow > 2FA Setup > Test Access',
  category: 'tech-support',
  nodes: [
    createNode('1', 'Greeting', 'content', 'I can help you regain access to your account.', 100, 0),
    createNode('2', 'Account Email', 'data', 'What email is associated with your account?', 100, 140),
    createNode('3', 'Lookup Account', 'crm-lookup', 'Looking up your account...', 100, 280),
    createNode('4', 'Issue Type', 'question', 'What issue are you experiencing?', 100, 420, [
      { id: 'opt1', label: 'Forgot password' },
      { id: 'opt2', label: 'Account locked' },
      { id: 'opt3', label: '2FA not working' },
    ]),
    createNode('5', 'Reset Flow', 'content', 'I\'m sending a password reset link to your email.', 0, 560),
    createNode('6', 'Unlock Account', 'api-webhook', 'Unlocking your account...', 200, 560),
    createNode('7', '2FA Reset', 'content', 'Let me reset your 2FA settings.', 400, 560),
    createNode('8', 'Send Reset', 'api-webhook', 'Sending reset link...', 100, 700),
    createNode('9', '2FA Setup', 'content', 'Please set up 2FA again for security.', 100, 840),
    createNode('10', 'Test Access', 'question', 'Can you try logging in now?', 100, 980, [
      { id: 'opt1', label: 'Yes, it works!' },
      { id: 'opt2', label: 'Still not working' },
    ]),
    createNode('11', 'Complete', 'end', 'Great! You\'re all set. Enjoy using the app!', 0, 1120),
    createNode('12', 'Escalate', 'transfer', 'Let me connect you with our technical team.', 250, 1120),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('4', '6'),
    createEdge('4', '7'),
    createEdge('5', '8'),
    createEdge('6', '8'),
    createEdge('7', '8'),
    createEdge('8', '9'),
    createEdge('9', '10'),
    createEdge('10', '11'),
    createEdge('10', '12'),
  ],
};

const featureBugFlow: IndustryTemplate = {
  id: 'ts-feature-bug',
  name: 'Feature Bug Report',
  description: 'Greeting > App Version > Step-by-Step Fix > Tier 2 Transfer',
  category: 'tech-support',
  nodes: [
    createNode('1', 'Greeting', 'content', 'I\'ll help you troubleshoot this issue.', 100, 0),
    createNode('2', 'App Version', 'data', 'What version of the app are you using? (Settings > About)', 100, 140),
    createNode('3', 'Lookup Known Issues', 'ai-assist', 'Checking for known issues with this version...', 100, 280),
    createNode('4', 'Issue Description', 'data', 'Please describe what\'s not working correctly.', 100, 420),
    createNode('5', 'Step-by-Step Fix', 'content', 'Let\'s try these troubleshooting steps:\n1. Clear cache\n2. Restart app\n3. Update to latest version', 100, 560),
    createNode('6', 'Fixed?', 'question', 'Did those steps resolve the issue?', 100, 700, [
      { id: 'opt1', label: 'Yes, fixed!' },
      { id: 'opt2', label: 'No, still broken' },
    ]),
    createNode('7', 'Happy End', 'end', 'Great! Glad we could fix it. Happy computing!', 0, 840),
    createNode('8', 'Log Bug', 'api-webhook', 'Logging this bug report...', 250, 840),
    createNode('9', 'Tier 2 Transfer', 'transfer', 'Connecting you with our technical specialist...', 250, 980),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('5', '6'),
    createEdge('6', '7'),
    createEdge('6', '8'),
    createEdge('8', '9'),
  ],
};

const billingQueryFlow: IndustryTemplate = {
  id: 'ts-billing-query',
  name: 'Billing Query',
  description: 'Greeting > Transaction ID > Review Details > Adjustment Apply',
  category: 'tech-support',
  nodes: [
    createNode('1', 'Greeting', 'content', 'I can help you with billing questions.', 100, 0),
    createNode('2', 'Account Verify', 'data', 'Please verify your account email.', 100, 140),
    createNode('3', 'Lookup Account', 'crm-lookup', 'Looking up your billing history...', 100, 280),
    createNode('4', 'Query Type', 'question', 'What is your billing question about?', 100, 420, [
      { id: 'opt1', label: 'Unexpected charge' },
      { id: 'opt2', label: 'Subscription change' },
      { id: 'opt3', label: 'Refund request' },
      { id: 'opt4', label: 'Invoice needed' },
    ]),
    createNode('5', 'Transaction ID', 'data', 'Which transaction are you asking about?', 0, 560),
    createNode('6', 'Sub Change', 'question', 'What would you like to change?', 150, 560, [
      { id: 'opt1', label: 'Upgrade plan' },
      { id: 'opt2', label: 'Downgrade plan' },
      { id: 'opt3', label: 'Cancel' },
    ]),
    createNode('7', 'Invoice', 'api-webhook', 'Generating your invoice...', 300, 560),
    createNode('8', 'Review Details', 'content', 'Let me review this transaction: [Details]', 0, 700),
    createNode('9', 'Adjustment Apply', 'question', 'Resolution for this charge:', 0, 840, [
      { id: 'opt1', label: 'Issue credit' },
      { id: 'opt2', label: 'Legitimate charge' },
    ]),
    createNode('10', 'Process Adjustment', 'api-webhook', 'Applying adjustment...', 0, 980),
    createNode('11', 'Complete', 'end', 'Your billing inquiry has been resolved. Check email for details.', 150, 980),
  ],
  edges: [
    createEdge('1', '2'),
    createEdge('2', '3'),
    createEdge('3', '4'),
    createEdge('4', '5'),
    createEdge('4', '6'),
    createEdge('4', '7'),
    createEdge('5', '8'),
    createEdge('8', '9'),
    createEdge('9', '10'),
    createEdge('10', '11'),
    createEdge('6', '11'),
    createEdge('7', '11'),
  ],
};

// ============================================
// EXPORT ALL TEMPLATES
// ============================================

export const industryTemplates: IndustryTemplate[] = [
  // Contact Centers (3)
  basicIntakeFlow,
  multiDepartmentFlow,
  overflowQueueFlow,
  // Insurance (3)
  claimsProcessingFlow,
  quoteRequestFlow,
  policyChangeFlow,
  // Home Services (3)
  emergencyDispatchFlow,
  appointmentBookFlow,
  followUpCallFlow,
  // Healthcare (3)
  appointmentSchedulingFlow,
  refillRequestFlow,
  triageSymptomsFlow,
  // Consumer Products (3)
  productSupportFlow,
  warrantyClaimFlow,
  usageGuidanceFlow,
  // Finance (3)
  loanInquiryFlow,
  accountIssueFlow,
  cardActivationFlow,
  // Final Mile (3)
  deliveryStatusFlow,
  failedAttemptFlow,
  proofDisputeFlow,
  // Reverse Logistics (3)
  returnInitiationFlow,
  refundTrackFlow,
  exchangeFlow,
  // Ecommerce (3)
  orderTrackFlow,
  refundRequestFlow,
  stockInquiryFlow,
  // Tech Support (3)
  loginFailureFlow,
  featureBugFlow,
  billingQueryFlow,
];

export function getTemplatesByCategory(category: IndustryCategory): IndustryTemplate[] {
  return industryTemplates.filter(t => t.category === category);
}

export function getTemplateById(id: string): IndustryTemplate | undefined {
  return industryTemplates.find(t => t.id === id);
}
