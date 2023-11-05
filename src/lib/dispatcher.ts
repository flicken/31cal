/*
Based on
  https://www.falldowngoboone.com/blog/talk-to-your-react-components-with-custom-events/
*/

function on(
  eventType: string,
  listener: EventListenerOrEventListenerObject,
): void {
  document.addEventListener(eventType, listener);
}

function off(
  eventType: string,
  listener: EventListenerOrEventListenerObject,
): void {
  document.removeEventListener(eventType, listener);
}

function once(
  eventType: string,
  listener: EventListenerOrEventListenerObject,
): void {
  document.addEventListener(eventType, listener, { once: true });
}

function trigger(eventType: string, data: any) {
  document.dispatchEvent(new CustomEvent(eventType, { detail: data }));
}

export { on, once, off, trigger };
