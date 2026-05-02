export const parseAmountFromText = (blocks: any[]): string => {
  if (!blocks || blocks.length === 0) return '';

  // Combine all text blocks into a single string for easier searching across lines
  const fullText = blocks.map(b => b.text).join('\n');
  
  // 1. Try to find explicit currency symbols (₹, Rs, INR) followed by a number
  // This handles standard formats like "₹500", "₹ 500", "Rs. 1,500.50"
  const amountRegex = /(?:₹|Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d+)?)/i;
  const match = fullText.match(amountRegex);
  if (match && match[1]) {
    return match[1].replace(/,/g, '');
  }

  // 2. If no currency symbol is found, ML Kit might have missed the ₹ symbol 
  // or read it as something else. Let's look for a standalone formatted number 
  // that looks like a price (e.g., 500.00 or 1,500)
  const priceRegex = /^\s*(\d+(?:,\d+)*(?:\.\d{2}))\s*$/;
  for (const block of blocks) {
    const priceMatch = block.text.match(priceRegex);
    if (priceMatch && priceMatch[1]) {
      return priceMatch[1].replace(/,/g, '');
    }
  }

  // 3. Fallback: just find the first number that has a decimal point (like 50.00)
  const decimalRegex = /(\d+(?:,\d+)*\.\d{2})/;
  const decimalMatch = fullText.match(decimalRegex);
  if (decimalMatch && decimalMatch[1]) {
    return decimalMatch[1].replace(/,/g, '');
  }

  return ''; // Return empty string if nothing found
};
