// DSG ONE — Bubble Plugin Element
// Copy-paste this into your Bubble plugin's Element > Update function

function(instance, properties, context) {
  instance.data.apiUrl      = properties.dsg_api_url;
  instance.data.domain      = properties.bubble_domain;
  instance.data.dataType    = properties.data_type;
  instance.data.fields      = properties.fields;
  instance.data.frameHeight = properties.frame_height || 600;

  var btn = instance.canvas[0].querySelector('#dsg-btn');
  if (btn && properties.button_label) {
    btn.textContent = properties.button_label;
  }
}
