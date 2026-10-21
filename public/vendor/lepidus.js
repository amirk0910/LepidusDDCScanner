/**
 * lepidus.js — Lepidus Design System, vanilla behavior layer
 *
 * Companion to @ramsarjal-404/css for HTML/CSS/JS apps (no framework, no build
 * tool). Bootstrap-style: write the documented markup with data attributes
 * and include this script — components initialize themselves on
 * DOMContentLoaded. Everything is also callable manually via window.Lepidus
 * (e.g. after injecting markup dynamically, call Lepidus.init(container)).
 *
 * Components:
 *   Tabs      — <div class="lp-tabs" role="tablist" data-lp-tabs> with
 *               role="tab" buttons; panels referenced by aria-controls.
 *               Click + ArrowLeft/Right/Home/End, roving tabindex.
 *   Modal     — <div class="lp-modal" id="…" hidden> opened by
 *               [data-lp-modal-open="id"], closed by [data-lp-modal-close],
 *               Escape, or a backdrop click. Focus is trapped while open and
 *               restored on close.
 *   Accordion — [data-lp-accordion]: triggers with aria-expanded +
 *               aria-controls toggle their lp-accordion__panel.
 *   Dropdown  — [data-lp-dropdown]: trigger opens the option panel; outside
 *               click / Escape close it; option clicks toggle aria-checked
 *               (multi) or select-and-close (data-lp-dropdown="single").
 *               Fires an "lp-dropdown-change" CustomEvent on the wrapper.
 *   Stepper   — [data-lp-stepper]: up/down controls step the numeric input
 *               (respects min/max/step attributes).
 *   Toast     — Lepidus.toast({ title, message, variant, duration }) stacks
 *               an auto-dismissing notification top-end.
 *   Tooltip   — [data-lp-tooltip="text"]: shows a bubble on hover/focus.
 */
