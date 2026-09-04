// Enter/Space activation for elements that must act like a button or link
// but can't be one (e.g. a whole card with nested interactive children).
// Usage: <div role="button" tabIndex={0} onClick={fn} onKeyDown={onActivateKey(fn)}>
export function onActivateKey(fn) {
  return e => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    fn(e)
  }
}
