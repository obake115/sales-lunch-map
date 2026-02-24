import { Platform, Share } from 'react-native';

/**
 * Capture a ref'd View as an image and share it via the native share sheet.
 */
export async function captureAndShare(viewRef: any, message: string): Promise<void> {
  let captureRef: ((ref: any, opts: any) => Promise<string>) | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-view-shot');
    captureRef = mod?.captureRef ?? null;
  } catch {
    // fallback to text share
    await Share.share({ message });
    return;
  }

  if (!captureRef || !viewRef) {
    await Share.share({ message });
    return;
  }

  try {
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
    });

    if (Platform.OS === 'ios') {
      await Share.share({ url: uri, message });
    } else {
      // On Android, use expo-sharing if available for image support
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Sharing = require('expo-sharing');
        if (Sharing && typeof Sharing.shareAsync === 'function') {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: message,
          });
        } else {
          await Share.share({ message });
        }
      } catch {
        await Share.share({ message });
      }
    }
  } catch {
    // Fallback to text share
    await Share.share({ message });
  }
}
