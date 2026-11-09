import type { DeliveryFeedback } from '../../lib/interviewDelivery';

const clock = (seconds: number) => {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
};
export function DeliveryRow({ delivery }: { delivery?: DeliveryFeedback }) {
  if (!delivery) return null;
  return <div className="si-delivery" role="group" aria-label="Delivery measurements">
    <span>Time {clock(delivery.durationSeconds)} / ~2:00</span>
    <span>Speaking {clock(delivery.speakingSeconds)}</span>
    <span>{delivery.wordsPerMinute} words/min</span>
    <span>{Object.values(delivery.fillers).reduce((a, b) => a + b, 0)} filler matches</span>
    <span>{delivery.longPauses} pauses &gt;3s</span>
  </div>;
}
