import { Assistant } from '../overlays/Assistant';
import { FocusMode } from '../overlays/FocusMode';
import { Recap } from '../overlays/Recap';
import { Celebration, NotificationBanner, ReminderWatcher } from '../overlays/Notification';
import { ActivitySheet } from '../sheets/ActivitySheet';
import { BlockSheet } from '../sheets/BlockSheet';
import { CopyDaySheet } from '../sheets/CopyDaySheet';
import { AccountSheet } from '../sheets/AccountSheet';
import { GoalSheet } from '../sheets/GoalSheet';
import { MoneyCategorySheet } from '../sheets/MoneyCategorySheet';
import { MoneySheet } from '../sheets/MoneySheet';
import { RecurringSheet } from '../sheets/RecurringSheet';
import { ReviewSheet } from '../sheets/ReviewSheet';
import { Watchers } from './Watchers';

/** Couches au-dessus des écrans : feuilles, focus, assistant, rappels, fête. */
export function Overlays() {
  return (
    <>
      <BlockSheet />
      <ActivitySheet />
      <CopyDaySheet />
      <GoalSheet />
      <MoneySheet />
      <AccountSheet />
      <MoneyCategorySheet />
      <RecurringSheet />
      <ReviewSheet />
      <FocusMode />
      <Assistant />
      <Recap />
      <Watchers />
      <ReminderWatcher />
      <NotificationBanner />
      <Celebration />
    </>
  );
}
