export function buildRoomId({
  citizenId,
  lawyerId,
  incidentId,
}: {
  citizenId?: string;
  lawyerId?: string;
  incidentId?: string;
}) {
  if (citizenId && lawyerId) {
    return `conversation_${citizenId}_${lawyerId}`;
  }
  if (incidentId) {
    return `conversation_${incidentId}`;
  }
  return 'conversation_public_default';
}

