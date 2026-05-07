import { requireNativeModule } from 'expo-modules-core';

interface TextBlock {
  text: string;
  frame: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const ExpoVisionOcr = requireNativeModule('ExpoVisionOcr');

export async function recognizeImage(url: string): Promise<TextBlock[]> {
  return await ExpoVisionOcr.recognizeImage(url);
}
