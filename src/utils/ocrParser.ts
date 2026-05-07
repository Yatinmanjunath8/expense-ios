type AppType = 'GPAY' | 'PHONEPE' | 'PAYTM' | 'AMAZON' | 'CRED' | 'UNKNOWN';

export const detectApp = (fullText: string): AppType => {
  const text = fullText.toLowerCase();
  if (text.includes('@okicici') || text.includes('@oksbi') || text.includes('@okhdfcbank') || text.includes('@okaxis') || text.includes('gpay') || text.includes('google pay')) {
    return 'GPAY';
  }
  if (text.includes('@ybl') || text.includes('@ibl') || text.includes('@axl') || text.includes('phonepe')) {
    return 'PHONEPE';
  }
  if (text.includes('@paytm') || text.includes('paytm')) {
    return 'PAYTM';
  }
  if (text.includes('@apl') || text.includes('@yapl') || text.includes('amazon pay')) {
    return 'AMAZON';
  }
  if (text.includes('@cred') || text.includes('cred')) {
    return 'CRED';
  }
  return 'UNKNOWN';
};

export const parseAmountFromText = (blocks: any[]): string => {
  if (!blocks || blocks.length === 0) return '';

  const fullText = blocks.map(b => b.text).join('\n');
  const app = detectApp(fullText);

  // --- APP-SPECIFIC EXACT MATCHES ---
  
  if (app === 'PHONEPE') {
    // PhonePe usually says: "Payment of ₹500 to..."
    // We allow '7' as a fallback for '₹' due to OCR errors.
    const phonePeMatch = fullText.match(/Payment of (?:₹|Rs\.?|7)?\s*([\d,]+\.?\d*)/i);
    if (phonePeMatch && phonePeMatch[1]) {
      const val = parseFloat(phonePeMatch[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) return val.toString();
    }
  }

  // If there is EXACTLY one currency symbol on the screen, it's highly likely to be the amount
  const rupeeMatches = [...fullText.matchAll(/(?:₹|Rs\.?)\s*([\d,]+\.?\d*)/gi)];
  if (rupeeMatches.length === 1 && rupeeMatches[0][1]) {
    const val = parseFloat(rupeeMatches[0][1].replace(/,/g, ''));
    if (!isNaN(val) && val > 0 && val < 1000000) return val.toString(); // basic sanity check
  }

  // --- FALLBACK GENERIC SCORING ALGORITHM ---
  
  let bestMatch = '';
  let maxScore = -1000000;
  
  const isPaymentReceipt = /paid to|sent to|successful|transaction|upi/i.test(fullText);
  const hasCurrencySymbol = /(?:₹|Rs|INR)/i.test(fullText);

  for (const block of blocks) {
    let text = block.text.trim();
    
    // Rupee symbol OCR fix
    // The ₹ symbol is frequently misread as a '7'.
    if (app === 'GPAY' || (isPaymentReceipt && !hasCurrencySymbol)) {
      text = text.replace(/^7\s?(\d{1,7}(?:,\d+)*(?:\.\d{2})?)$/g, '$1');
    }
    
    // Extract the first clean number from the text
    const numRegex = /\d+(?:,\d+)*(?:\.\d+)?/;
    const numMatch = text.match(numRegex);
    
    if (!numMatch) continue;
    
    const numStr = numMatch[0];
    const numValue = parseFloat(numStr.replace(/,/g, ''));
    if (isNaN(numValue) || numValue <= 0) continue;

    let score = 0;
    
    // Base score: Physical area on screen. The main amount is usually the largest text!
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

    // GPay Specific: The amount is almost always the absolute largest text.
    // If it's GPay, we heavily trust the area.
    if (app === 'GPAY') {
      score += (area * 2); 
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
