import { AppError } from './errors';
import { drawFrame } from './renderer';
import type { OverlayText } from './renderer';
import type { RenderAppearance } from './render-theme';
import type { PreparedJourney } from './types';

/** Renders the final outro frame and encodes it as a PNG poster image. */
export async function createJourneyPosterBlob(
  canvas: HTMLCanvasElement,
  journey: PreparedJourney,
  overlay: OverlayText,
  appearance: RenderAppearance,
): Promise<Blob> {
  drawFrame(
    canvas,
    journey,
    { journeyProgress: 1, outroProgress: 1 },
    overlay,
    appearance,
  );
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
  if (!blob) {
    throw new AppError('errorPosterExport', 'The poster image could not be created.');
  }
  return blob;
}
