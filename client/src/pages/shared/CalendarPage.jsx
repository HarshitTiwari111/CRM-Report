import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { PageHeader, Card, Button, Badge, Spinner } from '../../components/ui';
import { getCalendar } from '../../api/metadata';
import { cn } from '../../utils/cn';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const month = currentMonth.getMonth() + 1;
  const year = currentMonth.getFullYear();

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', year, month],
    queryFn: () => getCalendar({ month, year }),
    select: (res) => res.data.data,
  });

  const events = data?.events || data || [];

  const eventsByDate = useMemo(() => {
    const map = new Map();
    (Array.isArray(events) ? events : []).forEach((evt) => {
      const dateKey = format(new Date(evt.date), 'yyyy-MM-dd');
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey).push(evt);
    });
    return map;
  }, [events]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const selectedEvents = selectedDay ? eventsByDate.get(format(selectedDay, 'yyyy-MM-dd')) || [] : [];

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Task deadlines and holidays" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" padding={false}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-slate-800">{format(currentMonth, 'MMMM yyyy')}</h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentMonth((m) => subMonths(m, 1))} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
                <FiChevronLeft className="h-4 w-4" />
              </button>
              <Button size="sm" variant="secondary" onClick={() => setCurrentMonth(new Date())}>
                Today
              </Button>
              <button onClick={() => setCurrentMonth((m) => addMonths(m, 1))} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
                <FiChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-72 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDate.get(key) || [];
                  const hasHoliday = dayEvents.some((e) => e.type === 'holiday');
                  const hasTask = dayEvents.some((e) => e.type === 'task' || e.type === 'deadline');
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        'flex h-16 flex-col items-start gap-1 rounded-lg border p-1.5 text-left text-xs transition-colors',
                        !isSameMonth(day, currentMonth) && 'opacity-40',
                        isSameDay(day, new Date()) ? 'border-primary-400 bg-primary-50' : 'border-slate-100 hover:bg-slate-50',
                        selectedDay && isSameDay(day, selectedDay) && 'ring-2 ring-primary-300'
                      )}
                    >
                      <span className="font-medium text-slate-600">{format(day, 'd')}</span>
                      <div className="flex gap-1">
                        {hasHoliday && <span className="h-1.5 w-1.5 rounded-full bg-red-400" />}
                        {hasTask && <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        <Card title={selectedDay ? format(selectedDay, 'EEEE, MMM d, yyyy') : 'Select a day'}>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-slate-400">No events for this day.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {selectedEvents.map((evt, idx) => (
                <li key={idx} className="flex items-center justify-between gap-2 border-b border-slate-50 pb-3 last:border-0">
                  <span className="text-sm text-slate-700">{evt.title || evt.name}</span>
                  <Badge color={evt.type === 'holiday' ? 'red' : 'indigo'}>{evt.type || 'task'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
