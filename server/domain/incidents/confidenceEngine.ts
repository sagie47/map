export interface ConfidenceInput {
  receiverCount: number;
  detectionCount: number;
  avgSignalStrength?: number;
  domainType?: string;
}

export function calculateConfidence(input: ConfidenceInput): number {
  let baseConfidence = 0.4;
  
  // Contribution from number of detections
  const detectionBonus = Math.min(0.4, input.detectionCount * 0.05);
  
  // Contribution from number of unique receivers
  const receiverBonus = Math.min(0.1, (input.receiverCount - 1) * 0.02);
  
  // Contribution from signal strength
  let signalBonus = 0;
  if (input.avgSignalStrength !== undefined) {
    signalBonus = Math.min(0.05, (input.avgSignalStrength / 100) * 0.05);
  }
  
  // Domain specific weighting
  let domainBonus = 0;
  if (input.domainType === 'aviation') {
    domainBonus = 0.04;
  } else if (input.domainType === 'marine') {
    domainBonus = 0.02;
  }
  
  const totalConfidence = baseConfidence + detectionBonus + receiverBonus + signalBonus + domainBonus;
  
  return Math.min(0.99, totalConfidence);
}
