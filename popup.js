const btn = document.getElementById('toggle');
const status = document.getElementById('status');

function render(state) {
  if (state.active) {
    const remaining = state.tasks.filter(t => !t.done).length;
    btn.textContent = 'Open Focus checklist';
    btn.className = 'on';
    status.textContent = `Focus is ON — ${remaining} task(s) left`;
  } else {
    btn.textContent = 'Start Focus mode';
    btn.className = 'off';
    status.textContent = 'Focus is OFF';
  }
}

chrome.storage.local.get(['dzip_focus_state'], res => {
  render(res.dzip_focus_state || { active: false, tasks: [] });
});

btn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  chrome.tabs.sendMessage(tab.id, { type: 'DZIP_TOGGLE' }).catch(() => {
    status.textContent = "Can't reach this page (try a normal webpage tab).";
  });
  window.close();
});