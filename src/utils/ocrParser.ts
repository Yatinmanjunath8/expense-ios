export const parseAmountFromText = (blocks: any[]): string => {
  const amountRegex = /₹\s*(\d+(?:,\d+)*(?:\.\d+)?)/;
  
  // Try to find the block containing ₹ first
  for (const block of blocks) {
    const text = block.text;
    const match = text.match(amountRegex);
    if (match && match[1]) {
      return match[1].replace(/,/g, '');
    }
  }

  // Fallback: look for generic currency phrases if ₹ is not parsed well
  const fallbackRegex = /(?:Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d+)?)/i;
  for (const block of blocks) {
    const match = block.text.match(fallbackRegex);
    if (match && match[1]) {
      return match[1].replace(/,/g, '');
    }
  }

  return ''; // Return empty string if nothing found
};
