/* Pointer holds repeat in threes; native clicks retain keyboard and assistive-tech support. */
const ManaPress = (() => {
  function bind(button, adjust) {
    let timer, active = null, origin, holdGroup, suppressClick = false;
    const stopTimer = () => { clearTimeout(timer); timer = undefined; };
    function cancel() {
      if (active !== null) suppressClick = true;
      stopTimer(); active = null;
    }
    button.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0 || active !== null || button.disabled) return;
      active = event.pointerId; origin = [event.clientX, event.clientY]; suppressClick = false;
      button.setPointerCapture(active);
      holdGroup = {};
      function repeat() {
        timer = undefined;
        if (active === null || !button.isConnected || button.disabled) return;
        suppressClick = true;
        button.classList.remove('held');
        button.classList.add('held');
        setTimeout(() => button.classList.remove('held'), 280);
        adjust(3, holdGroup);
        if (active !== null && button.isConnected && !button.disabled) timer = setTimeout(repeat, 1000);
      }
      timer = setTimeout(repeat, 1000);
    });
    button.addEventListener('pointermove', event => {
      if (event.pointerId !== active) return;
      const bounds = button.getBoundingClientRect();
      if (Math.hypot(event.clientX - origin[0], event.clientY - origin[1]) > 12 ||
          event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) cancel();
    });
    button.addEventListener('pointerup', event => {
      if (event.pointerId !== active) return;
      stopTimer(); active = null;
    });
    for (const name of ['pointercancel', 'lostpointercapture', 'blur', 'cancelpress']) button.addEventListener(name, cancel);
    button.addEventListener('click', event => {
      if (event.detail === 0) { cancel(); adjust(1); return; }
      if (suppressClick) { suppressClick = false; return; }
      adjust(1);
    });
    button.addEventListener('contextmenu', event => event.preventDefault());
  }
  return { bind };
})();
if (typeof module !== 'undefined') module.exports = ManaPress;
