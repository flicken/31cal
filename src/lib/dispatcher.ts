/*
Small DOM CustomEvent bus for decoupled notifications between modules.
Based on
  https://www.falldowngoboone.com/blog/talk-to-your-react-components-with-custom-events/
*/

function on(eventType: string, listener: EventListener): void {
  document.addEventListener(eventType, listener);
}

function off(eventType: string, listener: EventListener): void {
  document.removeEventListener(eventType, listener);
}

function trigger(eventType: string, data?: unknown) {
  document.dispatchEvent(new CustomEvent(eventType, { detail: data }));
}

export { on, off, trigger };
