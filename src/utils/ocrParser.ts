export const parseAmountFromText = (blocks: any[]): string => {
  if (!blocks || blocks.length === 0) return '';

  let bestMatch = '';
  let maxScore = -1000000;

  for (const block of blocks) {
    const text = block.text.trim();
    
    // Extract the first clean number from the text
    const numRegex = /\d+(?:,\d+)*(?:\.\d+)?/;
    const numMatch = text.match(numRegex);
    
    if (!numMatch) continue;
    
    const numStr = numMatch[0];
    const numValue = parseFloat(numStr.replace(/,/g, ''));
    if (isNaN(numValue) || numValue <= 0) continue;

    let score = 0;
    // Base score is the physical area on screen. The main amount is usually the largest text!
    const area = block.frame ? (block.frame.width * block.frame.height) : 0;
    score += area; 

    // Boost score if it contains currency symbols
    if (/(?:₹|Rs\.?|INR)/i.test(text)) {
      score += 10000;
    }

    // Boost score if it's formatted exactly as a price with decimals (e.g., 380.00)
    if (/\.\d{2}$/.test(numStr)) {
      score += 5000;
    }

    // Heavily penalize long strings (e.g., UTR numbers, account numbers, dates)
    if (text.length > 15) {
      score -= 50000; 
    }
    
    // Heavily penalize if the text contains obvious non-amount keywords
    if (/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|ID|UTR|Ref|Bank|XXXX)/i.test(text)) {
      score -= 50000;
    }

    // Penalize exactly 12 digits (UTR/Transaction ID) or 10 digits (Phone number)
    const cleanNum = numStr.replace(/,/g, '');
    if (/^\d{12}$/.test(cleanNum) || /^\d{10}$/.test(cleanNum)) {
        score -= 50000;
    }

    if (score > maxScore) {
      maxScore = score;
      bestMatch = cleanNum;
    }
  }

  return bestMatch;
};

export const parseUtrFromText = (blocks: any[]): string => {
  if (!blocks || blocks.length === 0) return '';
  const fullText = blocks.map(b => b.text).join('\n');
  
  // UTR/UPI Ref numbers in India are strictly 12 digits long
  const utrRegex = /\b(\d{12})\b/;
  const match = fullText.match(utrRegex);
  if (match && match[1]) {
    return match[1];
  }
  
  return '';
};
