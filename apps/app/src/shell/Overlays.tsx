import { Assistant } from '../overlays/Assistant';
import { FocusMode } from '../overlays/FocusMode';
import { Celebration, NotificationBanner, ReminderWatcher } from '../overlays/Notification';
import { ActivitySheet } from '../sheets/ActivitySheet';
import { BlockSheet } from '../sheets/BlockSheet';
import { CopyDaySheet } from '../sheets/CopyDaySheet';

/** Couches au-dessus des écrans : feuilles, focus, assistant, rappels, fête. */
export function Overlays() {
  return (
    <>
      <BlockSheet />
      <ActivitySheet />
      <CopyDaySheet />
      <FocusMode />
      <Assistant />
      <ReminderWatcher />
      <NotificationBanner />
      <Celebration />
    </>
  );
}