(function () {
  'use strict';

  var FOCUSABLE =
    'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), ' +
    'textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

  /* === TABS === */

  function activateTab(tablist, tab) {
    var tabs = tablist.querySelectorAll('[role="tab"]');
    tabs.forEach(function (t) {
      var selected = t === tab;
      t.classList.toggle('lp-tabs__tab--active', selected);
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      var panel = t.getAttribute('aria-controls');
      var el = panel && document.getElementById(panel);
      if (el) el.hidden = !selected;
    });
  }

  function initTabs(tablist) {
    if (tablist.dataset.lpReady) return;
    tablist.dataset.lpReady = 'true';
    var current =
      tablist.querySelector('[role="tab"][aria-selected="true"]') ||
      tablist.querySelector('[role="tab"]');
    if (current) activateTab(tablist, current);

    tablist.addEventListener('click', function (e) {
      var tab = e.target.closest('[role="tab"]');
      if (tab && !tab.disabled) activateTab(tablist, tab);
    });

    tablist.addEventListener('keydown', function (e) {
      var keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (keys.indexOf(e.key) === -1) return;
      var tabs = Array.prototype.filter.call(
        tablist.querySelectorAll('[role="tab"]'),
        function (t) { return !t.disabled; }
      );
      var i = tabs.indexOf(document.activeElement);
      if (i === -1) return;
      e.preventDefault();
      var rtl = getComputedStyle(tablist).direction === 'rtl';
      var next = e.key === 'Home' ? 0
        : e.key === 'End' ? tabs.length - 1
        : (e.key === 'ArrowRight') !== rtl
          ? (i + 1) % tabs.length
          : (i - 1 + tabs.length) % tabs.length;
      tabs[next].focus();
      activateTab(tablist, tabs[next]);
    });
  }

  /* === MODAL === */

  var openModalEl = null;
  var lastFocused = null;
  var inerted = [];

  function openModal(idOrEl) {
    var modal = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
    if (!modal || !modal.hidden) return;
    lastFocused = document.activeElement;
    modal.hidden = false;
    openModalEl = modal;
    // Page content behind the dialog must be inert — keyboard focus is
    // trapped below, but screen-reader virtual cursors are not.
    inerted = Array.prototype.filter.call(document.body.children, function (el) {
      return el !== modal && !el.contains(modal) && !el.inert && el.tagName !== 'SCRIPT';
    });
    inerted.forEach(function (el) { el.inert = true; });
    var target =
      modal.querySelector('[data-lp-autofocus]') || modal.querySelector(FOCUSABLE);
    if (target) target.focus();
  }

  function closeModal() {
    if (!openModalEl) return;
    openModalEl.hidden = true;
    openModalEl = null;
    inerted.forEach(function (el) { el.inert = false; });
    inerted = [];
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
    lastFocused = null;
  }

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-lp-modal-open]');
    if (opener) {
      openModal(opener.getAttribute('data-lp-modal-open'));
      return;
    }
    if (!openModalEl) return;
    if (e.target.closest('[data-lp-modal-close]')) {
      closeModal();
    } else if (e.target === openModalEl) {
      // click landed on the backdrop itself, not the shell
      closeModal();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (!openModalEl) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      return;
    }
    if (e.key !== 'Tab') return;
    // Focus trap — cycle within the open modal.
    var focusables = openModalEl.querySelectorAll(FOCUSABLE);
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (!openModalEl.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    }
  });

  /* === ACCORDION === */

  function initAccordion(acc) {
    if (acc.dataset.lpReady) return;
    acc.dataset.lpReady = 'true';
    acc.addEventListener('click', function (e) {
      var trigger = e.target.closest('.lp-accordion__trigger');
      if (!trigger || trigger.disabled) return;
      var expanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!expanded));
      var panel = document.getElementById(trigger.getAttribute('aria-controls'));
      if (panel) panel.classList.toggle('lp-accordion__panel--open', !expanded);
    });
  }

  /* === DROPDOWN === */

  var openDropdown = null;

  function setDropdownOpen(dd, open) {
    var trigger = dd.querySelector('.lp-dropdown__trigger');
    var panel = dd.querySelector('.lp-dropdown__panel');
    if (!trigger || !panel) return;
    panel.hidden = !open;
    trigger.classList.toggle('lp-dropdown__trigger--hidden', open);
    trigger.setAttribute('aria-expanded', String(open));
    openDropdown = open ? dd : openDropdown === dd ? null : openDropdown;
    if (!open && document.activeElement && panel.contains(document.activeElement)) {
      trigger.focus();
    }
  }

  function initDropdown(dd) {
    if (dd.dataset.lpReady) return;
    dd.dataset.lpReady = 'true';
    var single = dd.getAttribute('data-lp-dropdown') === 'single';
    var panel = dd.querySelector('.lp-dropdown__panel');
    if (panel) panel.hidden = true;

    dd.addEventListener('click', function (e) {
      if (e.target.closest('.lp-dropdown__trigger')) {
        var t = e.target.closest('.lp-dropdown__trigger');
        if (t.classList.contains('lp-dropdown__trigger--disabled')) return;
        setDropdownOpen(dd, panel.hidden);
        return;
      }
      if (e.target.closest('.lp-dropdown__header')) {
        setDropdownOpen(dd, false);
        return;
      }
      var option = e.target.closest('.lp-dropdown__option');
      if (option && !option.disabled) {
        if (single) {
          var label = option.querySelector('.lp-dropdown__option-label');
          var triggerLabel = dd.querySelector('.lp-dropdown__trigger-label');
          if (label && triggerLabel) triggerLabel.textContent = label.textContent;
          setDropdownOpen(dd, false);
        } else {
          var checked = option.getAttribute('aria-checked') === 'true';
          option.setAttribute('aria-checked', String(!checked));
          var glyph = option.querySelector('.lp-dropdown__checkbox svg');
          if (glyph) glyph.style.visibility = checked ? 'hidden' : 'visible';
        }
        dd.dispatchEvent(new CustomEvent('lp-dropdown-change', { detail: { option: option }, bubbles: true }));
      }
    });
  }

  document.addEventListener('click', function (e) {
    if (openDropdown && !openDropdown.contains(e.target)) {
      setDropdownOpen(openDropdown, false);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openDropdown) setDropdownOpen(openDropdown, false);
  });

  /* === STEPPER === */

  function initStepper(st) {
    if (st.dataset.lpReady) return;
    st.dataset.lpReady = 'true';
    var input = st.querySelector('.lp-stepper__input');
    var controls = st.querySelectorAll('.lp-stepper__control');
    if (!input || controls.length < 2) return;
    function nudge(dir) {
      var step = parseFloat(input.step) || 1;
      var value = (parseFloat(input.value) || 0) + dir * step;
      if (input.min !== '' && value < parseFloat(input.min)) value = parseFloat(input.min);
      if (input.max !== '' && value > parseFloat(input.max)) value = parseFloat(input.max);
      input.value = String(value);
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    controls[0].addEventListener('click', function () { nudge(1); });
    controls[1].addEventListener('click', function () { nudge(-1); });
  }

  /* === TOAST === */

  var TOAST_GLYPHS = {
    info: '<circle cx="14" cy="14" r="2" fill="currentColor"/><rect x="12.5" y="11" width="3" height="11" rx="1.5" fill="currentColor" transform="rotate(180 14 16.5)"/>',
    success: '<path d="M7 14.5 12 19.5 21 9" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    warning: '<rect x="12.5" y="5" width="3" height="12" rx="1.5" fill="currentColor"/><circle cx="14" cy="21.5" r="2" fill="currentColor"/>',
    error: '<path d="M8 8l12 12M20 8 8 20" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/>',
  };
  var toastRegion = null;

  function toast(opts) {
    opts = opts || {};
    var variant = opts.variant || 'info';
    if (!toastRegion) {
      toastRegion = document.createElement('div');
      toastRegion.setAttribute('role', 'status');
      toastRegion.setAttribute('aria-live', 'polite');
      toastRegion.style.cssText =
        'position:fixed;top:20px;inset-inline-end:20px;z-index:1100;display:flex;flex-direction:column;gap:12px;align-items:flex-end;';
      document.body.appendChild(toastRegion);
    }
    var el = document.createElement('div');
    el.className = 'lp-toast' + (variant !== 'info' ? ' lp-toast--' + variant : '');
    el.innerHTML =
      '<span class="lp-toast__badge"><svg viewBox="0 0 28 28" aria-hidden="true">' +
      (TOAST_GLYPHS[variant] || TOAST_GLYPHS.info) +
      '</svg></span>' +
      '<div class="lp-toast__content">' +
      '<p class="lp-toast__title"></p><p class="lp-toast__body"></p></div>' +
      '<button class="lp-toast__close" aria-label="Close notification">' +
      '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 3l12 12M15 3 3 15"/></svg></button>';
    el.querySelector('.lp-toast__title').textContent = opts.title || '';
    el.querySelector('.lp-toast__body').textContent = opts.message || '';
    function dismiss() {
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    el.querySelector('.lp-toast__close').addEventListener('click', dismiss);
    if (opts.duration !== 0) setTimeout(dismiss, opts.duration || 5000);
    toastRegion.appendChild(el);
    return dismiss;
  }

  /* === TOOLTIP === */

  var tooltipEl = null;
  var tooltipId = 0;

  function showTooltip(target) {
    hideTooltip();
    var text = target.getAttribute('data-lp-tooltip');
    if (!text) return;
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'lp-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    tooltipEl.id = 'lp-tooltip-' + ++tooltipId;
    tooltipEl.textContent = text;
    tooltipEl.style.position = 'fixed';
    tooltipEl.style.zIndex = '1200';
    document.body.appendChild(tooltipEl);
    target.setAttribute('aria-describedby', tooltipEl.id);
    var r = target.getBoundingClientRect();
    var t = tooltipEl.getBoundingClientRect();
    var top = r.top - t.height - 6;
    if (top < 4) top = r.bottom + 6; // flip below when there is no room
    var left = Math.min(
      Math.max(4, r.left + r.width / 2 - t.width / 2),
      window.innerWidth - t.width - 4
    );
    tooltipEl.style.top = top + 'px';
    tooltipEl.style.left = left + 'px';
  }

  function hideTooltip() {
    if (!tooltipEl) return;
    var owner = document.querySelector('[aria-describedby="' + tooltipEl.id + '"]');
    if (owner) owner.removeAttribute('aria-describedby');
    tooltipEl.remove();
    tooltipEl = null;
  }

  ['mouseenter', 'focusin'].forEach(function (evt) {
    document.addEventListener(
      evt,
      function (e) {
        if (e.target.nodeType !== 1) return;
        var target = e.target.closest('[data-lp-tooltip]');
        if (target) showTooltip(target);
      },
      true
    );
  });
  ['mouseleave', 'focusout'].forEach(function (evt) {
    document.addEventListener(
      evt,
      function (e) {
        if (e.target.nodeType !== 1) return;
        if (e.target.closest && e.target.closest('[data-lp-tooltip]')) hideTooltip();
      },
      true
    );
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hideTooltip();
  });

  /* === INIT === */

  function init(root) {
    var scope = root || document;
    scope.querySelectorAll('[data-lp-tabs]').forEach(initTabs);
    scope.querySelectorAll('[data-lp-accordion]').forEach(initAccordion);
    scope.querySelectorAll('[data-lp-dropdown]').forEach(initDropdown);
    scope.querySelectorAll('[data-lp-stepper]').forEach(initStepper);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }

  window.Lepidus = {
    init: init,
    initTabs: initTabs,
    initAccordion: initAccordion,
    initDropdown: initDropdown,
    initStepper: initStepper,
    openModal: openModal,
    closeModal: closeModal,
    toast: toast,
  };
})();
