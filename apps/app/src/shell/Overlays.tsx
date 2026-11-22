import { ActivitySheet } from '../sheets/ActivitySheet';
import { BlockSheet } from '../sheets/BlockSheet';
import { CopyDaySheet } from '../sheets/CopyDaySheet';

/** Couches au-dessus des écrans : feuilles, focus, assistant, notification. */
export function Overlays() {
  return (
    <>
      <BlockSheet />
      <ActivitySheet />
      <CopyDaySheet />
    </>
  );
}
