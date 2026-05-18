// DSG ONE — Bubble Plugin Element
// Copy-paste this into your Bubble plugin's Element > Initialize function
//
// Plugin Properties (set in Bubble Plugin Editor):
//   dsg_api_url  (text) — e.g. https://tdealer01-crypto-dsg-control-plane.vercel.app
//   bubble_domain (text) — e.g. myapp.bubbleapps.io
//   data_type    (text) — e.g. Product
//   fields       (text) — e.g. name:text,price:number,description:text
//   button_label (text) — e.g. Generate App (default)
//   frame_height (number) — iframe height in px (default 600)
//
// Plugin States (exposed to Bubble):
//   deploy_url   (text) — URL of the generated app
//   job_id       (text) — DSG ONE job ID
//   job_status   (text) — idle | running | completed | failed
//
// Plugin Events:
//   job_created  — fired when job is submitted
//   job_completed — fired when app is ready
//   job_failed   — fired on error

function(instance, context) {
  var el = instance.canvas[0];
  el.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  instance.data.pollInterval = null;
  instance.data.jobId = null;

  el.innerHTML = [
    '<div id="dsg-root" style="padding:16px;">',
      '<button id="dsg-btn" style="',
        'background:#1a1a1a;color:#fff;border:none;border-radius:8px;',
        'padding:12px 24px;font-size:15px;font-weight:600;cursor:pointer;',
        'transition:opacity .2s;">',
        'Generate App',
      '</button>',
      '<p id="dsg-status" style="margin:12px 0 0;font-size:13px;color:#666;"></p>',
      '<iframe id="dsg-frame" style="display:none;width:100%;border:none;border-radius:8px;margin-top:16px;"></iframe>',
    '</div>',
  ].join('');

  var btn = el.querySelector('#dsg-btn');
  var status = el.querySelector('#dsg-status');
  var frame = el.querySelector('#dsg-frame');

  btn.addEventListener('click', async function() {
    var apiUrl   = (instance.data.apiUrl   || '').replace(/\/$/, '');
    var domain   = (instance.data.domain   || '').trim();
    var dataType = (instance.data.dataType || '').trim();
    var rawFields = (instance.data.fields  || '').trim();

    if (!apiUrl || !domain || !dataType || !rawFields) {
      status.textContent = 'Missing plugin configuration — check all properties.';
      return;
    }

    var fields = rawFields.split(',').map(function(f) {
      var parts = f.trim().split(':');
      return { name: parts[0].trim(), type: (parts[1] || 'text').trim() };
    });

    btn.disabled = true;
    btn.style.opacity = '0.5';
    status.textContent = 'Creating generation job…';
    instance.publishState('job_status', 'running');

    try {
      var res = await fetch(apiUrl + '/api/dsg-bridge/bubble', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appDomain: domain, dataType: dataType, fields: fields }),
      });

      var data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Job creation failed');

      instance.data.jobId = data.data.jobId;
      instance.publishState('job_id', data.data.jobId);
      instance.publishState('job_status', 'running');
      status.textContent = 'Generating app (job ' + data.data.jobId.slice(0, 8) + '…) — this takes ~60s';
      instance.triggerEvent('job_created');

      instance.data.pollInterval = setInterval(async function() {
        try {
          var sr = await fetch(apiUrl + '/api/dsg-bridge/jobs/' + instance.data.jobId, {
            credentials: 'include',
          });
          var sd = await sr.json();
          var jobStatus = (sd.data && sd.data.job && sd.data.job.status) || sd.status || '';
          status.textContent = 'Status: ' + jobStatus;

          if (jobStatus === 'completed' || jobStatus === 'COMPLETED') {
            clearInterval(instance.data.pollInterval);
            instance.publishState('job_status', 'completed');
            var deployUrl = sd.data && sd.data.job && sd.data.job.metadata && sd.data.job.metadata.deployUrl;
            if (deployUrl) {
              instance.publishState('deploy_url', deployUrl);
              frame.src = deployUrl;
              frame.style.display = 'block';
              frame.style.height = (instance.data.frameHeight || 600) + 'px';
              status.textContent = '✅ App ready!';
              instance.triggerEvent('job_completed');
            } else {
              status.textContent = '✅ App generated. Deploy URL will appear here when available.';
            }
            btn.disabled = false;
            btn.style.opacity = '1';
          } else if (jobStatus === 'failed' || jobStatus === 'FAILED') {
            clearInterval(instance.data.pollInterval);
            instance.publishState('job_status', 'failed');
            status.textContent = '❌ Generation failed. Check DSG ONE dashboard for details.';
            instance.triggerEvent('job_failed');
            btn.disabled = false;
            btn.style.opacity = '1';
          }
        } catch (_) { /* ignore transient poll errors */ }
      }, 5000);

    } catch (err) {
      status.textContent = 'Error: ' + err.message;
      instance.publishState('job_status', 'failed');
      instance.triggerEvent('job_failed');
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  });
}
