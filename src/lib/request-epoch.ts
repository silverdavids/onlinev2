/** Discard replies started before a logout, account switch, or newer refresh. */
export function createRequestEpoch() {
  let current = 0;
  return {
    next: () => ++current,
    invalidate: () => {
      current++;
    },
    isCurrent: (request: number) => current === request,
  };
}
