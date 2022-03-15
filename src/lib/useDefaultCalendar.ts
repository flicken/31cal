import { useRecoilValue } from 'recoil';
import { defaultCalendarObject } from './store';

export default function useDefaultCalendar() {
  return useRecoilValue(defaultCalendarObject);
}
